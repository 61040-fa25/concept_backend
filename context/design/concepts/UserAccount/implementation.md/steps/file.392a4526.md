---
timestamp: 'Sun Oct 19 2025 22:47:57 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_224757.5ccc4f9a.md]]'
content_id: 392a45263d61b97213957806178021219305a4067e348e72c1995e5744a33bc4
---

# file: src/useraccount/UserAccountConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts";
import { freshID } from "../../utils/database.ts";

// Define the generic type for this concept
type User = ID;

/**
 * Concept: UserAccount
 * Purpose: To establish and manage a persistent, unique identity for a user
 *          within an application, associated with core identifying information
 *          like name and email.
 */

// #region State
/**
 * a set of Users with
 *   an email String (unique)
 *   a name String
 */
interface UserDoc {
  _id: User;
  email: string;
  name: string;
}
// #endregion State

export default class UserAccountConcept {
  public readonly users: Collection<UserDoc>;

  constructor(db: Db) {
    this.users = db.collection<UserDoc>("UserAccount.users");
    // Ensure email is unique to enforce a key requirement of the concept
    this.users.createIndex({ email: 1 }, { unique: true });
  }

  // #region Actions
  /**
   * Creates a new user account.
   *
   * @param email - The user's email address, must be unique.
   * @param name - The user's name.
   * @returns The new user's ID or an error if the email is already in use.
   *
   * requires: no User exists with the given email.
   * effects: a new User is created with the given email and name.
   */
  async create({ email, name }: { email: string; name: string }): Promise<{ user: User } | { error: string }> {
    // Check if user with this email already exists
    const existingUser = await this.users.findOne({ email });
    if (existingUser) {
      return { error: "User with this email already exists." };
    }

    const newUser: UserDoc = {
      _id: freshID(),
      email,
      name,
    };

    await this.users.insertOne(newUser);
    return { user: newUser._id };
  }

  /**
   * Updates the name of an existing user.
   *
   * @param user - The ID of the user to update.
   * @param newName - The new name for the user.
   * @returns An empty object on success or an error if the user is not found.
   *
   * requires: User with id `user` exists.
   * effects: the `name` of the User is updated to `newName`.
   */
  async updateName({ user, newName }: { user: User; newName: string }): Promise<Empty | { error: string }> {
    const result = await this.users.updateOne({ _id: user }, { $set: { name: newName } });

    if (result.matchedCount === 0) {
      return { error: "User not found." };
    }

    return {};
  }

  /**
   * Deletes a user account.
   *
   * @param user - The ID of the user to delete.
   * @returns An empty object on success or an error if the user is not found.
   *
   * requires: User with id `user` exists.
   * effects: the User is deleted.
   */
  async delete({ user }: { user: User }): Promise<Empty | { error: string }> {
    const result = await this.users.deleteOne({ _id: user });

    if (result.deletedCount === 0) {
      return { error: "User not found." };
    }

    return {};
  }
  // #endregion Actions

  // #region Queries
  /**
   * Finds a user by their email address.
   *
   * @param email - The email to search for.
   * @returns An array containing the user document if found, otherwise an empty array.
   *
   * effects: returns the User record associated with the given email.
   */
  async _findUserByEmail({ email }: { email: string }): Promise<UserDoc[]> {
    return this.users.find({ email }).toArray();
  }

  /**
   * Retrieves the account information for a given user ID.
   *
   * @param user - The ID of the user.
   * @returns An array containing the user document if found, otherwise an empty array.
   *
   * effects: returns the email and name for the given User.
   */
  async _getAccountInfo({ user }: { user: User }): Promise<UserDoc[]> {
    return this.users.find({ _id: user }).toArray();
  }
  // #endregion Queries
}
```
