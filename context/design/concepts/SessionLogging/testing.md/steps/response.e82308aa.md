---
timestamp: 'Sun Oct 12 2025 23:26:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_232659.ee41b2ab.md]]'
content_id: e82308aada91c3a3f923d566fa752c46eca188c727992768e5b914df0754e7a2
---

# response:

Okay, I understand. The request is to align the `endSession` behavior with its `requires` clause: "Session must be active". This means that attempting to end an *already inactive* session should result in an error, rather than being an idempotent no-op.

Here are the necessary changes:

1. **Modify `src/SessionLogging/SessionLoggingConcept.ts`**: Update the `endSession` method to return an error if the session is already inactive, and adjust its JSDoc.
2. **Modify `src/concepts/SessionLogging/SessionLoggingConcept.test.ts`**: Update the test case for ending an already inactive session to expect an error.

***

### `# file: src/SessionLogging/SessionLoggingConcept.ts` (Modified)

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "../../utils/types.ts"; // Assuming utils is at a higher level
import { freshID } from "../../utils/database.ts"; // Assuming utils is at a higher level

// Declare collection prefix, use concept name
const PREFIX = "SessionLogging" + ".";

// Generic types of this concept as per the concept definition
type User = ID;
type Image = ID;
type Session = ID; // The ID for a session instance

/**
 * Represents the state of a single Session in the SessionLogging concept.
 *
 * State description:
 * a set of Sessions with
 *   an owner User
 *   a set of Images
 *   an active Flag
 */
interface SessionState {
  _id: Session;
  owner: User;
  images: Image[];
  active: boolean; // Corresponds to the 'active Flag' in the specification
}

/**
 * Concept: SessionLogging [User, Image]
 *
 * purpose: capture photo records of a user's activity during a trip session
 *
 * principle: users can start sessions during which they can log image entries.
 * Entries for a session cannot be recorded once the session is ended. Recorded
 * entries will remain associated with the session even after it is ended.
 */
export default class SessionLoggingConcept {
  private sessions: Collection<SessionState>;

  /**
   * Initializes the SessionLoggingConcept with a MongoDB database instance.
   *
   * @param db The MongoDB database connection.
   */
  constructor(private readonly db: Db) {
    // Map the "set of Sessions" from the state declaration to a MongoDB collection.
    this.sessions = this.db.collection(PREFIX + "sessions");
  }

  /**
   * startSession (user: User): (session: Session)
   *
   * requires: user to exist (as a valid ID in the system context)
   * effects: creates a new session (active = true) under the specified user,
   *          returning the ID of the new session.
   */
  async startSession(input: { user: User }): Promise<{ session: Session } | { error: string }> {
    const { user } = input;

    // As per concept independence, this concept assumes 'user' is a valid ID.
    // External validation (e.g., from a UserAuthentication concept) would be
    // handled by a synchronization rule.

    const newSessionId = freshID();
    const newSession: SessionState = {
      _id: newSessionId,
      owner: user,
      images: [],
      active: true,
    };

    try {
      await this.sessions.insertOne(newSession);
      return { session: newSessionId };
    } catch (e) {
      console.error(`SessionLogging: Failed to start session for user ${user}:`, e);
      return { error: "Failed to start session due to a database error." };
    }
  }

  /**
   * addEntry (user: User, session: Session, image: Image)
   *
   * requires: user to exist, session must exist, image must exist (as a valid ID),
   *           session must be active, and session must belong to the user.
   *           The image must not already be associated with the session.
   * effects: adds the specified image to the set of images associated with the session.
   */
  async addEntry(input: { user: User; session: Session; image: Image }): Promise<Empty | { error: string }> {
    const { user, session, image } = input;

    // Precondition: Session must exist, be active, and belong to the user.
    const existingSession = await this.sessions.findOne({ _id: session });

    if (!existingSession) {
      return { error: `SessionLogging: Session with ID ${session} not found.` };
    }
    if (existingSession.owner !== user) {
      return { error: `SessionLogging: User ${user} is not the owner of session ${session}.` };
    }
    if (!existingSession.active) {
      return { error: `SessionLogging: Session with ID ${session} is not active. Cannot add entries.` };
    }
    // Precondition: Image must not already be in the session
    if (existingSession.images.includes(image)) {
        return { error: `SessionLogging: Image ${image} is already an entry in session ${session}.` };
    }

    // Similar to 'user', 'image' is assumed to be a valid ID here.

    try {
      // Effects: add image to the set of images associated with the session
      await this.sessions.updateOne(
        { _id: session },
        { $push: { images: image } }
      );
      return {};
    } catch (e) {
      console.error(`SessionLogging: Failed to add entry ${image} to session ${session}:`, e);
      return { error: "Failed to add entry due to a database error." };
    }
  }

