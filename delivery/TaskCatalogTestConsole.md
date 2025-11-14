
```
TaskCatalog Concept Tests ...
  Initial State: getUserTasks for a new user should return an error ...
------- output -------

--- Initial State Check: getUserTasks for a new user ---
  getUserTasks for user:Charlie returned: {"error":"No tasks found for owner: user:Charlie"}
----- output end -----
  Initial State: getUserTasks for a new user should return an error ... ok (34ms)
  Scenario 1: Operational Principle - Basic Task Lifecycle ...
------- output -------
```

```
--- Scenario 1: Operational Principle - Basic Task Lifecycle ---
This scenario demonstrates the common expected usage: create, update, schedule, and delete.
  Calling createTask with: {"owner":"user:PrincipleTester","taskName":"Operational Principle Task","category":"Principle Category","duration":90,"priority":1,"splittable":true}
  createTask result: {"_id":"0199e5da-d359-73ff-a2f6-2e3b0a36fe5f","owner":"user:PrincipleTester","taskName":"Operational Principle Task","category":"Principle Category","duration":90,"priority":1,"splittable":true,"timeBlockSet":[],"postDependence":[]}
1. Created task: {"_id":"0199e5da-d359-73ff-a2f6-2e3b0a36fe5f","owner":"user:PrincipleTester","taskName":"Operational Principle Task","category":"Principle Category","duration":90,"priority":1,"splittable":true,"timeBlockSet":[],"postDependence":[]}
2. Updating task category for 0199e5da-d359-73ff-a2f6-2e3b0a36fe5f to 'Updated Category'
   Task 0199e5da-d359-73ff-a2f6-2e3b0a36fe5f category updated. Current task: {"_id":"0199e5da-d359-73ff-a2f6-2e3b0a36fe5f","owner":"user:PrincipleTester","taskName":"Operational Principle Task","category":"Updated Category","duration":90,"priority":1,"splittable":true,"timeBlockSet":[],"postDependence":[]}
3. Assigning schedule 'timeblock:MondayMorning' to task 0199e5da-d359-73ff-a2f6-2e3b0a36fe5f
   Task 0199e5da-d359-73ff-a2f6-2e3b0a36fe5f scheduled. Current task: {"_id":"0199e5da-d359-73ff-a2f6-2e3b0a36fe5f","owner":"user:PrincipleTester","taskName":"Operational Principle Task","category":"Updated Category","duration":90,"priority":1,"splittable":true,"timeBlockSet":["timeblock:MondayMorning"],"postDependence":[]}
4. Retrieving all tasks for user:PrincipleTester
   Retrieved tasks: [{"_id":"0199e5da-d359-73ff-a2f6-2e3b0a36fe5f","owner":"user:PrincipleTester","taskName":"Operational Principle Task","category":"Updated Category","duration":90,"priority":1,"splittable":true,"timeBlockSet":["timeblock:MondayMorning"],"postDependence":[]}]
5. Deleting task 0199e5da-d359-73ff-a2f6-2e3b0a36fe5f
   Task 0199e5da-d359-73ff-a2f6-2e3b0a36fe5f deleted.
----- output end -----
  Scenario 1: Operational Principle - Basic Task Lifecycle ... ok (415ms)
  Scenario 2: Complex Dependency Chain Management ...
------- output -------

```

