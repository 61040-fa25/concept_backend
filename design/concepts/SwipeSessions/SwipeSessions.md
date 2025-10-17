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
