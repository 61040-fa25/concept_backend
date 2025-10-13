---
timestamp: 'Mon Oct 13 2025 02:07:07 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_020707.c7869604.md]]'
content_id: 0fff8605af6ae05765e524eac14ee7406e712f046734aa646a9769eba1f84719
---

# response:

```typescript
// file: src/Friending/FriendingConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * Concept: Friending [User]
 * purpose: allow users to add each other as friends to share information with
 */
const PREFIX = "Friending" + ".";

// Generic types of this concept
type User = ID;

/**
 * State: a set of Users with a friends set of Users
 */
interface UserFriends {
  _id: User;
  friends: User[];
}

/**
 * State: a set of FriendRequests with a sender User, a receiver User
 */
interface FriendRequest {
  _id: ID;
  sender: User;
  receiver: User;
}

export default class FriendingConcept {
  users: Collection<UserFriends>;
  friendRequests: Collection<FriendRequest>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.friendRequests = this.db.collection(PREFIX + "friendRequests");
  }

  /**
   * action: sendRequest (sender: User, receiver: User)
   * requires: sender is not the receiver, friend request from sender to receiver does not already exist,
   *           sender and receiver are not already friends.
   * effects: creates a new friend request from sender to receiver
   */
  async sendRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<Empty | { error: string }> {
    // requires: sender is not the receiver
    if (sender === receiver) {
      return { error: "Sender cannot send a friend request to themselves." };
    }

    // Check if a request already exists in either direction
    const existingRequest = await this.friendRequests.findOne({
      $or: [
        { sender: sender, receiver: receiver },
        { sender: receiver, receiver: sender },
      ],
    });
    // requires: friend request from sender to receiver does not already exist
    if (existingRequest) {
      return { error: "A friend request already exists between these users." };
    }

    // Check if they are already friends
    const senderFriends = await this.users.findOne({ _id: sender });
    if (senderFriends?.friends.includes(receiver)) {
      return { error: "Users are already friends." };
    }

    // effects: creates a new friend request from sender to receiver
    await this.friendRequests.insertOne({
      _id: freshID(),
      sender,
      receiver,
    });

    return {};
  }

  /**
   * action: acceptRequest (sender: User, receiver: User)
   * requires: request from sender to receiver to exist
   * effects: removes friend request, adds sender to receiver's set of friends and vice versa
   */
  async acceptRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<Empty | { error: string }> {
    // requires: request from sender to receiver to exist
    const request = await this.friendRequests.findOne({ sender, receiver });
    if (!request) {
      return { error: "Friend request not found." };
    }

    // effects: removes friend request
    await this.friendRequests.deleteOne({ _id: request._id });

    // effects: adds sender to receiver's set of friends and vice versa
    await this.users.updateOne(
      { _id: sender },
      { $addToSet: { friends: receiver } },
      { upsert: true }, // Create user document if it doesn't exist
    );
    await this.users.updateOne(
      { _id: receiver },
      { $addToSet: { friends: sender } },
      { upsert: true }, // Create user document if it doesn't exist
    );

    return {};
  }

  /**
   * action: denyRequest (sender: User, receiver: User)
   * requires: request from sender to receiver to exist
   * effects: removes friend request
   */
  async denyRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<Empty | { error: string }> {
    // requires: request from sender to receiver to exist
    const request = await this.friendRequests.findOne({ sender, receiver });
    if (!request) {
      return { error: "Friend request not found." };
    }

    // effects: removes friend request
    await this.friendRequests.deleteOne({ _id: request._id });

    return {};
  }

  /**
   * action: removeFriend (user: User, to_be_removed_friend: User)
   * requires: to_be_removed_friend to be in user's set of friends
   * effects: removes to_be_removed_friend from user's set of friends and vice versa
   */
  async removeFriend(
    { user, to_be_removed_friend }: { user: User; to_be_removed_friend: User },
  ): Promise<Empty | { error: string }> {
    // requires: to_be_removed_friend to be in user's set of friends
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc || !userDoc.friends.includes(to_be_removed_friend)) {
      return { error: "User is not friends with to_be_removed_friend." };
    }

    // effects: removes to_be_removed_friend from user's set of friends
    await this.users.updateOne(
      { _id: user },
      { $pull: { friends: to_be_removed_friend } },
    );

    // effects: removes user from to_be_removed_friend's set of friends
    await this.users.updateOne(
      { _id: to_be_removed_friend },
      { $pull: { friends: user } },
    );

    return {};
  }

  /**
   * query: _getFriends (user: User)
   * effects: returns the list of friends for a given user
   */
  async _getFriends({ user }: { user: User }): Promise<User[]> {
    const userDoc = await this.users.findOne({ _id: user });
    return userDoc?.friends || [];
  }

  /**
   * query: _getFriendRequests (user: User)
   * effects: returns friend requests where the user is the receiver
   */
  async _getFriendRequests({ user }: { user: User }): Promise<FriendRequest[]> {
    return await this.friendRequests.find({ receiver: user }).toArray();
  }

  /**
   * query: _getSentFriendRequests (user: User)
   * effects: returns friend requests where the user is the sender
   */
  async _getSentFriendRequests({ user }: { user: User }): Promise<FriendRequest[]> {
    return await this.friendRequests.find({ sender: user }).toArray();
  }
}
```
