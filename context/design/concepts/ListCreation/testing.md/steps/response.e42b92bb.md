---
timestamp: 'Sun Oct 12 2025 20:52:46 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_205246.c4ed72b9.md]]'
content_id: e42b92bb9430608536fa95c92078815a409e70c913deddfb8ea5fb10582000ac
---

# response:

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
      await concept.addTask({ list: listId, task: taskA, adder: userAlice }); // Order 1
      await concept.addTask({ list: listId, task: taskB, adder: userAlice }); // Order 2
      await concept.addTask({ list: listId, task: taskC, adder: userAlice }); // Order 3
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