```
--- Scenario 2: Complex Dependency Chain Management ---
Tests creating a chain of dependencies, attempting to delete a parent, then removing dependencies and deleting successfully.
  Calling createTask with: {"owner":"user:Alice","taskName":"Task A","category":"Project","duration":120,"priority":1,"splittable":false}
  createTask result: {"_id":"0199e5da-d4f8-704d-b93c-1739d1d2f469","owner":"user:Alice","taskName":"Task A","category":"Project","duration":120,"priority":1,"splittable":false,"timeBlockSet":[],"postDependence":[]}
  Calling createTask with: {"owner":"user:Alice","taskName":"Task B","category":"Project","duration":90,"priority":1,"splittable":false}
  createTask result: {"_id":"0199e5da-d51e-7aa9-b6b6-00875bad3404","owner":"user:Alice","taskName":"Task B","category":"Project","duration":90,"priority":1,"splittable":false,"timeBlockSet":[],"postDependence":[]}
  Calling createTask with: {"owner":"user:Alice","taskName":"Task C","category":"Project","duration":60,"priority":1,"splittable":false}
  createTask result: {"_id":"0199e5da-d547-7854-b092-0ae85a50ecb5","owner":"user:Alice","taskName":"Task C","category":"Project","duration":60,"priority":1,"splittable":false,"timeBlockSet":[],"postDependence":[]}
1. Created tasks: A=0199e5da-d4f8-704d-b93c-1739d1d2f469, B=0199e5da-d51e-7aa9-b6b6-00875bad3404, C=0199e5da-d547-7854-b092-0ae85a50ecb5
2. Adding dependence: Task B depends on Task A
   Verified Task A's postDependence includes Task B.
3. Adding dependence: Task C depends on Task B
   Verified Task B's postDependence includes Task C.
4. Attempting to delete Task A (0199e5da-d4f8-704d-b93c-1739d1d2f469) (expected to fail)
   Deletion of Task A failed as expected.
5. Removing dependence: Task C from Task B's preDependence
   Verified Task B's postDependence no longer includes Task C.
6. Deleting Task C (0199e5da-d547-7854-b092-0ae85a50ecb5) (expected to succeed)
   Task C deleted successfully.
7. Removing dependence: Task B from Task A's preDependence
   Verified Task A's postDependence no longer includes Task B.
8. Deleting Task B (0199e5da-d51e-7aa9-b6b6-00875bad3404) (expected to succeed)
   Task B deleted successfully.
9. Deleting Task A (0199e5da-d4f8-704d-b93c-1739d1d2f469) (expected to succeed)
   Task A deleted successfully.
----- output end -----
  Scenario 2: Complex Dependency Chain Management ... ok (1s)
  Scenario 3: Task Scheduling and Attribute Modification Lifecycle ...
------- output -------

```

```
--- Scenario 3: Task Scheduling and Attribute Modification Lifecycle ---
Tests creation, multiple schedules, various attribute updates, and deletion of schedules.
  Calling createTask with: {"owner":"user:Bob","taskName":"Multi-Scenario Task","category":"Flex","duration":180,"priority":2,"splittable":true,"deadline":"2025-10-17T03:12:29.091Z","slack":15,"note":"Initial note for multi-scenario task"}
  createTask result: {"_id":"0199e5da-d9a3-7976-a696-4eab15e259f7","owner":"user:Bob","taskName":"Multi-Scenario Task","category":"Flex","duration":180,"priority":2,"splittable":true,"timeBlockSet":[],"deadline":"2025-10-17T03:12:29.091Z","slack":15,"note":"Initial note for multi-scenario task","postDependence":[]}
1. Created task X: {"_id":"0199e5da-d9a3-7976-a696-4eab15e259f7","owner":"user:Bob","taskName":"Multi-Scenario Task","category":"Flex","duration":180,"priority":2,"splittable":true,"timeBlockSet":[],"deadline":"2025-10-17T03:12:29.091Z","slack":15,"note":"Initial note for multi-scenario task","postDependence":[]}
2. Assigning schedule timeblock:TuesdayMorning to task X
3. Assigning schedule timeblock:WednesdayAfternoon to task X
   Task X now has schedules: ["timeblock:TuesdayMorning","timeblock:WednesdayAfternoon"]
4. Updating duration for task X to 240
5. Updating priority for task X to 3
6. Updating splittable for task X to false
7. Updating slack for task X to 20
8. Updating note for task X to 'Updated detailed note'
9. Updating deadline for task X to 2025-10-20T03:12:29.306Z
   Task X after all updates: {"_id":"0199e5da-d9a3-7976-a696-4eab15e259f7","owner":"user:Bob","taskName":"Multi-Scenario Task","category":"Flex","duration":240,"priority":3,"splittable":false,"timeBlockSet":["timeblock:TuesdayMorning","timeblock:WednesdayAfternoon"],"deadline":"2025-10-20T03:12:29.306Z","slack":20,"note":"Updated detailed note","postDependence":[]}
10. Deleting schedule 'timeblock:TuesdayMorning' from task X
   Task X schedules after deletion: ["timeblock:WednesdayAfternoon"]
11. Deleting remaining schedule 'timeblock:WednesdayAfternoon' from task X
12. Deleting task X (0199e5da-d9a3-7976-a696-4eab15e259f7)
   Task X deleted.
----- output end -----
  Scenario 3: Task Scheduling and Attribute Modification Lifecycle ... ok (997ms)
  Scenario 4: User Isolation and Error Handling ...
------- output -------

```

