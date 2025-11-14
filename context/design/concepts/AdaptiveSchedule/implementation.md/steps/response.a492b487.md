---
timestamp: 'Sat Oct 18 2025 18:32:12 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_183212.1d5c6c2b.md]]'
content_id: a492b4876e8f282941c5e6a03309323d357db55795001863177326ce8b99f5fc
---

# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty, TimeStamp } from "@utils/types.ts"; // Assuming TimeStamp is defined as Date
import { freshID } from "@utils/database.ts"; // Assuming freshID generates a new unique ID string
import { GeminiLLM } from "@utils/GeminiLLM.ts"; // Assuming GeminiLLM is provided at this path

// Declare collection prefix, use concept name
const PREFIX = "AdaptiveSchedule" + ".";

// Generic types of this concept
type User = ID;
type TaskId = ID;

/**
 * a set of AdaptiveBlocks with
 *   a timeBlockId String
 *   an owner User
 *   a start TimeStamp
 *   an end TimeStamp
 *   a taskIdSet set of Strings
 */
interface AdaptiveBlock {
  _id: ID; // Corresponds to timeBlockId
  owner: User;
  start: TimeStamp;
  end: TimeStamp;
  taskIdSet: TaskId[];
}

/**
 * a set of droppedTasks with
 *   a taskId String
 *   an owner User
 *   a reason String
 */
interface DroppedTask {
  _id: TaskId; // Corresponds to taskId
  owner: User;
  reason: string;
}

/**
 * concept AdaptiveSchedule [User, GeminiLLM]
 *
 * purpose: Keeps the schedule responsive by moving, canceling, or creating tasks scheduled at future time blocks when reality diverges, ensuring that highest-priority tasks are achieved first while preserving user productivity.
 *
 * principle:
 *   When actual sessions overrun or diverge from the plan, the adaptive scheduler adjusts subsequent planned tasks into adaptive time blocks.
 *   This process can operate in two modes:
 *     (1) Manual mode — user reviews deviations and adjusts future time blocks;
 *     (2) AI-augmented mode — provide necessary context to the LLM, then the LLM analyzes deviations, infers likely causes, and automatically proposes a revised schedule.
 */
export default class AdaptiveScheduleConcept {
  adaptiveBlocks: Collection<AdaptiveBlock>;
  droppedTasks: Collection<DroppedTask>;
  llm: GeminiLLM; // An instance of the LLM class

  constructor(private readonly db: Db, llmInstance: GeminiLLM) {
    this.adaptiveBlocks = this.db.collection(PREFIX + "adaptiveBlocks");
    this.droppedTasks = this.db.collection(PREFIX + "droppedTasks");
    this.llm = llmInstance;
  }

  // --- Query Actions ---

  /**
   * _getAdaptiveSchedule (owner: User): (adaptiveBlockTable: set of AdaptiveBlocks)
   *
   * **requires** exists at least one adaptive block under this user
   *
   * **effects** return a set of all adaptive blocks under this owner with end before the end of the day
   */
  async _getAdaptiveSchedule({ owner }: { owner: User }): Promise<{ adaptiveBlockTable: AdaptiveBlock[] } | { error: string }> {
    try {
      // Get the start and end of the current day for filtering
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const blocks = await this.adaptiveBlocks.find({
        owner: owner,
        end: { $lte: endOfDay }, // Blocks ending before or at the end of the day
      }).toArray();

      return { adaptiveBlockTable: blocks };
    } catch (e) {
      return { error: `Failed to get adaptive schedule: ${(e as Error).message}` };
    }
  }

  /**
   * _getDroppedTask(owner: User): (droppedTaskSet: set of droppedTasks)
   *
   * **requires** exists at least one dropped task with this owner
   *
   * **effects** returns all dropped tasks for the user (tasks that couldn't be scheduled due to insufficient time)
   */
  async _getDroppedTask({ owner }: { owner: User }): Promise<{ droppedTaskSet: DroppedTask[] } | { error: string }> {
    try {
      const tasks = await this.droppedTasks.find({ owner: owner }).toArray();
      return { droppedTaskSet: tasks };
    } catch (e) {
      return { error: `Failed to get dropped tasks: ${(e as Error).message}` };
    }
  }

