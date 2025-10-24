import { assert, assertEquals, assertExists } from "jsr:@std/assert";
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

  /**
   * Test the operational principle: Plan a user's day with tasks around a busy schedule,
   * then retrieve the next task after one is completed.
   */
  await t.step(
    "Operational Principle: Plan a day with tasks around busy slots and get next task",
    async () => {
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
          start: new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            11,
            0,
            0,
          ), // 11:00 AM
          end: new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            12,
            0,
            0,
          ), // 12:00 PM
        },
      ];

      // Act 1: Plan the day for Alice
      console.log("Action: planDay", {
        user: userAlice,
        tasks: tasksToPlan.length,
        busySlots: busySlots.length,
      });
      const planResult = await planner.planDay({
        user: userAlice,
        tasks: tasksToPlan,
        busySlots,
      });
      console.log("Result:", planResult);

      // Assert 1: The first task is returned, and tasks are scheduled correctly around the meeting.
      assert("firstTask" in planResult, "planDay should not return an error");
      assertEquals(planResult.firstTask, task1);

      const scheduled = await db.collection("Planner.scheduledTasks").find({
        owner: userAlice,
      }).sort({ plannedStart: 1 }).toArray();
      assertEquals(scheduled.length, 3);
      // The implementation fills earlier gaps first.
      // Expected schedule: task1 (9-10), task3 (10-10:30), task2 (12-13:30)
      assertEquals(scheduled[0].task, task1, "Task 1 should be first");
      assertEquals(
        scheduled[1].task,
        task3,
        "Task 3 should be second, filling the gap before the meeting",
      );
      assertEquals(
        scheduled[2].task,
        task2,
        "Task 2 should be after the meeting",
      );

      // Act 2: Get the next task after completing task 1.
      console.log("Action: getNextTask", {
        user: userAlice,
        completedTask: task1,
      });
      const nextTaskResult = await planner.getNextTask({
        user: userAlice,
        completedTask: task1,
      });
      console.log("Result:", nextTaskResult);

      // Assert 2: The next chronologically scheduled task (task3) should be returned.
      assert(
        "nextTask" in nextTaskResult,
        "getNextTask should not return an error",
      );
      assertEquals(nextTaskResult.nextTask, task3);
    },
  );

  /**
   * Interesting Scenario 1: Attempt to schedule more tasks than can fit in a single workday.
   */
  await t.step(
    "Interesting Scenario 1: Not enough time in the day to schedule all tasks",
    async () => {
      console.log("\n--- Testing Scenario 1: Not enough time ---");
      // Arrange: Alice has tasks that total more than the 8-hour workday (9am-5pm).
      const tasksToPlan: TaskWithDuration[] = [
        { id: task1, duration: 4 * 60 }, // 4 hours
        { id: task2, duration: 4 * 60 }, // 4 hours
        { id: task3, duration: 1 }, // 1 minute (this one should not fit)
      ];

      // Act
      console.log("Action: planDay", {
        user: userAlice,
        tasks: tasksToPlan.length,
        busySlots: 0,
      });
      const planResult = await planner.planDay({
        user: userAlice,
        tasks: tasksToPlan,
        busySlots: [],
      });
      console.log("Result:", planResult);

      // Assert: Only the first two tasks that fit should be scheduled.
      assert("firstTask" in planResult, "planDay should succeed");
      assertEquals(planResult.firstTask, task1);
      const scheduled = await db.collection("Planner.scheduledTasks").find({
        owner: userAlice,
      }).toArray();
      assertEquals(scheduled.length, 2);
      assert(scheduled.some((t) => t.task === task1));
      assert(scheduled.some((t) => t.task === task2));
      assert(
        !scheduled.some((t) => t.task === task3),
        "The third task should not be scheduled",
      );
    },
  );

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
    console.log("Action: planDay (initial)", {
      user: userAlice,
      tasks: initialTasks.length,
      busySlots: 0,
    });
    await planner.planDay({
      user: userAlice,
      tasks: initialTasks,
      busySlots: [],
    });

    let scheduled = await db.collection("Planner.scheduledTasks").find({
      owner: userAlice,
    }).toArray();
    assertEquals(scheduled.length, 2, "Initial plan should have 2 tasks");

    // Act: Now, replan with a different set of tasks.
    const newTasks: TaskWithDuration[] = [
      { id: task3, duration: 30 },
      { id: task4, duration: 30 },
    ];
    console.log("Action: replan", {
      user: userAlice,
      tasks: newTasks.length,
      busySlots: 0,
    });
    const replanResult = await planner.replan({
      user: userAlice,
      tasks: newTasks,
      busySlots: [],
    });
    console.log("Result:", replanResult);

    // Assert: The old tasks are gone, and the new ones are scheduled from now onwards.
    assert("firstTask" in replanResult, "replan should succeed");
    assertEquals(replanResult.firstTask, task3);

    scheduled = await db.collection("Planner.scheduledTasks").find({
      owner: userAlice,
    }).toArray();
    assertEquals(scheduled.length, 2, "Replan should result in 2 new tasks");
    assert(
      !scheduled.some((t) => t.task === task1 || t.task === task2),
      "Old tasks should be removed",
    );
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

    assertEquals(
      await db.collection("Planner.scheduledTasks").countDocuments({
        owner: userAlice,
      }),
      1,
    );
    assertEquals(
      await db.collection("Planner.scheduledTasks").countDocuments({
        owner: userBob,
      }),
      1,
    );

    // Act 1: Clear Alice's day.
    console.log("Action: clearDay", { user: userAlice });
    const clearDayResult = await planner.clearDay({ user: userAlice });
    console.log("Result:", clearDayResult);

    // Assert 1: Alice's tasks for the day are gone, Bob's are not.
    assertEquals(
      await db.collection("Planner.scheduledTasks").countDocuments({
        owner: userAlice,
      }),
      0,
    );
    assertEquals(
      await db.collection("Planner.scheduledTasks").countDocuments({
        owner: userBob,
      }),
      1,
      "Bob's tasks should remain",
    );

    // Act 2: Delete ALL of Bob's tasks (not just for today).
    console.log("Action: deleteAllForUser", { user: userBob });
    const deleteAllUserResult = await planner.deleteAllForUser({
      user: userBob,
    });
    console.log("Result:", deleteAllUserResult);

    // Assert 2: Bob's tasks are all gone.
    assertEquals(
      await db.collection("Planner.scheduledTasks").countDocuments({
        owner: userBob,
      }),
      0,
    );
  });

  /**
   * Interesting Scenario 4: Edge cases for getNextTask (last task and non-existent task).
   */
  await t.step(
    "Interesting Scenario 4: Get next task with no task following",
    async () => {
      console.log("\n--- Testing Scenario 4: Get next task edge cases ---");
      // Arrange: Plan a day with just one task.
      const tasks = [{ id: task1, duration: 60 }];
      await planner.planDay({ user: userAlice, tasks, busySlots: [] });

      // Act 1: Get next task after the only task on the schedule.
      console.log("Action: getNextTask (last task)", {
        user: userAlice,
        completedTask: task1,
      });
      const result = await planner.getNextTask({
        user: userAlice,
        completedTask: task1,
      });
      console.log("Result:", result);

      // Assert 1: Should return successfully but with an undefined nextTask.
      assert("nextTask" in result, "getNextTask should not return an error");
      assertEquals(result.nextTask, undefined, "There should be no next task");

      // Act 2: Get next task for a task that isn't scheduled.
      console.log("Action: getNextTask (non-existent task)", {
        user: userAlice,
        completedTask: task2,
      });
      const errorResult = await planner.getNextTask({
        user: userAlice,
        completedTask: task2,
      });
      console.log("Result:", errorResult);

      // Assert 2: Should return an error object.
      assert(
        "error" in errorResult,
        "Should return an error for a non-existent task",
      );
      assertExists(errorResult.error);
    },
  );

  // Cleanup: close the database client connection
  await client.close();
});
