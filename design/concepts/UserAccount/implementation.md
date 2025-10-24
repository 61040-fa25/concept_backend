[@concept-design-overview](../../background/concept-design-overview.md)

[@concept-specifications](../../background/concept-specifications.md)

[@implementing-concepts](../../background/implementing-concepts.md)

[@UserAccount](UserAccount.md)

# implement: UserAccount


# response:

```typescript
// file: src/UserAccount/UserAccountConcept.ts

import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import bcrypt from "npm:bcrypt"; // Using bcrypt for password hashing

/**
 * @concept UserAccount
 * @purpose to securely identify and authenticate users
 * @principle a user must register and log in to be identified
 */
const PREFIX = "UserAccount" + ".";

/**
 * Generic type for User identifiers, treated as opaque IDs.
 */
type User = ID;

/**
 * @state
 * a set of Users with
 *   an email String
 *   a passwordHash String
 *   a displayName String
 */
interface UserDoc {
  _id: User;
  email: string;
  passwordHash: string;
  displayName: string;
}

export default class UserAccountConcept {
  private users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * @action register
   * @requires email is not already in use
   * @effects creates a new user with the provided details and a hashed password
   * @param {Object} args
   * @param {string} args.email - The unique email address for the user.
   * @param {string} args.password - The plain-text password for the user.
   * @param {string} args.displayName - The display name for the user.
   * @returns {Promise<{ user: User } | { error: string }>} The ID of the new user or an error message.
   */
  async register(
    { email, password, displayName }: {
      email: string;
      password: string;
      displayName: string;
    },
  ): Promise<{ user: User } | { error: string }> {
    const existingUser = await this.users.findOne({ email });
    if (existingUser) {
      return { error: "Email already in use." };
    }

    const passwordHash = await bcrypt.hash(password, 10); // Hash password with salt rounds = 10
    const newUser: UserDoc = {
      _id: freshID(),
      email,
      passwordHash,
      displayName,
    };

    await this.users.insertOne(newUser);
    return { user: newUser._id };
  }

  /**
   * @action login
   * @effects authenticates the user if the email and password match.
   *   (A separate Session concept would typically create a session after successful login)
   * @param {Object} args
   * @param {string} args.email - The user's email address.
   * @param {string} args.password - The user's plain-text password.
   * @returns {Promise<{ user: User } | { error: string }>} The ID of the authenticated user or an error message.
   */
  async login(
    { email, password }: { email: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    const user = await this.users.findOne({ email });
    if (!user) {
      return { error: "Invalid credentials." };
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return { error: "Invalid credentials." };
    }

    return { user: user._id };
  }

  /**
   * @action updateProfile
   * @effects changes the user's displayName
   * @param {Object} args
   * @param {User} args.user - The ID of the user whose profile is to be updated.
   * @param {string} args.newDisplayName - The new display name for the user.
   * @returns {Promise<Empty | { error: string }>} An empty object on success or an error message.
   */
  async updateProfile(
    { user, newDisplayName }: { user: User; newDisplayName: string },
  ): Promise<Empty | { error: string }> {
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
   * @action deleteAccount
   * @effects removes the user and all their associated data from this concept's state.
   *   (Any other concepts relying on this user ID would need syncs to handle cascade deletions.)
   * @param {Object} args
   * @param {User} args.user - The ID of the user to be deleted.
   * @returns {Promise<Empty | { error: string }>} An empty object on success or an error message.
   */
  async deleteAccount(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    const result = await this.users.deleteOne({ _id: user });

    if (result.deletedCount === 0) {
      return { error: "User not found." };
    }

    return {};
  }

  /**
   * @query _getUserProfile
   * @effects returns the display name and email of a user.
   * @param {Object} args
   * @param {User} args.user - The ID of the user.
   * @returns {Promise<{ displayName: string; email: string } | null>} The user's public profile data or null if not found.
   */
  async _getUserProfile(
    { user }: { user: User },
  ): Promise<{ displayName: string; email: string } | null> {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return null;
    }
    return {
      displayName: userDoc.displayName,
      email: userDoc.email,
    };
  }

  /**
   * @query _findUserByEmail
   * @effects returns the user ID if an email exists.
   * @param {Object} args
   * @param {string} args.email - The email to search for.
   * @returns {Promise<User | null>} The user ID or null if not found.
   */
  async _findUserByEmail(
    { email }: { email: string },
  ): Promise<User | null> {
    const userDoc = await this.users.findOne({ email });
    return userDoc ? userDoc._id : null;
  }
}
```

# prompt: The two functions you added (_findUserByEmail and _getUserProfile) - should I explicitly make them part of the concept or are they fine as is since they are kinda like helper functions 

# response:

That's a great question, and it touches on a nuanced point in the concept design philosophy!

Based on the documentation provided:

> **Concept queries**
> Queries are reads of the concept state. Explicit query specifications are often not required since the concept state is assumed to be visible, so that straightforward queries of the state do not need to be defined in advance. It can be useful, though, to define queries for particularly significant and non-trivial observations of the state.

Your `_getUserProfile` and `_findUserByEmail` queries fall into the category of "straightforward queries." They are direct reads or lookups of the data stored within the `UserAccount` concept's state. They don't involve complex calculations or aggregations like the `_countMutualFriends` example given in the documentation.

**Therefore, they are technically "fine as is" as implicit queries that are part of the concept's observable behavior, but not formally specified in the `.concept` file.**

However, there's a good argument for making them explicit:

1.  **Clarity and Documentation:** Even if straightforward, explicitly listing them in the concept specification clarifies that these are *intended* ways for other parts of the system (or even users, conceptually) to observe the state of the `UserAccount` concept. It makes the concept's full external interface explicit.
2.  **Consistency:** If you eventually have "particularly significant and non-trivial" queries that *must* be specified, it creates a consistent pattern to specify all queries that are part of the concept's public API.
3.  **Design Intent:** By including them, you are formally stating that fetching a user's public profile data or checking for an email's existence are part of the *intended* functionality and purpose of the `UserAccount` concept.

**My recommendation is to make them explicit in the concept specification.** It enhances the clarity, completeness, and documentation of your concept's design, treating them as first-class elements of its user-facing functionality.

Here's how you could add them to your `UserAccount` concept specification:

```
concept UserAccount
purpose to securely identify and authenticate users
principle a user must register and log in to be identified

state
a set of Users with
an email String
a passwordHash String
a displayName String

actions
register (email: String, password: String, displayName: String): (user: User)
register (email: String, password: String, displayName: String): (error: String)
requires email is not already in use
effect creates a new user
login (email: String, password: String): (user: User)
login (email: String, password: String): (error: String)
effect authenticates the user, creating a session (note: Session concept handles actual session creation)
updateProfile (user: User, newDisplayName: String)
updateProfile (user: User, newDisplayName: String): (error: String)
effect changes the user's displayName
deleteAccount (user: User)
deleteAccount (user: User): (error: String)
effect removes the user and all their associated data

queries
_getUserProfile (user: User): (displayName: String, email: String)
_getUserProfile (user: User): (error: String)
effects returns the display name and email of a user.
_findUserByEmail (email: String): (user: User)
_findUserByEmail (email: String): (error: String)
effects returns the user ID if an email exists.
```

**Note on `Empty` vs `error: String` for queries:**
For queries, if there's no result, you'd typically return `null` or an empty array (for list queries) in the implementation, and the specification would reflect that the result is optional. For simplicity, I've added an `error: String` return type to the queries in the example above, similar to actions, to reflect the possibility of a user not being found. If the query returns `null` for "not found" without considering it an "error", you might just omit the error return type for queries.