---
timestamp: 'Fri Oct 31 2025 08:19:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251031_081919.88bd8444.md]]'
content_id: d99472281e4d815169ba42aa6d0214e09d96e249ba4150566600191823a1db5a
---

# file: src/planner/PlannerConcept.test.ts

```typescript
import { assertEquals, assert } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PlannerConcept from "./PlannerConcept.ts";

// Helper to create dates relative to a fixed point for deterministic testing
function todayAt(hours: number, minutes = 0, seconds = 0): Date {
  const d = new Date();
  d.setHours(hours, minutes, seconds, 0);
  return d;
}

// A fixed point in time for all tests to run against. Let's say it's 9:00 AM.
const MOCK_NOW = todayAt(9, 0);

Deno.test("PlannerConcept: Operational Principle", async () => {
  console.log("\n--- TRACE: Operational Principle ---");
  const [db, client] = await testDb();
  const planner = new PlannerConcept(db);

  try {
    const user = "user:alice" as ID;
    const task1 = "task:write-report" as ID;
    const task2 = "task:review-code" as ID;
    const task3 = "task:team-meeting-prep" as ID;

    const tasksToPlan = [
      { id: task1, duration: 120 }, // 2 hours -> 9:00 - 11:00
      { id: task2, duration: 90 }, // 1.5 hours -> 11:00 - 12:30
      { id: task3, duration: 30 }, // 0.5 hours -> 13:00 - 13:30
    ];

    const busySlots = [
      { start: todayAt(12, 30), end: todayAt(13, 0) }, // Lunch
    ];

    console.log(`1. Planning day for user '${user}' at ${MOCK_NOW.toLocaleTimeString()}`);
    const planResult = await planner.planDay({ user, tasks: tasksToPlan, busySlots, currentTime: MOCK_NOW });
    console.log(" > planDay result:", planResult);

    assert("firstTask" in planResult, "planDay should not return an error");
    assertEquals(planResult.firstTask, task1);

    console.log(`2. Getting task after '${task1}'.`);
    const nextAfter1 = await planner.getNextTask({ user, completedTask: task1 });
    assertEquals(nextAfter1.nextTask, task2);

    console.log(`3. Getting task after '${task2}'.`);
    const nextAfter2 = await planner.getNextTask({ user, completedTask: task2 });
    assertEquals(nextAfter2.nextTask, task3);

    console.log(`4. Getting task after '${task3}' (the last task).`);
    const nextAfter3 = await planner.getNextTask({ user, completedTask: task3 });
    assertEquals(nextAfter3.nextTask, undefined);
  } finally {
    await client.close();
  }
});

Deno.test("PlannerConcept: Interesting Scenarios", async (t) => {
  await t.step("Scenario 1: Replan mid-day after some tasks are done", async () => {
    console.log("\n--- SCENARIO: Replan mid-day ---");
    const [db, client] = await testDb();
    const planner = new PlannerConcept(db);

    try {
      const user = "user:bob" as ID;
      const originalTasks = [
        { id: "task:morning-sync" as ID, duration: 30 }, // 9:00 - 9:30
        { id: "task:deep-work-1" as ID, duration: 120 }, // 9:30 - 11:30
      ];
      await planner.planDay({ user, tasks: originalTasks, busySlots: [], currentTime: MOCK_NOW });

      const REPLAN_TIME = todayAt(10, 0); // An hour into the day
      const newTasks = [
        { id: "task:urgent-fix" as ID, duration: 60 },
        { id: "task:afternoon-planning" as ID, duration: 45 },
      ];

      console.log(`1. Replanning for user '${user}' at ${REPLAN_TIME.toLocaleTimeString()}`);
      const replanResult = await planner.replan({ user, tasks: newTasks, busySlots: [], currentTime: REPLAN_TIME });
      console.log(" > replan result:", replanResult);
      assertEquals(replanResult.firstTask, "task:urgent-fix");

      const nextAfterUrgent = await planner.getNextTask({ user, completedTask: "task:urgent-fix" as ID });
      assertEquals(nextAfterUrgent.nextTask, "task:afternoon-planning");

      const getOldFutureTask = await planner.getNextTask({ user, completedTask: "task:deep-work-1" as ID });
      assert("error" in getOldFutureTask, "Old future tasks should be removed after replanning.");
    } finally {
      await client.close();
    }
  });

  await t.step("Scenario 2: Not enough time to schedule all tasks", async () => {
    console.log("\n--- SCENARIO: Not enough time ---");
    const [db, client] = await testDb();
    const planner = new PlannerConcept(db);
    try {
      const user = "user:charlie" as ID;
      // At 9am, there are 15 hours left in the day. 900 minutes.
      const tasks = [
        { id: "task:long-1" as ID, duration: 8 * 60 }, // 480 mins
        { id: "task:long-2" as ID, duration: 8 * 60 }, // 480 mins. This won't fit.
      ];
      console.log(`1. Planning day for '${user}' with tasks exceeding remaining time.`);
      await planner.planDay({ user, tasks, busySlots: [], currentTime: MOCK_NOW });

      const next1 = await planner.getNextTask({ user, completedTask: "task:long-1" as ID });
      assert("nextTask" in next1, "First task should be scheduled");
      assertEquals(next1.nextTask, undefined, "Second task should not have been scheduled");
    } finally {
      await client.close();
    }
  });

  // Other test cases (clear, delete, etc.) are less sensitive to time,
  // but we pass the mock time anyway for consistency.
  await t.step("Scenario 3: Clearing and deleting plans", async () => {
    // ... (This test's logic doesn't need to change much)
    console.log("\n--- SCENARIO: Clear and delete ---");
    const [db, client] = await testDb();
    const planner = new PlannerConcept(db);
    try {
      const userA = "user:diana" as ID;
      const userB = "user:edward" as ID;
      const tasks = [{ id: "task:generic" as ID, duration: 60 }];

      await planner.planDay({ user: userA, tasks, busySlots: [], currentTime: MOCK_NOW });
      await planner.planDay({ user: userB, tasks, busySlots: [], currentTime: MOCK_NOW });

      await planner.clearDay({ user: userA, day: MOCK_NOW });

      const afterClear = await planner.getNextTask({ user: userA, completedTask: "task:generic" as ID });
      assert("error" in afterClear, "User A's plan should be gone after clearDay.");
    } finally {
      await client.close();
    }
  });
});
```
