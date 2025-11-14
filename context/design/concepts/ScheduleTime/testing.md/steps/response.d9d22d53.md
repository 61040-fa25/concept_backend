---
timestamp: 'Wed Oct 15 2025 16:41:22 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_164122.10632628.md]]'
content_id: d9d22d5320b5c8a94dfc82bb5bf603faacaba31303fa4282865d2d90df8df2e6
---

# response:

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ScheduleTimeConcept from "./ScheduleTime.ts";

Deno.test("ScheduleTime Concept Tests", async (test) => {
  const [db, client] = await testDb();
  const concept = new ScheduleTimeConcept(db);

  // Define some test data
  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const userCharlie = "user:Charlie" as ID;
  const userDavid = "user:David" as ID;
  const userEve = "user:Eve" as ID;
  const userFrank = "user:Frank" as ID;

  const taskId1 = "task:buyGroceries";
  const taskId2 = "task:finishReport";
  const taskId3 = "task:meeting";
  const taskId4 = "task:exercise";
  const taskId5 = "task:readBook";

  // Helper for generating future timestamps (in milliseconds)
  const getFutureTime = (hoursFromNow: number) =>
    Date.now() + hoursFromNow * 60 * 60 * 1000;
  // Helper for generating past timestamps (in milliseconds)
  const getPastTime = (hoursFromNow: number) =>
    Date.now() - hoursFromNow * 60 * 60 * 1000;

  let aliceBlockId1: ID;
  let aliceBlockId2: ID;
  let bobBlockId: ID;
  let charlieBlockId: ID;

  await test.step("Operational Principle: User schedules tasks for the day", async () => {
    console.log(
      "\n--- Test: Operational Principle: Alice schedules tasks ---",
    );
    const start1 = getFutureTime(1); // 1 hour from now
    const end1 = getFutureTime(2); // 2 hours from now
    const start2 = getFutureTime(3); // 3 hours from now
    const end2 = getFutureTime(4); // 4 hours from now

    // Alice adds a time block
    console.log(
      `[Alice] addTimeBlock: owner=${userAlice}, start=${start1} (${
        new Date(start1).toLocaleTimeString()
      }), end=${end1} (${new Date(end1).toLocaleTimeString()})`,
    );
    const addResult1 = await concept.addTimeBlock({
      owner: userAlice,
      start: start1,
      end: end1,
    });
    assertEquals(addResult1, {}, "addTimeBlock should succeed for unique block");
    console.log("-> addTimeBlock (1) result:", addResult1);

    // Alice adds another time block
    console.log(
      `[Alice] addTimeBlock: owner=${userAlice}, start=${start2} (${
        new Date(start2).toLocaleTimeString()
      }), end=${end2} (${new Date(end2).toLocaleTimeString()})`,
    );
    const addResult2 = await concept.addTimeBlock({
      owner: userAlice,
      start: start2,
      end: end2,
    });
    assertEquals(addResult2, {}, "addTimeBlock should succeed for unique block");
    console.log("-> addTimeBlock (2) result:", addResult2);

    // Alice assigns taskId1 to the first block (this will re-use the block created by addTimeBlock)
    console.log(
      `[Alice] assignTimeBlock: owner=${userAlice}, taskId=${taskId1}, start=${start1} (${
        new Date(start1).toLocaleTimeString()
      }), end=${end1} (${new Date(end1).toLocaleTimeString()})`,
    );
    const assignResult1 = await concept.assignTimeBlock({
      owner: userAlice,
      taskId: taskId1,
      start: start1,
      end: end1,
    });
    assertExists(assignResult1, "assignTimeBlock should return a block ID");
    assertEquals(
      "timeBlockId" in assignResult1,
      true,
      "assignResult1 should contain timeBlockId",
    );
    aliceBlockId1 = (assignResult1 as { timeBlockId: ID }).timeBlockId;
    console.log("-> assignTimeBlock (1) result:", assignResult1);

    // Alice assigns taskId2 to the second block
    console.log(
      `[Alice] assignTimeBlock: owner=${userAlice}, taskId=${taskId2}, start=${start2} (${
        new Date(start2).toLocaleTimeString()
      }), end=${end2} (${new Date(end2).toLocaleTimeString()})`,
    );
    const assignResult2 = await concept.assignTimeBlock({
      owner: userAlice,
      taskId: taskId2,
      start: start2,
      end: end2,
    });
    assertExists(assignResult2, "assignTimeBlock should return a block ID");
    assertEquals(
      "timeBlockId" in assignResult2,
      true,
      "assignResult2 should contain timeBlockId",
    );
    aliceBlockId2 = (assignResult2 as { timeBlockId: ID }).timeBlockId;
    console.log("-> assignTimeBlock (2) result:", assignResult2);

    // Verify Alice's schedule for future tasks
    console.log(`[Alice] _getUserSchedule: owner=${userAlice}`);
    const aliceSchedule = await concept._getUserSchedule({ owner: userAlice });
    assertExists(aliceSchedule, "Alice's schedule should not be null");
    assertEquals(
      Array.isArray(aliceSchedule),
      true,
      "Alice's schedule should be an array",
    );
    assertEquals(
      (aliceSchedule as Array<any>).length,
      2,
      "Alice should have 2 time blocks in her future schedule",
    );
    console.log("-> Alice's schedule:", aliceSchedule);

    const block1 = (aliceSchedule as Array<any>).find((b) =>
      b.timeBlock._id === aliceBlockId1
    );
    const block2 = (aliceSchedule as Array<any>).find((b) =>
      b.timeBlock._id === aliceBlockId2
    );

    assertExists(block1, "First block should be in schedule");
    assertExists(block2, "Second block should be in schedule");
    assertEquals(
      block1.timeBlock.taskIdSet,
      [taskId1],
      "First block has taskId1",
    );
    assertEquals(
      block2.timeBlock.taskIdSet,
      [taskId2],
      "Second block has taskId2",
    );
  });

  await test.step("Scenario 1: Assigning tasks - new block, existing block, duplicate task (error)", async () => {
    console.log("\n--- Test: Scenario 1: Assigning tasks ---");
    const start = getFutureTime(5);
    const end = getFutureTime(6);

    // Bob assigns taskId3 to a new block (creates it implicitly)
    console.log(
      `[Bob] assignTimeBlock: owner=${userBob}, taskId=${taskId3}, start=${start} (${
        new Date(start).toLocaleTimeString()
      }), end=${end} (${new Date(end).toLocaleTimeString()}) (creates block)`,
    );
    const assignResult1 = await concept.assignTimeBlock({
      owner: userBob,
      taskId: taskId3,
      start,
      end,
    });
    assertExists(assignResult1, "assignTimeBlock should return a block ID");
    assertEquals(
      "timeBlockId" in assignResult1,
      true,
      "assignResult1 should contain timeBlockId",
    );
    bobBlockId = (assignResult1 as { timeBlockId: ID }).timeBlockId;
    console.log("-> assignTimeBlock (1) result:", assignResult1);

    // Bob assigns taskId4 to the *same* block (adds to existing)
    console.log(
      `[Bob] assignTimeBlock: owner=${userBob}, taskId=${taskId4}, start=${start} (${
        new Date(start).toLocaleTimeString()
      }), end=${end} (${new Date(end).toLocaleTimeString()}) (existing block)`,
    );
    const assignResult2 = await concept.assignTimeBlock({
      owner: userBob,
      taskId: taskId4,
      start,
      end,
    });
    assertExists(assignResult2, "assignTimeBlock should return a block ID");
    assertEquals(
      (assignResult2 as { timeBlockId: ID }).timeBlockId,
      bobBlockId,
      "assignResult2 should return the same block ID",
    );
    console.log("-> assignTimeBlock (2) result:", assignResult2);

    // Bob tries to assign taskId3 again to the same block (should be an error)
    console.log(
      `[Bob] assignTimeBlock: owner=${userBob}, taskId=${taskId3}, start=${start}, end=${end} (expected error: duplicate task)`,
    );
    const assignResult3 = await concept.assignTimeBlock({
      owner: userBob,
      taskId: taskId3,
      start,
      end,
    });
    assertEquals(
      "error" in assignResult3,
      true,
      "assignTimeBlock for duplicate task should return error",
    );
    console.log("-> assignTimeBlock (3) result (error expected):", assignResult3);

    // Verify Bob's schedule
    console.log(`[Bob] _getUserSchedule: owner=${userBob}`);
    const bobSchedule = await concept._getUserSchedule({ owner: userBob });
    assertExists(bobSchedule, "Bob's schedule should not be null");
    assertEquals(
      Array.isArray(bobSchedule),
      true,
      "Bob's schedule should be an array",
    );
    assertEquals(
      (bobSchedule as Array<any>).length,
      1,
      "Bob should have 1 time block in his future schedule",
    );
    const block = (bobSchedule as Array<any>)[0].timeBlock;
    assertEquals(block._id, bobBlockId, "Bob's block ID matches");
    assertEquals(
      block.taskIdSet.sort(),
      [taskId3, taskId4].sort(),
      "Bob's block should contain taskId3 and taskId4",
    );
    console.log("-> Bob's schedule:", bobSchedule);
  });

  await test.step("Scenario 2: Removing tasks - valid removal, non-existent task, already removed task (errors)", async () => {
    console.log("\n--- Test: Scenario 2: Removing tasks ---");
    const start = getFutureTime(7);
    const end = getFutureTime(8);

    // Charlie assigns taskId1 and taskId2 to a block
    console.log(
      `[Charlie] Initializing block with ${taskId1} and ${taskId2} for removal tests.`,
    );
    const assignResult1 = await concept.assignTimeBlock({
      owner: userCharlie,
      taskId: taskId1,
      start,
      end,
    });
    charlieBlockId = (assignResult1 as { timeBlockId: ID }).timeBlockId;
    await concept.assignTimeBlock({
      owner: userCharlie,
      taskId: taskId2,
      start,
      end,
    });
    console.log(`-> Charlie's block ID: ${charlieBlockId}`);

    // Verify Charlie's schedule before removal
    let charlieSchedule = await concept._getUserSchedule({
      owner: userCharlie,
    });
    let blockBefore = (charlieSchedule as Array<any>)[0].timeBlock;
    assertEquals(
      blockBefore.taskIdSet.sort(),
      [taskId1, taskId2].sort(),
      "Charlie's block should initially contain taskId1 and taskId2",
    );
    console.log("-> Charlie's schedule before removal:", charlieSchedule);

    // Charlie removes taskId1
    console.log(
      `[Charlie] removeTask: owner=${userCharlie}, taskId=${taskId1}, timeBlockId=${charlieBlockId} (expected success)`,
    );
    const removeResult1 = await concept.removeTask({
      owner: userCharlie,
      taskId: taskId1,
      timeBlockId: charlieBlockId,
    });
    assertEquals(removeResult1, {}, "removeTask should succeed for existing task");
    console.log("-> removeTask (1) result:", removeResult1);

    // Verify Charlie's schedule after first removal
    charlieSchedule = await concept._getUserSchedule({ owner: userCharlie });
    let blockAfter1 = (charlieSchedule as Array<any>)[0].timeBlock;
    assertEquals(
      blockAfter1.taskIdSet,
      [taskId2],
      "Charlie's block should now only contain taskId2",
    );
    console.log("-> Charlie's schedule after first removal:", charlieSchedule);

    // Charlie tries to remove a non-existent task from the block
    console.log(
      `[Charlie] removeTask: owner=${userCharlie}, taskId=${taskId5}, timeBlockId=${charlieBlockId} (expected error: task not in block)`,
    );
    const removeResult2 = await concept.removeTask({
      owner: userCharlie,
      taskId: taskId5, // This task was never added
      timeBlockId: charlieBlockId,
    });
    assertEquals(
      "error" in removeResult2,
      true,
      "removeTask for non-existent task in block should return error",
    );
    console.log("-> removeTask (2) result (error expected):", removeResult2);

    // Charlie tries to remove taskId1 again (already removed, should be an error)
    console.log(
      `[Charlie] removeTask: owner=${userCharlie}, taskId=${taskId1}, timeBlockId=${charlieBlockId} (expected error: task already removed)`,
    );
    const removeResult3 = await concept.removeTask({
      owner: userCharlie,
      taskId: taskId1, // Already removed
      timeBlockId: charlieBlockId,
    });
    assertEquals(
      "error" in removeResult3,
      true,
      "removeTask for already removed task should return error",
    );
    console.log("-> removeTask (3) result (error expected):", removeResult3);
  });

  await test.step("Scenario 3: addTimeBlock requirements - duplicate block (error)", async () => {
    console.log("\n--- Test: Scenario 3: addTimeBlock duplicates ---");
    const start = getFutureTime(9);
    const end = getFutureTime(10);

    // David adds a time block
    console.log(
      `[David] addTimeBlock: owner=${userDavid}, start=${start} (${
        new Date(start).toLocaleTimeString()
      }), end=${end} (${new Date(end).toLocaleTimeString()})`,
    );
    const addResult1 = await concept.addTimeBlock({
      owner: userDavid,
      start,
      end,
    });
    assertEquals(addResult1, {}, "addTimeBlock should succeed for unique block");
    console.log("-> addTimeBlock (1) result:", addResult1);

    // David tries to add the exact same time block (should be an error)
    console.log(
      `[David] addTimeBlock: owner=${userDavid}, start=${start}, end=${end} (expected error: duplicate block)`,
    );
    const addResult2 = await concept.addTimeBlock({
      owner: userDavid,
      start,
      end,
    });
    assertEquals(
      "error" in addResult2,
      true,
      "addTimeBlock for duplicate block should return error",
    );
    console.log("-> addTimeBlock (2) result (error expected):", addResult2);

    // Verify David's schedule contains only one of the blocks
    console.log(`[David] _getUserSchedule: owner=${userDavid}`);
    const davidSchedule = await concept._getUserSchedule({ owner: userDavid });
    assertExists(davidSchedule, "David's schedule should not be null");
    assertEquals(
      Array.isArray(davidSchedule),
      true,
      "David's schedule should be an array",
    );
    assertEquals(
      (davidSchedule as Array<any>).length,
      1,
      "David should have 1 time block in his future schedule",
    );
    console.log("-> David's schedule:", davidSchedule);
  });

  await test.step("Scenario 4: Querying for non-existent owner or old blocks (error)", async () => {
    console.log(
      "\n--- Test: Scenario 4: Querying for non-existent/old blocks ---",
    );

    // Eve has no blocks
    console.log(`[Eve] _getUserSchedule: owner=${userEve} (no blocks exist for Eve)`);
    const eveSchedule = await concept._getUserSchedule({ owner: userEve });
    assertEquals(
      "error" in eveSchedule,
      true,
      "getUserSchedule for owner with no blocks should return error",
    );
    console.log("-> Eve's schedule (error expected):", eveSchedule);

    // Frank has an old block (past `end` time relative to `Date.now()`)
    const pastStart = getPastTime(2); // 2 hours ago
    const pastEnd = getPastTime(1); // 1 hour ago
    console.log(
      `[Frank] addTimeBlock: owner=${userFrank}, start=${pastStart} (${
        new Date(pastStart).toLocaleTimeString()
      }), end=${pastEnd} (${new Date(pastEnd).toLocaleTimeString()}) (in the past)`,
    );
    await concept.addTimeBlock({
      owner: userFrank,
      start: pastStart,
      end: pastEnd,
    });

    // Query Frank's schedule (should return error as blocks are in the past and `_getUserSchedule` filters for future blocks)
    console.log(`[Frank] _getUserSchedule: owner=${userFrank} (blocks are in the past)`);
    const frankSchedule = await concept._getUserSchedule({ owner: userFrank });
    assertEquals(
      "error" in frankSchedule,
      true,
      "getUserSchedule for owner with only past blocks should return error",
    );
    console.log("-> Frank's schedule (error expected):", frankSchedule);
  });

  // Close the database client
  await client.close();
});
```
