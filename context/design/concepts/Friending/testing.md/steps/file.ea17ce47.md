---
timestamp: 'Wed Oct 15 2025 01:25:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_012558.7987f024.md]]'
content_id: ea17ce470700a25deeca021c735b3d3e6e365146125d111c88c8933e8a7ee260
---

# file: src/concepts/Friending/FriendingConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Friending" + ".";

// Generic types of this concept
type User = ID;
type FriendRequest = ID;
type Friendship = ID;

/**
 * a set of Friendships with
 *   a friend 1 User
 *   a friend 2 User
 */
interface Friendships {
  _id: Friendship;
  friend1: User; // To ensure canonical storage and retrieval, store friends in lexicographical order.
  friend2: User;
}

/**
 * a set of FriendRequests with
 *   a sender User
 *   a receiver User
 */
interface FriendRequests {
  _id: FriendRequest;
  sender: User;
  receiver: User;
}

/**
 * FriendingConcept
 *
 * @concept Friending [User]
 * @purpose allow users to add each other as friends to share information with
 * @principle Users can send friend requests to other users. Users who have received friend requests have the option to accept or deny the request. If a friend request (say between User A and User B) is accepted, then User A and User B become friends.
 */
export default class FriendingConcept {
  friendships: Collection<Friendships>;
  friendRequests: Collection<FriendRequests>;

  constructor(private readonly db: Db) {
    this.friendships = this.db.collection(PREFIX + "friendships");
    this.friendRequests = this.db.collection(PREFIX + "friendRequests");
  }

  /**
   * Helper to find a friendship between two users, regardless of order.
   * Stores friends in lexicographical order (friend1 < friend2) for canonical representation.
   */
  private getCanonicalFriendPair(user1: User, user2: User): {
    friend1: User;
    friend2: User;
  } {
    return user1 < user2
      ? { friend1: user1, friend2: user2 }
      : { friend1: user2, friend2: user1 };
  }

  /**
   * sendRequest (sender: User, receiver: User): (request: FriendRequest)
   *
   * @requires sender is not the receiver, friend request from sender to receiver or vice versa does not already exist, friendship between sender and receiver does not already exist
   * @effects creates a new friend request from sender to receiver; returns the new request's ID
   */
  async sendRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<{ request: FriendRequest } | { error: string }> {
    // Requires: sender is not the receiver
    if (sender === receiver) {
      return { error: "Sender cannot send a friend request to themselves." };
    }

    // Requires: friend request from sender to receiver or vice versa does not already exist
    const existingRequest = await this.friendRequests.findOne({
      $or: [
        { sender: sender, receiver: receiver },
        { sender: receiver, receiver: sender },
      ],
    });
    if (existingRequest) {
      return {
        error: "A friend request between these users already exists.",
      };
    }

    // Requires: friendship between sender and receiver does not already exist
    const { friend1, friend2 } = this.getCanonicalFriendPair(sender, receiver);
    const existingFriendship = await this.friendships.findOne({
      friend1: friend1,
      friend2: friend2,
    });
    if (existingFriendship) {
      return { error: "Users are already friends." };
    }

    // Effects: creates a new friend request from sender to receiver
    const newRequestID = freshID();
    await this.friendRequests.insertOne({
      _id: newRequestID,
      sender: sender,
      receiver: receiver,
    });

    // Effects: returns the new request's ID
    return { request: newRequestID };
  }

  /**
   * acceptRequest (sender: User, receiver: User): Empty
   *
   * @requires request from sender to receiver to exist
   * @effects removes friend request, records friendship between sender and user
   */
  async acceptRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<Empty | { error: string }> {
    // Requires: request from sender to receiver to exist
    const request = await this.friendRequests.findOne({
      sender: sender,
      receiver: receiver,
    });
    if (!request) {
      return { error: "Friend request does not exist." };
    }

    // Effects: removes friend request
    await this.friendRequests.deleteOne({ _id: request._id });

    // Effects: records friendship between sender and user
    const { friend1, friend2 } = this.getCanonicalFriendPair(sender, receiver);
    await this.friendships.insertOne({
      _id: freshID(),
      friend1: friend1,
      friend2: friend2,
    });

    return {};
  }

