---
timestamp: 'Thu Oct 16 2025 23:08:47 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_230847.27923d1d.md]]'
content_id: 850f328f2937104be4579b9a99fa253ba16409134ed10acdbdc44e1da3c165f5
---

# file: src/swipesessions/SwipeSessionsConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, freshID } from "@utils/types.ts";

// Using branded types for better type safety, even though they are strings underneath.
export type User = ID;
export type Session = ID;
export type Decision = ID;
export type Track = ID;
export type Playlist = ID;

const PREFIX = "SwipeSessions" + ".";

/**
 * @State
 * a set of `Sessions` with
 * a `sessionId` of type `ID` (represented as _id)
 * a `userId` of type `User`
 * a `queueTracks` of type `Track[]`
 * a `queueIndex` of type `Number`
 * a `startedAt` of type `Number`
 * an `endedAt` of type `Number | null` to track if the session is complete
 */
interface SessionDoc {
  _id: Session;
  userId: User;
  queueTracks: Track[];
  queueIndex: number;
  startedAt: number;
  endedAt: number | null;
}

/**
 * @State
 * A set of `Decisions` with
 * a `decisionId` of type `ID` (represented as _id)
 * a `sessionId` of type `Session`
 * a `trackId` of type `Track`
 * a `kind` of type `String` ("keep" | "snooze" | "add" | "create")
 * an `arg` of type `String` (for extra data like playlist IDs or snooze times)
 */
interface DecisionDoc {
  _id: Decision;
  sessionId: Session;
  trackId: Track;
  kind: "keep" | "snooze" | "add" | "create";
  arg: string;
}

/**
 * @concept SwipeSessions [User]
 * @purpose Run deterministic swipe sessions over a queued set of tracks and record user decisions locally.
 */
export default class SwipeSessionsConcept {
  sessions: Collection<SessionDoc>;
  decisions: Collection<DecisionDoc>;

  constructor(private readonly db: Db) {
    this.sessions = this.db.collection(PREFIX + "sessions");
    this.decisions = this.db.collection(PREFIX + "decisions");
  }

  /**
   * Creates a new swipe session.
   * @requires non-empty userId. If size is provided, queueTracks.length must be >= size.
   * @effects Creates a session with a queue of tracks (possibly truncated), sets index to 0, and returns the sessionId.
   */
  async start({ userId, queueTracks, size }: { userId: User; queueTracks: Track[]; size?: number }): Promise<{ sessionId: Session } | { error: string }> {
    if (!userId) {
      return { error: "userId cannot be empty" };
    }
    if (size !== undefined && queueTracks.length < size) {
      return { error: `queueTracks length (${queueTracks.length}) is less than requested size (${size})` };
    }

    const sessionTracks = size === undefined ? queueTracks : queueTracks.slice(0, size);
    if (sessionTracks.length === 0) {
      return { error: "queueTracks cannot be empty" };
    }

    const sessionId = freshID() as Session;
    const sessionDoc: SessionDoc = {
      _id: sessionId,
      userId,
      queueTracks: sessionTracks,
      queueIndex: 0,
      startedAt: Date.now(),
      endedAt: null,
    };

    await this.sessions.insertOne(sessionDoc);
    return { sessionId };
  }

  /**
   * Retrieves the next track in the session queue.
   * @requires Session with sessionId must exist and not be ended.
   * @effects Returns the trackId at the current queueIndex and then increments the index. Returns "-1" if the queue is finished.
   */
  async next({ sessionId }: { sessionId: Session }): Promise<{ trackId: Track | "-1" } | { error: string }> {
    const session = await this.sessions.findOne({ _id: sessionId });
    if (!session) {
      return { error: `Session with id ${sessionId} not found` };
    }
    if (session.endedAt) {
      return { error: `Session with id ${sessionId} has already ended` };
    }

    if (session.queueIndex >= session.queueTracks.length) {
      return { trackId: "-1" };
    }

    const trackId = session.queueTracks[session.queueIndex];
    await this.sessions.updateOne({ _id: sessionId }, { $inc: { queueIndex: 1 } });

    return { trackId };
  }

