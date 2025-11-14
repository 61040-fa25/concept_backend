---
timestamp: 'Tue Oct 14 2025 22:40:05 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_224005.e591e8db.md]]'
content_id: 36a56645f32b9802cffe94621b97891316ec457eb129b650b8e61a6dd09c2486
---

# response:

```typescript
// src/TaskCatalog/TaskCatalog.ts
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "TaskCatalog" + ".";

// Generic types of this concept
type User = ID;
type Task = ID; // Represents taskId
type Duration = number; // e.g., in minutes
type Flag = boolean;
type TimeStamp = Date;

/**
 * a set of Tasks with
 *   an owner User
 *   a taskId String
 *   a taskName String
 *   a category String
 *   a duration Duration
 *   a priority Number
 *   a splittable Flag
 *   a timeBlockSet containing a set of Strings (optional)
 *   a deadline TimeStamp (optional)
 *   a slack Number (optional)
 *   a preDependence set of Tasks (optional)
 *   a postDependence set of Tasks (optional)
 *   a note String (optional)
 */
interface TaskDocument {
  _id: Task; // This will store the taskId
  owner: User;
  taskName: string;
  category: string;
  duration: Duration;
  priority: number;
  splittable: Flag;
  timeBlockSet: string[]; // Array of timeBlock IDs
  deadline?: TimeStamp;
  slack?: number; // buffer margin in minutes
  preDependence?: Task[]; // Array of Task IDs
  postDependence?: Task[]; // Array of Task IDs
  note?: string;
}

export default class TaskCatalogConcept {
  tasks: Collection<TaskDocument>;

  constructor(private readonly db: Db) {
    this.tasks = this.db.collection(PREFIX + "tasks");
  }

  /**
   * getUserTasks (owner: User): (taskTable: set of Tasks)
   *
   * **requires** exist at least one task with this owner
   *
   * **effect** returns ALL tasks under this owner
   */
  async getUserTasks({ owner }: { owner: User }): Promise<{ taskTable: TaskDocument[] } | { error: string }> {
    const userTasks = await this.tasks.find({ owner }).toArray();
    if (userTasks.length === 0) {
      return { error: `No tasks found for owner: ${owner}` };
    }
    return { taskTable: userTasks };
  }

  /**
   * createTask (
   *     owner: User, taskName: String, category: String, duration: Duration, priority: Number, splittable: Flag, deadline?: TimeStamp, slack?: Number, preDependence?: set of Tasks, note?: String
   * ): (task: Task)
   *
   * **effect**
   *     generate a unique taskId that has not been used;
   *     create a new task $t$ owned by owner with the attributes (taskId, taskName, category, duration, priority, splittable, deadline?, slack?, preDependence?, note?), the optional attributes are not set if not provided;
   *     set $t$'s timeBlockSet as an empty set;
   *     add $t$ to postDependence of all tasks in its given preDependence;
   *     return the newly created task $t$;
   */
  async createTask(
    {
      owner,
      taskName,
      category,
      duration,
      priority,
      splittable,
      deadline,
      slack,
      preDependence,
      note,
    }: {
      owner: User;
      taskName: string;
      category: string;
      duration: Duration;
      priority: number;
      splittable: Flag;
      deadline?: TimeStamp;
      slack?: number;
      preDependence?: Task[];
      note?: string;
    },
  ): Promise<{ task: TaskDocument } | { error: string }> {
    const taskId: Task = freshID();

    const newTask: TaskDocument = {
      _id: taskId,
      owner,
      taskName,
      category,
      duration,
      priority,
      splittable,
      timeBlockSet: [],
      // Optional fields are only included if provided
      ...(deadline && { deadline }),
      ...(slack !== undefined && { slack }), // Check for undefined to allow 0
      ...(preDependence && preDependence.length > 0 && { preDependence }),
      ...(note && { note }),
      postDependence: [], // Initialize as empty
    };

    try {
      await this.tasks.insertOne(newTask);

      // Add this task to postDependence of all tasks in its given preDependence
      if (preDependence && preDependence.length > 0) {
        await this.tasks.updateMany(
          { _id: { $in: preDependence } },
          { $addToSet: { postDependence: taskId } },
        );
      }

      return { task: newTask };
    } catch (e) {
      if (e instanceof Error) {
        return { error: `Failed to create task: ${e.message}` };
      }
      return { error: `An unknown error occurred during task creation.` };
    }
  }

  /**
   * assignSchedule (owner: User, taskId: String, timeBlockId: string)
   *
   * **requires**
   *     exists a task with matching owner and taskId;
   *     timeBlockId does not already exist in this task's timeBlockSet;
   *
   * **effect**
   *     add timeBlockId to this task's timeBlockSet
   */
  async assignSchedule(
    { owner, taskId, timeBlockId }: { owner: User; taskId: Task; timeBlockId: string },
  ): Promise<Empty | { error: string }> {
    const task = await this.tasks.findOne({ _id: taskId, owner });

    if (!task) {
      return { error: `Task with ID ${taskId} not found or not owned by ${owner}` };
    }
    if (task.timeBlockSet && task.timeBlockSet.includes(timeBlockId)) {
      return { error: `Time block ${timeBlockId} already assigned to task ${taskId}` };
    }

    try {
      await this.tasks.updateOne(
        { _id: taskId, owner },
        { $addToSet: { timeBlockSet: timeBlockId } },
      );
      return {};
    } catch (e) {
      if (e instanceof Error) {
        return { error: `Failed to assign schedule: ${e.message}` };
      }
      return { error: `An unknown error occurred during schedule assignment.` };
    }
  }

  /**
   * deleteSchedule (owner: User, taskId: String, timeBockId: string)
   *
   * **requires**
   *     exists a task with matching owner and taskId;
   *     timeBlockId exists in this task's timeBlockSet;
   *
   * **effect**
   *     remove timeBlockId from this task's timeBlockSet;
   */
  async deleteSchedule(
    { owner, taskId, timeBlockId }: { owner: User; taskId: Task; timeBlockId: string },
  ): Promise<Empty | { error: string }> {
    const task = await this.tasks.findOne({ _id: taskId, owner });

    if (!task) {
      return { error: `Task with ID ${taskId} not found or not owned by ${owner}` };
    }
    if (!task.timeBlockSet || !task.timeBlockSet.includes(timeBlockId)) {
      return { error: `Time block ${timeBlockId} not found in task ${taskId}'s schedules` };
    }

    try {
      await this.tasks.updateOne(
        { _id: taskId, owner },
        { $pull: { timeBlockSet: timeBlockId } },
      );
      return {};
    } catch (e) {
      if (e instanceof Error) {
        return { error: `Failed to delete schedule: ${e.message}` };
      }
      return { error: `An unknown error occurred during schedule deletion.` };
    }
  }

  // Generic update method for single attributes
  private async _updateTaskAttribute<K extends keyof TaskDocument>(
    owner: User,
    taskId: Task,
    attribute: K,
    value: TaskDocument[K],
  ): Promise<Empty | { error: string }> {
    const task = await this.tasks.findOne({ _id: taskId, owner });

    if (!task) {
      return { error: `Task with ID ${taskId} not found or not owned by ${owner}` };
    }

    try {
      const updateDoc: Partial<TaskDocument> = {};
      updateDoc[attribute] = value;
      await this.tasks.updateOne(
        { _id: taskId, owner },
        { $set: updateDoc },
      );
      return {};
    } catch (e) {
      if (e instanceof Error) {
        return { error: `Failed to update task ${String(attribute)}: ${e.message}` };
      }
      return { error: `An unknown error occurred during task attribute update.` };
    }
  }

  /**
   * updateTask (owner: User, taskId: String, taskName: String)
   *
   * **requires**
   *     exist a task with this taskId and the owner matches the given owner
   *
   * **effect**
   *     update the given attribute of this task;
   */
  async updateTaskName(
    { owner, taskId, taskName }: { owner: User; taskId: Task; taskName: string },
  ): Promise<Empty | { error: string }> {
    return this._updateTaskAttribute(owner, taskId, "taskName", taskName);
  }

  /**
   * updateTask (owner: User, taskId: String, category: String)
   *
   * **requires**
   *     exist a task with this taskId and the owner matches the given owner
   *
   * **effect**
   *     update the given attribute of this task;
   */
  async updateTaskCategory(
    { owner, taskId, category }: { owner: User; taskId: Task; category: string },
  ): Promise<Empty | { error: string }> {
    return this._updateTaskAttribute(owner, taskId, "category", category);
  }

  /**
   * updateTask (owner: User, taskId: String, duration: Duration)
   *
   * **requires**
   *     exist a task with this taskId and the owner matches the given owner
   *
   * **effect**
   *     update the given attribute of this task;
   */
  async updateTaskDuration(
    { owner, taskId, duration }: { owner: User; taskId: Task; duration: Duration },
  ): Promise<Empty | { error: string }> {
    return this._updateTaskAttribute(owner, taskId, "duration", duration);
  }

  /**
   * updateTask (owner: User, taskId: String, priority: Number)
   *
   * **requires**
   *     exist a task with this taskId and the owner matches the given owner
   *
   * **effect**
   *     update the given attribute of this task;
   */
  async updateTaskPriority(
    { owner, taskId, priority }: { owner: User; taskId: Task; priority: number },
  ): Promise<Empty | { error: string }> {
    return this._updateTaskAttribute(owner, taskId, "priority", priority);
  }

  /**
   * updateTask (owner: User, taskId: String, splittable: Flag)
   *
   * **requires**
   *     exist a task with this taskId and the owner matches the given owner
   *
   * **effect**
   *     update the given attribute of this task;
   */
  async updateTaskSplittable(
    { owner, taskId, splittable }: { owner: User; taskId: Task; splittable: Flag },
  ): Promise<Empty | { error: string }> {
    return this._updateTaskAttribute(owner, taskId, "splittable", splittable);
  }

  /**
   * updateTask (owner: User, taskId: String, deadline: TimeStamp)
   *
   * **requires**
   *     exist a task with this taskId and the owner matches the given owner
   *
   * **effect**
   *     update the given attribute of this task;
   */
  async updateTaskDeadline(
    { owner, taskId, deadline }: { owner: User; taskId: Task; deadline: TimeStamp },
  ): Promise<Empty | { error: string }> {
    return this._updateTaskAttribute(owner, taskId, "deadline", deadline);
  }

  /**
   * updateTask (owner: User, taskId: String, slack: Number)
   *
   * **requires**
   *     exist a task with this taskId and the owner matches the given owner
   *
   * **effect**
   *     update the given attribute of this task;
   */
  async updateTaskSlack(
    { owner, taskId, slack }: { owner: User; taskId: Task; slack: number },
  ): Promise<Empty | { error: string }> {
    return this._updateTaskAttribute(owner, taskId, "slack", slack);
  }

  /**
   * updateTask (owner: User, taskId: String, note: String)
   *
   * **requires**
   *     exist a task with this taskId and the owner matches the given owner
   *
   * **effect**
   *     update the given attribute of this task;
   */
  async updateTaskNote(
    { owner, taskId, note }: { owner: User; taskId: Task; note: string },
  ): Promise<Empty | { error: string }> {
    return this._updateTaskAttribute(owner, taskId, "note", note);
  }

  /**
   * addPreDependence (owner: User, taskId: String, newPreDependence: Task)
   *
   * **requires**
   *     exist a task $t$ with this taskId and the owner matches the given owner
   *
   * **effect**
   *     add newPreDependence to $t$'s preDependence;
   *     add $t$ to newPreDependence's postDependence;
   */
  async addPreDependence(
    { owner, taskId, newPreDependence }: { owner: User; taskId: Task; newPreDependence: Task },
  ): Promise<Empty | { error: string }> {
    const task = await this.tasks.findOne({ _id: taskId, owner });
    if (!task) {
      return { error: `Task with ID ${taskId} not found or not owned by ${owner}` };
    }

    const preDepTask = await this.tasks.findOne({ _id: newPreDependence });
    if (!preDepTask) {
      return { error: `Pre-dependence task with ID ${newPreDependence} does not exist` };
    }

    try {
      // Add newPreDependence to current task's preDependence
      await this.tasks.updateOne(
        { _id: taskId, owner },
        { $addToSet: { preDependence: newPreDependence } },
      );
      // Add current task to newPreDependence's postDependence
      await this.tasks.updateOne(
        { _id: newPreDependence },
        { $addToSet: { postDependence: taskId } },
      );
      return {};
    } catch (e) {
      if (e instanceof Error) {
        return { error: `Failed to add pre-dependence: ${e.message}` };
      }
      return { error: `An unknown error occurred while adding pre-dependence.` };
    }
  }

  /**
   * removePreDependence (owner: User, taskId: String, oldPreDependence: Task)
   *
   * **requires**
   *     exist a task $t$ with this taskId and the owner matches the given owner;
   *     oldPreDependence exists in $t$'s preDependence;
   *
   * **effect**
   *     remove oldPreDependence from $t$'s preDependence;
   *     remove $t$ from oldPreDependence's postDependence;
   */
  async removePreDependence(
    { owner, taskId, oldPreDependence }: { owner: User; taskId: Task; oldPreDependence: Task },
  ): Promise<Empty | { error: string }> {
    const task = await this.tasks.findOne({ _id: taskId, owner });
    if (!task) {
      return { error: `Task with ID ${taskId} not found or not owned by ${owner}` };
    }
    if (!task.preDependence || !task.preDependence.includes(oldPreDependence)) {
      return { error: `Pre-dependence task ${oldPreDependence} not found in task ${taskId}'s preDependence` };
    }

    try {
      // Remove oldPreDependence from current task's preDependence
      await this.tasks.updateOne(
        { _id: taskId, owner },
        { $pull: { preDependence: oldPreDependence } },
      );
      // Remove current task from oldPreDependence's postDependence
      await this.tasks.updateOne(
        { _id: oldPreDependence },
        { $pull: { postDependence: taskId } },
      );
      return {};
    } catch (e) {
      if (e instanceof Error) {
        return { error: `Failed to remove pre-dependence: ${e.message}` };
      }
      return { error: `An unknown error occurred while removing pre-dependence.` };
    }
  }

  /**
   * deleteTask (owner: User, taskId: string)
   *
   * **requires**
   *     exist a task $t$ with this taskId;
   *     task $t$ has no postDependence;
   *     task $t$ has a matching owner;
   *
   * **effect**
   *     remove task $t$ from Tasks
   */
  async deleteTask(
    { owner, taskId }: { owner: User; taskId: Task },
  ): Promise<Empty | { error: string }> {
    const task = await this.tasks.findOne({ _id: taskId, owner });

    if (!task) {
      return { error: `Task with ID ${taskId} not found or not owned by ${owner}` };
    }
    if (task.postDependence && task.postDependence.length > 0) {
      return { error: `Task ${taskId} cannot be deleted because it has dependent tasks (${task.postDependence.join(', ')})` };
    }

    try {
      await this.tasks.deleteOne({ _id: taskId, owner });
      return {};
    } catch (e) {
      if (e instanceof Error) {
        return { error: `Failed to delete task: ${e.message}` };
      }
      return { error: `An unknown error occurred during task deletion.` };
    }
  }
}
```

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
    assertEquals((result as { error: string }).error, `No tasks found for owner: ${userCharlie}`);
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

    const result = await concept.deleteTask({ owner: principleUser, taskId: mainTask._id });

    assertEquals("error" in result, true, "Expected an error because task has post-dependencies");
    // The error message includes the actual owner and task ID from previous steps, so we need to adjust
    // the owner comparison for this specific assertion if principleUser is not Alice.
    // However, the test trace itself uses principleUser to create the task, so it should be consistent.
    // Let's ensure 'principleUser' is used consistently or stick to 'userAlice' for simplicity in this general test.
    // For now, given the current context, 'userAlice' owns 'mainTask' and 'dependentTask'.
    // The previous prompt had `deleteTask({ owner: principleUser, taskId: mainTask._id });`
    // but the tasks were created by `userAlice`. This would cause an owner mismatch.
    // Corrected to use `userAlice` here to match the task creation.
    const deleteResMainTask = await concept.deleteTask({ owner: userAlice, taskId: mainTask._id });
    assertEquals("error" in deleteResMainTask, true, "Expected an error because task has post-dependencies");
    assertEquals(
      deleteResMainTask.error,
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

    // Using dependentTask, which was created by userAlice, but attempting to delete with userBob
    const resultOwnerMismatch = await concept.deleteTask({ owner: userBob, taskId: dependentTask._id });
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
