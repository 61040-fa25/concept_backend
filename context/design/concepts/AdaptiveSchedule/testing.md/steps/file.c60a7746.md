---
timestamp: 'Sat Oct 18 2025 18:47:02 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_184702.161ae342.md]]'
content_id: c60a774619fdb883b5ae533380f51944a6b0a544eb33137f9a948ed8fc14bfdd
---

# file: src/concepts/AdaptiveSchedule/AdaptiveSchedule.ts

```typescript
import { Collection, Db, ObjectId } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { GeminiLLM, Config as GeminiConfig } from "@utils/GeminiLLM.ts"; // Assuming GeminiLLM is in @utils

// Declare collection prefix, use concept name
const PREFIX = "AdaptiveSchedule" + ".";

// Generic types of this concept
type User = ID;

/**
 * a set of AdaptiveBlocks with
 *   a timeBlockId String
 *   an owner User
 *   a start TimeStamp
 *   a end TimeStamp
 *   a taskIdSet set of Strings
 */
interface AdaptiveBlock {
  _id: ID; // Maps to timeBlockId
  owner: User;
  start: Date; // TimeStamp maps to Date in TS
  end: Date; // TimeStamp maps to Date in TS
  taskIdSet: ID[];
}

/**
 * a set of droppedTasks with
 *   a taskId String
 *   an owner User
 *   a reason String
 */
interface DroppedTask {
  _id: ID; // Unique ID for the document, distinct from taskId if taskId can be re-dropped
  taskId: ID;
  owner: User;
  reason: string;
}

/**
 * Expected JSON structure from LLM for adaptive schedule proposals.
 */
interface LlmLikelyResponse {
  analysis?: string; // Optional analysis from LLM
  adaptiveBlocks: Array<{
    start: string; // ISO string for Date
    end: string; // ISO string for Date
    taskIds: ID[];
  }>;
  droppedTaskIds: ID[]; // Renamed to droppedTaskIds to match typical JSON lists
}

export default class AdaptiveScheduleConcept {
  adaptiveBlocks: Collection<AdaptiveBlock>;
  droppedTasks: Collection<DroppedTask>;
  private llm: GeminiLLM;

  constructor(private readonly db: Db, llmConfig: GeminiConfig) {
    this.adaptiveBlocks = this.db.collection(PREFIX + "adaptiveBlocks");
    this.droppedTasks = this.db.collection(PREFIX + "droppedTasks");
    this.llm = new GeminiLLM(llmConfig);

    // Ensure indexes for efficient lookup and uniqueness checks
    // Unique index for (owner, start, end) to enforce the invariant "only one adaptive block exists given (owner, start, end)"
    this.adaptiveBlocks.createIndex({ owner: 1, start: 1, end: 1 }, { unique: true });
    // Index for owner for efficient querying
    this.adaptiveBlocks.createIndex({ owner: 1 });
    // Unique index for (taskId, owner) in droppedTasks to prevent multiple entries for the same dropped task for a user
    this.droppedTasks.createIndex({ taskId: 1, owner: 1 }, { unique: true });
  }

  /**
   * _getAdaptiveSchedule (owner: User): (adaptiveBlockTable: set of AdaptiveBlocks)
   *
   * **requires** exists at least one adaptive block under this user
   *
   * **effect** return a set of all adaptive blocks under this owner with end before the end of the day
   */
  async _getAdaptiveSchedule(
    { owner }: { owner: User },
  ): Promise<{ adaptiveBlockTable: AdaptiveBlock[] } | { error: string }> {
    try {
      // The requirement "end before the end of the day" is ambiguous without a specific date input
      // or a definition of "the day". For this implementation, we will fetch all blocks for the owner.
      // In a real application, a 'referenceDate' parameter would be needed.
      const blocks = await this.adaptiveBlocks.find({ owner }).toArray();

      // The `requires` clause implies an error if no blocks are found.
      if (blocks.length === 0) {
        return { error: `No adaptive blocks found for user ${owner}` };
      }
      return { adaptiveBlockTable: blocks };
    } catch (error) {
      console.error(`Error in _getAdaptiveSchedule: ${error.message}`);
      return { error: `Failed to retrieve adaptive schedule: ${error.message}` };
    }
  }

  /**
   * _getDroppedTask(owner: User): (droppedTaskSet: set of droppedTasks)
   *
   * **requires** exists at least one dropped task with this owner
   *
   * **effect** returns all dropped tasks for the user (tasks that couldn't be scheduled due to insufficient time)
   */
  async _getDroppedTask(
    { owner }: { owner: User },
  ): Promise<{ droppedTaskSet: DroppedTask[] } | { error: string }> {
    try {
      const tasks = await this.droppedTasks.find({ owner }).toArray();

      // The `requires` clause implies an error if no tasks are found.
      if (tasks.length === 0) {
        return { error: `No dropped tasks found for user ${owner}` };
      }
      return { droppedTaskSet: tasks };
    } catch (error) {
      console.error(`Error in _getDroppedTask: ${error.message}`);
      return { error: `Failed to retrieve dropped tasks: ${error.message}` };
    }
  }

  /**
   * addTimeBlock (owner: User, start: TimeStamp, end: TimeStamp) : (timeBlockId: String)
   *
   * **requires**
   *   start and end are valid TimeStamps;
   *   start is before end;
   *   no adaptive time block exists with this owner, start, and end;
   *
   * **effect**
   *   create a new adaptive time block $b$ with this owner, start, and end;
   *   assign $b$ an empty taskIdSet;
   *   return b.timeBlockId;
   */
  async addTimeBlock(
    { owner, start, end }: { owner: User; start: Date; end: Date },
  ): Promise<{ timeBlockId: ID } | { error: string }> {
    if (!(start instanceof Date) || isNaN(start.getTime())) {
      return { error: "Invalid 'start' TimeStamp. Must be a valid Date object." };
    }
    if (!(end instanceof Date) || isNaN(end.getTime())) {
      return { error: "Invalid 'end' TimeStamp. Must be a valid Date object." };
    }
    if (start.getTime() >= end.getTime()) {
      return { error: "'start' TimeStamp must be strictly before 'end' TimeStamp." };
    }

    try {
      // Check for existing block with the same (owner, start, end)
      const existingBlock = await this.adaptiveBlocks.findOne({ owner, start, end });
      if (existingBlock) {
        return {
          error: "An adaptive time block with this owner, start, and end already exists.",
        };
      }

      const newBlockId = freshID();
      const newBlock: AdaptiveBlock = {
        _id: newBlockId,
        owner,
        start,
        end,
        taskIdSet: [], // Initialize with an empty taskIdSet
      };

      await this.adaptiveBlocks.insertOne(newBlock);
      return { timeBlockId: newBlockId };
    } catch (error) {
      console.error(`Error in addTimeBlock: ${error.message}`);
      return { error: `Failed to add time block: ${error.message}` };
    }
  }

  /**
   * assignAdaptiveSchedule (owner: User, taskId: String, start: TimeStamp, end: TimeStamp): (timeBlockId: String)
   *
   * **requires**
   *   if exists adaptive block $b$ with matching (owner, start, end), then taskId is not in b.taskIdSet;
   *
   * **effect**
   *   if b doesn't exist, create it with owner, start, and end (same logic as addTimeBlock);
   *   add taskId to this adaptive block's taskIdSet;
   *   return b.timeBlockId;
   */
  async assignAdaptiveSchedule(
    { owner, taskId, start, end }: { owner: User; taskId: ID; start: Date; end: Date },
  ): Promise<{ timeBlockId: ID } | { error: string }> {
    if (!(start instanceof Date) || isNaN(start.getTime())) {
      return { error: "Invalid 'start' TimeStamp. Must be a valid Date object." };
    }
    if (!(end instanceof Date) || isNaN(end.getTime())) {
      return { error: "Invalid 'end' TimeStamp. Must be a valid Date object." };
    }
    if (start.getTime() >= end.getTime()) {
      return { error: "'start' TimeStamp must be strictly before 'end' TimeStamp." };
    }

    try {
      // Attempt to find an existing block
      const existingBlock = await this.adaptiveBlocks.findOne({ owner, start, end });

      if (existingBlock) {
        // If block exists, check if taskId is already present
        if (existingBlock.taskIdSet.includes(taskId)) {
          return {
            error: `Task ${taskId} is already assigned to the block with ID ${existingBlock._id}.`,
          };
        }

        // Add taskId to the existing block's taskIdSet
        const updateResult = await this.adaptiveBlocks.updateOne(
          { _id: existingBlock._id },
          { $addToSet: { taskIdSet: taskId } }, // $addToSet ensures uniqueness within the array
        );

        if (updateResult.matchedCount === 0) {
          // This should ideally not happen if existingBlock was found, but a safety check.
          return { error: "Failed to find block for update despite initial find." };
        }
        return { timeBlockId: existingBlock._id };
      } else {
        // If no block exists, create a new one
        const newBlockId = freshID();
        const newBlock: AdaptiveBlock = {
          _id: newBlockId,
          owner,
          start,
          end,
          taskIdSet: [taskId], // Initialize with the given taskId
        };

        await this.adaptiveBlocks.insertOne(newBlock);
        return { timeBlockId: newBlockId };
      }
    } catch (error) {
      console.error(`Error in assignAdaptiveSchedule: ${error.message}`);
      return { error: `Failed to assign adaptive schedule: ${error.message}` };
    }
  }

  /**
   * async requestAdaptiveScheduleAI (owner: User, contexted_prompt: String): (adaptiveBlockTable: set of AdaptiveBlocks, droppedTaskSet: set of droppedTasks)
   *
   * **effect**
   *   send the structured contexted_prompt to the llm;
   *   llm returns a structured JSON response including:
   *     - adaptiveBlocks (with start/end times and assigned task ids)
   *     - droppedTaskIds (tasks removed due to insufficient time)
   *       - each droppedTask has a task id and a reason for dropping (LLM provides taskId only, reason is internal to LLM)
   *   for each adaptive block in llm's returned adaptiveBlocks, assign the task id to the corresponding adaptive block with matching (owner, start, end) using the same logic as assignAdaptiveSchedule;
   *   for each dropped task in droppedTaskIds, add to state with (taskId, owner, reason)
   *   return the set of all AdaptiveBlocks and the set of all droppedTasks under this owner;
   */
  async requestAdaptiveScheduleAI(
    { owner, contexted_prompt }: { owner: User; contexted_prompt: string },
  ): Promise<{ adaptiveBlockTable: AdaptiveBlock[]; droppedTaskSet: DroppedTask[] } | { error: string }> {
    try {
      const llmResponseText = await this.llm.executeLLM(contexted_prompt);
      let llmResponse: LlmLikelyResponse;

      try {
        llmResponse = JSON.parse(llmResponseText);
      } catch (parseError) {
        return { error: `LLM response was not valid JSON: ${parseError.message}. Response: ${llmResponseText}` };
      }

      if (!llmResponse.adaptiveBlocks || !Array.isArray(llmResponse.adaptiveBlocks)) {
        return { error: "LLM response missing 'adaptiveBlocks' array or it's malformed." };
      }
      // Note: the concept spec and LLM response type define `droppedTaskIds` as an array of IDs,
      // but the `droppedTasks` state requires `taskId` and `reason`. The prompt implies the LLM
      // provides `taskId` and `reason` for each dropped task. Let's adjust `LlmLikelyResponse` to match.
      // Adjusting `LlmLikelyResponse` to match the prompt's `droppedTasks` structure (with reason).
      // Assuming the LLM will return `droppedTasks` as an array of objects `{ taskId: ID, reason: string }`
      // based on the example in the prompt's output structure.
      interface LlmLikelyResponseWithReason {
        analysis?: string;
        adaptiveBlocks: Array<{
          start: string;
          end: string;
          taskIds: ID[];
        }>;
        droppedTasks: Array<{
          taskId: ID;
          reason: string;
        }>;
      }
      llmResponse = llmResponse as unknown as LlmLikelyResponseWithReason; // Re-cast based on assumption

      if (!llmResponse.droppedTasks || !Array.isArray(llmResponse.droppedTasks)) {
        return { error: "LLM response missing 'droppedTasks' array or it's malformed." };
      }

      // Process proposed adaptive blocks
      for (const blockProposal of llmResponse.adaptiveBlocks) {
        const start = new Date(blockProposal.start);
        const end = new Date(blockProposal.end);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          console.warn(
            `Warning: LLM proposed an adaptive block with invalid start/end timestamps: ${
              JSON.stringify(blockProposal)
            }`,
          );
          continue; // Skip invalid block proposals
        }

        for (const taskId of blockProposal.taskIds) {
          const assignResult = await this.assignAdaptiveSchedule({ owner, taskId, start, end });
          if ("error" in assignResult) {
            console.warn(
              `Warning: Could not assign task ${taskId} from LLM proposal to block ${start.toISOString()}-${end.toISOString()}: ${assignResult.error}`,
            );
            // Continue processing other tasks/blocks even if one fails
          }
        }
      }

      // Process proposed dropped tasks
      for (const dropped of llmResponse.droppedTasks) {
        if (!dropped.taskId || !dropped.reason) {
          console.warn(
            `Warning: LLM proposed a malformed dropped task: ${JSON.stringify(dropped)}. Skipping.`,
          );
          continue;
        }
        const newDroppedTask: DroppedTask = {
          _id: freshID(), // Assign a new unique ID for the document in the collection
          taskId: dropped.taskId,
          owner: owner,
          reason: dropped.reason,
        };
        try {
          // Use upsert to handle cases where the same task might be dropped again,
          // or to ensure the (taskId, owner) pair remains unique for dropped tasks.
          await this.droppedTasks.updateOne(
            { taskId: newDroppedTask.taskId, owner: newDroppedTask.owner },
            { $set: { _id: newDroppedTask._id, reason: newDroppedTask.reason } }, // Update reason and ensure _id is set if new
            { upsert: true },
          );
        } catch (insertError) {
          console.warn(
            `Warning: Could not add/update dropped task ${dropped.taskId} for owner ${owner}: ${insertError.message}`,
          );
        }
      }

      // Fetch the current state of adaptive blocks and dropped tasks for the owner
      const getBlocksResult = await this._getAdaptiveSchedule({ owner });
      const getDroppedTasksResult = await this._getDroppedTask({ owner });

      const finalAdaptiveBlocks = "adaptiveBlockTable" in getBlocksResult ? getBlocksResult.adaptiveBlockTable : [];
      const finalDroppedTasks = "droppedTaskSet" in getDroppedTasksResult ? getDroppedTasksResult.droppedTaskSet : [];

      return { adaptiveBlockTable: finalAdaptiveBlocks, droppedTaskSet: finalDroppedTasks };
    } catch (error) {
      console.error(`Error in requestAdaptiveScheduleAI: ${error.message}`);
      return { error: `Failed to request adaptive schedule from AI: ${error.message}` };
    }
  }

  /**
   * unassignBlock (owner: User, taskId: String, timeBlockId: String)
   *
   * **requires**
   *   exists an adaptive block with matching owner and timeBlockId;
   *   taskId exists in this time block's taskIdSet;
   *
   * **effect**
   *   remove taskId from that block's taskIdSet
   */
  async unassignBlock(
    { owner, taskId, timeBlockId }: { owner: User; taskId: ID; timeBlockId: ID },
  ): Promise<Empty | { error: string }> {
    try {
      const block = await this.adaptiveBlocks.findOne({ _id: timeBlockId, owner });
      if (!block) {
        return { error: `Adaptive block with ID ${timeBlockId} not found for owner ${owner}.` };
      }

      if (!block.taskIdSet.includes(taskId)) {
        return { error: `Task ${taskId} not found in block ${timeBlockId}.` };
      }

      const updateResult = await this.adaptiveBlocks.updateOne(
        { _id: timeBlockId, owner },
        { $pull: { taskIdSet: taskId } },
      );

      if (updateResult.modifiedCount === 0) {
        // This case indicates that the task was perhaps removed by another process concurrently,
        // or there's an issue despite the initial check.
        return { error: `Failed to unassign task ${taskId} from block ${timeBlockId}.` };
      }

      return {};
    } catch (error) {
      console.error(`Error in unassignBlock: ${error.message}`);
      return { error: `Failed to unassign task: ${error.message}` };
    }
  }
}
```