  /**
   * denyRequest (sender: User, receiver: User): Empty
   *
   * @requires request from sender to receiver to exist
   * @effects removes friend request
   */
  async denyRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<Empty | { error: string }> {
    // Requires: request from sender to receiver to exist
    const request = await this.friendRequests.findOne({
      sender: sender,
      receiver: receiver,
    });
    if (!request) {
      return { error: "Friend request does not exist." };
    }

    // Effects: removes friend request
    await this.friendRequests.deleteOne({ _id: request._id });

    return {};
  }

  /**
   * removeFriend (user: User, to_be_removed_friend: User): Empty
   *
   * @requires friendship between user and to_be_removed_friend must exist
   * @effects removes friendship between user and to_be_removed_friend
   */
  async removeFriend(
    { user, to_be_removed_friend }: { user: User; to_be_removed_friend: User },
  ): Promise<Empty | { error: string }> {
    // Requires: friendship between user and to_be_removed_friend must exist
    const { friend1, friend2 } = this.getCanonicalFriendPair(
      user,
      to_be_removed_friend,
    );
    const friendship = await this.friendships.findOne({
      friend1: friend1,
      friend2: friend2,
    });
    if (!friendship) {
      return { error: "Friendship does not exist." };
    }

    // Effects: removes friendship between user and to_be_removed_friend
    await this.friendships.deleteOne({ _id: friendship._id });

    return {};
  }

  /**
   * _isFriends (user1: User, user2: User): Promise<{ areFriends: boolean[] }>
   *
   * @requires user1 and user2 are valid User IDs (implicit, as concept doesn't manage User existence)
   * @effects returns an object with an 'areFriends' field containing an array with a single boolean indicating if users are friends
   */
  async _isFriends(
    { user1, user2 }: { user1: User; user2: User },
  ): Promise<{ areFriends: boolean[] }> {
    if (user1 === user2) {
      return { areFriends: [false] }; // Cannot be friends with self in this context
    }
    const { friend1, friend2 } = this.getCanonicalFriendPair(user1, user2);
    const friendship = await this.friendships.findOne({
      friend1: friend1,
      friend2: friend2,
    });
    return { areFriends: [!!friendship] };
  }

  /**
   * _getFriends (user: User): Promise<{ friends: User[] }>
   *
   * @requires user is a valid User ID (implicit)
   * @effects returns an object with a 'friends' field containing an array of User IDs that are friends with the specified user
   */
  async _getFriends(
    { user }: { user: User },
  ): Promise<{ friends: User[] }> {
    const friendDocuments = await this.friendships.find({
      $or: [
        { friend1: user },
        { friend2: user },
      ],
    }).toArray();

    const friends = friendDocuments.map((doc) =>
      doc.friend1 === user ? doc.friend2 : doc.friend1
    );

    return { friends: friends };
  }

  /**
   * _getSentFriendRequests (sender: User): Promise<{ sentRequests: User[] }>
   *
   * @requires sender is a valid User ID (implicit)
   * @effects returns an object with a 'sentRequests' field containing an array of User IDs to whom the sender has sent requests
   */
  async _getSentFriendRequests(
    { sender }: { sender: User },
  ): Promise<{ sentRequests: User[] }> {
    const requestDocuments = await this.friendRequests.find({ sender: sender })
      .toArray();
    const receivers = requestDocuments.map((doc) => doc.receiver);
    return { sentRequests: receivers };
  }

  /**
   * _getReceivedFriendRequests (receiver: User): Promise<{ receivedRequests: User[] }>
   *
   * @requires receiver is a valid User ID (implicit)
   * @effects returns an object with a 'receivedRequests' field containing an array of User IDs who have sent requests to the receiver
   */
  async _getReceivedFriendRequests(
    { receiver }: { receiver: User },
  ): Promise<{ receivedRequests: User[] }> {
    const requestDocuments = await this.friendRequests.find({
      receiver: receiver,
    })
      .toArray();
    const senders = requestDocuments.map((doc) => doc.sender);
    return { receivedRequests: senders };
  }
}

```
