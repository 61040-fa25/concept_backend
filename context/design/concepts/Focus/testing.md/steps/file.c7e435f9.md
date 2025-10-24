---
timestamp: 'Fri Oct 24 2025 10:56:05 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251024_105605.31b14798.md]]'
content_id: c7e435f9e3771ff309925b68cb509b7ce554db0282b3b0ab5b3895b685796f4a
---

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
