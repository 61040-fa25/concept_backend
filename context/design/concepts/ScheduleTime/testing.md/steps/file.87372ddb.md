---
timestamp: 'Wed Oct 15 2025 16:29:04 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_162904.5fcc19f1.md]]'
content_id: 87372ddb1ad6d33c508190a208c22ccd3913320ee25bae54dc6ac79987edb00f
---

# file: src/concepts/ScheduleTime/ScheduleTime.test.ts

```typescript
import { assertEquals, assertExists, assertInstanceOf } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import ScheduleTimeConcept from "./ScheduleTimeConcept.ts";

// Define a type for the internal TimeBlock document for easier assertion in tests
interface TimeBlockDoc {
  _id: ID;
  owner: ID;
  start: Date;
  end: Date;
  taskIdSet: string[];
}

Deno.test("ScheduleTimeConcept Tests", async (t) => {
  const [db, client] = await testDb();
  const concept = new ScheduleTimeConcept(db);

  // Helper IDs for users and tasks
  const userA = "user:Alice" as ID;
  const userB = "user:Bob" as ID;
  const task1 = "task:buy-groceries";
  const task2 = "task:do-laundry";
  const task3 = "task:prepare-dinner";

  // Helper Dates for testing. Using a consistent base ensures relative tests work regardless of run date.
  const today = new Date();
  // Set to midnight for consistent "end of day" calculations
  today.setHours(0, 0, 0, 0);

  const d1 = new Date(today); d1.setHours(9, 0, 0, 0); // Today 9:00 AM
  const d2 = new Date(today); d2.setHours(10, 0, 0, 0); // Today 10:00 AM
  const d3 = new Date(today); d3.setHours(11, 0, 0, 0); // Today 11:00 AM
  const d4 = new Date(today); d4.setHours(12, 0, 0, 0); // Today 12:00 PM
  const d7 = new Date(today); d7.setHours(10, 30, 0, 0); // Today 10:30 AM (for overlap/invalid date checks)

  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const d5 = new Date(tomorrow); d5.setHours(9, 0, 0, 0); // Tomorrow 9:00 AM
  const d6 = new Date(tomorrow); d6.setHours(10, 0, 0, 0); // Tomorrow 10:00 AM

  // The end of the current day (start of the next day) for filtering `getUserSchedule`
  const endOfCurrentDay = new Date(today); endOfCurrentDay.setDate(today.getDate() + 1);

  await t.step("addTimeBlock action", async (st) => {
    console.log("\n--- Testing addTimeBlock action ---");

    await st.step("should successfully add a new time block", async () => {
      console.log(`Action: addTimeBlock(owner: ${userA}, start: ${d1.toISOString()}, end: ${d2.toISOString()})`);
      const result = await concept.addTimeBlock({ owner: userA, start: d1, end: d2 });
      assertEquals(result, {}, "Expected an empty object on successful addition.");

      const timeBlock = await concept.timeBlocks.findOne({ owner: userA, start: d1, end: d2 }) as TimeBlockDoc | null;
      assertExists(timeBlock, "Time block should be found in the database.");
      assertEquals(timeBlock.owner, userA);
      assertEquals(timeBlock.start.toISOString(), d1.toISOString());
      assertEquals(timeBlock.end.toISOString(), d2.toISOString());
      assertEquals(timeBlock.taskIdSet, [], "New time block should have an empty taskIdSet.");
      console.log(`Effect confirmed: Time block ${timeBlock._id} added for ${userA}.`);
    });

    await st.step("should return an error if a duplicate time block already exists", async () => {
      console.log(`Action: addTimeBlock(owner: ${userA}, start: ${d1.toISOString()}, end: ${d2.toISOString()}) (duplicate)`);
      const result = await concept.addTimeBlock({ owner: userA, start: d1, end: d2 });
      assertEquals(result, { error: `Time block already exists for owner ${userA} from ${d1.toISOString()} to ${d2.toISOString()}.` });
      console.log("Requirement confirmed: Duplicate time block creation correctly prevented.");
    });

    await st.step("should return an error for invalid start timestamp", async () => {
      console.log(`Action: addTimeBlock(owner: ${userA}, start: "invalid-date", end: ${d2.toISOString()})`);
      const result = await concept.addTimeBlock({ owner: userA, start: "invalid-date" as unknown as Date, end: d2 });
      assertEquals(result, { error: "Invalid 'start' timestamp. Must be a valid Date object." });
      console.log("Requirement confirmed: Invalid start date is rejected.");
    });

    await st.step("should return an error if start is after or equal to end", async () => {
      console.log(`Action: addTimeBlock(owner: ${userA}, start: ${d3.toISOString()}, end: ${d2.toISOString()}) (start > end)`);
      const result = await concept.addTimeBlock({ owner: userA, start: d3, end: d2 });
      assertEquals(result, { error: "'start' timestamp must be strictly before 'end' timestamp." });
      console.log("Requirement confirmed: Start date after end date is rejected.");

      console.log(`Action: addTimeBlock(owner: ${userA}, start: ${d2.toISOString()}, end: ${d2.toISOString()}) (start == end)`);
      const result2 = await concept.addTimeBlock({ owner: userA, start: d2, end: d2 });
      assertEquals(result2, { error: "'start' timestamp must be strictly before 'end' timestamp." });
      console.log("Requirement confirmed: Start date equal to end date is rejected.");
    });
  });

  await t.step("assignTimeBlock action", async (st) => {
    console.log("\n--- Testing assignTimeBlock action ---");

    await st.step("should create a new time block and assign a task if block doesn't exist", async () => {
      console.log(`Action: assignTimeBlock(owner: ${userA}, taskId: ${task1}, start: ${d3.toISOString()}, end: ${d4.toISOString()})`);
      const result = await concept.assignTimeBlock({ owner: userA, taskId: task1, start: d3, end: d4 });
      assertExists(result.timeBlockId, "Expected a timeBlockId on creation.");

      const timeBlock = await concept.timeBlocks.findOne({ _id: result.timeBlockId }) as TimeBlockDoc | null;
      assertExists(timeBlock, "Time block should be found in the database.");
      assertEquals(timeBlock.owner, userA);
      assertEquals(timeBlock.start.toISOString(), d3.toISOString());
      assertEquals(timeBlock.end.toISOString(), d4.toISOString());
      assertEquals(timeBlock.taskIdSet, [task1], "New time block should have the assigned task.");
      console.log(`Effect confirmed: Time block ${timeBlock._id} created and task ${task1} assigned.`);
    });

    await st.step("should assign a task to an existing time block", async () => {
      const existingBlock = await concept.timeBlocks.findOne({ owner: userA, start: d1, end: d2 }) as TimeBlockDoc | null;
      assertExists(existingBlock, "Pre-existing time block must be found for testing.");
      console.log(`Existing block ID for test: ${existingBlock._id}`);

      console.log(`Action: assignTimeBlock(owner: ${userA}, taskId: ${task2}, start: ${d1.toISOString()}, end: ${d2.toISOString()})`);
      const result = await concept.assignTimeBlock({ owner: userA, taskId: task2, start: d1, end: d2 });
      assertEquals(result.timeBlockId, existingBlock._id, "Should return the ID of the existing time block.");

      const updatedBlock = await concept.timeBlocks.findOne({ _id: existingBlock._id }) as TimeBlockDoc | null;
      assertExists(updatedBlock);
      assertEquals(updatedBlock.taskIdSet, [task2], "Existing time block should now include task2.");
      console.log(`Effect confirmed: Task ${task2} assigned to existing time block ${updatedBlock._id}.`);
    });

    await st.step("should return an error if task is already assigned to the block", async () => {
      const existingBlock = await concept.timeBlocks.findOne({ owner: userA, start: d1, end: d2 }) as TimeBlockDoc | null;
      assertExists(existingBlock, "Pre-existing time block must be found for testing.");
      console.log(`Attempting to assign existing task ${task2} to block ${existingBlock._id}`);

      console.log(`Action: assignTimeBlock(owner: ${userA}, taskId: ${task2}, start: ${d1.toISOString()}, end: ${d2.toISOString()}) (duplicate task)`);
      const result = await concept.assignTimeBlock({ owner: userA, taskId: task2, start: d1, end: d2 });
      assertEquals(result, { error: `Task ID '${task2}' is already assigned to time block ${existingBlock._id}.` });
      console.log("Requirement confirmed: Assigning duplicate task to same block correctly prevented.");
    });

    await st.step("should return an error for invalid end timestamp", async () => {
      console.log(`Action: assignTimeBlock(owner: ${userA}, taskId: ${task1}, start: ${d1.toISOString()}, end: "invalid-date")`);
      const result = await concept.assignTimeBlock({ owner: userA, taskId: task1, start: d1, end: "invalid-date" as unknown as Date });
      assertEquals(result, { error: "Invalid 'end' timestamp. Must be a valid Date object." });
      console.log("Requirement confirmed: Invalid end date is rejected.");
    });

    await st.step("should return an error if start is after or equal to end", async () => {
      console.log(`Action: assignTimeBlock(owner: ${userA}, taskId: ${task1}, start: ${d3.toISOString()}, end: ${d2.toISOString()}) (start > end)`);
      const result = await concept.assignTimeBlock({ owner: userA, taskId: task1, start: d3, end: d2 });
      assertEquals(result, { error: "'start' timestamp must be strictly before 'end' timestamp." });
      console.log("Requirement confirmed: Start date after end date is rejected.");
    });
  });

  await t.step("removeTask action", async (st) => {
    console.log("\n--- Testing removeTask action ---");

    // Prepare a time block with tasks for removal tests for userB
    const blockForRemovalId = (await concept.assignTimeBlock({ owner: userB, taskId: task1, start: d5, end: d6 })).timeBlockId;
    assertExists(blockForRemovalId);
    await concept.assignTimeBlock({ owner: userB, taskId: task2, start: d5, end: d6 });
    console.log(`Setup: Time block ${blockForRemovalId} created for ${userB} (tomorrow) with tasks ${task1}, ${task2}.`);

    await st.step("should successfully remove an existing task from a time block", async () => {
      console.log(`Action: removeTask(owner: ${userB}, taskId: ${task1}, timeBlockId: ${blockForRemovalId})`);
      const result = await concept.removeTask({ owner: userB, taskId: task1, timeBlockId: blockForRemovalId });
      assertEquals(result, {}, "Expected an empty object on successful removal.");

      const updatedBlock = await concept.timeBlocks.findOne({ _id: blockForRemovalId }) as TimeBlockDoc | null;
      assertExists(updatedBlock);
      assertEquals(updatedBlock.taskIdSet, [task2], "Task1 should be removed, Task2 should remain.");
      console.log(`Effect confirmed: Task ${task1} removed from time block ${blockForRemovalId}.`);
    });

    await st.step("should return an error if the task is not in the time block", async () => {
      console.log(`Action: removeTask(owner: ${userB}, taskId: ${task3}, timeBlockId: ${blockForRemovalId})`);
      const result = await concept.removeTask({ owner: userB, taskId: task3, timeBlockId: blockForRemovalId });
      assertEquals(result, { error: `Task ID '${task3}' not found in time block '${blockForRemovalId}'.` });
      console.log("Requirement confirmed: Cannot remove a task not present in the block.");
    });

    await st.step("should return an error if the time block does not exist for the owner", async () => {
      const nonExistentBlockId = freshID();
      console.log(`Action: removeTask(owner: ${userB}, taskId: ${task2}, timeBlockId: ${nonExistentBlockId})`);
      const result = await concept.removeTask({ owner: userB, taskId: task2, timeBlockId: nonExistentBlockId });
      assertEquals(result, { error: `Time block with ID '${nonExistentBlockId}' not found for owner '${userB}'.` });
      console.log("Requirement confirmed: Cannot remove task from a non-existent block.");

      console.log(`Action: removeTask(owner: ${userA}, taskId: ${task2}, timeBlockId: ${blockForRemovalId})`); // Wrong owner
      const resultWrongOwner = await concept.removeTask({ owner: userA, taskId: task2, timeBlockId: blockForRemovalId });
      assertEquals(resultWrongOwner, { error: `Time block with ID '${blockForRemovalId}' not found for owner '${userA}'.` });
      console.log("Requirement confirmed: Cannot remove task from another user's block.");
    });
  });

  await t.step("getUserSchedule action", async (st) => {
    console.log("\n--- Testing getUserSchedule action ---");

    await st.step("should return an error if no time blocks exist for the owner ending before the end of today", async () => {
      console.log(`Action: getUserSchedule(owner: ${userB}) before adding anything for today`);
      // UserB's only block (blockForRemovalId) is for tomorrow.
      const result = await concept.getUserSchedule({ owner: userB });
      assertEquals(result.error, `No time blocks found for user ${userB} ending before the end of today.`);
      console.log("Requirement confirmed: No time blocks ending today means an error is returned.");
    });

    // Add some blocks for userA for today and tomorrow for schedule retrieval tests
    // d1-d2 (today), d3-d4 (today) already exist for userA and have tasks.
    const tomorrowBlockId = (await concept.assignTimeBlock({ owner: userA, taskId: task3, start: d5, end: d6 })).timeBlockId;
    assertExists(tomorrowBlockId);
    const earlierTodayStart = new Date(today); earlierTodayStart.setHours(8, 0, 0, 0);
    const earlierTodayEnd = new Date(today); earlierTodayEnd.setHours(8, 30, 0, 0);
    const earlierTodayBlockId = (await concept.assignTimeBlock({ owner: userA, taskId: task3, start: earlierTodayStart, end: earlierTodayEnd })).timeBlockId;
    assertExists(earlierTodayBlockId);
    console.log(`Setup: User ${userA} has blocks: (d1-d2 w/ ${task2}), (d3-d4 w/ ${task1}), (d5-d6 w/ ${task3} - tomorrow), (earlierTodayBlock w/ ${task3})`);

    await st.step("should return all time blocks for the owner ending before the end of today", async () => {
      console.log(`Action: getUserSchedule(owner: ${userA})`);
      const result = await concept.getUserSchedule({ owner: userA });
      assertExists(result.timeBlockTable, "Should return a timeBlockTable.");
      assertEquals(result.timeBlockTable?.length, 3, "Should return 3 time blocks ending today for userA.");

      const blockIds = result.timeBlockTable?.map(b => b._id).sort();
      const expectedTodayBlockIds = [
        (await concept.timeBlocks.findOne({ owner: userA, start: d1, end: d2 }))?._id,
        (await concept.timeBlocks.findOne({ owner: userA, start: d3, end: d4 }))?._id,
        earlierTodayBlockId,
      ].filter(Boolean).sort(); // Filter out any null/undefined from findOne if not found

      assertEquals(blockIds, expectedTodayBlockIds, "Should return the correct time blocks for today.");
      console.log(`Effect confirmed: User ${userA} schedule retrieved for today (${blockIds}).`);

      const tomorrowBlock = result.timeBlockTable?.find(b => b._id === tomorrowBlockId);
      assertEquals(tomorrowBlock, undefined, "Tomorrow's block should not be included in today's schedule.");
      console.log("Filtering by 'end before end of day' confirmed.");
    });
  });

  await t.step("Principle Trace: User managing their schedule", async () => {
    console.log("\n--- Principle Trace: User managing their schedule ---");
    const testUser = "user:Charlie" as ID;
    const taskA = "task:code-review";
    const taskB = "task:project-meeting";
    const taskC = "task:lunch-break";

    const ch_d1 = new Date(today); ch_d1.setHours(13, 0, 0, 0); // Today 1 PM
    const ch_d2 = new Date(today); ch_d2.setHours(14, 0, 0, 0); // Today 2 PM
    const ch_d3 = new Date(today); ch_d3.setHours(14, 30, 0, 0); // Today 2:30 PM
    const ch_d4 = new Date(today); ch_d4.setHours(15, 30, 0, 0); // Today 3:30 PM
    const ch_d5 = new Date(tomorrow); ch_d5.setHours(9, 0, 0, 0); // Tomorrow 9 AM
    const ch_d6 = new Date(tomorrow); ch_d6.setHours(10, 0, 0, 0); // Tomorrow 10 AM

    // 1. Charlie adds a time block for a meeting and assigns a task.
    console.log(`Action: Charlie assigns '${taskB}' to a block (13:00-14:00 today).`);
    const assignResult1 = await concept.assignTimeBlock({ owner: testUser, taskId: taskB, start: ch_d1, end: ch_d2 });
    assertExists(assignResult1.timeBlockId);
    const meetingBlockId = assignResult1.timeBlockId;
    console.log(`Effect: Meeting block ${meetingBlockId} created for ${testUser} with '${taskB}'.`);

    // 2. Charlie decides to do a code review at the same time. The concept allows multiple tasks per block.
    console.log(`Action: Charlie assigns '${taskA}' to the same meeting time block (13:00-14:00 today).`);
    const assignResult2 = await concept.assignTimeBlock({ owner: testUser, taskId: taskA, start: ch_d1, end: ch_d2 });
    assertExists(assignResult2.timeBlockId);
    assertEquals(assignResult2.timeBlockId, meetingBlockId, "Should assign to the existing block.");
    console.log(`Effect: Task '${taskA}' assigned to existing block ${meetingBlockId}.`);

    let updatedBlock = await concept.timeBlocks.findOne({ _id: meetingBlockId }) as TimeBlockDoc;
    assertEquals(updatedBlock.taskIdSet.sort(), [taskA, taskB].sort(), "Meeting block should now have both tasks.");
    console.log(`Current state of meeting block: Tasks ${updatedBlock.taskIdSet.join(", ")}.`);

    // 3. Charlie adds a new time block for lunch tomorrow and assigns a task.
    console.log(`Action: Charlie assigns '${taskC}' to a new time block for lunch tomorrow (09:00-10:00 tomorrow).`);
    const assignResult3 = await concept.assignTimeBlock({ owner: testUser, taskId: taskC, start: ch_d5, end: ch_d6 });
    assertExists(assignResult3.timeBlockId);
    const lunchBlockId = assignResult3.timeBlockId;
    console.log(`Effect: Lunch block ${lunchBlockId} created for ${testUser} with '${taskC}'.`);

    // 4. Charlie retrieves today's schedule.
    console.log(`Action: Charlie retrieves today's schedule.`);
    const todayScheduleResult = await concept.getUserSchedule({ owner: testUser });
    assertExists(todayScheduleResult.timeBlockTable);
    assertEquals(todayScheduleResult.timeBlockTable?.length, 1, "Should show only one block for today.");
    assertEquals(todayScheduleResult.timeBlockTable?.[0]._id, meetingBlockId);
    assertEquals(todayScheduleResult.timeBlockTable?.[0].taskIdSet.sort(), [taskA, taskB].sort());
    console.log(`Effect: Today's schedule for ${testUser} successfully retrieved, showing block ${meetingBlockId} with tasks ${todayScheduleResult.timeBlockTable?.[0].taskIdSet.join(", ")}.`);

    // 5. Charlie realizes the code review needs to be longer and wants to assign it to a new, separate block.
    // First, remove it from the original block.
    console.log(`Action: Charlie removes '${taskA}' from the original meeting block.`);
    const removeResult = await concept.removeTask({ owner: testUser, taskId: taskA, timeBlockId: meetingBlockId });
    assertEquals(removeResult, {});
    console.log(`Effect: Task '${taskA}' removed from block ${meetingBlockId}.`);

    // Then, assign it to a new block.
    console.log(`Action: Charlie assigns '${taskA}' to a new, longer block (14:30-15:30 today).`);
    const assignResult4 = await concept.assignTimeBlock({ owner: testUser, taskId: taskA, start: ch_d3, end: ch_d4 });
    assertExists(assignResult4.timeBlockId);
    const codeReviewBlockId = assignResult4.timeBlockId;
    console.log(`Effect: New code review block ${codeReviewBlockId} created for ${testUser} with '${taskA}'.`);

    // 6. Verify the state after changes.
    updatedBlock = await concept.timeBlocks.findOne({ _id: meetingBlockId }) as TimeBlockDoc;
    assertEquals(updatedBlock.taskIdSet, [taskB], "Meeting block should now only have taskB.");

    const codeReviewBlock = await concept.timeBlocks.findOne({ _id: codeReviewBlockId }) as TimeBlockDoc;
    assertExists(codeReviewBlock);
    assertEquals(codeReviewBlock.taskIdSet, [taskA], "Code review block should have taskA.");

    const finalTodayScheduleResult = await concept.getUserSchedule({ owner: testUser });
    assertExists(finalTodayScheduleResult.timeBlockTable);
    assertEquals(finalTodayScheduleResult.timeBlockTable?.length, 2, "Should now show two blocks for today.");
    const finalTodayBlockIds = finalTodayScheduleResult.timeBlockTable?.map(b => b._id).sort();
    assertEquals(finalTodayBlockIds, [meetingBlockId, codeReviewBlockId].sort());
    console.log(`Effect: Final today's schedule verified: blocks ${finalTodayBlockIds?.join(", ")} correctly reflecting changes.`);

    // 7. Verify tomorrow's schedule by fetching all blocks ending before end of tomorrow and filtering out today's.
    const endOfTomorrow = new Date(tomorrow); endOfTomorrow.setDate(tomorrow.getDate() + 1);
    const allBlocksForUser = await concept.timeBlocks.find({ owner: testUser, end: { $lt: endOfTomorrow } }).toArray() as TimeBlockDoc[];
    const tomorrowSchedule = allBlocksForUser.filter(tb => tb.end >= endOfCurrentDay); // Blocks ending tomorrow or later

    assertEquals(tomorrowSchedule.length, 1, "Should show one block for tomorrow.");
    assertEquals(tomorrowSchedule[0]._id, lunchBlockId);
    assertEquals(tomorrowSchedule[0].taskIdSet, [taskC]);
    console.log(`Effect: Tomorrow's schedule verified: block ${lunchBlockId} with task '${taskC}'.`);
  });

  await client.close();
});
```
