---
timestamp: 'Thu Oct 16 2025 23:14:09 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_231409.7a7069c7.md]]'
content_id: fe53f74a774ab67565af2dedd95f1b673c354fa10a634a8f980f5e0bfc77dbf3
---

# file: src/TrackScoring/TrackScoringConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

// The generic type parameters for this concept.
type User = ID;
type Track = ID;

const PREFIX = "TrackScoring" + ".";

// #region State Type Declarations

/**
 * A set of `Weights` with
 * - a `userId` of type `String`
 * - a `lastPlayedW` of type `Number`
 * - a `likedWhenW` of type `Number`
 * - a `timesSkippedW` of type `Number`
 * - a `updatedAt`timestamp of type `Number`
 */
interface WeightsDoc {
  userId: User;
  lastPlayedW: number;
  likedWhenW: number;
  timesSkippedW: number;
  updatedAt: number;
}

/**
 * A set of `Boosts` with
 * - a `userId` of type `String`
 * - a `trackId` of type `String`
 * - an `amount` of type `Number`
 */
interface BoostsDoc {
  userId: User;
  trackId: Track;
  amount: number;
}

/**
 * A set of `Snoozes` with
 * - a `userId` of type `String`
 * - a `trackId` of type `String`
 * - a `untilAt` of type `Number`
 */
interface SnoozesDoc {
  userId: User;
  trackId: Track;
  untilAt: number;
}

/**
 * A set of `Scores` with
 * - a `userId` of type `User`
 * - a `trackId` of type `String`
 * - a `score` of type `Number` (0 - 100)
 * - a `updatedAt` timestamp of type `Number`
 */
interface ScoresDoc {
  userId: User;
  trackId: Track;
  score: number;
  updatedAt: number;
}

/**
 * A set of `Stats` with
 * - a `userId` of type `String`
 * - a `trackId` of type `String`
 * - a `lastPlayedAt` of type `Number`
 * - a `likedAt` of type `Number`
 * - a `timesSkipped` of type `Number`
 */
interface StatsDoc {
  userId: User;
  trackId: Track;
  lastPlayedAt: number;
  likedAt: number;
  timesSkipped: number;
}

// #endregion

/**
 * @concept TrackScoring [User]
 * @purpose Compute a staleness score for each track in a user's liked song catalog and manage boosts/snoozes for resurfacing
 */
export default class TrackScoringConcept {
  private readonly weights: Collection<WeightsDoc>;
  private readonly boosts: Collection<BoostsDoc>;
  private readonly snoozes: Collection<SnoozesDoc>;
  private readonly scores: Collection<ScoresDoc>;
  private readonly stats: Collection<StatsDoc>;

  constructor(private readonly db: Db) {
    this.weights = db.collection<WeightsDoc>(PREFIX + "weights");
    this.boosts = db.collection<BoostsDoc>(PREFIX + "boosts");
    this.snoozes = db.collection<SnoozesDoc>(PREFIX + "snoozes");
    this.scores = db.collection<ScoresDoc>(PREFIX + "scores");
    this.stats = db.collection<StatsDoc>(PREFIX + "stats");
  }

  /**
   * Updates the scoring weights for a given user.
   * @param userId The user to update weights for.
   * @param lastPlayedW Weight for how long ago a track was last played.
   * @param likedWhenW Weight for how long ago a track was liked.
   * @param timesSkippedW Weight for the number of times a track was skipped.
   * @requires userId exists, valid weights
   * @effects Updates the weights for userId, updates updatedAt timestamp
   */
  async updateWeights({ userId, lastPlayedW, likedWhenW, timesSkippedW }: { userId: User; lastPlayedW: number; likedWhenW: number; timesSkippedW: number }): Promise<Empty | { error: string }> {
    if (!userId || lastPlayedW == null || likedWhenW == null || timesSkippedW == null) {
      return { error: "Invalid input: userId and all weights must be provided." };
    }

    await this.weights.updateOne(
      { userId },
      {
        $set: {
          userId,
          lastPlayedW,
          likedWhenW,
          timesSkippedW,
          updatedAt: Date.now(),
        },
      },
      { upsert: true },
    );

    return {};
  }

  /**
   * Updates the playback statistics for a user-track pair.
   * @param userId The user associated with the stats.
   * @param trackId The track associated with the stats.
   * @param lastPlayedAt Timestamp when the track was last played.
   * @param likedAt Timestamp when the track was liked.
   * @param timesSkipped Total number of times the track has been skipped.
   * @requires userId and trackId exist, valid number values
   * @effects Updates stats for the user-track pair.
   */
  async updateStats({ userId, trackId, lastPlayedAt, likedAt, timesSkipped }: { userId: User; trackId: Track; lastPlayedAt: number; likedAt: number; timesSkipped: number }): Promise<Empty | { error: string }> {
    if (!userId || !trackId || lastPlayedAt == null || likedAt == null || timesSkipped == null) {
      return { error: "Invalid input: userId, trackId and all stats must be provided." };
    }

    await this.stats.updateOne(
      { userId, trackId },
      {
        $set: {
          userId,
          trackId,
          lastPlayedAt,
          likedAt,
          timesSkipped,
        },
      },
      { upsert: true },
    );

    return {};
  }

