---
timestamp: 'Sat Oct 18 2025 18:47:02 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_184702.161ae342.md]]'
content_id: e2a66dc3ffb3012845cf5128e3abe9549ae3c228cfc0e33a6e2f7b636c8e108a
---

# file: src/concepts/AdaptiveSchedule/AdaptiveSchedule.test.ts

```typescript
import { assertEquals, assertExists, assertInstanceOf, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import AdaptiveScheduleConcept from "./AdaptiveSchedule.ts";
import { ID } from "@utils/types.ts";
import { Config as GeminiConfig, GeminiLLM } from "@utils/GeminiLLM.ts";
import { freshID } from "@utils/database.ts"; // Import freshID for testing purposes

// Mock the GeminiLLM for deterministic and fast testing
class MockGeminiLLM extends GeminiLLM {
  private mockResponses: Map<string, string> = new Map();

  constructor(config: GeminiConfig) {
    super(config);
  }

  // Allow setting specific mock responses for given prompts
  setMockResponse(prompt: string, response: string) {
    this.mockResponses.set(prompt, response);
  }

  // Override executeLLM to return mock responses
  async executeLLM(prompt: string): Promise<string> {
    const response = this.mockResponses.get(prompt);
    if (response) {
      console.log("Mock LLM: Returning predefined response for prompt.");
      return Promise.resolve(response);
    }
    console.warn("Mock LLM: No predefined response for prompt. Returning generic success.");
    // Fallback for unexpected prompts or if no specific mock is set
    return Promise.resolve(
      JSON.stringify({
        analysis: "Generic analysis for test prompt.",
        adaptiveBlocks: [],
        droppedTasks: [],
      }),
    );
  }
}

// --- Helper types for prompt generation ---
type User = ID;
type Task = {
  owner: User;
  taskId: ID;
  taskName: string;
  category: string;
  duration: number; // in minutes
  priority: number; // 1-5
  splittable: boolean;
  timeBlockSet?: ID[];
  deadline?: Date;
  slack?: number; // in minutes
  preDependence?: ID[];
  postDependence?: ID[];
  note?: string;
};
type TimeBlock = {
  timeBlockId: ID;
  owner: User;
  start: Date;
  end: Date;
  taskIdSet: ID[];
};
type Schedule = { timeBlocks: TimeBlock[] };
type Session = {
  owner: User;
  sessionName: string;
  sessionId: ID;
  isPaused: boolean;
  isActive: boolean;
  start?: Date;
  end?: Date;
  linkedTaskId?: ID;
  interruptReason?: string;
};
type Routine = { sessions: Session[] };
type Preference = { preferences: string[] };

// --- Utility functions for prompt generation (as described in the problem) ---
function tasksToString(tasks: Task[]): string {
  if (tasks.length === 0) return "  - No tasks.";
  return tasks
    .map((t) =>
      `  - [${t.taskId}] ${t.taskName} (P${t.priority}, ${t.duration}min, ${t.splittable ? "Splittable" : "Not Splittable"}${t.deadline ? ", Deadline: " + t.deadline.toISOString() : ""}${t.note ? ", Note: " + t.note : ""})`
    )
    .join("\n");
}

function scheduleToString(schedule: Schedule): string {
  if (schedule.timeBlocks.length === 0) return "  - No planned schedule.";
  return schedule.timeBlocks
    .map((tb) =>
      `  - Block [${tb.timeBlockId}]: ${tb.start.toISOString()} - ${tb.end.toISOString()} (Tasks: ${tb.taskIdSet.join(", ")})`
    )
    .join("\n");
}

function routineToString(routine: Routine): string {
  if (routine.sessions.length === 0) return "  - No actual routine recorded.";
  return routine.sessions
    .map((s) =>
      `  - Session [${s.sessionId}]: ${s.sessionName} (${s.start?.toISOString()} - ${s.end?.toISOString()}) - Task: ${s.linkedTaskId || "N/A"}`
    )
    .join("\n");
}

function adaptiveBlocksToString(blocks: AdaptiveBlock[]): string {
  if (blocks.length === 0) return "  - No existing adaptive blocks.";
  return blocks
    .map((b) =>
      `  - Block [${b._id}]: ${b.start.toISOString()} - ${b.end.toISOString()} (Tasks: ${b.taskIdSet.join(", ")})`
    )
    .join("\n");
}

function createAdaptiveSchedulePrompt(
  owner: User,
  tasks: Task[],
  schedule: Schedule,
  routine: Routine,
  preference: Preference,
  existingAdaptiveBlocks: AdaptiveScheduleConcept["adaptiveBlocks"] extends
    Collection<infer U> ? U[]
    : never, // Use the actual type from the concept
  currentTime?: string,
): string {
  const existingBlocksSection = existingAdaptiveBlocks.length > 0
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
  "droppedTasks": [ // Changed from droppedTaskIds to droppedTasks with reason
      { "taskId": "taskId3", "reason": "reason for dropping"}
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

// --- Test Suite ---
Deno.test("AdaptiveScheduleConcept Tests", async (t) => {
  const [db, client] = await testDb();
  const mockGeminiConfig: GeminiConfig = { apiKey: "mock-api-key" };
  const mockLLM = new MockGeminiLLM(mockGeminiConfig);
  const concept = new AdaptiveScheduleConcept(db, mockGeminiConfig);
  // Replace the concept's LLM instance with our mock for testing
  (concept as any).llm = mockLLM;

  const userA = "user:Alice" as ID;
  const userB = "user:Bob" as ID;
  const now = new Date(); // Use a consistent 'current time' for tests

  await t.step("Operational Principle: Basic adaptive scheduling after deviation", async () => {
    console.log("\n--- Operational Principle Test ---");

    // 1. Initial setup: Tasks, Planned Schedule, Routine
    const taskStudy = { taskId: "task:study" as ID, taskName: "Study for exam", category: "Academics", duration: 120, priority: 1, splittable: true, owner: userA };
    const taskMeeting = { taskId: "task:meeting" as ID, taskName: "Team Meeting", category: "Work", duration: 60, priority: 2, splittable: false, owner: userA };
    const taskExercise = { taskId: "task:exercise" as ID, taskName: "Daily Exercise", category: "Wellness", duration: 45, priority: 3, splittable: false, owner: userA };

    const plannedBlock1Id = freshID();
    const plannedBlock2Id = freshID();
    const plannedSchedule: Schedule = {
      timeBlocks: [
        { timeBlockId: plannedBlock1Id, owner: userA, start: new Date(now.getTime() + 60 * 60 * 1000), end: new Date(now.getTime() + 3 * 60 * 60 * 1000), taskIdSet: [taskStudy.taskId, taskMeeting.taskId] }, // 1hr later for 2hrs
        { timeBlockId: plannedBlock2Id, owner: userA, start: new Date(now.getTime() + 4 * 60 * 60 * 1000), end: new Date(now.getTime() + 5 * 60 * 60 * 1000), taskIdSet: [taskExercise.taskId] }, // 4hr later for 1hr
      ],
    };

    const routineSession1Id = freshID();
    const routine: Routine = {
      sessions: [
        { owner: userA, sessionName: "Actual Study", sessionId: routineSession1Id, isPaused: false, isActive: false, start: new Date(now.getTime() + 60 * 60 * 1000), end: new Date(now.getTime() + 2 * 60 * 60 * 1000), linkedTaskId: taskStudy.taskId }, // Study only for 1hr, not 2
      ],
    };
    const preference: Preference = { preferences: ["Prioritize high-priority tasks in the morning.", "Exercise in late afternoon."] };

    // Simulate deviation: Study finished early, Meeting was missed.
    // Remaining task for study is 1hr. Meeting is fully pending. Exercise is pending.
    const remainingTaskStudy = { ...taskStudy, duration: 60, note: "remaining 60 minutes" }; // Simulate 60 mins remaining
    const pendingTasks = [remainingTaskStudy, taskMeeting, taskExercise];
    const currentSimulatedTime = new Date(now.getTime() + 2.5 * 60 * 60 * 1000); // 2.5 hours after 'now'

    const prompt = createAdaptiveSchedulePrompt(userA, pendingTasks, plannedSchedule, routine, preference, [], currentSimulatedTime.toISOString());
    console.log("Generated Prompt:\n", prompt);

    // Mock LLM response for this specific prompt
    const expectedLlmResponse = JSON.stringify({
      analysis: "Study task was cut short, and Team Meeting was missed. Rescheduling remaining tasks with priority.",
      adaptiveBlocks: [
        {
          start: new Date(currentSimulatedTime.getTime() + 30 * 60 * 1000).toISOString(), // 30 min from current time
          end: new Date(currentSimulatedTime.getTime() + 90 * 60 * 1000).toISOString(), // 1hr duration
          taskIds: [taskMeeting.taskId], // Meeting first (P2)
        },
        {
          start: new Date(currentSimulatedTime.getTime() + 100 * 60 * 1000).toISOString(),
          end: new Date(currentSimulatedTime.getTime() + 160 * 60 * 1000).toISOString(), // 1hr duration
          taskIds: [remainingTaskStudy.taskId], // Remaining study (P1)
        },
        {
          start: new Date(currentSimulatedTime.getTime() + 170 * 60 * 1000).toISOString(),
          end: new Date(currentSimulatedTime.getTime() + 215 * 60 * 1000).toISOString(), // 45 min duration
          taskIds: [taskExercise.taskId], // Exercise (P3)
        },
      ],
      droppedTasks: [],
    });
    mockLLM.setMockResponse(prompt, expectedLlmResponse);

    // Call the AI action
    const aiResult = await concept.requestAdaptiveScheduleAI({ owner: userA, contexted_prompt: prompt });
    console.log("AI Result:", aiResult);

    assertExists(aiResult);
    if ("error" in aiResult) {
      console.error("AI action failed:", aiResult.error);
    }
    assertEquals("error" in aiResult, false, `AI action returned an error: ${aiResult.error}`);

    // Verify the returned blocks and tasks
    assertEquals(aiResult.adaptiveBlockTable.length, 3, "Should have 3 adaptive blocks from AI.");
    assertEquals(aiResult.droppedTaskSet.length, 0, "Should have no dropped tasks.");

    // Verify tasks are correctly assigned in the database
    const blocksInDb = await concept.adaptiveBlocks.find({ owner: userA }).toArray();
    assertEquals(blocksInDb.length, 3, "Database should contain 3 adaptive blocks.");
    const droppedTasksInDb = await concept.droppedTasks.find({ owner: userA }).toArray();
    assertEquals(droppedTasksInDb.length, 0, "Database should contain no dropped tasks.");

    const blockTaskIds = blocksInDb.flatMap((b) => b.taskIdSet);
    assertEquals(blockTaskIds.includes(taskMeeting.taskId), true, "Meeting task should be scheduled.");
    assertEquals(blockTaskIds.includes(remainingTaskStudy.taskId), true, "Remaining study task should be scheduled.");
    assertEquals(blockTaskIds.includes(taskExercise.taskId), true, "Exercise task should be scheduled.");
  });

  await t.step("Scenario 1: addTimeBlock and assignAdaptiveSchedule basic flow and error handling", async () => {
    console.log("\n--- Scenario 1: addTimeBlock/assignAdaptiveSchedule Basic Flow & Errors ---");
    const testOwner = userB;
    const blockStart = new Date(now.getTime() + 10 * 60 * 1000); // 10 mins from now
    const blockEnd = new Date(now.getTime() + 70 * 60 * 1000); // 1hr after start
    const taskId1 = "task:test1" as ID;
    const taskId2 = "task:test2" as ID;

    console.log(`Adding first time block for ${testOwner} from ${blockStart.toISOString()} to ${blockEnd.toISOString()}`);
    const addBlockResult = await concept.addTimeBlock({ owner: testOwner, start: blockStart, end: blockEnd });
    console.log("addTimeBlock Result:", addBlockResult);
    assertExists(addBlockResult);
    assertEquals("error" in addBlockResult, false, `addTimeBlock failed: ${addBlockResult.error}`);
    const blockId1 = addBlockResult.timeBlockId;
    assertExists(blockId1);

    console.log(`Assigning ${taskId1} to block ${blockId1}`);
    const assignResult1 = await concept.assignAdaptiveSchedule({ owner: testOwner, taskId: taskId1, start: blockStart, end: blockEnd });
    console.log("assignAdaptiveSchedule Result (first task):", assignResult1);
    assertExists(assignResult1);
    assertEquals("error" in assignResult1, false, `assignAdaptiveSchedule failed: ${assignResult1.error}`);
    assertEquals(assignResult1.timeBlockId, blockId1, "Should assign to the existing block.");

    // Verify state
    const blockInDb = await concept.adaptiveBlocks.findOne({ _id: blockId1 });
    assertExists(blockInDb);
    assertEquals(blockInDb.taskIdSet, [taskId1]);

    console.log(`Attempting to add duplicate time block for ${testOwner} with same start/end`);
    const duplicateAddBlockResult = await concept.addTimeBlock({ owner: testOwner, start: blockStart, end: blockEnd });
    console.log("Duplicate addTimeBlock Result:", duplicateAddBlockResult);
    assertExists(duplicateAddBlockResult);
    assertEquals("error" in duplicateAddBlockResult, true, "Adding duplicate block should result in an error.");
    assertEquals(duplicateAddBlockResult.error, "An adaptive time block with this owner, start, and end already exists.");

    console.log(`Attempting to assign ${taskId1} again to the same block ${blockId1}`);
    const duplicateAssignResult = await concept.assignAdaptiveSchedule({ owner: testOwner, taskId: taskId1, start: blockStart, end: blockEnd });
    console.log("Duplicate assignAdaptiveSchedule Result:", duplicateAssignResult);
    assertExists(duplicateAssignResult);
    assertEquals("error" in duplicateAssignResult, true, "Assigning duplicate task to same block should result in an error.");
    assertEquals(duplicateAssignResult.error, `Task ${taskId1} is already assigned to the block with ID ${blockId1}.`);

    console.log(`Assigning ${taskId2} to the existing block ${blockId1}`);
    const assignResult2 = await concept.assignAdaptiveSchedule({ owner: testOwner, taskId: taskId2, start: blockStart, end: blockEnd });
    console.log("assignAdaptiveSchedule Result (second task):", assignResult2);
    assertExists(assignResult2);
    assertEquals("error" in assignResult2, false, `assignAdaptiveSchedule failed: ${assignResult2.error}`);
    assertEquals(assignResult2.timeBlockId, blockId1, "Should assign to the existing block.");

    // Verify state again
    const updatedBlockInDb = await concept.adaptiveBlocks.findOne({ _id: blockId1 });
    assertExists(updatedBlockInDb);
    assertEquals(updatedBlockInDb.taskIdSet.sort(), [taskId1, taskId2].sort());

    const newBlockStart = new Date(now.getTime() + 100 * 60 * 1000);
    const newBlockEnd = new Date(now.getTime() + 150 * 60 * 1000);
    const taskId3 = "task:test3" as ID;
    console.log(`Assigning ${taskId3} to a new block (not yet existing) for ${testOwner}`);
    const assignResult3 = await concept.assignAdaptiveSchedule({ owner: testOwner, taskId: taskId3, start: newBlockStart, end: newBlockEnd });
    console.log("assignAdaptiveSchedule Result (new block creation):", assignResult3);
    assertExists(assignResult3);
    assertEquals("error" in assignResult3, false, `assignAdaptiveSchedule failed: ${assignResult3.error}`);
    assertNotEquals(assignResult3.timeBlockId, blockId1, "Should create a new block ID.");
    const newBlockId = assignResult3.timeBlockId;

    const newBlockInDb = await concept.adaptiveBlocks.findOne({ _id: newBlockId });
    assertExists(newBlockInDb);
    assertEquals(newBlockInDb.taskIdSet, [taskId3]);
  });

  await t.step("Scenario 2: unassignBlock functionality and error handling", async () => {
    console.log("\n--- Scenario 2: unassignBlock Functionality & Errors ---");
    const testOwner = userA;
    const blockStart = new Date(now.getTime() + 150 * 60 * 1000);
    const blockEnd = new Date(now.getTime() + 210 * 60 * 1000);
    const taskIdA = "task:alpha" as ID;
    const taskIdB = "task:beta" as ID;

    console.log(`Setting up a block with two tasks for ${testOwner}`);
    const assignResultA = await concept.assignAdaptiveSchedule({ owner: testOwner, taskId: taskIdA, start: blockStart, end: blockEnd });
    const assignResultB = await concept.assignAdaptiveSchedule({ owner: testOwner, taskId: taskIdB, start: blockStart, end: blockEnd });
    assertEquals("error" in assignResultA, false);
    assertEquals("error" in assignResultB, false);
    const blockId = assignResultA.timeBlockId; // Both should point to the same block

    let blockInDb = await concept.adaptiveBlocks.findOne({ _id: blockId });
    assertExists(blockInDb);
    assertEquals(blockInDb.taskIdSet.sort(), [taskIdA, taskIdB].sort());
    console.log(`Block ${blockId} contains: ${blockInDb.taskIdSet}`);

    console.log(`Unassigning ${taskIdA} from block ${blockId}`);
    const unassignResultA = await concept.unassignBlock({ owner: testOwner, taskId: taskIdA, timeBlockId: blockId });
    console.log("unassignBlock Result (taskA):", unassignResultA);
    assertEquals("error" in unassignResultA, false, `unassignBlock failed: ${unassignResultA.error}`);
    assertEquals(unassignResultA, {});

    blockInDb = await concept.adaptiveBlocks.findOne({ _id: blockId });
    assertExists(blockInDb);
    assertEquals(blockInDb.taskIdSet, [taskIdB]);
    console.log(`Block ${blockId} now contains: ${blockInDb.taskIdSet}`);

    console.log(`Attempting to unassign non-existent task "nonExistent" from block ${blockId}`);
    const unassignNonExistentTask = await concept.unassignBlock({ owner: testOwner, taskId: "task:nonExistent" as ID, timeBlockId: blockId });
    console.log("unassignBlock Result (non-existent task):", unassignNonExistentTask);
    assertEquals("error" in unassignNonExistentTask, true, "Unassigning non-existent task should error.");
    assertEquals(unassignNonExistentTask.error, `Task task:nonExistent not found in block ${blockId}.`);

    const nonExistentBlockId = freshID();
    console.log(`Attempting to unassign ${taskIdB} from non-existent block ${nonExistentBlockId}`);
    const unassignNonExistentBlock = await concept.unassignBlock({ owner: testOwner, taskId: taskIdB, timeBlockId: nonExistentBlockId });
    console.log("unassignBlock Result (non-existent block):", unassignNonExistentBlock);
    assertEquals("error" in unassignNonExistentBlock, true, "Unassigning from non-existent block should error.");
    assertEquals(unassignNonExistentBlock.error, `Adaptive block with ID ${nonExistentBlockId} not found for owner ${testOwner}.`);

    console.log(`Unassigning last task ${taskIdB} from block ${blockId}`);
    const unassignResultB = await concept.unassignBlock({ owner: testOwner, taskId: taskIdB, timeBlockId: blockId });
    console.log("unassignBlock Result (taskB):", unassignResultB);
    assertEquals("error" in unassignResultB, false, `unassignBlock failed: ${unassignResultB.error}`);

    blockInDb = await concept.adaptiveBlocks.findOne({ _id: blockId });
    assertExists(blockInDb);
    assertEquals(blockInDb.taskIdSet.length, 0, "Block should now be empty.");
  });

  await t.step("Scenario 3: _getAdaptiveSchedule and _getDroppedTask with empty/non-existent data", async () => {
    console.log("\n--- Scenario 3: Querying Empty Data ---");
    const newOwner = "user:Charlie" as ID;

    console.log(`Attempting to get adaptive schedule for ${newOwner} (no blocks exist)`);
    const emptyScheduleResult = await concept._getAdaptiveSchedule({ owner: newOwner });
    console.log("empty _getAdaptiveSchedule Result:", emptyScheduleResult);
    assertEquals("error" in emptyScheduleResult, true, "Should return error for no adaptive blocks.");
    assertEquals(emptyScheduleResult.error, `No adaptive blocks found for user ${newOwner}`);

    console.log(`Attempting to get dropped tasks for ${newOwner} (no tasks exist)`);
    const emptyDroppedResult = await concept._getDroppedTask({ owner: newOwner });
    console.log("empty _getDroppedTask Result:", emptyDroppedResult);
    assertEquals("error" in emptyDroppedResult, true, "Should return error for no dropped tasks.");
    assertEquals(emptyDroppedResult.error, `No dropped tasks found for user ${newOwner}`);

    // Add some data and re-test
    const blockStart = new Date(now.getTime() + 250 * 60 * 1000);
    const blockEnd = new Date(now.getTime() + 300 * 60 * 1000);
    const taskId = "task:filler" as ID;
    await concept.addTimeBlock({ owner: newOwner, start: blockStart, end: blockEnd });
    await concept.assignAdaptiveSchedule({ owner: newOwner, taskId: taskId, start: blockStart, end: blockEnd });
    await concept.droppedTasks.insertOne({ _id: freshID(), taskId: "task:dropped1" as ID, owner: newOwner, reason: "Insufficient time" });

    console.log(`Re-attempting to get adaptive schedule for ${newOwner} (data now exists)`);
    const populatedScheduleResult = await concept._getAdaptiveSchedule({ owner: newOwner });
    console.log("populated _getAdaptiveSchedule Result:", populatedScheduleResult);
    assertEquals("error" in populatedScheduleResult, false, "Should not return error for existing adaptive blocks.");
    assertEquals(populatedScheduleResult.adaptiveBlockTable.length, 1);
    assertEquals(populatedScheduleResult.adaptiveBlockTable[0].owner, newOwner);

    console.log(`Re-attempting to get dropped tasks for ${newOwner} (data now exists)`);
    const populatedDroppedResult = await concept._getDroppedTask({ owner: newOwner });
    console.log("populated _getDroppedTask Result:", populatedDroppedResult);
    assertEquals("error" in populatedDroppedResult, false, "Should not return error for existing dropped tasks.");
    assertEquals(populatedDroppedResult.droppedTaskSet.length, 1);
    assertEquals(populatedDroppedResult.droppedTaskSet[0].owner, newOwner);
  });

  await t.step("Scenario 4: requestAdaptiveScheduleAI - Concurrency optimization for passive tasks", async () => {
    console.log("\n--- Scenario 4: AI with Concurrency Optimization ---");
    const testOwner = userB;
    const taskLaundry = { taskId: "task:laundry" as ID, taskName: "Do Laundry", category: "Household", duration: 60, priority: 4, splittable: false, owner: testOwner, note: "PASSIVE" };
    const taskWriteReport = { taskId: "task:report" as ID, taskName: "Write Report", category: "Work", duration: 120, priority: 2, splittable: true, owner: testOwner };
    const pendingTasks = [taskLaundry, taskWriteReport];
    const currentTime = new Date(now.getTime() + 500 * 60 * 1000); // Later in the day

    const prompt = createAdaptiveSchedulePrompt(testOwner, pendingTasks, { timeBlocks: [] }, { sessions: [] }, { preferences: ["Maximize concurrent passive tasks."] }, [], currentTime.toISOString());
    console.log("Generated Prompt (Concurrency):\n", prompt);

    // Mock LLM response for concurrency
    const expectedLlmResponse = JSON.stringify({
      analysis: "Detected passive task (Laundry) and active task (Write Report). Scheduling concurrently.",
      adaptiveBlocks: [
        {
          start: new Date(currentTime.getTime() + 30 * 60 * 1000).toISOString(),
          end: new Date(currentTime.getTime() + 90 * 60 * 1000).toISOString(), // 1hr for laundry
          taskIds: [taskLaundry.taskId],
        },
        {
          start: new Date(currentTime.getTime() + 30 * 60 * 1000).toISOString(),
          end: new Date(currentTime.getTime() + 150 * 60 * 1000).toISOString(), // 2hr for report, overlapping
          taskIds: [taskWriteReport.taskId],
        },
      ],
      droppedTasks: [],
    });
    mockLLM.setMockResponse(prompt, expectedLlmResponse);

    const aiResult = await concept.requestAdaptiveScheduleAI({ owner: testOwner, contexted_prompt: prompt });
    console.log("AI Result (Concurrency):", aiResult);

    assertEquals("error" in aiResult, false, `AI action returned an error: ${aiResult.error}`);
    assertEquals(aiResult.adaptiveBlockTable.length, 2, "Should have two adaptive blocks for concurrency.");

    const block1 = aiResult.adaptiveBlockTable.find((b) => b.taskIdSet.includes(taskLaundry.taskId));
    const block2 = aiResult.adaptiveBlockTable.find((b) => b.taskIdSet.includes(taskWriteReport.taskId));

    assertExists(block1);
    assertExists(block2);

    // Verify blocks are overlapping
    assertEquals(block1.start.getTime(), block2.start.getTime(), "Concurrent blocks should start at the same time.");
    assertNotEquals(block1.end.getTime(), block2.end.getTime(), "Concurrent blocks can have different end times.");
    assertEquals(block1.taskIdSet, [taskLaundry.taskId]);
    assertEquals(block2.taskIdSet, [taskWriteReport.taskId]);
  });

  await t.step("Scenario 5: requestAdaptiveScheduleAI - Handling deadlines and insufficient time (dropping tasks)", async () => {
    console.log("\n--- Scenario 5: AI with Deadlines and Dropping Tasks ---");
    const testOwner = userA;
    const currentTime = new Date(now.getTime() + 600 * 60 * 1000); // Very late in the day
    const deadlineSoon = new Date(currentTime.getTime() + 120 * 60 * 1000); // Deadline in 2 hours
    const deadlineLater = new Date(currentTime.getTime() + 300 * 60 * 1000); // Deadline in 5 hours

    const taskP1 = { taskId: "task:p1" as ID, taskName: "Critical Fix", category: "Work", duration: 90, priority: 1, splittable: false, owner: testOwner, deadline: deadlineSoon };
    const taskP2 = { taskId: "task:p2" as ID, taskName: "Review Docs", category: "Work", duration: 60, priority: 2, splittable: true, owner: testOwner, deadline: deadlineLater };
    const taskP5 = { taskId: "task:p5" as ID, taskName: "Organize Desktop", category: "Admin", duration: 30, priority: 5, splittable: true, owner: testOwner }; // No deadline, low priority

    const pendingTasks = [taskP1, taskP2, taskP5];
    const preference: Preference = { preferences: ["Prioritize tasks with urgent deadlines.", "Drop lowest priority tasks if time is tight."] };

    const prompt = createAdaptiveSchedulePrompt(testOwner, pendingTasks, { timeBlocks: [] }, { sessions: [] }, preference, [], currentTime.toISOString());
    console.log("Generated Prompt (Deadlines/Drop):\n", prompt);

    // Mock LLM response: taskP1 and taskP2 fit, taskP5 is dropped due to insufficient time before deadlines
    const expectedLlmResponse = JSON.stringify({
      analysis: "Limited time available. Prioritizing high-priority tasks with deadlines.",
      adaptiveBlocks: [
        {
          start: new Date(currentTime.getTime() + 10 * 60 * 1000).toISOString(), // 10 min from current time
          end: new Date(currentTime.getTime() + 100 * 60 * 1000).toISOString(), // 90 min duration
          taskIds: [taskP1.taskId], // P1 task before deadline
        },
        {
          start: new Date(currentTime.getTime() + 110 * 60 * 1000).toISOString(),
          end: new Date(currentTime.getTime() + 170 * 60 * 1000).toISOString(), // 60 min duration
          taskIds: [taskP2.taskId], // P2 task before its later deadline
        },
      ],
      droppedTasks: [{ taskId: taskP5.taskId, reason: "Insufficient time for low priority task before other deadlines." }],
    });
    mockLLM.setMockResponse(prompt, expectedLlmResponse);

    const aiResult = await concept.requestAdaptiveScheduleAI({ owner: testOwner, contexted_prompt: prompt });
    console.log("AI Result (Deadlines/Drop):", aiResult);

    assertEquals("error" in aiResult, false, `AI action returned an error: ${aiResult.error}`);
    assertEquals(aiResult.adaptiveBlockTable.length, 2, "Should have 2 adaptive blocks.");
    assertEquals(aiResult.droppedTaskSet.length, 1, "Should have 1 dropped task.");

    const scheduledTaskIds = aiResult.adaptiveBlockTable.flatMap((b) => b.taskIdSet);
    assertEquals(scheduledTaskIds.includes(taskP1.taskId), true, "P1 task should be scheduled.");
    assertEquals(scheduledTaskIds.includes(taskP2.taskId), true, "P2 task should be scheduled.");
    assertEquals(scheduledTaskIds.includes(taskP5.taskId), false, "P5 task should NOT be scheduled.");

    assertEquals(aiResult.droppedTaskSet[0].taskId, taskP5.taskId, "P5 task should be in dropped tasks.");
    assertEquals(aiResult.droppedTaskSet[0].reason, "Insufficient time for low priority task before other deadlines.");
  });

  await t.step("Scenario 6: requestAdaptiveScheduleAI - Malformed LLM response handling", async () => {
    console.log("\n--- Scenario 6: Malformed LLM Response Handling ---");
    const testOwner = userB;
    const taskA = { taskId: "task:malformedA" as ID, taskName: "Malformed Task A", category: "Test", duration: 30, priority: 3, splittable: true, owner: testOwner };
    const prompt = createAdaptiveSchedulePrompt(testOwner, [taskA], { timeBlocks: [] }, { sessions: [] }, { preferences: [] }, []);

    // Malformed JSON (not parseable)
    const malformedJson = "this is not json";
    mockLLM.setMockResponse(prompt, malformedJson);
    console.log("Mock LLM Response (Malformed JSON):", malformedJson);

    let aiResult = await concept.requestAdaptiveScheduleAI({ owner: testOwner, contexted_prompt: prompt });
    console.log("AI Result (Malformed JSON):", aiResult);
    assertEquals("error" in aiResult, true, "Should return an error for malformed JSON.");
    assertExists(aiResult.error.match(/LLM response was not valid JSON/));

    // Valid JSON but missing required keys (e.g., adaptiveBlocks)
    const missingKeysJson = JSON.stringify({
      analysis: "Missing adaptiveBlocks",
      droppedTasks: [],
    });
    mockLLM.setMockResponse(prompt, missingKeysJson);
    console.log("Mock LLM Response (Missing Keys):", missingKeysJson);

    aiResult = await concept.requestAdaptiveScheduleAI({ owner: testOwner, contexted_prompt: prompt });
    console.log("AI Result (Missing Keys):", aiResult);
    assertEquals("error" in aiResult, true, "Should return an error for missing 'adaptiveBlocks' array.");
    assertExists(aiResult.error.match(/missing 'adaptiveBlocks' array/));

    // Valid JSON with invalid date strings
    const invalidDateJson = JSON.stringify({
      analysis: "Invalid date strings",
      adaptiveBlocks: [{ start: "not-a-date", end: "also-not-a-date", taskIds: [taskA.taskId] }],
      droppedTasks: [],
    });
    mockLLM.setMockResponse(prompt, invalidDateJson);
    console.log("Mock LLM Response (Invalid Dates):", invalidDateJson);

    aiResult = await concept.requestAdaptiveScheduleAI({ owner: testOwner, contexted_prompt: prompt });
    console.log("AI Result (Invalid Dates):", aiResult);
    assertEquals("error" in aiResult, false, "Should not error, but log warnings and skip invalid blocks.");
    assertEquals(aiResult.adaptiveBlockTable.length, 0, "No blocks should be added due to invalid dates.");

    // Clear blocks for the test owner
    await concept.adaptiveBlocks.deleteMany({ owner: testOwner });
  });

  await client.close();
});
```
