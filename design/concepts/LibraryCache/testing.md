[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: LibraryCache

# response:


# response:

# file: src/librarycache/librarycache.test.ts

```typescript
import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import LibraryCacheConcept from "./librarycache.ts";
import { ID } from "@utils/types.ts";

// --- Test Data ---
const userAlice = "user:alice" as ID;
const userBob = "user:bob" as ID;

const trackA = {
  trackId: "track:a",
  title: "A Cool Song",
  artist: "An Artist",
  available: true,
  tempo: 120,
};

const trackB = {
  trackId: "track:b",
  title: "Another Banger",
  artist: "Another Artist",
  available: true,
  energy: 0.8,
};

const trackC = {
  trackId: "track:c",
  title: "Chill Vibes",
  artist: "An Artist",
  available: false,
};

const initialSyncData = {
  userId: userAlice,
  tracks: [trackA, trackB, trackC],
  likes: [
    { trackId: "track:a", addedAt: 1000 },
    { trackId: "track:b", addedAt: 1200 },
  ],
  plays: [{ trackId: "track:a", lastPlayedAt: 1100 }],
  playlists: [
    {
      playlistId: "playlist:1",
      entries: [
        { idx: 0, trackId: "track:b" },
        { idx: 1, trackId: "track:a" },
      ],
      updatedAt: 1500,
    },
  ],
};

Deno.test("LibraryCacheConcept: Principle Trace", async (t) => {
  const [db, client] = await testDb();
  const libraryCache = new LibraryCacheConcept(db);

  await t.step("1. A user's library is ingested for the first time", async () => {
    const result = await libraryCache.ingest(initialSyncData);
    assertEquals(result, {});

    // Verify state
    const tracksCount = await db.collection("LibraryCache.tracks").countDocuments();
    assertEquals(tracksCount, 3);
    const likesCount = await db.collection("LibraryCache.likes").countDocuments({ userId: userAlice });
    assertEquals(likesCount, 2);
  });

  await t.step("2. The user's liked tracks can be queried", async () => {
    const result = await libraryCache._getLiked({ userId: userAlice });
    assertExists(result);
    assertEquals("trackIds" in result && result.trackIds, ["track:b", "track:a"]); // Sorted by addedAt desc
  });

  await t.step("3. The user likes a new track, and a periodic sync occurs", async () => {
    const updatedSyncData = {
      ...initialSyncData,
      likes: [
        { trackId: "track:a", addedAt: 1000 },
        { trackId: "track:b", addedAt: 1200 },
        { trackId: "track:c", addedAt: 1300 }, // New like
      ],
      plays: [
        { trackId: "track:a", lastPlayedAt: 1100 },
        { trackId: "track:c", lastPlayedAt: 1400 }, // New play
      ],
    };

    const result = await libraryCache.sync(updatedSyncData);
    assertEquals(result, {});

    const likesCount = await db.collection("LibraryCache.likes").countDocuments({ userId: userAlice });
    assertEquals(likesCount, 3);
  });

  await t.step("4. The cache reflects the updated library", async () => {
    const result = await libraryCache._getLiked({ userId: userAlice });
    assertExists(result);
    assertEquals("trackIds" in result && result.trackIds, ["track:c", "track:b", "track:a"]);
  });

  await client.close();
});

Deno.test("LibraryCacheConcept: Actions and Queries", async (t) => {
  const [db, client] = await testDb();
  const libraryCache = new LibraryCacheConcept(db);

  await t.step("sync() should populate all collections correctly on first run", async () => {
    const result = await libraryCache.sync(initialSyncData);
    assertEquals(result, {});

    // Verify tracks (global collection)
    const trackDocs = await db.collection("LibraryCache.tracks").find().toArray();
    assertEquals(trackDocs.length, 3);
    assertEquals(trackDocs.some((t) => t._id === "track:a" && t.title === "A Cool Song"), true);

    // Verify likes (user-specific)
    const likeDocs = await db.collection("LibraryCache.likes").find({ userId: userAlice }).toArray();
    assertEquals(likeDocs.length, 2);
    assertEquals(likeDocs.some((l) => l.trackId === "track:b"), true);

    // Verify plays (user-specific)
    const playDocs = await db.collection("LibraryCache.plays").find({ userId: userAlice }).toArray();
    assertEquals(playDocs.length, 1);
    assertEquals(playDocs[0].trackId, "track:a");

    // Verify playlists (user-specific)
    const playlistDocs = await db.collection("LibraryCache.playlists").find({ userId: userAlice }).toArray();
    assertEquals(playlistDocs.length, 1);
    assertEquals(playlistDocs[0]._id, "playlist:1");
    assertEquals(playlistDocs[0].entries.length, 2);
  });

  await t.step("sync() should replace existing user data", async () => {
    // New data: one less like, different playlist
    const updatedData = {
      ...initialSyncData,
      likes: [{ trackId: "track:c", addedAt: 1400 }],
      playlists: [], // No playlists now
    };
    const result = await libraryCache.sync(updatedData);
    assertEquals(result, {});

    // Verify counts
    const likesCount = await db.collection("LibraryCache.likes").countDocuments({ userId: userAlice });
    assertEquals(likesCount, 1);
    const playlistsCount = await db.collection("LibraryCache.playlists").countDocuments({ userId: userAlice });
    assertEquals(playlistsCount, 0);

    // Verify content
    const like = await db.collection("LibraryCache.likes").findOne({ userId: userAlice });
    assertEquals(like?.trackId, "track:c");
  });

  await t.step("sync() should not affect other users' data", async () => {
    // Sync data for another user
    const bobData = {
      userId: userBob,
      tracks: [trackA],
      likes: [{ trackId: "track:a", addedAt: 999 }],
      plays: [],
      playlists: [],
    };
    await libraryCache.sync(bobData);

    // Verify Bob's data
    const bobLikesCount = await db.collection("LibraryCache.likes").countDocuments({ userId: userBob });
    assertEquals(bobLikesCount, 1);

    // Verify Alice's data is untouched from the previous step
    const aliceLikesCount = await db.collection("LibraryCache.likes").countDocuments({ userId: userAlice });
    assertEquals(aliceLikesCount, 1); // Should still be 1
  });

  await t.step("_getLiked() should return an ordered list of trackIds", async () => {
    // Use data from initial sync
    await libraryCache.sync(initialSyncData);
    const result = await libraryCache._getLiked({ userId: userAlice });
    assertExists(result);
    assertEquals("trackIds" in result && result.trackIds, ["track:b", "track:a"]); // recent first
  });

  await t.step("_getLiked() should return an empty array for a user with no likes", async () => {
    const result = await libraryCache._getLiked({ userId: "user:nobody" as ID });
    assertExists(result);
    assertEquals("trackIds" in result && result.trackIds, []);
  });

  await t.step("_getPlaylist() should return an ordered list of trackIds", async () => {
    // Use data from initial sync
    await libraryCache.sync(initialSyncData);
    const result = await libraryCache._getPlaylist({ playlistId: "playlist:1" });
    assertExists(result);
    assertEquals("entries" in result && result.entries, ["track:b", "track:a"]); // sorted by idx
  });

  await t.step("_getPlaylist() should return an empty array for a non-existent playlist", async () => {
    const result = await libraryCache._getPlaylist({ playlistId: "playlist:nonexistent" });
    assertExists(result);
    assertEquals("entries" in result && result.entries, []);
  });

  await client.close();
});
```

# trace:

The principle of the `LibraryCache` is to maintain a local, queryable snapshot of a user's music library for analysis and tooling. This is demonstrated by the following trace of actions:

1.  **`ingest({ userId: "user:alice", ... })`**: A user, Alice, logs into our application for the first time. The application fetches her entire library (tracks, likes, plays, playlists) from an external music service and calls `ingest` to populate the local cache. The `Tracks`, `Likes`, `Plays`, and `Playlists` collections in our database are now filled with Alice's data.

2.  **`_getLiked({ userId: "user:alice" })`**: The application's UI wants to show Alice her liked songs. It calls the `_getLiked` query, which efficiently retrieves the list of track IDs from the local cache without needing to hit the external service's API again. The result is `{ trackIds: ["track:b", "track:a"] }`.

3.  **`_getPlaylist({ playlistId: "playlist:1" })`**: Alice clicks on one of her playlists. The application calls `_getPlaylist`, which returns the ordered list of track IDs for that playlist, again, using the local cache: `{ entries: ["track:b", "track:a"] }`.

4.  **`sync({ userId: "user:alice", ... })`**: Later, Alice uses the external music service and likes a new song (`track:c`). Our application performs a periodic background sync. It fetches her updated library and calls the `sync` action. This action efficiently replaces her old likes with the new set, adding `track:c` to the `Likes` collection.

5.  **`_getLiked({ userId: "user:alice" })`**: When Alice returns to our application's "Liked Songs" page, the UI calls `_getLiked` again. This time, the query returns the updated list from the cache, which now includes the new song: `{ trackIds: ["track:c", "track:b", "track:a"] }`.

This trace shows how the concept fulfills its purpose: it ingests data, keeps it updated via synchronization, and provides fast, local queries to support application features, successfully creating a useful snapshot of the user's library.