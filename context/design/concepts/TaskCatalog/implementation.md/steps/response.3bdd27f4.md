---
timestamp: 'Tue Oct 14 2025 22:20:20 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_222020.a97f4905.md]]'
content_id: 3bdd27f451ce0993622d729793c3291fd4f3609d0ab6dd3bd124e5c0c3e5f2ff
---

# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "TaskCatalog" + ".";

// Generic types of this concept
type User = ID;
type TaskId = ID; // Using TaskId for clarity, mapping to Task as per original spec.
type Duration = number; // Assuming duration in minutes or some other unit
type Flag = boolean;
type TimeStamp = Date;
type Priority = number; // Assuming priority is a number

// NOTE ON SLACK: The specification has a contradiction:
// State defines "a slack Number (optional) // buffer margin in minutes"
// Action `createTask` defines "slack?: String"
// Action `updateTask` defines "slack: String"
// I will follow the explicit action signatures and use `string` for slack, but note that `string` for a "buffer margin in minutes" is unusual and might imply a parseable string (e.g., "30min").
type Slack = string;

/**
 * a set of Tasks with
 *   an owner User
 *   a taskId String (this maps to _id for uniqueness)
 *   a taskName String
 *   a category String
 *   a duration Duration
 *   a priority Number
 *   a splittable Flag
 *   a timeBlockSet containing a set of Strings (optional) // these strings are unique ids for timeBlocks
 *   a deadline TimeStamp (optional)
 *   a slack String (optional) // buffer margin in minutes for acceptable deviation, stored as string
 *   a preDependence set of Tasks (optional) // tasks that it depends on (array of TaskIds)
 *   a postDependence set of Tasks (optional) // tasks that depend on it (array of TaskIds)
 *   a note String (optional)
 */
export interface TaskDoc {
  _id: TaskId; // The unique identifier for the task, also referred to as taskId in actions
  owner: User;
  taskName: string;
  category: string;
  duration: Duration;
  priority: Priority;
  splittable: Flag;
  timeBlockSet: string[]; // Array of unique IDs for time blocks
  deadline?: TimeStamp;
  slack?: Slack; // String type as per action signatures
  preDependence?: TaskId[]; // Array of Task IDs
  postDependence?: TaskId[]; // Array of Task IDs
  note?: string;
}

export default class TaskCatalogConcept {
  tasks: Collection<TaskDoc>;

  constructor(private readonly db: Db) {
    this.tasks = this.db.collection(PREFIX + "tasks");
  }

  /**
   * getUserTasks (owner: User): (taskTable: set of Tasks)
   *
   * **requires** exist at least one task with this owner
   *
   * **effects** returns ALL tasks under this owner
   */
  async getUserTasks(
    { owner }: { owner: User },
  ): Promise<{ taskTable: TaskDoc[] } | { error: string }> {
    const tasks = await this.tasks.find({ owner }).toArray();
    if (tasks.length === 0) {
      return { error: `No tasks found for owner: ${owner}` };
    }
    return { taskTable: tasks };
  }

  /**
   * createTask (
   *     owner: User, taskName: String, category: String, duration: Duration, priority: Number, splittable: Flag, deadline?: TimeStamp, slack?: String, preDependence?: set of Tasks, note?: String
   * ): (task: Task)
   *
   * **effects**
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
      priority: Priority;
      splittable: Flag;
      deadline?: TimeStamp;
      slack?: Slack;
      preDependence?: TaskId[];
      note?: string;
    },
  ): Promise<{ task: TaskDoc } | { error: string }> {
    const newTaskId = freshID();

    const newTask: TaskDoc = {
      _id: newTaskId,
      owner,
      taskName,
      category,
      duration,
      priority,
      splittable,
      timeBlockSet: [], // Initialize as an empty set
      ...(deadline && { deadline }),
      ...(slack && { slack }),
      ...(preDependence && { preDependence }),
      postDependence: [], // Initialize as empty
      ...(note && { note }),
    };

    const session = this.db.client.startSession();
    try {
      await session.withTransaction(async () => {
        // Insert the new task
        await this.tasks.insertOne(newTask, { session });

        // Update postDependence of tasks in preDependence
        if (preDependence && preDependence.length > 0) {
          const updateResult = await this.tasks.updateMany(
            { _id: { $in: preDependence } },
            { $addToSet: { postDependence: newTaskId } },
            { session },
          );
          if (updateResult.modifiedCount !== preDependence.length) {
            // This is a soft error, could log it or refine. For now, assume it's OK if some weren't found/updated.
            // console.warn(`Not all preDependence tasks were found/updated for new task ${newTaskId}.`);
          }
        }
      });
      return { task: newTask };
    } catch (e) {
      console.error("Error creating task with dependencies:", e);
      return { error: `Failed to create task: ${e.message}` };
    } finally {
      await session.endSession();
    }
  }

  /**
   * assignSchedule (owner: User, taskId: String, timeBlockId: string)
   *
   * **requires**
   *     exists a task with matching owner and taskId;
   *     timeBlockId does not already exist in this task's timeBlockSet;
   *
   * **effects**
   *     add timeBlockId to this task's timeBlockSet
   */
  async assignSchedule(
    { owner, taskId, timeBlockId }: { owner: User; taskId: TaskId; timeBlockId: string },
  ): Promise<Empty | { error: string }> {
    const task = await this.tasks.findOne({ _id: taskId, owner });
    if (!task) {
      return { error: `Task ${taskId} not found or not owned by ${owner}` };
    }
    if (task.timeBlockSet.includes(timeBlockId)) {
      return { error: `TimeBlockId ${timeBlockId} already assigned to task ${taskId}` };
    }

    const result = await this.tasks.updateOne(
      { _id: taskId, owner },
      { $addToSet: { timeBlockSet: timeBlockId } },
    );

    if (result.matchedCount === 0) {
      return { error: `Task ${taskId} not found or not owned by ${owner}` };
    }
    return {};
  }

