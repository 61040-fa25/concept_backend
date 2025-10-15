---
timestamp: 'Wed Oct 15 2025 01:51:24 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_015124.d6e2fb39.md]]'
content_id: 66198d4ab3997c05dac2de2e6086a82c8f38ce133ea7aec4476b647d31fa9b9b
---

# file: src/concepts/PasswordAuthentication/PasswordAuthenticationConcept.test.ts

```typescript
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
    log("Running operational principle: register a user, then authenticate.");

    const username = "alice";
    const password = "password123";

    log("Action: register", { username, password });
    const registerResult = await concept.register({ username, password });
    assertEquals("user" in registerResult, true, "Registration should succeed");
    const aliceId = (registerResult as { user: string }).user;
    log("Result: register", registerResult);

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
    const storedUsers = await concept._getUserByUsername(username); // Now returns an array
    assertEquals(
      storedUsers.length,
      1,
      "Expected one user to be found by username",
    );
    const storedUser = storedUsers[0]; // Access the first (and only) user
    log("Result: _getUserByUsername", storedUser);

    assertEquals(
      storedUser.username, // Access directly, as it's an object in the array
      username,
      "User's username should match the registered username",
    );
    assertEquals(
      storedUser._id,
      aliceId,
      "Stored user ID should match the registered user ID",
    );
    assertEquals(
      storedUser.password, // Access directly
      password,
      "Stored password should match (plain text in this example)",
    );

    // Verify internal state using _getUserById
    log("Query: _getUserById", { id: aliceId });
    const storedUsersById = await concept._getUserById(aliceId as ID); // Returns an array
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
        "Running scenario 1: attempt to register with an already existing username.",
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

      // Verify the registered user by ID
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
    },
  );

  await t.step("Scenario 2: Authenticate with incorrect password", async () => {
    log("Running scenario 2: authenticate with incorrect password.");

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

    // Verify the registered user by ID
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
      log("Running scenario 3: authenticate with non-existent username.");

      const username = "nonexistent";
      const password = "anypassword";

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
    },
  );

  await t.step(
    "Scenario 4: Register and authenticate multiple users",
    async () => {
      log("Running scenario 4: register and authenticate multiple users.");

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

      log("Action: register user2", user2);
      const register2Result = await concept.register(user2);
      assertEquals(
        "user" in register2Result,
        true,
        "User2 registration should succeed",
      );
      const eveId = (register2Result as { user: string }).user;
      log("Result: register user2", register2Result);

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
      // Note: The previous tests also created users, so the count will be cumulative.
      // For a clean count in this specific step, one might want to reset the DB,
      // but the instruction is to not setup state except by actions.
      // We can at least assert that the two new users are present.
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

```