  /**
   * Computes, stores, and returns a staleness score for a given track.
   * @param userId The user for whom to calculate the score.
   * @param trackId The track to score.
   * @returns The computed score between 0 and 100.
   * @requires Weights and Stats must exist for the user and track.
   * @effects Computes and returns a score for a track from 0-100 using the Weights and Stats. Updates the Scores collection.
   */
  async score({ userId, trackId }: { userId: User; trackId: Track }): Promise<{ score: number } | { error: string }> {
    const weights = await this.weights.findOne({ userId });
    if (!weights) {
      return { error: `Weights not found for user ${userId}` };
    }

    const stats = await this.stats.findOne({ userId, trackId });
    if (!stats) {
      return { error: `Stats not found for user ${userId} and track ${trackId}` };
    }

    const boost = await this.boosts.findOne({ userId, trackId });
    const snooze = await this.snoozes.findOne({ userId, trackId });

    let finalScore = 0;

    if (snooze && snooze.untilAt > Date.now()) {
      finalScore = 0;
    } else {
      const lastPlayedDays = (Date.now() - stats.lastPlayedAt) / (1000 * 60 * 60 * 24);
      const likedDays = (Date.now() - stats.likedAt) / (1000 * 60 * 60 * 24);

      const rawScore = weights.lastPlayedW * lastPlayedDays + weights.likedWhenW * likedDays - weights.timesSkippedW * stats.timesSkipped;

      const boostEffect = (boost?.amount || 0) * 10;
      const finalRawScore = rawScore + boostEffect;

      const normalizedScore = 100 / (1 + Math.exp(-(finalRawScore - 180) / 90));
      finalScore = Math.round(Math.max(0, Math.min(100, normalizedScore)));
    }

    await this.scores.updateOne(
      { userId, trackId },
      {
        $set: {
          userId,
          trackId,
          score: finalScore,
          updatedAt: Date.now(),
        },
      },
      { upsert: true },
    );

    return { score: finalScore };
  }

  /**
   * Returns a list of track IDs for a user, sorted by score.
   * @param userId The user whose tracks to preview.
   * @param size The maximum number of track IDs to return. Defaults to 50.
   * @returns An array of track IDs.
   * @requires Scores exist for the user.
   * @effects Returns trackIds sorted by their score in descending order.
   */
  async preview({ userId, size = 50 }: { userId: User; size?: number }): Promise<{ trackIds: Track[] } | { error: string }> {
    if (!userId) {
      return { error: "userId must be provided" };
    }

    const scoreDocs = await this.scores
      .find(
        { userId },
        {
          sort: { score: -1 },
          limit: size,
          projection: { trackId: 1, _id: 0 },
        },
      )
      .toArray();

    const trackIds = scoreDocs.map((doc) => doc.trackId);
    return { trackIds };
  }

  /**
   * Increases the boost for a track, making it more likely to be resurfaced.
   * @param userId The user who is keeping/boosting the track.
   * @param trackId The track to boost.
   * @effects Updates Boosts, increases the amount for the user-track pair by 1.
   */
  async keep({ userId, trackId }: { userId: User; trackId: Track }): Promise<Empty | { error: string }> {
    if (!userId || !trackId) {
      return { error: "userId and trackId must be provided" };
    }

    await this.boosts.updateOne(
      { userId, trackId },
      {
        $inc: { amount: 1 },
        $setOnInsert: { userId, trackId },
      },
      { upsert: true },
    );

    return {};
  }

  /**
   * Snoozes a track for a user, preventing it from being resurfaced for a period of time.
   * @param userId The user who is snoozing the track.
   * @param trackId The track to snooze.
   * @param until A duration in milliseconds to snooze for. Defaults to 7 days.
   * @effects Updates Snoozes, setting the untilAt timestamp to a future time.
   */
  async snooze({ userId, trackId, until }: { userId: User; trackId: Track; until?: number }): Promise<Empty | { error: string }> {
    if (!userId || !trackId) {
      return { error: "userId and trackId must be provided" };
    }

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const duration = until ?? SEVEN_DAYS_MS;
    const newUntilAt = Date.now() + duration;

    await this.snoozes.updateOne(
      { userId, trackId },
      {
        $set: {
          userId,
          trackId,
          untilAt: newUntilAt,
        },
      },
      { upsert: true },
    );

    return {};
  }
}
```
