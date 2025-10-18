import { Collection, Db } from "npm:mongodb";
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
    { list, sessionOwner }: { list: List; sessionOwner: User },
  ): Promise<Empty | { error: string }> {
    // requires: there is not an active session for sessionOwner
    const existingSession = await this.sessions.findOne({
      owner: sessionOwner,
      active: true,
    });
    if (existingSession) {
      return { error: "An active session already exists for this owner." };
    }

    // effects: creates new session
    const newSessionId = freshID();
    const newSession: SessionDoc = {
      _id: newSessionId,
      owner: sessionOwner,
      listId: list,
      title: "", // Placeholder; should ideally be provided or set by a sync
      itemCount: 0, // Initial count, items added separately
      active: false,
      ordering: "Default",
      format: "List", // As specified
    };

    await this.sessions.insertOne(newSession);

    // The principle mentions "given an ordered list of tasks". This implies `ListItems`
    // are populated here. However, due to strict concept independence and the provided
    // action signature, the `Session` concept itself cannot fetch these from `list`.
    // This part of the principle would need to be fulfilled by a separate action (e.g.,
    // `addListItemToSession`) or a synchronization rule that populates `listItems`
    // for this new session based on the `list` ID.

    return {};
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

    // effects: each ListItems randomOrder value is updated at random
    const items = await this.listItems.find({ sessionId: session }).toArray();
    if (items.length === 0) {
      return { error: "No items to randomize in this session." };
    }

    // Generate a permutation of indices for random ordering
    const randomOrders: number[] = Array.from(
      { length: items.length },
      (_, i) => i,
    );
    for (let i = randomOrders.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [randomOrders[i], randomOrders[j]] = [randomOrders[j], randomOrders[i]]; // Fisher-Yates shuffle
    }

    const updates = items.map((item, index) =>
      this.listItems.updateOne(
        { _id: item._id },
        { $set: { randomOrder: randomOrders[index] } },
      )
    );
    await Promise.all(updates);

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

  /**
   * @query _getSessionListItems
   * @effects : return all list items for a given session, ordered by default or random order
   */
  async _getSessionListItems(
    { session }: { session: Session },
  ): Promise<ListItemDoc[]> {
    const sessionDoc = await this.sessions.findOne({ _id: session });
    if (!sessionDoc) {
      return [];
    }
    const sortField = sessionDoc.ordering === "Random"
      ? "randomOrder"
      : "defaultOrder";
    return await this.listItems.find({ sessionId: session }).sort({
      [sortField]: 1,
    }).toArray();
  }

  /**
   * @query _getActiveSessionForOwner
   * @effects : returns the active session for a given owner, or null if none exists.
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
