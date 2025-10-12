import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ListCreationConcept from "@concepts/ListCreation/ListCreationConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("ListCreationConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new ListCreationConcept(db);

  // Mock Task IDs (external to this concept)
  const taskA = "task:Alpha" as ID;
  const taskB = "task:Beta" as ID;
  const taskC = "task:Gamma" as ID;
  const taskD = "task:Delta" as ID;
  const taskE = "task:Epsilon" as ID;

  await t.step("newList: should create a new list successfully", async () => {
    const listName = "My First List";
    const result = await concept.newList({ listName });
    assertExists(result);
    assertNotEquals(
      (result as { error: string }).error,
      `List with name '${listName}' already exists.`,
      "Should not return an error for a new list.",
    );
    assertExists(
      (result as { list: ID }).list,
      "Should return the ID of the new list.",
    );

    const listId = (result as { list: ID }).list;
    const retrievedList = await concept._getListById({ listId });
    assertExists(retrievedList);
    assertEquals(retrievedList.title, listName);
    assertEquals(retrievedList.itemCount, 0);
    assertEquals(retrievedList.listItems.length, 0);

    const allLists = await concept._getLists();
    assertEquals(allLists.length, 1);
  });

  await t.step(
    "newList: should not create a list with a duplicate name",
    async () => {
      const listName = "My First List"; // Use the same name as before
      const result = await concept.newList({ listName });
      assertExists(result);
      assertExists(
        (result as { error: string }).error,
        "Should return an error for a duplicate list name.",
      );
      assertEquals(
        (result as { error: string }).error,
        `List with name '${listName}' already exists.`,
      );

      const allLists = await concept._getLists();
      assertEquals(allLists.length, 1, "No new list should be created.");
    },
  );

  let listId: ID;
  await t.step("Setup: Create a second list for subsequent tests", async () => {
    const listName = "My Second List";
    const result = await concept.newList({ listName });
    assertExists(result);
    listId = (result as { list: ID }).list;
    assertExists(listId);
    const allLists = await concept._getLists();
    assertEquals(allLists.length, 2);
  });

  await t.step(
    "addTask: should add a task to a list successfully",
    async () => {
      const resultA = await concept.addTask({ list: listId, task: taskA });
      assertExists(resultA);
      assertExists(
        (resultA as { listItem: any }).listItem,
        "Should return the new list item.",
      );
      assertEquals((resultA as { listItem: any }).listItem.task, taskA);
      assertEquals((resultA as { listItem: any }).listItem.orderNumber, 1);
      assertEquals(
        (resultA as { listItem: any }).listItem.taskStatus,
        "incomplete",
      );

      const resultB = await concept.addTask({ list: listId, task: taskB });
      assertExists(resultB);
      assertExists(
        (resultB as { listItem: any }).listItem,
        "Should return the new list item.",
      );
      assertEquals((resultB as { listItem: any }).listItem.task, taskB);
      assertEquals((resultB as { listItem: any }).listItem.orderNumber, 2);

      const retrievedList = await concept._getListById({ listId });
      assertExists(retrievedList);
      assertEquals(retrievedList.itemCount, 2);
      assertEquals(retrievedList.listItems.length, 2);
      assertEquals(retrievedList.listItems[0].task, taskA);
      assertEquals(retrievedList.listItems[0].orderNumber, 1);
      assertEquals(retrievedList.listItems[1].task, taskB);
      assertEquals(retrievedList.listItems[1].orderNumber, 2);

      const tasksInList = await concept._getTasksInList({ listId });
      assertExists(tasksInList);
      assertEquals(tasksInList.length, 2);
      assertEquals(tasksInList[0].task, taskA);
      assertEquals(tasksInList[1].task, taskB);
    },
  );

  await t.step(
    "addTask: should not add a duplicate task to the same list",
    async () => {
      const result = await concept.addTask({ list: listId, task: taskA });
      assertExists(result);
      assertExists(
        (result as { error: string }).error,
        "Should return an error for adding a duplicate task.",
      );
      assertEquals(
        (result as { error: string }).error,
        `Task '${taskA}' is already in list '${listId}'.`,
      );

      const retrievedList = await concept._getListById({ listId });
      assertExists(retrievedList);
      assertEquals(retrievedList.itemCount, 2, "Item count should not change.");
    },
  );

  await t.step(
    "addTask: should return error if list does not exist",
    async () => {
      const nonExistentList = "list:NonExistent" as ID;
      const result = await concept.addTask({
        list: nonExistentList,
        task: taskC,
      });
      assertExists(result);
      assertExists(
        (result as { error: string }).error,
        "Should return an error for a non-existent list.",
      );
      assertEquals(
        (result as { error: string }).error,
        `List with ID '${nonExistentList}' not found.`,
      );
    },
  );

  await t.step(
    "deleteTask: should delete an existing task and reorder others",
    async () => {
      await concept.addTask({ list: listId, task: taskC }); // Add taskC at order 3
      await concept.addTask({ list: listId, task: taskD }); // Add taskD at order 4

      let retrievedList = await concept._getListById({ listId });
      assertEquals(retrievedList?.itemCount, 4);
      assertEquals(retrievedList?.listItems.map((item) => item.orderNumber), [
        1,
        2,
        3,
        4,
      ]);

      const result = await concept.deleteTask({ list: listId, task: taskB }); // taskB was order 2
      assertEquals(result, {});

      retrievedList = await concept._getListById({ listId });
      assertExists(retrievedList);
      assertEquals(retrievedList.itemCount, 3);
      assertEquals(retrievedList.listItems.length, 3);

      const tasks = retrievedList.listItems.sort((a, b) =>
        a.orderNumber - b.orderNumber
      ); // Ensure sorted for verification
      assertEquals(tasks[0].task, taskA, "taskA should remain at order 1");
      assertEquals(tasks[0].orderNumber, 1);
      assertEquals(
        tasks[1].task,
        taskC,
        "taskC should shift from order 3 to 2",
      );
      assertEquals(tasks[1].orderNumber, 2);
      assertEquals(
        tasks[2].task,
        taskD,
        "taskD should shift from order 4 to 3",
      );
      assertEquals(tasks[2].orderNumber, 3);
    },
  );

  await t.step(
    "deleteTask: should return error if task does not exist in list",
    async () => {
      const result = await concept.deleteTask({ list: listId, task: taskE }); // taskE was never added
      assertExists(result);
      assertExists(
        (result as { error: string }).error,
        "Should return an error for deleting non-existent task.",
      );
      assertEquals(
        (result as { error: string }).error,
        `Task '${taskE}' not found in list '${listId}'.`,
      );

      const retrievedList = await concept._getListById({ listId });
      assertEquals(
        retrievedList?.itemCount,
        3,
        "Item count should not change.",
      );
    },
  );

  await t.step(
    "deleteTask: should return error if list does not exist",
    async () => {
      const nonExistentList = "list:NonExistent" as ID;
      const result = await concept.deleteTask({
        list: nonExistentList,
        task: taskA,
      });
      assertExists(result);
      assertExists(
        (result as { error: string }).error,
        "Should return an error for a non-existent list.",
      );
      assertEquals(
        (result as { error: string }).error,
        `List with ID '${nonExistentList}' not found.`,
      );
    },
  );

  await t.step(
    "assignOrder: should reassign order and shift other items correctly (move up)",
    async () => {
      // Current tasks: taskA (1), taskC (2), taskD (3)
      let retrievedList = await concept._getListById({ listId });
      assertEquals(
        retrievedList?.listItems.map((item) => ({
          task: item.task,
          order: item.orderNumber,
        })).sort((a, b) => a.order - b.order),
        [
          { task: taskA, order: 1 },
          { task: taskC, order: 2 },
          { task: taskD, order: 3 },
        ],
      );

      await concept.assignOrder({ list: listId, task: taskD, newOrder: 1 }); // Move taskD from 3 to 1
      retrievedList = await concept._getListById({ listId });
      assertExists(retrievedList);
      assertEquals(retrievedList.itemCount, 3);

      const tasks = retrievedList.listItems.sort((a, b) =>
        a.orderNumber - b.orderNumber
      );
      assertEquals(tasks[0].task, taskD, "taskD should be at order 1");
      assertEquals(tasks[0].orderNumber, 1);
      assertEquals(tasks[1].task, taskA, "taskA should shift from 1 to 2");
      assertEquals(tasks[1].orderNumber, 2);
      assertEquals(tasks[2].task, taskC, "taskC should shift from 2 to 3");
      assertEquals(tasks[2].orderNumber, 3);
    },
  );

  await t.step(
    "assignOrder: should reassign order and shift other items correctly (move down)",
    async () => {
      // Current tasks: taskD (1), taskA (2), taskC (3)
      let retrievedList = await concept._getListById({ listId });
      assertEquals(
        retrievedList?.listItems.map((item) => ({
          task: item.task,
          order: item.orderNumber,
        })).sort((a, b) => a.order - b.order),
        [
          { task: taskD, order: 1 },
          { task: taskA, order: 2 },
          { task: taskC, order: 3 },
        ],
      );

      await concept.assignOrder({ list: listId, task: taskD, newOrder: 3 }); // Move taskD from 1 to 3
      retrievedList = await concept._getListById({ listId });
      assertExists(retrievedList);
      assertEquals(retrievedList.itemCount, 3);

      const tasks = retrievedList.listItems.sort((a, b) =>
        a.orderNumber - b.orderNumber
      );
      assertEquals(tasks[0].task, taskA, "taskA should shift from 2 to 1");
      assertEquals(tasks[0].orderNumber, 1);
      assertEquals(tasks[1].task, taskC, "taskC should shift from 3 to 2");
      assertEquals(tasks[1].orderNumber, 2);
      assertEquals(tasks[2].task, taskD, "taskD should be at order 3");
      assertEquals(tasks[2].orderNumber, 3);
    },
  );

  await t.step(
    "assignOrder: should do nothing if new order is same as old order",
    async () => {
      // Current tasks: taskA (1), taskC (2), taskD (3)
      let retrievedListBefore = await concept._getListById({ listId });
      assertExists(retrievedListBefore);
      const originalItems = [...retrievedListBefore.listItems];

      await concept.assignOrder({ list: listId, task: taskA, newOrder: 1 }); // TaskA is already at order 1
      let retrievedListAfter = await concept._getListById({ listId });
      assertExists(retrievedListAfter);
      assertEquals(
        retrievedListAfter.listItems.sort((a, b) =>
          a.orderNumber - b.orderNumber
        ),
        originalItems.sort((a, b) => a.orderNumber - b.orderNumber),
        "List items should not change",
      );
    },
  );

  await t.step(
    "assignOrder: should return error if task does not exist in list",
    async () => {
      const result = await concept.assignOrder({
        list: listId,
        task: taskE,
        newOrder: 1,
      });
      assertExists(result);
      assertExists(
        (result as { error: string }).error,
        "Should return an error for non-existent task.",
      );
      assertEquals(
        (result as { error: string }).error,
        `Task '${taskE}' not found in list '${listId}'.`,
      );
    },
  );

  await t.step(
    "assignOrder: should return error if new order is out of bounds",
    async () => {
      const retrievedList = await concept._getListById({ listId });
      assertExists(retrievedList);
      const itemCount = retrievedList.itemCount;

      const resultLow = await concept.assignOrder({
        list: listId,
        task: taskA,
        newOrder: 0,
      });
      assertExists(resultLow);
      assertExists(
        (resultLow as { error: string }).error,
        "Should return an error for newOrder < 1.",
      );
      assertEquals(
        (resultLow as { error: string }).error,
        `New order '0' is out of bounds (1 to ${itemCount}).`,
      );

      const resultHigh = await concept.assignOrder({
        list: listId,
        task: taskA,
        newOrder: itemCount + 1,
      });
      assertExists(resultHigh);
      assertExists(
        (resultHigh as { error: string }).error,
        "Should return an error for newOrder > itemCount.",
      );
      assertEquals(
        (resultHigh as { error: string }).error,
        `New order '${itemCount + 1}' is out of bounds (1 to ${itemCount}).`,
      );
    },
  );

  await t.step(
    "assignOrder: should return error if list does not exist",
    async () => {
      const nonExistentList = "list:NonExistent" as ID;
      const result = await concept.assignOrder({
        list: nonExistentList,
        task: taskA,
        newOrder: 1,
      });
      assertExists(result);
      assertExists(
        (result as { error: string }).error,
        "Should return an error for a non-existent list.",
      );
      assertEquals(
        (result as { error: string }).error,
        `List with ID '${nonExistentList}' not found.`,
      );
    },
  );

  await t.step(
    "Principle Trace: users can create a to-do list, select tasks from their task bank to add to it, and set a default ordering of the tasks according to their dependencies",
    async () => {
      // 1. Create a to-do list
      const { list: myTodoListId } =
        (await concept.newList({ listName: "My To-Do List" })) as { list: ID };
      assertExists(myTodoListId);

      // 2. Select tasks from their task bank to add to it (using taskA, taskB, taskC)
      await concept.addTask({ list: myTodoListId, task: taskA }); // order 1
      await concept.addTask({ list: myTodoListId, task: taskB }); // order 2
      await concept.addTask({ list: myTodoListId, task: taskC }); // order 3

      let myTodoList = await concept._getListById({ listId: myTodoListId });
      assertExists(myTodoList);
      assertEquals(myTodoList.itemCount, 3);
      let tasks = myTodoList.listItems.sort((a, b) =>
        a.orderNumber - b.orderNumber
      );
      assertEquals(tasks[0].task, taskA);
      assertEquals(tasks[0].orderNumber, 1);
      assertEquals(tasks[1].task, taskB);
      assertEquals(tasks[1].orderNumber, 2);
      assertEquals(tasks[2].task, taskC);
      assertEquals(tasks[2].orderNumber, 3);

      // 3. Set a default ordering of the tasks according to their dependencies (e.g., move taskC to be first)
      await concept.assignOrder({
        list: myTodoListId,
        task: taskC,
        newOrder: 1,
      });

      myTodoList = await concept._getListById({ listId: myTodoListId });
      assertExists(myTodoList);
      tasks = myTodoList.listItems.sort((a, b) =>
        a.orderNumber - b.orderNumber
      );
      assertEquals(tasks[0].task, taskC, "taskC should be first");
      assertEquals(tasks[0].orderNumber, 1);
      assertEquals(tasks[1].task, taskA, "taskA should have shifted to second");
      assertEquals(tasks[1].orderNumber, 2);
      assertEquals(tasks[2].task, taskB, "taskB should have shifted to third");
      assertEquals(tasks[2].orderNumber, 3);
    },
  );

  await client.close();
});
