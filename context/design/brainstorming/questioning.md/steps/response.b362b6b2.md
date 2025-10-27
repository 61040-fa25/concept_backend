---
timestamp: 'Wed Oct 22 2025 18:32:47 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251022_183247.0c124b87.md]]'
content_id: b362b6b2cf258bb067d73a604b2a814510966e3bddb51a2f5f7585ca26e0409d
---

# response:

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UserSessionConcept from "./SessionConcept.ts";

// Define mock IDs
const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;
const nonExistentId = "session:nonexistent" as ID;

// Store original Date.now for mocking in tests
const originalDateNow = Date.now;

// Default session duration from the concept file
const DEFAULT_SESSION_DURATION_MS = 30 * 60 * 1000;

Deno.test("Principle: User starts a session, uses it, extends it, or ends it.", async (t) => {
  const [db, client] = await testDb();
  const sessionConcept = new UserSessionConcept(db);

  try {
    const initialTime = Date.now();
    Date.now = () => initialTime; // Fix current time for predictable expiry

    // 1. User starts a session
    let startResult = await sessionConcept.startSession({ u: userA });
    assertNotEquals(
      "error" in startResult,
      true,
      "Starting session should not fail.",
    );
    let { session: sessionID } = startResult as { session: ID };
    assertExists(sessionID);

    const createdSession = await sessionConcept._getSession({ s: sessionID });
    assertExists(createdSession);
    assertEquals(createdSession.userID, userA);
    assertEquals(
      createdSession.expiryTime.getTime(),
      initialTime + DEFAULT_SESSION_DURATION_MS,
      "Initial session expiry time should be correct.",
    );

    // 2. User successfully uses an active session
    await t.step("User uses an active session", async () => {
      Date.now = () => initialTime + 5 * 60 * 1000; // 5 minutes later, still active
      const useResult = await sessionConcept.useSession({ s: sessionID });
      assertEquals(
        "error" in useResult,
        false,
        "Using an active session should succeed.",
      );
    });

    // 3. User extends an active session
    await t.step("User extends an active session", async () => {
      // Advance time slightly, but not past expiry, before extending
      const extendCallTime = initialTime + 10 * 60 * 1000; // 10 minutes later
      Date.now = () => extendCallTime;

      const extendResult = await sessionConcept.extendSession({ s: sessionID });
      assertNotEquals(
        "error" in extendResult,
        true,
        "Extending an active session should succeed.",
      );
      const { session: newSessionID } = extendResult as { session: ID };
      assertExists(newSessionID);
      assertNotEquals(newSessionID, sessionID, "A new session ID should be returned.");

      // Verify old session is gone
      const oldSession = await sessionConcept._getSession({ s: sessionID });
      assertEquals(oldSession, null, "Old session should be deleted after extension.");

      // Verify new session exists and has updated expiry
      const newSession = await sessionConcept._getSession({ s: newSessionID });
      assertExists(newSession);
      assertEquals(newSession.userID, userA);
      assertEquals(
        newSession.expiryTime.getTime(),
        extendCallTime + DEFAULT_SESSION_DURATION_MS,
        "New session should have updated expiry.",
      );

      // Update sessionID for subsequent steps
      sessionID = newSessionID;
    });

    // 4. User ends the session
    await t.step("User ends the session", async () => {
      Date.now = () => initialTime + 15 * 60 * 1000; // Time doesn't matter much for endSession
      const endResult = await sessionConcept.endSession({ s: sessionID });
      assertNotEquals(
        "error" in endResult,
        true,
        "Ending an active session should succeed.",
      );

      const endedSession = await sessionConcept._getSession({ s: sessionID });
      assertEquals(endedSession, null, "Session should be deleted after ending.");

      // Trying to use it again should fail
      const useAfterEndResult = await sessionConcept.useSession({ s: sessionID });
      assertEquals(
        "error" in useAfterEndResult,
        true,
        "Using an ended session should fail.",
      );
      assertEquals(
        (useAfterEndResult as { error: string }).error,
        `Session with ID ${sessionID} not found.`,
      );
    });
  } finally {
    await client.close();
    Date.now = originalDateNow; // Restore Date.now
  }
});

