import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts"; // Adjust path as needed for actual project structure
// freshID is not directly used for SessionDoc _id if _id is owner ID, but might be useful for sub-documents if they were separate collections.
// For this concept, using owner ID as _id for the main session document.

/**
 * @concept Session [User, List, Task]
 * @purpose a focused session of completing all tasks on a list
 * @principle a user will "activate" a list to start a session and be given an ordered list (either default ordering or generated) of tasks on the list to complete
 */
// Declare collection prefix, use concept name
const PREFIX = "Session" + ".";

// Generic types for the concept, representing external entities by their IDs.
type User = ID;
type List = ID; // The external List ID
type Task = ID; // The external Task ID

// Enums for clarity and type safety
enum OrderType {
  Default = "Default",
  Random = "Random",
}

enum FormatType {
  List = "List", // As given in the example
  Kanban = "Kanban", // Adding another format for realism
}

enum TaskStatus {
  Incomplete = "Incomplete",
  InProgress = "InProgress",
  Complete = "Complete",
}

/**
 * Represents an individual task item within a session's list.
 * @state
 *   a task of type Task
 *   a defaultOrder of type Number
 *   a randomOrder of type  Number
 *   an itemStatus of type TaskStatus
 */
interface SessionListItem {
  task: Task;
  defaultOrder: number;
  randomOrder: number;
  itemStatus: TaskStatus;
}

/**
 * Represents the entire state of a user's session.
 * @state
 *   a Session with
 *     an owner of type User
 *     a List with
 *       a title of type String
 *       a set of ListItems with (defined by SessionListItem[])
 *       an itemCount of type Number
 *     an active of type Flag (boolean)
 *     an ordering of type OrderType
 *     a format of type FormatType
 *
 * Each document in the 'sessions' collection represents a session for a particular user.
 * The _id of the document is the User ID, ensuring a single session per user at a time.
 */
interface SessionDoc {
  _id: User; // The owner's ID serves as the session ID, enforcing one session per user.
  owner: User; // Redundant with _id, but explicitly stored for clarity and potential alternative querying.
  active: boolean;
  ordering: OrderType;
  format: FormatType;
  list: { // The list content managed by this session, allowing for independence.
    id: List; // The ID of the external list this session is based on.
    title: string; // Title of the external list.
    items: SessionListItem[]; // The "set of ListItems" for this session.
    itemCount: number; // The number of items in the list.
  };
}

export default class SessionConcept {
  private sessions: Collection<SessionDoc>;

  constructor(private readonly db: Db) {
    this.sessions = this.db.collection(PREFIX + "sessions");
  }

  /**
   * changeSession (listId: List, listTitle: string, listItemsData: Array<{task: Task, defaultOrder: number}>, sessionOwner: User)
   * @requires : there is not an active session for sessionOwner
   * @effects : makes list the Session's List with each randomOrder = defaultOrder, itemStatus = Incomplete, active = False, ordering = Default, and format = List
   *
   * This action initializes or reconfigures a session for a user with a specified list and its tasks.
   * It takes the necessary list and task details as arguments to maintain concept independence.
   */
  async changeSession(input: {
    listId: List;
    listTitle: string;
    listItemsData: Array<{ task: Task; defaultOrder: number }>;
    sessionOwner: User;
  }): Promise<Empty | { error: string }> {
    const { listId, listTitle, listItemsData, sessionOwner } = input;

    const existingSession = await this.sessions.findOne({
      owner: sessionOwner,
    });

    // Precondition: there is not an active session for sessionOwner
    if (existingSession && existingSession.active) {
      return {
        error:
          `User '${sessionOwner}' already has an active session. Please end it first.`,
      };
    }

    const sessionListItems: SessionListItem[] = listItemsData.map((item) => ({
      task: item.task,
      defaultOrder: item.defaultOrder,
      randomOrder: item.defaultOrder, // Initialize randomOrder to defaultOrder
      itemStatus: TaskStatus.Incomplete, // Initialize status
    }));

    const newSession: SessionDoc = {
      _id: sessionOwner, // Using owner ID as the unique key for the session.
      owner: sessionOwner,
      active: false, // Session starts as inactive.
      ordering: OrderType.Default, // Default ordering.
      format: FormatType.List, // Default format.
      list: {
        id: listId,
        title: listTitle,
        items: sessionListItems,
        itemCount: sessionListItems.length,
      },
    };

    if (existingSession) {
      // If a session exists (even if inactive), replace it.
      await this.sessions.replaceOne({ _id: sessionOwner }, newSession);
    } else {
      // Otherwise, insert a new session document.
      await this.sessions.insertOne(newSession);
    }

    return {};
  }

