[@implementation](implementation.md)
[@implementation](../UserAccount/implementation.md)
[@implementation](../Tasks/implementation.md)

[@Focus](Focus.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: Write tests for the implementation of Focus making sure you follow the assignment guidelines:

**Testing concepts**. Your tests should cover the basic behavior of the concept but should also include some more interesting cases. Your tests should use the Deno testing framework and should be programmatic (that is, determining in the code whether they succeeded or failed, and not requiring a human to interpret console messages). They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Some more details about the test cases you should include:

- **Operational principle**. A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example.
- **Interesting scenarios**. Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors.
- **Number required**. For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios.
- **No state setup**. Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state.
- **Saving test execution output**. Save the test execution output by copy-pasting from the console to a markdown file.

Here is the implementation:

```typescript
import { Collection, Db } from "npm:mongodb";

import { Empty, ID } from "@utils/types.ts";

  

// Define generic type parameters for this concept

type User = ID;

type Task = ID;

  

// Define the prefix for MongoDB collections to namespace them for this concept

const PREFIX = "Focus.";

  

/**

 * Represents the state of the Focus concept.

 * Maps a User to their single current Task.

 */

interface CurrentTaskDoc {

  _id: User;

  task: Task;

}

  

/**

 * Focus Concept

 *

 * @purpose To eliminate decision fatigue by presenting the single task a user should be working on right now.

 * @principle It presents the currently scheduled task to the user, providing a single point of focus.

 */

export default class FocusConcept {

  private readonly currentTasks: Collection<CurrentTaskDoc>;

  

  constructor(private readonly db: Db) {

    this.currentTasks = this.db.collection<CurrentTaskDoc>(

      PREFIX + "currentTasks",

    );

  }

  

  /**

   * Sets the specified task as the user's current focus.

   * If the user already has a focus task, it is replaced.

   *

   * @param user The ID of the user.

   * @param task The ID of the task to set as the focus.

   * @returns An empty object on success.

   */

  async setCurrentTask(

    { user, task }: { user: User; task: Task },

  ): Promise<Empty> {

    // This action can always be performed.

    // requires: true

  

    // effects: sets the specified task as the user's current focus

    await this.currentTasks.updateOne(

      { _id: user },

      { $set: { task: task } },

      { upsert: true },

    );

    return {};

  }

  

  /**

   * Removes the current task for the user, leaving them with no focus.

   *

   * @param user The ID of the user whose focus should be cleared.

   * @returns An empty object on success.

   */

  async clearCurrentTask({ user }: { user: User }): Promise<Empty> {

    // This action can always be performed.

    // requires: true

  

    // effects: removes the current task for the user

    await this.currentTasks.deleteOne({ _id: user });

    return {};

  }

  

  /**

   * Returns the user's current task, if one is set.

   *

   * @param user The ID of the user.

   * @returns An object containing the task ID if found, otherwise an empty object.

   */

  async getCurrentTask({ user }: { user: User }): Promise<{ task?: Task }> {

    // This action can always be performed.

    // requires: true

  

    // effects: returns the user's current task, if any

    const doc = await this.currentTasks.findOne({ _id: user });

    if (doc) {

      return { task: doc.task };

    }

    return {};

  }

}
```
# response:

# file: src/focus/FocusConcept.test.ts

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "../utils/database.ts";
import { ID } from "../utils/types.ts";
import FocusConcept from "./FocusConcept.ts";

// Mock IDs for testing
const userA = "user:A" as ID;
const userB = "user:B" as ID;
const task1 = "task:1" as ID;
const task2 = "task:2" as ID;

Deno.test("Operational Principle: Set and get a focus task", async () => {
  console.log("--- TEST: Operational Principle: Set and get a focus task ---");
  const [db, client] = await testDb();
  try {
    const focus = new FocusConcept(db);

    // Initially, userA should have no task. The purpose is to eliminate decision fatigue,
    // so a user might start with no focus.
    console.log(`> getCurrentTask({ user: "${userA}" })`);
    let result = await focus.getCurrentTask({ user: userA });
    console.log(`< ${JSON.stringify(result)}`);
    assertEquals(result, {}, "User should have no initial task");

    // The user decides on a task to focus on.
    console.log(`> setCurrentTask({ user: "${userA}", task: "${task1}" })`);
    const setResult = await focus.setCurrentTask({ user: userA, task: task1 });
    console.log(`< ${JSON.stringify(setResult)}`);
    assertEquals(setResult, {});

    // The concept now presents the scheduled task, fulfilling the principle.
    console.log(`> getCurrentTask({ user: "${userA}" })`);
    result = await focus.getCurrentTask({ user: userA });
    console.log(`< ${JSON.stringify(result)}`);
    assertExists(result.task);
    assertEquals(result.task, task1, "The correct task should be returned");
  } finally {
    await client.close();
  }
});

Deno.test("Scenario 1: Clearing a focus task", async () => {
  console.log("\n--- TEST: Scenario 1: Clearing a focus task ---");
  const [db, client] = await testDb();
  try {
    const focus = new FocusConcept(db);

    // Set a task first to have something to clear
    console.log(`> setCurrentTask({ user: "${userA}", task: "${task1}" })`);
    await focus.setCurrentTask({ user: userA, task: task1 });
    console.log(`< {}`);
    let currentTask = await focus.getCurrentTask({ user: userA });
    assertEquals(currentTask.task, task1);

    // User completes the task and clears their focus
    console.log(`> clearCurrentTask({ user: "${userA}" })`);
    const clearResult = await focus.clearCurrentTask({ user: userA });
    console.log(`< ${JSON.stringify(clearResult)}`);
    assertEquals(clearResult, {});

    // Verify the user has no focus task anymore
    console.log(`> getCurrentTask({ user: "${userA}" })`);
    currentTask = await focus.getCurrentTask({ user: userA });
    console.log(`< ${JSON.stringify(currentTask)}`);
    assertEquals(currentTask, {}, "Task should be cleared");
  } finally {
    await client.close();
  }
});

Deno.test("Scenario 2: Replacing a focus task", async () => {
  console.log("\n--- TEST: Scenario 2: Replacing a focus task ---");
  const [db, client] = await testDb();
  try {
    const focus = new FocusConcept(db);

    // Set an initial task
    console.log(`> setCurrentTask({ user: "${userA}", task: "${task1}" })`);
    await focus.setCurrentTask({ user: userA, task: task1 });
    console.log(`< {}`);

    // A more urgent task comes up, so the user switches focus
    console.log(`> setCurrentTask({ user: "${userA}", task: "${task2}" })`);
    await focus.setCurrentTask({ user: userA, task: task2 });
    console.log(`< {}`);

    // Verify the task has been replaced with the new one
    console.log(`> getCurrentTask({ user: "${userA}" })`);
    const currentTask = await focus.getCurrentTask({ user: userA });
    console.log(`< ${JSON.stringify(currentTask)}`);
    assertEquals(currentTask.task, task2, "Task should be replaced with the new one");
  } finally {
    await client.close();
  }
});

Deno.test("Scenario 3: Get task for a user with no task ever set", async () => {
  console.log("\n--- TEST: Scenario 3: Get task for a user with no task ever set ---");
  const [db, client] = await testDb();
  try {
    const focus = new FocusConcept(db);

    // A new user has no history in the concept
    console.log(`> getCurrentTask({ user: "${userB}" })`);
    const result = await focus.getCurrentTask({ user: userB });
    console.log(`< ${JSON.stringify(result)}`);

    // The concept should gracefully handle this by returning no task
    assertEquals(result, {}, "Should return empty object for a new user");
  } finally {
    await client.close();
  }
});

Deno.test("Scenario 4: Manage multiple users' focus independently", async () => {
  console.log("\n--- TEST: Scenario 4: Manage multiple users' focus independently ---");
  const [db, client] = await testDb();
  try {
    const focus = new FocusConcept(db);

    // Set tasks for two different users
    console.log(`> setCurrentTask({ user: "${userA}", task: "${task1}" })`);
    await focus.setCurrentTask({ user: userA, task: task1 });
    console.log(`< {}`);

    console.log(`> setCurrentTask({ user: "${userB}", task: "${task2}" })`);
    await focus.setCurrentTask({ user: userB, task: task2 });
    console.log(`< {}`);

    // Verify each user has their correct, independent task
    console.log(`> getCurrentTask({ user: "${userA}" })`);
    let taskA = await focus.getCurrentTask({ user: userA });
    console.log(`< ${JSON.stringify(taskA)}`);
    assertEquals(taskA.task, task1);

    console.log(`> getCurrentTask({ user: "${userB}" })`);
    let taskB = await focus.getCurrentTask({ user: userB });
    console.log(`< ${JSON.stringify(taskB)}`);
    assertEquals(taskB.task, task2);

    // Clear task for userA
    console.log(`> clearCurrentTask({ user: "${userA}" })`);
    await focus.clearCurrentTask({ user: userA });
    console.log(`< {}`);

    // Verify userA's task is gone, but userB's is unaffected
    console.log(`> getCurrentTask({ user: "${userA}" })`);
    taskA = await focus.getCurrentTask({ user: userA });
    console.log(`< ${JSON.stringify(taskA)}`);
    assertEquals(taskA, {});

    console.log(`> getCurrentTask({ user: "${userB}" })`);
    taskB = await focus.getCurrentTask({ user: userB });
    console.log(`< ${JSON.stringify(taskB)}`);
    assertEquals(taskB.task, task2, "User B's task should remain unaffected");
  } finally {
    await client.close();
  }
});
```

# trace:

The trace for the operational principle "it presents the currently scheduled task to the user, providing a single point of focus" demonstrates the core functionality:

1.  **Initial State**: A user (`userA`) exists but has no focus task. We confirm this by calling `getCurrentTask({ user: userA })`, which is expected to return an empty object `{}`. This represents a user who has not yet decided what to work on.

2.  **Action `setCurrentTask`**: The user decides to focus on a task (`task1`). We call `setCurrentTask({ user: userA, task: task1 })`. The action succeeds and returns an empty object `{}`, indicating the state has been updated.

3.  **Effect Verification**: The `effect` of the action is that the user's current focus is now set. We verify this by calling `getCurrentTask({ user: userA })` again. This time, it is expected to return an object containing the task that was just set: `{ task: "task:1" }`.

This sequence validates that the concept correctly associates a task with a user and allows that association to be retrieved, fulfilling its principle of providing a single point of focus.