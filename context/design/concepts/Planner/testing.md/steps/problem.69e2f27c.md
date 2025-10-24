---
timestamp: 'Fri Oct 24 2025 09:50:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251024_095029.b7ff6327.md]]'
content_id: 69e2f27ca6197a88d9a985d7591f7f0354c0f7f05f68a9b9192f1ffcc521b63c
---

# problem:

The test suite for `PlannerConcept` is failing on "Interesting Scenario 2: Replanning mid-day". The assertion `assertEquals(scheduled.length, 2, "Replan should result in 2 new tasks")` fails because the actual number of scheduled tasks is 3, not 2.

This bug is caused by a race condition in the test environment. The scenario performs the following steps:

1. `planDay` is called, scheduling two tasks for the day, with the first one starting at 9:00 AM.
2. `replan` is called immediately afterward. It uses `new Date()` to get the current time, which is now slightly *after* 9:00 AM.
3. The `replan` action attempts to delete "remaining" tasks using the condition `plannedStart: { $gte: now }`.
4. Because the first task's start time (9:00 AM) is now in the past relative to `now`, it is not deleted. Only the second task is deleted.
5. `replan` then adds the two new tasks to the schedule.
6. The final state contains the one old task that wasn't deleted plus the two new tasks, resulting in a total of 3 tasks, which causes the assertion to fail.

The core issue is that the definition of a "remaining" task was too narrow. A task that has already started but not yet finished should also be considered "remaining" and thus be eligible for removal during a replan.
