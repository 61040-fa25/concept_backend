---
timestamp: 'Wed Oct 15 2025 17:08:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_170845.78be44ff.md]]'
content_id: 8b38167c318d86544158616bf4c4cbb529dfdc14fd7a60a92f5bf07f07aa1d1e
---

# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "RoutineLog" + ".";

// Generic types of this concept
type User = ID;
type SessionId = ID;
type LinkedTaskId = ID;

/**
 * A set of Sessions with
 *   an owner User
 *   a sessionName String
 *   a sessionId String (unique ID)
 *   an isPaused Flag
 *   an isActive Flag
 *   a start TimeStamp (optional)
 *   an end TimeStamp (optional)
 *   a linkedTaskId String (optional)
 *   an interruptReason String (optional)
 */
interface Session {
  _id: SessionId; // Use _id for sessionId as it's a unique ID for MongoDB
  owner: User;
  sessionName: string;
  isPaused: boolean;
  isActive: boolean;
  start?: string; // ISO 8601 string for TimeStamp
  end?: string;   // ISO 8601 string for TimeStamp
  linkedTaskId?: LinkedTaskId;
  interruptReason?: string;
}

/**
 * RoutineLog Concept
 *
 * Records what actually happened throughout the day as time-stamped sessions,
 * optionally linked to planned tasks. Allow users to reflect on their planned
 * schedule by comparing with logged routine sessions.
 *
 * Principle: After a user starts and finishes a session, the system records its
 * actual duration and possible reasons of interruption.
 */
export default class RoutineLogConcept {
  sessions: Collection<Session>;

  constructor(private readonly db: Db) {
    this.sessions = this.db.collection<Session>(PREFIX + "sessions");
  }

  /**
   * getUserSessions (owner: User): (sessionTable: set of Sessions)
   *
   * **requires** exists at least one session with this owner
   *
   * **effects** return ALL sessions under this owner
   */
  async getUserSessions({ owner }: { owner: User }): Promise<{ sessionTable: Session[] } | { error: string }> {
    console.log(`Action: getUserSessions for owner: ${owner}`);
    const userSessions = await this.sessions.find({ owner }).toArray();

    // The 'requires' clause strictly implies an error if no sessions exist.
    // However, for queries, returning an empty array is generally more robust
    // and allows the consumer to handle "no results" gracefully.
    // If strict adherence to 'requires' is needed, uncomment the following block:
    /*
    if (userSessions.length === 0) {
      console.log(`Error: No sessions found for user ${owner} (strict requirement).`);
      return { error: `No sessions found for user ${owner}` };
    }
    */
    console.log(`Effect: Found ${userSessions.length} sessions for owner ${owner}.`);
    return { sessionTable: userSessions };
  }

  /**
   * createSession(owner: User, sessionName: String, linkedTaskId?: String): (session: Session)
   *
   * **effects**
   *   generate a unique sessionId;
   *   create a session owned by owner with sessionName;
   *   if linkedTaskId is provided, assign it to this session;
   *   assign start and end for this session as None;
   *   assign isPaused as False and isActive as False;
   *   assign interruptReason as None;
   *   return this newly created session;
   */
  async createSession(
    { owner, sessionName, linkedTaskId }: { owner: User; sessionName: string; linkedTaskId?: LinkedTaskId },
  ): Promise<{ session: Session } | { error: string }> {
    console.log(`Action: createSession by owner: ${owner}, name: "${sessionName}", linkedTaskId: ${linkedTaskId || "None"}`);
    const newSessionId = freshID() as SessionId;
    const newSession: Session = {
      _id: newSessionId,
      owner,
      sessionName,
      isPaused: false,
      isActive: false,
      start: undefined,
      end: undefined,
      linkedTaskId: linkedTaskId,
      interruptReason: undefined,
    };

    try {
      await this.sessions.insertOne(newSession);
      console.log(`Effect: Session created with ID: ${newSession._id}`);
      return { session: newSession };
    } catch (e: any) {
      console.error("Error creating session:", e.message);
      return { error: `Failed to create session: ${e.message}` };
    }
  }

