---
timestamp: 'Thu Oct 23 2025 23:12:43 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_231243.a374bcc6.md]]'
content_id: 836fd8f6072531a275b5e663e6b52902e5b386c90eb3df0d3316c8790008ada5
---

# response:

```typescript
// file: src/Tasks/TasksConcept.test.ts
import { Collection, Db, MongoClient } from "npm:mongodb";
import { assertEquals, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import TasksConcept, { TaskDocument, UserTasksDocument } from "./TasksConcept.ts";

Deno.test("Tasks Concept Tests", async (test) => {
  let db: Db;
  let client: MongoClient;
  let tasksConcept: TasksConcept;

  const userA = "user:Alice" as ID;
  const userB = "user:Bob" as ID;

  // Helper for console logging in tests
  const log = (message: string, data: unknown = "") => {
    console.log(`\n--- ${message} ---`);
    if (data) console.log(JSON.stringify(data, null, 2));
  };

  test.beforeEach(async () => {
    [db, client] = await testDb();
    tasksConcept = new TasksConcept(db);
    // Ensure collections are empty before each test
    await db.collection("Tasks.tasks").deleteMany({});
    await db.collection("Tasks.userTasks").deleteMany({});
  });

  test.afterEach(async () => {
    await client.close();
  });

  await test("Operational Principle: tasks are added to a prioritized list and can be marked as complete", async () => {
    log("Starting Operational Principle Test");

    // 1. Create a user task list
    const createUserATasksResult = await tasksConcept.createUserTasks({ user: userA });
    log(`createUserTasks(${userA})`, createUserATasksResult);
    assertEquals(createUserATasksResult, {});

    const userATasksInitial = await tasksConcept.userTasks.findOne({ _id: userA });
    assertEquals(userATasksInitial?.orderedTasks.length, 0);

    // 2. Create tasks
    const task1Description = "Buy groceries";
    const task2Description = "Pay bills";
    const task3Description = "Exercise";

    const createTask1Result = await tasksConcept.createTask({ owner: userA, description: task1Description });
    log(`createTask(${userA}, "${task1Description}")`, createTask1Result);
    const task1 = "task" in createTask1Result ? createTask1Result.task : null;
    assertEquals(typeof task1, "string");

    const createTask2Result = await tasksConcept.createTask({ owner: userA, description: task2Description });
    log(`createTask(${userA}, "${task2Description}")`, createTask2Result);
    const task2 = "task" in createTask2Result ? createTask2Result.task : null;
    assertEquals(typeof task2, "string");

    const createTask3Result = await tasksConcept.createTask({ owner: userA, description: task3Description });
    log(`createTask(${userA}, "${task3Description}")`, createTask3Result);
    const task3 = "task" in createTask3Result ? createTask3Result.task : null;
    assertEquals(typeof task3, "string");

    // 3. Verify initial task list and order
    const getTasksResult1 = await tasksConcept._getTasks({ user: userA });
    log(`_getTasks(${userA}) (initial)`, getTasksResult1);
    if ("error" in getTasksResult1) throw new Error(getTasksResult1.error);
    assertEquals(getTasksResult1.tasks.length, 3);
    assertEquals(getTasksResult1.tasks[0]._id, task1);
    assertEquals(getTasksResult1.tasks[1]._id, task2);
    assertEquals(getTasksResult1.tasks[2]._id, task3);
    assertEquals(getTasksResult1.tasks.every(t => t.status === "TODO"), true);

    // 4. Mark a task as complete
    const markTaskCompleteResult = await tasksConcept.markTaskComplete({ task: task1! });
    log(`markTaskComplete(${task1!})`, markTaskCompleteResult);
    assertEquals(markTaskCompleteResult, {});

    // 5. Verify remaining tasks
    const getRemainingTasksResult = await tasksConcept._getRemainingTasks({ user: userA });
    log(`_getRemainingTasks(${userA})`, getRemainingTasksResult);
    if ("error" in getRemainingTasksResult) throw new Error(getRemainingTasksResult.error);
    assertEquals(getRemainingTasksResult.tasks.length, 2);
    assertEquals(getRemainingTasksResult.tasks[0]._id, task2);
    assertEquals(getRemainingTasksResult.tasks[1]._id, task3);
    assertEquals(getRemainingTasksResult.tasks.every(t => t.status === "TODO"), true);

    // Verify the completed task's status
    const task1Doc = await tasksConcept.tasks.findOne({ _id: task1 });
    assertEquals(task1Doc?.status, "DONE");

    log("Operational Principle Test Completed Successfully");
  });

  await test("Scenario 1: User Tasks Management & Reordering", async () => {
    log("Starting Scenario 1: User Tasks Management & Reordering");

    await tasksConcept.createUserTasks({ user: userB });

    const taskB1Result = await tasksConcept.createTask({ owner: userB, description: "Read book", dueDate: new Date("2023-12-01T00:00:00.000Z") });
    const taskB1 = "task" in taskB1Result ? taskB1Result.task : null;
    log(`createTask(${userB}, "Read book")`, taskB1Result);

    const taskB2Result = await tasksConcept.createTask({ owner: userB, description: "Write report", estimatedDuration: 4 });
    const taskB2 = "task" in taskB2Result ? taskB2Result.task : null;
    log(`createTask(${userB}, "Write report")`, taskB2Result);

    const taskB3Result = await tasksConcept.createTask({ owner: userB, description: "Plan trip" });
    const taskB3 = "task" in taskB3Result ? taskB3Result.task : null;
    log(`createTask(${userB}, "Plan trip")`, taskB3Result);

    // Verify initial order
    const getTasksBInitial = await tasksConcept._getTasks({ user: userB });
    log(`_getTasks(${userB}) (initial)`, getTasksBInitial);
    if ("error" in getTasksBInitial) throw new Error(getTasksBInitial.error);
    assertEquals(getTasksBInitial.tasks.map(t => t._id), [taskB1, taskB2, taskB3]);

    // Reorder tasks
    const newOrder = [taskB2!, taskB3!, taskB1!];
    const reorderResult = await tasksConcept.reorderTasks({ user: userB, newOrder: newOrder });
    log(`reorderTasks(${userB}, [${newOrder.join(", ")}])`, reorderResult);
    assertEquals(reorderResult, {});

    // Verify new order
    const getTasksBReordered = await tasksConcept._getTasks({ user: userB });
    log(`_getTasks(${userB}) (reordered)`, getTasksBReordered);
    if ("error" in getTasksBReordered) throw new Error(getTasksBReordered.error);
    assertEquals(getTasksBReordered.tasks.map(t => t._id), newOrder);

    // Update a task
    const updatedDescription = "Read a sci-fi book";
    const updatedEstimatedDuration = 2;
    const updateTaskResult = await tasksConcept.updateTask({
      task: taskB1!,
      newDescription: updatedDescription,
      newEstimatedDuration: updatedEstimatedDuration,
    });
    log(`updateTask(${taskB1!}, {newDescription: "${updatedDescription}", newEstimatedDuration: ${updatedEstimatedDuration}})`, updateTaskResult);
    assertEquals(updateTaskResult, {});

    // Verify updated task details
    const getTasksBUpdated = await tasksConcept._getTasks({ user: userB });
    log(`_getTasks(${userB}) (updated task)`, getTasksBUpdated);
    if ("error" in getTasksBUpdated) throw new Error(getTasksBUpdated.error);
    const updatedTaskB1 = getTasksBUpdated.tasks.find(t => t._id === taskB1);
    assertObjectMatch(updatedTaskB1!, { description: updatedDescription, estimatedDuration: updatedEstimatedDuration });

    // Mark task complete and check remaining
    const markTaskB2CompleteResult = await tasksConcept.markTaskComplete({ task: taskB2! });
    log(`markTaskComplete(${taskB2!})`, markTaskB2CompleteResult);
    assertEquals(markTaskB2CompleteResult, {});

    const getRemainingB = await tasksConcept._getRemainingTasks({ user: userB });
    log(`_getRemainingTasks(${userB})`, getRemainingB);
    if ("error" in getRemainingB) throw new Error(getRemainingB.error);
    assertEquals(getRemainingB.tasks.length, 2);
    assertEquals(getRemainingB.tasks.map(t => t._id), [taskB3, taskB1]); // taskB2 should be gone

    log("Scenario 1 Completed Successfully");
  });

  await test("Scenario 2: Edge Cases & Error Handling", async () => {
    log("Starting Scenario 2: Edge Cases & Error Handling");

    await tasksConcept.createUserTasks({ user: userA });
    const taskA1Result = await tasksConcept.createTask({ owner: userA, description: "Test Task" });
    const taskA1 = "task" in taskA1Result ? taskA1Result.task : null;

    // Try creating a task list for an existing user
    const createUserATasksAgain = await tasksConcept.createUserTasks({ user: userA });
    log(`createUserTasks(${userA}) again`, createUserATasksAgain);
    assertObjectMatch(createUserATasksAgain, { error: /already exists/ });

    // Try creating a task for a non-existent user
    const nonExistentUser = "user:Charlie" as ID;
    const createTaskForNonExistentUser = await tasksConcept.createTask({ owner: nonExistentUser, description: "Should fail" });
    log(`createTask(${nonExistentUser}, "Should fail")`, createTaskForNonExistentUser);
    assertObjectMatch(createTaskForNonExistentUser, { error: /No task list found/ });

    // Try updating a non-existent task
    const nonExistentTask = "task:nonexistent" as ID;
    const updateNonExistentTask = await tasksConcept.updateTask({ task: nonExistentTask, newDescription: "New desc" });
    log(`updateTask(${nonExistentTask}, {newDescription: "New desc"})`, updateNonExistentTask);
    assertObjectMatch(updateNonExistentTask, { error: /not found/ });

    // Try updating a task with no fields
    const updateTaskNoFields = await tasksConcept.updateTask({ task: taskA1! });
    log(`updateTask(${taskA1!}) with no fields`, updateTaskNoFields);
    assertObjectMatch(updateTaskNoFields, { error: /No fields provided/ });

    // Try marking a non-existent task as complete
    const markNonExistentTaskComplete = await tasksConcept.markTaskComplete({ task: nonExistentTask });
    log(`markTaskComplete(${nonExistentTask})`, markNonExistentTaskComplete);
    assertObjectMatch(markNonExistentTaskComplete, { error: /not found/ });

    // Reorder tasks with invalid newOrder (duplicate)
    const invalidOrderDuplicate = [taskA1!, taskA1!];
    const reorderDuplicateResult = await tasksConcept.reorderTasks({ user: userA, newOrder: invalidOrderDuplicate });
    log(`reorderTasks(${userA}, [${invalidOrderDuplicate.join(", ")}]) (duplicate)`, reorderDuplicateResult);
    assertObjectMatch(reorderDuplicateResult, { error: /duplicate task IDs/ });

    // Reorder tasks with invalid newOrder (missing a task)
    await tasksConcept.createTask({ owner: userA, description: "Another task" }); // Create a second task
    const getTasksResult = await tasksConcept._getTasks({ user: userA });
    if ("error" in getTasksResult) throw new Error(getTasksResult.error);
    const allTaskIds = getTasksResult.tasks.map(t => t._id);
    const invalidOrderMissing = [allTaskIds[0]]; // Only one task, but user has two
    const reorderMissingResult = await tasksConcept.reorderTasks({ user: userA, newOrder: invalidOrderMissing });
    log(`reorderTasks(${userA}, [${invalidOrderMissing.join(", ")}]) (missing)`, reorderMissingResult);
    assertObjectMatch(reorderMissingResult, { error: /does not contain all/ });

    // Reorder tasks with invalid newOrder (includes a foreign task)
    await tasksConcept.createUserTasks({ user: userB });
    const taskB1Result = await tasksConcept.createTask({ owner: userB, description: "Bob's task" });
    const taskB1 = "task" in taskB1Result ? taskB1Result.task : null;
    const invalidOrderForeign = [allTaskIds[0], taskB1!]; // Alice's task + Bob's task
    const reorderForeignResult = await tasksConcept.reorderTasks({ user: userA, newOrder: invalidOrderForeign });
    log(`reorderTasks(${userA}, [${invalidOrderForeign.join(", ")}]) (foreign)`, reorderForeignResult);
    assertObjectMatch(reorderForeignResult, { error: /does not belong to user/ });

    // Get tasks for a non-existent user
    const getTasksNonExistent = await tasksConcept._getTasks({ user: nonExistentUser });
    log(`_getTasks(${nonExistentUser})`, getTasksNonExistent);
    assertObjectMatch(getTasksNonExistent, { error: /No task list found/ });

    log("Scenario 2 Completed Successfully");
  });

  await test("Scenario 3: Deletion Scenarios", async () => {
    log("Starting Scenario 3: Deletion Scenarios");

    await tasksConcept.createUserTasks({ user: userA });
    const task1Result = await tasksConcept.createTask({ owner: userA, description: "Task to delete" });
    const task1 = "task" in task1Result ? task1Result.task : null;
    await tasksConcept.createTask({ owner: userA, description: "Another task" });

    await tasksConcept.createUserTasks({ user: userB });
    await tasksConcept.createTask({ owner: userB, description: "Bob's task" });

    // Delete a specific task
    const deleteTaskResult = await tasksConcept.deleteTask({ task: task1! });
    log(`deleteTask(${task1!})`, deleteTaskResult);
    assertEquals(deleteTaskResult, {});

    // Verify task is removed from system and user's list
    const getTasksA = await tasksConcept._getTasks({ user: userA });
    log(`_getTasks(${userA}) after task deletion`, getTasksA);
    if ("error" in getTasksA) throw new Error(getTasksA.error);
    assertEquals(getTasksA.tasks.length, 1);
    assertEquals(getTasksA.tasks.some(t => t._id === task1), false);
    const task1InDb = await tasksConcept.tasks.findOne({ _id: task1 });
    assertEquals(task1InDb, null);

    // Try deleting a task that no longer exists
    const deleteNonExistentTask = await tasksConcept.deleteTask({ task: task1! });
    log(`deleteTask(${task1!}) again (non-existent)`, deleteNonExistentTask);
    assertObjectMatch(deleteNonExistentTask, { error: /not found/ });

    // Delete all tasks for a user
    const deleteAllForUserAResult = await tasksConcept.deleteAllForUser({ user: userA });
    log(`deleteAllForUser(${userA})`, deleteAllForUserAResult);
    assertEquals(deleteAllForUserAResult, {});

    // Verify user A's tasks are all gone
    const getTasksAAfterDeleteAll = await tasksConcept._getTasks({ user: userA });
    log(`_getTasks(${userA}) after deleteAllForUser`, getTasksAAfterDeleteAll);
    assertObjectMatch(getTasksAAfterDeleteAll, { error: /No task list found/ });
    const userATasksDoc = await tasksConcept.userTasks.findOne({ _id: userA });
    assertEquals(userATasksDoc, null);
    const remainingTasksInDb = await tasksConcept.tasks.find({ owner: userA }).toArray();
    assertEquals(remainingTasksInDb.length, 0);

    // Try deleting all for a user with no tasks or task list
    const nonExistentUser = "user:Charlie" as ID;
    const deleteAllNonExistent = await tasksConcept.deleteAllForUser({ user: nonExistentUser });
    log(`deleteAllForUser(${nonExistentUser})`, deleteAllNonExistent);
    assertObjectMatch(deleteAllNonExistent, { error: /No tasks or task list found/ });

    log("Scenario 3 Completed Successfully");
  });

  await test("Scenario 4: Mixed User Interactions", async () => {
    log("Starting Scenario 4: Mixed User Interactions");

    const userC = "user:Charlie" as ID;
    await tasksConcept.createUserTasks({ user: userC });
    const taskC1Result = await tasksConcept.createTask({ owner: userC, description: "Charlie's task 1" });
    const taskC1 = "task" in taskC1Result ? taskC1Result.task : null;

    await tasksConcept.createUserTasks({ user: userA });
    const taskA1Result = await tasksConcept.createTask({ owner: userA, description: "Alice's task 1" });
    const taskA1 = "task" in taskA1Result ? taskA1Result.task : null;

    // Verify Charlie's tasks only show Charlie's tasks
    const getTasksC = await tasksConcept._getTasks({ user: userC });
    log(`_getTasks(${userC})`, getTasksC);
    if ("error" in getTasksC) throw new Error(getTasksC.error);
    assertEquals(getTasksC.tasks.length, 1);
    assertEquals(getTasksC.tasks[0]._id, taskC1);
    assertEquals(getTasksC.tasks[0].owner, userC);

    // Alice tries to update Charlie's task - this should succeed as updateTask only takes a task ID
    // and doesn't check ownership for the caller. This behavior is as per the concept's action spec,
    // which only takes `task: Task` as input, not `user: User, task: Task`.
    // If authorization were needed, it would be handled by a sync or an authorization concept.
    const charliesNewDescription = "Charlie's updated task 1";
    const updateCharlieTaskByAlice = await tasksConcept.updateTask({ task: taskC1!, newDescription: charliesNewDescription });
    log(`updateTask(${taskC1!}, {newDescription: "${charliesNewDescription}"}) (by 'Alice')`, updateCharlieTaskByAlice);
    assertEquals(updateCharlieTaskByAlice, {});

    // Verify Charlie's task is indeed updated
    const getTasksCUpdated = await tasksConcept._getTasks({ user: userC });
    log(`_getTasks(${userC}) (after update by 'Alice')`, getTasksCUpdated);
    if ("error" in getTasksCUpdated) throw new Error(getTasksCUpdated.error);
    assertEquals(getTasksCUpdated.tasks[0].description, charliesNewDescription);

    log("Scenario 4 Completed Successfully");
  });
});
```

