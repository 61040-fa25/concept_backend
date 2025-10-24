---
timestamp: 'Thu Oct 23 2025 23:28:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_232823.879daee4.md]]'
content_id: 0f5f05587724876015fc3b24e94866a622863abc6047348032336e9e2636a908
---

# response:

```typescript
// file: src/Tasks/TasksConcept.test.ts
import { assertEquals, assertNotEquals, assert, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import TasksConcept, { TaskDocument, UserTasksDocument } from "./TasksConcept.ts";
import { ID } from "@utils/types.ts";

const USER_ALICE = "user:Alice" as ID;
const USER_BOB = "user:Bob" as ID;

Deno.test("Tasks Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const tasksConcept = new TasksConcept(db);

  // Helper function for consistent console logging
  const logAction = (name: string, input: object, output: object) => {
    console.log(`\n--- Action: ${name} ---`);
    console.log("Input:", JSON.stringify(input));
    console.log("Output:", JSON.stringify(output));
  };

  await t.step("Operational Principle: Tasks are added, prioritized, and completed", async () => {
    console.log("\n--- Scenario: Operational Principle ---");

    // 1. Create UserTasks for Alice
    const createUserResult1 = await tasksConcept.createUserTasks({ user: USER_ALICE });
    logAction("createUserTasks", { user: USER_ALICE }, createUserResult1);
    assertEquals(createUserResult1, {});

    // 2. Create a few tasks for Alice
    const task1DueDate = new Date("2024-07-15T09:00:00.000Z");
    const createTaskResult1 = await tasksConcept.createTask({
      owner: USER_ALICE,
      description: "Buy groceries",
      dueDate: task1DueDate,
      estimatedDuration: 60,
    });
    logAction("createTask", { owner: USER_ALICE, description: "Buy groceries" }, createTaskResult1);
    assertNotEquals(createTaskResult1, {});
    assert("task" in createTaskResult1);
    const task1Id = createTaskResult1.task;

    const createTaskResult2 = await tasksConcept.createTask({
      owner: USER_ALICE,
      description: "Walk the dog",
      estimatedDuration: 30,
    });
    logAction("createTask", { owner: USER_ALICE, description: "Walk the dog" }, createTaskResult2);
    assert("task" in createTaskResult2);
    const task2Id = createTaskResult2.task;

    const createTaskResult3 = await tasksConcept.createTask({
      owner: USER_ALICE,
      description: "Prepare presentation",
    });
    logAction("createTask", { owner: USER_ALICE, description: "Prepare presentation" }, createTaskResult3);
    assert("task" in createTaskResult3);
    const task3Id = createTaskResult3.task;

    // 3. Get all tasks for Alice and verify initial state and order
    const getTasksResult1 = await tasksConcept._getTasks({ user: USER_ALICE });
    logAction("_getTasks", { user: USER_ALICE }, getTasksResult1);
    assert("tasks" in getTasksResult1);
    assertEquals(getTasksResult1.tasks.length, 3);
    assertEquals(getTasksResult1.tasks[0]._id, task1Id);
    assertEquals(getTasksResult1.tasks[1]._id, task2Id);
    assertEquals(getTasksResult1.tasks[2]._id, task3Id);
    assertEquals(getTasksResult1.tasks[0].status, "TODO");
    assertEquals(getTasksResult1.tasks[0].dueDate?.toISOString(), task1DueDate.toISOString());

    // 4. Mark one task as complete
    const markCompleteResult1 = await tasksConcept.markTaskComplete({ task: task1Id });
    logAction("markTaskComplete", { task: task1Id }, markCompleteResult1);
    assertEquals(markCompleteResult1, {});

    // 5. Get remaining tasks and verify only TODO tasks are returned
    const getRemainingTasksResult1 = await tasksConcept._getRemainingTasks({ user: USER_ALICE });
    logAction("_getRemainingTasks", { user: USER_ALICE }, getRemainingTasksResult1);
    assert("tasks" in getRemainingTasksResult1);
    assertEquals(getRemainingTasksResult1.tasks.length, 2);
    assertEquals(getRemainingTasksResult1.tasks[0]._id, task2Id);
    assertEquals(getRemainingTasksResult1.tasks[1]._id, task3Id);
    assertEquals(getRemainingTasksResult1.tasks[0].status, "TODO");
    assertEquals(getRemainingTasksResult1.tasks[1].status, "TODO");

    // Verify all tasks again to ensure status update
    const getTasksResult2 = await tasksConcept._getTasks({ user: USER_ALICE });
    logAction("_getTasks (after complete)", { user: USER_ALICE }, getTasksResult2);
    assert("tasks" in getTasksResult2);
    const completedTask = getTasksResult2.tasks.find((t) => t._id === task1Id);
    assert(completedTask);
    assertEquals(completedTask.status, "DONE");
  });

  await t.step("Scenario 1: Error Handling - Invalid/Missing Operations", async () => {
    console.log("\n--- Scenario: Error Handling ---");

    // Attempt to create user tasks for an existing user (Alice)
    const createUserErrorResult1 = await tasksConcept.createUserTasks({ user: USER_ALICE });
    logAction("createUserTasks (duplicate)", { user: USER_ALICE }, createUserErrorResult1);
    assert("error" in createUserErrorResult1);
    assert(createUserErrorResult1.error.includes("already exists"));

    // Attempt to create a task for a non-existent user (Bob, without creating UserTasks first)
    const createTaskErrorResult1 = await tasksConcept.createTask({
      owner: USER_BOB,
      description: "Should fail",
    });
    logAction("createTask (no user tasks)", { owner: USER_BOB }, createTaskErrorResult1);
    assert("error" in createTaskErrorResult1);
    assert(createTaskErrorResult1.error.includes("No task list found"));

    // Attempt to update a non-existent task
    const nonExistentTask = "task:nonexistent" as ID;
    const updateTaskErrorResult1 = await tasksConcept.updateTask({
      task: nonExistentTask,
      newDescription: "New desc",
    });
    logAction("updateTask (non-existent)", { task: nonExistentTask, newDescription: "New desc" }, updateTaskErrorResult1);
    assert("error" in updateTaskErrorResult1);
    assert(updateTaskErrorResult1.error.includes("not found"));

    // Attempt to update a task with no fields provided
    const getTasksResult = await tasksConcept._getTasks({ user: USER_ALICE });
    assert("tasks" in getTasksResult);
    const existingTaskId = getTasksResult.tasks[0]._id; // Take any existing task
    const updateTaskErrorResult2 = await tasksConcept.updateTask({ task: existingTaskId });
    logAction("updateTask (no fields)", { task: existingTaskId }, updateTaskErrorResult2);
    assert("error" in updateTaskErrorResult2);
    assert(updateTaskErrorResult2.error.includes("No fields provided"));

    // Attempt to mark a non-existent task as complete
    const markCompleteErrorResult1 = await tasksConcept.markTaskComplete({ task: nonExistentTask });
    logAction("markTaskComplete (non-existent)", { task: nonExistentTask }, markCompleteErrorResult1);
    assert("error" in markCompleteErrorResult1);
    assert(markCompleteErrorResult1.error.includes("not found"));

    // Attempt to delete a non-existent task
    const deleteTaskErrorResult1 = await tasksConcept.deleteTask({ task: nonExistentTask });
    logAction("deleteTask (non-existent)", { task: nonExistentTask }, deleteTaskErrorResult1);
    assert("error" in deleteTaskErrorResult1);
    assert(deleteTaskErrorResult1.error.includes("not found"));

    // Attempt to get tasks for a user with no task list (Bob)
    const getTasksErrorResult1 = await tasksConcept._getTasks({ user: USER_BOB });
    logAction("_getTasks (no task list)", { user: USER_BOB }, getTasksErrorResult1);
    assert("error" in getTasksErrorResult1);
    assert(getTasksErrorResult1.error.includes("No task list found"));
  });

  await t.step("Scenario 2: Task Modification and Reordering", async () => {
    console.log("\n--- Scenario: Task Modification and Reordering ---");

    // 1. Create UserTasks for Bob
    const createUserResult = await tasksConcept.createUserTasks({ user: USER_BOB });
    logAction("createUserTasks", { user: USER_BOB }, createUserResult);
    assertEquals(createUserResult, {});

    // 2. Create tasks for Bob
    const createTaskResultA = await tasksConcept.createTask({ owner: USER_BOB, description: "Task A" });
    const taskAId = createTaskResultA.task;
    logAction("createTask", { owner: USER_BOB, description: "Task A" }, createTaskResultA);

    const createTaskResultB = await tasksConcept.createTask({ owner: USER_BOB, description: "Task B" });
    const taskBId = createTaskResultB.task;
    logAction("createTask", { owner: USER_BOB, description: "Task B" }, createTaskResultB);

    const createTaskResultC = await tasksConcept.createTask({ owner: USER_BOB, description: "Task C" });
    const taskCId = createTaskResultC.task;
    logAction("createTask", { owner: USER_BOB, description: "Task C" }, createTaskResultC);

    // 3. Verify initial order
    const getTasksResult1 = await tasksConcept._getTasks({ user: USER_BOB });
    logAction("_getTasks (initial)", { user: USER_BOB }, getTasksResult1);
    assert("tasks" in getTasksResult1);
    assertEquals(getTasksResult1.tasks.map((t) => t._id), [taskAId, taskBId, taskCId]);

    // 4. Update task B
    const newDueDate = new Date("2024-08-01T10:00:00.000Z");
    const updateResult1 = await tasksConcept.updateTask({
      task: taskBId,
      newDescription: "Updated Task B Description",
      newDueDate: newDueDate,
      newEstimatedDuration: 90,
    });
    logAction("updateTask", { task: taskBId, newDescription: "Updated Task B Description" }, updateResult1);
    assertEquals(updateResult1, {});

    const getTasksResult2 = await tasksConcept._getTasks({ user: USER_BOB });
    logAction("_getTasks (after update)", { user: USER_BOB }, getTasksResult2);
    assert("tasks" in getTasksResult2);
    const updatedTaskB = getTasksResult2.tasks.find((t) => t._id === taskBId);
    assert(updatedTaskB);
    assertEquals(updatedTaskB.description, "Updated Task B Description");
    assertEquals(updatedTaskB.dueDate?.toISOString(), newDueDate.toISOString());
    assertEquals(updatedTaskB.estimatedDuration, 90);

    // 5. Reorder tasks
    const newOrder = [taskCId, taskAId, taskBId];
    const reorderResult1 = await tasksConcept.reorderTasks({ user: USER_BOB, newOrder: newOrder });
    logAction("reorderTasks", { user: USER_BOB, newOrder: newOrder }, reorderResult1);
    assertEquals(reorderResult1, {});

    const getTasksResult3 = await tasksConcept._getTasks({ user: USER_BOB });
    logAction("_getTasks (after reorder)", { user: USER_BOB }, getTasksResult3);
    assert("tasks" in getTasksResult3);
    assertEquals(getTasksResult3.tasks.map((t) => t._id), newOrder);

    // 6. Test reorderTasks with invalid input
    // Missing a task
    const reorderError1 = await tasksConcept.reorderTasks({ user: USER_BOB, newOrder: [taskCId, taskAId] });
    logAction("reorderTasks (missing task)", { user: USER_BOB, newOrder: [taskCId, taskAId] }, reorderError1);
    assert("error" in reorderError1);
    assert(reorderError1.error.includes("does not contain all"));

    // Duplicate tasks
    const reorderError2 = await tasksConcept.reorderTasks({ user: USER_BOB, newOrder: [taskCId, taskAId, taskAId] });
    logAction("reorderTasks (duplicate task)", { user: USER_BOB, newOrder: [taskCId, taskAId, taskAId] }, reorderError2);
    assert("error" in reorderError2);
    assert(reorderError2.error.includes("contains duplicate"));

    // Task not belonging to user
    const getAliceTasks = await tasksConcept._getTasks({ user: USER_ALICE });
    assert("tasks" in getAliceTasks);
    const aliceTask = getAliceTasks.tasks[0]._id;
    const reorderError3 = await tasksConcept.reorderTasks({ user: USER_BOB, newOrder: [taskCId, taskAId, aliceTask] });
    logAction("reorderTasks (foreign task)", { user: USER_BOB, newOrder: [taskCId, taskAId, aliceTask] }, reorderError3);
    assert("error" in reorderError3);
    assert(reorderError3.error.includes("does not belong to user"));
  });

  await t.step("Scenario 3: Deletion and State Cleanup", async () => {
    console.log("\n--- Scenario: Deletion and State Cleanup ---");

    // 1. Create UserTasks for a new user, Carol
    const USER_CAROL = "user:Carol" as ID;
    await tasksConcept.createUserTasks({ user: USER_CAROL });

    // 2. Create tasks for Carol
    const createTaskResultX = await tasksConcept.createTask({ owner: USER_CAROL, description: "Task X" });
    const taskXId = createTaskResultX.task;
    logAction("createTask", { owner: USER_CAROL, description: "Task X" }, createTaskResultX);

    const createTaskResultY = await tasksConcept.createTask({ owner: USER_CAROL, description: "Task Y" });
    const taskYId = createTaskResultY.task;
    logAction("createTask", { owner: USER_CAROL, description: "Task Y" }, createTaskResultY);

    // 3. Verify tasks exist
    const getCarolTasks1 = await tasksConcept._getTasks({ user: USER_CAROL });
    logAction("_getTasks (Carol initial)", { user: USER_CAROL }, getCarolTasks1);
    assert("tasks" in getCarolTasks1);
    assertEquals(getCarolTasks1.tasks.length, 2);

    // 4. Delete Task X
    const deleteResult1 = await tasksConcept.deleteTask({ task: taskXId });
    logAction("deleteTask", { task: taskXId }, deleteResult1);
    assertEquals(deleteResult1, {});

    // 5. Verify Task X is gone, Task Y remains
    const getCarolTasks2 = await tasksConcept._getTasks({ user: USER_CAROL });
    logAction("_getTasks (after Task X delete)", { user: USER_CAROL }, getCarolTasks2);
    assert("tasks" in getCarolTasks2);
    assertEquals(getCarolTasks2.tasks.length, 1);
    assertEquals(getCarolTasks2.tasks[0]._id, taskYId);

    // 6. Delete all tasks for Carol
    const deleteAllResult1 = await tasksConcept.deleteAllForUser({ user: USER_CAROL });
    logAction("deleteAllForUser", { user: USER_CAROL }, deleteAllResult1);
    assertEquals(deleteAllResult1, {});

    // 7. Verify Carol has no tasks and no userTasks entry
    const getCarolTasks3 = await tasksConcept._getTasks({ user: USER_CAROL });
    logAction("_getTasks (after deleteAll)", { user: USER_CAROL }, getCarolTasks3);
    assert("error" in getCarolTasks3); // Expecting error because UserTasks document is gone
    assert(getCarolTasks3.error.includes("No task list found"));

    const deleteAllErrorResult = await tasksConcept.deleteAllForUser({ user: USER_CAROL });
    logAction("deleteAllForUser (empty)", { user: USER_CAROL }, deleteAllErrorResult);
    assert("error" in deleteAllErrorResult);
    assert(deleteAllErrorResult.error.includes("No tasks or task list found"));
  });

  await t.step("Scenario 4: Mixed Status and Remaining Tasks", async () => {
    console.log("\n--- Scenario: Mixed Status and Remaining Tasks ---");

    // 1. Create UserTasks for a new user, David
    const USER_DAVID = "user:David" as ID;
    await tasksConcept.createUserTasks({ user: USER_DAVID });

    // 2. Create tasks for David
    const createTaskResultD1 = await tasksConcept.createTask({ owner: USER_DAVID, description: "Task D1" });
    const taskD1Id = createTaskResultD1.task;
    logAction("createTask", { owner: USER_DAVID, description: "Task D1" }, createTaskResultD1);

    const createTaskResultD2 = await tasksConcept.createTask({ owner: USER_DAVID, description: "Task D2" });
    const taskD2Id = createTaskResultD2.task;
    logAction("createTask", { owner: USER_DAVID, description: "Task D2" }, createTaskResultD2);

    const createTaskResultD3 = await tasksConcept.createTask({ owner: USER_DAVID, description: "Task D3" });
    const taskD3Id = createTaskResultD3.task;
    logAction("createTask", { owner: USER_DAVID, description: "Task D3" }, createTaskResultD3);

    // 3. Mark Task D2 as complete
    const markCompleteResult = await tasksConcept.markTaskComplete({ task: taskD2Id });
    logAction("markTaskComplete", { task: taskD2Id }, markCompleteResult);
    assertEquals(markCompleteResult, {});

    // 4. Get all tasks for David and verify statuses
    const getTasksResult = await tasksConcept._getTasks({ user: USER_DAVID });
    logAction("_getTasks (David all)", { user: USER_DAVID }, getTasksResult);
    assert("tasks" in getTasksResult);
    const taskStatuses = getTasksResult.tasks.reduce((acc, task) => {
      acc[task._id] = task.status;
      return acc;
    }, {} as Record<ID, "TODO" | "DONE">);
    assertObjectMatch(taskStatuses, {
      [taskD1Id]: "TODO",
      [taskD2Id]: "DONE",
      [taskD3Id]: "TODO",
    });

    // 5. Get remaining tasks (TODO)
    const getRemainingTasksResult = await tasksConcept._getRemainingTasks({ user: USER_DAVID });
    logAction("_getRemainingTasks (David)", { user: USER_DAVID }, getRemainingTasksResult);
    assert("tasks" in getRemainingTasksResult);
    assertEquals(getRemainingTasksResult.tasks.length, 2);
    assertEquals(getRemainingTasksResult.tasks.map((t) => t._id), [taskD1Id, taskD3Id]);
    assert(getRemainingTasksResult.tasks.every((t) => t.status === "TODO"));

    // 6. Mark Task D1 as complete
    await tasksConcept.markTaskComplete({ task: taskD1Id });
    logAction("markTaskComplete", { task: taskD1Id }, {});

    // 7. Get remaining tasks again
    const getRemainingTasksResult2 = await tasksConcept._getRemainingTasks({ user: USER_DAVID });
    logAction("_getRemainingTasks (David again)", { user: USER_DAVID }, getRemainingTasksResult2);
    assert("tasks" in getRemainingTasksResult2);
    assertEquals(getRemainingTasksResult2.tasks.length, 1);
    assertEquals(getRemainingTasksResult2.tasks[0]._id, taskD3Id);
  });

  await client.close();
});
```
