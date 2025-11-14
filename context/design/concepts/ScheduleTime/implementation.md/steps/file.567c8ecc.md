---
timestamp: 'Wed Oct 15 2025 16:23:08 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_162308.71d7d293.md]]'
content_id: 567c8eccaa3f5750308e4333e066c16eca7b78cb3bcae843adaf7dc0ed475869
---

# file: src/concepts/ScheduleTimeConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "ScheduleTime" + ".";

// Generic types of this concept
type User = ID;
type TimeStamp = Date; // Interpreting TimeStamp as Date for implementation

/**
 * Interface representing a TimeBlock document in MongoDB.
 * Corresponds to:
 * a set of TimeBlocks with
 *   a timeBlockId String
 *   an owner User
 *   a start TimeStamp
 *   an end TimeStamp
 *   a taskIdSet set of Strings
 */
interface TimeBlockDoc {
  _id: ID; // Corresponds to timeBlockId
  owner: User;
  start: TimeStamp;
  end: TimeStamp;
  taskIdSet: string[]; // Stored as an array, conceptually a set of task IDs
}

export default class ScheduleTimeConcept {
  timeBlocks: Collection<TimeBlockDoc>;

  constructor(private readonly db: Db) {
    this.timeBlocks = this.db.collection(PREFIX + "timeBlocks");
  }

  /**
   * getUserSchedule (owner: User): (timeBlockTable: set of TimeBlocks)
   *
   * **requires**:
   *   exists at least one time block under this owner
   *
   * **effect**:
   *   return a set of all time blocks under this owner with end before the end of the day
   */
  async getUserSchedule({ owner }: { owner: User }): Promise<{ timeBlockTable?: TimeBlockDoc[] } | { error: string }> {
    // Calculate the start of the next day to filter for time blocks ending before the current day's end
    const now = new Date();
    const endOfCurrentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

    const timeBlocks = await this.timeBlocks.find({
      owner,
      end: { $lt: endOfCurrentDay }, // end must be strictly before the start of the next day
    }).toArray();

    // Adhere to the 'requires' clause: "exists at least one time block under this owner"
    if (timeBlocks.length === 0) {
      return { error: `No time blocks found for user ${owner} ending before the end of today.` };
    }

    return { timeBlockTable: timeBlocks };
  }

  /**
   * addTimeBlock (owner: User, start: TimeStamp, end: TimeStamp): Empty
   *
   * **requires**:
   *   no time block already exists with this owner, start, and end
   *
   * **effect**:
   *   create a new time block $b$ with this owner, start, and end, and empty taskIdSet
   */
  async addTimeBlock({ owner, start, end }: { owner: User; start: TimeStamp; end: TimeStamp }): Promise<Empty | { error: string }> {
    // Basic validation for timestamps
    if (!(start instanceof Date) || isNaN(start.getTime())) {
      return { error: "Invalid 'start' timestamp. Must be a valid Date object." };
    }
    if (!(end instanceof Date) || isNaN(end.getTime())) {
      return { error: "Invalid 'end' timestamp. Must be a valid Date object." };
    }
    if (start >= end) {
      return { error: "'start' timestamp must be strictly before 'end' timestamp." };
    }

    // Check 'requires' condition: no time block already exists with this owner, start, and end
    const existingBlock = await this.timeBlocks.findOne({ owner, start, end });
    if (existingBlock) {
      return { error: `Time block already exists for owner ${owner} from ${start.toISOString()} to ${end.toISOString()}.` };
    }

    const newTimeBlock: TimeBlockDoc = {
      _id: freshID(), // Generate a unique ID for the new time block
      owner,
      start,
      end,
      taskIdSet: [], // Initialize with an empty set of task IDs
    };

    await this.timeBlocks.insertOne(newTimeBlock);
    return {};
  }

  /**
   * assignTimeBlock (owner: User, taskId: String, start: TimeStamp, end: TimeStamp): (timeBlockId: String)
   *
   * **requires**:
   *   if exists time block $b$ with matching (owner, start, end), then taskId is not in b.taskIdSet
   *
   * **effect**:
   *   if b doesn't exist, create it with owner, start, and end (same logic as addTimeBlock);
   *   add taskId to b.taskIdSet;
   *   return b.timeBlockId;
   */
  async assignTimeBlock({ owner, taskId, start, end }: { owner: User; taskId: string; start: TimeStamp; end: TimeStamp }): Promise<{ timeBlockId?: ID } | { error: string }> {
    // Basic validation for timestamps
    if (!(start instanceof Date) || isNaN(start.getTime())) {
      return { error: "Invalid 'start' timestamp. Must be a valid Date object." };
    }
    if (!(end instanceof Date) || isNaN(end.getTime())) {
      return { error: "Invalid 'end' timestamp. Must be a valid Date object." };
    }
    if (start >= end) {
      return { error: "'start' timestamp must be strictly before 'end' timestamp." };
    }

    let timeBlock = await this.timeBlocks.findOne({ owner, start, end });

    if (timeBlock) {
      // Check 'requires' condition: taskId is not already in b.taskIdSet
      if (timeBlock.taskIdSet.includes(taskId)) {
        return { error: `Task ID '${taskId}' is already assigned to time block ${timeBlock._id}.` };
      }

      // Add taskId to the existing time block's taskIdSet
      const updateResult = await this.timeBlocks.updateOne(
        { _id: timeBlock._id },
        { $addToSet: { taskIdSet: taskId } } // $addToSet ensures unique insertion
      );

      if (updateResult.modifiedCount === 0) {
        return { error: "Failed to update existing time block with the new task. Possible concurrent modification." };
      }
      return { timeBlockId: timeBlock._id };

    } else {
      // Time block does not exist, create a new one as per 'effect'
      const newTimeBlock: TimeBlockDoc = {
        _id: freshID(),
        owner,
        start,
        end,
        taskIdSet: [taskId], // Initialize with the given taskId
      };

      await this.timeBlocks.insertOne(newTimeBlock);
      return { timeBlockId: newTimeBlock._id };
    }
  }

  /**
   * removeTask (owner: User, taskId: String, timeBlockId: String): Empty
   *
   * **requires**:
   *   exists a time block $b$ with matching owner and timeBlockId;
   *   taskId exists in b.taskIdSet;
   *
   * **effect**:
   *   remove taskId from b.taskIdSet
   */
  async removeTask({ owner, taskId, timeBlockId }: { owner: User; taskId: string; timeBlockId: ID }): Promise<Empty | { error: string }> {
    // Check 'requires' condition: time block exists for owner and timeBlockId
    const timeBlock = await this.timeBlocks.findOne({ _id: timeBlockId, owner });

    if (!timeBlock) {
      return { error: `Time block with ID '${timeBlockId}' not found for owner '${owner}'.` };
    }

    // Check 'requires' condition: taskId exists in b.taskIdSet
    if (!timeBlock.taskIdSet.includes(taskId)) {
      return { error: `Task ID '${taskId}' not found in time block '${timeBlockId}'.` };
    }

    // Remove taskId from the time block's taskIdSet
    const updateResult = await this.timeBlocks.updateOne(
      { _id: timeBlockId },
      { $pull: { taskIdSet: taskId } }
    );

    if (updateResult.modifiedCount === 0) {
      return { error: `Failed to remove task ID '${taskId}' from time block '${timeBlockId}'. Possible concurrent modification.` };
    }

    return {};
  }
}
```
