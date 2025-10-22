Based on the provided concept specifications and TypeScript implementations, here is the extracted API for the application.

The API is organized by concept. Each endpoint corresponds to an action or query defined in the concept. Following the specification:
*   **Actions** are represented by `POST` requests.
*   **Queries** (methods prefixed with `_`) are represented by `GET` requests, with parameters passed in the query string.

---

## 1. PlatformLink API

Provides authenticated access to streaming platforms, managing links and tokens for users.

### `POST /api/platformlink/link`

Creates a new link to a streaming platform for a given user.

**Request Body:**
```json
{
  "userId": "string",
  "platform": "string"
}
```

**Success Response (200):**
```json
{
  "linkId": "string"
}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```

### `POST /api/platformlink/refresh`

Refreshes the access token and expiration time for an existing link.

**Request Body:**
```json
{
  "linkId": "string"
}
```

**Success Response (200):**
```json
{
  "newExpiration": "number"
}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```

### `POST /api/platformlink/revoke`

Revokes a user's link to a platform, deleting the link and all associated capabilities.

**Request Body:**
```json
{
  "linkId": "string"
}
```

**Success Response (200):**
```json
{
  "removed": "boolean"
}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```

### `POST /api/platformlink/can`

Checks if a link is active (token not expired) and possesses a specific capability.

**Request Body:**
```json
{
  "linkId": "string",
  "capability": "string"
}
```

**Response (200):**
```json
{
  "ok": "boolean"
}
```

---

## 2. LibraryCache API

Maintains a local snapshot of a user’s liked tracks, plays, and playlists.

### `POST /api/librarycache/sync`

Performs a full replacement sync for a user's library data. It populates or updates track metadata and replaces the user's likes, plays, and playlists with the provided data.

**Request Body:**
```json
{
  "userId": "string",
  "tracks": [
    {
      "trackId": "string",
      "title": "string",
      "artist": "string",
      "available": "boolean",
      "tempo": "number",
      "energy": "number",
      "valence": "number"
    }
  ],
  "likes": [
    {
      "trackId": "string",
      "addedAt": "number"
    }
  ],
  "plays": [
    {
      "trackId": "string",
      "lastPlayedAt": "number"
    }
  ],
  "playlists": [
    {
      "playlistId": "string",
      "entries": [
        {
          "idx": "number",
          "trackId": "string"
        }
      ],
      "updatedAt": "number"
    }
  ]
}
```

**Success Response (200):**
```json
{}
```

**Error Response (5xx):**
```json
{
  "error": "string"
}
```
*Note: `ingest` is an alias for `sync` and would have an identical endpoint at `POST /api/librarycache/ingest`.*

### `GET /api/librarycache/getLiked`

Returns a list of track IDs for a user's liked tracks, sorted by most recently added.

**Query Parameters:**
*   `userId` (string): The ID of the user.

**Success Response (200):**
```json
[
  {
    "trackIds": ["string", "string", ...]
  }
]
```

**Error Response (5xx):**
```json
[
  {
    "error": "string"
  }
]
```

### `GET /api/librarycache/getPlaylist`

Returns an ordered list of track IDs for a given playlist.

**Query Parameters:**
*   `playlistId` (string): The ID of the playlist.

**Success Response (200):**
```json
[
  {
    "entries": ["string", "string", ...]
  }
]
```

**Error Response (5xx):**
```json
[
  {
    "error": "string"
  }
]
```

---

## 3. TrackScoring API

Computes a "staleness" score for tracks and manages user preferences (boosts/snoozes).

### `POST /api/trackscoring/updateWeights`

Updates the scoring weights for a given user.

**Request Body:**
```json
{
  "userId": "string",
  "lastPlayedW": "number",
  "likedWhenW": "number",
  "timesSkippedW": "number"
}
```

**Success Response (200):**
```json
{}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```

### `POST /api/trackscoring/updateStats`

Updates the playback statistics for a user-track pair.

**Request Body:**
```json
{
  "userId": "string",
  "trackId": "string",
  "lastPlayedAt": "number",
  "likedAt": "number",
  "timesSkipped": "number"
}
```

**Success Response (200):**
```json
{}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```

### `POST /api/trackscoring/score`

Computes, stores, and returns a staleness score for a given track.

