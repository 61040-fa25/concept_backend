[@implementation](implementation.md)
[@implementation](../UserAccount/implementation.md)
[@implementation](../Tasks/implementation.md)

[@Schedule](Schedule.md)

[@testing-concepts](../../background/testing-concepts.md)


# test: Write tests for the implementation of Schedule making sure you follow the assignment guidelines:

**Testing concepts**. Your tests should cover the basic behavior of the concept but should also include some more interesting cases. Your tests should use the Deno testing framework and should be programmatic (that is, determining in the code whether they succeeded or failed, and not requiring a human to interpret console messages). They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Some more details about the test cases you should include:

- **Operational principle**. A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example.
- **Interesting scenarios**. Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors.
- **Number required**. For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios.
- **No state setup**. Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state.
- **Saving test execution output**. Save the test execution output by copy-pasting from the console to a markdown file.

Here is the implementation:

```typescript 
import { Collection, Db } from "npm:mongodb";

import { Empty, ID } from "@utils/types.ts";

import { freshID } from "@utils/database.ts";

  

// Generic types for this concept

type User = ID;

  

// Define the shape of external events for the syncCalendar action

interface ExternalEvent {

  startTime: Date;

  endTime: Date;

}

  

/**

 * State: a set of BusySlots with

 * - an owner User

 * - a startTime DateTime

 * - a endTime DateTime

 */

export interface BusySlot {

  _id: ID;

  owner: User;

  startTime: Date;

  endTime: Date;

}

  

/**

 * @concept Schedule

 * @purpose To represent a user's non-negotiable, externally-scheduled commitments.

 * @principle The schedule is a read-only reflection of a user's external calendar,

 *            but can also be manually modified.

 */

export default class ScheduleConcept {

  public readonly busySlots: Collection<BusySlot>;

  

  constructor(db: Db) {

    this.busySlots = db.collection<BusySlot>("schedule.busySlots");

  }

  

  /**

   * Replaces a user's entire schedule with a new set of busy slots from an external source.

   * @param user The user whose calendar is being synced.

   * @param externalEvents An array of events, each with a start and end time.

   * @requires User ID must be provided.

   * @effects Deletes all existing busy slots for the user and creates new ones based on the provided events.

   */

  async syncCalendar(

    { user, externalEvents }: { user: User; externalEvents: ExternalEvent[] },

  ): Promise<Empty | { error: string }> {

    if (!user) {

      return { error: "User ID must be provided" };

    }

    // Validate all external events before making any database changes.

    for (const event of externalEvents) {

      if (

        !(event.startTime instanceof Date) ||

        !(event.endTime instanceof Date) || event.startTime >= event.endTime

      ) {

        return {

          error:

            "All events must have a valid startTime that occurs before its endTime.",

        };

      }

    }

  

    try {

      // Perform deletion and insertion. For atomicity, this would ideally be in a transaction.

      await this.busySlots.deleteMany({ owner: user });

  

      if (externalEvents.length > 0) {

        const newSlots: BusySlot[] = externalEvents.map((event) => ({

          _id: freshID(),

          owner: user,

          startTime: event.startTime,

          endTime: event.endTime,

        }));

        await this.busySlots.insertMany(newSlots);

      }

  

      return {};

    } catch (e) {

      if (e instanceof Error) {

        return { error: `Failed to sync calendar: ${e.message}` };

      }

      return { error: "An unknown error occurred while syncing calendar." };

    }

  }

  

  /**

   * Removes all busy slots for a given user.

   * @param user The user whose busy slots will be deleted.

   * @requires User ID must be provided.

   * @effects All busy slots associated with the user are removed from the database.

   */

  async deleteAllForUser(

    { user }: { user: User },

  ): Promise<Empty | { error: string }> {

    if (!user) {

      return { error: "User ID must be provided" };

    }

    try {

      await this.busySlots.deleteMany({ owner: user });

      return {};

    } catch (e) {

      if (e instanceof Error) {

        return { error: `Failed to delete slots for user: ${e.message}` };

      }

      return { error: "An unknown error occurred while deleting slots." };

    }

  }

  

  /**

   * Creates a new busy slot for a user, representing a manual block of time.

   * @param user The user for whom to block time.

   * @param startTime The start of the busy period.

   * @param endTime The end of the busy period.

   * @requires User ID, startTime, and endTime must be provided. startTime must be before endTime.

   * @effects A new BusySlot document is created in the database.

   * @returns The ID of the newly created slot.

   */

  async blockTime(

    { user, startTime, endTime }: {

      user: User;

      startTime: Date;

      endTime: Date;

    },

  ): Promise<{ _id: ID } | { error: string }> {

    if (!user || !startTime || !endTime) {

      return { error: "User, startTime, and endTime are required." };

    }

    if (

      !(startTime instanceof Date) || !(endTime instanceof Date) ||

      startTime >= endTime

    ) {

      return {

        error: "startTime must be a valid Date that occurs before endTime.",

      };

    }

  

    const newSlot: BusySlot = {

      _id: freshID(),

      owner: user,

      startTime,

      endTime,

    };

  

    try {

      await this.busySlots.insertOne(newSlot);

      return { _id: newSlot._id };

    } catch (e) {

      if (e instanceof Error) {

        return { error: `Failed to block time: ${e.message}` };

      }

      return { error: "An unknown error occurred while blocking time." };

    }

  }

  

  /**

   * Retrieves all busy slots for a given user.

   * @param user The user whose slots to retrieve.

   * @requires User ID must be provided.

   * @effects Returns an array of BusySlot documents.

   */

  async _getSlots({ user }: { user: User }): Promise<BusySlot[]> {

    if (!user) {

      // For queries, returning an empty array is often better than throwing an error

      // if the input is invalid, as it simplifies client-side logic.

      return [];

    }

    return await this.busySlots.find({ owner: user }).toArray();

  }

}
```


