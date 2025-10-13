---
timestamp: 'Mon Oct 13 2025 01:40:10 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_014010.bf565927.md]]'
content_id: d357526f56f0cb7a18746934dde688247ce646d54378dc33a11c79957cc8a1e5
---

# implement: Friending

## file: src/Friending/FriendingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
// Note: freshID is not strictly needed for User IDs as they come from outside this concept,
// but included for completeness if this concept were to create its own internal entities.
// import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Friending" + ".";

/**
 * @typeparam User The generic type representing a user's identity.
 *
 * The Friending concept manages relationships between users.
 * Users are externally defined entities, represented here by their IDs.
 */
type User = ID;

/**
 * Represents the state of a single user within the Friending concept.
 *
 * This state is what the executing concept remembers about the friending
 * actions involving this user.
 *
 * **state**
 *   a set of Users with
 *     a set of friends User
 *     a set of sentRequests Users
 *     a set of receivedRequests Users
 */
interface UserFriendState {
  _id: User; // The ID of the user this state belongs to
  friends: User[]; // Users this user is friends with
  sentRequests: User[]; // Users this user has sent friend requests to
  receivedRequests: User[]; // Users who have sent friend requests to this user
}

/**
 * **Concept: Friending [User]**
 *
 * **purpose** allow users to add each other as friends to share information with
 * **principle** users may add and remove each other as friends. These friendships define boundaries regarding who has access to see whose information.
 */
export default class FriendingConcept {
  // The MongoDB collection storing the friend state for each user
  private users: Collection<UserFriendState>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * **action** initializeFriendList (user: User)
   *
   * @param {object} params - The action parameters.
   * @param {User} params.user - The ID of the user to initialize.
   *
   * @returns {Promise<Empty | { error: string }>} An empty object on success, or an object with an error message.
   *
   * **requires**
   *   - `user` ID must be provided.
   *   - The user's friend state is not already initialized within this concept.
   * **effects**
   *   - Initializes the `friends`, `sentRequests`, and `receivedRequests` sets of the user to be empty.
   *   - If the user's friend state already exists, it is a no-op that returns an error.
   */
  async initializeFriendList({ user }: { user: User }): Promise<Empty | { error: string }> {
    if (!user) {
      return { error: "User ID must be provided." };
    }

    // Check if the user's friend state already exists
    const existingUser = await this.users.findOne({ _id: user });
    if (existingUser) {
      // Per concept independence, this concept only cares if its *own* state for the user is initialized.
      return { error: `Friend state of user ${user} has already been initialized.` };
    }

    // Initialize the user's friend state with empty arrays
    await this.users.insertOne({
      _id: user,
      friends: [],
      sentRequests: [],
      receivedRequests: [],
    });
    return {};
  }

  /**
   * **action** sendRequest (sender: User, receiver: User)
   *
   * @param {object} params - The action parameters.
   * @param {User} params.sender - The ID of the user sending the request.
   * @param {User} params.receiver - The ID of the user receiving the request.
   *
   * @returns {Promise<Empty | { error: string }>} An empty object on success, or an object with an error message.
   *
   * **requires**
   *   - `sender` and `receiver` IDs must be provided and not be the same.
   *   - `sender` and `receiver` must have their friend states initialized in this concept.
   *   - `receiver` is not already in `sender`'s set of friends.
   *   - A friend request from `sender` to `receiver` is not already pending.
   * **effects**
   *   - Adds `sender` to `receiver`'s set of `receivedRequests`.
   *   - Adds `receiver` to `sender`'s set of `sentRequests`.
   */
  async sendRequest({ sender, receiver }: { sender: User; receiver: User }): Promise<Empty | { error: string }> {
    if (!sender || !receiver) {
      return { error: "Sender and receiver IDs must be provided." };
    }
    if (sender === receiver) {
      return { error: "Cannot send a friend request to yourself." };
    }

    const senderState = await this.users.findOne({ _id: sender });
    const receiverState = await this.users.findOne({ _id: receiver });

    if (!senderState) {
      return { error: `Sender (ID: ${sender}) does not exist or is not initialized in Friending concept.` };
    }
    if (!receiverState) {
      return { error: `Receiver (ID: ${receiver}) does not exist or is not initialized in Friending concept.` };
    }

    if (senderState.friends.includes(receiver)) {
      return { error: `Receiver (ID: ${receiver}) is already a friend of sender (ID: ${sender}).` };
    }
    if (senderState.sentRequests.includes(receiver)) {
      return { error: `Friend request already sent from sender (ID: ${sender}) to receiver (ID: ${receiver}).` };
    }
    // Also check if receiver has already sent a request to sender, this implies a reciprocal request or ignored state.
    // While the spec doesn't explicitly mention this, it's good practice for robust friending logic.
    if (receiverState.sentRequests.includes(sender)) {
      return { error: `Receiver (ID: ${receiver}) has already sent a friend request to sender (ID: ${sender}).` };
    }


    // Update sender's sent requests
    await this.users.updateOne(
      { _id: sender },
      { $addToSet: { sentRequests: receiver } },
    );

    // Update receiver's received requests
    await this.users.updateOne(
      { _id: receiver },
      { $addToSet: { receivedRequests: sender } },
    );

    return {};
  }

