---
timestamp: 'Sun Oct 19 2025 22:49:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_224933.511be023.md]]'
content_id: 5d4157ccfbbbdac074eeb6e07b56bf7f369a3d9e59523f11159c9e055bc8993e
---

# file: src/UserAccount/UserAccountConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import * as bcrypt from "https://deno.land/std@0.224.0/crypto/bcrypt.ts";
import { freshID } from "@utils/database.ts";
import { Empty, ID } from "@utils/types.ts";

// Define the generic type for this concept
type User = ID;

// Define the collection prefix using the concept name
const PREFIX = "UserAccount";

/**
 * Represents the state of a user in the UserAccount concept.
 * Corresponds to the state declaration:
 * `a set of Users with an email String, a passwordHash String, a displayName String`
 */
interface UserDoc {
  _id: User;
  email: string;
  passwordHash: string;
  displayName: string;
}

/**
 * @concept UserAccount
 * @purpose to securely identify and authenticate users
 */
export default class UserAccountConcept {
  public readonly users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection<UserDoc>(PREFIX);
  }

  /**
   * Creates a new user account.
   * @requires email is not already in use
   * @effect creates a new user, storing a salted hash of their password
   * @returns the new user's ID on success, or an error if the email is taken
   */
  async register({ email, password, displayName }: { email: string; password: string; displayName: string }): Promise<{ user: User } | { error: string }> {
    // Requires: email is not already in use
    const existingUser = await this.users.findOne({ email });
    if (existingUser) {
      return { error: "Email is already in use." };
    }

    // Effect: creates a new user
    const userId = freshID() as User;
    const passwordHash = await bcrypt.hash(password);

    await this.users.insertOne({
      _id: userId,
      email,
      passwordHash,
      displayName,
    });

    return { user: userId };
  }

  /**
   * Authenticates a user with their email and password.
   * @effect authenticates the user
   * @returns the user's ID on successful authentication, or an error on failure
   */
  async login({ email, password }: { email: string; password: string }): Promise<{ user: User } | { error: string }> {
    const user = await this.users.findOne({ email });

    if (!user) {
      return { error: "Invalid email or password." };
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return { error: "Invalid email or password." };
    }

    return { user: user._id };
  }

  /**
   * Changes a user's display name.
   * @effect changes the user's displayName
   * @returns an empty object on success, or an error if the user is not found
   */
  async updateProfile({ user, newDisplayName }: { user: User; newDisplayName: string }): Promise<Empty | { error: string }> {
    const result = await this.users.updateOne(
      { _id: user },
      { $set: { displayName: newDisplayName } },
    );

    if (result.matchedCount === 0) {
      return { error: "User not found." };
    }

    return {};
  }

  /**
   * Removes a user and all their associated data from this concept.
   * @effect removes the user
   * @returns an empty object on success, or an error if the user is not found
   */
  async deleteAccount({ user }: { user: User }): Promise<Empty | { error: string }> {
    const result = await this.users.deleteOne({ _id: user });

    if (result.deletedCount === 0) {
      return { error: "User not found." };
    }

    return {};
  }
}
```
