---
timestamp: 'Tue Oct 14 2025 22:33:38 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_223338.4eba48a9.md]]'
content_id: 4c7b596ada144c71dda247c25c6eb0183461ddb8a638e3168bb486fed6d1f5ba
---

# response:

To implement the tests for the `TaskCatalog` concept, we will create `src/TaskCatalog/TaskCatalog.test.ts`. This file will include tests for each action, ensuring that their requirements (`requires`) and effects (`effects`) are met. Additionally, a comprehensive "Principle Trace" will demonstrate the concept's full lifecycle as described in its principle.

We'll use `testDb()` to get a clean database instance for each test run and `assertEquals`, `assertExists`, `assertNotEquals` for assertions.

Here's the content for `src/TaskCatalog/TaskCatalog.test.ts`:

```typescript
// src/TaskCatalog/TaskCatalog.test.ts
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import TaskCatalogConcept from "./TaskCatalog.ts";

Deno.test("TaskCatalog Concept", async (t) => {
  const [db, client] = await testDb();
  const concept = new TaskCatalogConcept(db);

  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const userCharlie = "user:Charlie" as ID;

  // Helper function to create a basic task for testing
  const createBasicTask = async (
    owner: ID,
    taskName: string,
    duration: number = 60,
  ) => {
    const result = await concept.createTask({
      owner,
      taskName,
      category: "Work",
      duration,
      priority: 1,
      splittable: false,
    });
    if ("error" in result) {
      throw new Error(`Failed to create basic task: ${result.error}`);
    }
    return result.task;
  };

  await t.step("createTask: successfully creates a task with minimal details", async () => {
    console.log("\n--- Testing createTask: minimal details ---");
    const taskName = "Write Report";
    const result = await concept.createTask({
      owner: userAlice,
      taskName,
      category: "Work",
      duration: 120,
      priority: 1,
      splittable: true,
    });

    assertNotEquals("error" in result, true, `Expected no error, got: ${("error" in result) ? result.error : ""}`);
    const createdTask = (result as { task: any }).task;

    assertExists(createdTask._id, "Task ID should be generated");
    assertEquals(createdTask.owner, userAlice);
    assertEquals(createdTask.taskName, taskName);
    assertEquals(createdTask.category, "Work");
    assertEquals(createdTask.duration, 120);
    assertEquals(createdTask.priority, 1);
    assertEquals(createdTask.splittable, true);
    assertEquals(createdTask.timeBlockSet, [], "timeBlockSet should be initialized as empty");
    assertEquals(createdTask.postDependence, [], "postDependence should be initialized as empty");
    console.log(`Successfully created task: ${JSON.stringify(createdTask)}`);

    // Verify in DB
    const foundTask = await concept.tasks.findOne({ _id: createdTask._id });
    assertExists(foundTask, "Task should be found in DB");
    assertEquals(foundTask?.taskName, taskName);
    console.log("Verified task in database.");
  });

  await t.step("createTask: successfully creates a task with all optional details", async () => {
    console.log("\n--- Testing createTask: all optional details ---");
    const taskName = "Plan Vacation";
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const slack = 30; // 30 minutes
    const note = "Research destinations and book flights";

    const preTask1 = await createBasicTask(userAlice, "Book Flights");
    const preTask2 = await createBasicTask(userAlice, "Get Passport");

    const result = await concept.createTask({
      owner: userAlice,
      taskName,
      category: "Personal",
      duration: 180,
      priority: 2,
      splittable: false,
      deadline,
      slack,
      preDependence: [preTask1._id, preTask2._id],
      note,
    });

    assertNotEquals("error" in result, true, `Expected no error, got: ${("error" in result) ? result.error : ""}`);
    const createdTask = (result as { task: any }).task;

    assertExists(createdTask._id, "Task ID should be generated");
    assertEquals(createdTask.owner, userAlice);
    assertEquals(createdTask.taskName, taskName);
    assertEquals(createdTask.deadline?.toISOString(), deadline.toISOString()); // Compare ISO strings for dates
    assertEquals(createdTask.slack, slack);
    assertEquals(createdTask.preDependence?.sort(), [preTask1._id, preTask2._id].sort());
    assertEquals(createdTask.note, note);
    console.log(`Successfully created task with optional fields: ${JSON.stringify(createdTask)}`);

    // Verify postDependence on pre-tasks
    const updatedPreTask1 = await concept.tasks.findOne({ _id: preTask1._id });
    assertExists(updatedPreTask1, "Pre-task 1 should exist");
    assertExists(updatedPreTask1?.postDependence, "Pre-task 1 should have postDependence");
    assertEquals(updatedPreTask1?.postDependence?.includes(createdTask._id), true, `Pre-task 1 should have ${createdTask._id} in its postDependence`);

    const updatedPreTask2 = await concept.tasks.findOne({ _id: preTask2._id });
    assertExists(updatedPreTask2, "Pre-task 2 should exist");
    assertExists(updatedPreTask2?.postDependence, "Pre-task 2 should have postDependence");
    assertEquals(updatedPreTask2?.postDependence?.includes(createdTask._id), true, `Pre-task 2 should have ${createdTask._id} in its postDependence`);
    console.log("Verified postDependence updates on pre-dependent tasks.");
  });

  await t.step("getUserTasks: returns tasks for a specific owner", async () => {
    console.log("\n--- Testing getUserTasks ---");
    const taskA = await createBasicTask(userBob, "Review Code");
    const taskB = await createBasicTask(userBob, "Attend Meeting");

    const result = await concept.getUserTasks({ owner: userBob });

    assertNotEquals("error" in result, true, `Expected no error, got: ${("error" in result) ? result.error : ""}`);
    const tasks = (result as { taskTable: any[] }).taskTable;

    assertEquals(tasks.length, 2, "Should return 2 tasks for user Bob");
    const taskIds = tasks.map((t) => t._id).sort();
    assertEquals(taskIds, [taskA._id, taskB._id].sort());
    console.log(`Successfully retrieved tasks for ${userBob}: ${JSON.stringify(tasks)}`);
  });

  await t.step("getUserTasks: returns error if no tasks for owner", async () => {
    console.log("\n--- Testing getUserTasks: no tasks ---");
    const result = await concept.getUserTasks({ owner: userCharlie });

    assertEquals("error" in result, true, "Expected an error for owner with no tasks");
    assertEquals(result.error, `No tasks found for owner: ${userCharlie}`);
    console.log("Correctly returned error for owner with no tasks.");
  });

  let taskToSchedule: any;
  await t.step("assignSchedule: successfully assigns a time block", async () => {
    console.log("\n--- Testing assignSchedule ---");
    taskToSchedule = await createBasicTask(userAlice, "Do Laundry");
    const timeBlockId = "timeblock:monday_morning";

    const result = await concept.assignSchedule({
      owner: userAlice,
      taskId: taskToSchedule._id,
      timeBlockId,
    });

    assertNotEquals("error" in result, true, `Expected no error, got: ${("error" in result) ? result.error : ""}`);
    assertEquals(Object.keys(result).length, 0, "Expected empty object on success");
    console.log(`Successfully assigned time block '${timeBlockId}' to task ${taskToSchedule._id}`);

    // Verify in DB
    const updatedTask = await concept.tasks.findOne({ _id: taskToSchedule._id });
    assertExists(updatedTask, "Task should be found after schedule assignment");
    assertEquals(updatedTask?.timeBlockSet?.includes(timeBlockId), true, "timeBlockSet should contain the new time block");
    taskToSchedule = updatedTask; // Update local reference for subsequent tests
    console.log("Verified task's timeBlockSet in database.");
  });

  await t.step("assignSchedule: returns error if task not found or owner mismatch", async () => {
    console.log("\n--- Testing assignSchedule: task not found or owner mismatch ---");
    const timeBlockId = "timeblock:sunday_evening";
    const result = await concept.assignSchedule({
      owner: userBob, // Mismatch owner
      taskId: taskToSchedule._id,
      timeBlockId,
    });

    assertEquals("error" in result, true, "Expected an error for owner mismatch");
    assertEquals(result.error, `Task with ID ${taskToSchedule._id} not found or not owned by ${userBob}`);
    console.log("Correctly returned error for owner mismatch.");
  });

  await t.step("assignSchedule: returns error if time block already assigned", async () => {
    console.log("\n--- Testing assignSchedule: duplicate time block ---");
    const timeBlockId = "timeblock:monday_morning"; // Already assigned in previous test
    const result = await concept.assignSchedule({
      owner: userAlice,
      taskId: taskToSchedule._id,
      timeBlockId,
    });

    assertEquals("error" in result, true, "Expected an error for duplicate time block");
    assertEquals(result.error, `Time block ${timeBlockId} already assigned to task ${taskToSchedule._id}`);
    console.log("Correctly returned error for duplicate time block assignment.");
  });

  await t.step("deleteSchedule: successfully removes a time block", async () => {
    console.log("\n--- Testing deleteSchedule ---");
    const timeBlockId = "timeblock:monday_morning"; // Previously assigned

    const result = await concept.deleteSchedule({
      owner: userAlice,
      taskId: taskToSchedule._id,
      timeBlockId,
    });

    assertNotEquals("error" in result, true, `Expected no error, got: ${("error" in result) ? result.error : ""}`);
    assertEquals(Object.keys(result).length, 0, "Expected empty object on success");
    console.log(`Successfully deleted time block '${timeBlockId}' from task ${taskToSchedule._id}`);

    // Verify in DB
    const updatedTask = await concept.tasks.findOne({ _id: taskToSchedule._id });
    assertExists(updatedTask, "Task should be found after schedule deletion");
    assertEquals(updatedTask?.timeBlockSet?.includes(timeBlockId), false, "timeBlockSet should no longer contain the time block");
    console.log("Verified task's timeBlockSet in database.");
  });

  await t.step("deleteSchedule: returns error if task not found or owner mismatch", async () => {
    console.log("\n--- Testing deleteSchedule: task not found or owner mismatch ---");
    const timeBlockId = "timeblock:any";
    const result = await concept.deleteSchedule({
      owner: userBob, // Mismatch owner
      taskId: taskToSchedule._id,
      timeBlockId,
    });

    assertEquals("error" in result, true, "Expected an error for owner mismatch");
    assertEquals(result.error, `Task with ID ${taskToSchedule._id} not found or not owned by ${userBob}`);
    console.log("Correctly returned error for owner mismatch.");
  });

  await t.step("deleteSchedule: returns error if time block not found in task", async () => {
    console.log("\n--- Testing deleteSchedule: time block not found ---");
    const nonExistentTimeBlock = "timeblock:never_assigned";
    const result = await concept.deleteSchedule({
      owner: userAlice,
      taskId: taskToSchedule._id,
      timeBlockId: nonExistentTimeBlock,
    });

    assertEquals("error" in result, true, "Expected an error for non-existent time block");
    assertEquals(result.error, `Time block ${nonExistentTimeBlock} not found in task ${taskToSchedule._id}'s schedules`);
    console.log("Correctly returned error for non-existent time block.");
  });

  let taskToUpdate: any;
  await t.step("updateTaskName: successfully updates task name", async () => {
    console.log("\n--- Testing updateTaskName ---");
    taskToUpdate = await createBasicTask(userAlice, "Old Name");
    const newName = "New Task Name";

    const result = await concept.updateTaskName({
      owner: userAlice,
      taskId: taskToUpdate._id,
      taskName: newName,
    });

    assertNotEquals("error" in result, true, `Expected no error, got: ${("error" in result) ? result.error : ""}`);
    assertEquals(Object.keys(result).length, 0, "Expected empty object on success");
    console.log(`Successfully updated task ${taskToUpdate._id} name to '${newName}'`);

    const updatedTask = await concept.tasks.findOne({ _id: taskToUpdate._id });
    assertExists(updatedTask, "Task should be found after update");
    assertEquals(updatedTask?.taskName, newName);
    console.log("Verified task name update in database.");
  });

  await t.step("updateTaskCategory: successfully updates task category", async () => {
    console.log("\n--- Testing updateTaskCategory ---");
    const newCategory = "Urgent";
    const result = await concept.updateTaskCategory({
      owner: userAlice,
      taskId: taskToUpdate._id,
      category: newCategory,
    });
    assertNotEquals("error" in result, true, `Expected no error, got: ${("error" in result) ? result.error : ""}`);
    const updatedTask = await concept.tasks.findOne({ _id: taskToUpdate._id });
    assertExists(updatedTask, "Task should be found after update");
    assertEquals(updatedTask?.category, newCategory);
    console.log("Verified category update.");
  });

  await t.step("updateTaskDeadline: successfully updates task deadline", async () => {
    console.log("\n--- Testing updateTaskDeadline ---");
    const newDeadline = new Date(Date.now() + 86400000); // Tomorrow
    const result = await concept.updateTaskDeadline({
      owner: userAlice,
      taskId: taskToUpdate._id,
      deadline: newDeadline,
    });
    assertNotEquals("error" in result, true, `Expected no error, got: ${("error" in result) ? result.error : ""}`);
    const updatedTask = await concept.tasks.findOne({ _id: taskToUpdate._id });
    assertExists(updatedTask, "Task should be found after update");
    assertEquals(updatedTask?.deadline?.toISOString(), newDeadline.toISOString());
    console.log("Verified deadline update.");
  });

  await t.step("updateTask: returns error if task not found or owner mismatch", async () => {
    console.log("\n--- Testing updateTaskName: task not found or owner mismatch ---");
    const result = await concept.updateTaskName({
      owner: userBob, // Mismatch owner
      taskId: taskToUpdate._id,
      taskName: "Should not update",
    });

    assertEquals("error" in result, true, "Expected an error for owner mismatch");
    assertEquals(result.error, `Task with ID ${taskToUpdate._id} not found or not owned by ${userBob}`);
    console.log("Correctly returned error for owner mismatch during update.");
  });

  let taskWithPreDep: any;
  let preDependentTask: any;
  await t.step("addPreDependence: successfully adds a pre-dependence", async () => {
    console.log("\n--- Testing addPreDependence ---");
    taskWithPreDep = await createBasicTask(userAlice, "Task with Dependence");
    preDependentTask = await createBasicTask(userAlice, "Pre-dependent Task");

    const result = await concept.addPreDependence({
      owner: userAlice,
      taskId: taskWithPreDep._id,
      newPreDependence: preDependentTask._id,
    });

    assertNotEquals("error" in result, true, `Expected no error, got: ${("error" in result) ? result.error : ""}`);
    assertEquals(Object.keys(result).length, 0, "Expected empty object on success");
    console.log(`Successfully added ${preDependentTask._id} as pre-dependence to ${taskWithPreDep._id}`);

    // Verify taskWithPreDep's preDependence
    const updatedTask = await concept.tasks.findOne({ _id: taskWithPreDep._id });
    assertExists(updatedTask, `Task ${taskWithPreDep._id} should exist`);
    assertExists(updatedTask?.preDependence, `Task ${taskWithPreDep._id} should have preDependence`);
    assertEquals(updatedTask?.preDependence?.includes(preDependentTask._id), true, `Task ${taskWithPreDep._id} should have ${preDependentTask._id} in preDependence`);

    // Verify preDependentTask's postDependence
    const updatedPreDependentTask = await concept.tasks.findOne({ _id: preDependentTask._id });
    assertExists(updatedPreDependentTask, `Pre-dependent task ${preDependentTask._id} should exist`);
    assertExists(updatedPreDependentTask?.postDependence, `Pre-dependent task ${preDependentTask._id} should have postDependence`);
    assertEquals(updatedPreDependentTask?.postDependence?.includes(taskWithPreDep._id), true, `Pre-dependent task ${preDependentTask._id} should have ${taskWithPreDep._id} in postDependence`);
    console.log("Verified preDependence and postDependence updates in database.");
  });

  await t.step("addPreDependence: returns error if main task not found or owner mismatch", async () => {
    console.log("\n--- Testing addPreDependence: main task not found or owner mismatch ---");
    const result = await concept.addPreDependence({
      owner: userBob, // Mismatch owner
      taskId: taskWithPreDep._id,
      newPreDependence: preDependentTask._id,
    });

    assertEquals("error" in result, true, "Expected an error for owner mismatch");
    assertEquals(result.error, `Task with ID ${taskWithPreDep._id} not found or not owned by ${userBob}`);
    console.log("Correctly returned error for owner mismatch when adding pre-dependence.");
  });

  await t.step("addPreDependence: returns error if newPreDependence task does not exist", async () => {
    console.log("\n--- Testing addPreDependence: pre-dependence task does not exist ---");
    const nonExistentPreDep = "task:NonExistent" as ID;
    const result = await concept.addPreDependence({
      owner: userAlice,
      taskId: taskWithPreDep._id,
      newPreDependence: nonExistentPreDep,
    });

    assertEquals("error" in result, true, "Expected an error for non-existent pre-dependence task");
    assertEquals(result.error, `Pre-dependence task with ID ${nonExistentPreDep} does not exist`);
    console.log("Correctly returned error for non-existent pre-dependence task.");
  });

  await t.step("removePreDependence: successfully removes a pre-dependence", async () => {
    console.log("\n--- Testing removePreDependence ---");
    // Ensure the tasks and dependence are set up from previous test
    const result = await concept.removePreDependence({
      owner: userAlice,
      taskId: taskWithPreDep._id,
      oldPreDependence: preDependentTask._id,
    });

    assertNotEquals("error" in result, true, `Expected no error, got: ${("error" in result) ? result.error : ""}`);
    assertEquals(Object.keys(result).length, 0, "Expected empty object on success");
    console.log(`Successfully removed ${preDependentTask._id} from pre-dependence of ${taskWithPreDep._id}`);

    // Verify taskWithPreDep's preDependence
    const updatedTask = await concept.tasks.findOne({ _id: taskWithPreDep._id });
    assertExists(updatedTask, `Task ${taskWithPreDep._id} should exist`);
    assertEquals(updatedTask?.preDependence?.includes(preDependentTask._id), false, `Task ${taskWithPreDep._id} should NOT have ${preDependentTask._id} in preDependence`);

    // Verify preDependentTask's postDependence
    const updatedPreDependentTask = await concept.tasks.findOne({ _id: preDependentTask._id });
    assertExists(updatedPreDependentTask, `Pre-dependent task ${preDependentTask._id} should exist`);
    assertEquals(updatedPreDependentTask?.postDependence?.includes(taskWithPreDep._id), false, `Pre-dependent task ${preDependentTask._id} should NOT have ${taskWithPreDep._id} in postDependence`);
    console.log("Verified removal of preDependence and postDependence updates in database.");
  });

  await t.step("removePreDependence: returns error if main task not found or owner mismatch", async () => {
    console.log("\n--- Testing removePreDependence: main task not found or owner mismatch ---");
    const result = await concept.removePreDependence({
      owner: userBob, // Mismatch owner
      taskId: taskWithPreDep._id,
      oldPreDependence: preDependentTask._id,
    });

    assertEquals("error" in result, true, "Expected an error for owner mismatch");
    assertEquals(result.error, `Task with ID ${taskWithPreDep._id} not found or not owned by ${userBob}`);
    console.log("Correctly returned error for owner mismatch when removing pre-dependence.");
  });

  await t.step("removePreDependence: returns error if oldPreDependence not found in task", async () => {
    console.log("\n--- Testing removePreDependence: old pre-dependence not found ---");
    const nonExistentPreDep = "task:AnotherNonExistent" as ID;
    const result = await concept.removePreDependence({
      owner: userAlice,
      taskId: taskWithPreDep._id,
      oldPreDependence: nonExistentPreDep,
    });

    assertEquals("error" in result, true, "Expected an error for non-existent pre-dependence in task's list");
    assertEquals(result.error, `Pre-dependence task ${nonExistentPreDep} not found in task ${taskWithPreDep._id}'s preDependence`);
    console.log("Correctly returned error for non-existent pre-dependence in task's list.");
  });

  let taskToDelete: any;
  let dependentTask: any;
  await t.step("deleteTask: successfully deletes a task with no post-dependencies", async () => {
    console.log("\n--- Testing deleteTask: no dependencies ---");
    taskToDelete = await createBasicTask(userAlice, "Ephemeral Task");

    const result = await concept.deleteTask({ owner: userAlice, taskId: taskToDelete._id });

    assertNotEquals("error" in result, true, `Expected no error, got: ${("error" in result) ? result.error : ""}`);
    assertEquals(Object.keys(result).length, 0, "Expected empty object on success");
    console.log(`Successfully deleted task ${taskToDelete._id}`);

    // Verify in DB
    const deletedTask = await concept.tasks.findOne({ _id: taskToDelete._id });
    assertEquals(deletedTask, null, "Task should be deleted from database");
    console.log("Verified task removal from database.");
  });

  await t.step("deleteTask: returns error if task has post-dependencies", async () => {
    console.log("\n--- Testing deleteTask: with post-dependencies ---");
    const mainTask = await createBasicTask(userAlice, "Main Task");
    dependentTask = await createBasicTask(userAlice, "Dependent Task");

    // Establish dependence
    await concept.addPreDependence({
      owner: userAlice,
      taskId: dependentTask._id,
      newPreDependence: mainTask._id,
    });
    console.log(`Established ${mainTask._id} as pre-dependence for ${dependentTask._id}`);

    const result = await concept.deleteTask({ owner: userAlice, taskId: mainTask._id });

    assertEquals("error" in result, true, "Expected an error because task has post-dependencies");
    assertEquals(
      result.error,
      `Task ${mainTask._id} cannot be deleted because it has dependent tasks (${dependentTask._id})`,
    );
    console.log("Correctly returned error for deleting task with post-dependencies.");

    // Verify task still exists
    const existingTask = await concept.tasks.findOne({ _id: mainTask._id });
    assertExists(existingTask, "Task should still exist");
  });

  await t.step("deleteTask: returns error if task not found or owner mismatch", async () => {
    console.log("\n--- Testing deleteTask: task not found or owner mismatch ---");
    const nonExistentTask = "task:NonExistentDelete" as ID;
    const result = await concept.deleteTask({ owner: userAlice, taskId: nonExistentTask });

    assertEquals("error" in result, true, "Expected an error for non-existent task");
    assertEquals(result.error, `Task with ID ${nonExistentTask} not found or not owned by ${userAlice}`);
    console.log("Correctly returned error for non-existent task deletion.");

    const resultOwnerMismatch = await concept.deleteTask({ owner: userBob, taskId: dependentTask._id }); // Use dependentTask which still exists
    assertEquals("error" in resultOwnerMismatch, true, "Expected an error for owner mismatch");
    assertEquals(resultOwnerMismatch.error, `Task with ID ${dependentTask._id} not found or not owned by ${userBob}`);
    console.log("Correctly returned error for owner mismatch during deletion.");
  });

  await t.step("Principle Trace: Demonstrate full lifecycle of tasks as per principle", async () => {
    console.log("\n=== Principle Trace ===");
    const principleUser = "user:PrincipleTester" as ID;
    const task1Name = "Principle Task 1";
    const task2Name = "Principle Task 2";
    const timeBlockId1 = "timeblock:P1_M";
    const timeBlockId2 = "timeblock:P1_T";

    console.log(`1. Create '${task1Name}' for ${principleUser}`);
    const res1 = await concept.createTask({
      owner: principleUser,
      taskName: task1Name,
      category: "Principle",
      duration: 60,
      priority: 1,
      splittable: true,
    });
    assertNotEquals("error" in res1, true, `Failed to create task 1: ${("error" in res1) ? res1.error : ""}`);
    const task1 = (res1 as { task: any }).task;
    console.log(`   Task 1 created: ${task1._id}`);

    console.log(`2. Update category of '${task1Name}' to 'High Priority'`);
    const updateCatRes = await concept.updateTaskCategory({
      owner: principleUser,
      taskId: task1._id,
      category: "High Priority",
    });
    assertNotEquals("error" in updateCatRes, true, `Failed to update category: ${("error" in updateCatRes) ? updateCatRes.error : ""}`);
    const updatedTask1 = await concept.tasks.findOne({ _id: task1._id });
    assertEquals(updatedTask1?.category, "High Priority");
    console.log(`   Task 1 category updated to: ${updatedTask1?.category}`);

    console.log(`3. Assign schedule '${timeBlockId1}' to '${task1Name}'`);
    const assignRes1 = await concept.assignSchedule({
      owner: principleUser,
      taskId: task1._id,
      timeBlockId: timeBlockId1,
    });
    assertNotEquals("error" in assignRes1, true, `Failed to assign schedule 1: ${("error" in assignRes1) ? assignRes1.error : ""}`);
    const task1AfterSchedule1 = await concept.tasks.findOne({ _id: task1._id });
    assertEquals(task1AfterSchedule1?.timeBlockSet?.includes(timeBlockId1), true);
    console.log(`   Task 1 scheduled for ${timeBlockId1}`);

    console.log(`4. Assign another schedule '${timeBlockId2}' to '${task1Name}'`);
    const assignRes2 = await concept.assignSchedule({
      owner: principleUser,
      taskId: task1._id,
      timeBlockId: timeBlockId2,
    });
    assertNotEquals("error" in assignRes2, true, `Failed to assign schedule 2: ${("error" in assignRes2) ? assignRes2.error : ""}`);
    const task1AfterSchedule2 = await concept.tasks.findOne({ _id: task1._id });
    assertEquals(task1AfterSchedule2?.timeBlockSet?.includes(timeBlockId2), true);
    console.log(`   Task 1 scheduled for ${timeBlockId2}`);

    console.log(`5. Create '${task2Name}' for ${principleUser}`);
    const res2 = await concept.createTask({
      owner: principleUser,
      taskName: task2Name,
      category: "Principle",
      duration: 30,
      priority: 2,
      splittable: false,
    });
    assertNotEquals("error" in res2, true, `Failed to create task 2: ${("error" in res2) ? res2.error : ""}`);
    const task2 = (res2 as { task: any }).task;
    console.log(`   Task 2 created: ${task2._id}`);

    console.log(`6. Add Task 1 as pre-dependence for Task 2`);
    const addDepRes = await concept.addPreDependence({
      owner: principleUser,
      taskId: task2._id,
      newPreDependence: task1._id,
    });
    assertNotEquals("error" in addDepRes, true, `Failed to add dependence: ${("error" in addDepRes) ? addDepRes.error : ""}`);
    const task2AfterDep = await concept.tasks.findOne({ _id: task2._id });
    const task1AfterDep = await concept.tasks.findOne({ _id: task1._id });
    assertEquals(task2AfterDep?.preDependence?.includes(task1._id), true);
    assertEquals(task1AfterDep?.postDependence?.includes(task2._id), true);
    console.log(`   Task 2 now depends on Task 1.`);

    console.log(`7. Attempt to delete Task 1 (should fail due to Task 2's dependence)`);
    const deleteRes1Fail = await concept.deleteTask({ owner: principleUser, taskId: task1._id });
    assertEquals("error" in deleteRes1Fail, true, "Expected error on deleting task with post-dependence");
    assertEquals(deleteRes1Fail.error, `Task ${task1._id} cannot be deleted because it has dependent tasks (${task2._id})`);
    const task1StillExists = await concept.tasks.findOne({ _id: task1._id });
    assertExists(task1StillExists);
    console.log(`   Deletion of Task 1 failed as expected.`);

    console.log(`8. Remove Task 1 as pre-dependence from Task 2`);
    const removeDepRes = await concept.removePreDependence({
      owner: principleUser,
      taskId: task2._id,
      oldPreDependence: task1._id,
    });
    assertNotEquals("error" in removeDepRes, true, `Failed to remove dependence: ${("error" in removeDepRes) ? removeDepRes.error : ""}`);
    const task2AfterRemoveDep = await concept.tasks.findOne({ _id: task2._id });
    const task1AfterRemoveDep = await concept.tasks.findOne({ _id: task1._id });
    assertEquals(task2AfterRemoveDep?.preDependence?.includes(task1._id), false);
    assertEquals(task1AfterRemoveDep?.postDependence?.includes(task2._id), false);
    console.log(`   Dependence between Task 1 and Task 2 removed.`);

    console.log(`9. Delete schedule '${timeBlockId1}' from '${task1Name}'`);
    const deleteScheduleRes = await concept.deleteSchedule({
      owner: principleUser,
      taskId: task1._id,
      timeBlockId: timeBlockId1,
    });
    assertNotEquals("error" in deleteScheduleRes, true, `Failed to delete schedule: ${("error" in deleteScheduleRes) ? deleteScheduleRes.error : ""}`);
    const task1AfterDeleteSchedule = await concept.tasks.findOne({ _id: task1._id });
    assertEquals(task1AfterDeleteSchedule?.timeBlockSet?.includes(timeBlockId1), false);
    console.log(`   Schedule '${timeBlockId1}' removed from Task 1.`);

    console.log(`10. Delete Task 1 (should succeed now)`);
    const deleteRes1Success = await concept.deleteTask({ owner: principleUser, taskId: task1._id });
    assertNotEquals("error" in deleteRes1Success, true, `Failed to delete task 1: ${("error" in deleteRes1Success) ? deleteRes1Success.error : ""}`);
    const task1Deleted = await concept.tasks.findOne({ _id: task1._id });
    assertEquals(task1Deleted, null);
    console.log(`   Task 1 successfully deleted.`);

    console.log(`11. Delete Task 2`);
    const deleteRes2Success = await concept.deleteTask({ owner: principleUser, taskId: task2._id });
    assertNotEquals("error" in deleteRes2Success, true, `Failed to delete task 2: ${("error" in deleteRes2Success) ? deleteRes2Success.error : ""}`);
    const task2Deleted = await concept.tasks.findOne({ _id: task2._id });
    assertEquals(task2Deleted, null);
    console.log(`   Task 2 successfully deleted.`);

    console.log("=== Principle Trace Completed Successfully ===");
  });

  await client.close();
});
```