  /**
   * setOrdering (newType : OrderType, setter : User)
   * @requires : session's active Flag is currently False and setter = owner
   * @effects : ordering is set to newType
   *
   * Allows the owner to change the ordering type (e.g., Default, Random) for their session,
   * provided the session is not currently active.
   */
  async setOrdering(input: {
    newType: OrderType;
    setter: User;
  }): Promise<Empty | { error: string }> {
    const { newType, setter } = input;

    const session = await this.sessions.findOne({ owner: setter });

    // Precondition: A session must exist for the setter.
    if (!session) {
      return { error: `No session found for user '${setter}'.` };
    }
    // Precondition: The session's active flag must be False.
    if (session.active) {
      return {
        error:
          `Cannot change ordering while session for '${setter}' is active.`,
      };
    }
    // Precondition: setter must be the owner (handled by findOne({ owner: setter }) matching _id).

    // Effect: The session's ordering is updated.
    await this.sessions.updateOne(
      { _id: setter },
      { $set: { ordering: newType } },
    );

    return {};
  }

  /**
   * setFormat (newFormat : FormatType, setter : User)
   * @requires : session's active Flag is currently False and setter = owner
   * @effects : format is set to newFormat
   *
   * Allows the owner to change the format type (e.g., List, Kanban) for their session,
   * provided the session is not currently active.
   */
  async setFormat(input: {
    newFormat: FormatType;
    setter: User;
  }): Promise<Empty | { error: string }> {
    const { newFormat, setter } = input;

    const session = await this.sessions.findOne({ owner: setter });

    // Precondition: A session must exist for the setter.
    if (!session) {
      return { error: `No session found for user '${setter}'.` };
    }
    // Precondition: The session's active flag must be False.
    if (session.active) {
      return {
        error: `Cannot change format while session for '${setter}' is active.`,
      };
    }
    // Precondition: setter must be the owner (handled by findOne({ owner: setter }) matching _id).

    // Effect: The session's format is updated.
    await this.sessions.updateOne(
      { _id: setter },
      { $set: { format: newFormat } },
    );

    return {};
  }

  /**
   * randomizeOrder (randomizer : User)
   * @requires : session's ordering is set to "Random" and randomizer = owner
   * @effects : each ListItems randomOrder value is updated at random, maintaining dependencies between tasks
   *
   * Assigns unique random numbers to the `randomOrder` field for each item in the session's list.
   * This implementation interprets "maintaining dependencies between tasks" as simply re-shuffling
   * the relative order of tasks *if the ordering type is 'Random'*, without handling complex,
   * external task dependency graphs not explicitly present in the SessionListItem state.
   */
  async randomizeOrder(input: {
    randomizer: User;
  }): Promise<Empty | { error: string }> {
    const { randomizer } = input;

    const session = await this.sessions.findOne({ owner: randomizer });

    // Precondition: A session must exist for the randomizer.
    if (!session) {
      return { error: `No session found for user '${randomizer}'.` };
    }
    // Precondition: The session's ordering must be set to "Random".
    if (session.ordering !== OrderType.Random) {
      return {
        error:
          `Cannot randomize order; session for '${randomizer}' is not set to random ordering.`,
      };
    }
    // Precondition: randomizer must be the owner (implicit).

    // Effect: `randomOrder` values are updated.
    const items = session.list.items;
    // Create a shuffled array of indices/numbers to assign as new random orders.
    const shuffledOrders = Array.from({ length: items.length }, (_, i) => i)
      .sort(() => Math.random() - 0.5);

    const updatedItems = items.map((item, index) => ({
      ...item,
      randomOrder: shuffledOrders[index], // Assign a unique random order.
    }));

    await this.sessions.updateOne(
      { _id: randomizer },
      { $set: { "list.items": updatedItems } },
    );

    return {};
  }