  /**
   * endSession (user: User, session: Session)
   *
   * requires: user to exist, session must exist and belong to user. Session must be active.
   * effects: sets the 'active' flag of the specified session to false.
   *          If the session is already inactive, an error is returned as per precondition.
   */
  async endSession(input: { user: User; session: Session }): Promise<Empty | { error: string }> {
    const { user, session } = input;

    // Precondition: Session must exist and belong to the user.
    const existingSession = await this.sessions.findOne({ _id: session });

    if (!existingSession) {
      return { error: `SessionLogging: Session with ID ${session} not found.` };
    }
    if (existingSession.owner !== user) {
      return { error: `SessionLogging: User ${user} is not the owner of session ${session}.` };
    }

    // Precondition: Session must be active.
    if (!existingSession.active) {
        // As per the 'requires' clause, an inactive session cannot be 'ended' again.
        return { error: `SessionLogging: Session with ID ${session} is already inactive.` };
    }

    try {
      // Effects: end the session (active = false)
      await this.sessions.updateOne(
        { _id: session },
        { $set: { active: false } }
      );
      return {};
    } catch (e) {
      console.error(`SessionLogging: Failed to end session ${session}:`, e);
      return { error: "Failed to end session due to a database error." };
    }
  }

  // --- Concept Queries (prefixed with an underscore) ---

  /**
   * _getSessionsByUser (user: User): (sessions: Session[])
   * effects: Returns a list of IDs for all sessions owned by the given user.
   */
  async _getSessionsByUser(input: { user: User }): Promise<Session[]> {
    const { user } = input;
    const userSessions = await this.sessions.find({ owner: user }).toArray();
    return userSessions.map(s => s._id);
  }

  /**
   * _getSessionDetails (session: Session): (details: SessionState | null)
   * effects: Returns the full details of a specific session, or null if not found.
   */
  async _getSessionDetails(input: { session: Session }): Promise<SessionState | null> {
    const { session } = input;
    return this.sessions.findOne({ _id: session });
  }

  /**
   * _getEntriesInSession (session: Session): (images: Image[])
   * effects: Returns the list of image entry IDs for a given session.
   */
  async _getEntriesInSession(input: { session: Session }): Promise<Image[]> {
    const { session } = input;
    const foundSession = await this.sessions.findOne({ _id: session });
    return foundSession ? foundSession.images : [];
  }

  /**
   * _isSessionActive (session: Session): (active: boolean)
   * effects: Returns true if the session is active, false otherwise or if not found.
   */
  async _isSessionActive(input: { session: Session }): Promise<boolean> {
    const { session } = input;
    const foundSession = await this.sessions.findOne({ _id: session });
    return foundSession ? foundSession.active : false;
  }
}
```

***

### `# file: src/concepts/SessionLogging/SessionLoggingConcept.test.ts` (Modified)

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { freshID, testDb } from "../../utils/database.ts"; // Adjust path as needed for your project structure
import { Empty, ID } from "../../utils/types.ts"; // Adjust path as needed for your project structure
import SessionLoggingConcept from "./SessionLoggingConcept.ts";

// Helper for checking if a result is an error object
const isError = (result: any): result is { error: string } => "error" in result;

// Utility to print action and result for better test trace readability
const logAction = (actionName: string, inputs: any, result: any) => {
  console.log(`\n--- Action: ${actionName} ---`);
  console.log("  Inputs:", inputs);
  console.log("  Result:", result);
};

