---
timestamp: 'Wed Oct 15 2025 21:18:11 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_211811.41fe7d87.md]]'
content_id: 4ac5fad2c161e7edb1703ec848c2783ad33be9354ea0c1dd621397848288ab66
---

# file: src/PasswordAuthentication/PasswordAuthenticationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import * as bcrypt from "npm:bcryptjs"; // Using bcryptjs for password hashing

// --- Concept Definition ---
/**
 * concept PasswordAuthentication [User]
 *
 * **purpose**: To limit access to verified users.
 *
 * **principle**: A user must register with a string username and password,
 * and subsequent attempts to login are authenticated by ensuring a user exists
 * with the exact username and password. This is achieved by comparing the
 * provided password against a securely stored hash of the registered password.
 */

// Declare collection prefix, use concept name
const PREFIX = "PasswordAuthentication" + ".";

// Generic types of this concept
type UserID = ID;

/**
 * state:
 * A set of Users with
 *   `username` String
 *   `passwordHash` String (storing hash instead of plain password for security)
 */
interface UserDoc {
  _id: UserID;
  username: string;
  passwordHash: string;
}

export default class PasswordAuthenticationConcept {
  private users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");

    // Ensure unique index for username for efficiency and data integrity.
    // In a production environment, index creation might be handled via migration scripts
    // rather than directly in the constructor, but it's shown here for completeness.
    this.users.createIndex({ username: 1 }, { unique: true })
      .catch((e) => console.error("Error creating username index:", e));
  }

  /**
   * register (username: String, password: String): (user: User | error: String)
   *
   * **requires**:
   * - `username` not in `Users`.
   * - `password` is at least 8 characters long (a common security practice).
   *
   * **effects**:
   * - Adds `username` and a hash of `password` to the `Users` collection.
   * - Associates it with a new `UserID`.
   * - Returns the new `UserID` as `user`.
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user?: UserID; error?: string }> {
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters long." };
    }

    try {
      const existingUser = await this.users.findOne({ username });
      if (existingUser) {
        return { error: `User with username '${username}' already exists.` };
      }

      // Hash the password before storing it for security
      const passwordHash = await bcrypt.hash(password, 10); // 10 salt rounds

      const newUser: UserDoc = {
        _id: freshID(),
        username,
        passwordHash,
      };

      await this.users.insertOne(newUser);
      return { user: newUser._id };
    } catch (e) {
      console.error("Error during user registration:", e);
      return { error: "Failed to register user due to a database error." };
    }
  }

  /**
   * authenticate (username: String, password: String): (user: User | error: String)
   *
   * **requires**:
   * - `username` exists in `Users`.
   *
   * **effects**:
   * - Returns the `UserID` if `password` matches the one associated with the `username`.
   * - Otherwise, returns an error.
   */
  async authenticate(
    { username, password }: { username: string; password: string },
  ): Promise<{ user?: UserID; error?: string }> {
    try {
      const user = await this.users.findOne({ username });

      if (!user) {
        return { error: "Invalid username or password." };
      }

      // Compare the provided password with the stored hash
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        return { error: "Invalid username or password." };
      }

      return { user: user._id };
    } catch (e) {
      console.error("Error during user authentication:", e);
      return { error: "Failed to authenticate user due to a database error." };
    }
  }
}
```