  /**
   * **action** acceptRequest (sender: User, receiver: User)
   *
   * @param {object} params - The action parameters.
   * @param {User} params.sender - The ID of the user who sent the request (and is now being accepted).
   * @param {User} params.receiver - The ID of the user who is accepting the request.
   *
   * @returns {Promise<Empty | { error: string }>} An empty object on success, or an object with an error message.
   *
   * **requires**
   *   - `sender` and `receiver` IDs must be provided and not be the same.
   *   - `sender` and `receiver` must have their friend states initialized in this concept.
   *   - A friend request from `sender` must exist in `receiver`'s set of `receivedRequests`.
   * **effects**
   *   - Removes `sender` from `receiver`'s set of `receivedRequests`.
   *   - Removes `receiver` from `sender`'s set of `sentRequests`.
   *   - Adds `sender` to `receiver`'s set of `friends` and vice versa.
   */
  async acceptRequest({ sender, receiver }: { sender: User; receiver: User }): Promise<Empty | { error: string }> {
    if (!sender || !receiver) {
      return { error: "Sender and receiver IDs must be provided." };
    }
    if (sender === receiver) {
      return { error: "Cannot accept a friend request from yourself." };
    }

    const senderState = await this.users.findOne({ _id: sender });
    const receiverState = await this.users.findOne({ _id: receiver });

    if (!senderState) {
      return { error: `Sender (ID: ${sender}) does not exist or is not initialized in Friending concept.` };
    }
    if (!receiverState) {
      return { error: `Receiver (ID: ${receiver}) does not exist or is not initialized in Friending concept.` };
    }

    // Check if the request actually exists in the receiver's received requests
    if (!receiverState.receivedRequests.includes(sender)) {
      return { error: `No friend request from sender (ID: ${sender}) found in receiver's (ID: ${receiver}) received requests.` };
    }
    // Also, check if they are already friends to prevent duplicate friendships.
    if (receiverState.friends.includes(sender)) {
      return { error: `Users (ID: ${sender}) and (ID: ${receiver}) are already friends.` };
    }

    // Atomically update both users in a transaction if possible, or ensure idempotency.
    // For simplicity with MongoDB updates, we do two updates assuming eventually consistent state.

    // Remove sender from receiver's received requests
    await this.users.updateOne(
      { _id: receiver },
      { $pull: { receivedRequests: sender } },
    );
    // Remove receiver from sender's sent requests
    await this.users.updateOne(
      { _id: sender },
      { $pull: { sentRequests: receiver } },
    );

    // Add sender to receiver's friends and vice versa
    await this.users.updateOne(
      { _id: receiver },
      { $addToSet: { friends: sender } }, // $addToSet prevents duplicates if any edge case leads to it
    );
    await this.users.updateOne(
      { _id: sender },
      { $addToSet: { friends: receiver } },
    );

    return {};
  }

