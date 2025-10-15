import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import PasswordAuthenticationConcept from "./PasswordAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("PasswordAuthenticationConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new PasswordAuthenticationConcept(db);

  // Helper function for logging
  const log = (message: string, data?: unknown) => {
    console.log(`\n--- ${message} ---`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  };

  await t.step("Operational Principle: Register and Authenticate", async () => {
    log("RUNNING OPERATIONAL PRINCIPLE: register a user, then authenticate.");

    const username = "alice";
    const password = "password123";

    log("Action: register", { username, password });
    const registerResult = await concept.register({ username, password });
    assertEquals("user" in registerResult, true, "Registration should succeed");
    const aliceId = (registerResult as { user: string }).user;
    log("Result: register", registerResult);

    // Verify user existence using the new queries
    log("Query: _userExistsById", { user: aliceId });
    const existsByIdResult = await concept._userExistsById({
      user: aliceId as ID,
    });
    assertEquals(
      existsByIdResult.length,
      1,
      "User should exist by ID after registration",
    );
    assertEquals(
      existsByIdResult[0],
      true,
      "User should exist by ID and return true",
    );
    log("Result: _userExistsById", existsByIdResult);

    log("Query: _userExistsByUsername", { username });
    const existsByUsernameResult = await concept._userExistsByUsername({
      username,
    });
    assertEquals(
      existsByUsernameResult.length,
      1,
      "User should exist by username after registration",
    );
    assertEquals(
      existsByUsernameResult[0],
      true,
      "User should exist by username and return true",
    );
    log("Result: _userExistsByUsername", existsByUsernameResult);

    log("Action: authenticate", { username, password });
    const authResult = await concept.authenticate({ username, password });
    assertEquals("user" in authResult, true, "Authentication should succeed");
    assertEquals(
      (authResult as { user: string }).user,
      aliceId,
      "Authenticated user ID should match registered user ID",
    );
    log("Result: authenticate", authResult);

    // Verify internal state for completeness
    log("Query: _getUserByUsername", { username });
    const storedUsers = await concept._getUserByUsername(username);
    assertEquals(
      storedUsers.length,
      1,
      "Expected one user to be found by username",
    );
    const storedUser = storedUsers[0];
    log("Result: _getUserByUsername", storedUser);

    assertEquals(
      storedUser.username,
      username,
      "User's username should match the registered username",
    );
    assertEquals(
      storedUser._id,
      aliceId,
      "Stored user ID should match the registered user ID",
    );
    assertEquals(
      storedUser.password,
      password,
      "Stored password should match (plain text in this example)",
    );

    // Verify internal state using _getUserById
    log("Query: _getUserById", { id: aliceId });
    const storedUsersById = await concept._getUserById(aliceId as ID);
    assertEquals(
      storedUsersById.length,
      1,
      "Expected one user to be found by ID",
    );
    const storedUserById = storedUsersById[0];
    log("Result: _getUserById", storedUserById);

    assertEquals(
      storedUserById._id,
      aliceId,
      "User's ID should match the registered user ID (by ID query)",
    );
    assertEquals(
      storedUserById.username,
      username,
      "Stored username should match the registered username (by ID query)",
    );
    assertEquals(
      storedUserById.password,
      password,
      "Stored password should match (plain text in this example, by ID query)",
    );
  });

  await t.step(
    "Scenario 1: Attempt to register with an already existing username",
    async () => {
      log(
        "RUNNING SCENARIO 1: attempt to register with an already existing username.",
      );

      const username = "bob";
      const password = "bobpassword";

      log("Action: register (first time)", { username, password });
      const firstRegisterResult = await concept.register({
        username,
        password,
      });
      assertEquals(
        "user" in firstRegisterResult,
        true,
        "First registration should succeed",
      );
      const bobId = (firstRegisterResult as { user: string }).user;
      log("Result: first register", firstRegisterResult);

      // Verify the registered user by ID and username using new queries
      log("Query: _userExistsById", { user: bobId });
      const bobExistsById = await concept._userExistsById({
        user: bobId as ID,
      });
      assertEquals(bobExistsById.length, 1, "Bob should exist by ID");
      log("Result: _userExistsById (Bob)", bobExistsById);

      log("Query: _userExistsByUsername", { username });
      const bobExistsByUsername = await concept._userExistsByUsername({
        username,
      });
      assertEquals(
        bobExistsByUsername.length,
        1,
        "Bob should exist by username",
      );
      log("Result: _userExistsByUsername (Bob)", bobExistsByUsername);

      // Verify the registered user by ID (document)
      log("Query: _getUserById", { id: bobId });
      const bobUserById = await concept._getUserById(bobId as ID);
      assertEquals(bobUserById.length, 1, "Expected Bob to be found by ID");
      assertEquals(
        bobUserById[0].username,
        username,
        "Bob's username should match",
      );
      assertEquals(
        bobUserById[0].password,
        password,
        "Bob's password should match",
      );
      log("Result: _getUserById (Bob)", bobUserById[0]);

      log("Action: register (second time with same username)", {
        username,
        password,
      });
      const secondRegisterResult = await concept.register({
        username,
        password,
      });
      assertEquals(
        "error" in secondRegisterResult,
        true,
        "Second registration with same username should return an error",
      );
      assertEquals(
        (secondRegisterResult as { error: string }).error,
        "Username already taken.",
        "Error message should indicate username is taken",
      );
      log("Result: second register", secondRegisterResult);

      log("Verify that Bob still exists after failed registration");

      // Verify Bob still exists after failed registration
      log("Query: _userExistsByUsername (after failed register)", { username });
      const bobExistsAfterFailure = await concept._userExistsByUsername({
        username,
      });
      assertEquals(
        bobExistsAfterFailure.length,
        1,
        "Bob should still exist by username after failed registration attempt",
      );
      log(
        "Result: _userExistsByUsername (after failed register)",
        bobExistsAfterFailure,
      );
    },
  );

  await t.step("Scenario 2: Authenticate with incorrect password", async () => {
    log("RUNNING SCENARIO 2: authenticate with incorrect password.");

    const username = "charlie";
    const correctPassword = "charliepassword";
    const incorrectPassword = "wrongpassword";

    log("Action: register", { username, password: correctPassword });
    const registerResult = await concept.register({
      username,
      password: correctPassword,
    });
    assertEquals("user" in registerResult, true, "Registration should succeed");
    const charlieId = (registerResult as { user: string }).user;
    log("Result: register", registerResult);

    // Verify the registered user by ID and username using new queries
    log("Query: _userExistsById", { user: charlieId });
    const charlieExistsById = await concept._userExistsById({
      user: charlieId as ID,
    });
    assertEquals(charlieExistsById.length, 1, "Charlie should exist by ID");
    log("Result: _userExistsById (Charlie)", charlieExistsById);

    log("Query: _userExistsByUsername", { username });
    const charlieExistsByUsername = await concept._userExistsByUsername({
      username,
    });
    assertEquals(
      charlieExistsByUsername.length,
      1,
      "Charlie should exist by username",
    );
    log("Result: _userExistsByUsername (Charlie)", charlieExistsByUsername);

    // Verify the registered user by ID (document)
    log("Query: _getUserById", { id: charlieId });
    const charlieUserById = await concept._getUserById(charlieId as ID);
    assertEquals(
      charlieUserById.length,
      1,
      "Expected Charlie to be found by ID",
    );
    assertEquals(
      charlieUserById[0].username,
      username,
      "Charlie's username should match",
    );
    assertEquals(
      charlieUserById[0].password,
      correctPassword,
      "Charlie's password should match",
    );
    log("Result: _getUserById (Charlie)", charlieUserById[0]);

    log("Action: authenticate with incorrect password", {
      username,
      password: incorrectPassword,
    });
    const authResult = await concept.authenticate({
      username,
      password: incorrectPassword,
    });
    assertEquals(
      "error" in authResult,
      true,
      "Authentication with incorrect password should return an error",
    );
    assertEquals(
      (authResult as { error: string }).error,
      "Invalid username or password.",
      "Error message should indicate invalid credentials",
    );
    log("Result: authenticate (incorrect password)", authResult);

    log("Verify that Charlie still exists after failed authentication");

    // Verify Charlie still exists after failed authentication (user isn't deleted)
    log("Query: _userExistsByUsername (after failed auth)", { username });
    const charlieExistsAfterAuthFailure = await concept._userExistsByUsername({
      username,
    });
    assertEquals(
      charlieExistsAfterAuthFailure.length,
      1,
      "Charlie should still exist by username after failed authentication",
    );
    log(
      "Result: _userExistsByUsername (after failed auth)",
      charlieExistsAfterAuthFailure,
    );

    // Verify that correct password still works
    log("Action: authenticate with correct password", {
      username,
      password: correctPassword,
    });
    const correctAuthResult = await concept.authenticate({
      username,
      password: correctPassword,
    });
    assertEquals(
      "user" in correctAuthResult,
      true,
      "Authentication with correct password should succeed",
    );
    log("Result: authenticate (correct password)", correctAuthResult);
  });

  await t.step(
    "Scenario 3: Authenticate with non-existent username",
    async () => {
      log("RUNNING SCENARIO 3: authenticate with non-existent username.");

      const username = "nonexistent";
      const password = "anypassword";

      // Verify that the user does NOT exist before attempting authentication
      log("Query: _userExistsByUsername (before auth)", { username });
      const nonexistentUserExists = await concept._userExistsByUsername({
        username,
      });
      assertEquals(
        nonexistentUserExists.length,
        0,
        "Non-existent user should not exist by username",
      );
      log("Result: _userExistsByUsername (before auth)", nonexistentUserExists);

      // Attempt authentication
      log("Action: authenticate", { username, password });
      const authResult = await concept.authenticate({ username, password });
      assertEquals(
        "error" in authResult,
        true,
        "Authentication with non-existent username should return an error",
      );
      assertEquals(
        (authResult as { error: string }).error,
        "Invalid username or password.",
        "Error message should indicate invalid credentials",
      );
      log("Result: authenticate", authResult);

      log("Verify that user still does not exist after failed authentication");

      // Re-verify that the user still does NOT exist after failed authentication
      log("Query: _userExistsByUsername (after auth)", { username });
      const nonexistentUserExistsAfterAuth = await concept
        ._userExistsByUsername({ username });
      assertEquals(
        nonexistentUserExistsAfterAuth.length,
        0,
        "Non-existent user should still not exist by username after failed authentication",
      );
      log(
        "Result: _userExistsByUsername (after auth)",
        nonexistentUserExistsAfterAuth,
      );
    },
  );

  await t.step(
    "Scenario 4: Register and authenticate multiple users",
    async () => {
      log("RUNNING SCENARIO 4: register and authenticate multiple users.");

      const user1 = { username: "diana", password: "diana_password" };
      const user2 = { username: "eve", password: "eve_password" };

      log("Action: register user1", user1);
      const register1Result = await concept.register(user1);
      assertEquals(
        "user" in register1Result,
        true,
        "User1 registration should succeed",
      );
      const dianaId = (register1Result as { user: string }).user;
      log("Result: register user1", register1Result);

      // Verify Diana's existence
      log("Query: _userExistsById (Diana)", { user: dianaId });
      const dianaExistsById = await concept._userExistsById({
        user: dianaId as ID,
      });
      assertEquals(dianaExistsById.length, 1, "Diana should exist by ID");
      log("Result: _userExistsById (Diana)", dianaExistsById);

      log("Query: _userExistsByUsername (Diana)", { username: user1.username });
      const dianaExistsByUsername = await concept._userExistsByUsername({
        username: user1.username,
      });
      assertEquals(
        dianaExistsByUsername.length,
        1,
        "Diana should exist by username",
      );
      log("Result: _userExistsByUsername (Diana)", dianaExistsByUsername);

      log("Action: register user2", user2);
      const register2Result = await concept.register(user2);
      assertEquals(
        "user" in register2Result,
        true,
        "User2 registration should succeed",
      );
      const eveId = (register2Result as { user: string }).user;
      log("Result: register user2", register2Result);

      // Verify Eve's existence
      log("Query: _userExistsById (Eve)", { user: eveId });
      const eveExistsById = await concept._userExistsById({
        user: eveId as ID,
      });
      assertEquals(eveExistsById.length, 1, "Eve should exist by ID");
      log("Result: _userExistsById (Eve)", eveExistsById);

      log("Query: _userExistsByUsername (Eve)", { username: user2.username });
      const eveExistsByUsername = await concept._userExistsByUsername({
        username: user2.username,
      });
      assertEquals(
        eveExistsByUsername.length,
        1,
        "Eve should exist by username",
      );
      log("Result: _userExistsByUsername (Eve)", eveExistsByUsername);

      log("Action: authenticate user1", user1);
      const auth1Result = await concept.authenticate(user1);
      assertEquals(
        "user" in auth1Result,
        true,
        "User1 authentication should succeed",
      );
      assertEquals(
        (auth1Result as { user: string }).user,
        dianaId,
        "User1 authenticated ID should match",
      );
      log("Result: authenticate user1", auth1Result);

      log("Action: authenticate user2", user2);
      const auth2Result = await concept.authenticate(user2);
      assertEquals(
        "user" in auth2Result,
        true,
        "User2 authentication should succeed",
      );
      assertEquals(
        (auth2Result as { user: string }).user,
        eveId,
        "User2 authenticated ID should match",
      );
      log("Result: authenticate user2", auth2Result);

      // Verify all users count using _getAllUsers
      log("Query: _getAllUsers");
      const allUsers = await concept._getAllUsers();
      log("Result: _getAllUsers", allUsers);

      const registeredUsernames = allUsers.map((u) => u.username);
      assertEquals(
        registeredUsernames.includes(user1.username),
        true,
        "User1 should be in _getAllUsers",
      );
      assertEquals(
        registeredUsernames.includes(user2.username),
        true,
        "User2 should be in _getAllUsers",
      );
    },
  );

  await client.close();
});