# response:

# file: src/schedule/ScheduleConcept.test.ts

```typescript
import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import { testDb } from "../utils/database.ts";
import { ID } from "../utils/types.ts";
import ScheduleConcept, { BusySlot } from "./ScheduleConcept.ts";

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
      { startTime: new Date("2023-10-26T09:00:00Z"), endTime: new Date("2023-10-26T10:00:00Z") },
      { startTime: new Date("2023-10-26T14:00:00Z"), endTime: new Date("2023-10-26T15:30:00Z") },
    ];
    const syncResult = await schedule.syncCalendar({ user: userA, externalEvents });
    logAction("syncCalendar", { user: userA, externalEvents }, syncResult);
    assert(!("error" in syncResult), "Calendar sync should succeed.");

    // 3. Verify the synced slots are now in her schedule.
    aliceSlots = await schedule._getSlots({ user: userA });
    logAction("_getSlots", { user: userA }, aliceSlots);
    assertEquals(aliceSlots.length, 2, "Alice should have 2 slots after syncing.");
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
      { startTime: new Date("2023-11-01T10:00:00Z"), endTime: new Date("2023-11-01T11:00:00Z") },
    ];
    const syncResult = await schedule.syncCalendar({ user: userB, externalEvents: newExternalEvents });
    logAction("syncCalendar", { user: userB, externalEvents: newExternalEvents }, syncResult);
    assert(!("error" in syncResult));

    // 3. Verify that only the new synced event exists, and the manual block is gone.
    const bobSlots = await schedule._getSlots({ user: userB });
    logAction("_getSlots", { user: userB }, bobSlots);
    assertEquals(bobSlots.length, 1, "Bob should only have 1 slot from the new sync.");
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
    await schedule.blockTime({ user: userC, startTime: new Date("2023-11-05T08:00:00Z"), endTime: new Date("2023-11-05T09:00:00Z") });
    await schedule.blockTime({ user: userC, startTime: new Date("2023-11-05T10:00:00Z"), endTime: new Date("2023-11-05T11:00:00Z") });
    assertEquals((await schedule._getSlots({ user: userC })).length, 2);

    // 2. An empty sync should clear all of Charlie's slots.
    const emptySyncResult = await schedule.syncCalendar({ user: userC, externalEvents: [] });
    logAction("syncCalendar (empty)", { user: userC, externalEvents: [] }, emptySyncResult);
    assert(!("error" in emptySyncResult));
    const charlieSlots = await schedule._getSlots({ user: userC });
    assertEquals(charlieSlots.length, 0, "Empty sync should delete all slots.");

    // 3. An invalid sync should fail and not change the state.
    const invalidEvents = [{ startTime: new Date("2023-11-05T14:00:00Z"), endTime: new Date("2023-11-05T13:00:00Z") }];
    const invalidSyncResult = await schedule.syncCalendar({ user: userC, externalEvents: invalidEvents });
    logAction("syncCalendar (invalid)", { user: userC, externalEvents: invalidEvents }, invalidSyncResult);
    assert("error" in invalidSyncResult, "Sync with invalid time range should return an error.");
    const charlieSlotsAfterFailure = await schedule._getSlots({ user: userC });
    assertEquals(charlieSlotsAfterFailure.length, 0, "State should not change after a failed action.");
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
    await schedule.syncCalendar({ user: userD, externalEvents: [{ startTime: new Date(), endTime: new Date(Date.now() + 3600000) }] });
    await schedule.blockTime({ user: userD, startTime: new Date(Date.now() + 7200000), endTime: new Date(Date.now() + 10800000) });
    assertEquals((await schedule._getSlots({ user: userD })).length, 2);

    // 2. Delete all slots for David.
    const deleteResult = await schedule.deleteAllForUser({ user: userD });
    logAction("deleteAllForUser", { user: userD }, deleteResult);
    assert(!("error" in deleteResult));

    // 3. Verify David has no slots.
    const davidSlots = await schedule._getSlots({ user: userD });
    assertEquals(davidSlots.length, 0, "David should have no slots after deletion.");

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
    const invalidTimeRange = { user: userF, startTime: new Date("2023-12-01T10:00:00Z"), endTime: new Date("2023-12-01T09:00:00Z") };
    const result1 = await schedule.blockTime(invalidTimeRange);
    logAction("blockTime (invalid range)", invalidTimeRange, result1);
    assert("error" in result1, "Should return error for invalid time range.");

    // 2. Attempt to block time with start time equal to end time.
    const equalTimeRange = { user: userF, startTime: new Date("2023-12-01T10:00:00Z"), endTime: new Date("2023-12-01T10:00:00Z") };
    const result2 = await schedule.blockTime(equalTimeRange);
    logAction("blockTime (equal times)", equalTimeRange, result2);
    assert("error" in result2, "Should return error for equal start/end times.");

    // 3. Verify no slots were created for Frank after the failed attempts.
    const frankSlots = await schedule._getSlots({ user: userF });
    assertEquals(frankSlots.length, 0, "No slots should be created after failed blockTime actions.");
    console.log("--- Invalid blockTime Test Passed ---");
  } finally {
    await client.close();
  }
});
```

