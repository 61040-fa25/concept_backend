---
timestamp: 'Mon Oct 13 2025 02:15:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251013_021528.75c7786c.md]]'
content_id: 02402ba19eba608ae986dcfa048ba489653ccc2976b58bfcff14457da16ea01c
---

# response:

```typescript
// file: src/Friending/FriendingConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * Declare collection prefix, use concept name
 */
const PREFIX = "Friending" + ".";

/**
 * Generic types of this concept
 */
type User = ID;

/**
 * A set of Friendships with
 *   a friend1 User
 *   a friend2 User
 *
 * To ensure uniqueness and easy lookup, friend1 and friend2 are stored in
 * canonical order (lexicographically).
 */
interface Friendship {
  _id: ID;
  friend1: User;
  friend2: User;
}

/**
 * A set of FriendRequests with
 *   a sender User
 *   a receiver User
 */
interface FriendRequest {
  _id: ID;
  sender: User;
  receiver: User;
}

/**
 * Concept: Friending (User)
 *
 * @purpose allow users to add each other as friends to share information with
 * @principle If user A sends a friend request to user B, and user B accepts the request, then A and B become friends. After becoming friends, either party has the option to remove the other as a friend. Alternatively, user B also has the option to deny the request from user A should they wish to.
 */
export default class FriendingConcept {
  friendships: Collection<Friendship>;
  friendRequests: Collection<FriendRequest>;

  constructor(private readonly db: Db) {
    this.friendships = this.db.collection(PREFIX + "friendships");
    this.friendRequests = this.db.collection(PREFIX + "friendRequests");
  }

  /**
   * Helper to ensure canonical ordering for friendships.
   * @param u1 User ID
   * @param u2 User ID
   * @returns [minId, maxId] lexicographically sorted
   */
  private getCanonicalFriendPair(u1: User, u2: User): [User, User] {
    return u1 < u2 ? [u1, u2] : [u2, u1];
  }

  /**
   * @action sendRequest
   * @param sender The user sending the friend request.
   * @param receiver The user receiving the friend request.
   * @returns Empty on success, or { error: string } on failure.
   * @requires sender is not the receiver, friend request from sender to receiver does not already exist.
   * @effects creates a new friend request from sender to receiver.
   */
  async sendRequest({
    sender,
    receiver,
  }: {
    sender: User;
    receiver: User;
  }): Promise<Empty | { error: string }> {
    if (sender === receiver) {
      return { error: "Sender cannot send a friend request to themselves." };
    }

    const existingRequest = await this.friendRequests.findOne({
      sender,
      receiver,
    });
    if (existingRequest) {
      return { error: "Friend request already exists." };
    }

    // Also check if they are already friends
    const [f1, f2] = this.getCanonicalFriendPair(sender, receiver);
    const existingFriendship = await this.friendships.findOne({
      friend1: f1,
      friend2: f2,
    });
    if (existingFriendship) {
      return { error: "Users are already friends." };
    }

    await this.friendRequests.insertOne({
      _id: freshID(),
      sender,
      receiver,
    });

    return {};
  }

  /**
   * @action acceptRequest
   * @param sender The user who sent the friend request.
   * @param receiver The user who is accepting the friend request.
   * @returns Empty on success, or { error: string } on failure.
   * @requires request from sender to receiver to exist.
   * @effects removes friend request, records friendship between sender and user.
   */
  async acceptRequest({
    sender,
    receiver,
  }: {
    sender: User;
    receiver: User;
  }): Promise<Empty | { error: string }> {
    const request = await this.friendRequests.findOne({ sender, receiver });
    if (!request) {
      return { error: "Friend request does not exist." };
    }

    // Check if they are already friends (edge case, though should be prevented by sendRequest)
    const [f1, f2] = this.getCanonicalFriendPair(sender, receiver);
    const existingFriendship = await this.friendships.findOne({
      friend1: f1,
      friend2: f2,
    });
    if (existingFriendship) {
      // Clean up the request if friendship already exists
      await this.friendRequests.deleteOne({ sender, receiver });
      return { error: "Users are already friends." };
    }

    // Remove the request
    await this.friendRequests.deleteOne({ sender, receiver });

    // Record the friendship, ensuring canonical order
    await this.friendships.insertOne({
      _id: freshID(),
      friend1: f1,
      friend2: f2,
    });

    return {};
  }

  /**
   * @action denyRequest
   * @param sender The user who sent the friend request.
   * @param receiver The user who is denying the friend request.
   * @returns Empty on success, or { error: string } on failure.
   * @requires request from sender to receiver to exist.
   * @effects removes friend request.
   */
  async denyRequest({
    sender,
    receiver,
  }: {
    sender: User;
    receiver: User;
  }): Promise<Empty | { error: string }> {
    const request = await this.friendRequests.findOne({ sender, receiver });
    if (!request) {
      return { error: "Friend request does not exist." };
    }

    await this.friendRequests.deleteOne({ sender, receiver });

    return {};
  }

  /**
   * @action removeFriend
   * @param user The user initiating the removal.
   * @param to_be_removed_friend The friend to be removed.
   * @returns Empty on success, or { error: string } on failure.
   * @requires friendship between user and to_be_removed_friend must exist.
   * @effects removes friendship between user and to_be_removed_friend.
   */
  async removeFriend({
    user,
    to_be_removed_friend,
  }: {
    user: User;
    to_be_removed_friend: User;
  }): Promise<Empty | { error: string }> {
    const [f1, f2] = this.getCanonicalFriendPair(user, to_be_removed_friend);

    const friendship = await this.friendships.findOne({
      friend1: f1,
      friend2: f2,
    });

    if (!friendship) {
      return { error: "Friendship does not exist." };
    }

    await this.friendships.deleteOne({ _id: friendship._id });

    return {};
  }

  /**
   * @query _getFriends
   * @param user The user whose friends are to be retrieved.
   * @returns An array of User IDs that are friends with the specified user.
   */
  async _getFriends({ user }: { user: User }): Promise<{ friends: User[] }> {
    const friendships = await this.friendships
      .find({
        $or: [{ friend1: user }, { friend2: user }],
      })
      .toArray();

    const friends = friendships.map((f) =>
      f.friend1 === user ? f.friend2 : f.friend1
    );

    return { friends };
  }

  /**
   * @query _getSentRequests
   * @param sender The user who sent the requests.
   * @returns An array of User IDs to whom the sender has sent requests.
   */
  async _getSentRequests({
    sender,
  }: {
    sender: User;
  }): Promise<{ receivers: User[] }> {
    const requests = await this.friendRequests.find({ sender }).toArray();
    return { receivers: requests.map((r) => r.receiver) };
  }

  /**
   * @query _getReceivedRequests
   * @param receiver The user who received the requests.
   * @returns An array of User IDs who have sent requests to the receiver.
   */
  async _getReceivedRequests({
    receiver,
  }: {
    receiver: User;
  }): Promise<{ senders: User[] }> {
    const requests = await this.friendRequests.find({ receiver }).toArray();
    return { senders: requests.map((r) => r.sender) };
  }
}
```
