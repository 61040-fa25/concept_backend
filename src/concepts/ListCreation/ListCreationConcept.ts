import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts"; // Assuming @utils/types.ts provides ID and Empty
import { freshID } from "@utils/database.ts"; // Assuming @utils/database.ts provides freshID

// Declare collection prefix, use concept name
const PREFIX = "ListCreation" + ".";

// Generic types of this concept
type List = ID; // The ID of a List document created by this concept
type Task = ID; // e.g., an ID from a Task concept, external to ListCreation

/**
 * @interface ListItem
 * A member of a list.
 *
 * @state a set of ListItems with
 *   a task of type Task
 *   an orderNumber of type Number
 *   a taskStatus of type String // Inferred from addTask action
 */
interface ListItem {
  task: Task;
  orderNumber: number;
  taskStatus: "incomplete" | "complete"; // Assuming these are the possible statuses
}

/**
 * @interface ListDocument
 * Represents a user-created list.
 *
 * @state a set of Lists with
 *   a title of type String
 *   a set of ListItems (embedded within the list)
 *   an itemCount of type Number
 */
interface ListDocument {
  _id: List;
  title: string;
  listItems: ListItem[];
  itemCount: number;
}

export default class ListCreationConcept {
  private lists: Collection<ListDocument>;

  /**
   * @concept ListCreation
   * @purpose allow for grouping of tasks into lists, subsets of the task bank
   */
  constructor(private readonly db: Db) {
    this.lists = this.db.collection(PREFIX + "lists");
  }

  /**
   * @action newList
   * @principle users can create a to-do list, select tasks from their task bank to add to it,
   *            and set a default ordering of the tasks according to their dependencies.
   *
   * Creates a new list with the specified name.
   *
   * @param {object} params - The action arguments.
   * @param {string} params.listName - The title of the new list.
   * @returns {{list: List} | {error: string}} - An object containing the ID of the new list on success, or an error message.
   *
   * @requires no List with listName exists in set of Lists
   * @effects new List with title = listName, itemCount = 0, and an empty set of ListItems is returned and added to set of Lists
   */
  async newList({ listName }: { listName: string }): Promise<{ list: List } | { error: string }> {
    // Requires: no List with listName exists
    const existingList = await this.lists.findOne({ title: listName });
    if (existingList) {
      return { error: `List with name '${listName}' already exists.` };
    }

    const newListId = freshID();
    const newList: ListDocument = {
      _id: newListId,
      title: listName,
      listItems: [], // Initialize with an empty array of list items
      itemCount: 0, // Initialize item count to 0
    };

    // Effects: new List is added to the database
    await this.lists.insertOne(newList);

    return { list: newListId };
  }

  /**
   * @action addTask
   *
   * Adds a task to a specified list. The task is initially marked as 'incomplete'
   * and assigned an order number that places it at the end of the current list.
   *
   * @param {object} params - The action arguments.
   * @param {List} params.list - The ID of the list to add the task to.
   * @param {Task} params.task - The ID of the task to add.
   * @returns {{listItem: ListItem} | {error: string}} - An object containing the newly created ListItem on success, or an error message.
   *
   * @requires listItem containing task is not already in list
   * @effects a new listItem is created with task = task, taskStatus = incomplete, and orderNumber = itemCount+1.
   *          itemCount is incremented. The new listItem is returned and added to list's set of listItems.
   */
  async addTask({ list: listId, task }: { list: List; task: Task }): Promise<{ listItem: ListItem } | { error: string }> {
    const targetList = await this.lists.findOne({ _id: listId });

    if (!targetList) {
      return { error: `List with ID '${listId}' not found.` };
    }

    // Requires: listItem containing task is not already in list
    const existingListItem = targetList.listItems.find((item) => item.task === task);
    if (existingListItem) {
      return { error: `Task '${task}' is already in list '${listId}'.` };
    }

    // Effects: new listItem is created and added, itemCount is incremented
    const newOrderNumber = targetList.itemCount + 1; // Assign order number to be last
    const newListItem: ListItem = {
      task: task,
      orderNumber: newOrderNumber,
      taskStatus: "incomplete", // Default status as per effects
    };

    await this.lists.updateOne(
      { _id: listId },
      {
        $push: { listItems: newListItem }, // Add the new item to the embedded array
        $inc: { itemCount: 1 }, // Increment the count of items in the list
      },
    );

    return { listItem: newListItem };
  }

  /**
   * @action deleteTask
   *
   * Removes a task from a specified list. The order numbers of subsequent tasks
   * are adjusted to maintain a contiguous sequence.
   *
   * @param {object} params - The action arguments.
   * @param {List} params.list - The ID of the list to delete the task from.
   * @param {Task} params.task - The ID of the task to delete.
   * @returns {Empty | {error: string}} - An empty object on success, or an error message.
   *
   * @requires a listItem containing task is in list's set of listItems
   * @effects the listItem containing task is removed from list's set of listItems.
   *          orderNumbers of subsequent items are decremented. itemCount is decremented.
   */
  async deleteTask({ list: listId, task }: { list: List; task: Task }): Promise<Empty | { error: string }> {
    const targetList = await this.lists.findOne({ _id: listId });

    if (!targetList) {
      return { error: `List with ID '${listId}' not found.` };
    }

    // Requires: a listItem containing task is in list's set of listItems
    const listItemIndex = targetList.listItems.findIndex((item) => item.task === task);
    if (listItemIndex === -1) {
      return { error: `Task '${task}' not found in list '${listId}'.` };
    }

    const removedOrderNumber = targetList.listItems[listItemIndex].orderNumber;

    // Effects: listItem is removed, orderNumbers adjusted, itemCount decremented
    const updatedListItems = targetList.listItems
      .filter((_, index) => index !== listItemIndex) // Remove the target item
      .map((item) => {
        // Shift order numbers of items that were after the removed item
        if (item.orderNumber > removedOrderNumber) {
          return { ...item, orderNumber: item.orderNumber - 1 };
        }
        return item;
      });

    await this.lists.updateOne(
      { _id: listId },
      {
        $set: { listItems: updatedListItems }, // Update the entire array
        $inc: { itemCount: -1 }, // Decrement the count of items
      },
    );

    return {};
  }

