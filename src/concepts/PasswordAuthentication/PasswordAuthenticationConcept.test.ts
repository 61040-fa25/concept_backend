import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import { testDb } from "@utils/database.ts";
import PasswordAuthenticationConcept from "./PasswordAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// --- Action: register() tests ---
Deno.test("PasswordAuthenticationConcept: register() - Fails when username already exists (requires)", async () => {
  console.log(
    "\n--- Action Test: register() - Fails with existing username ---",
  );
  const [db, client] = await testDb();
  try {
    const concept = new PasswordAuthenticationConcept(db);

    const username = "duplicateUser";
    const password = "password123";

    console.log(
      `Trace: Step 1 - Registering user '${username}' for the first time.`,
    );
    const firstRegisterResult = await concept.register({ username, password });
    assertExists(
      firstRegisterResult.user,
      "First registration should succeed.",
    );
    console.log(`  Effect: User '${username}' registered.`);

    console.log(
      `Trace: Step 2 - Attempting to register user '${username}' again with a different password.`,
    );
    console.log(
      `  Action: register({ username: "${username}", password: "..." })`,
    );
    const secondRegisterResult = await concept.register({
      username,
      password: "anotherPassword",
    });
    assert(
      !secondRegisterResult.user,
      "Second registration with the same username should not return a user ID.",
    );
    assertExists(
      secondRegisterResult.error,
      "Second registration should return an error.",
    );
    assertStringIncludes(
      secondRegisterResult.error!,
      "already exists",
      "Error message should indicate duplicate username.",
    );
    console.log(
      `  Requirement Confirmation (requires 'username' not in Users): Requirement not met, action correctly failed with error: '${secondRegisterResult.error}'.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("PasswordAuthenticationConcept: register() - Fails with password shorter than 8 characters (requires)", async () => {
  console.log("\n--- Action Test: register() - Fails with short password ---");
  const [db, client] = await testDb();
  try {
    const concept = new PasswordAuthenticationConcept(db);

    const username = "shortPassUser";
    const shortPassword = "short"; // Less than 8 characters

    console.log(
      `Trace: Attempting to register user '${username}' with a short password.`,
    );
    console.log(
      `  Action: register({ username: "${username}", password: "${shortPassword}" })`,
    );
    const registerResult = await concept.register({
      username,
      password: shortPassword,
    });
    assert(
      !registerResult.user,
      "Registration with a short password should not return a user ID.",
    );
    assertExists(
      registerResult.error,
      "Registration with a short password should return an error.",
    );
    assertStringIncludes(
      registerResult.error!,
      "Password must be at least 8 characters long.",
      "Error message should indicate password length requirement.",
    );
    console.log(
      `  Requirement Confirmation (password length >= 8): Requirement not met, action correctly failed with error: '${registerResult.error}'.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("PasswordAuthenticationConcept: register() - Fails with username shorter than 8 characters (requires)", async () => {
  console.log("\n--- Action Test: register() - Fails with short username ---");
  const [db, client] = await testDb();
  try {
    const concept = new PasswordAuthenticationConcept(db);

    const shortUsername = "short"; // Less than 8 characters
    const password = "validPassword123";

    console.log(
      `Trace: Attempting to register user with a short username '${shortUsername}'.`,
    );
    console.log(
      `  Action: register({ username: "${shortUsername}", password: "..." })`,
    );
    const registerResult = await concept.register({
      username: shortUsername,
      password,
    });
    assert(
      !registerResult.user,
      "Registration with a short username should not return a user ID.",
    );
    assertExists(
      registerResult.error,
      "Registration with a short username should return an error.",
    );
    assertStringIncludes(
      registerResult.error!,
      "Username must be at least 8 characters long.",
      "Error message should indicate username length requirement.",
    );
    console.log(
      `  Requirement Confirmation (username length >= 8): Requirement not met, action correctly failed with error: '${registerResult.error}'.`,
    );
  } finally {
    await client.close();
  }
});

// --- Action: authenticate() tests ---

Deno.test("PasswordAuthenticationConcept: authenticate() - Fails with non-existent username (requires)", async () => {
  console.log(
    "\n--- Action Test: authenticate() - Fails with non-existent username ---",
  );
  const [db, client] = await testDb();
  try {
    const concept = new PasswordAuthenticationConcept(db);

    const username = "nonExistentUser";
    const password = "anyPassword";

    console.log(
      `Trace: Attempting to authenticate non-existent user '${username}'.`,
    );
    console.log(
      `  Action: authenticate({ username: "${username}", password: "..." })`,
    );
    const authenticateResult = await concept.authenticate({
      username,
      password,
    });
    assert(
      !authenticateResult.user,
      "Authentication for a non-existent user should not return a user ID.",
    );
    assertExists(
      authenticateResult.error,
      "Authentication for a non-existent user should return an error.",
    );
    assertStringIncludes(
      authenticateResult.error!,
      "Invalid username or password.",
      "Error message should indicate invalid credentials.",
    );
    console.log(
      `  Requirement Confirmation (requires 'username' exists): Requirement not met, action correctly failed with error: '${authenticateResult.error}'.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("PasswordAuthenticationConcept: authenticate() - Fails with incorrect password (effects)", async () => {
  console.log(
    "\n--- Action Test: authenticate() - Fails with incorrect password ---",
  );
  const [db, client] = await testDb();
  try {
    const concept = new PasswordAuthenticationConcept(db);

    const username = "authFailedUser";
    const correctPassword = "correctPassword123";
    const incorrectPassword = "wrongPassword";

    console.log(`Trace: Step 1 - Registering user '${username}'.`);
    await concept.register({ username, password: correctPassword });
    console.log(`  Effect: User '${username}' registered.`);

    console.log(
      `Trace: Step 2 - Attempting to authenticate user '${username}' with an incorrect password.`,
    );
    console.log(
      `  Action: authenticate({ username: "${username}", password: "${incorrectPassword}" })`,
    );
    const authenticateResult = await concept.authenticate({
      username,
      password: incorrectPassword,
    });
    assert(
      !authenticateResult.user,
      "Authentication with a wrong password should not return a user ID.",
    );
    assertExists(
      authenticateResult.error,
      "Authentication with a wrong password should return an error.",
    );
    assertStringIncludes(
      authenticateResult.error!,
      "Invalid username or password.",
      "Error message should indicate invalid credentials.",
    );
    console.log(
      `  Effect Confirmation (password mismatch): Action correctly returned an error, confirming password verification failure.`,
    );
  } finally {
    await client.close();
  }
});

// --- Query: _getAllUsers() tests ---
// --- Principle Test ---
// --- Interesting Case: Multiple Distinct Users (from previous tests, now updated to include _getAllUsers) ---
Deno.test("PasswordAuthenticationConcept: Multiple distinct users can register and authenticate independently, and be listed", async () => {
  console.log(
    "\n--- Interesting Case: Multiple Independent Users (with _getAllUsers check) ---",
  );
  const [db, client] = await testDb();
  try {
    const concept = new PasswordAuthenticationConcept(db);

    const userA_username = "userAlice";
    const userA_password = "AlicePassword123";
    const userB_username = "userBob1";
    const userB_password = "BobPassword123";

    console.log(`Trace: Step 1 - Registering User A ('${userA_username}').`);
    const registerResultA = await concept.register({
      username: userA_username,
      password: userA_password,
    });
    assertExists(registerResultA.user, "User A registration should succeed.");
    const userIdA = registerResultA.user as ID;
    console.log(`  Effect: User A registered with ID: ${userIdA}.`);

    console.log(`Trace: Step 2 - Registering User B ('${userB_username}').`);
    const registerResultB = await concept.register({
      username: userB_username,
      password: userB_password,
    });
    assertExists(registerResultB.user, "User B registration should succeed.");
    const userIdB = registerResultB.user as ID;
    console.log(`  Effect: User B registered with ID: ${userIdB}.`);

    assertNotEquals(
      userIdA,
      userIdB,
      "User IDs for distinct users should be different.",
    );
    console.log(
      "  Effect Confirmation: Distinct User IDs were generated for different users.",
    );

    console.log(`Trace: Step 3 - Authenticating User A ('${userA_username}').`);
    const authResultA = await concept.authenticate({
      username: userA_username,
      password: userA_password,
    });
    assertExists(authResultA.user, "User A authentication should succeed.");
    assertEquals(
      authResultA.user,
      userIdA,
      "Authenticated User A ID should match.",
    );
    console.log(`  Effect: User A authenticated successfully.`);

    console.log(`Trace: Step 4 - Authenticating User B ('${userB_username}').`);
    const authResultB = await concept.authenticate({
      username: userB_username,
      password: userB_password,
    });
    assertExists(authResultB.user, "User B authentication should succeed.");
    assertEquals(
      authResultB.user,
      userIdB,
      "Authenticated User B ID should match.",
    );
    console.log(`  Effect: User B authenticated successfully.`);

    console.log(`Trace: Step 5 - Querying for all registered users.`);
    const allUsersResult = await concept._getAllUsers();
    assert(
      Array.isArray(allUsersResult),
      "_getAllUsers should return an array.",
    );
    assertEquals(
      allUsersResult.length,
      2,
      "Should return 2 users after registration.",
    );

    const retrievedUserIds = allUsersResult.map(
      (u: { user: ID } | { error: string }) => {
        assert(
          !("error" in u),
          "No error expected in individual user objects.",
        );
        return u.user;
      },
    );

    assert(
      retrievedUserIds.includes(userIdA),
      `Retrieved users should include User A ID: ${userIdA}`,
    );
    assert(
      retrievedUserIds.includes(userIdB),
      `Retrieved users should include User B ID: ${userIdB}`,
    );
    console.log(
      `  Effect Confirmation: _getAllUsers correctly listed all registered user IDs: [${
        retrievedUserIds.join(", ")
      }].`,
    );

    console.log(
      "Interesting case fulfilled: This demonstrates that the concept correctly handles multiple independent users, allowing each to register and authenticate without interference, and that all registered users are retrievable by ID through the _getAllUsers query, aligning with expected multi-user system behavior and query functionality.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("PasswordAuthenticationConcept: _getUserUsername returns username for existing user", async () => {
  console.log("\n--- Query Test: _getUserUsername success path ---");
  const [db, client] = await testDb();
  try {
    const concept = new PasswordAuthenticationConcept(db);

    const username = "queryUser01";
    const password = "queryPassword123";
    const registerResult = await concept.register({ username, password });
    assertExists(
      registerResult.user,
      "Registration must succeed to test the query.",
    );
    const userId = registerResult.user as ID;

    const queryResult = await concept._getUserUsername({ user: userId });
    assertEquals(
      queryResult.length,
      1,
      "Query should return one entry containing the username.",
    );

    const entry = queryResult[0];
    assert(
      !("error" in entry),
      "Successful query should not include an error object.",
    );
    assertEquals(
      (entry as { username: string }).username,
      username,
      "Returned username should match registered value.",
    );
    console.log(
      `  Effect Confirmation: Retrieved username '${
        (entry as { username: string }).username
      }' for user ID ${userId}.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("PasswordAuthenticationConcept: _getUserUsername returns error for unknown user", async () => {
  console.log("\n--- Query Test: _getUserUsername error path ---");
  const [db, client] = await testDb();
  try {
    const concept = new PasswordAuthenticationConcept(db);
    const unknownUser = freshID() as ID;

    const queryResult = await concept._getUserUsername({ user: unknownUser });
    assertEquals(
      queryResult.length,
      1,
      "Query should return a single entry containing the error.",
    );

    const entry = queryResult[0];
    assert("error" in entry, "Missing user should yield an error entry.");
    assertStringIncludes(
      entry.error,
      `User with ID '${unknownUser}' does not exist.`,
      "Error message should indicate the user was not found.",
    );
    console.log(
      `  Requirement Confirmation: Query returned error '${entry.error}' for unknown user ID ${unknownUser}.`,
    );
  } finally {
    await client.close();
  }
});
