[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: Session

# response:

```typescript
// file: src/Session/SessionConcept.test.ts
import { Collection, Db } from "npm:mongodb";
import { assertEquals, assertExists, assertNotEquals, assertNull } from "jsr:@std/assert";
import { freshID, testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import SessionConcept from "./SessionConcept.ts";

// Define test IDs for generic types
const USER_ALICE = "user:Alice" as ID;
const USER_BOB = "user:Bob" as ID;
const LIST_GROCERIES = "list:Groceries" as ID;
const LIST_WORK = "list:Work" as ID;
const TASK_MILK = "task:Milk" as ID;
const TASK_BREAD = "task:Bread" as ID;
const TASK_EGGS = "task:Eggs" as ID;
const TASK_REPORT = "task:Report" as ID;

Deno.test("Session Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const sessionConcept = new SessionConcept(db);

  await t.step("changeSession: should create a new session for an owner", async () => {
    const result = await sessionConcept.changeSession({
      list: LIST_GROCERIES,
      sessionOwner: USER_ALICE,
    });
    assertEquals(result, {});

    const session = await sessionConcept._getActiveSessionForOwner({ owner: USER_ALICE });
    assertExists(session);
    assertEquals(session.owner, USER_ALICE);
    assertEquals(session.listId, LIST_GROCERIES);
    assertEquals(session.active, false);
    assertEquals(session.ordering, "Default");
    assertEquals(session.format, "List");
    assertEquals(session.itemCount, 0); // Initially 0 as per implementation note
  });

  await t.step("changeSession: should return an error if an active session already exists", async () => {
    // First, create an active session for USER_ALICE (using addListItem and activateSession in follow-up steps for realism)
    const createResult = await sessionConcept.changeSession({
      list: LIST_WORK,
      sessionOwner: USER_ALICE,
    });
    const newSession = await sessionConcept._getActiveSessionForOwner({ owner: USER_ALICE });
    assertExists(newSession); // This confirms the new session was added.

    await sessionConcept.activateSession({ session: newSession._id, activator: USER_ALICE });
    const activeSession = await sessionConcept._getSession({ session: newSession._id });
    assertEquals(activeSession?.active, true);


    // Now try to create another session for USER_ALICE
    const result = await sessionConcept.changeSession({
      list: LIST_GROCERIES,
      sessionOwner: USER_ALICE,
    });
    assertExists(result.error);
    assertEquals(result.error, "An active session already exists for this owner.");
  });

  // Re-initialize for subsequent tests to ensure clean state
  await t.step("Cleanup for next tests (deactivating previous sessions)", async () => {
    // Ensure USER_ALICE has no active sessions
    const aliceSessions = await db.collection("Session.sessions").find({ owner: USER_ALICE, active: true }).toArray();
    for (const s of aliceSessions) {
      await sessionConcept.endSession({ session: s._id });
    }
    assertNull(await sessionConcept._getActiveSessionForOwner({ owner: USER_ALICE }));

    // Create a fresh session for Alice for the upcoming tests
    const createResult = await sessionConcept.changeSession({
      list: LIST_GROCERIES,
      sessionOwner: USER_ALICE,
    });
    assertEquals(createResult, {});
  });

  let aliceSessionId: ID;

  await t.step("addListItem: should add a task to a session and update item count", async () => {
    const session = await sessionConcept._getActiveSessionForOwner({ owner: USER_ALICE });
    assertExists(session);
    aliceSessionId = session._id;

    // Add first item
    const addResult1 = await sessionConcept.addListItem({
      session: aliceSessionId,
      task: TASK_MILK,
      defaultOrder: 1,
    });
    assertEquals(addResult1, {});

    const updatedSession1 = await sessionConcept._getSession({ session: aliceSessionId });
    assertEquals(updatedSession1?.itemCount, 1);
    const listItems1 = await sessionConcept._getSessionListItems({ session: aliceSessionId });
    assertEquals(listItems1.length, 1);
    assertEquals(listItems1[0].taskId, TASK_MILK);
    assertEquals(listItems1[0].itemStatus, "Incomplete");

    // Add second item
    const addResult2 = await sessionConcept.addListItem({
      session: aliceSessionId,
      task: TASK_BREAD,
      defaultOrder: 2,
    });
    assertEquals(addResult2, {});

    const updatedSession2 = await sessionConcept._getSession({ session: aliceSessionId });
    assertEquals(updatedSession2?.itemCount, 2);
    const listItems2 = await sessionConcept._getSessionListItems({ session: aliceSessionId });
    assertEquals(listItems2.length, 2);
  });

  await t.step("addListItem: should return an error if session not found", async () => {
    const result = await sessionConcept.addListItem({
      session: freshID(), // Non-existent session
      task: TASK_EGGS,
      defaultOrder: 3,
    });
    assertExists(result.error);
    assertEquals(result.error, "Session with ID " + result.error.split(" ")[3] + " not found.");
  });

  await t.step("addListItem: should return an error if task already exists in session", async () => {
    const result = await sessionConcept.addListItem({
      session: aliceSessionId,
      task: TASK_MILK, // Duplicate task
      defaultOrder: 1,
    });
    assertExists(result.error);
    assertEquals(result.error, `Task ${TASK_MILK} already exists in session ${aliceSessionId}.`);
  });

  await t.step("setOrdering: should set the ordering type for an inactive session", async () => {
    const result = await sessionConcept.setOrdering({
      session: aliceSessionId,
      newType: "Random",
      setter: USER_ALICE,
    });
    assertEquals(result, {});

    const session = await sessionConcept._getSession({ session: aliceSessionId });
    assertEquals(session?.ordering, "Random");
  });

  await t.step("setOrdering: should return an error if session is active", async () => {
    await sessionConcept.activateSession({ session: aliceSessionId, activator: USER_ALICE });
    const result = await sessionConcept.setOrdering({
      session: aliceSessionId,
      newType: "Default",
      setter: USER_ALICE,
    });
    assertExists(result.error);
    assertEquals(result.error, "Cannot change ordering while session is active.");

    await sessionConcept.endSession({ session: aliceSessionId }); // Deactivate for subsequent tests
  });

  await t.step("setOrdering: should return an error if setter is not the owner", async () => {
    const result = await sessionConcept.setOrdering({
      session: aliceSessionId,
      newType: "Default",
      setter: USER_BOB, // Not Alice
    });
    assertExists(result.error);
    assertEquals(result.error, "Only the session owner can change ordering.");
  });

  await t.step("setFormat: should set the format type for an inactive session", async () => {
    const result = await sessionConcept.setFormat({
      session: aliceSessionId,
      newFormat: "List",
      setter: USER_ALICE,
    });
    assertEquals(result, {});

    const session = await sessionConcept._getSession({ session: aliceSessionId });
    assertEquals(session?.format, "List"); // Already "List", but confirms it accepts the update
  });

  await t.step("setFormat: should return an error if session is active", async () => {
    await sessionConcept.activateSession({ session: aliceSessionId, activator: USER_ALICE });
    const result = await sessionConcept.setFormat({
      session: aliceSessionId,
      newFormat: "List",
      setter: USER_ALICE,
    });
    assertExists(result.error);
    assertEquals(result.error, "Cannot change format while session is active.");
    await sessionConcept.endSession({ session: aliceSessionId });
  });

  await t.step("setFormat: should return an error if setter is not the owner", async () => {
    const result = await sessionConcept.setFormat({
      session: aliceSessionId,
      newFormat: "List",
      setter: USER_BOB,
    });
    assertExists(result.error);
    assertEquals(result.error, "Only the session owner can change format.");
  });

  await t.step("randomizeOrder: should update randomOrder values when ordering is 'Random'", async () => {
    // Ensure ordering is 'Random' and session is inactive
    await sessionConcept.setOrdering({ session: aliceSessionId, newType: "Random", setter: USER_ALICE });

    // Add another item to ensure more than one for shuffling
    await sessionConcept.addListItem({ session: aliceSessionId, task: TASK_EGGS, defaultOrder: 3 });

    const initialItems = await sessionConcept._getSessionListItems({ session: aliceSessionId });
    const initialRandomOrders = initialItems.map((item) => item.randomOrder);

    const result = await sessionConcept.randomizeOrder({
      session: aliceSessionId,
      randomizer: USER_ALICE,
    });
    assertEquals(result, {});

    const randomizedItems = await sessionConcept._getSessionListItems({ session: aliceSessionId });
    const randomizedOrders = randomizedItems.map((item) => item.randomOrder);

    // Assert that random orders have changed and are distinct
    assertNotEquals(initialRandomOrders, randomizedOrders); // Highly likely to change
    assertEquals(new Set(randomizedOrders).size, randomizedOrders.length); // All unique
  });

  await t.step("randomizeOrder: should return an error if ordering is not 'Random'", async () => {
    await sessionConcept.setOrdering({ session: aliceSessionId, newType: "Default", setter: USER_ALICE }); // Set to Default
    const result = await sessionConcept.randomizeOrder({
      session: aliceSessionId,
      randomizer: USER_ALICE,
    });
    assertExists(result.error);
    assertEquals(result.error, "Ordering must be set to 'Random' to randomize tasks.");
  });

  await t.step("randomizeOrder: should return an error if randomizer is not the owner", async () => {
    await sessionConcept.setOrdering({ session: aliceSessionId, newType: "Random", setter: USER_ALICE }); // Set back to Random
    const result = await sessionConcept.randomizeOrder({
      session: aliceSessionId,
      randomizer: USER_BOB, // Not Alice
    });
    assertExists(result.error);
    assertEquals(result.error, "Only the session owner can randomize order.");
  });

  await t.step("activateSession: should set session to active", async () => {
    const result = await sessionConcept.activateSession({
      session: aliceSessionId,
      activator: USER_ALICE,
    });
    assertEquals(result, {});

    const session = await sessionConcept._getSession({ session: aliceSessionId });
    assertEquals(session?.active, true);
  });

  await t.step("activateSession: should return an error if session is already active", async () => {
    const result = await sessionConcept.activateSession({
      session: aliceSessionId,
      activator: USER_ALICE,
    });
    assertExists(result.error);
    assertEquals(result.error, "Session is already active.");
  });

  await t.step("activateSession: should return an error if activator is not the owner", async () => {
    await sessionConcept.endSession({ session: aliceSessionId }); // Deactivate first
    const result = await sessionConcept.activateSession({
      session: aliceSessionId,
      activator: USER_BOB, // Not Alice
    });
    assertExists(result.error);
    assertEquals(result.error, "Only the session owner can activate the session.");
  });

  await t.step("startTask: should set an incomplete task to 'In Progress'", async () => {
    await sessionConcept.activateSession({ session: aliceSessionId, activator: USER_ALICE }); // Re-activate

    const result = await sessionConcept.startTask({ session: aliceSessionId, task: TASK_MILK });
    assertEquals(result, {});

    const status = await sessionConcept._getTaskStatus({ session: aliceSessionId, task: TASK_MILK });
    assertEquals(status, "In Progress");
  });

  await t.step("startTask: should return an error if task not in session", async () => {
    const result = await sessionConcept.startTask({
      session: aliceSessionId,
      task: TASK_REPORT, // Non-existent task in this session
    });
    assertExists(result.error);
    assertEquals(result.error, `Task ${TASK_REPORT} not found in session ${aliceSessionId}.`);
  });

  await t.step("startTask: should return an error if task is not 'Incomplete'", async () => {
    const result = await sessionConcept.startTask({
      session: aliceSessionId,
      task: TASK_MILK, // Already In Progress
    });
    assertExists(result.error);
    assertEquals(result.error, `Task ${TASK_MILK} is not in 'Incomplete' status.`);
  });

  await t.step("startTask: should return an error if another task is already 'In Progress'", async () => {
    // TASK_MILK is already In Progress
    const result = await sessionConcept.startTask({
      session: aliceSessionId,
      task: TASK_BREAD, // Incomplete, but another is In Progress
    });
    assertExists(result.error);
    assertEquals(result.error, `Another task (${TASK_MILK}) is already 'In Progress'.`);
  });

  await t.step("completeTask: should set an 'In Progress' task to 'Complete'", async () => {
    const result = await sessionConcept.completeTask({ session: aliceSessionId, task: TASK_MILK });
    assertEquals(result, {});

    const status = await sessionConcept._getTaskStatus({ session: aliceSessionId, task: TASK_MILK });
    assertEquals(status, "Complete");
  });

  await t.step("completeTask: should return an error if task not in session", async () => {
    const result = await sessionConcept.completeTask({
      session: aliceSessionId,
      task: TASK_REPORT, // Non-existent task
    });
    assertExists(result.error);
    assertEquals(result.error, `Task ${TASK_REPORT} not found in session ${aliceSessionId}.`);
  });

  await t.step("completeTask: should return an error if task is not 'In Progress'", async () => {
    const result = await sessionConcept.completeTask({
      session: aliceSessionId,
      task: TASK_MILK, // Already Complete
    });
    assertExists(result.error);
    assertEquals(result.error, `Task ${TASK_MILK} is not in 'In Progress' status.`);
  });

  await t.step("endSession: should set an active session to inactive", async () => {
    const result = await sessionConcept.endSession({ session: aliceSessionId });
    assertEquals(result, {});

    const session = await sessionConcept._getSession({ session: aliceSessionId });
    assertEquals(session?.active, false);
  });

  await t.step("endSession: should return an error if session is already inactive", async () => {
    const result = await sessionConcept.endSession({ session: aliceSessionId }); // Already inactive
    assertExists(result.error);
    assertEquals(result.error, "Session is not active.");
  });

  await t.step("removeListItem: should remove a task and decrement item count", async () => {
    const initialItemCount = (await sessionConcept._getSession({ session: aliceSessionId }))?.itemCount;
    assertExists(initialItemCount);

    const result = await sessionConcept.removeListItem({ session: aliceSessionId, task: TASK_EGGS });
    assertEquals(result, {});

    const updatedSession = await sessionConcept._getSession({ session: aliceSessionId });
    assertEquals(updatedSession?.itemCount, initialItemCount - 1);
    const listItem = await sessionConcept.listItems.findOne({
      sessionId: aliceSessionId,
      taskId: TASK_EGGS,
    });
    assertNull(listItem);
  });

  await t.step("removeListItem: should return an error if session not found", async () => {
    const result = await sessionConcept.removeListItem({
      session: freshID(),
      task: TASK_MILK,
    });
    assertExists(result.error);
    assertEquals(result.error, "Session with ID " + result.error.split(" ")[3] + " not found.");
  });

  await t.step("removeListItem: should return an error if task not found in session", async () => {
    const result = await sessionConcept.removeListItem({
      session: aliceSessionId,
      task: TASK_REPORT, // Non-existent
    });
    assertExists(result.error);
    assertEquals(result.error, `Task ${TASK_REPORT} not found in session ${aliceSessionId}.`);
  });

  await t.step("removeListItem: should return an error if task is 'In Progress'", async () => {
    await sessionConcept.activateSession({ session: aliceSessionId, activator: USER_ALICE });
    await sessionConcept.startTask({ session: aliceSessionId, task: TASK_BREAD }); // Set bread to In Progress

    const result = await sessionConcept.removeListItem({ session: aliceSessionId, task: TASK_BREAD });
    assertExists(result.error);
    assertEquals(result.error, `Cannot remove task ${TASK_BREAD} as it is currently 'In Progress'.`);

    // Clean up
    await sessionConcept.completeTask({ session: aliceSessionId, task: TASK_BREAD });
    await sessionConcept.endSession({ session: aliceSessionId });
  });

  await t.step("Principle Trace: a user will activate a list to start a session and be given an ordered list of tasks on the list to complete", async () => {
    // 1. User Alice creates a new Session for a list
    const newSessionId = freshID();
    const createResult = await sessionConcept.changeSession({
      list: LIST_WORK,
      sessionOwner: USER_ALICE,
    });
    assertEquals(createResult, {});
    let aliceNewSession = await sessionConcept._getActiveSessionForOwner({ owner: USER_ALICE });
    assertExists(aliceNewSession);
    await sessionConcept.endSession({ session: aliceNewSession._id }); // Deactivate any previously existing session for Alice
    
    const secondCreateResult = await sessionConcept.changeSession({
      list: LIST_WORK,
      sessionOwner: USER_ALICE,
    });
    assertEquals(secondCreateResult, {}); // Should succeed as previous was deactivated
    aliceNewSession = await sessionConcept._getActiveSessionForOwner({ owner: USER_ALICE });
    assertExists(aliceNewSession);
    aliceSessionId = aliceNewSession._id;

    // 2. Add some tasks to the session (simulating "given an ordered list")
    await sessionConcept.addListItem({ session: aliceSessionId, task: TASK_REPORT, defaultOrder: 1 });
    await sessionConcept.addListItem({ session: aliceSessionId, task: TASK_BREAD, defaultOrder: 2 });
    await sessionConcept.addListItem({ session: aliceSessionId, task: TASK_MILK, defaultOrder: 3 });

    let items = await sessionConcept._getSessionListItems({ session: aliceSessionId });
    assertEquals(items.length, 3);
    assertEquals(items.map(i => i.taskId), [TASK_REPORT, TASK_BREAD, TASK_MILK]);
    assertEquals(items.every(i => i.itemStatus === "Incomplete"), true);

    // 3. Alice activates the session
    const activateResult = await sessionConcept.activateSession({
      session: aliceSessionId,
      activator: USER_ALICE,
    });
    assertEquals(activateResult, {});
    let session = await sessionConcept._getSession({ session: aliceSessionId });
    assertEquals(session?.active, true);

    // 4. Alice starts and completes Task_REPORT
    await sessionConcept.startTask({ session: aliceSessionId, task: TASK_REPORT });
    assertEquals(await sessionConcept._getTaskStatus({ session: aliceSessionId, task: TASK_REPORT }), "In Progress");

    await sessionConcept.completeTask({ session: aliceSessionId, task: TASK_REPORT });
    assertEquals(await sessionConcept._getTaskStatus({ session: aliceSessionId, task: TASK_REPORT }), "Complete");

    // 5. Alice starts and completes Task_BREAD
    await sessionConcept.startTask({ session: aliceSessionId, task: TASK_BREAD });
    assertEquals(await sessionConcept._getTaskStatus({ session: aliceSessionId, task: TASK_BREAD }), "In Progress");

    await sessionConcept.completeTask({ session: aliceSessionId, task: TASK_BREAD });
    assertEquals(await sessionConcept._getTaskStatus({ session: aliceSessionId, task: TASK_BREAD }), "Complete");

    // 6. Alice ends the session
    const endResult = await sessionConcept.endSession({ session: aliceSessionId });
    assertEquals(endResult, {});
    session = await sessionConcept._getSession({ session: aliceSessionId });
    assertEquals(session?.active, false);

    // Verify final state: all started tasks are complete, session is inactive
    items = await sessionConcept._getSessionListItems({ session: aliceSessionId });
    assertEquals(items.find(i => i.taskId === TASK_REPORT)?.itemStatus, "Complete");
    assertEquals(items.find(i => i.taskId === TASK_BREAD)?.itemStatus, "Complete");
    assertEquals(items.find(i => i.taskId === TASK_MILK)?.itemStatus, "Incomplete"); // Milk was not started/completed

    // Also test random ordering within the principle flow
    await sessionConcept.setOrdering({ session: aliceSessionId, newType: "Random", setter: USER_ALICE });
    await sessionConcept.randomizeOrder({ session: aliceSessionId, randomizer: USER_ALICE });
    const randomizedItems = await sessionConcept._getSessionListItems({ session: aliceSessionId });
    // Check that randomOrder values are now different from defaultOrder and unique
    assertEquals(randomizedItems.length, 3);
    assertEquals(new Set(randomizedItems.map(i => i.randomOrder)).size, 3);
    assertNotEquals(randomizedItems.map(i => i.defaultOrder), randomizedItems.map(i => i.randomOrder));
  });

  await client.close();
});
```
```trace
### Principle Trace for Session Concept

This trace demonstrates how the `Session` concept fulfills its principle: "a user will 'activate' a list to start a session and be given an ordered list (either default ordering or generated) of tasks on the list to complete."

**Assumptions:**
*   User `Alice` (`USER_ALICE`) exists.
*   A `List` identified by `LIST_WORK` exists (though its contents are not managed by `Session` concept directly, `addListItem` is used to simulate its tasks).
*   Tasks `TASK_REPORT`, `TASK_BREAD`, `TASK_MILK` exist.

**Initial State:**
*   No active sessions for `USER_ALICE`.
*   MongoDB collections `Session.sessions` and `Session.listItems` are empty.

---

**Step 1: Alice creates a new session for the `LIST_WORK`.**

*   **Action:** `Session.changeSession(list: LIST_WORK, sessionOwner: USER_ALICE)`
*   **Requires check:** No active session for `USER_ALICE`. (Passes)
*   **Effects:**
    *   A new `SessionDoc` is created in `Session.sessions` with:
        *   `_id`: a new `aliceSessionId`
        *   `owner`: `USER_ALICE`
        *   `listId`: `LIST_WORK`
        *   `active`: `false`
        *   `ordering`: `"Default"`
        *   `format`: `"List"`
        *   `itemCount`: `0`
*   **Verification (via queries):**
    *   `Session._getSession({ session: aliceSessionId })` returns the new session, confirming `active` is `false`, `ordering` is `Default`, and `itemCount` is `0`.

---

**Step 2: Alice adds tasks to the newly created session.** (Simulating "given an ordered list of tasks")

*   **Action 1:** `Session.addListItem(session: aliceSessionId, task: TASK_REPORT, defaultOrder: 1)`
    *   **Requires check:** `aliceSessionId` exists, `TASK_REPORT` not already in session. (Passes)
    *   **Effects:**
        *   A new `ListItemDoc` is created in `Session.listItems` linked to `aliceSessionId`, `TASK_REPORT`, `defaultOrder=1`, `randomOrder=-1`, `itemStatus="Incomplete"`.
        *   `SessionDoc` for `aliceSessionId` has `itemCount` incremented to `1`.
*   **Action 2:** `Session.addListItem(session: aliceSessionId, task: TASK_BREAD, defaultOrder: 2)`
    *   **Requires check:** (Passes)
    *   **Effects:**
        *   New `ListItemDoc` for `TASK_BREAD` added.
        *   `SessionDoc` for `aliceSessionId` has `itemCount` incremented to `2`.
*   **Action 3:** `Session.addListItem(session: aliceSessionId, task: TASK_MILK, defaultOrder: 3)`
    *   **Requires check:** (Passes)
    *   **Effects:**
        *   New `ListItemDoc` for `TASK_MILK` added.
        *   `SessionDoc` for `aliceSessionId` has `itemCount` incremented to `3`.
*   **Verification (via queries):**
    *   `Session._getSession({ session: aliceSessionId })` confirms `itemCount` is `3`.
    *   `Session._getSessionListItems({ session: aliceSessionId })` returns 3 items, in `defaultOrder` (TASK_REPORT, TASK_BREAD, TASK_MILK), all `Incomplete`.

---

**Step 3: Alice activates the session.**

*   **Action:** `Session.activateSession(session: aliceSessionId, activator: USER_ALICE)`
*   **Requires check:** `aliceSessionId` is `active: false`, `activator === owner`. (Passes)
*   **Effects:**
    *   `SessionDoc` for `aliceSessionId` has `active` set to `true`.
*   **Verification (via queries):**
    *   `Session._getSession({ session: aliceSessionId })` confirms `active` is `true`.

---

**Step 4: Alice starts and completes `TASK_REPORT`.**

*   **Action 1:** `Session.startTask(session: aliceSessionId, task: TASK_REPORT)`
*   **Requires check:** `TASK_REPORT` is `Incomplete`, no other task `In Progress`. (Passes)
*   **Effects:**
    *   `ListItemDoc` for `TASK_REPORT` has `itemStatus` set to `"In Progress"`.
*   **Verification (via queries):**
    *   `Session._getTaskStatus({ session: aliceSessionId, task: TASK_REPORT })` returns `"In Progress"`.

*   **Action 2:** `Session.completeTask(session: aliceSessionId, task: TASK_REPORT)`
*   **Requires check:** `TASK_REPORT` is `In Progress`. (Passes)
*   **Effects:**
    *   `ListItemDoc` for `TASK_REPORT` has `itemStatus` set to `"Complete"`.
*   **Verification (via queries):**
    *   `Session._getTaskStatus({ session: aliceSessionId, task: TASK_REPORT })` returns `"Complete"`.

---

**Step 5: Alice starts and completes `TASK_BREAD`.**

*   **Action 1:** `Session.startTask(session: aliceSessionId, task: TASK_BREAD)`
*   **Requires check:** `TASK_BREAD` is `Incomplete`, no other task `In Progress`. (Passes, as `TASK_REPORT` is now `Complete`)
*   **Effects:**
    *   `ListItemDoc` for `TASK_BREAD` has `itemStatus` set to `"In Progress"`.
*   **Verification (via queries):**
    *   `Session._getTaskStatus({ session: aliceSessionId, task: TASK_BREAD })` returns `"In Progress"`.

*   **Action 2:** `Session.completeTask(session: aliceSessionId, task: TASK_BREAD)`
*   **Requires check:** `TASK_BREAD` is `In Progress`. (Passes)
*   **Effects:**
    *   `ListItemDoc` for `TASK_BREAD` has `itemStatus` set to `"Complete"`.
*   **Verification (via queries):**
    *   `Session._getTaskStatus({ session: aliceSessionId, task: TASK_BREAD })` returns `"Complete"`.

---

**Step 6: Alice ends the session.**

*   **Action:** `Session.endSession(session: aliceSessionId)`
*   **Requires check:** `aliceSessionId` is `active: true`. (Passes)
*   **Effects:**
    *   `SessionDoc` for `aliceSessionId` has `active` set to `false`.
*   **Verification (via queries):**
    *   `Session._getSession({ session: aliceSessionId })` confirms `active` is `false`.

---

**Final State Verification:**
*   The session `aliceSessionId` for `USER_ALICE` is now inactive.
*   `TASK_REPORT` and `TASK_BREAD` within this session are marked as `Complete`.
*   `TASK_MILK` remains `Incomplete` (as it was never started/completed).
*   The "ordered list" was presented and tasks progressed through statuses as expected, demonstrating the focused task completion purpose.
```