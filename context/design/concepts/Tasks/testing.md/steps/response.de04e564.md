---
timestamp: 'Thu Oct 23 2025 23:16:11 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_231611.ff24a987.md]]'
content_id: de04e564e7dd454fa3486c558f4e31b4fb17f36b5c9e73daacb2c8d612362792
---

# response:

```typescript
// file: src/Tasks/TasksConcept.test.ts
import { Collection, Db, MongoClient } from "npm:mongodb";
import { assertEquals, assertObjectMatch, assertRejects } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import TasksConcept, { TaskDocument, UserTasksDocument } from "./TasksConcept.ts"; // Import the concept and its types

// Helper function for console logging
const log = (message: string, data?: unknown) => {
  console.log(`\n--- ${message} ---`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

Deno.test("TasksConcept: Operational Principle - Add, Prioritize, and Complete Tasks", async (t) => {
  const [db, client] = await testDb();
  const tasksConcept = new TasksConcept(db);

  try {
    const userAlice = "user:Alice" as ID;
    log(`Testing with user: ${userAlice}`);

    // Action: createUserTasks
    log("Calling createUserTasks for Alice...");
    const createUserTasksResult = await tasksConcept.createUserTasks({ user: userAlice });
    assertEquals(createUserTasksResult, {}, "Should successfully create user tasks for Alice");
    log("createUserTasks result:", createUserTasksResult);

    // Verify initial userTasks state
    const initialUserTasks = await (db.collection("Tasks.userTasks") as Collection<UserTasksDocument>).findOne({ _id: userAlice });
    assertObjectMatch(initialUserTasks!, { _id: userAlice, orderedTasks: [] });
    log("Initial userTasks state:", initialUserTasks);

    // Action: createTask 1
    const task1Desc = "Buy groceries";
    log(`Calling createTask for Alice: "${task1Desc}"`);
    const createTask1Result = await tasksConcept.createTask({
      owner: userAlice,
      description: task1Desc,
      dueDate: new Date("2024-07-20T10:00:00Z"),
    });
    const task1Id = (createTask1Result as { task: Task }).task;
    assertEquals(typeof task1Id, "string", "Should return a task ID");
    log("createTask 1 result:", createTask1Result);

    // Action: createTask 2
    const task2Desc = "Finish project report";
    log(`Calling createTask for Alice: "${task2Desc}"`);
    const createTask2Result = await tasksConcept.createTask({
      owner: userAlice,
      description: task2Desc,
      estimatedDuration: 4,
    });
    const task2Id = (createTask2Result as { task: Task }).task;
    assertEquals(typeof task2Id, "string", "Should return a task ID");
    log("createTask 2 result:", createTask2Result);

    // Action: createTask 3
    const task3Desc = "Call mom";
    log(`Calling createTask for Alice: "${task3Desc}"`);
    const createTask3Result = await tasksConcept.createTask({
      owner: userAlice,
      description: task3Desc,
    });
    const task3Id = (createTask3Result as { task: Task }).task;
    assertEquals(typeof task3Id, "string", "Should return a task ID");
    log("createTask 3 result:", createTask3Result);

    // Query: _getTasks to verify initial order
    log("Calling _getTasks for Alice to verify initial order...");
    const tasksAfterCreationResult = await tasksConcept._getTasks({ user: userAlice });
    assertEquals(tasksAfterCreationResult.tasks?.length, 3, "Should have 3 tasks after creation");
    assertEquals(tasksAfterCreationResult.tasks?.[0]._id, task1Id, "First task should be task1");
    assertEquals(tasksAfterCreationResult.tasks?.[1]._id, task2Id, "Second task should be task2");
    assertEquals(tasksAfterCreationResult.tasks?.[2]._id, task3Id, "Third task should be task3");
    log("Tasks after creation:", tasksAfterCreationResult);

    // Action: reorderTasks (prioritize task3)
    const newOrder = [task3Id, task1Id, task2Id];
    log(`Calling reorderTasks for Alice with new order: ${JSON.stringify(newOrder)}`);
    const reorderResult = await tasksConcept.reorderTasks({ user: userAlice, newOrder: newOrder });
    assertEquals(reorderResult, {}, "Should successfully reorder tasks");
    log("reorderTasks result:", reorderResult);

    // Query: _getTasks to verify new order
    log("Calling _getTasks for Alice to verify new order...");
    const tasksAfterReorderResult = await tasksConcept._getTasks({ user: userAlice });
    assertEquals(tasksAfterReorderResult.tasks?.[0]._id, task3Id, "First task should now be task3");
    assertEquals(tasksAfterReorderResult.tasks?.[1]._id, task1Id, "Second task should now be task1");
    assertEquals(tasksAfterReorderResult.tasks?.[2]._id, task2Id, "Third task should now be task2");
    log("Tasks after reorder:", tasksAfterReorderResult);

    // Action: markTaskComplete (task1)
    log(`Calling markTaskComplete for task: ${task1Id}`);
    const markCompleteResult = await tasksConcept.markTaskComplete({ task: task1Id });
    assertEquals(markCompleteResult, {}, "Should successfully mark task1 as complete");
    log("markTaskComplete result:", markCompleteResult);

    // Query: _getTasks to verify status change
    log("Calling _getTasks for Alice to verify status of task1...");
    const tasksAfterCompletionResult = await tasksConcept._getTasks({ user: userAlice });
    const completedTask = tasksAfterCompletionResult.tasks?.find((t) => t._id === task1Id);
    assertEquals(completedTask?.status, "DONE", "Task1 status should be DONE");
    log("Tasks after completion:", tasksAfterCompletionResult);

    // Query: _getRemainingTasks
    log("Calling _getRemainingTasks for Alice...");
    const remainingTasksResult = await tasksConcept._getRemainingTasks({ user: userAlice });
    assertEquals(remainingTasksResult.tasks?.length, 2, "Should have 2 remaining tasks");
    assertEquals(
      remainingTasksResult.tasks?.every((t) => t.status === "TODO"),
      true,
      "All remaining tasks should be TODO",
    );
    log("Remaining tasks:", remainingTasksResult);
  } finally {
    await client.close();
  }
});

Deno.test("TasksConcept: Interesting Scenario 1 - Error Handling for Creation", async (t) => {
  const [db, client] = await testDb();
  const tasksConcept = new TasksConcept(db);

  try {
    const userBob = "user:Bob" as ID;
    const nonExistentUser = "user:NonExistent" as ID;
    const taskDesc = "Draft proposal";
    log(`Testing with user: ${userBob}`);

    // Test: Attempt to create tasks for a user without a task list
    log(`Attempting to createTask for ${nonExistentUser} (no list created)...`);
    const createFailResult = await tasksConcept.createTask({
      owner: nonExistentUser,
      description: taskDesc,
    });
    assertObjectMatch(
      createFailResult,
      { error: `No task list found for user ${nonExistentUser}. Please create one first.` },
      "Should return an error when creating task for non-existent user",
    );
    log("createTask for non-existent user result:", createFailResult);

    // Action: createUserTasks
    log(`Calling createUserTasks for ${userBob}...`);
    const createBobListResult = await tasksConcept.createUserTasks({ user: userBob });
    assertEquals(createBobListResult, {}, "Should successfully create task list for Bob");
    log("createUserTasks result:", createBobListResult);

    // Test: Attempt to create user tasks for an existing user
    log(`Attempting to createUserTasks again for ${userBob}...`);
    const createExistingFailResult = await tasksConcept.createUserTasks({ user: userBob });
    assertObjectMatch(
      createExistingFailResult,
      { error: `Task list already exists for user ${userBob}` },
      "Should return an error when creating task list for existing user",
    );
    log("createUserTasks for existing user result:", createExistingFailResult);
  } finally {
    await client.close();
  }
});

Deno.test("TasksConcept: Interesting Scenario 2 - Task Updates and Invalid Calls", async (t) => {
  const [db, client] = await testDb();
  const tasksConcept = new TasksConcept(db);

  try {
    const userCharlie = "user:Charlie" as ID;
    log(`Testing with user: ${userCharlie}`);

    await tasksConcept.createUserTasks({ user: userCharlie });
    const createResult = await tasksConcept.createTask({ owner: userCharlie, description: "Initial task" });
    const taskId = (createResult as { task: Task }).task;
    log("Created task:", taskId);

    // Test: Update a single field
    log(`Calling updateTask for ${taskId} to update description...`);
    const updateDescResult = await tasksConcept.updateTask({ task: taskId, newDescription: "Updated description" });
    assertEquals(updateDescResult, {}, "Should successfully update task description");
    log("updateTask (description) result:", updateDescResult);

    let updatedTask = (await tasksConcept._getTasks({ user: userCharlie })).tasks?.find((t) =>
      t._id === taskId
    );
    assertEquals(updatedTask?.description, "Updated description", "Description should be updated");
    log("Task after description update:", updatedTask);

    // Test: Update multiple fields
    const newDueDate = new Date("2024-08-01T15:00:00Z");
    log(`Calling updateTask for ${taskId} to update multiple fields...`);
    const updateMultiResult = await tasksConcept.updateTask({
      task: taskId,
      newDueDate: newDueDate,
      newEstimatedDuration: 2.5,
    });
    assertEquals(updateMultiResult, {}, "Should successfully update multiple fields");
    log("updateTask (multiple fields) result:", updateMultiResult);

    updatedTask = (await tasksConcept._getTasks({ user: userCharlie })).tasks?.find((t) => t._id === taskId);
    assertEquals(updatedTask?.dueDate?.toISOString(), newDueDate.toISOString(), "DueDate should be updated");
    assertEquals(updatedTask?.estimatedDuration, 2.5, "EstimatedDuration should be updated");
    log("Task after multiple field updates:", updatedTask);

    // Test: Update non-existent task
    const nonExistentTask = freshID() as Task;
    log(`Attempting to update non-existent task: ${nonExistentTask}`);
    const updateNonExistentResult = await tasksConcept.updateTask({
      task: nonExistentTask,
      newDescription: "Should not update",
    });
    assertObjectMatch(
      updateNonExistentResult,
      { error: `Task ${nonExistentTask} not found.` },
      "Should return error for non-existent task update",
    );
    log("updateTask (non-existent) result:", updateNonExistentResult);

    // Test: Update with no fields provided
    log(`Attempting to update task ${taskId} with no fields...`);
    const updateNoFieldsResult = await tasksConcept.updateTask({ task: taskId });
    assertObjectMatch(
      updateNoFieldsResult,
      { error: "No fields provided for update." },
      "Should return error when no update fields are provided",
    );
    log("updateTask (no fields) result:", updateNoFieldsResult);
  } finally {
    await client.close();
  }
});

Deno.test("TasksConcept: Interesting Scenario 3 - Reordering Validation", async (t) => {
  const [db, client] = await testDb();
  const tasksConcept = new TasksConcept(db);

  try {
    const userDavid = "user:David" as ID;
    const userEve = "user:Eve" as ID;
    log(`Testing with users: ${userDavid}, ${userEve}`);

    await tasksConcept.createUserTasks({ user: userDavid });
    await tasksConcept.createUserTasks({ user: userEve });

    const taskD1 = (await tasksConcept.createTask({ owner: userDavid, description: "David's task 1" }) as { task: Task }).task;
    const taskD2 = (await tasksConcept.createTask({ owner: userDavid, description: "David's task 2" }) as { task: Task }).task;
    const taskE1 = (await tasksConcept.createTask({ owner: userEve, description: "Eve's task 1" }) as { task: Task }).task;
    log("Created tasks for David and Eve.");

    // Test: Reorder with incomplete list
    log(`Attempting to reorder David's tasks with an incomplete list (${[taskD1]})...`);
    const incompleteReorderResult = await tasksConcept.reorderTasks({ user: userDavid, newOrder: [taskD1] });
    assertObjectMatch(
      incompleteReorderResult,
      { error: "New order list does not contain all or only the user's tasks." },
      "Should return error for incomplete reorder list",
    );
    log("reorderTasks (incomplete) result:", incompleteReorderResult);

    // Test: Reorder with extra task
    log(`Attempting to reorder David's tasks with an extra task (${[taskD1, taskD2, taskE1]})...`);
    const extraReorderResult = await tasksConcept.reorderTasks({ user: userDavid, newOrder: [taskD1, taskD2, taskE1] });
    assertObjectMatch(
      extraReorderResult,
      { error: "New order list does not contain all or only the user's tasks." },
      "Should return error for extra task in reorder list",
    );
    log("reorderTasks (extra task) result:", extraReorderResult);

    // Test: Reorder with duplicate tasks
    log(`Attempting to reorder David's tasks with duplicate task IDs (${[taskD1, taskD1]})...`);
    const duplicateReorderResult = await tasksConcept.reorderTasks({ user: userDavid, newOrder: [taskD1, taskD1] });
    assertObjectMatch(
      duplicateReorderResult,
      { error: "New order list contains duplicate task IDs." },
      "Should return error for duplicate tasks in reorder list",
    );
    log("reorderTasks (duplicate) result:", duplicateReorderResult);

    // Test: Reorder with task not belonging to user
    log(`Attempting to reorder David's tasks with Eve's task (${[taskD1, taskE1]})...`);
    const wrongOwnerReorderResult = await tasksConcept.reorderTasks({ user: userDavid, newOrder: [taskD1, taskE1] });
    assertObjectMatch(
      wrongOwnerReorderResult,
      { error: `Task ${taskE1} in new order does not belong to user ${userDavid}.` },
      "Should return error for task not belonging to user",
    );
    log("reorderTasks (wrong owner) result:", wrongOwnerReorderResult);

    // Test: Reorder for non-existent user
    const nonExistentUser = "user:Ghost" as ID;
    log(`Attempting to reorder tasks for non-existent user: ${nonExistentUser}`);
    const nonExistentUserReorderResult = await tasksConcept.reorderTasks({
      user: nonExistentUser,
      newOrder: [],
    });
    assertObjectMatch(
      nonExistentUserReorderResult,
      { error: `No task list found for user ${nonExistentUser}.` },
      "Should return error for non-existent user reorder",
    );
    log("reorderTasks (non-existent user) result:", nonExistentUserReorderResult);
  } finally {
    await client.close();
  }
});

