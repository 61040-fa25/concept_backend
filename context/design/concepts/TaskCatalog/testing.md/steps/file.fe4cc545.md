---
timestamp: 'Tue Oct 14 2025 22:30:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_223045.5a1d5602.md]]'
content_id: fe4cc545513d48860257a735f4ce0f2dc74bed232f53d1607c157aa45d6aa857
---

# file: src/TaskCatalog/TaskCatalogConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "TaskCatalog" + ".";

// Generic types for the concept's external dependencies
type User = ID;

// Internal entity types, represented as IDs
type Task = ID;

/**
 * State: A set of Tasks with an owner, description, and completion status.
 */
interface TaskDoc {
  _id: Task; // MongoDB document ID
  owner: User;
  description: string;
  isCompleted: boolean;
}

/**
 * @concept TaskCatalog
 * @purpose To manage a collection of tasks, allowing users to create, view, update, and mark tasks as complete.
 * @principle If a user creates a new task with a description, they can later mark it as complete, and it will no longer appear in their list of active tasks but can still be retrieved as a completed task.
 */
export default class TaskCatalogConcept {
  tasks: Collection<TaskDoc>;

  constructor(private readonly db: Db) {
    this.tasks = this.db.collection(PREFIX + "tasks");
  }

  /**
   * createTask (owner: User, description: String): (task: Task)
   *
   * @requires The description cannot be empty.
   *
   * @effects Creates a new task with the given owner and description, initially marked as not completed. Returns the new Task ID.
   */
  async createTask({ owner, description }: { owner: User; description: string }): Promise<{ task: Task } | { error: string }> {
    if (!description || description.trim() === "") {
      return { error: "Task description cannot be empty." };
    }
    const taskId = freshID() as Task;
    await this.tasks.insertOne({ _id: taskId, owner, description, isCompleted: false });
    return { task: taskId };
  }

  /**
   * markTaskComplete (task: Task)
   *
   * @requires The task must exist and not already be completed.
   *
   * @effects Marks the specified task as completed.
   */
  async markTaskComplete({ task }: { task: Task }): Promise<Empty | { error: string }> {
    const existingTask = await this.tasks.findOne({ _id: task });
    if (!existingTask) {
      return { error: `Task with ID ${task} not found.` };
    }
    if (existingTask.isCompleted) {
      return { error: `Task with ID ${task} is already completed.` };
    }

    await this.tasks.updateOne({ _id: task }, { $set: { isCompleted: true } });
    return {};
  }

  /**
   * updateTaskDescription (task: Task, newDescription: String)
   *
   * @requires The task must exist. The new description cannot be empty.
   *
   * @effects Updates the description of the specified task.
   */
  async updateTaskDescription({ task, newDescription }: { task: Task; newDescription: string }): Promise<Empty | { error: string }> {
    if (!newDescription || newDescription.trim() === "") {
      return { error: "New task description cannot be empty." };
    }
    const existingTask = await this.tasks.findOne({ _id: task });
    if (!existingTask) {
      return { error: `Task with ID ${task} not found.` };
    }

    await this.tasks.updateOne({ _id: task }, { $set: { description: newDescription } });
    return {};
  }

  /**
   * deleteTask (task: Task)
   *
   * @requires The task must exist.
   *
   * @effects Deletes the specified task from the catalog.
   */
  async deleteTask({ task }: { task: Task }): Promise<Empty | { error: string }> {
    const result = await this.tasks.deleteOne({ _id: task });
    if (result.deletedCount === 0) {
      return { error: `Task with ID ${task} not found.` };
    }
    return {};
  }

  /**
   * _getTasksByOwner (owner: User): (task: {id: Task, description: String, isCompleted: Boolean})
   *
   * @requires The owner must be a valid User.
   *
   * @effects Returns a set of all tasks owned by the specified user, including their ID, description, and completion status.
   */
  async _getTasksByOwner({ owner }: { owner: User }): Promise<Array<{ id: Task; description: string; isCompleted: boolean }>> {
    const userTasks = await this.tasks.find({ owner }).toArray();
    return userTasks.map(t => ({ id: t._id, description: t.description, isCompleted: t.isCompleted }));
  }

  /**
   * _getActiveTasksByOwner (owner: User): (task: {id: Task, description: String})
   *
   * @requires The owner must be a valid User.
   *
   * @effects Returns a set of all active (not completed) tasks owned by the specified user, including their ID and description.
   */
  async _getActiveTasksByOwner({ owner }: { owner: User }): Promise<Array<{ id: Task; description: string }>> {
    const activeTasks = await this.tasks.find({ owner, isCompleted: false }).toArray();
    return activeTasks.map(t => ({ id: t._id, description: t.description }));
  }

  /**
   * _getCompletedTasksByOwner (owner: User): (task: {id: Task, description: String})
   *
   * @requires The owner must be a valid User.
   *
   * @effects Returns a set of all completed tasks owned by the specified user, including their ID and description.
   */
  async _getCompletedTasksByOwner({ owner }: { owner: User }): Promise<Array<{ id: Task; description: string }>> {
    const completedTasks = await this.tasks.find({ owner, isCompleted: true }).toArray();
    return completedTasks.map(t => ({ id: t._id, description: t.description }));
  }
}
```
