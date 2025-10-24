[@implementation](implementation.md)
[@implementation](../UserAccount/implementation.md)
[@Tasks](Tasks.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: Write tests for the implementation of Tasks making sure you follow the assignment guidelines:

**Testing concepts**. Your tests should cover the basic behavior of the concept but should also include some more interesting cases. Your tests should use the Deno testing framework and should be programmatic (that is, determining in the code whether they succeeded or failed, and not requiring a human to interpret console messages). They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Some more details about the test cases you should include:

- **Operational principle**. A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example.
- **Interesting scenarios**. Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors.
- **Number required**. For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios.
- **No state setup**. Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state.
- **Saving test execution output**. Save the test execution output by copy-pasting from the console to a markdown file.

Here is the implementation:

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


# response:

# file: src/Tasks/TasksConcept.test.ts
```typescript
import { assertEquals, assert, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import TasksConcept from "./TasksConcept.ts";
import { TaskDocument } from "./TasksConcept.ts";

// Helper to check for an error return type from an action
function isError(response: unknown): response is { error: string } {
  return typeof response === "object" && response !== null && "error" in response && typeof (response as { error: unknown }).error === "string";
}

// Helper to check for a successful return type from an action
function isSuccess<T>(response: unknown): response is T {
  return typeof response === "object" && response !== null && !("error" in response);
}

Deno.test("TasksConcept", async (t) => {
  const [db, client] = await testDb();
  const tasksConcept = new TasksConcept(db);

  // --- Test Users ---
  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;

  await t.step("Operational Principle: tasks are added to a prioritized list and can be marked as complete", async () => {
    console.log("\n--- TRACE: Operational Principle ---");

    // 1. Alice creates her task list
    console.log(`Action: createUserTasks({ user: "${userAlice}" })`);
    const createListResult = await tasksConcept.createUserTasks({ user: userAlice });
    console.log("Result:", createListResult);
    assert(!isError(createListResult));

    // 2. Alice adds three tasks
    console.log(`Action: createTask({ owner: "${userAlice}", description: "Buy milk" })`);
    const task1Result = await tasksConcept.createTask({ owner: userAlice, description: "Buy milk" });
    console.log("Result:", task1Result);
    assert(isSuccess<{ task: ID }>(task1Result));
    const task1Id = task1Result.task;

    console.log(`Action: createTask({ owner: "${userAlice}", description: "Walk the dog" })`);
    const task2Result = await tasksConcept.createTask({ owner: userAlice, description: "Walk the dog" });
    console.log("Result:", task2Result);
    assert(isSuccess<{ task: ID }>(task2Result));
    const task2Id = task2Result.task;

    console.log(`Action: createTask({ owner: "${userAlice}", description: "File taxes" })`);
    const task3Result = await tasksConcept.createTask({ owner: userAlice, description: "File taxes" });
    console.log("Result:", task3Result);
    assert(isSuccess<{ task: ID }>(task3Result));
    const task3Id = task3Result.task;

    // 3. Verify the tasks are present and in order
    console.log(`Query: _getTasks({ user: "${userAlice}" })`);
    const allTasksResult = await tasksConcept._getTasks({ user: userAlice });
    console.log("Result:", allTasksResult);
    assert(isSuccess<{ tasks: TaskDocument[] }>(allTasksResult));
    assertEquals(allTasksResult.tasks.length, 3);
    assertEquals(allTasksResult.tasks.map((t) => t._id), [task1Id, task2Id, task3Id]);
    assertEquals(allTasksResult.tasks[0].description, "Buy milk");
    assertEquals(allTasksResult.tasks[0].status, "TODO");

    // 4. Alice marks "Buy milk" as complete
    console.log(`Action: markTaskComplete({ task: "${task1Id}" })`);
    const markCompleteResult = await tasksConcept.markTaskComplete({ task: task1Id });
    console.log("Result:", markCompleteResult);
    assert(!isError(markCompleteResult));

    // 5. Verify the status has changed
    console.log(`Query: _getTasks({ user: "${userAlice}" }) again`);
    const updatedTasksResult = await tasksConcept._getTasks({ user: userAlice });
    console.log("Result:", updatedTasksResult);
    assert(isSuccess<{ tasks: TaskDocument[] }>(updatedTasksResult));
    const completedTask = updatedTasksResult.tasks.find((t) => t._id === task1Id);
    assertNotEquals(completedTask, undefined);
    assertEquals(completedTask?.status, "DONE");

    // 6. Verify remaining tasks only shows TODO items
    console.log(`Query: _getRemainingTasks({ user: "${userAlice}" })`);
    const remainingTasksResult = await tasksConcept._getRemainingTasks({ user: userAlice });
    console.log("Result:", remainingTasksResult);
    assert(isSuccess<{ tasks: TaskDocument[] }>(remainingTasksResult));
    assertEquals(remainingTasksResult.tasks.length, 2);
    assertEquals(remainingTasksResult.tasks.map((t) => t._id), [task2Id, task3Id]);
    console.log("--- END TRACE: Operational Principle ---");
  });

  await t.step("Scenario 1: Reordering and updating tasks", async () => {
    console.log("\n--- SCENARIO: Reordering and updating tasks ---");
    await tasksConcept.createUserTasks({ user: userBob });

    const t1Res = await tasksConcept.createTask({ owner: userBob, description: "Task A" });
    const t2Res = await tasksConcept.createTask({ owner: userBob, description: "Task B" });
    const t3Res = await tasksConcept.createTask({ owner: userBob, description: "Task C" });
    assert(isSuccess<{ task: ID }>(t1Res));
    assert(isSuccess<{ task: ID }>(t2Res));
    assert(isSuccess<{ task: ID }>(t3Res));
    const [t1, t2, t3] = [t1Res.task, t2Res.task, t3Res.task];

    console.log(`Query: _getTasks for Bob initially`);
    let bobTasks = await tasksConcept._getTasks({ user: userBob });
    assert(isSuccess<{ tasks: TaskDocument[] }>(bobTasks));
    assertEquals(bobTasks.tasks.map((t) => t._id), [t1, t2, t3]);
    console.log("Initial order:", bobTasks.tasks.map((t) => t.description));

    const newOrder = [t3, t1, t2];
    console.log(`Action: reorderTasks for Bob with new order [C, A, B]`);
    const reorderRes = await tasksConcept.reorderTasks({ user: userBob, newOrder });
    console.log("Result:", reorderRes);
    assert(!isError(reorderRes));

    bobTasks = await tasksConcept._getTasks({ user: userBob });
    assert(isSuccess<{ tasks: TaskDocument[] }>(bobTasks));
    assertEquals(bobTasks.tasks.map((t) => t._id), newOrder);
    console.log("New order:", bobTasks.tasks.map((t) => t.description));

    const newDescription = "Task C - Updated";
    const newDueDate = new Date();
    console.log(`Action: updateTask for ${t3}`);
    const updateRes = await tasksConcept.updateTask({ task: t3, newDescription, newDueDate });
    console.log("Result:", updateRes);
    assert(!isError(updateRes));

    bobTasks = await tasksConcept._getTasks({ user: userBob });
    assert(isSuccess<{ tasks: TaskDocument[] }>(bobTasks));
    const updatedTask = bobTasks.tasks.find((t) => t._id === t3);
    assertEquals(updatedTask?.description, newDescription);
    assertEquals(updatedTask?.dueDate?.toISOString(), newDueDate.toISOString());
    console.log("Updated task details confirmed.");
  });

  await t.step("Scenario 2: Deleting tasks", async () => {
    console.log("\n--- SCENARIO: Deleting tasks ---");
    const userToDelete = "user:ToDelete" as ID;
    await tasksConcept.createUserTasks({ user: userToDelete });

    const t1Res = await tasksConcept.createTask({ owner: userToDelete, description: "Task D" });
    const t2Res = await tasksConcept.createTask({ owner: userToDelete, description: "Task E" });
    assert(isSuccess<{ task: ID }>(t1Res));
    assert(isSuccess<{ task: ID }>(t2Res));
    const [t1, t2] = [t1Res.task, t2Res.task];

    console.log(`Action: deleteTask ${t1}`);
    const deleteRes = await tasksConcept.deleteTask({ task: t1 });
    console.log("Result:", deleteRes);
    assert(!isError(deleteRes));

    let userTasks = await tasksConcept._getTasks({ user: userToDelete });
    assert(isSuccess<{ tasks: TaskDocument[] }>(userTasks));
    assertEquals(userTasks.tasks.length, 1);
    assertEquals(userTasks.tasks[0]._id, t2);
    console.log("Task D deleted successfully.");

    console.log(`Action: deleteAllForUser for ${userToDelete}`);
    const deleteAllRes = await tasksConcept.deleteAllForUser({ user: userToDelete });
    console.log("Result:", deleteAllRes);
    assert(!isError(deleteAllRes));

    userTasks = await tasksConcept._getTasks({ user: userToDelete });
    assert(isError(userTasks));
    assertEquals(userTasks.error, `No task list found for user ${userToDelete}.`);
    console.log(`All tasks for ${userToDelete} deleted successfully.`);
  });

  await t.step("Scenario 3: Handling error conditions and requirements", async () => {
    console.log("\n--- SCENARIO: Handling error conditions ---");
    const userCharlie = "user:Charlie" as ID;

    console.log(`Action: createTask for non-existent user ${userCharlie}`);
    let result = await tasksConcept.createTask({ owner: userCharlie, description: "Invalid task" });
    console.log("Result:", result);
    assert(isError(result));

    console.log(`Action: createUserTasks for ${userCharlie}`);
    result = await tasksConcept.createUserTasks({ user: userCharlie });
    console.log("Result:", result);
    assert(!isError(result));

    console.log(`Action: createUserTasks for ${userCharlie} AGAIN`);
    result = await tasksConcept.createUserTasks({ user: userCharlie });
    console.log("Result:", result);
    assert(isError(result));

    const fakeTaskId = "task:fake" as ID;
    console.log(`Action: updateTask for non-existent task ${fakeTaskId}`);
    result = await tasksConcept.updateTask({ task: fakeTaskId, newDescription: "won't work" });
    console.log("Result:", result);
    assert(isError(result));

    const t1Res = await tasksConcept.createTask({ owner: userCharlie, description: "Real Task" });
    assert(isSuccess<{ task: ID }>(t1Res));
    const t1 = t1Res.task;
    console.log(`Action: reorderTasks for ${userCharlie} with invalid task ID`);
    result = await tasksConcept.reorderTasks({ user: userCharlie, newOrder: [t1, fakeTaskId] });
    console.log("Result:", result);
    assert(isError(result));

    console.log(`Action: reorderTasks for ${userCharlie} with incomplete list`);
    result = await tasksConcept.reorderTasks({ user: userCharlie, newOrder: [] });
    console.log("Result:", result);
    assert(isError(result));
  });

  await t.step("Scenario 4: Querying empty and fully completed lists", async () => {
    console.log("\n--- SCENARIO: Querying empty and fully completed lists ---");
    const userDavid = "user:David" as ID;

    console.log(`Action: createUserTasks for ${userDavid}`);
    await tasksConcept.createUserTasks({ user: userDavid });

    console.log(`Query: _getTasks on empty list`);
    let davidTasks = await tasksConcept._getTasks({ user: userDavid });
    assert(isSuccess<{ tasks: TaskDocument[] }>(davidTasks));
    assertEquals(davidTasks.tasks.length, 0);

    console.log(`Query: _getRemainingTasks on empty list`);
    let davidRemaining = await tasksConcept._getRemainingTasks({ user: userDavid });
    assert(isSuccess<{ tasks: TaskDocument[] }>(davidRemaining));
    assertEquals(davidRemaining.tasks.length, 0);
    console.log("Empty list queries work as expected.");

    const t1Res = await tasksConcept.createTask({ owner: userDavid, description: "Task F" });
    const t2Res = await tasksConcept.createTask({ owner: userDavid, description: "Task G" });
    assert(isSuccess<{ task: ID }>(t1Res));
    assert(isSuccess<{ task: ID }>(t2Res));

    console.log(`Action: markTaskComplete for both of David's tasks`);
    await tasksConcept.markTaskComplete({ task: t1Res.task });
    await tasksConcept.markTaskComplete({ task: t2Res.task });

    console.log(`Query: _getTasks on fully completed list`);
    davidTasks = await tasksConcept._getTasks({ user: userDavid });
    assert(isSuccess<{ tasks: TaskDocument[] }>(davidTasks));
    assertEquals(davidTasks.tasks.length, 2);
    assert(davidTasks.tasks.every((t) => t.status === "DONE"));

    console.log(`Query: _getRemainingTasks on fully completed list`);
    davidRemaining = await tasksConcept._getRemainingTasks({ user: userDavid });
    assert(isSuccess<{ tasks: TaskDocument[] }>(davidRemaining));
    assertEquals(davidRemaining.tasks.length, 0);
    console.log("Fully completed list queries work as expected.");
  });

  await client.close();
});
```

# trace:
The operational principle for the `Tasks` concept is that "tasks are added to a prioritized list and can be marked as complete". The following trace demonstrates this principle in action.

1.  A user, Alice, first needs a place to store her tasks. She calls `createUserTasks` to initialize her list.
    *   **Action**: `createUserTasks({ user: "user:Alice" })`
    *   **Result**: `{}` (Success)

2.  Alice then adds three tasks to her list. The concept creates each task with a 'TODO' status and adds them to her `orderedTasks` list in the order they were created.
    *   **Action**: `createTask({ owner: "user:Alice", description: "Buy milk" })`
    *   **Result**: `{ task: "..." }` (a unique task ID is generated)
    *   **Action**: `createTask({ owner: "user:Alice", description: "Walk the dog" })`
    *   **Result**: `{ task: "..." }`
    *   **Action**: `createTask({ owner: "user:Alice", description: "File taxes" })`
    *   **Result**: `{ task: "..." }`

3.  We can query Alice's tasks to see that they are all there, in the correct order, and are all marked as 'TODO'.
    *   **Query**: `_getTasks({ user: "user:Alice" })`
    *   **Result**: A list of 3 task documents, in the order they were created, all with `status: "TODO"`.

4.  Alice finishes buying milk and marks the task as complete.
    *   **Action**: `markTaskComplete({ task: "<ID of 'Buy milk' task>" })`
    *   **Result**: `{}` (Success)

5.  When we query her tasks again, we see the status has been updated.
    *   **Query**: `_getTasks({ user: "user:Alice" })`
    *   **Result**: A list of 3 task documents. The 'Buy milk' task now has `status: "DONE"`.

6.  Finally, to see what she still needs to do, Alice can query for her remaining tasks. This query filters out the completed tasks.
    *   **Query**: `_getRemainingTasks({ user: "user:Alice" })`
    *   **Result**: A list containing only the 'Walk the dog' and 'File taxes' tasks.

This sequence demonstrates the core functionality outlined in the principle: creating a list, adding tasks which are implicitly prioritized by creation order, and marking them as complete to track progress.