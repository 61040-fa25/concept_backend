---
timestamp: 'Fri Oct 31 2025 04:30:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251031_043058.d4a98f21.md]]'
content_id: 211b734035cc374372f0435551dfccb4676d5dc6c4a625152674e498a7257c87
---

# test: Write tests for the implementation of Planner making sure you follow the assignment guidelines:

**Testing concepts**. Your tests should cover the basic behavior of the concept but should also include some more interesting cases. Your tests should use the Deno testing framework and should be programmatic (that is, determining in the code whether they succeeded or failed, and not requiring a human to interpret console messages). They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Some more details about the test cases you should include:

* **Operational principle**. A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example.
* **Interesting scenarios**. Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors.
* **Number required**. For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios.
* **No state setup**. Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state.
* **Saving test execution output**. Save the test execution output by copy-pasting from the console to a markdown file.

Be sure to follow the implementation and the spec. Here is the implementation:

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

    this.scheduledTasks = db.collection<ScheduledTask>(

      PREFIX + "scheduledTasks",

    );

  }

  

  /**

   * Schedules a user's tasks for a full day.

   * effect: creates a new, full-day schedule by assigning tasks to available time slots; returns the first task, if any.

   * This action first clears the user's existing schedule for the day before planning.

   */

  async planDay(

    { user, tasks, busySlots }: {

      user: User;

      tasks: TaskWithDuration[];

      busySlots: BusySlot[];

    },

  ): Promise<{ firstTask?: Task } | { error: string }> {

    await this.clearDay({ user });

  

    const now = new Date();

    const startOfDay = new Date(

      now.getFullYear(),

      now.getMonth(),

      now.getDate(),

      0,

      0,

      0,

    );

    const endOfDay = new Date(

      now.getFullYear(),

      now.getMonth(),

      now.getDate(),

      23,

      59,

      59,

    );

  

    return this._scheduleTasks(user, tasks, busySlots, startOfDay, endOfDay);

  }

  

  /**

   * Generates a new plan from the current time forward.

   * effect: discards remaining scheduled tasks and generates a new plan from the current time forward; returns the first task, if any.

   */

  async replan(

    { user, tasks, busySlots }: {

      user: User;

      tasks: TaskWithDuration[];

      busySlots: BusySlot[];

    },

  ): Promise<{ firstTask?: Task } | { error: string }> {

    const now = new Date();

    // Delete all future tasks for the user

    await this.scheduledTasks.deleteMany({

      owner: user,

      plannedStart: { $gte: now },

    });

  

    const endOfDay = new Date(

      now.getFullYear(),

      now.getMonth(),

      now.getDate(),

      23,

      59,

      59,

    );

  

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

    const startOfDay = new Date(

      now.getFullYear(),

      now.getMonth(),

      now.getDate(),

      0,

      0,

      0,

    );

    const endOfDay = new Date(

      now.getFullYear(),

      now.getMonth(),

      now.getDate(),

      23,

      59,

      59,

    );

  

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

  async getNextTask(

    { user, completedTask }: { user: User; completedTask: Task },

  ): Promise<{ nextTask?: Task } | { error: string }> {

    const lastTask = await this.scheduledTasks.findOne({

      owner: user,

      task: completedTask,

    });

  

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

  private async _scheduleTasks(

    user: User,

    tasks: TaskWithDuration[],

    busySlots: BusySlot[],

    planFrom: DateTime,

    planUntil: DateTime,

  ): Promise<{ firstTask?: Task }> {

    const availableSlots = this._getAvailableSlots(

      planFrom,

      planUntil,

      busySlots,

    );

    const newScheduledTasks: ScheduledTask[] = [];

  

    for (const task of tasks) {

      const taskDurationMillis = task.duration * 60 * 1000;

  

      for (const slot of availableSlots) {

        const slotDurationMillis = slot.end.getTime() - slot.start.getTime();

  

        if (slotDurationMillis >= taskDurationMillis) {

          // Found a slot, schedule the task here

          const plannedStart = slot.start;

          const plannedEnd = new Date(

            plannedStart.getTime() + taskDurationMillis,

          );

  

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

  

    return {

      firstTask: newScheduledTasks.length > 0

        ? newScheduledTasks[0].task

        : undefined,

    };

  }

  

  /**

   * Calculates available time slots within a given window, excluding busy periods.

   */

  private _getAvailableSlots(

    start: DateTime,

    end: DateTime,

    busySlots: BusySlot[],

  ): BusySlot[] {

    const availableSlots: BusySlot[] = [];

    let cursor = start;

  

    // Sort busy slots to process them chronologically

    const sortedBusy = busySlots.sort((a, b) =>

      a.start.getTime() - b.start.getTime()

    );

  

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

Make sure the test file is free of bugs
