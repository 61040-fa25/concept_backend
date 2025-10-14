
--- Running operational principle: register a user, then authenticate. ---

--- Action: register ---
{
  "username": "alice",
  "password": "password123"
}

--- Result: register ---
{
  "user": "0199e10d-21f0-75bd-942a-040f5a8123da"
}

--- Action: authenticate ---
{
  "username": "alice",
  "password": "password123"
}

--- Result: authenticate ---
{
  "user": "0199e10d-21f0-75bd-942a-040f5a8123da"
}

--- Query: _getUserByUsername ---
{
  "username": "alice"
}

--- Result: _getUserByUsername ---
{
  "_id": "0199e10d-21f0-75bd-942a-040f5a8123da",
  "username": "alice",
  "password": "password123"
}

--- Query: _getUserById ---
{
  "id": "0199e10d-21f0-75bd-942a-040f5a8123da"
}

--- Result: _getUserById ---
{
  "_id": "0199e10d-21f0-75bd-942a-040f5a8123da",
  "username": "alice",
  "password": "password123"
}

--- Running scenario 1: attempt to register with an already existing username. ---

--- Action: register (first time) ---
{
  "username": "bob",
  "password": "bobpassword"
}

--- Result: first register ---
{
  "user": "0199e10d-2267-75df-97b5-209bd1db5168"
}

--- Query: _getUserById ---
{
  "id": "0199e10d-2267-75df-97b5-209bd1db5168"
}

--- Result: _getUserById (Bob) ---
{
  "_id": "0199e10d-2267-75df-97b5-209bd1db5168",
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

--- Running scenario 2: authenticate with incorrect password. ---

--- Action: register ---
{
  "username": "charlie",
  "password": "charliepassword"
}

--- Result: register ---
{
  "user": "0199e10d-22aa-79aa-92de-436fe9f0f5a5"
}

--- Query: _getUserById ---
{
  "id": "0199e10d-22aa-79aa-92de-436fe9f0f5a5"
}

--- Result: _getUserById (Charlie) ---
{
  "_id": "0199e10d-22aa-79aa-92de-436fe9f0f5a5",
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

--- Action: authenticate with correct password ---
{
  "username": "charlie",
  "password": "charliepassword"
}

--- Result: authenticate (correct password) ---
{
  "user": "0199e10d-22aa-79aa-92de-436fe9f0f5a5"
}

--- Running scenario 3: authenticate with non-existent username. ---

--- Action: authenticate ---
{
  "username": "nonexistent",
  "password": "anypassword"
}

--- Result: authenticate ---
{
  "error": "Invalid username or password."
}

--- Running scenario 4: register and authenticate multiple users. ---

--- Action: register user1 ---
{
  "username": "diana",
  "password": "diana_password"
}

--- Result: register user1 ---
{
  "user": "0199e10d-230a-7361-bb8c-e3ef99088584"
}

--- Action: register user2 ---
{
  "username": "eve",
  "password": "eve_password"
}

--- Result: register user2 ---
{
  "user": "0199e10d-232c-72d7-8d79-12d733c8b9c9"
}

--- Action: authenticate user1 ---
{
  "username": "diana",
  "password": "diana_password"
}

--- Result: authenticate user1 ---
{
  "user": "0199e10d-230a-7361-bb8c-e3ef99088584"
}

--- Action: authenticate user2 ---
{
  "username": "eve",
  "password": "eve_password"
}

--- Result: authenticate user2 ---
{
  "user": "0199e10d-232c-72d7-8d79-12d733c8b9c9"
}

--- Query: _getAllUsers ---

--- Result: _getAllUsers ---
[
  {
    "_id": "0199e10d-21f0-75bd-942a-040f5a8123da",
    "username": "alice",
    "password": "password123"
  },
  {
    "_id": "0199e10d-2267-75df-97b5-209bd1db5168",
    "username": "bob",
    "password": "bobpassword"
  },
  {
    "_id": "0199e10d-22aa-79aa-92de-436fe9f0f5a5",
    "username": "charlie",
    "password": "charliepassword"
  },
  {
    "_id": "0199e10d-230a-7361-bb8c-e3ef99088584",
    "username": "diana",
    "password": "diana_password"
  },
  {
    "_id": "0199e10d-232c-72d7-8d79-12d733c8b9c9",
    "username": "eve",
    "password": "eve_password"
  }
]
