---
timestamp: 'Tue Oct 14 2025 22:49:08 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_224908.635da888.md]]'
content_id: c9e43abcbfacc2696b68df33da78ae77aa841adb8fa4c533c2f6c5c40b0a859a
---

# file: src/TaskCatalog/TaskCatalog.ts

```typescript
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

***
