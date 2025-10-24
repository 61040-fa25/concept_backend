---
timestamp: 'Fri Oct 24 2025 08:29:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251024_082929.333fd1d4.md]]'
content_id: b23a2a03f3a051fd81e78ecc51f749cd188371e694ef548c5a7c73fd444a1874
---

# file: src/schedule/ScheduleConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "../utils/types.ts";
import { freshID } from "../utils/database.ts";

// Generic types for this concept
type User = ID;

// Define the shape of external events for the syncCalendar action
interface ExternalEvent {
  startTime: Date;
  endTime: Date;
}

/**
 * State: a set of BusySlots with
 * - an owner User
 * - a startTime DateTime
 * - a endTime DateTime
 */
export interface BusySlot {
  _id: ID;
  owner: User;
  startTime: Date;
  endTime: Date;
}

/**
 * @concept Schedule
 * @purpose To represent a user's non-negotiable, externally-scheduled commitments.
 * @principle The schedule is a read-only reflection of a user's external calendar,
 *            but can also be manually modified.
 */
export default class ScheduleConcept {
  public readonly busySlots: Collection<BusySlot>;

  constructor(db: Db) {
    this.busySlots = db.collection<BusySlot>("schedule.busySlots");
  }

  /**
   * Replaces a user's entire schedule with a new set of busy slots from an external source.
   * @param user The user whose calendar is being synced.
   * @param externalEvents An array of events, each with a start and end time.
   * @requires User ID must be provided.
   * @effects Deletes all existing busy slots for the user and creates new ones based on the provided events.
   */
  async syncCalendar({ user, externalEvents }: { user: User; externalEvents: ExternalEvent[] }): Promise<Empty | { error: string }> {
    if (!user) {
      return { error: "User ID must be provided" };
    }
    // Validate all external events before making any database changes.
    for (const event of externalEvents) {
      if (!(event.startTime instanceof Date) || !(event.endTime instanceof Date) || event.startTime >= event.endTime) {
        return { error: "All events must have a valid startTime that occurs before its endTime." };
      }
    }

    try {
      // Perform deletion and insertion. For atomicity, this would ideally be in a transaction.
      await this.busySlots.deleteMany({ owner: user });

      if (externalEvents.length > 0) {
        const newSlots: BusySlot[] = externalEvents.map((event) => ({
          _id: freshID(),
          owner: user,
          startTime: event.startTime,
          endTime: event.endTime,
        }));
        await this.busySlots.insertMany(newSlots);
      }

      return {};
    } catch (e) {
      return { error: `Failed to sync calendar: ${e.message}` };
    }
  }

  /**
   * Removes all busy slots for a given user.
   * @param user The user whose busy slots will be deleted.
   * @requires User ID must be provided.
   * @effects All busy slots associated with the user are removed from the database.
   */
  async deleteAllForUser({ user }: { user: User }): Promise<Empty | { error: string }> {
    if (!user) {
      return { error: "User ID must be provided" };
    }
    try {
      await this.busySlots.deleteMany({ owner: user });
      return {};
    } catch (e) {
      return { error: `Failed to delete slots for user: ${e.message}` };
    }
  }

  /**
   * Creates a new busy slot for a user, representing a manual block of time.
   * @param user The user for whom to block time.
   * @param startTime The start of the busy period.
   * @param endTime The end of the busy period.
   * @requires User ID, startTime, and endTime must be provided. startTime must be before endTime.
   * @effects A new BusySlot document is created in the database.
   * @returns The ID of the newly created slot.
   */
  async blockTime({ user, startTime, endTime }: { user: User; startTime: Date; endTime: Date }): Promise<{ _id: ID } | { error: string }> {
    if (!user || !startTime || !endTime) {
      return { error: "User, startTime, and endTime are required." };
    }
    if (!(startTime instanceof Date) || !(endTime instanceof Date) || startTime >= endTime) {
      return { error: "startTime must be a valid Date that occurs before endTime." };
    }

    const newSlot: BusySlot = {
      _id: freshID(),
      owner: user,
      startTime,
      endTime,
    };

    try {
      await this.busySlots.insertOne(newSlot);
      return { _id: newSlot._id };
    } catch (e) {
      return { error: `Failed to block time: ${e.message}` };
    }
  }

  /**
   * Retrieves all busy slots for a given user.
   * @param user The user whose slots to retrieve.
   * @requires User ID must be provided.
   * @effects Returns an array of BusySlot documents.
   */
  async _getSlots({ user }: { user: User }): Promise<BusySlot[]> {
    if (!user) {
      // For queries, returning an empty array is often better than throwing an error
      // if the input is invalid, as it simplifies client-side logic.
      return [];
    }
    return await this.busySlots.find({ owner: user }).toArray();
  }
}
```
