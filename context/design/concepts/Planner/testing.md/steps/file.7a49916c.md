---
timestamp: 'Fri Oct 31 2025 04:26:00 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251031_042600.496ce0eb.md]]'
content_id: 7a49916c93784b191f73b01e69a1f9f2538180758a3661e7165f2c54191f8bcd
---

# file: src/planner/PlannerConcept.test.ts

```typescript
import { assertEquals, assert, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PlannerConcept from "./PlannerConcept.ts";

// Helper to create a date for today at a specific hour and minute
function todayAt(hour: number, minute = 0) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
}

// #################################
// # TRACE: OPERATIONAL PRINCIPLE  #
// #################################

Deno.test("Operational Principle: Plan a day with tasks and a lunch break, then get the next task", async () => {
  const [db, client] = await testDb("planner-principle");
  const planner = new PlannerConcept(db);

  console.log("\n--- TRACE: Operational Principle ---");

  // 1. Define user, tasks, and busy slots
  const user = "user:alice" as ID;
  const task1 = "task:write-report" as ID;
  const task2 = "task:review-code" as ID;
  const task3 = "task:team-meeting-prep" as ID;

  const tasks = [
    { id: task1, duration: 120 }, // 2 hours
    { id: task2, duration: 90 }, // 1.5 hours
    { id: task3, duration: 30 }, // 0.5 hours
  ];

  const busySlots = [
    { start: todayAt(12), end: todayAt(13) }, // Lunch break
  ];

  // 2. Plan the day
  const planInput = { user, tasks, busySlots };
  console.log("Action: planDay, Input:", {
    user,
    tasks: tasks.map((t) => t.id),
    busySlots: busySlots.map((s) => ({ start: s.start.toLocaleTimeString(), end: s.end.toLocaleTimeString() })),
  });
  const planResult = await planner.planDay(planInput);
  console.log("Result:", planResult);
  assertEquals(planResult, { firstTask: task1 });

  // 3. Verify the state
  const scheduledTasks = await planner._getScheduledTasksForUser({ user });
  console.log(
    "State Verification: Scheduled tasks count:",
    scheduledTasks.length,
    scheduledTasks.map((t) => ({ task: t.task, start: t.plannedStart.toLocaleTimeString(), end: t.plannedEnd.toLocaleTimeString() })),
  );
  assertEquals(scheduledTasks.length, 3);
  // Task 1 should start at the beginning of the day (e.g., midnight)
  assertEquals(scheduledTasks[0].task, task1);
  assertEquals(scheduledTasks[0].plannedStart, todayAt(0));
  assertEquals(scheduledTasks[0].plannedEnd, todayAt(2));
  // Task 2 should start after task 1
  assertEquals(scheduledTasks[1].task, task2);
  assertEquals(scheduledTasks[1].plannedStart, todayAt(2));
  assertEquals(scheduledTasks[1].plannedEnd, todayAt(3, 30));
  // Task 3 should start after task 2
  assertEquals(scheduledTasks[2].task, task3);
  assertEquals(scheduledTasks[2].plannedStart, todayAt(3, 30));
  assertEquals(scheduledTasks[2].plannedEnd, todayAt(4));

  // 4. Get the next task after completing the first one
  const nextTaskInput = { user, completedTask: task1 };
  console.log("Action: getNextTask, Input:", nextTaskInput);
  const nextTaskResult = await planner.getNextTask(nextTaskInput);
  console.log("Result:", nextTaskResult);
  assertEquals(nextTaskResult, { nextTask: task2 });

  await client.close();
});

// ###############################
// # TRACE: INTERESTING SCENARIOS #
// ###############################

Deno.test("Interesting Scenario 1: Re-planning mid-day removes future tasks", async () => {
  const [db, client] = await testDb("planner-replan");
  const planner = new PlannerConcept(db);

  console.log("\n--- TRACE: Interesting Scenario 1: Re-planning ---");

  // 1. Initial plan
  const user = "user:bob" as ID;
  const initialTask1 = "task:morning-sync" as ID;
  const initialTask2 = "task:afternoon-work" as ID;
  await planner.planDay({
    user,
    tasks: [
      { id: initialTask1, duration: 60 },
      { id: initialTask2, duration: 180 },
    ],
    busySlots: [],
  });
  let scheduled = await planner._getScheduledTasksForUser({ user });
  assertEquals(scheduled.length, 2);

  // 2. Re-plan with new tasks
  const newTask1 = "task:urgent-fix" as ID;
  const newTask2 = "task:client-call" as ID;
  const replanInput = {
    user,
    tasks: [
      { id: newTask1, duration: 45 },
      { id: newTask2, duration: 30 },
    ],
    busySlots: [],
  };
  console.log("Action: replan, Input:", { user, tasks: replanInput.tasks.map((t) => t.id) });
  const replanResult = await planner.replan(replanInput);
  console.log("Result:", replanResult);
  assertEquals(replanResult, { firstTask: newTask1 });

  // 3. Verify state: old tasks are gone, new tasks are scheduled from 'now'
  scheduled = await planner._getScheduledTasksForUser({ user });
  console.log("State Verification: Final scheduled tasks count:", scheduled.length);
  assertEquals(scheduled.length, 2);
  assertEquals(scheduled[0].task, newTask1);
  assertEquals(scheduled[1].task, newTask2);
  assert(scheduled[0].plannedStart >= new Date(), "Re-planned task should start at or after the current time.");

  await client.close();
});

Deno.test("Interesting Scenario 2: Not enough time in the day for all tasks", async () => {
  const [db, client] = await testDb("planner-not-enough-time");
  const planner = new PlannerConcept(db);

  console.log("\n--- TRACE: Interesting Scenario 2: Insufficient Time ---");

  const user = "user:charlie" as ID;
  const task1 = "task:long-task-1" as ID;
  const task2 = "task:long-task-2" as ID; // This one won't fit

  const planInput = {
    user,
    tasks: [
      { id: task1, duration: 23 * 60 }, // 23 hours
      { id: task2, duration: 2 * 60 }, // 2 hours
    ],
    busySlots: [{ start: todayAt(12), end: todayAt(13) }], // 1 hour break
  };

  console.log("Action: planDay, Input:", { user, tasks: planInput.tasks.map((t) => t.id) });
  const planResult = await planner.planDay(planInput);
  console.log("Result:", planResult);
  assertEquals(planResult, { firstTask: task1 });

  const scheduled = await planner._getScheduledTasksForUser({ user });
  console.log("State Verification: Scheduled tasks count:", scheduled.length);
  assertEquals(scheduled.length, 1, "Only the task that fits should be scheduled");
  assertEquals(scheduled[0].task, task1);

  await client.close();
});

Deno.test("Interesting Scenario 3: Clearing and deleting schedules", async () => {
  const [db, client] = await testDb("planner-clearing");
  const planner = new PlannerConcept(db);

  console.log("\n--- TRACE: Interesting Scenario 3: Clearing Data ---");

  const userDave = "user:dave" as ID;
  const userEve = "user:eve" as ID;
  const task = "task:generic" as ID;

  // Plan for both users
  await planner.planDay({ user: userDave, tasks: [{ id: task, duration: 60 }], busySlots: [] });
  await planner.planDay({ user: userEve, tasks: [{ id: task, duration: 60 }], busySlots: [] });
  assert((await planner._getScheduledTasksForUser({ user: userDave })).length > 0);
  assert((await planner._getScheduledTasksForUser({ user: userEve })).length > 0);

  // Clear day for Dave
  console.log("Action: clearDay, Input:", { user: userDave });
  await planner.clearDay({ user: userDave });
  console.log("Result: {}");
  assertEquals((await planner._getScheduledTasksForUser({ user: userDave })).length, 0, "Dave's schedule for today should be empty");
  assert((await planner._getScheduledTasksForUser({ user: userEve })).length > 0, "Eve's schedule should be unaffected");

  // Re-plan for Dave
  await planner.planDay({ user: userDave, tasks: [{ id: task, duration: 60 }], busySlots: [] });
  assert((await planner._getScheduledTasksForUser({ user: userDave })).length > 0);

  // Delete all for Dave
  console.log("Action: deleteAllForUser, Input:", { user: userDave });
  await planner.deleteAllForUser({ user: userDave });
  console.log("Result: {}");
  assertEquals((await planner._getScheduledTasksForUser({ user: userDave })).length, 0, "All of Dave's tasks should be deleted");
  assert((await planner._getScheduledTasksForUser({ user: userEve })).length > 0, "Eve's schedule should still be unaffected");

  await client.close();
});

Deno.test("Interesting Scenario 4: GetNextTask edge cases (last task and non-existent task)", async () => {
  const [db, client] = await testDb("planner-get-next-task-edges");
  const planner = new PlannerConcept(db);

  console.log("\n--- TRACE: Interesting Scenario 4: getNextTask Edge Cases ---");
  const user = "user:frank" as ID;
  const task1 = "task:first" as ID;
  const task2 = "task:last" as ID;
  const nonExistentTask = "task:ghost" as ID;

  await planner.planDay({
    user,
    tasks: [
      { id: task1, duration: 60 },
      { id: task2, duration: 60 },
    ],
    busySlots: [],
  });

  // Case 1: Get next task after the last one
  const nextAfterLastInput = { user, completedTask: task2 };
  console.log("Action: getNextTask, Input:", nextAfterLastInput);
  const nextAfterLastResult = await planner.getNextTask(nextAfterLastInput);
  console.log("Result:", nextAfterLastResult);
  assertEquals(nextAfterLastResult, { nextTask: undefined }, "There should be no task after the last one");

  // Case 2: Get next task for a task not in the schedule
  const nonExistentInput = { user, completedTask: nonExistentTask };
  console.log("Action: getNextTask, Input:", nonExistentInput);
  const nonExistentResult = await planner.getNextTask(nonExistentInput);
  console.log("Result:", nonExistentResult);
  assertExists(nonExistentResult.error, "Should return an error for a non-existent task");
  assertEquals(nonExistentResult.error, "Completed task not found in schedule.");

  await client.close();
});
```
