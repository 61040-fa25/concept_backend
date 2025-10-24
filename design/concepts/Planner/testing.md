[@implementation](implementation.md)
[@implementation](../UserAccount/implementation.md)
[@implementation](../Tasks/implementation.md)

[@Planner](Planner.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: Write tests for the implementation of Planner making sure you follow the assignment guidelines:

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
import { freshID } from "@utils/database.ts";

// Generic parameters for the Planner concept
type User = ID;
type Task = ID;

// Supporting types for actions
type DateTime = Date;

/**
 * Represents a block of time that is unavailable for scheduling.
 */
interface BusySlot {
  start: DateTime;
  end: DateTime;
}

/**
 * Represents a task with its required duration in minutes.
 * This is necessary for the planner to know how much time to allocate.
 */
interface TaskWithDuration {
  id: Task;
  duration: number; // in minutes
}

/**
 * State: A set of ScheduledTasks with an owner, a task, and a planned time window.
 * This represents a task that has been placed onto the user's schedule.
 */
interface ScheduledTask {
  _id: ID;
  owner: User;
  task: Task;
  plannedStart: DateTime;
  plannedEnd: DateTime;
}

const PREFIX = "Planner.";

/**
 * concept: Planner
 * purpose: having a realistic, time-based plan for a user's tasks
 */
export default class PlannerConcept {
  private readonly scheduledTasks: Collection<ScheduledTask>;

  constructor(private readonly db: Db) {
    this.scheduledTasks = db.collection<ScheduledTask>(PREFIX + "scheduledTasks");
  }

  /**
   * Schedules a user's tasks for a full day.
   * effect: creates a new, full-day schedule by assigning tasks to available time slots; returns the first task, if any.
   * This action first clears the user's existing schedule for the day before planning.
   */
  async planDay({ user, tasks, busySlots }: { user: User; tasks: TaskWithDuration[]; busySlots: BusySlot[] }): Promise<{ firstTask?: Task } | { error: string }> {
    await this.clearDay({ user });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0); // 9 AM
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0); // 5 PM

    return this._scheduleTasks(user, tasks, busySlots, startOfDay, endOfDay);
  }

  /**
   * Generates a new plan from the current time forward.
   * effect: discards remaining scheduled tasks and generates a new plan from the current time forward; returns the first task, if any.
   */
  async replan({ user, tasks, busySlots }: { user: User; tasks: TaskWithDuration[]; busySlots: BusySlot[] }): Promise<{ firstTask?: Task } | { error: string }> {
    const now = new Date();
    // Delete all future tasks for the user
    await this.scheduledTasks.deleteMany({
      owner: user,
      plannedStart: { $gte: now },
    });

    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0); // 5 PM

    // If it's already past the end of the working day, we can't plan anything.
    if (now >= endOfDay) {
      return {};
    }

    return this._scheduleTasks(user, tasks, busySlots, now, endOfDay);
  }

  /**
   * Removes all scheduled tasks for a given user for the current day.
   * effect: removes all ScheduledTasks for the given user for the current day.
   */
  async clearDay({ user }: { user: User }): Promise<Empty> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    await this.scheduledTasks.deleteMany({
      owner: user,
      plannedStart: { $gte: startOfDay, $lte: endOfDay },
    });

    return {};
  }

  /**
   * Removes all scheduled tasks for a given user.
   * effect: removes all scheduled tasks for the user.
   */
  async deleteAllForUser({ user }: { user: User }): Promise<Empty> {
    await this.scheduledTasks.deleteMany({ owner: user });
    return {};
  }

  /**
   * Finds the task scheduled immediately after a completed task.
   * effect: finds the task scheduled immediately after the completedTask and returns it.
   */
  async getNextTask({ user, completedTask }: { user: User; completedTask: Task }): Promise<{ nextTask?: Task } | { error: string }> {
    const lastTask = await this.scheduledTasks.findOne({ owner: user, task: completedTask });

    if (!lastTask) {
      return { error: "Completed task not found in schedule." };
    }

    const nextTask = await this.scheduledTasks.findOne(
      {
        owner: user,
        plannedStart: { $gte: lastTask.plannedEnd },
      },
      {
        sort: { plannedStart: 1 },
      },
    );

    return { nextTask: nextTask?.task };
  }

  /**
   * Core scheduling logic to fit tasks into available time slots.
   */
  private async _scheduleTasks(user: User, tasks: TaskWithDuration[], busySlots: BusySlot[], planFrom: DateTime, planUntil: DateTime): Promise<{ firstTask?: Task }> {
    const availableSlots = this._getAvailableSlots(planFrom, planUntil, busySlots);
    const newScheduledTasks: ScheduledTask[] = [];

    for (const task of tasks) {
      const taskDurationMillis = task.duration * 60 * 1000;

      for (const slot of availableSlots) {
        const slotDurationMillis = slot.end.getTime() - slot.start.getTime();

        if (slotDurationMillis >= taskDurationMillis) {
          // Found a slot, schedule the task here
          const plannedStart = slot.start;
          const plannedEnd = new Date(plannedStart.getTime() + taskDurationMillis);

          newScheduledTasks.push({
            _id: freshID(),
            owner: user,
            task: task.id,
            plannedStart,
            plannedEnd,
          });

          // Update the slot for the next task
          slot.start = plannedEnd;

          // Break from the slot loop and move to the next task
          break;
        }
      }
    }

    if (newScheduledTasks.length > 0) {
      await this.scheduledTasks.insertMany(newScheduledTasks);
    }

    return { firstTask: newScheduledTasks.length > 0 ? newScheduledTasks[0].task : undefined };
  }

  /**
   * Calculates available time slots within a given window, excluding busy periods.
   */
  private _getAvailableSlots(start: DateTime, end: DateTime, busySlots: BusySlot[]): BusySlot[] {
    const availableSlots: BusySlot[] = [];
    let cursor = start;

    // Sort busy slots to process them chronologically
    const sortedBusy = busySlots.sort((a, b) => a.start.getTime() - b.start.getTime());

    for (const busy of sortedBusy) {
      // If there's a gap before the next busy slot, add it as available
      if (busy.start > cursor) {
        availableSlots.push({ start: cursor, end: busy.start });
      }
      // Move the cursor to the end of the busy slot
      cursor = new Date(Math.max(cursor.getTime(), busy.end.getTime()));
    }

    // If there's time left after the last busy slot, add it
    if (cursor < end) {
      availableSlots.push({ start: cursor, end: end });
    }

    return availableSlots;
  }
}
```



# response:

# file: src/planner/PlannerConcept.test.ts

```typescript
import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PlannerConcept from "./PlannerConcept.ts";

