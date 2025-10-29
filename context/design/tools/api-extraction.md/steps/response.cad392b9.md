---
timestamp: 'Tue Oct 28 2025 23:17:53 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251028_231753.74b512bf.md]]'
content_id: cad392b9e9f5fdd07015833b8afefa42ddc5182331d5ceba184e84aec39dac18
---

# response:

This document outlines the generated API specification in OpenAPI 3.0.0 format, derived from the five provided TypeScript concepts. The API uses a consistent JSON-RPC-like style, where all operations are `POST` requests, taking a single JSON object as input and returning a single JSON object. This aligns with the specified design principles for concept actions.

```yaml
openapi: 3.0.0
info:
  title: Concept-Based Application API
  description: API for an application built from five core concepts: PlatformLink, LibraryCache, TrackScoring, SwipeSessions, and PlaylistHealth.
  version: 1.0.0
servers:
  - url: /api
    description: Concept API Server

tags:
  - name: PlatformLink
    description: Manage authenticated links to external streaming platforms.
  - name: LibraryCache
    description: Maintain a local cache of a user's music library (tracks, likes, plays).
  - name: TrackScoring
    description: Calculate and manage "staleness" scores for user tracks.
  - name: SwipeSessions
    description: Run "memory card" style swipe sessions to triage tracks.
  - name: PlaylistHealth
    description: Analyze playlists for duplicates, unavailable tracks, and other issues.

paths:
  /platformlink/link:
    post:
      tags:
        - PlatformLink
      summary: Link a User to a Platform
      description: Creates a new link to a streaming platform for a given user. If the user is new to this concept, a corresponding user record is also created.
      operationId: platformLinkLink
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PlatformLinkLinkRequest'
      responses:
        '200':
          description: Link created successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PlatformLinkLinkResponse'
        '400':
          description: Bad request (e.g., unsupported platform, link already exists).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /platformlink/refresh:
    post:
      tags:
        - PlatformLink
      summary: Refresh a Platform Link Token
      description: Refreshes the access token for an existing link, updating its expiration time.
      operationId: platformLinkRefresh
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PlatformLinkRefreshRequest'
      responses:
        '200':
          description: Token refreshed successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PlatformLinkRefreshResponse'
        '404':
          description: Link not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /platformlink/revoke:
    post:
      tags:
        - PlatformLink
      summary: Revoke a Platform Link
      description: Deletes a user's link to a platform and any associated capabilities.
      operationId: platformLinkRevoke
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PlatformLinkRevokeRequest'
      responses:
        '200':
          description: Revocation status.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PlatformLinkRevokeResponse'
        '404':
          description: Link not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /platformlink/can:
    post:
      tags:
        - PlatformLink
      summary: Check Link Capability
      description: Checks if a link is active (token not expired) and possesses a specific capability.
      operationId: platformLinkCan
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PlatformLinkCanRequest'
      responses:
        '200':
          description: Capability check result.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PlatformLinkCanResponse'

  /librarycache/ingest:
    post:
      tags:
        - LibraryCache
      summary: Ingest Library Data
      description: Populates the cache with a user's library data. This is an alias for the `sync` action.
      operationId: libraryCacheIngest
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LibraryCacheSyncRequest'
      responses:
        '200':
          description: Ingest successful.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Empty'
        '500':
          description: Internal server error during ingest.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /librarycache/sync:
    post:
      tags:
        - LibraryCache
      summary: Sync Library Data
      description: Performs a full replacement sync for a user's library data, updating track metadata and replacing likes, plays, and playlists.
      operationId: libraryCacheSync
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LibraryCacheSyncRequest'
      responses:
        '200':
          description: Sync successful.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Empty'
        '500':
          description: Internal server error during sync.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /librarycache/getLiked:
    post:
      tags:
        - LibraryCache
      summary: Get Liked Tracks (Query)
      description: Returns a list of track IDs for a user's liked tracks, sorted by most recently added.
      operationId: libraryCacheGetLiked
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - userId
              properties:
                userId:
                  $ref: '#/components/schemas/ID'
      responses:
        '200':
          description: List of liked track IDs.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LibraryCacheGetLikedResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /librarycache/getPlaylist:
    post:
      tags:
        - LibraryCache
      summary: Get Playlist Tracks (Query)
      description: Returns an ordered list of track IDs for a given playlist.
      operationId: libraryCacheGetPlaylist
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - playlistId
              properties:
                playlistId:
                  $ref: '#/components/schemas/ID'
      responses:
        '200':
          description: Ordered list of track IDs in the playlist. Returns an empty list for a non-existent playlist.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LibraryCacheGetPlaylistResponse'
        '500':
          description: Internal server error.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  
  /trackscoring/updateWeights:
    post:
      tags:
        - TrackScoring
      summary: Update Scoring Weights
      description: Updates the scoring weights (last played, liked when, times skipped) for a given user.
      operationId: trackScoringUpdateWeights
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TrackScoringUpdateWeightsRequest'
      responses:
        '200':
          description: Weights updated successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Empty'
        '400':
          description: Invalid input.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  
  /trackscoring/updateStats:
    post:
      tags:
        - TrackScoring
      summary: Update Track Stats
      description: Updates the playback statistics (last played, liked at, times skipped) for a user-track pair.
      operationId: trackScoringUpdateStats
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TrackScoringUpdateStatsRequest'
      responses:
        '200':
          description: Stats updated successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Empty'
        '400':
          description: Invalid input.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /trackscoring/score:
    post:
      tags:
        - TrackScoring
      summary: Score a Track
      description: Computes, stores, and returns a staleness score (0-100) for a given track based on user's weights and stats.
      operationId: trackScoringScore
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TrackScoringScoreRequest'
      responses:
        '200':
          description: The computed score.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TrackScoringScoreResponse'
        '404':
          description: Weights or stats not found for the user/track.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /trackscoring/preview:
    post:
      tags:
        - TrackScoring
      summary: Preview Top Scored Tracks
      description: Returns a list of track IDs for a user, sorted by score in descending order.
      operationId: trackScoringPreview
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TrackScoringPreviewRequest'
      responses:
        '200':
          description: An array of track IDs.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TrackScoringPreviewResponse'
        '400':
          description: Invalid input.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /trackscoring/keep:
    post:
      tags:
        - TrackScoring
      summary: Keep/Boost a Track
      description: Increases the boost for a track, making it more likely to be resurfaced in previews.
      operationId: trackScoringKeep
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TrackScoringKeepRequest'
      responses:
        '200':
          description: Track boost updated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Empty'
        '400':
          description: Invalid input.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /trackscoring/snooze:
    post:
      tags:
        - TrackScoring
      summary: Snooze a Track
      description: Snoozes a track for a user, preventing it from being resurfaced for a period of time.
      operationId: trackScoringSnooze
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TrackScoringSnoozeRequest'
      responses:
        '200':
          description: Track snooze updated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Empty'
        '400':
          description: Invalid input.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /swipesessions/start:
    post:
      tags:
        - SwipeSessions
      summary: Start a Swipe Session
      description: Creates a new swipe session for a user with a given queue of tracks.
      operationId: swipeSessionsStart
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SwipeSessionsStartRequest'
      responses:
        '200':
          description: Session started successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SwipeSessionsStartResponse'
        '400':
          description: Invalid input (e.g., empty user ID, invalid queue).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  
  /swipesessions/next:
    post:
      tags:
        - SwipeSessions
      summary: Get Next Track in Session
      description: Retrieves the next track in the session's queue and advances the cursor. Returns "-1" when the queue is complete.
      operationId: swipeSessionsNext
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SwipeSessionsNextRequest'
      responses:
        '200':
          description: The next track ID or "-1" if finished.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SwipeSessionsNextResponse'
        '404':
          description: Session not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /swipesessions/decideKeep:
    post:
      tags:
        - SwipeSessions
      summary: Decide to Keep a Track
      description: Records a 'keep' decision for the current track in a session.
      operationId: swipeSessionsDecideKeep
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SwipeSessionsDecisionRequest'
      responses:
        '200':
          description: Decision recorded.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SwipeSessionsDecisionResponse'
        '400':
          description: Invalid request (e.g., track ID mismatch).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /swipesessions/decideSnooze:
    post:
      tags:
        - SwipeSessions
      summary: Decide to Snooze a Track
      description: Records a 'snooze' decision for the current track in a session.
      operationId: swipeSessionsDecideSnooze
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SwipeSessionsSnoozeRequest'
      responses:
        '200':
          description: Decision recorded.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SwipeSessionsDecisionResponse'
        '400':
          description: Invalid request (e.g., track ID mismatch).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  
  /swipesessions/decideAddToPlaylist:
    post:
      tags:
        - SwipeSessions
      summary: Decide to Add Track to Playlist
      description: Records a decision to add the current track to an existing playlist.
      operationId: swipeSessionsDecideAddToPlaylist
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SwipeSessionsAddToPlaylistRequest'
      responses:
        '200':
          description: Decision recorded.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SwipeSessionsDecisionResponse'
        '400':
          description: Invalid request (e.g., track ID mismatch).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /swipesessions/decideCreatePlaylist:
    post:
      tags:
        - SwipeSessions
      summary: Decide to Create Playlist with Track
      description: Records a decision to create a new playlist with the current track.
      operationId: swipeSessionsDecideCreatePlaylist
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SwipeSessionsCreatePlaylistRequest'
      responses:
        '200':
          description: Decision recorded.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SwipeSessionsDecisionResponse'
        '400':
          description: Invalid request (e.g., track ID mismatch).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /swipesessions/end:
    post:
      tags:
        - SwipeSessions
      summary: End a Swipe Session
      description: Ends a session, effectively deleting it from the system.
      operationId: swipeSessionsEnd
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SwipeSessionsEndRequest'
      responses:
        '200':
          description: Session end status.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SwipeSessionsEndResponse'
  
  /playlisthealth/snapshot:
    post:
      tags:
        - PlaylistHealth
      summary: Create a Playlist Snapshot
      description: Creates and stores a snapshot of a playlist's tracks at the current moment in time.
      operationId: playlistHealthSnapshot
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PlaylistHealthSnapshotRequest'
      responses:
        '200':
          description: Snapshot created successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PlaylistHealthSnapshotResponse'
        '400':
          description: Invalid input.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /playlisthealth/analyze:
    post:
      tags:
        - PlaylistHealth
      summary: Analyze a Playlist Snapshot
      description: Analyzes a given snapshot to find issues like duplicates, unavailable tracks, and outliers.
      operationId: playlistHealthAnalyze
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PlaylistHealthAnalyzeRequest'
      responses:
        '200':
          description: Analysis complete, report generated.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PlaylistHealthAnalyzeResponse'
        '404':
          description: Snapshot not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /playlisthealth/getReport:
    post:
      tags:
        - PlaylistHealth
      summary: Get an Analysis Report
      description: Retrieves the results of a previously generated playlist health report.
      operationId: playlistHealthGetReport
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PlaylistHealthGetReportRequest'
      responses:
        '200':
          description: Report data retrieved successfully.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PlaylistHealthGetReportResponse'
        '404':
          description: Report not found.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'


components:
  schemas:
    # --- Base Schemas ---
    ID:
      type: string
      description: A unique identifier, typically a string.
      example: "user:12345"
    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: string
          description: An error message describing what went wrong.
    Empty:
      type: object
      description: An empty object, returned for actions that have no other output.
      example: {}
    
    # --- PlatformLink Schemas ---
    PlatformLinkLinkRequest:
      type: object
      required:
        - userId
        - platform
      properties:
        userId:
          $ref: '#/components/schemas/ID'
        platform:
          type: string
          enum: [spotify, youtube_music]
    PlatformLinkLinkResponse:
      type: object
      properties:
        linkId:
          $ref: '#/components/schemas/ID'
    PlatformLinkRefreshRequest:
      type: object
      required:
        - linkId
      properties:
        linkId:
          $ref: '#/components/schemas/ID'
    PlatformLinkRefreshResponse:
      type: object
      properties:
        newExpiration:
          type: number
          format: float
          description: Unix timestamp (in milliseconds) of the new token expiration.
    PlatformLinkRevokeRequest:
      type: object
      required:
        - linkId
      properties:
        linkId:
          $ref: '#/components/schemas/ID'
    PlatformLinkRevokeResponse:
      type: object
      properties:
        removed:
          type: boolean
    PlatformLinkCanRequest:
      type: object
      required:
        - linkId
        - capability
      properties:
        linkId:
          $ref: '#/components/schemas/ID'
        capability:
          type: string
    PlatformLinkCanResponse:
      type: object
      properties:
        ok:
          type: boolean
          
    # --- LibraryCache Schemas ---
    TrackData:
      type: object
      properties:
        trackId:
          type: string
        title:
          type: string
        artist:
          type: string
        available:
          type: boolean
        tempo:
          type: number
        energy:
          type: number
        valence:
          type: number
    LikeData:
      type: object
      properties:
        trackId:
          type: string
        addedAt:
          type: number
    PlayData:
      type: object
      properties:
        trackId:
          type: string
        lastPlayedAt:
          type: number
    PlaylistData:
      type: object
      properties:
        playlistId:
          type: string
        entries:
          type: array
          items:
            type: object
            properties:
              idx:
                type: number
              trackId:
                type: string
        updatedAt:
          type: number
    LibraryCacheSyncRequest:
      type: object
      required:
        - userId
        - tracks
        - likes
        - plays
        - playlists
      properties:
        userId:
          $ref: '#/components/schemas/ID'
        tracks:
          type: array
          items:
            $ref: '#/components/schemas/TrackData'
        likes:
          type: array
          items:
            $ref: '#/components/schemas/LikeData'
        plays:
          type: array
          items:
            $ref: '#/components/schemas/PlayData'
        playlists:
          type: array
          items:
            $ref: '#/components/schemas/PlaylistData'
    LibraryCacheGetLikedResponse:
      type: object
      properties:
        trackIds:
          type: array
          items:
            type: string
    LibraryCacheGetPlaylistResponse:
      type: object
      properties:
        entries:
          type: array
          items:
            type: string

    # --- TrackScoring Schemas ---
    TrackScoringUpdateWeightsRequest:
      type: object
      required:
        - userId
        - lastPlayedW
        - likedWhenW
        - timesSkippedW
      properties:
        userId:
          $ref: '#/components/schemas/ID'
        lastPlayedW:
          type: number
        likedWhenW:
          type: number
        timesSkippedW:
          type: number
    TrackScoringUpdateStatsRequest:
      type: object
      required:
        - userId
        - trackId
        - lastPlayedAt
        - likedAt
        - timesSkipped
      properties:
        userId:
          $ref: '#/components/schemas/ID'
        trackId:
          $ref: '#/components/schemas/ID'
        lastPlayedAt:
          type: number
        likedAt:
          type: number
        timesSkipped:
          type: number
    TrackScoringScoreRequest:
      type: object
      required:
        - userId
        - trackId
      properties:
        userId:
          $ref: '#/components/schemas/ID'
        trackId:
          $ref: '#/components/schemas/ID'
    TrackScoringScoreResponse:
      type: object
      properties:
        score:
          type: number
          description: A staleness score from 0 to 100.
    TrackScoringPreviewRequest:
      type: object
      required:
        - userId
      properties:
        userId:
          $ref: '#/components/schemas/ID'
        size:
          type: integer
          default: 50
          description: The maximum number of track IDs to return.
    TrackScoringPreviewResponse:
      type: object
      properties:
        trackIds:
          type: array
          items:
            $ref: '#/components/schemas/ID'
    TrackScoringKeepRequest:
      type: object
      required:
        - userId
        - trackId
      properties:
        userId:
          $ref: '#/components/schemas/ID'
        trackId:
          $ref: '#/components/schemas/ID'
    TrackScoringSnoozeRequest:
      type: object
      required:
        - userId
        - trackId
      properties:
        userId:
          $ref: '#/components/schemas/ID'
        trackId:
          $ref: '#/components/schemas/ID'
        until:
          type: number
          description: A duration in milliseconds to snooze for. Defaults to 7 days if omitted.
          
    # --- SwipeSessions Schemas ---
    SwipeSessionsStartRequest:
      type: object
      required:
        - userId
        - queueTracks
      properties:
        userId:
          $ref: '#/components/schemas/ID'
        queueTracks:
          type: array
          items:
            type: string
        size:
          type: integer
    SwipeSessionsStartResponse:
      type: object
      properties:
        sessionId:
          $ref: '#/components/schemas/ID'
    SwipeSessionsNextRequest:
      type: object
      required:
        - sessionId
      properties:
        sessionId:
          $ref: '#/components/schemas/ID'
    SwipeSessionsNextResponse:
      type: object
      properties:
        trackId:
          type: string
          description: The next track ID in the queue, or "-1" if the session is complete.
    SwipeSessionsDecisionRequest:
      type: object
      required:
        - sessionId
        - trackId
      properties:
        sessionId:
          $ref: '#/components/schemas/ID'
        trackId:
          type: string
    SwipeSessionsSnoozeRequest:
      type: object
      required:
        - sessionId
        - trackId
      properties:
        sessionId:
          $ref: '#/components/schemas/ID'
        trackId:
          type: string
        untilAt:
          type: number
          description: Unix timestamp until which the track is snoozed.
    SwipeSessionsAddToPlaylistRequest:
      type: object
      required:
        - sessionId
        - trackId
        - playlistId
      properties:
        sessionId:
          $ref: '#/components/schemas/ID'
        trackId:
          type: string
        playlistId:
          type: string
    SwipeSessionsCreatePlaylistRequest:
      type: object
      required:
        - sessionId
        - trackId
        - playlistTitle
      properties:
        sessionId:
          $ref: '#/components/schemas/ID'
        trackId:
          type: string
        playlistTitle:
          type: string
    SwipeSessionsDecisionResponse:
      type: object
      properties:
        decisionId:
          $ref: '#/components/schemas/ID'
    SwipeSessionsEndRequest:
      type: object
      required:
        - sessionId
      properties:
        sessionId:
          $ref: '#/components/schemas/ID'
    SwipeSessionsEndResponse:
      type: object
      properties:
        ended:
          type: boolean
          
    # --- PlaylistHealth Schemas ---
    Finding:
      type: object
      properties:
        idx:
          type: integer
          description: The index of the track in the original snapshot array.
        trackId:
          $ref: '#/components/schemas/ID'
        kind:
          type: string
          enum: [Duplicate, Unavailable, Outlier]
    PlaylistHealthSnapshotRequest:
      type: object
      required:
        - playlistId
        - userId
        - trackIds
      properties:
        playlistId:
          $ref: '#/components/schemas/ID'
        userId:
          $ref: '#/components/schemas/ID'
        trackIds:
          type: array
          items:
            $ref: '#/components/schemas/ID'
    PlaylistHealthSnapshotResponse:
      type: object
      properties:
        snapshotId:
          $ref: '#/components/schemas/ID'
    PlaylistHealthAnalyzeRequest:
      type: object
      required:
        - playlistId
        - snapshotId
      properties:
        playlistId:
          $ref: '#/components/schemas/ID'
        snapshotId:
          $ref: '#/components/schemas/ID'
    PlaylistHealthAnalyzeResponse:
      type: object
      properties:
        reportId:
          $ref: '#/components/schemas/ID'
    PlaylistHealthGetReportRequest:
      type: object
      required:
        - reportId
      properties:
        reportId:
          $ref: '#/components/schemas/ID'
    PlaylistHealthGetReportResponse:
      type: object
      properties:
        playlistId:
          $ref: '#/components/schemas/ID'
        snapshotId:
          $ref: '#/components/schemas/ID'
        findings:
          type: array
          items:
            $ref: '#/components/schemas/Finding'
```
