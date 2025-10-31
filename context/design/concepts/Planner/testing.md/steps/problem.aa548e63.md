---
timestamp: 'Fri Oct 31 2025 08:37:55 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251031_083755.f7ca65a2.md]]'
content_id: aa548e631e4a7f4cd068f96dd91f6457afc373ee391f08447be135aae251bfb2
---

# problem:

The test suite for `PlannerConcept` is failing on "Scenario 1: Replan mid-day after some tasks are done".

Upon analysis, the test's logic is flawed. It creates an initial plan at a simulated 9 AM, where all tasks are scheduled before noon. It then simulates a `replan` at 2 PM and incorrectly expects one of the morning tasks (`deep-work-1`, scheduled at 9:30 AM) to be deleted.

However, the `replan` implementation correctly deletes only tasks whose `plannedStart` time is greater than or equal to `now` (the time of replanning). Since the 9:30 AM task's start time is *before* the 2 PM replan time, the concept correctly preserves it. The test's assertion was wrong, causing the failure.
