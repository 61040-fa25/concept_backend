[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: Friending
# response:

# file: src/Friending/FriendingConcept.test.ts

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
    console.log("\n--- Operational Principle Test ---");

    // Scenario 1: User A sends a request to User B, User B accepts.
    console.log(`Action: ${userA} sends request to ${userB}`);
    const sendResult = await friendingConcept.sendRequest({
      sender: userA,
      receiver: userB,
    });
    assertEquals(sendResult, {}, "sendRequest should succeed");

    let requests = await friendingConcept._getFriendRequests({ user: userB });
    assertEquals(
      requests.received.length,
      1,
      "User B should have 1 received request",
    );
    assertEquals(
      requests.received[0].sender,
      userA,
      "User B's received request sender should be A",
    );
    requests = await friendingConcept._getFriendRequests({ user: userA });
    assertEquals(
      requests.sent.length,
      1,
      "User A should have 1 sent request",
    );
    assertEquals(
      requests.sent[0].receiver,
      userB,
      "User A's sent request receiver should be B",
    );

    console.log(`Action: ${userB} accepts request from ${userA}`);
    const acceptResult = await friendingConcept.acceptRequest({
      sender: userA,
      receiver: userB,
    });
    assertEquals(acceptResult, {}, "acceptRequest should succeed");

    // Verify request is gone
    requests = await friendingConcept._getFriendRequests({ user: userA });
    assertEquals(requests.sent.length, 0, "User A should have no sent requests");
    requests = await friendingConcept._getFriendRequests({ user: userB });
    assertEquals(
      requests.received.length,
      0,
      "User B should have no received requests",
    );

    // Verify friendship exists
    let friendsA = await friendingConcept._getFriends({ user: userA });
    assertEquals(friendsA.friends.length, 1, "User A should have 1 friend");
    assertEquals(friendsA.friends[0], userB, "User A's friend should be B");

    let friendsB = await friendingConcept._getFriends({ user: userB });
    assertEquals(friendsB.friends.length, 1, "User B should have 1 friend");
    assertEquals(friendsB.friends[0], userA, "User B's friend should be A");

    // Scenario 2: User A removes User B as a friend
    console.log(`Action: ${userA} removes ${userB} as friend`);
    const removeResult = await friendingConcept.removeFriend({
      user: userA,
      to_be_removed_friend: userB,
    });
    assertEquals(removeResult, {}, "removeFriend should succeed");

    // Verify friendship is gone
    friendsA = await friendingConcept._getFriends({ user: userA });
    assertEquals(
      friendsA.friends.length,
      0,
      "User A should have no friends after removal",
    );
    friendsB = await friendingConcept._getFriends({ user: userB });
    assertEquals(
      friendsB.friends.length,
      0,
      "User B should have no friends after removal",
    );
  });

  await t.step("Interesting Scenario 1: Denying a Request", async () => {
    console.log("\n--- Scenario 1: Denying a Request ---");

    // User A sends request to User B
    console.log(`Action: ${userA} sends request to ${userB}`);
    const sendResult = await friendingConcept.sendRequest({
      sender: userA,
      receiver: userB,
    });
    assertEquals(sendResult, {}, "sendRequest should succeed");

    let requests = await friendingConcept._getFriendRequests({ user: userB });
    assertEquals(
      requests.received.length,
      1,
      "User B should have 1 received request",
    );

    // User B denies the request from User A
    console.log(`Action: ${userB} denies request from ${userA}`);
    const denyResult = await friendingConcept.denyRequest({
      sender: userA,
      receiver: userB,
    });
    assertEquals(denyResult, {}, "denyRequest should succeed");

    // Verify request is gone
    requests = await friendingConcept._getFriendRequests({ user: userA });
    assertEquals(requests.sent.length, 0, "User A should have no sent requests");
    requests = await friendingConcept._getFriendRequests({ user: userB });
    assertEquals(
      requests.received.length,
      0,
      "User B should have no received requests",
    );

    // Verify no friendship was created
    const friendsA = await friendingConcept._getFriends({ user: userA });
    assertEquals(friendsA.friends.length, 0, "User A should have no friends");
  });

  await t.step("Interesting Scenario 2: Invalid Request Attempts", async () => {
    console.log("\n--- Scenario 2: Invalid Request Attempts ---");

    // Attempt to send request to self
    console.log(`Action: ${userA} attempts to send request to ${userA}`);
    const selfRequestResult = await friendingConcept.sendRequest({
      sender: userA,
      receiver: userA,
    });
    assertNotEquals(
      selfRequestResult,
      {},
      "sendRequest to self should return an error",
    );
    assertEquals(
      (selfRequestResult as { error: string }).error,
      "Cannot send friend request to self.",
      "Error message should indicate sending to self",
    );

    // Send a valid request first
    console.log(`Action: ${userC} sends request to ${userD}`);
    await friendingConcept.sendRequest({ sender: userC, receiver: userD });

    // Attempt to send duplicate request (C -> D)
    console.log(`Action: ${userC} attempts to send duplicate request to ${userD}`);
    const dupRequestCD = await friendingConcept.sendRequest({
      sender: userC,
      receiver: userD,
    });
    assertNotEquals(
      dupRequestCD,
      {},
      "duplicate sendRequest (C->D) should return an error",
    );
    assertEquals(
      (dupRequestCD as { error: string }).error,
      "Friend request already exists or is pending.",
      "Error message should indicate existing request",
    );

    // Attempt to send reverse request (D -> C) while C->D is pending
    console.log(`Action: ${userD} attempts to send request to ${userC} (reverse while pending)`);
    const reverseRequestDC = await friendingConcept.sendRequest({
      sender: userD,
      receiver: userC,
    });
    assertNotEquals(
      reverseRequestDC,
      {},
      "reverse sendRequest (D->C) should return an error if C->D pending",
    );
    assertEquals(
      (reverseRequestDC as { error: string }).error,
      "Friend request already exists or is pending.",
      "Error message should indicate existing request",
    );

    // Accept the pending request (C and D become friends)
    console.log(`Action: ${userD} accepts request from ${userC}`);
    await friendingConcept.acceptRequest({ sender: userC, receiver: userD });

    // Attempt to send request to an existing friend (C -> D)
    console.log(`Action: ${userC} attempts to send request to existing friend ${userD}`);
    const requestToFriend = await friendingConcept.sendRequest({
      sender: userC,
      receiver: userD,
    });
    assertNotEquals(
      requestToFriend,
      {},
      "sendRequest to an existing friend should return an error",
    );
    assertEquals(
      (requestToFriend as { error: string }).error,
      "Users are already friends.",
      "Error message should indicate existing friendship",
    );

    // Clean up
    await friendingConcept.removeFriend({ user: userC, to_be_removed_friend: userD });
  });

  await t.step("Interesting Scenario 3: Attempts on Non-existent Requests/Friendships", async () => {
    console.log("\n--- Scenario 3: Attempts on Non-existent Requests/Friendships ---");

    // Attempt to accept a non-existent request
    console.log(`Action: ${userA} attempts to accept non-existent request from ${userC}`);
    const nonExistentAccept = await friendingConcept.acceptRequest({
      sender: userC,
      receiver: userA,
    });
    assertNotEquals(
      nonExistentAccept,
      {},
      "acceptRequest for non-existent request should return an error",
    );
    assertEquals(
      (nonExistentAccept as { error: string }).error,
      "Friend request not found.",
      "Error message should indicate request not found",
    );

    // Attempt to deny a non-existent request
    console.log(`Action: ${userA} attempts to deny non-existent request from ${userC}`);
    const nonExistentDeny = await friendingConcept.denyRequest({
      sender: userC,
      receiver: userA,
    });
    assertNotEquals(
      nonExistentDeny,
      {},
      "denyRequest for non-existent request should return an error",
    );
    assertEquals(
      (nonExistentDeny as { error: string }).error,
      "Friend request not found.",
      "Error message should indicate request not found",
    );

    // Attempt to remove a non-existent friendship
    console.log(`Action: ${userA} attempts to remove non-existent friend ${userC}`);
    const nonExistentRemove = await friendingConcept.removeFriend({
      user: userA,
      to_be_removed_friend: userC,
    });
    assertNotEquals(
      nonExistentRemove,
      {},
      "removeFriend for non-existent friendship should return an error",
    );
    assertEquals(
      (nonExistentRemove as { error: string }).error,
      "Friendship not found.",
      "Error message should indicate friendship not found",
    );
  });

  await t.step("Interesting Scenario 4: Multiple Friends", async () => {
    console.log("\n--- Scenario 4: Multiple Friends ---");

    // User A friends User B
    console.log(`Action: ${userA} sends request to ${userB}`);
    await friendingConcept.sendRequest({ sender: userA, receiver: userB });
    console.log(`Action: ${userB} accepts request from ${userA}`);
    await friendingConcept.acceptRequest({ sender: userA, receiver: userB });

    // User A friends User C
    console.log(`Action: ${userA} sends request to ${userC}`);
    await friendingConcept.sendRequest({ sender: userA, receiver: userC });
    console.log(`Action: ${userC} accepts request from ${userA}`);
    await friendingConcept.acceptRequest({ sender: userA, receiver: userC });

    // Verify User A has multiple friends
    const friendsA = await friendingConcept._getFriends({ user: userA });
    assertEquals(
      friendsA.friends.length,
      2,
      "User A should have 2 friends",
    );
    assertEquals(
      new Set(friendsA.friends),
      new Set([userB, userC]),
      "User A's friends should be B and C",
    );

    // Verify User B has 1 friend
    const friendsB = await friendingConcept._getFriends({ user: userB });
    assertEquals(friendsB.friends.length, 1, "User B should have 1 friend");
    assertEquals(friendsB.friends[0], userA, "User B's friend should be A");

    // Verify User C has 1 friend
    const friendsC = await friendingConcept._getFriends({ user: userC });
    assertEquals(friendsC.friends.length, 1, "User C should have 1 friend");
    assertEquals(friendsC.friends[0], userA, "User C's friend should be A");

    // Clean up
    await friendingConcept.removeFriend({ user: userA, to_be_removed_friend: userB });
    await friendingConcept.removeFriend({ user: userA, to_be_removed_friend: userC });
  });

  // Ensure all actions are executed successfully at least once.
  // sendRequest, acceptRequest, denyRequest, removeFriend are covered.
  // _getFriends, _getFriendRequests queries are covered.

  await client.close();
});
```

# trace:

The trace for the `Friending Concept Tests` provides a comprehensive overview of how the concept's actions and queries interact to fulfill its purpose and handle various scenarios.

### Test Execution Trace:

#### `Operational Principle Test`
This section directly tests the core functionality as described in the concept's principle:
1.  **`user:Alice` sends request to `user:Bob`**:
    *   `sendRequest({sender: "user:Alice", receiver: "user:Bob"})` is called.
    *   Expected: Returns `{}` (success).
    *   State check: `_getFriendRequests({user: "user:Bob"})` shows 1 received request from `user:Alice`.
    *   State check: `_getFriendRequests({user: "user:Alice"})` shows 1 sent request to `user:Bob`.
2.  **`user:Bob` accepts request from `user:Alice`**:
    *   `acceptRequest({sender: "user:Alice", receiver: "user:Bob"})` is called.
    *   Expected: Returns `{}` (success).
    *   State check: `_getFriendRequests({user: "user:Alice"})` shows 0 sent requests.
    *   State check: `_getFriendRequests({user: "user:Bob"})` shows 0 received requests.
    *   State check: `_getFriends({user: "user:Alice"})` shows 1 friend (`user:Bob`).
    *   State check: `_getFriends({user: "user:Bob"})` shows 1 friend (`user:Alice`).
3.  **`user:Alice` removes `user:Bob` as friend**:
    *   `removeFriend({user: "user:Alice", to_be_removed_friend: "user:Bob"})` is called.
    *   Expected: Returns `{}` (success).
    *   State check: `_getFriends({user: "user:Alice"})` shows 0 friends.
    *   State check: `_getFriends({user: "user:Bob"})` shows 0 friends.

#### `Interesting Scenario 1: Denying a Request`
This scenario demonstrates the alternative path of denying a friend request.
1.  **`user:Alice` sends request to `user:Bob`**:
    *   `sendRequest({sender: "user:Alice", receiver: "user:Bob"})` is called.
    *   Expected: Returns `{}` (success).
    *   State check: `_getFriendRequests({user: "user:Bob"})` shows 1 received request.
2.  **`user:Bob` denies request from `user:Alice`**:
    *   `denyRequest({sender: "user:Alice", receiver: "user:Bob"})` is called.
    *   Expected: Returns `{}` (success).
    *   State check: `_getFriendRequests({user: "user:Alice"})` shows 0 sent requests.
    *   State check: `_getFriendRequests({user: "user:Bob"})` shows 0 received requests.
    *   State check: `_getFriends({user: "user:Alice"})` shows 0 friends.

#### `Interesting Scenario 2: Invalid Request Attempts`
This scenario focuses on testing the preconditions and error handling for `sendRequest`.
1.  **`user:Alice` attempts to send request to `user:Alice`**:
    *   `sendRequest({sender: "user:Alice", receiver: "user:Alice"})` is called.
    *   Expected: Returns `{error: "Cannot send friend request to self."}`.
2.  **`user:Charlie` sends request to `user:David`**:
    *   `sendRequest({sender: "user:Charlie", receiver: "user:David"})` is called.
    *   Expected: Returns `{}` (success).
3.  **`user:Charlie` attempts to send duplicate request to `user:David`**:
    *   `sendRequest({sender: "user:Charlie", receiver: "user:David"})` is called.
    *   Expected: Returns `{error: "Friend request already exists or is pending."}`.
4.  **`user:David` attempts to send request to `user:Charlie` (reverse while pending)**:
    *   `sendRequest({sender: "user:David", receiver: "user:Charlie"})` is called.
    *   Expected: Returns `{error: "Friend request already exists or is pending."}`.
5.  **`user:David` accepts request from `user:Charlie`**:
    *   `acceptRequest({sender: "user:Charlie", receiver: "user:David"})` is called.
    *   Expected: Returns `{}` (success).
6.  **`user:Charlie` attempts to send request to existing friend `user:David`**:
    *   `sendRequest({sender: "user:Charlie", receiver: "user:David"})` is called.
    *   Expected: Returns `{error: "Users are already friends."}`.
7.  **Cleanup**: `removeFriend({user: "user:Charlie", to_be_removed_friend: "user:David"})` to ensure a clean state for subsequent tests.

#### `Interesting Scenario 3: Attempts on Non-existent Requests/Friendships`
This scenario validates error handling for actions when their required preconditions (existence of request/friendship) are not met.
1.  **`user:Alice` attempts to accept non-existent request from `user:Charlie`**:
    *   `acceptRequest({sender: "user:Charlie", receiver: "user:Alice"})` is called.
    *   Expected: Returns `{error: "Friend request not found."}`.
2.  **`user:Alice` attempts to deny non-existent request from `user:Charlie`**:
    *   `denyRequest({sender: "user:Charlie", receiver: "user:Alice"})` is called.
    *   Expected: Returns `{error: "Friend request not found."}`.
3.  **`user:Alice` attempts to remove non-existent friend `user:Charlie`**:
    *   `removeFriend({user: "user:Alice", to_be_removed_friend: "user:Charlie"})` is called.
    *   Expected: Returns `{error: "Friendship not found."}`.

#### `Interesting Scenario 4: Multiple Friends`
This scenario demonstrates how a user can have multiple friends and how queries reflect this.
1.  **`user:Alice` friends `user:Bob`**: (send and accept sequence)
    *   `sendRequest({sender: "user:Alice", receiver: "user:Bob"})`
    *   `acceptRequest({sender: "user:Alice", receiver: "user:Bob"})`
    *   Expected: Both return `{}`.
2.  **`user:Alice` friends `user:Charlie`**: (send and accept sequence)
    *   `sendRequest({sender: "user:Alice", receiver: "user:Charlie"})`
    *   `acceptRequest({sender: "user:Alice", receiver: "user:Charlie"})`
    *   Expected: Both return `{}`.
3.  **Verify User A has multiple friends**:
    *   `_getFriends({user: "user:Alice"})`
    *   Expected: Returns `{friends: ["user:Bob", "user:Charlie"]}`.
4.  **Verify User B has 1 friend**:
    *   `_getFriends({user: "user:Bob"})`
    *   Expected: Returns `{friends: ["user:Alice"]}`.
5.  **Verify User C has 1 friend**:
    *   `_getFriends({user: "user:Charlie"})`
    *   Expected: Returns `{friends: ["user:Alice"]}`.
6.  **Cleanup**: `removeFriend` actions for `user:Alice` with `user:Bob` and `user:Charlie` to clear the state.

This trace confirms that all actions and queries are exercised, the principle is demonstrated, requirements are enforced (through error returns), and effects correctly modify the concept's state, providing robust testing coverage for the `FriendingConcept`.