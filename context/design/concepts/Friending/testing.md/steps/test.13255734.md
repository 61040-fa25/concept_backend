---
timestamp: 'Mon Oct 13 2025 01:40:10 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_014010.bf565927.md]]'
content_id: 13255734a2f2bfaa440f78bea577897cbcf6b732a692f079c6c94e9740fe3e65
---

# test: Friending

## file: src/Friending/FriendingConcept.test.ts

```typescript
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
const userFrank = "user:Frank" as ID; // Added for more complex scenarios
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

      let [aliceStateInitial] = await friendingConcept._getFriendState({ user: userAlice }) as any[];
      assertEquals(aliceStateInitial.friends.length, 0, "Alice should have no friends initially.");
      assertEquals(aliceStateInitial.sentRequests.length, 0, "Alice should have no sent requests initially.");
      assertEquals(aliceStateInitial.receivedRequests.length, 0, "Alice should have no received requests initially.");

      // 2. Initialize Bob's friend list
      console.log(`Action: initializeFriendList({ user: ${userBob} })`);
      result = await friendingConcept.initializeFriendList({ user: userBob });
      assertEquals(result, {}, "Bob's friend list should be initialized successfully.");
      console.log("Output:", result);

      let [bobStateInitial] = await friendingConcept._getFriendState({ user: userBob }) as any[];
      assertEquals(bobStateInitial.friends.length, 0, "Bob should have no friends initially.");
      assertEquals(bobStateInitial.sentRequests.length, 0, "Bob should have no sent requests initially.");
      assertEquals(bobStateInitial.receivedRequests.length, 0, "Bob should have no received requests initially.");

      // 3. Alice sends a request to Bob
      console.log(`Action: sendRequest({ sender: ${userAlice}, receiver: ${userBob} })`);
      result = await friendingConcept.sendRequest({ sender: userAlice, receiver: userBob });
      assertEquals(result, {}, "Alice should successfully send a friend request to Bob.");
      console.log("Output:", result);

      let [aliceStateAfterSend] = await friendingConcept._getFriendState({ user: userAlice }) as any[];
      assertEquals(aliceStateAfterSend.sentRequests, [userBob], "Alice should have Bob in sent requests.");
      assertEquals(aliceStateAfterSend.receivedRequests.length, 0, "Alice should have no received requests.");
      assertEquals(aliceStateAfterSend.friends.length, 0, "Alice should have no friends.");


      let [bobStateAfterSend] = await friendingConcept._getFriendState({ user: userBob }) as any[];
      assertEquals(bobStateAfterSend.receivedRequests, [userAlice], "Bob should have Alice in received requests.");
      assertEquals(bobStateAfterSend.sentRequests.length, 0, "Bob should have no sent requests.");
      assertEquals(bobStateAfterSend.friends.length, 0, "Bob should have no friends yet.");

      let [areFriendsBeforeAccept] = await friendingConcept._areFriends({ user1: userAlice, user2: userBob }) as any[];
      assertEquals(areFriendsBeforeAccept.areFriends, false, "Alice and Bob should not be friends before acceptance.");

      // 4. Bob accepts the request from Alice
      console.log(`Action: acceptRequest({ sender: ${userAlice}, receiver: ${userBob} })`);
      result = await friendingConcept.acceptRequest({ sender: userAlice, receiver: userBob });
      assertEquals(result, {}, "Bob should successfully accept Alice's friend request.");
      console.log("Output:", result);

      let [aliceStateAfterAccept] = await friendingConcept._getFriendState({ user: userAlice }) as any[];
      assertEquals(aliceStateAfterAccept.friends, [userBob], "Alice should have Bob as a friend.");
      assertEquals(aliceStateAfterAccept.sentRequests.length, 0, "Alice's sent requests should be empty.");
      assertEquals(aliceStateAfterAccept.receivedRequests.length, 0, "Alice's received requests should be empty.");

      let [bobStateAfterAccept] = await friendingConcept._getFriendState({ user: userBob }) as any[];
      assertEquals(bobStateAfterAccept.friends, [userAlice], "Bob should have Alice as a friend.");
      assertEquals(bobStateAfterAccept.receivedRequests.length, 0, "Bob's received requests should be empty.");
      assertEquals(bobStateAfterAccept.sentRequests.length, 0, "Bob's sent requests should be empty.");

      let [areFriendsAfterAccept] = await friendingConcept._areFriends({ user1: userAlice, user2: userBob }) as any[];
      assertEquals(areFriendsAfterAccept.areFriends, true, "Alice and Bob should be friends after acceptance.");
    });

    // --- Interesting Scenarios ---

    await t.step("Scenario: Initialization errors and invalid inputs", async () => {
      console.log("\n--- Scenario: Initialization errors and invalid inputs ---");
      let result: Empty | { error: string };

      // Try to initialize an already initialized user
      console.log(`Action: initializeFriendList({ user: ${userAlice} }) (duplicate)`);
      result = await friendingConcept.initializeFriendList({ user: userAlice });
      assertEquals(result, { error: `Friend state of user ${userAlice} has already been initialized.` },
        "Should return error for already initialized user.");
      console.log("Output:", result);

      // Try to initialize with an invalid user ID
      console.log(`Action: initializeFriendList({ user: "${invalidUser}" }) (invalid)`);
      result = await friendingConcept.initializeFriendList({ user: invalidUser });
      assertEquals(result, { error: "User ID must be provided." }, "Should return error for empty user ID.");
      console.log("Output:", result);
    });

    await t.step("Scenario: Send Request errors", async () => {
      console.log("\n--- Scenario: Send Request errors ---");
      // Ensure Carol and Eve are initialized for these tests
      await friendingConcept.initializeFriendList({ user: userCarol });
      await friendingConcept.initializeFriendList({ user: userEve });
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

      // Alice sends request to Eve
      console.log(`Action: sendRequest({ sender: ${userAlice}, receiver: ${userEve} })`);
      await friendingConcept.sendRequest({ sender: userAlice, receiver: userEve });
      // Alice sends duplicate request to Eve
      console.log(`Action: sendRequest({ sender: ${userAlice}, receiver: ${userEve} }) (duplicate)`);
      result = await friendingConcept.sendRequest({ sender: userAlice, receiver: userEve });
      assertEquals(result, { error: `Friend request already sent from sender (ID: ${userAlice}) to receiver (ID: ${userEve}).` }, "Should prevent duplicate friend request.");
      console.log("Output:", result);

      // Invalid sender/receiver IDs
      console.log(`Action: sendRequest({ sender: "${invalidUser}", receiver: ${userBob} }) (invalid sender)`);
      result = await friendingConcept.sendRequest({ sender: invalidUser, receiver: userBob });
      assertEquals(result, { error: "Sender and receiver IDs must be provided." }, "Should return error for empty sender ID.");
      console.log("Output:", result);
    });

    await t.step("Scenario: Accept Request errors", async () => {
      console.log("\n--- Scenario: Accept Request errors ---");
      // Alice sent a request to Eve in the previous step, so it's pending.
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

      // Carol tries to accept Alice's request (Alice sent to Eve, not Carol)
      console.log(`Action: acceptRequest({ sender: ${userAlice}, receiver: ${userCarol} }) (no request from Alice to Carol)`);
      result = await friendingConcept.acceptRequest({ sender: userAlice, receiver: userCarol });
      assertEquals(result, { error: `No friend request from sender (ID: ${userAlice}) found in receiver's (ID: ${userCarol}) received requests.` }, "Carol cannot accept a request Alice didn't send to her.");
      console.log("Output:", result);

      // Invalid sender/receiver IDs
      console.log(`Action: acceptRequest({ sender: "${invalidUser}", receiver: ${userAlice} }) (invalid sender)`);
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

      // Alice tries to remove Carol (not friends)
      console.log(`Action: removeFriend({ user: ${userAlice}, to_be_removed_friend: ${userCarol} }) (not friends)`);
      result = await friendingConcept.removeFriend({ user: userAlice, to_be_removed_friend: userCarol });
      assertEquals(result, { error: `User (ID: ${userCarol}) is not a friend of user (ID: ${userAlice}).` }, "Should prevent removing non-friend.");
      console.log("Output:", result);

      // Alice tries to remove David (uninitialized)
      // Initialize David first to focus on the 'not friends' condition
      await friendingConcept.initializeFriendList({ user: userDavid });
      console.log(`Action: removeFriend({ user: ${userAlice}, to_be_removed_friend: ${userDavid} }) (initialized but not friends)`);
      result = await friendingConcept.removeFriend({ user: userAlice, to_be_removed_friend: userDavid });
      assertEquals(result, { error: `User (ID: ${userDavid}) is not a friend of user (ID: ${userAlice}).` }, "Should prevent removing non-friend (even if initialized).");
      console.log("Output:", result);

      // Invalid user/friend IDs
      console.log(`Action: removeFriend({ user: "${invalidUser}", to_be_removed_friend: ${userBob} }) (invalid user)`);
      result = await friendingConcept.removeFriend({ user: invalidUser, to_be_removed_friend: userBob });
      assertEquals(result, { error: "User and friend IDs must be provided." }, "Should return error for empty user ID.");
      console.log("Output:", result);
    });

    await t.step("Scenario: Complex flow with multiple users, requests, acceptances, and removal", async () => {
      console.log("\n--- Scenario: Complex flow with multiple users and removal ---");

      // Current states:
      // Alice and Bob are friends.
      // Alice sent a request to Eve (pending).
      // Carol, David, Frank are initialized, no current relationships.

      // Initialize Frank
      await friendingConcept.initializeFriendList({ user: userFrank });

      // Bob sends request to Carol
      console.log(`Action: sendRequest({ sender: ${userBob}, receiver: ${userCarol} })`);
      let result: Empty | { error: string } = await friendingConcept.sendRequest({ sender: userBob, receiver: userCarol });
      assertEquals(result, {}, "Bob should successfully send request to Carol.");
      console.log("Output:", result);

      let [bobStateAfterCarolRequest] = await friendingConcept._getFriendState({ user: userBob }) as any[];
      assertEquals(bobStateAfterCarolRequest.sentRequests, [userCarol], "Bob should have sent request to Carol.");
      let [carolStateAfterBobRequest] = await friendingConcept._getFriendState({ user: userCarol }) as any[];
      assertEquals(carolStateAfterBobRequest.receivedRequests, [userBob], "Carol should have received request from Bob.");

      // Carol accepts Bob's request
      console.log(`Action: acceptRequest({ sender: ${userBob}, receiver: ${userCarol} })`);
      result = await friendingConcept.acceptRequest({ sender: userBob, receiver: userCarol });
      assertEquals(result, {}, "Carol should successfully accept Bob's request.");
      console.log("Output:", result);

      let [bobStateAfterCarolAccept] = await friendingConcept._getFriendState({ user: userBob }) as any[];
      assertEquals(bobStateAfterCarolAccept.friends.sort(), [userAlice, userCarol].sort(), "Bob should be friends with Alice and Carol.");
      assertEquals(bobStateAfterCarolAccept.sentRequests.length, 0, "Bob's sent requests should be empty.");

      let [carolStateAfterBobAccept] = await friendingConcept._getFriendState({ user: userCarol }) as any[];
      assertEquals(carolStateAfterBobAccept.friends, [userBob], "Carol should be friends with Bob.");
      assertEquals(carolStateAfterBobAccept.receivedRequests.length, 0, "Carol's received requests should be empty.");

      // David sends request to Frank
      console.log(`Action: sendRequest({ sender: ${userDavid}, receiver: ${userFrank} })`);
      result = await friendingConcept.sendRequest({ sender: userDavid, receiver: userFrank });
      assertEquals(result, {}, "David should successfully send request to Frank.");
      console.log("Output:", result);

      // Alice removes Bob as a friend
      console.log(`Action: removeFriend({ user: ${userAlice}, to_be_removed_friend: ${userBob} })`);
      result = await friendingConcept.removeFriend({ user: userAlice, to_be_removed_friend: userBob });
      assertEquals(result, {}, "Alice should successfully remove Bob as a friend.");
      console.log("Output:", result);

      let [aliceStateAfterRemove] = await friendingConcept._getFriendState({ user: userAlice }) as any[];
      assertEquals(aliceStateAfterRemove.friends.length, 0, "Alice should no longer have Bob as a friend.");
      assertEquals(aliceStateAfterRemove.sentRequests, [userEve], "Alice still has pending request to Eve.");


      let [bobStateAfterAliceRemove] = await friendingConcept._getFriendState({ user: userBob }) as any[];
      assertEquals(bobStateAfterAliceRemove.friends, [userCarol], "Bob should now only be friends with Carol.");

      // Bob sends request to Alice again (after removal)
      console.log(`Action: sendRequest({ sender: ${userBob}, receiver: ${userAlice} }) (re-request after removal)`);
      result = await friendingConcept.sendRequest({ sender: userBob, receiver: userAlice });
      assertEquals(result, {}, "Bob should successfully send request to Alice again.");
      console.log("Output:", result);

      let [aliceStateAfterReRequest] = await friendingConcept._getFriendState({ user: userAlice }) as any[];
      assertEquals(aliceStateAfterReRequest.receivedRequests, [userBob], "Alice should have received request from Bob again.");

      let [bobStateAfterReRequest] = await friendingConcept._getFriendState({ user: userBob }) as any[];
      assertEquals(bobStateAfterReRequest.sentRequests, [userAlice], "Bob should have sent request to Alice.");
    });

    await t.step("Query: Check friend status and state", async () => {
      console.log("\n--- Query: Check friend status and state ---");
      let [resultAreFriends] = [];
      let errorResult: Empty | { error: string };

      // Alice and Bob are not friends at this point, but Bob has sent a request to Alice.
      [resultAreFriends] = await friendingConcept._areFriends({ user1: userAlice, user2: userBob }) as any[];
      assertEquals(resultAreFriends.areFriends, false, "Alice and Bob should not be friends after removal.");
      console.log(`Query: _areFriends(${userAlice}, ${userBob}) -> ${JSON.stringify(resultAreFriends)}`);

      // Bob and Carol are friends.
      [resultAreFriends] = await friendingConcept._areFriends({ user1: userBob, user2: userCarol }) as any[];
      assertEquals(resultAreFriends.areFriends, true, "Bob and Carol should be friends.");
      console.log(`Query: _areFriends(${userBob}, ${userCarol}) -> ${JSON.stringify(resultAreFriends)}`);

      // Alice and Carol are not friends.
      [resultAreFriends] = await friendingConcept._areFriends({ user1: userAlice, user2: userCarol }) as any[];
      assertEquals(resultAreFriends.areFriends, false, "Alice and Carol should not be friends.");
      console.log(`Query: _areFriends(${userAlice}, ${userCarol}) -> ${JSON.stringify(resultAreFriends)}`);

      // Query uninitialized users
      errorResult = await friendingConcept._areFriends({ user1: "nonExistent1" as ID, user2: "nonExistent2" as ID });
      assertEquals(errorResult, { error: `User (ID: nonExistent1) does not exist or is not initialized in Friending concept.` }, "Query should return error for uninitialized user1.");
      console.log(`Query: _areFriends("nonExistent1", "nonExistent2") -> `, errorResult);

      errorResult = await friendingConcept._areFriends({ user1: userAlice, user2: invalidUser });
      assertEquals(errorResult, { error: "Both user1 and user2 IDs must be provided." }, "Query should return error for empty user ID.");
      console.log(`Query: _areFriends(${userAlice}, "${invalidUser}") -> `, errorResult);

      // Get friend state for uninitialized user
      errorResult = await friendingConcept._getFriendState({ user: "nonExistentUser" as ID });
      assertEquals(errorResult, { error: `User (ID: nonExistentUser) does not exist or is not initialized in Friending concept.` });
      console.log(`Query: _getFriendState(nonExistentUser) -> `, errorResult);

      // Get friend state for a valid user (Alice)
      let [aliceFriendState] = await friendingConcept._getFriendState({ user: userAlice }) as any[];
      assertEquals(aliceFriendState.friends.length, 0, "Alice's friends list should be empty.");
      assertEquals(aliceFriendState.sentRequests, [userEve], "Alice should have a pending request to Eve.");
      assertEquals(aliceFriendState.receivedRequests, [userBob], "Alice should have a pending request from Bob.");
      console.log(`Query: _getFriendState(${userAlice}) -> `, aliceFriendState);
    });

  } finally {
    await client.close(); // Ensure MongoDB client is closed after all tests
  }
});
```
