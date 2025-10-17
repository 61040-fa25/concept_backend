---
timestamp: 'Thu Oct 16 2025 22:16:52 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_221652.50aa3ac7.md]]'
content_id: 01227cf738826d345798f390dd67503be588bb814ebb78598735d502e2571ec7
---

# concept: TrackScoring

* **concept**: TrackScoring \[User]
* **purpose**: Compute a staleness score for each track in a user's liked song catalog and manage boosts/snoozes for resurfacing
* **principle**: After fetching a user's liked song catalog (per-track stats and user's weights), concept score tracks in terms of "staleness", and lists candidates possibly.
* **state**:
  * A set of `Weights` with
    * a `userId` of type `String`
    * a `lastPlayedW` of type `Number`
    * a `likedWhenW` of type `Number`
    * a `timesSkippedW` of type `Number`
    * a `updatedAt`timestamp of type `Number`
  * A set of `Boosts` with
    * a `userId` of type `String`
    * a `trackId` of type `String`
    * an `amount` of type `Number`
  * A set of `Snoozes` with
    * a `userId` of type `String`
    * a `trackId` of type `String`
    * a `untilAt` of type `Number`
  * A set of `Scores` with
    * a `userId` of type `Survey`
    * a `trackId` of type `String`
    * a `score` of type `Number` (0 - 100)
    * a `updatedAt` timestamp of type `Number`
  * A set of `Stats` with
    * a `userId` of type `String`
    * a `trackId` of type `String`
    * a `lastPlayedAt` of type `Number`
    * a `likedAt` of type `Number`
    * a `timesSkipped` of type `Number`
* **actions**:
  * `updateWeights(userId: String, lastPlayedW: Number, likedWhenW: Number, timesSkippedW: Number)`
    * **requires**: userId exists, valid weights
    * **effects**: Updates the weights for userId, updateds updatedAt
  * `updateStats(userId: String, trackId: String, lastPlayedAt: Number, likedAt: Number, timesSkipped: Number)`
    * **requires**: userId and trackId exist, valid number values
    * **effects**: Updates stats for userid, trackid pair.
  * `score(userId: String, trackId: String): (score: Number)`
    * **requires**: Weights exists
    * **effects**: Computes and returns a score for a track from 0-100 using the Weights and Stats. Updates scores.
  * `preview(userId: String, size?: Number): (trackIds: String[])`
    * **requires**: Scores exists for userId, if size provided, ensure <= number of scores.
    * **effects**: Returns trackIds sorted by their score in descending order. If size is omitted, present top 50.
  * `keep(userId: String, trackId: String)`
    * **effects**: Updates Boosts, increases the amount matching the userId and trackId, returns nothing
  * `snooze(userId: String, trackId: String, until?: Number)`
    * **effects**: Updates Snoozes, and updates the untilAt to be the current snooze duration + additional specified time. Returns nothing
