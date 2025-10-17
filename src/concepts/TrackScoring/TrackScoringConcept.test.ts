import { assertEquals, assert, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import TrackScoringConcept from "./TrackScoringConcept.ts";

type User = ID;
type Track = ID;

Deno.test("TrackScoringConcept - Principle Trace", async () => {
  const [db, client] = await testDb();
  try {
    const concept = new TrackScoringConcept(db);
    const user = "user:principle" as User;
    const track1 = "track:stale" as Track; // Should be high score
    const track2 = "track:recent" as Track; // Should be low score
    const track3 = "track:snoozed" as Track; // Will be snoozed
    const track4 = "track:boosted" as Track; // Will be boosted

    // 1. A user has weights for scoring their liked songs.
    await concept.updateWeights({
      userId: user,
      lastPlayedW: 0.5,
      likedWhenW: 0.2,
      timesSkippedW: 10,
    });

    // 2. The system has stats for several of the user's tracks.
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    await concept.updateStats({ userId: user, trackId: track1, lastPlayedAt: now - 365 * oneDay, likedAt: now - 730 * oneDay, timesSkipped: 0 }); // Very old
    await concept.updateStats({ userId: user, trackId: track2, lastPlayedAt: now - 1 * oneDay, likedAt: now - 2 * oneDay, timesSkipped: 1 }); // Very recent
    await concept.updateStats({ userId: user, trackId: track3, lastPlayedAt: now - 200 * oneDay, likedAt: now - 400 * oneDay, timesSkipped: 0 });
    await concept.updateStats({ userId: user, trackId: track4, lastPlayedAt: now - 100 * oneDay, likedAt: now - 200 * oneDay, timesSkipped: 2 });

    // 3. The concept scores the tracks, identifying stale ones.
    const score1 = await concept.score({ userId: user, trackId: track1 });
    const score2 = await concept.score({ userId: user, trackId: track2 });
    const score3 = await concept.score({ userId: user, trackId: track3 });
    const score4 = await concept.score({ userId: user, trackId: track4 });

    assert(!("error" in score1) && !("error" in score2) && !("error" in score3) && !("error" in score4));
    assert(score1.score > score2.score, "Stale track (track1) should have a higher score than recent track (track2)");

    // 4. A preview shows the stalest tracks first.
    let preview = await concept.preview({ userId: user });
    assert(!("error" in preview));
    assertEquals(preview.trackIds, [track1, track3, track4, track2]);

    // 5. The user snoozes a track, temporarily removing it from recommendations.
    await concept.snooze({ userId: user, trackId: track3 });
    const snoozedScore = await concept.score({ userId: user, trackId: track3 });
    assert(!("error" in snoozedScore));
    assertEquals(snoozedScore.score, 0, "Snoozed track should have a score of 0");

    // 6. The user keeps/boosts a track, increasing its relevance.
    await concept.keep({ userId: user, trackId: track4 });
    const boostedScore = await concept.score({ userId: user, trackId: track4 });
    assert(!("error" in boostedScore));
    assert(boostedScore.score > score4.score, "Boosted track score should increase");

    // 7. The preview now reflects these changes.
    preview = await concept.preview({ userId: user });
    assert(!("error" in preview));
    assertEquals(preview.trackIds, [track1, track4, track2, track3], "Preview order should update after snooze and keep");
  } finally {
    await client.close();
  }
});

Deno.test("TrackScoringConcept - Action: updateWeights", async () => {
  const [db, client] = await testDb();
  try {
    const concept = new TrackScoringConcept(db);
    const user = "user:test" as User;

    // Success case
    const result = await concept.updateWeights({
      userId: user,
      lastPlayedW: 0.5,
      likedWhenW: 0.2,
      timesSkippedW: 10,
    });
    assertEquals(result, {});

    const weights = await db.collection("TrackScoring.weights").findOne({ userId: user });
    assertExists(weights);
    assertEquals(weights.lastPlayedW, 0.5);
    assertEquals(weights.timesSkippedW, 10);

    // Error case: missing parameters
    const errorResult = await concept.updateWeights({ userId: user, lastPlayedW: 0.5, likedWhenW: null, timesSkippedW: 10 } as any);
    assert("error" in errorResult);
    assertEquals(errorResult.error, "Invalid input: userId and all weights must be provided.");
  } finally {
    await client.close();
  }
});

Deno.test("TrackScoringConcept - Action: updateStats", async () => {
  const [db, client] = await testDb();
  try {
    const concept = new TrackScoringConcept(db);
    const user = "user:test" as User;
    const track = "track:test" as Track;

    // Success case
    const result = await concept.updateStats({
      userId: user,
      trackId: track,
      lastPlayedAt: 123,
      likedAt: 456,
      timesSkipped: 5,
    });
    assertEquals(result, {});

    const stats = await db.collection("TrackScoring.stats").findOne({ userId: user, trackId: track });
    assertExists(stats);
    assertEquals(stats.lastPlayedAt, 123);
    assertEquals(stats.timesSkipped, 5);

    // Error case: missing parameters
    const errorResult = await concept.updateStats({ userId: user, trackId: null, lastPlayedAt: 123, likedAt: 456, timesSkipped: 5 } as any);
    assert("error" in errorResult);
    assertEquals(errorResult.error, "Invalid input: userId, trackId and all stats must be provided.");
  } finally {
    await client.close();
  }
});

Deno.test("TrackScoringConcept - Action: keep and snooze", async () => {
  const [db, client] = await testDb();
  try {
    const concept = new TrackScoringConcept(db);
    const user = "user:test" as User;
    const track = "track:test" as Track;

    // Test keep: first time
    await concept.keep({ userId: user, trackId: track });
    let boost = await db.collection("TrackScoring.boosts").findOne({ userId: user, trackId: track });
    assertEquals(boost?.amount, 1);

    // Test keep: second time (increment)
    await concept.keep({ userId: user, trackId: track });
    boost = await db.collection("TrackScoring.boosts").findOne({ userId: user, trackId: track });
    assertEquals(boost?.amount, 2);

    // Test snooze: default duration
    const now = Date.now();
    await concept.snooze({ userId: user, trackId: track });
    let snooze = await db.collection("TrackScoring.snoozes").findOne({ userId: user, trackId: track });
    assertExists(snooze);
    assert(snooze.untilAt > now, "Default snooze should set untilAt in the future");

    // Test snooze: custom duration
    const oneHour = 60 * 60 * 1000;
    await concept.snooze({ userId: user, trackId: track, until: oneHour });
    snooze = await db.collection("TrackScoring.snoozes").findOne({ userId: user, trackId: track });
    assertExists(snooze);
    assert(snooze.untilAt > now && snooze.untilAt < now + oneHour * 2, "Custom snooze should be respected");
  } finally {
    await client.close();
  }
});