**Request Body:**
```json
{
  "userId": "string",
  "trackId": "string"
}
```

**Success Response (200):**
```json
{
  "score": "number"
}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```

### `POST /api/trackscoring/preview`

Returns a list of track IDs for a user, sorted by their staleness score in descending order.

**Request Body:**
```json
{
  "userId": "string",
  "size": "number"
}
```

**Success Response (200):**
```json
{
  "trackIds": ["string", "string", ...]
}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```

### `POST /api/trackscoring/keep`

Increases the boost for a track, making it more likely to be resurfaced.

**Request Body:**
```json
{
  "userId": "string",
  "trackId": "string"
}
```

**Success Response (200):**
```json
{}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```

### `POST /api/trackscoring/snooze`

Snoozes a track for a user, preventing it from being resurfaced for a period of time.

**Request Body:**
```json
{
  "userId": "string",
  "trackId": "string",
  "until": "number"
}
```

**Success Response (200):**
```json
{}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```

---

## 4. SwipeSessions API

Runs swipe sessions over a queue of tracks and records user decisions.

### `POST /api/swipesessions/start`

Starts a new swipe session for a user with a given queue of tracks.

**Request Body:**
```json
{
  "userId": "string",
  "queueTracks": ["string", "string", ...],
  "size": "number"
}
```

**Success Response (200):**
```json
{
  "sessionId": "string"
}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```

### `POST /api/swipesessions/next`

Retrieves the next track in the session's queue and advances the cursor.

**Request Body:**
```json
{
  "sessionId": "string"
}
```

**Success Response (200):**
*Returns a track ID, or "-1" if the session queue is complete.*
```json
{
  "trackId": "string"
}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```

### `POST /api/swipesessions/decideKeep`

Records a 'keep' decision for the current track in a session.

**Request Body:**
```json
{
  "sessionId": "string",
  "trackId": "string"
}
```

**Success Response (200):**
```json
{
  "decisionId": "string"
}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```

### `POST /api/swipesessions/decideSnooze`

Records a 'snooze' decision for the current track in a session.

**Request Body:**
```json
{
  "sessionId": "string",
  "trackId": "string",
  "untilAt": "number"
}
```

**Success Response (200):**
```json
{
  "decisionId": "string"
}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```

### `POST /api/swipesessions/decideAddToPlaylist`

Records a decision to add the current track to an existing playlist.

**Request Body:**
```json
{
  "sessionId": "string",
  "trackId": "string",
  "playlistId": "string"
}
```

**Success Response (200):**
```json
{
  "decisionId": "string"
}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```

### `POST /api/swipesessions/decideCreatePlaylist`

Records a decision to create a new playlist with the current track.

**Request Body:**
```json
{
  "sessionId": "string",
  "trackId": "string",
  "playlistTitle": "string"
}
```

**Success Response (200):**
```json
{
  "decisionId": "string"
}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```

### `POST /api/swipesessions/end`

Ends a session, deleting its record from the database.

**Request Body:**
```json
{
  "sessionId": "string"
}
```

**Response (200):**
```json
{
  "ended": "boolean"
}
```

---

## 5. PlaylistHealth API

Analyzes playlist snapshots to detect duplicates, unavailable tracks, and outliers.

### `POST /api/playlisthealth/snapshot`

Creates and stores a snapshot of a playlist's current tracks.

**Request Body:**
```json
{
  "playlistId": "string",
  "userId": "string",
  "trackIds": ["string", "string", ...]
}
```

**Success Response (200):**
```json
{
  "snapshotId": "string"
}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```

### `POST /api/playlisthealth/analyze`

Analyzes a given snapshot to find issues and generates a health report.

**Request Body:**
```json
{
  "playlistId": "string",
  "snapshotId": "string"
}
```

**Success Response (200):**
```json
{
  "reportId": "string"
}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```

### `POST /api/playlisthealth/getReport`

Retrieves the results of a previously generated playlist health report.

**Request Body:**
```json
{
  "reportId": "string"
}
```

**Success Response (200):**
```json
{
  "playlistId": "string",
  "snapshotId": "string",
  "findings": [
    {
      "idx": "number",
      "trackId": "string",
      "kind": "string"
    }
  ]
}
```

**Error Response (4xx):**
```json
{
  "error": "string"
}
```