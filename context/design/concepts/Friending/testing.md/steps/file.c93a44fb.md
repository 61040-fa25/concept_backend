---
timestamp: 'Wed Oct 15 2025 01:17:48 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_011748.b0870dda.md]]'
content_id: c93a44fba0ad447969e6fd636f77be7c695ef536f142a4c3406ce18f170153fe
---

# file: src/concepts/FriendingConcept.ts

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
 * Represents a friendship relationship between two users.
 * To ensure canonical storage and retrieval, friend IDs are stored in lexicographical order.
 */
interface Friendships {
  _id: Friendship;
  friend1: User; // The user ID that comes first lexicographically
  friend2: User; // The user ID that comes second lexicographically
}

/**
 * Represents a pending friend request from a sender to a receiver.
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
   * Helper to get the canonical representation of a pair of users for a friendship.
   * Ensures that friend1 < friend2 lexicographically. This helps in consistently
   * storing and querying friendships, avoiding duplicates like (A,B) and (B,A).
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
      // If a request exists, check if it's pending (sender->receiver) or needs acceptance (receiver->sender)
      if (existingRequest.sender === sender &&
        existingRequest.receiver === receiver) {
        return { error: "A friend request from you to this user is already pending." };
      } else {
        return { error: "This user has already sent you a friend request." };
      }
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
    const newRequestID = freshID() as FriendRequest;
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
    // Requires: request from sender to receiver to exist (meaning receiver is accepting what sender sent)
    const request = await this.friendRequests.findOne({
      sender: sender,
      receiver: receiver,
    });
    if (!request) {
      return { error: "Friend request from sender to receiver does not exist." };
    }

    // Check if friendship already exists before creating. This acts as a safeguard
    // though ideally prevented by sendRequest's pre-conditions.
    const { friend1, friend2 } = this.getCanonicalFriendPair(sender, receiver);
    const existingFriendship = await this.friendships.findOne({
      friend1: friend1,
      friend2: friend2,
    });
    if (existingFriendship) {
      // If already friends, just remove the request and indicate no new friendship was formed.
      await this.friendRequests.deleteOne({ _id: request._id });
      return { error: "Users are already friends, request removed." };
    }

    // Effects: removes friend request
    await this.friendRequests.deleteOne({ _id: request._id });

    // Effects: records friendship between sender and user
    await this.friendships.insertOne({
      _id: freshID() as Friendship,
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
      return { error: "Friend request from sender to receiver does not exist." };
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
   * _isFriends (user1: User, user2: User): { isFriend: boolean }[]
   *
   * @requires (implicit) user1 and user2 are valid User IDs in the system (managed by another concept)
   * @effects returns an array with a single object { isFriend: true } if friends, else { isFriend: false }
   */
  async _isFriends(
    { user1, user2 }: { user1: User; user2: User },
  ): Promise<{ isFriend: boolean }[] | { error: string }> {
    if (user1 === user2) {
      return [{ isFriend: false }]; // Users cannot be friends with themselves in this concept's definition
    }
    const { friend1, friend2 } = this.getCanonicalFriendPair(user1, user2);
    const friendship = await this.friendships.findOne({
      friend1: friend1,
      friend2: friend2,
    });
    return [{ isFriend: !!friendship }];
  }

  /**
   * _getFriends (user: User): { friend: User }[]
   *
   * @requires (implicit) user is a valid User ID in the system (managed by another concept)
   * @effects returns an array of objects, each with a 'friend' field containing a User ID that is friends with the input user
   */
  async _getFriends(
    { user }: { user: User },
  ): Promise<{ friend: User }[] | { error: string }> {
    const friendDocuments = await this.friendships.find({
      $or: [
        { friend1: user },
        { friend2: user },
      ],
    }).toArray();

    const friends = friendDocuments.map((doc) => ({
      friend: doc.friend1 === user ? doc.friend2 : doc.friend1,
    }));

    return friends;
  }

  /**
   * _getSentFriendRequests (sender: User): { receiver: User }[]
   *
   * @requires (implicit) sender is a valid User ID in the system (managed by another concept)
   * @effects returns an array of objects, each with a 'receiver' field containing a User ID for a pending request sent by the sender
   */
  async _getSentFriendRequests(
    { sender }: { sender: User },
  ): Promise<{ receiver: User }[] | { error: string }> {
    const requestDocuments = await this.friendRequests.find({ sender: sender })
      .toArray();
    const receivers = requestDocuments.map((doc) => ({
      receiver: doc.receiver,
    }));
    return receivers;
  }

  /**
   * _getReceivedFriendRequests (receiver: User): { sender: User }[]
   *
   * @requires (implicit) receiver is a valid User ID in the system (managed by another concept)
   * @effects returns an array of objects, each with a 'sender' field containing a User ID for a pending request received by the receiver
   */
  async _getReceivedFriendRequests(
    { receiver }: { receiver: User },
  ): Promise<{ sender: User }[] | { error: string }> {
    const requestDocuments = await this.friendRequests.find({
      receiver: receiver,
    })
      .toArray();
    const senders = requestDocuments.map((doc) => ({ sender: doc.sender }));
    return senders;
  }
}
```

Next, the test file for the `Friending` concept:
