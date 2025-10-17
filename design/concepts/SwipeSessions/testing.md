[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: SwipeSessions

# response:


# response:

# file: src/swipesessions/SwipeSessionsConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "../utils/database.ts";
import SwipeSessionsConcept, { User } from "./SwipeSessionsConcept.ts";
import { ID } from "../utils/types.ts";

Deno.test("SwipeSessionsConcept", async (t) => {
  const [db, client] = await testDb();
  const swipeSessions = new SwipeSessionsConcept(db);

  const testUser = "user:test" as User;
  const testTracks = ["track:1", "track:2", "track:3", "track:4", "track:5"];

  await t.step("start action", async (t) => {
    await t.step("should start a session successfully", async () => {
      const result = await swipeSessions.start({ userId: testUser, queueTracks: testTracks });
      assertNotEquals((result as { error: string }).error, undefined, "start should not return an error");
      const { sessionId } = result as { sessionId: ID };
      assertExists(sessionId);

      const sessionInDb = await swipeSessions.sessions.findOne({ _id: sessionId });
      assertExists(sessionInDb);
      assertEquals(sessionInDb.userId, testUser);
      assertEquals(sessionInDb.queueTracks, testTracks);
      assertEquals(sessionInDb.queueIndex, 0);
    });

    await t.step("should start a session with a truncated queue size", async () => {
      const size = 3;
      const result = await swipeSessions.start({ userId: testUser, queueTracks: testTracks, size });
      const { sessionId } = result as { sessionId: ID };
      assertExists(sessionId);

      const sessionInDb = await swipeSessions.sessions.findOne({ _id: sessionId });
      assertExists(sessionInDb);
      assertEquals(sessionInDb.queueTracks.length, size);
      assertEquals(sessionInDb.queueTracks, testTracks.slice(0, size));
    });

    await t.step("should fail if userId is empty", async () => {
      const result = await swipeSessions.start({ userId: "" as User, queueTracks: testTracks });
      assertEquals((result as { error: string }).error, "User ID cannot be empty");
    });

    await t.step("should fail if size is larger than queue length", async () => {
      const size = 10;
      const result = await swipeSessions.start({ userId: testUser, queueTracks: testTracks, size });
      assertEquals((result as { error: string }).error, `queueTracks length (5) is less than the requested size (10)`);
    });
  });

  await t.step("next action", async (t) => {
    const { sessionId } = (await swipeSessions.start({ userId: testUser, queueTracks: testTracks, size: 2 })) as { sessionId: ID };

    await t.step("should return the first track and increment index", async () => {
      const result = await swipeSessions.next({ sessionId });
      assertEquals((result as { trackId: string }).trackId, testTracks[0]);

      const sessionInDb = await swipeSessions.sessions.findOne({ _id: sessionId });
      assertEquals(sessionInDb?.queueIndex, 1);
    });

    await t.step("should return the second track and increment index", async () => {
      const result = await swipeSessions.next({ sessionId });
      assertEquals((result as { trackId: string }).trackId, testTracks[1]);

      const sessionInDb = await swipeSessions.sessions.findOne({ _id: sessionId });
      assertEquals(sessionInDb?.queueIndex, 2);
    });

    await t.step("should return -1 when the queue is finished", async () => {
      const result = await swipeSessions.next({ sessionId });
      assertEquals((result as { trackId: string }).trackId, "-1");
      // Index should not increment further
      const sessionInDb = await swipeSessions.sessions.findOne({ _id: sessionId });
      assertEquals(sessionInDb?.queueIndex, 2);
    });

    await t.step("should fail for a non-existent session", async () => {
      const result = await swipeSessions.next({ sessionId: "non-existent" as ID });
      assertEquals((result as { error: string }).error, "Session not found");
    });
  });

  await t.step("decide* actions", async (t) => {
    const { sessionId } = (await swipeSessions.start({ userId: testUser, queueTracks: testTracks })) as { sessionId: ID };

    await t.step("should fail to decide if next() has not been called", async () => {
      const result = await swipeSessions.decideKeep({ sessionId, trackId: testTracks[0] });
      assertEquals((result as { error: string }).error, "No track has been presented yet. Call next() first.");
    });

    // Advance the queue
    await swipeSessions.next({ sessionId }); // Now at index 1, current track is testTracks[0]

    await t.step("should fail to decide if trackId does not match current track", async () => {
      const result = await swipeSessions.decideKeep({ sessionId, trackId: "wrong-track" });
      assertEquals((result as { error: string }).error, `Track ID mismatch. Expected ${testTracks[0]}, but got wrong-track.`);
    });

    await t.step("should record a 'keep' decision", async () => {
      const result = await swipeSessions.decideKeep({ sessionId, trackId: testTracks[0] });
      const { decisionId } = result as { decisionId: ID };
      assertExists(decisionId);
      const decisionInDb = await swipeSessions.decisions.findOne({ _id: decisionId });
      assertEquals(decisionInDb?.kind, "keep");
      assertEquals(decisionInDb?.trackId, testTracks[0]);
      assertEquals(decisionInDb?.arg, "");
    });

    await swipeSessions.next({ sessionId }); // Advance to testTracks[1]

    await t.step("should record a 'snooze' decision", async () => {
      const untilAt = Date.now() + 1000 * 60 * 60; // 1 hour from now
      const result = await swipeSessions.decideSnooze({ sessionId, trackId: testTracks[1], untilAt });
      const { decisionId } = result as { decisionId: ID };
      assertExists(decisionId);
      const decisionInDb = await swipeSessions.decisions.findOne({ _id: decisionId });
      assertEquals(decisionInDb?.kind, "snooze");
      assertEquals(decisionInDb?.arg, untilAt.toString());
    });

    await swipeSessions.next({ sessionId }); // Advance to testTracks[2]

    await t.step("should record an 'add to playlist' decision", async () => {
      const playlistId = "playlist:123";
      const result = await swipeSessions.decideAddToPlaylist({ sessionId, trackId: testTracks[2], playlistId });
      const { decisionId } = result as { decisionId: ID };
      assertExists(decisionId);
      const decisionInDb = await swipeSessions.decisions.findOne({ _id: decisionId });
      assertEquals(decisionInDb?.kind, "add");
      assertEquals(decisionInDb?.arg, playlistId);
    });

    await swipeSessions.next({ sessionId }); // Advance to testTracks[3]

    await t.step("should record a 'create playlist' decision", async () => {
      const playlistTitle = "My New Vibe";
      const result = await swipeSessions.decideCreatePlaylist({ sessionId, trackId: testTracks[3], playlistTitle });
      const { decisionId } = result as { decisionId: ID };
      assertExists(decisionId);
      const decisionInDb = await swipeSessions.decisions.findOne({ _id: decisionId });
      assertEquals(decisionInDb?.kind, "create");
      assertEquals(decisionInDb?.arg, playlistTitle);
    });
  });

  await t.step("end action", async (t) => {
    const { sessionId } = (await swipeSessions.start({ userId: testUser, queueTracks: testTracks })) as { sessionId: ID };

    await t.step("should end a session and return true", async () => {
      const result = await swipeSessions.end({ sessionId });
      assertEquals(result.ended, true);
      const sessionInDb = await swipeSessions.sessions.findOne({ _id: sessionId });
      assertEquals(sessionInDb, null);
    });

    await t.step("should return false when ending a non-existent session", async () => {
      const result = await swipeSessions.end({ sessionId: "non-existent" as ID });
      assertEquals(result.ended, false);
    });

    await t.step("should return false when ending an already ended session", async () => {
      // First, end the session
      const { sessionId: newSessionId } = (await swipeSessions.start({ userId: testUser, queueTracks: testTracks })) as { sessionId: ID };
      await swipeSessions.end({ sessionId: newSessionId });

      // Try to end it again
      const result = await swipeSessions.end({ sessionId: newSessionId });
      assertEquals(result.ended, false);
    });
  });

  await client.close();
});
```

# trace:

The principle is: "A user processes a queue one-by-one and decisions are stored. External effects, such as: playlist edits or scoring updates, happen elsewhere."

This trace demonstrates the fulfillment of the principle:

1.  **A user decides to go into Session Swipe mode**: The `start` action is called.

    ```typescript
    const user = "user:principle_trace" as User;
    const tracks = ["track:a", "track:b", "track:c"];
    const startResult = await swipeSessions.start({ userId: user, queueTracks: tracks });
    const sessionId = (startResult as { sessionId: ID }).sessionId;
    // Effect: A new session is created and stored in the database.
    ```

2.  **Presents them in a Tiktok/Memory Card format**: The client application calls the `next` action to get the first track.

    ```typescript
    const nextResult1 = await swipeSessions.next({ sessionId });
    const firstTrack = (nextResult1 as { trackId: string }).trackId; // "track:a"
    // Effect: The session's queueIndex is now 1.
    ```

3.  **Swipe left to keep**: The user keeps the first track. The client calls `decideKeep`.

    ```typescript
    const keepResult = await swipeSessions.decideKeep({ sessionId, trackId: firstTrack });
    const keepDecisionId = (keepResult as { decisionId: ID }).decisionId;
    // Effect: A decision document is created with kind: "keep".
    ```

4.  **Get the next track**: The client calls `next` again.

    ```typescript
    const nextResult2 = await swipeSessions.next({ sessionId });
    const secondTrack = (nextResult2 as { trackId: string }).trackId; // "track:b"
    // Effect: The session's queueIndex is now 2.
    ```

5.  **Swipe right to snooze**: The user snoozes the second track. The client calls `decideSnooze`.

    ```typescript
    const snoozeResult = await swipeSessions.decideSnooze({ sessionId, trackId: secondTrack });
    const snoozeDecisionId = (snoozeResult as { decisionId: ID }).decisionId;
    // Effect: A decision document is created with kind: "snooze".
    ```

6.  **Get the next track**: The client calls `next` again.

    ```typescript
    const nextResult3 = await swipeSessions.next({ sessionId });
    const thirdTrack = (nextResult3 as { trackId: string }).trackId; // "track:c"
    // Effect: The session's queueIndex is now 3.
    ```

7.  **Swipe up to add the song to a playlist**: The user adds the third track to a playlist. The client calls `decideAddToPlaylist`.

    ```typescript
    const addResult = await swipeSessions.decideAddToPlaylist({ sessionId, trackId: thirdTrack, playlistId: "playlist:favorites" });
    const addDecisionId = (addResult as { decisionId: ID }).decisionId;
    // Effect: A decision document is created with kind: "add".
    ```

8.  **Session finishes**: The user is done. The client can either call `next` one more time to confirm completion (`trackId: "-1"`) or simply end the session.

    ```typescript
    const endResult = await swipeSessions.end({ sessionId });
    // Effect: The session document is removed from the database.
    ```

At the end of this trace, the `decisions` collection contains three documents reflecting the user's choices, fulfilling the core purpose of recording decisions. The session itself is ephemeral and is cleaned up by the `end` action. All external effects (like modifying a playlist) are correctly left out of this concept's responsibilities.
```