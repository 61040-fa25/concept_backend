import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { Config as GeminiConfig, GeminiLLM } from "@utils/GeminiLLM.ts"; // Assuming GeminiLLM is in @utils

// Declare collection prefix, use concept name
const PREFIX = "AdaptiveSchedule" + ".";

// Generic types of this concept
type User = ID;
type TimeStamp = number; // Unix timestamp in milliseconds
// Assuming GeminiLLM is handled as a class instance, not a generic type in the state relations directly.
// The concept refers to 'an llm GeminiLLM', implying an instance that the concept interacts with.

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
  start: TimeStamp; // Unix timestamp in milliseconds
  end: TimeStamp; // Unix timestamp in milliseconds
  taskIdSet: ID[];
}

/**
 * a set of droppedTasks with
 *   a taskId String
 *   an owner User
 *   a reason String
 */
interface DroppedTask {
  _id: ID; // Using _id for consistency, can be same as taskId if unique globally
  taskId: ID;
  owner: User;
  reason: string;
}

/**
 * Expected JSON structure from LLM for adaptive schedule proposals.
 * The LLM should not generate `timeBlockId` as the concept's `addTimeBlock`
 * or `assignAdaptiveSchedule` is responsible for that.
 */
interface LlmLikelyResponse {
  analysis: string; // Added as per prompt example structure
  adaptiveBlocks: Array<{
    start: number | string; // Unix timestamp in milliseconds or ISO string
    end: number | string; // Unix timestamp in milliseconds or ISO string
    taskIds: ID[];
  }>;
  droppedTasks: Array<{
    taskId: ID;
    reason: string;
  }>;
}

export default class AdaptiveScheduleConcept {
  adaptiveBlocks: Collection<AdaptiveBlock>;
  droppedTasks: Collection<DroppedTask>;
  private llm: GeminiLLM;

  constructor(private readonly db: Db, llmConfig?: GeminiConfig) {
    this.adaptiveBlocks = this.db.collection(PREFIX + "adaptiveBlocks");
    this.droppedTasks = this.db.collection(PREFIX + "droppedTasks");

    // Load config from environment if not provided
    if (!llmConfig) {
      const apiKey = Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is required for AdaptiveSchedule");
      }
      llmConfig = {
        apiKey: apiKey,
        maxRetries: 3,
        timeoutMs: 30000,
        initialBackoffMs: 1000
      };
    }

    this.llm = new GeminiLLM(llmConfig);