  /**
   * **action** removeFriend (user: User, to_be_removed_friend: User)
   *
   * @param {object} params - The action parameters.
   * @param {User} params.user - The ID of the user initiating the removal.
   * @param {User} params.to_be_removed_friend - The ID of the friend to be removed.
   *
   * @returns {Promise<Empty | { error: string }>} An empty object on success, or an object with an error message.
   *
   * **requires**
   *   - `user` and `to_be_removed_friend` IDs must be provided and not be the same.
   *   - `user` and `to_be_removed_friend` must have their friend states initialized in this concept.
   *   - `to_be_removed_friend` must be present in `user`'s set of `friends`.
   * **effects**
   *   - Removes `to_be_removed_friend` from `user`'s set of `friends`.
   *   - Removes `user` from `to_be_removed_friend`'s set of `friends`.
   */
  async removeFriend({ user, to_be_removed_friend }: { user: User; to_be_removed_friend: User }): Promise<Empty | { error: string }> {
    if (!user || !to_be_removed_friend) {
      return { error: "User and friend IDs must be provided." };
    }
    if (user === to_be_removed_friend) {
      return { error: "Cannot remove yourself as a friend." };
    }

    const userState = await this.users.findOne({ _id: user });
    const friendState = await this.users.findOne({ _id: to_be_removed_friend });

    if (!userState) {
      return { error: `User (ID: ${user}) does not exist or is not initialized in Friending concept.` };
    }
    if (!friendState) {
      return { error: `Friend (ID: ${to_be_removed_friend}) does not exist or is not initialized in Friending concept.` };
    }

    // Check if they are actually friends
    if (!userState.friends.includes(to_be_removed_friend)) {
      return { error: `User (ID: ${to_be_removed_friend}) is not a friend of user (ID: ${user}).` };
    }

    // Remove to_be_removed_friend from user's friends
    await this.users.updateOne(
      { _id: user },
      { $pull: { friends: to_be_removed_friend } },
    );
    // Remove user from to_be_removed_friend's friends
    await this.users.updateOne(
      { _id: to_be_removed_friend },
      { $pull: { friends: user } },
    );

    return {};
  }

  /**
   * **query** _getFriendState (user: User)
   *
   * @param {object} params - The query parameters.
   * @param {User} params.user - The ID of the user whose friend state is to be retrieved.
   *
   * @returns {Promise<UserFriendState[] | { error: string }>} An array containing the user's friend state, or an object with an error.
   *
   * **effects** returns the friend state (friends, sentRequests, receivedRequests) for the specified user.
   */
  async _getFriendState({ user }: { user: User }): Promise<UserFriendState[] | { error: string }> {
    if (!user) {
      return { error: "User ID must be provided." };
    }
    const userState = await this.users.findOne({ _id: user });
    if (!userState) {
      return { error: `User (ID: ${user}) does not exist or is not initialized in Friending concept.` };
    }
    return [userState]; // Queries typically return arrays
  }

  /**
   * **query** _areFriends (user1: User, user2: User)
   *
   * @param {object} params - The query parameters.
   * @param {User} params.user1 - The ID of the first user.
   * @param {User} params.user2 - The ID of the second user.
   *
   * @returns {Promise<{ areFriends: boolean }[] | { error: string }>} An array containing an object with `areFriends` status, or an object with an error.
   *
   * **effects** returns true if user1 and user2 are friends, false otherwise.
   */
  async _areFriends({ user1, user2 }: { user1: User; user2: User }): Promise<{ areFriends: boolean }[] | { error: string }> {
    if (!user1 || !user2) {
      return { error: "Both user1 and user2 IDs must be provided." };
    }
    // For friendship to exist, both users must have their state initialized and be mutually listed.
    // We only need to check one side, as `acceptRequest` and `removeFriend` ensure reciprocity.
    const user1State = await this.users.findOne({ _id: user1 });
    if (!user1State) {
      return { error: `User (ID: ${user1}) does not exist or is not initialized in Friending concept.` };
    }
    // We don't necessarily need to check user2's initialization or state *if* user1's state is accurate.
    // However, if we want to ensure robust querying (e.g., if state could be inconsistent),
    // we might check user2's state as well, but for a well-behaved concept, checking one side is sufficient.
    const areFriends = user1State.friends.includes(user2);
    return [{ areFriends }];
  }
}
```

***
