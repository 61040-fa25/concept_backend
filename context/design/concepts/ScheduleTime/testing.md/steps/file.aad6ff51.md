---
timestamp: 'Wed Oct 15 2025 16:36:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_163629.41d495a1.md]]'
content_id: aad6ff510f361b4b429e680d6a8d1457c3bd0c41baf20e40e112c564d8d3fd63
---

# file: src/concepts/ScheduleTime/ScheduleTime.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import ScheduleTimeConcept from "@concepts/ScheduleTimeConcept.ts";

Deno.test("ScheduleTime Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const concept = new ScheduleTimeConcept(db);

  const userA = "user:Alice" as ID;
  const userB = "user:Bob" as ID;
  const userC = "user:Charlie" as ID;
  const userD = "user:David" as ID;
  const userE = "user:Eve" as ID;

  const task1 = "task:buy-groceries";
  const task2 = "task:work-on-report";
  const task3 = "task:read-book";
  const task4 = "task:call-mom";
  const task5 = "task:exercise";
  const task6 = "task:plan-next-week";

  // Helper function to create Date objects for today
  const getTodayTime = (hours: number, minutes: number): Date => {
    const now = new Date();
    now.setHours(hours, minutes, 0, 0);
    return now;
  };

  // Helper function to create Date objects for tomorrow
  const getTomorrowTime = (hours: number, minutes: number): Date => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hours, minutes, 0, 0);
    return tomorrow;
  };

  await t.step("1. Operational Principle: User schedules a day", async () => {
    console.log("\n--- Test: Operational Principle ---");

    const morningStart = getTodayTime(9, 0);
    const morningEnd = getTodayTime(12, 0);
    const afternoonStart = getTodayTime(13, 0);
    const afternoonEnd = getTodayTime(17, 0);

    console.log(`Action: addTimeBlock for ${userA} from ${morningStart.toLocaleString()} to ${morningEnd.toLocaleString()}`);
    const addMorningBlockResult = await concept.addTimeBlock({ owner: userA, start: morningStart, end: morningEnd });
    assertEquals(addMorningBlockResult, {}, "Should successfully add morning time block.");

    console.log(`Action: assignTimeBlock for ${userA}, taskId '${task1}' to morning block`);
    const assignTask1Result = await concept.assignTimeBlock({ owner: userA, taskId: task1, start: morningStart, end: morningEnd });
    assertExists(assignTask1Result.timeBlockId, "Should return timeBlockId after assigning task1.");
    const morningBlockId = assignTask1Result.timeBlockId;
    console.log(`  -> timeBlockId: ${morningBlockId}`);

    console.log(`Action: addTimeBlock for ${userA} from ${afternoonStart.toLocaleString()} to ${afternoonEnd.toLocaleString()}`);
    const addAfternoonBlockResult = await concept.addTimeBlock({ owner: userA, start: afternoonStart, end: afternoonEnd });
    assertEquals(addAfternoonBlockResult, {}, "Should successfully add afternoon time block.");

    console.log(`Action: assignTimeBlock for ${userA}, taskId '${task2}' to afternoon block`);
    const assignTask2Result = await concept.assignTimeBlock({ owner: userA, taskId: task2, start: afternoonStart, end: afternoonEnd });
    assertExists(assignTask2Result.timeBlockId, "Should return timeBlockId after assigning task2.");
    const afternoonBlockId = assignTask2Result.timeBlockId;
    console.log(`  -> timeBlockId: ${afternoonBlockId}`);

    console.log(`Action: assignTimeBlock for ${userA}, taskId '${task3}' to afternoon block`);
    const assignTask3Result = await concept.assignTimeBlock({ owner: userA, taskId: task3, start: afternoonStart, end: afternoonEnd });
    assertExists(assignTask3Result.timeBlockId, "Should return timeBlockId after assigning task3.");
    assertEquals(assignTask3Result.timeBlockId, afternoonBlockId, "Should reuse existing timeBlockId for afternoon.");
    console.log(`  -> timeBlockId: ${assignTask3Result.timeBlockId}`);

    console.log(`Action: getUserSchedule for ${userA}`);
    const scheduleResult = await concept.getUserSchedule({ owner: userA });
    assertExists(scheduleResult.timeBlockTable, "Should return a timeBlockTable.");
    assertEquals(scheduleResult.timeBlockTable?.length, 2, "Should have 2 time blocks for userA.");

    const retrievedMorningBlock = scheduleResult.timeBlockTable!.find(b => b._id === morningBlockId);
    assertExists(retrievedMorningBlock, "Morning block should be in the schedule.");
    assertEquals(retrievedMorningBlock.taskIdSet, [task1], "Morning block should contain task1.");

    const retrievedAfternoonBlock = scheduleResult.timeBlockTable!.find(b => b._id === afternoonBlockId);
    assertExists(retrievedAfternoonBlock, "Afternoon block should be in the schedule.");
    assertEquals(retrievedAfternoonBlock.taskIdSet.sort(), [task2, task3].sort(), "Afternoon block should contain task2 and task3.");

    console.log("  -> Schedule retrieved successfully with expected tasks.");
  });

  await t.step("2. Interesting Scenario: Reassigning tasks, `addTimeBlock` idempotency, and `getUserSchedule` with no blocks", async () => {
    console.log("\n--- Test: Reassigning tasks and `addTimeBlock` idempotency ---");

    const blockStart = getTodayTime(10, 0);
    const blockEnd = getTodayTime(11, 0);

    console.log(`Action: getUserSchedule for ${userB} (no blocks yet)`);
    const emptyScheduleResult = await concept.getUserSchedule({ owner: userB });
    assertExists(emptyScheduleResult.error, "getUserSchedule should return an error if no blocks exist.");
    console.log(`  -> Expected error: ${emptyScheduleResult.error}`);

    console.log(`Action: assignTimeBlock for ${userB}, taskId '${task4}' (creates new block)`);
    const assignTask4Result = await concept.assignTimeBlock({ owner: userB, taskId: task4, start: blockStart, end: blockEnd });
    assertExists(assignTask4Result.timeBlockId, "Should create and assign to a new block.");
    const blockIdB = assignTask4Result.timeBlockId;
    console.log(`  -> timeBlockId: ${blockIdB}`);

    console.log(`Action: assignTimeBlock for ${userB}, taskId '${task4}' (task already in block)`);
    const reassignTask4Result = await concept.assignTimeBlock({ owner: userB, taskId: task4, start: blockStart, end: blockEnd });
    assertExists(reassignTask4Result.error, "Should return error if task is already assigned to the block.");
    console.log(`  -> Expected error: ${reassignTask4Result.error}`);

    console.log(`Action: assignTimeBlock for ${userB}, taskId '${task5}' (new task in same block)`);
    const assignTask5Result = await concept.assignTimeBlock({ owner: userB, taskId: task5, start: blockStart, end: blockEnd });
    assertExists(assignTask5Result.timeBlockId, "Should successfully add task5 to the existing block.");
    assertEquals(assignTask5Result.timeBlockId, blockIdB, "Should reuse the same timeBlockId.");
    console.log(`  -> timeBlockId: ${assignTask5Result.timeBlockId}`);

    console.log(`Action: addTimeBlock for ${userB} with same start/end as existing block`);
    const addDuplicateBlockResult = await concept.addTimeBlock({ owner: userB, start: blockStart, end: blockEnd });
    assertExists(addDuplicateBlockResult.error, "addTimeBlock should return an error if a block with same owner, start, end exists.");
    console.log(`  -> Expected error: ${addDuplicateBlockResult.error}`);

    console.log(`Action: getUserSchedule for ${userB}`);
    const bobScheduleResult = await concept.getUserSchedule({ owner: userB });
    assertExists(bobScheduleResult.timeBlockTable, "Should return a timeBlockTable for userB.");
    assertEquals(bobScheduleResult.timeBlockTable?.length, 1, "Should have 1 time block for userB.");
    assertEquals(bobScheduleResult.timeBlockTable![0].taskIdSet.sort(), [task4, task5].sort(), "Block should contain task4 and task5.");
    console.log("  -> Schedule retrieved and verified tasks.");
  });

  await t.step("3. Interesting Scenario: Removing tasks and error cases for removal", async () => {
    console.log("\n--- Test: Removing tasks and error cases ---");

    const blockStart = getTodayTime(14, 0);
    const blockEnd = getTodayTime(16, 0);
    const randomBlockId = freshID(); // Non-existent block ID

    console.log(`Action: assignTimeBlock for ${userC}, taskId '${task1}' (creates new block)`);
    const assignTask1Result = await concept.assignTimeBlock({ owner: userC, taskId: task1, start: blockStart, end: blockEnd });
    assertExists(assignTask1Result.timeBlockId, "Should create and assign task1.");
    const blockIdC = assignTask1Result.timeBlockId;
    console.log(`  -> timeBlockId: ${blockIdC}`);

    console.log(`Action: assignTimeBlock for ${userC}, taskId '${task2}' to same block`);
    const assignTask2Result = await concept.assignTimeBlock({ owner: userC, taskId: task2, start: blockStart, end: blockEnd });
    assertExists(assignTask2Result.timeBlockId, "Should assign task2 to the same block.");
    assertEquals(assignTask2Result.timeBlockId, blockIdC, "Should reuse blockIdC.");

    console.log(`Action: getUserSchedule for ${userC}`);
    let scheduleC = await concept.getUserSchedule({ owner: userC });
    assertEquals(scheduleC.timeBlockTable![0].taskIdSet.sort(), [task1, task2].sort(), "Initial block should contain task1 and task2.");

    console.log(`Action: removeTask for ${userC}, taskId '${task1}' from block '${blockIdC}'`);
    const removeTask1Result = await concept.removeTask({ owner: userC, taskId: task1, timeBlockId: blockIdC });
    assertEquals(removeTask1Result, {}, "Should successfully remove task1.");

    console.log(`Action: getUserSchedule for ${userC} (after removing task1)`);
    scheduleC = await concept.getUserSchedule({ owner: userC });
    assertEquals(scheduleC.timeBlockTable![0].taskIdSet, [task2], "Block should now only contain task2.");

    console.log(`Action: removeTask for ${userC}, taskId '${task1}' from block '${blockIdC}' (task already removed)`);
    const removeNonExistentTaskResult = await concept.removeTask({ owner: userC, taskId: task1, timeBlockId: blockIdC });
    assertExists(removeNonExistentTaskResult.error, "Should return an error if task is not in the block.");
    console.log(`  -> Expected error: ${removeNonExistentTaskResult.error}`);

    console.log(`Action: removeTask for ${userC}, taskId '${task2}' from non-existent block '${randomBlockId}'`);
    const removeNonExistentBlockResult = await concept.removeTask({ owner: userC, taskId: task2, timeBlockId: randomBlockId });
    assertExists(removeNonExistentBlockResult.error, "Should return an error if time block does not exist.");
    console.log(`  -> Expected error: ${removeNonExistentBlockResult.error}`);

    console.log(`Action: removeTask for ${userC}, taskId '${task2}' from block '${blockIdC}' (with wrong owner)`);
    const removeWrongOwnerResult = await concept.removeTask({ owner: userD, taskId: task2, timeBlockId: blockIdC });
    assertExists(removeWrongOwnerResult.error, "Should return an error if owner does not match.");
    console.log(`  -> Expected error: ${removeWrongOwnerResult.error}`);
  });

  await t.step("4. Interesting Scenario: `addTimeBlock` and `assignTimeBlock` with invalid date/time inputs", async () => {
    console.log("\n--- Test: Invalid date/time inputs ---");

    const validStart = getTodayTime(10, 0);
    const validEnd = getTodayTime(11, 0);

    const invertedStart = getTodayTime(11, 0);
    const invertedEnd = getTodayTime(10, 0); // end < start

    console.log(`Action: addTimeBlock for ${userD} with start >= end`);
    const invertedBlockResult = await concept.addTimeBlock({ owner: userD, start: invertedStart, end: invertedEnd });
    assertExists(invertedBlockResult.error, "Should return an error for start >= end.");
    console.log(`  -> Expected error: ${invertedBlockResult.error}`);

    console.log(`Action: assignTimeBlock for ${userD} with start >= end`);
    const assignInvertedBlockResult = await concept.assignTimeBlock({ owner: userD, taskId: task6, start: invertedStart, end: invertedEnd });
    assertExists(assignInvertedBlockResult.error, "Should return an error for start >= end.");
    console.log(`  -> Expected error: ${assignInvertedBlockResult.error}`);

    console.log(`Action: addTimeBlock for ${userD} with invalid start date`);
    const invalidStartResult = await concept.addTimeBlock({ owner: userD, start: new Date("not a date"), end: validEnd });
    assertExists(invalidStartResult.error, "Should return an error for invalid start date.");
    console.log(`  -> Expected error: ${invalidStartResult.error}`);

    console.log(`Action: assignTimeBlock for ${userD} with invalid end date`);
    const assignInvalidEndResult = await concept.assignTimeBlock({ owner: userD, taskId: task6, start: validStart, end: new Date("not a date") });
    assertExists(assignInvalidEndResult.error, "Should return an error for invalid end date.");
    console.log(`  -> Expected error: ${assignInvalidEndResult.error}`);

    console.log(`Action: addTimeBlock for ${userD} with valid times`);
    const validBlockResult = await concept.addTimeBlock({ owner: userD, start: validStart, end: validEnd });
    assertEquals(validBlockResult, {}, "Should successfully add a valid time block.");
    console.log("  -> Successfully added a valid time block.");
  });

  await t.step("5. Interesting Scenario: `getUserSchedule` filters by end of day", async () => {
    console.log("\n--- Test: `getUserSchedule` filters by end of day ---");

    const todayMorningStart = getTodayTime(9, 0);
    const todayMorningEnd = getTodayTime(10, 0);
    const tomorrowMorningStart = getTomorrowTime(9, 0);
    const tomorrowMorningEnd = getTomorrowTime(10, 0);

    console.log(`Action: assignTimeBlock for ${userE}, taskId '${task1}' for today`);
    const todayBlockResult = await concept.assignTimeBlock({ owner: userE, taskId: task1, start: todayMorningStart, end: todayMorningEnd });
    assertExists(todayBlockResult.timeBlockId, "Should create and assign today's block.");
    const todayBlockId = todayBlockResult.timeBlockId;
    console.log(`  -> Today's block ID: ${todayBlockId}`);

    console.log(`Action: assignTimeBlock for ${userE}, taskId '${task2}' for tomorrow`);
    const tomorrowBlockResult = await concept.assignTimeBlock({ owner: userE, taskId: task2, start: tomorrowMorningStart, end: tomorrowMorningEnd });
    assertExists(tomorrowBlockResult.timeBlockId, "Should create and assign tomorrow's block.");
    const tomorrowBlockId = tomorrowBlockResult.timeBlockId;
    console.log(`  -> Tomorrow's block ID: ${tomorrowBlockId}`);

    console.log(`Action: getUserSchedule for ${userE}`);
    const eveScheduleResult = await concept.getUserSchedule({ owner: userE });
    assertExists(eveScheduleResult.timeBlockTable, "Should return a timeBlockTable for userE.");
    assertEquals(eveScheduleResult.timeBlockTable?.length, 1, "Should only return 1 time block (today's).");

    const retrievedTodayBlock = eveScheduleResult.timeBlockTable!.find(b => b._id === todayBlockId);
    assertExists(retrievedTodayBlock, "Today's block should be present.");
    assertEquals(retrievedTodayBlock.taskIdSet, [task1], "Today's block should contain task1.");

    const retrievedTomorrowBlock = eveScheduleResult.timeBlockTable!.find(b => b._id === tomorrowBlockId);
    assertEquals(retrievedTomorrowBlock, undefined, "Tomorrow's block should NOT be present.");
    console.log("  -> Schedule correctly filtered to show only today's blocks.");
  });


  // Close the database client after all tests in this suite are done
  await client.close();
});
```
