import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UserAuthConcept from "./UserAuthConcept.ts";

// Define example user IDs and credentials for testing
const userAId = "user:Alice" as ID;
const userBId = "user:Bob" as ID;

const userA = {
  username: "alice_doe",
  password: "password123",
  email: "alice@example.com",
};

const userB = {
  username: "bob_smith",
  password: "secure_pass",
  email: "bob@example.com",
};

Deno.test("Principle: User registers, confirms, and can authenticate", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);

  try {
    // 1. User registers
    const registerResult = await userAuthConcept.register(userA);
    assertNotEquals(
      "error" in registerResult,
      true,
      "Registration should not fail.",
    );
    const { user, token } = registerResult as { user: ID; token: string };
    assertExists(user);
    assertExists(token);

    // Verify user is in DB and unconfirmed
    const storedUserBeforeConfirm = await userAuthConcept._getUserById({
      userId: user,
    });
    assertExists(storedUserBeforeConfirm);
    assertEquals(storedUserBeforeConfirm?.username, userA.username);
    assertEquals(storedUserBeforeConfirm?.confirmed, false);
    assertEquals(storedUserBeforeConfirm?.confirmationToken, token);

    // 2. User confirms their email
    const confirmResult = await userAuthConcept.confirm({
      username: userA.username,
      token,
    });
    assertNotEquals(
      "error" in confirmResult,
      true,
      "Confirmation should not fail.",
    );

    // Verify user is now confirmed and token is null
    const storedUserAfterConfirm = await userAuthConcept._getUserById({
      userId: user,
    });
    assertExists(storedUserAfterConfirm);
    assertEquals(storedUserAfterConfirm?.confirmed, true);
    assertEquals(storedUserAfterConfirm?.confirmationToken, null);

    // 3. User authenticates
    const authResult = await userAuthConcept.authenticate(userA);
    assertNotEquals(
      "error" in authResult,
      true,
      "Authentication should not fail.",
    );
    const { user: authenticatedUser } = authResult as { user: ID };
    assertEquals(
      authenticatedUser,
      user,
      "Authenticated user ID should match.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: register requires unique username", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);

  try {
    // Register first user successfully
    const registerResult1 = await userAuthConcept.register(userA);
    assertNotEquals(
      "error" in registerResult1,
      true,
      "First registration should succeed.",
    );

    // Attempt to register with the same username
    const registerResult2 = await userAuthConcept.register({
      username: userA.username, // Same username
      password: "anotherpassword",
      email: "another@example.com",
    });
    assertEquals(
      "error" in registerResult2,
      true,
      "Registering with a duplicate username should fail.",
    );
    assertEquals(
      (registerResult2 as { error: string }).error,
      `Username '${userA.username}' is already taken.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: confirm successfully confirms a user and cleans up token", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);

  try {
    const registerResult = await userAuthConcept.register(userB);
    const { user, token } = registerResult as { user: ID; token: string };

    // Before confirmation
    const preConfirmUser = await userAuthConcept._getUserById({ userId: user });
    assertExists(preConfirmUser);
    assertEquals(preConfirmUser?.confirmed, false);
    assertEquals(preConfirmUser?.confirmationToken, token);

    // Confirm
    const confirmResult = await userAuthConcept.confirm({
      username: userB.username,
      token,
    });
    assertNotEquals(
      "error" in confirmResult,
      true,
      "Confirmation with correct token should succeed.",
    );

    // After confirmation
    const postConfirmUser = await userAuthConcept._getUserById({
      userId: user,
    });
    assertExists(postConfirmUser);
    assertEquals(postConfirmUser?.confirmed, true);
    assertEquals(postConfirmUser?.confirmationToken, null); // Token should be cleared
  } finally {
    await client.close();
  }
});

Deno.test("Action: confirm fails for non-existent user", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);

  try {
    const nonExistentUsername = "nonexistent_user";
    const result = await userAuthConcept.confirm({
      username: nonExistentUsername,
      token: "anytoken",
    });
    assertEquals(
      "error" in result,
      true,
      "Confirmation for a non-existent user should fail.",
    );
    assertEquals(
      (result as { error: string }).error,
      `User with username '${nonExistentUsername}' not found.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: confirm fails for already confirmed user", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);

  try {
    const registerResult = await userAuthConcept.register(userA);
    const { token } = registerResult as { user: ID; token: string };

    // First confirmation (should succeed)
    await userAuthConcept.confirm({ username: userA.username, token });

    // Attempt second confirmation
    const result = await userAuthConcept.confirm({
      username: userA.username,
      token: "another_token_or_same", // Token doesn't matter much here
    });
    assertEquals(
      "error" in result,
      true,
      "Confirmation for an already confirmed user should fail.",
    );
    assertEquals(
      (result as { error: string }).error,
      `User '${userA.username}' is already confirmed.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: confirm fails with invalid token", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);

  try {
    await userAuthConcept.register(userA);

    // Attempt confirmation with an invalid token
    const result = await userAuthConcept.confirm({
      username: userA.username,
      token: "invalidtoken123",
    });
    assertEquals(
      "error" in result,
      true,
      "Confirmation with an invalid token should fail.",
    );
    assertEquals(
      (result as { error: string }).error,
      "Invalid confirmation token.",
    );

    // Verify user is still unconfirmed
    const storedUser = await userAuthConcept._getUserByUsername({
      username: userA.username,
    });
    assertExists(storedUser);
    assertEquals(storedUser?.confirmed, false);
  } finally {
    await client.close();
  }
});

Deno.test("Action: authenticate fails for non-existent user", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);

  try {
    const result = await userAuthConcept.authenticate({
      username: "nonexistent_user",
      password: "anypassword",
    });
    assertEquals(
      "error" in result,
      true,
      "Authentication for a non-existent user should fail.",
    );
    assertEquals(
      (result as { error: string }).error,
      "Invalid username or password.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: authenticate fails for unconfirmed user", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);

  try {
    await userAuthConcept.register(userA); // User is registered but not confirmed

    const result = await userAuthConcept.authenticate(userA);
    assertEquals(
      "error" in result,
      true,
      "Authentication for an unconfirmed user should fail.",
    );
    assertEquals(
      (result as { error: string }).error,
      "User email not confirmed. Please check your email.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: authenticate fails with incorrect password", async () => {
  const [db, client] = await testDb();
  const userAuthConcept = new UserAuthConcept(db);

  try {
    const registerResult = await userAuthConcept.register(userA);
    const { token } = registerResult as { user: ID; token: string };
    await userAuthConcept.confirm({ username: userA.username, token }); // Confirm the user

    const result = await userAuthConcept.authenticate({
      username: userA.username,
      password: "wrongpassword",
    });
    assertEquals(
      "error" in result,
      true,
      "Authentication with an incorrect password should fail.",
    );
    assertEquals(
      (result as { error: string }).error,
      "Invalid username or password.",
    );
  } finally {
    await client.close();
  }
});
