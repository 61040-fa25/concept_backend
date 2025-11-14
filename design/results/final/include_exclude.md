# Actions: Included vs Excluded

## TaskCatalog

### Included Actions
- **createTask**: Creates tasks with comprehensive attributes (name, category, duration, priority, deadline, dependencies, etc.)
- **updateTask**: Allows updating individual task attributes
- **deleteTask**: Removes tasks with dependency validation
- **assignSchedule/deleteSchedule**: Links tasks to time blocks
- **addPreDependence/removePreDependence**: Manages task dependencies

**Why**: These actions support the core purpose of managing tasks with different attributes that get scheduled. They enable full task lifecycle management while maintaining dependency integrity.

### Excluded Actions
- **No bulk operations** (e.g., deleteAllTasks, bulkUpdate)
- **No task completion marking** (markComplete/markIncomplete)
- **No filtering/sorting actions** (getTasksByCategory, getTasksByPriority)

**Why**:
- Bulk operations add complexity without essential value for the concept's purpose
- Task completion is tracked in RoutineLog (separation of concerns - TaskCatalog handles task definitions, RoutineLog handles actual execution)
- Filtering/sorting are query concerns, not state-changing actions; handled at app layer

## ScheduleTime

### Included Actions
- **addTimeBlock**: Creates time blocks
- **assignTimeBlock**: Assigns tasks to specific time blocks
- **removeTask**: Unassigns tasks from time blocks

**Why**: Minimal set needed to manage intended schedules. Focuses on the allocation of tasks onto calendar blocks.

### Excluded Actions
- **No deleteTimeBlock**: Cannot delete time blocks directly
- **No updateTimeBlock**: Cannot modify start/end times
- **No moveTask**: No action to move tasks between blocks

**Why**:
- Time blocks represent fixed calendar slots; modifying them could break schedule integrity
- Task movement is handled by remove + assign pattern (explicit over implicit)
- Keeps concept simple and focused on allocation, not calendar manipulation

## RoutineLog

### Included Actions
- **createSession**: Creates activity sessions
- **startSession/endSession**: Tracks actual timing
- **interruptSession**: Records interruptions with reasons
- **completeTask**: Marks task completion

**Why**: Captures real-time activity with precise timestamps and interruption handling. Enables reflection on actual vs planned schedules.

### Excluded Actions
- **No editSession**: Cannot modify past session records
- **No deleteSession**: Cannot remove logged sessions
- **No pauseSession/resumeSession**: No active pause/resume mechanism

**Why**:
- Log immutability ensures data integrity for reflection and analysis
- Interruptions handle pause cases with explicit reasons (better than simple pause/resume)
- Historical accuracy prioritized over editability

## AdaptiveSchedule

### Included Actions
- **addTimeBlock/deleteTimeBlock**: Manages adaptive time blocks
- **assignAdaptiveSchedule**: Assigns tasks to adjusted schedule
- **requestAdaptiveScheduleAI**: AI-powered schedule adjustment
- **unassignBlock**: Removes task assignments
- **deleteDroppedTask**: Clears dropped tasks

**Why**: Supports both manual and AI-augmented adaptation. AI integration allows intelligent rescheduling based on deviations. Dropped tasks tracking ensures accountability for schedule adjustments.

### Excluded Actions
- **No manual schedule optimization**: No priority-based auto-sorting without AI
- **No constraint validation**: Doesn't check deadline/dependency violations
- **No rollback/undo**: Cannot revert to previous adaptive schedules

**Why**:
- Manual optimization conflicts with AI-augmented purpose; users either adjust manually or use AI
- Constraint validation belongs to TaskCatalog (single responsibility)
- Rollback adds state complexity; users can recreate schedules by calling AI again with updated context

## Design Principles

1. **Separation of Concerns**: TaskCatalog defines tasks, ScheduleTime plans them, RoutineLog records reality, AdaptiveSchedule adjusts plans
2. **Minimal Action Set**: Include only actions essential to each concept's purpose
3. **Immutability Where Valuable**: RoutineLog maintains historical integrity
4. **Explicit Over Implicit**: Remove + assign pattern instead of "move" operation
5. **AI-First Adaptation**: Leverage AI for complex rescheduling rather than manual algorithms