Deno.test("TasksConcept: Interesting Scenario 4 - Deletion Behavior", async (t) => {
  const [db, client] = await testDb();
  const tasksConcept = new TasksConcept(db);

  try {
    const userFrank = "user:Frank" as ID;
    log(`Testing with user: ${userFrank}`);

    await tasksConcept.createUserTasks({ user: userFrank });
    const taskF1 = (await tasksConcept.createTask({ owner: userFrank, description: "Task F1" }) as { task: Task }).task;
    const taskF2 = (await tasksConcept.createTask({ owner: userFrank, description: "Task F2" }) as { task: Task }).task;
    const taskF3 = (await tasksConcept.createTask({ owner: userFrank, description: "Task F3" }) as { task: Task }).task;
    log("Created tasks for Frank:", { taskF1, taskF2, taskF3 });

    let currentTasks = await tasksConcept._getTasks({ user: userFrank });
    assertEquals(currentTasks.tasks?.length, 3, "Should have 3 tasks initially");
    log("Tasks before deletion:", currentTasks);

    // Action: deleteTask (taskF2)
    log(`Calling deleteTask for task: ${taskF2}`);
    const deleteF2Result = await tasksConcept.deleteTask({ task: taskF2 });
    assertEquals(deleteF2Result, {}, "Should successfully delete taskF2");
    log("deleteTask result:", deleteF2Result);

    // Verify taskF2 is gone and userTasks is updated
    currentTasks = await tasksConcept._getTasks({ user: userFrank });
    assertEquals(currentTasks.tasks?.length, 2, "Should have 2 tasks after deleting F2");
    assertEquals(
      currentTasks.tasks?.some((t) => t._id === taskF2),
      false,
      "Task F2 should no longer be present",
    );
    log("Tasks after deleting F2:", currentTasks);
    assertEquals(currentTasks.tasks?.[0]._id, taskF1, "First task should be F1");
    assertEquals(currentTasks.tasks?.[1]._id, taskF3, "Second task should be F3");

    // Test: Delete non-existent task
    const nonExistentTask = freshID() as Task;
    log(`Attempting to deleteTask for non-existent task: ${nonExistentTask}`);
    const deleteNonExistentResult = await tasksConcept.deleteTask({ task: nonExistentTask });
    assertObjectMatch(
      deleteNonExistentResult,
      { error: `Task ${nonExistentTask} not found.` },
      "Should return error for deleting non-existent task",
    );
    log("deleteTask (non-existent) result:", deleteNonExistentResult);

    // Action: deleteAllForUser
    log(`Calling deleteAllForUser for user: ${userFrank}`);
    const deleteAllResult = await tasksConcept.deleteAllForUser({ user: userFrank });
    assertEquals(deleteAllResult, {}, "Should successfully delete all tasks for Frank");
    log("deleteAllForUser result:", deleteAllResult);

    // Verify all tasks are gone and userTasks is gone
    const afterAllDeleteTasks = await (db.collection("Tasks.tasks") as Collection<TaskDocument>).find({ owner: userFrank }).toArray();
    assertEquals(afterAllDeleteTasks.length, 0, "No tasks should remain for Frank");
    log("Tasks collection after deleteAllForUser:", afterAllDeleteTasks);

    const afterAllDeleteUserTasks = await (db.collection("Tasks.userTasks") as Collection<UserTasksDocument>).findOne({ _id: userFrank });
    assertEquals(afterAllDeleteUserTasks, null, "UserTasks document should be removed for Frank");
    log("UserTasks collection after deleteAllForUser:", afterAllDeleteUserTasks);

    // Test: deleteAllForUser for user with no tasks
    const userGrace = "user:Grace" as ID;
    log(`Attempting to deleteAllForUser for user: ${userGrace} (who has no tasks/list)`);
    const deleteEmptyUserResult = await tasksConcept.deleteAllForUser({ user: userGrace });
    assertObjectMatch(
      deleteEmptyUserResult,
      { error: `No tasks or task list found for user ${userGrace}.` },
      "Should return error when deleting for user with no tasks or list",
    );
    log("deleteAllForUser (empty user) result:", deleteEmptyUserResult);
  } finally {
    await client.close();
  }
});

