```
Check file:///C:/Users/kalin/OneDrive - Massachusetts Institute of Technology/Uni/Senior/6104/concept_backend/src/concepts/LikertSurvey/LikertSurveyConcept.test.ts
Check file:///C:/Users/kalin/OneDrive - Massachusetts Institute of Technology/Uni/Senior/6104/concept_backend/src/concepts/UserAccount/UserAccountConcept.test.ts
running 0 tests from ./src/concepts/LikertSurvey/LikertSurveyConcept.test.ts
running 1 test from ./src/concepts/UserAccount/UserAccountConcept.test.ts
UserAccount Concept Tests ...
  1. Operational Principle: Register and Log In ...
------- post-test output -------

--- Calling register with args: {"email":"testuser1@example.com","password":"securepassword123","displayName":"Test User One"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of register: {"user":"019a142b-caef-7de8-9cce-8b43a4410b00"} ---

--- Calling login with args: {"email":"testuser1@example.com","password":"securepassword123"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of login: {"user":"019a142b-caef-7de8-9cce-8b43a4410b00"} ---

--- Calling _getUserProfile with args: {"user":"019a142b-caef-7de8-9cce-8b43a4410b00"} ---
--- Result of _getUserProfile: {"displayName":"Test User One","email":"testuser1@example.com"} ---

--- Calling _findUserByEmail with args: {"email":"testuser1@example.com"} ---
--- Result of _findUserByEmail: "019a142b-caef-7de8-9cce-8b43a4410b00" ---
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
  2. Error Cases: Duplicate Registration, Incorrect Login ... ok (774ms)
  3. Profile Update and Verification ...
------- post-test output -------

--- Calling updateProfile with args: {"user":"019a142b-caef-7de8-9cce-8b43a4410b00","newDisplayName":"Updated User One Name"} ---
--- Result of updateProfile: {} ---

--- Calling _getUserProfile with args: {"user":"019a142b-caef-7de8-9cce-8b43a4410b00"} ---
--- Result of _getUserProfile: {"displayName":"Updated User One Name","email":"testuser1@example.com"} ---

--- Calling updateProfile with args: {"user":"nonexistentUser","newDisplayName":"Ghost"} ---
--- Result of updateProfile: {"error":"User not found."} ---
----- post-test output end -----
  3. Profile Update and Verification ... ok (52ms)
  4. Account Deletion and Re-registration ...
------- post-test output -------

--- Calling register with args: {"email":"testuser2@example.com","password":"anothersecurepass","displayName":"Test User Two"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of register: {"user":"019a142b-d4bf-712a-8a58-3557d20aae74"} ---

--- Calling deleteAccount with args: {"user":"019a142b-d4bf-712a-8a58-3557d20aae74"} ---
--- Result of deleteAccount: {} ---

--- Calling login with args: {"email":"testuser2@example.com","password":"anothersecurepass"} ---
--- Result of login: {"error":"Invalid credentials."} ---

--- Calling _getUserProfile with args: {"user":"019a142b-d4bf-712a-8a58-3557d20aae74"} ---
--- Result of _getUserProfile: null ---

--- Calling deleteAccount with args: {"user":"nonexistentUser"} ---
--- Result of deleteAccount: {"error":"User not found."} ---

--- Calling register with args: {"email":"testuser2@example.com","password":"anothersecurepass","displayName":"Test User Two"} ---
Check https://deno.land/x/bcrypt@v0.4.1/src/worker.ts
--- Result of register: {"user":"019a142b-d7e5-70b3-8e3d-ff23d91b70b8"} ---
----- post-test output end -----
  4. Account Deletion and Re-registration ... ok (1s)
  5. Querying Non-existent Data ...
------- post-test output -------

--- Calling _getUserProfile with args: {"user":"ghostUser123"} ---
--- Result of _getUserProfile: null ---

--- Calling _findUserByEmail with args: {"email":"unknown@example.com"} ---
--- Result of _findUserByEmail: null ---
----- post-test output end -----
  5. Querying Non-existent Data ... ok (33ms)
UserAccount Concept Tests ... ok (4s)

ok | 1 passed (5 steps) | 0 failed (5s)
```