<concept_spec>
concept Planner [User, Task]
  purpose having a realistic, time-based plan for a user's tasks
  principle it intelligently fits a user's prioritized tasks into the open slots in their schedule
  
  state
    a set of ScheduledTasks with
      an owner User
      a task Task
      a plannedStart DateTime
      a plannedEnd DateTime
      
  actions
    planDay (user: User, tasks: seq of Task, busySlots: set of BusySlots): (firstTask: optional Task)
      effect creates a new, full-day schedule by assigning tasks to available time slots; returns the first task, if any
    replan (user: User, tasks: seq of Task, busySlots: set of BusySlots): (firstTask: optional Task)
      effect discards remaining scheduled tasks and generates a new plan from the current time forward; returns the first task, if any
    clearDay (user: User)
      effect removes all ScheduledTasks for the given user for the current day
    deleteAllForUser (user: User)
      effect removes all scheduled tasks for the user
    getNextTask (user: User, completedTask: Task): (nextTask: optional Task)
      effect finds the task scheduled immediately after the completedTask and returns it
</concept_spec>