Deno.test("TasksConcept: Interesting Scenario 5 - Mark Complete/Incomplete Cycle & Query Filtering", async (t) => {
  const [db, client] = await testDb();
  const tasksConcept = new TasksConcept(db);

  try {
    const userHeidi = "user:Heidi" as ID;
    log(`Testing with user: ${userHeidi}`);

    await tasksConcept.createUserTasks({ user: userHeidi });
    const taskH1 = (await tasksConcept.createTask({ owner: userHeidi, description: "Task H1" }) as { task: Task }).task;
    const taskH2 = (await tasksConcept.createTask({ owner: userHeidi, description: "Task H2" }) as { task: Task }).task;
    const taskH3 = (await tasksConcept.createTask({ owner: userHeidi, description: "Task H3" }) as { task: Task }).task;
    log("Created tasks for Heidi:", { taskH1, taskH2, taskH3 });

    // Initial state: all TODO
    let allTasks = await tasksConcept._getTasks({ user: userHeidi });
    let remainingTasks = await tasksConcept._getRemainingTasks({ user: userHeidi });
    assertEquals(allTasks.tasks?.length, 3);
    assertEquals(remainingTasks.tasks?.length, 3);
    log("Initial tasks state (all TODO):", { allTasks: allTasks.tasks?.map(t => t.status), remainingTasks: remainingTasks.tasks?.map(t => t.status) });

    // Mark H1 complete
    log(`Marking task H1 (${taskH1}) complete...`);
    await tasksConcept.markTaskComplete({ task: taskH1 });
    allTasks = await tasksConcept._getTasks({ user: userHeidi });
    remainingTasks = await tasksConcept._getRemainingTasks({ user: userHeidi });
    assertEquals(allTasks.tasks?.find(t => t._id === taskH1)?.status, "DONE");
    assertEquals(remainingTasks.tasks?.length, 2, "Should have 2 remaining tasks after H1 is DONE");
    log("Tasks state after H1 complete:", { allTasks: allTasks.tasks?.map(t => ({id: t._id, status: t.status})), remainingTasks: remainingTasks.tasks?.map(t => ({id: t._id, status: t.status})) });

    // Mark H3 complete
    log(`Marking task H3 (${taskH3}) complete...`);
    await tasksConcept.markTaskComplete({ task: taskH3 });
    allTasks = await tasksConcept._getTasks({ user: userHeidi });
    remainingTasks = await tasksConcept._getRemainingTasks({ user: userHeidi });
    assertEquals(allTasks.tasks?.find(t => t._id === taskH3)?.status, "DONE");
    assertEquals(remainingTasks.tasks?.length, 1, "Should have 1 remaining task after H3 is DONE");
    log("Tasks state after H3 complete:", { allTasks: allTasks.tasks?.map(t => ({id: t._id, status: t.status})), remainingTasks: remainingTasks.tasks?.map(t => ({id: t._id, status: t.status})) });
    assertEquals(remainingTasks.tasks?.[0]._id, taskH2, "The only remaining task should be H2");

    // "Un-complete" H1 by updating its status (not explicitly an action, but possible via updateTask logic)
    // Note: The concept spec does not include an explicit `markTaskIncomplete` action,
    // but `updateTask` can achieve this by changing the status field.
    // However, the prompt requires tests for *actions* as specified.
    // `markTaskComplete` is tested, and `updateTask` is tested for other fields.
    // For adherence to the prompt, I'll stick to specified actions.
    // The given `markTaskComplete` only sets to DONE, not reverses.
    // If "uncompleting" was desired, a `markTaskIncomplete` action or status field in updateTask would be needed.

    // Test: Mark non-existent task complete
    const nonExistentTask = freshID() as Task;
    log(`Attempting to mark non-existent task (${nonExistentTask}) complete...`);
    const markNonExistentResult = await tasksConcept.markTaskComplete({ task: nonExistentTask });
    assertObjectMatch(
      markNonExistentResult,
      { error: `Task ${nonExistentTask} not found.` },
      "Should return error for marking non-existent task complete",
    );
    log("markTaskComplete (non-existent) result:", markNonExistentResult);

    // Test: _getTasks and _getRemainingTasks for non-existent user
    const nonExistentUser = "user:Unknown" as ID;
    log(`Attempting to get tasks for non-existent user: ${nonExistentUser}`);
    const getTasksNonExistentUser = await tasksConcept._getTasks({ user: nonExistentUser });
    assertObjectMatch(
      getTasksNonExistentUser,
      { error: `No task list found for user ${nonExistentUser}.` },
      "Should return error for getting tasks of non-existent user",
    );
    log("getTasks (non-existent user) result:", getTasksNonExistentUser);

    log(`Attempting to get remaining tasks for non-existent user: ${nonExistentUser}`);
    const getRemainingTasksNonExistentUser = await tasksConcept._getRemainingTasks({
      user: nonExistentUser,
    });
    assertObjectMatch(
      getRemainingTasksNonExistentUser,
      { error: `No task list found for user ${nonExistentUser}.` },
      "Should return error for getting remaining tasks of non-existent user",
    );
    log("getRemainingTasks (non-existent user) result:", getRemainingTasksNonExistentUser);
  } finally {
    await client.close();
  }
});
```

```markdown
# trace: Tasks Concept Operational Principle Test

