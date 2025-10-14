---
timestamp: 'Tue Oct 14 2025 01:19:20 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_011920.341e5362.md]]'
content_id: f2b606f72ab8cdaf497b5780e000f9b14edd3a6983b34603aba72563054e8c61
---

# file: src/concepts/Friending/FriendingConcept.test.ts

```typescript
import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts"; // Assuming utils are in parent directory
import { ID } from "../../utils/types.ts";
import FriendingConcept from "./FriendingConcept.ts";

Deno.test("FriendingConcept - Operational Principle and Basic Scenarios", async (t) => {
  const [db, client] = await testDb();
  const friendingConcept = new FriendingConcept(db);

  const userA = "user:Alice" as ID;
  const userB = "user:Bob" as ID;
  const userC = "user:Charlie" as ID;
  const userD = "user:David" as ID;

  // --- Operational Principle: A sends request to B, B accepts, they become friends ---
  await t.step("Principle: A sends request to B, B accepts, they become friends", async () => {
    console.log("\n--- Operational Principle Test ---");

    // 1. User A sends a friend request to User B
    console.log(`Action: ${userA} sends request to ${userB}`);
    const sendResult = await friendingConcept.sendRequest({ sender: userA, receiver: userB });
    assertEquals(sendResult, {}, "sendRequest should succeed");

    // Verify request exists for B
    const bReceivedRequests = await friendingConcept._getReceivedFriendRequests({ user: userB });
    assertEquals(bReceivedRequests.length, 1, "User B should have 1 received request");
    assertEquals(bReceivedRequests[0].sender, userA, "User B received request from A");
    assertEquals(bReceivedRequests[0].receiver, userB, "User B received request for B");

    // Verify request exists for A
    const aSentRequests = await friendingConcept._getSentFriendRequests({ user: userA });
    assertEquals(aSentRequests.length, 1, "User A should have 1 sent request");
    assertEquals(aSentRequests[0].sender, userA, "User A sent request from A");
    assertEquals(aSentRequests[0].receiver, userB, "User A sent request for B");

    // 2. User B accepts the request from User A
    console.log(`Action: ${userB} accepts request from ${userA}`);
    const acceptResult = await friendingConcept.acceptRequest({ sender: userA, receiver: userB });
    assertEquals(acceptResult, {}, "acceptRequest should succeed");

    // Verify request is removed
    const bReceivedRequestsAfterAccept = await friendingConcept._getReceivedFriendRequests({ user: userB });
    assertEquals(bReceivedRequestsAfterAccept.length, 0, "User B should have 0 received requests after accept");
    const aSentRequestsAfterAccept = await friendingConcept._getSentFriendRequests({ user: userA });
    assertEquals(aSentRequestsAfterAccept.length, 0, "User A should have 0 sent requests after accept");

    // Verify friendship exists for A
    const aFriends = await friendingConcept._getFriends({ user: userA });
    assertEquals(aFriends.friends.length, 1, "User A should have 1 friend");
    assertEquals(aFriends.friends[0], userB, "User A's friend should be B");

    // Verify friendship exists for B
    const bFriends = await friendingConcept._getFriends({ user: userB });
    assertEquals(bFriends.friends.length, 1, "User B should have 1 friend");
    assertEquals(bFriends.friends[0], userA, "User B's friend should be A");

    console.log("Principle Test Complete: A and B are now friends.");
  });

  // --- Interesting Scenario 1: Denying a request ---
  await t.step("Scenario 1: Denying a request", async () => {
    console.log("\n--- Scenario 1: Denying a request ---");

    // A sends request to C
    console.log(`Action: ${userA} sends request to ${userC}`);
    await friendingConcept.sendRequest({ sender: userA, receiver: userC });

    // C denies the request from A
    console.log(`Action: ${userC} denies request from ${userA}`);
    const denyResult = await friendingConcept.denyRequest({ sender: userA, receiver: userC });
    assertEquals(denyResult, {}, "denyRequest should succeed");

    // Verify request is removed
    const cReceivedRequests = await friendingConcept._getReceivedFriendRequests({ user: userC });
    assertEquals(cReceivedRequests.length, 0, "User C should have 0 received requests after deny");
    const aSentRequests = await friendingConcept._getSentFriendRequests({ user: userA });
    assertEquals(aSentRequests.length, 0, "User A should have 0 sent requests after deny");

    // Verify no friendship
    const aFriends = await friendingConcept._getFriends({ user: userA });
    assertNotEquals(aFriends.friends.includes(userC), true, "User A and C should not be friends");
    const cFriends = await friendingConcept._getFriends({ user: userC });
    assertNotEquals(cFriends.friends.includes(userA), true, "User C and A should not be friends");

    console.log("Scenario 1 Complete: A and C are not friends.");
  });

  // --- Interesting Scenario 2: Removing a friend ---
  await t.step("Scenario 2: Removing a friend", async () => {
    console.log("\n--- Scenario 2: Removing a friend ---");

    // A and D become friends first (implicitly, for test setup)
    await friendingConcept.sendRequest({ sender: userA, receiver: userD });
    await friendingConcept.acceptRequest({ sender: userA, receiver: userD });

    // Verify A and D are friends
    let aFriends = await friendingConcept._getFriends({ user: userA });
    assertEquals(aFriends.friends.includes(userD), true, "User A should be friends with D initially");
    let dFriends = await friendingConcept._getFriends({ user: userD });
    assertEquals(dFriends.friends.includes(userA), true, "User D should be friends with A initially");

    // User A removes User D as a friend
    console.log(`Action: ${userA} removes ${userD} as friend`);
    const removeResult = await friendingConcept.removeFriend({ user: userA, to_be_removed_friend: userD });
    assertEquals(removeResult, {}, "removeFriend should succeed");

    // Verify friendship is removed for A
    aFriends = await friendingConcept._getFriends({ user: userA });
    assertNotEquals(aFriends.friends.includes(userD), true, "User A should no longer be friends with D");
    // Verify friendship is removed for D
    dFriends = await friendingConcept._getFriends({ user: userD });
    assertNotEquals(dFriends.friends.includes(userA), true, "User D should no longer be friends with A");

    console.log("Scenario 2 Complete: A and D are no longer friends.");
  });

  // --- Interesting Scenario 3: Error cases for sendRequest ---
  await t.step("Scenario 3: Error cases for sendRequest", async () => {
    console.log("\n--- Scenario 3: Error cases for sendRequest ---");

    // Cannot send request to self
    console.log(`Action: ${userA} sends request to ${userA} (expected error)`);
    const selfRequestResult = await friendingConcept.sendRequest({ sender: userA, receiver: userA });
    assertExists((selfRequestResult as { error: string }).error, "Should return an error for sending to self");
    assertEquals((selfRequestResult as { error: string }).error, "Cannot send friend request to self.", "Error message should match");

    // A and B are already friends from the operational principle test
    console.log(`Action: ${userA} sends request to ${userB} (already friends, expected error)`);
    const alreadyFriendsResult = await friendingConcept.sendRequest({ sender: userA, receiver: userB });
    assertExists((alreadyFriendsResult as { error: string }).error, "Should return an error for already being friends");
    assertEquals((alreadyFriendsResult as { error: string }).error, "Users are already friends.", "Error message should match");

    // Re-send request (D to C)
    console.log(`Action: ${userD} sends request to ${userC}`);
    await friendingConcept.sendRequest({ sender: userD, receiver: userC });
    console.log(`Action: ${userD} sends request to ${userC} again (pending, expected error)`);
    const duplicateRequestResult = await friendingConcept.sendRequest({ sender: userD, receiver: userC });
    assertExists((duplicateRequestResult as { error: string }).error, "Should return an error for duplicate pending request");
    assertEquals((duplicateRequestResult as { error: string }).error, "Friend request already exists or is pending.", "Error message should match");

    // C denies the request from D to clear state
    await friendingConcept.denyRequest({ sender: userD, receiver: userC });

    console.log("Scenario 3 Complete: Error handling for sendRequest verified.");
  });

  // --- Interesting Scenario 4: Error cases for acceptRequest and denyRequest ---
  await t.step("Scenario 4: Error cases for acceptRequest and denyRequest", async () => {
    console.log("\n--- Scenario 4: Error cases for acceptRequest and denyRequest ---");

    // Attempt to accept non-existent request
    console.log(`Action: ${userA} accepts request from ${userD} (non-existent, expected error)`);
    const nonExistentAcceptResult = await friendingConcept.acceptRequest({ sender: userD, receiver: userA });
    assertExists((nonExistentAcceptResult as { error: string }).error, "Should return an error for non-existent request");
    assertEquals((nonExistentAcceptResult as { error: string }).error, "Friend request not found.", "Error message should match");

    // Attempt to deny non-existent request
    console.log(`Action: ${userA} denies request from ${userD} (non-existent, expected error)`);
    const nonExistentDenyResult = await friendingConcept.denyRequest({ sender: userD, receiver: userA });
    assertExists((nonExistentDenyResult as { error: string }).error, "Should return an error for non-existent request");
    assertEquals((nonExistentDenyResult as { error: string }).error, "Friend request not found.", "Error message should match");

    console.log("Scenario 4 Complete: Error handling for acceptRequest and denyRequest verified.");
  });

  // --- Interesting Scenario 5: Error cases for removeFriend ---
  await t.step("Scenario 5: Error cases for removeFriend", async () => {
    console.log("\n--- Scenario 5: Error cases for removeFriend ---");

    // Attempt to remove non-existent friendship
    console.log(`Action: ${userA} removes ${userC} (not friends, expected error)`);
    const nonExistentRemoveResult = await friendingConcept.removeFriend({ user: userA, to_be_removed_friend: userC });
    assertExists((nonExistentRemoveResult as { error: string }).error, "Should return an error for non-existent friendship");
    assertEquals((nonExistentRemoveResult as { error: string }).error, "Friendship not found.", "Error message should match");

    console.log("Scenario 5 Complete: Error handling for removeFriend verified.");
  });

  await client.close();
});
```
