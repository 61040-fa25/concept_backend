---
timestamp: 'Tue Oct 21 2025 15:13:01 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_151301.75802441.md]]'
content_id: 775f6f3679b8071af95baed62bc284460a4ac3f28da305329b19b842c61019af
---

# file: src\concepts\skrib\Authentication.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";


// Declare collection prefix, use concept name
const PREFIX = "Authenticate" + ".";


//internal ids
type User = ID;

/**
 * a set of Users with
 *  a username String
 *  a password String
 */
interface Users {
  _id: User;
  username: string;
  password: string;
}



export default class AuthenticationConcept {
  private users: Collection<Users>;


  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }


  /**
   * registers a user with the service
   * @effects adds a user with username and password to users set
   */
  async register({ username, password }: { username: string; password: string }): Promise<{user: User}| {error: string}> {

    const existingUser = await this.users.findOne({username});
    if (existingUser)
        return {error: 'username is already in use'};

    const userId = freshID() as User;
    await this.users.insertOne({
      _id: userId,
      username,
      password,
    });
    return { user: userId };
  }


  /**
   * deletes a registered user
   * @requires user to exist
   * @effects removes user from user set
   */
async deleteUser({ user }: { user: User }): Promise<Empty| {error: string}> {

    const existingUser = await this.users.findOne({_id: user});
    if (!existingUser)
        return {error: 'user does not exist'};


    await this.users.deleteOne({_id: user});
    return {};
  }



  /**
   * changes user's password
   * @requires user to exisr
   * @effects changes the password associated to user to newPassword
   */
  async changePassword({ user, newPassword }: { user: User; newPassword: string }): Promise<Empty|{error: string}> {
    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) {
      return { error: `User not found` };
    }
    await this.users.updateOne({_id: user }, { $set: { password: newPassword } });
    return {};
  }


  /**
   * gives access to a user given a username and password
   * @requires user with username and password to exist
   * @effects returns that user
   */
  async authenticate({ username, password }: { username: string; password: string }): Promise<{user: User}| {error: string}> {

    const existingUser = await this.users.findOne({username, password});
    if (existingUser)
        return {user: existingUser._id};

    return { error: `wrong username or password` };
  }


  /**
   * returns all users
   */
  async _getAllUsers({}): Promise<Users[]> {
    return await this.users.find().toArray();
  }
}

```
