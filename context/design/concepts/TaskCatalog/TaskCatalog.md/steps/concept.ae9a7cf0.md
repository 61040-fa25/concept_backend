---
timestamp: 'Fri Nov 07 2025 22:40:07 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251107_224007.34689672.md]]'
content_id: ae9a7cf0c75401bff5a534379160bdd34dab5281ed0a36fa9423f43e4c88267a
---

# concept: TaskCatalog

```
concept: TaskCatalog [User]

purpose: Allows users to create tasks with different attributes that will get scheduled;

principle:
    Users can create tasks with the required attributes. Users can update the attributes associated with the tasks. Users can schedule each task at one or more time blocks. Users can delete the tasks they own;

state:
    a set of Tasks with
        an owner User
        a taskId String
        a taskName String
        a category String
        a duration Duration
        a priority Number
        a splittable Flag
        a timeBlockSet containing a set of Strings (optional) // these strings are unique ids for timeBlocks
        a deadline TimeStamp (optional)
        a slack Number (optional) // buffer margin in minutes for acceptable deviation
        a preDependence set of Tasks (optional) // tasks that it depends on
        a postDependence set of Tasks (optional) // tasks that depend on it
        a note String (optional)

actions
    _getUserTasks (owner: User): (taskTable: set of Tasks)
	    // this is a query
        requires: exist at least one task with this owner
        effect: returns ALL tasks under this owner
    
    _getTask (owner: User, taskId: String): (task: Task)
        requires: exist a task with this taskId and this owner
        effect: return this task
    
    createTask (
        owner: User, taskName: String, category: String, duration: Duration, priority: Number, splittable: Flag, deadline?: TimeStamp, slack?: Number, preDependence?: set of Tasks, note?: String
    ): (task: Task)
        effect
            generate a unique taskId that has not been used;
            create a new task $t$ owned by owner with the attributes (taskId, taskName, category, duration, priority, splittable, deadline?, slack?, preDependence?, note?), the optional attributes are not set if not provided;
            set $t$'s timeBlockSet as an empty set;
            add $t$ to postDependence of all tasks in its given preDependence;
            return the newly created task $t$;
    
    assignSchedule (owner: User, taskId: String, timeBlockId: string)
        requires:
            exists a task with matching owner and taskId;
            timeBlockId does not already exist in this task's timeBlockSet;
        effect:
            add timeBlockId to this task's timeBlockSet
    
    deleteSchedule (owner: User, taskId: String, timeBockId: string)
        requires:
            exists a task with matching owner and taskId;
            timeBlockId exists in this task's timeBlockSet;
        effect:
            remove timeBlockId from this task's timeBlockSet;
    
    updateTask (owner: User, taskId: String, taskName: String)
    updateTask (owner: User, taskId: String, category: String)
    updateTask (owner: User, taskId: String, duration: Duration)
    updateTask (owner: User, taskId: String, priority: Number)
    updateTask (owner: User, taskId: String, splittable: Flag)
    updateTask (owner: User, taskId: String, deadline: TimeStamp)
    updateTask (owner: User, taskId: String, slack: Number)
    updateTask (owner: User, taskId: String, note: String)
        requires:
            exist a task with this taskId and the owner matches the given owner
        effect:
            update the given attribute of this task;
    
    addPreDependence (owner: user, taskId: String, newPreDependence: Task)
        requires:
            exist a task $t$ with this taskId and the owner matches the given owner
        effect:
            add newPreDependence to $t$'s preDependence;
            add $t$ to newPreDependence's postDependence;
    
    removePreDependence (owner: user, taskId: String, oldPreDependence: Task)
        requires:
            exist a task $t$ with this taskId and the owner matches the given owner;
            oldPreDependence exists in $t$'s preDependence;
        effect:
            remove oldPreDependence from $t$'s preDependence;
            remove $t$ from oldPreDependence's postDependence;
    
    deleteTask (owner: User, taskId: string)
        requires:
            exist a task $t$ with this taskId;
            task $t$ has no postDependence;
            task $t$ has a matching owner;
        effect:
            remove task $t$ from Tasks
```
