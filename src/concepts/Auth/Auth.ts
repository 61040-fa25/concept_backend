import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Auth" + ".";

// Generic types for Auth concept
type User = ID;
type Username = string;
type Email = string;
type Password = string;
type SessionToken = ID;

/**
 * User authentication concept
 * Manages user accounts with username, email, and password
 */
interface UserDocument {
  _id: User;
  username: Username;
  email: Email;
  password: Password; // In production, this should be hashed
  createdAt: number; // Unix timestamp
}

/**
 * Session document
 * Manages active user sessions
 */
interface SessionDocument {
  _id: SessionToken;
  userId: User;
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
}

export default class AuthConcept {
  users: Collection<UserDocument>;
  sessions: Collection<SessionDocument>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.sessions = this.db.collection(PREFIX + "sessions");
    // Create unique index on email
    this.users.createIndex({ email: 1 }, { unique: true });
    this.users.createIndex({ username: 1 }, { unique: true });
    // Create indexes for sessions
    this.sessions.createIndex({ userId: 1 });
    this.sessions.createIndex({ expiresAt: 1 });
  }

  /**
   * registerUser (username: Username, email: Email, password: Password): (userId: User, username: Username, sessionToken: SessionToken)
   *
   * **requires**
   *     email is not already registered;
   *     username is not already taken;
   *
   * **effect**
   *     create a new user with the given username, email, and password;
   *     create a new session for the user;
   *     return the newly created user's ID, username, and session token;
   */
  async registerUser({
    username,
    email,
    password,
  }: {
    username: Username;
    email: Email;
    password: Password;
  }): Promise<{ userId: User; username: Username; sessionToken: SessionToken } | { error: string }> {
    // Check if email already exists
    const existingEmail = await this.users.findOne({ email });
    if (existingEmail) {
      return { error: "Email is already registered" };
    }

    // Check if username already exists
    const existingUsername = await this.users.findOne({ username });
    if (existingUsername) {
      return { error: "Username is already taken" };
    }

    const userId: User = freshID();
    const newUser: UserDocument = {
      _id: userId,
      username,
      email,
      password, // TODO: In production, hash the password before storing
      createdAt: Date.now(),
    };

    try {
      await this.users.insertOne(newUser);

      // Create a session for the newly registered user
      const sessionResult = await this.createSession({ userId });
      if ("error" in sessionResult) {
        return { error: sessionResult.error };
      }

      return { userId, username, sessionToken: sessionResult.sessionToken };
    } catch (e) {
      if (e instanceof Error) {
        return { error: `Failed to register user: ${e.message}` };
      }
      return { error: "An unknown error occurred during registration." };
    }
  }

  /**
   * authenticateUser (email: Email, password: Password): (userId: User, username: Username, sessionToken: SessionToken)
   *
   * **requires**
   *     user with this email exists;
   *     password matches the stored password;
   *
   * **effect**
   *     authenticate the user;
   *     create a new session;
   *     return the user's ID, username, and session token;
   */
  async authenticateUser({
    email,
    password,
  }: {
    email: Email;
    password: Password;
  }): Promise<{ userId: User; username: Username; sessionToken: SessionToken } | { error: string }> {
    const user = await this.users.findOne({ email });

    if (!user) {
      return { error: "Invalid email or password" };
    }

    // TODO: In production, compare hashed passwords
    if (user.password !== password) {
      return { error: "Invalid email or password" };
    }

    // Create a session for the authenticated user
    const sessionResult = await this.createSession({ userId: user._id });
    if ("error" in sessionResult) {
      return { error: sessionResult.error };
    }

    return {
      userId: user._id,
      username: user.username,
      sessionToken: sessionResult.sessionToken
    };
  }

  /**
   * getUserById (userId: User): (user: UserDocument)
   *
   * **requires**
   *     user with this userId exists;
   *
   * **effect**
   *     return the user document (without password);
   */
  async getUserById({
    userId,
  }: {
    userId: User;
  }): Promise<
    { userId: User; username: Username; email: Email } | { error: string }
  > {
    const user = await this.users.findOne({ _id: userId });

    if (!user) {
      return { error: `User with ID ${userId} not found` };
    }

    return {
      userId: user._id,
      username: user.username,
      email: user.email,
    };
  }

  /**
   * getUserByUsername (username: Username): (user: UserDocument)
   *
   * **requires**
   *     user with this username exists;
   *
   * **effect**
   *     return the user document (without password);
   */
  async getUserByUsername({
    username,
  }: {
    username: Username;
  }): Promise<
    { userId: User; username: Username; email: Email } | { error: string }
  > {
    const user = await this.users.findOne({ username });

    if (!user) {
      return { error: `User with username ${username} not found` };
    }

    return {
      userId: user._id,
      username: user.username,
      email: user.email,
    };
  }

  /**
   * updatePassword (userId: User, oldPassword: Password, newPassword: Password)
   *
   * **requires**
   *     user with this userId exists;
   *     oldPassword matches the current password;
   *
   * **effect**
   *     update the user's password to newPassword;
   */
  async updatePassword({
    userId,
    oldPassword,
    newPassword,
  }: {
    userId: User;
    oldPassword: Password;
    newPassword: Password;
  }): Promise<Empty | { error: string }> {
    const user = await this.users.findOne({ _id: userId });

    if (!user) {
      return { error: `User with ID ${userId} not found` };
    }

    // TODO: In production, compare hashed passwords
    if (user.password !== oldPassword) {
      return { error: "Current password is incorrect" };
    }

    try {
      await this.users.updateOne(
        { _id: userId },
        { $set: { password: newPassword } }, // TODO: Hash in production
      );
      return {};
    } catch (e) {
      if (e instanceof Error) {
        return { error: `Failed to update password: ${e.message}` };
      }
      return { error: "An unknown error occurred while updating password." };
    }
  }

  /**
   * deleteUser (userId: User)
   *
   * **requires**
   *     user with this userId exists;
   *
   * **effect**
   *     delete the user from the system;
   */
  async deleteUser({
    userId,
  }: {
    userId: User;
  }): Promise<Empty | { error: string }> {
    const result = await this.users.deleteOne({ _id: userId });

    if (result.deletedCount === 0) {
      return { error: `User with ID ${userId} not found` };
    }

    // Cascade delete: remove all sessions for this user
    await this.sessions.deleteMany({ userId });

    return {};
  }

  /**
   * createSession (userId: User): (sessionToken: SessionToken)
   *
   * **requires**
   *     user with this userId exists;
   *
   * **effect**
   *     create a new session for the user;
   *     session expires in 7 days;
   *     return the session token;
   */
  async createSession({
    userId,
  }: {
    userId: User;
  }): Promise<{ sessionToken: SessionToken } | { error: string }> {
    const user = await this.users.findOne({ _id: userId });
    if (!user) {
      return { error: `User with ID ${userId} not found` };
    }

    const sessionToken: SessionToken = freshID();
    const session: SessionDocument = {
      _id: sessionToken,
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      isActive: true,
    };

    await this.sessions.insertOne(session);
    return { sessionToken };
  }

  /**
   * validateSession (sessionToken: SessionToken): (userId: User)
   *
   * **requires**
   *     session with this sessionToken exists;
   *     session is active and not expired;
   *
   * **effect**
   *     return the userId associated with this session;
   */
  async validateSession({
    sessionToken,
  }: {
    sessionToken: SessionToken;
  }): Promise<{ userId: User } | { error: string }> {
    const session = await this.sessions.findOne({ _id: sessionToken });

    if (!session) {
      return { error: "Invalid session token" };
    }

    if (!session.isActive) {
      return { error: "Session is not active" };
    }

    if (session.expiresAt < Date.now()) {
      // Mark session as inactive
      await this.sessions.updateOne(
        { _id: sessionToken },
        { $set: { isActive: false } }
      );
      return { error: "Session has expired" };
    }

    return { userId: session.userId };
  }

  /**
   * deleteSession (sessionToken: SessionToken)
   *
   * **requires**
   *     session with this sessionToken exists;
   *
   * **effect**
   *     delete the session (logout);
   */
  async deleteSession({
    sessionToken,
  }: {
    sessionToken: SessionToken;
  }): Promise<Empty | { error: string }> {
    const result = await this.sessions.deleteOne({ _id: sessionToken });

    if (result.deletedCount === 0) {
      return { error: "Session not found" };
    }

    return {};
  }

  /**
   * cleanupExpiredSessions ()
   *
   * **effect**
   *     delete all expired sessions;
   *     return count of deleted sessions;
   */
  async cleanupExpiredSessions(): Promise<{ count: number }> {
    const result = await this.sessions.deleteMany({
      expiresAt: { $lt: Date.now() },
    });
    return { count: result.deletedCount || 0 };
  }
}