# trace:

The following trace demonstrates the operational principle: a user's schedule is initialized by syncing with an external calendar, and then further customized with a manually added time block.

1.  **Start State**: User `user:Alice` has no `BusySlot` documents in the database.
2.  **Action**: `_getSlots({ user: "user:Alice" })` is called.
    *   **Result**: Returns an empty array `[]`.
    *   **State Change**: None.
3.  **Action**: `syncCalendar({ user: "user:Alice", externalEvents: [...] })` is called with two events.
    *   **Requires**: `user` is provided. This is met. `externalEvents` have valid `startTime` < `endTime`. This is met.
    *   **Effects**: Deletes any existing slots for `user:Alice` (there are none). Then, it creates two new `BusySlot` documents in the `schedule.busySlots` collection, one for each event.
    *   **Result**: Returns an empty object `{}` indicating success.
    *   **State Change**: The collection now contains two documents owned by `user:Alice`.
4.  **Action**: `_getSlots({ user: "user:Alice" })` is called again to verify the state.
    *   **Result**: Returns an array with two `BusySlot` objects, matching the events from the sync.
    *   **State Change**: None.
5.  **Action**: `blockTime({ user: "user:Alice", startTime: ..., endTime: ... })` is called to add a lunch break.
    *   **Requires**: `user`, `startTime`, and `endTime` are provided, and `startTime` < `endTime`. This is met.
    *   **Effects**: Creates one new `BusySlot` document in the collection.
    *   **Result**: Returns `{ _id: "..." }` with the ID of the new slot.
    *   **State Change**: The collection now contains three documents owned by `user:Alice`.
6.  **Action**: `_getSlots({ user: "user:Alice" })` is called a final time.
    *   **Result**: Returns an array with three `BusySlot` objects.
    *   **State Change**: None.

This trace confirms that the concept successfully models its principle by allowing an initial state to be set via an external source (`syncCalendar`) and then modified with specific, user-initiated actions (`blockTime`), with the state being queryable at each step (`_getSlots`).