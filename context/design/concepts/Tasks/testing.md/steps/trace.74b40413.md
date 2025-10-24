---
timestamp: 'Thu Oct 23 2025 23:30:50 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_233050.e1abea62.md]]'
content_id: 74b4041317c46365a812ccf9ffaae7cb8f6a428dd8f7a543dc8f6af8f9caeca3
---

# trace:

The operational principle for the `Tasks` concept is that "tasks are added to a prioritized list and can be marked as complete". The following trace demonstrates this principle in action.

1. A user, Alice, first needs a place to store her tasks. She calls `createUserTasks` to initialize her list.
   * **Action**: `createUserTasks({ user: "user:Alice" })`
   * **Result**: `{}` (Success)

2. Alice then adds three tasks to her list. The concept creates each task with a 'TODO' status and adds them to her `orderedTasks` list in the order they were created.
   * **Action**: `createTask({ owner: "user:Alice", description: "Buy milk" })`
   * **Result**: `{ task: "..." }` (a unique task ID is generated)
   * **Action**: `createTask({ owner: "user:Alice", description: "Walk the dog" })`
   * **Result**: `{ task: "..." }`
   * **Action**: `createTask({ owner: "user:Alice", description: "File taxes" })`
   * **Result**: `{ task: "..." }`

3. We can query Alice's tasks to see that they are all there, in the correct order, and are all marked as 'TODO'.
   * **Query**: `_getTasks({ user: "user:Alice" })`
   * **Result**: A list of 3 task documents, in the order they were created, all with `status: "TODO"`.

4. Alice finishes buying milk and marks the task as complete.
   * **Action**: `markTaskComplete({ task: "<ID of 'Buy milk' task>" })`
   * **Result**: `{}` (Success)

5. When we query her tasks again, we see the status has been updated.
   * **Query**: `_getTasks({ user: "user:Alice" })`
   * **Result**: A list of 3 task documents. The 'Buy milk' task now has `status: "DONE"`.

6. Finally, to see what she still needs to do, Alice can query for her remaining tasks. This query filters out the completed tasks.
   * **Query**: `_getRemainingTasks({ user: "user:Alice" })`
   * **Result**: A list containing only the 'Walk the dog' and 'File taxes' tasks.

This sequence demonstrates the core functionality outlined in the principle: creating a list, adding tasks which are implicitly prioritized by creation order, and marking them as complete to track progress.