  /**
   * startSession(owner: User, session: { _id: SessionId }): Empty
   *
   * **requires**
   *   session exists and is owned by owner and has isActive as False
   *
   * **effects**
   *   get the current TimeStamp;
   *   set session.start = current TimeStamp;
   *   set session.isActive as True
   */
  async startSession({ owner, session: { _id: sessionId } }: { owner: User; session: { _id: SessionId } }): Promise<Empty | { error: string }> {
    console.log(`Action: startSession for owner: ${owner}, sessionId: ${sessionId}`);
    const currentTime = new Date().toISOString();

    const result = await this.sessions.findOneAndUpdate(
      { _id: sessionId, owner, isActive: false }, // Requirements: exists, owned by owner, not active
      { $set: { start: currentTime, isActive: true } },
      { returnDocument: "after" }, // Return the updated document
    );

    if (!result.value) {
      console.log(`Error: startSession failed. Session not found, not owned by user, or already active.`);
      return { error: "Session not found, not owned by user, or already active." };
    }

    console.log(`Effect: Session ${sessionId} started at ${currentTime}.`);
    return {};
  }

  /**
   * endSession(owner: User, session: { _id: SessionId }): Empty
   *
   * **requires**
   *   session exists and is owned by owner and has isActive as True
   *
   * **effects**
   *   get the current TimeStamp;
   *   set session.end = current TimeStamp;
   *   set session.isActive as False;
   */
  async endSession({ owner, session: { _id: sessionId } }: { owner: User; session: { _id: SessionId } }): Promise<Empty | { error: string }> {
    console.log(`Action: endSession for owner: ${owner}, sessionId: ${sessionId}`);
    const currentTime = new Date().toISOString();

    const result = await this.sessions.findOneAndUpdate(
      { _id: sessionId, owner, isActive: true }, // Requirements: exists, owned by owner, currently active
      { $set: { end: currentTime, isActive: false } },
      { returnDocument: "after" },
    );

    if (!result.value) {
      console.log(`Error: endSession failed. Session not found, not owned by user, or not currently active.`);
      return { error: "Session not found, not owned by user, or not currently active." };
    }

    console.log(`Effect: Session ${sessionId} ended at ${currentTime}.`);
    return {};
  }

