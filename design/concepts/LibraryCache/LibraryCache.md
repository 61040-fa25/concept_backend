# concept: LibraryCache

*   **concept**: LibraryCache [User]
*   **purpose**: Keep a local, queryable snapshot of a user’s liked tracks, plays, and playlists for analysis and tooling.
*   **principle**:
*   **state**:
    *   A set of `Tracks` with
        *   a `trackId` of type `String`
        *   a `title` of type `String`
        *   an `artist` of type `String`
        *   an `available` of type `Boolean`
        *   a `tempo`? of type `Number`
        *   a `energy`? of type `Number`
        *   a `valence`? of type `Number`
    *   A set of `Likes` with
        *   a `userId` of type `String`
        *   a `trackId` of type `String`
        *   a `addedAt` timestamp of type `Number`
    *   A set of `Plays` with
        *   a `userId` of type `String`
        *   a `trackId` of type `String`
        *   a `lastPlayedAt` timestamp of type `Number`
    *   A set of `Playlists` with
        *   a `playlistId` of type `String`
        *   a `userId` of type `String`
        *   a `entries` of type `{ idx: Number, trackId: String }[]`
        *   a `updatedAt` timestamp of type `Number`

*   **actions**:
    *   `ingest(userId: String, trackIdList: String[], likeTrackId: String[], playsId: String[], playlistsIds: String[]):`
        *   **requires**: userId exists
        *   **effects**: populates Tracks, Likes, Plays, and Playlists
    *   `sync(userId: String, trackIdList: String[], likeTrackId: String[], playsId: String[], playlistsIds: String[]):`
        *   **requires**: userId exists
        *   **effects**: updates Tracks/Likes/Plays/Playlists every so often
    *   `getLiked(userId: String): (trackIds: String[])`
        *   **effects**: return user's liked tracks
    *   `getPlaylist(playlistId: String): (entries: String[])`
        *   **effects**: returns entries (tracks) of a playlist