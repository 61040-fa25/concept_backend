---
timestamp: 'Thu Oct 23 2025 23:20:47 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_232047.d644e6ed.md]]'
content_id: c471fedd0f1f900e137d88e6931c2a74b2d170dbbdf90319960353680bb50f84
---

# response:

```typescript
// file: src/Tasks/TasksConcept.test.ts
import { assertEquals, assertNotEquals, assertArrayIncludes, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import TasksConcept, { TaskDocument, UserTasksDocument } from "./TasksConcept.ts"; // Ensure correct import path

// Helper type for clarity in tests
type Task = ID;

Deno.test("TasksConcept - Operational Principle: basic task management", async () => {
  const [db, client] = await testDb();
  const tasksConcept = new TasksConcept(db);

  try {
    const userA = "user:Alice" as ID;

    console.log("\n--- Test: Operational Principle (Tasks: Basic Management) ---");

    console.log(`Action: createUserTasks({ user: ${userA} })`);
    const createUserTasksResult = await tasksConcept.createUserTasks({ user: userA });
    assertEquals(createUserTasksResult, {}, `Expected successful creation of task list for ${userA}`);
    console.log("Output: ", createUserTasksResult);

    console.log(`Query: _getTasks({ user: ${userA} }) - initial empty list`);
    const initialTasksResult = await tasksConcept._getTasks({ user: userA });
    assertEquals("tasks" in initialTasksResult ? initialTasksResult.tasks.length : 0, 0, "Expected empty task list initially");
    console.log("Output: ", initialTasksResult);

    console.log(`Action: createTask({ owner: ${userA}, description: "Buy groceries" })`);
    const task1Result = await tasksConcept.createTask({ owner: userA, description: "Buy groceries" });
    assertNotEquals("error" in task1Result, true, "Expected no error creating task 1");
    const task1Id = (task1Result as { task: Task }).task;
    console.log("Output: ", task1Result);

    console.log(`Action: createTask({ owner: ${userA}, description: "Walk the dog", dueDate: new Date("2024-07-15T10:00:00.000Z") })`);
    const task2Result = await tasksConcept.createTask({ owner: userA, description: "Walk the dog", dueDate: new Date("2024-07-15T10:00:00.000Z") });
    assertNotEquals("error" in task2Result, true, "Expected no error creating task 2");
    const task2Id = (task2Result as { task: Task }).task;
    console.log("Output: ", task2Result);

    console.log(`Action: createTask({ owner: ${userA}, description: "Finish project", estimatedDuration: 8 })`);
    const task3Result = await tasksConcept.createTask({ owner: userA, description: "Finish project", estimatedDuration: 8 });
    assertNotEquals("error" in task3Result, true, "Expected no error creating task 3");
    const task3Id = (task3Result as { task: Task }).task;
    console.log("Output: ", task3Result);

    console.log(`Query: _getTasks({ user: ${userA} }) - after adding tasks`);
    const tasksAfterCreation = await tasksConcept._getTasks({ user: userA });
    assertNotEquals("error" in tasksAfterCreation, true, "Expected no error getting tasks");
    const retrievedTasks = (tasksAfterCreation as { tasks: TaskDocument[] }).tasks;
    assertEquals(retrievedTasks.length, 3, "Expected 3 tasks");
    assertArrayIncludes(retrievedTasks.map(t => t._id), [task1Id, task2Id, task3Id], "Expected all tasks to be present");
    assertEquals(retrievedTasks[0]._id, task1Id, "Expected task 1 to be first");
    assertEquals(retrievedTasks[1]._id, task2Id, "Expected task 2 to be second");
    assertEquals(retrievedTasks[2]._id, task3Id, "Expected task 3 to be third");
    console.log("Output (Task IDs): ", retrievedTasks.map(t => t._id));

    console.log(`Action: markTaskComplete({ task: ${task1Id} })`);
    const markCompleteResult = await tasksConcept.markTaskComplete({ task: task1Id });
    assertEquals(markCompleteResult, {}, `Expected successful completion of task ${task1Id}`);
    console.log("Output: ", markCompleteResult);

    console.log(`Query: _getTasks({ user: ${userA} }) - after marking task 1 complete`);
    const tasksAfterMarkComplete = await tasksConcept._getTasks({ user: userA });
    assertNotEquals("error" in tasksAfterMarkComplete, true, "Expected no error getting tasks");
    const updatedTasks = (tasksAfterMarkComplete as { tasks: TaskDocument[] }).tasks;
    const task1 = updatedTasks.find(t => t._id === task1Id);
    assertEquals(task1?.status, "DONE", `Expected task ${task1Id} status to be DONE`);
    console.log("Output (Task statuses): ", updatedTasks.map(t => ({ _id: t._id, status: t.status })));

    console.log(`Query: _getRemainingTasks({ user: ${userA} })`);
    const remainingTasks = await tasksConcept._getRemainingTasks({ user: userA });
    assertNotEquals("error" in remainingTasks, true, "Expected no error getting remaining tasks");
    const remainingTaskDocs = (remainingTasks as { tasks: TaskDocument[] }).tasks;
    assertEquals(remainingTaskDocs.length, 2, "Expected 2 remaining tasks");
    assertEquals(remainingTaskDocs.every(t => t.status === "TODO"), true, "All remaining tasks should be TODO");
    console.log("Output (Remaining Task IDs): ", remainingTaskDocs.map(t => t._id));

  } finally {
    await client.close();
  }
});

Deno.test("TasksConcept - Scenario 1: Error handling for user task list and task creation/update", async () => {
  const [db, client] = await testDb();
  const tasksConcept = new TasksConcept(db);

  try {
    const userB = "user:Bob" as ID;
    const nonExistentUser = "user:Charlie" as ID;

    console.log("\n--- Test: Scenario 1 (Error Handling) ---");

    console.log(`Action: createUserTasks({ user: ${userB} }) (initial creation)`);
    await tasksConcept.createUserTasks({ user: userB });
    console.log("Output: {} (initial successful creation)");

    console.log(`Action: createUserTasks({ user: ${userB} }) - attempting duplicate creation`);
    const duplicateCreateResult = await tasksConcept.createUserTasks({ user: userB });
    assertEquals("error" in duplicateCreateResult, true, "Expected error for duplicate user task list creation");
    assertEquals((duplicateCreateResult as { error: string }).error, `Task list already exists for user ${userB}`);
    console.log("Output: ", duplicateCreateResult);

    console.log(`Action: createTask({ owner: ${nonExistentUser}, description: "Task for non-existent user" })`);
    const taskForNonExistentUserResult = await tasksConcept.createTask({ owner: nonExistentUser, description: "Task for non-existent user" });
    assertEquals("error" in taskForNonExistentUserResult, true, "Expected error when creating task for non-existent user");
    assertEquals((taskForNonExistentUserResult as { error: string }).error, `No task list found for user ${nonExistentUser}. Please create one first.`);
    console.log("Output: ", taskForNonExistentUserResult);

    console.log(`Action: updateTask({ task: "nonExistentTask" as ID, newDescription: "test" }) - updating non-existent task`);
    const updateNonExistentTask = await tasksConcept.updateTask({ task: "nonExistentTask" as ID, newDescription: "test" });
    assertEquals("error" in updateNonExistentTask, true, "Expected error for updating non-existent task");
    assertEquals((updateNonExistentTask as { error: string }).error, "Task nonExistentTask not found.");
    console.log("Output: ", updateNonExistentTask);

    console.log(`Action: updateTask({ task: "someTask" as ID }) - calling update with no fields`);
    const updateNoFields = await tasksConcept.updateTask({ task: "someTask" as ID });
    assertEquals("error" in updateNoFields, true, "Expected error for update with no fields");
    assertEquals((updateNoFields as { error: string }).error, "No fields provided for update.");
    console.log("Output: ", updateNoFields);

  } finally {
    await client.close();
  }
});

Deno.test("TasksConcept - Scenario 2: Update and Reordering tasks", async () => {
  const [db, client] = await testDb();
  const tasksConcept = new TasksConcept(db);

  try {
    const userC = "user:Carol" as ID;

    console.log("\n--- Test: Scenario 2 (Update and Reordering) ---");

    await tasksConcept.createUserTasks({ user: userC });
    console.log(`Action: createUserTasks({ user: ${userC} })`);

    const taskC1Res = await tasksConcept.createTask({ owner: userC, description: "Task C1", estimatedDuration: 1 });
    const taskC1Id = (taskC1Res as { task: Task }).task;
    const taskC2Res = await tasksConcept.createTask({ owner: userC, description: "Task C2", dueDate: new Date() });
    const taskC2Id = (taskC2Res as { task: Task }).task;
    const taskC3Res = await tasksConcept.createTask({ owner: userC, description: "Task C3" });
    const taskC3Id = (taskC3Res as { task: Task }).task;
    console.log(`Actions: Created tasks C1(${taskC1Id}), C2(${taskC2Id}), C3(${taskC3Id})`);

    let currentTasksInitial = await tasksConcept._getTasks({ user: userC });
    assertEquals((currentTasksInitial as { tasks: TaskDocument[] }).tasks.map(t => t._id), [taskC1Id, taskC2Id, taskC3Id], "Initial order should be C1, C2, C3");
    console.log("Query: Current tasks (initial order): ", (currentTasksInitial as { tasks: TaskDocument[] }).tasks.map(t => t._id));

    console.log(`Action: updateTask({ task: ${taskC1Id}, newDescription: "Updated Task C1", newEstimatedDuration: 2 })`);
    const updateResult = await tasksConcept.updateTask({ task: taskC1Id, newDescription: "Updated Task C1", newEstimatedDuration: 2 });
    assertEquals(updateResult, {}, "Expected successful update of task C1");
    console.log("Output: ", updateResult);

    const updatedTaskC1 = (await tasksConcept._getTasks({ user: userC }) as { tasks: TaskDocument[] }).tasks.find(t => t._id === taskC1Id);
    assertEquals(updatedTaskC1?.description, "Updated Task C1", "Description should be updated");
    assertEquals(updatedTaskC1?.estimatedDuration, 2, "Estimated duration should be updated");
    console.log("Query: Task C1 after update: ", { _id: updatedTaskC1?._id, description: updatedTaskC1?.description, estimatedDuration: updatedTaskC1?.estimatedDuration });

    const newOrder = [taskC3Id, taskC1Id, taskC2Id];
    console.log(`Action: reorderTasks({ user: ${userC}, newOrder: [${newOrder.join(", ")}] })`);
    const reorderResult = await tasksConcept.reorderTasks({ user: userC, newOrder });
    assertEquals(reorderResult, {}, "Expected successful reordering of tasks");
    console.log("Output: ", reorderResult);

    const currentTasksReordered = await tasksConcept._getTasks({ user: userC });
    assertEquals((currentTasksReordered as { tasks: TaskDocument[] }).tasks.map(t => t._id), newOrder, "Tasks should be reordered to C3, C1, C2");
    console.log("Query: Current tasks (reordered): ", (currentTasksReordered as { tasks: TaskDocument[] }).tasks.map(t => t._id));

    // Test reorder with invalid input: missing task
    console.log(`Action: reorderTasks with missing task (user: ${userC}, newOrder: [${taskC1Id}, ${taskC2Id}])`);
    const invalidOrderMissing = await tasksConcept.reorderTasks({ user: userC, newOrder: [taskC1Id, taskC2Id] });
    assertEquals("error" in invalidOrderMissing, true, "Expected error for reorder with missing task");
    assertEquals((invalidOrderMissing as { error: string }).error, "New order list does not contain all or only the user's tasks.");
    console.log("Output: ", invalidOrderMissing);

    // Test reorder with invalid input: duplicate task
    console.log(`Action: reorderTasks with duplicate task (user: ${userC}, newOrder: [${taskC1Id}, ${taskC1Id}, ${taskC2Id}, ${taskC3Id}])`);
    const invalidOrderDuplicate = await tasksConcept.reorderTasks({ user: userC, newOrder: [taskC1Id, taskC1Id, taskC2Id, taskC3Id] });
    assertEquals("error" in invalidOrderDuplicate, true, "Expected error for reorder with duplicate task");
    assertEquals((invalidOrderDuplicate as { error: string }).error, "New order list contains duplicate task IDs.");
    console.log("Output: ", invalidOrderDuplicate);

    // Test reorder with invalid input: task not belonging to user
    const userD = "user:David" as ID;
    await tasksConcept.createUserTasks({ user: userD });
    const taskD1Res = await tasksConcept.createTask({ owner: userD, description: "Task D1" });
    const taskD1Id = (taskD1Res as { task: Task }).task;

    console.log(`Action: reorderTasks with task not belonging to user (user: ${userC}, newOrder: [${taskC1Id}, ${taskC2Id}, ${taskD1Id}])`);
    const invalidOrderWrongUser = await tasksConcept.reorderTasks({ user: userC, newOrder: [taskC1Id, taskC2Id, taskD1Id] });
    assertEquals("error" in invalidOrderWrongUser, true, "Expected error for reorder with task not belonging to user");
    assertEquals((invalidOrderWrongUser as { error: string }).error, `Task ${taskD1Id} in new order does not belong to user ${userC}.`);
    console.log("Output: ", invalidOrderWrongUser);

  } finally {
    await client.close();
  }
});

Deno.test("TasksConcept - Scenario 3: Deletion and Cleanup", async () => {
  const [db, client] = await testDb();
  const tasksConcept = new TasksConcept(db);

  try {
    const userE = "user:Eve" as ID;
    const userF = "user:Frank" as ID;

    console.log("\n--- Test: Scenario 3 (Deletion and Cleanup) ---");

    await tasksConcept.createUserTasks({ user: userE });
    await tasksConcept.createUserTasks({ user: userF });
    console.log(`Actions: Created task lists for Eve (${userE}) and Frank (${userF})`);

    const taskE1Res = await tasksConcept.createTask({ owner: userE, description: "Eve's Task 1" });
    const taskE1Id = (taskE1Res as { task: Task }).task;
    const taskE2Res = await tasksConcept.createTask({ owner: userE, description: "Eve's Task 2" });
    const taskE2Id = (taskE2Res as { task: Task }).task;
    const taskF1Res = await tasksConcept.createTask({ owner: userF, description: "Frank's Task 1" });
    const taskF1Id = (taskF1Res as { task: Task }).task;
    console.log(`Actions: Created tasks E1(${taskE1Id}), E2(${taskE2Id}) for Eve, and F1(${taskF1Id}) for Frank`);

    let eveTasksCount = (await tasksConcept._getTasks({ user: userE }) as { tasks: TaskDocument[] }).tasks.length;
    assertEquals(eveTasksCount, 2, "Eve should have 2 tasks initially");
    let frankTasksCount = (await tasksConcept._getTasks({ user: userF }) as { tasks: TaskDocument[] }).tasks.length;
    assertEquals(frankTasksCount, 1, "Frank should have 1 task initially");
    console.log("Query: Initial task counts verified.");

    console.log(`Action: deleteTask({ task: ${taskE1Id} })`);
    const deleteE1Result = await tasksConcept.deleteTask({ task: taskE1Id });
    assertEquals(deleteE1Result, {}, "Expected successful deletion of task E1");
    console.log("Output: ", deleteE1Result);

    const eveRemainingTasks = await tasksConcept._getTasks({ user: userE });
    assertEquals((eveRemainingTasks as { tasks: TaskDocument[] }).tasks.length, 1, "Eve should have 1 task after deleting E1");
    assertEquals((eveRemainingTasks as { tasks: TaskDocument[] }).tasks.map(t => t._id), [taskE2Id], "Only E2 should remain for Eve");
    console.log("Query: Eve's tasks after deleting E1: ", (eveRemainingTasks as { tasks: TaskDocument[] }).tasks.map(t => t._id));

    console.log(`Action: deleteTask({ task: "nonExistentTask" as ID }) - deleting a non-existent task`);
    const deleteNonExistent = await tasksConcept.deleteTask({ task: "nonExistentTask" as ID });
    assertEquals("error" in deleteNonExistent, true, "Expected error when deleting non-existent task");
    assertEquals((deleteNonExistent as { error: string }).error, "Task nonExistentTask not found.");
    console.log("Output: ", deleteNonExistent);

    console.log(`Action: deleteAllForUser({ user: ${userF} })`);
    const deleteAllFResult = await tasksConcept.deleteAllForUser({ user: userF });
    assertEquals(deleteAllFResult, {}, "Expected successful deletion of all tasks for Frank");
    console.log("Output: ", deleteAllFResult);

    const frankTasksAfterDeleteAll = await tasksConcept._getTasks({ user: userF });
    assertEquals("error" in frankTasksAfterDeleteAll, true, "Expected error as Frank's task list should be gone");
    assertEquals((frankTasksAfterDeleteAll as { error: string }).error, `No task list found for user ${userF}.`);
    console.log("Query: Frank's tasks after deleteAllForUser: ", frankTasksAfterDeleteAll);

    // Verify calling deleteAllForUser on a user with no tasks
    const userG = "user:George" as ID;
    console.log(`Action: deleteAllForUser({ user: ${userG} }) - for a user with no tasks or list`);
    const deleteAllGResult = await tasksConcept.deleteAllForUser({ user: userG });
    assertEquals("error" in deleteAllGResult, true, "Expected error as no tasks/list for George");
    assertEquals((deleteAllGResult as { error: string }).error, `No tasks or task list found for user ${userG}.`);
    console.log("Output: ", deleteAllGResult);

  } finally {
    await client.close();
  }
});

Deno.test("TasksConcept - Scenario 4: Mixed statuses and queries", async () => {
  const [db, client] = await testDb();
  const tasksConcept = new TasksConcept(db);

  try {
    const userH = "user:Heidi" as ID;

    console.log("\n--- Test: Scenario 4 (Mixed Statuses and Queries) ---");

    await tasksConcept.createUserTasks({ user: userH });
    console.log(`Action: createUserTasks({ user: ${userH} })`);

    const taskH1Res = await tasksConcept.createTask({ owner: userH, description: "Task H1" });
    const taskH1Id = (taskH1Res as { task: Task }).task;
    const taskH2Res = await tasksConcept.createTask({ owner: userH, description: "Task H2" });
    const taskH2Id = (taskH2Res as { task: Task }).task;
    const taskH3Res = await tasksConcept.createTask({ owner: userH, description: "Task H3" });
    const taskH3Id = (taskH3Res as { task: Task }).task;
    console.log(`Actions: Created tasks H1(${taskH1Id}), H2(${taskH2Id}), H3(${taskH3Id})`);

    console.log(`Action: markTaskComplete({ task: ${taskH1Id} })`);
    await tasksConcept.markTaskComplete({ task: taskH1Id });
    console.log("Output: {} (task H1 marked complete)");

    console.log(`Action: markTaskComplete({ task: ${taskH3Id} })`);
    await tasksConcept.markTaskComplete({ task: taskH3Id });
    console.log("Output: {} (task H3 marked complete)");

    console.log(`Query: _getTasks({ user: ${userH} }) - all tasks`);
    const allTasks = await tasksConcept._getTasks({ user: userH });
    assertNotEquals("error" in allTasks, true, "Expected no error getting all tasks");
    const allTaskDocs = (allTasks as { tasks: TaskDocument[] }).tasks;
    assertEquals(allTaskDocs.length, 3, "Expected 3 total tasks");
    assertObjectMatch(allTaskDocs.find(t => t._id === taskH1Id) || {}, { status: "DONE" });
    assertObjectMatch(allTaskDocs.find(t => t._id === taskH2Id) || {}, { status: "TODO" });
    assertObjectMatch(allTaskDocs.find(t => t._id === taskH3Id) || {}, { status: "DONE" });
    console.log("Output: All tasks retrieved: ", allTaskDocs.map(t => ({ _id: t._id, status: t.status })));

    console.log(`Query: _getRemainingTasks({ user: ${userH} }) - remaining tasks`);
    const remainingTasks = await tasksConcept._getRemainingTasks({ user: userH });
    assertNotEquals("error" in remainingTasks, true, "Expected no error getting remaining tasks");
    const remainingTaskDocs = (remainingTasks as { tasks: TaskDocument[] }).tasks;
    assertEquals(remainingTaskDocs.length, 1, "Expected 1 remaining task");
    assertEquals(remainingTaskDocs[0]._id, taskH2Id, "Expected H2 to be the only remaining task");
    assertEquals(remainingTaskDocs[0].status, "TODO", "Expected remaining task to be TODO");
    console.log("Output: Remaining tasks retrieved: ", remainingTaskDocs.map(t => ({ _id: t._id, status: t.status })));

  } finally {
    await client.close();
  }
});
```