Deno.test("Action: startSession creates a new session correctly", async () => {
  const [db, client] = await testDb();
  const sessionConcept = new UserSessionConcept(db);

  try {
    const startTime = Date.now();
    Date.now = () => startTime; // Fix time for predictable expiry

    const result = await sessionConcept.startSession({ u: userB });
    assertNotEquals(
      "error" in result,
      true,
      "startSession should not return an error.",
    );
    const { session } = result as { session: ID };
    assertExists(session, "A session ID should be returned.");

    const createdSession = await sessionConcept._getSession({ s: session });
    assertExists(createdSession, "The session should exist in the database.");
    assertEquals(createdSession.userID, userB, "Session should be linked to the correct user.");
    assertEquals(
      createdSession.expiryTime.getTime(),
      startTime + DEFAULT_SESSION_DURATION_MS,
      "Session expiry time should be correctly set.",
    );

    // Verify a different user gets a different session and ID
    const result2 = await sessionConcept.startSession({ u: userA });
    const { session: session2 } = result2 as { session: ID };
    assertNotEquals(session, session2, "Each startSession call should create a unique session ID.");

  } finally {
    await client.close();
    Date.now = originalDateNow;
  }
});

Deno.test("Action: endSession deletes an existing session", async () => {
  const [db, client] = await testDb();
  const sessionConcept = new UserSessionConcept(db);

  try {
    // Setup: Create a session to end
    const { session: sessionToEnd } = await sessionConcept.startSession({ u: userA }) as { session: ID };
    assertExists(sessionToEnd);
    assertEquals(
      (await sessionConcept._getSession({ s: sessionToEnd }))?.userID,
      userA,
      "Session should exist initially.",
    );

    // Test: End the session
    const endResult = await sessionConcept.endSession({ s: sessionToEnd });
    assertNotEquals(
      "error" in endResult,
      true,
      "Ending an existing session should succeed.",
    );

    // Verify: Session no longer exists
    const deletedSession = await sessionConcept._getSession({ s: sessionToEnd });
    assertEquals(deletedSession, null, "Session should be deleted from the database.");

    // Test: Ending a non-existent session
    const endNonExistentResult = await sessionConcept.endSession({ s: nonExistentId });
    assertEquals(
      "error" in endNonExistentResult,
      true,
      "Ending a non-existent session should return an error.",
    );
    assertEquals(
      (endNonExistentResult as { error: string }).error,
      `Session with ID ${nonExistentId} not found.`,
      "Error message should indicate session not found.",
    );

  } finally {
    await client.close();
  }
});

Deno.test("Action: useSession verifies session validity", async (t) => {
  const [db, client] = await testDb();
  const sessionConcept = new UserSessionConcept(db);

  try {
    const creationTime = Date.now();
    Date.now = () => creationTime; // Fix time for session creation

    // Setup: Create an active session
    const { session: activeSession } = await sessionConcept.startSession({ u: userA }) as { session: ID };

    await t.step("Allows use of an active session", async () => {
      Date.now = () => creationTime + 1000; // Just after creation, well before expiry
      const useResult = await sessionConcept.useSession({ s: activeSession });
      assertNotEquals(
        "error" in useResult,
        true,
        "useSession should succeed for an active session.",
      );
    });

    await t.step("Fails for a non-existent session", async () => {
      const useNonExistentResult = await sessionConcept.useSession({ s: nonExistentId });
      assertEquals(
        "error" in useNonExistentResult,
        true,
        "useSession should fail for a non-existent session.",
      );
      assertEquals(
        (useNonExistentResult as { error: string }).error,
        `Session with ID ${nonExistentId} not found.`,
      );
    });

    await t.step("Fails for an expired session", async () => {
      // Create a session for userB and immediately expire it for testing purposes
      const { session: expiredSession } = await sessionConcept.startSession({ u: userB }) as { session: ID };
      const sessionDoc = await sessionConcept._getSession({ s: expiredSession });
      assertExists(sessionDoc);

      // Manually set expiry time to be in the past
      sessionDoc.expiryTime = new Date(creationTime - 1000);
      await sessionConcept.sessions.replaceOne({ _id: expiredSession }, sessionDoc);

      Date.now = () => creationTime; // Set current time to be after the modified expiry
      const useExpiredResult = await sessionConcept.useSession({ s: expiredSession });
      assertEquals(
        "error" in useExpiredResult,
        true,
        "useSession should fail for an expired session.",
      );
      assertEquals(
        (useExpiredResult as { error: string }).error,
        `Session with ID ${expiredSession} has expired.`,
      );
    });

  } finally {
    await client.close();
    Date.now = originalDateNow; // Restore Date.now
  }
});

