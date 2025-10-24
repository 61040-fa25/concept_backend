`
concept Schedule [User]
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
`