    // Ensure indexes for efficient lookup and uniqueness checks
    this.adaptiveBlocks.createIndex({ owner: 1, start: 1, end: 1 }, {
      unique: true,
    });
    this.droppedTasks.createIndex({ taskId: 1, owner: 1 }, { unique: true });
    this.adaptiveBlocks.createIndex({ owner: 1 });
  }

  /**
   * _getAdaptiveSchedule (owner: User): (adaptiveBlockTable: set of AdaptiveBlocks)
   *
   * **effect** return a set of all adaptive blocks under this owner with end before the end of the day (or an empty set if none exist)
   */
  async _getAdaptiveSchedule(
    { owner }: { owner: User },
  ): Promise<{ adaptiveBlockTable: AdaptiveBlock[] } | { error: string }> {
    try {
      const blocks = await this.adaptiveBlocks.find({ owner }).toArray();
      // Changed to return an empty array if no blocks are found, instead of an error.
      return { adaptiveBlockTable: blocks };
    } catch (error: unknown) { // Explicitly type error as unknown
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error(`Error in _getAdaptiveSchedule: ${errorMessage}`);
      return { error: `Failed to retrieve adaptive schedule: ${errorMessage}` };
    }
  }

  /**
   * _getDroppedTask(owner: User): (droppedTaskSet: set of droppedTasks)
   *
   * **effect** returns all dropped tasks for the user (tasks that couldn't be scheduled due to insufficient time, or an empty set if none exist)
   */
  async _getDroppedTask(
    { owner }: { owner: User },
  ): Promise<{ droppedTaskSet: DroppedTask[] } | { error: string }> {
    try {
      const tasks = await this.droppedTasks.find({ owner }).toArray();
      // Changed to return an empty array if no tasks are found, instead of an error.
      return { droppedTaskSet: tasks };
    } catch (error: unknown) { // Explicitly type error as unknown
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error(`Error in _getDroppedTask: ${errorMessage}`);
      return { error: `Failed to retrieve dropped tasks: ${errorMessage}` };
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
    { owner, start, end }: { owner: User; start: TimeStamp; end: TimeStamp },
  ): Promise<{ timeBlockId: ID } | { error: string }> {
    if (typeof start !== "number" || isNaN(start) || start < 0) {
      return { error: "Invalid 'start' TimeStamp." };
    }
    if (typeof end !== "number" || isNaN(end) || end < 0) {
      return { error: "Invalid 'end' TimeStamp." };
    }
    if (start >= end) {
      return { error: "'start' TimeStamp must be before 'end' TimeStamp." };
    }

    try {
      const existingBlock = await this.adaptiveBlocks.findOne({
        owner,
        start,
        end,
      });
      if (existingBlock) {
        return {
          error:
            "An adaptive time block with this owner, start, and end already exists.",
        };
      }

      const newBlockId = freshID();
      const newBlock: AdaptiveBlock = {
        _id: newBlockId,
        owner,
        start,
        end,
        taskIdSet: [],
      };

      await this.adaptiveBlocks.insertOne(newBlock);
      return { timeBlockId: newBlockId };
    } catch (error: unknown) { // Explicitly type error as unknown
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error(`Error in addTimeBlock: ${errorMessage}`);
      return { error: `Failed to add time block: ${errorMessage}` };
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
    { owner, taskId, start, end }: {
      owner: User;
      taskId: ID;
      start: TimeStamp;
      end: TimeStamp;
    },
  ): Promise<{ timeBlockId: ID } | { error: string }> {
    if (typeof start !== "number" || isNaN(start) || start < 0) {
      return { error: "Invalid 'start' TimeStamp." };
    }
    if (typeof end !== "number" || isNaN(end) || end < 0) {
      return { error: "Invalid 'end' TimeStamp." };
    }
    if (start >= end) {
      return { error: "'start' TimeStamp must be before 'end' TimeStamp." };
    }

    try {
      const existingBlock = await this.adaptiveBlocks.findOne({
        owner,
        start,
        end,
      });

      if (existingBlock) {
        if (existingBlock.taskIdSet.includes(taskId)) {
          return {
            error:
              `Task ${taskId} is already assigned to the block with ID ${existingBlock._id}.`,
          };
        }

        const updateResult = await this.adaptiveBlocks.updateOne(
          { _id: existingBlock._id },
          { $addToSet: { taskIdSet: taskId } },
        );

        if (
          updateResult.modifiedCount === 0 && updateResult.matchedCount === 0
        ) {
          return { error: "Failed to update existing block with task." };
        }
        return { timeBlockId: existingBlock._id };
      } else {
        const newBlockId = freshID();
        const newBlock: AdaptiveBlock = {
          _id: newBlockId,
          owner,
          start,
          end,
          taskIdSet: [taskId],
        };

        await this.adaptiveBlocks.insertOne(newBlock);
        return { timeBlockId: newBlockId };
      }
    } catch (error: unknown) { // Explicitly type error as unknown
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error(`Error in assignAdaptiveSchedule: ${errorMessage}`);
      return { error: `Failed to assign adaptive schedule: ${errorMessage}` };
    }
  }

  /**
   * deleteAdaptiveBlock (owner: User, timeBlockId: String): Empty
   *
   * **requires**
   *   an adaptive time block exists with this timeBlockId and owner
   *
   * **effect**
   *   delete the adaptive time block with this timeBlockId
   */
  async deleteAdaptiveBlock(
    { owner, timeBlockId }: { owner: User; timeBlockId: ID },
  ): Promise<Empty | { error: string }> {
    try {
      const result = await this.adaptiveBlocks.deleteOne({
        _id: timeBlockId,
        owner,
      });

      if (result.deletedCount === 0) {
        return {
          error: "Adaptive block not found or not owned by user.",
        };
      }

      console.log(`Effect: Deleted adaptive block ${timeBlockId} for owner ${owner}.`);
      return {};
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error(`Error in deleteAdaptiveBlock: ${errorMessage}`);
      return { error: `Failed to delete adaptive block: ${errorMessage}` };
    }
  }

  /**
   * async requestAdaptiveScheduleAI (owner: User, contexted_prompt: String): (adaptiveBlockTable: set of AdaptiveBlocks, droppedTaskSet: set of droppedTasks)
   *
   * **effect**
   *   send the structured contexted_prompt to the llm;
   *   llm returns a structured JSON response including:
   *     - analysis (string describing the LLM's analysis)
   *     - adaptiveBlocks (with start/end times and assigned task ids)
   *     - droppedTasks (tasks removed due to insufficient time)
   *       - each droppedTask has a task id and a reason for dropping
   *   for each adaptive block in llm's returned adaptiveBlocks, assign the task id to the corresponding adaptive block with matching (owner, start, end) using the same logic as assignAdaptiveSchedule;
   *   for each dropped task in droppedTasks, add to state with (taskId, owner, reason)
   *   return the set of all AdaptiveBlocks and the set of all droppedTasks under this owner;
   */
  async requestAdaptiveScheduleAI(
    { owner, contexted_prompt }: { owner: User; contexted_prompt: string },
  ): Promise<
    { adaptiveBlockTable: AdaptiveBlock[]; droppedTaskSet: DroppedTask[]; analysis: string } | {
      error: string;
    }
  > {
    try {
      let llmResponseText = await this.llm.executeLLM(contexted_prompt);

      // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
      llmResponseText = llmResponseText.trim();
      if (llmResponseText.startsWith('```')) {
        // Remove opening ```json or ```
        llmResponseText = llmResponseText.replace(/^```(?:json)?\s*\n?/, '');
        // Remove closing ```
        llmResponseText = llmResponseText.replace(/\n?```\s*$/, '');
        llmResponseText = llmResponseText.trim();
      }

      let llmResponse: LlmLikelyResponse;

      try {
        llmResponse = JSON.parse(llmResponseText);
      } catch (parseError: unknown) { // Explicitly type parseError as unknown
        const parseErrorMessage = parseError instanceof Error
          ? parseError.message
          : String(parseError);
        return {
          error:
            `LLM response was not valid JSON: ${parseErrorMessage}. Response: ${llmResponseText}`,
        };
      }

      // Validate required fields in LLM response
      if (
        typeof llmResponse.analysis !== "string" ||
        llmResponse.analysis.trim() === ""
      ) { // Added validation for analysis, checking for empty string too
        return { error: "LLM response missing or empty 'analysis' string." };
      }

      // Store the analysis
      const analysis = llmResponse.analysis;

      if (
        !llmResponse.adaptiveBlocks ||
        !Array.isArray(llmResponse.adaptiveBlocks)
      ) {
        return { error: "LLM response missing 'adaptiveBlocks' array." };
      }
      // Handle both droppedTasks and droppedTaskIds formats
      if (!llmResponse.droppedTasks) {
        // If droppedTasks is missing, check for droppedTaskIds and convert
        const altResponse = llmResponse as any;
        if (altResponse.droppedTaskIds && Array.isArray(altResponse.droppedTaskIds)) {
          // Convert droppedTaskIds to droppedTasks format
          llmResponse.droppedTasks = altResponse.droppedTaskIds.map((taskId: ID) => ({
            taskId,
            reason: "Not scheduled in adaptive plan"
          }));
        } else {
          // Default to empty array if neither format is present
          llmResponse.droppedTasks = [];
        }
      }

      if (!Array.isArray(llmResponse.droppedTasks)) {
        return { error: "LLM response 'droppedTasks' must be an array." };
      }

      const assignedBlockIds: ID[] = [];
      for (const block of llmResponse.adaptiveBlocks) {
        // Convert start and end to Unix timestamps if they're ISO strings
        let start = block.start;
        let end = block.end;

        // Check if start/end are strings (ISO format) and convert to numbers
        if (typeof start === 'string') {
          start = new Date(start).getTime();
        }
        if (typeof end === 'string') {
          end = new Date(end).getTime();
        }

        for (const taskId of block.taskIds) {
          const assignResult = await this.assignAdaptiveSchedule({
            owner,
            taskId,
            start,
            end,
          });
          if ("error" in assignResult) {
            console.warn(
              `Warning: Could not assign task ${taskId} from LLM proposal: ${assignResult.error}`,
            );
            // Depending on policy, might choose to stop or continue. For now, continue and log.
          } else {
            assignedBlockIds.push(assignResult.timeBlockId);
          }
        }
      }

      const newDroppedTasks: DroppedTask[] = [];
      for (const dropped of llmResponse.droppedTasks) {
        const newDroppedTask: DroppedTask = {
          _id: freshID(), // Ensure a unique _id for the collection
          taskId: dropped.taskId,
          owner: owner,
          reason: dropped.reason,
        };
        try {
          // Use upsert to avoid duplicate inserts if LLM proposes the same dropped task multiple times,
          // assuming taskId+owner is a unique key for dropped tasks.
          await this.droppedTasks.updateOne(
            { taskId: newDroppedTask.taskId, owner: newDroppedTask.owner },
            { $set: newDroppedTask },
            { upsert: true },
          );
          newDroppedTasks.push(newDroppedTask);
        } catch (insertError: unknown) { // Explicitly type insertError as unknown
          const insertErrorMessage = insertError instanceof Error
            ? insertError.message
            : String(insertError);
          console.warn(
            `Warning: Could not add dropped task ${dropped.taskId}: ${insertErrorMessage}`,
          );
        }
      }

      // Fetch the current state of adaptive blocks and dropped tasks for the owner
      // These will now return empty arrays if no items are found, rather than errors.
      const getBlocksResult = await this._getAdaptiveSchedule({ owner });
      const getDroppedTasksResult = await this._getDroppedTask({ owner });

      // Handle potential errors from _getAdaptiveSchedule or _getDroppedTask
      if ("error" in getBlocksResult) {
        return {
          error:
            `Failed to retrieve final adaptive schedule after AI processing: ${getBlocksResult.error}`,
        };
      }
      if ("error" in getDroppedTasksResult) {
        return {
          error:
            `Failed to retrieve final dropped tasks after AI processing: ${getDroppedTasksResult.error}`,
        };
      }

      const finalAdaptiveBlocks = getBlocksResult.adaptiveBlockTable;
      const finalDroppedTasks = getDroppedTasksResult.droppedTaskSet;

      return {
        adaptiveBlockTable: finalAdaptiveBlocks,
        droppedTaskSet: finalDroppedTasks,
        analysis: analysis,
      };
    } catch (error: unknown) { // Explicitly type error as unknown
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error(`Error in requestAdaptiveScheduleAI: ${errorMessage}`);
      return {
        error: `Failed to request adaptive schedule from AI: ${errorMessage}`,
      };
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
    { owner, taskId, timeBlockId }: {
      owner: User;
      taskId: ID;
      timeBlockId: ID;
    },
  ): Promise<Empty | { error: string }> {
    try {
      const block = await this.adaptiveBlocks.findOne({
        _id: timeBlockId,
        owner,
      });
      if (!block) {
        return {
          error:
            `Adaptive block with ID ${timeBlockId} not found for owner ${owner}.`,
        };
      }

      if (!block.taskIdSet.includes(taskId)) {
        return { error: `Task ${taskId} not found in block ${timeBlockId}.` };
      }

      const updateResult = await this.adaptiveBlocks.updateOne(
        { _id: timeBlockId, owner },
        { $pull: { taskIdSet: taskId } },
      );

      if (updateResult.modifiedCount === 0) {
        return {
          error: `Failed to unassign task ${taskId} from block ${timeBlockId}.`,
        };
      }

      return {};
    } catch (error: unknown) { // Explicitly type error as unknown
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.error(`Error in unassignBlock: ${errorMessage}`);
      return { error: `Failed to unassign task: ${errorMessage}` };
    }
  }
}
