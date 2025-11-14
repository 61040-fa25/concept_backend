---
timestamp: 'Wed Oct 15 2025 17:12:44 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_171244.5cfb69f7.md]]'
content_id: 6ce2dce09124881f17480007f84bb849b045fa9f4f8ef74ed49a3f05b83c870e
---

# file: src/concepts/RoutineLog/RoutineLog.ts

```typescript
import { Collection, Db, FindAndModifyResult } from "npm:mongodb"; // Added FindAndModifyResult
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
 * purpose: Records what actually happened throughout the day as time-stamped sessions,
 * optionally linked to planned tasks. Allow users to reflect on their planned
 * schedule by comparing with logged routine sessions.
 *
 * principle: After a user starts and finishes a session, the system records its
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

    // Explicitly type result to ensure correct access to .value
    const result: FindAndModifyResult<Session> = await this.sessions.findOneAndUpdate(
      { _id: sessionId, owner, isActive: false }, // Requirements: exists, owned by owner, not active
      { $set: { start: currentTime, isActive: true } },
      { returnDocument: "after" }, // Return the updated document
    );

    if (!result.value) { // This check is now correctly typed
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

    // Explicitly type result to ensure correct access to .value
    const result: FindAndModifyResult<Session> = await this.sessions.findOneAndUpdate(
      { _id: sessionId, owner, isActive: true }, // Requirements: exists, owned by owner, currently active
      { $set: { end: currentTime, isActive: false } },
      { returnDocument: "after" },
    );

    if (!result.value) { // This check is now correctly typed
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

    // Explicitly type result to ensure correct access to .value
    const result: FindAndModifyResult<Session> = await this.sessions.findOneAndUpdate(
      { _id: sessionId, owner, isActive: true, isPaused: false }, // Requirements: exists, owned by owner, active, not paused
      { $set: { end: currentTime, isPaused: true, interruptReason: interruptReason, isActive: false } }, // Also set isActive to false as it's an end event
      { returnDocument: "after" },
    );

    if (!result.value) { // This check is now correctly typed
      console.log(`Error: interruptSession failed. Session not found, not owned by user, not active, or already paused.`);
      return { error: "Session not found, not owned by user, not active, or already paused." };
    }

    console.log(`Effect: Session ${sessionId} interrupted at ${currentTime} with reason: "${interruptReason}".`);
    return {};
  }
}
```
