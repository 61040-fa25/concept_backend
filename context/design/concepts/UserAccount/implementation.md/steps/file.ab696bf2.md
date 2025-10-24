---
timestamp: 'Sun Oct 19 2025 23:00:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_230031.4dbc9fa3.md]]'
content_id: ab696bf2c7eeee2e631619d5edb53dcd7d437b7b01f8d2efa643dfd95606970f
---

# file: src/UserAccount/UserAccountConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
// Changed import for bcrypt to use the bare specifier as defined in deno.json
import * as bcrypt from "bcrypt"; // This now resolves to "jsr:@deno-contrib/bcrypt@^0.3.0" via deno.json
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

By following these steps, Deno should correctly resolve the `bcrypt` module from the JSR registry, allowing your `UserAccountConcept` to compile and run without the import error.
