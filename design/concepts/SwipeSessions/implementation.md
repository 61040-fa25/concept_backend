[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@SwipeSessions](SwipeSessions.md)
# implement: SwipeSessions
# constraints
Implement strictly to the existing action signatures in the spec:
DO NOT reference other concepts. Use IDs if it works.

# concept: SwipeSessions

*   **concept**: SwipeSessions [User]
*   **purpose**: Run deterministic swipe sessions over a queued set of tracks and record user decisions locally. Informally, run lightweight "Memory Card" sessions on tracks! Present different snippets of tracks and record user's decision to keep/snooze/add.
*   **principle**: A user decides to go into Session Swipe mode, this pulls songs from their Liked Song catalog and presents them in a Tiktok/Memory Card format where they can listen to a snippet of a track and swipe left to keep, swipe right to snooze, or swipe up to add the song to a playlist! Formally, a user processes a queue one-by-one and decisions are stored. External effects, such as: playlist edits or scoring updates, happen elsewhere.


*   **state**:
    *   A set of `Sessions` with
        *   a `sessionId` of type `Author`
        *   a `userId` of type `String`
        *   a `queueTracks` of type `String[]`
        *   a `queueIndex` of type `Number`
        *   a `startedAt` of type `Number`
    *   A set of `Decisions` with
        *   a `decisionId` of type `String`
        *   a `sessionId` of type `String`
        *   a `trackId` of type `String`
        *   a `kind` of type `String` ("keep" | "snooze" | "add" | "create")
        *   a `arg` of type `String`
    *  
*   **actions**:
    *   `start(userId: String, queueTracks: String[], size?: Number): (sessionId: String)`
        *   **requires**: non-empty userId. If size, queueTracks.length >= size.
        *   **effects**: Creates session with queue of tracks (possibly truncated to size), index set to 0, returns to sessionId
    *   `next(sessionId: String): (trackId: String)`
        *   **requires**: session exists
        *   **effects**: returns queueTracks[queueIndex] if exists, and increments cursor. returns `-1` when finished
    *   `decideKeep (sessionId: String, trackId: String): (decisionId: String)`
        *   **requires**: Sessions exists, trackId equals last value returned by next.
        *   **effects**: inserts into decisions with kind = 'keep', respective arg, return decisionId
    *   `decideSnooze (sessionId: String, trackId: String, untilAt?: Number): (decisionId: String)`
        *   **requires**: Sessions exists, trackId equals last value returned by next.
        *   **effects**: inserts into decisions with kind = 'snooze', respective arg, return decisionId
    *   `decideAddToPlaylist(sessionId: String, trackId: String, playlistId: String): (decisionId: String)`
        *   **requires**: Sessions exists, trackId equals last value returned by next.
        *   **effects**: inserts into decisions with kind = 'add', respective arg, return decisionId
    *   `decideCreatePlaylist(sessionId: String, trackId: String, playlistTitle: String): (decisionId: String)`
        *   **requires**: Sessions exists, trackId equals last value returned by next.
        *   **effects**: inserts into decisions with kind = 'create', respective arg, return decisionId
    *   `end(sessionId: String): (ended: Boolean)`
        *   **requires**: Sessions exists and not already ended
        *   **effects**: returns true if state changes, false ow

# response:

# file: src/swipesessions/SwipeSessionsConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { freshID } from "../utils/database.ts";
import { ID } from "../utils/types.ts";

// Generic types of this concept
export type User = ID;

const PREFIX = "SwipeSessions" + ".";

/**
 * Represents a single swipe session initiated by a user.
 * a set of `Sessions` with
 *  a `sessionId` of type `ID` (as `_id`)
 *  a `userId` of type `User`
 *  a `queueTracks` of type `String[]`
 *  a `queueIndex` of type `Number`
 *  a `startedAt` of type `Number`
 */
interface Session {
  _id: ID;
  userId: User;
  queueTracks: string[];
  queueIndex: number;
  startedAt: number;
}

/**
 * The kind of decision made by a user for a track.
 */
type DecisionKind = "keep" | "snooze" | "add" | "create";

/**
 * Represents a user's decision on a track within a session.
 * a set of `Decisions` with
 *  a `decisionId` of type `ID` (as `_id`)
 *  a `sessionId` of type `ID`
 *  a `trackId` of type `String`
 *  a `kind` of type `DecisionKind`
 *  a `arg` of type `String` (context-dependent based on `kind`)
 */
interface Decision {
  _id: ID;
  sessionId: ID;
  trackId: string;
  kind: DecisionKind;
  arg: string;
}

/**
 * @concept SwipeSessions [User]
 * @purpose Run deterministic swipe sessions over a queued set of tracks and record user decisions locally.
 *          Informally, run lightweight "Memory card" sessions on tracks! Present different snippets
 *          of tracks and record user's decision to keep/snooze/add.
 */
export default class SwipeSessionsConcept {
  public readonly sessions: Collection<Session>;
  public readonly decisions: Collection<Decision>;

  constructor(private readonly db: Db) {
    this.sessions = this.db.collection(PREFIX + "sessions");
    this.decisions = this.db.collection(PREFIX + "decisions");
  }

