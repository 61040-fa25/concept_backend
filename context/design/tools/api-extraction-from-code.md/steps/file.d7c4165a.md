---
timestamp: 'Tue Oct 21 2025 09:54:24 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_095424.05fe4833.md]]'
content_id: d7c4165ab2d594cf2e6e7a87c28a2122272770b16f7cda8951b4593657f198c3
---

# file: src\mirrorMotionConcepts\UserConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "User" + ".";

// Internal entity types, represented as IDs
export type User = ID;

/**
 * State: A set of Users with a username and password.
 */
interface UserDoc {
  _id: User;
  username: string;
  password: string; // In a real application, this would be hashed and salted.
}

/**
 * @concept User
 * @purpose To let users securely manage and access their own videos.
 * @principle After registering with a username and password, the user can log in to upload, view, and edit their videos.
 */
export default class UserConcept {
  users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * Action: Registers a new user.
   * @requires username not already taken.
   * @effects A new User is created with login credentials.
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ userID: User } | { error: string }> {
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: `Username '${username}' is already taken.` };
    }

    const userID = freshID() as User;
    // In a real application, the password would be hashed before storing.
    await this.users.insertOne({ _id: userID, username, password });
    return { userID };
  }

  /**
   * Action: Logs in a user.
   * @requires username exists and password matches.
   * @effects Authenticates user and conceptually creates a session (represented by userID).
   */
  async login(
    { username, password }: { username: string; password: string },
  ): Promise<{ userID: User } | { error: string }> {
    const user = await this.users.findOne({ username });

    if (!user) {
      // Generic error message for security reasons
      return { error: "Invalid username or password." };
    }

    // In a real application, this would compare a hashed password.
    if (user.password !== password) {
      // Generic error message for security reasons
      return { error: "Invalid username or password." };
    }

    // In a real application, a session ID would be generated and returned.
    // For this concept, returning the userID indicates successful authentication.
    return { userID: user._id };
  }
}

```
