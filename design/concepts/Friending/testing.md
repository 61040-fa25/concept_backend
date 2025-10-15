[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

[@concept-testing](../../../src/concepts/Friending/FriendingConcept.test.ts)

# test: Friending
# response:

```typescript
import { assertEquals, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import FriendingConcept from "./FriendingConcept.ts";

Deno.test("Friending Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const friendingConcept = new FriendingConcept(db);

  // Define some user IDs for testing
  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const userCharlie = "user:Charlie" as ID;
  const userDavid = "user:David" as ID;
  const userEve = "user:Eve" as ID;
  const userFrank = "user:Frank" as ID;
  const userGrace = "user:Grace" as ID;
  const userHeidi = "user:Heidi" as ID;
  const userIvan = "user:Ivan" as ID;

  console.log("\n--- Starting Friending Concept Tests ---");

  // --- Operational Principle Scenario ---
  await t.step(
    "Scenario: Operational Principle - Alice and Bob become friends",
    async () => {
      console.log(
        "Principle: Users can send friend requests, accept them, and become friends.",
      );

      // Alice sends a friend request to Bob
      console.log(`Action: Alice (${userAlice}) sends request to Bob (${userBob})`);
      const sendRequestResult = await friendingConcept.sendRequest({
        sender: userAlice,
        receiver: userBob,
      });
      console.log("Result:", sendRequestResult);
      assertNotEquals((sendRequestResult as { error?: string }).error, "A friend request between these users already exists.");
      assertNotEquals((sendRequestResult as { error?: string }).error, "Users are already friends.");
      assertEquals(
        typeof (sendRequestResult as { request: ID }).request,
        "string",
      );

      // Verify Bob received the request
      console.log(`Query: Get received requests for Bob (${userBob})`);
      const bobReceivedRequests = await friendingConcept._getReceivedFriendRequests(
        { receiver: userBob },
      );
      console.log("Result:", bobReceivedRequests);
      assertArrayIncludes(bobReceivedRequests.receivedRequests, [userAlice]);
      assertEquals(bobReceivedRequests.receivedRequests.length, 1);

      // Verify Alice sent the request
      console.log(`Query: Get sent requests for Alice (${userAlice})`);
      const aliceSentRequests = await friendingConcept._getSentFriendRequests({
        sender: userAlice,
      });
      console.log("Result:", aliceSentRequests);
      assertArrayIncludes(aliceSentRequests.sentRequests, [userBob]);
      assertEquals(aliceSentRequests.sentRequests.length, 1);

      // Bob accepts the friend request from Alice
      console.log(`Action: Bob (${userBob}) accepts request from Alice (${userAlice})`);
      const acceptRequestResult = await friendingConcept.acceptRequest({
        sender: userAlice,
        receiver: userBob,
      });
      console.log("Result:", acceptRequestResult);
      assertEquals((acceptRequestResult as { error?: string }).error, undefined);

      // Verify they are now friends
      console.log(`Query: Check if Alice and Bob are friends`);
      const areAliceBobFriends = await friendingConcept._isFriends({
        user1: userAlice,
        user2: userBob,
      });
      console.log("Result:", areAliceBobFriends);
      assertEquals(areAliceBobFriends.areFriends, [true]);

      console.log(`Query: Get friends for Alice (${userAlice})`);
      const aliceFriends = await friendingConcept._getFriends({ user: userAlice });
      console.log("Result:", aliceFriends);
      assertArrayIncludes(aliceFriends.friends, [userBob]);
      assertEquals(aliceFriends.friends.length, 1);

      console.log(`Query: Get friends for Bob (${userBob})`);
      const bobFriends = await friendingConcept._getFriends({ user: userBob });
      console.log("Result:", bobFriends);
      assertArrayIncludes(bobFriends.friends, [userAlice]);
      assertEquals(bobFriends.friends.length, 1);

      // Verify the friend request is removed
      console.log(`Query: Verify request between Alice and Bob is removed`);
      const bobReceivedRequestsAfterAccept = await friendingConcept._getReceivedFriendRequests(
        { receiver: userBob },
      );
      console.log("Result:", bobReceivedRequestsAfterAccept);
      assertEquals(bobReceivedRequestsAfterAccept.receivedRequests.length, 0);

      const aliceSentRequestsAfterAccept = await friendingConcept._getSentFriendRequests({
        sender: userAlice,
      });
      console.log("Result:", aliceSentRequestsAfterAccept);
      assertEquals(aliceSentRequestsAfterAccept.sentRequests.length, 0);
    },
  );

  // --- Interesting Scenario 1: Denying a request ---
  await t.step("Scenario: Denying a friend request", async () => {
    // Charlie sends a friend request to David
    console.log(`Action: Charlie (${userCharlie}) sends request to David (${userDavid})`);
    const sendRequestResult = await friendingConcept.sendRequest({
      sender: userCharlie,
      receiver: userDavid,
    });
    console.log("Result:", sendRequestResult);
    assertEquals(
      typeof (sendRequestResult as { request: ID }).request,
      "string",
    );

    // David denies the friend request from Charlie
    console.log(`Action: David (${userDavid}) denies request from Charlie (${userCharlie})`);
    const denyRequestResult = await friendingConcept.denyRequest({
      sender: userCharlie,
      receiver: userDavid,
    });
    console.log("Result:", denyRequestResult);
    assertEquals((denyRequestResult as { error?: string }).error, undefined);

    // Verify they are NOT friends
    console.log(`Query: Check if Charlie and David are friends`);
    const areCharlieDavidFriends = await friendingConcept._isFriends({
      user1: userCharlie,
      user2: userDavid,
    });
    console.log("Result:", areCharlieDavidFriends);
    assertEquals(areCharlieDavidFriends.areFriends, [false]);

    // Verify the friend request is removed
    console.log(`Query: Verify request between Charlie and David is removed`);
    const davidReceivedRequests = await friendingConcept._getReceivedFriendRequests(
      { receiver: userDavid },
    );
    console.log("Result:", davidReceivedRequests);
    assertEquals(davidReceivedRequests.receivedRequests.length, 0);
  });

  // --- Interesting Scenario 2: Invalid sendRequest calls (error cases) ---
  await t.step("Scenario: Invalid sendRequest calls", async () => {
    // 1. Sender cannot send a friend request to themselves
    console.log(`Action: Eve (${userEve}) sends request to herself (${userEve})`);
    const selfRequestResult = await friendingConcept.sendRequest({
      sender: userEve,
      receiver: userEve,
    });
    console.log("Result:", selfRequestResult);
    assertEquals(
      (selfRequestResult as { error: string }).error,
      "Sender cannot send a friend request to themselves.",
    );

    // 2. Request already exists (Eve -> Frank)
    console.log(`Action: Eve (${userEve}) sends request to Frank (${userFrank})`);
    const firstRequestResult = await friendingConcept.sendRequest({
      sender: userEve,
      receiver: userFrank,
    });
    console.log("Result:", firstRequestResult);
    assertNotEquals((firstRequestResult as { error?: string }).error, "A friend request between these users already exists.");

    console.log(`Action: Eve (${userEve}) sends request to Frank (${userFrank}) again`);
    const duplicateRequestResult = await friendingConcept.sendRequest({
      sender: userEve,
      receiver: userFrank,
    });
    console.log("Result:", duplicateRequestResult);
    assertEquals(
      (duplicateRequestResult as { error: string }).error,
      "A friend request between these users already exists.",
    );

    // 3. Request exists in reverse (Frank -> Eve after Eve -> Frank)
    console.log(`Action: Frank (${userFrank}) sends request to Eve (${userEve})`);
    const reverseRequestResult = await friendingConcept.sendRequest({
      sender: userFrank,
      receiver: userEve,
    });
    console.log("Result:", reverseRequestResult);
    assertEquals(
      (reverseRequestResult as { error: string }).error,
      "A friend request between these users already exists.",
    );

    // Cleanup: Frank denies Eve's request so we can test friendship later
    await friendingConcept.denyRequest({ sender: userEve, receiver: userFrank });

    // 4. Friendship already exists (Grace & Heidi are friends, then Grace tries to send request to Heidi)
    console.log(
      `Action: Grace (${userGrace}) sends request to Heidi (${userHeidi}) to establish friendship for next test`,
    );
    await friendingConcept.sendRequest({ sender: userGrace, receiver: userHeidi });
    console.log(
      `Action: Heidi (${userHeidi}) accepts request from Grace (${userGrace})`,
    );
    await friendingConcept.acceptRequest({ sender: userGrace, receiver: userHeidi });
    console.log(`Query: Verify Grace and Heidi are friends`);
    const areGraceHeidiFriends = await friendingConcept._isFriends({
      user1: userGrace,
      user2: userHeidi,
    });
    console.log("Result:", areGraceHeidiFriends);
    assertEquals(areGraceHeidiFriends.areFriends, [true]);

    console.log(`Action: Grace (${userGrace}) sends request to Heidi (${userHeidi}) when they are already friends`);
    const alreadyFriendsRequest = await friendingConcept.sendRequest({
      sender: userGrace,
      receiver: userHeidi,
    });
    console.log("Result:", alreadyFriendsRequest);
    assertEquals(
      (alreadyFriendsRequest as { error: string }).error,
      "Users are already friends.",
    );
  });

  // --- Interesting Scenario 3: Invalid acceptRequest / denyRequest calls ---
  await t.step("Scenario: Invalid accept/denyRequest calls", async () => {
    // No request exists (Ivan tries to accept request from Frank when none was sent)
    console.log(
      `Action: Ivan (${userIvan}) tries to accept request from Frank (${userFrank}) when no request exists`,
    );
    const invalidAcceptResult = await friendingConcept.acceptRequest({
      sender: userFrank,
      receiver: userIvan,
    });
    console.log("Result:", invalidAcceptResult);
    assertEquals(
      (invalidAcceptResult as { error: string }).error,
      "Friend request does not exist.",
    );

    // No request exists (Ivan tries to deny request from Frank when none was sent)
    console.log(
      `Action: Ivan (${userIvan}) tries to deny request from Frank (${userFrank}) when no request exists`,
    );
    const invalidDenyResult = await friendingConcept.denyRequest({
      sender: userFrank,
      receiver: userIvan,
    });
    console.log("Result:", invalidDenyResult);
    assertEquals(
      (invalidDenyResult as { error: string }).error,
      "Friend request does not exist.",
    );
  });

  // --- Interesting Scenario 4: removeFriend ---
  await t.step("Scenario: Removing an existing friendship", async () => {
    // Grace and Heidi are already friends from previous test
    console.log(`Query: Verify Grace and Heidi are friends`);
    const areGraceHeidiFriends = await friendingConcept._isFriends({
      user1: userGrace,
      user2: userHeidi,
    });
    console.log("Result:", areGraceHeidiFriends);
    assertEquals(areGraceHeidiFriends.areFriends, [true]);

    // Grace removes Heidi as a friend
    console.log(`Action: Grace (${userGrace}) removes Heidi (${userHeidi}) as friend`);
    const removeFriendResult = await friendingConcept.removeFriend({
      user: userGrace,
      to_be_removed_friend: userHeidi,
    });
    console.log("Result:", removeFriendResult);
    assertEquals((removeFriendResult as { error?: string }).error, undefined);

    // Verify they are no longer friends
    console.log(`Query: Check if Grace and Heidi are friends after removal`);
    const areGraceHeidiFriendsAfterRemove = await friendingConcept._isFriends({
      user1: userGrace,
      user2: userHeidi,
    });
    console.log("Result:", areGraceHeidiFriendsAfterRemove);
    assertEquals(areGraceHeidiFriendsAfterRemove.areFriends, [false]);

    // Verify removing non-existent friendship returns error
    console.log(`Action: Grace (${userGrace}) tries to remove Heidi (${userHeidi}) again`);
    const removeNonExistentFriendship = await friendingConcept.removeFriend({
      user: userGrace,
      to_be_removed_friend: userHeidi,
    });
    console.log("Result:", removeNonExistentFriendship);
    assertEquals(
      (removeNonExistentFriendship as { error: string }).error,
      "Friendship does not exist.",
    );
  });

  // --- Interesting Scenario 5: Multiple friends/requests and query validation ---
  await t.step("Scenario: Complex query validation with multiple relationships", async () => {
    // Set up multiple relationships for userAlice
    const userX = "user:UserX" as ID;
    const userY = "user:UserY" as ID;
    const userZ = "user:UserZ" as ID;
    const userW = "user:UserW" as ID;
    const userA = "user:UserA" as ID; // Different from userAlice at top

    // UserX makes friends with UserY
    console.log(`Action: UserX sends request to UserY`);
    await friendingConcept.sendRequest({ sender: userX, receiver: userY });
    console.log(`Action: UserY accepts request from UserX`);
    await friendingConcept.acceptRequest({ sender: userX, receiver: userY });

    // UserX makes friends with UserZ
    console.log(`Action: UserX sends request to UserZ`);
    await friendingConcept.sendRequest({ sender: userX, receiver: userZ });
    console.log(`Action: UserZ accepts request from UserX`);
    await friendingConcept.acceptRequest({ sender: userX, receiver: userZ });

    // UserX sends request to UserW
    console.log(`Action: UserX sends request to UserW`);
    await friendingConcept.sendRequest({ sender: userX, receiver: userW });

    // UserA sends request to UserX
    console.log(`Action: UserA sends request to UserX`);
    await friendingConcept.sendRequest({ sender: userA, receiver: userX });

    // Validate friends of UserX
    console.log(`Query: Get friends for UserX (${userX})`);
    const userXFriends = await friendingConcept._getFriends({ user: userX });
    console.log("Result:", userXFriends);
    assertEquals(userXFriends.friends.length, 2);
    assertArrayIncludes(userXFriends.friends, [userY, userZ]);

    // Validate sent requests by UserX
    console.log(`Query: Get sent requests for UserX (${userX})`);
    const userXSentRequests = await friendingConcept._getSentFriendRequests({
      sender: userX,
    });
    console.log("Result:", userXSentRequests);
    assertEquals(userXSentRequests.sentRequests.length, 1);
    assertArrayIncludes(userXSentRequests.sentRequests, [userW]);

    // Validate received requests by UserX
    console.log(`Query: Get received requests for UserX (${userX})`);
    const userXReceivedRequests = await friendingConcept._getReceivedFriendRequests(
      { receiver: userX },
    );
    console.log("Result:", userXReceivedRequests);
    assertEquals(userXReceivedRequests.receivedRequests.length, 1);
    assertArrayIncludes(userXReceivedRequests.receivedRequests, [userA]);

    // Test reverse _isFriends check
    console.log(`Query: Check if UserY and UserX are friends`);
    const areYXFriends = await friendingConcept._isFriends({
      user1: userY,
      user2: userX,
    });
    console.log("Result:", areYXFriends);
    assertEquals(areYXFriends.areFriends, [true]);
  });

  console.log("--- Friending Concept Tests Complete ---");
  await client.close();
});
```