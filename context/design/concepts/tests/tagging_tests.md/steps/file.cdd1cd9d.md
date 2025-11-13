---
timestamp: 'Sat Oct 18 2025 17:03:35 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_170335.92cdfd87.md]]'
content_id: cdd1cd9dbdbeaeafbac4ef0e28b9c97bb2c392cb7db013a10e745103e88d31d8
---

# file: src\concepts\skrib\Upvoting.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";


// Declare collection prefix, use concept name
const PREFIX = "Upvoting" + ".";

// Generic types of this concept
type User = ID;
type Item = ID;


//internal ids
type Vote = ID;

/**
 * a set of Votes with
 *  a target Item
 *  a user User
 */
interface Votes {
  _id: Vote;
  user: User;
  target: Item;
}


/**
 * @concept Upvote
 * @purpose to rank items by popularity
 */
export default class UpvotingConcept {
  votes: Collection<Votes>;


  constructor(private readonly db: Db) {
    this.votes = this.db.collection(PREFIX + "votes");
  }


  /**
   * adds user's upvote to item
   * requires: no vote by user for item
   * effects: adds vote by user for item to Votes set
   */
  async upvote({ user, item }: { user: User; item: Item }): Promise<Empty|{error: string}> {
    const existingVote = await this.votes.findOne({ user: user, target: item });
    if (existingVote) {
      return { error: `User ${user} has already upvoted ${item}` };
    }

    const voteId = freshID() as Vote;
    await this.votes.insertOne({
      _id: voteId,
      user,
      target: item,
    });
    return { };
  }


   /**
    * removes user's upvote from item
    * requires: no vote by user for item
    * effects: adds vote by user for item to Votes set
   */
  async unvote({ user, item }: { user: User; item: Item }): Promise<Empty|{error: string}> {
    const existingVote = await this.votes.findOne({ user: user, target: item });
    if (!existingVote) {
      return { error: `User ${user} hasn't upvoted ${item}` };
    }

    await this.votes.deleteOne({ user: user, target: item });
    return {}
  }





  /**
   * returns all votes from user
   */
  async _getUpvotessByUser({ user }: { user: User }): Promise<Votes[]> {
    return await this.votes.find({ user }).toArray();
  }

   /**
   * returns all votes on an item
   */
  async _getUpvotesByItem({ item }: { item: Item }): Promise<Votes[]> {
    return await this.votes.find({ target: item }).toArray();
  }

  /**
   * returns all votes
   */
  async _getAllUpvotes(): Promise<Votes[]> {
    return await this.votes.find().toArray();
  }
}

```

Please split tests into multiple Deno test functions instead of Deno step functions and be sure to open and close a new database for each test