  /**
   * deleteSchedule (owner: User, taskId: String, timeBockId: string)
   *
   * **requires**
   *     exists a task with matching owner and taskId;
   *     timeBlockId exists in this task's timeBlockSet;
   *
   * **effects**
   *     remove timeBlockId from this task's timeBlockSet;
   */
  async deleteSchedule(
    { owner, taskId, timeBlockId }: { owner: User; taskId: TaskId; timeBlockId: string },
  ): Promise<Empty | { error: string }> {
    const task = await this.tasks.findOne({ _id: taskId, owner });
    if (!task) {
      return { error: `Task ${taskId} not found or not owned by ${owner}` };
    }
    if (!task.timeBlockSet.includes(timeBlockId)) {
      return { error: `TimeBlockId ${timeBlockId} not assigned to task ${taskId}` };
    }

    const result = await this.tasks.updateOne(
      { _id: taskId, owner },
      { $pull: { timeBlockSet: timeBlockId } },
    );

    if (result.matchedCount === 0) {
      return { error: `Task ${taskId} not found or not owned by ${owner}` };
    }
    return {};
  }

  // --- Start of individual updateTask methods ---
  // The spec defines multiple `updateTask` actions for different attributes.
  // We implement them as distinct methods to adhere strictly to the concept spec.

  /**
   * updateTask (owner: User, taskId: String, taskName: String)
   *
   * **requires** exist a task with this taskId and the owner matches the given owner
   *
   * **effect** update the given attribute of this task;
   */
  async updateTaskName(
    { owner, taskId, taskName }: { owner: User; taskId: TaskId; taskName: string },
  ): Promise<Empty | { error: string }> {
    return this._updateTaskAttribute(owner, taskId, { taskName });
  }

  /**
   * updateTask (owner: User, taskId: String, category: String)
   *
   * **requires** exist a task with this taskId and the owner matches the given owner
   *
   * **effect** update the given attribute of this task;
   */
  async updateTaskCategory(
    { owner, taskId, category }: { owner: User; taskId: TaskId; category: string },
  ): Promise<Empty | { error: string }> {
    return this._updateTaskAttribute(owner, taskId, { category });
  }

  /**
   * updateTask (owner: User, taskId: String, duration: Duration)
   *
   * **requires** exist a task with this taskId and the owner matches the given owner
   *
   * **effect** update the given attribute of this task;
   */
  async updateTaskDuration(
    { owner, taskId, duration }: { owner: User; taskId: TaskId; duration: Duration },
  ): Promise<Empty | { error: string }> {
    return this._updateTaskAttribute(owner, taskId, { duration });
  }

  /**
   * updateTask (owner: User, taskId: String, priority: Number)
   *
   * **requires** exist a task with this taskId and the owner matches the given owner
   *
   * **effect** update the given attribute of this task;
   */
  async updateTaskPriority(
    { owner, taskId, priority }: { owner: User; taskId: TaskId; priority: Priority },
  ): Promise<Empty | { error: string }> {
    return this._updateTaskAttribute(owner, taskId, { priority });
  }

  /**
   * updateTask (owner: User, taskId: String, splittable: Flag)
   *
   * **requires** exist a task with this taskId and the owner matches the given owner
   *
   * **effect** update the given attribute of this task;
   */
  async updateTaskSplittable(
    { owner, taskId, splittable }: { owner: User; taskId: TaskId; splittable: Flag },
  ): Promise<Empty | { error: string }> {
    return this._updateTaskAttribute(owner, taskId, { splittable });
  }

  /**
   * updateTask (owner: User, taskId: String, deadline: TimeStamp)
   *
   * **requires** exist a task with this taskId and the owner matches the given owner
   *
   * **effect** update the given attribute of this task;
   */
  async updateTaskDeadline(
    { owner, taskId, deadline }: { owner: User; taskId: TaskId; deadline: TimeStamp },
  ): Promise<Empty | { error: string }> {
    return this._updateTaskAttribute(owner, taskId, { deadline });
  }

  /**
   * updateTask (owner: User, taskId: String, slack: String)
   *
   * **requires** exist a task with this taskId and the owner matches the given owner
   *
   * **effect** update the given attribute of this task;
   */
  async updateTaskSlack(
    { owner, taskId, slack }: { owner: User; taskId: TaskId; slack: Slack },
  ): Promise<Empty | { error: string }> {
    return this._updateTaskAttribute(owner, taskId, { slack });
  }

