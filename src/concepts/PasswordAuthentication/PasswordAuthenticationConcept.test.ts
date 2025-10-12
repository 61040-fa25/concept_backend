import { testDb } from "@utils/database.ts";
import { assertEquals, assertObjectMatch } from "jsr:@std/assert";
import PasswordAuthenticationConcept from "./PasswordAuthenticationConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("PasswordAuthenticationConcept Tests", async (test) => {
  const [db, client] = await testDb();
  const concept = new PasswordAuthenticationConcept(db);

  Deno.test(
    "Operational Principle: User registration and successful authentication",
    async () => {
      console.log("\n--- Trace: Operational Principle ---");

      // 1. Register a user
      console.log(
        "Action: register (username: 'alice', password: 'password123')",
      );
      const registerResult = await concept.register({
        username: "alice",
        password: "password123",
      });
      console.log("Result:", registerResult);
      assertObjectMatch(registerResult, { user: {} as ID }); // Expecting a user ID
      const aliceId = (registerResult as { user: ID }).user;
      console.log(`Registered user Alice with ID: ${aliceId}`);

      // 2. Authenticate with the same username and password
      console.log(
        "Action: authenticate (username: 'alice', password: 'password123')",
      );
      const authResult = await concept.authenticate({
        username: "alice",
        password: "password123",
      });
      console.log("Result:", authResult);
      assertObjectMatch(authResult, { user: aliceId }); // Expecting Alice's ID
      const authenticatedUserId = (authResult as { user: ID }).user;
      assertEquals(authenticatedUserId, aliceId);
      console.log(
        `Successfully authenticated Alice. User ID: ${authenticatedUserId}`,
      );

      // Verify the principle: Alice can authenticate and is treated as the same user.
      const fetchedUser = await concept._getUserById(aliceId);
      assertEquals(fetchedUser?.username, "alice");
      assertEquals(fetchedUser?.password, "password123"); // (Remember, plain text for this example)
    },
  );

  Deno.test("Scenario 1: Registering with an existing username should fail", async () => {
    console.log("\n--- Trace: Scenario 1 ---");

    // 1. Register Bob
    console.log("Action: register (username: 'bob', password: 'pass')");
    const registerBobResult = await concept.register({
      username: "bob",
      password: "pass",
    });
    console.log("Result:", registerBobResult);
    assertObjectMatch(registerBobResult, { user: {} as ID });
    const bobId = (registerBobResult as { user: ID }).user;
    console.log(`Registered user Bob with ID: ${bobId}`);

    // 2. Attempt to register another user with the same username "bob"
    console.log(
      "Action: register (username: 'bob', password: 'differentpass')",
    );
    const duplicateRegisterResult = await concept.register({
      username: "bob",
      password: "differentpass",
    });
    console.log("Result:", duplicateRegisterResult);

    // Expect an error
    assertObjectMatch(duplicateRegisterResult, {
      error: "Username already taken.",
    });
    console.log(
      "Attempt to register 'bob' again failed as expected: Username already taken.",
    );

    // Ensure only one "bob" exists in the database
    const users = await concept._getAllUsers();
    const bobs = users.filter((u) => u.username === "bob");
    assertEquals(bobs.length, 1);
  });

  Deno.test(
    "Scenario 2: Authenticating with an incorrect password should fail",
    async () => {
      console.log("\n--- Trace: Scenario 2 ---");

      // 1. Register Charlie
      console.log(
        "Action: register (username: 'charlie', password: 'charliepass')",
      );
      const registerCharlieResult = await concept.register({
        username: "charlie",
        password: "charliepass",
      });
      console.log("Result:", registerCharlieResult);
      assertObjectMatch(registerCharlieResult, { user: {} as ID });
      const charlieId = (registerCharlieResult as { user: ID }).user;
      console.log(`Registered user Charlie with ID: ${charlieId}`);

      // 2. Attempt to authenticate with correct username but wrong password
      console.log(
        "Action: authenticate (username: 'charlie', password: 'wrongpass')",
      );
      const wrongPasswordAuthResult = await concept.authenticate({
        username: "charlie",
        password: "wrongpass",
      });
      console.log("Result:", wrongPasswordAuthResult);

      // Expect an error
      assertObjectMatch(wrongPasswordAuthResult, {
        error: "Invalid username or password.",
      });
      console.log(
        "Attempt to authenticate Charlie with wrong password failed as expected: Invalid username or password.",
      );

      // 3. Authenticate with correct password to ensure the user still exists and is correct
      console.log(
        "Action: authenticate (username: 'charlie', password: 'charliepass')",
      );
      const correctAuthResult = await concept.authenticate({
        username: "charlie",
        password: "charliepass",
      });
      console.log("Result:", correctAuthResult);
      assertObjectMatch(correctAuthResult, { user: charlieId });
      console.log(
        "Successfully authenticated Charlie with correct password to confirm user integrity.",
      );
    },
  );

  Deno.test(
    "Scenario 3: Authenticating with a non-existent username should fail",
    async () => {
      console.log("\n--- Trace: Scenario 3 ---");

      // 1. Attempt to authenticate with a username that was never registered
      console.log(
        "Action: authenticate (username: 'david', password: 'anypass')",
      );
      const nonExistentAuthResult = await concept.authenticate({
        username: "david",
        password: "anypass",
      });
      console.log("Result:", nonExistentAuthResult);

      // Expect an error
      assertObjectMatch(nonExistentAuthResult, {
        error: "Invalid username or password.",
      });
      console.log(
        "Attempt to authenticate non-existent user 'david' failed as expected: Invalid username or password.",
      );
    },
  );

  Deno.test(
    "Scenario 4: Multiple users can register and authenticate independently",
    async () => {
      console.log("\n--- Trace: Scenario 4 ---");

      // 1. Register User X
      console.log("Action: register (username: 'userX', password: 'xpass')");
      const registerXResult = await concept.register({
        username: "userX",
        password: "xpass",
      });
      console.log("Result:", registerXResult);
      assertObjectMatch(registerXResult, { user: {} as ID });
      const userXId = (registerXResult as { user: ID }).user;
      console.log(`Registered user X with ID: ${userXId}`);

      // 2. Register User Y
      console.log("Action: register (username: 'userY', password: 'ypass')");
      const registerYResult = await concept.register({
        username: "userY",
        password: "ypass",
      });
      console.log("Result:", registerYResult);
      assertObjectMatch(registerYResult, { user: {} as ID });
      const userYId = (registerYResult as { user: ID }).user;
      console.log(`Registered user Y with ID: ${userYId}`);

      // 3. Authenticate User X
      console.log(
        "Action: authenticate (username: 'userX', password: 'xpass')",
      );
      const authXResult = await concept.authenticate({
        username: "userX",
        password: "xpass",
      });
      console.log("Result:", authXResult);
      assertObjectMatch(authXResult, { user: userXId });
      console.log(
        `Successfully authenticated User X. User ID: ${userXId}`,
      );

      // 4. Authenticate User Y
      console.log(
        "Action: authenticate (username: 'userY', password: 'ypass')",
      );
      const authYResult = await concept.authenticate({
        username: "userY",
        password: "ypass",
      });
      console.log("Result:", authYResult);
      assertObjectMatch(authYResult, { user: userYId });
      console.log(
        `Successfully authenticated User Y. User ID: ${userYId}`,
      );

      // Ensure that authentication of one user doesn't affect another
      const allUsers = await concept._getAllUsers();
      assertEquals(allUsers.length, 2); // Assuming other tests cleared the database or this is run in isolation.
    },
  );

  // Close the database client after all tests in this file are done
  await client.close();
});
