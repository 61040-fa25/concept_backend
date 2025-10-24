[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@Tasks](Tasks.md)

# implement: Tasks
# response:

```typescript
// file: src/Tasks/TasksConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * concept Tasks [User]
 * purpose to capture and organize a user's tasks
 */

// Declare collection prefix, use concept name
const PREFIX = "Tasks" + ".";

// Generic type of this concept
type User = ID;
type Task = ID; // Task ID

/**
 * a set of Tasks with
 *   an owner User
 *   a description String
 *   an optional dueDate Date
 *   an optional estimatedDuration Number
 *   a status of TODO or DONE
 */
export interface TaskDocument {
  _id: Task;
  owner: User;
  description: string;
  dueDate?: Date;
  estimatedDuration?: number;
  status: "TODO" | "DONE";
}

/**
 * a UserTasks element of User with
 *   an orderedTasks seq of Tasks
 */
export interface UserTasksDocument {
  _id: User; // The User ID is the key for this document
  orderedTasks: Task[]; // Array of Task IDs
}

export default class TasksConcept {
  private tasks: Collection<TaskDocument>;
  private userTasks: Collection<UserTasksDocument>;

  constructor(private readonly db: Db) {
    this.tasks = this.db.collection(PREFIX + "tasks");
    this.userTasks = this.db.collection(PREFIX + "userTasks");
  }

  /**
   * createUserTasks (user: User)
   * purpose: Creates an empty task list for a new user.
   * requires: the user doesn't already have a list of tasks created
   * effect: creates an empty UserTasks element for a new user
   */
  async createUserTasks({ user }: { user: User }): Promise<Empty | { error: string }> {
    const existingUserTasks = await this.userTasks.findOne({ _id: user });
    if (existingUserTasks) {
      return { error: `Task list already exists for user ${user}` };
    }

    await this.userTasks.insertOne({
      _id: user,
      orderedTasks: [],
    });
    return {};
  }

  /**
   * createTask (owner: User, description: String, dueDate: optional Date, estimatedDuration: optional Number)
   * purpose: Creates a new task for a user.
   * effect: creates a new task with status TODO and adds it to the user's list
   */
  async createTask(
    {
      owner,
      description,
      dueDate,
      estimatedDuration,
    }: {
      owner: User;
      description: string;
      dueDate?: Date;
      estimatedDuration?: number;
    },
  ): Promise<{ task: Task } | { error: string }> {
    const userTasks = await this.userTasks.findOne({ _id: owner });
    if (!userTasks) {
      return { error: `No task list found for user ${owner}. Please create one first.` };
    }

    const newTaskId = freshID() as Task;
    const newTask: TaskDocument = {
      _id: newTaskId,
      owner,
      description,
      dueDate,
      estimatedDuration,
      status: "TODO",
    };

    await this.tasks.insertOne(newTask);
    await this.userTasks.updateOne(
      { _id: owner },
      { $push: { orderedTasks: newTaskId } },
    );

    return { task: newTaskId };
  }

  /**
   * updateTask (task: Task, newDescription: optional String, newDueDate: optional Date, newEstimatedDuration: optional Number)
   * purpose: Modifies the details of an existing task.
   * effect: modifies the details of an existing task
   */
  async updateTask(
    {
      task,
      newDescription,
      newDueDate,
      newEstimatedDuration,
    }: {
      task: Task;
      newDescription?: string;
      newDueDate?: Date;
      newEstimatedDuration?: number;
    },
  ): Promise<Empty | { error: string }> {
    const updateFields: Partial<TaskDocument> = {};
    if (newDescription !== undefined) updateFields.description = newDescription;
    if (newDueDate !== undefined) updateFields.dueDate = newDueDate;
    if (newEstimatedDuration !== undefined) {
      updateFields.estimatedDuration = newEstimatedDuration;
    }

    if (Object.keys(updateFields).length === 0) {
      return { error: "No fields provided for update." };
    }

    const result = await this.tasks.updateOne(
      { _id: task },
      { $set: updateFields },
    );

    if (result.matchedCount === 0) {
      return { error: `Task ${task} not found.` };
    }
    return {};
  }

  /**
   * reorderTasks (user: User, newOrder: seq of Tasks)
   * purpose: Updates the order of a user's tasks.
   * effect: updates the order of the user's tasks
   */
  async reorderTasks(
    { user, newOrder }: { user: User; newOrder: Task[] },
  ): Promise<Empty | { error: string }> {
    const userTasks = await this.userTasks.findOne({ _id: user });
    if (!userTasks) {
      return { error: `No task list found for user ${user}.` };
    }

    // Validate that all tasks in newOrder belong to this user and that it's a complete list.
    const currentTasks = await this.tasks.find({ owner: user }).toArray();
    const currentTaskIds = new Set(currentTasks.map((t) => t._id));

    if (newOrder.length !== currentTaskIds.size) {
      return { error: "New order list does not contain all or only the user's tasks." };
    }

    const newOrderSet = new Set(newOrder);
    if (newOrderSet.size !== newOrder.length) {
      return { error: "New order list contains duplicate task IDs." };
    }

    for (const taskId of newOrder) {
      if (!currentTaskIds.has(taskId)) {
        return { error: `Task ${taskId} in new order does not belong to user ${user}.` };
      }
    }

    await this.userTasks.updateOne(
      { _id: user },
      { $set: { orderedTasks: newOrder } },
    );
    return {};
  }

  /**
   * markTaskComplete (task: Task)
   * purpose: Marks an existing task as complete.
   * effect: sets the task's status to DONE
   */
  async markTaskComplete({ task }: { task: Task }): Promise<Empty | { error: string }> {
    const result = await this.tasks.updateOne(
      { _id: task },
      { $set: { status: "DONE" } },
    );

    if (result.matchedCount === 0) {
      return { error: `Task ${task} not found.` };
    }
    return {};
  }

  /**
   * deleteTask (task: Task)
   * purpose: Removes a specific task from the system and the user's list.
   * effect: removes the task from the system
   */
  async deleteTask({ task }: { task: Task }): Promise<Empty | { error: string }> {
    const taskToDelete = await this.tasks.findOne({ _id: task });
    if (!taskToDelete) {
      return { error: `Task ${task} not found.` };
    }

    const owner = taskToDelete.owner;

    await this.tasks.deleteOne({ _id: task });
    await this.userTasks.updateOne(
      { _id: owner },
      { $pull: { orderedTasks: task } },
    );
    return {};
  }

  /**
   * deleteAllForUser (user: User)
   * purpose: Removes all tasks associated with a user and their task list.
   * effect: removes all tasks associated with the user
   */
  async deleteAllForUser({ user }: { user: User }): Promise<Empty | { error: string }> {
    const resultTasks = await this.tasks.deleteMany({ owner: user });
    const resultUserTasks = await this.userTasks.deleteOne({ _id: user });

    if (resultTasks.deletedCount === 0 && resultUserTasks.deletedCount === 0) {
      return { error: `No tasks or task list found for user ${user}.` };
    }
    return {};
  }

  /**
   * _getTasks (user: User): (tasks: seq of TaskDocument)
   * purpose: Retrieves a user's full ordered list of tasks.
   * effect: returns the user's full ordered list of tasks
   */
  async _getTasks({ user }: { user: User }): Promise<{ tasks: TaskDocument[] } | { error: string }> {
    const userTasks = await this.userTasks.findOne({ _id: user });
    if (!userTasks) {
      return { error: `No task list found for user ${user}.` };
    }

    const taskDocuments: TaskDocument[] = [];
    for (const taskId of userTasks.orderedTasks) {
      const taskDoc = await this.tasks.findOne({ _id: taskId });
      if (taskDoc) {
        taskDocuments.push(taskDoc);
      }
      // If a task ID exists in orderedTasks but not in tasks collection,
      // it means data inconsistency, but we'll return what we find.
    }
    return { tasks: taskDocuments };
  }

  /**
   * _getRemainingTasks (user: User): (tasks: seq of TaskDocument)
   * purpose: Retrieves a user's ordered list of tasks that are not yet complete.
   * effect: returns the user's ordered list of tasks with status TODO
   */
  async _getRemainingTasks(
    { user }: { user: User },
  ): Promise<{ tasks: TaskDocument[] } | { error: string }> {
    const allUserTasksResult = await this._getTasks({ user });

    if ("error" in allUserTasksResult) {
      return allUserTasksResult;
    }

    const remainingTasks = allUserTasksResult.tasks.filter(
      (task) => task.status === "TODO",
    );
    return { tasks: remainingTasks };
  }
}
```