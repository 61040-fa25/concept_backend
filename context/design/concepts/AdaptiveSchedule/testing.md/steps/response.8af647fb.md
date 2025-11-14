---
timestamp: 'Sat Oct 18 2025 18:57:30 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_185730.9f22d17e.md]]'
content_id: 8af647fb163688c702807d060c7349f52aa296d84a1cd30e6a20fb86759b3805
---

# response:

To resolve the TypeScript errors, we need to address three main issues:

1. **Module Not Found (`TS2307`)**: The `GeminiLLM.ts` file needs to be created in the `src/utils` directory, as implied by the `@utils/GeminiLLM.ts` import. I'll provide the `GeminiLLM` class content in that file.
2. **Property 'error' does not exist (`TS2339`)**: This error occurs when attempting to access the `error` property on a union type (e.g., `{ timeBlockId: ID; } | { error: string; }`) without a proper type guard. The common pattern in the tests `assert(!("error" in result), `... ${result.error}`)` fails because the second argument (`... ${result.error}`) is evaluated regardless of the `!("error" in result)` condition. The fix is to explicitly check for the `error` property and `throw new Error` if it exists, ensuring that subsequent code only operates on the success type.
3. **'error' is of type 'unknown' (`TS18046`)**: In `catch (error)` blocks, `error` is typed as `unknown`. To access properties like `error.message`, it needs to be explicitly cast to `Error` (e.g., `(error as Error).message`).

Here's the corrected implementation and test files, along with the newly created `GeminiLLM.ts`.

***

First, create the `src/utils/GeminiLLM.ts` file:

**file: src/utils/GeminiLLM.ts**

```typescript
import { GoogleGenerativeAI } from 'npm:@google/generative-ai'; // Use npm: prefix for Deno

/**
 * Configuration for API access
 */
export interface Config {
  apiKey: string;
  maxRetries?: number;
  timeoutMs?: number;
  initialBackoffMs?: number;
}

export class GeminiLLM {
  private apiKey: string;
  private maxRetries: number;
  private timeoutMs: number;
  private initialBackoffMs: number;
  private requestCache: Map<string, string> = new Map(); // For idempotency

  constructor(config: Config) {
      this.apiKey = config.apiKey;
      this.maxRetries = config.maxRetries ?? 3;
      this.timeoutMs = config.timeoutMs ?? 30000; // 30 seconds default
      this.initialBackoffMs = config.initialBackoffMs ?? 1000; // 1 second initial backoff
  }

  /**
   * Execute LLM with timeout, retries with exponential backoff, and idempotency
   */
  async executeLLM(prompt: string): Promise<string> {
      // Check cache for idempotency (same prompt = same response)
      const cachedResponse = this.requestCache.get(prompt);
      if (cachedResponse) {
          console.log('✅ Using cached LLM response (idempotent request)');
          return cachedResponse;
      }

      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
          try {
              if (attempt > 0) {
                  const backoffMs = this.initialBackoffMs * Math.pow(2, attempt - 1);
                  console.log(`⏳ Retrying LLM request (attempt ${attempt + 1}/${this.maxRetries + 1}) after ${backoffMs}ms backoff...`);
                  await this.sleep(backoffMs);
              }

              const result = await this.executeWithTimeout(prompt);

              // Cache successful response for idempotency
              this.requestCache.set(prompt, result);

              return result;
          } catch (error) {
              lastError = error as Error;

              if (this.isRetryableError(error)) {
                  console.warn(`⚠️ Retryable error on attempt ${attempt + 1}: ${(error as Error).message}`);
                  continue;
              } else {
                  // Non-retryable error, fail immediately
                  throw this.enhanceErrorMessage(error);
              }
          }
      }

      // All retries exhausted
      throw new Error(
          `❌ LLM request failed after ${this.maxRetries + 1} attempts. Last error: ${lastError?.message || 'Unknown error'}`
      );
  }

  /**
   * Execute LLM call with timeout
   */
  private async executeWithTimeout(prompt: string): Promise<string> {
      return new Promise(async (resolve, reject) => {
          const timeoutId = setTimeout(() => {
              reject(new Error(`Request timed out after ${this.timeoutMs}ms`));
          }, this.timeoutMs);

          try {
              const genAI = new GoogleGenerativeAI(this.apiKey);
              const model = genAI.getGenerativeModel({
                  model: "gemini-2.5-flash-lite",
                  generationConfig: {
                      maxOutputTokens: 1000,
                      temperature: 0.1, // Low temperature for more predictable, deterministic output
                  }
              });

              const result = await model.generateContent(prompt);
              const response = result.response;
              const text = response.text();

              clearTimeout(timeoutId);
              resolve(text);
          } catch (error) {
              clearTimeout(timeoutId);
              reject(error);
          }
      });
  }

  /**
   * Determine if error is retryable (network issues, rate limits, etc.)
   */
  private isRetryableError(error: unknown): boolean {
      const errorMessage = (error as Error).message?.toLowerCase() || '';

      // Retryable errors: network issues, rate limits, timeouts, server errors
      const retryablePatterns = [
          'timeout',
          'network',
          'econnreset',
          'enotfound',
          'rate limit',
          'quota exceeded',
          '429',
          '500',
          '502',
          '503',
          '504'
      ];

      return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Enhance error messages with context
   */
  private enhanceErrorMessage(error: unknown): Error {
      const originalError = error as Error;
      const errorMessage = originalError.message || 'Unknown error';

      if (errorMessage.includes('API key')) {
          return new Error('❌ API Authentication Error: Invalid or missing API key. Please check your Gemini API key configuration.');
      }
      if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
          return new Error('❌ API Quota Error: Rate limit or quota exceeded. Please wait before retrying or upgrade your API plan.');
      }
      if (errorMessage.includes('timeout')) {
          return new Error(`❌ Timeout Error: Request exceeded ${this.timeoutMs}ms timeout. The LLM may be overloaded or network is slow.`);
      }
      if (errorMessage.includes('network') || errorMessage.includes('ECONNRESET')) {
          return new Error('❌ Network Error: Failed to connect to Gemini API. Please check your internet connection.');
      }

      return new Error(`❌ LLM Error: ${errorMessage}`);
  }

  /**
   * Sleep utility for backoff
   */
  private sleep(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cache (useful for testing or forcing fresh responses)
   */
  clearCache(): void {
      this.requestCache.clear();
  }
}
```

