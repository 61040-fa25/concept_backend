
--- RUNNING OPERATIONAL PRINCIPLE: register a user, then authenticate. ---

--- Action: register ---
{
  "username": "alice",
  "password": "password123"
}

--- Result: register ---
{
  "user": "0199e672-c203-7eb2-9505-b4484bdd4fae"
}

--- Query: _userExistsById ---
{
  "user": "0199e672-c203-7eb2-9505-b4484bdd4fae"
}

--- Result: _userExistsById ---
[
  true
]

--- Query: _userExistsByUsername ---
{
  "username": "alice"
}

--- Result: _userExistsByUsername ---
[
  true
]

--- Action: authenticate ---
{
  "username": "alice",
  "password": "password123"
}

--- Result: authenticate ---
{
  "user": "0199e672-c203-7eb2-9505-b4484bdd4fae"
}

--- Query: _getUserByUsername ---
{
  "username": "alice"
}

--- Result: _getUserByUsername ---
{
  "_id": "0199e672-c203-7eb2-9505-b4484bdd4fae",
  "username": "alice",
  "password": "password123"
}

--- Query: _getUserById ---
{
  "id": "0199e672-c203-7eb2-9505-b4484bdd4fae"
}

--- Result: _getUserById ---
{
  "_id": "0199e672-c203-7eb2-9505-b4484bdd4fae",
  "username": "alice",
  "password": "password123"
}

--- RUNNING SCENARIO 1: attempt to register with an already existing username. ---

--- Action: register (first time) ---
{
  "username": "bob",
  "password": "bobpassword"
}

--- Result: first register ---
{
  "user": "0199e672-c2a6-77e7-abbc-5f1c55d9fd16"
}

--- Query: _userExistsById ---
{
  "user": "0199e672-c2a6-77e7-abbc-5f1c55d9fd16"
}

--- Result: _userExistsById (Bob) ---
[
  true
]

--- Query: _userExistsByUsername ---
{
  "username": "bob"
}

--- Result: _userExistsByUsername (Bob) ---
[
  true
]

--- Query: _getUserById ---
{
  "id": "0199e672-c2a6-77e7-abbc-5f1c55d9fd16"
}

--- Result: _getUserById (Bob) ---
{
  "_id": "0199e672-c2a6-77e7-abbc-5f1c55d9fd16",
  "username": "bob",
  "password": "bobpassword"
}

--- Action: register (second time with same username) ---
{
  "username": "bob",
  "password": "bobpassword"
}

--- Result: second register ---
{
  "error": "Username already taken."
}

--- Verify that Bob still exists after failed registration ---

--- Query: _userExistsByUsername (after failed register) ---
{
  "username": "bob"
}

--- Result: _userExistsByUsername (after failed register) ---
[
  true
]

--- RUNNING SCENARIO 2: authenticate with incorrect password. ---

--- Action: register ---
{
  "username": "charlie",
  "password": "charliepassword"
}

--- Result: register ---
{
  "user": "0199e672-c37e-70ba-b035-5b00b4666053"
}

--- Query: _userExistsById ---
{
  "user": "0199e672-c37e-70ba-b035-5b00b4666053"
}

--- Result: _userExistsById (Charlie) ---
[
  true
]

--- Query: _userExistsByUsername ---
{
  "username": "charlie"
}

--- Result: _userExistsByUsername (Charlie) ---
[
  true
]

--- Query: _getUserById ---
{
  "id": "0199e672-c37e-70ba-b035-5b00b4666053"
}

--- Result: _getUserById (Charlie) ---
{
  "_id": "0199e672-c37e-70ba-b035-5b00b4666053",
  "username": "charlie",
  "password": "charliepassword"
}

--- Action: authenticate with incorrect password ---
{
  "username": "charlie",
  "password": "wrongpassword"
}

--- Result: authenticate (incorrect password) ---
{
  "error": "Invalid username or password."
}

--- Verify that Charlie still exists after failed authentication ---

--- Query: _userExistsByUsername (after failed auth) ---
{
  "username": "charlie"
}

--- Result: _userExistsByUsername (after failed auth) ---
[
  true
]

--- Action: authenticate with correct password ---
{
  "username": "charlie",
  "password": "charliepassword"
}

--- Result: authenticate (correct password) ---
{
  "user": "0199e672-c37e-70ba-b035-5b00b4666053"
}

--- RUNNING SCENARIO 3: authenticate with non-existent username. ---

--- Query: _userExistsByUsername (before auth) ---
{
  "username": "nonexistent"
}

--- Result: _userExistsByUsername (before auth) ---
[]

--- Action: authenticate ---
{
  "username": "nonexistent",
  "password": "anypassword"
}

--- Result: authenticate ---
{
  "error": "Invalid username or password."
}

--- Verify that user still does not exist after failed authentication ---

--- Query: _userExistsByUsername (after auth) ---
{
  "username": "nonexistent"
}

--- Result: _userExistsByUsername (after auth) ---
[]

--- RUNNING SCENARIO 4: register and authenticate multiple users. ---

--- Action: register user1 ---
{
  "username": "diana",
  "password": "diana_password"
}

--- Result: register user1 ---
{
  "user": "0199e672-c459-714b-9ff0-bac5dbcdd08f"
}

--- Query: _userExistsById (Diana) ---
{
  "user": "0199e672-c459-714b-9ff0-bac5dbcdd08f"
}

--- Result: _userExistsById (Diana) ---
[
  true
]

--- Query: _userExistsByUsername (Diana) ---
{
  "username": "diana"
}

--- Result: _userExistsByUsername (Diana) ---
[
  true
]

--- Action: register user2 ---
{
  "username": "eve",
  "password": "eve_password"
}

--- Result: register user2 ---
{
  "user": "0199e672-c4aa-72f8-853c-d4f24c2cbed9"
}

--- Query: _userExistsById (Eve) ---
{
  "user": "0199e672-c4aa-72f8-853c-d4f24c2cbed9"
}

--- Result: _userExistsById (Eve) ---
[
  true
]

--- Query: _userExistsByUsername (Eve) ---
{
  "username": "eve"
}

--- Result: _userExistsByUsername (Eve) ---
[
  true
]

--- Action: authenticate user1 ---
{
  "username": "diana",
  "password": "diana_password"
}

--- Result: authenticate user1 ---
{
  "user": "0199e672-c459-714b-9ff0-bac5dbcdd08f"
}

--- Action: authenticate user2 ---
{
  "username": "eve",
  "password": "eve_password"
}

--- Result: authenticate user2 ---
{
  "user": "0199e672-c4aa-72f8-853c-d4f24c2cbed9"
}

--- Query: _getAllUsers ---

--- Result: _getAllUsers ---
[
  {
    "_id": "0199e672-c203-7eb2-9505-b4484bdd4fae",
    "username": "alice",
    "password": "password123"
  },
  {
    "_id": "0199e672-c2a6-77e7-abbc-5f1c55d9fd16",
    "username": "bob",
    "password": "bobpassword"
  },
  {
    "_id": "0199e672-c37e-70ba-b035-5b00b4666053",
    "username": "charlie",
    "password": "charliepassword"
  },
  {
    "_id": "0199e672-c459-714b-9ff0-bac5dbcdd08f",
    "username": "diana",
    "password": "diana_password"
  },
  {
    "_id": "0199e672-c4aa-72f8-853c-d4f24c2cbed9",
    "username": "eve",
    "password": "eve_password"
  }
]
