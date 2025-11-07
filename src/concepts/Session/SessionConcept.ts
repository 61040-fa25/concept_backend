import { ClientSession, Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Session" + ".";

// Generic types of this concept
type User = ID;
type List = ID;
type Task = ID;
type Session = ID; // The ID for a Session instance

/**
 * Type for the status of a task within a session.
 */
type TaskStatus = "Incomplete" | "In Progress" | "Complete";

/**
 * Type for the ordering preference of tasks in a session.
 */
type OrderType = "Default" | "Random";

/**
 * Type for the display format of the session's list.
 * (Only "List" is specified, but this allows for future expansion)
 */
type FormatType = "List";

/**
 * A set of Sessions with
 *   an owner of type User
 *   a SessionList with
 *     a title of type String
 *     an itemCount of type Number
 *   an active of type Flag (boolean)
 *   an ordering of type OrderType
 *   a format of type FormatType
 *
 * Note: The 'SessionList' with 'ListItems' is interpreted as:
 * - 'listId' references an external List ID (polymorphically).
 * - 'title' is a session-specific title, possibly denormalized or a default.
 * - 'ListItems' are managed in a separate collection, linked to this Session.
 *
 * Ambiguity Note: The original specification of `changeSession` (list: List, sessionOwner: User)
 * does not provide a mechanism to initialize the `title` or the specific `ListItems` (tasks with
 * default order) for the session from the `list` ID, while strictly adhering to concept independence.
 * For this implementation, `title` will be initialized as an empty string and `itemCount` as 0.
 * Populating `ListItems` must be done via other (unspecified in this concept) actions or via syncs
 * from an external List concept that provides the initial items.
 */
interface SessionDoc {
  _id: Session;
  owner: User;
  listId: List; // Reference to the external 'List' concept's ID
  title: string; // Title for *this* session's list
  itemCount: number; // Count of ListItems associated with this session
  active: boolean;
  ordering: OrderType;
  format: FormatType;
}

/**
 * A set of ListItems with
 *   a task of type Task
 *   a defaultOrder of type Number
 *   a randomOrder of type Number
 *   an itemStatus of type TaskStatus
 *
 * This represents individual tasks within a specific session,
 * linked to a Session and an external Task ID.
 */
interface ListItemDoc {
  _id: ID; // Unique ID for this specific ListItem instance
  sessionId: Session; // Reference to the Session this item belongs to
  taskId: Task; // Reference to the Task from external concept
  defaultOrder: number;
  randomOrder: number;
  itemStatus: TaskStatus;
}

/**
 * @concept Session
 * @purpose a focused session of completing all tasks on a list
 * @principle a user will "activate" a list to start a session and be given an ordered list
 * (either default ordering or generated) of tasks on the list to complete
 */
export default class SessionConcept {
  private sessions: Collection<SessionDoc>;
  private listItems: Collection<ListItemDoc>;

  constructor(private readonly db: Db) {
    this.sessions = this.db.collection(PREFIX + "sessions");
    this.listItems = this.db.collection(PREFIX + "listItems");
  }

  public async findListItem(sessionId: ID, taskId: ID) {
    return await this.listItems.findOne({ sessionId, taskId });
  }

  /**
   * @action changeSession
   * @requires : there is not an active session for sessionOwner
   * @effects : creates new session with SessionList = list, randomOrder = defaultOrder,
   *            itemStatus = Incomplete, active = False, ordering = Default, and format = List
   *
   * Note on ambiguity: As per concept independence, this action cannot directly query the `list` ID
   * to get its title or contents (ListItems). The `title` is initialized empty, `itemCount` to 0.
   * `ListItems` must be added separately, or via synchronization rules from another concept.
   */
  async changeSession(
    { list, sessionOwner, ordering, format, clientSession }: {
      list: List;
      sessionOwner: User;
      ordering?: OrderType;
      format?: FormatType;
      clientSession?: ClientSession;
    },
  ): Promise<Empty | { error: string } | { session: Session }> {
    // requires: there is not an active session for sessionOwner
    const existingActiveSession = await this.sessions.findOne({
      owner: sessionOwner,
      active: true,
    }, { session: clientSession });
    if (existingActiveSession) {
      return { error: "An active session already exists for this owner." };
    }
    const existingInactiveSession = await this.sessions.findOne({
      owner: sessionOwner,
      active: false,
    }, { session: clientSession });
    if (existingInactiveSession) {
      // Clean-slate approach: remove the previous inactive session and all
      // its list items before creating a new one. Await the deletion to avoid
      // races when tests or concurrent requests run.
      await this.deleteSession({
        session: existingInactiveSession._id,
        clientSession,
      });
    }
    // effects: creates new session and seed its ListItems from the provided List
    // If the provided list exists in ListCreation, copy its title and items into
    // the newly created session so the frontend has an ordered set of tasks.

    // Load the originating List (ListCreation concept) to seed session items
    const listCollection = this.db.collection("ListCreation.lists");
    const sourceList = await listCollection.findOne({ _id: list });

    // Build session using list metadata if available; otherwise create an empty session
    const newSessionId = freshID();
    const newSession: SessionDoc = {
      _id: newSessionId,
      owner: sessionOwner,
      listId: list,
      title: sourceList?.title ?? "",
      // itemCount will be set to the number of seeded items (clean-slate semantics)
      itemCount: 0,
      active: false,
      ordering: ordering ?? "Default",
      format: format ?? "List",
    };

    console.debug("Session.changeSession: inserting new session", {
      newSessionId,
      owner: sessionOwner,
      list,
    });
    await this.sessions.insertOne(newSession, { session: clientSession });
    console.debug("Session.changeSession: insertOne completed for session", {
      newSessionId,
    });

    // If a source list exists, seed session ListItems from it.
    if (
      sourceList && Array.isArray(sourceList.listItems) &&
      sourceList.listItems.length > 0
    ) {
      const seedItems = sourceList.listItems.map((li) => ({
        _id: freshID(),
        sessionId: newSessionId,
        taskId: li.task,
        defaultOrder: li.orderNumber,
        randomOrder: li.orderNumber,
        itemStatus: "Incomplete" as const,
      }));

      if (seedItems.length > 0) {
        console.debug(
          "Session.changeSession: inserting seed list items",
          { sessionId: newSessionId, count: seedItems.length },
        );
        await this.listItems.insertMany(seedItems, { session: clientSession });
        console.debug(
          "Session.changeSession: insertMany completed for seed items",
          { sessionId: newSessionId, count: seedItems.length },
        );
        // Reflect the actual seeded item count in the session document
        newSession.itemCount = seedItems.length;
      }
    }

    // Always return the created session id. This makes the API/caller able to
    // immediately observe the created session even when changeSession is run
    // inside a transaction. We keep the return shape compatible with other
    // callers by returning the object `{ session: <id> }`.
    // Update the session document's itemCount if it changed during seeding.
    if (newSession.itemCount !== (sourceList?.itemCount ?? 0)) {
      await this.sessions.updateOne({ _id: newSessionId }, {
        $set: { itemCount: newSession.itemCount },
      }, { session: clientSession });
    }

    console.debug("Session.changeSession: completed, returning session id", {
      newSessionId,
    });
    return { session: newSessionId } as unknown as
      | Empty
      | { error: string }
      | { session: Session };
  }

  /**
   * @action setOrdering
   * @requires : session's active Flag is currently False and setter = owner
   * @effects : ordering is set to newType
   */
  async setOrdering(
    { session, newType, setter }: {
      session: Session;
      newType: OrderType;
      setter: User;
    },
  ): Promise<Empty | { error: string }> {
    const sessionDoc = await this.sessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session with ID ${session} not found.` };
    }
    console.debug("Session.randomizeOrder: sessionDoc found", { sessionDoc });

    // requires: session's active Flag is currently False
    if (sessionDoc.active) {
      return { error: "Cannot change ordering while session is active." };
    }
    // requires: setter = owner
    if (sessionDoc.owner !== setter) {
      return { error: "Only the session owner can change ordering." };
    }

    // effects: ordering is set to newType
    await this.sessions.updateOne(
      { _id: session },
      { $set: { ordering: newType } },
    );
    return {};
  }

  /**
   * @action setFormat
   * @requires : session's active Flag is currently False and setter = owner
   * @effects : format is set to newFormat
   */
  async setFormat(
    { session, newFormat, setter }: {
      session: Session;
      newFormat: FormatType;
      setter: User;
    },
  ): Promise<Empty | { error: string }> {
    const sessionDoc = await this.sessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session with ID ${session} not found.` };
    }

    // requires: session's active Flag is currently False
    if (sessionDoc.active) {
      return { error: "Cannot change format while session is active." };
    }
    // requires: setter = owner
    if (sessionDoc.owner !== setter) {
      return { error: "Only the session owner can change format." };
    }

    // effects: format is set to newFormat
    await this.sessions.updateOne(
      { _id: session },
      { $set: { format: newFormat } },
    );
    return {};
  }

  /**
   * @action randomizeOrder
   * @requires : session's ordering is set to "Random" and randomizer = owner
   * @effects : each ListItems randomOrder value is updated at random,
   *            maintaining dependencies between tasks
   *
   * Note on dependencies: The concept doesn't store task dependencies.
   * This implementation will re-randomize `randomOrder` for all items,
   * assuming that "maintaining dependencies" is either handled by the
   * consumer of the `randomOrder` or is an external concern not managed
   * by this concept's state. It assigns unique random numbers.
   */
  async randomizeOrder(
    { session, randomizer }: { session: Session; randomizer: User },
  ): Promise<Empty | { error: string }> {
    const sessionDoc = await this.sessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session with ID ${session} not found.` };
    }

    // requires: session's ordering is set to "Random"
    if (sessionDoc.ordering !== "Random") {
      return { error: "Ordering must be set to 'Random' to randomize tasks." };
    }
    // requires: randomizer = owner
    if (sessionDoc.owner !== randomizer) {
      return { error: "Only the session owner can randomize order." };
    }

    // Load list items for this session
    const items = await this.listItems.find({ sessionId: session }).toArray();
    console.debug("Session.randomizeOrder: loaded session list items", {
      session,
      count: items.length,
      taskIds: items.map((it) => it.taskId),
    });
    if (items.length === 0) {
      return { error: "No items to randomize in this session." };
    }

    // Build set of taskIds belonging to this session
    const taskIds = items.map((it) => it.taskId);
    const taskIdSet = new Set(taskIds);

    // Attempt to fetch dependency info from TaskBank.tasks (if present)
    // We defensively support a few common field names for dependencies: `dependsOn`, `dependencies`, `prereqs`.
    type TaskDocLike = {
      _id: ID;
      dependsOn?: ID[];
      dependencies?: ID[];
      prereqs?: ID[];
    };
    let taskDocs: TaskDocLike[] = [];
    try {
      // The Mongo driver collection typings may expect ObjectId etc.; to avoid
      // strict driver type coupling we define a minimal local find signature
      // and call it. This lets runtime queries proceed while keeping local
      // types narrow and avoiding `any`.
      const taskColl = this.db.collection("TaskBank.tasks") as unknown as {
        find(filter: unknown): { toArray(): Promise<TaskDocLike[]> };
      };
      taskDocs = await taskColl.find({ _id: { $in: taskIds } }).toArray();
    } catch (_err) {
      // If lookup fails, we'll fall back to simple random shuffle below.
      taskDocs = [];
    }
    console.debug("Session.randomizeOrder: fetched taskDocs count", {
      session,
      taskDocsCount: taskDocs.length,
    });

    // Build adjacency and indegree only for tasks present in this session
    const neighbors = new Map<ID, ID[]>();
    const indegree = new Map<ID, number>();
    for (const id of taskIds) {
      neighbors.set(id, []);
      indegree.set(id, 0);
    }

    if (taskDocs.length > 0) {
      for (const td of taskDocs) {
        const id = td._id as ID;
        // normalize dependency lists
        let deps: ID[] = [];
        if (Array.isArray(td.dependsOn)) deps = td.dependsOn;
        else if (Array.isArray(td.dependencies)) deps = td.dependencies;
        else if (Array.isArray(td.prereqs)) deps = td.prereqs;
        // Log raw deps for this task
        console.debug("Session.randomizeOrder: raw deps for task", {
          session,
          task: id,
          rawDeps: deps,
        });

        for (const d of deps || []) {
          // only consider dependencies that are also in this session
          if (!taskIdSet.has(d)) {
            console.debug(
              "Session.randomizeOrder: skipping dependency not in session",
              { session, task: id, dep: d },
            );
            continue;
          }
          // edge d -> id
          neighbors.get(d)!.push(id);
          indegree.set(id, (indegree.get(id) ?? 0) + 1);
          console.debug("Session.randomizeOrder: added dependency edge", {
            session,
            from: d,
            to: id,
          });
        }
      }
      // After processing all taskDocs, log the built graph
      console.debug(
        "Session.randomizeOrder: neighbors map after build",
        Array.from(neighbors.entries()),
      );
      console.debug(
        "Session.randomizeOrder: indegree map after build",
        Array.from(indegree.entries()),
      );
    }

    // Kahn's algorithm with randomized selection among zero-indegree nodes
    const zero: ID[] = [];
    for (const [id, deg] of indegree.entries()) {
      if (!deg) zero.push(id);
    }
    console.debug(
      "Session.randomizeOrder: initial indegree entries",
      Array.from(indegree.entries()),
    );
    console.debug("Session.randomizeOrder: initial zero-indegree nodes", {
      session,
      zero,
    });

    const resultOrder: ID[] = [];
    function shuffleArray<T>(arr: T[]) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }

    while (zero.length > 0) {
      // pick a random index from zero
      const idx = Math.floor(Math.random() * zero.length);
      const n = zero.splice(idx, 1)[0];
      console.debug("Session.randomizeOrder: selecting node", {
        session,
        node: n,
        remainingZero: zero.length,
      });
      resultOrder.push(n);
      const neigh = neighbors.get(n) || [];
      for (const m of neigh) {
        const newDeg = (indegree.get(m) ?? 0) - 1;
        indegree.set(m, newDeg);
        if (newDeg === 0) zero.push(m);
      }
    }

    console.debug("Session.randomizeOrder: resultOrder length", {
      session,
      length: resultOrder.length,
    });

    // If we didn't include all tasks, there's a cycle or missing task docs.
    // Append any remaining tasks in random order (break cycles deterministically by randomness).
    if (resultOrder.length < taskIds.length) {
      const remaining = taskIds.filter((id) => !resultOrder.includes(id));
      shuffleArray(remaining);
      resultOrder.push(...remaining);
    }

    // Map taskId -> position
    const positionByTask = new Map<ID, number>();
    for (let i = 0; i < resultOrder.length; i++) {
      positionByTask.set(resultOrder[i], i);
    }

    console.debug(
      "Session.randomizeOrder: positionByTask mapping created",
      Array.from(positionByTask.entries()),
    );

    // Diagnostics: compare to defaultOrder to detect no-op results
    const defaultMatch = items.every((it) => {
      const pos = positionByTask.get(it.taskId);
      return typeof pos === "number" && pos === it.defaultOrder;
    });
    if (defaultMatch) {
      console.debug(
        "Session.randomizeOrder: computed order matches defaultOrder; falling back to Fisher-Yates shuffle",
        { session },
      );
      // fallback: compute a pure random permutation of taskIds
      const fallback = [...taskIds];
      shuffleArray(fallback);
      positionByTask.clear();
      for (let i = 0; i < fallback.length; i++) {
        positionByTask.set(fallback[i], i);
      }
    }

    // Persist randomOrder values
    console.debug(
      "Session.randomizeOrder: persisting randomOrder values for items",
      { session, itemCount: items.length },
    );
    const updates = items.map((item) => {
      const newVal = positionByTask.get(item.taskId) ?? 0;
      console.debug("Session.randomizeOrder: updating item randomOrder", {
        session,
        listItemId: item._id,
        taskId: item.taskId,
        randomOrder: newVal,
      });
      return this.listItems.updateOne(
        { _id: item._id },
        { $set: { randomOrder: newVal } },
      );
    });
    await Promise.all(updates);

    console.debug("Session.randomizeOrder: completed", {
      session,
      count: items.length,
    });
    return {};
  }

  /**
   * @action activateSession
   * @requires : session's active Flag is currently False and activator = owner
   * @effects : session's active Flag is set to True
   */
  async activateSession(
    { session, activator }: { session: Session; activator: User },
  ): Promise<Empty | { error: string }> {
    const sessionDoc = await this.sessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session with ID ${session} not found.` };
    }

    // requires: session's active Flag is currently False
    if (sessionDoc.active) {
      return { error: "Session is already active." };
    }
    // requires: activator = owner
    if (sessionDoc.owner !== activator) {
      return { error: "Only the session owner can activate the session." };
    }

    // effects: session's active Flag is set to True
    // If ordering is Random, generate a fresh randomized order at start time
    if (sessionDoc.ordering === "Random") {
      // activator is already verified to be owner above, so this will succeed
      console.debug(
        "Session.activateSession: ordering is Random, calling randomizeOrder",
        { session, activator },
      );
      const rr = await this.randomizeOrder({ session, randomizer: activator });
      console.debug("Session.activateSession: randomizeOrder returned", {
        session,
        result: rr,
      });
    }

    await this.sessions.updateOne(
      { _id: session },
      { $set: { active: true } },
    );
    return {};
  }

  /**
   * @action startTask
   * @requires : task is in a ListItem for session's list, its status is currently "Incomplete",
   *            and no other task is "In Progress"
   * @effects : given ListItem's status is set to "In Progress"
   */
  async startTask(
    { session, task }: { session: Session; task: Task },
  ): Promise<Empty | { error: string }> {
    const sessionDoc = await this.sessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session with ID ${session} not found.` };
    }

    const listItem = await this.listItems.findOne({
      sessionId: session,
      taskId: task,
    });
    if (!listItem) {
      return { error: `Task ${task} not found in session ${session}.` };
    }

    // requires: its status is currently "Incomplete"
    if (listItem.itemStatus !== "Incomplete") {
      return { error: `Task ${task} is not in 'Incomplete' status.` };
    }

    // requires: and no other task is "In Progress"
    const inProgressTask = await this.listItems.findOne({
      sessionId: session,
      itemStatus: "In Progress",
    });
    if (inProgressTask) {
      return {
        error:
          `Another task (${inProgressTask.taskId}) is already 'In Progress'.`,
      };
    }

    // effects: given ListItem's status is set to "In Progress"
    await this.listItems.updateOne(
      { _id: listItem._id },
      { $set: { itemStatus: "In Progress" } },
    );
    console.debug("Session.startTask: updated item to In Progress", {
      session,
      task,
      listItemId: listItem._id,
    });
    return {};
  }

  /**
   * @action completeTask
   * @requires : task is in a ListItem for session's list and its status is currently "In Progress"
   * @effects : given ListItem's status is set to "Complete"
   */
  async completeTask(
    { session, task }: { session: Session; task: Task },
  ): Promise<Empty | { error: string }> {
    const sessionDoc = await this.sessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session with ID ${session} not found.` };
    }

    const listItem = await this.listItems.findOne({
      sessionId: session,
      taskId: task,
    });
    if (!listItem) {
      return { error: `Task ${task} not found in session ${session}.` };
    }

    // requires: its status is currently "In Progress"
    if (listItem.itemStatus !== "In Progress") {
      return { error: `Task ${task} is not in 'In Progress' status.` };
    }

    // effects: given ListItem's status is set to "Complete"
    await this.listItems.updateOne(
      { _id: listItem._id },
      { $set: { itemStatus: "Complete" } },
    );
    console.debug("Session.completeTask: updated item to Complete", {
      session,
      task,
      listItemId: listItem._id,
    });
    return {};
  }

  /**
   * @action endSession
   * @requires : session's active Flag is currently True
   * @effects : session's active Flag is set to False
   */
  async endSession(
    { session }: { session: Session },
  ): Promise<Empty | { error: string }> {
    const sessionDoc = await this.sessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session with ID ${session} not found.` };
    }

    // requires: session's active Flag is currently True
    if (!sessionDoc.active) {
      return { error: "Session is not active." };
    }

    // effects: session's active Flag is set to False
    await this.sessions.updateOne(
      { _id: session },
      { $set: { active: false } },
    );
    return {};
  }

  /**
   * @action deleteSession
   * @requires : session exists
   * @effects : session is deleted from the database
   */
  async deleteSession(
    { session, clientSession }: {
      session: Session;
      clientSession?: ClientSession;
    },
  ): Promise<Empty | { error: string }> {
    const sessionDoc = await this.sessions.findOne({ _id: session }, {
      session: clientSession,
    });
    if (!sessionDoc) {
      return { error: `Session with ID ${session} not found.` };
    }
    // Remove all list items associated with this session as part of the
    // clean-slate deletion. Ensure both deletes run in the same transaction
    // when a clientSession is provided.
    console.debug("Session.deleteSession: deleting listItems for session", {
      session,
    });
    await this.listItems.deleteMany({ sessionId: session }, {
      session: clientSession,
    });

    const result = await this.sessions.deleteOne({ _id: session }, {
      session: clientSession,
    });

    if (result.deletedCount === 0) {
      return {
        error: `Session with ID ${session} not found or could not be deleted.`,
      };
    }
    return {};
  }

  // --- Queries (beginning with underscore) ---

  /**
   * @query _getSession
   * @effects : return the full session document for a given session ID
   */
  async _getSession(
    { session }: { session: Session },
  ): Promise<SessionDoc | null> {
    return await this.sessions.findOne({ _id: session });
  }

  /**
   * @query _getTaskStatus
   * @effects : return the status of a specific task within a session
   */
  async _getTaskStatus(
    { session, task }: { session: Session; task: Task },
  ): Promise<TaskStatus | null> {
    const listItem = await this.listItems.findOne({
      sessionId: session,
      taskId: task,
    });
    return listItem ? listItem.itemStatus : null;
  }

  // /**
  //  * @query _getSessionListItems
  //  * @effects : return all list items for a given session, ordered by default or random order
  //  */
  // async _getSessionListItems(
  //   { session }: { session: Session },
  // ): Promise<ListItemDoc[]> {
  //   // console.log("Looking for session: ", session.toString());
  //   // const sessionDoc = await this.sessions.findOne({ _id: session });

  //   let sessionDoc: SessionDoc | null = null;
  //   let retries = 0;

  //   while (retries < 20) {
  //     // console.log("Retry: ", retries);
  //     sessionDoc = await this.sessions.findOne({ _id: session });
  //     if (sessionDoc) break;
  //     await new Promise((r) => setTimeout(r, 10));
  //     retries++;
  //   }

  //   if (!sessionDoc) {
  //     return [];
  //   }

  //   const sortField = sessionDoc.ordering === "Random"
  //     ? "randomOrder"
  //     : "defaultOrder";
  //   return await this.listItems.find({ sessionId: session }).sort({
  //     [sortField]: 1,
  //   }).toArray();
  // }
  // ...existing code...
  /**
   * @query _getSessionListItems
   * @effects : return all list items for a given session, ordered by default or random order
   */
  async _getSessionListItems(
    { session }: { session: Session },
  ): Promise<(ListItemDoc & { taskName?: string })[]> {
    let sessionDoc: SessionDoc | null = null;
    let retries = 0;

    while (retries < 20) {
      sessionDoc = await this.sessions.findOne({ _id: session });
      if (sessionDoc) break;
      await new Promise((r) => setTimeout(r, 10));
      retries++;
    }

    if (!sessionDoc) {
      return [];
    }

    const sortField = sessionDoc.ordering === "Random"
      ? "randomOrder"
      : "defaultOrder";
    const items = await this.listItems.find({ sessionId: session }).sort({
      [sortField]: 1,
    }).toArray();

    // --- Enrich items with taskName from TaskBank.tasks collection ---
    try {
      // TaskBank prefix used in your TaskBank concept: "TaskBank.tasks"
      const taskColl = this.db.collection("TaskBank.tasks");
      // collect unique taskIds
      const ids = Array.from(
        new Set(items.map((it) => it.taskId).filter(Boolean)),
      );
      if (ids.length === 0) return items;

      let tasks: unknown[] = [];
      try {
        // Defensive query: if task lookup fails for any reason, fall back to
        // returning items without enrichment rather than throwing.
        // Cast `ids` to unknown[] so the mongodb driver type-check is satisfied
        // regardless of whether _id is stored as ObjectId or string in the
        // TaskBank collection. This is a pragmatic runtime-safe cast; if the
        // types differ, the query will still run and either return matches or
        // an empty array.
        tasks = await taskColl.find({ _id: { $in: ids as unknown as any[] } })
          .toArray();
      } catch (err) {
        console.debug(
          "Session._getSessionListItems: failed to query TaskBank.tasks:",
          err,
        );
        // Return items without enrichment on failure
        return items;
      }

      const nameById = new Map(
        (tasks as any[]).map((t: any) => [t._id, t.taskName ?? t.name]),
      );

      return items.map((it) => ({
        ...it,
        taskName: nameById.get(it.taskId) ?? undefined,
      }));
    } catch (err) {
      // on any failure, return items without enrichment
      console.debug(
        "Session._getSessionListItems: failed to enrich with taskName",
        err,
      );
      return items;
    }
  }
  // ...existing code...

  /**
   * @query _getSessionForOwner
   * @effects : returns the session for a given owner, or null if none exists.
   */
  async _getSessionForOwner(
    { owner }: { owner: User },
  ): Promise<SessionDoc | null> {
    return await this.sessions.findOne({ owner: owner });
  }

  /**
   * @query _getActiveSessionForOwner
   * @effects : returns the session for a given owner, or null if none exists.
   */
  async _getActiveSessionForOwner(
    { owner }: { owner: User },
  ): Promise<SessionDoc | null> {
    return await this.sessions.findOne({ owner: owner, active: true });
  }

  // --- Additional (non-specified) actions for ListItems management ---
  // These are necessary given the current `changeSession` signature and concept independence
  // to fulfill the principle of having an "ordered list of tasks".
  // In a real design, these would be explicitly part of the concept spec or handled by syncs.

  /**
   * @action addListItem
   * @purpose To allow tasks to be added to a session's list.
   * @requires : session exists, and the task is not already in the session's list
   * @effects : adds a new ListItem to the session with specified task, default order,
   *            and "Incomplete" status. Increments session's itemCount.
   */
  async addListItem(
    { session, task, defaultOrder }: {
      session: Session;
      task: Task;
      defaultOrder: number;
    },
  ): Promise<Empty | { error: string }> {
    const sessionDoc = await this.sessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session with ID ${session} not found.` };
    }

    const existingListItem = await this.listItems.findOne({
      sessionId: session,
      taskId: task,
    });
    if (existingListItem) {
      return { error: `Task ${task} already exists in session ${session}.` };
    }

    const newListItem: ListItemDoc = {
      _id: freshID(),
      sessionId: session,
      taskId: task,
      defaultOrder: defaultOrder,
      randomOrder: -1, // Will be set by randomizeOrder, or can be same as default initially
      itemStatus: "Incomplete",
    };
    await this.listItems.insertOne(newListItem);

    // Update session's itemCount
    await this.sessions.updateOne(
      { _id: session },
      { $inc: { itemCount: 1 } },
    );

    return {};
  }

  /**
   * @action removeListItem
   * @purpose To allow tasks to be removed from a session's list.
   * @requires : session exists, and the task is in the session's list and not "In Progress"
   * @effects : removes the ListItem from the session. Decrements session's itemCount.
   */
  async removeListItem(
    { session, task }: { session: Session; task: Task },
  ): Promise<Empty | { error: string }> {
    const sessionDoc = await this.sessions.findOne({ _id: session });
    if (!sessionDoc) {
      return { error: `Session with ID ${session} not found.` };
    }

    const listItem = await this.listItems.findOne({
      sessionId: session,
      taskId: task,
    });
    if (!listItem) {
      return { error: `Task ${task} not found in session ${session}.` };
    }

    if (listItem.itemStatus === "In Progress") {
      return {
        error: `Cannot remove task ${task} as it is currently 'In Progress'.`,
      };
    }

    await this.listItems.deleteOne({ _id: listItem._id });

    // Update session's itemCount
    await this.sessions.updateOne(
      { _id: session },
      { $inc: { itemCount: -1 } },
    );

    return {};
  }
}
