---
timestamp: 'Sun Oct 12 2025 22:52:22 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_225222.aed26b18.md]]'
content_id: b87303164684306b61c296d9d4bdb64e6dfa29e60a1e733d276dde691a43594c
---

# response:

```typescript
// file: src/ListCreation/ListCreationConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "ListCreation" + ".";

// Generic types of this concept
type List = ID; // The ID of a List document created by this concept
type User = ID; // The ID of a User, e.g., from a UserAuthentication concept, external to ListCreation
type Task = ID; // The ID of a Task, e.g., from a TaskManagement concept, external to ListCreation

/**
 * @interface ListItem
 * A member of a list, representing a task within that list.
 *
 * @state a set of ListItems with
 *   a task of type Task
 *   an orderNumber of type Number
 *   a taskStatus of type String ("incomplete" or "complete")
 */
interface ListItem {
  task: Task;
  orderNumber: number;
  taskStatus: "incomplete" | "complete"; // Defaulted to "incomplete" on addition, can be changed by other concepts
}

/**
 * @interface ListDocument
 * Represents a user-created list, which groups tasks.
 *
 * @state a set of Lists with
 *   an owner of type User
 *   a title of type String
 *   a set of ListItems (embedded within the list)
 *   an itemCount of type Number
 */
interface ListDocument {
  _id: List;
  owner: User;
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
   * Creates a new list with the specified name and owner.
   *
   * @param {object} params - The action arguments.
   * @param {string} params.listName - The title of the new list.
   * @param {User} params.listOwner - The ID of the user who owns this list.
   * @returns {{list: List} | {error: string}} - An object containing the ID of the new list on success, or an error message.
   *
   * @requires no List with listName exists in set of Lists with owner = listOwner
   * @effects new List with title = listName, owner = listOwner, itemCount = 0, and an empty set of ListItems is returned and added to set of Lists
   */
  async newList({ listName, listOwner }: { listName: string; listOwner: User }): Promise<{ list: List } | { error: string }> {
    // Requires: no List with listName exists in set of Lists with owner = listOwner
    const existingList = await this.lists.findOne({ title: listName, owner: listOwner });
    if (existingList) {
      return { error: `List with name '${listName}' already exists for user '${listOwner}'.` };
    }

    const newListId = freshID();
    const newList: ListDocument = {
      _id: newListId,
      owner: listOwner,
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
   * @param {User} params.adder - The ID of the user attempting to add the task (must be the owner).
   * @returns {{listItem: ListItem} | {error: string}} - An object containing the newly created ListItem on success, or an error message.
   *
   * @requires listItem containing task is not already in list and adder = owner of list
   * @effects a new listItem is created with task = task, taskStatus = incomplete, and orderNumber = itemCount+1.
   *          itemCount is incremented. The new listItem is returned and added to list's set of listItems.
   */
  async addTask({ list: listId, task, adder }: { list: List; task: Task; adder: User }): Promise<{ listItem: ListItem } | { error: string }> {
    const targetList = await this.lists.findOne({ _id: listId });

    if (!targetList) {
      return { error: `List with ID '${listId}' not found.` };
    }

    // Requires: adder = owner of list
    if (targetList.owner !== adder) {
      return { error: `User '${adder}' is not the owner of list '${listId}'.` };
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
   * @param {User} params.deleter - The ID of the user attempting to delete the task (must be the owner).
   * @returns {Empty | {error: string}} - An empty object on success, or an error message.
   *
   * @requires a listItem containing task is in list's set of listItems and deleter = owner of list
   * @effects the listItem containing task is removed from list's set of listItems.
   *          orderNumbers of subsequent items are decremented. itemCount is decremented.
   */
  async deleteTask({ list: listId, task, deleter }: { list: List; task: Task; deleter: User }): Promise<Empty | { error: string }> {
    const targetList = await this.lists.findOne({ _id: listId });

    if (!targetList) {
      return { error: `List with ID '${listId}' not found.` };
    }

    // Requires: deleter = owner of list
    if (targetList.owner !== deleter) {
      return { error: `User '${deleter}' is not the owner of list '${listId}'.` };
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
   * @param {User} params.assigner - The ID of the user attempting to assign the order (must be the owner).
   * @returns {Empty | {error: string}} - An empty object on success, or an error message.
   *
   * @requires task belongs to a ListItem in list and assigner = owner of list
   * @requires newOrder is valid (1 to itemCount)
   * @effects task's ListItem gets orderNumber set to newOrder and the ListItems with
   *          orderNumbers between the old value and new value are offset by one accordingly.
   */
  async assignOrder({ list: listId, task, newOrder, assigner }: { list: List; task: Task; newOrder: number; assigner: User }): Promise<Empty | { error: string }> {
    const targetList = await this.lists.findOne({ _id: listId });

    if (!targetList) {
      return { error: `List with ID '${listId}' not found.` };
    }

    // Requires: assigner = owner of list
    if (targetList.owner !== assigner) {
      return { error: `User '${assigner}' is not the owner of list '${listId}'.` };
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
        // Items between newOrder (inclusive) and oldOrder (exclusive) should shift DOWN (+1)
        if (item.orderNumber >= newOrder && item.orderNumber < oldOrder) {
          return { ...item, orderNumber: item.orderNumber + 1 };
        }
      } else { // newOrder > oldOrder
        // Item is moving DOWN (to a larger order number)
        // Items between oldOrder (exclusive) and newOrder (inclusive) should shift UP (-1)
        if (item.orderNumber > oldOrder && item.orderNumber <= newOrder) {
          return { ...item, orderNumber: item.orderNumber - 1 };
        }
      }
      return item;
    });

    // Sort the list items by their orderNumber to ensure consistent array ordering in the database.
    // This is good practice for embedded arrays to maintain logical order for queries.
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
   * @query _getListsByOwner
   * Returns all lists owned by a specific user.
   *
   * @param {object} params - The query arguments.
   * @param {User} params.ownerId - The ID of the user whose lists to retrieve.
   * @returns {Promise<ListDocument[]>} - An array of ListDocuments owned by the user.
   */
  async _getListsByOwner({ ownerId }: { ownerId: User }): Promise<ListDocument[]> {
    return this.lists.find({ owner: ownerId }).toArray();
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
    // Return the list items sorted by orderNumber.
    // A shallow copy is made before sorting to avoid modifying the original array if it were stored directly.
    return [...list.listItems].sort((a, b) => a.orderNumber - b.orderNumber);
  }
}
```

