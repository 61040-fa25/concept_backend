---
timestamp: 'Thu Oct 16 2025 22:16:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_221614.cf10e4b6.md]]'
content_id: 6b7905fe9f884997f49b697191f25c5a819e61f17a4f036cfdd671365a90a587
---

# concept: PlaylistHealth

* **concept**: PlaylistHealth \[User]
* **purpose**: Detect duplicates, unavailable tracks, and feature outliers in a playlist from a provided snapshot
* **principle**: If given a snapshot such as: list of track IDs (such as liked songs or playlists), the concept computes findings (duplicates, unavailable tracks, and feature outliers) with no calls to other concepts
* **state**:
  * A set of `Snapshots` with
    * a `snapshotId` of type `String`
    * a `playlistId` of type `String`
    * a `userId` of type `String`
    * a `trackIds` of type `String[]`
    * a `takenAt` timestamp of type `Number`
  * A set of `Reports` with
    * a `reportId` of type `String`
    * a `playlistId` of type `String`
    * a `snapshotId` of type `String`
    * a `scannedAt` timestamp of type `Number`
    * a `findings` of type {idx: Number, trackId: String, kind: "Duplicate"|"Unavailable"|"Outlier" (String)}\[]
* **actions**:
  * `snapshot(playlistId: String, userId: String, trackIds: String[]): (snapshotId: String)`
    * **requires**: Non-empty parameters
    * **effects**: Stores a Snapshot with aligned arrays and timestamps, returns snapshotId
  * `analyze(playlistId: String, snapshotId: String): (reportId: String)`
    * **requires**: A snapshot exists for playlist
    * **effects**: computes findings, generates and returns a report of the playlist analyzing each song as a duplicate, unavailable, or mood outlier.
  * `getReport(reportId: String): (playlistId: String, snapshotId: String, findings: { idx: Number, trackId: String, kind: String }[])`
    * **requires**: reportId exists
    * **effects**: Returns the results from the report
