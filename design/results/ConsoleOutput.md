In this doc, we will go through the console logged info for the test scenarios of each concept, and provide some commentary description if needed.
Reach about the finalized concept specifications here:
[AdaptiveSchedule](../concepts/AdaptiveSchedule/AdaptiveSchedule.md)
[RoutineLog](../concepts/RoutineLog/RoutineLog.md)
[ScheduleTime](../concepts/ScheduleTime/ScheduleTime.md)
[TaskCatalog](../concepts/TaskCatalog/TaskCatalog.md)

## Table of Contents

- [TaskCatalog](#taskcatalog)
  - [Initial state check](#initial-state-check)
  - [Scenario 1 — operational principle](#scenario-1-operational-principle)
  - [Task dependency chain management](#scenario-2-task-dependency-chain-management)
  - [Scenario 3: scheduling + attribute update](#scenario-3-scheduling--attribute-update)
  - [Scenario 4: user isolation and error handling](#scenario-4-user-isolation-and-error-handling)
  - [Scenario 5: repetition and invalid arguments](#scenario-5-repetition-and-invalid-arguments)
- [ScheduleTime](#scheduletime)
  - [Scenario 0: operational principle, user schedules tasks for the day](#scenario-0-operational-principle-user-schedules-tasks-for-the-day)
  - [Scenario 1: assigning tasks](#scenario-1-assigning-tasks)
  - [Scenario 2: removing tasks](#scenario-2-removing-tasks)
  - [Scenario 3: addTimeBlock and duplication](#scenario-3-addtimeblock-and-duplication)
  - [Scenario 4: Non-existing owner](#scenario-4-non-existing-owner)
- [RoutineLog](#routinelog)
  - [Scenario 0: operational principles](#scenario-0-operational-principles)
  - [Scenario 1: start cases](#scenario-1-start-cases)
  - [Scenario 2: interruption](#scenario-2-interruption)
  - [Scenario 3: multiple sessions](#scenario-3-multiple-sessions)
  - [Scenario 4: edge-cases for ending](#scenario-4-edge-cases-for-ending)
  - [Scenario 5: edge-cases for interruption](#scenario-5-edge-cases-for-interruption)
- [AdaptiveSchedule](#adaptiveschedule)
  - [Scenario 0: operational principle](#scenario-0-operational-principle)
  - [Scenario 1: duplicate time block and task assignment](#scenario-1-duplicate-time-block-and-task-assignment)
  - [Scenario 2: invalid inputs](#scenario-2-invalid-inputs)
  - [Scenario 3: handling bad LLM responses](#scenario-3-handling-bad-llm-responses)
  - [Scenario 4: multiple users](#scenario-4-multiple-users)

---

# TaskCatalog
## Initial state check
Initially, there is no task for a new user. We just the behavior by ensuring the query `_getUserTasks` returns an error.
```
TaskCatalog Concept Tests ...
  Initial State: _getUserTasks for a new user should return an error ...
------- post-test output -------

--- Initial State Check: _getUserTasks for a new user ---
  _getUserTasks for user:Charlie returned: {"error":"No tasks found for owner: user:Charlie"}
----- post-test output end -----
  Initial State: _getUserTasks for a new user should return an error ... ok (31ms)
  Scenario 1: Operational Principle - Basic Task Lifecycle ...
------- post-test output -------
```
## Scenario 1: operational principle test
The operational principle is:
  > Users can create tasks with the required attributes. Users can update the attributes associated with the tasks. Users can schedule each task at one or more time blocks. Users can delete the tasks they own;
  
This test case verifies the operational principle of the TaskCatalog concept by walking through a typical task lifecycle. It begins with creating a new task, confirming that all required attributes are initialized properly. The test then updates the task’s category, demonstrating that users can modify task attributes. Next, it assigns a time block to the task, validating scheduling functionality. The system retrieves all tasks for the user, confirming that the newly created and updated task appears correctly. Finally, the task is deleted, ensuring proper cleanup. Together, these steps reflect the expected user workflow: create, update, schedule, retrieve, and delete. This confirms that each action behaves consistently with the concept’s intended operation.

Result: All steps passed. Test success.
```
--- Scenario 1: Operational Principle - Basic Task Lifecycle ---
Calling createTask with: {"owner":"user:PrincipleTester","taskName":"Operational Principle Task","category":"Principle Category","duration":90,"priority":1,"splittable":true}
  createTask result: {"_id":"0199f9d1-ddf9-7d2a-ba7f-23a7e81d86c3","owner":"user:PrincipleTester","taskName":"Operational Principle Task","category":"Principle Category","duration":90,"priority":1,"splittable":true,"timeBlockSet":[],"postDependence":[]}
1. Created task: {"_id":"0199f9d1-ddf9-7d2a-ba7f-23a7e81d86c3","owner":"user:PrincipleTester","taskName":"Operational Principle Task","category":"Principle Category","duration":90,"priority":1,"splittable":true,"timeBlockSet":[],"postDependence":[]}
2. Updating task category for 0199f9d1-ddf9-7d2a-ba7f-23a7e81d86c3 to 'Updated Category'
   Task 0199f9d1-ddf9-7d2a-ba7f-23a7e81d86c3 category updated. Current task: {"_id":"0199f9d1-ddf9-7d2a-ba7f-23a7e81d86c3","owner":"user:PrincipleTester","taskName":"Operational Principle Task","category":"Updated Category","duration":90,"priority":1,"splittable":true,"timeBlockSet":[],"postDependence":[]}
3. Assigning schedule 'timeblock:MondayMorning' to task 0199f9d1-ddf9-7d2a-ba7f-23a7e81d86c3
   Task 0199f9d1-ddf9-7d2a-ba7f-23a7e81d86c3 scheduled. Current task: {"_id":"0199f9d1-ddf9-7d2a-ba7f-23a7e81d86c3","owner":"user:PrincipleTester","taskName":"Operational Principle Task","category":"Updated Category","duration":90,"priority":1,"splittable":true,"timeBlockSet":["timeblock:MondayMorning"],"postDependence":[]}
4. Retrieving all tasks for user:PrincipleTester
   Retrieved tasks: [{"_id":"0199f9d1-ddf9-7d2a-ba7f-23a7e81d86c3","owner":"user:PrincipleTester","taskName":"Operational Principle Task","category":"Updated Category","duration":90,"priority":1,"splittable":true,"timeBlockSet":["timeblock:MondayMorning"],"postDependence":[]}]
5. Deleting task 0199f9d1-ddf9-7d2a-ba7f-23a7e81d86c3
   Task 0199f9d1-ddf9-7d2a-ba7f-23a7e81d86c3 deleted.
----- post-test output end -----
  Scenario 1: Operational Principle - Basic Task Lifecycle ... ok (370ms)
```

## Scenario 2: Task dependency chain management
```
--- Scenario 2: Complex Dependency Chain Management ---
Tests creating a chain of dependencies, attempting to delete a parent, then removing dependencies and deleting successfully.
  Calling createTask with: {"owner":"user:Alice","taskName":"Task A","category":"Project","duration":120,"priority":1,"splittable":false}
  createTask result: {"_id":"0199f9d1-df6b-7eea-bd6c-6ce4ccbddd0e","owner":"user:Alice","taskName":"Task A","category":"Project","duration":120,"priority":1,"splittable":false,"timeBlockSet":[],"postDependence":[]}
  Calling createTask with: {"owner":"user:Alice","taskName":"Task B","category":"Project","duration":90,"priority":1,"splittable":false}
  createTask result: {"_id":"0199f9d1-df86-746c-8c41-53508279f0c7","owner":"user:Alice","taskName":"Task B","category":"Project","duration":90,"priority":1,"splittable":false,"timeBlockSet":[],"postDependence":[]}
  Calling createTask with: {"owner":"user:Alice","taskName":"Task C","category":"Project","duration":60,"priority":1,"splittable":false}
  createTask result: {"_id":"0199f9d1-dfa6-7412-a877-32523fb7b6ac","owner":"user:Alice","taskName":"Task C","category":"Project","duration":60,"priority":1,"splittable":false,"timeBlockSet":[],"postDependence":[]}
1. Created tasks: A=0199f9d1-df6b-7eea-bd6c-6ce4ccbddd0e, B=0199f9d1-df86-746c-8c41-53508279f0c7, C=0199f9d1-dfa6-7412-a877-32523fb7b6ac
2. Adding dependence: Task B depends on Task A
   Verified Task A's postDependence includes Task B.
3. Adding dependence: Task C depends on Task B
   Verified Task B's postDependence includes Task C.
4. Attempting to delete Task A (0199f9d1-df6b-7eea-bd6c-6ce4ccbddd0e) (expected to fail)
   Deletion of Task A failed as expected.
5. Removing dependence: Task C from Task B's preDependence
   Verified Task B's postDependence no longer includes Task C.
6. Deleting Task C (0199f9d1-dfa6-7412-a877-32523fb7b6ac) (expected to succeed)
   Task C deleted successfully.
7. Removing dependence: Task B from Task A's preDependence
   Verified Task A's postDependence no longer includes Task B.
8. Deleting Task B (0199f9d1-df86-746c-8c41-53508279f0c7) (expected to succeed)
   Task B deleted successfully.
9. Deleting Task A (0199f9d1-df6b-7eea-bd6c-6ce4ccbddd0e) (expected to succeed)
   Task A deleted successfully.
----- post-test output end -----
  Scenario 2: Complex Dependency Chain Management ... ok (1s)
```
## Scenario 3: scheduling + attribute update
```
--- Scenario 3: Task Scheduling and Attribute Modification Lifecycle ---
Tests creation, multiple schedules, various attribute updates, and deletion of schedules.
  Calling createTask with: {"owner":"user:Bob","taskName":"Multi-Scenario Task","category":"Flex","duration":180,"priority":2,"splittable":true,"deadline":"2025-10-21T00:15:06.115Z","slack":15,"note":"Initial note for multi-scenario task"}
  createTask result: {"_id":"0199f9d1-e383-741f-a879-be1b4fafce94","owner":"user:Bob","taskName":"Multi-Scenario Task","category":"Flex","duration":180,"priority":2,"splittable":true,"timeBlockSet":[],"deadline":"2025-10-21T00:15:06.115Z","slack":15,"note":"Initial note for multi-scenario task","postDependence":[]}
1. Created task X: {"_id":"0199f9d1-e383-741f-a879-be1b4fafce94","owner":"user:Bob","taskName":"Multi-Scenario Task","category":"Flex","duration":180,"priority":2,"splittable":true,"timeBlockSet":[],"deadline":"2025-10-21T00:15:06.115Z","slack":15,"note":"Initial note for multi-scenario task","postDependence":[]}
2. Assigning schedule timeblock:TuesdayMorning to task X
3. Assigning schedule timeblock:WednesdayAfternoon to task X
   Task X now has schedules: ["timeblock:TuesdayMorning","timeblock:WednesdayAfternoon"]
4. Updating duration for task X to 240
5. Updating priority for task X to 3
6. Updating splittable for task X to false
7. Updating slack for task X to 20
8. Updating note for task X to 'Updated detailed note'
9. Updating deadline for task X to 2025-10-24T00:15:06.306Z
   Task X after all updates: {"_id":"0199f9d1-e383-741f-a879-be1b4fafce94","owner":"user:Bob","taskName":"Multi-Scenario Task","category":"Flex","duration":240,"priority":3,"splittable":false,"timeBlockSet":["timeblock:TuesdayMorning","timeblock:WednesdayAfternoon"],"deadline":"2025-10-24T00:15:06.306Z","slack":20,"note":"Updated detailed note","postDependence":[]}
10. Deleting schedule 'timeblock:TuesdayMorning' from task X
   Task X schedules after deletion: ["timeblock:WednesdayAfternoon"]
11. Deleting remaining schedule 'timeblock:WednesdayAfternoon' from task X
12. Deleting task X (0199f9d1-e383-741f-a879-be1b4fafce94)
   Task X deleted.
----- post-test output end -----
  Scenario 3: Task Scheduling and Attribute Modification Lifecycle ... ok (878ms)
```

## Scenario 4: user isolation and error handling
```
--- Scenario 4: User Isolation and Error Handling ---
Tests that users cannot interact with other users' tasks and confirms specific error messages for invalid operations.
  Calling createTask with: {"owner":"user:Alice","taskName":"Alice's Private Task","category":"Personal","duration":60,"priority":1,"splittable":false}
  createTask result: {"_id":"0199f9d1-e6f2-76ba-b709-e18f4bc016c6","owner":"user:Alice","taskName":"Alice's Private Task","category":"Personal","duration":60,"priority":1,"splittable":false,"timeBlockSet":[],"postDependence":[]}
1. Alice created task: 0199f9d1-e6f2-76ba-b709-e18f4bc016c6
2. Bob (user:Bob) attempting to update Alice's task 0199f9d1-e6f2-76ba-b709-e18f4bc016c6 (expected to fail)
   Bob's update attempt failed as expected. Alice's task name is still: 'Alice's Private Task'
3. Bob (user:Bob) attempting to assign schedule to Alice's task 0199f9d1-e6f2-76ba-b709-e18f4bc016c6 (expected to fail)
   Bob's schedule assignment failed as expected.
4. Alice (user:Alice) assigning schedule timeblock:AliceSchedule to her task 0199f9d1-e6f2-76ba-b709-e18f4bc016c6
   Alice's task successfully scheduled.
5. Bob (user:Bob) attempting to delete schedule from Alice's task 0199f9d1-e6f2-76ba-b709-e18f4bc016c6 (expected to fail)
   Bob's schedule deletion failed as expected.
6. Alice (user:Alice) deleting her task 0199f9d1-e6f2-76ba-b709-e18f4bc016c6
   Alice's task successfully deleted.
----- post-test output end -----
  Scenario 4: User Isolation and Error Handling ... ok (322ms)
```

## Scenario 5: repetition and invalid arguments
```
--- Scenario 5: Repetition and Invalid Arguments ---
Tests repeating actions, providing invalid references, and general robustness.
  Calling createTask with: {"owner":"user:Charlie","taskName":"Repetition Task","category":"Experiment","duration":60,"priority":1,"splittable":false}
  createTask result: {"_id":"0199f9d1-e834-7db4-911a-449b3c8f6371","owner":"user:Charlie","taskName":"Repetition Task","category":"Experiment","duration":60,"priority":1,"splittable":false,"timeBlockSet":[],"postDependence":[]}
1. Created task Z: 0199f9d1-e834-7db4-911a-449b3c8f6371
2. Attempting to add non-existent task task:NonExistentDep as pre-dependence to task Z 0199f9d1-e834-7db4-911a-449b3c8f6371 (expected to fail)
   Adding non-existent pre-dependence failed as expected.
  Calling createTask with: {"owner":"user:Charlie","taskName":"Existent Task for Dep","category":"General","duration":60,"priority":1,"splittable":false}
  createTask result: {"_id":"0199f9d1-e88b-71d8-8b98-8c5dc9b75a3f","owner":"user:Charlie","taskName":"Existent Task for Dep","category":"General","duration":60,"priority":1,"splittable":false,"timeBlockSet":[],"postDependence":[]}
3. Attempting to remove non-existent pre-dependence 0199f9d1-e88b-71d8-8b98-8c5dc9b75a3f from task Z 0199f9d1-e834-7db4-911a-449b3c8f6371 (expected to fail)
   Removing non-existent pre-dependence from list failed as expected.
4. Assigning schedule timeblock:Repeated to task Z 0199f9d1-e834-7db4-911a-449b3c8f6371 (first time, expected to succeed)
   First assignment successful.
5. Assigning schedule timeblock:Repeated to task Z 0199f9d1-e834-7db4-911a-449b3c8f6371 again (second time, expected to fail)
   Second assignment failed as expected.
6. Deleting task Z (0199f9d1-e834-7db4-911a-449b3c8f6371)
   Task Z deleted.
----- post-test output end -----
  Scenario 5: Repetition and Invalid Arguments ... ok (424ms)
TaskCatalog Concept Tests ... ok (3s)
```
Thus, all test cases passed successfully for TaskCatalog concept!

# ScheduleTime
## Scenario 0: operational principle, user schedules tasks for the day
The operational principle is:
  > Each user owns a set of time blocks reflecting chunks of time during the day. Users can allocate tasks to one or more time blocks. The time blocks reflect the user's intended schedule of the day.

This test validates the operational principle of the ScheduleTime concept by simulating how a user structures their day into scheduled time blocks. The user, Alice, first creates two distinct time blocks, representing available periods in her day. She then assigns different tasks, buyGroceries and finishReport, to each of those time blocks, demonstrating how tasks can be allocated to specific segments of time. Finally, retrieving Alice’s schedule confirms that each time block correctly reflects its assigned task and belongs to the right user.

```
running 1 test from ./src/concepts/ScheduleTime/ScheduleTime.test.ts
--- Test: Operational Principle: Alice schedules tasks ---
[Alice] addTimeBlock: owner=user:Alice, start=1760836502543 (9:15:02 PM), end=1760840102543 (10:15:02 PM)
-> addTimeBlock (1) result: {}
[Alice] addTimeBlock: owner=user:Alice, start=1760843702543 (11:15:02 PM), end=1760847302543 (12:15:02 AM)
-> addTimeBlock (2) result: {}
[Alice] assignTimeBlock: owner=user:Alice, taskId=task:buyGroceries, start=1760836502543 (9:15:02 PM), end=1760840102543 (10:15:02 PM)
-> assignTimeBlock (1) result: { timeBlockId: "0199f9d1-d5bb-7e88-8171-cd92eedb654d" }
[Alice] assignTimeBlock: owner=user:Alice, taskId=task:finishReport, start=1760843702543 (11:15:02 PM), end=1760847302543 (12:15:02 AM)
-> assignTimeBlock (2) result: { timeBlockId: "0199f9d1-d60a-7cf4-abf4-81f6c7cefddb" }
[Alice] _getUserSchedule: owner=user:Alice
-> Alice's schedule: [
  {
    timeBlock: {
      _id: "0199f9d1-d5bb-7e88-8171-cd92eedb654d",
      owner: "user:Alice",
      start: 1760836502543,
      end: 1760840102543,
      taskIdSet: [ "task:buyGroceries" ]
    }
  },
  {
    timeBlock: {
      _id: "0199f9d1-d60a-7cf4-abf4-81f6c7cefddb",
      owner: "user:Alice",
      start: 1760843702543,
      end: 1760847302543,
      taskIdSet: [ "task:finishReport" ]
    }
  }
]
----- post-test output end -----
  Operational Principle: User schedules tasks for the day ... ok (389ms)
```

## Scenario 1: assigning tasks
``` 
Scenario 1: Assigning tasks - new block, existing block, duplicate task (error) ...
--- Test: Scenario 1: Assigning tasks ---
[Bob] assignTimeBlock: owner=user:Bob, taskId=task:meeting, start=1760850902932 (1:15:02 AM), end=1760854502932 (2:15:02 AM) (creates block)
-> assignTimeBlock (1) result: { timeBlockId: "0199f9d1-d732-76fa-b5ce-688870d1d087" }
[Bob] assignTimeBlock: owner=user:Bob, taskId=task:exercise, start=1760850902932 (1:15:02 AM), end=1760854502932 (2:15:02 AM) (existing block)
-> assignTimeBlock (2) result: { timeBlockId: "0199f9d1-d732-76fa-b5ce-688870d1d087" }
[Bob] assignTimeBlock: owner=user:Bob, taskId=task:meeting, start=1760850902932, end=1760854502932 (expected error: duplicate task)
-> assignTimeBlock (3) result (error expected): {
  error: "Task task:meeting is already assigned to time block 0199f9d1-d732-76fa-b5ce-688870d1d087 for owner user:Bob"
}
[Bob] _getUserSchedule: owner=user:Bob
-> Bob's schedule: [
  {
    timeBlock: {
      _id: "0199f9d1-d732-76fa-b5ce-688870d1d087",
      owner: "user:Bob",
      start: 1760850902932,
      end: 1760854502932,
      taskIdSet: [ "task:exercise", "task:meeting" ]
    }
  }
]
----- post-test output end -----
  Scenario 1: Assigning tasks - new block, existing block, duplicate task (error) ... ok (217ms)
```

## Scenario 2: removing tasks
```
Scenario 2: Removing tasks - valid removal, non-existent task, already removed task (errors) ...
--- Test: Scenario 2: Removing tasks ---
[Charlie] Initializing block with task:buyGroceries and task:finishReport for removal tests.
-> Charlie's block ID: 0199f9d1-d80b-7439-ad92-229c61248eb3
-> Charlie's schedule before removal: [
  {
    timeBlock: {
      _id: "0199f9d1-d80b-7439-ad92-229c61248eb3",
      owner: "user:Charlie",
      start: 1760858103150,
      end: 1760861703150,
      taskIdSet: [ "task:buyGroceries", "task:finishReport" ]
    }
  }
]
[Charlie] removeTask: owner=user:Charlie, taskId=task:buyGroceries, timeBlockId=0199f9d1-d80b-7439-ad92-229c61248eb3 (expected success)
-> removeTask (1) result: {}
-> Charlie's schedule after first removal: [
  {
    timeBlock: {
      _id: "0199f9d1-d80b-7439-ad92-229c61248eb3",
      owner: "user:Charlie",
      start: 1760858103150,
      end: 1760861703150,
      taskIdSet: [ "task:finishReport" ]
    }
  }
]
[Charlie] removeTask: owner=user:Charlie, taskId=task:readBook, timeBlockId=0199f9d1-d80b-7439-ad92-229c61248eb3 (expected error: task not in block)
-> removeTask (2) result (error expected): {
  error: "Task task:readBook not found in time block 0199f9d1-d80b-7439-ad92-229c61248eb3 for owner user:Charlie"
}
[Charlie] removeTask: owner=user:Charlie, taskId=task:buyGroceries, timeBlockId=0199f9d1-d80b-7439-ad92-229c61248eb3 (expected error: task already removed)
-> removeTask (3) result (error expected): {
  error: "Task task:buyGroceries not found in time block 0199f9d1-d80b-7439-ad92-229c61248eb3 for owner user:Charlie"
}
----- post-test output end -----
  Scenario 2: Removing tasks - valid removal, non-existent task, already removed task (errors) ... ok (355ms)
```

## Scenario 3: addTimeBlock and duplication
```
Scenario 3: addTimeBlock requirements - duplicate block (error) ...
--- Test: Scenario 3: addTimeBlock duplicates ---
[David] addTimeBlock: owner=user:David, start=1760865303505 (5:15:03 AM), end=1760868903505 (6:15:03 AM)
-> addTimeBlock (1) result: {}
[David] addTimeBlock: owner=user:David, start=1760865303505, end=1760868903505 (expected error: duplicate block)
-> addTimeBlock (2) result (error expected): {
  error: "Time block already exists for owner user:David from 1760865303505 to 1760868903505"
}
[David] _getUserSchedule: owner=user:David
-> David's schedule: [
  {
    timeBlock: {
      _id: "0199f9d1-d970-77f3-9e70-bdb1b9f5be74",
      owner: "user:David",
      start: 1760865303505,
      end: 1760868903505,
      taskIdSet: []
    }
  }
]
----- post-test output end -----
  Scenario 3: addTimeBlock requirements - duplicate block (error) ... ok (124ms)
```

## Scenario 4: Non-existing owner
```
  Scenario 4: Querying for non-existent owner or old blocks (error) ...
------- post-test output -------

--- Test: Scenario 4: Querying for non-existent/old blocks ---
[Eve] _getUserSchedule: owner=user:Eve (no blocks exist for Eve)
-> Eve's schedule (error expected): { error: "No future time blocks found for owner user:Eve" }
[Frank] addTimeBlock: owner=user:Frank, start=1760825703660 (6:15:03 PM), end=1760829303660 (7:15:03 PM) (in the past)
[Frank] _getUserSchedule: owner=user:Frank (blocks are in the past)
-> Frank's schedule (error expected): { error: "No future time blocks found for owner user:Frank" }
----- post-test output end -----
  Scenario 4: Querying for non-existent owner or old blocks (error) ... ok (126ms)
ScheduleTime Concept Tests ... ok (1s)
```
All 5 test cases for ScheduleTime are successfully passed!

# RoutineLog
## Scenario 0: operational principles
Operational principles for RoutineLog:
> principle: After a user starts and finishes a session, the system records its actual duration and possible reasons of interruption.

This test validates the operational principle of the RoutineLog concept by simulating how a user records an actual work session from start to finish. The user, Alice, first creates a new session linked to a planned task, confirming that the session is initialized with proper default states—inactive, not paused, and without start or end times. She then starts the session, which records the current timestamp and updates the session to active, showing that real-time activity is being tracked. Afterward, she ends the session, and the system correctly captures the end timestamp and marks the session as inactive. Finally, retrieving Alice’s session confirms that both start and end times are recorded, reflecting the true duration of her activity. Overall, this test demonstrates the principle that RoutineLog captures actual user activity as timestamped sessions, ensuring that each session’s lifecycle—creation, start, and end—is accurately recorded for reflection against the user’s planned schedule.

```
Operational Principle: Create, Start, and End a Session ...
------- post-test output -------
--- Operational Principle Test ---
Action: createSession by owner: user:Alice, name: "Work on Project X", linkedTaskId: task:TaskA
Effect: Session created with ID: 0199f9d1-ce43-73dd-bd0f-e02fbcf1c4e8
Created session: {"_id":"0199f9d1-ce43-73dd-bd0f-e02fbcf1c4e8","owner":"user:Alice","sessionName":"Work on Project X","isPaused":false,"isActive":false,"linkedTaskId":"task:TaskA"}
Action: startSession for owner: user:Alice, sessionId: 0199f9d1-ce43-73dd-bd0f-e02fbcf1c4e8
Effect: Session 0199f9d1-ce43-73dd-bd0f-e02fbcf1c4e8 started at 2025-10-19T00:15:00.722Z.
Started session ID: 0199f9d1-ce43-73dd-bd0f-e02fbcf1c4e8
Query: _getUserSessions for owner: user:Alice
Effect: Found 1 sessions for owner user:Alice.
Verified session state after start: {"_id":"0199f9d1-ce43-73dd-bd0f-e02fbcf1c4e8","owner":"user:Alice","sessionName":"Work on Project X","isPaused":false,"isActive":true,"start":"2025-10-19T00:15:00.722Z","end":null,"linkedTaskId":"task:TaskA","interruptReason":null}
Action: endSession for owner: user:Alice, sessionId: 0199f9d1-ce43-73dd-bd0f-e02fbcf1c4e8
Effect: Session 0199f9d1-ce43-73dd-bd0f-e02fbcf1c4e8 ended at 2025-10-19T00:15:00.781Z.
Ended session ID: 0199f9d1-ce43-73dd-bd0f-e02fbcf1c4e8
Query: _getUserSessions for owner: user:Alice
Effect: Found 1 sessions for owner user:Alice.
Verified final session state: {"_id":"0199f9d1-ce43-73dd-bd0f-e02fbcf1c4e8","owner":"user:Alice","sessionName":"Work on Project X","isPaused":false,"isActive":false,"start":"2025-10-19T00:15:00.722Z","end":"2025-10-19T00:15:00.781Z","linkedTaskId":"task:TaskA","interruptReason":null}
----- post-test output end -----
  Operational Principle: Create, Start, and End a Session ... ok (169ms)
------- post-test output -------
```

## Scenario 1: start cases
```
Scenario 1: Attempt to start an already active session or another user's session ...
--- Scenario 1: Invalid Start Attempts ---
Action: createSession by owner: user:Alice, name: "Coding", linkedTaskId: None
Effect: Session created with ID: 0199f9d1-ceec-7340-8c52-614b9d26591e
Action: startSession for owner: user:Alice, sessionId: 0199f9d1-ceec-7340-8c52-614b9d26591e
Effect: Session 0199f9d1-ceec-7340-8c52-614b9d26591e started at 2025-10-19T00:15:00.879Z.
Created and started session ID: 0199f9d1-ceec-7340-8c52-614b9d26591e
Action: startSession for owner: user:Alice, sessionId: 0199f9d1-ceec-7340-8c52-614b9d26591e
Error: startSession failed. Session not found, not owned by user, or already active.
Attempted to restart active session (expected error): {"error":"Session not found, not owned by user, or already active."}
Action: startSession for owner: user:Bob, sessionId: 0199f9d1-ceec-7340-8c52-614b9d26591e
Error: startSession failed. Session not found, not owned by user, or already active.
Attempted to start another user's session (expected error): {"error":"Session not found, not owned by user, or already active."}
----- post-test output end -----
  Scenario 1: Attempt to start an already active session or another user's session ... ok (120ms)
------- post-test output -------
```

## Scenario 2: interruption
```
Scenario 2: Interrupting a session ...
--- Scenario 2: Interrupting a Session ---
Action: createSession by owner: user:Alice, name: "Reading", linkedTaskId: None
Effect: Session created with ID: 0199f9d1-cf64-76ba-ab0c-f2fa7974ace1
Action: startSession for owner: user:Alice, sessionId: 0199f9d1-cf64-76ba-ab0c-f2fa7974ace1
Effect: Session 0199f9d1-cf64-76ba-ab0c-f2fa7974ace1 started at 2025-10-19T00:15:00.992Z.
Created and started session ID: 0199f9d1-cf64-76ba-ab0c-f2fa7974ace1
Action: interruptSession for owner: user:Alice, sessionId: 0199f9d1-cf64-76ba-ab0c-f2fa7974ace1, reason: "Phone call"
Effect: Session 0199f9d1-cf64-76ba-ab0c-f2fa7974ace1 interrupted at 2025-10-19T00:15:01.024Z with reason: "Phone call".
Interrupted session ID: 0199f9d1-cf64-76ba-ab0c-f2fa7974ace1
Query: _getUserSessions for owner: user:Alice
Effect: Found 3 sessions for owner user:Alice.
Verified interrupted session state: {"_id":"0199f9d1-cf64-76ba-ab0c-f2fa7974ace1","owner":"user:Alice","sessionName":"Reading","isPaused":true,"isActive":false,"start":"2025-10-19T00:15:00.992Z","end":"2025-10-19T00:15:01.024Z","linkedTaskId":null,"interruptReason":"Phone call"}
Action: endSession for owner: user:Alice, sessionId: 0199f9d1-cf64-76ba-ab0c-f2fa7974ace1
Error: endSession failed. Session not found, not owned by user, or not currently active.
Attempted to end an interrupted session (expected error): {"error":"Session not found, not owned by user, or not currently active."}
----- post-test output end -----
  Scenario 2: Interrupting a session ... ok (154ms)
------- post-test output -------
```

## Scenario 3: multiple sessions
```
Scenario 3: Create multiple sessions and retrieve them for a user ...
--- Scenario 3: Multiple Sessions and Retrieval ---
Action: createSession by owner: user:Alice, name: "Brainstorming", linkedTaskId: task:TaskA
Effect: Session created with ID: 0199f9d1-cffe-70bf-a82c-d3880fad07c3
Action: createSession by owner: user:Alice, name: "Writing", linkedTaskId: task:TaskB
Effect: Session created with ID: 0199f9d1-d01f-7313-942b-8d0a0555d5ee
Action: startSession for owner: user:Alice, sessionId: 0199f9d1-cffe-70bf-a82c-d3880fad07c3
Effect: Session 0199f9d1-cffe-70bf-a82c-d3880fad07c3 started at 2025-10-19T00:15:01.182Z.
Action: endSession for owner: user:Alice, sessionId: 0199f9d1-cffe-70bf-a82c-d3880fad07c3
Effect: Session 0199f9d1-cffe-70bf-a82c-d3880fad07c3 ended at 2025-10-19T00:15:01.215Z.
Action: startSession for owner: user:Alice, sessionId: 0199f9d1-d01f-7313-942b-8d0a0555d5ee
Effect: Session 0199f9d1-d01f-7313-942b-8d0a0555d5ee started at 2025-10-19T00:15:01.245Z.
Action: interruptSession for owner: user:Alice, sessionId: 0199f9d1-d01f-7313-942b-8d0a0555d5ee, reason: "Lunch break"
Effect: Session 0199f9d1-d01f-7313-942b-8d0a0555d5ee interrupted at 2025-10-19T00:15:01.277Z with reason: "Lunch break".
Created and manipulated sessions ID: 0199f9d1-cffe-70bf-a82c-d3880fad07c3 and 0199f9d1-d01f-7313-942b-8d0a0555d5ee
Action: createSession by owner: user:Bob, name: "Planning", linkedTaskId: None
Effect: Session created with ID: 0199f9d1-d0bb-7173-a542-a19a745a2ab2
Action: startSession for owner: user:Bob, sessionId: 0199f9d1-d0bb-7173-a542-a19a745a2ab2
Effect: Session 0199f9d1-d0bb-7173-a542-a19a745a2ab2 started at 2025-10-19T00:15:01.340Z.
Created session ID: 0199f9d1-d0bb-7173-a542-a19a745a2ab2 for Bob.
Query: _getUserSessions for owner: user:Alice
Effect: Found 5 sessions for owner user:Alice.
Retrieved Alice's sessions: ["Work on Project X","Coding","Reading","Brainstorming","Writing"]
Query: _getUserSessions for owner: user:Bob
Effect: Found 1 sessions for owner user:Bob.
Retrieved Bob's sessions: ["Planning"]
----- post-test output end -----
  Scenario 3: Create multiple sessions and retrieve them for a user ... ok (313ms)
------- post-test output -------
```

## Scenario 4: edge-cases for ending
```
Scenario 4: Attempt to end a non-existent or un-started session ...
--- Scenario 4: Invalid End Attempts ---
Action: createSession by owner: user:Alice, name: "Unstarted Task", linkedTaskId: None
Effect: Session created with ID: 0199f9d1-d137-73da-95f2-c2ba7b0f2ffd
Created unstarted session ID: 0199f9d1-d137-73da-95f2-c2ba7b0f2ffd
Action: endSession for owner: user:Alice, sessionId: 0199f9d1-d137-73da-95f2-c2ba7b0f2ffd
Error: endSession failed. Session not found, not owned by user, or not currently active.
Attempted to end unstarted session (expected error): {"error":"Session not found, not owned by user, or not currently active."}
Action: endSession for owner: user:Alice, sessionId: 0199f9d1-d170-7f29-83ea-297fa509c54d
Error: endSession failed. Session not found, not owned by user, or not currently active.
Attempted to end non-existent session (expected error): {"error":"Session not found, not owned by user, or not currently active."}
----- post-test output end -----
  Scenario 4: Attempt to end a non-existent or un-started session ... ok (85ms)
------- post-test output -------
```

## Scenario 5: edge-cases for interruption
```
Scenario 5: Attempt to interrupt a non-active or paused session ...
--- Scenario 5: Invalid Interrupt Attempts ---
Action: createSession by owner: user:Alice, name: "Never Active", linkedTaskId: None
Effect: Session created with ID: 0199f9d1-d18c-78bb-9216-087a28ee5097
Created never-active session ID: 0199f9d1-d18c-78bb-9216-087a28ee5097
Action: interruptSession for owner: user:Alice, sessionId: 0199f9d1-d18c-78bb-9216-087a28ee5097, reason: "Early break"
Error: interruptSession failed. Session not found, not owned by user, not active, or already paused.
Attempted to interrupt never-active session (expected error): {"error":"Session not found, not owned by user, not active, or already paused."}
Action: createSession by owner: user:Alice, name: "Double Interrupt", linkedTaskId: None
Effect: Session created with ID: 0199f9d1-d1c6-7df8-9e1a-ef19d23099dc
Action: startSession for owner: user:Alice, sessionId: 0199f9d1-d1c6-7df8-9e1a-ef19d23099dc
Effect: Session 0199f9d1-d1c6-7df8-9e1a-ef19d23099dc started at 2025-10-19T00:15:01.606Z.
Action: interruptSession for owner: user:Alice, sessionId: 0199f9d1-d1c6-7df8-9e1a-ef19d23099dc, reason: "First interruption"
Effect: Session 0199f9d1-d1c6-7df8-9e1a-ef19d23099dc interrupted at 2025-10-19T00:15:01.638Z with reason: "First interruption".
Created, started, and interrupted session ID: 0199f9d1-d1c6-7df8-9e1a-ef19d23099dc
Action: interruptSession for owner: user:Alice, sessionId: 0199f9d1-d1c6-7df8-9e1a-ef19d23099dc, reason: "Second interruption"
Error: interruptSession failed. Session not found, not owned by user, not active, or already paused.
Attempted to interrupt already paused session (expected error): {"error":"Session not found, not owned by user, not active, or already paused."}
----- post-test output end -----
  Scenario 5: Attempt to interrupt a non-active or paused session ... ok (183ms)
RoutineLog Concept Tests ... ok (1s)
```
All 6 test cases for RoutineLog are successfully passed!

# AdaptiveSchedule
The test script mocks the GeminiLLM to control its response for deterministic testing. We do this to generate test cases that can be replicated, since we only want to test the concept's behavior in this case, not how well the LLM works.

## Scenario 0: operational principle
Operational principle for AdaptiveSchedule:
> When actual sessions overrun or diverge from the plan, the adaptive scheduler adjusts subsequent planned tasks into adaptive time blocks. This process can operate in two modes: (1) Manual mode — user reviews deviations and adjusts future time blocks; (2) AI-augmented mode — provide necessary context to the LLM, then the LLM analyzes deviations, infers likely causes, and automatically proposes a revised schedule.

This test validates the operational principle of AdaptiveSchedule by exercising the full AI-augmented adjustment loop plus manual editing and queries. First, requestAdaptiveScheduleAI is invoked with contextual inputs (planned schedule, actual sessions, task set, current time in the prompt, simulating how a sync will pass in these data). The mock LLM returns five adaptive blocks and zero dropped tasks, and the system materializes those blocks, each with unique IDs, owner, start/end, and assigned task IDs, demonstrating automatic rescheduling when reality diverges. Next, a manual override via unassignBlock removes task:gym from its 17:00–18:00 block, showing that users can adjust the AI’s proposal without recreating blocks. Finally, _getAdaptiveSchedule and _getDroppedTask confirm the post-edit state, proving that the scheduler both adapts (AI mode) and supports user control (manual mode).

```
Operational Principle: AI Adaptation, Unassigning, Querying ...
--- Operational Principle Test ---
  Test started at simulated current time: 2025-10-04T13:00:00.000Z
  Action: requestAdaptiveScheduleAI for user user:Alice with contexted_prompt
  [MOCK LLM] Called with prompt (truncated): 
  You are a helpful AI assistant that creates optimal adaptive schedules for users based on task analysis, planned schedules, actual routines, and user preferences.

  USER: user:Alice
  
CURRENT TIM...
  Output: Adaptive Blocks: 5 entries, Dropped Tasks: 0 entries

  --- Current Adaptive Schedule for user:Alice (after AI adaptation) ---
    - Block ID: 0199fa37-bcba-7e69-b361-6186f3edcce2, Start: 2025-10-04T13:00:00.000Z, End: 2025-10-04T14:30:00.000Z, Tasks: [task:projectProposal]
    - Block ID: 0199fa37-bcfe-745c-a66b-c52fbf7641e8, Start: 2025-10-04T14:30:00.000Z, End: 2025-10-04T15:30:00.000Z, Tasks: [task:reviewPR]
    - Block ID: 0199fa37-bd41-70cd-b6da-3bca1a3dc3f5, Start: 2025-10-04T17:00:00.000Z, End: 2025-10-04T18:00:00.000Z, Tasks: [task:gym]
    - Block ID: 0199fa37-bd80-7691-a216-b4a831629a58, Start: 2025-10-04T18:00:00.000Z, End: 2025-10-04T18:30:00.000Z, Tasks: [task:dinner]
    - Block ID: 0199fa37-bdc8-73a8-a798-8ebd75d50335, Start: 2025-10-04T18:30:00.000Z, End: 2025-10-04T19:00:00.000Z, Tasks: [task:spanish]
  --- End Current Adaptive Schedule ---

  --- Current Dropped Tasks for user:Alice (after AI adaptation) ---
    (No dropped tasks found)
  --- End Current Dropped Tasks ---
  Action: unassignBlock for user user:Alice, task task:gym from its block
  Output: {} (success)

  --- Current Adaptive Schedule for user:Alice (after unassigning gym task) ---
    - Block ID: 0199fa37-bcba-7e69-b361-6186f3edcce2, Start: 2025-10-04T13:00:00.000Z, End: 2025-10-04T14:30:00.000Z, Tasks: [task:projectProposal]
    - Block ID: 0199fa37-bcfe-745c-a66b-c52fbf7641e8, Start: 2025-10-04T14:30:00.000Z, End: 2025-10-04T15:30:00.000Z, Tasks: [task:reviewPR]
    - Block ID: 0199fa37-bd41-70cd-b6da-3bca1a3dc3f5, Start: 2025-10-04T17:00:00.000Z, End: 2025-10-04T18:00:00.000Z, Tasks: []
    - Block ID: 0199fa37-bd80-7691-a216-b4a831629a58, Start: 2025-10-04T18:00:00.000Z, End: 2025-10-04T18:30:00.000Z, Tasks: [task:dinner]
    - Block ID: 0199fa37-bdc8-73a8-a798-8ebd75d50335, Start: 2025-10-04T18:30:00.000Z, End: 2025-10-04T19:00:00.000Z, Tasks: [task:spanish]
  --- End Current Adaptive Schedule ---
  Action: _getAdaptiveSchedule for user user:Alice
  Output: Found 5 adaptive blocks.
  Action: _getDroppedTask for user user:Alice
  Output: Found 0 dropped tasks.


--- Operational Principle Test Summary ---
Summary based on current time: 2025-10-04T13:00:00.000Z

All Tasks (considered for scheduling):
  - Task ID: task:projectProposal, Name: Complete Project Proposal, Priority: 1, Duration: 90 min, Splittable: true, Deadline: N/A
  - Task ID: task:reviewPR, Name: Review Pull Requests, Priority: 2, Duration: 60 min, Splittable: false, Deadline: N/A
  - Task ID: task:gym, Name: Gym Workout, Priority: 3, Duration: 60 min, Splittable: false, Deadline: N/A
  - Task ID: task:dinner, Name: Prepare Dinner, Priority: 3, Duration: 30 min, Splittable: false, Deadline: N/A
  - Task ID: task:spanish, Name: Study Spanish, Priority: 4, Duration: 30 min, Splittable: true, Deadline: N/A

Original Planned Schedule:
  - Block ID: planned-1, Start: 2025-10-04T09:00:00.000Z, End: 2025-10-04T11:00:00.000Z, Tasks: [task:projectProposal]
  - Block ID: planned-2, Start: 2025-10-04T14:00:00.000Z, End: 2025-10-04T15:00:00.000Z, Tasks: [task:reviewPR]
  - Block ID: planned-3, Start: 2025-10-04T17:00:00.000Z, End: 2025-10-04T18:00:00.000Z, Tasks: [task:gym]
  - Block ID: planned-4, Start: 2025-10-04T18:00:00.000Z, End: 2025-10-04T18:30:00.000Z, Tasks: [task:dinner]
  - Block ID: planned-5, Start: 2025-10-04T19:00:00.000Z, End: 2025-10-04T19:30:00.000Z, Tasks: [task:spanish]

Actual Routine:
  - Session ID: 0199fa37-bc56-7115-898c-a8b3c151eb28, Name: Morning Meeting, Start: 2025-10-04T09:00:00.000Z, End: 2025-10-04T10:30:00.000Z, Linked Task: N/A
  - Session ID: 0199fa37-bc56-7b93-b90c-fd606b544777, Name: Started Project Proposal, Start: 2025-10-04T10:30:00.000Z, End: 2025-10-04T11:00:00.000Z, Linked Task: task:projectProposal

Final Adaptive Schedule:
  - Block ID: 0199fa37-bcba-7e69-b361-6186f3edcce2, Start: 2025-10-04T13:00:00.000Z, End: 2025-10-04T14:30:00.000Z, Tasks: [task:projectProposal]
  - Block ID: 0199fa37-bcfe-745c-a66b-c52fbf7641e8, Start: 2025-10-04T14:30:00.000Z, End: 2025-10-04T15:30:00.000Z, Tasks: [task:reviewPR]
  - Block ID: 0199fa37-bd41-70cd-b6da-3bca1a3dc3f5, Start: 2025-10-04T17:00:00.000Z, End: 2025-10-04T18:00:00.000Z, Tasks: []
  - Block ID: 0199fa37-bd80-7691-a216-b4a831629a58, Start: 2025-10-04T18:00:00.000Z, End: 2025-10-04T18:30:00.000Z, Tasks: [task:dinner]
  - Block ID: 0199fa37-bdc8-73a8-a798-8ebd75d50335, Start: 2025-10-04T18:30:00.000Z, End: 2025-10-04T19:00:00.000Z, Tasks: [task:spanish]

Final Dropped Tasks:
  (No dropped tasks found)
--- End Summary ---
----- output end -----
  Operational Principle: AI Adaptation, Unassigning, Querying ... ok (784ms)
```

## Scenario 1: duplicate time block and task assignment
```
Interesting Scenario 1: Duplicate Time Block & Task Assignment ...
--- Interesting Scenario 1: Duplicate Time Block & Task Assignment ---
  Action: addTimeBlock (first call) for user user:Alice, from 2025-10-18T15:00:00.000Z to 2025-10-18T16:00:00.000Z
  Output: timeBlockId = 0199fa37-bf80-731b-bda9-8d6d92fb5123

  --- Current Adaptive Schedule for user:Alice (after adding unique time block) ---
    - Block ID: 0199fa37-bcba-7e69-b361-6186f3edcce2, Start: 2025-10-04T13:00:00.000Z, End: 2025-10-04T14:30:00.000Z, Tasks: [task:projectProposal]
    - Block ID: 0199fa37-bcfe-745c-a66b-c52fbf7641e8, Start: 2025-10-04T14:30:00.000Z, End: 2025-10-04T15:30:00.000Z, Tasks: [task:reviewPR]
    - Block ID: 0199fa37-bd41-70cd-b6da-3bca1a3dc3f5, Start: 2025-10-04T17:00:00.000Z, End: 2025-10-04T18:00:00.000Z, Tasks: []
    - Block ID: 0199fa37-bd80-7691-a216-b4a831629a58, Start: 2025-10-04T18:00:00.000Z, End: 2025-10-04T18:30:00.000Z, Tasks: [task:dinner]
    - Block ID: 0199fa37-bdc8-73a8-a798-8ebd75d50335, Start: 2025-10-04T18:30:00.000Z, End: 2025-10-04T19:00:00.000Z, Tasks: [task:spanish]
    - Block ID: 0199fa37-bf80-731b-bda9-8d6d92fb5123, Start: 2025-10-18T15:00:00.000Z, End: 2025-10-18T16:00:00.000Z, Tasks: []
  --- End Current Adaptive Schedule ---
  Action: addTimeBlock (duplicate call) for user user:Alice, from 2025-10-18T15:00:00.000Z to 2025-10-18T16:00:00.000Z
  Output: {"error":"An adaptive time block with this owner, start, and end already exists."}

  --- Current Adaptive Schedule for user:Alice (after attempting to add duplicate time block) ---
    - Block ID: 0199fa37-bcba-7e69-b361-6186f3edcce2, Start: 2025-10-04T13:00:00.000Z, End: 2025-10-04T14:30:00.000Z, Tasks: [task:projectProposal]
    - Block ID: 0199fa37-bcfe-745c-a66b-c52fbf7641e8, Start: 2025-10-04T14:30:00.000Z, End: 2025-10-04T15:30:00.000Z, Tasks: [task:reviewPR]
    - Block ID: 0199fa37-bd41-70cd-b6da-3bca1a3dc3f5, Start: 2025-10-04T17:00:00.000Z, End: 2025-10-04T18:00:00.000Z, Tasks: []
    - Block ID: 0199fa37-bd80-7691-a216-b4a831629a58, Start: 2025-10-04T18:00:00.000Z, End: 2025-10-04T18:30:00.000Z, Tasks: [task:dinner]
    - Block ID: 0199fa37-bdc8-73a8-a798-8ebd75d50335, Start: 2025-10-04T18:30:00.000Z, End: 2025-10-04T19:00:00.000Z, Tasks: [task:spanish]
    - Block ID: 0199fa37-bf80-731b-bda9-8d6d92fb5123, Start: 2025-10-18T15:00:00.000Z, End: 2025-10-18T16:00:00.000Z, Tasks: []
  --- End Current Adaptive Schedule ---
  Action: assignAdaptiveSchedule for user user:Alice, task 0199fa37-c002-7054-bbcf-ad3f49c26cd6 to block starting 2025-10-18T15:00:00.000Z
  Output: timeBlockId = 0199fa37-bf80-731b-bda9-8d6d92fb5123

  --- Current Adaptive Schedule for user:Alice (after assigning first task to time block) ---
    - Block ID: 0199fa37-bcba-7e69-b361-6186f3edcce2, Start: 2025-10-04T13:00:00.000Z, End: 2025-10-04T14:30:00.000Z, Tasks: [task:projectProposal]
    - Block ID: 0199fa37-bcfe-745c-a66b-c52fbf7641e8, Start: 2025-10-04T14:30:00.000Z, End: 2025-10-04T15:30:00.000Z, Tasks: [task:reviewPR]
    - Block ID: 0199fa37-bd41-70cd-b6da-3bca1a3dc3f5, Start: 2025-10-04T17:00:00.000Z, End: 2025-10-04T18:00:00.000Z, Tasks: []
    - Block ID: 0199fa37-bd80-7691-a216-b4a831629a58, Start: 2025-10-04T18:00:00.000Z, End: 2025-10-04T18:30:00.000Z, Tasks: [task:dinner]
    - Block ID: 0199fa37-bdc8-73a8-a798-8ebd75d50335, Start: 2025-10-04T18:30:00.000Z, End: 2025-10-04T19:00:00.000Z, Tasks: [task:spanish]
    - Block ID: 0199fa37-bf80-731b-bda9-8d6d92fb5123, Start: 2025-10-18T15:00:00.000Z, End: 2025-10-18T16:00:00.000Z, Tasks: [0199fa37-c002-7054-bbcf-ad3f49c26cd6]
  --- End Current Adaptive Schedule ---
  Action: assignAdaptiveSchedule (duplicate task) for user user:Alice, task 0199fa37-c002-7054-bbcf-ad3f49c26cd6 to block starting 2025-10-18T15:00:00.000Z
  Output: {"error":"Task 0199fa37-c002-7054-bbcf-ad3f49c26cd6 is already assigned to the block with ID 0199fa37-bf80-731b-bda9-8d6d92fb5123."}

  --- Current Adaptive Schedule for user:Alice (after attempting to assign duplicate task) ---
    - Block ID: 0199fa37-bcba-7e69-b361-6186f3edcce2, Start: 2025-10-04T13:00:00.000Z, End: 2025-10-04T14:30:00.000Z, Tasks: [task:projectProposal]
    - Block ID: 0199fa37-bcfe-745c-a66b-c52fbf7641e8, Start: 2025-10-04T14:30:00.000Z, End: 2025-10-04T15:30:00.000Z, Tasks: [task:reviewPR]
    - Block ID: 0199fa37-bd41-70cd-b6da-3bca1a3dc3f5, Start: 2025-10-04T17:00:00.000Z, End: 2025-10-04T18:00:00.000Z, Tasks: []
    - Block ID: 0199fa37-bd80-7691-a216-b4a831629a58, Start: 2025-10-04T18:00:00.000Z, End: 2025-10-04T18:30:00.000Z, Tasks: [task:dinner]
    - Block ID: 0199fa37-bdc8-73a8-a798-8ebd75d50335, Start: 2025-10-04T18:30:00.000Z, End: 2025-10-04T19:00:00.000Z, Tasks: [task:spanish]
    - Block ID: 0199fa37-bf80-731b-bda9-8d6d92fb5123, Start: 2025-10-18T15:00:00.000Z, End: 2025-10-18T16:00:00.000Z, Tasks: [0199fa37-c002-7054-bbcf-ad3f49c26cd6]
  --- End Current Adaptive Schedule ---
  Action: assignAdaptiveSchedule (new task) for user user:Alice, task 0199fa37-c0b8-75a2-b9cd-43266b61d0b0 to block starting 2025-10-18T15:00:00.000Z
  Output: timeBlockId = 0199fa37-bf80-731b-bda9-8d6d92fb5123

  --- Current Adaptive Schedule for user:Alice (after assigning another task to the same time block) ---
    - Block ID: 0199fa37-bcba-7e69-b361-6186f3edcce2, Start: 2025-10-04T13:00:00.000Z, End: 2025-10-04T14:30:00.000Z, Tasks: [task:projectProposal]
    - Block ID: 0199fa37-bcfe-745c-a66b-c52fbf7641e8, Start: 2025-10-04T14:30:00.000Z, End: 2025-10-04T15:30:00.000Z, Tasks: [task:reviewPR]
    - Block ID: 0199fa37-bd41-70cd-b6da-3bca1a3dc3f5, Start: 2025-10-04T17:00:00.000Z, End: 2025-10-04T18:00:00.000Z, Tasks: []
    - Block ID: 0199fa37-bd80-7691-a216-b4a831629a58, Start: 2025-10-04T18:00:00.000Z, End: 2025-10-04T18:30:00.000Z, Tasks: [task:dinner]
    - Block ID: 0199fa37-bdc8-73a8-a798-8ebd75d50335, Start: 2025-10-04T18:30:00.000Z, End: 2025-10-04T19:00:00.000Z, Tasks: [task:spanish]
    - Block ID: 0199fa37-bf80-731b-bda9-8d6d92fb5123, Start: 2025-10-18T15:00:00.000Z, End: 2025-10-18T16:00:00.000Z, Tasks: [0199fa37-c002-7054-bbcf-ad3f49c26cd6, 0199fa37-c0b8-75a2-b9cd-43266b61d0b0]
  --- End Current Adaptive Schedule ---
----- output end -----
  Interesting Scenario 1: Duplicate Time Block & Task Assignment ... ok (451ms)
```

## Scenario 2: invalid inputs
```
Interesting Scenario 2: Invalid Inputs ...
--- Interesting Scenario 2: Invalid Inputs ---
  Action: addTimeBlock with start >= end
  Output: {"error":"'start' TimeStamp must be before 'end' TimeStamp."}
  Action: addTimeBlock with invalid Date objects (start)
  Output: {"error":"Invalid 'start' TimeStamp."}
  Action: addTimeBlock with invalid Date objects (end)
  Output: {"error":"Invalid 'end' TimeStamp."}
  Action: assignAdaptiveSchedule with start >= end
  Output: {"error":"'start' TimeStamp must be before 'end' TimeStamp."}
  Action: unassignBlock from non-existent block 0199fa37-c12a-71fd-8836-5f0dede4864b
  Output: {"error":"Adaptive block with ID 0199fa37-c12a-71fd-8836-5f0dede4864b not found for owner user:InvalidUser."}
  Action: unassignBlock with non-existent task from block 0199fa37-c16c-7d04-8683-df94045d3061
  Output: {"error":"Task task:InvalidTask not found in block 0199fa37-c16c-7d04-8683-df94045d3061."}
  Action: _getAdaptiveSchedule for user 0199fa37-c1a8-7766-9df3-78b96e9a4719 with no data
  Output: Found 0 adaptive blocks.
  Action: _getDroppedTask for user 0199fa37-c1a8-7766-9df3-78b96e9a4719 with no data
  Output: Found 0 dropped tasks.
----- output end -----
  Interesting Scenario 2: Invalid Inputs ... ok (190ms)
```

## Scenario 3: handling bad LLM responses
```
Interesting Scenario 3: LLM Response Handling ...

--- Interesting Scenario 3: LLM Response Handling ---
  Action: requestAdaptiveScheduleAI for user user:Charlie (new schedule)
  [MOCK LLM] Called with prompt (truncated): 
  You are a helpful AI assistant that creates optimal adaptive schedules for users based on task analysis, planned schedules, actual routines, and user preferences.

  USER: user:Charlie
  
CURRENT T...
  Output: Adaptive Blocks: 2 entries, Dropped Tasks: 1 entries

  --- Current Adaptive Schedule for user:Charlie (after AI scheduling for Charlie) ---
    - Block ID: 0199fa37-c206-7ee9-8e0b-de9dbbc2f234, Start: 2025-10-19T04:00:00.000Z, End: 2025-10-19T05:00:00.000Z, Tasks: [task:read]
    - Block ID: 0199fa37-c252-7c34-8815-12e6e6498136, Start: 2025-10-19T05:00:00.000Z, End: 2025-10-19T06:00:00.000Z, Tasks: [task:plan]
  --- End Current Adaptive Schedule ---

  --- Current Dropped Tasks for user:Charlie (after AI dropping tasks for Charlie) ---
    - Task ID: task:cleanup, Reason: Not enough time for low priority task.
  --- End Current Dropped Tasks ---

  Action: requestAdaptiveScheduleAI for user user:Charlie (malformed JSON)
  [MOCK LLM] Called with prompt (truncated): dummy prompt...
  Output: {"error":"LLM response was not valid JSON: Unexpected token 'h', \"this is not json\" is not valid JSON. Response: this is not json"}

  Action: requestAdaptiveScheduleAI for user user:Charlie (missing 'droppedTasks' array)
  [MOCK LLM] Called with prompt (truncated): dummy prompt...
  Output: {"error":"LLM response missing 'droppedTasks' array."}

  Action: requestAdaptiveScheduleAI for user user:Charlie (missing 'adaptiveBlocks' array)
  [MOCK LLM] Called with prompt (truncated): dummy prompt...
  Output: {"error":"LLM response missing 'adaptiveBlocks' array."}

  Action: requestAdaptiveScheduleAI for user user:Charlie (empty 'analysis' string)
  [MOCK LLM] Called with prompt (truncated): dummy prompt...
  Output: {"error":"LLM response missing or empty 'analysis' string."}
----- output end -----
  Interesting Scenario 3: LLM Response Handling ... ok (286ms)
```

## Scenario 4: multiple users
```
Interesting Scenario 4: Multiple Users ...
--- Interesting Scenario 4: Multiple Users ---
  Action: addTimeBlock for user user:David
  Output: timeBlockId = 0199fa37-c320-7cbe-bcd0-5a4515303075

  --- Current Adaptive Schedule for user:David (after adding block for user:David) ---
    - Block ID: 0199fa37-c320-7cbe-bcd0-5a4515303075, Start: 2025-10-18T17:00:00.000Z, End: 2025-10-18T18:00:00.000Z, Tasks: []
  --- End Current Adaptive Schedule ---
  Action: assignAdaptiveSchedule for user user:David, task task:gym
  Output: timeBlockId = 0199fa37-c320-7cbe-bcd0-5a4515303075

  --- Current Adaptive Schedule for user:David (after assigning task for user:David) ---
    - Block ID: 0199fa37-c320-7cbe-bcd0-5a4515303075, Start: 2025-10-18T17:00:00.000Z, End: 2025-10-18T18:00:00.000Z, Tasks: [task:gym]
  --- End Current Adaptive Schedule ---
  Action: addTimeBlock for user user:Eve
  Output: timeBlockId = 0199fa37-c3d8-7345-b1ee-4ea6d8559370

  --- Current Adaptive Schedule for user:Eve (after adding block for user:Eve) ---
    - Block ID: 0199fa37-c3d8-7345-b1ee-4ea6d8559370, Start: 2025-10-18T19:00:00.000Z, End: 2025-10-18T20:00:00.000Z, Tasks: []
  --- End Current Adaptive Schedule ---
  Action: assignAdaptiveSchedule for user user:Eve, task task:meeting
  Output: timeBlockId = 0199fa37-c3d8-7345-b1ee-4ea6d8559370

  --- Current Adaptive Schedule for user:Eve (after assigning task for user:Eve) ---
    - Block ID: 0199fa37-c3d8-7345-b1ee-4ea6d8559370, Start: 2025-10-18T19:00:00.000Z, End: 2025-10-18T20:00:00.000Z, Tasks: [task:meeting]
  --- End Current Adaptive Schedule ---
  Action: _getAdaptiveSchedule for user user:David
  Output: UserD blocks: 1 entries. Example: ["task:gym"]
  Action: _getAdaptiveSchedule for user user:Eve
  Output: UserE blocks: 1 entries. Example: ["task:meeting"]
----- output end -----
Interesting Scenario 4: Multiple Users ... ok (434ms)
AdaptiveSchedule Concept Tests ... ok (2s)
```

Thus, AdaptiveSchedule passes all 5 test cases!