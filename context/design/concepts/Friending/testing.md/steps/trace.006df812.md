---
timestamp: 'Wed Oct 15 2025 01:16:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_011632.08a33a51.md]]'
content_id: 006df812a9b648bfff06a2b93ab82222e8fd63ced99a296c63666f6b1f343a83
---

# trace: Friending Operational Principle

This trace outlines the typical flow of interaction for the `Friending` concept, demonstrating how a friend request is sent, accepted, and how the friendship is then established and verifiable.

1. **Alice sends a friend request to Bob.**
   * **Action:** `sendRequest(sender: user:Alice, receiver: user:Bob)`
   * **Expected:** A new `FriendRequest` document is created in the `friendRequests` collection, associating `user:Alice` as the sender and `user:Bob` as the receiver. The action returns the ID of this new request.
   * **Verification:**
     * No error is returned.
     * The `friendRequests` collection contains one document matching `sender: user:Alice, receiver: user:Bob`.
     * `_isFriends(user1: user:Alice, user2: user:Bob)` returns `[{ isFriend: false }]`.
     * `_getSentFriendRequests(sender: user:Alice)` returns `[{ receiver: user:Bob }]`.
     * `_getReceivedFriendRequests(receiver: user:Bob)` returns `[{ sender: user:Alice }]`.
     * `_getFriends(user: user:Alice)` returns `[]`.
     * `_getFriends(user: user:Bob)` returns `[]`.

2. **Bob accepts the friend request from Alice.**
   * **Action:** `acceptRequest(sender: user:Alice, receiver: user:Bob)`
   * **Expected:** The previously created `FriendRequest` document is removed. A new `Friendship` document is created in the `friendships` collection, associating `user:Alice` and `user:Bob` as friends (stored canonically, e.g., `friend1: user:Alice, friend2: user:Bob`).
   * **Verification:**
     * No error is returned.
     * The `friendRequests` collection is empty (no request between `user:Alice` and `user:Bob`).
     * The `friendships` collection contains one document representing the friendship between `user:Alice` and `user:Bob`.
     * `_isFriends(user1: user:Alice, user2: user:Bob)` returns `[{ isFriend: true }]`.
     * `_getSentFriendRequests(sender: user:Alice)` returns `[]`.
     * `_getReceivedFriendRequests(receiver: user:Bob)` returns `[]`.
     * `_getFriends(user: user:Alice)` returns `[{ friend: user:Bob }]`.
     * `_getFriends(user: user:Bob)` returns `[{ friend: user:Alice }]`.
