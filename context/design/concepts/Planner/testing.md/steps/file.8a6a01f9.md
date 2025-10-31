---
timestamp: 'Fri Oct 31 2025 08:19:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251031_081919.88bd8444.md]]'
content_id: 8a6a01f990897beaf76a2c7807adfa8840f9f60256241508e116a15feb0ec023
---

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
 */
interface TaskWithDuration {
  id: Task;
  duration: number; // in minutes
}

/**
 * State: A set of ScheduledTasks with an owner, a task, and a planned time window.
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
   */
  async planDay({ user, tasks, busySlots, currentTime = new Date() }: { user: User; tasks: TaskWithDuration[]; busySlots: BusySlot[]; currentTime?: DateTime }): Promise<{ firstTask?: Task } | { error: string }> {
    // We clear the day based on the provided time's calendar date
    await this.clearDay({ user, day: currentTime });

    const endOfDay = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), 23, 59, 59);

    // If there's no time left today, we can't schedule anything.
    if (currentTime >= endOfDay) {
      return {};
    }

    return this._scheduleTasks(user, tasks, busySlots, currentTime, endOfDay);
  }

  /**
   * Generates a new plan from the current time forward.
   */
  async replan({ user, tasks, busySlots, currentTime = new Date() }: { user: User; tasks: TaskWithDuration[]; busySlots: BusySlot[]; currentTime?: DateTime }): Promise<{ firstTask?: Task } | { error: string }> {
    // Delete all future tasks for the user relative to the given time
    await this.scheduledTasks.deleteMany({
      owner: user,
      plannedStart: { $gte: currentTime },
    });

    const endOfDay = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), 23, 59, 59);

    if (currentTime >= endOfDay) {
      return {};
    }

    return this._scheduleTasks(user, tasks, busySlots, currentTime, endOfDay);
  }

  /**
   * Removes all scheduled tasks for a given user for a given day.
   */
  async clearDay({ user, day = new Date() }: { user: User; day?: DateTime }): Promise<Empty> {
    const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
    const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);

    await this.scheduledTasks.deleteMany({
      owner: user,
      plannedStart: { $gte: startOfDay, $lte: endOfDay },
    });

    return {};
  }

  /**
   * Removes all scheduled tasks for a given user.
   */
  async deleteAllForUser({ user }: { user: User }): Promise<Empty> {
    await this.scheduledTasks.deleteMany({ owner: user });
    return {};
  }

  /**
   * Finds the task scheduled immediately after a completed task.
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
          const plannedStart = slot.start;
          const plannedEnd = new Date(plannedStart.getTime() + taskDurationMillis);

          newScheduledTasks.push({
            _id: freshID(),
            owner: user,
            task: task.id,
            plannedStart,
            plannedEnd,
          });

          slot.start = plannedEnd;
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

    const sortedBusy = busySlots.sort((a, b) => a.start.getTime() - b.start.getTime());

    for (const busy of sortedBusy) {
      if (busy.start > cursor) {
        availableSlots.push({ start: cursor, end: busy.start });
      }
      cursor = new Date(Math.max(cursor.getTime(), busy.end.getTime()));
    }

    if (cursor < end) {
      availableSlots.push({ start: cursor, end: end });
    }

    return availableSlots;
  }
}
```
