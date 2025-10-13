---
timestamp: 'Mon Oct 13 2025 04:11:02 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_041102.e51162ea.md]]'
content_id: eda4bde230e8bb4c3bf5363403c86237ce13c392559b59503134b21e7ec9dd4d
---

# file: src/concepts/PasswordAuthentication/PasswordAuthenticationConcept.test.ts

```typescript
import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import PasswordAuthenticationConcept from "./PasswordAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("PasswordAuthenticationConcept Tests", async (t) => {
  const [db, client] = await testDb();
  const concept = new PasswordAuthenticationConcept(db);

  try {
    // --- Test 1: Operational Principle ---
    // Principle: After a user registers, they can authenticate with the same credentials.
    await t.step("Operational Principle: Register and Authenticate successfully", async () => {
      const username = "alice";
      const password = "securePassword123";

      console.log(`\n--- Test: Registering user '${username}' ---`);
      const registerResult = await concept.register({ username, password });
      console.log("Register Result:", registerResult);

      assertExists((registerResult as { user: ID }).user, "Registration should return a user ID");
      const aliceId = (registerResult as { user: ID }).user;
      assertNotEquals(aliceId, "", "User ID should not be empty");

      console.log(`\n--- Test: Authenticating user '${username}' with correct password ---`);
      const authenticateResult = await concept.authenticate({ username, password });
      console.log("Authenticate Result:", authenticateResult);

      assertExists((authenticateResult as { user: ID }).user, "Authentication should return a user ID");
      assertEquals((authenticateResult as { user: ID }).user, aliceId, "Authenticated user ID should match registered user ID");

      // Verify the user exists in the state via internal query (without exposing password)
      const storedUser = await concept._getUserByUsername(username);
      assertExists(storedUser, "User should be stored in the database");
      assertEquals(storedUser?._id, aliceId, "Stored user ID should match");
      assertEquals(storedUser?.username, username, "Stored username should match");
      assertExists(storedUser?.hashedPassword, "Hashed password should exist");
      assertExists(storedUser?.salt, "Salt should exist");
      assertNotEquals(storedUser?.hashedPassword, password, "Password should be hashed, not plaintext");
    });

    // --- Test 2: Duplicate Registration ---
    await t.step("Scenario: Attempt to register with an already existing username", async () => {
      const username = "bob";
      const password = "bobPassword";

      console.log(`\n--- Test: Registering user '${username}' for the first time ---`);
      const registerResult1 = await concept.register({ username, password });
      console.log("Register Result 1:", registerResult1);
      assertExists((registerResult1 as { user: ID }).user, "First registration should succeed");

      console.log(`\n--- Test: Attempting to register user '${username}' again ---`);
      const registerResult2 = await concept.register({ username, password });
      console.log("Register Result 2 (duplicate):", registerResult2);

      assertExists((registerResult2 as { error: string }).error, "Duplicate registration should return an error");
      assertEquals((registerResult2 as { error: string }).error, "Username already taken.", "Error message should match");
    });

    // --- Test 3: Authentication with Incorrect Password ---
    await t.step("Scenario: Authenticate with a correct username but incorrect password", async () => {
      const username = "charlie";
      const correctPassword = "charliePassword";
      const incorrectPassword = "wrongCharliePassword";

      console.log(`\n--- Test: Registering user '${username}' ---`);
      const registerResult = await concept.register({ username, password: correctPassword });
      console.log("Register Result:", registerResult);
      assertExists((registerResult as { user: ID }).user, "Registration should succeed");

      console.log(`\n--- Test: Authenticating user '${username}' with incorrect password ---`);
      const authenticateResult = await concept.authenticate({ username, password: incorrectPassword });
      console.log("Authenticate Result (incorrect password):", authenticateResult);

      assertExists((authenticateResult as { error: string }).error, "Authentication with incorrect password should return an error");
      assertEquals((authenticateResult as { error: string }).error, "Invalid username or password.", "Error message should match");
    });

    // --- Test 4: Authentication with Non-existent Username ---
    await t.step("Scenario: Attempt to authenticate with a non-existent username", async () => {
      const nonExistentUsername = "diana";
      const anyPassword = "anyPassword";

      console.log(`\n--- Test: Attempting to authenticate non-existent user '${nonExistentUsername}' ---`);
      const authenticateResult = await concept.authenticate({ username: nonExistentUsername, password: anyPassword });
      console.log("Authenticate Result (non-existent user):", authenticateResult);

      assertExists((authenticateResult as { error: string }).error, "Authentication of non-existent user should return an error");
      assertEquals((authenticateResult as { error: string }).error, "Invalid username or password.", "Error message should match");
    });

    // --- Test 5: Multiple Users and Cross-Authentication Failure ---
    await t.step("Scenario: Register multiple users and ensure authentication is specific", async () => {
      const userE = { username: "eve", password: "evePassword" };
      const userF = { username: "frank", password: "frankPassword" };

      console.log(`\n--- Test: Registering user '${userE.username}' ---`);
      const registerE = await concept.register(userE);
      console.log("Register Eve Result:", registerE);
      assertExists((registerE as { user: ID }).user);
      const eveId = (registerE as { user: ID }).user;

      console.log(`\n--- Test: Registering user '${userF.username}' ---`);
      const registerF = await concept.register(userF);
      console.log("Register Frank Result:", registerF);
      assertExists((registerF as { user: ID }).user);
      const frankId = (registerF as { user: ID }).user;
      assertNotEquals(eveId, frankId, "User IDs should be unique");

      console.log(`\n--- Test: Authenticating user '${userE.username}' ---`);
      const authE = await concept.authenticate(userE);
      console.log("Authenticate Eve Result:", authE);
      assertExists((authE as { user: ID }).user);
      assertEquals((authE as { user: ID }).user, eveId);

      console.log(`\n--- Test: Authenticating user '${userF.username}' ---`);
      const authF = await concept.authenticate(userF);
      console.log("Authenticate Frank Result:", authF);
      assertExists((authF as { user: ID }).user);
      assertEquals((authF as { user: ID }).user, frankId);

      console.log(`\n--- Test: Attempting to authenticate user '${userE.username}' with '${userF.password}' (cross-authenticate) ---`);
      const crossAuthResult = await concept.authenticate({ username: userE.username, password: userF.password });
      console.log("Cross-Authenticate Result:", crossAuthResult);
      assertExists((crossAuthResult as { error: string }).error, "Cross-authentication should fail");
      assertEquals((crossAuthResult as { error: string }).error, "Invalid username or password.", "Error message should match");
    });

    // --- Test 6: Querying all users (for administrative/testing purposes) ---
    await t.step("Scenario: Retrieve all registered users", async () => {
      console.log("\n--- Test: Retrieving all users via internal query ---");
      const allUsers = await concept._getAllUsers();
      console.log("All Users:", allUsers);

      // We registered at least 5 distinct users in previous tests (alice, bob, charlie, eve, frank)
      assertEquals(allUsers.length >= 5, true, "Should have at least 5 registered users");
      const usernames = allUsers.map(u => u.username);
      assertExists(usernames.includes("alice"));
      assertExists(usernames.includes("bob"));
      assertExists(usernames.includes("charlie"));
      assertExists(usernames.includes("eve"));
      assertExists(usernames.includes("frank"));
    });
  } finally {
    // Ensure the client is closed even if tests fail
    await client.close();
  }
});
```
