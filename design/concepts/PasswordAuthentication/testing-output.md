

# 6 Tests:

```
PasswordAuthenticationConcept: register() - Fails when username already exists (requires) ...
------- output -------

--- Action Test: register() - Fails with existing username ---
Trace: Step 1 - Registering user 'duplicateUser' for the first time.
  Effect: User 'duplicateUser' registered.
Trace: Step 2 - Attempting to register user 'duplicateUser' again with a different password.
  Action: register({ username: "duplicateUser", password: "..." })
  Requirement Confirmation (requires 'username' not in Users): Requirement not met, action correctly failed with error: 'User with username 'duplicateUser' already exists.'.
----- output end -----
PasswordAuthenticationConcept: register() - Fails when username already exists (requires) ... ✅ ok (1s)
PasswordAuthenticationConcept: register() - Fails with password shorter than 8 characters (requires) ...
------- output -------

--- Action Test: register() - Fails with short password ---
Trace: Attempting to register user 'shortPassUser' with a short password.
  Action: register({ username: "shortPassUser", password: "short" })
  Requirement Confirmation (password length >= 8): Requirement not met, action correctly failed with error: 'Password must be at least 8 characters long.'.
----- output end -----
PasswordAuthenticationConcept: register() - Fails with password shorter than 8 characters (requires) ... ✅ ok (1s)
PasswordAuthenticationConcept: register() - Fails with username shorter than 8 characters (requires) ...
------- output -------

--- Action Test: register() - Fails with short username ---
Trace: Attempting to register user with a short username 'short'.
  Action: register({ username: "short", password: "..." })
  Requirement Confirmation (username length >= 8): Requirement not met, action correctly failed with error: 'Username must be at least 8 characters long.'.
----- output end -----
PasswordAuthenticationConcept: register() - Fails with username shorter than 8 characters (requires) ... ✅ ok (1s)
PasswordAuthenticationConcept: authenticate() - Fails with non-existent username (requires) ...
------- output -------

--- Action Test: authenticate() - Fails with non-existent username ---
Trace: Attempting to authenticate non-existent user 'nonExistentUser'.
  Action: authenticate({ username: "nonExistentUser", password: "..." })
  Requirement Confirmation (requires 'username' exists): Requirement not met, action correctly failed with error: 'Invalid username or password.'.
----- output end -----
PasswordAuthenticationConcept: authenticate() - Fails with non-existent username (requires) ... ✅ ok (788ms)
PasswordAuthenticationConcept: authenticate() - Fails with incorrect password (effects) ...
------- output -------

--- Action Test: authenticate() - Fails with incorrect password ---
Trace: Step 1 - Registering user 'authFailedUser'.
  Effect: User 'authFailedUser' registered.
Trace: Step 2 - Attempting to authenticate user 'authFailedUser' with an incorrect password.
  Action: authenticate({ username: "authFailedUser", password: "wrongPassword" })
  Effect Confirmation (password mismatch): Action correctly returned an error, confirming password verification failure.
----- output end -----
PasswordAuthenticationConcept: authenticate() - Fails with incorrect password (effects) ... ✅ ok (895ms)
PasswordAuthenticationConcept: Multiple distinct users can register and authenticate independently, and be listed ...
------- output -------

--- Interesting Case: Multiple Independent Users (with _getAllUsers check) ---
Trace: Step 1 - Registering User A ('userAlice').
  Effect: User A registered with ID: 0199f463-c569-7e09-8a6f-c5d58ebc6aab.
Trace: Step 2 - Registering User B ('userBob1').
  Effect: User B registered with ID: 0199f463-c5dc-7fa3-800c-f7481d9efabf.
  Effect Confirmation: Distinct User IDs were generated for different users.
Trace: Step 3 - Authenticating User A ('userAlice').
  Effect: User A authenticated successfully.
Trace: Step 4 - Authenticating User B ('userBob1').
  Effect: User B authenticated successfully.
Trace: Step 5 - Querying for all registered users.
  Effect Confirmation: _getAllUsers correctly listed all registered user IDs: [0199f463-c569-7e09-8a6f-c5d58ebc6aab, 0199f463-c5dc-7fa3-800c-f7481d9efabf].
Interesting case fulfilled: This demonstrates that the concept correctly handles multiple independent users, allowing each to register and authenticate without interference, and that all registered users are retrievable by ID through the _getAllUsers query, aligning with expected multi-user system behavior and query functionality.
----- output end -----
PasswordAuthenticationConcept: Multiple distinct users can register and authenticate independently, and be listed ... ✅ ok (1s)

✅ 6 passed | 0 failed
```