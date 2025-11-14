---
timestamp: 'Tue Oct 14 2025 23:11:52 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_231152.29342158.md]]'
content_id: 91293ddf0f5a8e00b30fa69ab03190dcc74c93ae24b507fbcb86cb9960a9c705
---

# file: src/TaskCatalog/TaskCatalog.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import TaskCatalogConcept from "./TaskCatalog.ts";

Deno.test("TaskCatalog Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const concept = new TaskCatalogConcept(db);

  // Define users at the top level for accessibility across all steps
  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const userCharlie = "user:Charlie" as ID;
  const principleUser = "user:PrincipleTester" as ID;

  // Helper function to create a basic task for testing, using concept actions only.
  // It returns the created task document or throws an error if creation fails.
  const createTestTask = async (
    owner: ID,
    taskName: string,
    category: string = "General",
    duration: number = 60,
    priority: number = 1,
    splittable: boolean = false,
    deadline?: Date,
    slack?: number,
    preDependence?: ID[],
    note?: string,
  ) => {
    const args = { owner, taskName, category, duration, priority, splittable, deadline, slack, preDependence, note };
    console.log(`  Calling createTask with: ${JSON.stringify(args)}`);
    const result = await concept.createTask(args);
    assertNotEquals("error" in result, true, `Expected no error, but got: ${("error" in result) ? result.error : ""}`);
    console.log(`  createTask result: ${JSON.stringify((result as { task: any }).task)}`);
    return (result as { task: any }).task;
  };

  await t.step("Initial State: getUserTasks for a new user should return an error", async () => {
    console.log("\n--- Initial State Check: getUserTasks for a new user ---");
    const result = await concept.getUserTasks({ owner: userCharlie });
    assertEquals("error" in result, true, "Expected an error for owner with no tasks");
    assertEquals((result as { error: string }).error, `No tasks found for owner: ${userCharlie}`, "Error message should indicate no tasks found");
    console.log(`  getUserTasks for ${userCharlie} returned: ${JSON.stringify(result)}`);
  });

  await t.step("Scenario 1: Operational Principle - Basic Task Lifecycle", async () => {
    console.log("\n--- Scenario 1: Operational Principle - Basic Task Lifecycle ---");
    console.log("This scenario demonstrates the common expected usage: create, update, schedule, and delete.");

    // 1. Create a task
    const taskName1 = "Operational Principle Task";
    const task1 = await createTestTask(principleUser, taskName1, "Principle Category", 90, 1, true);
    assertExists(task1._id, "Task ID must be generated");
    assertEquals(task1.taskName, taskName1, "Task name should match");
    console.log(`1. Created task: ${JSON.stringify(task1)}`);

    // 2. Update an attribute (e.g., category)
    const newCategory = "Updated Category";
    console.log(`2. Updating task category for ${task1._id} to '${newCategory}'`);
    const updateCatResult = await concept.updateTaskCategory({ owner: principleUser, taskId: task1._id, category: newCategory });
    assertNotEquals("error" in updateCatResult, true, `Expected no error on category update, got: ${("error" in updateCatResult) ? updateCatResult.error : ""}`);
    const updatedTask1_cat = await concept.tasks.findOne({ _id: task1._id });
    assertEquals(updatedTask1_cat?.category, newCategory, "Task category should be updated");
    console.log(`   Task ${task1._id} category updated. Current task: ${JSON.stringify(updatedTask1_cat)}`);

    // 3. Assign a schedule
    const timeBlockId1 = "timeblock:MondayMorning";
    console.log(`3. Assigning schedule '${timeBlockId1}' to task ${task1._id}`);
    const assignScheduleResult = await concept.assignSchedule({ owner: principleUser, taskId: task1._id, timeBlockId: timeBlockId1 });
    assertNotEquals("error" in assignScheduleResult, true, `Expected no error on schedule assignment, got: ${("error" in assignScheduleResult) ? assignScheduleResult.error : ""}`);
    const updatedTask1_schedule = await concept.tasks.findOne({ _id: task1._id });
    assertArrayIncludes(updatedTask1_schedule?.timeBlockSet || [], [timeBlockId1], "Task should have the assigned time block");
    console.log(`   Task ${task1._id} scheduled. Current task: ${JSON.stringify(updatedTask1_schedule)}`);

    // 4. Get user tasks to confirm
    console.log(`4. Retrieving all tasks for ${principleUser}`);
    const getUserTasksResult = await concept.getUserTasks({ owner: principleUser });
    assertNotEquals("error" in getUserTasksResult, true, `Expected no error getting user tasks, got: ${("error" in getUserTasksResult) ? getUserTasksResult.error : ""}`);
    const tasks = (getUserTasksResult as { taskTable: any[] }).taskTable;
    assertEquals(tasks.length, 1, "Should retrieve exactly one task for the user");
    assertEquals(tasks[0]._id, task1._id, "Retrieved task ID should match");
    console.log(`   Retrieved tasks: ${JSON.stringify(tasks)}`);

    // 5. Delete the task
    console.log(`5. Deleting task ${task1._id}`);
    const deleteTaskResult = await concept.deleteTask({ owner: principleUser, taskId: task1._id });
    assertNotEquals("error" in deleteTaskResult, true, `Expected no error on task deletion, got: ${("error" in deleteTaskResult) ? deleteTaskResult.error : ""}`);
    const deletedTask = await concept.tasks.findOne({ _id: task1._id });
    assertEquals(deletedTask, null, "Task should be completely deleted from DB");
    console.log(`   Task ${task1._id} deleted.`);
  });

  await t.step("Scenario 2: Complex Dependency Chain Management", async () => {
    console.log("\n--- Scenario 2: Complex Dependency Chain Management ---");
    console.log("Tests creating a chain of dependencies, attempting to delete a parent, then removing dependencies and deleting successfully.");

    // 1. Create three tasks: Task A, Task B, Task C
    const taskA = await createTestTask(userAlice, "Task A", "Project", 120);
    const taskB = await createTestTask(userAlice, "Task B", "Project", 90);
    const taskC = await createTestTask(userAlice, "Task C", "Project", 60);
    console.log(`1. Created tasks: A=${taskA._id}, B=${taskB._id}, C=${taskC._id}`);

    // 2. Establish dependencies: A -> B, B -> C
    console.log(`2. Adding dependence: Task B depends on Task A`);
    await concept.addPreDependence({ owner: userAlice, taskId: taskB._id, newPreDependence: taskA._id });
    const taskA_after_dep_B = await concept.tasks.findOne({ _id: taskA._id });
    assertArrayIncludes(taskA_after_dep_B?.postDependence || [], [taskB._id], "Task A should have Task B in postDependence");
    console.log(`   Verified Task A's postDependence includes Task B.`);

    console.log(`3. Adding dependence: Task C depends on Task B`);
    await concept.addPreDependence({ owner: userAlice, taskId: taskC._id, newPreDependence: taskB._id });
    const taskB_after_dep_C = await concept.tasks.findOne({ _id: taskB._id });
    assertArrayIncludes(taskB_after_dep_C?.postDependence || [], [taskC._id], "Task B should have Task C in postDependence");
    console.log(`   Verified Task B's postDependence includes Task C.`);

    // 4. Attempt to delete Task A (should fail as B depends on it)
    console.log(`4. Attempting to delete Task A (${taskA._id}) (expected to fail)`);
    const deleteAResult = await concept.deleteTask({ owner: userAlice, taskId: taskA._id });
    assertEquals("error" in deleteAResult, true, "Expected an error when deleting Task A due to dependency");
    assertEquals((deleteAResult as { error: string }).error, `Task ${taskA._id} cannot be deleted because it has dependent tasks (${taskB._id})`, "Error message should specify dependency");
    assertExists(await concept.tasks.findOne({ _id: taskA._id }), "Task A should still exist");
    console.log(`   Deletion of Task A failed as expected.`);

    // 5. Remove dependency: B -> C
    console.log(`5. Removing dependence: Task C from Task B's preDependence`);
    await concept.removePreDependence({ owner: userAlice, taskId: taskC._id, oldPreDependence: taskB._id });
    const taskB_after_remove_dep_C = await concept.tasks.findOne({ _id: taskB._id });
    assertNotEquals(taskB_after_remove_dep_C?.postDependence?.includes(taskC._id), true, "Task B should not have Task C in postDependence");
    console.log(`   Verified Task B's postDependence no longer includes Task C.`);

    // 6. Delete Task C (should succeed now)
    console.log(`6. Deleting Task C (${taskC._id}) (expected to succeed)`);
    const deleteCResult = await concept.deleteTask({ owner: userAlice, taskId: taskC._id });
    assertNotEquals("error" in deleteCResult, true, `Expected no error, got: ${("error" in deleteCResult) ? deleteCResult.error : ""}`);
    assertEquals(await concept.tasks.findOne({ _id: taskC._id }), null, "Task C should be deleted");
    console.log(`   Task C deleted successfully.`);

    // 7. Remove dependency: A -> B
    console.log(`7. Removing dependence: Task B from Task A's preDependence`);
    await concept.removePreDependence({ owner: userAlice, taskId: taskB._id, oldPreDependence: taskA._id });
    const taskA_after_remove_dep_B = await concept.tasks.findOne({ _id: taskA._id });
    assertNotEquals(taskA_after_remove_dep_B?.postDependence?.includes(taskB._id), true, "Task A should not have Task B in postDependence");
    console.log(`   Verified Task A's postDependence no longer includes Task B.`);

    // 8. Delete Task B (should succeed now)
    console.log(`8. Deleting Task B (${taskB._id}) (expected to succeed)`);
    const deleteBResult = await concept.deleteTask({ owner: userAlice, taskId: taskB._id });
    assertNotEquals("error" in deleteBResult, true, `Expected no error, got: ${("error" in deleteBResult) ? deleteBResult.error : ""}`);
    assertEquals(await concept.tasks.findOne({ _id: taskB._id }), null, "Task B should be deleted");
    console.log(`   Task B deleted successfully.`);

    // 9. Delete Task A (should succeed now)
    console.log(`9. Deleting Task A (${taskA._id}) (expected to succeed)`);
    const deleteASuccessResult = await concept.deleteTask({ owner: userAlice, taskId: taskA._id });
    assertNotEquals("error" in deleteASuccessResult, true, `Expected no error, got: ${("error" in deleteASuccessResult) ? deleteASuccessResult.error : ""}`);
    assertEquals(await concept.tasks.findOne({ _id: taskA._id }), null, "Task A should be deleted");
    console.log(`   Task A deleted successfully.`);
  });

  await t.step("Scenario 3: Task Scheduling and Attribute Modification Lifecycle", async () => {
    console.log("\n--- Scenario 3: Task Scheduling and Attribute Modification Lifecycle ---");
    console.log("Tests creation, multiple schedules, various attribute updates, and deletion of schedules.");

    // 1. Create a task with initial optional attributes
    const initialNote = "Initial note for multi-scenario task";
    const taskX = await createTestTask(userBob, "Multi-Scenario Task", "Flex", 180, 2, true, new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), 15, undefined, initialNote);
    assertExists(taskX._id);
    assertEquals(taskX.duration, 180);
    assertEquals(taskX.note, initialNote);
    assertNotEquals(taskX.deadline, undefined);
    console.log(`1. Created task X: ${JSON.stringify(taskX)}`);

    // 2. Assign multiple schedules
    const timeBlockX1 = "timeblock:TuesdayMorning";
    const timeBlockX2 = "timeblock:WednesdayAfternoon";
    console.log(`2. Assigning schedule ${timeBlockX1} to task X`);
    await concept.assignSchedule({ owner: userBob, taskId: taskX._id, timeBlockId: timeBlockX1 });
    console.log(`3. Assigning schedule ${timeBlockX2} to task X`);
    await concept.assignSchedule({ owner: userBob, taskId: taskX._id, timeBlockId: timeBlockX2 });
    const taskX_after_schedules = await concept.tasks.findOne({ _id: taskX._id });
    assertArrayIncludes(taskX_after_schedules?.timeBlockSet || [], [timeBlockX1, timeBlockX2], "Task X should have both schedules");
    assertEquals(taskX_after_schedules?.timeBlockSet?.length, 2, "Task X should have exactly two schedules");
    console.log(`   Task X now has schedules: ${JSON.stringify(taskX_after_schedules?.timeBlockSet)}`);

    // 3. Update various attributes
    const newDuration = 240;
    const newPriority = 3;
    const newSplittable = false;
    const newSlack = 20;
    const newNote = "Updated detailed note";
    const newDeadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    console.log(`4. Updating duration for task X to ${newDuration}`);
    await concept.updateTaskDuration({ owner: userBob, taskId: taskX._id, duration: newDuration });
    console.log(`5. Updating priority for task X to ${newPriority}`);
    await concept.updateTaskPriority({ owner: userBob, taskId: taskX._id, priority: newPriority });
    console.log(`6. Updating splittable for task X to ${newSplittable}`);
    await concept.updateTaskSplittable({ owner: userBob, taskId: taskX._id, splittable: newSplittable });
    console.log(`7. Updating slack for task X to ${newSlack}`);
    await concept.updateTaskSlack({ owner: userBob, taskId: taskX._id, slack: newSlack });
    console.log(`8. Updating note for task X to '${newNote}'`);
    await concept.updateTaskNote({ owner: userBob, taskId: taskX._id, note: newNote });
    console.log(`9. Updating deadline for task X to ${newDeadline.toISOString()}`);
    await concept.updateTaskDeadline({ owner: userBob, taskId: taskX._id, deadline: newDeadline });

    const taskX_after_updates = await concept.tasks.findOne({ _id: taskX._id });
    assertEquals(taskX_after_updates?.duration, newDuration, "Duration should be updated");
    assertEquals(taskX_after_updates?.priority, newPriority, "Priority should be updated");
    assertEquals(taskX_after_updates?.splittable, newSplittable, "Splittable should be updated");
    assertEquals(taskX_after_updates?.slack, newSlack, "Slack should be updated");
    assertEquals(taskX_after_updates?.note, newNote, "Note should be updated");
    assertEquals(taskX_after_updates?.deadline?.toISOString(), newDeadline.toISOString(), "Deadline should be updated");
    console.log(`   Task X after all updates: ${JSON.stringify(taskX_after_updates)}`);

    // 4. Delete one schedule
    console.log(`10. Deleting schedule '${timeBlockX1}' from task X`);
    await concept.deleteSchedule({ owner: userBob, taskId: taskX._id, timeBlockId: timeBlockX1 });
    const taskX_after_delete_schedule = await concept.tasks.findOne({ _id: taskX._id });
    assertNotEquals(taskX_after_delete_schedule?.timeBlockSet?.includes(timeBlockX1), true, "Task X should not contain deleted schedule");
    assertArrayIncludes(taskX_after_delete_schedule?.timeBlockSet || [], [timeBlockX2], "Task X should still contain the other schedule");
    assertEquals(taskX_after_delete_schedule?.timeBlockSet?.length, 1, "Task X should have exactly one schedule left");
    console.log(`   Task X schedules after deletion: ${JSON.stringify(taskX_after_delete_schedule?.timeBlockSet)}`);

    // 5. Clean up by deleting the remaining schedule and the task
    console.log(`11. Deleting remaining schedule '${timeBlockX2}' from task X`);
    await concept.deleteSchedule({ owner: userBob, taskId: taskX._id, timeBlockId: timeBlockX2 });
    const taskX_cleaned_schedules = await concept.tasks.findOne({ _id: taskX._id });
    assertEquals(taskX_cleaned_schedules?.timeBlockSet?.length, 0, "Task X should have no schedules left");
    console.log(`12. Deleting task X (${taskX._id})`);
    await concept.deleteTask({ owner: userBob, taskId: taskX._id });
    assertEquals(await concept.tasks.findOne({ _id: taskX._id }), null, "Task X should be deleted");
    console.log(`   Task X deleted.`);
  });

  await t.step("Scenario 4: User Isolation and Error Handling", async () => {
    console.log("\n--- Scenario 4: User Isolation and Error Handling ---");
    console.log("Tests that users cannot interact with other users' tasks and confirms specific error messages for invalid operations.");

    // 1. Alice creates a task
    const aliceTask = await createTestTask(userAlice, "Alice's Private Task", "Personal");
    console.log(`1. Alice created task: ${aliceTask._id}`);

    // 2. Bob attempts to update Alice's task (should fail)
    const newNameAttempt = "Bob's attempt to rename";
    console.log(`2. Bob (${userBob}) attempting to update Alice's task ${aliceTask._id} (expected to fail)`);
    const bobUpdateResult = await concept.updateTaskName({ owner: userBob, taskId: aliceTask._id, taskName: newNameAttempt });
    assertEquals("error" in bobUpdateResult, true, "Expected an error when Bob tries to update Alice's task");
    assertEquals((bobUpdateResult as { error: string }).error, `Task with ID ${aliceTask._id} not found or not owned by ${userBob}`, "Error message should confirm owner mismatch");
    const aliceTaskAfterBobAttempt = await concept.tasks.findOne({ _id: aliceTask._id });
    assertEquals(aliceTaskAfterBobAttempt?.taskName, aliceTask.taskName, "Alice's task name should remain unchanged");
    console.log(`   Bob's update attempt failed as expected. Alice's task name is still: '${aliceTaskAfterBobAttempt?.taskName}'`);

    // 3. Bob attempts to assign a schedule to Alice's task (should fail)
    const bobTimeBlock = "timeblock:BobSchedule";
    console.log(`3. Bob (${userBob}) attempting to assign schedule to Alice's task ${aliceTask._id} (expected to fail)`);
    const bobAssignScheduleResult = await concept.assignSchedule({ owner: userBob, taskId: aliceTask._id, timeBlockId: bobTimeBlock });
    assertEquals("error" in bobAssignScheduleResult, true, "Expected an error when Bob tries to schedule Alice's task");
    assertEquals((bobAssignScheduleResult as { error: string }).error, `Task with ID ${aliceTask._id} not found or not owned by ${userBob}`, "Error message should confirm owner mismatch");
    console.log(`   Bob's schedule assignment failed as expected.`);

    // 4. Alice assigns a schedule to her task
    const aliceTimeBlock = "timeblock:AliceSchedule";
    console.log(`4. Alice (${userAlice}) assigning schedule ${aliceTimeBlock} to her task ${aliceTask._id}`);
    const aliceAssignScheduleResult = await concept.assignSchedule({ owner: userAlice, taskId: aliceTask._id, timeBlockId: aliceTimeBlock });
    assertNotEquals("error" in aliceAssignScheduleResult, true, `Expected no error, got: ${("error" in aliceAssignScheduleResult) ? aliceAssignScheduleResult.error : ""}`);
    const aliceTaskWithSchedule = await concept.tasks.findOne({ _id: aliceTask._id });
    assertArrayIncludes(aliceTaskWithSchedule?.timeBlockSet || [], [aliceTimeBlock], "Alice's task should have the assigned schedule");
    console.log(`   Alice's task successfully scheduled.`);

    // 5. Bob attempts to delete Alice's schedule (should fail)
    console.log(`5. Bob (${userBob}) attempting to delete schedule from Alice's task ${aliceTask._id} (expected to fail)`);
    const bobDeleteScheduleResult = await concept.deleteSchedule({ owner: userBob, taskId: aliceTask._id, timeBlockId: aliceTimeBlock });
    assertEquals("error" in bobDeleteScheduleResult, true, "Expected an error when Bob tries to delete Alice's schedule");
    assertEquals((bobDeleteScheduleResult as { error: string }).error, `Task with ID ${aliceTask._id} not found or not owned by ${userBob}`, "Error message should confirm owner mismatch");
    console.log(`   Bob's schedule deletion failed as expected.`);

    // 6. Alice deletes her task
    console.log(`6. Alice (${userAlice}) deleting her task ${aliceTask._id}`);
    const aliceDeleteResult = await concept.deleteTask({ owner: userAlice, taskId: aliceTask._id });
    assertNotEquals("error" in aliceDeleteResult, true, `Expected no error, got: ${("error" in aliceDeleteResult) ? aliceDeleteResult.error : ""}`);
    assertEquals(await concept.tasks.findOne({ _id: aliceTask._id }), null, "Alice's task should be deleted");
    console.log(`   Alice's task successfully deleted.`);
  });

  await t.step("Scenario 5: Repetition and Invalid Arguments", async () => {
    console.log("\n--- Scenario 5: Repetition and Invalid Arguments ---");
    console.log("Tests repeating actions, providing invalid references, and general robustness.");

    // 1. Create a task
    const taskZ = await createTestTask(userCharlie, "Repetition Task", "Experiment");
    console.log(`1. Created task Z: ${taskZ._id}`);

    // 2. Attempt to add preDependence to a non-existent task (should fail)
    const nonExistentTask = "task:NonExistentDep" as ID;
    console.log(`2. Attempting to add non-existent task ${nonExistentTask} as pre-dependence to task Z ${taskZ._id} (expected to fail)`);
    const addNonExistentDepResult = await concept.addPreDependence({ owner: userCharlie, taskId: taskZ._id, newPreDependence: nonExistentTask });
    assertEquals("error" in addNonExistentDepResult, true, "Expected error for non-existent pre-dependence");
    assertEquals((addNonExistentDepResult as { error: string }).error, `Pre-dependence task with ID ${nonExistentTask} does not exist`, "Error message should specify non-existent dependency");
    console.log(`   Adding non-existent pre-dependence failed as expected.`);

    // 3. Attempt to remove preDependence that doesn't exist in the task's list (should fail)
    const existentTaskForDep = await createTestTask(userCharlie, "Existent Task for Dep");
    console.log(`3. Attempting to remove non-existent pre-dependence ${existentTaskForDep._id} from task Z ${taskZ._id} (expected to fail)`);
    const removeNonExistentDepResult = await concept.removePreDependence({ owner: userCharlie, taskId: taskZ._id, oldPreDependence: existentTaskForDep._id });
    assertEquals("error" in removeNonExistentDepResult, true, "Expected error for removing non-existent pre-dependence from list");
    assertEquals((removeNonExistentDepResult as { error: string }).error, `Pre-dependence task ${existentTaskForDep._id} not found in task ${taskZ._id}'s preDependence`, "Error message should specify pre-dependence not found in list");
    await concept.deleteTask({owner: userCharlie, taskId: existentTaskForDep._id}); // Clean up helper task
    console.log(`   Removing non-existent pre-dependence from list failed as expected.`);

    // 4. Assign the same timeBlockId twice (second attempt should fail)
    const repeatedTimeBlock = "timeblock:Repeated";
    console.log(`4. Assigning schedule ${repeatedTimeBlock} to task Z ${taskZ._id} (first time, expected to succeed)`);
    await concept.assignSchedule({ owner: userCharlie, taskId: taskZ._id, timeBlockId: repeatedTimeBlock });
    const taskZ_with_schedule = await concept.tasks.findOne({ _id: taskZ._id });
    assertArrayIncludes(taskZ_with_schedule?.timeBlockSet || [], [repeatedTimeBlock], "Task Z should have the schedule");
    console.log(`   First assignment successful.`);

    console.log(`5. Assigning schedule ${repeatedTimeBlock} to task Z ${taskZ._id} again (second time, expected to fail)`);
    const repeatAssignResult = await concept.assignSchedule({ owner: userCharlie, taskId: taskZ._id, timeBlockId: repeatedTimeBlock });
    assertEquals("error" in repeatAssignResult, true, "Expected error for assigning duplicate time block");
    assertEquals((repeatAssignResult as { error: string }).error, `Time block ${repeatedTimeBlock} already assigned to task ${taskZ._id}`, "Error message should confirm duplicate schedule");
    console.log(`   Second assignment failed as expected.`);

    // 5. Delete the task
    console.log(`6. Deleting task Z (${taskZ._id})`);
    await concept.deleteTask({ owner: userCharlie, taskId: taskZ._id });
    assertEquals(await concept.tasks.findOne({ _id: taskZ._id }), null, "Task Z should be deleted");
    console.log(`   Task Z deleted.`);
  });

  // Ensure client is closed after all tests
  await client.close();
});
```
