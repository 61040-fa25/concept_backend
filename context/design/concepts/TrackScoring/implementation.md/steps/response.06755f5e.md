---
timestamp: 'Thu Oct 16 2025 22:17:39 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_221739.8130b691.md]]'
content_id: 06755f5ef9696addbe4b313f47ee0ef58dbb6abfa586fbf8cb4fd7061310fd30
---

# response:

An implementation of the `TrackScoring` concept as a TypeScript class.

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts";

// #################################################################################
// CONCEPT: TrackScoring
// #################################################################################

const PREFIX = "TrackScoring" + ".";

// Generic types for this concept
type User = ID;
type Track = ID;

/**
 * A set of `Weights` with
 *  a `userId` of type `User`
 *  a `lastPlayedW` of type `Number`
 *  a `likedWhenW` of type `Number`
 *  a `timesSkippedW` of type `Number`
 *  a `updatedAt`timestamp of type `Number`
 */
interface Weights {
  _id: User; // We will use userId as the primary key for this collection
  lastPlayedW: number;
  likedWhenW: number;
  timesSkippedW: number;
  updatedAt: number;
}

/**
 * A set of `Boosts` with
 *  a `userId` of type `User`
 *  a `trackId` of type `Track`
 *  an `amount` of type `Number`
 */
interface Boosts {
  userId: User;
  trackId: Track;
  amount: number;
}

/**
 * A set of `Snoozes` with
 *  a `userId` of type `User`
 *  a `trackId` of type `Track`
 *  a `untilAt` of type `Number`
 */
interface Snoozes {
  userId: User;
  trackId: Track;
  untilAt: number;
}

/**
 * A set of `Scores` with
 *  a `userId` of type `User`
 *  a `trackId` of type `Track`
 *  a `score` of type `Number` (0 - 100)
 *  a `updatedAt` timestamp of type `Number`
 */
interface Scores {
  userId: User;
  trackId: Track;
  score: number;
  updatedAt: number;
}

/**
 * A set of `Stats` with
 *  a `userId` of type `User`
 *  a `trackId` of type `Track`
 *  a `lastPlayedAt` of type `Number`
 *  a `likedAt` of type `Number`
 *  a `timesSkipped` of type `Number`
 */
interface Stats {
  userId: User;
  trackId: Track;
  lastPlayedAt: number;
  likedAt: number;
  timesSkipped: number;
}

/**
 * @concept TrackScoring [User]
 * @purpose Compute a staleness score for each track in a user's liked song catalog and manage boosts/snoozes for resurfacing
 * @principle After fetching a user's liked song catalog (per-track stats and user's weights), concept score tracks in terms of "staleness", and lists candidates possibly.
 */
export default class TrackScoringConcept {
  public readonly weights: Collection<Weights>;
  public readonly boosts: Collection<Boosts>;
  public readonly snoozes: Collection<Snoozes>;
  public readonly scores: Collection<Scores>;
  public readonly stats: Collection<Stats>;

  constructor(private readonly db: Db) {
    this.weights = this.db.collection(PREFIX + "weights");
    this.boosts = this.db.collection(PREFIX + "boosts");
    this.snoozes = this.db.collection(PREFIX + "snoozes");
    this.scores = this.db.collection(PREFIX + "scores");
    this.stats = this.db.collection(PREFIX + "stats");
  }

  /**
   * Updates the scoring weights for a given user.
   * @requires userId exists, valid weights
   * @effects Updates the weights for userId, updates updatedAt
   */
  async updateWeights(
    { userId, lastPlayedW, likedWhenW, timesSkippedW }: { userId: User; lastPlayedW: number; likedWhenW: number; timesSkippedW: number },
  ): Promise<Empty | { error: string }> {
    if (typeof lastPlayedW !== "number" || typeof likedWhenW !== "number" || typeof timesSkippedW !== "number") {
      return { error: "Invalid weight values provided." };
    }

    await this.weights.updateOne(
      { _id: userId },
      { $set: { lastPlayedW, likedWhenW, timesSkippedW, updatedAt: Date.now() } },
      { upsert: true },
    );

    return {};
  }

