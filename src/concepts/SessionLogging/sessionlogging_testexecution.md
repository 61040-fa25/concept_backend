
--- Executing Principle Trace ---
Scenario: Alice starts a new session.

--- Action: startSession ---
  Inputs: { user: "user:Alice" }
  Result: { session: "0199e118-0eb9-7dca-8696-9c234d1dc433" }
Scenario: Alice adds multiple image entries to the active session.

--- Action: addEntry (multiple) ---
  Inputs: {
  user: "user:Alice",
  session: "0199e118-0eb9-7dca-8696-9c234d1dc433",
  images: [ "image:photo1.jpg", "image:photo2.png", "image:photo3.jpeg" ]
}
  Result: {}
Scenario: Alice ends the session.

--- Action: endSession ---
  Inputs: { user: "user:Alice", session: "0199e118-0eb9-7dca-8696-9c234d1dc433" }
  Result: {}
Scenario: Attempt to add an entry to an already ended session (expected to fail).

--- Action: addEntry (to ended session) ---
  Inputs: {
  user: "user:Alice",
  session: "0199e118-0eb9-7dca-8696-9c234d1dc433",
  image: "image:photo4.jpg"
}
  Result: {
  error: "SessionLogging: Session with ID 0199e118-0eb9-7dca-8696-9c234d1dc433 is not active. Cannot add entries."
}
Scenario: Verify recorded entries persist after the session ends.

--- Executing addEntry Precondition Violation Tests ---
Setup: Started session 0199e118-0ffa-7e92-a397-340f391490bd for Alice.
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
Setup: Started session 0199e118-101d-7635-86b1-ab93ee50c8cc for Bob.

--- Action: addEntry (wrong owner) ---
  Inputs: {
  user: "user:Alice",
  session: "0199e118-101d-7635-86b1-ab93ee50c8cc",
  image: "image:photo1.jpg"
}
  Result: {
  error: "SessionLogging: User user:Alice is not the owner of session 0199e118-101d-7635-86b1-ab93ee50c8cc."
}
Scenario: Alice adds the same image twice to her session.

--- Action: addEntry (first time image4) ---
  Inputs: {
  user: "user:Alice",
  session: "0199e118-0ffa-7e92-a397-340f391490bd",
  image: "image:photo4.jpg"
}
  Result: {}

--- Action: addEntry (duplicate image4) ---
  Inputs: {
  user: "user:Alice",
  session: "0199e118-0ffa-7e92-a397-340f391490bd",
  image: "image:photo4.jpg"
}
  Result: {
  error: "SessionLogging: Image image:photo4.jpg is already an entry in session 0199e118-0ffa-7e92-a397-340f391490bd."
}

--- Executing endSession Precondition Violation & Idempotency Tests ---
Setup: Started session 0199e118-1093-739f-a6c5-9486ca81c99f for Alice.
Scenario: Ending a non-existent session.

--- Action: endSession (non-existent session) ---
  Inputs: { user: "user:Alice", session: "session:anotherNonExistent" }
  Result: {
  error: "SessionLogging: Session with ID session:anotherNonExistent not found."
}
Scenario: Alice tries to end Bob's session.
Setup: Started session 0199e118-10b5-7b6b-a18e-5e25f1be246d for Bob.

--- Action: endSession (wrong owner) ---
  Inputs: { user: "user:Alice", session: "0199e118-10b5-7b6b-a18e-5e25f1be246d" }
  Result: {
  error: "SessionLogging: User user:Alice is not the owner of session 0199e118-10b5-7b6b-a18e-5e25f1be246d."
}
Scenario: Ending an already inactive session.

--- Action: endSession (first time) ---
  Inputs: { user: "user:Alice", session: "0199e118-1093-739f-a6c5-9486ca81c99f" }
  Result: {}

--- Action: endSession (second time - expected error) ---
  Inputs: { user: "user:Alice", session: "0199e118-1093-739f-a6c5-9486ca81c99f" }
  Result: {
  error: "SessionLogging: Session with ID 0199e118-1093-739f-a6c5-9486ca81c99f is already inactive."
}

--- Executing Multi-User Isolation Tests ---
Scenario: Alice starts her session and adds images.

--- Action: Alice's actions ---
  Inputs: {
  session: "0199e118-112a-796e-a3cb-efb74ee09b21",
  images: [ "image:photo1.jpg", "image:photo2.png" ]
}
  Result: {}
Scenario: Bob starts his session and adds images.

--- Action: Bob's actions ---
  Inputs: {
  session: "0199e118-1193-7ae4-8285-c76a49692cbf",
  images: [ "image:photo3.jpeg", "image:photo5.jpeg" ]
}
  Result: {}
Scenario: Verifying isolation of sessions between users.
Scenario: Alice attempts unauthorized actions on Bob's session.

--- Action: Alice add entry to Bob's session ---
  Inputs: {
  user: "user:Alice",
  session: "0199e118-1193-7ae4-8285-c76a49692cbf",
  image: "image:photo4.jpg"
}
  Result: {
  error: "SessionLogging: User user:Alice is not the owner of session 0199e118-1193-7ae4-8285-c76a49692cbf."
}

--- Action: Alice end Bob's session ---
  Inputs: { user: "user:Alice", session: "0199e118-1193-7ae4-8285-c76a49692cbf" }
  Result: {
  error: "SessionLogging: User user:Alice is not the owner of session 0199e118-1193-7ae4-8285-c76a49692cbf."
}
