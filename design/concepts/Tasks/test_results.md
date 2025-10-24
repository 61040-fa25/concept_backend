```
Check file:///C:/Users/kalin/OneDrive - Massachusetts Institute of Technology/Uni/Senior/6104/concept_backend/src/concepts/LikertSurvey/LikertSurveyConcept.test.ts
Check file:///C:/Users/kalin/OneDrive - Massachusetts Institute of Technology/Uni/Senior/6104/concept_backend/src/concepts/Tasks/TasksConcept.test.ts
Check file:///C:/Users/kalin/OneDrive - Massachusetts Institute of Technology/Uni/Senior/6104/concept_backend/src/concepts/UserAccount/UserAccountConcept.test.ts
running 0 tests from ./src/concepts/LikertSurvey/LikertSurveyConcept.test.ts
running 1 test from ./src/concepts/Tasks/TasksConcept.test.ts
TasksConcept ...
  Operational Principle: tasks are added to a prioritized list and can be marked as complete ...
------- post-test output -------

--- TRACE: Operational Principle ---
Action: createUserTasks({ user: "user:Alice" })
Result: {}
Action: createTask({ owner: "user:Alice", description: "Buy milk" })
Result: { task: "019a145e-ad84-7afb-adc9-c5ca49489fc8" }
Action: createTask({ owner: "user:Alice", description: "Walk the dog" })
Result: { task: "019a145e-ade0-7097-80a3-d815f5e3423c" }
Action: createTask({ owner: "user:Alice", description: "File taxes" })
Result: { task: "019a145e-ae4f-7417-be95-09a0dc0dd1df" }
Query: _getTasks({ user: "user:Alice" })
Result: {
  tasks: [
    {
      _id: "019a145e-ad84-7afb-adc9-c5ca49489fc8",
      owner: "user:Alice",
      description: "Buy milk",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    },
    {
      _id: "019a145e-ade0-7097-80a3-d815f5e3423c",
      owner: "user:Alice",
      description: "Walk the dog",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    },
    {
      _id: "019a145e-ae4f-7417-be95-09a0dc0dd1df",
      owner: "user:Alice",
      description: "File taxes",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    }
  ]
}
Action: markTaskComplete({ task: "019a145e-ad84-7afb-adc9-c5ca49489fc8" })
Result: {}
Query: _getTasks({ user: "user:Alice" }) again
Result: {
  tasks: [
    {
      _id: "019a145e-ad84-7afb-adc9-c5ca49489fc8",
      owner: "user:Alice",
      description: "Buy milk",
      dueDate: null,
      estimatedDuration: null,
      status: "DONE"
    },
    {
      _id: "019a145e-ade0-7097-80a3-d815f5e3423c",
      owner: "user:Alice",
      description: "Walk the dog",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    },
    {
      _id: "019a145e-ae4f-7417-be95-09a0dc0dd1df",
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
      _id: "019a145e-ade0-7097-80a3-d815f5e3423c",
      owner: "user:Alice",
      description: "Walk the dog",
      dueDate: null,
      estimatedDuration: null,
      status: "TODO"
    },
    {
      _id: "019a145e-ae4f-7417-be95-09a0dc0dd1df",
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
  Operational Principle: tasks are added to a prioritized list and can be marked as complete ... ok (597ms)
  Scenario 1: Reordering and updating tasks ...
--- SCENARIO: Reordering and updating tasks ---
Query: _getTasks for Bob initially
Initial order: [ "Task A", "Task B", "Task C" ]
Action: reorderTasks for Bob with new order [C, A, B]
Result: {}
New order: [ "Task C", "Task A", "Task B" ]
Action: updateTask for 019a145e-b029-77fa-bb02-14e32da7d6e5
Result: {}
Updated task details confirmed.
----- post-test output end -----
  Scenario 2: Deleting tasks ...
------- post-test output -------

--- SCENARIO: Deleting tasks ---
Action: deleteTask 019a145e-b1eb-75b9-8ea9-310c752601a4
Result: {}
Task D deleted successfully.
Action: deleteAllForUser for user:ToDelete
Result: {}
All tasks for user:ToDelete deleted successfully.
----- post-test output end -----
  Scenario 2: Deleting tasks ... ok (361ms)
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
  Scenario 3: Handling error conditions and requirements ... ok (300ms)
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
  Scenario 4: Querying empty and fully completed lists ... ok (430ms)
TasksConcept ... ok (3s)
running 1 test from ./src/concepts/UserAccount/UserAccountConcept.test.ts
UserAccount Concept Tests ...
  1. Operational Principle: Register and Log In ...
------- post-test output -------

--- Calling register with args: {"email":"testuser1@example.com","password":"securepassword123","displayName":"Test User One"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of register: {"user":"019a145e-c105-7287-bd18-9d9092024005"} ---

--- Calling login with args: {"email":"testuser1@example.com","password":"securepassword123"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of login: {"user":"019a145e-c105-7287-bd18-9d9092024005"} ---

--- Calling _getUserProfile with args: {"user":"019a145e-c105-7287-bd18-9d9092024005"} ---
--- Result of _getUserProfile: {"displayName":"Test User One","email":"testuser1@example.com"} ---

--- Calling _findUserByEmail with args: {"email":"testuser1@example.com"} ---
--- Result of _findUserByEmail: "019a145e-c105-7287-bd18-9d9092024005" ---
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
  2. Error Cases: Duplicate Registration, Incorrect Login ... ok (887ms)
  3. Profile Update and Verification ...
------- post-test output -------

--- Calling updateProfile with args: {"user":"019a145e-c105-7287-bd18-9d9092024005","newDisplayName":"Updated User One Name"} ---
--- Result of updateProfile: {} ---

--- Calling _getUserProfile with args: {"user":"019a145e-c105-7287-bd18-9d9092024005"} ---
--- Result of _getUserProfile: {"displayName":"Updated User One Name","email":"testuser1@example.com"} ---

--- Calling updateProfile with args: {"user":"nonexistentUser","newDisplayName":"Ghost"} ---
--- Result of updateProfile: {"error":"User not found."} ---
----- post-test output end -----
  3. Profile Update and Verification ... ok (55ms)
  4. Account Deletion and Re-registration ...
------- post-test output -------

--- Calling register with args: {"email":"testuser2@example.com","password":"anothersecurepass","displayName":"Test User Two"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of register: {"user":"019a145e-cb46-7c30-818d-a3c83c082721"} ---

--- Calling deleteAccount with args: {"user":"019a145e-cb46-7c30-818d-a3c83c082721"} ---
--- Result of deleteAccount: {} ---

--- Calling login with args: {"email":"testuser2@example.com","password":"anothersecurepass"} ---
--- Result of login: {"error":"Invalid credentials."} ---

--- Calling _getUserProfile with args: {"user":"019a145e-cb46-7c30-818d-a3c83c082721"} ---
--- Result of _getUserProfile: null ---

--- Calling deleteAccount with args: {"user":"nonexistentUser"} ---
--- Result of deleteAccount: {"error":"User not found."} ---

--- Calling register with args: {"email":"testuser2@example.com","password":"anothersecurepass","displayName":"Test User Two"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of register: {"user":"019a145e-ce45-7d76-8d9e-c79b56e74509"} ---
----- post-test output end -----
  4. Account Deletion and Re-registration ... ok (1s)
  5. Querying Non-existent Data ...
------- post-test output -------

--- Calling _getUserProfile with args: {"user":"ghostUser123"} ---
--- Result of _getUserProfile: null ---

--- Calling _findUserByEmail with args: {"email":"unknown@example.com"} ---
--- Result of _findUserByEmail: null ---
----- post-test output end -----
  5. Querying Non-existent Data ... ok (40ms)
UserAccount Concept Tests ... ok (5s)

ok | 2 passed (10 steps) | 0 failed (10s)
```