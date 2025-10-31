---
timestamp: 'Thu Oct 30 2025 21:00:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251030_210019.0776bbd6.md]]'
content_id: 13d82829c3c2abb28c9ba9ce79548043d2fdc677fd2ce2e1da9a0af00c84979e
---

# prompt: okay, lets change the concept:

concept Schedule \[User]
purpose to represent a user's non-negotiable, externally-scheduled commitments
principle the schedule is a read-only reflection of a user's external calendar
state
a set of BusySlots with
an owner User
a startTime DateTime
a endTime DateTime
actions
syncCalendar (user: User, externalEvents: set of Events)
effect replaces the user's busy slots with a new set based on their external calendar
deleteAllForUser (user: User)
effect removes all busy slots for the user
blockTime (user: User, startTime: DateTime, endTime: DateTime)
effect creates a new BusySlot for the user to represent non-working hours or a manual block
getSlots (user: User): (slots: set of BusySlots)
effect returns all busy slots for the user

i feel like maybe adding updateSlot or smth might be useful and ofc changing the sync action
