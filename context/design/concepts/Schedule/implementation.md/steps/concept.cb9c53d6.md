---
timestamp: 'Thu Oct 30 2025 22:10:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251030_221017.40d42fed.md]]'
content_id: cb9c53d66fa2d3ca47d43e605d227d4dfb1b1ec6a7e40abb55efbf8145426720
---

# concept: Schedule

* **concept**: Schedule \[User]
* **purpose**: to represent a user's availability by combining non-negotiable, externally-scheduled commitments with manual time blocks
* **principle**: The schedule shows a read-only reflection of a user's external calendar, and gives options to add and edit manual time blocks.
* **state**:
  * a set of BusySlots with
    * an owner User
    * a startTime DateTime
    * a endTime DateTime
    * a description String
    * an origin: (EXTERNAL, MANUAL)
* **actions**:
  * `blockTime (user: User, startTime: DateTime, endTime: DateTime, description: String): (slot: BusySlot)`
    * **effect**: creates a new BusySlot for the user with the given details and sets origin to MANUAL
  * `updateSlot (slot: BusySlot, newStartTime: DateTime, newEndTime: DateTime, newDescription: String)`
    * **requires**: slot.origin is MANUAL
    * **effect**: modifies the properties of a manually created BusySlot
  * `deleteSlot (slot: BusySlot)`
    * **requires**: slot.origin is MANUAL
    * **effect**: removes a manually created BusySlot
  * `syncCalendar (user: User, externalEvents: set of Events)`
    * **effect**: updates the user's schedule to match their external calendar without affecting MANUAL blocks.
  * `deleteAllForUser (user: User)`
    * **effect**: removes all busy slots (both MANUAL and EXTERNAL) for the user.
* **queries**:
  * `_getSlots (user: User): (slots: set of BusySlots)`
    * **effect**: returns all busy slots for the user, regardless of origin
