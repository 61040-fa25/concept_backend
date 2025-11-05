# Backend Changes: 4b Development

This document tracks backend progress across two major development phases of Assignment 4b. There were tons of code updates and API rewrites :-(

## Phase 2: 2nd 4b Push (Beginning Spotify Integration + Scoring Fixes)

**Goal:** Replace dummy tokens with real OAuth, enrich library data with audio features, fix staleness scoring to use actual play history.

### PlatformLink
- **OAuth 2.0 PKCE flow**: 
  - Added `startAuth` (generates PKCE, auth URL)
  - Added `completeAuth` (exchanges code for tokens, stores refresh token)
  - Real token refresh via Spotify API using stored `refreshToken`
- **Spotify library sync (`syncLibraryFromSpotify`)**:
  - Fetches user's saved tracks (500 max), recently played (50 max), playlists (25 × 100 tracks)
  - Calls Spotify's `/audio-features` endpoint to enrich tracks with tempo/energy/valence
  - De-duplicates and populates LibraryCache with full metadata
- **Spotify utility module** (`src/utils/spotify.ts`):
  - Spotify API helpers: `getAllSavedTracks`, `getRecentlyPlayed`, `getUserPlaylists`, `getPlaylistTracks`, `getAudioFeatures`
  - Token exchange, expiration computation, scope parsing

### LibraryCache
- **Audio feature storage**: Extended `Track` schema with optional `tempo`, `energy`, `valence` fields
- **De-duplication**: `sync` now consolidates duplicate tracks/likes/plays to prevent unique-index violations
- **New endpoint `getTracks`**: Accepts `{ trackIds: string[] }`, returns full track metadata including audio features for frontend display (DEPRECATED)

### TrackScoring
- **Fixed staleness calculation**:
  - `ingestFromLibraryCache` now prefers actual play timestamps from LibraryCache's `plays` collection
  - Falls back to `likedAt` only when no play history exists
  - `lastPlayedAt` stored as `max(playTimestamp, likedAt)` to ensure recent activity isn't ignored
- **Score calculation update**:
  - Uses `max(lastPlayedAt, likedAt)` as the "last touched" reference
  - Prevents tracks played yesterday from scoring as 100% stale just because they were liked years ago (NOT USED ANYMORE SINCE SPOTIFY API IS LIMITED)
- **Auto-ingest from LibraryCache**: `ingestFromLibraryCache` bootstraps stats automatically, creates default weights if missing

### Audio Features Deprecation Handling
- Spotify deprecated `/audio-features` endpoint (November 2024)
- Backend keeps `tempo`, `energy`, `valence` fields in schema but expects them to be `null` for live data
- Frontend already conditionally renders these fields; no breaking changes required

---

## Improvements

### API Documentation
- Updated `design/tools/api-spec.md` with all new endpoints
- Added: `startAuth`, `completeAuth`, `syncLibraryFromSpotify`, `getTracks`, `ingestFromLibraryCache`

### Spotify Integration
- Enforces API rate limits via configurable fetch caps
- Batches audio feature requests (100 tracks per call)
- Environment-based config: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI` 

---

### Phase 2 Notes

The second phase was about moving from a working prototype to a production-ready system with real Spotify integration. The biggest challenge was setting up the biggest three moving pieces: OAuth flow, library sync, and scoring algorithm—all of which had to work together seamlessly, ON TOP of setting up the "game" features behind SwipeSessions and PlaylistHealth (which was more utilized as a frontend integration "Time-Capsule" under TrackScoring)

**OAuth Implementation Struggle:** 
Getting OAuth to work correctly was A STRUGGLE!!! I had to work closely with the frontend for a long time to make sure we were setting up the Spotify flow which ended up requiring to create modules for Spotify helpers. Additionally, not only did we have to make changes in the backend for 4b, we needed to actually create a Spotify app and set up links. The redirect URI caused issues until I looked into the documentation and saw that localhost was no longer supported for Spotify Developers so I made the npm run dev also be on `127.0.0.1:5173` for compatibility.

**Library Sync Complexity:** Fetching data from multiple Spotify endpoints (saved tracks, recently played, playlists) and consolidating them into a single LibraryCache snapshot was also so difficult! I love Spotify, but I didn't know that about their incredible rate limits and how drastic they would be. There were a lot of features that have been deprecated and made the overall integration of my original vision basically impossible. Some of these features I could definitely integrate on my own but it would have probably required 3x the amount of time because it would require integrating batch requests for tracks and work-arounds for grabbing beyond 500 saved tracks, 50 recently played, and playlist lmits.

**Scoring Algorithm Bug:** Staleness scores were completely wrong and showed all old tracks as 100% stale. After investigation, we found that `ingestFromLibraryCache` was conflating "when liked" with "when last played." The fix required restructuring the ingest logic to prioritize actual play history and fall back to like timestamps only when no play data exists. We updated `calculateScore` to use `max(lastPlayedAt, likedAt)` to work around deprecations.

**Audio Features Deprecation:** Midway through development, I discovered Spotify had deprecated the `/audio-features` endpoint (November 2024). Instead of reworking the entire schema, I decided to keep the fields but accept that they'll be `null` for live data (unless I can replace it with a live dataset or some real-time analysis of the track myself). This is not an issue with my backend or frontend, however, but a limitation of the Spotify API. Our modules are still maintained with backward compatibility with ability to integrate alternative APIs later.

**What Worked:** The modular concept design paid off. When we needed to fix scoring, we only touched `TrackScoringConcept`. When we added OAuth, it stayed contained in `PlatformLinkConcept` and the shared `spotify.ts` utility. 

Despite the complexity, the system now handles real user accounts, syncs live Spotify data, and computes staleness scores that actually reflect listening behavior. The backend is stable enough that the frontend team could integrate it without constant API changes.

---

## Phase 1: Initial 4b Push (Stability + API Adherence)

**Goal:** Stop 500 errors on `/api/SwipeSessions/next`, improve input validation, and align API behavior with frontend expectations.

### SwipeSessions
- **Input validation in `start`**: Trim/sanitize `userId` and `queueTracks`; reject malformed inputs with clear error messages
- **Graceful queue exhaustion in `next`**: Return `{ trackId: "-1" }` when queue is empty instead of throwing (eliminates "no healthy upstream" errors)
- **Decision normalization in `_makeDecision`**: Normalize track IDs before storage to prevent whitespace/case mismatches

### API Specification
- Documented ConceptServer's POST-only REST surface (`/api/<Concept>/<method>`)
- Clarified all error envelopes (`{ error: string }`) and success response shapes

---

### Phase 1 Notes:
## Notes

Despite Resurfacer being in a working state where things make sense and can function. I know that there still exists a lot of potential for the system to be refined and to add more visual details that would be useful for the user. 

One of the issues that I have always struggled with as a programmer is trying to do a bit of EVERYTHING rather than focusing on SOMETHING and doing it well. In this case, I didn’t want to try and go overboard on adding details and running into more possibilities of errors. In that case, I maintained a minimal design, which is already my style, and added what would be needed for functionality. With AI-augmented concepts to be implemented, it will only be more and more refined! 