  /**
   * Starts a new swipe session for a user.
   * @param userId - The ID of the user starting the session.
   * @param queueTracks - The list of track IDs for the session.
   * @param size - Optional number to truncate the queue of tracks.
   * @returns The ID of the newly created session, or an error.
   * @requires non-empty userId. If size is provided, queueTracks.length must be >= size.
   * @effects Creates a session with a queue of tracks (possibly truncated), sets the index to 0, and returns the sessionId.
   */
  async start({ userId, queueTracks, size }: { userId: User; queueTracks: string[]; size?: number }): Promise<{ sessionId: ID } | { error: string }> {
    if (!userId) {
      return { error: "User ID cannot be empty" };
    }

    const tracks = size ? queueTracks.slice(0, size) : queueTracks;
    if (size && queueTracks.length < size) {
      return { error: `queueTracks length (${queueTracks.length}) is less than the requested size (${size})` };
    }

    const session: Session = {
      _id: freshID(),
      userId,
      queueTracks: tracks,
      queueIndex: 0,
      startedAt: Date.now(),
    };

    await this.sessions.insertOne(session);
    return { sessionId: session._id };
  }

  /**
   * Retrieves the next track in the session's queue.
   * @param sessionId - The ID of the session.
   * @returns The next track ID, "-1" if the session is complete, or an error.
   * @requires session exists.
   * @effects Returns queueTracks[queueIndex] if it exists and increments the cursor. Returns "-1" when finished.
   */
  async next({ sessionId }: { sessionId: ID }): Promise<{ trackId: string } | { error: string }> {
    const session = await this.sessions.findOne({ _id: sessionId });
    if (!session) {
      return { error: "Session not found" };
    }

    if (session.queueIndex >= session.queueTracks.length) {
      return { trackId: "-1" };
    }

    const trackId = session.queueTracks[session.queueIndex];

    await this.sessions.updateOne({ _id: sessionId }, { $inc: { queueIndex: 1 } });

    return { trackId };
  }

  /**
   * Records a 'keep' decision for the current track in a session.
   * @param sessionId - The ID of the session.
   * @param trackId - The ID of the track the decision is for.
   * @returns The ID of the new decision, or an error.
   * @requires Session exists, and trackId equals the last value returned by next().
   * @effects Inserts a decision with kind = 'keep' and returns the decisionId.
   */
  async decideKeep({ sessionId, trackId }: { sessionId: ID; trackId: string }): Promise<{ decisionId: ID } | { error: string }> {
    return this._makeDecision(sessionId, trackId, "keep", "");
  }

  /**
   * Records a 'snooze' decision for the current track in a session.
   * @param sessionId - The ID of the session.
   * @param trackId - The ID of the track the decision is for.
   * @param untilAt - Optional timestamp until which the track is snoozed.
   * @returns The ID of the new decision, or an error.
   * @requires Session exists, and trackId equals the last value returned by next().
   * @effects Inserts a decision with kind = 'snooze', using untilAt as the arg, and returns the decisionId.
   */
  async decideSnooze({ sessionId, trackId, untilAt }: { sessionId: ID; trackId: string; untilAt?: number }): Promise<{ decisionId: ID } | { error: string }> {
    return this._makeDecision(sessionId, trackId, "snooze", untilAt?.toString() ?? "");
  }

  /**
   * Records a decision to add the current track to an existing playlist.
   * @param sessionId - The ID of the session.
   * @param trackId - The ID of the track.
   * @param playlistId - The ID of the playlist to add the track to.
   * @returns The ID of the new decision, or an error.
   * @requires Session exists, and trackId equals the last value returned by next().
   * @effects Inserts a decision with kind = 'add', using playlistId as the arg, and returns the decisionId.
   */
  async decideAddToPlaylist({ sessionId, trackId, playlistId }: { sessionId: ID; trackId: string; playlistId: string }): Promise<{ decisionId: ID } | { error: string }> {
    return this._makeDecision(sessionId, trackId, "add", playlistId);
  }

  /**
   * Records a decision to create a new playlist with the current track.
   * @param sessionId - The ID of the session.
   * @param trackId - The ID of the track.
   * @param playlistTitle - The title for the new playlist.
   * @returns The ID of the new decision, or an error.
   * @requires Session exists, and trackId equals the last value returned by next().
   * @effects Inserts a decision with kind = 'create', using playlistTitle as the arg, and returns the decisionId.
   */
  async decideCreatePlaylist({ sessionId, trackId, playlistTitle }: { sessionId: ID; trackId: string; playlistTitle: string }): Promise<{ decisionId: ID } | { error: string }> {
    return this._makeDecision(sessionId, trackId, "create", playlistTitle);
  }

  /**
   * Ends a session, effectively deleting it.
   * @param sessionId - The ID of the session to end.
   * @returns A boolean indicating if the state changed, or an error.
   * @requires Session exists and has not already been ended (deleted).
   * @effects Deletes the session. Returns true if a state change occurred (session was deleted), false otherwise.
   */
  async end({ sessionId }: { sessionId: ID }): Promise<{ ended: boolean }> {
    const result = await this.sessions.deleteOne({ _id: sessionId });
    return { ended: result.deletedCount === 1 };
  }

  /**
   * A private helper method to validate and create a decision.
   * @private
   */
  private async _makeDecision(sessionId: ID, trackId: string, kind: DecisionKind, arg: string): Promise<{ decisionId: ID } | { error: string }> {
    const session = await this.sessions.findOne({ _id: sessionId });

    if (!session) {
      return { error: "Session not found" };
    }

    // A decision can only be made after `next()` has been called at least once.
    if (session.queueIndex === 0) {
      return { error: "No track has been presented yet. Call next() first." };
    }

    const currentTrackId = session.queueTracks[session.queueIndex - 1];
    if (trackId !== currentTrackId) {
      return { error: `Track ID mismatch. Expected ${currentTrackId}, but got ${trackId}.` };
    }

    const decision: Decision = {
      _id: freshID(),
      sessionId,
      trackId,
      kind,
      arg,
    };

    await this.decisions.insertOne(decision);
    return { decisionId: decision._id };
  }
}
```