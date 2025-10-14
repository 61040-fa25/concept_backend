---
timestamp: 'Tue Oct 14 2025 01:19:20 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_011920.341e5362.md]]'
content_id: b351ae5e0debc8dfa68d206d3184ba67f35d7c5eee13b1597400c596dcb0c393
---

# trace:

### Operational Principle Trace: A sends request to B, B accepts, they become friends

1. **Initial State**: No friend requests, no friendships.
2. **Action**: `friendingConcept.sendRequest({ sender: "user:Alice", receiver: "user:Bob" })`
   * **Preconditions**: Alice is not Bob. No existing request between them. No existing friendship. All true.
   * **Effects**: A new `FriendRequestDoc` is inserted into `friendRequests` collection: `{"_id": <some_id>, "sender": "user:Alice", "receiver": "user:Bob"}`.
   * **Assertions**:
     * `friendingConcept._getReceivedFriendRequests({ user: "user:Bob" })` returns `[{ sender: "user:Alice", receiver: "user:Bob", _id: <some_id> }]`.
     * `friendingConcept._getSentFriendRequests({ user: "user:Alice" })` returns `[{ sender: "user:Alice", receiver: "user:Bob", _id: <some_id> }]`.
3. **Action**: `friendingConcept.acceptRequest({ sender: "user:Alice", receiver: "user:Bob" })`
   * **Preconditions**: Request from Alice to Bob exists. True.
   * **Effects**: The `FriendRequestDoc` is removed from `friendRequests`. A new `FriendshipDoc` is inserted into `friendships` collection: `{"_id": <some_id>, "users": ["user:Alice", "user:Bob"]}` (order might be sorted).
   * **Assertions**:
     * `friendingConcept._getReceivedFriendRequests({ user: "user:Bob" })` returns `[]`.
     * `friendingConcept._getSentFriendRequests({ user: "user:Alice" })` returns `[]`.
     * `friendingConcept._getFriends({ user: "user:Alice" })` returns `{ friends: ["user:Bob"] }`.
     * `friendingConcept._getFriends({ user: "user:Bob" })` returns `{ friends: ["user:Alice"] }`.
4. **Final State**: Alice and Bob are friends. No pending friend requests.

### Scenario 1 Trace: Denying a request

1. **Initial State**: (Assuming a clean state or previous state handled, A and B are friends from principle, but C is new)
2. **Action**: `friendingConcept.sendRequest({ sender: "user:Alice", receiver: "user:Charlie" })`
   * **Effects**: A request from Alice to Charlie is created.
   * **Assertions**: `friendingConcept._getReceivedFriendRequests({ user: "user:Charlie" })` returns a list containing the request from Alice.
3. **Action**: `friendingConcept.denyRequest({ sender: "user:Alice", receiver: "user:Charlie" })`
   * **Preconditions**: Request from Alice to Charlie exists. True.
   * **Effects**: The friend request from Alice to Charlie is removed.
   * **Assertions**:
     * `friendingConcept._getReceivedFriendRequests({ user: "user:Charlie" })` returns `[]`.
     * `friendingConcept._getSentFriendRequests({ user: "user:Alice" })` no longer contains the request to Charlie.
     * `friendingConcept._getFriends({ user: "user:Alice" })` and `friendingConcept._getFriends({ user: "user:Charlie" })` do not show them as friends.

### Scenario 2 Trace: Removing a friend

1. **Initial State**: (Assume Alice and David are made friends for this scenario's setup)
2. **Action**: `friendingConcept.removeFriend({ user: "user:Alice", to_be_removed_friend: "user:David" })`
   * **Preconditions**: Friendship between Alice and David exists. True.
   * **Effects**: The `FriendshipDoc` for Alice and David is removed from the `friendships` collection.
   * **Assertions**:
     * `friendingConcept._getFriends({ user: "user:Alice" })` does not include "user:David".
     * `friendingConcept._getFriends({ user: "user:David" })` does not include "user:Alice".

### Scenario 3 Trace: Error cases for sendRequest

1. **Action**: `friendingConcept.sendRequest({ sender: "user:Alice", receiver: "user:Alice" })`
   * **Preconditions**: sender is not receiver. False.
   * **Effects**: Returns `{ error: "Cannot send friend request to self." }`.
2. **Action**: `friendingConcept.sendRequest({ sender: "user:Alice", receiver: "user:Bob" })` (where Alice and Bob are already friends from the operational principle)
   * **Preconditions**: friendship does not already exist. False.
   * **Effects**: Returns `{ error: "Users are already friends." }`.
3. **Action**: `friendingConcept.sendRequest({ sender: "user:David", receiver: "user:Charlie" })`
   * **Effects**: Request from David to Charlie is created.
4. **Action**: `friendingConcept.sendRequest({ sender: "user:David", receiver: "user:Charlie" })` (duplicate)
   * **Preconditions**: friend request from sender to receiver or vice versa does not already exist. False.
   * **Effects**: Returns `{ error: "Friend request already exists or is pending." }`.

### Scenario 4 Trace: Error cases for acceptRequest and denyRequest

1. **Action**: `friendingConcept.acceptRequest({ sender: "user:David", receiver: "user:Alice" })` (no pending request)
   * **Preconditions**: request from sender to receiver to exist. False.
   * **Effects**: Returns `{ error: "Friend request not found." }`.
2. **Action**: `friendingConcept.denyRequest({ sender: "user:David", receiver: "user:Alice" })` (no pending request)
   * **Preconditions**: request from sender to receiver to exist. False.
   * **Effects**: Returns `{ error: "Friend request not found." }`.

### Scenario 5 Trace: Error cases for removeFriend

1. **Action**: `friendingConcept.removeFriend({ user: "user:Alice", to_be_removed_friend: "user:Charlie" })` (not friends)
   * **Preconditions**: friendship between user and to\_be\_removed\_friend must exist. False.
   * **Effects**: Returns `{ error: "Friendship not found." }`.
