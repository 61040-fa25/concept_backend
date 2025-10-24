// file: src/UserAccount/UserAccountConcept.test.ts

import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAccountConcept from "./UserAccountConcept.ts";
import { ID } from "@utils/types.ts";

/**
 * Helper function to log action calls and their results consistently.
 */
// deno-lint-ignore no-explicit-any
async function logAction<T extends (...args: any[]) => Promise<any>>(
  actionName: string,
  actionFn: T,
  args: Parameters<T>[0],
): Promise<Awaited<ReturnType<T>>> {
  console.log(
    `\n--- Calling ${actionName} with args: ${JSON.stringify(args)} ---`,
  );
  const result = await actionFn(args);
  console.log(`--- Result of ${actionName}: ${JSON.stringify(result)} ---`);
  return result;
}

Deno.test("UserAccount Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const userAccount = new UserAccountConcept(db);

  let registeredUser1: ID;
  let registeredUser2: ID;
  const email1 = "testuser1@example.com";
  const password1 = "securepassword123";
  const displayName1 = "Test User One";

  const email2 = "testuser2@example.com";
  const password2 = "anothersecurepass";
  const displayName2 = "Test User Two";

  // --- Test 1: Operational Principle ---
  await t.step("1. Operational Principle: Register and Log In", async () => {
    // Register user 1
    const registerResult = await logAction(
      "register",
      userAccount.register.bind(userAccount),
      { email: email1, password: password1, displayName: displayName1 },
    );
    assertExists(
      (registerResult as { user: ID }).user,
      "Registration should return a user ID.",
    );
    registeredUser1 = (registerResult as { user: ID }).user;

    // Log in user 1
    const loginResult = await logAction(
      "login",
      userAccount.login.bind(userAccount),
      { email: email1, password: password1 },
    );
    assertExists(
      (loginResult as { user: ID }).user,
      "Login should succeed for registered user.",
    );
    assertEquals(
      (loginResult as { user: ID }).user,
      registeredUser1,
      "Logged in user ID should match registered user ID.",
    );

    // Query user 1's profile
    const profileResult = await logAction(
      "_getUserProfile",
      userAccount._getUserProfile.bind(userAccount),
      { user: registeredUser1 },
    );
    assertExists(
      profileResult,
      "Profile should be found for the registered user.",
    );
    assertEquals(
      profileResult?.displayName,
      displayName1,
      "Display name should match.",
    );
    assertEquals(profileResult?.email, email1, "Email should match.");

    // Find user 1 by email
    const findUserResult = await logAction(
      "_findUserByEmail",
      userAccount._findUserByEmail.bind(userAccount),
      { email: email1 },
    );
    assertExists(findUserResult, "User should be found by email.");
    assertEquals(
      findUserResult,
      registeredUser1,
      "Found user ID should match registered user ID.",
    );
  });

  // --- Test 2: Duplicate Registration & Login Failures ---
  await t.step(
    "2. Error Cases: Duplicate Registration, Incorrect Login",
    async () => {
      // Attempt to register with existing email
      const duplicateRegisterResult = await logAction(
        "register",
        userAccount.register.bind(userAccount),
        { email: email1, password: "newpassword", displayName: "Another User" },
      );
      assertExists(
        (duplicateRegisterResult as { error: string }).error,
        "Duplicate registration should return an error.",
      );
      assertEquals(
        (duplicateRegisterResult as { error: string }).error,
        "Email already in use.",
        "Error message should indicate email is already in use.",
      );

      // Attempt to login with incorrect password
      const incorrectPasswordLogin = await logAction(
        "login",
        userAccount.login.bind(userAccount),
        { email: email1, password: "wrongpassword" },
      );
      assertExists(
        (incorrectPasswordLogin as { error: string }).error,
        "Login with incorrect password should fail.",
      );
      assertEquals(
        (incorrectPasswordLogin as { error: string }).error,
        "Invalid credentials.",
        "Error message should indicate invalid credentials.",
      );

      // Attempt to login with non-existent email
      const nonExistentEmailLogin = await logAction(
        "login",
        userAccount.login.bind(userAccount),
        { email: "nonexistent@example.com", password: "anypass" },
      );
      assertExists(
        (nonExistentEmailLogin as { error: string }).error,
        "Login with non-existent email should fail.",
      );
      assertEquals(
        (nonExistentEmailLogin as { error: string }).error,
        "Invalid credentials.",
        "Error message should indicate invalid credentials for non-existent email.",
      );
    },
  );

  // --- Test 3: Profile Update and Verification ---
  await t.step("3. Profile Update and Verification", async () => {
    const newDisplayName1 = "Updated User One Name";

    // Update profile for user 1
    const updateResult = await logAction(
      "updateProfile",
      userAccount.updateProfile.bind(userAccount),
      { user: registeredUser1, newDisplayName: newDisplayName1 },
    );
    assertEquals(
      updateResult,
      {},
      "Profile update should return an empty object on success.",
    );

    // Verify update via query
    const profileResult = await logAction(
      "_getUserProfile",
      userAccount._getUserProfile.bind(userAccount),
      { user: registeredUser1 },
    );
    assertExists(profileResult, "Profile should still be found after update.");
    assertEquals(
      profileResult?.displayName,
      newDisplayName1,
      "Display name should be updated.",
    );
    assertEquals(
      profileResult?.email,
      email1,
      "Email should remain unchanged.",
    );

    // Attempt to update non-existent user
    const nonExistentUpdate = await logAction(
      "updateProfile",
      userAccount.updateProfile.bind(userAccount),
      { user: "nonexistentUser" as ID, newDisplayName: "Ghost" },
    );
    assertExists(
      (nonExistentUpdate as { error: string }).error,
      "Updating non-existent user should return an error.",
    );
    assertEquals(
      (nonExistentUpdate as { error: string }).error,
      "User not found.",
      "Error message should indicate user not found.",
    );
  });

  // --- Test 4: Account Deletion and Re-registration ---
  await t.step("4. Account Deletion and Re-registration", async () => {
    // Register user 2
    const registerResult2 = await logAction(
      "register",
      userAccount.register.bind(userAccount),
      { email: email2, password: password2, displayName: displayName2 },
    );
    assertExists(
      (registerResult2 as { user: ID }).user,
      "Registration for user 2 should succeed.",
    );
    registeredUser2 = (registerResult2 as { user: ID }).user;

    // Delete user 2's account
    const deleteResult = await logAction(
      "deleteAccount",
      userAccount.deleteAccount.bind(userAccount),
      { user: registeredUser2 },
    );
    assertEquals(
      deleteResult,
      {},
      "Account deletion should return an empty object on success.",
    );

    // Attempt to log in with deleted user (expect failure)
    const loginDeletedUser = await logAction(
      "login",
      userAccount.login.bind(userAccount),
      { email: email2, password: password2 },
    );
    assertExists(
      (loginDeletedUser as { error: string }).error,
      "Login with deleted user credentials should fail.",
    );
    assertEquals(
      (loginDeletedUser as { error: string }).error,
      "Invalid credentials.",
      "Error message should indicate invalid credentials for deleted user.",
    );

    // Attempt to query profile of deleted user (expect null)
    const profileDeletedUser = await logAction(
      "_getUserProfile",
      userAccount._getUserProfile.bind(userAccount),
      { user: registeredUser2 },
    );
    assertEquals(
      profileDeletedUser,
      null,
      "Profile for deleted user should not be found.",
    );

    // Attempt to delete non-existent user
    const deleteNonExistent = await logAction(
      "deleteAccount",
      userAccount.deleteAccount.bind(userAccount),
      { user: "nonexistentUser" as ID },
    );
    assertExists(
      (deleteNonExistent as { error: string }).error,
      "Deleting non-existent user should return an error.",
    );
    assertEquals(
      (deleteNonExistent as { error: string }).error,
      "User not found.",
      "Error message should indicate user not found for deletion.",
    );

    // Re-register user 2 with the same email (should now succeed)
    const reRegisterResult = await logAction(
      "register",
      userAccount.register.bind(userAccount),
      { email: email2, password: password2, displayName: displayName2 },
    );
    assertExists(
      (reRegisterResult as { user: ID }).user,
      "Re-registration with previously deleted email should succeed.",
    );
    assertNotEquals(
      (reRegisterResult as { user: ID }).user,
      registeredUser2, // New user should have a new ID
      "Re-registered user should have a new ID.",
    );
  });

  // --- Test 5: Querying Non-existent Data ---
  await t.step("5. Querying Non-existent Data", async () => {
    // Attempt to get profile for a completely non-existent user ID
    const profileNonExistentID = await logAction(
      "_getUserProfile",
      userAccount._getUserProfile.bind(userAccount),
      { user: "ghostUser123" as ID },
    );
    assertEquals(
      profileNonExistentID,
      null,
      "Querying non-existent user ID should return null.",
    );

    // Attempt to find user by a non-existent email
    const findNonExistentEmail = await logAction(
      "_findUserByEmail",
      userAccount._findUserByEmail.bind(userAccount),
      { email: "unknown@example.com" },
    );
    assertEquals(
      findNonExistentEmail,
      null,
      "Finding by non-existent email should return null.",
    );
  });

  await client.close();
});
