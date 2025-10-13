---
timestamp: 'Mon Oct 13 2025 01:24:07 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_012407.847e1989.md]]'
content_id: cb6851da09fd4ba7ffc7a56c399227c8c85b4e7d1b176367ac89e1795cac01e4
---

# response:

```typescript
// file: src/Friending/FriendingConcept.test.ts

import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID, Empty } from "@utils/types.ts";
import FriendingConcept from "./FriendingConcept.ts";

// Define some user IDs for testing
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userCarol = "user:Carol" as ID;
const userDavid = "user:David" as ID;
const userEve = "user:Eve" as ID;
const invalidUser = "" as ID; // For testing invalid ID inputs

Deno.test("Friending Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const friendingConcept = new FriendingConcept(db);

  try {
    // --- Trace: Operational Principle ---
    await t.step("Operational Principle: Alice and Bob become friends", async () => {
      console.log("\n--- Operational Principle: Alice and Bob become friends ---");

      // 1. Initialize Alice's friend list
      console.log(`Action: initializeFriendList({ user: ${userAlice} })`);
      let result: Empty | { error: string } = await friendingConcept.initializeFriendList({ user: userAlice });
      assertEquals(result, {}, "Alice's friend list should be initialized successfully.");
      console.log("Output:", result);

      let aliceState = await friendingConcept._getFriendState({ user: userAlice });
      assertEquals((aliceState as any[])[0]?.friends.length, 0, "Alice should have no friends initially.");
      assertEquals((aliceState as any[])[0]?.sentRequests.length, 0, "Alice should have no sent requests initially.");
      assertEquals((aliceState as any[])[0]?.receivedRequests.length, 0, "Alice should have no received requests initially.");

      // 2. Initialize Bob's friend list
      console.log(`Action: initializeFriendList({ user: ${userBob} })`);
      result = await friendingConcept.initializeFriendList({ user: userBob });
      assertEquals(result, {}, "Bob's friend list should be initialized successfully.");
      console.log("Output:", result);

      let bobState = await friendingConcept._getFriendState({ user: userBob });
      assertEquals((bobState as any[])[0]?.friends.length, 0, "Bob should have no friends initially.");
      assertEquals((bobState as any[])[0]?.sentRequests.length, 0, "Bob should have no sent requests initially.");
      assertEquals((bobState as any[])[0]?.receivedRequests.length, 0, "Bob should have no received requests initially.");

      // 3. Alice sends a request to Bob
      console.log(`Action: sendRequest({ sender: ${userAlice}, receiver: ${userBob} })`);
      result = await friendingConcept.sendRequest({ sender: userAlice, receiver: userBob });
      assertEquals(result, {}, "Alice should successfully send a friend request to Bob.");
      console.log("Output:", result);

      aliceState = await friendingConcept._getFriendState({ user: userAlice });
      assertEquals((aliceState as any[])[0]?.sentRequests, [userBob], "Alice should have Bob in sent requests.");
      assertEquals((aliceState as any[])[0]?.receivedRequests.length, 0, "Alice should have no received requests.");

      bobState = await friendingConcept._getFriendState({ user: userBob });
      assertEquals((bobState as any[])[0]?.receivedRequests, [userAlice], "Bob should have Alice in received requests.");
      assertEquals((bobState as any[])[0]?.sentRequests.length, 0, "Bob should have no sent requests.");
      assertEquals((bobState as any[])[0]?.friends.length, 0, "Bob should have no friends yet.");

      // 4. Bob accepts the request from Alice
      console.log(`Action: acceptRequest({ sender: ${userAlice}, receiver: ${userBob} })`);
      result = await friendingConcept.acceptRequest({ sender: userAlice, receiver: userBob });
      assertEquals(result, {}, "Bob should successfully accept Alice's friend request.");
      console.log("Output:", result);

      aliceState = await friendingConcept._getFriendState({ user: userAlice });
      assertEquals((aliceState as any[])[0]?.friends, [userBob], "Alice should have Bob as a friend.");
      assertEquals((aliceState as any[])[0]?.sentRequests.length, 0, "Alice's sent requests should be empty.");
      assertEquals((aliceState as any[])[0]?.receivedRequests.length, 0, "Alice's received requests should be empty.");


      bobState = await friendingConcept._getFriendState({ user: userBob });
      assertEquals((bobState as any[])[0]?.friends, [userAlice], "Bob should have Alice as a friend.");
      assertEquals((bobState as any[])[0]?.receivedRequests.length, 0, "Bob's received requests should be empty.");
      assertEquals((bobState as any[])[0]?.sentRequests.length, 0, "Bob's sent requests should be empty.");

      const areFriendsResult = await friendingConcept._areFriends({ user1: userAlice, user2: userBob });
      assertEquals((areFriendsResult as any[])[0]?.areFriends, true, "Alice and Bob should be friends.");
    });

    // --- Interesting Scenarios ---

    await t.step("Scenario: Initialization errors and invalid inputs", async () => {
      console.log("\n--- Scenario: Initialization errors and invalid inputs ---");

      // Try to initialize an already initialized user
      console.log(`Action: initializeFriendList({ user: ${userAlice} }) (duplicate)`);
      let result: Empty | { error: string } = await friendingConcept.initializeFriendList({ user: userAlice });
      assertEquals(result, { error: `Friend state of user ${userAlice} has already been initialized` },
        "Should return error for already initialized user.");
      console.log("Output:", result);

      // Try to initialize with an invalid user ID
      console.log(`Action: initializeFriendList({ user: "" as ID }) (invalid)`);
      result = await friendingConcept.initializeFriendList({ user: invalidUser });
      assertEquals(result, { error: "User ID must be provided." }, "Should return error for empty user ID.");
      console.log("Output:", result);
    });

    await t.step("Scenario: Send Request errors", async () => {
      console.log("\n--- Scenario: Send Request errors ---");

      // Initialize Carol for further tests
      await friendingConcept.initializeFriendList({ user: userCarol });
      let result: Empty | { error: string };

      // Alice sends request to herself
      console.log(`Action: sendRequest({ sender: ${userAlice}, receiver: ${userAlice} })`);
      result = await friendingConcept.sendRequest({ sender: userAlice, receiver: userAlice });
      assertEquals(result, { error: "Cannot send a friend request to yourself." }, "Should prevent sending request to self.");
      console.log("Output:", result);

      // Alice sends request to an uninitialized user (David)
      console.log(`Action: sendRequest({ sender: ${userAlice}, receiver: ${userDavid} }) (uninitialized)`);
      result = await friendingConcept.sendRequest({ sender: userAlice, receiver: userDavid });
      assertEquals(result, { error: `Receiver (ID: ${userDavid}) does not exist or is not initialized in Friending concept.` }, "Should prevent sending request to uninitialized user.");
      console.log("Output:", result);

      // Alice sends request to Bob (already friends)
      console.log(`Action: sendRequest({ sender: ${userAlice}, receiver: ${userBob} }) (already friends)`);
      result = await friendingConcept.sendRequest({ sender: userAlice, receiver: userBob });
      assertEquals(result, { error: `Receiver (ID: ${userBob}) is already a friend of sender (ID: ${userAlice}).` }, "Should prevent sending request to existing friend.");
      console.log("Output:", result);

      // Initialize Eve for testing
      await friendingConcept.initializeFriendList({ user: userEve });
      // Alice sends request to Eve
      await friendingConcept.sendRequest({ sender: userAlice, receiver: userEve });
      // Alice sends duplicate request to Eve
      console.log(`Action: sendRequest({ sender: ${userAlice}, receiver: ${userEve} }) (duplicate)`);
      result = await friendingConcept.sendRequest({ sender: userAlice, receiver: userEve });
      assertEquals(result, { error: `Friend request already sent from sender (ID: ${userAlice}) to receiver (ID: ${userEve}).` }, "Should prevent duplicate friend request.");
      console.log("Output:", result);

      // Invalid sender/receiver IDs
      console.log(`Action: sendRequest({ sender: "" as ID, receiver: ${userBob} }) (invalid sender)`);
      result = await friendingConcept.sendRequest({ sender: invalidUser, receiver: userBob });
      assertEquals(result, { error: "Sender and receiver IDs must be provided." }, "Should return error for empty sender ID.");
      console.log("Output:", result);
    });

    await t.step("Scenario: Accept Request errors", async () => {
      console.log("\n--- Scenario: Accept Request errors ---");

      // Alice sends request to Carol (from previous scenario, still pending)
      let result: Empty | { error: string };

      // Carol accepts request from herself
      console.log(`Action: acceptRequest({ sender: ${userCarol}, receiver: ${userCarol} })`);
      result = await friendingConcept.acceptRequest({ sender: userCarol, receiver: userCarol });
      assertEquals(result, { error: "Cannot accept a friend request from yourself." }, "Should prevent accepting request from self.");
      console.log("Output:", result);

      // Bob accepts request from David (uninitialized sender)
      console.log(`Action: acceptRequest({ sender: ${userDavid}, receiver: ${userBob} }) (uninitialized sender)`);
      result = await friendingConcept.acceptRequest({ sender: userDavid, receiver: userBob });
      assertEquals(result, { error: `Sender (ID: ${userDavid}) does not exist or is not initialized in Friending concept.` }, "Should prevent accepting request from uninitialized sender.");
      console.log("Output:", result);

      // Bob accepts request from Carol (no request from Carol to Bob)
      console.log(`Action: acceptRequest({ sender: ${userCarol}, receiver: ${userBob} }) (no request from Carol to Bob)`);
      result = await friendingConcept.acceptRequest({ sender: userCarol, receiver: userBob });
      assertEquals(result, { error: `No friend request from sender (ID: ${userCarol}) found in receiver's (ID: ${userBob}) received requests.` }, "Should prevent accepting a non-existent request.");
      console.log("Output:", result);

      // Alice tries to accept Carol's request (which doesn't exist)
      console.log(`Action: acceptRequest({ sender: ${userCarol}, receiver: ${userAlice} }) (no request from Carol to Alice)`);
      result = await friendingConcept.acceptRequest({ sender: userCarol, receiver: userAlice });
      assertEquals(result, { error: `No friend request from sender (ID: ${userCarol}) found in receiver's (ID: ${userAlice}) received requests.` }, "Alice cannot accept a request Carol didn't send.");
      console.log("Output:", result);

      // Invalid sender/receiver IDs
      console.log(`Action: acceptRequest({ sender: "" as ID, receiver: ${userAlice} }) (invalid sender)`);
      result = await friendingConcept.acceptRequest({ sender: invalidUser, receiver: userAlice });
      assertEquals(result, { error: "Sender and receiver IDs must be provided." }, "Should return error for empty sender ID.");
      console.log("Output:", result);
    });

    await t.step("Scenario: Remove Friend errors", async () => {
      console.log("\n--- Scenario: Remove Friend errors ---");
      let result: Empty | { error: string };

      // Alice tries to remove herself
      console.log(`Action: removeFriend({ user: ${userAlice}, to_be_removed_friend: ${userAlice} })`);
      result = await friendingConcept.removeFriend({ user: userAlice, to_be_removed_friend: userAlice });
      assertEquals(result, { error: "Cannot remove yourself as a friend." }, "Should prevent removing self as friend.");
      console.log("Output:", result);

      // Alice tries to remove Carol (not friends, but Alice sent request to Carol)
      console.log(`Action: removeFriend({ user: ${userAlice}, to_be_removed_friend: ${userCarol} }) (not friends)`);
      result = await friendingConcept.removeFriend({ user: userAlice, to_be_removed_friend: userCarol });
      assertEquals(result, { error: `User (ID: ${userCarol}) is not a friend of user (ID: ${userAlice}).` }, "Should prevent removing non-friend.");
      console.log("Output:", result);

      // Alice tries to remove David (uninitialized)
      console.log(`Action: removeFriend({ user: ${userAlice}, to_be_removed_friend: ${userDavid} }) (uninitialized)`);
      result = await friendingConcept.removeFriend({ sender: userAlice, receiver: userDavid }); // Note: Using sender/receiver for removeFriend params for consistency in this test, though it's 'user'/'to_be_removed_friend'
      assertEquals(result, { error: `Friend (ID: ${userDavid}) does not exist or is not initialized in Friending concept.` }, "Should prevent removing uninitialized user.");
      console.log("Output:", result);

      // Invalid user/friend IDs
      console.log(`Action: removeFriend({ user: "" as ID, to_be_removed_friend: ${userBob} }) (invalid user)`);
      result = await friendingConcept.removeFriend({ user: invalidUser, to_be_removed_friend: userBob });
      assertEquals(result, { error: "User and friend IDs must be provided." }, "Should return error for empty user ID.");
      console.log("Output:", result);
    });

    await t.step("Scenario: Complex flow with multiple users and removal", async () => {
      console.log("\n--- Scenario: Complex flow with multiple users and removal ---");

      // Initial states:
      // Alice and Bob are friends (from principle test)
      // Alice has a sent request to Carol (from previous scenario)
      // Alice has a sent request to Eve (from previous scenario)

      // Initialize David as he wasn't fully initialized earlier
      await friendingConcept.initializeFriendList({ user: userDavid });

      // Bob sends request to Carol
      console.log(`Action: sendRequest({ sender: ${userBob}, receiver: ${userCarol} })`);
      let result: Empty | { error: string } = await friendingConcept.sendRequest({ sender: userBob, receiver: userCarol });
      assertEquals(result, {}, "Bob should successfully send request to Carol.");
      console.log("Output:", result);

      let bobState = await friendingConcept._getFriendState({ user: userBob });
      assertEquals((bobState as any[])[0]?.sentRequests, [userCarol], "Bob should have sent request to Carol.");
      let carolState = await friendingConcept._getFriendState({ user: userCarol });
      assertEquals((carolState as any[])[0]?.receivedRequests.sort(), [userAlice, userBob].sort(), "Carol should have received requests from Alice and Bob.");

      // Carol accepts Bob's request
      console.log(`Action: acceptRequest({ sender: ${userBob}, receiver: ${userCarol} })`);
      result = await friendingConcept.acceptRequest({ sender: userBob, receiver: userCarol });
      assertEquals(result, {}, "Carol should successfully accept Bob's request.");
      console.log("Output:", result);

      bobState = await friendingConcept._getFriendState({ user: userBob });
      assertEquals((bobState as any[])[0]?.friends.sort(), [userAlice, userCarol].sort(), "Bob should be friends with Alice and Carol.");
      assertEquals((bobState as any[])[0]?.sentRequests.length, 0, "Bob's sent requests should be empty.");

      carolState = await friendingConcept._getFriendState({ user: userCarol });
      assertEquals((carolState as any[])[0]?.friends, [userBob], "Carol should be friends with Bob.");
      assertEquals((carolState as any[])[0]?.receivedRequests, [userAlice], "Carol should still have received request from Alice.");

      // Alice removes Bob as a friend
      console.log(`Action: removeFriend({ user: ${userAlice}, to_be_removed_friend: ${userBob} })`);
      result = await friendingConcept.removeFriend({ user: userAlice, to_be_removed_friend: userBob });
      assertEquals(result, {}, "Alice should successfully remove Bob as a friend.");
      console.log("Output:", result);

      let aliceState = await friendingConcept._getFriendState({ user: userAlice });
      assertEquals((aliceState as any[])[0]?.friends.length, 0, "Alice should no longer have any friends.");

      bobState = await friendingConcept._getFriendState({ user: userBob });
      assertEquals((bobState as any[])[0]?.friends, [userCarol], "Bob should now only be friends with Carol.");

      // Bob sends request to Alice again (after removal)
      console.log(`Action: sendRequest({ sender: ${userBob}, receiver: ${userAlice} }) (re-request after removal)`);
      result = await friendingConcept.sendRequest({ sender: userBob, receiver: userAlice });
      assertEquals(result, {}, "Bob should successfully send request to Alice again.");
      console.log("Output:", result);

      aliceState = await friendingConcept._getFriendState({ user: userAlice });
      assertEquals((aliceState as any[])[0]?.receivedRequests, [userBob], "Alice should have received request from Bob again.");

      bobState = await friendingConcept._getFriendState({ user: userBob });
      assertEquals((bobState as any[])[0]?.sentRequests, [userAlice], "Bob should have sent request to Alice.");
    });

    await t.step("Query: Check friend status and state", async () => {
      console.log("\n--- Query: Check friend status and state ---");

      // Alice and Bob are not friends at this point, but Bob has sent a request to Alice.
      let areFriendsResult = await friendingConcept._areFriends({ user1: userAlice, user2: userBob });
      assertEquals((areFriendsResult as any[])[0]?.areFriends, false, "Alice and Bob should not be friends after removal.");
      console.log(`Query: _areFriends(${userAlice}, ${userBob}) -> ${JSON.stringify(areFriendsResult)}`);

      // Bob and Carol are friends.
      areFriendsResult = await friendingConcept._areFriends({ user1: userBob, user2: userCarol });
      assertEquals((areFriendsResult as any[])[0]?.areFriends, true, "Bob and Carol should be friends.");
      console.log(`Query: _areFriends(${userBob}, ${userCarol}) -> ${JSON.stringify(areFriendsResult)}`);

      // Alice and Carol are not friends, Alice has a pending request to Carol.
      areFriendsResult = await friendingConcept._areFriends({ user1: userAlice, user2: userCarol });
      assertEquals((areFriendsResult as any[])[0]?.areFriends, false, "Alice and Carol should not be friends (pending request doesn't mean friendship).");
      console.log(`Query: _areFriends(${userAlice}, ${userCarol}) -> ${JSON.stringify(areFriendsResult)}`);

      // Query uninitialized users
      let errorResult = await friendingConcept._areFriends({ user1: userDavid, user2: userEve }); // David initialized, Eve might not be depending on test order
      assertEquals(errorResult, { error: `User (ID: ${userDavid}) does not exist or is not initialized in Friending concept.` }, "Query should return error for uninitialized user.");
      console.log(`Query: _areFriends(${userDavid}, ${userEve}) -> `, errorResult);

      await friendingConcept.initializeFriendList({ user: userEve }); // Ensure Eve is initialized for subsequent checks.
      errorResult = await friendingConcept._areFriends({ user1: userAlice, user2: invalidUser });
      assertEquals(errorResult, { error: "Both user1 and user2 IDs must be provided." }, "Query should return error for empty user ID.");
      console.log(`Query: _areFriends(${userAlice}, "${invalidUser}") -> `, errorResult);

      // Get friend state for uninitialized user
      errorResult = await friendingConcept._getFriendState({ user: "nonExistentUser" as ID });
      assertEquals(errorResult, { error: `User (ID: nonExistentUser) does not exist or is not initialized in Friending concept.` });
      console.log(`Query: _getFriendState(nonExistentUser) -> `, errorResult);
    });

  } finally {
    await client.close();
  }
});
```
