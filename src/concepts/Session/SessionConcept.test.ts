import { Collection, Db } from "npm:mongodb";
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
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

  await t.step(
    "changeSession: should create a new session for an owner",
    async () => {
      const result = await sessionConcept.changeSession({
        list: LIST_GROCERIES,
        sessionOwner: USER_ALICE,
      });
      // changeSession now returns the created session id object for callers.
      // The shape is { session: <id> } — ensure the session id was returned.
      assertExists((result as { session?: ID }).session);

      const session = await sessionConcept._getSessionForOwner({
        owner: USER_ALICE,
      });
      assertExists(session);
      assertEquals(session.owner, USER_ALICE);
      assertEquals(session.listId, LIST_GROCERIES);
      assertEquals(session.active, false);
      assertEquals(session.ordering, "Default");
      assertEquals(session.format, "List");
      assertEquals(session.itemCount, 0); // Initially 0 as per implementation note
    },
  );

  await t.step(
    "changeSession: should return an error if an active session already exists",
    async () => {
      // First, create an active session for USER_ALICE (using addListItem and activateSession in follow-up steps for realism)
      const createResult = await sessionConcept.changeSession({
        list: LIST_WORK,
        sessionOwner: USER_ALICE,
      });
      const newSession = await sessionConcept._getSessionForOwner({
        owner: USER_ALICE,
      });
      assertExists(newSession); // This confirms the new session was added.

      await sessionConcept.activateSession({
        session: newSession._id,
        activator: USER_ALICE,
      });
      const activeSession = await sessionConcept._getSession({
        session: newSession._id,
      });
      assertEquals(activeSession?.active, true);

      // Now try to create another session for USER_ALICE
      const result = await sessionConcept.changeSession({
        list: LIST_GROCERIES,
        sessionOwner: USER_ALICE,
      });
      const err = (result as { error?: string }).error;
      assertExists(err);
      assertEquals(
        err,
        "An active session already exists for this owner.",
      );
    },
  );

  // Re-initialize for subsequent tests to ensure clean state
  await t.step(
    "Cleanup for next tests (deactivating previous sessions)",
    async () => {
      // Ensure USER_ALICE has no active sessions
      const aliceSessions = await db.collection("Session.sessions").find({
        owner: USER_ALICE,
        active: true,
      }).toArray();
      for (const s of aliceSessions) {
        await sessionConcept.endSession({ session: s._id.toString() as ID });
      }
      assertEquals(
        await sessionConcept._getActiveSessionForOwner({ owner: USER_ALICE }),
        null,
      );

      // Create a fresh session for Alice for the upcoming tests
      const _createResult = await sessionConcept.changeSession({
        list: LIST_GROCERIES,
        sessionOwner: USER_ALICE,
      });
      assertExists((_createResult as { session?: ID }).session);
    },
  );

  let aliceSessionId: ID;

  await t.step(
    "addListItem: should add a task to a session and update item count",
    async () => {
      const session = await sessionConcept._getSessionForOwner({
        owner: USER_ALICE,
      });
      assertExists(session);
      aliceSessionId = session._id;

      // Add first item
      const addResult1 = await sessionConcept.addListItem({
        session: aliceSessionId,
        task: TASK_MILK,
        defaultOrder: 1,
      });
      assertEquals(addResult1, {});

      const updatedSession1 = await sessionConcept._getSession({
        session: aliceSessionId,
      });
      assertEquals(updatedSession1?.itemCount, 1);
      const listItems1 = await sessionConcept._getSessionListItems({
        session: aliceSessionId,
      });
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

      const updatedSession2 = await sessionConcept._getSession({
        session: aliceSessionId,
      });
      assertEquals(updatedSession2?.itemCount, 2);
      const listItems2 = await sessionConcept._getSessionListItems({
        session: aliceSessionId,
      });
      assertEquals(listItems2.length, 2);
    },
  );

  await t.step(
    "addListItem: should return an error if session not found",
    async () => {
      const result = await sessionConcept.addListItem({
        session: freshID(), // Non-existent session
        task: TASK_EGGS,
        defaultOrder: 3,
      });
      assertExists(result.error);
      assertEquals(
        result.error,
        "Session with ID " + result.error.split(" ")[3] + " not found.",
      );
    },
  );

  await t.step(
    "addListItem: should return an error if task already exists in session",
    async () => {
      const result = await sessionConcept.addListItem({
        session: aliceSessionId,
        task: TASK_MILK, // Duplicate task
        defaultOrder: 1,
      });
      assertExists(result.error);
      assertEquals(
        result.error,
        `Task ${TASK_MILK} already exists in session ${aliceSessionId}.`,
      );
    },
  );

  await t.step(
    "setOrdering: should set the ordering type for an inactive session",
    async () => {
      const result = await sessionConcept.setOrdering({
        session: aliceSessionId,
        newType: "Random",
        setter: USER_ALICE,
      });
      assertEquals(result, {});

      const session = await sessionConcept._getSession({
        session: aliceSessionId,
      });
      assertEquals(session?.ordering, "Random");
    },
  );

  await t.step(
    "setOrdering: should return an error if session is active",
    async () => {
      await sessionConcept.activateSession({
        session: aliceSessionId,
        activator: USER_ALICE,
      });
      const result = await sessionConcept.setOrdering({
        session: aliceSessionId,
        newType: "Default",
        setter: USER_ALICE,
      });
      assertExists(result.error);
      assertEquals(
        result.error,
        "Cannot change ordering while session is active.",
      );

      await sessionConcept.endSession({ session: aliceSessionId }); // Deactivate for subsequent tests
    },
  );

  await t.step(
    "setOrdering: should return an error if setter is not the owner",
    async () => {
      const result = await sessionConcept.setOrdering({
        session: aliceSessionId,
        newType: "Default",
        setter: USER_BOB, // Not Alice
      });
      assertExists(result.error);
      assertEquals(result.error, "Only the session owner can change ordering.");
    },
  );

  await t.step(
    "setFormat: should set the format type for an inactive session",
    async () => {
      const result = await sessionConcept.setFormat({
        session: aliceSessionId,
        newFormat: "List",
        setter: USER_ALICE,
      });
      assertEquals(result, {});

      const session = await sessionConcept._getSession({
        session: aliceSessionId,
      });
      assertEquals(session?.format, "List"); // Already "List", but confirms it accepts the update
    },
  );

  await t.step(
    "setFormat: should return an error if session is active",
    async () => {
      await sessionConcept.activateSession({
        session: aliceSessionId,
        activator: USER_ALICE,
      });
      const result = await sessionConcept.setFormat({
        session: aliceSessionId,
        newFormat: "List",
        setter: USER_ALICE,
      });
      assertExists(result.error);
      assertEquals(
        result.error,
        "Cannot change format while session is active.",
      );
      await sessionConcept.endSession({ session: aliceSessionId });
    },
  );

  await t.step(
    "setFormat: should return an error if setter is not the owner",
    async () => {
      const result = await sessionConcept.setFormat({
        session: aliceSessionId,
        newFormat: "List",
        setter: USER_BOB,
      });
      assertExists(result.error);
      assertEquals(result.error, "Only the session owner can change format.");
    },
  );

  await t.step(
    "randomizeOrder: should update randomOrder values when ordering is 'Random'",
    async () => {
      // Ensure ordering is 'Random' and session is inactive
      await sessionConcept.setOrdering({
        session: aliceSessionId,
        newType: "Random",
        setter: USER_ALICE,
      });

      // Add another item to ensure more than one for shuffling
      await sessionConcept.addListItem({
        session: aliceSessionId,
        task: TASK_EGGS,
        defaultOrder: 3,
      });

      const initialItems = await sessionConcept._getSessionListItems({
        session: aliceSessionId,
      });
      const initialRandomOrders = initialItems.map((item) => item.randomOrder);

      const result = await sessionConcept.randomizeOrder({
        session: aliceSessionId,
        randomizer: USER_ALICE,
      });
      assertEquals(result, {});

      const randomizedItems = await sessionConcept._getSessionListItems({
        session: aliceSessionId,
      });
      const randomizedOrders = randomizedItems.map((item) => item.randomOrder);

      // Assert that random orders have changed and are distinct
      assertNotEquals(initialRandomOrders, randomizedOrders); // Highly likely to change
      assertEquals(new Set(randomizedOrders).size, randomizedOrders.length); // All unique
    },
  );

  await t.step(
    "randomizeOrder: should return an error if ordering is not 'Random'",
    async () => {
      await sessionConcept.setOrdering({
        session: aliceSessionId,
        newType: "Default",
        setter: USER_ALICE,
      }); // Set to Default
      const result = await sessionConcept.randomizeOrder({
        session: aliceSessionId,
        randomizer: USER_ALICE,
      });
      assertExists(result.error);
      assertEquals(
        result.error,
        "Ordering must be set to 'Random' to randomize tasks.",
      );
    },
  );

  await t.step(
    "randomizeOrder: should return an error if randomizer is not the owner",
    async () => {
      await sessionConcept.setOrdering({
        session: aliceSessionId,
        newType: "Random",
        setter: USER_ALICE,
      }); // Set back to Random
      const result = await sessionConcept.randomizeOrder({
        session: aliceSessionId,
        randomizer: USER_BOB, // Not Alice
      });
      assertExists(result.error);
      assertEquals(result.error, "Only the session owner can randomize order.");
    },
  );

  await t.step("activateSession: should set session to active", async () => {
    const result = await sessionConcept.activateSession({
      session: aliceSessionId,
      activator: USER_ALICE,
    });
    assertEquals(result, {});

    const session = await sessionConcept._getSession({
      session: aliceSessionId,
    });
    assertEquals(session?.active, true);
  });

  await t.step(
    "activateSession: should return an error if session is already active",
    async () => {
      const result = await sessionConcept.activateSession({
        session: aliceSessionId,
        activator: USER_ALICE,
      });
      assertExists(result.error);
      assertEquals(result.error, "Session is already active.");
    },
  );

  await t.step(
    "activateSession: should return an error if activator is not the owner",
    async () => {
      await sessionConcept.endSession({ session: aliceSessionId }); // Deactivate first
      const result = await sessionConcept.activateSession({
        session: aliceSessionId,
        activator: USER_BOB, // Not Alice
      });
      assertExists(result.error);
      assertEquals(
        result.error,
        "Only the session owner can activate the session.",
      );
    },
  );

  await t.step(
    "startTask: should set an incomplete task to 'In Progress'",
    async () => {
      await sessionConcept.activateSession({
        session: aliceSessionId,
        activator: USER_ALICE,
      }); // Re-activate

      const result = await sessionConcept.startTask({
        session: aliceSessionId,
        task: TASK_MILK,
      });
      assertEquals(result, {});

      const status = await sessionConcept._getTaskStatus({
        session: aliceSessionId,
        task: TASK_MILK,
      });
      assertEquals(status, "In Progress");
    },
  );

  await t.step(
    "startTask: should return an error if task not in session",
    async () => {
      const result = await sessionConcept.startTask({
        session: aliceSessionId,
        task: TASK_REPORT, // Non-existent task in this session
      });
      assertExists(result.error);
      assertEquals(
        result.error,
        `Task ${TASK_REPORT} not found in session ${aliceSessionId}.`,
      );
    },
  );

  await t.step(
    "startTask: should return an error if task is not 'Incomplete'",
    async () => {
      const result = await sessionConcept.startTask({
        session: aliceSessionId,
        task: TASK_MILK, // Already In Progress
      });
      assertExists(result.error);
      assertEquals(
        result.error,
        `Task ${TASK_MILK} is not in 'Incomplete' status.`,
      );
    },
  );

  await t.step(
    "startTask: should return an error if another task is already 'In Progress'",
    async () => {
      // TASK_MILK is already In Progress
      const result = await sessionConcept.startTask({
        session: aliceSessionId,
        task: TASK_BREAD, // Incomplete, but another is In Progress
      });
      assertExists(result.error);
      assertEquals(
        result.error,
        `Another task (${TASK_MILK}) is already 'In Progress'.`,
      );
    },
  );

  await t.step(
    "completeTask: should set an 'In Progress' task to 'Complete'",
    async () => {
      const result = await sessionConcept.completeTask({
        session: aliceSessionId,
        task: TASK_MILK,
      });
      assertEquals(result, {});

      const status = await sessionConcept._getTaskStatus({
        session: aliceSessionId,
        task: TASK_MILK,
      });
      assertEquals(status, "Complete");
    },
  );

  await t.step(
    "completeTask: should return an error if task not in session",
    async () => {
      const result = await sessionConcept.completeTask({
        session: aliceSessionId,
        task: TASK_REPORT, // Non-existent task
      });
      assertExists(result.error);
      assertEquals(
        result.error,
        `Task ${TASK_REPORT} not found in session ${aliceSessionId}.`,
      );
    },
  );

  await t.step(
    "completeTask: should return an error if task is not 'In Progress'",
    async () => {
      const result = await sessionConcept.completeTask({
        session: aliceSessionId,
        task: TASK_MILK, // Already Complete
      });
      assertExists(result.error);
      assertEquals(
        result.error,
        `Task ${TASK_MILK} is not in 'In Progress' status.`,
      );
    },
  );

  await t.step(
    "endSession: should set an active session to inactive",
    async () => {
      const result = await sessionConcept.endSession({
        session: aliceSessionId,
      });
      assertEquals(result, {});

      const session = await sessionConcept._getSession({
        session: aliceSessionId,
      });
      assertEquals(session?.active, false);
    },
  );

  await t.step(
    "endSession: should return an error if session is already inactive",
    async () => {
      const result = await sessionConcept.endSession({
        session: aliceSessionId,
      }); // Already inactive
      assertExists(result.error);
      assertEquals(result.error, "Session is not active.");
    },
  );

  await t.step(
    "removeListItem: should remove a task and decrement item count",
    async () => {
      const initialItemCount =
        (await sessionConcept._getSession({ session: aliceSessionId }))
          ?.itemCount;
      assertExists(initialItemCount);

      const result = await sessionConcept.removeListItem({
        session: aliceSessionId,
        task: TASK_EGGS,
      });
      assertEquals(result, {});

      const updatedSession = await sessionConcept._getSession({
        session: aliceSessionId,
      });
      assertEquals(updatedSession?.itemCount, initialItemCount - 1);
      const listItem = await sessionConcept.findListItem(
        aliceSessionId,
        TASK_EGGS,
      );
      assertEquals(listItem, null);
    },
  );

  await t.step(
    "removeListItem: should return an error if session not found",
    async () => {
      const result = await sessionConcept.removeListItem({
        session: freshID(),
        task: TASK_MILK,
      });
      assertExists(result.error);
      assertEquals(
        result.error,
        "Session with ID " + result.error.split(" ")[3] + " not found.",
      );
    },
  );

  await t.step(
    "removeListItem: should return an error if task not found in session",
    async () => {
      const result = await sessionConcept.removeListItem({
        session: aliceSessionId,
        task: TASK_REPORT, // Non-existent
      });
      assertExists(result.error);
      assertEquals(
        result.error,
        `Task ${TASK_REPORT} not found in session ${aliceSessionId}.`,
      );
    },
  );

  await t.step(
    "removeListItem: should return an error if task is 'In Progress'",
    async () => {
      await sessionConcept.activateSession({
        session: aliceSessionId,
        activator: USER_ALICE,
      });
      await sessionConcept.startTask({
        session: aliceSessionId,
        task: TASK_BREAD,
      }); // Set bread to In Progress

      const result = await sessionConcept.removeListItem({
        session: aliceSessionId,
        task: TASK_BREAD,
      });
      assertExists(result.error);
      assertEquals(
        result.error,
        `Cannot remove task ${TASK_BREAD} as it is currently 'In Progress'.`,
      );

      // Clean up
      await sessionConcept.completeTask({
        session: aliceSessionId,
        task: TASK_BREAD,
      });
      await sessionConcept.endSession({ session: aliceSessionId });
    },
  );

  await t.step(
    "Principle Trace: a user will activate a list to start a session and be given an ordered list of tasks on the list to complete",
    async () => {
      // 1. User Alice creates a new Session for a list
      const _newSessionId = freshID();
      const createResult = await sessionConcept.changeSession({
        list: LIST_WORK,
        sessionOwner: USER_ALICE,
      });
      assertExists((createResult as { session?: ID }).session);
      let aliceNewSession = await sessionConcept._getSessionForOwner({
        owner: USER_ALICE,
      });
      assertExists(aliceNewSession);
      await sessionConcept.endSession({ session: aliceNewSession._id }); // Deactivate any previously existing session for Alice

      const secondCreateResult = await sessionConcept.changeSession({
        list: LIST_WORK,
        sessionOwner: USER_ALICE,
      });
      assertExists((secondCreateResult as { session?: ID }).session); // Should succeed as previous was deactivated
      aliceNewSession = await sessionConcept._getSessionForOwner({
        owner: USER_ALICE,
      });
      assertExists(aliceNewSession);
      aliceSessionId = aliceNewSession._id;
      // console.log("Passing in: ", aliceSessionId.toString()); // 2. Add some tasks to the session (simulating "given an ordered list")
      await sessionConcept.addListItem({
        session: aliceSessionId,
        task: TASK_REPORT,
        defaultOrder: 1,
      });
      await sessionConcept.addListItem({
        session: aliceSessionId,
        task: TASK_BREAD,
        defaultOrder: 2,
      });
      await sessionConcept.addListItem({
        session: aliceSessionId,
        task: TASK_MILK,
        defaultOrder: 3,
      });

      let items = await sessionConcept._getSessionListItems({
        session: aliceSessionId,
      });
      // // console.log(items.map((item) => ({
      //   taskId: item.taskId,
      //   defaultOrder: item.defaultOrder,
      //   randomOrder: item.randomOrder,
      // })));

      assertEquals(items.length, 3);
      // console.log("checking something");
      assertEquals(items.map((i) => i.taskId), [
        TASK_REPORT,
        TASK_BREAD,
        TASK_MILK,
      ]);
      assertEquals(items.every((i) => i.itemStatus === "Incomplete"), true);

      // 3. Alice activates the session
      const activateResult = await sessionConcept.activateSession({
        session: aliceSessionId,
        activator: USER_ALICE,
      });
      assertEquals(activateResult, {});
      let session = await sessionConcept._getSession({
        session: aliceSessionId,
      });
      assertEquals(session?.active, true);

      // 4. Alice starts and completes Task_REPORT
      await sessionConcept.startTask({
        session: aliceSessionId,
        task: TASK_REPORT,
      });
      assertEquals(
        await sessionConcept._getTaskStatus({
          session: aliceSessionId,
          task: TASK_REPORT,
        }),
        "In Progress",
      );

      await sessionConcept.completeTask({
        session: aliceSessionId,
        task: TASK_REPORT,
      });
      assertEquals(
        await sessionConcept._getTaskStatus({
          session: aliceSessionId,
          task: TASK_REPORT,
        }),
        "Complete",
      );

      // 5. Alice starts and completes Task_BREAD
      await sessionConcept.startTask({
        session: aliceSessionId,
        task: TASK_BREAD,
      });
      assertEquals(
        await sessionConcept._getTaskStatus({
          session: aliceSessionId,
          task: TASK_BREAD,
        }),
        "In Progress",
      );

      await sessionConcept.completeTask({
        session: aliceSessionId,
        task: TASK_BREAD,
      });
      assertEquals(
        await sessionConcept._getTaskStatus({
          session: aliceSessionId,
          task: TASK_BREAD,
        }),
        "Complete",
      );

      // 6. Alice ends the session
      const endResult = await sessionConcept.endSession({
        session: aliceSessionId,
      });
      assertEquals(endResult, {});
      session = await sessionConcept._getSession({ session: aliceSessionId });
      assertEquals(session?.active, false);

      // Verify final state: all started tasks are complete, session is inactive
      items = await sessionConcept._getSessionListItems({
        session: aliceSessionId,
      });
      assertEquals(
        items.find((i) => i.taskId === TASK_REPORT)?.itemStatus,
        "Complete",
      );
      assertEquals(
        items.find((i) => i.taskId === TASK_BREAD)?.itemStatus,
        "Complete",
      );
      assertEquals(
        items.find((i) => i.taskId === TASK_MILK)?.itemStatus,
        "Incomplete",
      ); // Milk was not started/completed

      // Also test random ordering within the principle flow
      await sessionConcept.setOrdering({
        session: aliceSessionId,
        newType: "Random",
        setter: USER_ALICE,
      });
      await sessionConcept.randomizeOrder({
        session: aliceSessionId,
        randomizer: USER_ALICE,
      });
      const randomizedItems = await sessionConcept._getSessionListItems({
        session: aliceSessionId,
      });
      // Check that randomOrder values are now different from defaultOrder and unique
      assertEquals(randomizedItems.length, 3);
      assertEquals(new Set(randomizedItems.map((i) => i.randomOrder)).size, 3);
      assertNotEquals(
        randomizedItems.map((i) => i.defaultOrder),
        randomizedItems.map((i) => i.randomOrder),
      );
    },
  );

  await client.close();
});
