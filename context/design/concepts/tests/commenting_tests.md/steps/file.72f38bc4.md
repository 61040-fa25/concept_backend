---
timestamp: 'Sat Oct 18 2025 14:27:24 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_142724.f044e1ca.md]]'
content_id: 72f38bc461faab8ea7b24e885727a6b1e96d867d42e5c1a73ad054393561e18a
---

# file: src\concepts\skrib\Commenting.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";


// Declare collection prefix, use concept name
const PREFIX = "Commenting" + ".";

// Generic types of this concept
type User = ID;
type Item = ID;


//internal ids
type Comment = ID;

/**
 * a set of Comments with
 *  a body String
 *  an author User
 */
interface Comments {
  _id: Comment;
  parent: Item;
  author: User;
  body: string;
}


/**
 * @concept Comment
 * @purpose to allow user to upload content related to a specific comment or comment
 */
export default class CommentingConcept {
  private comments: Collection<Comments>;


  constructor(private readonly db: Db) {
    this.comments = this.db.collection(PREFIX + "comments");
  }


  /**
   * Creates a Comment
   * @effects creates a comment on item with body by user and adds it to Comments set
   *
   */
  async createComment({ user, body, item }: { user: User; body: string; item:Item }): Promise<{comment: Comment}> {

    const commentId = freshID() as Comment;
    await this.comments.insertOne({
      _id: commentId,
      parent: item,
      author: user,
      body,
    });
    return { comment: commentId };
  }



  /**
   * Deletes a comment
   * @requires comment exists
   * @effects removes comment from Comments set
   */
  async deleteComment({ comment }: { comment: Comment;}): Promise<Empty|{error: string}> {
    const existingComment = await this.comments.findOne({ _id: comment });
    if (!existingComment) {
      return { error: `Comment with ID ${comment} not found.` };
    }

    this.comments.deleteOne({_id: comment})
    return {};
  }



  /**
   * Edits an existing comment
   * @requires comment exists
   * @effects replaces body of comment with newBody
   */
  async editComment({ comment, newBody }: { comment: Comment; newBody: string }): Promise<Empty|{error: string}> {
    const existingComment = await this.comments.findOne({ _id: comment });
    if (!existingComment) {
      return { error: `Comment with ID ${comment} not found.` };
    }
    await this.comments.updateOne({_id: comment }, { $set: { body: newBody } });
    return {};
  }



  /**
   * returns all comments created by author
   */
  async _getCommentsByAuthor({ author }: { author: User }): Promise<Comments[]> {
    return await this.comments.find({ author }).toArray();
  }


  /**
   * returns all comments on parent
   */
  async _getCommentsByParent({ parent }: { parent: Item }): Promise<Comments[]> {
    return await this.comments.find({ parent }).toArray();
  }

  /**
   * returns all comments in database
   */
  async _getAllComments(): Promise<Comments[]> {
    return await this.comments.find().toArray();
  }
}

```

Please be sure to create and close a new database with each test
