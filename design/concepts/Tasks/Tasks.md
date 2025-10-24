`
concept Tasks [User]
  purpose to capture and organize a user's tasks
  principle tasks are added to a prioritized list and can be marked as complete
  state
    a set of Tasks with
      an owner User
      a description String
      an optional dueDate Date
      an optional estimatedDuration Number
      a status of TODO or DONE
      
    a UserTasks element of User with
      an orderedTasks seq of Tasks

  actions
    createUserTasks (user: User)
      requires the user doesn't already have a list of tasks created
      effect creates an empty UserTasks element for a new user
    createTask (owner: User, description: String, dueDate: optional Date, estimatedDuration: optional Number)
      effect creates a new task with status TODO and adds it to the user's list
    updateTask (task: Task, newDescription: optional String, newDueDate: optional Date, newEstimatedDuration: optional Number)
      effect modifies the details of an existing task
    reorderTasks (user: User, newOrder: seq of Tasks)
      effect updates the order of the user's tasks
    markTaskComplete (task: Task)
      effect sets the task's status to DONE
    deleteTask (task: Task)
      effect removes the task from the system
    deleteAllForUser (user: User)
      effect removes all tasks associated with the user
    getTasks (user: User): (tasks: seq of Task) 
      effect returns the user's full ordered list of tasks
    getRemainingTasks (user: User): (tasks: seq of Task)
      effect returns the user's ordered list of tasks with status TODO
`