  /**
   * activateSession (activator : User)
   * @requires : session's active Flag is currently False and activator = owner
   * @effects : session's active Flag is set to True
   *
   * Activates the user's session, making it ready for task progression.
   */
  async activateSession(input: {
    activator: User;
  }): Promise<Empty | { error: string }> {
    const { activator } = input;

    const session = await this.sessions.findOne({ owner: activator });

    // Precondition: A session must exist for the activator.
    if (!session) {
      return { error: `No session found for user '${activator}'.` };
    }
    // Precondition: The session's active flag must currently be False.
    if (session.active) {
      return { error: `Session for '${activator}' is already active.` };
    }
    // Precondition: activator must be the owner (implicit).

    // Effect: The session's active flag is set to True.
    await this.sessions.updateOne(
      { _id: activator },
      { $set: { active: true } },
    );

    return {};
  }

  /**
   * startTask (task : Task, sessionOwner : User)
   * @requires : task is in a ListItem for session's list, its status is currently "Incomplete", and no other task is "In Progress"
   * @effects : given ListItem's status is set to "In Progress"
   *
   * Marks a specific task as "In Progress" within an active session.
   * Ensures only one task can be in progress at a time.
   */
  async startTask(input: {
    task: Task;
    sessionOwner: User;
  }): Promise<Empty | { error: string }> {
    const { task, sessionOwner } = input;

    const session = await this.sessions.findOne({ owner: sessionOwner });

    // Precondition: A session must exist for the owner.
    if (!session) {
      return { error: `No session found for user '${sessionOwner}'.` };
    }
    // Ensure the session is active before starting tasks.
    if (!session.active) {
      return {
        error:
          `Session for user '${sessionOwner}' is not active. Activate it first.`,
      };
    }

    const currentItems = session.list.items;
    const taskToStart = currentItems.find((item) => item.task === task);

    // Precondition: The task must be present in the session's list items.
    if (!taskToStart) {
      return {
        error: `Task '${task}' not found in session for '${sessionOwner}'.`,
      };
    }
    // Precondition: The task's status must currently be "Incomplete".
    if (taskToStart.itemStatus !== TaskStatus.Incomplete) {
      return {
        error:
          `Task '${task}' is not in 'Incomplete' status. Current: ${taskToStart.itemStatus}.`,
      };
    }
    // Precondition: No other task should be "In Progress" simultaneously.
    const inProgressTask = currentItems.find(
      (item) => item.itemStatus === TaskStatus.InProgress,
    );
    if (inProgressTask) {
      return {
        error:
          `Another task ('${inProgressTask.task}') is already 'In Progress'.`,
      };
    }

    // Effect: The specified task's status is updated to "In Progress".
    const updatedItems = currentItems.map((item) =>
      item.task === task ? { ...item, itemStatus: TaskStatus.InProgress } : item
    );

    await this.sessions.updateOne(
      { _id: sessionOwner },
      { $set: { "list.items": updatedItems } },
    );

    return {};
  }

