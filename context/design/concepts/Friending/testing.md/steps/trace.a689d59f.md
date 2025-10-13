---
timestamp: 'Mon Oct 13 2025 02:57:03 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_025703.b2ec75b9.md]]'
content_id: a689d59f07155956881e2b9dac3772d60647b76edd62851789b5ada57ef6f480
---

# trace:

The trace for the `Friending Concept Tests` provides a comprehensive overview of how the concept's actions and queries interact to fulfill its purpose and handle various scenarios.

### Test Execution Trace:

#### `Operational Principle Test`

This section directly tests the core functionality as described in the concept's principle:

1. **`user:Alice` sends request to `user:Bob`**:
   * `sendRequest({sender: "user:Alice", receiver: "user:Bob"})` is called.
   * Expected: Returns `{}` (success).
   * State check: `_getFriendRequests({user: "user:Bob"})` shows 1 received request from `user:Alice`.
   * State check: `_getFriendRequests({user: "user:Alice"})` shows 1 sent request to `user:Bob`.
2. **`user:Bob` accepts request from `user:Alice`**:
   * `acceptRequest({sender: "user:Alice", receiver: "user:Bob"})` is called.
   * Expected: Returns `{}` (success).
   * State check: `_getFriendRequests({user: "user:Alice"})` shows 0 sent requests.
   * State check: `_getFriendRequests({user: "user:Bob"})` shows 0 received requests.
   * State check: `_getFriends({user: "user:Alice"})` shows 1 friend (`user:Bob`).
   * State check: `_getFriends({user: "user:Bob"})` shows 1 friend (`user:Alice`).
3. **`user:Alice` removes `user:Bob` as friend**:
   * `removeFriend({user: "user:Alice", to_be_removed_friend: "user:Bob"})` is called.
   * Expected: Returns `{}` (success).
   * State check: `_getFriends({user: "user:Alice"})` shows 0 friends.
   * State check: `_getFriends({user: "user:Bob"})` shows 0 friends.

#### `Interesting Scenario 1: Denying a Request`

This scenario demonstrates the alternative path of denying a friend request.

1. **`user:Alice` sends request to `user:Bob`**:
   * `sendRequest({sender: "user:Alice", receiver: "user:Bob"})` is called.
   * Expected: Returns `{}` (success).
   * State check: `_getFriendRequests({user: "user:Bob"})` shows 1 received request.
2. **`user:Bob` denies request from `user:Alice`**:
   * `denyRequest({sender: "user:Alice", receiver: "user:Bob"})` is called.
   * Expected: Returns `{}` (success).
   * State check: `_getFriendRequests({user: "user:Alice"})` shows 0 sent requests.
   * State check: `_getFriendRequests({user: "user:Bob"})` shows 0 received requests.
   * State check: `_getFriends({user: "user:Alice"})` shows 0 friends.

#### `Interesting Scenario 2: Invalid Request Attempts`

This scenario focuses on testing the preconditions and error handling for `sendRequest`.

1. **`user:Alice` attempts to send request to `user:Alice`**:
   * `sendRequest({sender: "user:Alice", receiver: "user:Alice"})` is called.
   * Expected: Returns `{error: "Cannot send friend request to self."}`.
2. **`user:Charlie` sends request to `user:David`**:
   * `sendRequest({sender: "user:Charlie", receiver: "user:David"})` is called.
   * Expected: Returns `{}` (success).
3. **`user:Charlie` attempts to send duplicate request to `user:David`**:
   * `sendRequest({sender: "user:Charlie", receiver: "user:David"})` is called.
   * Expected: Returns `{error: "Friend request already exists or is pending."}`.
4. **`user:David` attempts to send request to `user:Charlie` (reverse while pending)**:
   * `sendRequest({sender: "user:David", receiver: "user:Charlie"})` is called.
   * Expected: Returns `{error: "Friend request already exists or is pending."}`.
5. **`user:David` accepts request from `user:Charlie`**:
   * `acceptRequest({sender: "user:Charlie", receiver: "user:David"})` is called.
   * Expected: Returns `{}` (success).
6. **`user:Charlie` attempts to send request to existing friend `user:David`**:
   * `sendRequest({sender: "user:Charlie", receiver: "user:David"})` is called.
   * Expected: Returns `{error: "Users are already friends."}`.
7. **Cleanup**: `removeFriend({user: "user:Charlie", to_be_removed_friend: "user:David"})` to ensure a clean state for subsequent tests.

#### `Interesting Scenario 3: Attempts on Non-existent Requests/Friendships`

This scenario validates error handling for actions when their required preconditions (existence of request/friendship) are not met.

1. **`user:Alice` attempts to accept non-existent request from `user:Charlie`**:
   * `acceptRequest({sender: "user:Charlie", receiver: "user:Alice"})` is called.
   * Expected: Returns `{error: "Friend request not found."}`.
2. **`user:Alice` attempts to deny non-existent request from `user:Charlie`**:
   * `denyRequest({sender: "user:Charlie", receiver: "user:Alice"})` is called.
   * Expected: Returns `{error: "Friend request not found."}`.
3. **`user:Alice` attempts to remove non-existent friend `user:Charlie`**:
   * `removeFriend({user: "user:Alice", to_be_removed_friend: "user:Charlie"})` is called.
   * Expected: Returns `{error: "Friendship not found."}`.

#### `Interesting Scenario 4: Multiple Friends`

This scenario demonstrates how a user can have multiple friends and how queries reflect this.

1. **`user:Alice` friends `user:Bob`**: (send and accept sequence)
   * `sendRequest({sender: "user:Alice", receiver: "user:Bob"})`
   * `acceptRequest({sender: "user:Alice", receiver: "user:Bob"})`
   * Expected: Both return `{}`.
2. **`user:Alice` friends `user:Charlie`**: (send and accept sequence)
   * `sendRequest({sender: "user:Alice", receiver: "user:Charlie"})`
   * `acceptRequest({sender: "user:Alice", receiver: "user:Charlie"})`
   * Expected: Both return `{}`.
3. **Verify User A has multiple friends**:
   * `_getFriends({user: "user:Alice"})`
   * Expected: Returns `{friends: ["user:Bob", "user:Charlie"]}`.
4. **Verify User B has 1 friend**:
   * `_getFriends({user: "user:Bob"})`
   * Expected: Returns `{friends: ["user:Alice"]}`.
5. **Verify User C has 1 friend**:
   * `_getFriends({user: "user:Charlie"})`
   * Expected: Returns `{friends: ["user:Alice"]}`.
6. **Cleanup**: `removeFriend` actions for `user:Alice` with `user:Bob` and `user:Charlie` to clear the state.

This trace confirms that all actions and queries are exercised, the principle is demonstrated, requirements are enforced (through error returns), and effects correctly modify the concept's state, providing robust testing coverage for the `FriendingConcept`.
