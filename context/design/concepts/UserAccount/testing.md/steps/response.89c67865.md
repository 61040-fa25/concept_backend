---
timestamp: 'Wed Oct 29 2025 11:38:02 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251029_113802.eeb0727f.md]]'
content_id: 89c67865e930e53ce146d6e38f5f3e22e726a0304e902b50919e16244efb0c0a
---

# response:

```typescript
// file: src/UserAccount/UserAccountConcept.test.ts

import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import UserAccountConcept from "./UserAccountConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("UserAccount Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const userAccount = new UserAccountConcept(db);

  await t.step(
    "Operational Principle: A user can register and then log in",
    async () => {
      console.log(
        "\n--- Testing Operational Principle: Register and Login ---",
      );
      const registerInput = {
        email: "alice@example.com",
        password: "password123",
        displayName: "Alice",
      };
      console.log("Action: register, Input:", registerInput);
      const registerResult = await userAccount.register(registerInput);
      console.log("Output:", registerResult);

      assertExists(registerResult.user);
      assertNotEquals(registerResult.error, "Email already in use.");
      const userId = registerResult.user;

      const loginInput = {
        email: "alice@example.com",
        password: "password123",
      };
      console.log("\nAction: login, Input:", loginInput);
      const loginResult = await userAccount.login(loginInput);
      console.log("Output:", loginResult);

      assertExists(loginResult.user);
      assertEquals(loginResult.user, userId);
    },
  );

  await t.step(
    "Interesting Scenario 1: Cannot register with a duplicate email",
    async () => {
      console.log(
        "\n--- Testing Scenario: Duplicate Email Registration ---",
      );
      const registerInput = {
        email: "bob@example.com",
        password: "password123",
        displayName: "Bob",
      };
      console.log("Action: register (first time), Input:", registerInput);
      const firstRegisterResult = await userAccount.register(registerInput);
      console.log("Output:", firstRegisterResult);
      assertExists(firstRegisterResult.user);

      const duplicateRegisterInput = {
        email: "bob@example.com",
        password: "anotherpassword",
        displayName: "Not Bob",
      };
      console.log(
        "\nAction: register (second time with same email), Input:",
        duplicateRegisterInput,
      );
      const secondRegisterResult = await userAccount.register(
        duplicateRegisterInput,
      );
      console.log("Output:", secondRegisterResult);
      assertEquals(secondRegisterResult.error, "Email already in use.");
      assertEquals(secondRegisterResult.user, undefined);
    },
  );

  await t.step(
    "Interesting Scenario 2: Login fails with incorrect credentials",
    async () => {
      console.log("\n--- Testing Scenario: Incorrect Login Credentials ---");
      const registerInput = {
        email: "carol@example.com",
        password: "password123",
        displayName: "Carol",
      };
      console.log("Action: register, Input:", registerInput);
      await userAccount.register(registerInput);

      const wrongPasswordInput = {
        email: "carol@example.com",
        password: "wrongpassword",
      };
      console.log(
        "\nAction: login (with wrong password), Input:",
        wrongPasswordInput,
      );
      const loginResult1 = await userAccount.login(wrongPasswordInput);
      console.log("Output:", loginResult1);
      assertEquals(loginResult1.error, "Invalid credentials.");

      const wrongEmailInput = {
        email: "notcarol@example.com",
        password: "password123",
      };
      console.log(
        "\nAction: login (with wrong email), Input:",
        wrongEmailInput,
      );
      const loginResult2 = await userAccount.login(wrongEmailInput);
      console.log("Output:", loginResult2);
      assertEquals(loginResult2.error, "Invalid credentials.");
    },
  );

  await t.step(
    "Interesting Scenario 3: User can update their profile and then delete their account",
    async () => {
      console.log("\n--- Testing Scenario: Update Profile and Delete ---");
      const registerInput = {
        email: "dave@example.com",
        password: "password123",
        displayName: "Dave",
      };
      console.log("Action: register, Input:", registerInput);
      const registerResult = await userAccount.register(registerInput);
      const userId = registerResult.user!;

      // Verify initial profile
      let profile = await userAccount._getUserProfile({ user: userId });
      assertEquals(profile?.displayName, "Dave");

      const updateInput = { user: userId, newDisplayName: "David" };
      console.log("\nAction: updateProfile, Input:", updateInput);
      const updateResult = await userAccount.updateProfile(updateInput);
      console.log("Output:", updateResult);
      assertEquals(updateResult, {});

      // Verify updated profile
      profile = await userAccount._getUserProfile({ user: userId });
      console.log("\nQuery: _getUserProfile after update, Output:", profile);
      assertEquals(profile?.displayName, "David");

      const deleteInput = { user: userId };
      console.log("\nAction: deleteAccount, Input:", deleteInput);
      const deleteResult = await userAccount.deleteAccount(deleteInput);
      console.log("Output:", deleteResult);
      assertEquals(deleteResult, {});

      // Verify user is gone by trying to log in
      const loginInput = {
        email: "dave@example.com",
        password: "password123",
      };
      console.log(
        "\nAction: login (after deletion), Input:",
        loginInput,
      );
      const loginResult = await userAccount.login(loginInput);
      console.log("Output:", loginResult);
      assertEquals(loginResult.error, "Invalid credentials.");
    },
  );

  await t.step(
    "Interesting Scenario 4: Operations on a non-existent user fail gracefully",
    async () => {
      console.log("\n--- Testing Scenario: Non-existent User Operations ---");
      const fakeUserId = "user:fake_id" as ID;

      const updateInput = {
        user: fakeUserId,
        newDisplayName: "Ghost",
      };
      console.log("Action: updateProfile, Input:", updateInput);
      const updateResult = await userAccount.updateProfile(updateInput);
      console.log("Output:", updateResult);
      assertEquals(updateResult.error, "User not found.");

      const deleteInput = { user: fakeUserId };
      console.log("\nAction: deleteAccount, Input:", deleteInput);
      const deleteResult = await userAccount.deleteAccount(deleteInput);
      console.log("Output:", deleteResult);
      assertEquals(deleteResult.error, "User not found.");
    },
  );

  await client.close();
});
```
