
--- Running operational principle: register a user, then authenticate. ---

--- Action: register ---
{
  "username": "alice",
  "password": "password123"
}

--- Result: register ---
{
  "user": "0199dca3-5841-765d-b536-ec277fbda501"
}

--- Action: authenticate ---
{
  "username": "alice",
  "password": "password123"
}

--- Result: authenticate ---
{
  "user": "0199dca3-5841-765d-b536-ec277fbda501"
}

--- Running scenario 1: attempt to register with an already existing username. ---

--- Action: register (first time) ---
{
  "username": "bob",
  "password": "bobpassword"
}

--- Result: first register ---
{
  "user": "0199dca3-58ad-7c6f-9cc2-f1aeb5ebb300"
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
  "user": "0199dca3-593d-7c61-8019-055b34aa7aaf"
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
  "user": "0199dca3-593d-7c61-8019-055b34aa7aaf"
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
  "user": "0199dca3-59ee-7f63-bbd8-5408dcbb19ff"
}

--- Action: register user2 ---
{
  "username": "eve",
  "password": "eve_password"
}

--- Result: register user2 ---
{
  "user": "0199dca3-5a16-74a1-b97e-2c6b0c514002"
}

--- Action: authenticate user1 ---
{
  "username": "diana",
  "password": "diana_password"
}

--- Result: authenticate user1 ---
{
  "user": "0199dca3-59ee-7f63-bbd8-5408dcbb19ff"
}

--- Action: authenticate user2 ---
{
  "username": "eve",
  "password": "eve_password"
}

--- Result: authenticate user2 ---
{
  "user": "0199dca3-5a16-74a1-b97e-2c6b0c514002"
}

--- Query: _getAllUsers ---

--- Result: _getAllUsers ---
[
  {
    "_id": "0199dca3-5841-765d-b536-ec277fbda501",
    "username": "alice",
    "password": "password123"
  },
  {
    "_id": "0199dca3-58ad-7c6f-9cc2-f1aeb5ebb300",
    "username": "bob",
    "password": "bobpassword"
  },
  {
    "_id": "0199dca3-593d-7c61-8019-055b34aa7aaf",
    "username": "charlie",
    "password": "charliepassword"
  },
  {
    "_id": "0199dca3-59ee-7f63-bbd8-5408dcbb19ff",
    "username": "diana",
    "password": "diana_password"
  },
  {
    "_id": "0199dca3-5a16-74a1-b97e-2c6b0c514002",
    "username": "eve",
    "password": "eve_password"
  }
]
