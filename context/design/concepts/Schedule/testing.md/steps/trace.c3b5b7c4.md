---
timestamp: 'Thu Oct 30 2025 22:44:39 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251030_224439.11c8f917.md]]'
content_id: c3b5b7c488f44c626aef56ddb28b128b337fb95498a65bddcb73564b2d8a775e
---

# trace:

The following trace demonstrates the **operational principle** for the `Schedule` concept. The principle states: "The schedule shows a read-only reflection of a user's external calendar, and gives options to add and edit manual time blocks."

1. **Initial State**: User `user:Alice` has no busy slots.
   ```json
   // Schedule.busySlots for user:Alice
   []
   ```

2. **Action**: `syncCalendar({ user: "user:Alice", externalEvents: [...] })`
   * **Input**: The user syncs their external calendar, which has two events: "Team Standup" and "Project Meeting".
   * **Effect**: The system deletes any pre-existing `EXTERNAL` slots for Alice and creates two new `EXTERNAL` busy slots corresponding to the events.
   * **State After**:
     ```json
     // Schedule.busySlots for user:Alice
     [
       { "_id": "...", "owner": "user:Alice", "origin": "EXTERNAL", "description": "Team Standup", ... },
       { "_id": "...", "owner": "user:Alice", "origin": "EXTERNAL", "description": "Project Meeting", ... }
     ]
     ```

3. **Action**: `blockTime({ user: "user:Alice", ..., description: "Focus Time" })`
   * **Input**: Alice manually blocks off "Focus Time" on her schedule.
   * **Effect**: A new `MANUAL` busy slot is created for Alice.
   * **State After**:
     ```json
     // Schedule.busySlots for user:Alice
     [
       { "_id": "...", "owner": "user:Alice", "origin": "EXTERNAL", "description": "Team Standup", ... },
       { "_id": "...", "owner": "user:Alice", "origin": "EXTERNAL", "description": "Project Meeting", ... },
       { "_id": "slot123", "owner": "user:Alice", "origin": "MANUAL", "description": "Focus Time", ... }
     ]
     ```

4. **Action**: `updateSlot({ slotId: "slot123", ..., newDescription: "Updated Focus Time" })`
   * **Input**: Alice updates her manually created "Focus Time" slot.
   * **Effect**: The properties of the `MANUAL` slot with `_id: "slot123"` are modified.
   * **State After**:
     ```json
     // Schedule.busySlots for user:Alice
     [
       { "_id": "...", "owner": "user:Alice", "origin": "EXTERNAL", "description": "Team Standup", ... },
       { "_id": "...", "owner": "user:Alice", "origin": "EXTERNAL", "description": "Project Meeting", ... },
       { "_id": "slot123", "owner": "user:Alice", "origin": "MANUAL", "description": "Updated Focus Time", ... }
     ]
     ```

5. **Action**: `syncCalendar({ user: "user:Alice", externalEvents: [...] })`
   * **Input**: Alice's external calendar syncs again, but this time it only has one event: "New Standup".
   * **Effect**: The system deletes all of Alice's old `EXTERNAL` slots and creates one new `EXTERNAL` slot. The `MANUAL` slot remains untouched.
   * **Final State**:
     ```json
     // Schedule.busySlots for user:Alice
     [
       { "_id": "slot123", "owner": "user:Alice", "origin": "MANUAL", "description": "Updated Focus Time", ... },
       { "_id": "...", "owner": "user:Alice", "origin": "EXTERNAL", "description": "New Standup", ... }
     ]
     ```

This sequence demonstrates that the user's schedule correctly reflects external commitments as read-only and allows for independent management of manual time blocks, thus fulfilling the concept's principle.