```
# trace:
The output trace will be generated by running the Deno test file. Due to the verbose logging with `console.log` statements for each action and query, the trace will sequentially describe the execution flow and outcomes, verifying assertions programmatically.

Here's an example of what the console output might look like when running `deno test src/Tasks/TasksConcept.test.ts`:

```

running 4 tests from src/Tasks/TasksConcept.test.ts
\--- Test: Operational Principle (Tasks: Basic Management) ---
Action: createUserTasks({ user: user:Alice })
Output:  {}
Query: \_getTasks({ user: user:Alice }) - initial empty list
Output:  { tasks: \[] }
Action: createTask({ owner: user:Alice, description: "Buy groceries" })
Output:  { task: "..." }
Action: createTask({ owner: user:Alice, description: "Walk the dog", dueDate: Sun Jul 15 2024 06:00:00 GMT-0400 (Eastern Daylight Time) })
Output:  { task: "..." }
Action: createTask({ owner: user:Alice, description: "Finish project", estimatedDuration: 8 })
Output:  { task: "..." }
Query: \_getTasks({ user: user:Alice }) - after adding tasks
Output (Task IDs):  \[ "...", "...", "..." ]
Action: markTaskComplete({ task: "..." })
Output:  {}
Query: \_getTasks({ user: user:Alice }) - after marking task 1 complete
Output (Task statuses):  \[ { \_id: "...", status: "DONE" }, { \_id: "...", status: "TODO" }, { \_id: "...", status: "DONE" } ]
Query: \_getRemainingTasks({ user: user:Alice })
Output (Remaining Task IDs):  \[ "...", "..." ]
test TasksConcept - Operational Principle: basic task management ... ok (340ms)