// Define helper types used in tests
type TaskWithDuration = { id: ID; duration: number };
type BusySlot = { start: Date; end: Date };

Deno.test("PlannerConcept tests", async (t) => {
  const [db, client] = await testDb();
  const planner = new PlannerConcept(db);

  // Mock data for users and tasks
  const userAlice = "user:alice" as ID;
  const userBob = "user:bob" as ID;
  const task1 = "task:1" as ID;
  const task2 = "task:2" as ID;
  const task3 = "task:3" as ID;
  const task4 = "task:4" as ID;

  // Helper to get a predictable start of the working day (9 AM today)
  const getStartOfWorkDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0);

  /**
   * Test the operational principle: Plan a user's day with tasks around a busy schedule,
   * then retrieve the next task after one is completed.
   */
  await t.step("Operational Principle: Plan a day with tasks around busy slots and get next task", async () => {
    console.log("\n--- Testing Operational Principle ---");

    // Arrange: Alice has three prioritized tasks and a meeting at 11 AM.
    const tasksToPlan: TaskWithDuration[] = [
      { id: task1, duration: 60 }, // 1 hour
      { id: task2, duration: 90 }, // 1.5 hours
      { id: task3, duration: 30 }, // 0.5 hours
    ];
    const now = new Date();
    const busySlots: BusySlot[] = [
      {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0), // 11:00 AM
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0), // 12:00 PM
      },
    ];

    // Act 1: Plan the day for Alice
    console.log("Action: planDay", { user: userAlice, tasks: tasksToPlan.length, busySlots: busySlots.length });
    const planResult = await planner.planDay({ user: userAlice, tasks: tasksToPlan, busySlots });
    console.log("Result:", planResult);

    // Assert 1: The first task is returned, and tasks are scheduled correctly around the meeting.
    assert("firstTask" in planResult, "planDay should not return an error");
    assertEquals(planResult.firstTask, task1);

    const scheduled = await db.collection("Planner.scheduledTasks").find({ owner: userAlice }).sort({ plannedStart: 1 }).toArray();
    assertEquals(scheduled.length, 3);
    // The implementation fills earlier gaps first.
    // Expected schedule: task1 (9-10), task3 (10-10:30), task2 (12-13:30)
    assertEquals(scheduled[0].task, task1, "Task 1 should be first");
    assertEquals(scheduled[1].task, task3, "Task 3 should be second, filling the gap before the meeting");
    assertEquals(scheduled[2].task, task2, "Task 2 should be after the meeting");

    // Act 2: Get the next task after completing task 1.
    console.log("Action: getNextTask", { user: userAlice, completedTask: task1 });
    const nextTaskResult = await planner.getNextTask({ user: userAlice, completedTask: task1 });
    console.log("Result:", nextTaskResult);

    // Assert 2: The next chronologically scheduled task (task3) should be returned.
    assert("nextTask" in nextTaskResult, "getNextTask should not return an error");
    assertEquals(nextTaskResult.nextTask, task3);
  });

  /**
   * Interesting Scenario 1: Attempt to schedule more tasks than can fit in a single workday.
   */
  await t.step("Interesting Scenario 1: Not enough time in the day to schedule all tasks", async () => {
    console.log("\n--- Testing Scenario 1: Not enough time ---");
    // Arrange: Alice has tasks that total more than the 8-hour workday (9am-5pm).
    const tasksToPlan: TaskWithDuration[] = [
      { id: task1, duration: 4 * 60 }, // 4 hours
      { id: task2, duration: 4 * 60 }, // 4 hours
      { id: task3, duration: 1 }, // 1 minute (this one should not fit)
    ];

    // Act
    console.log("Action: planDay", { user: userAlice, tasks: tasksToPlan.length, busySlots: 0 });
    const planResult = await planner.planDay({ user: userAlice, tasks: tasksToPlan, busySlots: [] });
    console.log("Result:", planResult);

    // Assert: Only the first two tasks that fit should be scheduled.
    assert("firstTask" in planResult, "planDay should succeed");
    assertEquals(planResult.firstTask, task1);
    const scheduled = await db.collection("Planner.scheduledTasks").find({ owner: userAlice }).toArray();
    assertEquals(scheduled.length, 2);
    assert(scheduled.some((t) => t.task === task1));
    assert(scheduled.some((t) => t.task === task2));
    assert(!scheduled.some((t) => t.task === task3), "The third task should not be scheduled");
  });

  /**
   * Interesting Scenario 2: A user needs to replan their day with new priorities.
   */
  await t.step("Interesting Scenario 2: Replanning mid-day", async () => {
    console.log("\n--- Testing Scenario 2: Replanning ---");
    // Arrange: First, create an initial plan for the day.
    const initialTasks: TaskWithDuration[] = [
      { id: task1, duration: 60 },
      { id: task2, duration: 60 },
    ];
    console.log("Action: planDay (initial)", { user: userAlice, tasks: initialTasks.length, busySlots: 0 });
    await planner.planDay({ user: userAlice, tasks: initialTasks, busySlots: [] });

    let scheduled = await db.collection("Planner.scheduledTasks").find({ owner: userAlice }).toArray();
    assertEquals(scheduled.length, 2, "Initial plan should have 2 tasks");

    // Act: Now, replan with a different set of tasks.
    const newTasks: TaskWithDuration[] = [
      { id: task3, duration: 30 },
      { id: task4, duration: 30 },
    ];
    console.log("Action: replan", { user: userAlice, tasks: newTasks.length, busySlots: 0 });
    const replanResult = await planner.replan({ user: userAlice, tasks: newTasks, busySlots: [] });
    console.log("Result:", replanResult);

    // Assert: The old tasks are gone, and the new ones are scheduled from now onwards.
    assert("firstTask" in replanResult, "replan should succeed");
    assertEquals(replanResult.firstTask, task3);

    scheduled = await db.collection("Planner.scheduledTasks").find({ owner: userAlice }).toArray();
    assertEquals(scheduled.length, 2, "Replan should result in 2 new tasks");
    assert(!scheduled.some((t) => t.task === task1 || t.task === task2), "Old tasks should be removed");
    assert(scheduled.some((t) => t.task === task3));
    assert(scheduled.some((t) => t.task === task4));
  });

  /**
   * Interesting Scenario 3: Clearing a user's schedule for the day vs. all time.
   */
  await t.step("Interesting Scenario 3: Clearing the schedule", async () => {
    console.log("\n--- Testing Scenario 3: Clearing schedule ---");
    // Arrange: Plan a day for Alice and Bob.
    const tasks = [{ id: task1, duration: 60 }];
    await planner.planDay({ user: userAlice, tasks, busySlots: [] });
    await planner.planDay({ user: userBob, tasks, busySlots: [] });

    assertEquals(await db.collection("Planner.scheduledTasks").countDocuments({ owner: userAlice }), 1);
    assertEquals(await db.collection("Planner.scheduledTasks").countDocuments({ owner: userBob }), 1);

    // Act 1: Clear Alice's day.
    console.log("Action: clearDay", { user: userAlice });
    const clearDayResult = await planner.clearDay({ user: userAlice });
    console.log("Result:", clearDayResult);

    // Assert 1: Alice's tasks for the day are gone, Bob's are not.
    assertEquals(await db.collection("Planner.scheduledTasks").countDocuments({ owner: userAlice }), 0);
    assertEquals(await db.collection("Planner.scheduledTasks").countDocuments({ owner: userBob }), 1, "Bob's tasks should remain");

    // Act 2: Delete ALL of Bob's tasks (not just for today).
    console.log("Action: deleteAllForUser", { user: userBob });
    const deleteAllUserResult = await planner.deleteAllForUser({ user: userBob });
    console.log("Result:", deleteAllUserResult);

    // Assert 2: Bob's tasks are all gone.
    assertEquals(await db.collection("Planner.scheduledTasks").countDocuments({ owner: userBob }), 0);
  });

  /**
   * Interesting Scenario 4: Edge cases for getNextTask (last task and non-existent task).
   */
  await t.step("Interesting Scenario 4: Get next task with no task following", async () => {
    console.log("\n--- Testing Scenario 4: Get next task edge cases ---");
    // Arrange: Plan a day with just one task.
    const tasks = [{ id: task1, duration: 60 }];
    await planner.planDay({ user: userAlice, tasks, busySlots: [] });

    // Act 1: Get next task after the only task on the schedule.
    console.log("Action: getNextTask (last task)", { user: userAlice, completedTask: task1 });
    const result = await planner.getNextTask({ user: userAlice, completedTask: task1 });
    console.log("Result:", result);

    // Assert 1: Should return successfully but with an undefined nextTask.
    assert("nextTask" in result, "getNextTask should not return an error");
    assertEquals(result.nextTask, undefined, "There should be no next task");

    // Act 2: Get next task for a task that isn't scheduled.
    console.log("Action: getNextTask (non-existent task)", { user: userAlice, completedTask: task2 });
    const errorResult = await planner.getNextTask({ user: userAlice, completedTask: task2 });
    console.log("Result:", errorResult);

    // Assert 2: Should return an error object.
    assert("error" in errorResult, "Should return an error for a non-existent task");
    assertExists(errorResult.error);
  });

  // Cleanup: close the database client connection
  await client.close();
});
```

# trace:

The trace demonstrates the operational principle: "it intelligently fits a user's prioritized tasks into the open slots in their schedule".

1.  **`planDay({ user: "user:alice", tasks: [...], busySlots: [...] })`**
    *   **Action**: A user, Alice, starts her day. She has three tasks to complete: `task1` (1hr), `task2` (1.5hr), and `task3` (0.5hr). She also has a meeting scheduled from 11:00 AM to 12:00 PM. She uses `planDay` to create a schedule.
    *   **State Change**:
        *   The concept first calculates the available time slots for the day (e.g., 9:00-11:00 AM and 12:00-5:00 PM), avoiding the `busySlot`.
        *   It then iterates through her prioritized task list and fits them into the available slots.
        *   `task1` (1hr) is scheduled from 9:00 to 10:00 AM.
        *   `task2` (1.5hr) cannot fit in the remaining morning slot, so it is scheduled after the meeting, from 12:00 to 1:30 PM.
        *   `task3` (0.5hr) can fit in the morning slot, so it is scheduled from 10:00 to 10:30 AM.
        *   The database is updated with three `ScheduledTask` documents for Alice, each with an owner, task ID, and start/end times.
    *   **Output**: The action returns `{ firstTask: "task:1" }`, indicating the first item on her schedule for the day.

2.  **`getNextTask({ user: "user:alice", completedTask: "task:1" })`**
    *   **Action**: Alice completes `task1` at 10:00 AM and wants to know what's next. She calls `getNextTask`, passing in the ID of the completed task.
    *   **State Change**: None. This is a query of the current schedule.
    *   **Output**: The concept looks at Alice's schedule, finds the task starting at or after the end time of `task1`. This is `task3`, which starts at 10:00 AM. The action returns `{ nextTask: "task:3" }`.

This trace shows the concept successfully creating a realistic plan around constraints and allowing the user to progress through that plan as intended.


# prompt: 
running 1 test from ./src/concepts/Planner/PlannerConcept.test.ts
PlannerConcept tests ...
  Operational Principle: Plan a day with tasks around busy slots and get next task ...
------- post-test output -------

--- Testing Operational Principle ---
Action: planDay { user: "user:alice", tasks: 3, busySlots: 1 }
Result: { firstTask: "task:1" }
Action: getNextTask { user: "user:alice", completedTask: "task:1" }
Result: { nextTask: "task:3" }
----- post-test output end -----
  Operational Principle: Plan a day with tasks around busy slots and get next task ... ok (130ms)
  Interesting Scenario 1: Not enough time in the day to schedule all tasks ...
------- post-test output -------

--- Testing Scenario 1: Not enough time ---
Action: planDay { user: "user:alice", tasks: 3, busySlots: 0 }
Result: { firstTask: "task:1" }
----- post-test output end -----
  Interesting Scenario 1: Not enough time in the day to schedule all tasks ... ok (59ms)
  Interesting Scenario 2: Replanning mid-day ...
------- post-test output -------

--- Testing Scenario 2: Replanning ---
Action: planDay (initial) { user: "user:alice", tasks: 2, busySlots: 0 }
Action: replan { user: "user:alice", tasks: 2, busySlots: 0 }
Result: { firstTask: "task:3" }
----- post-test output end -----
  Interesting Scenario 2: Replanning mid-day ... FAILED (133ms)
  Interesting Scenario 3: Clearing the schedule ...
------- post-test output -------

--- Testing Scenario 3: Clearing schedule ---
Action: clearDay { user: "user:alice" }
Result: {}
Action: deleteAllForUser { user: "user:bob" }
Result: {}
----- post-test output end -----
  Interesting Scenario 3: Clearing the schedule ... ok (211ms)
  Interesting Scenario 4: Get next task with no task following ...
------- post-test output -------

--- Testing Scenario 4: Get next task edge cases ---
Action: getNextTask (last task) { user: "user:alice", completedTask: "task:1" }
Result: { nextTask: undefined }
Action: getNextTask (non-existent task) { user: "user:alice", completedTask: "task:2" }
Result: { error: "Completed task not found in schedule." }
----- post-test output end -----
  Interesting Scenario 4: Get next task with no task following ... ok (90ms)
PlannerConcept tests ... FAILED (due to 1 failed step) (1s)
running 5 tests from ./src/concepts/Schedule/ScheduleConcept.test.ts
Operational Principle: Sync external calendar and add manual blocks ...
------- post-test output -------
--- Testing Operational Principle ---

Action: _getSlots
Params: { user: "user:Alice" }
Result: []

Action: syncCalendar
Params: {
  user: "user:Alice",
  externalEvents: [
    {
      startTime: 2023-10-26T09:00:00.000Z,
      endTime: 2023-10-26T10:00:00.000Z
    },
    {
      startTime: 2023-10-26T14:00:00.000Z,
      endTime: 2023-10-26T15:30:00.000Z
    }
  ]
}
Result: {}

Action: _getSlots
Params: { user: "user:Alice" }
Result: [
  {
    _id: "019a1679-8f6f-749d-87c4-1607cb5f7a0b",
    owner: "user:Alice",
    startTime: 2023-10-26T09:00:00.000Z,
    endTime: 2023-10-26T10:00:00.000Z
  },
  {
    _id: "019a1679-8f6f-7375-a091-11943c2398dd",
    owner: "user:Alice",
    startTime: 2023-10-26T14:00:00.000Z,
    endTime: 2023-10-26T15:30:00.000Z
  }
]

Action: blockTime
Params: {
  user: "user:Alice",
  startTime: 2023-10-26T12:00:00.000Z,
  endTime: 2023-10-26T13:00:00.000Z
}
Result: { _id: "019a1679-8fb3-7425-87a8-1884593f9b1b" }

Action: _getSlots
Params: { user: "user:Alice" }
Result: [
  {
    _id: "019a1679-8f6f-749d-87c4-1607cb5f7a0b",
    owner: "user:Alice",
    startTime: 2023-10-26T09:00:00.000Z,
    endTime: 2023-10-26T10:00:00.000Z
  },
  {
    _id: "019a1679-8f6f-7375-a091-11943c2398dd",
    owner: "user:Alice",
    startTime: 2023-10-26T14:00:00.000Z,
    endTime: 2023-10-26T15:30:00.000Z
  },
  {
    _id: "019a1679-8fb3-7425-87a8-1884593f9b1b",
    owner: "user:Alice",
    startTime: 2023-10-26T12:00:00.000Z,
    endTime: 2023-10-26T13:00:00.000Z
  }
]
--- Principle Test Passed ---
----- post-test output end -----
Operational Principle: Sync external calendar and add manual blocks ... ok (902ms)
Interesting Scenario: Resyncing clears all previous slots ...
------- post-test output -------

--- Testing Scenario: Resyncing ---

Action: syncCalendar
Params: {
  user: "user:Bob",
  externalEvents: [
    {
      startTime: 2023-11-01T10:00:00.000Z,
      endTime: 2023-11-01T11:00:00.000Z
    }
  ]
}
Result: {}

Action: _getSlots
Params: { user: "user:Bob" }
Result: [
  {
    _id: "019a1679-9298-7389-8859-856725819edf",
    owner: "user:Bob",
    startTime: 2023-11-01T10:00:00.000Z,
    endTime: 2023-11-01T11:00:00.000Z
  }
]
--- Resyncing Test Passed ---
----- post-test output end -----
Interesting Scenario: Resyncing clears all previous slots ... ok (726ms)
Interesting Scenario: Empty and invalid syncs ...
------- post-test output -------

--- Testing Scenario: Empty and Invalid Syncs ---

Action: syncCalendar (empty)
Params: { user: "user:Charlie", externalEvents: [] }
Result: {}

Action: syncCalendar (invalid)
Params: {
  user: "user:Charlie",
  externalEvents: [
    {
      startTime: 2023-11-05T14:00:00.000Z,
      endTime: 2023-11-05T13:00:00.000Z
    }
  ]
}
Result: {
  error: "All events must have a valid startTime that occurs before its endTime."
}
--- Empty/Invalid Sync Test Passed ---
----- post-test output end -----
Interesting Scenario: Empty and invalid syncs ... ok (618ms)
Interesting Scenario: Explicitly delete all slots for a user ...
------- post-test output -------

--- Testing Scenario: Delete All Slots ---

Action: deleteAllForUser
Params: { user: "user:David" }
Result: {}

Action: deleteAllForUser (empty)
Params: { user: "user:Eve" }
Result: {}
--- Delete All Slots Test Passed ---
----- post-test output end -----
Interesting Scenario: Explicitly delete all slots for a user ... ok (832ms)
Interesting Scenario: Invalid inputs for blockTime ...
------- post-test output -------

--- Testing Scenario: Invalid blockTime ---

Action: blockTime (invalid range)
Params: {
  user: "user:Frank",
  startTime: 2023-12-01T10:00:00.000Z,
  endTime: 2023-12-01T09:00:00.000Z
}
Result: { error: "startTime must be a valid Date that occurs before endTime." }

Action: blockTime (equal times)
Params: {
  user: "user:Frank",
  startTime: 2023-12-01T10:00:00.000Z,
  endTime: 2023-12-01T10:00:00.000Z
}
Result: { error: "startTime must be a valid Date that occurs before endTime." }
--- Invalid blockTime Test Passed ---
----- post-test output end -----
Interesting Scenario: Invalid inputs for blockTime ... ok (587ms)
running 1 test from ./src/concepts/Tasks/TasksConcept.test.ts
TasksConcept ...
  Operational Principle: tasks are added to a prioritized list and can be marked as complete ...
------- post-test output -------

--- TRACE: Operational Principle ---
Action: createUserTasks({ user: "user:Alice" })
Result: {}
Action: createTask({ owner: "user:Alice", description: "Buy milk" })
Result: { task: "019a1679-a72f-76d0-b922-f3cf066f37a2" }
Action: createTask({ owner: "user:Alice", description: "Walk the dog" })
Result: { task: "019a1679-a77e-7cdd-82d6-4a4bc50fdbd6" }
Action: createTask({ owner: "user:Alice", description: "File taxes" })
Result: { task: "019a1679-a7e0-79d9-805c-74a89b0d6ab2" }
Query: _getTasks({ user: "user:Alice" })
Result: {
  tasks: [
    {
      _id: "019a1679-a72f-76d0-b922-f3cf066f37a2",
      owner: "user:Alice",
      description: "Buy milk",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    },
    {
      _id: "019a1679-a77e-7cdd-82d6-4a4bc50fdbd6",
      owner: "user:Alice",
      description: "Walk the dog",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    },
    {
      _id: "019a1679-a7e0-79d9-805c-74a89b0d6ab2",
      owner: "user:Alice",
      description: "File taxes",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    }
  ]
}
Action: markTaskComplete({ task: "019a1679-a72f-76d0-b922-f3cf066f37a2" })
Result: {}
Query: _getTasks({ user: "user:Alice" }) again
Result: {
  tasks: [
    {
      _id: "019a1679-a72f-76d0-b922-f3cf066f37a2",
      owner: "user:Alice",
      description: "Buy milk",
      dueDate: null,
      estimatedDuration: null,
      status: "DONE"
    },
    {
      _id: "019a1679-a77e-7cdd-82d6-4a4bc50fdbd6",
      owner: "user:Alice",
      description: "Walk the dog",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    },
    {
      _id: "019a1679-a7e0-79d9-805c-74a89b0d6ab2",
      owner: "user:Alice",
      description: "File taxes",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    }
  ]
}
Query: _getRemainingTasks({ user: "user:Alice" })
Result: {
  tasks: [
    {
      _id: "019a1679-a77e-7cdd-82d6-4a4bc50fdbd6",
      owner: "user:Alice",
      description: "Walk the dog",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    },
    {
      _id: "019a1679-a7e0-79d9-805c-74a89b0d6ab2",
      owner: "user:Alice",
      description: "File taxes",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    }
  ]
}
--- END TRACE: Operational Principle ---
----- post-test output end -----
  Operational Principle: tasks are added to a prioritized list and can be marked as complete ... ok (559ms)
  Scenario 1: Reordering and updating tasks ...
------- post-test output -------

--- SCENARIO: Reordering and updating tasks ---
Query: _getTasks for Bob initially
Initial order: [ "Task A", "Task B", "Task C" ]
Action: reorderTasks for Bob with new order [C, A, B]
Result: {}
New order: [ "Task C", "Task A", "Task B" ]
Action: updateTask for 019a1679-a9ca-7804-bd43-6e2bd447ba15
Result: {}
Updated task details confirmed.
----- post-test output end -----
  Scenario 1: Reordering and updating tasks ... ok (545ms)
  Scenario 2: Deleting tasks ...
------- post-test output -------

--- SCENARIO: Deleting tasks ---
Action: deleteTask 019a1679-ab6c-7e49-9db4-8546260553e5
Result: {}
Task D deleted successfully.
Action: deleteAllForUser for user:ToDelete
Result: {}
All tasks for user:ToDelete deleted successfully.
----- post-test output end -----
  Scenario 2: Deleting tasks ... ok (328ms)
  Scenario 3: Handling error conditions and requirements ...
------- post-test output -------

--- SCENARIO: Handling error conditions ---
Action: createTask for non-existent user user:Charlie
Result: {
  error: "No task list found for user user:Charlie. Please create one first."
}
Action: createUserTasks for user:Charlie
Result: {}
Action: createUserTasks for user:Charlie AGAIN
Result: { error: "Task list already exists for user user:Charlie" }
Action: updateTask for non-existent task task:fake
Result: { error: "Task task:fake not found." }
Action: reorderTasks for user:Charlie with invalid task ID
Result: {
  error: "New order list does not contain all or only the user's tasks."
}
Action: reorderTasks for user:Charlie with incomplete list
Result: {
  error: "New order list does not contain all or only the user's tasks."
}
----- post-test output end -----
  Scenario 3: Handling error conditions and requirements ... ok (292ms)
  Scenario 4: Querying empty and fully completed lists ...
------- post-test output -------

--- SCENARIO: Querying empty and fully completed lists ---
Action: createUserTasks for user:David
Query: _getTasks on empty list
Query: _getRemainingTasks on empty list
Empty list queries work as expected.
Action: markTaskComplete for both of David's tasks
Query: _getTasks on fully completed list
Query: _getRemainingTasks on fully completed list
Fully completed list queries work as expected.
----- post-test output end -----
  Scenario 4: Querying empty and fully completed lists ... ok (366ms)
TasksConcept ... ok (2s)
running 1 test from ./src/concepts/UserAccount/UserAccountConcept.test.ts
UserAccount Concept Tests ...
  1. Operational Principle: Register and Log In ...
------- post-test output -------

--- Calling register with args: {"email":"testuser1@example.com","password":"securepassword123","displayName":"Test User One"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of register: {"user":"019a1679-bf50-73f5-8725-d1f713cfdbc8"} ---

--- Calling login with args: {"email":"testuser1@example.com","password":"securepassword123"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of login: {"user":"019a1679-bf50-73f5-8725-d1f713cfdbc8"} ---

--- Calling _getUserProfile with args: {"user":"019a1679-bf50-73f5-8725-d1f713cfdbc8"} ---
--- Result of _getUserProfile: {"displayName":"Test User One","email":"testuser1@example.com"} ---

--- Calling _findUserByEmail with args: {"email":"testuser1@example.com"} ---
--- Result of _findUserByEmail: "019a1679-bf50-73f5-8725-d1f713cfdbc8" ---
----- post-test output end -----
  1. Operational Principle: Register and Log In ... ok (3s)
  2. Error Cases: Duplicate Registration, Incorrect Login ...
------- post-test output -------

--- Calling register with args: {"email":"testuser1@example.com","password":"newpassword","displayName":"Another User"} ---      
--- Result of register: {"error":"Email already in use."} ---

--- Calling login with args: {"email":"testuser1@example.com","password":"wrongpassword"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of login: {"error":"Invalid credentials."} ---

--- Calling login with args: {"email":"nonexistent@example.com","password":"anypass"} ---
--- Result of login: {"error":"Invalid credentials."} ---
----- post-test output end -----
  2. Error Cases: Duplicate Registration, Incorrect Login ... ok (1s)
  3. Profile Update and Verification ...
------- post-test output -------

--- Calling updateProfile with args: {"user":"019a1679-bf50-73f5-8725-d1f713cfdbc8","newDisplayName":"Updated User One Name"} ---
--- Result of updateProfile: {} ---

--- Calling _getUserProfile with args: {"user":"019a1679-bf50-73f5-8725-d1f713cfdbc8"} ---
--- Result of _getUserProfile: {"displayName":"Updated User One Name","email":"testuser1@example.com"} ---

--- Calling updateProfile with args: {"user":"nonexistentUser","newDisplayName":"Ghost"} ---
--- Result of updateProfile: {"error":"User not found."} ---
----- post-test output end -----
  3. Profile Update and Verification ... ok (65ms)
  4. Account Deletion and Re-registration ...
------- post-test output -------

--- Calling register with args: {"email":"testuser2@example.com","password":"anothersecurepass","displayName":"Test User Two"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of register: {"user":"019a1679-d2ec-7e9b-95e1-f895b1995b76"} ---

--- Calling deleteAccount with args: {"user":"019a1679-d2ec-7e9b-95e1-f895b1995b76"} ---
--- Result of deleteAccount: {} ---

--- Calling login with args: {"email":"testuser2@example.com","password":"anothersecurepass"} ---
--- Result of login: {"error":"Invalid credentials."} ---

--- Calling _getUserProfile with args: {"user":"019a1679-d2ec-7e9b-95e1-f895b1995b76"} ---
--- Result of _getUserProfile: null ---

--- Calling deleteAccount with args: {"user":"nonexistentUser"} ---
--- Result of deleteAccount: {"error":"User not found."} ---

--- Calling register with args: {"email":"testuser2@example.com","password":"anothersecurepass","displayName":"Test User Two"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of register: {"user":"019a1679-d8f8-77ce-bad2-66a650c61ca5"} ---
----- post-test output end -----
  4. Account Deletion and Re-registration ... ok (3s)
  5. Querying Non-existent Data ...
------- post-test output -------

--- Calling _getUserProfile with args: {"user":"ghostUser123"} ---
--- Result of _getUserProfile: null ---

--- Calling _findUserByEmail with args: {"email":"unknown@example.com"} ---
--- Result of _findUserByEmail: null ---
----- post-test output end -----
  5. Querying Non-existent Data ... ok (38ms)
UserAccount Concept Tests ... ok (8s)

 ERRORS 

PlannerConcept tests ... Interesting Scenario 2: Replanning mid-day => ./src/concepts/Planner/PlannerConcept.test.ts:160:11      
error: AssertionError: Values are not equal: Replan should result in 2 new tasks


    [Diff] Actual / Expected


-   3
+   2

  throw new AssertionError(message);
        ^
    at assertEquals (https://jsr.io/@std/assert/1.0.7/equals.ts:51:9)
    at file:///C:/Users/kalin/OneDrive - Massachusetts Institute of Technology/Uni/Senior/6104/concept_backend/src/concepts/Planner/PlannerConcept.test.ts:207:5
    at eventLoopTick (ext:core/01_core.js:179:7)
    at async innerWrapped (ext:cli/40_test.js:181:5)
    at async exitSanitizer (ext:cli/40_test.js:97:27)
    at async Object.outerWrapped [as fn] (ext:cli/40_test.js:124:14)
    at async TestContext.step (ext:cli/40_test.js:511:22)
    at async file:///C:/Users/kalin/OneDrive - Massachusetts Institute of Technology/Uni/Senior/6104/concept_backend/src/concepts/Planner/PlannerConcept.test.ts:160:3

    at eventLoopTick (ext:core/01_core.js:179:7)
    at async innerWrapped (ext:cli/40_test.js:181:5)
    at async exitSanitizer (ext:cli/40_test.js:97:27)
    at async Object.outerWrapped [as fn] (ext:cli/40_test.js:124:14)
    at async TestContext.step (ext:cli/40_test.js:511:22)
    at async file:///C:/Users/kalin/OneDrive - Massachusetts Institute of Technology/Uni/Senior/6104/concept_backend/src/concepts/Planner/PlannerConcept.test.ts:160:3

    at async innerWrapped (ext:cli/40_test.js:181:5)
    at async exitSanitizer (ext:cli/40_test.js:97:27)
    at async Object.outerWrapped [as fn] (ext:cli/40_test.js:124:14)
    at async TestContext.step (ext:cli/40_test.js:511:22)
    at async file:///C:/Users/kalin/OneDrive - Massachusetts Institute of Technology/Uni/Senior/6104/concept_backend/src/concepts/Planner/PlannerConcept.test.ts:160:3

    at async Object.outerWrapped [as fn] (ext:cli/40_test.js:124:14)
    at async TestContext.step (ext:cli/40_test.js:511:22)
    at async file:///C:/Users/kalin/OneDrive - Massachusetts Institute of Technology/Uni/Senior/6104/concept_backend/src/concepts/Planner/PlannerConcept.test.ts:160:3

    at async TestContext.step (ext:cli/40_test.js:511:22)
    at async file:///C:/Users/kalin/OneDrive - Massachusetts Institute of Technology/Uni/Senior/6104/concept_backend/src/concepts/Planner/PlannerConcept.test.ts:160:3

    at async file:///C:/Users/kalin/OneDrive - Massachusetts Institute of Technology/Uni/Senior/6104/concept_backend/src/concepts/Planner/PlannerConcept.test.ts:160:3

 FAILURES 
/Planner/PlannerConcept.test.ts:160:3

 FAILURES 
 FAILURES 

PlannerConcept tests ... Interesting Scenario 2: Replanning mid-day => ./src/concepts/Planner/PlannerConcept.test.ts:160:11      

PlannerConcept tests ... Interesting Scenario 2: Replanning mid-day => ./src/concepts/Planner/PlannerConcept.test.ts:160:11      

FAILED | 7 passed (14 steps) | 1 failed (1 step) (25s)

error: Test failed
PS C:\Users\kalin\OneDrive - Massachusetts Institute of Technology\Uni\Senior\6104\concept_backend>














# response:

# problem:

The test suite for `PlannerConcept` is failing on "Interesting Scenario 2: Replanning mid-day". The assertion `assertEquals(scheduled.length, 2, "Replan should result in 2 new tasks")` fails because the actual number of scheduled tasks is 3, not 2.

This bug is caused by a race condition in the test environment. The scenario performs the following steps:
1.  `planDay` is called, scheduling two tasks for the day, with the first one starting at 9:00 AM.
2.  `replan` is called immediately afterward. It uses `new Date()` to get the current time, which is now slightly *after* 9:00 AM.
3.  The `replan` action attempts to delete "remaining" tasks using the condition `plannedStart: { $gte: now }`.
4.  Because the first task's start time (9:00 AM) is now in the past relative to `now`, it is not deleted. Only the second task is deleted.
5.  `replan` then adds the two new tasks to the schedule.
6.  The final state contains the one old task that wasn't deleted plus the two new tasks, resulting in a total of 3 tasks, which causes the assertion to fail.

The core issue is that the definition of a "remaining" task was too narrow. A task that has already started but not yet finished should also be considered "remaining" and thus be eligible for removal during a replan.

# solution:

The solution is to refine the deletion logic within the `replan` method. Instead of deleting tasks based on their start time, we should delete any task that has not yet finished. This can be achieved by changing the query condition from `plannedStart: { $gte: now }` to `plannedEnd: { $gt: now }`.

This change correctly identifies all tasks that are either in progress or scheduled for the future as "remaining" and ensures they are cleared before the new schedule is generated. This makes the `replan` action more robust and aligns its behavior with the test's expectation.

# file: src/planner/PlannerConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Generic parameters for the Planner concept
type User = ID;
type Task = ID;

// Supporting types for actions
type DateTime = Date;

/**
 * Represents a block of time that is unavailable for scheduling.
 */
interface BusySlot {
  start: DateTime;
  end: DateTime;
}

/**
 * Represents a task with its required duration in minutes.
 * This is necessary for the planner to know how much time to allocate.
 */
interface TaskWithDuration {
  id: Task;
  duration: number; // in minutes
}

/**
 * State: A set of ScheduledTasks with an owner, a task, and a planned time window.
 * This represents a task that has been placed onto the user's schedule.
 */
interface ScheduledTask {
  _id: ID;
  owner: User;
  task: Task;
  plannedStart: DateTime;
  plannedEnd: DateTime;
}

const PREFIX = "Planner.";

/**
 * concept: Planner
 * purpose: having a realistic, time-based plan for a user's tasks
 */
export default class PlannerConcept {
  private readonly scheduledTasks: Collection<ScheduledTask>;

  constructor(private readonly db: Db) {
    this.scheduledTasks = db.collection<ScheduledTask>(PREFIX + "scheduledTasks");
  }

  /**
   * Schedules a user's tasks for a full day.
   * effect: creates a new, full-day schedule by assigning tasks to available time slots; returns the first task, if any.
   * This action first clears the user's existing schedule for the day before planning.
   */
  async planDay({ user, tasks, busySlots }: { user: User; tasks: TaskWithDuration[]; busySlots: BusySlot[] }): Promise<{ firstTask?: Task } | { error: string }> {
    await this.clearDay({ user });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0); // 9 AM
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0); // 5 PM

    return this._scheduleTasks(user, tasks, busySlots, startOfDay, endOfDay);
  }

  /**
   * Generates a new plan from the current time forward.
   * effect: discards remaining scheduled tasks and generates a new plan from the current time forward; returns the first task, if any.
   */
  async replan({ user, tasks, busySlots }: { user: User; tasks: TaskWithDuration[]; busySlots: BusySlot[] }): Promise<{ firstTask?: Task } | { error: string }> {
    const now = new Date();
    // Delete all tasks for the user that have not yet finished.
    await this.scheduledTasks.deleteMany({
      owner: user,
      plannedEnd: { $gt: now },
    });

    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0); // 5 PM

    // If it's already past the end of the working day, we can't plan anything.
    if (now >= endOfDay) {
      return {};
    }

    return this._scheduleTasks(user, tasks, busySlots, now, endOfDay);
  }

  /**
   * Removes all scheduled tasks for a given user for the current day.
   * effect: removes all ScheduledTasks for the given user for the current day.
   */
  async clearDay({ user }: { user: User }): Promise<Empty> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    await this.scheduledTasks.deleteMany({
      owner: user,
      plannedStart: { $gte: startOfDay, $lte: endOfDay },
    });

    return {};
  }

  /**
   * Removes all scheduled tasks for a given user.
   * effect: removes all scheduled tasks for the user.
   */
  async deleteAllForUser({ user }: { user: User }): Promise<Empty> {
    await this.scheduledTasks.deleteMany({ owner: user });
    return {};
  }

  /**
   * Finds the task scheduled immediately after a completed task.
   * effect: finds the task scheduled immediately after the completedTask and returns it.
   */
  async getNextTask({ user, completedTask }: { user: User; completedTask: Task }): Promise<{ nextTask?: Task } | { error: string }> {
    const lastTask = await this.scheduledTasks.findOne({ owner: user, task: completedTask });

    if (!lastTask) {
      return { error: "Completed task not found in schedule." };
    }

    const nextTask = await this.scheduledTasks.findOne(
      {
        owner: user,
        plannedStart: { $gte: lastTask.plannedEnd },
      },
      {
        sort: { plannedStart: 1 },
      },
    );

    return { nextTask: nextTask?.task };
  }

  /**
   * Core scheduling logic to fit tasks into available time slots.
   */
  private async _scheduleTasks(user: User, tasks: TaskWithDuration[], busySlots: BusySlot[], planFrom: DateTime, planUntil: DateTime): Promise<{ firstTask?: Task }> {
    const availableSlots = this._getAvailableSlots(planFrom, planUntil, busySlots);
    const newScheduledTasks: ScheduledTask[] = [];

    for (const task of tasks) {
      const taskDurationMillis = task.duration * 60 * 1000;

      for (const slot of availableSlots) {
        const slotDurationMillis = slot.end.getTime() - slot.start.getTime();

        if (slotDurationMillis >= taskDurationMillis) {
          // Found a slot, schedule the task here
          const plannedStart = slot.start;
          const plannedEnd = new Date(plannedStart.getTime() + taskDurationMillis);

          newScheduledTasks.push({
            _id: freshID(),
            owner: user,
            task: task.id,
            plannedStart,
            plannedEnd,
          });

          // Update the slot for the next task
          slot.start = plannedEnd;

          // Break from the slot loop and move to the next task
          break;
        }
      }
    }

    if (newScheduledTasks.length > 0) {
      await this.scheduledTasks.insertMany(newScheduledTasks);
    }

    return { firstTask: newScheduledTasks.length > 0 ? newScheduledTasks[0].task : undefined };
  }

  /**
   * Calculates available time slots within a given window, excluding busy periods.
   */
  private _getAvailableSlots(start: DateTime, end: DateTime, busySlots: BusySlot[]): BusySlot[] {
    const availableSlots: BusySlot[] = [];
    let cursor = start;

    // Sort busy slots to process them chronologically
    const sortedBusy = busySlots.sort((a, b) => a.start.getTime() - b.start.getTime());

    for (const busy of sortedBusy) {
      // If there's a gap before the next busy slot, add it as available
      if (busy.start > cursor) {
        availableSlots.push({ start: cursor, end: busy.start });
      }
      // Move the cursor to the end of the busy slot
      cursor = new Date(Math.max(cursor.getTime(), busy.end.getTime()));
    }

    // If there's time left after the last busy slot, add it
    if (cursor < end) {
      availableSlots.push({ start: cursor, end: end });
    }

    return availableSlots;
  }
}
```