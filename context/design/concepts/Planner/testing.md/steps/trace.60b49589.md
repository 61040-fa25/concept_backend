---
timestamp: 'Fri Oct 31 2025 04:32:07 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251031_043207.d2cc7b27.md]]'
content_id: 60b495896c8921ab5bea538e0d0f0f13739c58c569754e3658ae1a2d829c69cc
---

# trace:

The operational principle is "it intelligently fits a user's prioritized tasks into the open slots in their schedule". The following trace demonstrates this principle using the primary actions of the `Planner` concept.

* **Action 1**: `planDay`
  * **Description**: A user, Alice, starts her day and wants to plan her tasks around her lunch break.
  * **Inputs**:
    * `user`: "user:alice"
    * `tasks`: `[{ id: "task:write-report", duration: 120 }, { id: "task:review-code", duration: 90 }, { id: "task:team-meeting-prep", duration: 30 }]`
    * `busySlots`: `[{ start: <today at 12:00>, end: <today at 13:00> }]`
  * **Effects**:
    * The concept calculates the available time slots for the current day, recognizing the 12:00-13:00 busy slot.
    * It schedules "task:write-report", then "task:review-code", and finally "task:team-meeting-prep" into the available time slots, respecting their order and duration.
    * The state in the `scheduledTasks` collection is populated with three documents for Alice, each containing a task and its calculated `plannedStart` and `plannedEnd` times.
  * **Output**: `{ firstTask: "task:write-report" }`
* **Action 2**: `getNextTask`
  * **Description**: Alice completes her first task and wants to know what's next.
  * **Inputs**:
    * `user`: "user:alice"
    * `completedTask`: "task:write-report"
  * **Effects**:
    * The concept queries its state to find the scheduled entry for "task:write-report".
    * It then finds the next task for Alice scheduled to start at or after the end time of the completed task.
  * **Output**: `{ nextTask: "task:review-code" }`
* **Action 3**: `getNextTask`
  * **Description**: After finishing the code review, Alice again checks for her next task.
  * **Inputs**:
    * `user`: "user:alice"
    * `completedTask`: "task:review-code"
  * **Effects**:
    * The concept performs the same lookup as before, finding the task scheduled after the code review.
  * **Output**: `{ nextTask: "task:team-meeting-prep" }`
* **Action 4**: `getNextTask`
  * **Description**: Alice completes her last scheduled task and checks what's next.
  * **Inputs**:
    * `user`: "user:alice"
    * `completedTask`: "task:team-meeting-prep"
  * **Effects**:
    * The concept searches for a task after the last scheduled one. Since none exists, it returns nothing.
  * **Output**: `{ nextTask: undefined }`