  /**
   * completeTask (task : Task, sessionOwner : User)
   * @requires : task is in a ListItem for session's list and its status is currently "In Progress"
   * @effects : given ListItem's status is set to "Complete"
   *
   * Marks a specific task as "Complete" within a session.
   */
  async completeTask(input: {
    task: Task;
    sessionOwner: User;
  }): Promise<Empty | { error: string }> {
    const { task, sessionOwner } = input;

    const session = await this.sessions.findOne({ owner: sessionOwner });

    // Precondition: A session must exist for the owner.
    if (!session) {
      return { error: `No session found for user '${sessionOwner}'.` };
    }
    // Ensure the session is active.
    if (!session.active) {
      return {
        error:
          `Session for user '${sessionOwner}' is not active. Activate it first.`,
      };
    }

    const currentItems = session.list.items;
    const taskToComplete = currentItems.find((item) => item.task === task);

    // Precondition: The task must be present in the session's list items.
    if (!taskToComplete) {
      return {
        error: `Task '${task}' not found in session for '${sessionOwner}'.`,
      };
    }
    // Precondition: The task's status must currently be "In Progress".
    if (taskToComplete.itemStatus !== TaskStatus.InProgress) {
      return {
        error:
          `Task '${task}' is not in 'In Progress' status. Current: ${taskToComplete.itemStatus}.`,
      };
    }

    // Effect: The specified task's status is updated to "Complete".
    const updatedItems = currentItems.map((item) =>
      item.task === task ? { ...item, itemStatus: TaskStatus.Complete } : item
    );

    await this.sessions.updateOne(
      { _id: sessionOwner },
      { $set: { "list.items": updatedItems } },
    );

    return {};
  }

  /**
   * endSession (sessionOwner : User)
   * @requires : session's active Flag is currently True
   * @effects : session's active Flag is set to False
   *
   * Deactivates the user's session, indicating completion or suspension of work.
   */
  async endSession(input: {
    sessionOwner: User;
  }): Promise<Empty | { error: string }> {
    const { sessionOwner } = input;

    const session = await this.sessions.findOne({ owner: sessionOwner });

    // Precondition: A session must exist for the owner.
    if (!session) {
      return { error: `No session found for user '${sessionOwner}'.` };
    }
    // Precondition: The session's active flag must currently be True.
    if (!session.active) {
      return { error: `Session for '${sessionOwner}' is not active.` };
    }

    // Effect: The session's active flag is set to False.
    await this.sessions.updateOne(
      { _id: sessionOwner },
      { $set: { active: false } },
    );

    return {};
  }

  // --- Queries ---

  /**
   * _getSession(sessionOwner: User): SessionDoc | null
   * Returns the complete session document for a given owner.
   * This query allows inspection of the entire state managed by the concept for a user.
   */
  async _getSession(input: { sessionOwner: User }): Promise<SessionDoc | null> {
    const { sessionOwner } = input;
    return await this.sessions.findOne({ owner: sessionOwner });
  }

  /**
   * _getTasksInOrder(sessionOwner: User): Array<{task: Task, order: number, status: TaskStatus}> | { error: string }
   * Returns the tasks for the session, ordered according to the session's current `ordering` type.
   * This is a non-trivial observation of the state as it involves sorting logic.
   */
  async _getTasksInOrder(input: {
    sessionOwner: User;
  }): Promise<
    Array<{ task: Task; order: number; status: TaskStatus }> | { error: string }
  > {
    const { sessionOwner } = input;
    const session = await this.sessions.findOne({ owner: sessionOwner });

    if (!session) {
      return { error: `No session found for user '${sessionOwner}'.` };
    }

    let orderedItems = [...session.list.items]; // Create a mutable copy for sorting.

    // Sort based on the session's current ordering type.
    if (session.ordering === OrderType.Default) {
      orderedItems.sort((a, b) => a.defaultOrder - b.defaultOrder);
    } else if (session.ordering === OrderType.Random) {
      orderedItems.sort((a, b) => a.randomOrder - b.randomOrder);
    }

    // Map to a simpler output format for the query result.
    return orderedItems.map((item) => ({
      task: item.task,
      order: session.ordering === OrderType.Default
        ? item.defaultOrder
        : item.randomOrder,
      status: item.itemStatus,
    }));
  }
}
