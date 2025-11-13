# Background

Below is background on creating, implementing, and testing concepts

[@concept-format](../../background/concept-design-brief.md)

[@concept-overview](../../background/concept-design-overview.md)

[@implementation](../../background/implementing-concepts.md)

[@testing-concepts](../../background/testing-concepts.md)

# Concept implementation

Below is an implementation for an Sessioning concept


[@sessioning-implementation](../../../src/concepts/Sessioning/SessioningConcept.ts)


# test: Sessioning

# response:

```typescript
// file: src/concepts/Sessioning/SessioningConcept.test.ts

import { assertEquals } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import SessioningConcept from "./SessioningConcept.ts";

Deno.test("SessioningConcept", async (t) => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  const testUserA = freshID() as User;
  const testUserB = freshID() as User;
  const nonExistentSession = freshID() as Session;

  // Generic types for the concept
  type User = ID;
  type Session = ID;

  await t.step("create (user: User): (session: Session)", async () => {
    console.log("\n--- Testing create action ---");
    console.log(`Input: user=${testUserA}`);

    /**
     * **requires**: true.
     * **effects**: creates a new Session `s`; associates it with the given `user`; returns `s` as `session`.
     */
    const createResult = await sessioning.create({ user: testUserA });
    console.log("Output of create:", createResult);

    assertEquals(typeof createResult.session, "string", "Should return a session ID string.");
    const createdSessionId = createResult.session;

    // Verify effects using _getUser query
    const getUserResult = await sessioning._getUser({ session: createdSessionId });
    console.log("Output of _getUser after create:", getUserResult);
    assertEquals(getUserResult, [{ user: testUserA }], "The created session should be linked to testUserA.");

    console.log("Requirement (true) satisfied. Effects confirmed: session created and linked to user.");
  });

  let sessionToDelete: Session;

  await t.step("delete (session: Session): () - Success case", async () => {
    console.log("\n--- Testing delete action (success) ---");
    // First, create a session to delete
    const createResult = await sessioning.create({ user: testUserB });
    sessionToDelete = createResult.session;
    console.log(`Created session for deletion: ${sessionToDelete} for user ${testUserB}`);
    console.log(`Input: session=${sessionToDelete}`);

    /**
     * **requires**: the given `session` exists.
     * **effects**: removes the session `s`.
     */
    const deleteResult = await sessioning.delete({ session: sessionToDelete });
    console.log("Output of delete:", deleteResult);
    assertEquals(deleteResult, {}, "Should return an empty object on successful deletion.");

    // Verify effects: the session should no longer exist
    const getUserResult = await sessioning._getUser({ session: sessionToDelete });
    console.log("Output of _getUser after delete:", getUserResult);
    assertEquals(
      getUserResult,
      [{ error: `Session with id ${sessionToDelete} not found` }],
      "The session should no longer be found after deletion.",
    );

    console.log("Requirement (session exists) satisfied. Effects confirmed: session removed.");
  });

  await t.step("delete (session: Session): () - Failure case (session not found)", async () => {
    console.log("\n--- Testing delete action (failure: session not found) ---");
    console.log(`Input: session=${nonExistentSession}`);

    /**
     * **requires**: the given `session` exists.
     * (This test intentionally violates the requirement)
     * **effects**: (should not occur, error returned)
     */
    const deleteResult = await sessioning.delete({ session: nonExistentSession });
    console.log("Output of delete:", deleteResult);
    assertEquals(
      deleteResult,
      { error: `Session with id ${nonExistentSession} not found` },
      "Should return an error for a non-existent session.",
    );

    console.log("Requirement (session exists) not satisfied. Error returned as expected.");
  });

  let createdSessionForQuery: Session;
  const queryUser = freshID() as User;

  await t.step("_getUser (session: Session): (user: User) - Success case", async () => {
    console.log("\n--- Testing _getUser query (success) ---");
    // First, create a session for the query
    const createResult = await sessioning.create({ user: queryUser });
    createdSessionForQuery = createResult.session;
    console.log(`Created session for query: ${createdSessionForQuery} for user ${queryUser}`);
    console.log(`Input: session=${createdSessionForQuery}`);

    /**
     * **requires**: the given `session` exists.
     * **effects**: returns the user associated with the session.
     */
    const getUserResult = await sessioning._getUser({ session: createdSessionForQuery });
    console.log("Output of _getUser:", getUserResult);
    assertEquals(getUserResult, [{ user: queryUser }], "Should return the correct user for an existing session.");

    console.log("Requirement (session exists) satisfied. Effects confirmed: correct user returned.");
  });

  await t.step("_getUser (session: Session): (user: User) - Failure case (session not found)", async () => {
    console.log("\n--- Testing _getUser query (failure: session not found) ---");
    console.log(`Input: session=${nonExistentSession}`);

    /**
     * **requires**: the given `session` exists.
     * (This test intentionally violates the requirement)
     * **effects**: (should not occur, error returned)
     */
    const getUserResult = await sessioning._getUser({ session: nonExistentSession });
    console.log("Output of _getUser:", getUserResult);
    assertEquals(
      getUserResult,
      [{ error: `Session with id ${nonExistentSession} not found` }],
      "Should return an error for a non-existent session.",
    );

    console.log("Requirement (session exists) not satisfied. Error returned as expected.");
  });

  await client.close();
});

// trace: Sessioning
// The principle of Sessioning is to maintain a user's logged-in state across multiple requests.
// This trace demonstrates a user logging in, having their session maintained, and then logging out.
Deno.test("SessioningConcept Principle Trace", async (t) => {
  const [db, client] = await testDb();
  const sessioning = new SessioningConcept(db);

  const aliceId = "user:Alice" as ID;
  let aliceSessionId: ID;

  console.log("\n--- Principle Trace: User session lifecycle ---");

  await t.step("1. Alice logs in: Create a session for Alice.", async () => {
    console.log(`Action: create({ user: ${aliceId} })`);
    const createResult = await sessioning.create({ user: aliceId });
    aliceSessionId = createResult.session;
    console.log(`Result: Session created: ${aliceSessionId}`);
    assertEquals(typeof aliceSessionId, "string", "A session ID should be returned.");
  });

  await t.step("2. Alice performs actions: Verify Alice's user from the session.", async () => {
    console.log(`Action: _getUser({ session: ${aliceSessionId} })`);
    const getUserResult = await sessioning._getUser({ session: aliceSessionId });
    console.log(`Result: User from session:`, getUserResult);
    assertEquals(getUserResult, [{ user: aliceId }], "The session should correctly identify Alice.");
    console.log("Principle fulfilled: Alice's logged-in state is maintained.");
  });

  await t.step("3. Alice logs out: Delete Alice's session.", async () => {
    console.log(`Action: delete({ session: ${aliceSessionId} })`);
    const deleteResult = await sessioning.delete({ session: aliceSessionId });
    console.log(`Result: Session deletion:`, deleteResult);
    assertEquals(deleteResult, {}, "Session should be successfully deleted.");
  });

  await t.step("4. After logout: Attempt to verify Alice's user from the deleted session.", async () => {
    console.log(`Action: _getUser({ session: ${aliceSessionId} })`);
    const getUserResult = await sessioning._getUser({ session: aliceSessionId });
    console.log(`Result: User from session (after deletion):`, getUserResult);
    assertEquals(
      getUserResult,
      [{ error: `Session with id ${aliceSessionId} not found` }],
      "The session should no longer exist after logout.",
    );
    console.log("Principle fulfilled: Logged-out state is correctly reflected.");
  });

  await client.close();
});
```