Deno.test("Action: extendSession renews an active session", async (t) => {
  const [db, client] = await testDb();
  const sessionConcept = new UserSessionConcept(db);

  try {
    const creationTime = Date.now();
    Date.now = () => creationTime; // Fix time for session creation

    // Setup: Create an active session
    const { session: originalSession } = await sessionConcept.startSession({ u: userA }) as { session: ID };
    const originalDoc = await sessionConcept._getSession({ s: originalSession });
    assertExists(originalDoc);

    await t.step("Successfully extends an active session", async () => {
      const extendCallTime = creationTime + 5 * 60 * 1000; // 5 minutes after creation
      Date.now = () => extendCallTime;

      const extendResult = await sessionConcept.extendSession({ s: originalSession });
      assertNotEquals(
        "error" in extendResult,
        true,
        "extendSession should succeed for an active session.",
      );
      const { session: newSession } = extendResult as { session: ID };
      assertExists(newSession);
      assertNotEquals(newSession, originalSession, "A new session ID should be generated.");

      // Verify old session is deleted
      const deletedOriginal = await sessionConcept._getSession({ s: originalSession });
      assertEquals(deletedOriginal, null, "The original session should be deleted.");

      // Verify new session's properties
      const newDoc = await sessionConcept._getSession({ s: newSession });
      assertExists(newDoc);
      assertEquals(newDoc.userID, userA, "New session should belong to the same user.");
      assertEquals(
        newDoc.expiryTime.getTime(),
        extendCallTime + DEFAULT_SESSION_DURATION_MS,
        "New session should have an updated expiry time.",
      );
    });

    await t.step("Fails to extend a non-existent session", async () => {
      const extendNonExistentResult = await sessionConcept.extendSession({ s: nonExistentId });
      assertEquals(
        "error" in extendNonExistentResult,
        true,
        "extendSession should fail for a non-existent session.",
      );
      assertEquals(
        (extendNonExistentResult as { error: string }).error,
        `Session with ID ${nonExistentId} not found.`,
      );
    });

    await t.step("Fails to extend an expired session", async () => {
      // Create a session for userB and immediately expire it for testing purposes
      const { session: expiredSession } = await sessionConcept.startSession({ u: userB }) as { session: ID };
      const expiredDoc = await sessionConcept._getSession({ s: expiredSession });
      assertExists(expiredDoc);

      // Manually set expiry time to be in the past
      expiredDoc.expiryTime = new Date(creationTime - 1000);
      await sessionConcept.sessions.replaceOne({ _id: expiredSession }, expiredDoc);

      Date.now = () => creationTime; // Set current time to be after the modified expiry
      const extendExpiredResult = await sessionConcept.extendSession({ s: expiredSession });
      assertEquals(
        "error" in extendExpiredResult,
        true,
        "extendSession should fail for an expired session.",
      );
      assertEquals(
        (extendExpiredResult as { error: string }).error,
        `Session with ID ${expiredSession} has expired and cannot be extended.`,
      );
    });

  } finally {
    await client.close();
    Date.now = originalDateNow;
  }
});

Deno.test("System Action: _expireSessions deletes all expired sessions", async (t) => {
  const [db, client] = await testDb();
  const sessionConcept = new UserSessionConcept(db);

  try {
    const currentTime = Date.now();
    Date.now = () => currentTime; // Fix current time for consistent testing

    // Setup: Create multiple sessions with different expiry statuses
    // Session 1: Expired
    const { session: session1 } = await sessionConcept.startSession({ u: userA }) as { session: ID };
    const doc1 = await sessionConcept._getSession({ s: session1 });
    assertExists(doc1);
    doc1.expiryTime = new Date(currentTime - 1000); // Set expiry to 1 second in the past
    await sessionConcept.sessions.replaceOne({ _id: session1 }, doc1); // Manually update expiry in DB

    // Session 2: Active (should remain)
    const { session: session2 } = await sessionConcept.startSession({ u: userA }) as { session: ID };
    const doc2 = await sessionConcept._getSession({ s: session2 });
    assertExists(doc2);
    doc2.expiryTime = new Date(currentTime + DEFAULT_SESSION_DURATION_MS); // Set expiry to future
    await sessionConcept.sessions.replaceOne({ _id: session2 }, doc2);

    // Session 3: Expired (for userB)
    const { session: session3 } = await sessionConcept.startSession({ u: userB }) as { session: ID };
    const doc3 = await sessionConcept._getSession({ s: session3 });
    assertExists(doc3);
    doc3.expiryTime = new Date(currentTime - 5 * 60 * 1000); // 5 minutes in the past
    await sessionConcept.sessions.replaceOne({ _id: session3 }, doc3);

    await t.step("Initially, all sessions exist", async () => {
      const allSessions = await sessionConcept.sessions.find().toArray();
      assertEquals(allSessions.length, 3, "All 3 sessions should exist before expiry run.");
    });

    // Test: Run the expiry action
    await sessionConcept._expireSessions();

    await t.step("Only non-expired sessions remain after _expireSessions", async () => {
      const remainingSessions = await sessionConcept.sessions.find().toArray();
      assertEquals(remainingSessions.length, 1, "Only 1 session (session2) should remain.");
      assertEquals(
        remainingSessions[0]._id,
        session2,
        "The remaining session should be the non-expired one.",
      );
    });

  } finally {
    await client.close();
    Date.now = originalDateNow;
  }
});

