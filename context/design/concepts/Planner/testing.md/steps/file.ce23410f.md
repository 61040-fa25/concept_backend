---
timestamp: 'Fri Oct 31 2025 08:37:55 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251031_083755.f7ca65a2.md]]'
content_id: ce23410fc05a1157af5744b65dfd9555273da37a641fbb93615d7aea4827767f
---

# file: src/planner/PlannerConcept.test.ts

```typescript
import { assertEquals, assert } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PlannerConcept from "./PlannerConcept.ts";

// Helper to create dates on today's date for deterministic testing
function todayAt(hours: number, minutes = 0, seconds = 0): Date {
  const d = new Date();
  d.setHours(hours, minutes, seconds, 0);
  return d;
}

// A fixed point in time for all tests to run against. We'll pretend "now" is always 9 AM.
const MOCK_NOW = todayAt(9, 0, 0);
const MOCK_TIME_PROVIDER = () => MOCK_NOW;

Deno.test("PlannerConcept: Operational Principle", async () => {
  console.log("\n--- TRACE: Operational Principle ---");
  const [db, client] = await testDb();
  // Inject the mock time provider
  const planner = new PlannerConcept(db, MOCK_TIME_PROVIDER);

  try {
    const user = "user:alice" as ID;
    const task1 = "task:write-report" as ID;
    const task2 = "task:review-code" as ID;
    const task3 = "task:team-meeting-prep" as ID;

    const tasksToPlan = [
      { id: task1, duration: 120 }, // 2 hours (9am -> 11am)
      { id: task2, duration: 90 }, // 1.5 hours (11am -> 12:30pm)
      { id: task3, duration: 30 }, // 0.5 hours (1:30pm -> 2pm)
    ];

    // Busy from 12:30pm to 1:30pm
    const busySlots = [{ start: todayAt(12, 30), end: todayAt(13, 30) }];

    console.log(`1. Planning day for user '${user}' at mock time ${MOCK_NOW.toLocaleTimeString()}`);
    const planResult = await planner.planDay({ user, tasks: tasksToPlan, busySlots });
    console.log(" > planDay result:", planResult);

    assert("firstTask" in planResult, "planDay should not return an error");
    assertEquals(planResult.firstTask, task1);

    console.log(`2. Getting task after '${task1}'.`);
    const nextAfter1 = await planner.getNextTask({ user, completedTask: task1 });
    console.log(" > getNextTask result:", nextAfter1);
    assert("nextTask" in nextAfter1);
    assertEquals(nextAfter1.nextTask, task2);

    console.log(`3. Getting task after '${task2}'.`);
    const nextAfter2 = await planner.getNextTask({ user, completedTask: task2 });
    console.log(" > getNextTask result:", nextAfter2);
    assert("nextTask" in nextAfter2);
    assertEquals(nextAfter2.nextTask, task3);

    console.log(`4. Getting task after '${task3}'.`);
    const nextAfter3 = await planner.getNextTask({ user, completedTask: task3 });
    console.log(" > getNextTask result:", nextAfter3);
    assert("nextTask" in nextAfter3);
    assertEquals(nextAfter3.nextTask, undefined);
  } finally {
    await client.close();
  }
});

Deno.test("PlannerConcept: Interesting Scenarios", async (t) => {
  await t.step("Scenario 1: Replan mid-day after some tasks are done", async () => {
    console.log("\n--- SCENARIO: Replan mid-day ---");
    const [db, client] = await testDb();
    try {
      const user = "user:bob" as ID;

      // Step 1: Initial plan at 9 AM, with tasks both before and after the replan time.
      const planner_morning = new PlannerConcept(db, () => todayAt(9, 0));
      const originalTasks = [
        { id: "task:morning-work" as ID, duration: 60 }, // Will be scheduled 9am -> 10am
        { id: "task:afternoon-work" as ID, duration: 60 }, // Will be scheduled 2pm -> 3pm
      ];
      const busySlots = [{ start: todayAt(10, 0), end: todayAt(14, 0) }]; // Long break
      await planner_morning.planDay({ user, tasks: originalTasks, busySlots });

      // Step 2: Replan at 1 PM (13:00)
      const planner_afternoon = new PlannerConcept(db, () => todayAt(13, 0));
      const newTasks = [{ id: "task:urgent-fix" as ID, duration: 60 }];

      console.log(`1. Replanning for user '${user}' at mock time 1:00 PM`);
      const replanResult = await planner_afternoon.replan({ user, tasks: newTasks, busySlots: [] });
      console.log(" > replan result:", replanResult);
      assert("firstTask" in replanResult, "replan should succeed");
      assertEquals(replanResult.firstTask, "task:urgent-fix");

      // Assertions:
      // The morning task (starts at 9 AM < 1 PM) should NOT be deleted.
      const checkMorning = await planner_afternoon.getNextTask({ user, completedTask: "task:morning-work" as ID });
      assert("nextTask" in checkMorning, "Morning task that started before replan time should be preserved.");

      // The afternoon task (starts at 2 PM > 1 PM) SHOULD be deleted.
      const checkAfternoon = await planner_afternoon.getNextTask({ user, completedTask: "task:afternoon-work" as ID });
      assert("error" in checkAfternoon, "Future tasks scheduled after replan time should be deleted.");
    } finally {
      await client.close();
    }
  });

  await t.step("Scenario 2: Not enough time left to schedule all tasks", async () => {
    console.log("\n--- SCENARIO: Not enough time ---");
    const [db, client] = await testDb();
    // Pretend it's 8 PM (20:00). We have less than 4 hours left in the day.
    const planner = new PlannerConcept(db, () => todayAt(20, 0));
    try {
      const user = "user:charlie" as ID;
      const tasks = [
        { id: "task:short-1" as ID, duration: 60 }, // 1 hour, fits
        { id: "task:long-1" as ID, duration: 4 * 60 }, // 4 hours, does not fit
      ];
      console.log(`1. Planning day for '${user}' late in the evening.`);
      await planner.planDay({ user, tasks, busySlots: [] });

      const checkFit = await planner.getNextTask({ user, completedTask: "task:short-1" as ID });
      assert("nextTask" in checkFit);
      assertEquals(checkFit.nextTask, undefined, "Only the first task should be scheduled.");

      const checkNoFit = await planner.getNextTask({ user, completedTask: "task:long-1" as ID });
      assert("error" in checkNoFit, "The task that doesn't fit should not exist in the schedule.");
    } finally {
      await client.close();
    }
  });

  // This test does not depend on time, so no mock provider is strictly necessary, but we use it for consistency.
  await t.step("Scenario 3: Clearing and deleting plans", async () => {
    console.log("\n--- SCENARIO: Clear and delete ---");
    const [db, client] = await testDb();
    const planner = new PlannerConcept(db, MOCK_TIME_PROVIDER);
    try {
      const userA = "user:diana" as ID;
      const userB = "user:edward" as ID;
      const tasks = [{ id: "task:generic" as ID, duration: 60 }];

      await planner.planDay({ user: userA, tasks, busySlots: [] });
      await planner.planDay({ user: userB, tasks, busySlots: [] });

      await planner.clearDay({ user: userA });
      const afterClear = await planner.getNextTask({ user: userA, completedTask: "task:generic" as ID });
      assert("error" in afterClear, "User A's plan should be gone.");

      const userBCheck = await planner.getNextTask({ user: userB, completedTask: "task:generic" as ID });
      assert("nextTask" in userBCheck, "User B's plan should remain.");

      await planner.deleteAllForUser({ user: userB });
      const afterDelete = await planner.getNextTask({ user: userB, completedTask: "task:generic" as ID });
      assert("error" in afterDelete, "User B's plan should be gone.");
    } finally {
      await client.close();
    }
  });
});
```
