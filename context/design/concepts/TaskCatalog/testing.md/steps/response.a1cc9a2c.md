---
timestamp: 'Tue Oct 14 2025 22:30:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_223045.5a1d5602.md]]'
content_id: a1cc9a2c8250adf7cdbf659767fec734cf74b648ebef9a49453ad9de3c4a8b49
---

# response:

```concept
concept TaskCatalog [User]
purpose To manage a collection of tasks, allowing users to create, view, update, and mark tasks as complete.
principle If a user creates a new task with a description, they can later mark it as complete, and it will no longer appear in their list of active tasks but can still be retrieved as a completed task.
state
  A set of Tasks with
    an owner of type User
    a description of type String
    a isCompleted of type Boolean
actions
  createTask (owner: User, description: String): (task: Task)
    requires The description cannot be empty.
    effects Creates a new task with the given owner and description, initially marked as not completed. Returns the new Task ID.
  markTaskComplete (task: Task)
    requires The task must exist and not already be completed.
    effects Marks the specified task as completed.
  updateTaskDescription (task: Task, newDescription: String)
    requires The task must exist. The new description cannot be empty.
    effects Updates the description of the specified task.
  deleteTask (task: Task)
    requires The task must exist.
    effects Deletes the specified task from the catalog.
queries
  _getTasksByOwner (owner: User): (task: {id: Task, description: String, isCompleted: Boolean})
    requires The owner must be a valid User.
    effects Returns a set of all tasks owned by the specified user, including their ID, description, and completion status.
  _getActiveTasksByOwner (owner: User): (task: {id: Task, description: String})
    requires The owner must be a valid User.
    effects Returns a set of all active (not completed) tasks owned by the specified user, including their ID and description.
  _getCompletedTasksByOwner (owner: User): (task: {id: Task, description: String})
    requires The owner must be a valid User.
    effects Returns a set of all completed tasks owned by the specified user, including their ID and description.
```