Deno.test("SessionLogging Concept Tests", async (t) => {
  // Initialize a new database connection for this test file
  // The database will be dropped before this Deno.test block starts.
  const [db, client] = await testDb();
  const concept = new SessionLoggingConcept(db);

  // Mock User and Image IDs using type branding
  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const image1 = "image:photo1.jpg" as ID;
  const image2 = "image:photo2.png" as ID;
  const image3 = "image:photo3.jpeg" as ID;
  const image4 = "image:photo4.jpg" as ID;
  const image5 = "image:photo5.jpeg" as ID;

  // # trace: Operational Principle - Start, Add, End Session, and Verify Persistence
  await t.step(
    "Principle Trace: Fulfilling the concept's main purpose",
    async () => {
      console.log("\n--- Executing Principle Trace ---");

      // 1. User Alice starts a session
      console.log("Scenario: Alice starts a new session.");
      const startSessionResult = await concept.startSession({
        user: userAlice,
      });
      logAction("startSession", { user: userAlice }, startSessionResult);
      assertEquals(
        isError(startSessionResult),
        false,
        `Expected no error, got: ${
          isError(startSessionResult)
            ? startSessionResult.error
            : "Unknown error"
        }`,
      );
      const sessionAlice1 = (startSessionResult as { session: ID }).session;
      assertExists(sessionAlice1, "Session ID should be returned.");

      // Verify initial state of the session
      let sessionDetails = await concept._getSessionDetails({
        session: sessionAlice1,
      });
      assertExists(sessionDetails, "Session details should be retrievable.");
      assertEquals(
        sessionDetails?.owner,
        userAlice,
        "Session owner should be Alice.",
      );
      assertEquals(
        sessionDetails?.active,
        true,
        "Session should be active upon creation.",
      );
      assertEquals(
        sessionDetails?.images.length,
        0,
        "Session should start with no images.",
      );
      let aliceSessions = await concept._getSessionsByUser({ user: userAlice });
      assertEquals(
        aliceSessions.includes(sessionAlice1),
        true,
        "Alice should own the new session.",
      );

      // 2. Alice adds multiple image entries to the session
      console.log(
        "Scenario: Alice adds multiple image entries to the active session.",
      );
      await concept.addEntry({
        user: userAlice,
        session: sessionAlice1,
        image: image1,
      });
      await concept.addEntry({
        user: userAlice,
        session: sessionAlice1,
        image: image2,
      });
      await concept.addEntry({
        user: userAlice,
        session: sessionAlice1,
        image: image3,
      });
      logAction("addEntry (multiple)", {
        user: userAlice,
        session: sessionAlice1,
        images: [image1, image2, image3],
      }, {});

      // Verify images are logged
      let sessionImages = await concept._getEntriesInSession({
        session: sessionAlice1,
      });
      assertEquals(
        sessionImages.length,
        3,
        "Session should have 3 images after adding.",
      );
      assertEquals(
        sessionImages.includes(image1),
        true,
        "Session should contain image1.",
      );
      assertEquals(
        sessionImages.includes(image2),
        true,
        "Session should contain image2.",
      );
      assertEquals(
        sessionImages.includes(image3),
        true,
        "Session should contain image3.",
      );

      // 3. Alice ends the session
      console.log("Scenario: Alice ends the session.");
      const endSessionResult = await concept.endSession({
        user: userAlice,
        session: sessionAlice1,
      });
      logAction(
        "endSession",
        { user: userAlice, session: sessionAlice1 },
        endSessionResult,
      );
      assertEquals(
        isError(endSessionResult),
        false,
        `Expected no error, got: ${
          isError(endSessionResult) ? endSessionResult.error : "Unknown error"
        }`,
      );

      // Verify session is inactive
      sessionDetails = await concept._getSessionDetails({
        session: sessionAlice1,
      });
      assertEquals(
        sessionDetails?.active,
        false,
        "Session should be inactive after ending.",
      );
      assertEquals(
        await concept._isSessionActive({ session: sessionAlice1 }),
        false,
        "Query for active status should confirm inactive.",
      );

      // 4. Attempt to add an entry to the ended session (should fail)
      console.log(
        "Scenario: Attempt to add an entry to an already ended session (expected to fail).",
      );
      const addEntryFailedResult = await concept.addEntry({
        user: userAlice,
        session: sessionAlice1,
        image: image4,
      });
      logAction("addEntry (to ended session)", {
        user: userAlice,
        session: sessionAlice1,
        image: image4,
      }, addEntryFailedResult);
      assertEquals(
        isError(addEntryFailedResult),
        true,
        "Adding entry to inactive session should fail.",
      );
      assertEquals(
        (addEntryFailedResult as { error: string }).error,
        `SessionLogging: Session with ID ${sessionAlice1} is not active. Cannot add entries.`,
      );
      sessionImages = await concept._getEntriesInSession({
        session: sessionAlice1,
      });
      assertEquals(
        sessionImages.includes(image4),
        false,
        "Image4 should not be added to inactive session.",
      );
      assertEquals(
        sessionImages.length,
        3,
        "Image count should remain 3 after failed attempt.",
      );

      // 5. Verify previously recorded entries are still associated (persistence as per principle)
      console.log(
        "Scenario: Verify recorded entries persist after the session ends.",
      );
      sessionImages = await concept._getEntriesInSession({
        session: sessionAlice1,
      });
      assertEquals(
        sessionImages.length,
        3,
        "Entries should persist after session ends.",
      );
      assertEquals(sessionImages.includes(image1), true);
      assertEquals(sessionImages.includes(image2), true);
      assertEquals(sessionImages.includes(image3), true);
    },
  );

  await t.step("Scenario: `addEntry` Precondition Violations", async () => {
    console.log("\n--- Executing addEntry Precondition Violation Tests ---");

    // Setup an active session for Alice for valid base cases
    const startSessionResult = await concept.startSession({ user: userAlice });
    const sessionAlice2 = (startSessionResult as { session: ID }).session;
    console.log(`Setup: Started session ${sessionAlice2} for Alice.`);

    // 1. Attempt to add entry to a non-existent session
    console.log("Scenario: Adding entry to a non-existent session.");
    const nonExistentSession = "session:nonExistent" as ID;
    const addEntryNonExistentResult = await concept.addEntry({
      user: userAlice,
      session: nonExistentSession,
      image: image1,
    });
    logAction("addEntry (non-existent session)", {
      user: userAlice,
      session: nonExistentSession,
      image: image1,
    }, addEntryNonExistentResult);
    assertEquals(
      isError(addEntryNonExistentResult),
      true,
      "Adding entry to non-existent session should fail.",
    );
    assertEquals(
      (addEntryNonExistentResult as { error: string }).error,
      `SessionLogging: Session with ID ${nonExistentSession} not found.`,
    );

    // 2. Attempt to add entry to a session owned by another user
    console.log("Scenario: Alice tries to add entry to Bob's session.");
    const startSessionBobResult = await concept.startSession({ user: userBob });
    const sessionBob1 = (startSessionBobResult as { session: ID }).session;
    console.log(`Setup: Started session ${sessionBob1} for Bob.`);

    const addEntryWrongOwnerResult = await concept.addEntry({
      user: userAlice,
      session: sessionBob1,
      image: image1,
    });
    logAction("addEntry (wrong owner)", {
      user: userAlice,
      session: sessionBob1,
      image: image1,
    }, addEntryWrongOwnerResult);
    assertEquals(
      isError(addEntryWrongOwnerResult),
      true,
      "Adding entry to another user's session should fail.",
    );
    assertEquals(
      (addEntryWrongOwnerResult as { error: string }).error,
      `SessionLogging: User ${userAlice} is not the owner of session ${sessionBob1}.`,
    );

    // 3. Attempt to add the same image twice to an active session
    console.log("Scenario: Alice adds the same image twice to her session.");
    await concept.addEntry({
      user: userAlice,
      session: sessionAlice2,
      image: image4,
    }); // Add it once
    logAction("addEntry (first time image4)", {
      user: userAlice,
      session: sessionAlice2,
      image: image4,
    }, {});

    let sessionImages = await concept._getEntriesInSession({
      session: sessionAlice2,
    });
    assertEquals(
      sessionImages.includes(image4),
      true,
      "Image4 should be present after first add.",
    );
    assertEquals(
      sessionImages.length,
      1,
      "Session should have 1 image initially.",
    );

    const addEntryDuplicateResult = await concept.addEntry({
      user: userAlice,
      session: sessionAlice2,
      image: image4,
    }); // Add it again
    logAction("addEntry (duplicate image4)", {
      user: userAlice,
      session: sessionAlice2,
      image: image4,
    }, addEntryDuplicateResult);
    assertEquals(
      isError(addEntryDuplicateResult),
      true,
      "Adding duplicate image should fail.",
    );
    assertEquals(
      (addEntryDuplicateResult as { error: string }).error,
      `SessionLogging: Image ${image4} is already an entry in session ${sessionAlice2}.`,
    );

    sessionImages = await concept._getEntriesInSession({
      session: sessionAlice2,
    });
    assertEquals(
      sessionImages.length,
      1,
      "Image count should still be 1 after duplicate attempt.",
    );
  });

  await t.step(
    "Scenario: `endSession` Precondition Violations and Idempotency",
    async () => {
      console.log(
        "\n--- Executing endSession Precondition Violation & Idempotency Tests ---",
      );

      // Setup an active session for Alice
      const startSessionResult = await concept.startSession({
        user: userAlice,
      });
      const sessionAlice3 = (startSessionResult as { session: ID }).session;
      console.log(`Setup: Started session ${sessionAlice3} for Alice.`);

      // 1. Attempt to end a non-existent session
      console.log("Scenario: Ending a non-existent session.");
      const nonExistentSession = "session:anotherNonExistent" as ID;
      const endSessionNonExistentResult = await concept.endSession({
        user: userAlice,
        session: nonExistentSession,
      });
      logAction("endSession (non-existent session)", {
        user: userAlice,
        session: nonExistentSession,
      }, endSessionNonExistentResult);
      assertEquals(
        isError(endSessionNonExistentResult),
        true,
        "Ending non-existent session should fail.",
      );
      assertEquals(
        (endSessionNonExistentResult as { error: string }).error,
        `SessionLogging: Session with ID ${nonExistentSession} not found.`,
      );

      // 2. Attempt to end a session owned by another user
      console.log("Scenario: Alice tries to end Bob's session.");
      const startSessionBobResult = await concept.startSession({
        user: userBob,
      });
      const sessionBob2 = (startSessionBobResult as { session: ID }).session;
      console.log(`Setup: Started session ${sessionBob2} for Bob.`);

      const endSessionWrongOwnerResult = await concept.endSession({
        user: userAlice,
        session: sessionBob2,
      });
      logAction("endSession (wrong owner)", {
        user: userAlice,
        session: sessionBob2,
      }, endSessionWrongOwnerResult);
      assertEquals(
        isError(endSessionWrongOwnerResult),
        true,
        "Ending another user's session should fail.",
      );
      assertEquals(
        (endSessionWrongOwnerResult as { error: string }).error,
        `SessionLogging: User ${userAlice} is not the owner of session ${sessionBob2}.`,
      );

      // 3. Attempt to end an already ended session (now expected to fail based on 'requires' clause)
      console.log("Scenario: Ending an already inactive session.");
      await concept.endSession({ user: userAlice, session: sessionAlice3 }); // End it once
      logAction("endSession (first time)", {
        user: userAlice,
        session: sessionAlice3,
      }, {});
      let sessionActiveStatus = await concept._isSessionActive({
        session: sessionAlice3,
      });
      assertEquals(
        sessionActiveStatus,
        false,
        "Session should be inactive after first end call.",
      );

      const endSessionAgainResult = await concept.endSession({
        user: userAlice,
        session: sessionAlice3,
      }); // End it again
      logAction("endSession (second time - expected error)", {
        user: userAlice,
        session: sessionAlice3,
      }, endSessionAgainResult);
      assertEquals(
        isError(endSessionAgainResult),
        true, // Changed to expect an error
        "Ending an already inactive session should now return an error as per 'requires' clause.",
      );
      assertEquals(
        (endSessionAgainResult as { error: string }).error,
        `SessionLogging: Session with ID ${sessionAlice3} is already inactive.`, // Assert specific error message
        "Expected specific error message for inactive session.",
      );

      sessionActiveStatus = await concept._isSessionActive({
        session: sessionAlice3,
      });
      assertEquals(
        sessionActiveStatus,
        false,
        "Session should still be inactive after failed second end call.", // Updated message
      );
    },
  );

  await t.step(
    "Scenario: Multiple Users, Isolation, and Cross-User Interaction",
    async () => {
      console.log("\n--- Executing Multi-User Isolation Tests ---");

      // Alice starts a session and adds entries
      console.log("Scenario: Alice starts her session and adds images.");
      const startAliceSessionResult = await concept.startSession({
        user: userAlice,
      });
      const sessionAlice4 =
        (startAliceSessionResult as { session: ID }).session;
      await concept.addEntry({
        user: userAlice,
        session: sessionAlice4,
        image: image1,
      });
      await concept.addEntry({
        user: userAlice,
        session: sessionAlice4,
        image: image2,
      });
      logAction("Alice's actions", {
        session: sessionAlice4,
        images: [image1, image2],
      }, {});

      // Bob starts a separate session and adds entries
      console.log("Scenario: Bob starts his session and adds images.");
      const startBobSessionResult = await concept.startSession({
        user: userBob,
      });
      const sessionBob3 = (startBobSessionResult as { session: ID }).session;
      await concept.addEntry({
        user: userBob,
        session: sessionBob3,
        image: image3,
      });
      await concept.addEntry({
        user: userBob,
        session: sessionBob3,
        image: image5,
      });
      logAction("Bob's actions", {
        session: sessionBob3,
        images: [image3, image5],
      }, {});

      // Verify each user's sessions/entries are isolated
      console.log("Scenario: Verifying isolation of sessions between users.");
      // Alice has had sessions created in previous steps too
      const aliceSessions = await concept._getSessionsByUser({
        user: userAlice,
      });
      assertEquals(
        aliceSessions.length,
        4,
        "Alice should have 4 sessions across all test steps.",
      ); // sessionAlice1, sessionAlice2, sessionAlice3, sessionAlice4
      assertEquals(
        aliceSessions.includes(sessionAlice4),
        true,
        "Alice should own sessionAlice4.",
      );
      const aliceImages = await concept._getEntriesInSession({
        session: sessionAlice4,
      });
      assertEquals(
        aliceImages.length,
        2,
        "Alice's sessionAlice4 should have 2 images.",
      );
      assertEquals(aliceImages.includes(image1), true);
      assertEquals(aliceImages.includes(image2), true);
      assertEquals(
        aliceImages.includes(image3),
        false,
        "Alice's session should not contain Bob's image3.",
      );

      const bobSessions = await concept._getSessionsByUser({ user: userBob });
      assertEquals(
        bobSessions.length,
        3,
        "Bob should have 3 sessions across all test steps.",
      ); // sessionBob1, sessionBob2, sessionBob3
      assertEquals(
        bobSessions.includes(sessionBob3),
        true,
        "Bob should own sessionBob3.",
      );
      const bobImages = await concept._getEntriesInSession({
        session: sessionBob3,
      });
      assertEquals(
        bobImages.length,
        2,
        "Bob's sessionBob3 should have 2 images.",
      );
      assertEquals(bobImages.includes(image3), true);
      assertEquals(bobImages.includes(image5), true);
      assertEquals(
        bobImages.includes(image1),
        false,
        "Bob's session should not contain Alice's image1.",
      );

      // User Alice tries to mess with User Bob's session (should fail)
      console.log(
        "Scenario: Alice attempts unauthorized actions on Bob's session.",
      );
      const aliceAddBobSessionResult = await concept.addEntry({
        user: userAlice,
        session: sessionBob3,
        image: image4,
      });
      logAction("Alice add entry to Bob's session", {
        user: userAlice,
        session: sessionBob3,
        image: image4,
      }, aliceAddBobSessionResult);
      assertEquals(
        isError(aliceAddBobSessionResult),
        true,
        "Alice should not be able to add to Bob's session.",
      );
      assertEquals(
        (aliceAddBobSessionResult as { error: string }).error,
        `SessionLogging: User ${userAlice} is not the owner of session ${sessionBob3}.`,
      );

      const aliceEndBobSessionResult = await concept.endSession({
        user: userAlice,
        session: sessionBob3,
      });
      logAction("Alice end Bob's session", {
        user: userAlice,
        session: sessionBob3,
      }, aliceEndBobSessionResult);
      assertEquals(
        isError(aliceEndBobSessionResult),
        true,
        "Alice should not be able to end Bob's session.",
      );
      assertEquals(
        (aliceEndBobSessionResult as { error: string }).error,
        `SessionLogging: User ${userAlice} is not the owner of session ${sessionBob3}.`,
      );

      // Verify Bob's session is still active and unmodified after Alice's attempts
      assertEquals(
        await concept._isSessionActive({ session: sessionBob3 }),
        true,
        "Bob's session should still be active.",
      );
      assertEquals(
        (await concept._getEntriesInSession({ session: sessionBob3 })).length,
        2,
        "Bob's session entries should be unchanged.",
      );
    },
  );

  // Close the database client after all tests in this file are complete
  await client.close();
});
```
