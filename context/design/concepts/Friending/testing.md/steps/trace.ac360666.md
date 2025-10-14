---
timestamp: 'Tue Oct 14 2025 01:18:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_011814.90fff97e.md]]'
content_id: ac360666664b0f05967cf16c0416da897722f6eae6a0e2d2f1a3e259960bd723
---

# trace:

**Operational Principle Trace:**

1. **User Alice (user:Alice) sends a friend request to User Bob (user:Bob).**
   * `friendingConcept.sendRequest({ sender: "user:Alice", receiver: "user:Bob" })` is called.
   * Expected: A new `FriendRequestDoc` is created in `friendRequests` collection with sender "user:Alice" and receiver "user:Bob".
   * Verification:
     * `friendingConcept._getSentFriendRequests({ user: "user:Alice" })` returns an array containing this request.
     * `friendingConcept._getReceivedFriendRequests({ user: "user:Bob" })` returns an array containing this request.
     * `friendingConcept._getFriends({ user: "user:Alice" })` and `_getFriends({ user: "user:Bob" })` return empty arrays.

2. **User Bob (user:Bob) accepts the friend request from User Alice (user:Alice).**
   * `friendingConcept.acceptRequest({ sender: "user:Alice", receiver: "user:Bob" })` is called.
   * Expected: The `FriendRequestDoc` is removed from `friendRequests`. A new `FriendshipDoc` is created in `friendships` collection, associating "user:Alice" and "user:Bob".
   * Verification:
     * `friendingConcept._getSentFriendRequests({ user: "user:Alice" })` returns an empty array.
     * `friendingConcept._getReceivedFriendRequests({ user: "user:Bob" })` returns an empty array.
     * `friendingConcept._getFriends({ user: "user:Alice" })` returns `[{ friends: ["user:Bob"] }]`.
     * `friendingConcept._getFriends({ user: "user:Bob" })` returns `[{ friends: ["user:Alice"] }]`.

3. **User Alice (user:Alice) removes User Bob (user:Bob) as a friend.**
   * `friendingConcept.removeFriend({ user: "user:Alice", to_be_removed_friend: "user:Bob" })` is called.
   * Expected: The `FriendshipDoc` between them is removed from `friendships`.
   * Verification:
     * `friendingConcept._getFriends({ user: "user:Alice" })` and `_getFriends({ user: "user:Bob" })` return empty arrays.

4. **User Bob (user:Bob) sends a friend request to User Charlie (user:Charlie).**
   * `friendingConcept.sendRequest({ sender: "user:Bob", receiver: "user:Charlie" })` is called.
   * Expected: A new `FriendRequestDoc` is created.
   * Verification: `_getSentFriendRequests({ user: "user:Bob" })` shows the request, and `_getReceivedFriendRequests({ user: "user:Charlie" })` shows the request.

5. **User Charlie (user:Charlie) denies the friend request from User Bob (user:Bob).**
   * `friendingConcept.denyRequest({ sender: "user:Bob", receiver: "user:Charlie" })` is called.
   * Expected: The `FriendRequestDoc` is removed. No `FriendshipDoc` is created.
   * Verification: `_getSentFriendRequests({ user: "user:Bob" })` and `_getReceivedFriendRequests({ user: "user:Charlie" })` return empty arrays. `_getFriends` for both users remains empty.

**Interesting Scenarios Trace:**

1. **Sending a friend request to oneself:**
   * `friendingConcept.sendRequest({ sender: "user:Xavier", receiver: "user:Xavier" })`
   * Expected: Returns `{ error: "Cannot send friend request to self." }`.
   * Verification: The `friendRequests` collection remains empty.

2. **Sending duplicate friend requests (A to B, then B to A):**
   * `friendingConcept.sendRequest({ sender: "user:Xavier", receiver: "user:Yara" })`
   * `friendingConcept.sendRequest({ sender: "user:Yara", receiver: "user:Xavier" })`
   * Expected: The second call returns `{ error: "Friend request already exists or is pending." }`.
   * Verification: Only one friend request (X -> Y) exists in `friendRequests`. `_getSentFriendRequests({ user: "user:Xavier" })` contains the request; `_getReceivedFriendRequests({ user: "user:Yara" })` contains the request.

3. **Accepting a non-existent request:**
   * `friendingConcept.acceptRequest({ sender: "user:Xavier", receiver: "user:Zoe" })`
   * Expected: Returns `{ error: "Friend request not found." }`.
   * Verification: `friendships` collection remains empty.

4. **Denying a non-existent request:**
   * `friendingConcept.denyRequest({ sender: "user:Zoe", receiver: "user:Xavier" })`
   * Expected: Returns `{ error: "Friend request not found." }`.
   * Verification: `friendRequests` collection remains unchanged.

5. **Attempting to send a request to an already existing friend:**
   * (Assume Xavier and Yara are already friends from a previous test step or setup)
   * `friendingConcept.sendRequest({ sender: "user:Xavier", receiver: "user:Yara" })`
   * Expected: Returns `{ error: "Users are already friends." }`.
   * Verification: No new requests are created; the friendship remains.

6. **Removing a non-existent friendship:**
   * `friendingConcept.removeFriend({ user: "user:Xavier", to_be_removed_friend: "user:Zoe" })`
   * Expected: Returns `{ error: "Friendship not found." }`.
   * Verification: `friendships` collection remains unchanged.
