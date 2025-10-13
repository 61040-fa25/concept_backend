---
timestamp: 'Mon Oct 13 2025 02:06:37 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_020637.82c87620.md]]'
content_id: 7e2608e1c39d5ca2b5a7a54d45347016c8983376893eba881892792ede54d4a2
---

# response:

```typescript
// file: src/Friending/FriendingConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts"; // Not strictly needed for User IDs as they come from outside, but good to include if this concept created its own internal entities.

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
 * A set of Users with:
 *   - a set of friends User
 *   - a set of sentRequests Users
 *   - a set of receivedRequests Users
 */
interface UserFriendState {
  _id: User; // The ID of the user this state belongs to
  friends: User[];
  sentRequests: User[];
  receivedRequests: User[];
}

/**
 * **Concept: Friending [User]**
 *
 * **purpose** allow users to add each other as friends to share information with
 * **principle** users may add and remove each other as friends. These friendships define boundaries regarding who has access to see whose information.
 */
export default class FriendingConcept {
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
   * **requires** user to exist (conceptually, i.e., is a valid ID from an external source)
   * **effects** initializes the set of friends, sentRequests, and receivedRequests of the user to be empty.
   *            If the user's friend state already exists, it is a no-op.
   */
  async initializeFriendList({ user }: { user: User }): Promise<Empty | { error: string }> {
    if (!user) {
      return { error: "User ID must be provided." };
    }

    // Check if the user's friend state already exists
    const existingUser = await this.users.findOne({ _id: user });
    if (existingUser) {
      return { error: `Friend state of user ${user} has already been initialized`};
    }

    // Initialize the user's friend state
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
   *   - sender and receiver to exist (in Friending's state).
   *   - sender is not the receiver.
   *   - receiver not already in sender's set of friends.
   *   - receiver not already in sender's set of sent requests.
   * **effects**
   *   - adds sender to receiver's set of received requests.
   *   - adds receiver to sender's set of sent requests.
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
   *   - request from sender exists in receiver's set of received requests.
   *   - sender and receiver to exist (in Friending's state).
   * **effects**
   *   - removes sender from receiver's set of received requests.
   *   - removes receiver from sender's set of sent requests.
   *   - adds sender to receiver's set of friends and vice versa.
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

    if (!receiverState.receivedRequests.includes(sender)) {
      return { error: `No friend request from sender (ID: ${sender}) found in receiver's (ID: ${receiver}) received requests.` };
    }

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
      { $addToSet: { friends: sender } },
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
   *   - to_be_removed_friend to be in user's set of friends.
   *   - user and to_be_removed_friend to exist (in Friending's state).
   * **effects**
   *   - removes to_be_removed_friend from user's set of friends and vice versa.
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
   * **effects** return the friend state (friends, sentRequests, receivedRequests) for the specified user.
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
    const user1State = await this.users.findOne({ _id: user1 });
    if (!user1State) {
      return { error: `User (ID: ${user1}) does not exist or is not initialized in Friending concept.` };
    }
    const areFriends = user1State.friends.includes(user2);
    return [{ areFriends }];
  }
}
```
