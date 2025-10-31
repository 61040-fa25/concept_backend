import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ScheduleConcept from "./ScheduleConcept.ts";

// Helper function to check for error returns and fail the test if an error is not expected.
function assertIsSuccess<T>(result: T | { error: string }): T {
  if (result && typeof result === "object" && "error" in result) {
    throw new Error(`Expected success but got error: ${result.error}`);
  }
  return result as T;
}

// Helper function to check for success returns and fail the test if success is not expected.
function assertIsError<T>(result: T | { error: string }): { error: string } {
  if (result && typeof result === "object" && !("error" in result)) {
    throw new Error(
      `Expected error but got success: ${JSON.stringify(result)}`,
    );
  }
  return result as { error: string };
}

Deno.test("Operational Principle: Sync external calendar and manage manual blocks", async () => {
  const [db, client] = await testDb();
  try {
    const schedule = new ScheduleConcept(db);
    const userA = "user:Alice" as ID;

    console.log("\n--- Testing Operational Principle ---");

    // 1. Sync an external calendar for a user
    const externalEvents = [
      {
        startTime: new Date("2023-10-26T09:00:00Z"),
        endTime: new Date("2023-10-26T10:00:00Z"),
        description: "Team Standup",
      },
      {
        startTime: new Date("2023-10-26T11:00:00Z"),
        endTime: new Date("2023-10-26T12:30:00Z"),
        description: "Project Meeting",
      },
    ];
    console.log(
      `Action: syncCalendar for user ${userA} with ${externalEvents.length} events`,
    );
    const syncResult = await schedule.syncCalendar({
      user: userA,
      externalEvents,
    });
    assertIsSuccess(syncResult);
    console.log("Result: Success");

    // 2. Verify the external slots are created correctly
    let slots = await schedule._getSlots({ user: userA });
    console.log(
      `Query: _getSlots for user ${userA}. Found ${slots.length} slots.`,
    );
    assertEquals(slots.length, 2);
    assertEquals(slots[0].origin, "EXTERNAL");
    assertEquals(slots[1].origin, "EXTERNAL");

    // 3. Add a manual time block for the same user
    const manualBlock = {
      user: userA,
      startTime: new Date("2023-10-26T14:00:00Z"),
      endTime: new Date("2023-10-26T15:00:00Z"),
      description: "Focus Time",
    };
    console.log(`Action: blockTime for user ${userA}:`, manualBlock);
    const blockResult = assertIsSuccess(await schedule.blockTime(manualBlock));
    assertExists(blockResult.slot);
    const manualSlotId = blockResult.slot;
    console.log(`Result: Success, created slot with ID: ${manualSlotId}`);

    // 4. Verify both external and manual slots exist
    slots = await schedule._getSlots({ user: userA });
    console.log(
      `Query: _getSlots for user ${userA}. Found ${slots.length} slots.`,
    );
    assertEquals(slots.length, 3);
    assertEquals(slots.filter((s) => s.origin === "MANUAL").length, 1);
    assertEquals(slots.filter((s) => s.origin === "EXTERNAL").length, 2);

    // 5. Update the manual time block
    const updatePayload = {
      slotId: manualSlotId,
      newStartTime: new Date("2023-10-26T14:30:00Z"),
      newEndTime: new Date("2023-10-26T15:30:00Z"),
      newDescription: "Updated Focus Time",
    };
    console.log(`Action: updateSlot for slot ${manualSlotId}:`, updatePayload);
    const updateResult = await schedule.updateSlot(updatePayload);
    assertIsSuccess(updateResult);
    console.log("Result: Success");

    // 6. Sync the external calendar again to ensure manual block is untouched
    const updatedExternalEvents = [
      {
        startTime: new Date("2023-10-27T10:00:00Z"),
        endTime: new Date("2023-10-27T11:00:00Z"),
        description: "New Standup",
      },
    ];
    console.log(
      `Action: syncCalendar for user ${userA} with ${updatedExternalEvents.length} new event`,
    );
    const secondSyncResult = await schedule.syncCalendar({
      user: userA,
      externalEvents: updatedExternalEvents,
    });
    assertIsSuccess(secondSyncResult);
    console.log("Result: Success");

    // 7. Verify the final state is correct
    slots = await schedule._getSlots({ user: userA });
    console.log(
      `Query: _getSlots for user ${userA}. Found ${slots.length} slots.`,
    );
    assertEquals(slots.length, 2);
    const manualSlot = slots.find((s) => s.origin === "MANUAL");
    const externalSlot = slots.find((s) => s.origin === "EXTERNAL");
    assertExists(manualSlot);
    assertExists(externalSlot);
    assertEquals(manualSlot.description, "Updated Focus Time");
    assertEquals(externalSlot.description, "New Standup");
    console.log("--- Operational Principle Test Passed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Interesting Scenario: Attempt to modify external slots", async () => {
  const [db, client] = await testDb();
  try {
    const schedule = new ScheduleConcept(db);
    const userB = "user:Bob" as ID;

    console.log("\n--- Testing Scenario: Modify External Slots ---");

    // Setup: Sync an external calendar
    const externalEvents = [{
      startTime: new Date("2023-11-01T10:00:00Z"),
      endTime: new Date("2023-11-01T11:00:00Z"),
      description: "Immutable Meeting",
    }];
    await schedule.syncCalendar({ user: userB, externalEvents });
    const slots = await schedule._getSlots({ user: userB });
    const externalSlotId = slots[0]._id;

    // 1. Attempt to update an external slot with valid times to bypass the first check
    console.log(`Action: updateSlot on external slot ${externalSlotId}`);
    const updateResult = await schedule.updateSlot({
      slotId: externalSlotId,
      newStartTime: new Date("2024-01-01T10:00:00Z"),
      newEndTime: new Date("2024-01-01T11:00:00Z"),
      newDescription: "Trying to change",
    });
    const updateError = assertIsError(updateResult);
    assertEquals(
      updateError.error,
      "Cannot update a slot with an external origin.",
    );
    console.log(`Result: Correctly failed with error: "${updateError.error}"`);

    // 2. Attempt to delete an external slot
    console.log(`Action: deleteSlot on external slot ${externalSlotId}`);
    const deleteResult = await schedule.deleteSlot({ slotId: externalSlotId });
    const deleteError = assertIsError(deleteResult);
    assertEquals(
      deleteError.error,
      "Cannot delete a slot with an external origin.",
    );
    console.log(`Result: Correctly failed with error: "${deleteError.error}"`);

    // Verify the slot was not changed or deleted
    const finalSlots = await schedule._getSlots({ user: userB });
    assertEquals(finalSlots.length, 1);
    console.log("--- Modify External Slots Test Passed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Interesting Scenario: Handle invalid time inputs", async () => {
  const [db, client] = await testDb();
  try {
    const schedule = new ScheduleConcept(db);
    const userC = "user:Charlie" as ID;
    console.log("\n--- Testing Scenario: Invalid Time Inputs ---");

    // 1. Try to blockTime with start time after end time
    console.log("Action: blockTime with startTime > endTime");
    const result = await schedule.blockTime({
      user: userC,
      startTime: new Date("2023-11-01T12:00:00Z"),
      endTime: new Date("2023-11-01T11:00:00Z"),
      description: "Invalid",
    });
    let error = assertIsError(result);
    assertEquals(error.error, "Start time must be before end time.");
    console.log(`Result: Correctly failed with error: "${error.error}"`);

    // 2. Create a valid slot first
    const createRes = await schedule.blockTime({
      user: userC,
      startTime: new Date("2023-11-01T10:00:00Z"),
      endTime: new Date("2023-11-01T11:00:00Z"),
      description: "Valid",
    });
    const { slot: validSlotId } = assertIsSuccess(createRes);

    // 3. Try to updateSlot with start time equal to end time
    console.log("Action: updateSlot with newStartTime === newEndTime");
    const result1 = await schedule.updateSlot({
      slotId: validSlotId,
      newStartTime: new Date("2023-11-01T14:00:00Z"),
      newEndTime: new Date("2023-11-01T14:00:00Z"),
      newDescription: "Invalid Update",
    });
    error = assertIsError(result1);
    assertEquals(error.error, "Start time must be before end time.");
    console.log(`Result: Correctly failed with error: "${error.error}"`);
    console.log("--- Invalid Time Inputs Test Passed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Interesting Scenario: Complete data removal for a single user", async () => {
  const [db, client] = await testDb();
  try {
    const schedule = new ScheduleConcept(db);
    const userD = "user:David" as ID;
    const userE = "user:Eve" as ID;
    console.log("\n--- Testing Scenario: Data Removal ---");

    // Setup: Create slots for two different users
    await schedule.blockTime({
      user: userD,
      startTime: new Date("2023-11-02T09:00:00Z"),
      endTime: new Date("2023-11-02T10:00:00Z"),
      description: "David's Slot",
    });
    await schedule.syncCalendar({
      user: userD,
      externalEvents: [{
        startTime: new Date("2023-11-02T11:00:00Z"),
        endTime: new Date("2023-11-02T12:00:00Z"),
        description: "David's External",
      }],
    });
    await schedule.blockTime({
      user: userE,
      startTime: new Date("2023-11-02T09:00:00Z"),
      endTime: new Date("2023-11-02T10:00:00Z"),
      description: "Eve's Slot",
    });

    assertEquals((await schedule._getSlots({ user: userD })).length, 2);
    assertEquals((await schedule._getSlots({ user: userE })).length, 1);
    console.log("Setup: Created 2 slots for David and 1 slot for Eve");

    // 1. Delete all slots for userD
    console.log(`Action: deleteAllForUser for user ${userD}`);
    const deleteResult = await schedule.deleteAllForUser({ user: userD });
    assertIsSuccess(deleteResult);
    console.log("Result: Success");

    // 2. Verify userD has no slots, but userE's slots remain
    const slotsD = await schedule._getSlots({ user: userD });
    const slotsE = await schedule._getSlots({ user: userE });
    console.log(
      `Query: _getSlots for user ${userD}. Found ${slotsD.length} slots.`,
    );
    console.log(
      `Query: _getSlots for user ${userE}. Found ${slotsE.length} slots.`,
    );
    assertEquals(slotsD.length, 0);
    assertEquals(slotsE.length, 1);
    console.log("--- Data Removal Test Passed ---");
  } finally {
    await client.close();
  }
});

Deno.test("Interesting Scenario: Syncing with an empty calendar and deleting a manual slot", async () => {
  const [db, client] = await testDb();
  try {
    const schedule = new ScheduleConcept(db);
    const userF = "user:Frank" as ID;
    console.log("\n--- Testing Scenario: Empty Sync and Manual Delete ---");

    // Setup: Create one manual and one external slot
    const { slot: manualSlotId } = assertIsSuccess(
      await schedule.blockTime({
        user: userF,
        startTime: new Date("2023-11-03T10:00:00Z"),
        endTime: new Date("2023-11-03T11:00:00Z"),
        description: "Manual Slot",
      }),
    );
    await schedule.syncCalendar({
      user: userF,
      externalEvents: [{
        startTime: new Date("2023-11-03T13:00:00Z"),
        endTime: new Date("2023-11-03T14:00:00Z"),
        description: "External Slot",
      }],
    });
    assertEquals((await schedule._getSlots({ user: userF })).length, 2);
    console.log("Setup: Created one manual and one external slot for Frank.");

    // 1. Sync with an empty external calendar
    console.log(
      `Action: syncCalendar for user ${userF} with an empty event list`,
    );
    const syncResult = await schedule.syncCalendar({
      user: userF,
      externalEvents: [],
    });
    assertIsSuccess(syncResult);
    console.log("Result: Success");

    // 2. Verify external slot is gone, manual slot remains
    let slots = await schedule._getSlots({ user: userF });
    console.log(
      `Query: _getSlots for user ${userF}. Found ${slots.length} slots.`,
    );
    assertEquals(slots.length, 1);
    assertEquals(slots[0].origin, "MANUAL");

    // 3. Delete the remaining manual slot
    console.log(`Action: deleteSlot for manual slot ${manualSlotId}`);
    const deleteResult = await schedule.deleteSlot({ slotId: manualSlotId });
    assertIsSuccess(deleteResult);
    console.log("Result: Success");

    // 4. Verify user has no slots left
    slots = await schedule._getSlots({ user: userF });
    console.log(
      `Query: _getSlots for user ${userF}. Found ${slots.length} slots.`,
    );
    assertEquals(slots.length, 0);
    console.log("--- Empty Sync and Manual Delete Test Passed ---");
  } finally {
    await client.close();
  }
});
