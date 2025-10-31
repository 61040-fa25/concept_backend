---
timestamp: 'Fri Oct 31 2025 08:37:55 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251031_083755.f7ca65a2.md]]'
content_id: 88a459a3825a5f1007f9ac3842ee7f796011cd9320b7d2661b6d7ca1e09e54c9
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
  // Dependency for providing the current time. Makes the concept testable.
  private readonly timeProvider: () => Date;

  constructor(db: Db, timeProvider: () => Date = () => new Date()) {
    this.scheduledTasks = db.collection<ScheduledTask>(PREFIX + "scheduledTasks");
    this.timeProvider = timeProvider;
  }

  /**
   * Schedules a user's tasks for a full day.
   * effect: creates a new, full-day schedule by assigning tasks to available time slots; returns the first task, if any.
   * This action first clears the user's existing schedule for the day before planning.
   */
  async planDay({ user, tasks, busySlots }: { user: User; tasks: TaskWithDuration[]; busySlots: BusySlot[] }): Promise<{ firstTask?: Task } | { error: string }> {
    await this.clearDay({ user });

    const now = this.timeProvider();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const planFrom = now > startOfToday ? now : startOfToday;

    if (planFrom >= endOfToday) {
      return {};
    }

    return this._scheduleTasks(user, tasks, busySlots, planFrom, endOfToday);
  }

  /**
   * Generates a new plan from the current time forward.
   * effect: discards remaining scheduled tasks and generates a new plan from the current time forward; returns the first task, if any.
   */
  async replan({ user, tasks, busySlots }: { user: User; tasks: TaskWithDuration[]; busySlots: BusySlot[] }): Promise<{ firstTask?: Task } | { error:string }> {
    const now = this.timeProvider();
    await this.scheduledTasks.deleteMany({
      owner: user,
      plannedStart: { $gte: now },
    });

    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

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
    const now = this.timeProvider();
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
