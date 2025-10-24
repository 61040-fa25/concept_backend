---
timestamp: 'Fri Oct 24 2025 08:40:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251024_084059.52ca8fe8.md]]'
content_id: 7fa6e9b0a3414b1d4eb417ad7d2d26cc25e5878dd996d4698f4dc0d602e962cd
---

# concept: Schedule

* **concept**: Schedule \[User]
* **purpose**: to represent a user's non-negotiable, externally-scheduled commitments
* **principle**: the schedule is a read-only reflection of a user's external calendar
* **state**:
  * a set of BusySlots with
    * an owner User
    * a startTime DateTime
    * a endTime DateTime
* **actions**:
  * `syncCalendar (user: User, externalEvents: set of Events)`
    * **effect**: replaces the user's busy slots with a new set based on their external calendar
  * `deleteAllForUser (user: User)`
    * **effect**: removes all busy slots for the user
  * `blockTime (user: User, startTime: DateTime, endTime: DateTime)`
    * **effect**: creates a new BusySlot for the user to represent non-working hours or a manual block
  * `getSlots (user: User): (slots: set of BusySlots)`
    * **effect**: returns all busy slots for the user
