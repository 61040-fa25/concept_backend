---
timestamp: 'Wed Oct 15 2025 01:09:15 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_010915.29812948.md]]'
content_id: 953896d3ed9cdecc93939fdedb5b89a1649c8444a4030560584289c5e7d3ca00
---

# response:

Okay, here is the implementation of the `Friending` concept following your specifications.

### File Structure and Imports

First, ensure your project has the necessary `deno.json` configuration and utility files as described in the prompt.

**deno.json** (as provided in the prompt)

```json
{
    "imports": {
        "@concepts/": "./src/concepts/",
        "@utils/": "./src/utils/"
    }
}
```

**src/utils/types.ts** (Example - you would have this file with the `ID` type)

```typescript
// src/utils/types.ts
export type ID = string & { __brand: "ID" };
export type Empty = Record<PropertyKey, never>;
```

**src/utils/database.ts** (Example - you would have this file with `getDb` and `freshID`)

```typescript
// src/utils/database.ts
import { MongoClient, Db } from "npm:mongodb";
import "https://deno.land/x/dotenv@v3.2.2/load.ts"; // For .env loading

let _db: Db;
let _client: MongoClient;

export async function getDb(): Promise<[Db, MongoClient]> {
  if (_db && _client) {
    return [_db, _client];
  }

  const MONGODB_URI = Deno.env.get("MONGODB_URI") || "mongodb://localhost:27017";
  const DB_NAME = Deno.env.get("DB_NAME") || "concept_db";

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  _db = db;
  _client = client;
  return [_db, _client];
}

export function freshID(): ID {
    // A simple unique ID generator, in a real app you might use UUIDs
    return `id:${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as ID;
}
```

### Friending Concept Implementation

**file: src/concepts/Friending/FriendingConcept.ts**

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Friending" + ".";

// Generic types of this concept
type User = ID; // The User ID type, external to this concept
type FriendRequestID = ID;
type FriendshipID = ID;

/**
 * Interface for a Friendship document in MongoDB.
 * The friend1 and friend2 fields are stored in canonical order (lexicographically)
 * to prevent duplicate friendships (e.g., A-B and B-A being separate records)
 * and simplify queries.
 */
interface DBFriendship {
  _id: FriendshipID;
  friend1: User; // Canonical order: min(user1, user2)
  friend2: User; // Canonical order: max(user1, user2)
}

/**
 * Interface for a FriendRequest document in MongoDB.
 * Sender and receiver roles are distinct for requests.
 */
interface DBFriendRequest {
  _id: FriendRequestID;
  sender: User;
  receiver: User;
}

/**
 * Concept: Friending (User)
 *
 * purpose: allow users to add each other as friends to share information with
 *
 * principle: Users can send friend requests to other users. Users who have received friend requests have the option to accept or deny the request.
 * If a friend request (say between User A and User B) is accepted, then User A and User B become friends.
 */
export default class FriendingConcept {
  friendships: Collection<DBFriendship>;
  friendRequests: Collection<DBFriendRequest>;

  constructor(private readonly db: Db) {
    this.friendships = this.db.collection(PREFIX + "friendships");
    this.friendRequests = this.db.collection(PREFIX + "friendRequests");
  }

  // --- Utility function for canonical ordering of friends ---
  /**
   * Returns users in a canonical order (lexicographically) to ensure consistent storage
   * and lookup of friendships, preventing duplicate records for A-B vs B-A.
   */
  private getCanonicalFriends(userA: User, userB: User): { friend1: User; friend2: User } {
    if (userA < userB) {
      return { friend1: userA, friend2: userB };
    }
    return { friend1: userB, friend2: userA };
  }

  // --- Actions ---

  /**
   * sendRequest (sender: User, receiver: User): (request: FriendRequest)
   *
   * **requires** sender is not the receiver, friend request from sender to receiver or vice versa does not already exist,
   *              friendship between sender and receiver does not already exist
   *
   * **effects** creates a new friend request from sender to receiver; returns the new request ID as `request`
   */
  async sendRequest({ sender, receiver }: { sender: User; receiver: User }): Promise<{ request: FriendRequestID } | { error: string }> {
    if (sender === receiver) {
      return { error: "Sender cannot send a friend request to themselves." };
    }

    // Check for existing friendship (using canonical form)
    const { friend1, friend2 } = this.getCanonicalFriends(sender, receiver);
    const existingFriendship = await this.friendships.findOne({ friend1, friend2 });
    if (existingFriendship) {
      return { error: "A friendship already exists between these users. Cannot send request." };
    }

    // Check for existing request (either direction)
    const existingRequest = await this.friendRequests.findOne({
      $or: [
        { sender: sender, receiver: receiver },
        { sender: receiver, receiver: sender }, // Check if the other user has already sent a request
      ],
    });
    if (existingRequest) {
      return { error: "A friend request already exists between these users, or one has already been sent." };
    }

    const newRequestId = freshID();
    const result = await this.friendRequests.insertOne({
      _id: newRequestId,
      sender,
      receiver,
    });

    if (result.acknowledged) {
      return { request: newRequestId };
    }
    return { error: "Failed to send friend request due to a database issue." };
  }

  /**
   * acceptRequest (sender: User, receiver: User): Empty
   *
   * **requires** request from sender to receiver to exist
   *
   * **effects** removes friend request, records friendship between sender and receiver
   */
  async acceptRequest({ sender, receiver }: { sender: User; receiver: User }): Promise<Empty | { error: string }> {
    // Requires: request from sender to receiver to exist
    const existingRequest = await this.friendRequests.findOne({ sender, receiver });
    if (!existingRequest) {
      return { error: "No pending friend request from this sender to this receiver found." };
    }

    // Effect 1: Remove friend request
    const deleteResult = await this.friendRequests.deleteOne({ _id: existingRequest._id });
    if (!deleteResult.acknowledged || deleteResult.deletedCount === 0) {
      return { error: "Failed to remove friend request during acceptance." };
    }

    // Effect 2: Record friendship (using canonical order)
    const { friend1, friend2 } = this.getCanonicalFriends(sender, receiver);
    const newFriendshipId = freshID();
    const insertResult = await this.friendships.insertOne({
      _id: newFriendshipId,
      friend1,
      friend2,
    });

    if (insertResult.acknowledged) {
      return {};
    }
    // If friendship insertion fails after request deletion, this is an inconsistent state.
    // In a production system, this would require a transaction or compensating action.
    return { error: "Failed to record friendship after accepting request. Data might be inconsistent." };
  }

  /**
   * denyRequest (sender: User, receiver: User): Empty
   *
   * **requires** request from sender to receiver to exist
   *
   * **effects** removes friend request
   */
  async denyRequest({ sender, receiver }: { sender: User; receiver: User }): Promise<Empty | { error: string }> {
    // Requires: request from sender to receiver to exist
    const existingRequest = await this.friendRequests.findOne({ sender, receiver });
    if (!existingRequest) {
      return { error: "No pending friend request from this sender to this receiver found." };
    }

    // Effect: Remove friend request
    const deleteResult = await this.friendRequests.deleteOne({ _id: existingRequest._id });
    if (deleteResult.acknowledged && deleteResult.deletedCount > 0) {
      return {};
    }
    return { error: "Failed to deny friend request due to a database issue." };
  }

  /**
   * removeFriend (user: User, to_be_removed_friend: User): Empty
   *
   * **requires** friendship between user and to_be_removed_friend must exist
   *
   * **effects** removes friendship between user and to_be_removed_friend
   */
  async removeFriend({ user, to_be_removed_friend }: { user: User; to_be_removed_friend: User }): Promise<Empty | { error: string }> {
    // Requires: friendship between user and to_be_removed_friend must exist (using canonical form)
    const { friend1, friend2 } = this.getCanonicalFriends(user, to_be_removed_friend);

    const existingFriendship = await this.friendships.findOne({ friend1, friend2 });
    if (!existingFriendship) {
      return { error: "No friendship found between these users to remove." };
    }

    // Effect: Removes friendship
    const deleteResult = await this.friendships.deleteOne({ _id: existingFriendship._id });
    if (deleteResult.acknowledged && deleteResult.deletedCount > 0) {
      return {};
    }
    return { error: "Failed to remove friendship due to a database issue." };
  }

  // --- Queries ---

  /**
   * _isFriends (user1: User, user2: User): (isFriend: boolean)[]
   *
   * **requires** true
   *
   * **effects** returns true if user1 and user2 are friends, false otherwise
   */
  async _isFriends({ user1, user2 }: { user1: User; user2: User }): Promise<[{ isFriend: boolean }]> {
    if (user1 === user2) { // A user is not friends with themselves in this context
      return [{ isFriend: false }];
    }
    const { friend1, friend2 } = this.getCanonicalFriends(user1, user2);
    const friendship = await this.friendships.findOne({ friend1, friend2 });
    return [{ isFriend: !!friendship }]; // Convert truthy/falsy to boolean
  }

  /**
   * _getFriends (user: User): (friend: User)[]
   *
   * **requires** true
   *
   * **effects** returns an array of all users who are friends with the given user
   */
  async _getFriends({ user }: { user: User }): Promise<{ friend: User }[] | [{ error: string }]> {
    // Find friendships where the user is either friend1 or friend2
    const friendships = await this.friendships.find({
      $or: [{ friend1: user }, { friend2: user }],
    }).toArray();

    const friends: User[] = [];
    for (const f of friendships) {
      if (f.friend1 === user) {
        friends.push(f.friend2);
      } else {
        friends.push(f.friend1);
      }
    }

    return friends.map((f) => ({ friend: f }));
  }

  /**
   * _getSentFriendRequests (sender: User): (receiver: User)[]
   *
   * **requires** true
   *
   * **effects** returns an array of users to whom the sender has sent friend requests
   */
  async _getSentFriendRequests({ sender }: { sender: User }): Promise<{ receiver: User }[] | [{ error: string }]> {
    const requests = await this.friendRequests.find({ sender }).toArray();
    return requests.map((r) => ({ receiver: r.receiver }));
  }

  /**
   * _getReceivedFriendRequests (receiver: User): (sender: User)[]
   *
   * **requires** true
   *
   * **effects** returns an array of users who have sent friend requests to the receiver
   */
  async _getReceivedFriendRequests({ receiver }: { receiver: User }): Promise<{ sender: User }[] | [{ error: string }]> {
    const requests = await this.friendRequests.find({ receiver }).toArray();
    return requests.map((r) => ({ sender: r.sender }));
  }
}
```