Deno.test("Query: _getUserSessions returns only active sessions for a user", async (t) => {
  const [db, client] = await testDb();
  const sessionConcept = new UserSessionConcept(db);

  try {
    const currentTime = Date.now();
    Date.now = () => currentTime; // Fix current time for consistent testing

    // Setup: Create several sessions for userA and userB, some active, some expired
    const { session: userASession1 } = await sessionConcept.startSession({ u: userA }) as { session: ID };
    const { session: userASession2 } = await sessionConcept.startSession({ u: userA }) as { session: ID };
    const { session: userBSession1 } = await sessionConcept.startSession({ u: userB }) as { session: ID };

    // Manually expire userASession1
    const doc1 = await sessionConcept._getSession({ s: userASession1 });
    assertExists(doc1);
    doc1.expiryTime = new Date(currentTime - 1000); // Expired
    await sessionConcept.sessions.replaceOne({ _id: userASession1 }, doc1);

    // userASession2 and userBSession1 are active by default

    await t.step("Returns active sessions for userA", async () => {
      const activeSessionsA = await sessionConcept._getUserSessions({ u: userA });
      assertEquals(activeSessionsA.length, 1, "User A should have 1 active session.");
      assertEquals(activeSessionsA[0]._id, userASession2);
      assertNotEquals(activeSessionsA[0]._id, userASession1, "Expired session should not be returned.");
    });

    await t.step("Returns active sessions for userB", async () => {
      const activeSessionsB = await sessionConcept._getUserSessions({ u: userB });
      assertEquals(activeSessionsB.length, 1, "User B should have 1 active session.");
      assertEquals(activeSessionsB[0]._id, userBSession1);
    });

    await t.step("Returns empty array for a user with no active sessions", async () => {
      const noUserSessions = await sessionConcept._getUserSessions({ u: "user:nonexistent" as ID });
      assertEquals(noUserSessions.length, 0, "Non-existent user should have no sessions.");
    });

    await t.step("Returns empty array for a user whose sessions are all expired", async () => {
      // Create a user with only expired sessions
      const { session: userCSession1 } = await sessionConcept.startSession({ u: "user:Charlie" as ID }) as { session: ID };
      const docC1 = await sessionConcept._getSession({ s: userCSession1 });
      assertExists(docC1);
      docC1.expiryTime = new Date(currentTime - 1000); // Expired
      await sessionConcept.sessions.replaceOne({ _id: userCSession1 }, docC1);

      const charlieSessions = await sessionConcept._getUserSessions({ u: "user:Charlie" as ID });
      assertEquals(charlieSessions.length, 0, "User Charlie should have no active sessions.");
    });

  } finally {
    await client.close();
    Date.now = originalDateNow;
  }
});

Deno.test("Query: _getSession retrieves a specific session document", async (t) => {
  const [db, client] = await testDb();
  const sessionConcept = new UserSessionConcept(db);

  try {
    const creationTime = Date.now();
    Date.now = () => creationTime;

    // Setup: Create a session
    const { session: testSession } = await sessionConcept.startSession({ u: userA }) as { session: ID };

    await t.step("Retrieves an existing session", async () => {
      const sessionDoc = await sessionConcept._getSession({ s: testSession });
      assertExists(sessionDoc, "The session document should be found.");
      assertEquals(sessionDoc._id, testSession);
      assertEquals(sessionDoc.userID, userA);
      assertEquals(
        sessionDoc.expiryTime.getTime(),
        creationTime + DEFAULT_SESSION_DURATION_MS,
      );
    });

    await t.step("Returns null for a non-existent session", async () => {
      const nonExistentDoc = await sessionConcept._getSession({ s: nonExistentId });
      assertEquals(nonExistentDoc, null, "Should return null for a non-existent session ID.");
    });

  } finally {
    await client.close();
    Date.now = originalDateNow;
  }
});
```
