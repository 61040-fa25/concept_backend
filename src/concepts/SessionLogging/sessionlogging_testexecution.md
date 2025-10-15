
--- EXECUTING Principle Trace ---

Scenario: Alice starts a new session.

--- Action: startSession ---
  Inputs: { user: "user:Alice" }
  Result: { session: "0199e699-fa8d-786b-85eb-e9d6963fa81d" }

Scenario: Alice adds multiple image entries to the active session.

--- Action: addEntry (multiple) ---
  Inputs: {
  user: "user:Alice",
  session: "0199e699-fa8d-786b-85eb-e9d6963fa81d",
  images: [ "image:photo1.jpg", "image:photo2.png", "image:photo3.jpeg" ]
}
  Result: {}

Scenario: Alice ends the session.

--- Action: endSession ---
  Inputs: { user: "user:Alice", session: "0199e699-fa8d-786b-85eb-e9d6963fa81d" }
  Result: {}

Scenario: Verify recorded entries persist after the session ends.

Images from Alice's session:  [ "image:photo1.jpg", "image:photo2.png", "image:photo3.jpeg" ]

--- EXECUTING addEntry Precondition Violation Tests ---

Setup: Started session 0199e699-fc77-7d2d-a67a-d54eaf16a748 for Alice.

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

Setup: Started session 0199e699-fc9b-7bde-89a0-630b45db3f5c for Bob.

--- Action: addEntry (wrong owner) ---
  Inputs: {
  user: "user:Alice",
  session: "0199e699-fc9b-7bde-89a0-630b45db3f5c",
  image: "image:photo1.jpg"
}
  Result: {
  error: "SessionLogging: User user:Alice is not the owner of session 0199e699-fc9b-7bde-89a0-630b45db3f5c."
}

Scenario: Alice adds the same image twice to her session.

--- Action: addEntry (first time image4) ---
  Inputs: {
  user: "user:Alice",
  session: "0199e699-fc77-7d2d-a67a-d54eaf16a748",
  image: "image:photo4.jpg"
}
  Result: {}

--- Action: addEntry (duplicate image4) ---
  Inputs: {
  user: "user:Alice",
  session: "0199e699-fc77-7d2d-a67a-d54eaf16a748",
  image: "image:photo4.jpg"
}
  Result: {
  error: "SessionLogging: Image image:photo4.jpg is already an entry in session 0199e699-fc77-7d2d-a67a-d54eaf16a748."
}

Scenario: Alice ends the session.

--- Action: endSession ---
  Inputs: { user: "user:Alice", session: "0199e699-fc77-7d2d-a67a-d54eaf16a748" }
  Result: {}

Scenario: Attempt to add an entry to an already ended session (expected to fail).

--- Action: addEntry (to ended session) ---
  Inputs: {
  user: "user:Alice",
  session: "0199e699-fc77-7d2d-a67a-d54eaf16a748",
  image: "image:photo5.jpeg"
}
  Result: {
  error: "SessionLogging: Session with ID 0199e699-fc77-7d2d-a67a-d54eaf16a748 is not active. Cannot add entries."
}

Scenario: Verify recorded entries persist after the session ends.
Images from Alice's session:  [ "image:photo4.jpg" ]

--- EXECUTING endSession Precondition Violation & Idempotency Tests ---
Setup: Started session 0199e699-fe29-7d15-9952-7db922a17ff5 for Alice.

Scenario: Ending a non-existent session.

--- Action: endSession (non-existent session) ---
  Inputs: { user: "user:Alice", session: "session:anotherNonExistent" }
  Result: {
  error: "SessionLogging: Session with ID session:anotherNonExistent not found."
}
Scenario: Alice tries to end Bob's session.

Setup: Started session 0199e699-fe51-70c6-84f0-eeb925707d5c for Bob.

--- Action: endSession (wrong owner) ---
  Inputs: { user: "user:Alice", session: "0199e699-fe51-70c6-84f0-eeb925707d5c" }
  Result: {
  error: "SessionLogging: User user:Alice is not the owner of session 0199e699-fe51-70c6-84f0-eeb925707d5c."
}

Scenario: Ending an already inactive session.

--- Action: endSession (first time) ---
  Inputs: { user: "user:Alice", session: "0199e699-fe29-7d15-9952-7db922a17ff5" }
  Result: {}

--- Action: endSession (second time - expected error) ---
  Inputs: { user: "user:Alice", session: "0199e699-fe29-7d15-9952-7db922a17ff5" }
  Result: {
  error: "SessionLogging: Session with ID 0199e699-fe29-7d15-9952-7db922a17ff5 is already inactive."
}

--- EXECUTING Multi-User Isolation Tests ---

Scenario: Alice starts her session and adds images.

--- Action: Alice's actions ---
  Inputs: {
  session: "0199e699-fed3-742c-b7cf-9ac59ec22f43",
  images: [ "image:photo1.jpg", "image:photo2.png" ]
}
  Result: {}

Scenario: Bob starts his session and adds images.

--- Action: Bob's actions ---
  Inputs: {
  session: "0199e699-ff84-7af3-b0c2-88ffa66e5d00",
  images: [ "image:photo3.jpeg", "image:photo5.jpeg" ]
}
  Result: {}
Scenario: Verifying isolation of sessions between users.
Alice's session includes image1? --> true. Expected: True
Alice's session includes image2? --> true. Expected: True
Alice's session includes image3? --> false. Expected: False
Alice's session includes image5? --> false. Expected: False
Bob's session includes image1? --> false. Expected: False
Bob's session includes image2? --> false. Expected: False
Bob's session includes image3? --> true. Expected: True
Bob's session includes image5? --> true. Expected: True

Scenario: Alice attempts unauthorized actions on Bob's session.

--- Action: Alice add entry to Bob's session ---
  Inputs: {
  user: "user:Alice",
  session: "0199e699-ff84-7af3-b0c2-88ffa66e5d00",
  image: "image:photo4.jpg"
}
  Result: {
  error: "SessionLogging: User user:Alice is not the owner of session 0199e699-ff84-7af3-b0c2-88ffa66e5d00."
}

--- Action: Alice end Bob's session ---
  Inputs: { user: "user:Alice", session: "0199e699-ff84-7af3-b0c2-88ffa66e5d00" }
  Result: {
  error: "SessionLogging: User user:Alice is not the owner of session 0199e699-ff84-7af3-b0c2-88ffa66e5d00."
}
