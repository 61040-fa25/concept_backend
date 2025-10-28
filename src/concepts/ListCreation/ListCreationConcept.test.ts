import {
  assertArrayIncludes,
  assertEquals,
  assertExists,
  assertNotEquals,
} from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Assuming @utils/database.ts provides testDb
import { Empty, ID } from "@utils/types.ts"; // Assuming @utils/types.ts provides ID and Empty
import ListCreationConcept from "./ListCreationConcept.ts";

// Define some mock IDs for testing
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userChris = "user:Chris" as ID;
const taskA = "task:Alpha" as ID;
const taskB = "task:Beta" as ID;
const taskC = "task:Gamma" as ID;
const taskD = "task:Delta" as ID;

Deno.test("ListCreationConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new ListCreationConcept(db);

  await t.step("should successfully create a new list", async () => {
    const result = await concept.newList({
      listName: "My To-Do List",
      listOwner: userAlice,
    });
    assertExists(
      (result as { list: ID }).list,
      "Should return a list ID on success",
    );
    const listId = (result as { list: ID }).list;

    const createdList = await concept._getListById({ listId });
    assertExists(createdList, "Created list should be retrievable");
    assertEquals(createdList?.title, "My To-Do List");
    assertEquals(createdList?.owner, userAlice);
    assertEquals(createdList?.itemCount, 0);
    assertEquals(createdList?.listItems.length, 0);
  });

  await t.step(
    "should prevent creating a list with the same name for the same owner",
    async () => {
      await concept.newList({
        listName: "Shopping List",
        listOwner: userAlice,
      }); // First creation
      const result = await concept.newList({
        listName: "Shopping List",
        listOwner: userAlice,
      }); // Attempt duplicate

      assertExists(
        (result as { error: string }).error,
        "Should return an error for duplicate list name/owner",
      );
      assertEquals(
        (result as { error: string }).error,
        "List with name 'Shopping List' already exists for user 'user:Alice'.",
      );
    },
  );

  await t.step(
    "should allow creating a list with the same name for a different owner",
    async () => {
      const result = await concept.newList({
        listName: "Shopping List",
        listOwner: userBob,
      }); // Alice already has "Shopping List"
      assertExists(
        (result as { list: ID }).list,
        "Should succeed for a different owner",
      );

      const createdList = await concept._getListById({
        listId: (result as { list: ID }).list,
      });
      assertExists(createdList, "List for Bob should be retrievable");
      assertEquals(createdList?.owner, userBob);
    },
  );

  let aliceListId: ID;

  await t.step(
    "should add tasks to a list, incrementing itemCount and assigning default order",
    async () => {
      const listResult = await concept.newList({
        listName: "Alice's Daily Tasks",
        listOwner: userAlice,
      });
      aliceListId = (listResult as { list: ID }).list;

      // Add first task
      const addTask1Result = await concept.addTask({
        name: "Task Alpha",
        list: aliceListId,
        task: taskA,
        adder: userAlice,
      });
      assertExists(
        (addTask1Result as { listItem: any }).listItem,
        "Should return a listItem on success",
      );
      assertEquals((addTask1Result as { listItem: any }).listItem.task, taskA);
      assertEquals(
        (addTask1Result as { listItem: any }).listItem.orderNumber,
        1,
      );
      assertEquals(
        (addTask1Result as { listItem: any }).listItem.taskStatus,
        "incomplete",
      );

      let updatedList = await concept._getListById({ listId: aliceListId });
      assertEquals(updatedList?.itemCount, 1);
      assertEquals(updatedList?.listItems.length, 1);
      assertEquals(updatedList?.listItems[0].task, taskA);
      assertEquals(updatedList?.listItems[0].orderNumber, 1);

      // Add second task
      const addTask2Result = await concept.addTask({
        name: "Task Beta",
        list: aliceListId,
        task: taskB,
        adder: userAlice,
      });
      assertExists((addTask2Result as { listItem: any }).listItem);
      assertEquals((addTask2Result as { listItem: any }).listItem.task, taskB);
      assertEquals(
        (addTask2Result as { listItem: any }).listItem.orderNumber,
        2,
      );

      updatedList = await concept._getListById({ listId: aliceListId });
      assertEquals(updatedList?.itemCount, 2);
      assertEquals(updatedList?.listItems.length, 2);
      const tasks = (await concept._getTasksInList({ listId: aliceListId })) ||
        [];
      assertEquals(tasks[0].task, taskA);
      assertEquals(tasks[0].orderNumber, 1);
      assertEquals(tasks[1].task, taskB);
      assertEquals(tasks[1].orderNumber, 2);
    },
  );

  await t.step(
    "should prevent adding a task that already exists in the list",
    async () => {
      const result = await concept.addTask({
        name: "Task Alpha",
        list: aliceListId,
        task: taskA,
        adder: userAlice,
      });
      assertExists(
        (result as { error: string }).error,
        "Should return an error for adding existing task",
      );
      assertEquals(
        (result as { error: string }).error,
        `Task '${taskA}' is already in list '${aliceListId}'.`,
      );
    },
  );

  await t.step(
    "should prevent non-owners from adding tasks to a list",
    async () => {
      const result = await concept.addTask({
        name: "Task C",
        list: aliceListId,
        task: taskC,
        adder: userBob,
      });
      assertExists(
        (result as { error: string }).error,
        "Should return an error for non-owner",
      );
      assertEquals(
        (result as { error: string }).error,
        `User '${userBob}' is not the owner of list '${aliceListId}'.`,
      );

      const updatedList = await concept._getListById({ listId: aliceListId });
      assertEquals(updatedList?.itemCount, 2, "Item count should not change");
    },
  );

  await t.step(
    "should delete tasks from a list and adjust order numbers",
    async () => {
      // Add taskC to have 3 items: A(1), B(2), C(3)
      await concept.addTask({
        name: "Task C",
        list: aliceListId,
        task: taskC,
        adder: userAlice,
      });
      let updatedList = await concept._getListById({ listId: aliceListId });
      assertEquals(updatedList?.itemCount, 3);
      let tasks = (await concept._getTasksInList({ listId: aliceListId })) ||
        [];
      assertEquals(tasks.map((t) => t.task), [taskA, taskB, taskC]);
      assertEquals(tasks.map((t) => t.orderNumber), [1, 2, 3]);

      // Delete taskB (middle item)
      const deleteResult = await concept.deleteTask({
        list: aliceListId,
        task: taskB,
        deleter: userAlice,
      });
      assertEquals(deleteResult, {}, "Should return empty object on success");

      updatedList = await concept._getListById({ listId: aliceListId });
      assertEquals(updatedList?.itemCount, 2);
      assertEquals(updatedList?.listItems.length, 2);

      tasks = (await concept._getTasksInList({ listId: aliceListId })) || [];
      assertEquals(
        tasks.map((t) => t.task),
        [taskA, taskC],
        "Task B should be removed",
      );
      assertEquals(
        tasks.map((t) => t.orderNumber),
        [1, 2],
        "Order numbers should be adjusted: C moves from 3 to 2",
      );
    },
  );

  await t.step("should prevent deleting a non-existent task", async () => {
    const result = await concept.deleteTask({
      list: aliceListId,
      task: taskD,
      deleter: userAlice,
    });
    assertExists(
      (result as { error: string }).error,
      "Should return an error for non-existent task",
    );
    assertEquals(
      (result as { error: string }).error,
      `Task '${taskD}' not found in list '${aliceListId}'.`,
    );
  });

  await t.step("should prevent non-owners from deleting tasks", async () => {
    const result = await concept.deleteTask({
      list: aliceListId,
      task: taskA,
      deleter: userBob,
    });
    assertExists(
      (result as { error: string }).error,
      "Should return an error for non-owner deleting",
    );
    assertEquals(
      (result as { error: string }).error,
      `User '${userBob}' is not the owner of list '${aliceListId}'.`,
    );

    const updatedList = await concept._getListById({ listId: aliceListId });
    assertEquals(updatedList?.itemCount, 2, "Item count should not change");
    const tasks = (await concept._getTasksInList({ listId: aliceListId })) ||
      [];
    assertEquals(
      tasks.map((t) => t.task),
      [taskA, taskC],
      "Tasks should remain unchanged",
    );
  });

  await t.step("should reassign task order (move up)", async () => {
    // Current state: A(1), C(2)
    // Add D to make it: A(1), C(2), D(3)
    await concept.addTask({
      name: "Task D",
      list: aliceListId,
      task: taskD,
      adder: userAlice,
    });
    let tasksBefore =
      (await concept._getTasksInList({ listId: aliceListId })) || [];
    assertEquals(tasksBefore.map((t) => t.task), [taskA, taskC, taskD]);
    assertEquals(tasksBefore.map((t) => t.orderNumber), [1, 2, 3]);

    // Move D (currently at order 3) to order 1
    const assignResult = await concept.assignOrder({
      list: aliceListId,
      task: taskD,
      newOrder: 1,
      assigner: userAlice,
    });
    assertEquals(assignResult, {}, "Should return empty object on success");

    let tasksAfter = (await concept._getTasksInList({ listId: aliceListId })) ||
      [];
    assertEquals(
      tasksAfter.map((t) => t.task),
      [taskD, taskA, taskC],
      "Task D should be first",
    );
    assertEquals(
      tasksAfter.map((t) => t.orderNumber),
      [1, 2, 3],
      "Order numbers should be adjusted correctly",
    );
  });

  await t.step("should reassign task order (move down)", async () => {
    // Current state: D(1), A(2), C(3)
    // Move D (currently at order 1) to order 3
    const assignResult = await concept.assignOrder({
      list: aliceListId,
      task: taskD,
      newOrder: 3,
      assigner: userAlice,
    });
    assertEquals(assignResult, {}, "Should return empty object on success");

    let tasksAfter = (await concept._getTasksInList({ listId: aliceListId })) ||
      [];
    assertEquals(
      tasksAfter.map((t) => t.task),
      [taskA, taskC, taskD],
      "Task D should be last",
    );
    assertEquals(
      tasksAfter.map((t) => t.orderNumber),
      [1, 2, 3],
      "Order numbers should be adjusted correctly",
    );
  });

  await t.step(
    "should prevent assigning order to a non-existent task",
    async () => {
      const result = await concept.assignOrder({
        list: aliceListId,
        task: taskB,
        newOrder: 1,
        assigner: userAlice,
      });
      assertExists(
        (result as { error: string }).error,
        "Should return an error for non-existent task",
      );
      assertEquals(
        (result as { error: string }).error,
        `Task '${taskB}' not found in list '${aliceListId}'.`,
      );
    },
  );

  await t.step(
    "should prevent non-owners from assigning task order",
    async () => {
      const result = await concept.assignOrder({
        list: aliceListId,
        task: taskA,
        newOrder: 2,
        assigner: userBob,
      });
      assertExists(
        (result as { error: string }).error,
        "Should return an error for non-owner assigning order",
      );
      assertEquals(
        (result as { error: string }).error,
        `User '${userBob}' is not the owner of list '${aliceListId}'.`,
      );
    },
  );

  await t.step("should prevent assigning an order out of bounds", async () => {
    // Current itemCount is 3 (tasks A, C, D)
    const outOfBoundsLow = await concept.assignOrder({
      list: aliceListId,
      task: taskA,
      newOrder: 0,
      assigner: userAlice,
    });
    assertExists((outOfBoundsLow as { error: string }).error);
    assertEquals(
      (outOfBoundsLow as { error: string }).error,
      `New order '0' is out of bounds (1 to 3).`,
    );

    const outOfBoundsHigh = await concept.assignOrder({
      list: aliceListId,
      task: taskA,
      newOrder: 4,
      assigner: userAlice,
    });
    assertExists((outOfBoundsHigh as { error: string }).error);
    assertEquals(
      (outOfBoundsHigh as { error: string }).error,
      `New order '4' is out of bounds (1 to 3).`,
    );
  });

  await t.step("should handle no change in order gracefully", async () => {
    // Current state: A(1), C(2), D(3). Task A is at order 1.
    const result = await concept.assignOrder({
      list: aliceListId,
      task: taskA,
      newOrder: 1,
      assigner: userAlice,
    });
    assertEquals(
      result,
      {},
      "Should return empty object for no effective change",
    );

    const tasksAfter =
      (await concept._getTasksInList({ listId: aliceListId })) || [];
    assertEquals(tasksAfter.map((t) => t.task), [taskA, taskC, taskD]);
    assertEquals(tasksAfter.map((t) => t.orderNumber), [1, 2, 3]);
  });

  await t.step(
    "# trace: Principle - Users can create a to-do list, add tasks, and set their ordering.",
    async () => {
      // 1. User creates a to-do list
      const listResult = await concept.newList({
        listName: "Shopping List",
        listOwner: userChris,
      });
      const shoppingListId = (listResult as { list: ID }).list;
      assertExists(shoppingListId, "Shopping list should be created");

      // 2. User selects tasks from their task bank to add to it (and they get default ordering)
      await concept.addTask({
        name: "Task Milk",
        list: shoppingListId,
        task: "task:Milk" as ID,
        adder: userChris,
      });
      await concept.addTask({
        name: "Task Bread",
        list: shoppingListId,
        task: "task:Bread" as ID,
        adder: userChris,
      });
      await concept.addTask({
        name: "Task Eggs",
        list: shoppingListId,
        task: "task:Eggs" as ID,
        adder: userChris,
      });

      let currentTasks =
        (await concept._getTasksInList({ listId: shoppingListId })) || [];
      assertEquals(currentTasks.length, 3, "All tasks should be added");
      assertEquals(currentTasks.map((t) => t.task), [
        "task:Milk",
        "task:Bread",
        "task:Eggs",
      ]);
      assertEquals(
        currentTasks.map((t) => t.orderNumber),
        [1, 2, 3],
        "Tasks should have default ascending order",
      );

      // 3. User sets a default ordering of the tasks (by reordering them)
      // Let's say user wants Eggs first, then Milk, then Bread
      await concept.assignOrder({
        list: shoppingListId,
        task: "task:Eggs" as ID,
        newOrder: 1,
        assigner: userChris,
      });
      await concept.assignOrder({
        list: shoppingListId,
        task: "task:Milk" as ID,
        newOrder: 2,
        assigner: userChris,
      });
      // Bread should automatically be at 3 after the above two moves.

      currentTasks =
        (await concept._getTasksInList({ listId: shoppingListId })) || [];
      assertEquals(currentTasks.map((t) => t.task), [
        "task:Eggs",
        "task:Milk",
        "task:Bread",
      ], "Tasks should be in the new user-defined order");
      assertEquals(
        currentTasks.map((t) => t.orderNumber),
        [1, 2, 3],
        "Order numbers should remain contiguous and reflect the new logical order",
      );

      // Verification of internal state (optional, but good for understanding effect)
      const finalShoppingList = await concept._getListById({
        listId: shoppingListId,
      });
      assertArrayIncludes(finalShoppingList?.listItems || [], [
        {
          name: "Task Eggs",
          task: "task:Eggs" as ID,
          orderNumber: 1,
          taskStatus: "incomplete",
        },
        {
          name: "Task Milk",
          task: "task:Milk" as ID,
          orderNumber: 2,
          taskStatus: "incomplete",
        },
        {
          name: "Task Bread",
          task: "task:Bread" as ID,
          orderNumber: 3,
          taskStatus: "incomplete",
        },
      ]);
    },
  );

  // Close the database connection after all tests in this suite
  await client.close();
});
