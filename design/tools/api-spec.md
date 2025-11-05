This document outlines the HTTP surface area exposed by the ConceptServer when it boots with `--port 8000 --baseUrl /api` and scans `./src/concepts`. The ConceptServer mounts each concept at `/api/<ConceptName>` and exposes every public method as a `POST` endpoint whose path matches the method name (without parentheses).

# API Specification

- **Base URL:** `http://localhost:8000/api`
- **Content-Type:** All endpoints expect and return JSON unless otherwise noted.
- **HTTP Method:** `POST` for all concept operations listed below (ConceptServer does not expose `GET`, `PUT`, or `DELETE` routes by default).
- **Error Envelope:** Errors are returned as `{ "error": string }` with an appropriate `4xx/5xx` HTTP status.

---

## PlatformLink (`/api/PlatformLink`)

PlatformLink coordinates OAuth account linking, token refresh, and downstream data sync.

### `POST /api/PlatformLink/link`
Creates a dummy link for non-OAuth testing flows.

```json
{
  "userId": "user:123",
  "platform": "spotify"
}
```

**Response**
```json
{
  "linkId": "link:abc123"
}
```

### `POST /api/PlatformLink/refresh`
Refreshes an existing Spotify link using its stored refresh token.

```json
{
  "linkId": "link:abc123"
}
```

**Response**
### `POST /api/PlatformLink/syncLibraryFromSpotify`
Fetches the user's Spotify library using the stored OAuth token and writes it into LibraryCache.

```json
{
  "userId": "user:123"
}
```

**Response**
```json
{
  "synced": true,
  "counts": { "tracks": 420, "likes": 200, "plays": 50, "playlists": 10 }
}
```

