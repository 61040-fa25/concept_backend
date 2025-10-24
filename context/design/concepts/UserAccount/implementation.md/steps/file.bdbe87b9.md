---
timestamp: 'Sun Oct 19 2025 22:52:55 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_225255.14ae31d8.md]]'
content_id: bdbe87b912c3904de1a1bfe21dd8e2bf6ac2b5b6dd6af9febf633c1b3d79cbb1
---

# file: src/UserAccount/UserAccountConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import * as bcrypt from "https://deno.land/x/bcrypt@v1.1.0/mod.ts"; // Using a Deno-native bcrypt library
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
  passwordHash: string; // Storing the salted hash of the password
  displayName: string;
}

/**
 * @concept UserAccount
 * @purpose to securely identify and authenticate users
 * @principle a user must register and log in to be identified
 */
export default class UserAccountConcept {
  public readonly users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection<UserDoc>(PREFIX);
  }

  /**
   * Registers a new user with an email, password, and display name.
   * @param {object} params - The action arguments.
   * @param {string} params.email - The user's email address, used as a unique identifier.
   * @param {string} params.password - The user's chosen password.
   * @param {string} params.displayName - The user's display name.
   * @returns {Promise<{ user: User } | { error: string }>} The ID of the newly created user on success, or an error message if the email is already in use.
   *
   * @requires email is not already in use
   * @effect creates a new user, storing a salted hash of their password
   */
  async register({ email, password, displayName }: { email: string; password: string; displayName: string }): Promise<{ user: User } | { error: string }> {
    // Precondition check: email is not already in use
    const existingUser = await this.users.findOne({ email });
    if (existingUser) {
      return { error: "Email is already in use." };
    }

    // Effect: creates a new user, storing a salted hash of their password
    const userId = freshID() as User;
    const passwordHash = await bcrypt.hash(password); // Hash the password for security

    try {
      await this.users.insertOne({
        _id: userId,
        email,
        passwordHash,
        displayName,
      });
      return { user: userId };
    } catch (e) {
      // Catch potential database errors (e.g., unique constraint violation, though `findOne` handles email uniqueness)
      console.error("Error inserting new user:", e);
      return { error: "Failed to register user due to a server error." };
    }
  }

  /**
   * Authenticates a user by verifying their email and password.
   * @param {object} params - The action arguments.
   * @param {string} params.email - The user's email address.
   * @param {string} params.password - The password provided by the user.
   * @returns {Promise<{ user: User } | { error: string }>} The ID of the authenticated user on success, or an error message on failure.
   *
   * @effect authenticates the user
   */
  async login({ email, password }: { email: string; password: string }): Promise<{ user: User } | { error: string }> {
    const user = await this.users.findOne({ email });

    if (!user) {
      return { error: "Invalid email or password." }; // Use a generic error message for security
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return { error: "Invalid email or password." }; // Use a generic error message for security
    }

    return { user: user._id };
  }

  /**
   * Updates the display name for a specified user.
   * @param {object} params - The action arguments.
   * @param {User} params.user - The ID of the user whose profile is to be updated.
   * @param {string} params.newDisplayName - The new display name for the user.
   * @returns {Promise<Empty | { error: string }>} An empty object on success, or an error message if the user is not found.
   *
   * @effect changes the user's displayName
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
   * Deletes a user account and all their associated data within this concept.
   * @param {object} params - The action arguments.
   * @param {User} params.user - The ID of the user account to delete.
   * @returns {Promise<Empty | { error: string }>} An empty object on success, or an error message if the user is not found.
   *
   * @effect removes the user and all their associated data
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
