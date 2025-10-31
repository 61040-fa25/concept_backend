---
timestamp: 'Thu Oct 30 2025 19:16:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251030_191631.9407f8a0.md]]'
content_id: 4dd3183f8681e777fdde23fad101ea2e481b0fce5d5e5bbc4f7bf56d9a64f9f8
---

# response:

Of course. That's an excellent design question. Distinguishing the source of an event is crucial for determining its behavior (e.g., can it be edited?).

Here is a revised `Schedule` concept that incorporates that distinction, following the modeling format you're using.

***

\`
concept Schedule
purpose to organize and display a user's time-based commitments from both manual entries and external sources
principle all items, regardless of source, are presented in a unified chronological view. Items from external sources are read-only.

state
a set of ScheduleItems with
a title String
a startTime DateTime
an endTime DateTime
an origin: (NATIVE, EXTERNAL)
an externalCalendarId String? # optional: identifies the source calendar if origin is EXTERNAL
an externalEventId String? # optional: the unique ID of the event in the source calendar
a isReadOnly Boolean # true if origin is EXTERNAL

actions
createTask (title: String, startTime: DateTime, endTime: DateTime)
effect creates a new ScheduleItem with origin set to NATIVE and isReadOnly set to false

updateTask (item: ScheduleItem, newTitle: String, newStartTime: DateTime, newEndTime: DateTime)
requires item.isReadOnly is false
effect modifies the properties of a NATIVE ScheduleItem

deleteTask (item: ScheduleItem)
requires item.isReadOnly is false
effect removes a NATIVE ScheduleItem

syncExternalCalendar (user: User, calendarId: String, events: list)
effect for each event from the external source, it creates or updates a corresponding ScheduleItem.

* sets origin to EXTERNAL
* sets isReadOnly to true
* populates externalCalendarId and externalEventId
* removes any EXTERNAL items linked to this calendarId that are no longer in the events list
  \`

### Rationale for the Changes:

1. **`origin` Field:** The core of the solution is the new `origin` field on a `ScheduleItem`. This is a simple but powerful enumeration (`NATIVE` vs. `EXTERNAL`) that clearly flags where the data came from.
2. **`isReadOnly` Flag:** This makes the core principle ("Items from external sources are read-only") explicit in the data model. By checking this flag in your actions, you can easily prevent users from accidentally trying to edit or delete something that is managed by an external service like Google Calendar.
3. **External IDs:** The `externalCalendarId` and `externalEventId` are crucial for the sync process. They create a stable link between your system's `ScheduleItem` and the original event on the external platform, allowing you to find the right item to update during a re-sync.
4. **Distinct Actions:**
   * `createTask`, `updateTask`, and `deleteTask` are now clearly for user-generated, *native* items. Their `requires` clauses enforce the read-only rule.
   * A new system-level action, `syncExternalCalendar`, is introduced. This more accurately models how external data gets into the system—not by a user manually creating an "external event," but by an automated synchronization process.
