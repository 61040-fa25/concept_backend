---
timestamp: 'Fri Oct 24 2025 08:52:48 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251024_085248.864ae285.md]]'
content_id: ceab50829a5a2cdb75f8dd1210a188137cd07ce460b908aa2d847823a9b20957
---

# concept: Planner

* **concept**: `Planner [User, Task]`
* **purpose**: having a realistic, time-based plan for a user's tasks
* **principle**: it intelligently fits a user's prioritized tasks into the open slots in their schedule
* **state**:
  * a set of `ScheduledTasks` with
    * an `owner` User
    * a `task` Task
    * a `plannedStart` DateTime
    * a `plannedEnd` DateTime
* **actions**:
  * `planDay (user: User, tasks: seq of Task, busySlots: set of BusySlots): (firstTask: optional Task)`
  * `replan (user: User, tasks: seq of Task, busySlots: set of BusySlots): (firstTask: optional Task)`
  * `clearDay (user: User)`
  * `deleteAllForUser (user: User)`
  * `getNextTask (user: User, completedTask: Task): (nextTask: optional Task)`