  /**
   * @action assignOrder
   *
   * Reassigns the order number of a specific task within a list.
   * Other tasks' order numbers are adjusted to maintain a contiguous sequence.
   *
   * @param {object} params - The action arguments.
   * @param {List} params.list - The ID of the list containing the task.
   * @param {Task} params.task - The ID of the task whose order is to be assigned.
   * @param {number} params.newOrder - The new order number for the task (1-indexed).
   * @returns {Empty | {error: string}} - An empty object on success, or an error message.
   *
   * @requires task belongs to a ListItem in list and newOrder is valid (1 to itemCount)
   * @effects task's ListItem gets orderNumber set to newOrder and the ListItems with
   *          orderNumbers between the old value and new value are offset by one accordingly.
   */
  async assignOrder({ list: listId, task, newOrder }: { list: List; task: Task; newOrder: number }): Promise<Empty | { error: string }> {
    const targetList = await this.lists.findOne({ _id: listId });

    if (!targetList) {
      return { error: `List with ID '${listId}' not found.` };
    }

    const listItemIndex = targetList.listItems.findIndex((item) => item.task === task);
    if (listItemIndex === -1) {
      return { error: `Task '${task}' not found in list '${listId}'.` };
    }

    const oldOrder = targetList.listItems[listItemIndex].orderNumber;

    // Validate newOrder against the current itemCount
    if (newOrder < 1 || newOrder > targetList.itemCount) {
      return { error: `New order '${newOrder}' is out of bounds (1 to ${targetList.itemCount}).` };
    }

    if (newOrder === oldOrder) {
      return {}; // No change needed if the order is the same
    }

    // Effects: re-order list items by adjusting other items' orderNumbers
    const updatedListItems = targetList.listItems.map((item) => {
      if (item.task === task) {
        // This is the item being moved
        return { ...item, orderNumber: newOrder };
      }

      if (newOrder < oldOrder) {
        // Item is moving UP (to a smaller order number)
        // Items between newOrder and oldOrder (exclusive) should shift DOWN (+1)
        if (item.orderNumber >= newOrder && item.orderNumber < oldOrder) {
          return { ...item, orderNumber: item.orderNumber + 1 };
        }
      } else { // newOrder > oldOrder
        // Item is moving DOWN (to a larger order number)
        // Items between oldOrder (exclusive) and newOrder should shift UP (-1)
        if (item.orderNumber > oldOrder && item.orderNumber <= newOrder) {
          return { ...item, orderNumber: item.orderNumber - 1 };
        }
      }
      return item;
    });

    // Sort the list items by their orderNumber to ensure consistent array ordering in the database.
    // This is good practice but not strictly required by the effects if queries always sort.
    updatedListItems.sort((a, b) => a.orderNumber - b.orderNumber);

    await this.lists.updateOne(
      { _id: listId },
      {
        $set: { listItems: updatedListItems }, // Update the entire array with adjusted order numbers
      },
    );

    return {};
  }

  // --- Concept Queries ---

  /**
   * @query _getLists
   * Returns all lists stored by this concept.
   *
   * @returns {Promise<ListDocument[]>} - An array of all ListDocuments.
   */
  async _getLists(): Promise<ListDocument[]> {
    return this.lists.find({}).toArray();
  }

  /**
   * @query _getListById
   * Returns a specific list document by its ID.
   *
   * @param {object} params - The query arguments.
   * @param {List} params.listId - The ID of the list to retrieve.
   * @returns {Promise<ListDocument | null>} - The ListDocument if found, otherwise null.
   */
  async _getListById({ listId }: { listId: List }): Promise<ListDocument | null> {
    return this.lists.findOne({ _id: listId });
  }

  /**
   * @query _getTasksInList
   * Returns all list items (tasks) for a given list, sorted by their orderNumber.
   *
   * @param {object} params - The query arguments.
   * @param {List} params.listId - The ID of the list to retrieve tasks from.
   * @returns {Promise<ListItem[] | null>} - An array of ListItems sorted by order, or null if the list is not found.
   */
  async _getTasksInList({ listId }: { listId: List }): Promise<ListItem[] | null> {
    const list = await this.lists.findOne({ _id: listId });
    if (!list) {
      return null;
    }
    // Return the list items sorted by orderNumber as per the concept's ordering principle.
    // A shallow copy is made before sorting to avoid modifying the original array if it were stored directly.
    return [...list.listItems].sort((a, b) => a.orderNumber - b.orderNumber);
  }
}