---
timestamp: 'Mon Oct 13 2025 02:17:38 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_021738.08ad9ec1.md]]'
content_id: d25a29b9e33e18367861fea7e93d7db799cbaeac3d637b84afa266b07b2ac4ea
---

# response:

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts"; // Assuming this utility exists

// --- Concept: Friending (User) ---

/**
 * @concept Friending [User]
 * @purpose allow users to add each other as friends to share information with
 * @principle If user A sends a friend request to user B, and user B accepts the request,
 * then A and B become friends. After becoming friends, either party has the option
 * to remove the other as a friend. Alternatively, user B also has the option to deny
 * the request from user A should they wish to.
 */

// Declare collection prefix, use concept name
const PREFIX = "Friending" + ".";

// Generic types of this concept
type User = ID;

/**
 * @state a set of Friendships with a set of Users (length 2)
 */
interface Friendship {
  _id: ID;
  // To ensure canonical representation, u1 < u2 lexicographically
  u1: User;
  u2: User;
}

/**
 * @state a set of FriendRequests with a sender User, a receiver User
 */
interface FriendRequest {
  _id: ID;
  sender: User;
  receiver: User;
}

export default class FriendingConcept {
  friendships: Collection<Friendship>;
  friendRequests: Collection<FriendRequest>;

  constructor(private readonly db: Db) {
    this.friendships = this.db.collection(PREFIX + "friendships");
    this.friendRequests = this.db.collection(PREFIX + "friendRequests");

    // Ensure indexes for efficient lookups
    this.friendships.createIndex({ u1: 1, u2: 1 }, { unique: true });
    this.friendRequests.createIndex(
      { sender: 1, receiver: 1 },
      { unique: true },
    );
  }

  /**
   * Helper to get canonical user order for friendship.
   * Ensures u1 is lexicographically smaller than u2.
   */
  private getCanonicalUsers(userA: User, userB: User): [User, User] {
    return userA < userB ? [userA, userB] : [userB, userA];
  }

  /**
   * @action sendRequest (sender: User, receiver: User)
   * @requires sender is not the receiver
   * @requires friend request from sender to receiver does not already exist
   * @requires friendship between sender and receiver does not already exist
   * @effects creates a new friend request from sender to receiver
   */
  async sendRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<Empty | { error: string }> {
    // Requires: sender is not the receiver
    if (sender === receiver) {
      return { error: "Sender cannot send a friend request to themselves." };
    }

    // Check for existing friend request
    const existingRequest = await this.friendRequests.findOne({
      sender,
      receiver,
    });
    if (existingRequest) {
      return { error: "Friend request already sent." };
    }

    // Check for existing friendship (already friends)
    const [u1, u2] = this.getCanonicalUsers(sender, receiver);
    const existingFriendship = await this.friendships.findOne({ u1, u2 });
    if (existingFriendship) {
      return { error: "Users are already friends." };
    }

    // Effects: creates a new friend request
    await this.friendRequests.insertOne({
      _id: freshID(),
      sender,
      receiver,
    });

    return {};
  }

  /**
   * @action acceptRequest (sender: User, receiver: User)
   * @requires request from sender to receiver to exist
   * @effects removes friend request, records friendship between sender and receiver
   */
  async acceptRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<Empty | { error: string }> {
    // Requires: request from sender to receiver to exist
    const request = await this.friendRequests.findOne({ sender, receiver });
    if (!request) {
      return { error: "Friend request not found." };
    }

    // Check if they are already friends (edge case, but good to prevent duplicates)
    const [u1, u2] = this.getCanonicalUsers(sender, receiver);
    const existingFriendship = await this.friendships.findOne({ u1, u2 });
    if (existingFriendship) {
      // If already friends, just remove the request
      await this.friendRequests.deleteOne({ _id: request._id });
      return { error: "Users are already friends; request removed." };
    }

    // Effects: removes friend request
    await this.friendRequests.deleteOne({ _id: request._id });

    // Effects: records friendship between sender and receiver
    await this.friendships.insertOne({
      _id: freshID(),
      u1,
      u2,
    });

    return {};
  }

  /**
   * @action denyRequest (sender: User, receiver: User)
   * @requires request from sender to receiver to exist
   * @effects removes friend request
   */
  async denyRequest(
    { sender, receiver }: { sender: User; receiver: User },
  ): Promise<Empty | { error: string }> {
    // Requires: request from sender to receiver to exist
    const request = await this.friendRequests.findOne({ sender, receiver });
    if (!request) {
      return { error: "Friend request not found." };
    }

    // Effects: removes friend request
    await this.friendRequests.deleteOne({ _id: request._id });

    return {};
  }

  /**
   * @action removeFriend (user: User, to_be_removed_friend: User)
   * @requires friendship between user and to_be_removed_friend must exist
   * @effects removes friendship between user and to_be_removed_friend
   */
  async removeFriend(
    { user, to_be_removed_friend }: { user: User; to_be_removed_friend: User },
  ): Promise<Empty | { error: string }> {
    // Requires: friendship between user and to_be_removed_friend must exist
    const [u1, u2] = this.getCanonicalUsers(user, to_be_removed_friend);
    const friendship = await this.friendships.findOne({ u1, u2 });
    if (!friendship) {
      return { error: "Friendship does not exist." };
    }

    // Effects: removes friendship
    await this.friendships.deleteOne({ _id: friendship._id });

    return {};
  }

  // --- Queries ---

  /**
   * @query _getFriendRequestsReceived (receiver: User)
   * @effects Returns a list of users who have sent a friend request to the receiver.
   */
  async _getFriendRequestsReceived(
    { receiver }: { receiver: User },
  ): Promise<{ senders: User[] }> {
    const requests = await this.friendRequests
      .find({ receiver })
      .project({ sender: 1, _id: 0 })
      .toArray();
    return { senders: requests.map((req) => req.sender) };
  }

  /**
   * @query _getFriendRequestsSent (sender: User)
   * @effects Returns a list of users to whom the sender has sent a friend request.
   */
  async _getFriendRequestsSent(
    { sender }: { sender: User },
  ): Promise<{ receivers: User[] }> {
    const requests = await this.friendRequests
      .find({ sender })
      .project({ receiver: 1, _id: 0 })
      .toArray();
    return { receivers: requests.map((req) => req.receiver) };
  }

  /**
   * @query _getFriends (user: User)
   * @effects Returns a list of users that the given user is friends with.
   */
  async _getFriends({ user }: { user: User }): Promise<{ friends: User[] }> {
    const friendships = await this.friendships.find({
      $or: [{ u1: user }, { u2: user }],
    }).toArray();

    const friends = friendships.map((f) => (f.u1 === user ? f.u2 : f.u1));
    return { friends };
  }

  /**
   * @query _areFriends (userA: User, userB: User)
   * @effects Returns true if userA and userB are friends, false otherwise.
   */
  async _areFriends(
    { userA, userB }: { userA: User; userB: User },
  ): Promise<{ areFriends: boolean }> {
    if (userA === userB) return { areFriends: false }; // Cannot be friends with self

    const [u1, u2] = this.getCanonicalUsers(userA, userB);
    const friendship = await this.friendships.findOne({ u1, u2 });
    return { areFriends: !!friendship };
  }
}
```
