---
timestamp: 'Wed Oct 15 2025 17:08:04 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_170804.3bcaf019.md]]'
content_id: ccb3b87dd7aa97b729b840bce975cc84a35981aee8d326cd6729cb1fadd40edb
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
 *   a sessionId String
 *   an isPaused Flag
 *   an isActive Flag
 *   a start TimeStamp (optional)
 *   an end TimeStamp (optional)
 *   a linkedTaskId String (optional)
 *   an interruptReason String (optional)
 */
interface Session {
  _id: SessionId; // Use _id for sessionId as it's a unique ID
  owner: User;
  sessionName: string;
  isPaused: boolean;
  isActive: boolean;
  start?: string; // ISO 8601 string for TimeStamp
  end?: string;   // ISO 8601 string for TimeStamp
  linkedTaskId?: LinkedTaskId;
  interruptReason?: string;
}

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
    const userSessions = await this.sessions.find({ owner }).toArray();

    // The 'requires' clause implies that if no sessions exist, it's an error.
    // However, returning an empty array is often more robust for queries,
    // so we'll adapt the 'requires' to "returns all sessions, or an empty set if none".
    // If we strictly follow 'requires: exists at least one session',
    // then uncomment the error handling below.
    /*
    if (userSessions.length === 0) {
      return { error: `No sessions found for user ${owner}` };
    }
    */

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
    const newSessionId = freshID();
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
      return { session: newSession };
    } catch (e) {
      console.error("Error creating session:", e);
      return { error: `Failed to create session: ${e.message}` };
    }
  }

  /**
   * startSession(owner: User, session: Session) : Empty
   * (Note: input session should only contain _id for identification)
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
    const currentTime = new Date().toISOString();

    const result = await this.sessions.findOneAndUpdate(
      { _id: sessionId, owner, isActive: false },
      { $set: { start: currentTime, isActive: true } },
      { returnDocument: "after" }, // Return the updated document
    );

    if (!result.value) {
      return { error: "Session not found, not owned by user, or already active." };
    }

    return {};
  }

  /**
   * endSession(owner: User, session: Session) : Empty
   * (Note: input session should only contain _id for identification)
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
    const currentTime = new Date().toISOString();

    const result = await this.sessions.findOneAndUpdate(
      { _id: sessionId, owner, isActive: true },
      { $set: { end: currentTime, isActive: false } },
      { returnDocument: "after" },
    );

    if (!result.value) {
      return { error: "Session not found, not owned by user, or not currently active." };
    }

    return {};
  }

  /**
   * interruptSession(owner: User, session: Session, interruptReason: String) : Empty
   * (Note: input session should only contain _id for identification)
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
    const currentTime = new Date().toISOString();

    const result = await this.sessions.findOneAndUpdate(
      { _id: sessionId, owner, isActive: true, isPaused: false },
      { $set: { end: currentTime, isPaused: true, interruptReason: interruptReason } },
      { returnDocument: "after" },
    );

    if (!result.value) {
      return { error: "Session not found, not owned by user, not active, or already paused." };
    }

    return {};
  }
}
```
