```
running 5 tests from ./src/concepts/Schedule/ScheduleConcept.test.ts
Operational Principle: Sync external calendar and manage manual blocks ...
------- post-test output -------

--- Testing Operational Principle ---
Action: syncCalendar for user user:Alice with 2 events
Result: Success
Query: _getSlots for user user:Alice. Found 2 slots.
Action: blockTime for user user:Alice: {
  user: "user:Alice",
  startTime: 2023-10-26T14:00:00.000Z,
  endTime: 2023-10-26T15:00:00.000Z,
  description: "Focus Time"
}
Result: Success, created slot with ID: 019a3832-1af0-7241-a654-975910c26109
Query: _getSlots for user user:Alice. Found 3 slots.
Action: updateSlot for slot 019a3832-1af0-7241-a654-975910c26109: {
  slotId: "019a3832-1af0-7241-a654-975910c26109",
  newStartTime: 2023-10-26T14:30:00.000Z,
  newEndTime: 2023-10-26T15:30:00.000Z,
  newDescription: "Updated Focus Time"
}
Result: Success
Action: syncCalendar for user user:Alice with 1 new event
Result: Success
Query: _getSlots for user user:Alice. Found 2 slots.
--- Operational Principle Test Passed ---
----- post-test output end -----
Operational Principle: Sync external calendar and manage manual blocks ... ok (1s)
Interesting Scenario: Attempt to modify external slots ...
------- post-test output -------

--- Testing Scenario: Modify External Slots ---
Action: updateSlot on external slot 019a3832-1e0f-7308-bc79-a83b6aab7a38
Result: Correctly failed with error: "Cannot update a slot with an external origin."
Action: deleteSlot on external slot 019a3832-1e0f-7308-bc79-a83b6aab7a38
Result: Correctly failed with error: "Cannot delete a slot with an external origin."
--- Modify External Slots Test Passed ---
----- post-test output end -----
Interesting Scenario: Attempt to modify external slots ... ok (658ms)
Interesting Scenario: Handle invalid time inputs ...
------- post-test output -------

--- Testing Scenario: Invalid Time Inputs ---
Action: blockTime with startTime > endTime
Result: Correctly failed with error: "Start time must be before end time."
Action: updateSlot with newStartTime === newEndTime
Result: Correctly failed with error: "Start time must be before end time."
--- Invalid Time Inputs Test Passed ---
----- post-test output end -----
Interesting Scenario: Handle invalid time inputs ... ok (544ms)
Interesting Scenario: Complete data removal for a single user ...
------- post-test output -------

--- Testing Scenario: Data Removal ---
Setup: Created 2 slots for David and 1 slot for Eve
Action: deleteAllForUser for user user:David
Result: Success
Query: _getSlots for user user:David. Found 0 slots.
Query: _getSlots for user user:Eve. Found 1 slots.
--- Data Removal Test Passed ---
----- post-test output end -----
Interesting Scenario: Complete data removal for a single user ... ok (782ms)
Interesting Scenario: Syncing with an empty calendar and deleting a manual slot ...
------- post-test output -------

--- Testing Scenario: Empty Sync and Manual Delete ---
Setup: Created one manual and one external slot for Frank.
Action: syncCalendar for user user:Frank with an empty event list
Result: Success
Query: _getSlots for user user:Frank. Found 1 slots.
Action: deleteSlot for manual slot 019a3832-2620-7c55-a744-7bfc93740276
Result: Success
Query: _getSlots for user user:Frank. Found 0 slots.
--- Empty Sync and Manual Delete Test Passed ---
----- post-test output end -----
Interesting Scenario: Syncing with an empty calendar and deleting a manual slot ... ok (824ms)
running 1 test from ./src/concepts/Tasks/TasksConcept.test.ts
TasksConcept ...
  Operational Principle: tasks are added to a prioritized list and can be marked as complete ...
------- post-test output -------

--- TRACE: Operational Principle ---
Action: createUserTasks({ user: "user:Alice" })
Result: {}
Action: createTask({ owner: "user:Alice", description: "Buy milk" })
Result: { task: "019a3832-2f40-7cbd-82b7-09689dd80acd" }
Action: createTask({ owner: "user:Alice", description: "Walk the dog" })
Result: { task: "019a3832-2f92-7a2b-ab78-9a375075e681" }
Action: createTask({ owner: "user:Alice", description: "File taxes" })
Result: { task: "019a3832-2fd6-7d9a-8e33-9b74df36ab57" }
Query: _getTasks({ user: "user:Alice" })
Result: {
  tasks: [
    {
      _id: "019a3832-2f40-7cbd-82b7-09689dd80acd",
      owner: "user:Alice",
      description: "Buy milk",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    },
    {
      _id: "019a3832-2f92-7a2b-ab78-9a375075e681",
      owner: "user:Alice",
      description: "Walk the dog",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    },
    {
      _id: "019a3832-2fd6-7d9a-8e33-9b74df36ab57",
      owner: "user:Alice",
      description: "File taxes",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    }
  ]
}
Action: markTaskComplete({ task: "019a3832-2f40-7cbd-82b7-09689dd80acd" })
Result: {}
Query: _getTasks({ user: "user:Alice" }) again
Result: {
  tasks: [
    {
      _id: "019a3832-2f40-7cbd-82b7-09689dd80acd",
      owner: "user:Alice",
      description: "Buy milk",
      dueDate: null,
      estimatedDuration: null,
      status: "DONE"
    },
    {
      _id: "019a3832-2f92-7a2b-ab78-9a375075e681",
      owner: "user:Alice",
      description: "Walk the dog",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    },
    {
      _id: "019a3832-2fd6-7d9a-8e33-9b74df36ab57",
      owner: "user:Alice",
      description: "File taxes",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    }
  ]
}
Query: _getRemainingTasks({ user: "user:Alice" })
Result: {
  tasks: [
    {
      _id: "019a3832-2f92-7a2b-ab78-9a375075e681",
      owner: "user:Alice",
      description: "Walk the dog",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    },
    {
      _id: "019a3832-2fd6-7d9a-8e33-9b74df36ab57",
      owner: "user:Alice",
      description: "File taxes",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    }
  ]
}
--- END TRACE: Operational Principle ---
----- post-test output end -----
  Operational Principle: tasks are added to a prioritized list and can be marked as complete ... ok (572ms)
  Scenario 1: Reordering and updating tasks ...
------- post-test output -------

--- SCENARIO: Reordering and updating tasks ---
Query: _getTasks for Bob initially
Initial order: [ "Task A", "Task B", "Task C" ]
Action: reorderTasks for Bob with new order [C, A, B]
Result: {}
New order: [ "Task C", "Task A", "Task B" ]
Action: updateTask for 019a3832-31ef-7a93-9f28-a2ba900ba28c
Result: {}
Updated task details confirmed.
----- post-test output end -----
  Scenario 1: Reordering and updating tasks ... ok (696ms)
  Scenario 2: Deleting tasks ...
------- post-test output -------

--- SCENARIO: Deleting tasks ---
Action: deleteTask 019a3832-341d-7a03-9d72-a05c9570f5c1
Result: {}
Task D deleted successfully.
Action: deleteAllForUser for user:ToDelete
Result: {}
All tasks for user:ToDelete deleted successfully.
----- post-test output end -----
  Scenario 2: Deleting tasks ... ok (413ms)
  Scenario 3: Handling error conditions and requirements ...
------- post-test output -------

--- SCENARIO: Handling error conditions ---
Action: createTask for non-existent user user:Charlie
Result: {
  error: "No task list found for user user:Charlie. Please create one first."
}
Action: createUserTasks for user:Charlie
Result: {}
Action: createUserTasks for user:Charlie AGAIN
Result: { error: "Task list already exists for user user:Charlie" }
Action: updateTask for non-existent task task:fake
Result: { error: "Task task:fake not found." }
Action: reorderTasks for user:Charlie with invalid task ID
Result: {
  error: "New order list does not contain all or only the user's tasks."
}
Action: reorderTasks for user:Charlie with incomplete list
Result: {
  error: "New order list does not contain all or only the user's tasks."
}
----- post-test output end -----
  Scenario 3: Handling error conditions and requirements ... ok (271ms)
  Scenario 4: Querying empty and fully completed lists ...
------- post-test output -------

--- SCENARIO: Querying empty and fully completed lists ---
Action: createUserTasks for user:David
Query: _getTasks on empty list
Query: _getRemainingTasks on empty list
Empty list queries work as expected.
Action: markTaskComplete for both of David's tasks
Query: _getTasks on fully completed list
Query: _getRemainingTasks on fully completed list
Fully completed list queries work as expected.
----- post-test output end -----
  Scenario 4: Querying empty and fully completed lists ... ok (432ms)
TasksConcept ... ok (3s)
running 1 test from ./src/concepts/UserAccount/UserAccountConcept.test.ts
UserAccountConcept ...
  Operational Principle: A user can register and then log in ...
------- post-test output -------
Action: register {
  email: "alice@example.com",
  password: "password123",
  displayName: "Alice"
}
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
Result: { user: "019a3832-4406-7f53-a1cc-a112de4186d1" }

Action: login { email: "alice@example.com", password: "password123" }
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
Result: { user: "019a3832-4406-7f53-a1cc-a112de4186d1" }
----- post-test output end -----
  Operational Principle: A user can register and then log in ... ok (1s)
  Interesting Scenario 1: Attempt to register with a duplicate email ...
------- post-test output -------

Action: register (duplicate email) {
  email: "alice@example.com",
  password: "anotherPassword",
  displayName: "Bob"
}
Result: { error: "Email already in use." }
----- post-test output end -----
  Interesting Scenario 1: Attempt to register with a duplicate email ... ok (17ms)
  Interesting Scenario 2: Attempt to log in with an incorrect password ...
------- post-test output -------

Action: login (incorrect password) { email: "alice@example.com", password: "wrongPassword" }
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
Result: { error: "Invalid credentials." }
----- post-test output end -----
  Interesting Scenario 2: Attempt to log in with an incorrect password ... ok (1s)
  Interesting Scenario 3: Successfully update profile, then delete account ...
------- post-test output -------

Action: updateProfile {
  user: "019a3832-4406-7f53-a1cc-a112de4186d1",
  newDisplayName: "Alice Smith"
}
Result: {}

Action: deleteAccount { user: "019a3832-4406-7f53-a1cc-a112de4186d1" }
Result: {}
----- post-test output end -----
  Interesting Scenario 3: Successfully update profile, then delete account ... ok (95ms)
  Interesting Scenario 4: Attempt to update or delete a non-existent user ...
------- post-test output -------

Action: updateProfile (non-existent user) { user: "user:fake", newDisplayName: "Ghost" }
Result: { error: "User not found." }

Action: deleteAccount (non-existent user) { user: "user:fake" }
Result: { error: "User not found." }
----- post-test output end -----
  Interesting Scenario 4: Attempt to update or delete a non-existent user ... ok (34ms)
UserAccountConcept ... ok (4s)

ok | 7 passed (10 steps) | 0 failed (15s)
```