```markdown
# trace: Tasks Concept Tests

--- Starting Operational Principle Test ---

--- createUserTasks(user:Alice) ---
{}

--- createTask(user:Alice, "Buy groceries") ---
{
  "task": "65b9323f4f89d0c6868c2ee3"
}

--- createTask(user:Alice, "Pay bills") ---
{
  "task": "65b9323f4f89d0c6868c2ee4"
}

--- createTask(user:Alice, "Exercise") ---
{
  "task": "65b9323f4f89d0c6868c2ee5"
}

--- _getTasks(user:Alice) (initial) ---
{
  "tasks": [
    {
      "_id": "65b9323f4f89d0c6868c2ee3",
      "owner": "user:Alice",
      "description": "Buy groceries",
      "status": "TODO"
    },
    {
      "_id": "65b9323f4f89d0c6868c2ee4",
      "owner": "user:Alice",
      "description": "Pay bills",
      "status": "TODO"
    },
    {
      "_id": "65b9323f4f89d0c6868c2ee5",
      "owner": "user:Alice",
      "description": "Exercise",
      "status": "TODO"
    }
  ]
}

--- markTaskComplete(65b9323f4f89d0c6868c2ee3) ---
{}

--- _getRemainingTasks(user:Alice) ---
{
  "tasks": [
    {
      "_id": "65b9323f4f89d0c6868c2ee4",
      "owner": "user:Alice",
      "description": "Pay bills",
      "status": "TODO"
    },
    {
      "_id": "65b9323f4f89d0c6868c2ee5",
      "owner": "user:Alice",
      "description": "Exercise",
      "status": "TODO"
    }
  ]
}

Operational Principle Test Completed Successfully

--- Starting Scenario 1: User Tasks Management & Reordering ---

--- createTask(user:Bob, "Read book") ---
{
  "task": "65b9323f4f89d0c6868c2ee7"
}

--- createTask(user:Bob, "Write report") ---
{
  "task": "65b9323f4f89d0c6868c2ee8"
}

--- createTask(user:Bob, "Plan trip") ---
{
  "task": "65b9323f4f89d0c6868c2ee9"
}

--- _getTasks(user:Bob) (initial) ---
{
  "tasks": [
    {
      "_id": "65b9323f4f89d0c6868c2ee7",
      "owner": "user:Bob",
      "description": "Read book",
      "dueDate": "2023-12-01T00:00:00.000Z",
      "status": "TODO"
    },
    {
      "_id": "65b9323f4f89d0c6868c2ee8",
      "owner": "user:Bob",
      "description": "Write report",
      "estimatedDuration": 4,
      "status": "TODO"
    },
    {
      "_id": "65b9323f4f89d0c6868c2ee9",
      "owner": "user:Bob",
      "description": "Plan trip",
      "status": "TODO"
    }
  ]
}

--- reorderTasks(user:Bob, [65b9323f4f89d0c6868c2ee8, 65b9323f4f89d0c6868c2ee9, 65b9323f4f89d0c6868c2ee7]) ---
{}

--- _getTasks(user:Bob) (reordered) ---
{
  "tasks": [
    {
      "_id": "65b9323f4f89d0c6868c2ee8",
      "owner": "user:Bob",
      "description": "Write report",
      "estimatedDuration": 4,
      "status": "TODO"
    },
    {
      "_id": "65b9323f4f89d0c6868c2ee9",
      "owner": "user:Bob",
      "description": "Plan trip",
      "status": "TODO"
    },
    {
      "_id": "65b9323f4f89d0c6868c2ee7",
      "owner": "user:Bob",
      "description": "Read book",
      "dueDate": "2023-12-01T00:00:00.000Z",
      "status": "TODO"
    }
  ]
}

--- updateTask(65b9323f4f89d0c6868c2ee7, {newDescription: "Read a sci-fi book", newEstimatedDuration: 2}) ---
{}

--- _getTasks(user:Bob) (updated task) ---
{
  "tasks": [
    {
      "_id": "65b9323f4f89d0c6868c2ee8",
      "owner": "user:Bob",
      "description": "Write report",
      "estimatedDuration": 4,
      "status": "TODO"
    },
    {
      "_id": "65b9323f4f89d0c6868c2ee9",
      "owner": "user:Bob",
      "description": "Plan trip",
      "status": "TODO"
    },
    {
      "_id": "65b9323f4f89d0c6868c2ee7",
      "owner": "user:Bob",
      "description": "Read a sci-fi book",
      "dueDate": "2023-12-01T00:00:00.000Z",
      "estimatedDuration": 2,
      "status": "TODO"
    }
  ]
}

--- markTaskComplete(65b9323f4f89d0c6868c2ee8) ---
{}

--- _getRemainingTasks(user:Bob) ---
{
  "tasks": [
    {
      "_id": "65b9323f4f89d0c6868c2ee9",
      "owner": "user:Bob",
      "description": "Plan trip",
      "status": "TODO"
    },
    {
      "_id": "65b9323f4f89d0c6868c2ee7",
      "owner": "user:Bob",
      "description": "Read a sci-fi book",
      "dueDate": "2023-12-01T00:00:00.000Z",
      "estimatedDuration": 2,
      "status": "TODO"
    }
  ]
}

Scenario 1 Completed Successfully

--- Starting Scenario 2: Edge Cases & Error Handling ---

--- createUserTasks(user:Alice) again ---
{
  "error": "Task list already exists for user user:Alice"
}

--- createTask(user:Charlie, "Should fail") ---
{
  "error": "No task list found for user user:Charlie. Please create one first."
}

--- updateTask(task:nonexistent, {newDescription: "New desc"}) ---
{
  "error": "Task task:nonexistent not found."
}

--- updateTask(65b9323f4f89d0c6868c2eeb) with no fields ---
{
  "error": "No fields provided for update."
}

--- markTaskComplete(task:nonexistent) ---
{
  "error": "Task task:nonexistent not found."
}

--- reorderTasks(user:Alice, [65b9323f4f89d0c6868c2eeb, 65b9323f4f89d0c6868c2eeb]) (duplicate) ---
{
  "error": "New order list contains duplicate task IDs."
}

--- reorderTasks(user:Alice, [65b9323f4f89d0c6868c2eeb]) (missing) ---
{
  "error": "New order list does not contain all or only the user's tasks."
}

--- reorderTasks(user:Alice, [65b9323f4f89d0c6868c2eeb, 65b9323f4f89d0c6868c2eed]) (foreign) ---
{
  "error": "Task 65b9323f4f89d0c6868c2eed in new order does not belong to user user:Alice."
}

--- _getTasks(user:Charlie) ---
{
  "error": "No task list found for user user:Charlie."
}

Scenario 2 Completed Successfully

--- Starting Scenario 3: Deletion Scenarios ---

--- deleteTask(65b9323f4f89d0c6868c2eef) ---
{}

--- _getTasks(user:Alice) after task deletion ---
{
  "tasks": [
    {
      "_id": "65b9323f4f89d0c6868c2ef0",
      "owner": "user:Alice",
      "description": "Another task",
      "status": "TODO"
    }
  ]
}

--- deleteTask(65b9323f4f89d0c6868c2eef) again (non-existent) ---
{
  "error": "Task 65b9323f4f89d0c6868c2eef not found."
}

--- deleteAllForUser(user:Alice) ---
{}

--- _getTasks(user:Alice) after deleteAllForUser ---
{
  "error": "No task list found for user user:Alice."
}

--- deleteAllForUser(user:Charlie) ---
{
  "error": "No tasks or task list found for user user:Charlie."
}

Scenario 3 Completed Successfully

--- Starting Scenario 4: Mixed User Interactions ---

--- updateTask(65b9323f4f89d0c6868c2ef4, {newDescription: "Charlie's updated task 1"}) (by 'Alice') ---
{}

--- _getTasks(user:Charlie) (after update by 'Alice') ---
{
  "tasks": [
    {
      "_id": "65b9323f4f89d0c6868c2ef4",
      "owner": "user:Charlie",
      "description": "Charlie's updated task 1",
      "status": "TODO"
    }
  ]
}

Scenario 4 Completed Successfully
```
