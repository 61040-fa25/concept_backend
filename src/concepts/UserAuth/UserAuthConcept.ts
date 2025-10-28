import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "UserAuth" + ".";

// Generic types for the concept's external dependencies
type User = ID; // Represents a user ID

/**
 * State: A set of Users, each with a username and password.
 * Note: In a real-world scenario, the 'password' field would store a hashed password.
 */
interface UserDoc {
  _id: User;
  username: string;
  password: string; // In a real system, this would be a hashed password.
}

/**
 * @concept UserAuthentication
 * @purpose To limit access to known users.
 * @principle After a user registers with a username and a password, they can
 *            authenticate with that same username and password and be treated
 *            each time as the same user.
 */
export default class UserAuthConcept {
  users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * Action: Registers a new user.
   * register (username: String, password: String): (user: User)
   *
   * @requires A unique username.
   *
   * @effects Creates a User with the associated username and password.
   *          Returns the new User's ID.
   */
  async register(
    { username, password }: {
      username: string;
      password: string;
    },
  ): Promise<{ user: User } | { error: string }> {
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: `Username '${username}' is already taken.` };
    }

    const userId = freshID() as User;
    // In a real application, 'password' would be hashed here.
    // e.g., const hashedPassword = await hashPassword(password);

    await this.users.insertOne({
      _id: userId,
      username,
      password, // Storing plaintext for conceptual example, but should be hashed.
    });

    return { user: userId };
  }

  /**
   * Action: Authenticates a user with a username and password.
   * authenticate (username: String, password: String): (user: User) | { error: string }
   *
   * @requires Username and password must match internal record for the user.
   *
   * @effects If the user is authenticated, returns the user's ID. If not, returns an error.
   */
  async authenticate(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    const user = await this.users.findOne({ username });

    if (!user) {
      return { error: "Invalid username or password." };
    }

    // In a real application, 'password' would be compared with a hashed password.
    // e.g., const passwordMatches = await comparePasswords(password, user.passwordHash);
    if (user.password === password) { // Conceptual comparison, should be hash comparison.
      return { user: user._id };
    } else {
      return { error: "Invalid username or password." };
    }
  }

  /**
   * Query: Retrieves a user by their username.
   * This is an internal query useful for testing or other internal operations.
   */
  async _getUserByUsername(
    { username }: { username: string },
  ): Promise<UserDoc | null> {
    return await this.users.findOne({ username });
  }

  /**
   * Query: Retrieves a user by their ID.
   * This is an internal query useful for testing or other internal operations.
   */
  async _getUserById({ userId }: { userId: User }): Promise<UserDoc | null> {
    return await this.users.findOne({ _id: userId });
  }
}
