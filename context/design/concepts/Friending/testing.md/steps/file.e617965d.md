---
timestamp: 'Tue Oct 14 2025 01:18:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_011814.90fff97e.md]]'
content_id: e617965dd83474eb4e77f466fa339b68535593341f943a6893c4ef1f1e1f645d
---

# file: src/concepts/Friending/FriendingConcept.test.ts

```typescript
import { assertEquals, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts"; // Assuming utils are in parent directory
import FriendingConcept from "./FriendingConcept.ts";
import { ID } from "../../utils/types.ts";

Deno.test("Friending Concept - Operational Principle", async (t) => {
  const [db, client] = await testDb();
  const friendingConcept = new FriendingConcept(db);

  const userA = "user:Alice" as ID;
  const userB = "user:Bob" as ID;
  const userC = "user:Charlie" as ID;

  console.log("\n--- Testing Operational Principle ---");

  // Scenario 1: User A sends a friend request to User B, B accepts.
  await t.step("1. User A sends friend request to User B", async () => {
    console.log(`Action: sendRequest(sender: ${userA}, receiver: ${userB})`);
    const result = await friendingConcept.sendRequest({
      sender: userA,
      receiver: userB,
    });
    assertEquals(result, {}, "sendRequest should succeed");

    const sentRequests = await friendingConcept._getSentFriendRequests({
      user: userA,
    });
    assertEquals(sentRequests.length, 1, "User A should have 1 sent request");
    assertObjectMatch(sentRequests[0], {
      sender: userA,
      receiver: userB,
    });

    const receivedRequests = await friendingConcept._getReceivedFriendRequests({
      user: userB,
    });
    assertEquals(
      receivedRequests.length,
      1,
      "User B should have 1 received request",
    );
    assertObjectMatch(receivedRequests[0], {
      sender: userA,
      receiver: userB,
    });
  });

  await t.step("2. User B accepts friend request from User A", async () => {
    console.log(`Action: acceptRequest(sender: ${userA}, receiver: ${userB})`);
    const result = await friendingConcept.acceptRequest({
      sender: userA,
      receiver: userB,
    });
    assertEquals(result, {}, "acceptRequest should succeed");

    const sentRequests = await friendingConcept._getSentFriendRequests({
      user: userA,
    });
    assertEquals(sentRequests.length, 0, "User A should have 0 sent requests");

    const receivedRequests = await friendingConcept._getReceivedFriendRequests({
      user: userB,
    });
    assertEquals(
      receivedRequests.length,
      0,
      "User B should have 0 received requests",
    );

    const friendsA = await friendingConcept._getFriends({ user: userA });
    assertEquals(
      friendsA.friends,
      [userB],
      "User A should have User B as friend",
    );
    const friendsB = await friendingConcept._getFriends({ user: userB });
    assertEquals(
      friendsB.friends,
      [userA],
      "User B should have User A as friend",
    );
  });

  // Scenario 2: User A removes User B as a friend
  await t.step("3. User A removes User B as friend", async () => {
    console.log(
      `Action: removeFriend(user: ${userA}, to_be_removed_friend: ${userB})`,
    );
    const result = await friendingConcept.removeFriend({
      user: userA,
      to_be_removed_friend: userB,
    });
    assertEquals(result, {}, "removeFriend should succeed");

    const friendsA = await friendingConcept._getFriends({ user: userA });
    assertEquals(
      friendsA.friends,
      [],
      "User A should have no friends after removal",
    );
    const friendsB = await friendingConcept._getFriends({ user: userB });
    assertEquals(
      friendsB.friends,
      [],
      "User B should have no friends after removal",
    );
  });

  // Scenario 3: User B sends request to User C, C denies.
  await t.step("4. User B sends friend request to User C", async () => {
    console.log(`Action: sendRequest(sender: ${userB}, receiver: ${userC})`);
    const result = await friendingConcept.sendRequest({
      sender: userB,
      receiver: userC,
    });
    assertEquals(result, {}, "sendRequest should succeed");

    const sentRequests = await friendingConcept._getSentFriendRequests({
      user: userB,
    });
    assertEquals(sentRequests.length, 1, "User B should have 1 sent request");
    assertObjectMatch(sentRequests[0], {
      sender: userB,
      receiver: userC,
    });

    const receivedRequests = await friendingConcept._getReceivedFriendRequests({
      user: userC,
    });
    assertEquals(
      receivedRequests.length,
      1,
      "User C should have 1 received request",
    );
    assertObjectMatch(receivedRequests[0], {
      sender: userB,
      receiver: userC,
    });
  });

  await t.step("5. User C denies friend request from User B", async () => {
    console.log(`Action: denyRequest(sender: ${userB}, receiver: ${userC})`);
    const result = await friendingConcept.denyRequest({
      sender: userB,
      receiver: userC,
    });
    assertEquals(result, {}, "denyRequest should succeed");

    const sentRequests = await friendingConcept._getSentFriendRequests({
      user: userB,
    });
    assertEquals(sentRequests.length, 0, "User B should have 0 sent requests");

    const receivedRequests = await friendingConcept._getReceivedFriendRequests({
      user: userC,
    });
    assertEquals(
      receivedRequests.length,
      0,
      "User C should have 0 received requests",
    );

    const friendsB = await friendingConcept._getFriends({ user: userB });
    assertEquals(friendsB.friends, [], "User B should have no friends");
    const friendsC = await friendingConcept._getFriends({ user: userC });
    assertEquals(friendsC.friends, [], "User C should have no friends");
  });

  await client.close();
});

Deno.test("Friending Concept - Interesting Scenarios", async (t) => {
  const [db, client] = await testDb();
  const friendingConcept = new FriendingConcept(db);

  const userX = "user:Xavier" as ID;
  const userY = "user:Yara" as ID;
  const userZ = "user:Zoe" as ID;

  console.log("\n--- Testing Interesting Scenarios ---");

  await t.step("1. Cannot send request to self", async () => {
    console.log(`Action: sendRequest(sender: ${userX}, receiver: ${userX})`);
    const result = await friendingConcept.sendRequest({
      sender: userX,
      receiver: userX,
    });
    assertObjectMatch(
      result,
      { error: "Cannot send friend request to self." },
      "Should return error for sending request to self",
    );
  });

  await t.step("2. Cannot send duplicate request (A->B then B->A)", async () => {
    console.log(`Action: sendRequest(sender: ${userX}, receiver: ${userY})`);
    await friendingConcept.sendRequest({ sender: userX, receiver: userY });

    console.log(`Action: sendRequest(sender: ${userY}, receiver: ${userX})`);
    const result = await friendingConcept.sendRequest({
      sender: userY,
      receiver: userX,
    });
    assertObjectMatch(
      result,
      { error: "Friend request already exists or is pending." },
      "Should return error for duplicate request (reversed)",
    );

    const sentRequestsX = await friendingConcept._getSentFriendRequests({
      user: userX,
    });
    assertEquals(sentRequestsX.length, 1);
    const receivedRequestsX = await friendingConcept._getReceivedFriendRequests(
      { user: userX },
    );
    assertEquals(receivedRequestsX.length, 0); // X sent, Y received

    const sentRequestsY = await friendingConcept._getSentFriendRequests({
      user: userY,
    });
    assertEquals(sentRequestsY.length, 0);
    const receivedRequestsY = await friendingConcept._getReceivedFriendRequests(
      { user: userY },
    );
    assertEquals(receivedRequestsY.length, 1);
  });

  await t.step("3. Cannot accept non-existent request", async () => {
    console.log(`Action: acceptRequest(sender: ${userX}, receiver: ${userZ})`);
    const result = await friendingConcept.acceptRequest({
      sender: userX,
      receiver: userZ,
    });
    assertObjectMatch(
      result,
      { error: "Friend request not found." },
      "Should return error for non-existent request",
    );
  });

  await t.step("4. Cannot deny non-existent request", async () => {
    console.log(`Action: denyRequest(sender: ${userZ}, receiver: ${userX})`);
    const result = await friendingConcept.denyRequest({
      sender: userZ,
      receiver: userX,
    });
    assertObjectMatch(
      result,
      { error: "Friend request not found." },
      "Should return error for non-existent request",
    );
  });

  await t.step("5. Friendship already exists (prevent duplicate friendships)", async () => {
    // First, complete a friendship X <-> Y
    await friendingConcept.acceptRequest({ sender: userX, receiver: userY });
    const friendsX = await friendingConcept._getFriends({ user: userX });
    assertEquals(friendsX.friends.includes(userY), true);

    console.log(`Action: sendRequest(sender: ${userX}, receiver: ${userY})`);
    const result = await friendingConcept.sendRequest({
      sender: userX,
      receiver: userY,
    });
    assertObjectMatch(
      result,
      { error: "Users are already friends." },
      "Should return error if friendship already exists",
    );
  });

  await t.step("6. Cannot remove non-existent friendship", async () => {
    console.log(
      `Action: removeFriend(user: ${userX}, to_be_removed_friend: ${userZ})`,
    );
    const result = await friendingConcept.removeFriend({
      user: userX,
      to_be_removed_friend: userZ,
    });
    assertObjectMatch(
      result,
      { error: "Friendship not found." },
      "Should return error for non-existent friendship",
    );
  });

  await client.close();
});
```
