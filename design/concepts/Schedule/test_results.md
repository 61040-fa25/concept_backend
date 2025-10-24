```
running 0 tests from ./src/concepts/LikertSurvey/LikertSurveyConcept.test.ts
running 5 tests from ./src/concepts/Schedule/ScheduleConcept.test.ts
Operational Principle: Sync external calendar and add manual blocks ...
------- post-test output -------
--- Testing Operational Principle ---

Action: _getSlots
Params: { user: "user:Alice" }
Result: []

Action: syncCalendar
Params: {
  user: "user:Alice",
  externalEvents: [
    {
      startTime: 2023-10-26T09:00:00.000Z,
      endTime: 2023-10-26T10:00:00.000Z
    },
    {
      startTime: 2023-10-26T14:00:00.000Z,
      endTime: 2023-10-26T15:30:00.000Z
    }
  ]
}
Result: {}

Action: _getSlots
Params: { user: "user:Alice" }
Result: [
  {
    _id: "019a1640-ccde-74e9-912d-1e5b4709a634",
    owner: "user:Alice",
    startTime: 2023-10-26T09:00:00.000Z,
    endTime: 2023-10-26T10:00:00.000Z
  },
  {
    _id: "019a1640-ccde-7f91-b04b-236d7fa051f7",
    owner: "user:Alice",
    startTime: 2023-10-26T14:00:00.000Z,
    endTime: 2023-10-26T15:30:00.000Z
  }
]

Action: blockTime
Params: {
  user: "user:Alice",
  startTime: 2023-10-26T12:00:00.000Z,
  endTime: 2023-10-26T13:00:00.000Z
}
Result: { _id: "019a1640-cd1c-78e6-a926-ee82cbcfa435" }

Action: _getSlots
Params: { user: "user:Alice" }
Result: [
  {
    _id: "019a1640-ccde-74e9-912d-1e5b4709a634",
    owner: "user:Alice",
    startTime: 2023-10-26T09:00:00.000Z,
    endTime: 2023-10-26T10:00:00.000Z
  },
  {
    _id: "019a1640-ccde-7f91-b04b-236d7fa051f7",
    owner: "user:Alice",
    startTime: 2023-10-26T14:00:00.000Z,
    endTime: 2023-10-26T15:30:00.000Z
  },
  {
    _id: "019a1640-cd1c-78e6-a926-ee82cbcfa435",
    owner: "user:Alice",
    startTime: 2023-10-26T12:00:00.000Z,
    endTime: 2023-10-26T13:00:00.000Z
  }
]
--- Principle Test Passed ---
----- post-test output end -----
Operational Principle: Sync external calendar and add manual blocks ... ok (798ms)
Interesting Scenario: Resyncing clears all previous slots ...
------- post-test output -------

--- Testing Scenario: Resyncing ---

Action: syncCalendar
Params: {
  user: "user:Bob",
  externalEvents: [
    {
      startTime: 2023-11-01T10:00:00.000Z,
      endTime: 2023-11-01T11:00:00.000Z
    }
  ]
}
Result: {}

Action: _getSlots
Params: { user: "user:Bob" }
Result: [
  {
    _id: "019a1640-cfc5-76cf-8ec2-4fa942894739",
    owner: "user:Bob",
    startTime: 2023-11-01T10:00:00.000Z,
    endTime: 2023-11-01T11:00:00.000Z
  }
]
--- Resyncing Test Passed ---
----- post-test output end -----
Interesting Scenario: Resyncing clears all previous slots ... ok (673ms)
Interesting Scenario: Empty and invalid syncs ...
------- post-test output -------

--- Testing Scenario: Empty and Invalid Syncs ---

Action: syncCalendar (empty)
Params: { user: "user:Charlie", externalEvents: [] }
Result: {}

Action: syncCalendar (invalid)
Params: {
  user: "user:Charlie",
  externalEvents: [
    {
      startTime: 2023-11-05T14:00:00.000Z,
      endTime: 2023-11-05T13:00:00.000Z
    }
  ]
}
Result: {
  error: "All events must have a valid startTime that occurs before its endTime."
}
--- Empty/Invalid Sync Test Passed ---
----- post-test output end -----
Interesting Scenario: Empty and invalid syncs ... ok (587ms)
Interesting Scenario: Explicitly delete all slots for a user ...
------- post-test output -------

--- Testing Scenario: Delete All Slots ---

Action: deleteAllForUser
Params: { user: "user:David" }
Result: {}

Action: deleteAllForUser (empty)
Params: { user: "user:Eve" }
Result: {}
--- Delete All Slots Test Passed ---
----- post-test output end -----
Interesting Scenario: Explicitly delete all slots for a user ... ok (686ms)
Interesting Scenario: Invalid inputs for blockTime ...
------- post-test output -------

--- Testing Scenario: Invalid blockTime ---

Action: blockTime (invalid range)
Params: {
  user: "user:Frank",
  startTime: 2023-12-01T10:00:00.000Z,
  endTime: 2023-12-01T09:00:00.000Z
}
Result: { error: "startTime must be a valid Date that occurs before endTime." }

Action: blockTime (equal times)
Params: {
  user: "user:Frank",
  startTime: 2023-12-01T10:00:00.000Z,
  endTime: 2023-12-01T10:00:00.000Z
}
Result: { error: "startTime must be a valid Date that occurs before endTime." }
--- Invalid blockTime Test Passed ---
----- post-test output end -----
Interesting Scenario: Invalid inputs for blockTime ... ok (501ms)
running 1 test from ./src/concepts/Tasks/TasksConcept.test.ts
TasksConcept ...
  Operational Principle: tasks are added to a prioritized list and can be marked as complete ...
------- post-test output -------

--- TRACE: Operational Principle ---
Action: createUserTasks({ user: "user:Alice" })
Result: {}
Action: createTask({ owner: "user:Alice", description: "Buy milk" })
Result: { task: "019a1640-dd5b-7d51-8e6a-a044f0c6c702" }
Action: createTask({ owner: "user:Alice", description: "Walk the dog" })
Result: { task: "019a1640-dda7-7e1d-9542-b84740a50ad3" }
Action: createTask({ owner: "user:Alice", description: "File taxes" })
Result: { task: "019a1640-dde5-7a66-8fb8-f972a570ef7d" }
Query: _getTasks({ user: "user:Alice" })
Result: {
  tasks: [
    {
      _id: "019a1640-dd5b-7d51-8e6a-a044f0c6c702",
      owner: "user:Alice",
      description: "Buy milk",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    },
    {
      _id: "019a1640-dda7-7e1d-9542-b84740a50ad3",
      owner: "user:Alice",
      description: "Walk the dog",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    },
    {
      _id: "019a1640-dde5-7a66-8fb8-f972a570ef7d",
      owner: "user:Alice",
      description: "File taxes",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    }
  ]
}
Action: markTaskComplete({ task: "019a1640-dd5b-7d51-8e6a-a044f0c6c702" })
Result: {}
Query: _getTasks({ user: "user:Alice" }) again
Result: {
  tasks: [
    {
      _id: "019a1640-dd5b-7d51-8e6a-a044f0c6c702",
      owner: "user:Alice",
      description: "Buy milk",
      dueDate: null,
      estimatedDuration: null,
      status: "DONE"
    },
    {
      _id: "019a1640-dda7-7e1d-9542-b84740a50ad3",
      owner: "user:Alice",
      description: "Walk the dog",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    },
    {
      _id: "019a1640-dde5-7a66-8fb8-f972a570ef7d",
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
      _id: "019a1640-dda7-7e1d-9542-b84740a50ad3",
      owner: "user:Alice",
      description: "Walk the dog",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    },
    {
      _id: "019a1640-dde5-7a66-8fb8-f972a570ef7d",
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
  Operational Principle: tasks are added to a prioritized list and can be marked as complete ... ok (505ms)
  Scenario 1: Reordering and updating tasks ...
------- post-test output -------

--- SCENARIO: Reordering and updating tasks ---
Query: _getTasks for Bob initially
Initial order: [ "Task A", "Task B", "Task C" ]
Action: reorderTasks for Bob with new order [C, A, B]
Result: {}
New order: [ "Task C", "Task A", "Task B" ]
Action: updateTask for 019a1640-dfbf-7be0-ba9b-dcd1e7546759
Result: {}
Updated task details confirmed.
----- post-test output end -----
  Scenario 1: Reordering and updating tasks ... ok (545ms)
  Scenario 2: Deleting tasks ...
------- post-test output -------

--- SCENARIO: Deleting tasks ---
Action: deleteTask 019a1640-e163-747c-ace5-66e2eb3b8475
Result: {}
Task D deleted successfully.
Action: deleteAllForUser for user:ToDelete
Result: {}
All tasks for user:ToDelete deleted successfully.
----- post-test output end -----
  Scenario 2: Deleting tasks ... ok (326ms)
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
  Scenario 3: Handling error conditions and requirements ... ok (279ms)
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
  Scenario 4: Querying empty and fully completed lists ... ok (360ms)
TasksConcept ... ok (2s)
running 1 test from ./src/concepts/UserAccount/UserAccountConcept.test.ts
UserAccount Concept Tests ...
  1. Operational Principle: Register and Log In ...
------- post-test output -------

--- Calling register with args: {"email":"testuser1@example.com","password":"securepassword123","displayName":"Test User One"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of register: {"user":"019a1640-ee39-77d7-8a43-c06bbf7b06f7"} ---

--- Calling login with args: {"email":"testuser1@example.com","password":"securepassword123"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of login: {"user":"019a1640-ee39-77d7-8a43-c06bbf7b06f7"} ---

--- Calling _getUserProfile with args: {"user":"019a1640-ee39-77d7-8a43-c06bbf7b06f7"} ---
--- Result of _getUserProfile: {"displayName":"Test User One","email":"testuser1@example.com"} ---

--- Calling _findUserByEmail with args: {"email":"testuser1@example.com"} ---
--- Result of _findUserByEmail: "019a1640-ee39-77d7-8a43-c06bbf7b06f7" ---
----- post-test output end -----
  1. Operational Principle: Register and Log In ... ok (1s)
  2. Error Cases: Duplicate Registration, Incorrect Login ...
------- post-test output -------

--- Calling register with args: {"email":"testuser1@example.com","password":"newpassword","displayName":"Another User"} ---      
--- Result of register: {"error":"Email already in use."} ---

--- Calling login with args: {"email":"testuser1@example.com","password":"wrongpassword"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of login: {"error":"Invalid credentials."} ---

--- Calling login with args: {"email":"nonexistent@example.com","password":"anypass"} ---
--- Result of login: {"error":"Invalid credentials."} ---
----- post-test output end -----
  2. Error Cases: Duplicate Registration, Incorrect Login ... ok (924ms)
  3. Profile Update and Verification ...
------- post-test output -------

--- Calling updateProfile with args: {"user":"019a1640-ee39-77d7-8a43-c06bbf7b06f7","newDisplayName":"Updated User One Name"} ---
--- Result of updateProfile: {} ---

--- Calling _getUserProfile with args: {"user":"019a1640-ee39-77d7-8a43-c06bbf7b06f7"} ---
--- Result of _getUserProfile: {"displayName":"Updated User One Name","email":"testuser1@example.com"} ---

--- Calling updateProfile with args: {"user":"nonexistentUser","newDisplayName":"Ghost"} ---
--- Result of updateProfile: {"error":"User not found."} ---
----- post-test output end -----
  3. Profile Update and Verification ... ok (60ms)
  4. Account Deletion and Re-registration ...
------- post-test output -------

--- Calling register with args: {"email":"testuser2@example.com","password":"anothersecurepass","displayName":"Test User Two"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of register: {"user":"019a1640-f8e7-7291-a32f-5f68d8d6a24e"} ---

--- Calling deleteAccount with args: {"user":"019a1640-f8e7-7291-a32f-5f68d8d6a24e"} ---
--- Result of deleteAccount: {} ---

--- Calling login with args: {"email":"testuser2@example.com","password":"anothersecurepass"} ---
--- Result of login: {"error":"Invalid credentials."} ---

--- Calling _getUserProfile with args: {"user":"019a1640-f8e7-7291-a32f-5f68d8d6a24e"} ---
--- Result of _getUserProfile: null ---

--- Calling deleteAccount with args: {"user":"nonexistentUser"} ---
--- Result of deleteAccount: {"error":"User not found."} ---

--- Calling register with args: {"email":"testuser2@example.com","password":"anothersecurepass","displayName":"Test User Two"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of register: {"user":"019a1640-fc93-7c42-a806-17157636ab84"} ---
----- post-test output end -----
  4. Account Deletion and Re-registration ... ok (1s)
  5. Querying Non-existent Data ...
------- post-test output -------

--- Calling _getUserProfile with args: {"user":"ghostUser123"} ---
--- Result of _getUserProfile: null ---

--- Calling _findUserByEmail with args: {"email":"unknown@example.com"} ---
--- Result of _findUserByEmail: null ---
----- post-test output end -----
  5. Querying Non-existent Data ... ok (36ms)
UserAccount Concept Tests ... ok (5s)

ok | 7 passed (10 steps) | 0 failed (14s)
```