
--- Executing Principle Trace ---
Scenario: Alice starts a new session.

--- Action: startSession ---
  Inputs: { user: "user:Alice" }
  Result: { session: "0199dc9d-76b1-7efd-940b-438ccac3e451" }
Scenario: Alice adds multiple image entries to the active session.

--- Action: addEntry (multiple) ---
  Inputs: {
  user: "user:Alice",
  session: "0199dc9d-76b1-7efd-940b-438ccac3e451",
  images: [ "image:photo1.jpg", "image:photo2.png", "image:photo3.jpeg" ]
}
  Result: {}
Scenario: Alice ends the session.

--- Action: endSession ---
  Inputs: { user: "user:Alice", session: "0199dc9d-76b1-7efd-940b-438ccac3e451" }
  Result: {}
Scenario: Attempt to add an entry to an already ended session (expected to fail).

--- Action: addEntry (to ended session) ---
  Inputs: {
  user: "user:Alice",
  session: "0199dc9d-76b1-7efd-940b-438ccac3e451",
  image: "image:photo4.jpg"
}
  Result: {
  error: "SessionLogging: Session with ID 0199dc9d-76b1-7efd-940b-438ccac3e451 is not active. Cannot add entries."
}
Scenario: Verify recorded entries persist after the session ends.

--- Executing addEntry Precondition Violation Tests ---
Setup: Started session 0199dc9d-78b5-74f3-8832-666b25796aa5 for Alice.
Scenario: Adding entry to a non-existent session.

--- Action: addEntry (non-existent session) ---
  Inputs: {
  user: "user:Alice",
  session: "session:nonExistent",
  image: "image:photo1.jpg"
}
  Result: {
  error: "SessionLogging: Session with ID session:nonExistent not found."
}
Scenario: Alice tries to add entry to Bob's session.
Setup: Started session 0199dc9d-78d7-7dea-9d3d-83a7742630fe for Bob.

--- Action: addEntry (wrong owner) ---
  Inputs: {
  user: "user:Alice",
  session: "0199dc9d-78d7-7dea-9d3d-83a7742630fe",
  image: "image:photo1.jpg"
}
  Result: {
  error: "SessionLogging: User user:Alice is not the owner of session 0199dc9d-78d7-7dea-9d3d-83a7742630fe."
}
Scenario: Alice adds the same image twice to her session.

--- Action: addEntry (first time image4) ---
  Inputs: {
  user: "user:Alice",
  session: "0199dc9d-78b5-74f3-8832-666b25796aa5",
  image: "image:photo4.jpg"
}
  Result: {}

--- Action: addEntry (duplicate image4) ---
  Inputs: {
  user: "user:Alice",
  session: "0199dc9d-78b5-74f3-8832-666b25796aa5",
  image: "image:photo4.jpg"
}
  Result: {
  error: "SessionLogging: Image image:photo4.jpg is already an entry in session 0199dc9d-78b5-74f3-8832-666b25796aa5."
}

--- Executing endSession Precondition Violation & Idempotency Tests ---
Setup: Started session 0199dc9d-794a-7cbf-a5b5-079de534b51f for Alice.
Scenario: Ending a non-existent session.

--- Action: endSession (non-existent session) ---
  Inputs: { user: "user:Alice", session: "session:anotherNonExistent" }
  Result: {
  error: "SessionLogging: Session with ID session:anotherNonExistent not found."
}
Scenario: Alice tries to end Bob's session.
Setup: Started session 0199dc9d-796c-787f-8b08-f4809fd9a3bc for Bob.

--- Action: endSession (wrong owner) ---
  Inputs: { user: "user:Alice", session: "0199dc9d-796c-787f-8b08-f4809fd9a3bc" }
  Result: {
  error: "SessionLogging: User user:Alice is not the owner of session 0199dc9d-796c-787f-8b08-f4809fd9a3bc."
}
Scenario: Ending an already inactive session.

--- Action: endSession (first time) ---
  Inputs: { user: "user:Alice", session: "0199dc9d-794a-7cbf-a5b5-079de534b51f" }
  Result: {}

--- Action: endSession (second time - expected error) ---
  Inputs: { user: "user:Alice", session: "0199dc9d-794a-7cbf-a5b5-079de534b51f" }
  Result: {
  error: "SessionLogging: Session with ID 0199dc9d-794a-7cbf-a5b5-079de534b51f is already inactive."
}

--- Executing Multi-User Isolation Tests ---
Scenario: Alice starts her session and adds images.

--- Action: Alice's actions ---
  Inputs: {
  session: "0199dc9d-7a31-7f69-b13d-65c56437b689",
  images: [ "image:photo1.jpg", "image:photo2.png" ]
}
  Result: {}
Scenario: Bob starts his session and adds images.

--- Action: Bob's actions ---
  Inputs: {
  session: "0199dc9d-7ae5-7793-b3b1-b14a191ee88c",
  images: [ "image:photo3.jpeg", "image:photo5.jpeg" ]
}
  Result: {}
Scenario: Verifying isolation of sessions between users.
Scenario: Alice attempts unauthorized actions on Bob's session.

--- Action: Alice add entry to Bob's session ---
  Inputs: {
  user: "user:Alice",
  session: "0199dc9d-7ae5-7793-b3b1-b14a191ee88c",
  image: "image:photo4.jpg"
}
  Result: {
  error: "SessionLogging: User user:Alice is not the owner of session 0199dc9d-7ae5-7793-b3b1-b14a191ee88c."
}

--- Action: Alice end Bob's session ---
  Inputs: { user: "user:Alice", session: "0199dc9d-7ae5-7793-b3b1-b14a191ee88c" }
  Result: {
  error: "SessionLogging: User user:Alice is not the owner of session 0199dc9d-7ae5-7793-b3b1-b14a191ee88c."
}
