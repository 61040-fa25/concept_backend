---
timestamp: 'Sat Oct 18 2025 22:04:15 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_220415.be9361d9.md]]'
content_id: 8ebf6c3db39501632e1e9f7d1f1e5ea0d5c1dd581008d158667897376db9a785
---

# response:

The error `TS18046 [ERROR]: 'error' is of type 'unknown'.` occurs because TypeScript 3.9+ by default types variables caught in `catch` blocks as `unknown` for increased type safety. To access properties like `.message`, you need to explicitly narrow the type or convert it to a string.

I've addressed this by applying the following pattern in all `catch` blocks in `src/concepts/AdaptiveSchedule/AdaptiveSchedule.ts`:

```typescript
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  // ... use errorMessage
}
```

Additionally, I've updated the "Operational Principle" test case in `src/concepts/AdaptiveSchedule/AdaptiveSchedule.test.ts` with the new mock data you provided. This involved:

1. **Setting a fixed `currentTestTime`**: `2025-10-04T13:00:00Z`.
2. **Defining `sampleTasksList`**: Tasks reflect their *remaining* durations given the actual routine.
3. **Defining `plannedSchedule` and `actualRoutine`**: Structured according to the provided details.
4. **Updating `mockGeminiLLM.mockResponse`**: To match the AI-generated adaptive schedule and dropped tasks exactly.
5. **Refining test logic**: Removed previous manual task assignments to rely solely on the AI-generated schedule. Assertions now correctly expect 5 adaptive blocks and 0 dropped tasks as per the mock data. The unassignment scenario now targets the 'Gym Workout' task.
6. **Adjusting query expectations**: The `_getAdaptiveSchedule` and `_getDroppedTask` methods now return empty arrays instead of errors when no items are found, making them more conventional query methods. The tests reflect this change.
7. **Enhanced LLM response validation**: Added a check in `requestAdaptiveScheduleAI` for the `analysis` field to ensure it's a non-empty string, and updated the corresponding test in "Interesting Scenario 3".

Here are the updated files:

## file: src/concepts/AdaptiveSchedule/AdaptiveSchedule.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { GeminiLLM, Config as GeminiConfig } from "@utils/GeminiLLM.ts"; // Assuming GeminiLLM is in @utils

// Declare collection prefix, use concept name
const PREFIX = "AdaptiveSchedule" + ".";

