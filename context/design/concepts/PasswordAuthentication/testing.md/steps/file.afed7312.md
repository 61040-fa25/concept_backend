---
timestamp: 'Wed Oct 15 2025 21:21:47 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_212147.6ab911b0.md]]'
content_id: afed73121eec88830871a2f6b2ddc1d70676a2067677323dbc88f6b6b256eefb
---

# file: src/Sessioning/SessioningConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import * as bcrypt from "npm:bcryptjs";

// --- Concept Definition ---
/**
 * concept Sessioning
 *
 * **purpose**: To manage user sessions, allowing users to authenticate and
 * maintain a persistent logged-in state across requests.
 *
 * **principle**: A user can only have one active session at a time.
 * Sessions expire after a certain duration. Authentication requires valid credentials.
 */

// Declare collection prefix, use concept name
const PREFIX = "Sessioning" + ".";

// Generic types of this concept
type UserID = ID;
type SessionID = ID;

// Session duration in milliseconds (e.g., 1 hour)
const SESSION_DURATION_MS = 60 * 60 * 1000;

/**
 * state:
 * A set of Users with
 *   an email String (unique)
 *   a passwordHash String
 */
interface UserDoc {
  _id: UserID;
  email: string;
  passwordHash: string;
}

/**
 * state:
 * A set of Sessions with
 *   a userId User
 *   an expiry Number (timestamp)
 *   a token String (unique, secret)
 */
interface SessionDoc {
  _id: SessionID;
  userId: UserID;
  expiry: number; // Unix timestamp in milliseconds
  token: string;
}

export default class SessioningConcept {
  private users: Collection<UserDoc>;
  private sessions: Collection<SessionDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.sessions = this.db.collection(PREFIX + "sessions");

