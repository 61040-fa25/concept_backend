---
timestamp: 'Thu Oct 16 2025 23:08:47 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_230847.27923d1d.md]]'
content_id: 46542d0840c03d07547b71592da03116120b872ea8e52fe31b21f321174a0d9e
---

# trace:

The principle is: "A user processes a queue one-by-one and decisions are stored. External effects, such as: playlist edits or scoring updates, happen elsewhere." This trace, modeled in the `principle trace` test case, demonstrates the fulfillment of this principle through a series of actions.

1. **Start Session**: A user `user:principle` initiates a session with a queue of three tracks: `["track:p1", "track:p2", "track:p3"]`.
   * `swipeSessions.start({ userId: "user:principle", queueTracks: [...] })`
   * **Effect**: A new session document is created in the database, and a unique `sessionId` is returned.

2. **Process Track 1 (Keep)**: The user requests the next track and receives `track:p1`. They decide to "keep" it.
   * `swipeSessions.next({ sessionId })` returns `{ trackId: "track:p1" }`.
   * `swipeSessions.decideKeep({ sessionId, trackId: "track:p1" })` returns a `decisionId`.
   * **Effect**: A `Decision` document is created with `{ kind: "keep", trackId: "track:p1" }`. The session's `queueIndex` is now 1.

3. **Process Track 2 (Snooze)**: The user requests the next track and receives `track:p2`. They decide to "snooze" it until a future time.
   * `swipeSessions.next({ sessionId })` returns `{ trackId: "track:p2" }`.
   * `swipeSessions.decideSnooze({ sessionId, trackId: "track:p2", untilAt: <future_timestamp> })` returns a `decisionId`.
   * **Effect**: A `Decision` document is created with `{ kind: "snooze", trackId: "track:p2", arg: <future_timestamp> }`. The session's `queueIndex` is now 2.

4. **Process Track 3 (Add to Playlist)**: The user requests the next track and receives `track:p3`. They decide to add it to a playlist with ID `playlist:principle`.
   * `swipeSessions.next({ sessionId })` returns `{ trackId: "track:p3" }`.
   * `swipeSessions.decideAddToPlaylist({ sessionId, trackId: "track:p3", playlistId: "playlist:principle" })` returns a `decisionId`.
   * **Effect**: A `Decision` document is created with `{ kind: "add", trackId: "track:p3", arg: "playlist:principle" }`. The session's `queueIndex` is now 3.

5. **Finish Queue**: The user requests the next track. Since the queue is exhausted (`queueIndex` 3 is out of bounds for an array of length 3), the concept indicates the session is complete for swiping.
   * `swipeSessions.next({ sessionId })` returns `{ trackId: "-1" }`.

6. **End Session**: The user formally ends the session.
   * `swipeSessions.end({ sessionId })` returns `{ ended: true }`.
   * **Effect**: The `Session` document is updated with an `endedAt` timestamp, marking it as complete.

At the end of this trace, the state accurately reflects the user's journey: three distinct `Decision` documents have been recorded, and the parent `Session` is marked as complete. This fulfills the concept's purpose of locally recording decisions without performing external actions.
