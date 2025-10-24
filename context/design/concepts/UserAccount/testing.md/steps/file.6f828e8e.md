---
timestamp: 'Thu Oct 23 2025 22:15:16 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_221516.e1c879f3.md]]'
content_id: 6f828e8e8cb5adec93d802b314d9278c781eade4c36182941c70e064d4a7c408
---

# file: src/UserAccount/UserAccountConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assertNull } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAccountConcept from "./UserAccountConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("UserAccount Concept Tests", async (t) => {
  let db, client, userAccount: UserAccountConcept;

  // Setup for each test case
  t.beforeEach(async () => {
    [db, client] = await testDb(); // This will drop and reconnect to a fresh DB for each test
    userAccount = new UserAccountConcept(db);
    console.log(`--- Test Case: ${t.name} ---`);
  });

  // Teardown for each test case
  t.afterEach(async () => {
    await client.close();
    console.log(`--- End Test Case: ${t.name} ---`);
  });

  await t.step("Operational Principle: Register and Login", async () => {
    const email = "alice@example.com";
    const password = "password123";
    const displayName = "Alice Smith";

    console.log(`Action: register({ email: "${email}", password: "****", displayName: "${displayName}" })`);
    const registerResult = await userAccount.register({ email, password, displayName });
    console.log(`Result: ${JSON.stringify(registerResult)}`);

    assertEquals(typeof registerResult, "object", "Register result should be an object.");
    assertExists((registerResult as { user: ID }).user, "User ID should be returned on successful registration.");
    const userId = (registerResult as { user: ID }).user;

    console.log(`Query: _findUserByEmail({ email: "${email}" })`);
    const foundUserByEmail = await userAccount._findUserByEmail({ email });
    console.log(`Result: ${JSON.stringify(foundUserByEmail)}`);
    assertEquals(foundUserByEmail, userId, "User should be findable by email after registration.");

    console.log(`Query: _getUserProfile({ user: "${userId}" })`);
    const userProfile = await userAccount._getUserProfile({ user: userId });
    console.log(`Result: ${JSON.stringify(userProfile)}`);
    assertExists(userProfile, "User profile should be retrievable.");
    assertEquals(userProfile?.email, email, "Profile email should match registered email.");
    assertEquals(userProfile?.displayName, displayName, "Profile display name should match registered display name.");

    console.log(`Action: login({ email: "${email}", password: "****" })`);
    const loginResult = await userAccount.login({ email, password });
    console.log(`Result: ${JSON.stringify(loginResult)}`);

    assertEquals(typeof loginResult, "object", "Login result should be an object.");
    assertExists((loginResult as { user: ID }).user, "User ID should be returned on successful login.");
    assertEquals((loginResult as { user: ID }).user, userId, "Logged in user ID should match registered user ID.");
  });

  await t.step("Scenario 1: Duplicate Registration Error", async () => {
    const email = "bob@example.com";
    const password = "password123";
    const displayName = "Bob Johnson";

    console.log(`Action: register({ email: "${email}", password: "****", displayName: "${displayName}" })`);
    const firstRegister = await userAccount.register({ email, password, displayName });
    console.log(`Result: ${JSON.stringify(firstRegister)}`);
    assertExists((firstRegister as { user: ID }).user, "First registration should succeed.");

    console.log(`Action: register({ email: "${email}", password: "****", displayName: "${displayName}" })`);
    const secondRegister = await userAccount.register({ email, password, displayName });
    console.log(`Result: ${JSON.stringify(secondRegister)}`);
    assertExists((secondRegister as { error: string }).error, "Second registration with same email should return an error.");
    assertEquals((secondRegister as { error: string }).error, "Email already in use.", "Error message should be specific.");
  });

  await t.step("Scenario 2: Invalid Login Attempts", async () => {
    const email = "charlie@example.com";
    const password = "password123";
    const displayName = "Charlie Brown";

    console.log(`Action: register({ email: "${email}", password: "****", displayName: "${displayName}" })`);
    const registerResult = await userAccount.register({ email, password, displayName });
    assertExists((registerResult as { user: ID }).user, "Registration should succeed.");

    // Attempt login with wrong password
    console.log(`Action: login({ email: "${email}", password: "wrongpassword" })`);
    const wrongPasswordLogin = await userAccount.login({ email, password: "wrongpassword" });
    console.log(`Result: ${JSON.stringify(wrongPasswordLogin)}`);
    assertExists((wrongPasswordLogin as { error: string }).error, "Login with wrong password should fail.");
    assertEquals((wrongPasswordLogin as { error: string }).error, "Invalid credentials.", "Error message should be specific.");

    // Attempt login with non-existent email
    const nonExistentEmail = "diana@example.com";
    console.log(`Action: login({ email: "${nonExistentEmail}", password: "****" })`);
    const nonExistentLogin = await userAccount.login({ email: nonExistentEmail, password: "password123" });
    console.log(`Result: ${JSON.stringify(nonExistentLogin)}`);
    assertExists((nonExistentLogin as { error: string }).error, "Login with non-existent email should fail.");
    assertEquals((nonExistentLogin as { error: string }).error, "Invalid credentials.", "Error message should be specific.");
  });

  await t.step("Scenario 3: Profile Update", async () => {
    const email = "eve@example.com";
    const password = "password123";
    const initialDisplayName = "Eve Green";
    const newDisplayName = "Eve Sparkle";

    console.log(`Action: register({ email: "${email}", password: "****", displayName: "${initialDisplayName}" })`);
    const registerResult = await userAccount.register({ email, password, initialDisplayName });
    assertExists((registerResult as { user: ID }).user, "Registration should succeed.");
    const userId = (registerResult as { user: ID }).user;

    console.log(`Action: updateProfile({ user: "${userId}", newDisplayName: "${newDisplayName}" })`);
    const updateResult = await userAccount.updateProfile({ user: userId, newDisplayName });
    console.log(`Result: ${JSON.stringify(updateResult)}`);
    assertEquals(updateResult, {}, "Profile update should return empty object on success.");

    console.log(`Query: _getUserProfile({ user: "${userId}" })`);
    const updatedProfile = await userAccount._getUserProfile({ user: userId });
    console.log(`Result: ${JSON.stringify(updatedProfile)}`);
    assertExists(updatedProfile, "User profile should still be retrievable.");
    assertEquals(updatedProfile?.displayName, newDisplayName, "Display name should be updated.");
    assertNotEquals(updatedProfile?.displayName, initialDisplayName, "Display name should no longer be initial value.");

    // Attempt to update non-existent user
    const nonExistentUser = "nonExistent" as ID;
    console.log(`Action: updateProfile({ user: "${nonExistentUser}", newDisplayName: "Ghost" })`);
    const errorUpdate = await userAccount.updateProfile({ user: nonExistentUser, newDisplayName: "Ghost" });
    console.log(`Result: ${JSON.stringify(errorUpdate)}`);
    assertExists((errorUpdate as { error: string }).error, "Updating non-existent user should fail.");
    assertEquals((errorUpdate as { error: string }).error, "User not found.", "Error message should be specific.");
  });

  await t.step("Scenario 4: Account Deletion and subsequent access attempts", async () => {
    const email = "frank@example.com";
    const password = "password123";
    const displayName = "Frank Ocean";

    console.log(`Action: register({ email: "${email}", password: "****", displayName: "${displayName}" })`);
    const registerResult = await userAccount.register({ email, password, displayName });
    assertExists((registerResult as { user: ID }).user, "Registration should succeed.");
    const userId = (registerResult as { user: ID }).user;

    console.log(`Action: deleteAccount({ user: "${userId}" })`);
    const deleteResult = await userAccount.deleteAccount({ user: userId });
    console.log(`Result: ${JSON.stringify(deleteResult)}`);
    assertEquals(deleteResult, {}, "Account deletion should return empty object on success.");

    // Verify user cannot log in
    console.log(`Action: login({ email: "${email}", password: "****" })`);
    const loginAfterDelete = await userAccount.login({ email, password });
    console.log(`Result: ${JSON.stringify(loginAfterDelete)}`);
    assertExists((loginAfterDelete as { error: string }).error, "Login after deletion should fail.");
    assertEquals((loginAfterDelete as { error: string }).error, "Invalid credentials.", "Login should fail due to user not found.");

    // Verify user profile is not retrievable
    console.log(`Query: _getUserProfile({ user: "${userId}" })`);
    const profileAfterDelete = await userAccount._getUserProfile({ user: userId });
    console.log(`Result: ${JSON.stringify(profileAfterDelete)}`);
    assertNull(profileAfterDelete, "User profile should not be retrievable after deletion.");

    // Verify user cannot be found by email
    console.log(`Query: _findUserByEmail({ email: "${email}" })`);
    const findByEmailAfterDelete = await userAccount._findUserByEmail({ email });
    console.log(`Result: ${JSON.stringify(findByEmailAfterDelete)}`);
    assertNull(findByEmailAfterDelete, "User should not be findable by email after deletion.");
  });

  await t.step("Scenario 5: Deleting a non-existent account", async () => {
    const nonExistentUser = "nonExistentUser123" as ID;

    console.log(`Action: deleteAccount({ user: "${nonExistentUser}" })`);
    const deleteResult = await userAccount.deleteAccount({ user: nonExistentUser });
    console.log(`Result: ${JSON.stringify(deleteResult)}`);
    assertExists((deleteResult as { error: string }).error, "Deleting non-existent account should return an error.");
    assertEquals((deleteResult as { error: string }).error, "User not found.", "Error message should be specific.");
  });
});
```

***