```
--- Scenario 4: User Isolation and Error Handling ---
Tests that users cannot interact with other users' tasks and confirms specific error messages for invalid operations.
  Calling createTask with: {"owner":"user:Alice","taskName":"Alice's Private Task","category":"Personal","duration":60,"priority":1,"splittable":false}
  createTask result: {"_id":"0199e5da-dd88-784d-9c30-ee37b23d375a","owner":"user:Alice","taskName":"Alice's Private Task","category":"Personal","duration":60,"priority":1,"splittable":false,"timeBlockSet":[],"postDependence":[]}
1. Alice created task: 0199e5da-dd88-784d-9c30-ee37b23d375a
2. Bob (user:Bob) attempting to update Alice's task 0199e5da-dd88-784d-9c30-ee37b23d375a (expected to fail)
   Bob's update attempt failed as expected. Alice's task name is still: 'Alice's Private Task'
3. Bob (user:Bob) attempting to assign schedule to Alice's task 0199e5da-dd88-784d-9c30-ee37b23d375a (expected to fail)
   Bob's schedule assignment failed as expected.
4. Alice (user:Alice) assigning schedule timeblock:AliceSchedule to her task 0199e5da-dd88-784d-9c30-ee37b23d375a
   Alice's task successfully scheduled.
5. Bob (user:Bob) attempting to delete schedule from Alice's task 0199e5da-dd88-784d-9c30-ee37b23d375a (expected to fail)
   Bob's schedule deletion failed as expected.
6. Alice (user:Alice) deleting her task 0199e5da-dd88-784d-9c30-ee37b23d375a
   Alice's task successfully deleted.
----- output end -----
  Scenario 4: User Isolation and Error Handling ... ok (464ms)
  Scenario 5: Repetition and Invalid Arguments ...
------- output -------
```

```
--- Scenario 5: Repetition and Invalid Arguments ---
Tests repeating actions, providing invalid references, and general robustness.
  Calling createTask with: {"owner":"user:Charlie","taskName":"Repetition Task","category":"Experiment","duration":60,"priority":1,"splittable":false}
  createTask result: {"_id":"0199e5da-df57-7df8-888b-a3b390a01d18","owner":"user:Charlie","taskName":"Repetition Task","category":"Experiment","duration":60,"priority":1,"splittable":false,"timeBlockSet":[],"postDependence":[]}
1. Created task Z: 0199e5da-df57-7df8-888b-a3b390a01d18
2. Attempting to add non-existent task task:NonExistentDep as pre-dependence to task Z 0199e5da-df57-7df8-888b-a3b390a01d18 (expected to fail)
   Adding non-existent pre-dependence failed as expected.
  Calling createTask with: {"owner":"user:Charlie","taskName":"Existent Task for Dep","category":"General","duration":60,"priority":1,"splittable":false}
  createTask result: {"_id":"0199e5da-dfbd-76c6-970d-ea8916dfb220","owner":"user:Charlie","taskName":"Existent Task for Dep","category":"General","duration":60,"priority":1,"splittable":false,"timeBlockSet":[],"postDependence":[]}
3. Attempting to remove non-existent pre-dependence 0199e5da-dfbd-76c6-970d-ea8916dfb220 from task Z 0199e5da-df57-7df8-888b-a3b390a01d18 (expected to fail)
   Removing non-existent pre-dependence from list failed as expected.
4. Assigning schedule timeblock:Repeated to task Z 0199e5da-df57-7df8-888b-a3b390a01d18 (first time, expected to succeed)
   First assignment successful.
5. Assigning schedule timeblock:Repeated to task Z 0199e5da-df57-7df8-888b-a3b390a01d18 again (second time, expected to fail)
   Second assignment failed as expected.
6. Deleting task Z (0199e5da-df57-7df8-888b-a3b390a01d18)
   Task Z deleted.
----- output end -----
  Scenario 5: Repetition and Invalid Arguments ... ok (497ms)
TaskCatalog Concept Tests ... ok (4s)
```

```
ok | 1 passed (6 steps) | 0 failed (4s)
```