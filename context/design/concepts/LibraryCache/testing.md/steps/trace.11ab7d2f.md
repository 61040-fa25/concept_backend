---
timestamp: 'Thu Oct 16 2025 22:53:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_225329.019db903.md]]'
content_id: 11ab7d2fbbb28d3f2cc0350e3433ba69bd2624e59efcaf52351d4f408ca853ca
---

# trace:

The principle of the `LibraryCache` is to maintain a local, queryable snapshot of a user's music library for analysis and tooling. This is demonstrated by the following trace of actions:

1. **`ingest({ userId: "user:alice", ... })`**: A user, Alice, logs into our application for the first time. The application fetches her entire library (tracks, likes, plays, playlists) from an external music service and calls `ingest` to populate the local cache. The `Tracks`, `Likes`, `Plays`, and `Playlists` collections in our database are now filled with Alice's data.

2. **`_getLiked({ userId: "user:alice" })`**: The application's UI wants to show Alice her liked songs. It calls the `_getLiked` query, which efficiently retrieves the list of track IDs from the local cache without needing to hit the external service's API again. The result is `{ trackIds: ["track:b", "track:a"] }`.

3. **`_getPlaylist({ playlistId: "playlist:1" })`**: Alice clicks on one of her playlists. The application calls `_getPlaylist`, which returns the ordered list of track IDs for that playlist, again, using the local cache: `{ entries: ["track:b", "track:a"] }`.

4. **`sync({ userId: "user:alice", ... })`**: Later, Alice uses the external music service and likes a new song (`track:c`). Our application performs a periodic background sync. It fetches her updated library and calls the `sync` action. This action efficiently replaces her old likes with the new set, adding `track:c` to the `Likes` collection.

5. **`_getLiked({ userId: "user:alice" })`**: When Alice returns to our application's "Liked Songs" page, the UI calls `_getLiked` again. This time, the query returns the updated list from the cache, which now includes the new song: `{ trackIds: ["track:c", "track:b", "track:a"] }`.

This trace shows how the concept fulfills its purpose: it ingests data, keeps it updated via synchronization, and provides fast, local queries to support application features, successfully creating a useful snapshot of the user's library.
