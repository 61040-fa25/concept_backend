---
timestamp: 'Wed Oct 15 2025 01:06:00 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_010600.75131cb2.md]]'
content_id: 32fe639376c0db091b20a281fad70da0481db7ddba4e0479900bf38583f8fed5
---

# file: src/concepts/FriendingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * @concept Friending (User)
 * @purpose allow users to add each other as friends to share information with
 * @principle Users can send friend requests to other users. Users who have received friend requests have the option to accept or deny the request. If a friend request (say between User A and User B) is accepted, then User A and User B become friends.
 */

// Declare collection prefix, use concept name
const PREFIX = "Friending" + ".";

// Generic type of this concept
type User = ID;
type FriendRequest = ID; // The ID of a specific FriendRequest document

/**
 * a set of Friendships with
 *   a friend 1 User
 *   a friend 2 User
 */
interface FriendshipDoc {
  _id: ID; // Unique ID for the friendship record
  friend1: User; // User ID, canonically smaller (alphabetically)
  friend2: User; // User ID, canonically larger (alphabetically)
}

/**
 * a set of FriendRequests with
 *   a sender User
 *   a receiver User
 */
interface FriendRequestDoc {
  _id: FriendRequest;
  sender: User;
  receiver: User;
}

export default class FriendingConcept {
  friendships: Collection<FriendshipDoc>;
  friendRequests: Collection<FriendRequestDoc>;

  constructor(private readonly db: Db) {
    this.friendships = this.db.collection(PREFIX + "friendships");
    this.friendRequests = this.db.collection(PREFIX + "friendRequests");
  }

  /**
   * Helper to ensure canonical order for friends (e.g., for friendship storage and lookup)
   */
  private getCanonicalFriends(user1: User, user2: User): [User, User] {
    return user1 < user2 ? [user1, user2] : [user2, user1];
  }

  /**
   * sendRequest (sender: User, receiver: User): (request: FriendRequest)
   *
   * **requires** sender is not the receiver, friend request from sender to receiver or vice versa does not already exist, friendship between sender and receiver does not already exist
   *
   * **effects** creates a new friend request from sender to receiver; returns the new request ID as `request`
   */
  async sendRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<{ request: FriendRequest } | { error: string }> {
    if (sender === receiver) {
      return { error: "Sender cannot be the receiver." };
    }

    // Check for existing request (sender->receiver or receiver->sender)
    const existingRequest = await this.friendRequests.findOne({
      $or: [
        { sender: sender, receiver: receiver },
        { sender: receiver, receiver: sender },
      ],
    });
    if (existingRequest) {
      return { error: "A friend request already exists between these users." };
    }

    // Check for existing friendship
    const [f1, f2] = this.getCanonicalFriends(sender, receiver);
    const existingFriendship = await this.friendships.findOne({
      friend1: f1,
      friend2: f2,
    });
    if (existingFriendship) {
      return { error: "Users are already friends." };
    }

    const newRequestId = freshID();
    const newRequest: FriendRequestDoc = {
      _id: newRequestId,
      sender: sender,
      receiver: receiver,
    };
    await this.friendRequests.insertOne(newRequest);

    return { request: newRequestId };
  }

  /**
   * acceptRequest (sender: User, receiver: User): Empty
   *
   * **requires** request from sender to receiver to exist; friendship between sender and receiver does not already exist
   *
   * **effects** removes friend request; records friendship between sender and receiver
   */
  async acceptRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<Empty | { error: string }> {
    const request = await this.friendRequests.findOne({
      sender: sender,
      receiver: receiver,
    });
    if (!request) {
      return { error: "No friend request found from sender to receiver." };
    }

    // Check for existing friendship before creating
    const [f1, f2] = this.getCanonicalFriends(sender, receiver);
    const existingFriendship = await this.friendships.findOne({
      friend1: f1,
      friend2: f2,
    });
    if (existingFriendship) {
      // This should ideally be caught by sendRequest, but good to double check
      await this.friendRequests.deleteOne({ _id: request._id }); // Clean up the request
      return { error: "Users are already friends." };
    }

    // Remove the friend request
    await this.friendRequests.deleteOne({ _id: request._id });

    // Record friendship
    const friendshipId = freshID();
    const newFriendship: FriendshipDoc = {
      _id: friendshipId,
      friend1: f1,
      friend2: f2,
    };
    await this.friendships.insertOne(newFriendship);

    return {};
  }

  /**
   * denyRequest (sender: User, receiver: User): Empty
   *
   * **requires** request from sender to receiver to exist
   *
   * **effects** removes friend request
   */
  async denyRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<Empty | { error: string }> {
    const request = await this.friendRequests.findOne({
      sender: sender,
      receiver: receiver,
    });
    if (!request) {
      return { error: "No friend request found from sender to receiver." };
    }

    // Remove the friend request
    await this.friendRequests.deleteOne({ _id: request._id });

    return {};
  }

  /**
   * removeFriend (user: User, to_be_removed_friend: User): Empty
   *
   * **requires** friendship between user and to_be_removed_friend must exist
   *
   * **effects** removes friendship between user and to_be_removed_friend
   */
  async removeFriend(
    { user, to_be_removed_friend }: { user: User; to_be_removed_friend: User },
  ): Promise<Empty | { error: string }> {
    if (user === to_be_removed_friend) {
      return { error: "Cannot remove self as friend." };
    }

    const [f1, f2] = this.getCanonicalFriends(user, to_be_removed_friend);

    const result = await this.friendships.deleteOne({
      friend1: f1,
      friend2: f2,
    });

    if (result.deletedCount === 0) {
      return { error: "No friendship found between these users." };
    }

    return {};
  }

  // --- Queries ---

  /**
   * _getFriendRequests(user: User): (requests: { sender: User, receiver: User, requestId: FriendRequest }[])
   *
   * **requires** true
   *
   * **effects** returns all friend requests where the given user is either the sender or receiver
   */
  async _getFriendRequests(
    { user }: { user: User },
  ): Promise<{ requests: { sender: User; receiver: User; requestId: FriendRequest }[] }> {
    const requests = await this.friendRequests.find({
      $or: [{ sender: user }, { receiver: user }],
    }).toArray();

    return {
      requests: requests.map((req) => ({
        sender: req.sender,
        receiver: req.receiver,
        requestId: req._id,
      })),
    };
  }

  /**
   * _getFriends(user: User): (friends: User[])
   *
   * **requires** true
   *
   * **effects** returns a list of users who are friends with the given user
   */
  async _getFriends(
    { user }: { user: User },
  ): Promise<{ friends: User[] }> {
    const friendships = await this.friendships.find({
      $or: [{ friend1: user }, { friend2: user }],
    }).toArray();

    const friends: User[] = friendships.map((f) =>
      f.friend1 === user ? f.friend2 : f.friend1
    );

    return { friends };
  }

  /**
   * _getFriendship(user1: User, user2: User): (friendship: boolean)
   *
   * **requires** true
   *
   * **effects** returns true if a friendship exists between user1 and user2, false otherwise
   */
  async _getFriendship(
    { user1, user2 }: { user1: User; user2: User },
  ): Promise<{ friendship: boolean }> {
    const [f1, f2] = this.getCanonicalFriends(user1, user2);
    const existingFriendship = await this.friendships.findOne({
      friend1: f1,
      friend2: f2,
    });
    return { friendship: !!existingFriendship };
  }
}
```
