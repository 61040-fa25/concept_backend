---
timestamp: 'Wed Oct 15 2025 01:16:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_011632.08a33a51.md]]'
content_id: b511bc6f8c5ab94eec5a9c76df5edba65131d7dc268c0db2a0d89e96550a4773
---

# file: src/concepts/Friending/FriendingConcept.test.ts

```typescript
import { assertEquals, assertFalse, assertTrue } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import FriendingConcept from "./FriendingConcept.ts";

// Define test user IDs
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const userCharlie = "user:Charlie" as ID;
const userDavid = "user:David" as ID;

Deno.test("Friending Concept: Operational Principle Fulfillment", async (t) => {
  const [db, client] = await testDb();
  const friendingConcept = new FriendingConcept(db);

  try {
    console.log(
      "\n--- Test: Operational Principle Fulfillment (Alice & Bob) ---",
    );

    await t.step(
      "Alice sends a friend request to Bob (sendRequest)",
      async () => {
        console.log(`Action: sendRequest(${userAlice}, ${userBob})`);
        const result = await friendingConcept.sendRequest({
          sender: userAlice,
          receiver: userBob,
        });
        console.log("Result:", result);
        assertFalse("error" in result, "sendRequest should not return an error");
        assertTrue("request" in result, "sendRequest should return a request ID");

        const requests = await friendingConcept.friendRequests.find({
          sender: userAlice,
          receiver: userBob,
        }).toArray();
        assertEquals(requests.length, 1, "There should be one pending request");
        assertEquals(
          requests[0]._id,
          result.request,
          "Request ID should match",
        );
      },
    );

    await t.step(
      "Bob accepts the friend request from Alice (acceptRequest)",
      async () => {
        console.log(`Action: acceptRequest(${userAlice}, ${userBob})`);
        const result = await friendingConcept.acceptRequest({
          sender: userAlice,
          receiver: userBob,
        });
        console.log("Result:", result);
        assertFalse(
          "error" in result,
          "acceptRequest should not return an error",
        );

        const pendingRequests = await friendingConcept.friendRequests.find({
          sender: userAlice,
          receiver: userBob,
        }).toArray();
        assertEquals(
          pendingRequests.length,
          0,
          "Pending request should be removed",
        );

        const canonicalPair = friendingConcept["getCanonicalFriendPair"](
          userAlice,
          userBob,
        );
        const friendships = await friendingConcept.friendships.find(
          canonicalPair,
        ).toArray();
        assertEquals(friendships.length, 1, "A friendship should be recorded");
      },
    );

    await t.step(
      "Verify Alice and Bob are friends (_isFriends, _getFriends)",
      async () => {
        console.log(`Query: _isFriends(${userAlice}, ${userBob})`);
        const isFriendsResult = await friendingConcept._isFriends({
          user1: userAlice,
          user2: userBob,
        });
        console.log("Result:", isFriendsResult);
        assertEquals(
          isFriendsResult,
          [{ isFriend: true }],
          "Alice and Bob should be friends",
        );

        console.log(`Query: _getFriends(${userAlice})`);
        const aliceFriends = await friendingConcept._getFriends({
          user: userAlice,
        });
        console.log("Result:", aliceFriends);
        assertEquals(aliceFriends.length, 1, "Alice should have 1 friend");
        assertEquals(
          aliceFriends[0].friend,
          userBob,
          "Alice's friend should be Bob",
        );

        console.log(`Query: _getFriends(${userBob})`);
        const bobFriends = await friendingConcept._getFriends({ user: userBob });
        console.log("Result:", bobFriends);
        assertEquals(bobFriends.length, 1, "Bob should have 1 friend");
        assertEquals(
          bobFriends[0].friend,
          userAlice,
          "Bob's friend should be Alice",
        );
      },
    );
  } finally {
    await client.close();
  }
});

Deno.test("Friending Concept: Interesting Scenarios", async (t) => {
  const [db, client] = await testDb();
  const friendingConcept = new FriendingConcept(db);

  try {
    console.log("\n--- Test: Interesting Scenarios ---");

    await t.step(
      "Scenario 1: User tries to send a friend request to themselves",
      async () => {
        console.log(`Action: sendRequest(${userAlice}, ${userAlice})`);
        const result = await friendingConcept.sendRequest({
          sender: userAlice,
          receiver: userAlice,
        });
        console.log("Result:", result);
        assertTrue("error" in result, "sendRequest should return an error");
        assertEquals(
          result.error,
          "Sender cannot send a friend request to themselves.",
          "Error message should match for self-request",
        );
      },
    );

    await t.step(
      "Scenario 2: Duplicate friend request (Alice -> Bob)",
      async () => {
        // First, Alice sends request to Charlie
        console.log(`Action: sendRequest(${userAlice}, ${userCharlie})`);
        const initialRequest = await friendingConcept.sendRequest({
          sender: userAlice,
          receiver: userCharlie,
        });
        assertFalse("error" in initialRequest, "First request should succeed");

        // Then, Alice tries to send another request to Charlie
        console.log(`Action: sendRequest(${userAlice}, ${userCharlie})`);
        const duplicateResult = await friendingConcept.sendRequest({
          sender: userAlice,
          receiver: userCharlie,
        });
        console.log("Result:", duplicateResult);
        assertTrue(
          "error" in duplicateResult,
          "Duplicate sendRequest should return an error",
        );
        assertEquals(
          duplicateResult.error,
          "A friend request between these users already exists.",
          "Error message should match for duplicate request",
        );
      },
    );

    await t.step(
      "Scenario 3: Reverse duplicate friend request (Charlie -> Alice)",
      async () => {
        // Alice -> Charlie request is still pending from previous step
        // Charlie tries to send a request to Alice
        console.log(`Action: sendRequest(${userCharlie}, ${userAlice})`);
        const reverseResult = await friendingConcept.sendRequest({
          sender: userCharlie,
          receiver: userAlice,
        });
        console.log("Result:", reverseResult);
        assertTrue(
          "error" in reverseResult,
          "Reverse sendRequest should return an error",
        );
        assertEquals(
          reverseResult.error,
          "A friend request between these users already exists.",
          "Error message should match for reverse request",
        );
      },
    );

    await t.step(
      "Scenario 4: User denies a friend request (Charlie -> David)",
      async () => {
        // Charlie sends request to David
        console.log(`Action: sendRequest(${userCharlie}, ${userDavid})`);
        const initialRequest = await friendingConcept.sendRequest({
          sender: userCharlie,
          receiver: userDavid,
        });
        assertFalse("error" in initialRequest, "Request should succeed");

        // David denies the request from Charlie
        console.log(`Action: denyRequest(${userCharlie}, ${userDavid})`);
        const denyResult = await friendingConcept.denyRequest({
          sender: userCharlie,
          receiver: userDavid,
        });
        console.log("Result:", denyResult);
        assertFalse("error" in denyResult, "denyRequest should not error");

        const pendingRequests = await friendingConcept.friendRequests.find({
          sender: userCharlie,
          receiver: userDavid,
        }).toArray();
        assertEquals(
          pendingRequests.length,
          0,
          "Pending request should be removed after denial",
        );

        const isFriendsResult = await friendingConcept._isFriends({
          user1: userCharlie,
          user2: userDavid,
        });
        assertEquals(
          isFriendsResult,
          [{ isFriend: false }],
          "Charlie and David should not be friends after denial",
        );
      },
    );

    await t.step(
      "Scenario 5: Attempt to accept/deny non-existent request",
      async () => {
        console.log(`Action: acceptRequest(${userDavid}, ${userAlice})`);
        const acceptNonExistent = await friendingConcept.acceptRequest({
          sender: userDavid,
          receiver: userAlice,
        });
        console.log("Result:", acceptNonExistent);
        assertTrue(
          "error" in acceptNonExistent,
          "Accepting non-existent request should error",
        );
        assertEquals(
          acceptNonExistent.error,
          "Friend request does not exist.",
          "Error message should match for non-existent accept",
        );

        console.log(`Action: denyRequest(${userDavid}, ${userAlice})`);
        const denyNonExistent = await friendingConcept.denyRequest({
          sender: userDavid,
          receiver: userAlice,
        });
        console.log("Result:", denyNonExistent);
        assertTrue(
          "error" in denyNonExistent,
          "Denying non-existent request should error",
        );
        assertEquals(
          denyNonExistent.error,
          "Friend request does not exist.",
          "Error message should match for non-existent deny",
        );
      },
    );

    await t.step(
      "Scenario 6: Already friends, then send request (Alice -> Bob)",
      async () => {
        // Alice and Bob are friends from the Operational Principle test.
        console.log(
          `Pre-check: _isFriends(${userAlice}, ${userBob}) => should be true`,
        );
        const preCheck = await friendingConcept._isFriends({
          user1: userAlice,
          user2: userBob,
        });
        assertEquals(preCheck, [{ isFriend: true }]);

        console.log(`Action: sendRequest(${userAlice}, ${userBob})`);
        const result = await friendingConcept.sendRequest({
          sender: userAlice,
          receiver: userBob,
        });
        console.log("Result:", result);
        assertTrue(
          "error" in result,
          "sendRequest when already friends should error",
        );
        assertEquals(
          result.error,
          "Users are already friends.",
          "Error message should match for already friends",
        );
      },
    );

    await t.step(
      "Scenario 7: Remove an existing friend (Alice & Bob)",
      async () => {
        // Alice and Bob are friends from the Operational Principle test.
        console.log(`Action: removeFriend(${userAlice}, ${userBob})`);
        const result = await friendingConcept.removeFriend({
          user: userAlice,
          to_be_removed_friend: userBob,
        });
        console.log("Result:", result);
        assertFalse(
          "error" in result,
          "removeFriend should not return an error",
        );

        const isFriendsResult = await friendingConcept._isFriends({
          user1: userAlice,
          user2: userBob,
        });
        assertEquals(
          isFriendsResult,
          [{ isFriend: false }],
          "Alice and Bob should no longer be friends",
        );

        const aliceFriends = await friendingConcept._getFriends({
          user: userAlice,
        });
        assertEquals(
          aliceFriends.length,
          0,
          "Alice should have no friends after removal",
        );
      },
    );

    await t.step(
      "Scenario 8: Attempt to remove a non-existent friendship",
      async () => {
        console.log(`Action: removeFriend(${userAlice}, ${userCharlie})`);
        const result = await friendingConcept.removeFriend({
          user: userAlice,
          to_be_removed_friend: userCharlie,
        });
        console.log("Result:", result);
        assertTrue(
          "error" in result,
          "Removing non-existent friendship should error",
        );
        assertEquals(
          result.error,
          "Friendship does not exist.",
          "Error message should match for non-existent friendship removal",
        );
      },
    );

    await t.step("Scenario 9: Comprehensive query testing", async () => {
      // Setup:
      // Alice -> David (request pending)
      // Charlie -> Alice (accepted)
      // Bob -> David (accepted)

      await friendingConcept.sendRequest({ sender: userAlice, receiver: userDavid });
      await friendingConcept.sendRequest({ sender: userCharlie, receiver: userAlice });
      await friendingConcept.acceptRequest({ sender: userCharlie, receiver: userAlice });
      await friendingConcept.sendRequest({ sender: userBob, receiver: userDavid });
      await friendingConcept.acceptRequest({ sender: userBob, receiver: userDavid });

      console.log(`Query: _getFriends(${userAlice})`);
      const aliceFriends = await friendingConcept._getFriends({ user: userAlice });
      console.log("Result:", aliceFriends);
      assertEquals(aliceFriends.length, 1);
      assertEquals(aliceFriends[0].friend, userCharlie);

      console.log(`Query: _getSentFriendRequests(${userAlice})`);
      const aliceSentRequests = await friendingConcept._getSentFriendRequests({ sender: userAlice });
      console.log("Result:", aliceSentRequests);
      assertEquals(aliceSentRequests.length, 1);
      assertEquals(aliceSentRequests[0].receiver, userDavid);

      console.log(`Query: _getReceivedFriendRequests(${userAlice})`);
      const aliceReceivedRequests = await friendingConcept._getReceivedFriendRequests({ receiver: userAlice });
      console.log("Result:", aliceReceivedRequests);
      assertEquals(aliceReceivedRequests.length, 0); // Charlie's request was accepted

      console.log(`Query: _getFriends(${userDavid})`);
      const davidFriends = await friendingConcept._getFriends({ user: userDavid });
      console.log("Result:", davidFriends);
      assertEquals(davidFriends.length, 1);
      assertEquals(davidFriends[0].friend, userBob);

      console.log(`Query: _getReceivedFriendRequests(${userDavid})`);
      const davidReceivedRequests = await friendingConcept._getReceivedFriendRequests({ receiver: userDavid });
      console.log("Result:", davidReceivedRequests);
      assertEquals(davidReceivedRequests.length, 1);
      assertEquals(davidReceivedRequests[0].sender, userAlice);
    });
  } finally {
    await client.close();
  }
});
```
