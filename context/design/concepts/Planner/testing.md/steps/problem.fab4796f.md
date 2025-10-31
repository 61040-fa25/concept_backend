---
timestamp: 'Fri Oct 31 2025 04:41:40 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251031_044140.774e07c9.md]]'
content_id: fab4796f5eb3879f35a8362e403fed54f333f2b7e190a1d645b0259e1b7d0087
---

# problem:

The test suite for `PlannerConcept` is failing on "Scenario 1: Replan mid-day after some tasks are done".

The failure occurs because the test correctly expects that `replan` will clear out the old schedule before creating a new one. However, the implementation of `planDay` schedules tasks starting from midnight of the current day. When `replan` is called later, its logic only removes tasks scheduled from the current time (`now`) forward. This leaves the tasks scheduled by `planDay` (between midnight and `now`) in the database, as they are now in the past.

The failing test assertion, `assert("error" in getOldFutureTask, "Old future tasks should be removed after replanning.")`, fails because the old task still exists, and the `getNextTask` call succeeds instead of returning an error. This points to a bug in the concept's implementation that allows inconsistent states.