  /**
   * updateTask (owner: User, taskId: String, note: String)
   *
   * **requires** exist a task with this taskId and the owner matches the given owner
   *
   * **effect** update the given attribute of this task;
   */
  async updateTaskNote(
    { owner, taskId, note }: { owner: User; taskId: TaskId; note: string },
  ): Promise<Empty | { error: string }> {
    return this._updateTaskAttribute(owner, taskId, { note });
  }

  /**
   * Internal helper for all updateTask methods to reduce boilerplate.
   */
  private async _updateTaskAttribute(
    owner: User,
    taskId: TaskId,
    updateFields: Partial<TaskDoc>,
  ): Promise<Empty | { error: string }> {
    const result = await this.tasks.updateOne(
      { _id: taskId, owner },
      { $set: updateFields },
    );

    if (result.matchedCount === 0) {
      return { error: `Task ${taskId} not found or not owned by ${owner}` };
    }
    return {};
  }
  // --- End of individual updateTask methods ---

  /**
   * addPreDependence (owner: user, taskId: String, newPreDependence: Task)
   *
   * **requires**
   *     exist a task $t$ with this taskId and the owner matches the given owner
   *
   * **effect**
   *     add newPreDependence to $t$'s preDependence;
   *     add $t$ to newPreDependence's postDependence;
   */
  async addPreDependence(
    { owner, taskId, newPreDependence }: { owner: User; taskId: TaskId; newPreDependence: TaskId },
  ): Promise<Empty | { error: string }> {
    const session = this.db.client.startSession();
    try {
      await session.withTransaction(async () => {
        // 1. Check if the main task exists and is owned by the user
        const mainTask = await this.tasks.findOne({ _id: taskId, owner }, { session });
        if (!mainTask) {
          throw new Error(`Task ${taskId} not found or not owned by ${owner}`);
        }

        // 2. Check if the newPreDependence task exists
        const dependentTask = await this.tasks.findOne({ _id: newPreDependence }, { session });
        if (!dependentTask) {
          throw new Error(`Dependent task ${newPreDependence} not found`);
        }

        // 3. Add newPreDependence to mainTask's preDependence
        await this.tasks.updateOne(
          { _id: taskId },
          { $addToSet: { preDependence: newPreDependence } },
          { session },
        );

        // 4. Add mainTask to newPreDependence's postDependence
        await this.tasks.updateOne(
          { _id: newPreDependence },
          { $addToSet: { postDependence: taskId } },
          { session },
        );
      });
      return {};
    } catch (e) {
      console.error("Error adding pre-dependence:", e);
      return { error: `Failed to add pre-dependence: ${e.message}` };
    } finally {
      await session.endSession();
    }
  }

  /**
   * removePreDependence (owner: user, taskId: String, oldPreDependence: Task)
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
    { owner, taskId, oldPreDependence }: { owner: User; taskId: TaskId; oldPreDependence: TaskId },
  ): Promise<Empty | { error: string }> {
    const session = this.db.client.startSession();
    try {
      await session.withTransaction(async () => {
        // 1. Check if the main task exists, is owned by the user, and has the oldPreDependence
        const mainTask = await this.tasks.findOne({ _id: taskId, owner }, { session });
        if (!mainTask) {
          throw new Error(`Task ${taskId} not found or not owned by ${owner}`);
        }
        if (!mainTask.preDependence || !mainTask.preDependence.includes(oldPreDependence)) {
          throw new Error(`Task ${taskId} does not have pre-dependence on ${oldPreDependence}`);
        }

        // 2. Remove oldPreDependence from mainTask's preDependence
        await this.tasks.updateOne(
          { _id: taskId },
          { $pull: { preDependence: oldPreDependence } },
          { session },
        );

        // 3. Remove mainTask from oldPreDependence's postDependence (if oldPreDependence still exists)
        await this.tasks.updateOne(
          { _id: oldPreDependence },
          { $pull: { postDependence: taskId } },
          { session },
        );
      });
      return {};
    } catch (e) {
      console.error("Error removing pre-dependence:", e);
      return { error: `Failed to remove pre-dependence: ${e.message}` };
    } finally {
      await session.endSession();
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
    { owner, taskId }: { owner: User; taskId: TaskId },
  ): Promise<Empty | { error: string }> {
    const taskToDelete = await this.tasks.findOne({ _id: taskId, owner });
    if (!taskToDelete) {
      return { error: `Task ${taskId} not found or not owned by ${owner}` };
    }
    if (taskToDelete.postDependence && taskToDelete.postDependence.length > 0) {
      return { error: `Task ${taskId} cannot be deleted as other tasks depend on it.` };
    }

    const result = await this.tasks.deleteOne({ _id: taskId, owner });

    if (result.deletedCount === 0) {
      return { error: `Failed to delete task ${taskId}` }; // Should ideally not happen if findOne succeeded
    }
    return {};
  }
}
```