// Generic types of this concept
type User = ID;
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
  start: Date; // TimeStamp maps to Date in TS
  end: Date;   // TimeStamp maps to Date in TS
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
    start: string; // ISO string for Date
    end: string;   // ISO string for Date
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

  constructor(private readonly db: Db, llmConfig: GeminiConfig) {
    this.adaptiveBlocks = this.db.collection(PREFIX + "adaptiveBlocks");
    this.droppedTasks = this.db.collection(PREFIX + "droppedTasks");
    this.llm = new GeminiLLM(llmConfig);

    // Ensure indexes for efficient lookup and uniqueness checks
    this.adaptiveBlocks.createIndex({ owner: 1, start: 1, end: 1 }, { unique: true });
    this.droppedTasks.createIndex({ taskId: 1, owner: 1 }, { unique: true });
    this.adaptiveBlocks.createIndex({ owner: 1 });
  }

  /**
   * _getAdaptiveSchedule (owner: User): (adaptiveBlockTable: set of AdaptiveBlocks)
   *
   * **effect** return a set of all adaptive blocks under this owner with end before the end of the day (or an empty set if none exist)
   */
  async _getAdaptiveSchedule({ owner }: { owner: User }): Promise<{ adaptiveBlockTable: AdaptiveBlock[] } | { error: string }> {
    try {
      const blocks = await this.adaptiveBlocks.find({ owner }).toArray();
      // Changed to return an empty array if no blocks are found, instead of an error.
      return { adaptiveBlockTable: blocks };
    } catch (error: unknown) { // Explicitly type error as unknown
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error in _getAdaptiveSchedule: ${errorMessage}`);
      return { error: `Failed to retrieve adaptive schedule: ${errorMessage}` };
    }
  }

  /**
   * _getDroppedTask(owner: User): (droppedTaskSet: set of droppedTasks)
   *
   * **effect** returns all dropped tasks for the user (tasks that couldn't be scheduled due to insufficient time, or an empty set if none exist)
   */
  async _getDroppedTask({ owner }: { owner: User }): Promise<{ droppedTaskSet: DroppedTask[] } | { error: string }> {
    try {
      const tasks = await this.droppedTasks.find({ owner }).toArray();
      // Changed to return an empty array if no tasks are found, instead of an error.
      return { droppedTaskSet: tasks };
    } catch (error: unknown) { // Explicitly type error as unknown
      const errorMessage = error instanceof Error ? error.message : String(error);
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
  async addTimeBlock({ owner, start, end }: { owner: User; start: Date; end: Date }): Promise<{ timeBlockId: ID } | { error: string }> {
    if (!(start instanceof Date) || isNaN(start.getTime())) {
      return { error: "Invalid 'start' TimeStamp." };
    }
    if (!(end instanceof Date) || isNaN(end.getTime())) {
      return { error: "Invalid 'end' TimeStamp." };
    }
    if (start.getTime() >= end.getTime()) {
      return { error: "'start' TimeStamp must be before 'end' TimeStamp." };
    }

    try {
      const existingBlock = await this.adaptiveBlocks.findOne({ owner, start, end });
      if (existingBlock) {
        return { error: "An adaptive time block with this owner, start, and end already exists." };
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
      const errorMessage = error instanceof Error ? error.message : String(error);
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
  async assignAdaptiveSchedule({ owner, taskId, start, end }: { owner: User; taskId: ID; start: Date; end: Date }): Promise<{ timeBlockId: ID } | { error: string }> {
    if (!(start instanceof Date) || isNaN(start.getTime())) {
      return { error: "Invalid 'start' TimeStamp." };
    }
    if (!(end instanceof Date) || isNaN(end.getTime())) {
      return { error: "Invalid 'end' TimeStamp." };
    }
    if (start.getTime() >= end.getTime()) {
      return { error: "'start' TimeStamp must be before 'end' TimeStamp." };
    }

    try {
      const existingBlock = await this.adaptiveBlocks.findOne({ owner, start, end });

      if (existingBlock) {
        if (existingBlock.taskIdSet.includes(taskId)) {
          return { error: `Task ${taskId} is already assigned to the block with ID ${existingBlock._id}.` };
        }

        const updateResult = await this.adaptiveBlocks.updateOne(
          { _id: existingBlock._id },
          { $addToSet: { taskIdSet: taskId } }
        );

        if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error in assignAdaptiveSchedule: ${errorMessage}`);
      return { error: `Failed to assign adaptive schedule: ${errorMessage}` };
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
  ): Promise<{ adaptiveBlockTable: AdaptiveBlock[]; droppedTaskSet: DroppedTask[] } | { error: string }> {
    try {
      const llmResponseText = await this.llm.executeLLM(contexted_prompt);
      let llmResponse: LlmLikelyResponse;

      try {
        llmResponse = JSON.parse(llmResponseText);
      } catch (parseError: unknown) { // Explicitly type parseError as unknown
        const parseErrorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        return { error: `LLM response was not valid JSON: ${parseErrorMessage}. Response: ${llmResponseText}` };
      }

      // Validate required fields in LLM response
      if (typeof llmResponse.analysis !== 'string' || llmResponse.analysis.trim() === '') { // Added validation for analysis, checking for empty string too
          return { error: "LLM response missing or empty 'analysis' string." };
      }
      if (!llmResponse.adaptiveBlocks || !Array.isArray(llmResponse.adaptiveBlocks)) {
        return { error: "LLM response missing 'adaptiveBlocks' array." };
      }
      if (!llmResponse.droppedTasks || !Array.isArray(llmResponse.droppedTasks)) {
        return { error: "LLM response missing 'droppedTasks' array." };
      }


      const assignedBlockIds: ID[] = [];
      for (const block of llmResponse.adaptiveBlocks) {
        const start = new Date(block.start);
        const end = new Date(block.end);

        for (const taskId of block.taskIds) {
          const assignResult = await this.assignAdaptiveSchedule({ owner, taskId, start, end });
          if ("error" in assignResult) {
            console.warn(`Warning: Could not assign task ${taskId} from LLM proposal: ${assignResult.error}`);
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
            { upsert: true }
          );
          newDroppedTasks.push(newDroppedTask);
        } catch (insertError: unknown) { // Explicitly type insertError as unknown
          const insertErrorMessage = insertError instanceof Error ? insertError.message : String(insertError);
          console.warn(`Warning: Could not add dropped task ${dropped.taskId}: ${insertErrorMessage}`);
        }
      }

      // Fetch the current state of adaptive blocks and dropped tasks for the owner
      // These will now return empty arrays if no items are found, rather than errors.
      const getBlocksResult = await this._getAdaptiveSchedule({ owner });
      const getDroppedTasksResult = await this._getDroppedTask({ owner });

      // Handle potential errors from _getAdaptiveSchedule or _getDroppedTask
      if ("error" in getBlocksResult) {
        return { error: `Failed to retrieve final adaptive schedule after AI processing: ${getBlocksResult.error}` };
      }
      if ("error" in getDroppedTasksResult) {
        return { error: `Failed to retrieve final dropped tasks after AI processing: ${getDroppedTasksResult.error}` };
      }

      const finalAdaptiveBlocks = getBlocksResult.adaptiveBlockTable;
      const finalDroppedTasks = getDroppedTasksResult.droppedTaskSet;

      return { adaptiveBlockTable: finalAdaptiveBlocks, droppedTaskSet: finalDroppedTasks };

    } catch (error: unknown) { // Explicitly type error as unknown
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error in requestAdaptiveScheduleAI: ${errorMessage}`);
      return { error: `Failed to request adaptive schedule from AI: ${errorMessage}` };
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
  async unassignBlock({ owner, taskId, timeBlockId }: { owner: User; taskId: ID; timeBlockId: ID }): Promise<Empty | { error: string }> {
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
        { $pull: { taskIdSet: taskId } }
      );

      if (updateResult.modifiedCount === 0) {
        return { error: `Failed to unassign task ${taskId} from block ${timeBlockId}.` };
      }

      return {};
    } catch (error: unknown) { // Explicitly type error as unknown
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error in unassignBlock: ${errorMessage}`);
      return { error: `Failed to unassign task: ${errorMessage}` };
    }
  }
}
```

## file: src/concepts/AdaptiveSchedule/AdaptiveSchedule.test.ts

```typescript
import { assertEquals, assertNotEquals, assert, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import AdaptiveScheduleConcept from "./AdaptiveSchedule.ts";
import { Config as GeminiConfig, GeminiLLM } from "@utils/GeminiLLM.ts";

// --- MOCK GEMINILLM FOR TESTING ---
/**
 * A mock implementation of GeminiLLM to control its response for deterministic testing.
 */
class MockGeminiLLM extends GeminiLLM {
    public mockResponse: string = '';
    constructor(config: GeminiConfig) {
        // Pass dummy config, as actual API calls are mocked
        super(config);
    }
    /**
     * Overrides the actual LLM execution to return a predefined mock response.
     */
    override async executeLLM(prompt: string): Promise<string> { // Added 'override' keyword
        console.log(`  [MOCK LLM] Called with prompt (truncated): ${prompt.substring(0, 200)}...`);
        return Promise.resolve(this.mockResponse);
    }
}
// --- END MOCK GEMINILLM ---

// --- HELPER TYPES FOR PROMPT GENERATION (as defined in the problem description) ---
interface Task {
  owner: ID;
  taskId: ID;
  taskName: string;
  category: string;
  duration: number; // minutes
  priority: number; // 1-5
  splittable: boolean;
  timeBlockSet?: ID[];
  deadline?: Date;
  slack?: number; // minutes
  preDependence?: ID[];
  postDependence?: ID[];
  note?: string;
}

interface TimeBlock {
  timeBlockId: ID;
  owner: ID;
  start: Date;
  end: Date;
  taskIdSet: ID[];
}

interface Schedule {
  timeBlocks: TimeBlock[];
}

interface Session {
  owner: ID;
  sessionName: string;
  sessionId: ID;
  isPaused: boolean;
  isActive: boolean;
  start?: Date;
  end?: Date;
  linkedTaskId?: ID;
  interruptReason?: string;
}

interface Routine {
  sessions: Session[];
}

interface Preference {
  preferences: string[];
}

// Assuming AdaptiveBlock interface is similar to the concept's internal one for `_getAdaptiveSchedule`
interface AdaptiveBlockForPrompt {
  _id: ID;
  owner: ID;
  start: Date;
  end: Date;
  taskIdSet: ID[];
}
// --- END HELPER TYPES ---

// --- HELPER FUNCTIONS FOR PROMPT GENERATION ---
/**
 * Converts a list of Task objects into a formatted string for the LLM prompt.
 */
function tasksToString(tasks: Task[]): string {
  if (tasks.length === 0) return '  (No tasks to schedule)';
  return tasks.map(task =>
    `  - Task ID: ${task.taskId}, Name: ${task.taskName}, Priority: ${task.priority}, Duration: ${task.duration} min, Splittable: ${task.splittable}, Deadline: ${task.deadline?.toISOString() || 'N/A'}` +
    `${task.note ? `, Note: "${task.note}"` : ''}`
  ).join('\n');
}

/**
 * Converts a Schedule object (list of TimeBlocks) into a formatted string for the LLM prompt.
 */
function scheduleToString(schedule: Schedule): string {
  if (schedule.timeBlocks.length === 0) return '  (No planned schedule)';
  return schedule.timeBlocks.map(block =>
    `  - Block ID: ${block.timeBlockId}, Start: ${block.start.toISOString()}, End: ${block.end.toISOString()}, Tasks: [${block.taskIdSet.join(', ')}]`
  ).join('\n');
}

/**
 * Converts a Routine object (list of Sessions) into a formatted string for the LLM prompt.
 */
function routineToString(routine: Routine): string {
  if (routine.sessions.length === 0) return '  (No actual routine)';
  return routine.sessions.map(session =>
    `  - Session ID: ${session.sessionId}, Name: ${session.sessionName}, Start: ${session.start?.toISOString() || 'N/A'}, End: ${session.end?.toISOString() || 'N/A'}, Linked Task: ${session.linkedTaskId || 'N/A'}`
  ).join('\n');
}

/**
 * Converts a list of AdaptiveBlock objects into a formatted string for the LLM prompt.
 */
function adaptiveBlocksToString(blocks: AdaptiveBlockForPrompt[]): string {
    if (blocks.length === 0) return '  (No existing adaptive blocks)';
    return blocks.map(block =>
      `  - Block ID: ${block._id}, Start: ${block.start.toISOString()}, End: ${block.end.toISOString()}, Tasks: [${block.taskIdSet.join(', ')}]`
    ).join('\n');
}

/**
 * Generates the structured prompt string for the Adaptive Schedule AI.
 * This function is provided by the problem description and adjusted for test context.
 */
function createAdaptiveSchedulePrompt(
  owner: ID,
  tasks: Task[],
  schedule: Schedule,
  routine: Routine,
  preference: Preference,
  existingAdaptiveBlocks: AdaptiveBlockForPrompt[], // Added to pass existing state
  currentTime?: string
): string {
  const existingBlocksSection =
    existingAdaptiveBlocks.length > 0
      ? `\nEXISTING ADAPTIVE BLOCKS:\n${adaptiveBlocksToString(existingAdaptiveBlocks)}\n`
      : "";

  const currentTimeSection = currentTime
    ? `\nCURRENT TIME: ${currentTime}\n** CRITICAL: You MUST schedule all time blocks to start at or after this current time. Do NOT schedule anything before ${currentTime}. **`
    : "";

  return `
  You are a helpful AI assistant that creates optimal adaptive schedules for users based on task analysis, planned schedules, actual routines, and user preferences.

  USER: ${owner}
  ${currentTimeSection}

  USER PREFERENCES:
  ${preference.preferences.map((p) => `- ${p}`).join("\n")}

  TASKS TO SCHEDULE:
  ** CRITICAL: ALL tasks listed below MUST be scheduled. Each task represents work that still needs to be done. **
  ** If a task has a note indicating "remaining" work, schedule exactly the duration specified. **
  ${tasksToString(tasks)}

  PLANNED SCHEDULE (Original Plan):
  ${scheduleToString(schedule)}

  ACTUAL ROUTINE (What Actually Happened):
  ${routineToString(routine)}

  EXISTING ADAPTIVE BLOCK:
  ${existingBlocksSection}

  TASK PRIORITY SCALE (1-5), determines how urgent the task is:
  - Priority 1 (Critical): Must be done ASAP - urgent deadlines, emergencies
  - Priority 2 (Important): Should be done soon - upcoming deadlines, high impact
  - Priority 3 (Regular): Necessary but not urgent
  - Priority 4 (Low): Can be done later
  - Priority 5 (Optional): Can be done if time permits - not time-sensitive or important

  ANALYSIS REQUIREMENTS:
  1. Analyze the deviation between the planned schedule and actual routine
  2. Identify tasks that were not completed or were interrupted
  3. Consider task priorities (1 = highest priority, 5 = lowest priority), deadlines, and dependencies
  4. Schedule critical tasks (priority 1-2) before lower priority tasks
  5. Consider user preferences for scheduling
  6. Respect task constraints (duration, splittable, slack)
  7. **CONCURRENCY OPTIMIZATION (ALWAYS APPLY): Whenever you have a PASSIVE/BACKGROUND task (laundry, dishwashing - tasks that run automatically), you MUST ALWAYS schedule it concurrently with an active task by creating OVERLAPPING time blocks. This is MANDATORY, not optional. Active tasks (cleaning room, organizing notes, studying) CANNOT be done concurrently with each other. RULE: If you see "Do Laundry" or "Dishwashing", immediately find an active task to overlap it with.**

  SCHEDULING CONSTRAINTS:
  - Times must be in ISO 8601 format (e.g., "2025-10-04T14:00:00Z")
  - Start time must be before end time
  - ALL time blocks MUST start at or after the CURRENT TIME if provided
  - **CRITICAL DURATION RULE: Each time block's duration MUST be at least as long as the longest task in that block (NOT the sum). When tasks are concurrent/overlapping in separate blocks, each block is evaluated independently.**
  - For non-splittable tasks, the block must be at least as long as the task duration
  - For splittable tasks, you can either: (1) create a single block with duration >= task duration, OR (2) split across multiple blocks where sum of block durations >= task duration
  - **CONCURRENCY CLARIFICATION: When creating overlapping blocks, each block duration only needs to match its own task duration. Example: Laundry (60 min) in Block A from 1:40-2:40 PM, Study (120 min) in Block B from 1:40-3:40 PM - this is CORRECT and maximizes time savings.**
  - High priority tasks should be scheduled first
  - Respect task deadlines
  - Consider dependencies (preDependence tasks must be scheduled before dependent tasks)
  - If a task is splittable, it can be divided across multiple blocks. Otherwise, do not divide it across multiple **non-consecutive blocks**.
  - **MANDATORY: You MUST ALWAYS create overlapping/concurrent blocks for passive tasks (laundry, dishwashing, etc.). This means creating separate blocks with the same or overlapping time ranges. For example, if you have laundry and studying, ALWAYS create two blocks that overlap in time - NEVER schedule passive tasks sequentially. This is required even if you have enough time, as it frees up time for additional tasks.**

  CRITICAL REQUIREMENTS:
  1. ONLY schedule the tasks listed above - do NOT add any new tasks
  2. Ensure all scheduled blocks have valid ISO timestamps
  3. Assign tasks based on priority and deadline urgency
  4. **ABSOLUTE DEADLINE CONSTRAINT: If a task has a deadline, it MUST be completed BEFORE that deadline. Do NOT schedule any part of the task after its deadline.**
  5. **If there is insufficient time to complete all tasks before their deadlines, prioritize higher priority tasks first**
  6. **DURATION CONSTRAINT (FLEXIBLE WHEN CONSTRAINED): Ideally give each task its FULL required duration. However, when time is severely constrained and you have leftover time that can't fit a full task, it's acceptable to schedule a partial task duration rather than leaving the time empty. For example, if you have 20 minutes left and a 60-minute task, schedule it for 20 minutes rather than dropping it entirely.**
  7. Consider the actual routine and how it deviates from the schedule to understand what time blocks are realistic
  8. Provide reasoning for why actual routine deviated from the original planned schedule
  9. For a task with a long duration and is splittable, consider splitting it into multiple non-consecutive time blocks for better focus
  10. If time is insufficient to schedule all tasks, prioritize tasks with urgent deadlines (approaching soon) or higher priority (1-2); only drop tasks if absolutely no time remains

  Return your response as a JSON object with this exact structure:
  {
  "analysis": "Brief analysis of why the schedule deviated from the routine and key insights",
  "adaptiveBlocks": [
      {
      "start": "ISO timestamp",
      "end": "ISO timestamp",
      "taskIds": ["taskId1", "taskId2"]
      }
  ],
  "droppedTasks": [
      {"taskId": "taskId3", "reason": "reason for dropping"}
  ]
  }

  EXAMPLE 1 - Deadline constraint:
  - If task-1 has deadline at 5 PM and current time is 12 PM
  - Available time: 5 hours (300 minutes)
  - If task-1 needs 100 min + other high priority tasks need 200 min = 300 min total
  - Low priority tasks (task-5, task-6) CANNOT fit before deadline
  - CORRECT: Put task-5 and task-6 in droppedTasks
  - WRONG: Schedule tasks after the 5 PM deadline

  EXAMPLE 2 - Concurrency optimization (ALWAYS REQUIRED FOR PASSIVE TASKS):
  - Laundry (60 min, PASSIVE) + Study (120 min, ACTIVE)
  - MANDATORY APPROACH: Always overlap passive tasks - create these blocks:
    Block A: {"start": "2025-10-04T14:00:00Z", "end": "2025-10-04T15:00:00Z", "taskIds": ["laundry-task-id"]},
    Block B: {"start": "2025-10-04T14:00:00Z", "end": "2025-10-04T16:00:00Z", "taskIds": ["study-task-id"]}
  - Result: Both complete by 4:00 PM, saving 60 minutes for other tasks
  - WRONG: Scheduling laundry sequentially (3:40-4:40) after studying wastes 60 minutes
  - WRONG: Clean Room + Organize Notes overlapping (both ACTIVE - cannot be concurrent)
  - WRONG: Any scheduling that extends past the deadline

  Return ONLY the JSON object, no additional text.`;
}
// --- END HELPER FUNCTIONS ---


// --- LOGGING HELPER FUNCTIONS ---
/**
 * Helper function to log the current adaptive schedule for a given user.
 */
async function logCurrentAdaptiveSchedule(concept: AdaptiveScheduleConcept, owner: ID, description: string) {
    console.log(`\n  --- Current Adaptive Schedule for ${owner} (${description}) ---`);
    const result = await concept._getAdaptiveSchedule({ owner });
    if ("error" in result) {
        console.log(`    Error fetching schedule: ${result.error}`);
    } else {
        if (result.adaptiveBlockTable.length === 0) {
            console.log("    (No adaptive blocks found)");
        } else {
            result.adaptiveBlockTable.forEach(block => {
                console.log(`    - Block ID: ${block._id}, Start: ${block.start.toISOString()}, End: ${block.end.toISOString()}, Tasks: [${block.taskIdSet.join(', ')}]`);
            });
        }
    }
    console.log(`  --- End Current Adaptive Schedule ---`);
}

/**
 * Helper function to log the current dropped tasks for a given user.
 */
async function logCurrentDroppedTasks(concept: AdaptiveScheduleConcept, owner: ID, description: string) {
    console.log(`\n  --- Current Dropped Tasks for ${owner} (${description}) ---`);
    const result = await concept._getDroppedTask({ owner });
    if ("error" in result) {
        // This log will now only appear for actual errors, not for "no tasks found"
        console.log(`    Error fetching dropped tasks: ${result.error}`);
    } else {
        if (result.droppedTaskSet.length === 0) {
            console.log("    (No dropped tasks found)");
        } else {
            result.droppedTaskSet.forEach(task => {
                console.log(`    - Task ID: ${task.taskId}, Reason: ${task.reason}`);
            });
        }
    }
    console.log(`  --- End Current Dropped Tasks ---`);
}
// --- END LOGGING HELPER FUNCTIONS ---


Deno.test("AdaptiveSchedule Concept Tests", async (t) => {
  const [db, client] = await testDb();
  // Instantiate with a dummy API key for the mock LLM
  const concept = new AdaptiveScheduleConcept(db, { apiKey: "dummy-api-key" } as GeminiConfig);

  // Override the LLM instance within the concept with our mock for testing purposes
  const mockGeminiLLM = new MockGeminiLLM({ apiKey: "dummy-api-key" });
  (concept as any).llm = mockGeminiLLM;

  const userA = "user:Alice" as ID;
  const userB = "user:Bob" as ID;

  // Define new fixed current time for the operational principle
  const currentTestTime = new Date('2025-10-04T13:00:00Z'); // 1:00 PM UTC
  const currentTimeISO = currentTestTime.toISOString();

  // Tasks to schedule (reflecting remaining duration after actual routine)
  const taskProjectProposalId = "task:projectProposal" as ID;
  const taskReviewPRId = "task:reviewPR" as ID;
  const taskGymId = "task:gym" as ID;
  const taskDinnerId = "task:dinner" as ID;
  const taskSpanishId = "task:spanish" as ID;

  const sampleTaskProjectProposal: Task = {
      owner: userA, taskId: taskProjectProposalId, taskName: "Complete Project Proposal", category: "Work",
      duration: 90, priority: 1, splittable: true, // 120 total - 30 completed = 90 remaining
  };
  const sampleTaskReviewPR: Task = {
      owner: userA, taskId: taskReviewPRId, taskName: "Review Pull Requests", category: "Work",
      duration: 60, priority: 2, splittable: false,
  };
  const sampleTaskGym: Task = {
      owner: userA, taskId: taskGymId, taskName: "Gym Workout", category: "Health",
      duration: 60, priority: 3, splittable: false,
  };
  const sampleTaskDinner: Task = {
      owner: userA, taskId: taskDinnerId, taskName: "Prepare Dinner", category: "Household",
      duration: 30, priority: 3, splittable: false,
  };
  const sampleTaskSpanish: Task = {
      owner: userA, taskId: taskSpanishId, taskName: "Study Spanish", category: "Education",
      duration: 30, priority: 4, splittable: true,
  };

  const sampleTasksList = [
      sampleTaskProjectProposal,
      sampleTaskReviewPR,
      sampleTaskGym,
      sampleTaskDinner,
      sampleTaskSpanish,
  ];

  // Planned Schedule (Original Plan)
  const plannedScheduleBlock1: TimeBlock = {
      timeBlockId: "planned-1" as ID, owner: userA,
      start: new Date('2025-10-04T09:00:00Z'), end: new Date('2025-10-04T11:00:00Z'),
      taskIdSet: [taskProjectProposalId],
  };
  const plannedScheduleBlock2: TimeBlock = {
      timeBlockId: "planned-2" as ID, owner: userA,
      start: new Date('2025-10-04T14:00:00Z'), end: new Date('2025-10-04T15:00:00Z'),
      taskIdSet: [taskReviewPRId],
  };
  const plannedScheduleBlock3: TimeBlock = {
      timeBlockId: "planned-3" as ID, owner: userA,
      start: new Date('2025-10-04T17:00:00Z'), end: new Date('2025-10-04T18:00:00Z'),
      taskIdSet: [taskGymId],
  };
  const plannedScheduleBlock4: TimeBlock = {
      timeBlockId: "planned-4" as ID, owner: userA,
      start: new Date('2025-10-04T18:00:00Z'), end: new Date('2025-10-04T18:30:00Z'),
      taskIdSet: [taskDinnerId],
  };
  const plannedScheduleBlock5: TimeBlock = {
      timeBlockId: "planned-5" as ID, owner: userA,
      start: new Date('2025-10-04T19:00:00Z'), end: new Date('2025-10-04T19:30:00Z'),
      taskIdSet: [taskSpanishId],
  };
  const plannedSchedule: Schedule = { timeBlocks: [
      plannedScheduleBlock1, plannedScheduleBlock2, plannedScheduleBlock3,
      plannedScheduleBlock4, plannedScheduleBlock5
  ] };

  // Actual Routine (What Actually Happened)
  const actualRoutineSession1: Session = {
      owner: userA, sessionName: "Morning Meeting", sessionId: freshID(),
      isPaused: false, isActive: false,
      start: new Date('2025-10-04T09:00:00Z'), end: new Date('2025-10-04T10:30:00Z'),
      interruptReason: "Unexpected urgent meeting took longer than expected",
  };
  const actualRoutineSession2: Session = {
      owner: userA, sessionName: "Started Project Proposal", sessionId: freshID(),
      isPaused: true, isActive: false, // Paused implies incomplete
      start: new Date('2025-10-04T10:30:00Z'), end: new Date('2025-10-04T11:00:00Z'),
      linkedTaskId: taskProjectProposalId, // Partially completed
      interruptReason: "Had to stop due to lunch break, only completed 30 minutes",
  };
  const actualRoutine: Routine = { sessions: [actualRoutineSession1, actualRoutineSession2] };

  const samplePreference: Preference = { preferences: ["Prefer high-priority tasks first.", "Batch similar tasks.", "No demanding work after 9 PM."] };

  const emptySchedule: Schedule = { timeBlocks: [] };
  const emptyRoutine: Routine = { sessions: [] };

  await t.step("Operational Principle: AI Adaptation, Unassigning, Querying", async () => {
    console.log("\n--- Operational Principle Test ---");
    console.log(`  Test started at simulated current time: ${currentTimeISO}`);

    // LLM should generate adaptive schedule based on the new mock data
    mockGeminiLLM.mockResponse = JSON.stringify({
      analysis: "Schedule adjusted due to unexpected morning meeting and interrupted project proposal. High priority tasks (Project Proposal, Review PRs) are rescheduled first. Gym, Dinner, and Spanish Study are placed in the evening to accommodate. No tasks were dropped.",
      adaptiveBlocks: [
        {
          start: new Date('2025-10-04T13:00:00Z').toISOString(), // 1:00 PM UTC
          end: new Date('2025-10-04T14:30:00Z').toISOString(), // 2:30 PM UTC (90 min for project proposal)
          taskIds: [taskProjectProposalId],
        },
        {
          start: new Date('2025-10-04T14:30:00Z').toISOString(), // 2:30 PM UTC
          end: new Date('2025-10-04T15:30:00Z').toISOString(), // 3:30 PM UTC (60 min for review PRs)
          taskIds: [taskReviewPRId],
        },
        {
          start: new Date('2025-10-04T17:00:00Z').toISOString(), // 5:00 PM UTC
          end: new Date('2025-10-04T18:00:00Z').toISOString(), // 6:00 PM UTC (60 min for gym)
          taskIds: [taskGymId],
        },
        {
          start: new Date('2025-10-04T18:00:00Z').toISOString(), // 6:00 PM UTC
          end: new Date('2025-10-04T18:30:00Z').toISOString(), // 6:30 PM UTC (30 min for dinner)
          taskIds: [taskDinnerId],
        },
        {
          start: new Date('2025-10-04T18:30:00Z').toISOString(), // 6:30 PM UTC
          end: new Date('2025-10-04T19:00:00Z').toISOString(), // 7:00 PM UTC (30 min for spanish)
          taskIds: [taskSpanishId],
        },
      ],
      droppedTasks: [],
    });

    const contextedPrompt = createAdaptiveSchedulePrompt(
      userA,
      sampleTasksList,
      plannedSchedule,
      actualRoutine,
      samplePreference,
      [], // No existing adaptive blocks *before* the LLM runs in this scenario
      currentTimeISO
    );

    console.log(`  Action: requestAdaptiveScheduleAI for user ${userA} with contexted_prompt`);
    const aiResult = await concept.requestAdaptiveScheduleAI({ owner: userA, contexted_prompt: contextedPrompt });
    if ("error" in aiResult) {
        throw new Error(`requestAdaptiveScheduleAI failed: ${aiResult.error}`);
    }
    console.log(`  Output: Adaptive Blocks: ${aiResult.adaptiveBlockTable.length} entries, Dropped Tasks: ${aiResult.droppedTaskSet.length} entries`);

    // Verify LLM's new schedule
    assertEquals(aiResult.adaptiveBlockTable.length, 5, "Total number of adaptive blocks after AI should be 5.");
    assertEquals(aiResult.droppedTaskSet.length, 0, "No tasks should be dropped.");
    
    // Check for specific tasks
    assert(aiResult.adaptiveBlockTable.some(b => b.taskIdSet.includes(taskProjectProposalId)), `Task ${taskProjectProposalId} should be rescheduled.`);
    assert(aiResult.adaptiveBlockTable.some(b => b.taskIdSet.includes(taskReviewPRId)), `Task ${taskReviewPRId} should be rescheduled.`);
    assert(aiResult.adaptiveBlockTable.some(b => b.taskIdSet.includes(taskGymId)), `Task ${taskGymId} should be rescheduled.`);
    assert(aiResult.adaptiveBlockTable.some(b => b.taskIdSet.includes(taskDinnerId)), `Task ${taskDinnerId} should be rescheduled.`);
    assert(aiResult.adaptiveBlockTable.some(b => b.taskIdSet.includes(taskSpanishId)), `Task ${taskSpanishId} should be rescheduled.`);

    await logCurrentAdaptiveSchedule(concept, userA, "after AI adaptation");
    await logCurrentDroppedTasks(concept, userA, "after AI adaptation");


    // 3. Unassign a task (e.g., user decides to do Gym later manually)
    console.log(`  Action: unassignBlock for user ${userA}, task ${taskGymId} from its block`);
    const gymBlock = aiResult.adaptiveBlockTable.find(b => b.taskIdSet.includes(taskGymId));
    assert(gymBlock, "Gym block must exist to unassign.");
    const unassignGymResult = await concept.unassignBlock({ owner: userA, taskId: taskGymId, timeBlockId: gymBlock._id });
    if ("error" in unassignGymResult) {
        throw new Error(`unassignBlock failed: ${unassignGymResult.error}`);
    }
    console.log(`  Output: {} (success)`);

    // Verify state after unassignment
    const verifyGymRemoved = await concept.adaptiveBlocks.findOne({ _id: gymBlock._id });
    assert(!verifyGymRemoved?.taskIdSet.includes(taskGymId), "Task (gym) should be removed from its block");
    await logCurrentAdaptiveSchedule(concept, userA, "after unassigning gym task");


    // 4. Query for adaptive blocks (should reflect current state)
    console.log(`  Action: _getAdaptiveSchedule for user ${userA}`);
    const getScheduleResult = await concept._getAdaptiveSchedule({ owner: userA });
    if ("error" in getScheduleResult) {
        throw new Error(`_getAdaptiveSchedule failed: ${getScheduleResult.error}`);
    }
    // Expect 5 blocks, because the empty block for gym is not deleted
    assertEquals(getScheduleResult.adaptiveBlockTable.length, 5, "Should return 5 adaptive blocks (including one empty) after unassigning gym.");
    console.log(`  Output: Found ${getScheduleResult.adaptiveBlockTable.length} adaptive blocks.`);

    // 5. Query for dropped tasks (should still be empty, no error expected)
    console.log(`  Action: _getDroppedTask for user ${userA}`);
    const getDroppedResult = await concept._getDroppedTask({ owner: userA });
    if ("error" in getDroppedResult) {
        throw new Error(`_getDroppedTask failed unexpectedly: ${getDroppedResult.error}`);
    }
    assertEquals(getDroppedResult.droppedTaskSet.length, 0, "Should still have 0 dropped tasks.");
    console.log(`  Output: Found ${getDroppedResult.droppedTaskSet.length} dropped tasks.`);


    console.log("\n\n--- Operational Principle Test Summary ---");
    console.log(`Summary based on current time: ${currentTimeISO}`);

    // 1. All Tasks
    console.log("\nAll Tasks (considered for scheduling):");
    console.log(tasksToString(sampleTasksList));

    // 2. Original Planned Schedule
    console.log("\nOriginal Planned Schedule:");
    console.log(scheduleToString(plannedSchedule));

    // 3. Actual Routine
    console.log("\nActual Routine:");
    console.log(routineToString(actualRoutine));

    // 4. Final Adaptive Schedule
    console.log("\nFinal Adaptive Schedule:");
    const finalAdaptiveScheduleResult = await concept._getAdaptiveSchedule({ owner: userA });
    if ("error" in finalAdaptiveScheduleResult) {
        console.log(`  Error retrieving final adaptive schedule: ${finalAdaptiveScheduleResult.error}`);
    } else {
        console.log(adaptiveBlocksToString(finalAdaptiveScheduleResult.adaptiveBlockTable));
    }

    // 5. Final Dropped Tasks
    console.log("\nFinal Dropped Tasks:");
    const finalDroppedTasksResult = await concept._getDroppedTask({ owner: userA });
    if ("error" in finalDroppedTasksResult) {
        console.log(`  Error retrieving final dropped tasks: ${finalDroppedTasksResult.error}`);
    } else {
        if (finalDroppedTasksResult.droppedTaskSet.length === 0) {
            console.log("  (No dropped tasks found)");
        } else {
            finalDroppedTasksResult.droppedTaskSet.forEach(task => {
                console.log(`  - Task ID: ${task.taskId}, Reason: ${task.reason}`);
            });
        }
    }
    console.log("--- End Summary ---");
  });

  await t.step("Interesting Scenario 1: Duplicate Time Block & Task Assignment", async () => {
    console.log("\n--- Interesting Scenario 1: Duplicate Time Block & Task Assignment ---");
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 11, 0); // 11:00 AM
    const end = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12, 0); // 12:00 PM

    // Attempt to add a time block that already exists (expect error)
    console.log(`  Action: addTimeBlock (first call) for user ${userA}, from ${start.toISOString()} to ${end.toISOString()}`);
    const addBlockResult = await concept.addTimeBlock({ owner: userA, start, end });
    if ("error" in addBlockResult) { 
        throw new Error(`addTimeBlock failed unexpectedly on first call: ${addBlockResult.error}`);
    }
    const timeBlockId = addBlockResult.timeBlockId;
    console.log(`  Output: timeBlockId = ${timeBlockId}`);
    await logCurrentAdaptiveSchedule(concept, userA, "after adding unique time block");

    console.log(`  Action: addTimeBlock (duplicate call) for user ${userA}, from ${start.toISOString()} to ${end.toISOString()}`);
    const duplicateAddBlockResult = await concept.addTimeBlock({ owner: userA, start, end });
    assert("error" in duplicateAddBlockResult, "Should return an error for duplicate time block");
    console.log(`  Output: ${JSON.stringify(duplicateAddBlockResult)}`);
    assertEquals(duplicateAddBlockResult.error, "An adaptive time block with this owner, start, and end already exists.");
    await logCurrentAdaptiveSchedule(concept, userA, "after attempting to add duplicate time block");


    // Assign a task
    const uniqueTaskId = freshID();
    console.log(`  Action: assignAdaptiveSchedule for user ${userA}, task ${uniqueTaskId} to block starting ${start.toISOString()}`);
    const assignResult = await concept.assignAdaptiveSchedule({ owner: userA, taskId: uniqueTaskId, start, end });
    if ("error" in assignResult) {
        throw new Error(`assignAdaptiveSchedule failed unexpectedly on first assignment: ${assignResult.error}`);
    }
    console.log(`  Output: timeBlockId = ${assignResult.timeBlockId}`);
    await logCurrentAdaptiveSchedule(concept, userA, "after assigning first task to time block");


    // Attempt to assign the *same* task to the *same* block again (expect error)
    console.log(`  Action: assignAdaptiveSchedule (duplicate task) for user ${userA}, task ${uniqueTaskId} to block starting ${start.toISOString()}`);
    const duplicateAssignResult = await concept.assignAdaptiveSchedule({ owner: userA, taskId: uniqueTaskId, start, end });
    assert("error" in duplicateAssignResult, "Should return an error for assigning duplicate task to same block");
    console.log(`  Output: ${JSON.stringify(duplicateAssignResult)}`);
    // Need to fetch the block again to get its current _id
    const currentBlock = await concept.adaptiveBlocks.findOne({ owner: userA, start, end });
    assert(currentBlock, "Block should still exist"); // Safety check
    assertEquals(duplicateAssignResult.error, `Task ${uniqueTaskId} is already assigned to the block with ID ${currentBlock._id}.`);
    await logCurrentAdaptiveSchedule(concept, userA, "after attempting to assign duplicate task");


    // Assign a *different* task to the *same* block (expect success)
    const anotherTaskId = freshID();
    console.log(`  Action: assignAdaptiveSchedule (new task) for user ${userA}, task ${anotherTaskId} to block starting ${start.toISOString()}`);
    const newAssignResult = await concept.assignAdaptiveSchedule({ owner: userA, taskId: anotherTaskId, start, end });
    if ("error" in newAssignResult) {
        throw new Error(`assignAdaptiveSchedule failed unexpectedly on second assignment: ${newAssignResult.error}`);
    }
    assertEquals(newAssignResult.timeBlockId, timeBlockId, "Should assign to the existing block");
    console.log(`  Output: timeBlockId = ${newAssignResult.timeBlockId}`);

    const verifyBlock = await concept.adaptiveBlocks.findOne({ _id: timeBlockId });
    assert(verifyBlock?.taskIdSet.includes(uniqueTaskId), "First task should still be in the block");
    assert(verifyBlock?.taskIdSet.includes(anotherTaskId), "Second task should be in the block");
    assertEquals(verifyBlock?.taskIdSet.length, 2, "Block should have two tasks");
    await logCurrentAdaptiveSchedule(concept, userA, "after assigning another task to the same time block");
  });

  await t.step("Interesting Scenario 2: Invalid Inputs", async () => {
    console.log("\n--- Interesting Scenario 2: Invalid Inputs ---");
    const testUser = "user:InvalidUser" as ID;
    const testTaskId = "task:InvalidTask" as ID;
    const nowLocal = new Date(); // Use a local 'now' for this scenario

    // Invalid start/end times for addTimeBlock
    console.log("  Action: addTimeBlock with start >= end");
    const invalidTimeBlockResult1 = await concept.addTimeBlock({ owner: testUser, start: nowLocal, end: nowLocal });
    assert("error" in invalidTimeBlockResult1, "Should error when start >= end");
    console.log(`  Output: ${JSON.stringify(invalidTimeBlockResult1)}`);
    assertEquals(invalidTimeBlockResult1.error, "'start' TimeStamp must be before 'end' TimeStamp.");

    // Invalid start/end date objects
    console.log("  Action: addTimeBlock with invalid Date objects (start)");
    const invalidDateResult1 = await concept.addTimeBlock({ owner: testUser, start: new Date("invalid"), end: nowLocal });
    assert("error" in invalidDateResult1, "Should error with invalid start Date object");
    console.log(`  Output: ${JSON.stringify(invalidDateResult1)}`);
    assertEquals(invalidDateResult1.error, "Invalid 'start' TimeStamp.");
    
    console.log("  Action: addTimeBlock with invalid Date objects (end)");
    const invalidDateResult2 = await concept.addTimeBlock({ owner: testUser, start: nowLocal, end: new Date("invalid") });
    assert("error" in invalidDateResult2, "Should error with invalid end Date object");
    console.log(`  Output: ${JSON.stringify(invalidDateResult2)}`);
    assertEquals(invalidDateResult2.error, "Invalid 'end' TimeStamp.");


    // Invalid inputs for assignAdaptiveSchedule (same checks as addTimeBlock, plus task-specific)
    console.log("  Action: assignAdaptiveSchedule with start >= end");
    const invalidAssignResult1 = await concept.assignAdaptiveSchedule({ owner: testUser, taskId: testTaskId, start: nowLocal, end: nowLocal });
    assert("error" in invalidAssignResult1, "Should error when start >= end for assignment");
    console.log(`  Output: ${JSON.stringify(invalidAssignResult1)}`);
    assertEquals(invalidAssignResult1.error, "'start' TimeStamp must be before 'end' TimeStamp.");

    // Unassign from non-existent block
    const nonExistentBlockId = freshID();
    console.log(`  Action: unassignBlock from non-existent block ${nonExistentBlockId}`);
    const unassignNonExistentResult = await concept.unassignBlock({ owner: testUser, taskId: testTaskId, timeBlockId: nonExistentBlockId });
    assert("error" in unassignNonExistentResult, "Should error when unassigning from non-existent block");
    console.log(`  Output: ${JSON.stringify(unassignNonExistentResult)}`);
    assertEquals(unassignNonExistentResult.error, `Adaptive block with ID ${nonExistentBlockId} not found for owner ${testUser}.`);

    // Unassign non-existent task from an existing block
    const addBlockForTestResult = await concept.addTimeBlock({ owner: testUser, start: new Date(nowLocal.getTime() + 1000), end: new Date(nowLocal.getTime() + 3600 * 1000) }); // Block for 1 hour later
    if ("error" in addBlockForTestResult) {
        throw new Error(`Failed to create block for testing unassignNonExistentTaskResult: ${addBlockForTestResult.error}`);
    }
    const existingBlockId = addBlockForTestResult.timeBlockId;
    console.log(`  Action: unassignBlock with non-existent task from block ${existingBlockId}`);
    const unassignNonExistentTaskResult = await concept.unassignBlock({ owner: testUser, taskId: testTaskId, timeBlockId: existingBlockId });
    assert("error" in unassignNonExistentTaskResult, "Should error when unassigning non-existent task from block");
    console.log(`  Output: ${JSON.stringify(unassignNonExistentTaskResult)}`);
    assertEquals(unassignNonExistentTaskResult.error, `Task ${testTaskId} not found in block ${existingBlockId}.`);

    // Query for schedule/dropped tasks for user with no data (expect empty arrays, not errors)
    const emptyUser = freshID();
    console.log(`  Action: _getAdaptiveSchedule for user ${emptyUser} with no data`);
    const emptyScheduleResult = await concept._getAdaptiveSchedule({ owner: emptyUser });
    // No error expected for simply having no blocks
    if ("error" in emptyScheduleResult) {
      throw new Error(`_getAdaptiveSchedule failed unexpectedly for empty user: ${emptyScheduleResult.error}`);
    }
    assertEquals(emptyScheduleResult.adaptiveBlockTable.length, 0, "Should return an empty array for user with no adaptive blocks.");
    console.log(`  Output: Found ${emptyScheduleResult.adaptiveBlockTable.length} adaptive blocks.`);


    console.log(`  Action: _getDroppedTask for user ${emptyUser} with no data`);
    const emptyDroppedResult = await concept._getDroppedTask({ owner: emptyUser });
    // No error expected for simply having no dropped tasks
    if ("error" in emptyDroppedResult) {
      throw new Error(`_getDroppedTask failed unexpectedly for empty user: ${emptyDroppedResult.error}`);
    }
    assertEquals(emptyDroppedResult.droppedTaskSet.length, 0, "Should return an empty array for user with no dropped tasks.");
    console.log(`  Output: Found ${emptyDroppedResult.droppedTaskSet.length} dropped tasks.`);
  });

  await t.step("Interesting Scenario 3: LLM Response Handling", async () => {
    console.log("\n--- Interesting Scenario 3: LLM Response Handling ---");
    const userC = "user:Charlie" as ID;
    const taskC1 = "task:read" as ID;
    const taskC2 = "task:plan" as ID;
    const taskC3 = "task:cleanup" as ID;

    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    const currentTimeISO = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), currentHour, currentMinute).toISOString();

    // LLM proposes new blocks and dropped tasks
    const llmBlockC1Start = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), currentHour + 2, 0);
    const llmBlockC1End = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), currentHour + 3, 0);
    const llmBlockC2Start = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), currentHour + 3, 0);
    const llmBlockC2End = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), currentHour + 4, 0);
    const llmDroppedTaskC3Reason = "Not enough time for low priority task.";

    mockGeminiLLM.mockResponse = JSON.stringify({
      analysis: "New schedule for Charlie.", // Added analysis field
      adaptiveBlocks: [
        {
          start: llmBlockC1Start.toISOString(),
          end: llmBlockC1End.toISOString(),
          taskIds: [taskC1],
        },
        {
          start: llmBlockC2Start.toISOString(),
          end: llmBlockC2End.toISOString(),
          taskIds: [taskC2],
        },
      ],
      droppedTasks: [{ taskId: taskC3, reason: llmDroppedTaskC3Reason }],
    });

    const contextedPromptC = createAdaptiveSchedulePrompt(
      userC,
      [{ owner: userC, taskId: taskC1, taskName: "Read book", category: "Leisure", duration: 60, priority: 3, splittable: true },
       { owner: userC, taskId: taskC2, taskName: "Plan week", category: "Planning", duration: 60, priority: 2, splittable: false },
       { owner: userC, taskId: taskC3, taskName: "Clean kitchen", category: "Household", duration: 30, priority: 4, splittable: false }],
      emptySchedule,
      emptyRoutine,
      samplePreference,
      [], // No existing blocks for this prompt
      currentTimeISO
    );

    console.log(`  Action: requestAdaptiveScheduleAI for user ${userC} (new schedule)`);
    const aiResultC = await concept.requestAdaptiveScheduleAI({ owner: userC, contexted_prompt: contextedPromptC });
    if ("error" in aiResultC) {
        throw new Error(`requestAdaptiveScheduleAI failed: ${aiResultC.error}`);
    }
    assertEquals(aiResultC.adaptiveBlockTable.length, 2, "Should have 2 adaptive blocks for Charlie");
    assertEquals(aiResultC.droppedTaskSet.length, 1, "Should have 1 dropped task for Charlie");
    assert(aiResultC.adaptiveBlockTable.some(b => b.taskIdSet.includes(taskC1)), "TaskC1 should be scheduled");
    assert(aiResultC.adaptiveBlockTable.some(b => b.taskIdSet.includes(taskC2)), "TaskC2 should be scheduled");
    assert(aiResultC.droppedTaskSet.some(dt => dt.taskId === taskC3 && dt.reason === llmDroppedTaskC3Reason), "TaskC3 should be dropped with reason");
    console.log(`  Output: Adaptive Blocks: ${aiResultC.adaptiveBlockTable.length} entries, Dropped Tasks: ${aiResultC.droppedTaskSet.length} entries`);
    await logCurrentAdaptiveSchedule(concept, userC, "after AI scheduling for Charlie");
    await logCurrentDroppedTasks(concept, userC, "after AI dropping tasks for Charlie");


    // LLM returns malformed JSON
    mockGeminiLLM.mockResponse = "this is not json";
    console.log(`  Action: requestAdaptiveScheduleAI for user ${userC} (malformed JSON)`);
    const malformedResult = await concept.requestAdaptiveScheduleAI({ owner: userC, contexted_prompt: "dummy prompt" });
    assert("error" in malformedResult, "Should error for malformed LLM response");
    assert(malformedResult.error.includes("LLM response was not valid JSON"), "Error message should indicate JSON parsing failure");
    console.log(`  Output: ${JSON.stringify(malformedResult)}`);


    // LLM returns JSON missing required fields
    mockGeminiLLM.mockResponse = JSON.stringify({ analysis: "Partial response", adaptiveBlocks: [] }); // Missing droppedTasks
    console.log(`  Action: requestAdaptiveScheduleAI for user ${userC} (missing 'droppedTasks' array)`);
    const missingFieldResult1 = await concept.requestAdaptiveScheduleAI({ owner: userC, contexted_prompt: "dummy prompt" });
    assert("error" in missingFieldResult1, "Should error for missing droppedTasks field");
    assert(missingFieldResult1.error.includes("LLM response missing 'droppedTasks' array."), "Error message should indicate missing 'droppedTasks'");
    console.log(`  Output: ${JSON.stringify(missingFieldResult1)}`);

    mockGeminiLLM.mockResponse = JSON.stringify({ analysis: "Partial response", droppedTasks: [] }); // Missing adaptiveBlocks
    console.log(`  Action: requestAdaptiveScheduleAI for user ${userC} (missing 'adaptiveBlocks' array)`);
    const missingFieldResult2 = await concept.requestAdaptiveScheduleAI({ owner: userC, contexted_prompt: "dummy prompt" });
    assert("error" in missingFieldResult2, "Should error for missing adaptiveBlocks field");
    assert(missingFieldResult2.error.includes("LLM response missing 'adaptiveBlocks' array."), "Error message should indicate missing 'adaptiveBlocks'");
    console.log(`  Output: ${JSON.stringify(missingFieldResult2)}`);

    // LLM returns JSON with empty 'analysis' string
    mockGeminiLLM.mockResponse = JSON.stringify({ analysis: "", adaptiveBlocks: [], droppedTasks: [] });
    console.log(`  Action: requestAdaptiveScheduleAI for user ${userC} (empty 'analysis' string)`);
    const emptyAnalysisResult = await concept.requestAdaptiveScheduleAI({ owner: userC, contexted_prompt: "dummy prompt" });
    assert("error" in emptyAnalysisResult, "Should error for empty analysis string");
    assert(emptyAnalysisResult.error.includes("LLM response missing or empty 'analysis' string."), "Error message should indicate missing or empty 'analysis' string.");
    console.log(`  Output: ${JSON.stringify(emptyAnalysisResult)}`);

  });

  await t.step("Interesting Scenario 4: Multiple Users", async () => {
    console.log("\n--- Interesting Scenario 4: Multiple Users ---");
    const userD = "user:David" as ID;
    const userE = "user:Eve" as ID;
    const nowLocal = new Date(); // Use a local 'now' for this scenario

    const startD = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate(), 13, 0);
    const endD = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate(), 14, 0);
    const taskD1 = "task:gym" as ID;

    const startE = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate(), 15, 0);
    const endE = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate(), 16, 0);
    const taskE1 = "task:meeting" as ID;

    // User D actions
    console.log(`  Action: addTimeBlock for user ${userD}`);
    const blockDResult = await concept.addTimeBlock({ owner: userD, start: startD, end: endD });
    if ("error" in blockDResult) {
        throw new Error(`addTimeBlock for userD failed: ${blockDResult.error}`);
    }
    const blockDId = blockDResult.timeBlockId;
    console.log(`  Output: timeBlockId = ${blockDId}`);
    await logCurrentAdaptiveSchedule(concept, userD, `after adding block for ${userD}`);

    console.log(`  Action: assignAdaptiveSchedule for user ${userD}, task ${taskD1}`);
    const assignDResult = await concept.assignAdaptiveSchedule({ owner: userD, taskId: taskD1, start: startD, end: endD });
    if ("error" in assignDResult) {
        throw new Error(`assignAdaptiveSchedule for userD failed: ${assignDResult.error}`);
    }
    console.log(`  Output: timeBlockId = ${assignDResult.timeBlockId}`);
    await logCurrentAdaptiveSchedule(concept, userD, `after assigning task for ${userD}`);


    // User E actions
    console.log(`  Action: addTimeBlock for user ${userE}`);
    const blockEResult = await concept.addTimeBlock({ owner: userE, start: startE, end: endE });
    if ("error" in blockEResult) {
        throw new Error(`addTimeBlock for userE failed: ${blockEResult.error}`);
    }
    const blockEId = blockEResult.timeBlockId;
    console.log(`  Output: timeBlockId = ${blockEId}`);
    await logCurrentAdaptiveSchedule(concept, userE, `after adding block for ${userE}`);


    console.log(`  Action: assignAdaptiveSchedule for user ${userE}, task ${taskE1}`);
    const assignEResult = await concept.assignAdaptiveSchedule({ owner: userE, taskId: taskE1, start: startE, end: endE });
    if ("error" in assignEResult) {
        throw new Error(`assignAdaptiveSchedule for userE failed: ${assignEResult.error}`);
    }
    console.log(`  Output: timeBlockId = ${assignEResult.timeBlockId}`);
    await logCurrentAdaptiveSchedule(concept, userE, `after assigning task for ${userE}`);


    // Query user D's data
    console.log(`  Action: _getAdaptiveSchedule for user ${userD}`);
    const getDBlocks = await concept._getAdaptiveSchedule({ owner: userD });
    if ("error" in getDBlocks) { // Only catch actual errors
        throw new Error(`_getAdaptiveSchedule for userD failed: ${getDBlocks.error}`);
    }
    assertEquals(getDBlocks.adaptiveBlockTable.length, 1, "UserD should have 1 block");
    assert(getDBlocks.adaptiveBlockTable[0].taskIdSet.includes(taskD1), "UserD's block should contain taskD1");
    assertEquals(getDBlocks.adaptiveBlockTable[0].owner, userD, "UserD's block should be owned by userD");
    console.log(`  Output: UserD blocks: ${getDBlocks.adaptiveBlockTable.length} entries. Example: ${JSON.stringify(getDBlocks.adaptiveBlockTable[0].taskIdSet)}`);

    // Query user E's data
    console.log(`  Action: _getAdaptiveSchedule for user ${userE}`);
    const getEBlocks = await concept._getAdaptiveSchedule({ owner: userE });
    if ("error" in getEBlocks) { // Only catch actual errors
        throw new Error(`_getAdaptiveSchedule for userE failed: ${getEBlocks.error}`);
    }
    assertEquals(getEBlocks.adaptiveBlockTable.length, 1, "UserE should have 1 block");
    assert(getEBlocks.adaptiveBlockTable[0].taskIdSet.includes(taskE1), "UserE's block should contain taskE1");
    assertEquals(getEBlocks.adaptiveBlockTable[0].owner, userE, "UserE's block should be owned by userE");
    console.log(`  Output: UserE blocks: ${getEBlocks.adaptiveBlockTable.length} entries. Example: ${JSON.stringify(getEBlocks.adaptiveBlockTable[0].taskIdSet)}`);
  });

  await client.close();
});
```
