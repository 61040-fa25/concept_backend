---
timestamp: 'Sun Oct 12 2025 04:24:05 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_042405.a49621e1.md]]'
content_id: dbbf29437b90409acb11b728ed1aa973e782b6dbdf00c20c41d9961f8efd0615
---

# file: src/concepts/PasswordAuthentication/PasswordAuthenticationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import * as crypto from "node:crypto"; // Import node:crypto for secure hashing

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

// Hashing constants - best practice is to make these configurable or robust
const SALT_LENGTH = 16; // 16 bytes for a strong salt
const HASH_ITERATIONS = 100000; // Number of PBKDF2 iterations
const KEY_LENGTH = 64; // 64 bytes for the derived key (hashed password)
const HASH_ALGORITHM = "sha512"; // Algorithm for PBKDF2

/**
 * State:
 * a set of Users with
 *   a username String
 *   a password String (now hashed)
 *   a salt String (for hashing)
 */
interface UserDocument {
  _id: User;
  username: string;
  hashedPassword: string; // Stores the hashed password
  salt: string; // Stores the salt used for hashing
}

export default class PasswordAuthenticationConcept {
  private users: Collection<UserDocument>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * Helper method to hash a password securely using PBKDF2.
   * @param password The plaintext password.
   * @param salt The salt to use (as a hex string).
   * @returns A Promise that resolves to the hashed password (as a hex string).
   */
  private async hashPassword(password: string, salt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        HASH_ITERATIONS,
        KEY_LENGTH,
        HASH_ALGORITHM,
        (err, derivedKey) => {
          if (err) reject(err);
          resolve(derivedKey.toString("hex"));
        },
      );
    });
  }

  /**
   * Action: register
   *
   * @requires username to not already exist in the set of Users
   * @effects creates a new user of that username and securely hashed password (with salt), adds that user to the set of users, and returns the new user
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Check precondition: username must not already exist
    const existingUser = await this.users.findOne({ username: username });
    if (existingUser) {
      return { error: "Username already taken." };
    }

    // Generate a new salt
    const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");

    // Hash the password using the generated salt
    const hashedPassword = await this.hashPassword(password, salt);

    // Effect: Create a new user document
    const newUser: UserDocument = {
      _id: freshID() as User,
      username: username,
      hashedPassword: hashedPassword,
      salt: salt,
    };

    await this.users.insertOne(newUser);

    return { user: newUser._id };
  }

  /**
   * Action: authenticate
   *
   * @requires user of the argument username and password to exist in the set of Users
   * @effects returns the corresponding User if authentication is successful, otherwise an error.
   */
  async authenticate(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Find the user by username
    const user = await this.users.findOne({ username: username });

    if (!user) {
      // For security, avoid distinguishing between 'username not found' and 'wrong password'
      return { error: "Invalid username or password." };
    }

    // Hash the provided password using the stored salt
    const inputHashedPassword = await this.hashPassword(password, user.salt);

    // Compare the newly hashed password with the stored hashed password
    if (inputHashedPassword !== user.hashedPassword) {
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

### Key Changes:

1. **`import * as crypto from "node:crypto";`**: Added the necessary import.
2. **Hashing Constants**: Defined `SALT_LENGTH`, `HASH_ITERATIONS`, `KEY_LENGTH`, and `HASH_ALGORITHM` for PBKDF2 configuration. These are crucial for security; real-world apps might store `HASH_ITERATIONS` per user to allow increasing it over time.
3. **`UserDocument` Interface Update**:
   * `password: string;` has been replaced with `hashedPassword: string;` to explicitly state it's a hash.
   * `salt: string;` has been added to store the unique salt generated for each user.
4. **`hashPassword` Helper Method**: A private asynchronous method `hashPassword` encapsulates the `crypto.pbkdf2` logic, making the `register` and `authenticate` actions cleaner. It generates the hash as a hex string.
5. **`register` Action**:
   * **Salt Generation**: `crypto.randomBytes(SALT_LENGTH).toString("hex")` is used to generate a cryptographically strong, random salt.
   * **Password Hashing**: The plaintext `password` is hashed using the generated `salt` via `this.hashPassword`.
   * **Storage**: Both `hashedPassword` and `salt` are stored in the `UserDocument`.
6. **`authenticate` Action**:
   * **User Retrieval**: First, the user is retrieved by their `username`.
   * **Error Handling (Security Best Practice)**: If the user is not found, a generic "Invalid username or password" error is returned. This prevents an attacker from knowing if a username exists or not, which helps against enumeration attacks.
   * **Provided Password Hashing**: The `password` provided by the user during authentication is hashed *again* using the `salt` *retrieved from the database* for that specific user.
   * **Comparison**: The newly computed hash is then compared with the `hashedPassword` stored in the database. If they match, authentication is successful.

This updated concept provides a much more secure way to handle user passwords.
