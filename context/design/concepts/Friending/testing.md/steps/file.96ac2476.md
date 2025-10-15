---
timestamp: 'Wed Oct 15 2025 00:53:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_005332.d1f00297.md]]'
content_id: 96ac24766a2ff813cfc9fd4a064d57dd8765a2b0c49745ff9341b4306ecc033b
---

# file: src/concepts/Friending/FriendingConcept.test.ts

```typescript
import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts";
import FriendingConcept from "./FriendingConcept.ts";
import { ID } from "../../utils/types.ts";

Deno.test("Friending Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const friendingConcept = new FriendingConcept(db);

  // Define some test users
  const userA = "user:Alice" as ID;
  const userB = "user:Bob" as ID;
  const userC = "user:Charlie" as ID;
  const userD = "user:David" as ID;

  await t.step("Operational Principle: Send, Accept, and Remove", async () => {
    console.log("\n--- Operational Principle Test: Friend Request Lifecycle ---");
    console.log(`Testing the core flow: send request, accept, then remove friend.`);

    // Scenario 1: User A sends a request to User B, User B accepts.
    console.log(`\n--- Sub-scenario: ${userA} sends request to ${userB}, ${userB} accepts ---`);
    console.log(`ACTION: ${userA} sends a friend request to ${userB}.`);
    const sendResult = await friendingConcept.sendRequest({
      sender: userA,
      receiver: userB,
    });
    assertEquals(sendResult, {}, "VERIFICATION: sendRequest should succeed with no error.");
    console.log(`RESULT: Friend request from ${userA} to ${userB} sent successfully.`);

    console.log(`\nVERIFICATION: Check pending requests for ${userB} and ${userA}.`);
    const bReceivedRequests = await friendingConcept._getReceivedFriendRequests(
      { user: userB },
    );
    assertEquals(
      bReceivedRequests.length,
      1,
      `VERIFICATION: ${userB} should have 1 received request.`,
    );
    assertEquals(
      bReceivedRequests[0].sender,
      userA,
      `VERIFICATION: ${userB} received request from ${userA}.`,
    );
    assertEquals(
      bReceivedRequests[0].receiver,
      userB,
      `VERIFICATION: The received request is for ${userB}.`,
    );
    console.log(`INFO: ${userB} has a pending request from ${userA}.`);

    const aSentRequests = await friendingConcept._getSentFriendRequests({
      user: userA,
    });
    assertEquals(aSentRequests.length, 1, `VERIFICATION: ${userA} should have 1 sent request.`);
    assertEquals(aSentRequests[0].sender, userA, `VERIFICATION: ${userA} sent request from ${userA}.`);
    assertEquals(aSentRequests[0].receiver, userB, `VERIFICATION: ${userA} sent request for ${userB}.`);
    console.log(`INFO: ${userA} has a pending request sent to ${userB}.`);

    console.log(`\nACTION: ${userB} accepts the friend request from ${userA}.`);
    const acceptResult = await friendingConcept.acceptRequest({
      sender: userA,
      receiver: userB,
    });
    assertEquals(acceptResult, {}, "VERIFICATION: acceptRequest should succeed with no error.");
    console.log(`RESULT: Friend request from ${userA} to ${userB} accepted successfully.`);

    console.log(`\nVERIFICATION: Check if friend request is removed after acceptance.`);
    const bReceivedRequestsAfterAccept = await friendingConcept
      ._getReceivedFriendRequests({ user: userB });
    assertEquals(
      bReceivedRequestsAfterAccept.length,
      0,
      `VERIFICATION: ${userB} should have 0 received requests after accept.`,
    );
    console.log(`INFO: ${userB}'s received requests list is now empty.`);

    const aSentRequestsAfterAccept = await friendingConcept
      ._getSentFriendRequests({ user: userA });
    assertEquals(
      aSentRequestsAfterAccept.length,
      0,
      `VERIFICATION: ${userA} should have 0 sent requests after accept.`,
    );
    console.log(`INFO: ${userA}'s sent requests list is now empty.`);

    console.log(`\nVERIFICATION: Check if friendship exists between ${userA} and ${userB}.`);
    let friendsA = await friendingConcept._getFriends({ user: userA });
    assertEquals(friendsA.friends.length, 1, `VERIFICATION: ${userA} should now have 1 friend.`);
    assertEquals(friendsA.friends[0], userB, `VERIFICATION: ${userA}'s friend should be ${userB}.`);
    console.log(`INFO: ${userA} is now friends with ${userB}.`);

    let friendsB = await friendingConcept._getFriends({ user: userB });
    assertEquals(friendsB.friends.length, 1, `VERIFICATION: ${userB} should now have 1 friend.`);
    assertEquals(friendsB.friends[0], userA, `VERIFICATION: ${userB}'s friend should be ${userA}.`);
    console.log(`INFO: ${userB} is now friends with ${userA}.`);

    // Scenario 2: User A removes User B as a friend
    console.log(`\n--- Sub-scenario: ${userA} removes ${userB} as friend ---`);
    console.log(`ACTION: ${userA} removes ${userB} as a friend.`);
    const removeResult = await friendingConcept.removeFriend({
      user: userA,
      to_be_removed_friend: userB,
    });
    assertEquals(removeResult, {}, "VERIFICATION: removeFriend should succeed with no error.");
    console.log(`RESULT: Friendship between ${userA} and ${userB} removed successfully.`);

    console.log(`\nVERIFICATION: Check if friendship is gone after removal.`);
    friendsA = await friendingConcept._getFriends({ user: userA });
    assertEquals(
      friendsA.friends.length,
      0,
      `VERIFICATION: ${userA} should have no friends after removal.`,
    );
    console.log(`INFO: ${userA} no longer has any friends.`);

    friendsB = await friendingConcept._getFriends({ user: userB });
    assertEquals(
      friendsB.friends.length,
      0,
      `VERIFICATION: ${userB} should have no friends after removal.`,
    );
    console.log(`INFO: ${userB} no longer has any friends.`);
  });

  await t.step("Interesting Scenario 1: Denying a Request", async () => {
    console.log("\n--- Interesting Scenario 1: Denying a Request ---");
    console.log(`Testing the flow where a friend request is denied.`);

    // User A sends request to User B
    console.log(`\nACTION: ${userA} sends a friend request to ${userB}.`);
    const sendResult = await friendingConcept.sendRequest({
      sender: userA,
      receiver: userB,
    });
    assertEquals(sendResult, {}, "VERIFICATION: sendRequest should succeed.");
    console.log(`RESULT: Friend request from ${userA} to ${userB} sent successfully.`);

    console.log(`\nVERIFICATION: Check pending requests for ${userA} and ${userB}.`);
    const aSentRequests = await friendingConcept._getSentFriendRequests({
      user: userA,
    });
    assertEquals(aSentRequests.length, 1, `VERIFICATION: ${userA} should have 1 sent request.`);
    assertEquals(aSentRequests[0].sender, userA, `VERIFICATION: ${userA} sent request from ${userA}.`);
    assertEquals(aSentRequests[0].receiver, userB, `VERIFICATION: ${userA} sent request for ${userB}.`);
    console.log(`INFO: ${userA} has a pending request sent to ${userB}.`);

    const bReceivedRequests = await friendingConcept._getReceivedFriendRequests({ // Corrected from _getSentFriendRequests
      user: userB,
    });
    assertEquals(
      bReceivedRequests.length,
      1,
      `VERIFICATION: ${userB} should have 1 received request.`,
    );
    assertEquals(
      bReceivedRequests[0].sender,
      userA,
      `VERIFICATION: ${userB} received request from ${userA}.`,
    );
    assertEquals(
      bReceivedRequests[0].receiver,
      userB,
      `VERIFICATION: The received request is for ${userB}.`,
    );
    console.log(`INFO: ${userB} has a pending request from ${userA}.`);

    // User B denies the request from User A
    console.log(`\nACTION: ${userB} denies the friend request from ${userA}.`);
    const denyResult = await friendingConcept.denyRequest({
      sender: userA,
      receiver: userB,
    });
    assertEquals(denyResult, {}, "VERIFICATION: denyRequest should succeed.");
    console.log(`RESULT: Friend request from ${userA} to ${userB} denied successfully.`);

    console.log(`\nVERIFICATION: Check if friend request is removed after denial.`);
    const bReceivedRequestsAfterDeny = await friendingConcept
      ._getReceivedFriendRequests(
        { user: userB }, // Corrected from userC
      );
    assertEquals(
      bReceivedRequestsAfterDeny.length,
      0,
      `VERIFICATION: ${userB} should have 0 received requests after deny.`,
    );
    console.log(`INFO: ${userB}'s received requests list is now empty.`);

    const aSentRequestsAfterDeny = await friendingConcept._getSentFriendRequests({
      user: userA,
    });
    assertEquals(
      aSentRequestsAfterDeny.length,
      0,
      `VERIFICATION: ${userA} should have 0 sent requests after deny.`,
    );
    console.log(`INFO: ${userA}'s sent requests list is now empty.`);

    console.log(`\nVERIFICATION: Check if no friendship was created.`);
    const friendsA = await friendingConcept._getFriends({ user: userA });
    assertEquals(friendsA.friends.length, 0, `VERIFICATION: ${userA} should have no friends.`);
    console.log(`INFO: No friendship was formed between ${userA} and ${userB}.`);
  });

  await t.step("Interesting Scenario 2: Invalid Request Attempts", async () => {
    console.log("\n--- Interesting Scenario 2: Invalid Request Attempts ---");
    console.log(`Testing various invalid scenarios for sending friend requests.`);

    // Attempt to send request to self
    console.log(`\nACTION: ${userA} attempts to send a friend request to ${userA} (self).`);
    const selfRequestResult = await friendingConcept.sendRequest({
      sender: userA,
      receiver: userA,
    });
    assertNotEquals(
      selfRequestResult,
      {},
      "VERIFICATION: sendRequest to self should return an error.",
    );
    assertEquals(
      (selfRequestResult as { error: string }).error,
      "Cannot send friend request to self.",
      "VERIFICATION: Error message should indicate sending to self.",
    );
    console.log(`RESULT: Correctly prevented ${userA} from sending request to self.`);

    // Send a valid request first for subsequent tests
    console.log(`\nINFO: Setting up a valid request: ${userC} sends request to ${userD}.`);
    await friendingConcept.sendRequest({ sender: userC, receiver: userD });
    console.log(`RESULT: Request from ${userC} to ${userD} sent.`);

    // Attempt to send duplicate request (C -> D)
    console.log(
      `\nACTION: ${userC} attempts to send a duplicate request to ${userD} (already pending).`,
    );
    const dupRequestCD = await friendingConcept.sendRequest({
      sender: userC,
      receiver: userD,
    });
    assertNotEquals(
      dupRequestCD,
      {},
      "VERIFICATION: duplicate sendRequest (C->D) should return an error.",
    );
    assertEquals(
      (dupRequestCD as { error: string }).error,
      "Friend request already exists or is pending.",
      "VERIFICATION: Error message should indicate existing request.",
    );
    console.log(`RESULT: Correctly prevented duplicate request from ${userC} to ${userD}.`);

    // Attempt to send reverse request (D -> C) while C->D is pending
    console.log(
      `\nACTION: ${userD} attempts to send a request to ${userC} (reverse while C->D pending).`,
    );
    const reverseRequestDC = await friendingConcept.sendRequest({
      sender: userD,
      receiver: userC,
    });
    assertNotEquals(
      reverseRequestDC,
      {},
      "VERIFICATION: reverse sendRequest (D->C) should return an error if C->D pending.",
    );
    assertEquals(
      (reverseRequestDC as { error: string }).error,
      "Friend request already exists or is pending.",
      "VERIFICATION: Error message should indicate existing request.",
    );
    console.log(`RESULT: Correctly prevented reverse request from ${userD} to ${userC} while ${userC} -> ${userD} is pending.`);

    // Accept the pending request (C and D become friends)
    console.log(`\nINFO: Accepting the pending request from ${userC} to ${userD} to create a friendship.`);
    await friendingConcept.acceptRequest({ sender: userC, receiver: userD });
    console.log(`RESULT: ${userC} and ${userD} are now friends.`);

    // Attempt to send request to an existing friend (C -> D)
    console.log(
      `\nACTION: ${userC} attempts to send a request to existing friend ${userD}.`,
    );
    const requestToFriend = await friendingConcept.sendRequest({
      sender: userC,
      receiver: userD,
    });
    assertNotEquals(
      requestToFriend,
      {},
      "VERIFICATION: sendRequest to an existing friend should return an error.",
    );
    assertEquals(
      (requestToFriend as { error: string }).error,
      "Users are already friends.",
      "VERIFICATION: Error message should indicate existing friendship.",
    );
    console.log(`RESULT: Correctly prevented sending request to an existing friend.`);

    // Clean up
    console.log(`\nCLEANUP: Removing friendship between ${userC} and ${userD}.`);
    await friendingConcept.removeFriend({
      user: userC,
      to_be_removed_friend: userD,
    });
    console.log(`CLEANUP: Friendship between ${userC} and ${userD} removed.`);
  });

  await t.step(
    "Interesting Scenario 3: Attempts on Non-existent Requests/Friendships",
    async () => {
      console.log(
        "\n--- Interesting Scenario 3: Attempts on Non-existent Requests/Friendships ---",
      );
      console.log(`Testing actions on non-existent data.`);

      // Attempt to accept a non-existent request
      console.log(
        `\nACTION: ${userA} attempts to accept a non-existent request from ${userC}.`,
      );
      const nonExistentAccept = await friendingConcept.acceptRequest({
        sender: userC,
        receiver: userA,
      });
      assertNotEquals(
        nonExistentAccept,
        {},
        "VERIFICATION: acceptRequest for non-existent request should return an error.",
      );
      assertEquals(
        (nonExistentAccept as { error: string }).error,
        "Friend request not found.",
        "VERIFICATION: Error message should indicate request not found.",
      );
      console.log(`RESULT: Correctly prevented accepting a non-existent request.`);

      // Attempt to deny a non-existent request
      console.log(
        `\nACTION: ${userA} attempts to deny a non-existent request from ${userC}.`,
      );
      const nonExistentDeny = await friendingConcept.denyRequest({
        sender: userC,
        receiver: userA,
      });
      assertNotEquals(
        nonExistentDeny,
        {},
        "VERIFICATION: denyRequest for non-existent request should return an error.",
      );
      assertEquals(
        (nonExistentDeny as { error: string }).error,
        "Friend request not found.",
        "VERIFICATION: Error message should indicate request not found.",
      );
      console.log(`RESULT: Correctly prevented denying a non-existent request.`);

      // Attempt to remove a non-existent friendship
      console.log(
        `\nACTION: ${userA} attempts to remove non-existent friend ${userC}.`,
      );
      const nonExistentRemove = await friendingConcept.removeFriend({
        user: userA,
        to_be_removed_friend: userC,
      });
      assertNotEquals(
        nonExistentRemove,
        {},
        "VERIFICATION: removeFriend for non-existent friendship should return an error.",
      );
      assertEquals(
        (nonExistentRemove as { error: string }).error,
        "Friendship not found.",
        "VERIFICATION: Error message should indicate friendship not found.",
      );
      console.log(`RESULT: Correctly prevented removing a non-existent friendship.`);
    },
  );

  await t.step("Interesting Scenario 4: Multiple Friends", async () => {
    console.log("\n--- Interesting Scenario 4: Multiple Friends ---");
    console.log(`Testing a user having multiple friends.`);

    // User A friends User B
    console.log(`\nACTION: ${userA} sends request to ${userB}.`);
    await friendingConcept.sendRequest({ sender: userA, receiver: userB });
    console.log(`ACTION: ${userB} accepts request from ${userA}.`);
    await friendingConcept.acceptRequest({ sender: userA, receiver: userB });
    console.log(`RESULT: ${userA} and ${userB} are now friends.`);

    // User A friends User C
    console.log(`\nACTION: ${userA} sends request to ${userC}.`);
    await friendingConcept.sendRequest({ sender: userA, receiver: userC });
    console.log(`ACTION: ${userC} accepts request from ${userA}.`);
    await friendingConcept.acceptRequest({ sender: userA, receiver: userC });
    console.log(`RESULT: ${userA} and ${userC} are now friends.`);

    console.log(`\nVERIFICATION: Check ${userA} has multiple friends.`);
    const friendsA = await friendingConcept._getFriends({ user: userA });
    assertEquals(
      friendsA.friends.length,
      2,
      `VERIFICATION: ${userA} should have 2 friends.`,
    );
    assertEquals(
      new Set(friendsA.friends),
      new Set([userB, userC]),
      `VERIFICATION: ${userA}'s friends should be ${userB} and ${userC}.`,
    );
    console.log(`INFO: ${userA} has friends: ${friendsA.friends.join(", ")}.`);


    console.log(`\nVERIFICATION: Check ${userB} has 1 friend.`);
    const friendsB = await friendingConcept._getFriends({ user: userB });
    assertEquals(friendsB.friends.length, 1, `VERIFICATION: ${userB} should have 1 friend.`);
    assertEquals(friendsB.friends[0], userA, `VERIFICATION: ${userB}'s friend should be ${userA}.`);
    console.log(`INFO: ${userB} has friend: ${friendsB.friends[0]}.`);

    console.log(`\nVERIFICATION: Check ${userC} has 1 friend.`);
    const friendsC = await friendingConcept._getFriends({ user: userC });
    assertEquals(friendsC.friends.length, 1, `VERIFICATION: ${userC} should have 1 friend.`);
    assertEquals(friendsC.friends[0], userA, `VERIFICATION: ${userC}'s friend should be ${userA}.`);
    console.log(`INFO: ${userC} has friend: ${friendsC.friends[0]}.`);

    // Clean up
    console.log(`\nCLEANUP: Removing friendships for ${userA}.`);
    console.log(`CLEANUP: Removing friendship between ${userA} and ${userB}.`);
    await friendingConcept.removeFriend({
      user: userA,
      to_be_removed_friend: userB,
    });
    console.log(`CLEANUP: Removing friendship between ${userA} and ${userC}.`);
    await friendingConcept.removeFriend({
      user: userA,
      to_be_removed_friend: userC,
    });
    console.log(`CLEANUP: All friendships removed.`);
  });

  // Ensure all actions are executed successfully at least once.
  // sendRequest, acceptRequest, denyRequest, removeFriend are covered.
  // _getFriends, _getSentFriendRequests, _getReceivedFriendRequests queries are covered.

  await client.close();
  console.log("\n--- All Friending Concept Tests Completed ---");
});

```
