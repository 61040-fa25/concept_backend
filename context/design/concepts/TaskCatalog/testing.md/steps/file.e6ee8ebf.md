---
timestamp: 'Tue Oct 14 2025 22:30:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_223045.5a1d5602.md]]'
content_id: e6ee8ebffae5bb00a6b9220e1fd947311983ef447aa843d118bbf28dd6298dcc
---

# file: src/TaskCatalog/TaskCatalog.test.ts

```typescript
import { assertEquals, assertExists, assertInstanceOf, assertNotEquals, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import TaskCatalogConcept from "./TaskCatalogConcept.ts";

Deno.test("TaskCatalog Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const taskCatalog = new TaskCatalogConcept(db);

  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;

  await t.step("Action: createTask - Valid task creation", async () => {
    console.log("--- Test: createTask - Valid task creation ---");
    const result = await taskCatalog.createTask({
      owner: userAlice,
      description: "Buy groceries for dinner",
    });

    console.log("Expected: task ID returned, no error.");
    console.log("Result:", result);

    assertExists((result as { task: ID }).task);
    const taskId = (result as { task: ID }).task;

    const tasks = await taskCatalog._getTasksByOwner({ owner: userAlice });
    assertEquals(tasks.length, 1, "Should have one task for Alice");
    assertEquals(tasks[0].id, taskId, "Task ID should match");
    assertEquals(tasks[0].description, "Buy groceries for dinner", "Task description should match");
    assertEquals(tasks[0].isCompleted, false, "Task should not be completed initially");
    console.log("Confirmed task exists and has correct initial state.");
  });

  await t.step("Action: createTask - Empty description requirement", async () => {
    console.log("--- Test: createTask - Empty description requirement ---");
    const result = await taskCatalog.createTask({ owner: userAlice, description: "" });

    console.log("Expected: error message for empty description.");
    console.log("Result:", result);

    assertExists((result as { error: string }).error, "Should return an error for empty description");
    assertEquals(
      (result as { error: string }).error,
      "Task description cannot be empty.",
      "Error message should match expectation",
    );
    console.log("Confirmed: creation failed with expected error.");
  });

  await t.step("Action: markTaskComplete - Valid completion", async () => {
    console.log("--- Test: markTaskComplete - Valid completion ---");
    const createResult = await taskCatalog.createTask({
      owner: userAlice,
      description: "Water the plants",
    });
    const taskId = (createResult as { task: ID }).task;

    console.log(`Created task ${taskId}: "Water the plants". Marking complete.`);
    const markResult = await taskCatalog.markTaskComplete({ task: taskId });

    console.log("Expected: no error.");
    console.log("Result:", markResult);

    assertEquals(Object.keys(markResult).length, 0, "Should return empty object for success");

    const tasks = await taskCatalog._getTasksByOwner({ owner: userAlice });
    const completedTask = tasks.find((t) => t.id === taskId);
    assertExists(completedTask, "Task should still exist after completion");
    assertEquals(completedTask.isCompleted, true, "Task should be marked as completed");
    console.log("Confirmed: task is marked as complete.");
  });

  await t.step("Action: markTaskComplete - Non-existent task", async () => {
    console.log("--- Test: markTaskComplete - Non-existent task ---");
    const nonExistentTask = "nonExistent:task123" as ID;
    const result = await taskCatalog.markTaskComplete({ task: nonExistentTask });

    console.log("Expected: error for non-existent task.");
    console.log("Result:", result);

    assertExists((result as { error: string }).error, "Should return an error for non-existent task");
    assertEquals(
      (result as { error: string }).error,
      `Task with ID ${nonExistentTask} not found.`,
      "Error message should match expectation",
    );
    console.log("Confirmed: completion failed with expected error.");
  });

  await t.step("Action: markTaskComplete - Already completed task", async () => {
    console.log("--- Test: markTaskComplete - Already completed task ---");
    const createResult = await taskCatalog.createTask({
      owner: userAlice,
      description: "Already done task",
    });
    const taskId = (createResult as { task: ID }).task;
    await taskCatalog.markTaskComplete({ task: taskId }); // Mark it complete once

    console.log(`Task ${taskId} already completed. Attempting to mark complete again.`);
    const result = await taskCatalog.markTaskComplete({ task: taskId });

    console.log("Expected: error for already completed task.");
    console.log("Result:", result);

    assertExists((result as { error: string }).error, "Should return an error for already completed task");
    assertEquals(
      (result as { error: string }).error,
      `Task with ID ${taskId} is already completed.`,
      "Error message should match expectation",
    );
    console.log("Confirmed: completion failed with expected error.");
  });

  await t.step("Action: updateTaskDescription - Valid update", async () => {
    console.log("--- Test: updateTaskDescription - Valid update ---");
    const createResult = await taskCatalog.createTask({
      owner: userBob,
      description: "Initial description",
    });
    const taskId = (createResult as { task: ID }).task;
    const newDescription = "Updated task description";

    console.log(`Created task ${taskId}. Updating description to "${newDescription}".`);
    const updateResult = await taskCatalog.updateTaskDescription({ task: taskId, newDescription });

    console.log("Expected: no error.");
    console.log("Result:", updateResult);

    assertEquals(Object.keys(updateResult).length, 0, "Should return empty object for success");

    const tasks = await taskCatalog._getTasksByOwner({ owner: userBob });
    const updatedTask = tasks.find((t) => t.id === taskId);
    assertExists(updatedTask, "Task should still exist after update");
    assertEquals(updatedTask.description, newDescription, "Task description should be updated");
    console.log("Confirmed: task description updated.");
  });

  await t.step("Action: updateTaskDescription - Empty new description", async () => {
    console.log("--- Test: updateTaskDescription - Empty new description ---");
    const createResult = await taskCatalog.createTask({
      owner: userBob,
      description: "Another task",
    });
    const taskId = (createResult as { task: ID }).task;

    console.log(`Attempting to update task ${taskId} with an empty description.`);
    const result = await taskCatalog.updateTaskDescription({ task: taskId, newDescription: "" });

    console.log("Expected: error for empty description.");
    console.log("Result:", result);

    assertExists((result as { error: string }).error, "Should return an error for empty description");
    assertEquals(
      (result as { error: string }).error,
      "New task description cannot be empty.",
      "Error message should match expectation",
    );
    console.log("Confirmed: update failed with expected error.");
  });

  await t.step("Action: deleteTask - Valid deletion", async () => {
    console.log("--- Test: deleteTask - Valid deletion ---");
    const createResult = await taskCatalog.createTask({
      owner: userAlice,
      description: "Task to be deleted",
    });
    const taskId = (createResult as { task: ID }).task;

    console.log(`Created task ${taskId}. Deleting it.`);
    const deleteResult = await taskCatalog.deleteTask({ task: taskId });

    console.log("Expected: no error.");
    console.log("Result:", deleteResult);

    assertEquals(Object.keys(deleteResult).length, 0, "Should return empty object for success");

    const tasks = await taskCatalog._getTasksByOwner({ owner: userAlice });
    const deletedTask = tasks.find((t) => t.id === taskId);
    assertEquals(deletedTask, undefined, "Task should no longer exist after deletion");
    console.log("Confirmed: task deleted successfully.");
  });

  await t.step("Action: deleteTask - Non-existent task", async () => {
    console.log("--- Test: deleteTask - Non-existent task ---");
    const nonExistentTask = "nonExistent:task456" as ID;
    const result = await taskCatalog.deleteTask({ task: nonExistentTask });

    console.log("Expected: error for non-existent task.");
    console.log("Result:", result);

    assertExists((result as { error: string }).error, "Should return an error for non-existent task");
    assertEquals(
      (result as { error: string }).error,
      `Task with ID ${nonExistentTask} not found.`,
      "Error message should match expectation",
    );
    console.log("Confirmed: deletion failed with expected error.");
  });

  await t.step("Principle Test: Create, Complete, and Query lifecycle", async () => {
    console.log("--- Principle Test: Create, Complete, and Query lifecycle ---");

    // Trace: Create task 1
    console.log("1. Alice creates Task 1: 'Submit report'.");
    const task1Result = await taskCatalog.createTask({
      owner: userAlice,
      description: "Submit report",
    });
    const task1Id = (task1Result as { task: ID }).task;
    assertExists(task1Id, "Task 1 should be created.");

    // Trace: Create task 2
    console.log("2. Alice creates Task 2: 'Schedule meeting'.");
    const task2Result = await taskCatalog.createTask({
      owner: userAlice,
      description: "Schedule meeting",
    });
    const task2Id = (task2Result as { task: ID }).task;
    assertExists(task2Id, "Task 2 should be created.");

    // Trace: Bob creates his own task
    console.log("3. Bob creates Task 3: 'Review code'.");
    const task3Result = await taskCatalog.createTask({
      owner: userBob,
      description: "Review code",
    });
    const task3Id = (task3Result as { task: ID }).task;
    assertExists(task3Id, "Task 3 should be created.");

    // Query active tasks for Alice
    console.log("4. Querying active tasks for Alice.");
    let aliceActiveTasks = await taskCatalog._getActiveTasksByOwner({ owner: userAlice });
    assertEquals(aliceActiveTasks.length, 2, "Alice should have 2 active tasks.");
    assertObjectMatch(
      aliceActiveTasks.find((t) => t.id === task1Id)!,
      { id: task1Id, description: "Submit report" },
    );
    assertObjectMatch(
      aliceActiveTasks.find((t) => t.id === task2Id)!,
      { id: task2Id, description: "Schedule meeting" },
    );
    console.log("Confirmed Alice has 2 active tasks as expected.");

    // Query completed tasks for Alice
    console.log("5. Querying completed tasks for Alice (should be 0).");
    let aliceCompletedTasks = await taskCatalog._getCompletedTasksByOwner({ owner: userAlice });
    assertEquals(aliceCompletedTasks.length, 0, "Alice should have 0 completed tasks.");
    console.log("Confirmed Alice has 0 completed tasks as expected.");

    // Trace: Mark task 1 complete
    console.log("6. Alice marks Task 1 as complete.");
    await taskCatalog.markTaskComplete({ task: task1Id });

    // Query active tasks for Alice again
    console.log("7. Querying active tasks for Alice after completion of Task 1.");
    aliceActiveTasks = await taskCatalog._getActiveTasksByOwner({ owner: userAlice });
    assertEquals(aliceActiveTasks.length, 1, "Alice should now have 1 active task.");
    assertNotEquals(
      aliceActiveTasks.find((t) => t.id === task1Id),
      true,
      "Task 1 should not be in active tasks.",
    );
    assertObjectMatch(
      aliceActiveTasks.find((t) => t.id === task2Id)!,
      { id: task2Id, description: "Schedule meeting" },
    );
    console.log("Confirmed Alice has 1 active task, and Task 1 is no longer active.");

    // Query completed tasks for Alice again
    console.log("8. Querying completed tasks for Alice after completion of Task 1.");
    aliceCompletedTasks = await taskCatalog._getCompletedTasksByOwner({ owner: userAlice });
    assertEquals(aliceCompletedTasks.length, 1, "Alice should now have 1 completed task.");
    assertObjectMatch(
      aliceCompletedTasks.find((t) => t.id === task1Id)!,
      { id: task1Id, description: "Submit report" },
    );
    console.log("Confirmed Alice has 1 completed task, which is Task 1.");

    // Query all tasks for Alice
    console.log("9. Querying all tasks for Alice.");
    const allAliceTasks = await taskCatalog._getTasksByOwner({ owner: userAlice });
    assertEquals(allAliceTasks.length, 2, "Alice should have 2 total tasks (1 active, 1 completed).");
    assertObjectMatch(
      allAliceTasks.find((t) => t.id === task1Id)!,
      { id: task1Id, description: "Submit report", isCompleted: true },
    );
    assertObjectMatch(
      allAliceTasks.find((t) => t.id === task2Id)!,
      { id: task2Id, description: "Schedule meeting", isCompleted: false },
    );
    console.log("Confirmed all Alice's tasks, with correct completion status.");

    // Query active tasks for Bob (ensure isolation)
    console.log("10. Querying active tasks for Bob.");
    const bobActiveTasks = await taskCatalog._getActiveTasksByOwner({ owner: userBob });
    assertEquals(bobActiveTasks.length, 1, "Bob should have 1 active task.");
    assertObjectMatch(
      bobActiveTasks[0],
      { id: task3Id, description: "Review code" },
    );
    console.log("Confirmed Bob's tasks are isolated from Alice's.");

    console.log("Principle fulfilled: Task lifecycle (create, complete, query) behaves as expected.");
  });

  await client.close();
});
```
