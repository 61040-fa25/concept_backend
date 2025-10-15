---
timestamp: 'Wed Oct 15 2025 01:25:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_012558.7987f024.md]]'
content_id: 4fc764ec3d2853af62d92289616e74928dc06abd46da518ddd2794d359483b62
---

# response:

```typescript
import { assertEquals, assertObjectMatch, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import FriendingConcept from "./FriendingConcept.ts";

// Define test user IDs
const userAlice = "user:alice" as ID;
const userBob = "user:bob" as ID;
const userCharlie = "user:charlie" as ID;
const userDavid = "user:david" as ID;
const userEve = "user:eve" as ID;
const userFrank = "user:frank" as ID;
const userGrace = "user:grace" as ID;
const userHeidi = "user:heidi" as ID;

Deno.test("Friending Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const friendingConcept = new FriendingConcept(db);

  t.beforeAll(async () => {
    // Clear collections for clean slate before all tests in this file
    await friendingConcept.friendships.deleteMany({});
    await friendingConcept.friendRequests.deleteMany({});
  });

  t.afterAll(async () => {
    await client.close();
  });

  await t.step("Operational Principle: User A sends request to B, B accepts", async () => {
    console.log("\n--- Operational Principle Test ---");

    // Initial check: Alice and Bob are not friends, no requests
    const initialAreFriends = await friendingConcept._isFriends({ user1: userAlice, user2: userBob });
    assertEquals(initialAreFriends.areFriends, [false]);
    console.log(`Initial: Alice and Bob are friends? ${initialAreFriends.areFriends[0]}`);

    const aliceSentRequestsInitial = await friendingConcept._getSentFriendRequests({ sender: userAlice });
    assertEquals(aliceSentRequestsInitial.sentRequests, []);
    console.log(`Initial: Alice sent requests: ${aliceSentRequestsInitial.sentRequests.length}`);

    const bobReceivedRequestsInitial = await friendingConcept._getReceivedFriendRequests({ receiver: userBob });
    assertEquals(bobReceivedRequestsInitial.receivedRequests, []);
    console.log(`Initial: Bob received requests: ${bobReceivedRequestsInitial.receivedRequests.length}`);


    // Step 1: Alice sends a friend request to Bob
    console.log(`Action: Alice (${userAlice}) sends friend request to Bob (${userBob})`);
    const sendResult = await friendingConcept.sendRequest({ sender: userAlice, receiver: userBob });
    assertObjectMatch(sendResult, { request: /^[0-9a-f]{24}$/ });
    const requestId = (sendResult as { request: ID }).request;
    console.log(`Output: Request ID created: ${requestId}`);

    // Verify request exists
    const aliceSentRequests = await friendingConcept._getSentFriendRequests({ sender: userAlice });
    assertEquals(aliceSentRequests.sentRequests, [userBob]);
    console.log(`Verification: Alice's sent requests: ${aliceSentRequests.sentRequests}`);

    const bobReceivedRequests = await friendingConcept._getReceivedFriendRequests({ receiver: userBob });
    assertEquals(bobReceivedRequests.receivedRequests, [userAlice]);
    console.log(`Verification: Bob's received requests: ${bobReceivedRequests.receivedRequests}`);

    // Alice and Bob should still not be friends
    const areFriendsAfterSend = await friendingConcept._isFriends({ user1: userAlice, user2: userBob });
    assertEquals(areFriendsAfterSend.areFriends, [false]);
    console.log(`Verification: Alice and Bob are friends after send? ${areFriendsAfterSend.areFriends[0]}`);

    // Step 2: Bob accepts the friend request from Alice
    console.log(`Action: Bob (${userBob}) accepts friend request from Alice (${userAlice})`);
    const acceptResult = await friendingConcept.acceptRequest({ sender: userAlice, receiver: userBob });
    assertEquals(acceptResult, {});
    console.log(`Output: Request accepted.`);

    // Verify request is removed
    const aliceSentRequestsAfterAccept = await friendingConcept._getSentFriendRequests({ sender: userAlice });
    assertEquals(aliceSentRequestsAfterAccept.sentRequests, []);
    console.log(`Verification: Alice's sent requests after accept: ${aliceSentRequestsAfterAccept.sentRequests.length}`);

    const bobReceivedRequestsAfterAccept = await friendingConcept._getReceivedFriendRequests({ receiver: userBob });
    assertEquals(bobReceivedRequestsAfterAccept.receivedRequests, []);
    console.log(`Verification: Bob's received requests after accept: ${bobReceivedRequestsAfterAccept.receivedRequests.length}`);

    // Verify friendship exists
    const areFriendsAfterAccept = await friendingConcept._isFriends({ user1: userAlice, user2: userBob });
    assertEquals(areFriendsAfterAccept.areFriends, [true]);
    console.log(`Verification: Alice and Bob are friends after accept? ${areFriendsAfterAccept.areFriends[0]}`);

    const aliceFriends = await friendingConcept._getFriends({ user: userAlice });
    assertEquals(aliceFriends.friends, [userBob]);
    console.log(`Verification: Alice's friends: ${aliceFriends.friends}`);

    const bobFriends = await friendingConcept._getFriends({ user: userBob });
    assertEquals(bobFriends.friends, [userAlice]);
    console.log(`Verification: Bob's friends: ${bobFriends.friends}`);
  });

  await t.step("Scenario 1: Denying a friend request", async () => {
    console.log("\n--- Scenario 1: Denying Request ---");
    // Alice sends request to Charlie
    console.log(`Action: Alice (${userAlice}) sends friend request to Charlie (${userCharlie})`);
    const sendResult = await friendingConcept.sendRequest({ sender: userAlice, receiver: userCharlie });
    assertObjectMatch(sendResult, { request: /^[0-9a-f]{24}$/ });
    console.log(`Output: Request sent.`);

    const charlieReceivedRequests = await friendingConcept._getReceivedFriendRequests({ receiver: userCharlie });
    assertEquals(charlieReceivedRequests.receivedRequests, [userAlice]);
    console.log(`Verification: Charlie received request from: ${charlieReceivedRequests.receivedRequests}`);

    // Charlie denies the request
    console.log(`Action: Charlie (${userCharlie}) denies friend request from Alice (${userAlice})`);
    const denyResult = await friendingConcept.denyRequest({ sender: userAlice, receiver: userCharlie });
    assertEquals(denyResult, {});
    console.log(`Output: Request denied.`);

    // Verify request is removed
    const charlieReceivedRequestsAfterDeny = await friendingConcept._getReceivedFriendRequests({ receiver: userCharlie });
    assertEquals(charlieReceivedRequestsAfterDeny.receivedRequests, []);
    console.log(`Verification: Charlie received requests after deny: ${charlieReceivedRequestsAfterDeny.receivedRequests.length}`);

    const aliceSentRequestsAfterDeny = await friendingConcept._getSentFriendRequests({ sender: userAlice });
    assertEquals(aliceSentRequestsAfterDeny.sentRequests.filter(u => u === userCharlie).length, 0); // Ensure Charlie is not in Alice's sent list
    console.log(`Verification: Alice's sent requests after deny (excluding Charlie): ${aliceSentRequestsAfterDeny.sentRequests}`);


    // Verify they are not friends
    const areFriends = await friendingConcept._isFriends({ user1: userAlice, user2: userCharlie });
    assertEquals(areFriends.areFriends, [false]);
    console.log(`Verification: Alice and Charlie are friends? ${areFriends.areFriends[0]}`);
  });

  await t.step("Scenario 2: Sending request to self (invalid)", async () => {
    console.log("\n--- Scenario 2: Send Request to Self ---");
    console.log(`Action: David (${userDavid}) attempts to send friend request to himself`);
    const result = await friendingConcept.sendRequest({ sender: userDavid, receiver: userDavid });
    assertObjectMatch(result, { error: "Sender cannot send a friend request to themselves." });
    console.log(`Output: ${JSON.stringify(result)}`);
  });

  await t.step("Scenario 3: Request already exists (invalid)", async () => {
    console.log("\n--- Scenario 3: Request Already Exists ---");
    // Eve sends request to Frank
    console.log(`Action: Eve (${userEve}) sends friend request to Frank (${userFrank})`);
    await friendingConcept.sendRequest({ sender: userEve, receiver: userFrank });
    console.log(`Output: Request sent.`);

    // Eve tries to send again to Frank
    console.log(`Action: Eve (${userEve}) attempts to send another request to Frank (${userFrank})`);
    const result = await friendingConcept.sendRequest({ sender: userEve, receiver: userFrank });
    assertObjectMatch(result, { error: "A friend request between these users already exists." });
    console.log(`Output: ${JSON.stringify(result)}`);

    // Frank tries to send a request to Eve (should also fail as one exists)
    console.log(`Action: Frank (${userFrank}) attempts to send a request to Eve (${userEve})`);
    const resultReverse = await friendingConcept.sendRequest({ sender: userFrank, receiver: userEve });
    assertObjectMatch(resultReverse, { error: "A friend request between these users already exists." });
    console.log(`Output: ${JSON.stringify(resultReverse)}`);
  });

  await t.step("Scenario 4: Already friends (invalid)", async () => {
    console.log("\n--- Scenario 4: Already Friends ---");
    // Grace sends request to Heidi, Heidi accepts (make them friends)
    console.log(`Action: Grace (${userGrace}) sends request to Heidi (${userHeidi})`);
    await friendingConcept.sendRequest({ sender: userGrace, receiver: userHeidi });
    console.log(`Action: Heidi (${userHeidi}) accepts request from Grace (${userGrace})`);
    await friendingConcept.acceptRequest({ sender: userGrace, receiver: userHeidi });
    console.log(`Output: Grace and Heidi are now friends.`);

    // Grace tries to send another request to Heidi
    console.log(`Action: Grace (${userGrace}) attempts to send another request to Heidi (${userHeidi})`);
    const result = await friendingConcept.sendRequest({ sender: userGrace, receiver: userHeidi });
    assertObjectMatch(result, { error: "Users are already friends." });
    console.log(`Output: ${JSON.stringify(result)}`);

    // Heidi tries to send a request to Grace
    console.log(`Action: Heidi (${userHeidi}) attempts to send a request to Grace (${userGrace})`);
    const resultReverse = await friendingConcept.sendRequest({ sender: userHeidi, receiver: userGrace });
    assertObjectMatch(resultReverse, { error: "Users are already friends." });
    console.log(`Output: ${JSON.stringify(resultReverse)}`);
  });

  await t.step("Scenario 5: Removing an existing friendship", async () => {
    console.log("\n--- Scenario 5: Removing a Friend ---");
    // Make Alice and Bob friends again (if not already from previous tests, which they should be)
    // First, ensure any requests/friendships are cleared for Alice and Bob for this specific test
    await friendingConcept.friendRequests.deleteMany({
        $or: [
            { sender: userAlice, receiver: userBob },
            { sender: userBob, receiver: userAlice }
        ]
    });
    await friendingConcept.friendships.deleteMany({
        $or: [
            { friend1: userAlice, friend2: userBob },
            { friend1: userBob, friend2: userAlice }
        ]
    });

    console.log(`Setup: Alice (${userAlice}) sends request to Bob (${userBob})`);
    await friendingConcept.sendRequest({ sender: userAlice, receiver: userBob });
    console.log(`Setup: Bob (${userBob}) accepts request from Alice (${userAlice})`);
    await friendingConcept.acceptRequest({ sender: userAlice, receiver: userBob });
    console.log(`Output: Alice and Bob are friends.`);

    const friendsBeforeRemoval = await friendingConcept._isFriends({ user1: userAlice, user2: userBob });
    assertEquals(friendsBeforeRemoval.areFriends, [true]);
    console.log(`Verification: Alice and Bob are friends before removal? ${friendsBeforeRemoval.areFriends[0]}`);


    // Alice removes Bob as a friend
    console.log(`Action: Alice (${userAlice}) removes Bob (${userBob}) as a friend`);
    const removeResult = await friendingConcept.removeFriend({ user: userAlice, to_be_removed_friend: userBob });
    assertEquals(removeResult, {});
    console.log(`Output: Bob removed from Alice's friends.`);

    // Verify friendship is removed
    const friendsAfterRemoval = await friendingConcept._isFriends({ user1: userAlice, user2: userBob });
    assertEquals(friendsAfterRemoval.areFriends, [false]);
    console.log(`Verification: Alice and Bob are friends after removal? ${friendsAfterRemoval.areFriends[0]}`);

    const aliceFriendsAfterRemoval = await friendingConcept._getFriends({ user: userAlice });
    assertEquals(aliceFriendsAfterRemoval.friends, []);
    console.log(`Verification: Alice's friends after removal: ${aliceFriendsAfterRemoval.friends}`);

    const bobFriendsAfterRemoval = await friendingConcept._getFriends({ user: userBob });
    assertEquals(bobFriendsAfterRemoval.friends, []);
    console.log(`Verification: Bob's friends after removal: ${bobFriendsAfterRemoval.friends}`);

    // Attempt to remove non-existent friendship
    console.log(`Action: Alice (${userAlice}) attempts to remove Bob (${userBob}) again (non-existent)`);
    const removeNonExistentResult = await friendingConcept.removeFriend({ user: userAlice, to_be_removed_friend: userBob });
    assertObjectMatch(removeNonExistentResult, { error: "Friendship does not exist." });
    console.log(`Output: ${JSON.stringify(removeNonExistentResult)}`);
  });

  await t.step("Scenario 6: _isFriends query variations", async () => {
    console.log("\n--- Scenario 6: _isFriends Query ---");
    // Self
    const selfFriends = await friendingConcept._isFriends({ user1: userAlice, user2: userAlice });
    assertEquals(selfFriends.areFriends, [false]);
    console.log(`Verification: Alice is friend with self? ${selfFriends.areFriends[0]}`);

    // Known friends (e.g., Grace and Heidi were made friends in Scenario 4)
    const graceHeidiFriends = await friendingConcept._isFriends({ user1: userGrace, user2: userHeidi });
    assertEquals(graceHeidiFriends.areFriends, [true]);
    console.log(`Verification: Grace and Heidi are friends? ${graceHeidiFriends.areFriends[0]}`);

    // Known not friends (e.g., Alice and Charlie from Scenario 1)
    const aliceCharlieFriends = await friendingConcept._isFriends({ user1: userAlice, user2: userCharlie });
    assertEquals(aliceCharlieFriends.areFriends, [false]);
    console.log(`Verification: Alice and Charlie are friends? ${aliceCharlieFriends.areFriends[0]}`);
  });

  await t.step("Scenario 7: _getFriends, _getSentFriendRequests, _getReceivedFriendRequests queries", async () => {
    console.log("\n--- Scenario 7: Get Query Checks ---");

    // Setup: David sends request to Eve, David sends request to Frank. Eve sends request to David.
    await friendingConcept.friendRequests.deleteMany({
        $or: [
            { sender: userDavid }, { receiver: userDavid },
            { sender: userEve }, { receiver: userEve },
            { sender: userFrank }, { receiver: userFrank }
        ]
    });
    await friendingConcept.friendships.deleteMany({
        $or: [
            { friend1: userDavid }, { friend2: userDavid },
            { friend1: userEve }, { friend2: userEve },
            { friend1: userFrank }, { friend2: userFrank }
        ]
    });


    console.log(`Setup: David (${userDavid}) sends request to Eve (${userEve})`);
    await friendingConcept.sendRequest({ sender: userDavid, receiver: userEve });
    console.log(`Setup: David (${userDavid}) sends request to Frank (${userFrank})`);
    await friendingConcept.sendRequest({ sender: userDavid, receiver: userFrank });
    console.log(`Setup: Eve (${userEve}) sends request to David (${userDavid})`);
    await friendingConcept.sendRequest({ sender: userEve, receiver: userDavid });
    console.log(`Setup: Eve accepts David's request`);
    await friendingConcept.acceptRequest({ sender: userDavid, receiver: userEve });


    // Query _getSentFriendRequests
    const davidSent = await friendingConcept._getSentFriendRequests({ sender: userDavid });
    assertEquals(davidSent.sentRequests, [userFrank]); // Eve accepted, so only Frank remains
    console.log(`Verification: David's sent requests: ${davidSent.sentRequests}`);

    const eveSent = await friendingConcept._getSentFriendRequests({ sender: userEve });
    assertEquals(eveSent.sentRequests, [userDavid]); // Eve sent to David
    console.log(`Verification: Eve's sent requests: ${eveSent.sentRequests}`);


    // Query _getReceivedFriendRequests
    const frankReceived = await friendingConcept._getReceivedFriendRequests({ receiver: userFrank });
    assertEquals(frankReceived.receivedRequests, [userDavid]);
    console.log(`Verification: Frank's received requests: ${frankReceived.receivedRequests}`);

    const davidReceived = await friendingConcept._getReceivedFriendRequests({ receiver: userDavid });
    assertEquals(davidReceived.receivedRequests, [userEve]); // Eve sent to David
    console.log(`Verification: David's received requests: ${davidReceived.receivedRequests}`);


    // Query _getFriends
    const davidFriends = await friendingConcept._getFriends({ user: userDavid });
    assertEquals(davidFriends.friends, [userEve]); // David and Eve are friends
    console.log(`Verification: David's friends: ${davidFriends.friends}`);

    const eveFriends = await friendingConcept._getFriends({ user: userEve });
    assertEquals(eveFriends.friends, [userDavid]); // Eve and David are friends
    console.log(`Verification: Eve's friends: ${eveFriends.friends}`);

    const frankFriends = await friendingConcept._getFriends({ user: userFrank });
    assertEquals(frankFriends.friends, []); // Frank is not friends with anyone
    console.log(`Verification: Frank's friends: ${frankFriends.friends}`);
  });
});
```