    // Ensure unique indexes for email and session token for efficiency and data integrity.
    // In a production environment, index creation might be handled via migration scripts
    // rather than directly in the constructor, but it's shown here for completeness.
    this.users.createIndex({ email: 1 }, { unique: true })
      .catch((e) => console.error("Error creating email index:", e));
    this.sessions.createIndex({ token: 1 }, { unique: true })
      .catch((e) => console.error("Error creating token index:", e));
    this.sessions.createIndex({ userId: 1 }) // For efficient lookup and invalidation
      .catch((e) => console.error("Error creating userId index:", e));
  }

  /**
   * createUser (email: String, password: String): (user: UserID | error: String)
   *
   * **requires**:
   * - No User with the given `email` already exists.
   * - `password` is at least 8 characters long.
   *
   * **effects**:
   * - Creates a new User `u`.
   * - Sets `u.email` to `email`.
   * - Sets `u.passwordHash` to a hash of `password`.
   * - Returns `u._id` as `user`.
   */
  async createUser(
    { email, password }: { email: string; password: string },
  ): Promise<{ user?: UserID; error?: string }> {
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters long." };
    }

    try {
      const existingUser = await this.users.findOne({ email });
      if (existingUser) {
        return { error: `User with email '${email}' already exists.` };
      }

      const passwordHash = await bcrypt.hash(password, 10); // Salt rounds = 10
      const newUser: UserDoc = {
        _id: freshID(),
        email,
        passwordHash,
      };

      await this.users.insertOne(newUser);
      return { user: newUser._id };
    } catch (e) {
      console.error("Error creating user:", e);
      return { error: "Failed to create user due to a database error." };
    }
  }

  /**
   * login (email: String, password: String): (session: SessionID | error: String)
   *
   * **requires**:
   * - A User with the given `email` exists.
   * - `password` matches the User's `passwordHash`.
   *
   * **effects**:
   * - Invalidates any existing active session for the User.
   * - Creates a new Session `s`.
   * - Sets `s.userId` to the User's ID.
   * - Sets `s.expiry` to current time + session duration.
   * - Sets `s.token` to a new random token.
   * - Returns `s._id` as `session`.
   */
  async login(
    { email, password }: { email: string; password: string },
  ): Promise<{ session?: SessionID; error?: string }> {
    try {
      const user = await this.users.findOne({ email });
      if (!user) {
        return { error: "Invalid email or password." };
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return { error: "Invalid email or password." };
      }

      // Invalidate existing sessions for this user to enforce "one active session" principle
      await this.sessions.deleteMany({ userId: user._id });

      const newSession: SessionDoc = {
        _id: freshID(),
        userId: user._id,
        expiry: Date.now() + SESSION_DURATION_MS,
        token: crypto.randomUUID(), // Using Deno's built-in crypto for token generation
      };

      await this.sessions.insertOne(newSession);
      return { session: newSession._id };
    } catch (e) {
      console.error("Error during login/session creation:", e);
      return { error: "Failed to log in due to a database error." };
    }
  }

  /**
   * logout (token: String): (empty: Empty | error: String)
   *
   * **requires**:
   * - A Session with the given `token` exists.
   *
   * **effects**:
   * - Deletes the Session with `token`.
   * - Returns an empty object on success.
   */
  async logout({ token }: { token: string }): Promise<Empty | { error: string }> {
    try {
      const result = await this.sessions.deleteOne({ token });
      if (result.deletedCount === 0) {
        return { error: "Session not found or already logged out." };
      }
      return {};
    } catch (e) {
      console.error("Error during logout:", e);
      return { error: "Failed to log out due to a database error." };
    }
  }

  /**
   * _validateSession (token: String): (session: {userId: UserID, expiry: Number, token: String} | error: String)
   *
   * **requires**:
   * - A Session with the given `token` exists and is not expired.
   *
   * **effects**:
   * - Returns the Session associated with the `token` (excluding its internal _id).
   */
  async _validateSession(
    { token }: { token: string },
  ): Promise<
    Array<{ session: { userId: UserID; expiry: number; token: string } } | { error: string }>
  > {
    try {
      const session = await this.sessions.findOne({ token });

      if (!session) {
        return [{ error: "Session not found." }];
      }

      if (session.expiry <= Date.now()) {
        // Session expired, remove it and return error
        await this.sessions.deleteOne({ _id: session._id }); // Clean up expired session
        return [{ error: "Session expired." }];
      }

      // Return the required fields as an array of objects, wrapped in a 'session' key
      return [{ session: { userId: session.userId, expiry: session.expiry, token: session.token } }];
    } catch (e) {
      console.error("Error validating session:", e);
      return [{ error: "Failed to validate session due to a database error." }];
    }
  }

  /**
   * _getUserByEmail (email: String): (user: {id: UserID, email: String} | error: String)
   *
   * **requires**:
   * - A User with the given `email` exists.
   *
   * **effects**:
   * - Returns the User's ID and email if found.
   */
  async _getUserByEmail(
    { email }: { email: string },
  ): Promise<Array<{ user: { id: UserID; email: string } } | { error: string }>> {
    try {
      const user = await this.users.findOne({ email }, {
        projection: { _id: 1, email: 1 },
      }); // Project only ID and email

      if (!user) {
        return [{ error: `User with email '${email}' not found.` }];
      }

      // Return an array of objects, wrapped in a 'user' key
      return [{ user: { id: user._id, email: user.email } }];
    } catch (e) {
      console.error("Error getting user by email:", e);
      return [{ error: "Failed to retrieve user due to a database error." }];
    }
  }

  /**
   * _getSessionByToken (token: String): (session: {userId: UserID, expiry: Number, token: String} | error: String)
   *
   * **requires**:
   * - A Session with the given `token` exists.
   *
   * **effects**:
   * - Returns the Session details (excluding its internal _id) if found.
   */
  async _getSessionByToken(
    { token }: { token: string },
  ): Promise<
    Array<{ session: { userId: UserID; expiry: number; token: string } } | { error: string }>
  > {
    try {
      const session = await this.sessions.findOne({ token }, {
        projection: { userId: 1, expiry: 1, token: 1 },
      });

      if (!session) {
        return [{ error: "Session not found." }];
      }

      // Return an array of objects, wrapped in a 'session' key
      return [{ session: { userId: session.userId, expiry: session.expiry, token: session.token } }];
    } catch (e) {
      console.error("Error getting session by token:", e);
      return [{ error: "Failed to retrieve session due to a database error." }];
    }
  }
}
```