***

Next, the corrected `AdaptiveSchedule.ts` implementation:

**file: src/concepts/AdaptiveSchedule/AdaptiveSchedule.ts**

```typescript
import { Collection, Db, ObjectId } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { GeminiLLM, Config as GeminiConfig } from "@utils/GeminiLLM.ts";

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
  analysis: string; // Added analysis field based on prompt structure
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
   * **requires** exists at least one adaptive block under this user
   *
   * **effect** return a set of all adaptive blocks under this owner with end before the end of the day
   */
  async _getAdaptiveSchedule({ owner }: { owner: User }): Promise<{ adaptiveBlockTable: AdaptiveBlock[] } | { error: string }> {
    try {
      // "end before the end of the day" is ambiguous without a specific date input.
      // Assuming it means 'for the current day' as perceived by the system,
      // this would require passing a reference date or determining it here.
      // For simplicity and to avoid making assumptions without a date parameter,
      // this implementation will return all adaptive blocks for the owner.
      // A more complete implementation would require an additional `day` parameter or context.

      const blocks = await this.adaptiveBlocks.find({ owner }).toArray();
      if (blocks.length === 0) {
        return { error: `No adaptive blocks found for user ${owner}` };
      }
      return { adaptiveBlockTable: blocks };
    } catch (error) {
      console.error(`Error in _getAdaptiveSchedule: ${(error as Error).message}`);
      return { error: `Failed to retrieve adaptive schedule: ${(error as Error).message}` };
    }
  }

  /**
   * _getDroppedTask(owner: User): (droppedTaskSet: set of droppedTasks)
   *
   * **requires** exists at least one dropped task with this owner
   *
   * **effect** returns all dropped tasks for the user (tasks that couldn't be scheduled due to insufficient time)
   */
  async _getDroppedTask({ owner }: { owner: User }): Promise<{ droppedTaskSet: DroppedTask[] } | { error: string }> {
    try {
      const tasks = await this.droppedTasks.find({ owner }).toArray();
      if (tasks.length === 0) {
        return { error: `No dropped tasks found for user ${owner}` };
      }
      return { droppedTaskSet: tasks };
    } catch (error) {
      console.error(`Error in _getDroppedTask: ${(error as Error).message}`);
      return { error: `Failed to retrieve dropped tasks: ${(error as Error).message}` };
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
    } catch (error) {
      console.error(`Error in addTimeBlock: ${(error as Error).message}`);
      return { error: `Failed to add time block: ${(error as Error).message}` };
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
          // This case should ideally not happen if matchedCount is 1 and taskId not in set,
          // but good for robustness. It implies another concurrent modification or unexpected state.
          return { error: `Failed to update existing block with task ${taskId}. Block found but not modified.` };
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
    } catch (error) {
      console.error(`Error in assignAdaptiveSchedule: ${(error as Error).message}`);
      return { error: `Failed to assign adaptive schedule: ${(error as Error).message}` };
    }
  }

  /**
   * async requestAdaptiveScheduleAI (owner: User, contexted_prompt: String): (adaptiveBlockTable: set of AdaptiveBlocks, droppedTaskSet: set of droppedTasks)
   *
   * **effect**
   *   send the structured contexted_prompt to the llm;
   *   llm returns a structured JSON response including:
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
      } catch (parseError) {
        return { error: `LLM response was not valid JSON: ${(parseError as Error).message}. Response: ${llmResponseText}` };
      }

      // Validate required fields in LLM response
      if (!llmResponse.adaptiveBlocks || !Array.isArray(llmResponse.adaptiveBlocks)) {
        return { error: "LLM response missing 'adaptiveBlocks' array." };
      }
      if (!llmResponse.droppedTasks || !Array.isArray(llmResponse.droppedTasks)) {
        return { error: "LLM response missing 'droppedTasks' array." };
      }
      if (typeof llmResponse.analysis !== 'string') { // Ensure analysis is present and string type
          return { error: "LLM response missing 'analysis' string." };
      }

      for (const block of llmResponse.adaptiveBlocks) {
        const start = new Date(block.start);
        const end = new Date(block.end);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            console.warn(`Warning: LLM proposed invalid date format for block (start: ${block.start}, end: ${block.end}). Skipping.`);
            continue; // Skip invalid blocks from LLM
        }

        for (const taskId of block.taskIds) {
          const assignResult = await this.assignAdaptiveSchedule({ owner, taskId, start, end });
          if ("error" in assignResult) {
            console.warn(`Warning: Could not assign task ${taskId} from LLM proposal to block (${block.start}-${block.end}): ${assignResult.error}`);
            // Depending on policy, might choose to stop or continue. For now, continue and log.
          } // else { No need to push assignedBlockIds, _getAdaptiveSchedule will fetch current state }
        }
      }

      // First, delete all existing dropped tasks for the owner to replace with new LLM output
      await this.droppedTasks.deleteMany({ owner });

      for (const dropped of llmResponse.droppedTasks) {
        const newDroppedTask: DroppedTask = {
          _id: freshID(), // Ensure a unique _id for the collection
          taskId: dropped.taskId,
          owner: owner,
          reason: dropped.reason,
        };
        try {
          // This should now be an insert after deleting all existing for the owner.
          await this.droppedTasks.insertOne(newDroppedTask);
        } catch (insertError) {
          console.warn(`Warning: Could not add dropped task ${dropped.taskId}: ${(insertError as Error).message}`);
        }
      }

      const getBlocksResult = await this._getAdaptiveSchedule({ owner });
      const getDroppedTasksResult = await this._getDroppedTask({ owner });

      const finalAdaptiveBlocks = "adaptiveBlockTable" in getBlocksResult ? getBlocksResult.adaptiveBlockTable : [];
      const finalDroppedTasks = "droppedTaskSet" in getDroppedTasksResult ? getDroppedTasksResult.droppedTaskSet : [];

      return { adaptiveBlockTable: finalAdaptiveBlocks, droppedTaskSet: finalDroppedTasks };

    } catch (error) {
      console.error(`Error in requestAdaptiveScheduleAI: ${(error as Error).message}`);
      return { error: `Failed to request adaptive schedule from AI: ${(error as Error).message}` };
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
        // This case means the task was found in the initial findOne but not pulled.
        // Could be due to a race condition or state change between find and update.
        // For current purpose, it indicates an issue.
        return { error: `Failed to unassign task ${taskId} from block ${timeBlockId}. No modification occurred.` };
      }

      return {};
    } catch (error) {
      console.error(`Error in unassignBlock: ${(error as Error).message}`);
      return { error: `Failed to unassign task: ${(error as Error).message}` };
    }
  }
}
```