**Test Description**: This trace covers the operational principle of the `Tasks` concept: "tasks are added to a prioritized list and can be marked as complete". It demonstrates creating a user's task list, adding multiple tasks, reordering them, and then marking one as complete, verifying the state at each step.

**User**: user:Alice

**Initial State**: No user task list or tasks for user:Alice.

**Sequence of Actions**:

1.  **createUserTasks (user: user:Alice)**
    *   **Input**: `{ user: "user:Alice" }`
    *   **Expected Output**: `{}` (success)
    *   **Verified State**: `userTasks` collection contains an entry for "user:Alice" with an empty `orderedTasks` array.

2.  **createTask (owner: user:Alice, description: "Buy groceries", dueDate: 2024-07-20T10:00:00Z)**
    *   **Input**: `{ owner: "user:Alice", description: "Buy groceries", dueDate: "2024-07-20T10:00:00Z" }`
    *   **Expected Output**: `{ task: "task:..." }` (a new task ID)
    *   **Verified State**: `tasks` collection contains the new task. `userTasks` entry for "user:Alice" has this new task's ID added to `orderedTasks`.

3.  **createTask (owner: user:Alice, description: "Finish project report", estimatedDuration: 4)**
    *   **Input**: `{ owner: "user:Alice", description: "Finish project report", estimatedDuration: 4 }`
    *   **Expected Output**: `{ task: "task:..." }` (a new task ID)
    *   **Verified State**: `tasks` collection contains the new task. `userTasks` entry for "user:Alice" has this new task's ID appended to `orderedTasks`.

