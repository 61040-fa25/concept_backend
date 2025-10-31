---
timestamp: 'Fri Oct 31 2025 04:36:07 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251031_043607.fde722e4.md]]'
content_id: c9b138fccbd676c8f29fac005f5d7638dee93c848437545d88ea0cdf627a6d52
---

# file: src/planner/PlannerConcept.test.ts

```typescript
import { assertEquals, assert } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PlannerConcept from "./PlannerConcept.ts";

// Helper to create dates relative to the start of today for deterministic testing
function todayAt(hours: number, minutes = 0, seconds = 0): Date {
  const d = new Date();
  d.setHours(hours, minutes, seconds, 0);
  return d;
}

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
      { id: task1, duration: 120 }, // 2 hours
      { id: task2, duration: 90 }, // 1.5 hours
      { id: task3, duration: 30 }, // 0.5 hours
    ];

    const busySlots = [
      { start: todayAt(12, 0), end: todayAt(13, 0) }, // Lunch
    ];

    console.log(`1. Planning day for user '${user}' with 3 tasks and 1 busy slot.`);
    const planResult = await planner.planDay({ user, tasks: tasksToPlan, busySlots });
    console.log(" > planDay result:", planResult);

    assert("firstTask" in planResult, "planDay should not return an error");
    assertEquals(planResult.firstTask, task1, "The first task in the plan should be the first one provided.");

    // Verify state implicitly by checking `getNextTask` behavior
    console.log(`2. Getting task after '${task1}'.`);
    const nextAfter1 = await planner.getNextTask({ user, completedTask: task1 });
    console.log(" > getNextTask result:", nextAfter1);
    assert("nextTask" in nextAfter1, "getNextTask should not return an error");
    assertEquals(nextAfter1.nextTask, task2, "The second task should follow the first.");

    console.log(`3. Getting task after '${task2}'.`);
    const nextAfter2 = await planner.getNextTask({ user, completedTask: task2 });
    console.log(" > getNextTask result:", nextAfter2);
    assert("nextTask" in nextAfter2, "getNextTask should not return an error");
    assertEquals(nextAfter2.nextTask, task3, "The third task should follow the second.");

    console.log(`4. Getting task after '${task3}' (the last task).`);
    const nextAfter3 = await planner.getNextTask({ user, completedTask: task3 });
    console.log(" > getNextTask result:", nextAfter3);
    assert("nextTask" in nextAfter3, "getNextTask should not return an error");
    assertEquals(nextAfter3.nextTask, undefined, "There should be no task after the last one.");
  } finally {
    await client.close();
  }
});

Deno.test("PlannerConcept: Interesting Scenarios", async (t) => {
  // SCENARIO 1: Replan mid-day
  await t.step("Scenario 1: Replan mid-day after some tasks are done", async () => {
    console.log("\n--- SCENARIO: Replan mid-day ---");
    const [db, client] = await testDb();
    const planner = new PlannerConcept(db);

    try {
      const user = "user:bob" as ID;
      const originalTasks = [
        { id: "task:morning-sync" as ID, duration: 30 },
        { id: "task:deep-work-1" as ID, duration: 120 },
      ];
      // Plan the day starting from 00:00
      await planner.planDay({ user, tasks: originalTasks, busySlots: [] });

      // Now, replan with new tasks. This should clear future tasks and add new ones.
      const newTasks = [
        { id: "task:urgent-fix" as ID, duration: 60 },
        { id: "task:afternoon-planning" as ID, duration: 45 },
      ];

      console.log(`1. Replanning for user '${user}' with new tasks.`);
      const replanResult = await planner.replan({ user, tasks: newTasks, busySlots: [] });
      console.log(" > replan result:", replanResult);

      assert("firstTask" in replanResult, "replan should not return an error");
      assertEquals(replanResult.firstTask, "task:urgent-fix", "Replan should start with the new first task.");

      // Verify the new plan
      const nextAfterUrgent = await planner.getNextTask({ user, completedTask: "task:urgent-fix" as ID });
      assert("nextTask" in nextAfterUrgent, "getNextTask after replan should succeed");
      assertEquals(nextAfterUrgent.nextTask, "task:afternoon-planning", "The new second task should follow.");

      // Verify old future tasks are gone.
      // We assume `replan` is called after "morning-sync" is complete, so it exists, but "deep-work-1" should be gone.
      const getOldFutureTask = await planner.getNextTask({ user, completedTask: "task:deep-work-1" as ID });
      assert("error" in getOldFutureTask, "Old future tasks should be removed after replanning.");
    } finally {
      await client.close();
    }
  });

  // SCENARIO 2: Not enough time to schedule all tasks
  await t.step("Scenario 2: Not enough time to schedule all tasks", async () => {
    console.log("\n--- SCENARIO: Not enough time ---");
    const [db, client] = await testDb();
    const planner = new PlannerConcept(db);
    try {
      const user = "user:charlie" as ID;
      const tasks = [
        { id: "task:long-1" as ID, duration: 8 * 60 }, // 8 hours
        { id: "task:long-2" as ID, duration: 8 * 60 }, // 8 hours
        { id: "task:long-3" as ID, duration: 8 * 60 + 1 }, // 8 hours + 1 min
      ];
      // Only 24 hours in a day. The third task shouldn't fit.
      console.log(`1. Planning day for '${user}' with tasks exceeding 24 hours.`);
      await planner.planDay({ user, tasks, busySlots: [] });

      const next1 = await planner.getNextTask({ user, completedTask: "task:long-1" as ID });
      assert("nextTask" in next1, "getNextTask for first long task should succeed");
      assertEquals(next1.nextTask, "task:long-2");

      const next2 = await planner.getNextTask({ user, completedTask: "task:long-2" as ID });
      console.log(" > getNextTask for last fitting task:", next2);
      assert("nextTask" in next2, "getNextTask for second long task should succeed");
      assertEquals(next2.nextTask, undefined, "The third task should not have been scheduled.");
    } finally {
      await client.close();
    }
  });

  // SCENARIO 3: Clear and delete operations
  await t.step("Scenario 3: Clearing and deleting plans", async () => {
    console.log("\n--- SCENARIO: Clear and delete ---");
    const [db, client] = await testDb();
    const planner = new PlannerConcept(db);
    try {
      const userA = "user:diana" as ID;
      const userB = "user:edward" as ID;
      const tasks = [{ id: "task:generic" as ID, duration: 60 }];

      console.log(`1. Planning a day for two users: '${userA}' and '${userB}'.`);
      await planner.planDay({ user: userA, tasks, busySlots: [] });
      await planner.planDay({ user: userB, tasks, busySlots: [] });

      console.log(`2. Clearing day for '${userA}'.`);
      await planner.clearDay({ user: userA });

      const afterClear = await planner.getNextTask({ user: userA, completedTask: "task:generic" as ID });
      console.log(` > getNextTask for '${userA}' result:`, afterClear);
      assert("error" in afterClear, "User A's plan should be gone after clearDay.");

      const userBCheck = await planner.getNextTask({ user: userB, completedTask: "task:generic" as ID });
      assert("nextTask" in userBCheck, "User B's plan should remain.");

      console.log(`3. Deleting all tasks for '${userB}'.`);
      await planner.deleteAllForUser({ user: userB });

      const afterDelete = await planner.getNextTask({ user: userB, completedTask: "task:generic" as ID });
      console.log(` > getNextTask for '${userB}' result:`, afterDelete);
      assert("error" in afterDelete, "User B's plan should be gone after deleteAllForUser.");
    } finally {
      await client.close();
    }
  });

  // SCENARIO 4: Get next for a non-existent completed task
  await t.step("Scenario 4: Get next for a non-existent completed task", async () => {
    console.log("\n--- SCENARIO: Get next for non-existent task ---");
    const [db, client] = await testDb();
    const planner = new PlannerConcept(db);
    try {
      const user = "user:frank" as ID;
      const nonExistentTask = "task:does-not-exist" as ID;
      await planner.planDay({ user, tasks: [{ id: "task:exists" as ID, duration: 60 }], busySlots: [] });

      console.log(`1. Getting next task for a task not in the schedule ('${nonExistentTask}').`);
      const result = await planner.getNextTask({ user, completedTask: nonExistentTask });
      console.log(" > getNextTask result:", result);
      assert("error" in result, "Should return an error for a non-existent completed task.");
      assertEquals(result.error, "Completed task not found in schedule.");
    } finally {
      await client.close();
    }
  });

  // SCENARIO 5: Day is completely busy
  await t.step("Scenario 5: Attempting to plan a completely busy day", async () => {
    console.log("\n--- SCENARIO: Completely busy day ---");
    const [db, client] = await testDb();
    const planner = new PlannerConcept(db);
    try {
      const user = "user:grace" as ID;
      const tasks = [{ id: "task:wont-fit" as ID, duration: 1 }];
      const busySlots = [{ start: todayAt(0, 0), end: todayAt(23, 59, 59) }];

      console.log(`1. Planning day for '${user}' with a completely blocked out schedule.`);
      const result = await planner.planDay({ user, tasks, busySlots });
      console.log(" > planDay result:", result);

      assert("firstTask" in result, "planDay should not error");
      assertEquals(result.firstTask, undefined, "No tasks should be scheduled on a full day.");
    } finally {
      await client.close();
    }
  });
});
```
