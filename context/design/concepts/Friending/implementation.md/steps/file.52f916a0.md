---
timestamp: 'Tue Oct 14 2025 01:16:54 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_011654.ef97d611.md]]'
content_id: 52f916a0b66fd3a74342949b4f144a43b395ba22a8859db3ef4d51e45fd5b753
---

# file: src/concepts/Friending/FriendingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts"; // Assuming utils are in parent directory
import { freshID } from "../../utils/database.ts"; // Assuming utils are in parent directory

/**
 * Concept: Friending (User)
 *
 * @purpose allow users to add each other as friends to share information with
 * @principle If user A sends a friend request to user B, and user B accepts the request, then A and B become friends. After becoming friends, either party has the option to remove the other as a friend. Alternatively, user B also has the option to deny the request from user A should they wish to.
 */

// Declare collection prefix, use concept name
const PREFIX = "Friending" + ".";

// Generic type of this concept
type User = ID;

/**
 * State: a set of Friendships
 * @state a set of Friendships with a set of Users (length 2)
 */
interface FriendshipDoc {
  _id: ID; // Unique ID for the friendship
  users: [User, User]; // Store users in a sorted array to ensure uniqueness regardless of order
}

/**
 * State: a set of FriendRequests
 * @state a set of FriendRequests with a sender User and a receiver User
 */
interface FriendRequestDoc {
  _id: ID; // Unique ID for the request
  sender: User;
  receiver: User;
}

export default class FriendingConcept {
  private friendships: Collection<FriendshipDoc>;
  private friendRequests: Collection<FriendRequestDoc>;

  constructor(private readonly db: Db) {
    this.friendships = this.db.collection(PREFIX + "friendships");
    this.friendRequests = this.db.collection(PREFIX + "friendRequests");
  }

  /**
   * Action: sendRequest
   * @requires sender is not the receiver, friend request from sender to receiver or vice versa does not already exist, friendship does not already exist
   * @effects creates a new friend request from sender to receiver
   */
  async sendRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<Empty | { error: string }> {
    if (sender === receiver) {
      return { error: "Cannot send friend request to self." };
    }

    // Check for existing pending request (sender -> receiver or receiver -> sender)
    const existingRequest = await this.friendRequests.findOne({
      $or: [
        { sender: sender, receiver: receiver },
        { sender: receiver, receiver: sender },
      ],
    });
    if (existingRequest) {
      return { error: "Friend request already exists or is pending." };
    }

    // Check for existing friendship
    const sortedUsers: [User, User] = [sender, receiver].sort() as [User, User];
    const existingFriendship = await this.friendships.findOne({
      users: sortedUsers,
    });
    if (existingFriendship) {
      return { error: "Users are already friends." };
    }

    // Create new friend request
    const newRequest: FriendRequestDoc = {
      _id: freshID(),
      sender,
      receiver,
    };
    await this.friendRequests.insertOne(newRequest);
    return {};
  }

  /**
   * Action: acceptRequest
   * @requires request from sender to receiver to exist
   * @effects removes friend request, records friendship between sender and user
   */
  async acceptRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<Empty | { error: string }> {
    // Find and remove the friend request
    const deleteResult = await this.friendRequests.deleteOne({
      sender: sender,
      receiver: receiver,
    });

    if (deleteResult.deletedCount === 0) {
      return { error: "Friend request not found." };
    }

    // Record the friendship
    const sortedUsers: [User, User] = [sender, receiver].sort() as [User, User];
    const newFriendship: FriendshipDoc = {
      _id: freshID(),
      users: sortedUsers,
    };
    await this.friendships.insertOne(newFriendship);
    return {};
  }

  /**
   * Action: denyRequest
   * @requires request from sender to receiver to exist
   * @effects removes friend request
   */
  async denyRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<Empty | { error: string }> {
    const deleteResult = await this.friendRequests.deleteOne({
      sender: sender,
      receiver: receiver,
    });

    if (deleteResult.deletedCount === 0) {
      return { error: "Friend request not found." };
    }

    return {};
  }

  /**
   * Action: removeFriend
   * @requires friendship between user and to_be_removed_friend must exist
   * @effects removes friendship between user and to_be_removed_friend
   */
  async removeFriend(
    { user, to_be_removed_friend }: { user: User; to_be_removed_friend: User },
  ): Promise<Empty | { error: string }> {
    const sortedUsers: [User, User] = [user, to_be_removed_friend].sort() as [
      User,
      User,
    ];

    const deleteResult = await this.friendships.deleteOne({
      users: sortedUsers,
    });

    if (deleteResult.deletedCount === 0) {
      return { error: "Friendship not found." };
    }

    return {};
  }

  /**
   * Query: _getFriends
   * Returns a list of users who are friends with the given user.
   */
  async _getFriends(
    { user }: { user: User },
  ): Promise<{ friends: User[] }> {
    const friendships = await this.friendships.find({
      users: user,
    }).toArray();

    const friends = friendships.flatMap((f) =>
      f.users.filter((u) => u !== user)
    );
    return { friends };
  }

  /**
   * Query: _getFriendRequests
   * Returns a list of pending friend requests where the given user is either sender or receiver.
   */
  async _getFriendRequests(
    { user }: { user: User },
  ): Promise<{ sent: FriendRequestDoc[]; received: FriendRequestDoc[] }> {
    const sentRequests = await this.friendRequests.find({ sender: user })
      .toArray();
    const receivedRequests = await this.friendRequests.find({ receiver: user })
      .toArray();
    return { sent: sentRequests, received: receivedRequests };
  }
}

```
