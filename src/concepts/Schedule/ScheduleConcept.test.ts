import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ScheduleConcept from "./ScheduleConcept.ts";

// Helper to log actions and results for clarity during test execution
function logAction(name: string, params: unknown, result: unknown) {
  console.log(`\nAction: ${name}`);
  console.log("Params:", params);
  console.log("Result:", result);
}

Deno.test("Operational Principle: Sync external calendar and add manual blocks", async () => {
  const [db, client] = await testDb();
  try {
    const schedule = new ScheduleConcept(db);
    const userA = "user:Alice" as ID;

    console.log("--- Testing Operational Principle ---");

    // 1. Initially, Alice has no busy slots.
    let aliceSlots = await schedule._getSlots({ user: userA });
    logAction("_getSlots", { user: userA }, aliceSlots);
    assertEquals(aliceSlots.length, 0, "Alice should have no slots initially.");

    // 2. Alice syncs her external calendar, which has two events.
    const externalEvents = [
      {
        startTime: new Date("2023-10-26T09:00:00Z"),
        endTime: new Date("2023-10-26T10:00:00Z"),
      },
      {
        startTime: new Date("2023-10-26T14:00:00Z"),
        endTime: new Date("2023-10-26T15:30:00Z"),
      },
    ];
    const syncResult = await schedule.syncCalendar({
      user: userA,
      externalEvents,
    });
    logAction("syncCalendar", { user: userA, externalEvents }, syncResult);
    assert(!("error" in syncResult), "Calendar sync should succeed.");

    // 3. Verify the synced slots are now in her schedule.
    aliceSlots = await schedule._getSlots({ user: userA });
    logAction("_getSlots", { user: userA }, aliceSlots);
    assertEquals(
      aliceSlots.length,
      2,
      "Alice should have 2 slots after syncing.",
    );
    assertEquals(aliceSlots[0].startTime, externalEvents[0].startTime);

    // 4. Alice manually blocks time for lunch.
    const lunchBlock = {
      user: userA,
      startTime: new Date("2023-10-26T12:00:00Z"),
      endTime: new Date("2023-10-26T13:00:00Z"),
    };
    const blockResult = await schedule.blockTime(lunchBlock);
    logAction("blockTime", lunchBlock, blockResult);
    assert("error" in blockResult === false, "Blocking time should succeed.");
    assertExists((blockResult as { _id: ID })._id);

    // 5. Verify she now has 3 slots: 2 from sync + 1 manual block.
    aliceSlots = await schedule._getSlots({ user: userA });
    logAction("_getSlots", { user: userA }, aliceSlots);
    assertEquals(aliceSlots.length, 3, "Alice should have 3 slots in total.");
    console.log("--- Principle Test Passed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Interesting Scenario: Resyncing clears all previous slots", async () => {
  const [db, client] = await testDb();
  try {
    const schedule = new ScheduleConcept(db);
    const userB = "user:Bob" as ID;
    console.log("\n--- Testing Scenario: Resyncing ---");

    // 1. Bob manually blocks time.
    const manualBlock = {
      user: userB,
      startTime: new Date("2023-11-01T18:00:00Z"),
      endTime: new Date("2023-11-01T20:00:00Z"),
    };
    await schedule.blockTime(manualBlock);

    // 2. Bob syncs his calendar, which has one new event.
    const newExternalEvents = [
      {
        startTime: new Date("2023-11-01T10:00:00Z"),
        endTime: new Date("2023-11-01T11:00:00Z"),
      },
    ];
    const syncResult = await schedule.syncCalendar({
      user: userB,
      externalEvents: newExternalEvents,
    });
    logAction("syncCalendar", {
      user: userB,
      externalEvents: newExternalEvents,
    }, syncResult);
    assert(!("error" in syncResult));

    // 3. Verify that only the new synced event exists, and the manual block is gone.
    const bobSlots = await schedule._getSlots({ user: userB });
    logAction("_getSlots", { user: userB }, bobSlots);
    assertEquals(
      bobSlots.length,
      1,
      "Bob should only have 1 slot from the new sync.",
    );
    assertEquals(bobSlots[0].startTime, newExternalEvents[0].startTime);
    console.log("--- Resyncing Test Passed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Interesting Scenario: Empty and invalid syncs", async () => {
  const [db, client] = await testDb();
  try {
    const schedule = new ScheduleConcept(db);
    const userC = "user:Charlie" as ID;
    console.log("\n--- Testing Scenario: Empty and Invalid Syncs ---");

    // 1. Charlie adds a couple of manual blocks.
    await schedule.blockTime({
      user: userC,
      startTime: new Date("2023-11-05T08:00:00Z"),
      endTime: new Date("2023-11-05T09:00:00Z"),
    });
    await schedule.blockTime({
      user: userC,
      startTime: new Date("2023-11-05T10:00:00Z"),
      endTime: new Date("2023-11-05T11:00:00Z"),
    });
    assertEquals((await schedule._getSlots({ user: userC })).length, 2);

    // 2. An empty sync should clear all of Charlie's slots.
    const emptySyncResult = await schedule.syncCalendar({
      user: userC,
      externalEvents: [],
    });
    logAction(
      "syncCalendar (empty)",
      { user: userC, externalEvents: [] },
      emptySyncResult,
    );
    assert(!("error" in emptySyncResult));
    const charlieSlots = await schedule._getSlots({ user: userC });
    assertEquals(charlieSlots.length, 0, "Empty sync should delete all slots.");

    // 3. An invalid sync should fail and not change the state.
    const invalidEvents = [{
      startTime: new Date("2023-11-05T14:00:00Z"),
      endTime: new Date("2023-11-05T13:00:00Z"),
    }];
    const invalidSyncResult = await schedule.syncCalendar({
      user: userC,
      externalEvents: invalidEvents,
    });
    logAction("syncCalendar (invalid)", {
      user: userC,
      externalEvents: invalidEvents,
    }, invalidSyncResult);
    assert(
      "error" in invalidSyncResult,
      "Sync with invalid time range should return an error.",
    );
    const charlieSlotsAfterFailure = await schedule._getSlots({ user: userC });
    assertEquals(
      charlieSlotsAfterFailure.length,
      0,
      "State should not change after a failed action.",
    );
    console.log("--- Empty/Invalid Sync Test Passed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Interesting Scenario: Explicitly delete all slots for a user", async () => {
  const [db, client] = await testDb();
  try {
    const schedule = new ScheduleConcept(db);
    const userD = "user:David" as ID;
    console.log("\n--- Testing Scenario: Delete All Slots ---");

    // 1. David has a mix of synced and manual slots.
    await schedule.syncCalendar({
      user: userD,
      externalEvents: [{
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
      }],
    });
    await schedule.blockTime({
      user: userD,
      startTime: new Date(Date.now() + 7200000),
      endTime: new Date(Date.now() + 10800000),
    });
    assertEquals((await schedule._getSlots({ user: userD })).length, 2);

    // 2. Delete all slots for David.
    const deleteResult = await schedule.deleteAllForUser({ user: userD });
    logAction("deleteAllForUser", { user: userD }, deleteResult);
    assert(!("error" in deleteResult));

    // 3. Verify David has no slots.
    const davidSlots = await schedule._getSlots({ user: userD });
    assertEquals(
      davidSlots.length,
      0,
      "David should have no slots after deletion.",
    );

    // 4. Deleting for a user with no slots should also succeed.
    const userE = "user:Eve" as ID;
    const deleteEmptyResult = await schedule.deleteAllForUser({ user: userE });
    logAction("deleteAllForUser (empty)", { user: userE }, deleteEmptyResult);
    assert(!("error" in deleteEmptyResult));
    console.log("--- Delete All Slots Test Passed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Interesting Scenario: Invalid inputs for blockTime", async () => {
  const [db, client] = await testDb();
  try {
    const schedule = new ScheduleConcept(db);
    const userF = "user:Frank" as ID;
    console.log("\n--- Testing Scenario: Invalid blockTime ---");

    // 1. Attempt to block time with start time after end time.
    const invalidTimeRange = {
      user: userF,
      startTime: new Date("2023-12-01T10:00:00Z"),
      endTime: new Date("2023-12-01T09:00:00Z"),
    };
    const result1 = await schedule.blockTime(invalidTimeRange);
    logAction("blockTime (invalid range)", invalidTimeRange, result1);
    assert("error" in result1, "Should return error for invalid time range.");

    // 2. Attempt to block time with start time equal to end time.
    const equalTimeRange = {
      user: userF,
      startTime: new Date("2023-12-01T10:00:00Z"),
      endTime: new Date("2023-12-01T10:00:00Z"),
    };
    const result2 = await schedule.blockTime(equalTimeRange);
    logAction("blockTime (equal times)", equalTimeRange, result2);
    assert(
      "error" in result2,
      "Should return error for equal start/end times.",
    );

    // 3. Verify no slots were created for Frank after the failed attempts.
    const frankSlots = await schedule._getSlots({ user: userF });
    assertEquals(
      frankSlots.length,
      0,
      "No slots should be created after failed blockTime actions.",
    );
    console.log("--- Invalid blockTime Test Passed ---");
  } finally {
    await client.close();
  }
});
