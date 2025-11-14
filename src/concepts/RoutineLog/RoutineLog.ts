import { Collection, Db } from "npm:mongodb"; // Removed FindAndModifyResult import
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { getCurrentTime } from "@utils/time.ts";

// Declare collection prefix, use concept name
const PREFIX = "RoutineLog" + ".";

// Generic types of this concept
type User = ID;
type SessionId = ID;
type LinkedTaskId = ID;
type TimeStamp = number; // Unix timestamp in milliseconds

/**
 * A set of Sessions with
 *   an owner User
 *   a sessionName String
 *   a sessionId String (unique ID)
 *   an isPaused Flag
 *   an isActive Flag
 *   an isDone Flag (whether the task was completed)
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
  isDone: boolean; // Whether the task was completed
  start?: TimeStamp; // Unix timestamp in milliseconds
  end?: TimeStamp; // Unix timestamp in milliseconds
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
   * _getUserSessions (owner: User): (sessionTable: set of Sessions)
   *
   * **requires** exists at least one session with this owner
   *
   * **effects** return ALL sessions under this owner
   */
  async _getUserSessions(
    { owner }: { owner: User },
  ): Promise<{ sessionTable: Session[] } | { error: string }> {
    console.log(`Query: _getUserSessions for owner: ${owner}`);
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
    console.log(
      `Effect: Found ${userSessions.length} sessions for owner ${owner}.`,
    );
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
    { owner, sessionName, linkedTaskId, requestId }: {
      owner: User;
      sessionName: string;
      linkedTaskId?: LinkedTaskId;
      requestId?: string;
    },
  ): Promise<{ session: Session } | { error: string }> {
    // If requestId is provided, fetch linkedTaskId from the request data
    let actualLinkedTaskId = linkedTaskId;
    if (requestId && !linkedTaskId) {
      try {
        const requestDoc = await this.db.collection("Requesting.requests").findOne({ _id: requestId });
        actualLinkedTaskId = (requestDoc as any)?.input?.linkedTaskId || undefined;
      } catch (e) {
        console.error("Failed to fetch linkedTaskId from request:", e);
      }
    }

    console.log(
      `Action: createSession by owner: ${owner}, name: "${sessionName}", linkedTaskId: ${
        actualLinkedTaskId || "None"
      }`,
    );
    const newSessionId = freshID() as SessionId;
    const newSession: Session = {
      _id: newSessionId,
      owner,
      sessionName,
      isPaused: false,
      isActive: false,
      isDone: false,
      start: undefined,
      end: undefined,
      linkedTaskId: actualLinkedTaskId,
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
  async startSession(
    { owner, session }: {
      owner: User;
      session: { _id: SessionId };
    },
  ): Promise<Empty | { error: string }> {
    console.log(
      `Action: startSession for owner: ${owner}, session:`, session,
    );
    const sessionId = session._id;
    console.log(`Extracted sessionId: ${sessionId}`);
    const currentTime = getCurrentTime();

    // The result is inferred as WithId<Session> | null by Deno's npm:mongodb types.
    const result = await this.sessions.findOneAndUpdate(
      { _id: sessionId, owner, isActive: false }, // Requirements: exists, owned by owner, not active
      { $set: { start: currentTime, isActive: true } },
      { returnDocument: "after" }, // Return the updated document
    );

    if (!result) { // Check if result itself is null (no document found/updated)
      console.log(
        `Error: startSession failed. Session not found, not owned by user, or already active.`,
      );
      return {
        error: "Session not found, not owned by user, or already active.",
      };
    }

    console.log(`Effect: Session ${sessionId} started at ${currentTime}.`);
    return {};
  }

  /**
   * endSession(owner: User, session: { _id: SessionId }, isDone: Flag): Empty
   *
   * **requires**
   *   session exists and is owned by owner and has isActive as True
   *
   * **effects**
   *   get the current TimeStamp;
   *   set session.end = current TimeStamp;
   *   set session.isActive as False;
   *   set session.isDone = isDone;
   */
  async endSession(
    { owner, session: { _id: sessionId }, isDone }: {
      owner: User;
      session: { _id: SessionId };
      isDone: boolean;
    },
  ): Promise<Empty | { error: string }> {
    console.log(
      `Action: endSession for owner: ${owner}, sessionId: ${sessionId}, isDone: ${isDone}`,
    );
    const currentTime = getCurrentTime();

    // The result is inferred as WithId<Session> | null by Deno's npm:mongodb types.
    const result = await this.sessions.findOneAndUpdate(
      { _id: sessionId, owner, isActive: true }, // Requirements: exists, owned by owner, currently active
      { $set: { end: currentTime, isActive: false, isDone: isDone } },
      { returnDocument: "after" },
    );

    if (!result) { // Check if result itself is null (no document found/updated)
      console.log(
        `Error: endSession failed. Session not found, not owned by user, or not currently active.`,
      );
      return {
        error: "Session not found, not owned by user, or not currently active.",
      };
    }

    console.log(`Effect: Session ${sessionId} ended at ${currentTime} with isDone: ${isDone}.`);
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
    { owner, session: { _id: sessionId }, interruptReason }: {
      owner: User;
      session: { _id: SessionId };
      interruptReason: string;
    },
  ): Promise<Empty | { error: string }> {
    console.log(
      `Action: interruptSession for owner: ${owner}, sessionId: ${sessionId}, reason: "${interruptReason}"`,
    );
    const currentTime = getCurrentTime();

    // The result is inferred as WithId<Session> | null by Deno's npm:mongodb types.
    const result = await this.sessions.findOneAndUpdate(
      { _id: sessionId, owner, isActive: true, isPaused: false }, // Requirements: exists, owned by owner, active, not paused
      {
        $set: {
          end: currentTime,
          isPaused: true,
          interruptReason: interruptReason,
          isActive: false,
          isDone: false, // Interrupted sessions are not done
        },
      }, // Also set isActive to false as it's an end event
      { returnDocument: "after" },
    );

    if (!result) { // Check if result itself is null (no document found/updated)
      console.log(
        `Error: interruptSession failed. Session not found, not owned by user, not active, or already paused.`,
      );
      return {
        error:
          "Session not found, not owned by user, not active, or already paused.",
      };
    }

    console.log(
      `Effect: Session ${sessionId} interrupted at ${currentTime} with reason: "${interruptReason}".`,
    );
    return {};
  }

  /**
   * deleteSession(owner: User, session: { _id: SessionId }): Empty
   *
   * **requires**
   *   session exists and is owned by owner
   *
   * **effects**
   *   delete the session from the database
   */
  async deleteSession(
    { owner, session: { _id: sessionId } }: {
      owner: User;
      session: { _id: SessionId };
    },
  ): Promise<Empty | { error: string }> {
    console.log(
      `Action: deleteSession for owner: ${owner}, sessionId: ${sessionId}`,
    );

    const result = await this.sessions.deleteOne({ _id: sessionId, owner });

    if (result.deletedCount === 0) {
      console.log(
        `Error: deleteSession failed. Session not found or not owned by user.`,
      );
      return {
        error: "Session not found or not owned by user.",
      };
    }

    console.log(`Effect: Session ${sessionId} deleted.`);
    return {};
  }

  /**
   * completeTask(owner: User, sessionName: String, linkedTaskId: String): Empty
   *
   * **requires**
   *   session exists with matching (owner, sessionName, linkedTaskId)
   *
   * **effects**
   *   set session.isDone as True
   */
  async completeTask(
    { owner, sessionName, linkedTaskId }: {
      owner: User;
      sessionName: string;
      linkedTaskId: LinkedTaskId;
    },
  ): Promise<Empty | { error: string }> {
    console.log(
      `Action: completeTask for owner: ${owner}, sessionName: "${sessionName}", linkedTaskId: ${linkedTaskId}`,
    );

    const result = await this.sessions.findOneAndUpdate(
      { owner, sessionName, linkedTaskId }, // Requirements: matching session
      { $set: { isDone: true } },
      { returnDocument: "after" },
    );

    if (!result) {
      console.log(
        `Error: completeTask failed. Session not found with matching owner, sessionName, and linkedTaskId.`,
      );
      return {
        error: "Session not found with matching owner, sessionName, and linkedTaskId.",
      };
    }

    console.log(`Effect: Session marked as complete (isDone=true).`);
    return {};
  }

  /**
   * migrateExistingSessions(): Empty
   *
   * **effects**
   *   Set isDone=true for all sessions that don't have isDone field (existing sessions)
   *   Additionally, set isDone=true for all sessions with linkedTaskId
   */
  async migrateExistingSessions(): Promise<{ updated: number } | { error: string }> {
    console.log('Migration: Setting isDone=true for all existing sessions');

    try {
      // Update sessions without isDone field
      const result1 = await this.sessions.updateMany(
        { isDone: { $exists: false } },
        { $set: { isDone: true } }
      );

      // Update all sessions with linkedTaskId to have isDone=true
      const result2 = await this.sessions.updateMany(
        { linkedTaskId: { $exists: true, $ne: null } },
        { $set: { isDone: true } }
      );

      const totalUpdated = result1.modifiedCount + result2.modifiedCount;
      console.log(`Migration: Updated ${totalUpdated} sessions total (${result1.modifiedCount} missing isDone, ${result2.modifiedCount} with linkedTaskId)`);
      return { updated: totalUpdated };
    } catch (error: any) {
      console.error('Migration error:', error);
      return { error: `Migration failed: ${error.message}` };
    }
  }
}
