---
timestamp: 'Tue Oct 14 2025 22:14:53 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_221453.5f248345.md]]'
content_id: 2a4e3815d897d0599ee73618b3f2ac41856e9ccf2c77c399ffada9b277715ead
---

# response:

```
concept: TaskCatalog [User]

purpose: To enable users to create, manage, schedule, and track their tasks, including their attributes, priorities, and dependencies.

principle:
    Users can create new tasks, assigning them an owner, name, category, duration, priority, and specifying if they are splittable.
    Tasks can optionally have a deadline, a slack margin, and be dependent on other tasks.
    Users can update any attribute of their owned tasks.
    Users can assign tasks to specific time blocks and remove these assignments.
    Users can define and remove dependencies between their tasks.
    Users can retrieve all tasks they own.
    Users can delete tasks, provided no other tasks currently depend on them.

state:
    a set of Tasks, where each Task has:
        owner: User // The user who owns this task.
        taskId: String // A unique identifier for the task.
        taskName: String
        category: String
        duration: Duration // Represents the estimated time to complete the task (e.g., "30 minutes", "2 hours").
        priority: Number // An integer representing urgency/importance (e.g., 1 for highest, 5 for lowest).
        splittable: Flag // Boolean, true if the task can be broken down into multiple separate work sessions.
        timeBlockSet: set of String // A set of unique identifiers for time blocks assigned to this task (e.g., IDs from a separate Scheduling concept).
        deadline: TimeStamp (optional) // The latest date/time by which the task should be completed.
        slack: Number (optional) // A buffer margin in minutes, indicating acceptable deviation from a schedule.
        preDependence: set of String (optional) // A set of TaskIds that this task depends on (must be completed before this task can start).
        postDependence: set of String (optional) // A set of TaskIds that depend on this task (can only start after this task is completed).
        note: String (optional) // Additional textual information about the task.

actions:
    getUserTasks (owner: User): (taskTable: set of Task)
        effect: Returns a set containing all tasks owned by the specified user. If no tasks are found, an empty set is returned.

    createTask (
        owner: User,
        taskName: String,
        category: String,
        duration: Duration,
        priority: Number,
        splittable: Flag,
        deadline?: TimeStamp,
        slack?: Number,
        preDependenceTaskIds?: set of String,
        note?: String
    ): (task: Task)
        effect:
            Let $t$ be a new Task instance;
            Generate a unique `taskId` for $t$ that has not been used;
            Set $t.owner = owner$, $t.taskName = taskName$, $t.category = category$, $t.duration = duration$, $t.priority = priority$, $t.splittable = splittable$;
            Set optional attributes $t.deadline = deadline$, $t.slack = slack$, $t.note = note$ if provided;
            Initialize $t.timeBlockSet$ as an empty set;
            Initialize $t.postDependence$ as an empty set;
            Set $t.preDependence = preDependenceTaskIds$ if provided, otherwise an empty set;
            Add $t$ to the concept's set of Tasks;
            For each `dependentTaskId` in $t.preDependence$:
                Find Task $T_{dep}$ such that $T_{dep}.taskId = dependentTaskId$;
                Add $t.taskId$ to $T_{dep}.postDependence$;
            Return the newly created task $t$;

    assignSchedule (owner: User, taskId: String, timeBlockId: String)
        requires:
            Exists a Task $t$ such that $t.owner = owner$ and $t.taskId = taskId$;
            `timeBlockId` is not already present in $t.timeBlockSet$;
        effect:
            Add `timeBlockId` to $t.timeBlockSet$;

    deleteSchedule (owner: User, taskId: String, timeBlockId: String)
        requires:
            Exists a Task $t$ such that $t.owner = owner$ and $t.taskId = taskId$;
            `timeBlockId` is present in $t.timeBlockSet$;
        effect:
            Remove `timeBlockId` from $t.timeBlockSet$;

    updateTaskName (owner: User, taskId: String, newTaskName: String)
        requires:
            Exists a Task $t$ such that $t.owner = owner$ and $t.taskId = taskId$;
        effect:
            Set $t.taskName = newTaskName$;
            
    updateTaskCategory (owner: User, taskId: String, newCategory: String)
        requires:
            Exists a Task $t$ such that $t.owner = owner$ and $t.taskId = taskId$;
        effect:
            Set $t.category = newCategory$;
            
    updateTaskDuration (owner: User, taskId: String, newDuration: Duration)
        requires:
            Exists a Task $t$ such that $t.owner = owner$ and $t.taskId = taskId$;
        effect:
            Set $t.duration = newDuration$;
            
    updateTaskPriority (owner: User, taskId: String, newPriority: Number)
        requires:
            Exists a Task $t$ such that $t.owner = owner$ and $t.taskId = taskId$;
        effect:
            Set $t.priority = newPriority$;
            
    updateTaskSplittable (owner: User, taskId: String, newSplittable: Flag)
        requires:
            Exists a Task $t$ such that $t.owner = owner$ and $t.taskId = taskId$;
        effect:
            Set $t.splittable = newSplittable$;
            
    updateTaskDeadline (owner: User, taskId: String, newDeadline: TimeStamp)
        requires:
            Exists a Task $t$ such that $t.owner = owner$ and $t.taskId = taskId$;
        effect:
            Set $t.deadline = newDeadline$;
            
    updateTaskSlack (owner: User, taskId: String, newSlack: Number)
        requires:
            Exists a Task $t$ such that $t.owner = owner$ and $t.taskId = taskId$;
        effect:
            Set $t.slack = newSlack$;
            
    updateTaskNote (owner: User, taskId: String, newNote: String)
        requires:
            Exists a Task $t$ such that $t.owner = owner$ and $t.taskId = taskId$;
        effect:
            Set $t.note = newNote$;

    addPreDependence (owner: User, taskId: String, newPreDependenceTaskId: String)
        requires:
            Exists a Task $t$ such that $t.owner = owner$ and $t.taskId = taskId$;
            Exists a Task $T_{dep}$ such that $T_{dep}.taskId = newPreDependenceTaskId$;
            `newPreDependenceTaskId` is not already present in $t.preDependence$;
            `taskId` is not equal to `newPreDependenceTaskId` (no self-dependency);
            // A more robust system would check for circular dependencies through the entire graph,
            // but for simplicity, it is omitted here as per typical concept design brevity.
        effect:
            Add `newPreDependenceTaskId` to $t.preDependence$;
            Find Task $T_{dep}$ such that $T_{dep}.taskId = newPreDependenceTaskId$;
            Add `taskId` to $T_{dep}.postDependence$;

    removePreDependence (owner: User, taskId: String, oldPreDependenceTaskId: String)
        requires:
            Exists a Task $t$ such that $t.owner = owner$ and $t.taskId = taskId$;
            `oldPreDependenceTaskId` is present in $t.preDependence$;
            Exists a Task $T_{dep}$ such that $T_{dep}.taskId = oldPreDependenceTaskId$;
        effect:
            Remove `oldPreDependenceTaskId` from $t.preDependence$;
            Find Task $T_{dep}$ such that $T_{dep}.taskId = oldPreDependenceTaskId$;
            Remove `taskId` from $T_{dep}.postDependence$;

    deleteTask (owner: User, taskId: String)
        requires:
            Exists a Task $t$ such that $t.owner = owner$ and $t.taskId = taskId$;
            $t.postDependence$ is empty; // No other tasks currently depend on this task.
        effect:
            For each `dependentTaskId` in $t.preDependence$:
                Find Task $T_{dep}$ such that $T_{dep}.taskId = dependentTaskId$;
                Remove `taskId` from $T_{dep}.postDependence$;
            Remove task $t$ from the concept's set of Tasks;
```
