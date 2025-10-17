---
timestamp: 'Thu Oct 16 2025 23:14:38 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_231438.2a9848c6.md]]'
content_id: 02451e12bb3b2d82800ded866c9b7b4f009846139956e40c5bc18f3d1969d422
---

# trace:

The principle for the `TrackScoring` concept is: "After fetching a user's liked song catalog (per-track stats and user's weights), concept score tracks in terms of 'staleness', and lists candidates possibly."

This trace is implemented in the `TrackScoringConcept - Principle Trace` test case. Here is a step-by-step description of how the test fulfills the principle:

1. **Setup User Weights**: An initial call to `updateWeights` establishes the user's preferences for how "staleness" is calculated. This corresponds to fetching the user's weights.
2. **Setup Track Stats**: Four `updateStats` calls are made for different tracks with varying statistics (e.g., very old, very recent). This simulates fetching a user's liked song catalog with its per-track stats.
3. **Score Tracks**: The `score` action is called for each track. The test asserts that the track with older `lastPlayedAt` and `likedAt` dates (`track1`) receives a higher score than the recently played track (`track2`), confirming that the concept correctly identifies "staleness".
4. **Preview Candidates**: The `preview` action is called, and the test verifies that the returned list of tracks is sorted by score in descending order. This fulfills the "lists candidates possibly" part of the principle, presenting the most stale tracks first.
5. **User Interaction (Snooze & Keep)**: To demonstrate the full lifecycle, the test simulates user feedback.
   * A track is snoozed using the `snooze` action. A subsequent call to `score` for that track confirms its score drops to 0.
   * Another track is boosted using the `keep` action. A subsequent call to `score` confirms its score increases.
6. **Verify Updated Preview**: `preview` is called again. The test asserts that the new track order reflects the snooze (snoozed track is last) and the boost (boosted track moved up), demonstrating that the candidate list dynamically responds to user interaction.
