[@implementation](implementation.md)

[@UserAccount](UserAccount.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: UserAccount making sure you follow the assignment guidelines:

**Testing concepts**. Your tests should cover the basic behavior of the concept but should also include some more interesting cases. Your tests should use the Deno testing framework and should be programmatic (that is, determining in the code whether they succeeded or failed, and not requiring a human to interpret console messages). They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Some more details about the test cases you should include:

- **Operational principle**. A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example.
- **Interesting scenarios**. Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors.
- **Number required**. For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios.
- **No state setup**. Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state.
- **Saving test execution output**. Save the test execution output by copy-pasting from the console to a markdown file.





# response:

# file: src/UserAccount/UserAccountConcept.test.ts

```typescript
import { assertEquals, assert, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAccountConcept from "./UserAccountConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("UserAccountConcept", async (t) => {
  const [db, client] = await testDb();
  const userAccount = new UserAccountConcept(db);

  let aliceId: ID; // To store Alice's ID for subsequent tests

  await t.step("Operational Principle: A user can register and then log in", async () => {
    // Step 1: Register a new user, fulfilling the first part of the principle.
    const registerInput = {
      email: "alice@example.com",
      password: "password123",
      displayName: "Alice",
    };
    console.log("Action: register", registerInput);
    const registerOutput = await userAccount.register(registerInput);
    console.log("Result:", registerOutput);

    assert(!("error" in registerOutput), "Registration should not produce an error");
    assertExists(registerOutput.user, "Registration should return a user ID");
    aliceId = registerOutput.user; // Save for later tests

    // Step 2: Log in with the same credentials, fulfilling the second part.
    const loginInput = {
      email: "alice@example.com",
      password: "password123",
    };
    console.log("\nAction: login", loginInput);
    const loginOutput = await userAccount.login(loginInput);
    console.log("Result:", loginOutput);

    assert(!("error" in loginOutput), "Login should not produce an error");
    assertEquals(loginOutput.user, aliceId, "Logged in user ID should match registered user ID");

    // Verification step using a query to confirm state
    const profile = await userAccount._getUserProfile({ user: aliceId });
    assertEquals(profile?.displayName, "Alice");
    assertEquals(profile?.email, "alice@example.com");
  });

  await t.step("Interesting Scenario 1: Attempt to register with a duplicate email", async () => {
    const registerInput = {
      email: "alice@example.com", // Same email as the user from the principle test
      password: "anotherPassword",
      displayName: "Bob",
    };
    console.log("\nAction: register (duplicate email)", registerInput);
    const registerOutput = await userAccount.register(registerInput);
    console.log("Result:", registerOutput);

    assert("error" in registerOutput, "Registration with duplicate email should produce an error");
    assertEquals(registerOutput.error, "Email already in use.");
  });

  await t.step("Interesting Scenario 2: Attempt to log in with an incorrect password", async () => {
    const loginInput = {
      email: "alice@example.com",
      password: "wrongPassword",
    };
    console.log("\nAction: login (incorrect password)", loginInput);
    const loginOutput = await userAccount.login(loginInput);
    console.log("Result:", loginOutput);

    assert("error" in loginOutput, "Login with incorrect password should produce an error");
    assertEquals(loginOutput.error, "Invalid credentials.");
  });

  await t.step("Interesting Scenario 3: Successfully update profile, then delete account", async () => {
    // Step 1: Update profile
    const updateInput = { user: aliceId, newDisplayName: "Alice Smith" };
    console.log("\nAction: updateProfile", updateInput);
    const updateOutput = await userAccount.updateProfile(updateInput);
    console.log("Result:", updateOutput);

    assert(!("error" in updateOutput), "Profile update should be successful");

    // Verify the update with a query
    const updatedProfile = await userAccount._getUserProfile({ user: aliceId });
    assertEquals(updatedProfile?.displayName, "Alice Smith", "Display name should be updated");

    // Step 2: Delete account
    const deleteInput = { user: aliceId };
    console.log("\nAction: deleteAccount", deleteInput);
    const deleteOutput = await userAccount.deleteAccount(deleteInput);
    console.log("Result:", deleteOutput);

    assert(!("error" in deleteOutput), "Account deletion should be successful");

    // Verify deletion by trying to fetch the profile
    const deletedProfile = await userAccount._getUserProfile({ user: aliceId });
    assertEquals(deletedProfile, null, "Deleted user's profile should not be found");

    // Verify deletion by trying to log in
    const loginInput = { email: "alice@example.com", password: "password123" };
    const loginOutput = await userAccount.login(loginInput);
    assert("error" in loginOutput, "Login after account deletion should fail");
  });

  await t.step("Interesting Scenario 4: Attempt to update or delete a non-existent user", async () => {
    const fakeUserId = "user:fake" as ID;

    // Step 1: Attempt to update
    const updateInput = { user: fakeUserId, newDisplayName: "Ghost" };
    console.log("\nAction: updateProfile (non-existent user)", updateInput);
    const updateOutput = await userAccount.updateProfile(updateInput);
    console.log("Result:", updateOutput);

    assert("error" in updateOutput, "Update on non-existent user should fail");
    assertEquals(updateOutput.error, "User not found.");

    // Step 2: Attempt to delete
    const deleteInput = { user: fakeUserId };
    console.log("\nAction: deleteAccount (non-existent user)", deleteInput);
    const deleteOutput = await userAccount.deleteAccount(deleteInput);
    console.log("Result:", deleteOutput);

    assert("error" in deleteOutput, "Delete on non-existent user should fail");
    assertEquals(deleteOutput.error, "User not found.");
  });

  await client.close();
});
```

# trace:

This trace demonstrates the operational principle: "a user must register and log in to be identified".

1.  **Register a new user**: We begin by calling the `register` action with a new user's details (email, password, display name). This creates the user within the concept's state.
    *   **Action**: `UserAccount.register({ email: "alice@example.com", password: "password123", displayName: "Alice" })`
    *   **Expected State Change**: A new `User` document is created in the database with the provided email, a hashed version of the password, and the display name.
    *   **Expected Result**: The action returns an object containing the unique ID of the newly created user, e.g., `{ user: "user:123abc..." }`.

2.  **Log in as the new user**: Using the same credentials, we call the `login` action to verify the user's identity against the stored state.
    *   **Action**: `UserAccount.login({ email: "alice@example.com", password: "password123" })`
    *   **Expected State Change**: None. This action only reads the state to verify credentials.
    *   **Expected Result**: The action returns an object containing the user's ID, which should match the ID returned from the `register` step, confirming the user has been successfully identified, e.g., `{ user: "user:123abc..." }`.

3.  **(Optional Verification)** **Query the user's profile**: We can use the `_getUserProfile` query with the user's ID to confirm their data is correctly stored and retrievable.
    *   **Query**: `UserAccount._getUserProfile({ user: "user:123abc..." })`
    *   **Expected Result**: Returns the user's public data, e.g., `{ displayName: "Alice", email: "alice@example.com" }`.

This sequence successfully demonstrates that a user can be created and then subsequently identified by the system, fulfilling the core purpose and principle of the `UserAccount` concept.