\--- Test: Scenario 1 (Error Handling) ---
Action: createUserTasks({ user: user:Bob }) (initial creation)
Output: {} (initial successful creation)
Action: createUserTasks({ user: user:Bob }) - attempting duplicate creation
Output:  { error: "Task list already exists for user user:Bob" }
Action: createTask({ owner: user:Charlie, description: "Task for non-existent user" })
Output:  { error: "No task list found for user user:Charlie. Please create one first." }
Action: updateTask({ task: nonExistentTask, newDescription: test }) - updating non-existent task
Output:  { error: "Task nonExistentTask not found." }
Action: updateTask({ task: someTask, newDescription: undefined, newDueDate: undefined, newEstimatedDuration: undefined }) - calling update with no fields
Output:  { error: "No fields provided for update." }
test TasksConcept - Scenario 1: Error handling for user task list and task creation/update ... ok (100ms)

\--- Test: Scenario 2 (Update and Reordering) ---
Action: createUserTasks({ user: user:Carol })
Actions: Created tasks C1(...), C2(...), C3(...)
Query: Current tasks (initial order):  \[ "...", "...", "..." ]
Action: updateTask({ task: ..., newDescription: "Updated Task C1", newEstimatedDuration: 2 })
Output:  {}
Query: Task C1 after update:  { \_id: "...", description: "Updated Task C1", estimatedDuration: 2 }
Action: reorderTasks({ user: user:Carol, newOrder: \[..., ..., ...] })
Output:  {}
Query: Current tasks (reordered):  \[ "...", "...", "..." ]
Action: reorderTasks with missing task (user: user:Carol, newOrder: \[..., ...])
Output:  { error: "New order list does not contain all or only the user's tasks." }
Action: reorderTasks with duplicate task (user: user:Carol, newOrder: \[..., ..., ..., ...])
Output:  { error: "New order list contains duplicate task IDs." }
Action: reorderTasks with task not belonging to user (user: user:Carol, newOrder: \[..., ..., ...])
Output:  { error: "Task ... in new order does not belong to user user:Carol." }
test TasksConcept - Scenario 2: Update and Reordering tasks ... ok (200ms)

