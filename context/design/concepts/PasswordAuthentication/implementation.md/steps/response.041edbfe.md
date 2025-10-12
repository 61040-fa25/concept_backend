---
timestamp: 'Sun Oct 12 2025 02:04:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_020436.8b38fa37.md]]'
content_id: 041edbfe6b5f205b9dc6a7d155d7f64679c8eeeb18f5188919b786321cb479a2
---

# response:

```typescript
// file: src/PasswordAuthentication/PasswordAuthenticationConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

/**
 * Concept: PasswordAuthentication (User)
 *
 * @purpose limit access to known users
 * @principle after a user registers with a username and a password, they can authenticate with that same username and password and be treated each time as the same user
 */

// Declare collection prefix, use concept name
const PREFIX = "PasswordAuthentication" + ".";

// Generic types of this concept
type User = ID;

/**
 * State:
 * a set of Users with
 *   a username String
 *   a password String
 */
interface UserDocument {
  _id: User;
  username: string;
  password: string; // In a real app, this should be hashed and salted. For this example, we'll store it as plain text.
}

export default class PasswordAuthenticationConcept {
  private users: Collection<UserDocument>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * Action: register
   *
   * @requires username to not already exist in the set of Users
   * @effects creates a new user of that username and password, adds that user to the set of users, and returns the new user
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Check precondition: username must not already exist
    const existingUser = await this.users.findOne({ username: username });
    if (existingUser) {
      return { error: "Username already taken." };
    }

    // Effect: Create a new user
    const newUser: UserDocument = {
      _id: freshID() as User,
      username: username,
      password: password, // In a real app, hash this password!
    };

    await this.users.insertOne(newUser);

    return { user: newUser._id };
  }

  /**
   * Action: authenticate
   *
   * @requires user of the argument username and password to exist in the set of Users
   * @effects returns the corresponding User
   */
  async authenticate(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Check precondition: user with username and password must exist
    const user = await this.users.findOne({
      username: username,
      password: password, // In a real app, compare with hashed password!
    });

    if (!user) {
      return { error: "Invalid username or password." };
    }

    // Effect: Return the corresponding User
    return { user: user._id };
  }

  /**
   * Query: _getUserByUsername
   * Internal query to retrieve a user document by username.
   *
   * @effects returns the user document if found, otherwise null.
   */
  async _getUserByUsername(
    username: string,
  ): Promise<UserDocument | null> {
    return await this.users.findOne({ username: username });
  }

  /**
   * Query: _getUserById
   * Internal query to retrieve a user document by ID.
   *
   * @effects returns the user document if found, otherwise null.
   */
  async _getUserById(id: User): Promise<UserDocument | null> {
    return await this.users.findOne({ _id: id });
  }

  /**
   * Query: _getAllUsers
   * Internal query to retrieve all user documents.
   *
   * @effects returns an array of all user documents.
   */
  async _getAllUsers(): Promise<UserDocument[]> {
    return await this.users.find({}).toArray();
  }
}
```