  /**
   * Private helper to create a decision, ensuring all requirements are met.
   */
  private async _makeDecision({ sessionId, trackId, kind, arg }: { sessionId: Session; trackId: Track; kind: DecisionDoc["kind"]; arg?: string | number | null }): Promise<{ decisionId: Decision } | { error: string }> {
    const session = await this.sessions.findOne({ _id: sessionId });

    // requires: Session exists
    if (!session) {
      return { error: `Session with id ${sessionId} not found` };
    }
    if (session.endedAt) {
      return { error: `Session with id ${sessionId} has already ended` };
    }

    // requires: trackId equals last value returned by next
    // The current track for a decision is at `queueIndex - 1` because `next` has already incremented the index.
    const currentTrackIndex = session.queueIndex - 1;
    if (currentTrackIndex < 0 || session.queueTracks[currentTrackIndex] !== trackId) {
      return { error: `TrackId ${trackId} does not match the current track for this session.` };
    }

    // A decision for a given track in a session can only be made once.
    const existingDecision = await this.decisions.findOne({ sessionId, trackId });
    if (existingDecision) {
      return { error: `A decision for track ${trackId} in session ${sessionId} has already been made.` };
    }

    // effects: inserts into decisions
    const decisionId = freshID() as Decision;
    const decisionDoc: DecisionDoc = {
      _id: decisionId,
      sessionId,
      trackId,
      kind,
      arg: arg?.toString() ?? "",
    };
    await this.decisions.insertOne(decisionDoc);
    return { decisionId };
  }

  /**
   * Records a 'keep' decision for the current track.
   * @requires Session exists, not ended, and trackId matches the last track returned by next.
   * @effects Inserts a decision with kind='keep'. Returns decisionId.
   */
  async decideKeep({ sessionId, trackId }: { sessionId: Session; trackId: Track }): Promise<{ decisionId: Decision } | { error: string }> {
    return this._makeDecision({ sessionId, trackId, kind: "keep" });
  }

  /**
   * Records a 'snooze' decision for the current track.
   * @requires Session exists, not ended, and trackId matches the last track returned by next.
   * @effects Inserts a decision with kind='snooze' and the `untilAt` value. Returns decisionId.
   */
  async decideSnooze({ sessionId, trackId, untilAt }: { sessionId: Session; trackId: Track; untilAt?: number }): Promise<{ decisionId: Decision } | { error: string }> {
    return this._makeDecision({ sessionId, trackId, kind: "snooze", arg: untilAt });
  }

  /**
   * Records an 'add to playlist' decision for the current track.
   * @requires Session exists, not ended, and trackId matches the last track returned by next.
   * @effects Inserts a decision with kind='add' and the `playlistId`. Returns decisionId.
   */
  async decideAddToPlaylist({ sessionId, trackId, playlistId }: { sessionId: Session; trackId: Track; playlistId: Playlist }): Promise<{ decisionId: Decision } | { error: string }> {
    return this._makeDecision({ sessionId, trackId, kind: "add", arg: playlistId });
  }

  /**
   * Records a 'create playlist' decision for the current track.
   * @requires Session exists, not ended, and trackId matches the last track returned by next.
   * @effects Inserts a decision with kind='create' and the `playlistTitle`. Returns decisionId.
   */
  async decideCreatePlaylist({ sessionId, trackId, playlistTitle }: { sessionId: Session; trackId: Track; playlistTitle: string }): Promise<{ decisionId: Decision } | { error: string }> {
    return this._makeDecision({ sessionId, trackId, kind: "create", arg: playlistTitle });
  }

  /**
   * Ends a session.
   * @requires Session exists and is not already ended.
   * @effects Marks the session as ended. Returns true if the state changed, false otherwise.
   */
  async end({ sessionId }: { sessionId: Session }): Promise<{ ended: boolean } | { error: string }> {
    const session = await this.sessions.findOne({ _id: sessionId });

    // requires: Session exists
    if (!session) {
      return { error: `Session with id ${sessionId} not found` };
    }

    // requires: not already ended
    if (session.endedAt) {
      return { ended: false };
    }

    // effects: returns true if state changes
    const result = await this.sessions.updateOne({ _id: sessionId, endedAt: null }, { $set: { endedAt: Date.now() } });
    return { ended: result.modifiedCount > 0 };
  }

  // Queries for testing and inspection
  async _getSession(sessionId: Session) {
    return this.sessions.findOne({ _id: sessionId });
  }

  async _getDecisionsForSession(sessionId: Session) {
    return this.decisions.find({ sessionId }).toArray();
  }
}
```