  /**
   * Updates the playback statistics for a user-track pair.
   * @requires userId and trackId exist, valid number values
   * @effects Updates stats for userid, trackid pair.
   */
  async updateStats(
    { userId, trackId, lastPlayedAt, likedAt, timesSkipped }: { userId: User; trackId: Track; lastPlayedAt: number; likedAt: number; timesSkipped: number },
  ): Promise<Empty | { error: string }> {
    if (typeof lastPlayedAt !== "number" || typeof likedAt !== "number" || typeof timesSkipped !== "number") {
      return { error: "Invalid stat values provided." };
    }

    await this.stats.updateOne(
      { userId, trackId },
      { $set: { lastPlayedAt, likedAt, timesSkipped } },
      { upsert: true },
    );
    return {};
  }

  /**
   * Computes, stores, and returns a staleness score for a track.
   * @requires Weights and Stats exist for the user and track.
   * @effects Computes and returns a score for a track from 0-100 using the Weights and Stats. Updates scores.
   */
  async score(
    { userId, trackId }: { userId: User; trackId: Track },
  ): Promise<{ score: number } | { error: string }> {
    const weights = await this.weights.findOne({ _id: userId });
    if (!weights) {
      return { error: `Weights not found for user ${userId}` };
    }

    const stats = await this.stats.findOne({ userId, trackId });
    if (!stats) {
      return { error: `Stats not found for user ${userId} and track ${trackId}` };
    }

    // Check if the track is currently snoozed
    const snooze = await this.snoozes.findOne({ userId, trackId });
    if (snooze && snooze.untilAt > Date.now()) {
      await this.scores.updateOne({ userId, trackId }, { $set: { score: 0, updatedAt: Date.now() } }, { upsert: true });
      return { score: 0 };
    }

    const boost = await this.boosts.findOne({ userId, trackId });
    const boostAmount = boost ? boost.amount : 0;

    // A simple scoring algorithm. This would be tuned in a real application.
    // Score is based on weighted days since last played/liked, minus penalties for skips, plus boosts.
    const now = Date.now();
    const daysSincePlayed = (now - stats.lastPlayedAt) / (1000 * 60 * 60 * 24);
    const daysSinceLiked = (now - stats.likedAt) / (1000 * 60 * 60 * 24);

    const rawScore = (weights.lastPlayedW * daysSincePlayed) +
      (weights.likedWhenW * daysSinceLiked) -
      (weights.timesSkippedW * stats.timesSkipped) +
      (boostAmount * 10); // Each boost point adds 10 to the raw score

    // Clamp score between 0 and 100
    const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    await this.scores.updateOne(
      { userId, trackId },
      { $set: { score: finalScore, updatedAt: now } },
      { upsert: true },
    );

    return { score: finalScore };
  }

  /**
   * Returns a list of track IDs sorted by staleness score.
   * @requires Scores exist for userId. If size is provided, it's a positive number.
   * @effects Returns trackIds sorted by their score in descending order. If size is omitted, present top 50.
   */
  async preview(
    { userId, size }: { userId: User; size?: number },
  ): Promise<{ trackIds: string[] } | { error: string }> {
    const limit = size ?? 50;
    if (limit <= 0) {
      return { error: "Size must be a positive number." };
    }

    const sortedScores = await this.scores
      .find({ userId })
      .sort({ score: -1 })
      .limit(limit)
      .toArray();

    const trackIds = sortedScores.map((s) => s.trackId);
    return { trackIds };
  }

  /**
   * Increases the boost amount for a track, making it more likely to surface.
   * @effects Updates Boosts, increases the amount matching the userId and trackId.
   */
  async keep(
    { userId, trackId }: { userId: User; trackId: Track },
  ): Promise<Empty> {
    await this.boosts.updateOne(
      { userId, trackId },
      { $inc: { amount: 1 } },
      { upsert: true },
    );
    return {};
  }

  /**
   * Snoozes a track, temporarily giving it a score of 0.
   * @effects Updates Snoozes, and updates the untilAt to be the current snooze duration + additional specified time.
   */
  async snooze(
    { userId, trackId, until }: { userId: User; trackId: Track; until?: number },
  ): Promise<Empty> {
    const defaultSnoozeDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const untilAt = until ?? (Date.now() + defaultSnoozeDuration);

    await this.snoozes.updateOne(
      { userId, trackId },
      { $set: { untilAt } },
      { upsert: true },
    );

    // After snoozing, immediately update the score to 0
    await this.scores.updateOne(
      { userId, trackId },
      { $set: { score: 0, updatedAt: Date.now() } },
      { upsert: true },
    );

    return {};
  }
}
```