{
  "newExpiration": 1672539000000
}
```

### `POST /api/PlatformLink/revoke`
Deletes a link and any capabilities attached to it.

```json
{
  "linkId": "link:abc123"
}
```

**Response**
```json
{
  "removed": true
}
```

### `POST /api/PlatformLink/can`
Checks whether a link is valid and has a named capability.

```json
{
  "linkId": "link:abc123",
  "capability": "librarySync"
}
```

**Response**
```json
{
  "ok": true
}
```

### `POST /api/PlatformLink/startAuth`
Begins the Spotify OAuth PKCE flow.

```json
{
  "userId": "user:123",
  "platform": "spotify",
  "scopes": ["user-library-read"],
  "redirectUri": "https://app.example.com/callback"
}
```

**Response**
```json
{
  "authorizeUrl": "https://accounts.spotify.com/authorize?...",
  "state": "state-string",
  "expiresAt": 1672531800000
}
```

### `POST /api/PlatformLink/completeAuth`
Completes OAuth after Spotify redirects back with a code.

```json
{
  "state": "state-string",
  "code": "auth-code"
}
```

**Response**
```json
{
  "linkId": "link:abc123",
  "platform": "spotify",
  "tokenExpiration": 1672535400000,
  "scopes": ["user-library-read"]
}
```

### `POST /api/PlatformLink/listLinks`
Lists links known for a user. The ConceptServer always returns an object with a `links` array.

```json
{
  "userId": "user:123"
}
```

**Response**
```json
{
  "links": [
    {
      "linkId": "link:abc123",
      "platform": "spotify",
      "tokenExpiration": 1672535400000,
      "scopes": ["user-library-read"],
      "lastAuthorizedAt": 1672528200000
    }
  ]
}
```

### `POST /api/PlatformLink/syncLibrary`
Passes Spotify library snapshots into LibraryCache.

```json
{
  "linkId": "link:abc123",
  "payload": {
    "userId": "user:123",
    "tracks": [{ "trackId": "spotify:track:1", "title": "Song", "artist": "Artist", "available": true }],
    "likes": [{ "trackId": "spotify:track:1", "addedAt": 1672531200000 }],
    "plays": [{ "trackId": "spotify:track:1", "lastPlayedAt": 1672617600000 }],
    "playlists": [{
      "playlistId": "spotify:playlist:abc",
      "entries": [{ "idx": 0, "trackId": "spotify:track:1" }],
      "updatedAt": 1672617600000
    }]
  }
}
```

**Response**
```json
{
  "synced": true
}
```

### `POST /api/PlatformLink/bootstrapTrackScoring`
Convenience bridge that triggers TrackScoring ingest/preview.

```json
{
  "userId": "user:123",
  "size": 50
}
```

**Response**
```json
{
  "ingested": 250,
  "ensuredWeights": true,
  "previewCount": 50,
  "source": "bootstrap"
}
```

---

## LibraryCache (`/api/LibraryCache`)

LibraryCache stores tracks, likes, plays, and playlist snapshots.

### `POST /api/LibraryCache/ingest`
Legacy ingest endpoint (alias for `sync`).

```json
{
  "userId": "user:123",
  "tracks": [
    { "trackId": "spotify:track:1", "title": "Song", "artist": "Artist", "available": true }
  ],
  "likes": [],
  "plays": [],
  "playlists": []
}
```

**Response**
```json
{}
```

### `POST /api/LibraryCache/sync`
Authoritative bulk replacement of a user's library.

Payload matches `ingest`. Response mirrors `{}` on success.

### `POST /api/LibraryCache/getLiked`
Fetches liked track IDs ordered by recency.

```json
{
  "userId": "user:123"
}
```

**Response**
```json
{
  "trackIds": ["spotify:track:42", "spotify:track:1"]
}
```

### `POST /api/LibraryCache/_getLiked`
Internal variant used by other concepts; request/response identical to `getLiked`.

### `POST /api/LibraryCache/_getPlaylist`
Internal helper returning playlist entries.

```json
{
  "playlistId": "spotify:playlist:abc"
}
```

**Response**
```json
{
  "entries": ["spotify:track:1", "spotify:track:2"]
}
```

### `POST /api/LibraryCache/getTracks`
Fetches full metadata for requested track IDs (title, artist, tempo, energy, valence).

```json
{
  "trackIds": ["spotify:track:1", "spotify:track:42"]
}
```

**Response**
```json
{
  "tracks": [
    {
      "trackId": "spotify:track:1",
      "title": "Song Title",
      "artist": "Artist Name",
      "available": true,
      "tempo": 120.5,
      "energy": 0.85,
      "valence": 0.72
    },
    {
      "trackId": "spotify:track:42",
      "title": "Another Song",
      "artist": "Another Artist",
      "available": true,
      "tempo": 95.0,
      "energy": 0.45,
      "valence": 0.38
    }
  ]
}
```

---

## TrackScoring (`/api/TrackScoring`)

TrackScoring maintains resurfacing stats and scores.

### `POST /api/TrackScoring/updateWeights`
```json
{
  "userId": "user:123",
  "lastPlayedW": 0.6,
  "likedWhenW": 0.3,
  "timesSkippedW": 15
}
```

**Response**
```json
{}
```

### `POST /api/TrackScoring/updateStats`
Low-level stats update (rarely used directly).

### `POST /api/TrackScoring/score`
Computes a score for one track (internal helper).

### `POST /api/TrackScoring/preview`
Returns sorted preview data.

```json
{
  "userId": "user:123",
  "size": 50
}
```

**Response**
```json
{
  "tracks": [
    {
      "trackId": "spotify:track:old",
      "score": 95,
      "lastPlayedAt": 1577836800000
    }
  ],
  "trackIds": ["spotify:track:old"],
  "source": "bootstrap"
}
```

### `POST /api/TrackScoring/keep`
```json
{
  "userId": "user:123",
  "trackId": "spotify:track:old"
}
```

**Response**
```json
{}
```

### `POST /api/TrackScoring/snooze`
```json
{
  "userId": "user:123",
  "trackId": "spotify:track:old",
  "until": 86400000
}
```

**Response**
```json
{}
```

### Additional helper routes
`normaliseSize`, `calculateScore`, `fetchPreviewFromScores`, `bootstrapScores`, and `ingestFromLibraryCache` all accept JSON payloads matching their method signatures in code and return concept-specific objects. Frontend callers typically rely on `preview`, `keep`, `snooze`, and `ingestFromLibraryCache`.

---

## SwipeSessions (`/api/SwipeSessions`)

SwipeSessions powers short decision-making sessions.

### `POST /api/SwipeSessions/start`
```json
{
  "userId": "user:123",
  "queueTracks": ["spotify:track:a", "spotify:track:b"],
  "size": 2
}
```

**Response**
```json
{
  "sessionId": "session:abcdef"
}
```

### `POST /api/SwipeSessions/next`
```json
{
  "sessionId": "session:abcdef"
}
```

**Response**
```json
{
  "trackId": "spotify:track:a"
}
```

### Decision endpoints
- `POST /api/SwipeSessions/decideKeep`
- `POST /api/SwipeSessions/decideSnooze`
- `POST /api/SwipeSessions/decideAddToPlaylist`
- `POST /api/SwipeSessions/decideCreatePlaylist`

Each decision endpoint expects the appropriate session and track payload, for example:

```json
{
  "sessionId": "session:abcdef",
  "trackId": "spotify:track:a"
}
```

**Response**
```json
{
  "decisionId": "decision:12345"
}
```

### `POST /api/SwipeSessions/end`
```json
{
  "sessionId": "session:abcdef"
}
```

**Response**
```json
{
  "ended": true
}
```

### `POST /api/SwipeSessions/_makeDecision`
Internal helper combining the decision endpoints above.

---

## PlaylistHealth (`/api/PlaylistHealth`)

PlaylistHealth analyses playlist quality.

### `POST /api/PlaylistHealth/snapshot`
```json
{
  "playlistId": "spotify:playlist:xyz",
  "userId": "user:123",
  "trackIds": ["spotify:track:a", "spotify:track:b"]
}
```

**Response**
```json
{
  "snapshotId": "snap:abc"
}
```

### `POST /api/PlaylistHealth/analyze`
```json
{
  "playlistId": "spotify:playlist:xyz",
  "snapshotId": "snap:abc"
}
```

**Response**
```json
{
  "reportId": "report:def"
}
```

### `POST /api/PlaylistHealth/getReport`
```json
{
  "reportId": "report:def"
}
```

**Response**
```json
{
  "playlistId": "spotify:playlist:xyz",
  "snapshotId": "snap:abc",
  "findings": [
    {
      "idx": 2,
      "trackId": "spotify:track:a",
      "kind": "Duplicate"
    }
  ]
}
```

---

## Notes For Frontend Consumers

1. Every call is `POST` with a JSON body; adjust fetch helpers to send bodies even when the previous REST spec used query strings or route params.
2. ConceptServer does not pluralise or lowercase paths. Use the exact casing shown above (e.g., `/api/PlatformLink/startAuth`).
3. Some endpoints (`_getLiked`, `_makeDecision`) are intended for internal use but remain available; prefer the public variants unless a concept requires the internal helper.
4. When building typed clients, reference the DTO shapes above or import the TypeScript types defined under `src/concepts/**` in the backend.