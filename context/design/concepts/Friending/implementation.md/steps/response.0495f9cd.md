---
timestamp: 'Sun Oct 12 2025 02:04:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_020419.3a5d630f.md]]'
content_id: 0495f9cda7d55098b2c5637d5980bf5c278ce0fdaa943271e57b229079b97447
---

# response:

```typescript
// file: src/friending/FriendingConcept.ts

import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
// Assuming @utils/database.ts provides freshID if needed for _id creation,
// though for external IDs like 'User', we typically use the provided ID directly.

// Declare collection prefix, use concept name
const PREFIX = "Friending" + ".";

// Generic type of this concept: User
type User = ID;

/**
 * State of the Friending concept:
 *
 * a set of Users with
 *   a set of friends User
 *   a set of sentRequests Users
 *   a set of receivedRequests Users
 */
interface UserFriendingState {
  _id: User; // The ID of the user (e.g., "user:Alice")
  friends: User[]; // List of User IDs who are friends with this user
  sentRequests: User[]; // List of User IDs to whom this user has sent friend requests
  receivedRequests: User[]; // List of User IDs from whom this user has received friend requests
}

/**
 * concept Friending [User]
 *
 * purpose: allow users to add each other as friends to share information with
 *
 * principle: users may add and remove each other as friends. These friendships define
 *            boundaries regarding who has access to see whose information.
 */
export default class FriendingConcept {
  private users: Collection<UserFriendingState>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    // Optionally, ensure indexes for performance if needed.
    // E.g., for querying sent/received requests or friends of a specific user.
  }

  /**
   * Helper method to ensure a user document exists in this concept's collection.
   * If the user doesn't exist, it creates a new entry with empty arrays for relationships.
   * @param userId The ID of the user to ensure existence for.
   * @returns The existing or newly created user document.
   */
  private async ensureUserExists(userId: User): Promise<UserFriendingState> {
    const user = await this.users.findOne({ _id: userId });
    if (!user) {
      const newUser: UserFriendingState = {
        _id: userId,
        friends: [],
        sentRequests: [],
        receivedRequests: [],
      };
      await this.users.insertOne(newUser);
      return newUser;
    }
    return user;
  }

  /**
   * sendRequest (sender: User, receiver: User)
   *
   * requires: sender and receiver to exist (or implicitly created by ensureUserExists),
   *           sender is not the receiver,
   *           receiver not already in sender's set of friends or sent requests,
   *           receiver has not already sent a request to sender.
   *
   * effects: adds sender to receiver's set of received requests,
   *          adds receiver to sender's set of sent requests.
   */
  public async sendRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<Empty | { error: string }> {
    if (sender === receiver) {
      return { error: "Cannot send friend request to yourself." };
    }

    // Ensure both users have an entry in the friending state
    const senderDoc = await this.ensureUserExists(sender);
    const receiverDoc = await this.ensureUserExists(receiver);

    // Check for existing relationships or pending requests
    if (senderDoc.friends.includes(receiver)) {
      return { error: "You are already friends with this user." };
    }
    if (senderDoc.sentRequests.includes(receiver)) {
      return { error: "Friend request already sent to this user." };
    }
    if (receiverDoc.sentRequests.includes(sender)) {
      return {
        error: "This user has already sent you a friend request. Please accept it instead.",
      };
    }

    // Add receiver to sender's sentRequests
    await this.users.updateOne(
      { _id: sender },
      { $addToSet: { sentRequests: receiver } },
    );

    // Add sender to receiver's receivedRequests
    await this.users.updateOne(
      { _id: receiver },
      { $addToSet: { receivedRequests: sender } },
    );

    return {};
  }

  /**
   * acceptRequest (sender: User, receiver: User)
   *
   * requires: request from sender exists in receiver's set of received requests.
   *
   * effects: removes sender from receiver's set of received requests,
   *          removes receiver from sender's set of sent requests,
   *          adds sender to receiver's set of friends and vice versa.
   */
  public async acceptRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<Empty | { error: string }> {
    // Ensure both users have an entry in the friending state
    const senderDoc = await this.ensureUserExists(sender);
    const receiverDoc = await this.ensureUserExists(receiver);

    // Check if the request from sender exists in receiver's receivedRequests
    if (!receiverDoc.receivedRequests.includes(sender)) {
      return { error: "No pending friend request from this user." };
    }

    // Remove sender from receiver's receivedRequests
    await this.users.updateOne(
      { _id: receiver },
      { $pull: { receivedRequests: sender } },
    );
    // Remove receiver from sender's sentRequests
    await this.users.updateOne(
      { _id: sender },
      { $pull: { sentRequests: receiver } },
    );

    // Add sender to receiver's friends
    await this.users.updateOne(
      { _id: receiver },
      { $addToSet: { friends: sender } },
    );
    // Add receiver to sender's friends
    await this.users.updateOne(
      { _id: sender },
      { $addToSet: { friends: receiver } },
    );

    return {};
  }

  /**
   * removeFriend (user: User, to_be_removed_friend: User)
   *
   * requires: to_be_removed_friend to be in user's set of friends.
   *
   * effects: removes to_be_removed_friend from user's set of friends and vice versa.
   */
  public async removeFriend(
    { user, to_be_removed_friend }: { user: User; to_be_removed_friend: User },
  ): Promise<Empty | { error: string }> {
    // Check if both users exist in the concept's state
    const userDoc = await this.users.findOne({ _id: user });
    const friendDoc = await this.users.findOne({ _id: to_be_removed_friend });

    if (!userDoc || !friendDoc) {
      return { error: "One or both users do not exist in the friending context." };
    }

    // Check if to_be_removed_friend is actually in user's friends list
    if (!userDoc.friends.includes(to_be_removed_friend)) {
      return { error: "This user is not in your friends list." };
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

  // --- Queries ---

  /**
   * _getFriends (user: User): (friends: User[])
   * effects: Returns the list of friends for the given user.
   */
  public async _getFriends(
    { user }: { user: User },
  ): Promise<{ friends: User[] } | { error: string }> {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return { error: "User not found in friending context." };
    }
    return { friends: userDoc.friends };
  }

  /**
   * _getSentRequests (user: User): (sentRequests: User[])
   * effects: Returns the list of users to whom the given user has sent requests.
   */
  public async _getSentRequests(
    { user }: { user: User },
  ): Promise<{ sentRequests: User[] } | { error: string }> {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return { error: "User not found in friending context." };
    }
    return { sentRequests: userDoc.sentRequests };
  }

  /**
   * _getReceivedRequests (user: User): (receivedRequests: User[])
   * effects: Returns the list of users from whom the given user has received requests.
   */
  public async _getReceivedRequests(
    { user }: { user: User },
  ): Promise<{ receivedRequests: User[] } | { error: string }> {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return { error: "User not found in friending context." };
    }
    return { receivedRequests: userDoc.receivedRequests };
  }
}
```