```typescript
// file: src/ListCreation/ListCreationConcept.test.ts

import { assertEquals, assertNotEquals, assertExists, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ListCreationConcept from "./ListCreationConcept.ts";
import { ID } from "@utils/types.ts"; // Assuming @utils/types.ts provides ID

Deno.test("ListCreation Concept", async (t) => {
  let concept: ListCreationConcept;
  let client: any; // MongoClient instance

  // Define some reusable IDs for users and tasks
  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const taskA = "task:buyMilk" as ID;
  const taskB = "task:buyBread" as ID;
  const taskC = "task:buyEggs" as ID;
  const taskD = "task:payBills" as ID;
  const taskE = "task:waterPlants" as ID;

  t.beforeAll(async () => {
    const [db, mongoClient] = await testDb();
    concept = new ListCreationConcept(db);
    client = mongoClient;
  });

  t.afterAll(async () => {
    await client.close();
  });

  await t.step("newList action", async (st) => {
    let listId: ID;

    st.beforeEach(async () => {
      // Clear collections to ensure a clean slate for each sub-test
      await concept["lists"].deleteMany({});
    });

    await st.step("should successfully create a new list", async () => {
      const result = await concept.newList({ listName: "Groceries", listOwner: userAlice });
      assertExists((result as { list: ID }).list);
      listId = (result as { list: ID }).list;

      const createdList = await concept._getListById({ listId });
      assertExists(createdList);
      assertEquals(createdList.title, "Groceries");
      assertEquals(createdList.owner, userAlice);
      assertEquals(createdList.itemCount, 0);
      assertEquals(createdList.listItems.length, 0);
    });

    await st.step("should return an error if a list with the same name already exists for the owner", async () => {
      await concept.newList({ listName: "Groceries", listOwner: userAlice }); // Create once
      const result = await concept.newList({ listName: "Groceries", listOwner: userAlice }); // Try to create again
      assertExists((result as { error: string }).error);
      assertEquals((result as { error: string }).error, `List with name 'Groceries' already exists for user 'user:Alice'.`);
    });

    await st.step("should allow lists with the same name for different owners", async () => {
      const result1 = await concept.newList({ listName: "Shopping", listOwner: userAlice });
      const result2 = await concept.newList({ listName: "Shopping", listOwner: userBob });
      assertExists((result1 as { list: ID }).list);
      assertExists((result2 as { list: ID }).list);
      assertNotEquals((result1 as { list: ID }).list, (result2 as { list: ID }).list);

      const aliceLists = await concept._getListsByOwner({ ownerId: userAlice });
      const bobLists = await concept._getListsByOwner({ ownerId: userBob });
      assertEquals(aliceLists.length, 1);
      assertEquals(bobLists.length, 1);
    });
  });

  await t.step("addTask action", async (st) => {
    let listId: ID;

    st.beforeEach(async () => {
      await concept["lists"].deleteMany({});
      const result = await concept.newList({ listName: "Daily Tasks", listOwner: userAlice });
      listId = (result as { list: ID }).list;
    });

    await st.step("should successfully add a task to a list", async () => {
      const result = await concept.addTask({ list: listId, task: taskA, adder: userAlice });
      assertExists((result as { listItem: any }).listItem);
      assertObjectMatch((result as { listItem: any }).listItem, {
        task: taskA,
        orderNumber: 1,
        taskStatus: "incomplete",
      });

      const updatedList = await concept._getListById({ listId });
      assertEquals(updatedList?.itemCount, 1);
      assertEquals(updatedList?.listItems.length, 1);
      assertObjectMatch(updatedList?.listItems[0]!, {
        task: taskA,
        orderNumber: 1,
      });
    });

    await st.step("should assign correct order numbers for multiple tasks", async () => {
      await concept.addTask({ list: listId, task: taskA, adder: userAlice });
      await concept.addTask({ list: listId, task: taskB, adder: userAlice });
      await concept.addTask({ list: listId, task: taskC, adder: userAlice });

      const updatedList = await concept._getListById({ listId });
      assertEquals(updatedList?.itemCount, 3);
      assertEquals(updatedList?.listItems.length, 3);

      const tasks = await concept._getTasksInList({ listId });
      assertEquals(tasks?.map((item) => ({ task: item.task, order: item.orderNumber })), [
        { task: taskA, order: 1 },
        { task: taskB, order: 2 },
        { task: taskC, order: 3 },
      ]);
    });

    await st.step("should return an error if the task is already in the list", async () => {
      await concept.addTask({ list: listId, task: taskA, adder: userAlice });
      const result = await concept.addTask({ list: listId, task: taskA, adder: userAlice });
      assertExists((result as { error: string }).error);
      assertEquals((result as { error: string }).error, `Task '${taskA}' is already in list '${listId}'.`);
    });

    await st.step("should return an error if the adder is not the owner of the list", async () => {
      const result = await concept.addTask({ list: listId, task: taskA, adder: userBob });
      assertExists((result as { error: string }).error);
      assertEquals((result as { error: string }).error, `User '${userBob}' is not the owner of list '${listId}'.`);
    });

    await st.step("should return an error if the list does not exist", async () => {
      const nonExistentList = "list:nonexistent" as ID;
      const result = await concept.addTask({ list: nonExistentList, task: taskA, adder: userAlice });
      assertExists((result as { error: string }).error);
      assertEquals((result as { error: string }).error, `List with ID '${nonExistentList}' not found.`);
    });
  });

  await t.step("deleteTask action", async (st) => {
    let listId: ID;

    st.beforeEach(async () => {
      await concept["lists"].deleteMany({});
      const result = await concept.newList({ listName: "Daily Tasks", listOwner: userAlice });
      listId = (result as { list: ID }).list;
      await concept.addTask({ list: listId, task: taskA, adder: userAlice }); // Order 1 (Milk)
      await concept.addTask({ list: listId, task: taskB, adder: userAlice }); // Order 2 (Bread)
      await concept.addTask({ list: listId, task: taskC, adder: userAlice }); // Order 3 (Eggs)
    });

    await st.step("should successfully delete a task and reorder subsequent items", async () => {
      const result = await concept.deleteTask({ list: listId, task: taskB, deleter: userAlice });
      assertEquals(result, {}); // Expect empty object for success

      const updatedList = await concept._getListById({ listId });
      assertEquals(updatedList?.itemCount, 2);
      assertEquals(updatedList?.listItems.length, 2);

      const tasks = await concept._getTasksInList({ listId });
      assertEquals(tasks?.map((item) => ({ task: item.task, order: item.orderNumber })), [
        { task: taskA, order: 1 },
        { task: taskC, order: 2 },
      ]);
    });

    await st.step("should delete the first task and reorder correctly", async () => {
      await concept.deleteTask({ list: listId, task: taskA, deleter: userAlice });
      const tasks = await concept._getTasksInList({ listId });
      assertEquals(tasks?.map((item) => ({ task: item.task, order: item.orderNumber })), [
        { task: taskB, order: 1 },
        { task: taskC, order: 2 },
      ]);
    });

    await st.step("should delete the last task without affecting other orders", async () => {
      await concept.deleteTask({ list: listId, task: taskC, deleter: userAlice });
      const tasks = await concept._getTasksInList({ listId });
      assertEquals(tasks?.map((item) => ({ task: item.task, order: item.orderNumber })), [
        { task: taskA, order: 1 },
        { task: taskB, order: 2 },
      ]);
    });

    await st.step("should return an error if the task is not in the list", async () => {
      const result = await concept.deleteTask({ list: listId, task: taskD, deleter: userAlice });
      assertExists((result as { error: string }).error);
      assertEquals((result as { error: string }).error, `Task '${taskD}' not found in list '${listId}'.`);
    });

    await st.step("should return an error if the deleter is not the owner of the list", async () => {
      const result = await concept.deleteTask({ list: listId, task: taskA, deleter: userBob });
      assertExists((result as { error: string }).error);
      assertEquals((result as { error: string }).error, `User '${userBob}' is not the owner of list '${listId}'.`);
    });

    await st.step("should return an error if the list does not exist", async () => {
      const nonExistentList = "list:nonexistent" as ID;
      const result = await concept.deleteTask({ list: nonExistentList, task: taskA, deleter: userAlice });
      assertExists((result as { error: string }).error);
      assertEquals((result as { error: string }).error, `List with ID '${nonExistentList}' not found.`);
    });
  });

  await t.step("assignOrder action", async (st) => {
    let listId: ID;

    st.beforeEach(async () => {
      await concept["lists"].deleteMany({});
      const result = await concept.newList({ listName: "Ordered Tasks", listOwner: userAlice });
      listId = (result as { list: ID }).list;
      await concept.addTask({ list: listId, task: taskA, adder: userAlice }); // Order 1 (Milk)
      await concept.addTask({ list: listId, task: taskB, adder: userAlice }); // Order 2 (Bread)
      await concept.addTask({ list: listId, task: taskC, adder: userAlice }); // Order 3 (Eggs)
      await concept.addTask({ list: listId, task: taskD, adder: userAlice }); // Order 4 (Bills)
    });

    await st.step("should successfully move a task up the list", async () => {
      // Move taskC (Eggs, currently order 3) to order 1
      const result = await concept.assignOrder({ list: listId, task: taskC, newOrder: 1, assigner: userAlice });
      assertEquals(result, {});

      const tasks = await concept._getTasksInList({ listId });
      assertEquals(tasks?.map((item) => ({ task: item.task, order: item.orderNumber })), [
        { task: taskC, order: 1 }, // Eggs
        { task: taskA, order: 2 }, // Milk (shifted from 1 to 2)
        { task: taskB, order: 3 }, // Bread (shifted from 2 to 3)
        { task: taskD, order: 4 }, // Bills (unchanged)
      ]);
    });

    await st.step("should successfully move a task down the list", async () => {
      // Move taskA (Milk, currently order 1) to order 3
      const result = await concept.assignOrder({ list: listId, task: taskA, newOrder: 3, assigner: userAlice });
      assertEquals(result, {});

      const tasks = await concept._getTasksInList({ listId });
      assertEquals(tasks?.map((item) => ({ task: item.task, order: item.orderNumber })), [
        { task: taskB, order: 1 }, // Bread (shifted from 2 to 1)
        { task: taskC, order: 2 }, // Eggs (shifted from 3 to 2)
        { task: taskA, order: 3 }, // Milk
        { task: taskD, order: 4 }, // Bills (unchanged)
      ]);
    });

    await st.step("should do nothing if newOrder is the same as current order", async () => {
      const originalTasks = await concept._getTasksInList({ listId });
      const result = await concept.assignOrder({ list: listId, task: taskB, newOrder: 2, assigner: userAlice });
      assertEquals(result, {}); // Still returns success
      const tasksAfter = await concept._getTasksInList({ listId });
      assertEquals(originalTasks, tasksAfter);
    });

    await st.step("should return an error if the task is not in the list", async () => {
      const result = await concept.assignOrder({ list: listId, task: taskE, newOrder: 1, assigner: userAlice });
      assertExists((result as { error: string }).error);
      assertEquals((result as { error: string }).error, `Task '${taskE}' not found in list '${listId}'.`);
    });

    await st.step("should return an error if the assigner is not the owner of the list", async () => {
      const result = await concept.assignOrder({ list: listId, task: taskA, newOrder: 1, assigner: userBob });
      assertExists((result as { error: string }).error);
      assertEquals((result as { error: string }).error, `User '${userBob}' is not the owner of list '${listId}'.`);
    });

    await st.step("should return an error if newOrder is out of bounds (too low)", async () => {
      const result = await concept.assignOrder({ list: listId, task: taskA, newOrder: 0, assigner: userAlice });
      assertExists((result as { error: string }).error);
      assertEquals((result as { error: string }).error, `New order '0' is out of bounds (1 to 4).`);
    });

    await st.step("should return an error if newOrder is out of bounds (too high)", async () => {
      const result = await concept.assignOrder({ list: listId, task: taskA, newOrder: 5, assigner: userAlice });
      assertExists((result as { error: string }).error);
      assertEquals((result as { error: string }).error, `New order '5' is out of bounds (1 to 4).`);
    });
  });

  await t.step("Principle fulfillment: create, add, order tasks", async () => {
    // @trace:
    // 1. Alice creates a list "Shopping List".
    // 2. Alice adds "Milk" to "Shopping List".
    // 3. Alice adds "Bread" to "Shopping List".
    // 4. Alice adds "Eggs" to "Shopping List".
    // 5. Check initial order: Milk (1), Bread (2), Eggs (3).
    // 6. Alice reorders "Bread" to position 1.
    // 7. Check new order: Bread (1), Milk (2), Eggs (3).

    await concept["lists"].deleteMany({}); // Ensure a clean slate

    // 1. Alice creates a list "Shopping List".
    const newListResult = await concept.newList({ listName: "Shopping List", listOwner: userAlice });
    const shoppingListId = (newListResult as { list: ID }).list;
    assertExists(shoppingListId);

    // 2. Alice adds "Milk" to "Shopping List".
    await concept.addTask({ list: shoppingListId, task: taskA, adder: userAlice }); // Milk
    // 3. Alice adds "Bread" to "Shopping List".
    await concept.addTask({ list: shoppingListId, task: taskB, adder: userAlice }); // Bread
    // 4. Alice adds "Eggs" to "Shopping List".
    await concept.addTask({ list: shoppingListId, task: taskC, adder: userAlice }); // Eggs

    // 5. Check initial order: Milk (1), Bread (2), Eggs (3).
    let currentTasks = await concept._getTasksInList({ listId: shoppingListId });
    assertEquals(currentTasks?.map(item => item.task), [taskA, taskB, taskC]);
    assertEquals(currentTasks?.map(item => item.orderNumber), [1, 2, 3]);

    // 6. Alice reorders "Bread" (taskB, currently order 2) to position 1.
    await concept.assignOrder({ list: shoppingListId, task: taskB, newOrder: 1, assigner: userAlice });

    // 7. Check new order: Bread (1), Milk (2), Eggs (3).
    currentTasks = await concept._getTasksInList({ listId: shoppingListId });
    assertEquals(currentTasks?.map(item => item.task), [taskB, taskA, taskC]);
    assertEquals(currentTasks?.map(item => item.orderNumber), [1, 2, 3]);

    const finalCount = (await concept._getListById({ listId: shoppingListId }))?.itemCount;
    assertEquals(finalCount, 3);
  });
});
```