***

Finally, the corrected `AdaptiveSchedule.test.ts` file:

**file: src/concepts/AdaptiveSchedule/AdaptiveSchedule.test.ts**

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
    async executeLLM(prompt: string): Promise<string> {
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


Deno.test("AdaptiveSchedule Concept Tests", async (t) => {
  const [db, client] = await testDb();
  // Instantiate with a dummy API key for the mock LLM
  const concept = new AdaptiveScheduleConcept(db, { apiKey: "dummy-api-key" } as GeminiConfig);

  // Override the LLM instance within the concept with our mock for testing purposes
  const mockGeminiLLM = new MockGeminiLLM({ apiKey: "dummy-api-key" });
  (concept as any).llm = mockGeminiLLM;

  const userA = "user:Alice" as ID;
  const userB = "user:Bob" as ID;

  // Define some common test data
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfterTomorrow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const task1Id = "task:study" as ID;
  const task2Id = "task:laundry" as ID;
  const task3Id = "task:report" as ID;
  const task4Id = "task:exercise" as ID;

  const sampleTask1: Task = {
      owner: userA,
      taskId: task1Id,
      taskName: "Study for Exam",
      category: "Education",
      duration: 120,
      priority: 1,
      splittable: true,
  };
  const sampleTask2: Task = {
      owner: userA,
      taskId: task2Id,
      taskName: "Do Laundry",
      category: "Household",
      duration: 60,
      priority: 3,
      splittable: false,
  };
  const sampleTask3: Task = {
      owner: userA,
      taskId: task3Id,
      taskName: "Write Project Report",
      category: "Work",
      duration: 180,
      priority: 2,
      splittable: true,
      deadline: dayAfterTomorrow,
  };
  const sampleTask4: Task = {
      owner: userA,
      taskId: task4Id,
      taskName: "Morning Exercise",
      category: "Health",
      duration: 30,
      priority: 4,
      splittable: false,
  };

  const sampleTasksList = [sampleTask1, sampleTask2, sampleTask3, sampleTask4];
  const emptySchedule: Schedule = { timeBlocks: [] };
  const emptyRoutine: Routine = { sessions: [] };
  const samplePreference: Preference = { preferences: ["Prefer high-priority tasks in the morning.", "Batch similar tasks together."] };

  await t.step("Operational Principle: Adding, Assigning, AI Adaptation, Unassigning, Querying", async () => {
    console.log("\n--- Operational Principle Test ---");
    
    // 1. Add a time block
    const start1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0); // 9:00 AM
    const end1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0); // 10:00 AM
    console.log(`  Action: addTimeBlock for user ${userA}, from ${start1.toISOString()} to ${end1.toISOString()}`);
    const addBlockResult = await concept.addTimeBlock({ owner: userA, start: start1, end: end1 });
    if ("error" in addBlockResult) {
        throw new Error(`addTimeBlock failed: ${addBlockResult.error}`);
    }
    const timeBlockId1 = addBlockResult.timeBlockId;
    console.log(`  Output: timeBlockId = ${timeBlockId1}`);

    // 2. Assign a task to that block
    console.log(`  Action: assignAdaptiveSchedule for user ${userA}, task ${task1Id} to block with range (${start1.toISOString()}, ${end1.toISOString()})`);
    const assignResult1 = await concept.assignAdaptiveSchedule({ owner: userA, taskId: task1Id, start: start1, end: end1 });
    if ("error" in assignResult1) {
        throw new Error(`assignAdaptiveSchedule failed: ${assignResult1.error}`);
    }
    assertEquals(assignResult1.timeBlockId, timeBlockId1, "Should assign to the existing block with ID 1");
    console.log(`  Output: timeBlockId = ${assignResult1.timeBlockId}`);

    // Verify state after assignment
    const verifyBlock1 = await concept.adaptiveBlocks.findOne({ _id: timeBlockId1 });
    assertEquals(verifyBlock1?.taskIdSet, [task1Id], "Task should be in the block's taskIdSet");

    // 3. Simulate LLM request to adapt the schedule
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeISO = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour, currentMinute).toISOString();

    const llmProposedBlockStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour + 1, 0); // Start 1 hour from now
    const llmProposedBlockEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour + 2, 0);   // End 2 hours from now
    const llmDroppedTaskReason = "Insufficient time due to unexpected meeting.";

    // Configure mock LLM response
    mockGeminiLLM.mockResponse = JSON.stringify({
      analysis: "Adjusted schedule based on overrunning meeting and prioritizing study.",
      adaptiveBlocks: [
        {
          start: llmProposedBlockStart.toISOString(),
          end: llmProposedBlockEnd.toISOString(),
          taskIds: [task3Id], // Assign report task
        },
        {
          // Example of concurrent passive task (laundry)
          start: llmProposedBlockStart.toISOString(), // Overlapping start
          end: new Date(llmProposedBlockStart.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
          taskIds: [task2Id], // Assign laundry task
        }
      ],
      droppedTasks: [{ taskId: task4Id, reason: llmDroppedTaskReason }], // Drop exercise task
    });

    // Need to convert the database AdaptiveBlock objects to AdaptiveBlockForPrompt for the prompt function
    const existingBlocksFromDb = await concept.adaptiveBlocks.find({ owner: userA }).toArray();
    const existingBlocksForPrompt: AdaptiveBlockForPrompt[] = existingBlocksFromDb.map(block => ({
      _id: block._id,
      owner: block.owner,
      start: block.start,
      end: block.end,
      taskIdSet: block.taskIdSet,
    }));


    const contextedPrompt = createAdaptiveSchedulePrompt(
      userA,
      sampleTasksList,
      emptySchedule,
      emptyRoutine,
      samplePreference,
      existingBlocksForPrompt, // Use the converted existing blocks
      currentTimeISO
    );

    console.log(`  Action: requestAdaptiveScheduleAI for user ${userA} with contexted_prompt`);
    const aiResult = await concept.requestAdaptiveScheduleAI({ owner: userA, contexted_prompt: contextedPrompt });
    if ("error" in aiResult) {
        throw new Error(`requestAdaptiveScheduleAI failed: ${aiResult.error}`);
    }
    console.log(`  Output: Adaptive Blocks: ${aiResult.adaptiveBlockTable.length} entries, Dropped Tasks: ${aiResult.droppedTaskSet.length} entries`);

    // Verify that task3Id and task2Id are now assigned in new blocks
    const blockWithTask3 = aiResult.adaptiveBlockTable.find(b => b.taskIdSet.includes(task3Id));
    assert(blockWithTask3, `Task ${task3Id} should be assigned after AI request`);
    assertEquals(blockWithTask3.start.toISOString(), llmProposedBlockStart.toISOString(), "LLM proposed block for Task3 start time mismatch");
    assertEquals(blockWithTask3.end.toISOString(), llmProposedBlockEnd.toISOString(), "LLM proposed block for Task3 end time mismatch");
    
    const blockWithTask2 = aiResult.adaptiveBlockTable.find(b => b.taskIdSet.includes(task2Id));
    assert(blockWithTask2, `Task ${task2Id} (laundry) should be assigned after AI request`);
    // Note: The LLM could create a new block for laundry, or assign it to an existing overlapping block.
    // For this test, we expect a new overlapping block, checking its start time.
    assertEquals(blockWithTask2.start.toISOString(), llmProposedBlockStart.toISOString(), "LLM proposed block for Task2 start time mismatch (for concurrency)");


    // Verify dropped task
    const droppedTask4 = aiResult.droppedTaskSet.find(t => t.taskId === task4Id);
    assert(droppedTask4, `Task ${task4Id} should be in dropped tasks`);
    assertEquals(droppedTask4.reason, llmDroppedTaskReason, "Dropped task reason mismatch");


    // 4. Unassign a task
    console.log(`  Action: unassignBlock for user ${userA}, task ${task1Id} from block ${timeBlockId1}`);
    const unassignResult = await concept.unassignBlock({ owner: userA, taskId: task1Id, timeBlockId: timeBlockId1 });
    if ("error" in unassignResult) {
        throw new Error(`unassignBlock failed: ${unassignResult.error}`);
    }
    console.log(`  Output: {} (success)`);

    // Verify state after unassignment
    const verifyBlockAfterUnassign = await concept.adaptiveBlocks.findOne({ _id: timeBlockId1 });
    assert(!verifyBlockAfterUnassign?.taskIdSet.includes(task1Id), "Task1 should be removed from the block");

    // 5. Query for adaptive blocks
    console.log(`  Action: _getAdaptiveSchedule for user ${userA}`);
    const getScheduleResult = await concept._getAdaptiveSchedule({ owner: userA });
    if ("error" in getScheduleResult) {
        throw new Error(`_getAdaptiveSchedule failed: ${getScheduleResult.error}`);
    }
    assert(getScheduleResult.adaptiveBlockTable.length > 0, "Should return at least one adaptive block");
    console.log(`  Output: Found ${getScheduleResult.adaptiveBlockTable.length} adaptive blocks.`);
    // Note: The concept's _getAdaptiveSchedule returns all for the owner as implemented,
    // as no "end of day" parameter was passed. This validates the basic retrieval.

    // 6. Query for dropped tasks
    console.log(`  Action: _getDroppedTask for user ${userA}`);
    const getDroppedResult = await concept._getDroppedTask({ owner: userA });
    if ("error" in getDroppedResult) {
        throw new Error(`_getDroppedTask failed: ${getDroppedResult.error}`);
    }
    assertEquals(getDroppedResult.droppedTaskSet.length, 1, "Should return one dropped task");
    console.log(`  Output: Found ${getDroppedResult.droppedTaskSet.length} dropped tasks.`);
  });

  await t.step("Interesting Scenario 1: Duplicate Time Block & Task Assignment", async () => {
    console.log("\n--- Interesting Scenario 1: Duplicate Time Block & Task Assignment ---");
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0); // 11:00 AM
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0); // 12:00 PM

    // Attempt to add a time block that already exists (expect error)
    console.log(`  Action: addTimeBlock (first call) for user ${userA}, from ${start.toISOString()} to ${end.toISOString()}`);
    const addBlockResult = await concept.addTimeBlock({ owner: userA, start, end });
    if ("error" in addBlockResult) { // This check is correct, but the assert after needs to be careful
        throw new Error(`addTimeBlock failed unexpectedly on first call: ${addBlockResult.error}`);
    }
    const timeBlockId = addBlockResult.timeBlockId;
    console.log(`  Output: timeBlockId = ${timeBlockId}`);

    console.log(`  Action: addTimeBlock (duplicate call) for user ${userA}, from ${start.toISOString()} to ${end.toISOString()}`);
    const duplicateAddBlockResult = await concept.addTimeBlock({ owner: userA, start, end });
    assert("error" in duplicateAddBlockResult, "Should return an error for duplicate time block");
    console.log(`  Output: ${JSON.stringify(duplicateAddBlockResult)}`);
    assertEquals(duplicateAddBlockResult.error, "An adaptive time block with this owner, start, and end already exists.");

    // Assign a task
    const uniqueTaskId = freshID();
    console.log(`  Action: assignAdaptiveSchedule for user ${userA}, task ${uniqueTaskId} to block starting ${start.toISOString()}`);
    const assignResult = await concept.assignAdaptiveSchedule({ owner: userA, taskId: uniqueTaskId, start, end });
    if ("error" in assignResult) {
        throw new Error(`assignAdaptiveSchedule failed unexpectedly on first assignment: ${assignResult.error}`);
    }
    console.log(`  Output: timeBlockId = ${assignResult.timeBlockId}`);

    // Attempt to assign the *same* task to the *same* block again (expect error)
    console.log(`  Action: assignAdaptiveSchedule (duplicate task) for user ${userA}, task ${uniqueTaskId} to block starting ${start.toISOString()}`);
    const duplicateAssignResult = await concept.assignAdaptiveSchedule({ owner: userA, taskId: uniqueTaskId, start, end });
    assert("error" in duplicateAssignResult, "Should return an error for assigning duplicate task to same block");
    console.log(`  Output: ${JSON.stringify(duplicateAssignResult)}`);
    // Need to fetch the block again to get its current _id
    const currentBlock = await concept.adaptiveBlocks.findOne({ owner: userA, start, end });
    assert(currentBlock, "Block should still exist"); // Safety check
    assertEquals(duplicateAssignResult.error, `Task ${uniqueTaskId} is already assigned to the block with ID ${currentBlock._id}.`);

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
  });

  await t.step("Interesting Scenario 2: Invalid Inputs", async () => {
    console.log("\n--- Interesting Scenario 2: Invalid Inputs ---");
    const testUser = "user:InvalidUser" as ID;
    const testTaskId = "task:InvalidTask" as ID;

    // Invalid start/end times for addTimeBlock
    console.log("  Action: addTimeBlock with start >= end");
    const invalidTimeBlockResult1 = await concept.addTimeBlock({ owner: testUser, start: now, end: now });
    assert("error" in invalidTimeBlockResult1, "Should error when start >= end");
    console.log(`  Output: ${JSON.stringify(invalidTimeBlockResult1)}`);
    assertEquals(invalidTimeBlockResult1.error, "'start' TimeStamp must be before 'end' TimeStamp.");

    // Invalid start/end date objects
    console.log("  Action: addTimeBlock with invalid Date objects (start)");
    const invalidDateResult1 = await concept.addTimeBlock({ owner: testUser, start: new Date("invalid"), end: now });
    assert("error" in invalidDateResult1, "Should error with invalid start Date object");
    console.log(`  Output: ${JSON.stringify(invalidDateResult1)}`);
    assertEquals(invalidDateResult1.error, "Invalid 'start' TimeStamp.");
    
    console.log("  Action: addTimeBlock with invalid Date objects (end)");
    const invalidDateResult2 = await concept.addTimeBlock({ owner: testUser, start: now, end: new Date("invalid") });
    assert("error" in invalidDateResult2, "Should error with invalid end Date object");
    console.log(`  Output: ${JSON.stringify(invalidDateResult2)}`);
    assertEquals(invalidDateResult2.error, "Invalid 'end' TimeStamp.");


    // Invalid inputs for assignAdaptiveSchedule (same checks as addTimeBlock, plus task-specific)
    console.log("  Action: assignAdaptiveSchedule with start >= end");
    const invalidAssignResult1 = await concept.assignAdaptiveSchedule({ owner: testUser, taskId: testTaskId, start: now, end: now });
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
    const addBlockForTestResult = await concept.addTimeBlock({ owner: testUser, start: new Date(now.getTime() + 1000), end: new Date(tomorrow.getTime() + 1000) });
    if ("error" in addBlockForTestResult) {
        throw new Error(`Failed to create block for testing unassignNonExistentTaskResult: ${addBlockForTestResult.error}`);
    }
    const existingBlockId = addBlockForTestResult.timeBlockId;
    console.log(`  Action: unassignBlock with non-existent task from block ${existingBlockId}`);
    const unassignNonExistentTaskResult = await concept.unassignBlock({ owner: testUser, taskId: testTaskId, timeBlockId: existingBlockId });
    assert("error" in unassignNonExistentTaskResult, "Should error when unassigning non-existent task from block");
    console.log(`  Output: ${JSON.stringify(unassignNonExistentTaskResult)}`);
    assertEquals(unassignNonExistentTaskResult.error, `Task ${testTaskId} not found in block ${existingBlockId}.`);

    // Query for schedule/dropped tasks for user with no data
    const emptyUser = freshID();
    console.log(`  Action: _getAdaptiveSchedule for user ${emptyUser} with no data`);
    const emptyScheduleResult = await concept._getAdaptiveSchedule({ owner: emptyUser });
    assert("error" in emptyScheduleResult, "Should error when querying schedule for user with no data");
    console.log(`  Output: ${JSON.stringify(emptyScheduleResult)}`);
    assert(emptyScheduleResult.error.includes("No adaptive blocks found"), "Error message should indicate no blocks found.");


    console.log(`  Action: _getDroppedTask for user ${emptyUser} with no data`);
    const emptyDroppedResult = await concept._getDroppedTask({ owner: emptyUser });
    assert("error" in emptyDroppedResult, "Should error when querying dropped tasks for user with no data");
    console.log(`  Output: ${JSON.stringify(emptyDroppedResult)}`);
    assert(emptyDroppedResult.error.includes("No dropped tasks found"), "Error message should indicate no dropped tasks found.");
  });

  await t.step("Interesting Scenario 3: LLM Response Handling", async () => {
    console.log("\n--- Interesting Scenario 3: LLM Response Handling ---");
    const userC = "user:Charlie" as ID;
    const taskC1 = "task:read" as ID;
    const taskC2 = "task:plan" as ID;
    const taskC3 = "task:cleanup" as ID;

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeISO = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour, currentMinute).toISOString();

    // LLM proposes new blocks and dropped tasks
    const llmBlockC1Start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour + 2, 0);
    const llmBlockC1End = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour + 3, 0);
    const llmBlockC2Start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour + 3, 0);
    const llmBlockC2End = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour + 4, 0);
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

    // LLM returns JSON missing analysis (added validation for analysis in the concept)
    mockGeminiLLM.mockResponse = JSON.stringify({ adaptiveBlocks: [], droppedTasks: [] });
    console.log(`  Action: requestAdaptiveScheduleAI for user ${userC} (missing 'analysis' string)`);
    const missingAnalysisResult = await concept.requestAdaptiveScheduleAI({ owner: userC, contexted_prompt: "dummy prompt" });
    assert("error" in missingAnalysisResult, "Should error for missing analysis field");
    assert(missingAnalysisResult.error.includes("LLM response missing 'analysis' string."), "Error message should indicate missing 'analysis'");
    console.log(`  Output: ${JSON.stringify(missingAnalysisResult)}`);

  });

  await t.step("Interesting Scenario 4: Multiple Users", async () => {
    console.log("\n--- Interesting Scenario 4: Multiple Users ---");
    const userD = "user:David" as ID;
    const userE = "user:Eve" as ID;

    const startD = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0);
    const endD = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0);
    const taskD1 = "task:gym" as ID;

    const startE = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0);
    const endE = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0);
    const taskE1 = "task:meeting" as ID;

    // User D actions
    console.log(`  Action: addTimeBlock for user ${userD}`);
    const blockDResult = await concept.addTimeBlock({ owner: userD, start: startD, end: endD });
    if ("error" in blockDResult) {
        throw new Error(`addTimeBlock for userD failed: ${blockDResult.error}`);
    }
    const blockDId = blockDResult.timeBlockId;
    console.log(`  Output: timeBlockId = ${blockDId}`);

    console.log(`  Action: assignAdaptiveSchedule for user ${userD}, task ${taskD1}`);
    const assignDResult = await concept.assignAdaptiveSchedule({ owner: userD, taskId: taskD1, start: startD, end: endD });
    if ("error" in assignDResult) {
        throw new Error(`assignAdaptiveSchedule for userD failed: ${assignDResult.error}`);
    }
    console.log(`  Output: timeBlockId = ${assignDResult.timeBlockId}`);


    // User E actions
    console.log(`  Action: addTimeBlock for user ${userE}`);
    const blockEResult = await concept.addTimeBlock({ owner: userE, start: startE, end: endE });
    if ("error" in blockEResult) {
        throw new Error(`addTimeBlock for userE failed: ${blockEResult.error}`);
    }
    const blockEId = blockEResult.timeBlockId;
    console.log(`  Output: timeBlockId = ${blockEId}`);

    console.log(`  Action: assignAdaptiveSchedule for user ${userE}, task ${taskE1}`);
    const assignEResult = await concept.assignAdaptiveSchedule({ owner: userE, taskId: taskE1, start: startE, end: endE });
    if ("error" in assignEResult) {
        throw new Error(`assignAdaptiveSchedule for userE failed: ${assignEResult.error}`);
    }
    console.log(`  Output: timeBlockId = ${assignEResult.timeBlockId}`);


    // Query user D's data
    console.log(`  Action: _getAdaptiveSchedule for user ${userD}`);
    const getDBlocks = await concept._getAdaptiveSchedule({ owner: userD });
    if ("error" in getDBlocks) {
        throw new Error(`_getAdaptiveSchedule for userD failed: ${getDBlocks.error}`);
    }
    assertEquals(getDBlocks.adaptiveBlockTable.length, 1, "UserD should have 1 block");
    assert(getDBlocks.adaptiveBlockTable[0].taskIdSet.includes(taskD1), "UserD's block should contain taskD1");
    assertEquals(getDBlocks.adaptiveBlockTable[0].owner, userD, "UserD's block should be owned by userD");
    console.log(`  Output: UserD blocks: ${getDBlocks.adaptiveBlockTable.length} entries. Example: ${JSON.stringify(getDBlocks.adaptiveBlockTable[0].taskIdSet)}`);

    // Query user E's data
    console.log(`  Action: _getAdaptiveSchedule for user ${userE}`);
    const getEBlocks = await concept._getAdaptiveSchedule({ owner: userE });
    if ("error" in getEBlocks) {
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