4.  **createTask (owner: user:Alice, description: "Call mom")**
    *   **Input**: `{ owner: "user:Alice", description: "Call mom" }`
    *   **Expected Output**: `{ task: "task:..." }` (a new task ID)
    *   **Verified State**: `tasks` collection contains the new task. `userTasks` entry for "user:Alice" has this new task's ID appended to `orderedTasks`.

5.  **_getTasks (user: user:Alice)**
    *   **Input**: `{ user: "user:Alice" }`
    *   **Expected Output**: `{ tasks: [task1, task2, task3] }` (an array of TaskDocument objects in creation order)
    *   **Verified State**: The returned tasks match the expected tasks and are in the order they were created.

6.  **reorderTasks (user: user:Alice, newOrder: [task3Id, task1Id, task2Id])**
    *   **Input**: `{ user: "user:Alice", newOrder: [task3Id, task1Id, task2Id] }` (where `taskXId` are the actual IDs)
    *   **Expected Output**: `{}` (success)
    *   **Verified State**: `userTasks` entry for "user:Alice" has `orderedTasks` updated to the new sequence.

7.  **_getTasks (user: user:Alice)**
    *   **Input**: `{ user: "user:Alice" }`
    *   **Expected Output**: `{ tasks: [task3, task1, task2] }` (tasks in the new reordered sequence)
    *   **Verified State**: The returned tasks are in the new reordered sequence.

8.  **markTaskComplete (task: task1Id)**
    *   **Input**: `{ task: task1Id }`
    *   **Expected Output**: `{}` (success)
    *   **Verified State**: The `task` document for `task1Id` in the `tasks` collection has its `status` field changed to "DONE".

9.  **_getTasks (user: user:Alice)**
    *   **Input**: `{ user: "user:Alice" }`
    *   **Expected Output**: `{ tasks: [..., { _id: task1Id, status: "DONE" }, ...] }`
    *   **Verified State**: The `task1Id` document's status is "DONE", others remain "TODO".

10. **_getRemainingTasks (user: user:Alice)**
    *   **Input**: `{ user: "user:Alice" }`
    *   **Expected Output**: `{ tasks: [task3, task2] }` (only tasks with status "TODO")
    *   **Verified State**: Returns only the tasks that are still "TODO", in their current order.

**Final State**: The user "user:Alice" has a task list with three tasks, two of which are "TODO" (task3, task2) and one is "DONE" (task1), in a specific order.
```
