Check file:///C:/Users/Akosua/Documents/6.104/skrib/src/concepts/skrib/AUthentication.test.ts

running 1 test from ./src/concepts/skrib/AUthentication.test.ts

Authentication Concept ...

  Action: register - successful registration ...

------- output -------



--- Testing register (successful) ---

Attempting to register user: Alice

Result: { user: "0199fdb6-2488-743f-8271-44a1f4ba3273" }

Registered User ID: 0199fdb6-2488-743f-8271-44a1f4ba3273

Current users in DB: [

  {

    _id: "0199fdb6-2488-743f-8271-44a1f4ba3273",

    username: "Alice",

    password: "password123"

  }

]

----- output end -----

  Action: register - successful registration ... ok (67ms)

  Action: register - username already exists ...

------- output -------



--- Testing register (username exists) ---

Attempting to register user with existing username: Alice

Result: { error: "username is already in use" }

Current users in DB (after failed register): [

  {

    _id: "0199fdb6-2488-743f-8271-44a1f4ba3273",

    username: "Alice",

    password: "password123"

  }

]

----- output end -----

  Action: register - username already exists ... ok (31ms)

  Action: authenticate - successful authentication ...

------- output -------



--- Testing authenticate (successful) ---

Attempting to authenticate user: Alice

Result: { user: "0199fdb6-2488-743f-8271-44a1f4ba3273" }

----- output end -----

  Action: authenticate - successful authentication ... ok (31ms)

  Action: authenticate - incorrect password ...

------- output -------



--- Testing authenticate (incorrect password) ---

Attempting to authenticate user: Alice with incorrect password

Result: { error: "wrong username or password" }

----- output end -----

  Action: authenticate - incorrect password ... ok (16ms)

  Action: authenticate - non-existent username ...

------- output -------



--- Testing authenticate (non-existent username) ---

Attempting to authenticate non-existent user: Bob

Result: { error: "wrong username or password" }

----- output end -----

  Action: authenticate - non-existent username ... ok (16ms)

  Action: changePassword - successful password change ...

------- output -------



--- Testing changePassword (successful) ---

User ID for Alice: 0199fdb6-2488-743f-8271-44a1f4ba3273

Attempting to change password for user: 0199fdb6-2488-743f-8271-44a1f4ba3273

Result: {}

Attempting authentication with old password (should fail)...

Auth with old password result: { error: "wrong username or password" }

Attempting authentication with new password (should succeed)...

Auth with new password result: { user: "0199fdb6-2488-743f-8271-44a1f4ba3273" }

----- output end -----

  Action: changePassword - successful password change ... ok (81ms)

  Action: changePassword - non-existent user ...

------- output -------



--- Testing changePassword (non-existent user) ---

Attempting to change password for non-existent user: non_existent_id

Result: { error: "User not found" }

----- output end -----

  Action: changePassword - non-existent user ... ok (15ms)

  Action: deleteUser - successful deletion ...

------- output -------



--- Testing deleteUser (successful) ---

Registered user for deletion: Bob with ID 0199fdb6-258a-75ec-a00c-497c78db5b89

Users before deletion: [ "Alice", "Bob" ]

Attempting to delete user: 0199fdb6-258a-75ec-a00c-497c78db5b89

Result: {}

Users after deletion: [ "Alice" ]

Attempting to authenticate deleted user (should fail)...

Auth deleted user result: { error: "wrong username or password" }

----- output end -----

  Action: deleteUser - successful deletion ... ok (113ms)

  Action: deleteUser - non-existent user ...

------- output -------



--- Testing deleteUser (non-existent user) ---

Attempting to delete non-existent user: another_non_existent_id

Result: { error: "user does not exist" }

Users after failed deletion: [ "Alice" ]

----- output end -----

  Action: deleteUser - non-existent user ... ok (31ms)

  Principle Trace: Register and Login Workflow ...

------- output -------



--- Principle Trace ---

Principle: A user registers with a username and password to create an account. They can then log in with their username and password to access their account.

Initial users: []



Step 1: Register user 'Charlie'

Register result: { user: "0199fdb6-281d-753e-b11f-aa80165448b7" }

User 'Charlie' registered with ID: 0199fdb6-281d-753e-b11f-aa80165448b7



Step 2: Log in with correct credentials for 'Charlie'

Login result: { user: "0199fdb6-281d-753e-b11f-aa80165448b7" }

User 'Charlie' successfully logged in.



Step 3: Attempt to log in with incorrect password for 'Charlie'

Failed login result: { error: "wrong username or password" }

User 'Charlie' failed to log in with incorrect password as expected.



Step 4: Change password for 'Charlie' to 'super_secret_charlie'

Change password result: {}

Password for 'Charlie' changed successfully.



Step 5: Attempt to log in with old password for 'Charlie'

Login with old password result: { error: "wrong username or password" }

User 'Charlie' failed to log in with old password as expected.



Step 6: Log in with new password for 'Charlie'

Login with new password result: { user: "0199fdb6-281d-753e-b11f-aa80165448b7" }

User 'Charlie' successfully logged in with new password.



Principle trace completed and verified.

----- output end -----

  Principle Trace: Register and Login Workflow ... ok (696ms)

------- output -------

Authentication Concept tests finished.

----- output end -----

Authentication Concept ... ok (1s)



ok | 1 passed (10 steps) | 0 failed (1s)
