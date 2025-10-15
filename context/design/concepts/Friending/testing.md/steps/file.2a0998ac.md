---
timestamp: 'Wed Oct 15 2025 01:17:48 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_011748.b0870dda.md]]'
content_id: 2a0998ac84bdf2d7e8b684624766c561c021dd5996a04d90008b6b92cb6b2cba
---

# file: src/concepts/Friending/FriendingConcept.test.ts

```typescript
import { assertEquals, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import FriendingConcept from "./FriendingConcept.ts";

Deno.test("Friending Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const friendingConcept = new FriendingConcept(db);

  // Define some test users
  const userA = "user:Alice" as ID;
  const userB = "user:Bob" as ID;
  const userC = "user:Charlie" as ID;
  const userD = "user:David" as ID;

  console.log("--- Starting Friending Concept Tests ---");

  // --- Test 1: Operational Principle ---
  await t.step("Operational Principle: User A sends request to B, B accepts, they become friends", async () => {
    console.log("\n--- Scenario: Operational Principle ---");

    // Initial state check
    const initialFriendsA = await friendingConcept._getFriends({ user: userA });
    assertEquals(initialFriendsA, [], "User A should have no friends initially.");
    const initialRequestsB = await friendingConcept._getReceivedFriendRequests({ receiver: userB });
    assertEquals(initialRequestsB, [], "User B should have no received requests initially.");

    // Action: User A sends a friend request to User B
    console.log(`Action: ${userA} sends friend request to ${userB}`);
    const sendResult = await friendingConcept.sendRequest({ sender: userA, receiver: userB });
    assertNotEquals((sendResult as { error?: string }).error, "Sender cannot send a friend request to themselves.");
    assertNotEquals((sendResult as { error?: string }).error, "A friend request between these users already exists.");
    assertNotEquals((sendResult as { error?: string }).error, "Users are already friends.");
    assertNotEquals(sendResult, undefined, "sendRequest should return a result.");
    assertNotEquals((sendResult as { request: ID }).request, undefined, "sendRequest should return a request ID.");
    console.log(`Result: ${JSON.stringify(sendResult)}`);

    // Verify: Request is pending for B
    const bReceivedRequests = await friendingConcept._getReceivedFriendRequests({ receiver: userB });
    assertEquals(bReceivedRequests.length, 1, "User B should have 1 received request.");
    assertArrayIncludes(bReceivedRequests, [{ sender: userA }], "User B should have received request from User A.");
    console.log(`Query: ${userB} received requests: ${JSON.stringify(bReceivedRequests)}`);

    const aSentRequests = await friendingConcept._getSentFriendRequests({ sender: userA });
    assertEquals(aSentRequests.length, 1, "User A should have 1 sent request.");
    assertArrayIncludes(aSentRequests, [{ receiver: userB }], "User A should have sent request to User B.");
    console.log(`Query: ${userA} sent requests: ${JSON.stringify(aSentRequests)}`);

    // Action: User B accepts the request from User A
    console.log(`Action: ${userB} accepts request from ${userA}`);
    const acceptResult = await friendingConcept.acceptRequest({ sender: userA, receiver: userB });
    assertEquals((acceptResult as { error?: string }).error, undefined, "acceptRequest should not return an error.");
    assertEquals(acceptResult, {}, "acceptRequest should return an empty object on success.");
    console.log(`Result: ${JSON.stringify(acceptResult)}`);

    // Verify: Request is removed
    const bReceivedRequestsAfterAccept = await friendingConcept._getReceivedFriendRequests({ receiver: userB });
    assertEquals(bReceivedRequestsAfterAccept, [], "User B should have no received requests after accepting.");
    console.log(`Query: ${userB} received requests after accept: ${JSON.stringify(bReceivedRequestsAfterAccept)}`);

    const aSentRequestsAfterAccept = await friendingConcept._getSentFriendRequests({ sender: userA });
    assertEquals(aSentRequestsAfterAccept, [], "User A should have no sent requests after acceptance.");
    console.log(`Query: ${userA} sent requests after accept: ${JSON.stringify(aSentRequestsAfterAccept)}`);

    // Verify: A and B are now friends
    const areA_BFriends = await friendingConcept._isFriends({ user1: userA, user2: userB });
    assertEquals(areA_BFriends, [{ isFriend: true }], "User A and B should be friends.");
    console.log(`Query: Are ${userA} and ${userB} friends? ${JSON.stringify(areA_BFriends)}`);

    const areB_AFriends = await friendingConcept._isFriends({ user1: userB, user2: userA });
    assertEquals(areB_AFriends, [{ isFriend: true }], "User B and A should also be friends (symmetrical).");
    console.log(`Query: Are ${userB} and ${userA} friends? ${JSON.stringify(areB_AFriends)}`);

    const aFriends = await friendingConcept._getFriends({ user: userA });
    assertEquals(aFriends.length, 1, "User A should have 1 friend.");
    assertArrayIncludes(aFriends, [{ friend: userB }], "User A's friend list should include User B.");
    console.log(`Query: ${userA} friends: ${JSON.stringify(aFriends)}`);

    const bFriends = await friendingConcept._getFriends({ user: userB });
    assertEquals(bFriends.length, 1, "User B should have 1 friend.");
    assertArrayIncludes(bFriends, [{ friend: userA }], "User B's friend list should include User A.");
    console.log(`Query: ${userB} friends: ${JSON.stringify(bFriends)}`);
  });

  // --- Test 2: Error Cases for sendRequest ---
  await t.step("Error Cases for sendRequest", async () => {
    console.log("\n--- Scenario: sendRequest Error Cases ---");

    // Action: User A tries to send request to themselves
    console.log(`Action: ${userA} sends request to ${userA}`);
    const selfRequest = await friendingConcept.sendRequest({ sender: userA, receiver: userA });
    assertNotEquals((selfRequest as { request?: ID }).request, undefined, "Request to self should fail.");
    assertEquals((selfRequest as { error: string }).error, "Sender cannot send a friend request to themselves.", "Request to self should return error.");
    console.log(`Result: ${JSON.stringify(selfRequest)}`);

    // Setup: User C sends request to User D
    console.log(`Setup: ${userC} sends request to ${userD}`);
    const c_d_request = await friendingConcept.sendRequest({ sender: userC, receiver: userD });
    assertEquals((c_d_request as { error?: string }).error, undefined, "Setup request should succeed.");
    console.log(`Result: ${JSON.stringify(c_d_request)}`);

    // Action: User C tries to send duplicate request to User D
    console.log(`Action: ${userC} sends duplicate request to ${userD}`);
    const duplicateRequest = await friendingConcept.sendRequest({ sender: userC, receiver: userD });
    assertNotEquals((duplicateRequest as { request?: ID }).request, undefined, "Duplicate request should fail.");
    assertEquals((duplicateRequest as { error: string }).error, "A friend request from you to this user is already pending.", "Duplicate request should return error.");
    console.log(`Result: ${JSON.stringify(duplicateRequest)}`);

    // Action: User D tries to send request back to User C (while C->D is pending)
    console.log(`Action: ${userD} sends request to ${userC} (while C->D is pending)`);
    const reverseRequest = await friendingConcept.sendRequest({ sender: userD, receiver: userC });
    assertNotEquals((reverseRequest as { request?: ID }).request, undefined, "Reverse request should fail.");
    assertEquals((reverseRequest as { error: string }).error, "This user has already sent you a friend request.", "Reverse request should return error.");
    console.log(`Result: ${JSON.stringify(reverseRequest)}`);

    // Action: User A tries to send request to User B again (already friends from Test 1)
    console.log(`Action: ${userA} sends request to ${userB} (already friends)`);
    const alreadyFriendsRequest = await friendingConcept.sendRequest({ sender: userA, receiver: userB });
    assertNotEquals((alreadyFriendsRequest as { request?: ID }).request, undefined, "Request to existing friend should fail.");
    assertEquals((alreadyFriendsRequest as { error: string }).error, "Users are already friends.", "Request to existing friend should return error.");
    console.log(`Result: ${JSON.stringify(alreadyFriendsRequest)}`);

    // Cleanup for next test: deny C->D request
    console.log(`Cleanup: ${userD} denies request from ${userC}`);
    const denyCD = await friendingConcept.denyRequest({ sender: userC, receiver: userD });
    assertEquals((denyCD as { error?: string }).error, undefined, "Deny request should succeed.");
    console.log(`Result: ${JSON.stringify(denyCD)}`);
  });

  // --- Test 3: Denying a Request ---
  await t.step("Denying a Request", async () => {
    console.log("\n--- Scenario: Denying a Request ---");
    const userE = "user:Eve" as ID;
    const userF = "user:Frank" as ID;

    // Action: User E sends request to User F
    console.log(`Action: ${userE} sends friend request to ${userF}`);
    const sendResult = await friendingConcept.sendRequest({ sender: userE, receiver: userF });
    assertEquals((sendResult as { error?: string }).error, undefined, "sendRequest should succeed.");
    console.log(`Result: ${JSON.stringify(sendResult)}`);

    // Verify: Request is pending for F
    const fReceivedRequests = await friendingConcept._getReceivedFriendRequests({ receiver: userF });
    assertEquals(fReceivedRequests.length, 1, "User F should have 1 received request.");
    assertArrayIncludes(fReceivedRequests, [{ sender: userE }], "User F should have received request from User E.");
    console.log(`Query: ${userF} received requests: ${JSON.stringify(fReceivedRequests)}`);

    // Action: User F denies the request from User E
    console.log(`Action: ${userF} denies request from ${userE}`);
    const denyResult = await friendingConcept.denyRequest({ sender: userE, receiver: userF });
    assertEquals((denyResult as { error?: string }).error, undefined, "denyRequest should not return an error.");
    assertEquals(denyResult, {}, "denyRequest should return an empty object on success.");
    console.log(`Result: ${JSON.stringify(denyResult)}`);

    // Verify: Request is removed
    const fReceivedRequestsAfterDeny = await friendingConcept._getReceivedFriendRequests({ receiver: userF });
    assertEquals(fReceivedRequestsAfterDeny, [], "User F should have no received requests after denying.");
    console.log(`Query: ${userF} received requests after deny: ${JSON.stringify(fReceivedRequestsAfterDeny)}`);

    // Verify: E and F are NOT friends
    const areE_FFriends = await friendingConcept._isFriends({ user1: userE, user2: userF });
    assertEquals(areE_FFriends, [{ isFriend: false }], "User E and F should not be friends.");
    console.log(`Query: Are ${userE} and ${userF} friends? ${JSON.stringify(areE_FFriends)}`);

    // Action: User F tries to deny a non-existent request
    console.log(`Action: ${userF} tries to deny non-existent request from ${userE}`);
    const denyNonExistent = await friendingConcept.denyRequest({ sender: userE, receiver: userF });
    assertNotEquals((denyNonExistent as { error?: string }).error, undefined, "Denying non-existent request should fail.");
    assertEquals((denyNonExistent as { error: string }).error, "Friend request from sender to receiver does not exist.", "Denying non-existent request should return error.");
    console.log(`Result: ${JSON.stringify(denyNonExistent)}`);
  });

  // --- Test 4: Removing a Friend ---
  await t.step("Removing a Friend", async () => {
    console.log("\n--- Scenario: Removing a Friend ---");

    // Verify: A and B are still friends from Test 1
    const areA_BFriends = await friendingConcept._isFriends({ user1: userA, user2: userB });
    assertEquals(areA_BFriends, [{ isFriend: true }], "User A and B should still be friends.");
    console.log(`Query: Are ${userA} and ${userB} friends? ${JSON.stringify(areA_BFriends)}`);

    const aFriendsBeforeRemove = await friendingConcept._getFriends({ user: userA });
    assertEquals(aFriendsBeforeRemove.length, 1, "User A should have 1 friend before removal.");
    console.log(`Query: ${userA} friends before removal: ${JSON.stringify(aFriendsBeforeRemove)}`);

    // Action: User A removes User B as a friend
    console.log(`Action: ${userA} removes ${userB} as a friend`);
    const removeResult = await friendingConcept.removeFriend({ user: userA, to_be_removed_friend: userB });
    assertEquals((removeResult as { error?: string }).error, undefined, "removeFriend should not return an error.");
    assertEquals(removeResult, {}, "removeFriend should return an empty object on success.");
    console.log(`Result: ${JSON.stringify(removeResult)}`);

    // Verify: A and B are no longer friends
    const areA_BFriendsAfterRemove = await friendingConcept._isFriends({ user1: userA, user2: userB });
    assertEquals(areA_BFriendsAfterRemove, [{ isFriend: false }], "User A and B should no longer be friends.");
    console.log(`Query: Are ${userA} and ${userB} friends after removal? ${JSON.stringify(areA_BFriendsAfterRemove)}`);

    const aFriendsAfterRemove = await friendingConcept._getFriends({ user: userA });
    assertEquals(aFriendsAfterRemove, [], "User A should have no friends after removal.");
    console.log(`Query: ${userA} friends after removal: ${JSON.stringify(aFriendsAfterRemove)}`);

    // Action: User A tries to remove User B again (non-existent friendship)
    console.log(`Action: ${userA} tries to remove ${userB} again (non-existent)`);
    const removeNonExistent = await friendingConcept.removeFriend({ user: userA, to_be_removed_friend: userB });
    assertNotEquals((removeNonExistent as { error?: string }).error, undefined, "Removing non-existent friendship should fail.");
    assertEquals((removeNonExistent as { error: string }).error, "Friendship does not exist.", "Removing non-existent friendship should return error.");
    console.log(`Result: ${JSON.stringify(removeNonExistent)}`);
  });

  // --- Test 5: Multiple Friendships and Requests ---
  await t.step("Multiple Friendships and Requests", async () => {
    console.log("\n--- Scenario: Multiple Friendships and Requests ---");

    const userX = "user:Xavier" as ID;
    const userY = "user:Yara" as ID;
    const userZ = "user:Zoe" as ID;

    // Send requests
    console.log(`Action: ${userX} sends request to ${userY}`);
    await friendingConcept.sendRequest({ sender: userX, receiver: userY });
    console.log(`Action: ${userY} sends request to ${userZ}`);
    await friendingConcept.sendRequest({ sender: userY, receiver: userZ });
    console.log(`Action: ${userX} sends request to ${userZ}`);
    await friendingConcept.sendRequest({ sender: userX, receiver: userZ });

    // Verify sent/received requests
    const xSent = await friendingConcept._getSentFriendRequests({ sender: userX });
    assertEquals(xSent.length, 2, "Xavier should have sent 2 requests.");
    assertArrayIncludes(xSent, [{ receiver: userY }, { receiver: userZ }]);
    console.log(`Query: ${userX} sent requests: ${JSON.stringify(xSent)}`);

    const yReceived = await friendingConcept._getReceivedFriendRequests({ receiver: userY });
    assertEquals(yReceived.length, 1, "Yara should have received 1 request.");
    assertArrayIncludes(yReceived, [{ sender: userX }]);
    console.log(`Query: ${userY} received requests: ${JSON.stringify(yReceived)}`);

    const zReceived = await friendingConcept._getReceivedFriendRequests({ receiver: userZ });
    assertEquals(zReceived.length, 2, "Zoe should have received 2 requests.");
    assertArrayIncludes(zReceived, [{ sender: userY }, { sender: userX }]);
    console.log(`Query: ${userZ} received requests: ${JSON.stringify(zReceived)}`);

    // Accept some requests
    console.log(`Action: ${userY} accepts request from ${userX}`);
    await friendingConcept.acceptRequest({ sender: userX, receiver: userY }); // X-Y become friends
    console.log(`Action: ${userZ} accepts request from ${userY}`);
    await friendingConcept.acceptRequest({ sender: userY, receiver: userZ }); // Y-Z become friends

    // Verify friendships
    const xFriends = await friendingConcept._getFriends({ user: userX });
    assertEquals(xFriends.length, 1, "Xavier should have 1 friend.");
    assertArrayIncludes(xFriends, [{ friend: userY }]);
    console.log(`Query: ${userX} friends: ${JSON.stringify(xFriends)}`);

    const yFriends = await friendingConcept._getFriends({ user: userY });
    assertEquals(yFriends.length, 2, "Yara should have 2 friends.");
    assertArrayIncludes(yFriends, [{ friend: userX }, { friend: userZ }]);
    console.log(`Query: ${userY} friends: ${JSON.stringify(yFriends)}`);

    const zFriends = await friendingConcept._getFriends({ user: userZ });
    assertEquals(zFriends.length, 1, "Zoe should have 1 friend.");
    assertArrayIncludes(zFriends, [{ friend: userY }]);
    console.log(`Query: ${userZ} friends: ${JSON.stringify(zFriends)}`);

    // Verify remaining requests
    const xSentAfterAccept = await friendingConcept._getSentFriendRequests({ sender: userX });
    assertEquals(xSentAfterAccept.length, 1, "Xavier should have 1 remaining sent request (to Z).");
    assertArrayIncludes(xSentAfterAccept, [{ receiver: userZ }]);
    console.log(`Query: ${userX} sent requests after some accepts: ${JSON.stringify(xSentAfterAccept)}`);

    const zReceivedAfterAccept = await friendingConcept._getReceivedFriendRequests({ receiver: userZ });
    assertEquals(zReceivedAfterAccept.length, 1, "Zoe should have 1 remaining received request (from X).");
    assertArrayIncludes(zReceivedAfterAccept, [{ sender: userX }]);
    console.log(`Query: ${userZ} received requests after some accepts: ${JSON.stringify(zReceivedAfterAccept)}`);

    // Deny remaining request
    console.log(`Action: ${userZ} denies request from ${userX}`);
    await friendingConcept.denyRequest({ sender: userX, receiver: userZ });

    // Verify all requests cleared
    const xSentFinal = await friendingConcept._getSentFriendRequests({ sender: userX });
    assertEquals(xSentFinal.length, 0, "Xavier should have no sent requests left.");
    const zReceivedFinal = await friendingConcept._getReceivedFriendRequests({ receiver: userZ });
    assertEquals(zReceivedFinal.length, 0, "Zoe should have no received requests left.");
  });

  console.log("--- All Friending Concept Tests Completed ---");
  await client.close();
});
```
