---
timestamp: 'Tue Oct 14 2025 22:24:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_222458.f8522767.md]]'
content_id: 29187e889048aa4dda56e73e6544e8266442de0732dcb1bf43ae934f737afe15
---

# response:

```typescript
import { Collection, Db, ObjectId } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "TaskCatalog" + ".";

// Generic types of this concept
type Task = ID;
type User = ID; // Assuming User is an ID from another concept (e.g., UserAuthentication)
type Status = "todo" | "in progress" | "done"; // Literal types for Status names

/**
 * a set of Tasks with
 *    a name String
 *    a description String
 *    a status Status (defaults to 'todo')
 *    a createdBy User
 *    a assignedTo User?
 */
interface TaskDocument {
  _id: Task;
  name: string;
  description: string;
  status: Status;
  createdBy: User;
  assignedTo?: User; // Optional assignedTo field
}

export default class TaskCatalogConcept {
  tasks: Collection<TaskDocument>;

  constructor(private readonly db: Db) {
    this.tasks = this.db.collection(PREFIX + "tasks");
    // Ensure unique IDs (though freshID should handle this) and potentially indexes
    // await this.tasks.createIndex({ createdBy: 1 });
    // await this.tasks.createIndex({ assignedTo: 1 });
    // await this.tasks.createIndex({ status: 1 });
  }

  /**
   * createTask (name: String, description: String, createdBy: User): (task: Task)
   *
   * **requires** `name` and `description` are non-empty strings, `createdBy` is a valid User ID.
   *
   * **effects** creates a new Task `t`; sets the name of `t` to `name`, description of `t` to `description`,
   *             status of `t` to 'todo', and createdBy to `createdBy`; returns `t` as `task`.
   */
  async createTask(
    { name, description, createdBy }: {
      name: string;
      description: string;
      createdBy: User;
    },
  ): Promise<{ task: Task } | { error: string }> {
    if (!name || name.trim() === "") {
      return { error: "Task name cannot be empty." };
    }
    if (!description || description.trim() === "") {
      return { error: "Task description cannot be empty." };
    }
    if (!createdBy) {
      return { error: "Task must have a creator." };
    }

    const newTask: TaskDocument = {
      _id: freshID() as Task,
      name,
      description,
      status: "todo", // Default status
      createdBy,
    };

    try {
      await this.tasks.insertOne(newTask);
      return { task: newTask._id };
    } catch (e) {
      console.error("Error creating task:", e);
      return { error: `Failed to create task: ${e.message}` };
    }
  }

  /**
   * updateTaskName (task: Task, name: String): Empty
   *
   * **requires** a Task `task` with the given ID exists; `name` is a non-empty string.
   *
   * **effects** sets the name of `task` to `name`.
   */
  async updateTaskName(
    { task, name }: { task: Task; name: string },
  ): Promise<Empty | { error: string }> {
    if (!name || name.trim() === "") {
      return { error: "Task name cannot be empty." };
    }

    try {
      const result = await this.tasks.updateOne(
        { _id: task },
        { $set: { name } },
      );
      if (result.matchedCount === 0) {
        return { error: `Task with ID '${task}' not found.` };
      }
      return {};
    } catch (e) {
      console.error("Error updating task name:", e);
      return { error: `Failed to update task name: ${e.message}` };
    }
  }

  /**
   * updateTaskDescription (task: Task, description: String): Empty
   *
   * **requires** a Task `task` with the given ID exists; `description` is a non-empty string.
   *
   * **effects** sets the description of `task` to `description`.
   */
  async updateTaskDescription(
    { task, description }: { task: Task; description: string },
  ): Promise<Empty | { error: string }> {
    if (!description || description.trim() === "") {
      return { error: "Task description cannot be empty." };
    }

    try {
      const result = await this.tasks.updateOne(
        { _id: task },
        { $set: { description } },
      );
      if (result.matchedCount === 0) {
        return { error: `Task with ID '${task}' not found.` };
      }
      return {};
    } catch (e) {
      console.error("Error updating task description:", e);
      return { error: `Failed to update task description: ${e.message}` };
    }
  }

  /**
   * updateTaskStatus (task: Task, status: Status): Empty
   *
   * **requires** a Task `task` with the given ID exists; `status` is one of 'todo', 'in progress', 'done'.
   *
   * **effects** sets the status of `task` to `status`.
   */
  async updateTaskStatus(
    { task, status }: { task: Task; status: Status },
  ): Promise<Empty | { error: string }> {
    const validStatuses: Status[] = ["todo", "in progress", "done"];
    if (!validStatuses.includes(status)) {
      return { error: `Invalid status '${status}'. Must be one of: ${validStatuses.join(", ")}` };
    }

    try {
      const result = await this.tasks.updateOne(
        { _id: task },
        { $set: { status } },
      );
      if (result.matchedCount === 0) {
        return { error: `Task with ID '${task}' not found.` };
      }
      return {};
    } catch (e) {
      console.error("Error updating task status:", e);
      return { error: `Failed to update task status: ${e.message}` };
    }
  }

  /**
   * assignTask (task: Task, user: User): Empty
   *
   * **requires** a Task `task` with the given ID exists; `user` is a valid User ID.
   *
   * **effects** sets the `assignedTo` field of `task` to `user`.
   */
  async assignTask(
    { task, user }: { task: Task; user: User },
  ): Promise<Empty | { error: string }> {
    if (!user) {
      return { error: "User ID for assignment cannot be empty." };
    }

    try {
      const result = await this.tasks.updateOne(
        { _id: task },
        { $set: { assignedTo: user } },
      );
      if (result.matchedCount === 0) {
        return { error: `Task with ID '${task}' not found.` };
      }
      return {};
    } catch (e) {
      console.error("Error assigning task:", e);
      return { error: `Failed to assign task: ${e.message}` };
    }
  }

  /**
   * unassignTask (task: Task): Empty
   *
   * **requires** a Task `task` with the given ID exists.
   *
   * **effects** removes the `assignedTo` field from `task`.
   */
  async unassignTask(
    { task }: { task: Task },
  ): Promise<Empty | { error: string }> {
    try {
      const result = await this.tasks.updateOne(
        { _id: task },
        { $unset: { assignedTo: "" } }, // $unset removes the field
      );
      if (result.matchedCount === 0) {
        return { error: `Task with ID '${task}' not found.` };
      }
      return {};
    } catch (e) {
      console.error("Error unassigning task:", e);
      return { error: `Failed to unassign task: ${e.message}` };
    }
  }

  /**
   * deleteTask (task: Task): Empty
   *
   * **requires** a Task `task` with the given ID exists.
   *
   * **effects** deletes `task`.
   */
  async deleteTask(
    { task }: { task: Task },
  ): Promise<Empty | { error: string }> {
    try {
      const result = await this.tasks.deleteOne({ _id: task });
      if (result.deletedCount === 0) {
        return { error: `Task with ID '${task}' not found.` };
      }
      return {};
    } catch (e) {
      console.error("Error deleting task:", e);
      return { error: `Failed to delete task: ${e.message}` };
    }
  }

  /**
   * _getTask (task: Task): (task: {name: String, description: String, status: Status, createdBy: User, assignedTo: User?})[]
   *
   * **requires** a Task `task` with the given ID exists.
   *
   * **effects** returns an array containing a single object representing `task` with its name, description, status, createdBy, and optionally assignedTo.
   */
  async _getTask(
    { task }: { task: Task },
  ): Promise<
    {
      task: {
        name: string;
        description: string;
        status: Status;
        createdBy: User;
        assignedTo?: User;
      };
    }[] | { error: string }
  > {
    try {
      const foundTask = await this.tasks.findOne({ _id: task });
      if (!foundTask) {
        return { error: `Task with ID '${task}' not found.` };
      }
      return [{
        task: {
          name: foundTask.name,
          description: foundTask.description,
          status: foundTask.status,
          createdBy: foundTask.createdBy,
          assignedTo: foundTask.assignedTo,
        },
      }];
    } catch (e) {
      console.error("Error getting task:", e);
      return { error: `Failed to retrieve task: ${e.message}` };
    }
  }

  /**
   * _getTasksByStatus (status: Status): (tasks: {name: String, description: String, status: Status, createdBy: User, assignedTo: User?})[]
   *
   * **requires** `status` is one of 'todo', 'in progress', 'done'.
   *
   * **effects** returns an array of objects, each representing a task with the given status, including its name, description, status, createdBy, and optionally assignedTo.
   */
  async _getTasksByStatus(
    { status }: { status: Status },
  ): Promise<
    {
      tasks: {
        name: string;
        description: string;
        status: Status;
        createdBy: User;
        assignedTo?: User;
      };
    }[] | { error: string }
  > {
    const validStatuses: Status[] = ["todo", "in progress", "done"];
    if (!validStatuses.includes(status)) {
      return { error: `Invalid status '${status}'. Must be one of: ${validStatuses.join(", ")}` };
    }

    try {
      const foundTasks = await this.tasks.find({ status }).toArray();
      return foundTasks.map((t) => ({
        tasks: {
          name: t.name,
          description: t.description,
          status: t.status,
          createdBy: t.createdBy,
          assignedTo: t.assignedTo,
        },
      }));
    } catch (e) {
      console.error("Error getting tasks by status:", e);
      return { error: `Failed to retrieve tasks by status: ${e.message}` };
    }
  }

  /**
   * _getTasksCreatedByUser (user: User): (tasks: {name: String, description: String, status: Status, createdBy: User, assignedTo: User?})[]
   *
   * **requires** `user` is a valid User ID.
   *
   * **effects** returns an array of objects, each representing a task created by the given user, including its name, description, status, createdBy, and optionally assignedTo.
   */
  async _getTasksCreatedByUser(
    { user }: { user: User },
  ): Promise<
    {
      tasks: {
        name: string;
        description: string;
        status: Status;
        createdBy: User;
        assignedTo?: User;
      };
    }[] | { error: string }
  > {
    try {
      const foundTasks = await this.tasks.find({ createdBy: user }).toArray();
      return foundTasks.map((t) => ({
        tasks: {
          name: t.name,
          description: t.description,
          status: t.status,
          createdBy: t.createdBy,
          assignedTo: t.assignedTo,
        },
      }));
    } catch (e) {
      console.error("Error getting tasks created by user:", e);
      return { error: `Failed to retrieve tasks created by user: ${e.message}` };
    }
  }

  /**
   * _getTasksAssignedToUser (user: User): (tasks: {name: String, description: String, status: Status, createdBy: User, assignedTo: User?})[]
   *
   * **requires** `user` is a valid User ID.
   *
   * **effects** returns an array of objects, each representing a task assigned to the given user, including its name, description, status, createdBy, and optionally assignedTo.
   */
  async _getTasksAssignedToUser(
    { user }: { user: User },
  ): Promise<
    {
      tasks: {
        name: string;
        description: string;
        status: Status;
        createdBy: User;
        assignedTo?: User;
      };
    }[] | { error: string }
  > {
    try {
      const foundTasks = await this.tasks.find({ assignedTo: user }).toArray();
      return foundTasks.map((t) => ({
        tasks: {
          name: t.name,
          description: t.description,
          status: t.status,
          createdBy: t.createdBy,
          assignedTo: t.assignedTo,
        },
      }));
    } catch (e) {
      console.error("Error getting tasks assigned to user:", e);
      return { error: `Failed to retrieve tasks assigned to user: ${e.message}` };
    }
  }
}
```