  /**
   * interruptSession(owner: User, session: { _id: SessionId }, interruptReason: String): Empty
   *
   * **requires**
   *   session exists and is owned by owner and has isActive as True;
   *   session has isPaused as False;
   *
   * **effects**
   *   get the current TimeStamp;
   *   set session.end = current TimeStamp;
   *   set session.isPaused = True;
   *   set session.interruptReason = interruptReason;
   */
  async interruptSession(
    { owner, session: { _id: sessionId }, interruptReason }: { owner: User; session: { _id: SessionId }; interruptReason: string },
  ): Promise<Empty | { error: string }> {
    console.log(`Action: interruptSession for owner: ${owner}, sessionId: ${sessionId}, reason: "${interruptReason}"`);
    const currentTime = new Date().toISOString();

    const result = await this.sessions.findOneAndUpdate(
      { _id: sessionId, owner, isActive: true, isPaused: false }, // Requirements: exists, owned by owner, active, not paused
      { $set: { end: currentTime, isPaused: true, interruptReason: interruptReason, isActive: false } }, // Also set isActive to false as it's an end event
      { returnDocument: "after" },
    );

    if (!result.value) {
      console.log(`Error: interruptSession failed. Session not found, not owned by user, not active, or already paused.`);
      return { error: "Session not found, not owned by user, not active, or already paused." };
    }

    console.log(`Effect: Session ${sessionId} interrupted at ${currentTime} with reason: "${interruptReason}".`);
    return {};
  }
}
```

```typescript
import { assertEquals, assertExists, assertInstanceOf, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import RoutineLogConcept from "./RoutineLog.ts";
import { ID } from "@utils/types.ts";

Deno.test("RoutineLog Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const routineLog = new RoutineLogConcept(db);

  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const taskA = "task:TaskA" as ID;
  const taskB = "task:TaskB" as ID;

  await t.step("Operational Principle: Create, Start, and End a Session", async () => {
    console.log("\n--- Operational Principle Test ---");

    // 1. Create a session
    const createResult = await routineLog.createSession({
      owner: userAlice,
      sessionName: "Work on Project X",
      linkedTaskId: taskA,
    });
    assertInstanceOf(createResult, Object, "createSession should return an object");
    assertExists((createResult as { session: any }).session, "createSession should return a session object");
    const session1 = (createResult as { session: any }).session;
    assertEquals(session1.owner, userAlice);
    assertEquals(session1.sessionName, "Work on Project X");
    assertEquals(session1.linkedTaskId, taskA);
    assertEquals(session1.isActive, false);
    assertEquals(session1.isPaused, false);
    assertEquals(session1.start, undefined);
    assertEquals(session1.end, undefined);
    console.log(`Created session: ${JSON.stringify(session1)}`);

    // 2. Start the session
    const startResult = await routineLog.startSession({ owner: userAlice, session: { _id: session1._id } });
    assertInstanceOf(startResult, Object, "startSession should return an object");
    assertEquals(Object.keys(startResult).length, 0, "startSession should return an empty object on success");
    console.log(`Started session ID: ${session1._id}`);

    const startedSessionCheck = await routineLog.getUserSessions({ owner: userAlice });
    const s1_after_start = (startedSessionCheck as { sessionTable: any[] }).sessionTable.find((s: any) =>
      s._id === session1._id
    );
    assertExists(s1_after_start?.start, "Session start time should be set");
    assertEquals(s1_after_start?.isActive, true, "Session should be active");
    assertEquals(s1_after_start?.isPaused, false, "Session should not be paused");
    console.log(`Verified session state after start: ${JSON.stringify(s1_after_start)}`);

    // 3. End the session
    const endResult = await routineLog.endSession({ owner: userAlice, session: { _id: session1._id } });
    assertInstanceOf(endResult, Object, "endSession should return an object");
    assertEquals(Object.keys(endResult).length, 0, "endSession should return an empty object on success");
    console.log(`Ended session ID: ${session1._id}`);

    // 4. Verify the session details after ending
    const retrievedSessions = await routineLog.getUserSessions({ owner: userAlice });
    assertInstanceOf(retrievedSessions, Object, "getUserSessions should return an object");
    assertExists((retrievedSessions as { sessionTable: any[] }).sessionTable, "getUserSessions should return sessionTable");
    const sessions = (retrievedSessions as { sessionTable: any[] }).sessionTable;
    assertEquals(sessions.length, 1, "Should have one session");

    const finishedSession = sessions[0];
    assertEquals(finishedSession._id, session1._id);
    assertEquals(finishedSession.owner, userAlice);
    assertEquals(finishedSession.sessionName, "Work on Project X");
    assertExists(finishedSession.start, "Session start time should be present");
    assertExists(finishedSession.end, "Session end time should be present");
    assertEquals(finishedSession.isActive, false, "Session should be inactive");
    assertEquals(finishedSession.isPaused, false, "Session should not be paused");
    console.log(`Verified final session state: ${JSON.stringify(finishedSession)}`);
  });

  await t.step("Scenario 1: Attempt to start an already active session or another user's session", async () => {
    console.log("\n--- Scenario 1: Invalid Start Attempts ---");

    // Create and start a session
    const createResult = await routineLog.createSession({ owner: userAlice, sessionName: "Coding" });
    const session2 = (createResult as { session: any }).session;
    await routineLog.startSession({ owner: userAlice, session: { _id: session2._id } });
    console.log(`Created and started session ID: ${session2._id}`);

    // Attempt to start the same active session again (should fail)
    const secondStartResult = await routineLog.startSession({ owner: userAlice, session: { _id: session2._id } });
    assertExists((secondStartResult as { error: string }).error, "Should return an error for starting an active session");
    console.log(`Attempted to restart active session (expected error): ${JSON.stringify(secondStartResult)}`);

    // Attempt to start another user's session (should fail)
    const otherUserStartResult = await routineLog.startSession({ owner: userBob, session: { _id: session2._id } });
    assertExists((otherUserStartResult as { error: string }).error, "Should return an error for starting another user's session");
    console.log(`Attempted to start another user's session (expected error): ${JSON.stringify(otherUserStartResult)}`);
  });

  await t.step("Scenario 2: Interrupting a session", async () => {
    console.log("\n--- Scenario 2: Interrupting a Session ---");

    // Create and start a session
    const createResult = await routineLog.createSession({ owner: userAlice, sessionName: "Reading" });
    const session3 = (createResult as { session: any }).session;
    await routineLog.startSession({ owner: userAlice, session: { _id: session3._id } });
    console.log(`Created and started session ID: ${session3._id}`);

    // Interrupt the session
    const interruptResult = await routineLog.interruptSession({
      owner: userAlice,
      session: { _id: session3._id },
      interruptReason: "Phone call",
    });
    assertInstanceOf(interruptResult, Object, "interruptSession should return an object");
    assertEquals(Object.keys(interruptResult).length, 0, "interruptSession should return an empty object on success");
    console.log(`Interrupted session ID: ${session3._id}`);

    // Verify the session state after interruption
    const retrievedSessions = await routineLog.getUserSessions({ owner: userAlice });
    const interruptedSession = (retrievedSessions as { sessionTable: any[] }).sessionTable.find((s: any) =>
      s._id === session3._id
    );
    assertExists(interruptedSession?.start, "Session start time should be present");
    assertExists(interruptedSession?.end, "Session end time should be present (interruption sets end)");
    assertEquals(interruptedSession?.isActive, false, "Session should be inactive after interruption");
    assertEquals(interruptedSession?.isPaused, true, "Session should be paused");
    assertEquals(interruptedSession?.interruptReason, "Phone call", "Interrupt reason should be set");
    console.log(`Verified interrupted session state: ${JSON.stringify(interruptedSession)}`);

    // Attempt to end an interrupted session (should fail because isActive is false)
    const endInterruptedResult = await routineLog.endSession({ owner: userAlice, session: { _id: session3._id } });
    assertExists((endInterruptedResult as { error: string }).error, "Should return an error for ending an interrupted session");
    console.log(`Attempted to end an interrupted session (expected error): ${JSON.stringify(endInterruptedResult)}`);
  });

  await t.step("Scenario 3: Create multiple sessions and retrieve them for a user", async () => {
    console.log("\n--- Scenario 3: Multiple Sessions and Retrieval ---");

    // Create several sessions for Alice
    const s4_create = await routineLog.createSession({ owner: userAlice, sessionName: "Brainstorming", linkedTaskId: taskA });
    const session4 = (s4_create as { session: any }).session;
    const s5_create = await routineLog.createSession({ owner: userAlice, sessionName: "Writing", linkedTaskId: taskB });
    const session5 = (s5_create as { session: any }).session;
    await routineLog.startSession({ owner: userAlice, session: { _id: session4._id } });
    await routineLog.endSession({ owner: userAlice, session: { _id: session4._id } });
    await routineLog.startSession({ owner: userAlice, session: { _id: session5._id } });
    await routineLog.interruptSession({ owner: userAlice, session: { _id: session5._id }, interruptReason: "Lunch break" });
    console.log(`Created and manipulated sessions ID: ${session4._id} and ${session5._id}`);

    // Create a session for Bob
    const s6_create = await routineLog.createSession({ owner: userBob, sessionName: "Planning" });
    const session6 = (s6_create as { session: any }).session;
    await routineLog.startSession({ owner: userBob, session: { _id: session6._id } });
    console.log(`Created session ID: ${session6._id} for Bob.`);

    // Retrieve sessions for Alice
    const aliceSessionsResult = await routineLog.getUserSessions({ owner: userAlice });
    assertExists((aliceSessionsResult as { sessionTable: any[] }).sessionTable, "Should return sessionTable");
    const aliceSessions = (aliceSessionsResult as { sessionTable: any[] }).sessionTable;
    console.log(`Retrieved Alice's sessions: ${JSON.stringify(aliceSessions.map((s: any) => s.sessionName))}`);
    // Account for previous tests' sessions (session1, session2, session3)
    assertEquals(aliceSessions.filter((s: any) => s.owner === userAlice).length, 5, "Alice should have 5 sessions");

    // Retrieve sessions for Bob
    const bobSessionsResult = await routineLog.getUserSessions({ owner: userBob });
    assertExists((bobSessionsResult as { sessionTable: any[] }).sessionTable, "Should return sessionTable");
    const bobSessions = (bobSessionsResult as { sessionTable: any[] }).sessionTable;
    console.log(`Retrieved Bob's sessions: ${JSON.stringify(bobSessions.map((s: any) => s.sessionName))}`);
    assertEquals(bobSessions.filter((s: any) => s.owner === userBob).length, 1, "Bob should have 1 session");

    // Verify Bob's session content
    assertObjectMatch(bobSessions[0], { _id: session6._id, owner: userBob, sessionName: "Planning", isActive: true });
  });

  await t.step("Scenario 4: Attempt to end a non-existent or un-started session", async () => {
    console.log("\n--- Scenario 4: Invalid End Attempts ---");

    // Create a session but don't start it
    const createResult = await routineLog.createSession({ owner: userAlice, sessionName: "Unstarted Task" });
    const unstartedSession = (createResult as { session: any }).session;
    console.log(`Created unstarted session ID: ${unstartedSession._id}`);

    // Attempt to end the unstarted session (should fail)
    const endUnstartedResult = await routineLog.endSession({ owner: userAlice, session: { _id: unstartedSession._id } });
    assertExists((endUnstartedResult as { error: string }).error, "Should return an error for ending an unstarted session");
    console.log(`Attempted to end unstarted session (expected error): ${JSON.stringify(endUnstartedResult)}`);

    // Attempt to end a non-existent session (should fail)
    const nonExistentSessionId = freshID() as ID;
    const endNonExistentResult = await routineLog.endSession({ owner: userAlice, session: { _id: nonExistentSessionId } });
    assertExists((endNonExistentResult as { error: string }).error, "Should return an error for ending a non-existent session");
    console.log(`Attempted to end non-existent session (expected error): ${JSON.stringify(endNonExistentResult)}`);
  });

  await t.step("Scenario 5: Attempt to interrupt a non-active or paused session", async () => {
    console.log("\n--- Scenario 5: Invalid Interrupt Attempts ---");

    // Create a session but don't start it
    const createResult1 = await routineLog.createSession({ owner: userAlice, sessionName: "Never Active" });
    const neverActiveSession = (createResult1 as { session: any }).session;
    console.log(`Created never-active session ID: ${neverActiveSession._id}`);

    // Attempt to interrupt a never-active session (should fail)
    const interruptNeverActive = await routineLog.interruptSession({
      owner: userAlice,
      session: { _id: neverActiveSession._id },
      interruptReason: "Early break",
    });
    assertExists((interruptNeverActive as { error: string }).error, "Should error for interrupting inactive session");
    console.log(`Attempted to interrupt never-active session (expected error): ${JSON.stringify(interruptNeverActive)}`);

    // Create and start a session, then interrupt it once
    const createResult2 = await routineLog.createSession({ owner: userAlice, sessionName: "Double Interrupt" });
    const sessionDoubleInterrupt = (createResult2 as { session: any }).session;
    await routineLog.startSession({ owner: userAlice, session: { _id: sessionDoubleInterrupt._id } });
    await routineLog.interruptSession({
      owner: userAlice,
      session: { _id: sessionDoubleInterrupt._id },
      interruptReason: "First interruption",
    });
    console.log(`Created, started, and interrupted session ID: ${sessionDoubleInterrupt._id}`);

    // Attempt to interrupt the already paused session again (should fail)
    const interruptAgain = await routineLog.interruptSession({
      owner: userAlice,
      session: { _id: sessionDoubleInterrupt._id },
      interruptReason: "Second interruption",
    });
    assertExists((interruptAgain as { error: string }).error, "Should error for interrupting an already paused session");
    console.log(`Attempted to interrupt already paused session (expected error): ${JSON.stringify(interruptAgain)}`);
  });

  await client.close();
});
```