  // --- State Modifying Actions ---

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
  async addTimeBlock({ owner, start, end }: { owner: User; start: TimeStamp; end: TimeStamp }): Promise<{ timeBlockId: ID } | { error: string }> {
    if (!(start instanceof Date) || isNaN(start.getTime())) {
      return { error: "Invalid 'start' TimeStamp provided." };
    }
    if (!(end instanceof Date) || isNaN(end.getTime())) {
      return { error: "Invalid 'end' TimeStamp provided." };
    }
    if (start.getTime() >= end.getTime()) {
      return { error: "Start time must be before end time." };
    }

    try {
      // Check for existing block with same owner, start, and end
      const existingBlock = await this.adaptiveBlocks.findOne({ owner, start, end });
      if (existingBlock) {
        return { error: "An adaptive block with this owner, start, and end already exists." };
      }

      const timeBlockId = freshID();
      const newBlock: AdaptiveBlock = {
        _id: timeBlockId,
        owner,
        start,
        end,
        taskIdSet: [],
      };

      await this.adaptiveBlocks.insertOne(newBlock);
      return { timeBlockId };
    } catch (e) {
      return { error: `Failed to add time block: ${(e as Error).message}` };
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
   */
  async assignAdaptiveSchedule({ owner, taskId, start, end }: { owner: User; taskId: TaskId; start: TimeStamp; end: TimeStamp }): Promise<{ timeBlockId: ID } | { error: string }> {
    if (!(start instanceof Date) || isNaN(start.getTime())) {
      return { error: "Invalid 'start' TimeStamp provided." };
    }
    if (!(end instanceof Date) || isNaN(end.getTime())) {
      return { error: "Invalid 'end' TimeStamp provided." };
    }
    if (start.getTime() >= end.getTime()) {
      return { error: "Start time must be before end time." };
    }

    try {
      const query = { owner, start, end };
      let existingBlock = await this.adaptiveBlocks.findOne(query);
      let timeBlockId: ID;

      if (existingBlock) {
        timeBlockId = existingBlock._id;
        if (existingBlock.taskIdSet.includes(taskId)) {
          return { error: `Task '${taskId}' is already assigned to this time block.` };
        }
        await this.adaptiveBlocks.updateOne(query, { $addToSet: { taskIdSet: taskId } });
      } else {
        timeBlockId = freshID();
        const newBlock: AdaptiveBlock = {
          _id: timeBlockId,
          owner,
          start,
          end,
          taskIdSet: [taskId],
        };
        await this.adaptiveBlocks.insertOne(newBlock);
      }
      return { timeBlockId };
    } catch (e) {
      return { error: `Failed to assign adaptive schedule: ${(e as Error).message}` };
    }
  }

  /**
   * async requestAdaptiveScheduleAI (owner: User, context: String, prompt: String): (adaptiveBlockTable: set of AdaptiveBlocks, droppedTaskSet: set of droppedTasks)
   *
   * **effect**
   *   send a structured prompt to the llm with the provided context;
   *   llm returns a structured JSON response including:
   *     - adaptiveBlocks (with start/end times and assigned task ids)
   *     - droppedTasks (tasks removed due to insufficient time)
   *       - each droppedTask has a task id and a reason for dropping
   *   for each adaptive block in llm's returned adaptiveBlocks, assign the task id to the corresponding adaptive block with matching (owner, start, end) using the same logic as assignAdaptiveSchedule;
   *   for each dropped task in droppedTasks, add to state with (taskId, owner, reason)
   *   return the set of all AdaptiveBlocks and the set of all droppedTasks under this owner;
   */
  async requestAdaptiveScheduleAI({ owner, context, prompt }: { owner: User; context: string; prompt: string }): Promise<{ adaptiveBlockTable: AdaptiveBlock[]; droppedTaskSet: DroppedTask[] } | { error: string }> {
    const fullPrompt = `
      You are an adaptive schedule AI. Your goal is to re-organize a user's schedule based on new context and a specific prompt.
      You must respond with a JSON object containing two top-level keys: 'adaptiveBlocks' and 'droppedTasks'.

      'adaptiveBlocks' should be an array of objects, where each object represents a scheduled time block.
      Each adaptive block object must have:
        - 'start': ISO 8601 formatted datetime string (e.g., "2023-10-27T09:00:00.000Z")
        - 'end': ISO 8601 formatted datetime string
        - 'taskIdSet': an array of strings, where each string is a unique task ID assigned to this block.

      'droppedTasks' should be an array of objects, where each object represents a task that could not be scheduled.
      Each dropped task object must have:
        - 'taskId': a unique task ID string
        - 'reason': a string explaining why the task was dropped.

      Ensure all 'start' and 'end' times are valid future or current ISO 8601 datetimes.
      Do not include any other text or explanation outside the JSON.

      Current Context:
      ${context}

      User's Request/Prompt for Adjustment:
      ${prompt}
    `;

    try {
      const llmResponseText = await this.llm.executeLLM(fullPrompt);
      const llmResponse: {
        adaptiveBlocks: Array<{ start: string; end: string; taskIdSet: TaskId[] }>;
        droppedTasks: Array<{ taskId: TaskId; reason: string }>;
      } = JSON.parse(llmResponseText);

      // Process adaptive blocks from LLM
      for (const block of llmResponse.adaptiveBlocks) {
        const start = new Date(block.start);
        const end = new Date(block.end);

        // Input validation for LLM response dates
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start.getTime() >= end.getTime()) {
          console.warn(`LLM returned invalid dates for a block: start=${block.start}, end=${block.end}. Skipping this block.`);
          continue; // Skip this malformed block
        }

        for (const taskId of block.taskIdSet) {
          // Use the internal logic of assignAdaptiveSchedule to update/create blocks and assign tasks.
          // Note: assignAdaptiveSchedule returns an error object on failure,
          // but here we just want to proceed, so we log and continue if there's an issue.
          const assignResult = await this.assignAdaptiveSchedule({ owner, taskId, start, end });
          if ('error' in assignResult) {
            console.warn(`Failed to assign task '${taskId}' for owner '${owner}' from LLM response: ${assignResult.error}`);
          }
        }
      }

      // Process dropped tasks from LLM
      for (const droppedTask of llmResponse.droppedTasks) {
        const droppedTaskId = droppedTask.taskId as TaskId;
        const droppedTaskEntry: DroppedTask = {
          _id: droppedTaskId,
          owner: owner,
          reason: droppedTask.reason,
        };
        // Use upsert to avoid duplicate dropped tasks if LLM suggests the same task multiple times or on retry
        await this.droppedTasks.updateOne(
          { _id: droppedTaskId, owner: owner },
          { $set: droppedTaskEntry },
          { upsert: true }
        );
      }

      // After all updates, retrieve the current state for the owner
      const updatedBlocksResult = await this._getAdaptiveSchedule({ owner });
      const updatedDroppedTasksResult = await this._getDroppedTask({ owner });

      if ('error' in updatedBlocksResult) {
        return { error: `Failed to retrieve updated adaptive blocks after AI request: ${updatedBlocksResult.error}` };
      }
      if ('error' in updatedDroppedTasksResult) {
        return { error: `Failed to retrieve updated dropped tasks after AI request: ${updatedDroppedTasksResult.error}` };
      }

      return {
        adaptiveBlockTable: updatedBlocksResult.adaptiveBlockTable,
        droppedTaskSet: updatedDroppedTasksResult.droppedTaskSet,
      };
    } catch (e) {
      return { error: `AI schedule request failed: ${(e as Error).message}` };
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
  async unassignBlock({ owner, taskId, timeBlockId }: { owner: User; taskId: TaskId; timeBlockId: ID }): Promise<Empty | { error: string }> {
    try {
      const block = await this.adaptiveBlocks.findOne({ _id: timeBlockId, owner: owner });

      if (!block) {
        return { error: `Adaptive block with ID '${timeBlockId}' for owner '${owner}' not found.` };
      }

      if (!block.taskIdSet.includes(taskId)) {
        return { error: `Task '${taskId}' not found in block '${timeBlockId}' taskIdSet.` };
      }

      await this.adaptiveBlocks.updateOne(
        { _id: timeBlockId, owner: owner },
        { $pull: { taskIdSet: taskId } }
      );

      return {};
    } catch (e) {
      return { error: `Failed to unassign task from block: ${(e as Error).message}` };
    }
  }
}
```