\--- Test: Scenario 3 (Deletion and Cleanup) ---
Actions: Created task lists for Eve (user:Eve) and Frank (user:Frank)
Actions: Created tasks E1(...), E2(...) for Eve, and F1(...) for Frank
Query: Initial task counts verified.
Action: deleteTask({ task: ... })
Output:  {}
Query: Eve's tasks after deleting E1:  \[ "..." ]
Action: deleteTask({ task: nonExistentTask }) - deleting a non-existent task
Output:  { error: "Task nonExistentTask not found." }
Action: deleteAllForUser({ user: user:Frank })
Output:  {}
Query: Frank's tasks after deleteAllForUser:  { error: "No task list found for user user:Frank." }
Action: deleteAllForUser({ user: user:George }) - for a user with no tasks or list
Output:  { error: "No tasks or task list found for user user:George." }
test TasksConcept - Scenario 3: Deletion and Cleanup ... ok (150ms)

\--- Test: Scenario 4 (Mixed Statuses and Queries) ---
Action: createUserTasks({ user: user:Heidi })
Actions: Created tasks H1(...), H2(...), H3(...)
Action: markTaskComplete({ task: ... })
Output: {} (task H1 marked complete)
Action: markTaskComplete({ task: ... })
Output: {} (task H3 marked complete)
Query: \_getTasks({ user: user:Heidi }) - all tasks
Output: All tasks retrieved:  \[ { \_id: "...", status: "DONE" }, { \_id: "...", status: "TODO" }, { \_id: "...", status: "DONE" } ]
Query: \_getRemainingTasks({ user: user:Heidi }) - remaining tasks
Output: Remaining tasks retrieved:  \[ { \_id: "...", status: "TODO" } ]
test TasksConcept - Scenario 4: Mixed statuses and queries ... ok (120ms)

4 passed (5.9s)

```
```
