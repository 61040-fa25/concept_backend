---
timestamp: 'Thu Oct 16 2025 22:34:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_223418.7b62c17a.md]]'
content_id: c6956bd46e41e5d98c5b39eb6d767427a42fa86635239bc8d1a19548b7e77c77
---

# trace:

The following trace demonstrates the principle of the `LibraryCache` concept: *If a user's library data from an external source is ingested, their local cache is populated, allowing for quick queries of their likes and playlists. When their external library changes and a sync is performed, the local cache reflects these changes, ensuring the queries return up-to-date information.*

1. **Initial Ingestion**: User Alice's music library is ingested into the system for the first time. The `ingest` action is called with her initial set of liked tracks (`track:1`, `track:2`) and a playlist (`playlist:alice_rock`).

   ```
   LibraryCache.ingest({
     userId: "user:alice",
     tracks: [ { trackId: "track:1", ... }, { trackId: "track:2", ... } ],
     likes: [ { trackId: "track:1", addedAt: ... }, { trackId: "track:2", addedAt: ... } ],
     plays: [ { trackId: "track:1", lastPlayedAt: ... } ],
     playlists: [ { playlistId: "playlist:alice_rock", entries: [...] } ]
   })
   => {}
   ```

   *Effect*: The `Tracks`, `Likes`, `Plays`, and `Playlists` collections are populated. The system now has a local snapshot of Alice's library.

2. **Querying the Cache**: An application now queries Alice's cached library to display her liked songs.

   ```
   LibraryCache._getLiked({ userId: "user:alice" })
   => { trackIds: ["track:2", "track:1"] } 
   ```

   *Effect*: The application receives an ordered list of Alice's liked track IDs, retrieved quickly from the local cache without needing to call an external API.

3. **External Library Change**: Alice's library changes on the source platform. She un-likes `track:1` and likes a new song, `track:3`. Her `playlist:alice_rock` is also modified.

4. **Synchronization**: A periodic job runs the `sync` action to update Alice's cache with the latest data from the source.

   ```
   LibraryCache.sync({
     userId: "user:alice",
     tracks: [ { trackId: "track:2", ... }, { trackId: "track:3", ... } ],
     likes: [ { trackId: "track:2", addedAt: ... }, { trackId: "track:3", addedAt: ... } ],
     plays: [ ... ], // updated plays
     playlists: [ { playlistId: "playlist:alice_rock", entries: [ ... ] } ] // updated entries
   })
   => {}
   ```

   *Effect*: The concept replaces Alice's old `Likes`, `Plays`, and `Playlists` documents with the new set. It also upserts the new `track:3` metadata into the global `Tracks` collection.

5. **Querying the Updated Cache**: The application again queries for Alice's liked songs.

   ```
   LibraryCache._getLiked({ userId: "user:alice" })
   => { trackIds: ["track:3", "track:2"] }
   ```

   *Effect*: The application receives the new, up-to-date list of liked songs. The query reflects the changes made on the external platform, demonstrating that the local cache is a consistent and queryable snapshot of the user's library.
