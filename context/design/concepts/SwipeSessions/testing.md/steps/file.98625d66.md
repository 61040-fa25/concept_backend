---
timestamp: 'Thu Oct 16 2025 23:08:47 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_230847.27923d1d.md]]'
content_id: 98625d6624b4d89bf0f41d937a115d22bdee6b6bf28f42c6de6963f142198cee
---

# file: src/swipesessions/SwipeSessionsConcept.test.ts

```typescript
import { assertEquals, assert, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import SwipeSessionsConcept, { User, Track, Playlist, Session } from "./SwipeSessionsConcept.ts";

Deno.test("SwipeSessions Concept", async (t) => {
  const [db, client] = await testDb();
  const swipeSessions = new SwipeSessionsConcept(db);

  const userA = "user:A" as User;
  const tracks: Track[] = ["track:1", "track:2", "track:3", "track:4", "track:5"].map((t) => t as Track);

  await t.step("start action", async (t) => {
    await t.step("should start a session successfully", async () => {
      const result = await swipeSessions.start({ userId: userA, queueTracks: tracks });
      assert(!("error" in result), "start should not return an error");
      const { sessionId } = result;
      assertExists(sessionId);

      const sessionDoc = await swipeSessions._getSession(sessionId);
      assertExists(sessionDoc);
      assertEquals(sessionDoc.userId, userA);
      assertEquals(sessionDoc.queueTracks, tracks);
      assertEquals(sessionDoc.queueIndex, 0);
      assertEquals(sessionDoc.endedAt, null);
    });

    await t.step("should truncate queue if size is provided", async () => {
      const result = await swipeSessions.start({ userId: userA, queueTracks: tracks, size: 3 });
      assert(!("error" in result));
      const { sessionId } = result;
      const sessionDoc = await swipeSessions._getSession(sessionId);
      assertExists(sessionDoc);
      assertEquals(sessionDoc.queueTracks.length, 3);
      assertEquals(sessionDoc.queueTracks, ["track:1", "track:2", "track:3"]);
    });

    await t.step("should return error for invalid requirements", async () => {
      let result = await swipeSessions.start({ userId: "" as User, queueTracks: tracks });
      assert("error" in result, "should return error for empty userId");

      result = await swipeSessions.start({ userId: userA, queueTracks: tracks, size: 10 });
      assert("error" in result, "should return error if size > queue length");

      result = await swipeSessions.start({ userId: userA, queueTracks: [] });
      assert("error" in result, "should return error for empty queue");
    });
  });

  await t.step("next action", async (t) => {
    const { sessionId } = (await swipeSessions.start({ userId: userA, queueTracks: tracks.slice(0, 2) })) as { sessionId: Session };

    await t.step("should return tracks in order and increment index", async () => {
      let result = await swipeSessions.next({ sessionId });
      assert(!("error" in result));
      assertEquals(result.trackId, "track:1");
      let sessionDoc = await swipeSessions._getSession(sessionId);
      assertEquals(sessionDoc?.queueIndex, 1);

      result = await swipeSessions.next({ sessionId });
      assert(!("error" in result));
      assertEquals(result.trackId, "track:2");
      sessionDoc = await swipeSessions._getSession(sessionId);
      assertEquals(sessionDoc?.queueIndex, 2);
    });

    await t.step("should return -1 when queue is finished", async () => {
      const result = await swipeSessions.next({ sessionId });
      assert(!("error" in result));
      assertEquals(result.trackId, "-1");
    });

    await t.step("should return error for non-existent session", async () => {
      const result = await swipeSessions.next({ sessionId: "fake-session" as Session });
      assert("error" in result);
    });
  });

  await t.step("decide actions", async (t) => {
    const { sessionId } = (await swipeSessions.start({ userId: userA, queueTracks: tracks })) as { sessionId: Session };

    const nextResult = await swipeSessions.next({ sessionId });
    assert(!("error" in nextResult));
    const currentTrack = nextResult.trackId as Track;
    assertEquals(currentTrack, "track:1");

    await t.step("should correctly record a 'keep' decision", async () => {
      const result = await swipeSessions.decideKeep({ sessionId, trackId: currentTrack });
      assert(!("error" in result));
      const decisions = await swipeSessions._getDecisionsForSession(sessionId);
      assertEquals(decisions.length, 1);
      assertEquals(decisions[0].kind, "keep");
      assertEquals(decisions[0].trackId, currentTrack);
    });

    await t.step("should return error for wrong trackId", async () => {
      const result = await swipeSessions.decideKeep({ sessionId, trackId: "track:2" as Track });
      assert("error" in result);
      assertEquals(result.error, `TrackId ${"track:2"} does not match the current track for this session.`);
    });

    await t.step("should return error for duplicate decision on the same track", async () => {
      const result = await swipeSessions.decideKeep({ sessionId, trackId: currentTrack });
      assert("error" in result);
      assertEquals(result.error, `A decision for track ${currentTrack} in session ${sessionId} has already been made.`);
    });

    await t.step("should record other decision types correctly", async () => {
      const { trackId: track2 } = (await swipeSessions.next({ sessionId })) as { trackId: Track };
      assertEquals(track2, "track:2");

      const snoozeResult = await swipeSessions.decideSnooze({ sessionId, trackId: track2, untilAt: 12345 });
      assert(!("error" in snoozeResult));

      const { trackId: track3 } = (await swipeSessions.next({ sessionId })) as { trackId: Track };
      const playlistId = "playlist:pop" as Playlist;
      const addResult = await swipeSessions.decideAddToPlaylist({ sessionId, trackId: track3, playlistId });
      assert(!("error" in addResult));

      const { trackId: track4 } = (await swipeSessions.next({ sessionId })) as { trackId: Track };
      const createResult = await swipeSessions.decideCreatePlaylist({ sessionId, trackId: track4, playlistTitle: "My New Mix" });
      assert(!("error" in createResult));

      const decisions = await swipeSessions._getDecisionsForSession(sessionId);
      assertEquals(decisions.length, 4);
      assert(decisions.find((d) => d.kind === "snooze" && d.arg === "12345"));
      assert(decisions.find((d) => d.kind === "add" && d.arg === playlistId));
      assert(decisions.find((d) => d.kind === "create" && d.arg === "My New Mix"));
    });
  });

  await t.step("end action", async (t) => {
    const { sessionId } = (await swipeSessions.start({ userId: userA, queueTracks: tracks })) as { sessionId: Session };

    await t.step("should end an active session", async () => {
      const result = await swipeSessions.end({ sessionId });
      assert(!("error" in result));
      assertEquals(result.ended, true);
      const sessionDoc = await swipeSessions._getSession(sessionId);
      assert(sessionDoc?.endedAt);
    });

    await t.step("should return false for an already ended session", async () => {
      const result = await swipeSessions.end({ sessionId });
      assert(!("error" in result));
      assertEquals(result.ended, false);
    });

    await t.step("should prevent actions on an ended session", async () => {
      const result = await swipeSessions.next({ sessionId });
      assert("error" in result);
      assertEquals(result.error, `Session with id ${sessionId} has already ended`);
    });
  });

  await t.step("principle trace: a user processes a queue and decisions are stored", async () => {
    const user = "user:principle" as User;
    const principleTracks: Track[] = ["track:p1", "track:p2", "track:p3"].map((t) => t as Track);
    const playlist = "playlist:principle" as Playlist;

    // 1. A user starts a session
    const startRes = await swipeSessions.start({ userId: user, queueTracks: principleTracks });
    assert(!("error" in startRes));
    const { sessionId } = startRes;

    // 2. User gets the first song and decides to keep it
    let nextRes = await swipeSessions.next({ sessionId });
    assert(!("error" in nextRes) && nextRes.trackId !== "-1");
    let decideRes = await swipeSessions.decideKeep({ sessionId, trackId: nextRes.trackId });
    assert(!("error" in decideRes));

    // 3. User gets the second song and snoozes it
    nextRes = await swipeSessions.next({ sessionId });
    assert(!("error" in nextRes) && nextRes.trackId !== "-1");
    const snoozeTime = Date.now() + 100000;
    decideRes = await swipeSessions.decideSnooze({ sessionId, trackId: nextRes.trackId, untilAt: snoozeTime });
    assert(!("error" in decideRes));

    // 4. User gets the third song and adds it to a playlist
    nextRes = await swipeSessions.next({ sessionId });
    assert(!("error" in nextRes) && nextRes.trackId !== "-1");
    decideRes = await swipeSessions.decideAddToPlaylist({ sessionId, trackId: nextRes.trackId, playlistId: playlist });
    assert(!("error" in decideRes));

    // 5. The session queue is now empty
    nextRes = await swipeSessions.next({ sessionId });
    assertEquals(nextRes, { trackId: "-1" });

    // 6. The user ends the session
    const endRes = await swipeSessions.end({ sessionId });
    assertEquals(endRes, { ended: true });

    // 7. Verify the final state
    const finalDecisions = await swipeSessions._getDecisionsForSession(sessionId);
    assertEquals(finalDecisions.length, 3);
    assert(finalDecisions.some((d) => d.kind === "keep" && d.trackId === "track:p1"));
    assert(finalDecisions.some((d) => d.kind === "snooze" && d.trackId === "track:p2" && d.arg === String(snoozeTime)));
    assert(finalDecisions.some((d) => d.kind === "add" && d.trackId === "track:p3" && d.arg === playlist));
    const finalSession = await swipeSessions._getSession(sessionId);
    assertExists(finalSession?.endedAt);
  });

  await client.close();
});
```
