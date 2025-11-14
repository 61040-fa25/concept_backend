---
timestamp: 'Wed Oct 15 2025 16:41:22 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_164122.10632628.md]]'
content_id: 29ceacbaec59f6dc32d20e5117d374b2de9f0434be3cdfd47b5077e731e6d4ca
---

# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "ScheduleTime" + ".";

// Generic types of this concept
type User = ID;
type TimeStamp = number; // Represents time as a Unix timestamp (milliseconds)
type TaskId = string; // Unique ID for a task

/**
 * a set of TimeBlocks with
 *   a timeBlockId String
 *   an owner User
 *   a start TimeStamp
 *   an end TimeStamp
 *   a taskIdSet set of Strings
 */
interface TimeBlockDocument {
  _id: ID; // Mapped from timeBlockId
  owner: User;
  start: TimeStamp;
  end: TimeStamp;
  taskIdSet: TaskId[];
}

export default class ScheduleTimeConcept {
  timeBlocks: Collection<TimeBlockDocument>;

  constructor(private readonly db: Db) {
    this.timeBlocks = this.db.collection(PREFIX + "timeBlocks");
  }

  /**
   * _getUserSchedule (owner: User): (timeBlock: TimeBlockDocument)[]
   *
   * **requires** exists at least one time block under this owner
   *
   * **effects** returns a set of all time blocks under this owner with end greater than the current time
   */
  async _getUserSchedule({ owner }: { owner: User }): Promise<
    Array<{ timeBlock: TimeBlockDocument }> | { error: string }
  > {
    const currentTime = Date.now();
    const blocks = await this.timeBlocks.find({
      owner,
      end: { $gte: currentTime }, // Filter for time blocks whose end is in the future
    }).toArray();

    if (blocks.length === 0) {
      return { error: `No future time blocks found for owner ${owner}` };
    }

    return blocks.map((block) => ({ timeBlock: block }));
  }

  /**
   * addTimeBlock (owner: User, start: TimeStamp, end: TimeStamp): Empty
   *
   * **requires** no time block already exists with this owner, start, and end
   *
   * **effects** create a new time block $b$ with this owner, start, and end, and empty taskIdSet
   */
  async addTimeBlock(
    { owner, start, end }: { owner: User; start: TimeStamp; end: TimeStamp },
  ): Promise<Empty | { error: string }> {
    // Check if a time block with the exact owner, start, and end already exists
    const existingBlock = await this.timeBlocks.findOne({ owner, start, end });
    if (existingBlock) {
      return {
        error:
          `Time block already exists for owner ${owner} from ${start} to ${end}`,
      };
    }

    const newTimeBlock: TimeBlockDocument = {
      _id: freshID() as ID,
      owner,
      start,
      end,
      taskIdSet: [],
    };

    await this.timeBlocks.insertOne(newTimeBlock);
    return {};
  }

  /**
   * assignTimeBlock (owner: User, taskId: String, start: TimeStamp, end: TimeStamp): (timeBlockId: String)
   *
   * **requires** if exists time block $b$ with matching (owner, start, end), then taskId is not in b.taskIdSet
   *
   * **effects** if b doesn't exist, create it with owner, start, and end (same logic as addTimeBlock);
   *             add taskId to b.taskIdSet;
   *             return b._id as timeBlockId;
   */
  async assignTimeBlock(
    {
      owner,
      taskId,
      start,
      end,
    }: { owner: User; taskId: TaskId; start: TimeStamp; end: TimeStamp },
  ): Promise<{ timeBlockId: ID } | { error: string }> {
    let block = await this.timeBlocks.findOne({ owner, start, end });

    if (block) {
      // If block exists, check if taskId is already in taskIdSet
      if (block.taskIdSet.includes(taskId)) {
        return {
          error:
            `Task ${taskId} is already assigned to time block ${block._id} for owner ${owner}`,
        };
      }
      // Add taskId to existing block
      await this.timeBlocks.updateOne(
        { _id: block._id },
        { $addToSet: { taskIdSet: taskId } }, // $addToSet ensures uniqueness
      );
      // Retrieve the updated block to ensure we return the current state
      block = await this.timeBlocks.findOne({ _id: block._id });
    } else {
      // If block doesn't exist, create it
      const newTimeBlock: TimeBlockDocument = {
        _id: freshID() as ID,
        owner,
        start,
        end,
        taskIdSet: [taskId],
      };
      await this.timeBlocks.insertOne(newTimeBlock);
      block = newTimeBlock; // Use the newly created block
    }

    if (!block) {
      // This case should ideally not happen if insertOne/findOne works as expected
      return { error: "Failed to find or create time block" };
    }

    return { timeBlockId: block._id };
  }

  /**
   * removeTask (owner: User, taskId: String, timeBlockId: String): Empty
   *
   * **requires** exists a time block $b$ with matching owner and timeBlockId;
   *              taskId exists in b.taskIdSet;
   *
   * **effects** remove taskId from b.taskIdSet
   */
  async removeTask(
    { owner, taskId, timeBlockId }: {
      owner: User;
      taskId: TaskId;
      timeBlockId: ID;
    },
  ): Promise<Empty | { error: string }> {
    const block = await this.timeBlocks.findOne({
      _id: timeBlockId,
      owner,
    });

    if (!block) {
      return {
        error:
          `No time block found with ID ${timeBlockId} for owner ${owner}`,
      };
    }

    if (!block.taskIdSet.includes(taskId)) {
      return {
        error:
          `Task ${taskId} not found in time block ${timeBlockId} for owner ${owner}`,
      };
    }

    await this.timeBlocks.updateOne(
      { _id: timeBlockId },
      { $pull: { taskIdSet: taskId } },
    );

    return {};
  }
}
```
