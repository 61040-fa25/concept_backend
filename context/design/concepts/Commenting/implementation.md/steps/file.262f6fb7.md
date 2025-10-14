---
timestamp: 'Tue Oct 14 2025 00:27:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_002717.d75a36c3.md]]'
content_id: 262f6fb7c18623457d98df5ae63de6d72913c0abbae9660bf6b8208b3b27d7ad
---

# file: src/concepts/Commenting/CommentingConcept.ts

```typescript
import { Collection, Db, ObjectId } from "npm:mongodb";
import { Empty, ID } from "../../utils/types.ts";
import { freshID } from "../../utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Commenting" + ".";

// Generic types of this concept
type User = ID;
type Post = ID;
type Comment = ID;

/**
 * a set of Comments with
 *   an author User
 *   a content String
 *   an associated Post
 */
interface CommentDocument {
  _id: Comment;
  author: User;
  content: string;
  post: Post;
  createdAt: Date;
}

/**
 * @concept Commenting [User, Post]
 * @purpose enable discussion around shared posts
 * @principle users can comment on posts that are visible to them.
 *            Comments can be added, deleted, and edited.
 */
export default class CommentingConcept {
  comments: Collection<CommentDocument>;

  constructor(private readonly db: Db) {
    this.comments = this.db.collection(PREFIX + "comments");
  }

  /**
   * addComment (author: User, content: String, post: Post): (comment: Comment)
   *
   * @requires author and post must exist (implicitly handled by syncs providing valid IDs),
   *           author must have visibility of the post (implicitly handled by syncs),
   *           content cannot be empty
   * @effects creates a comment authored by the user under the post with the text content
   */
  async addComment(
    { author, content, post }: {
      author: User;
      content: string;
      post: Post;
    },
  ): Promise<{ comment: Comment } | { error: string }> {
    // requires: content cannot be empty
    if (!content || content.trim().length === 0) {
      return { error: "Comment content cannot be empty." };
    }

    const newCommentId: Comment = freshID();
    const now = new Date();

    // effects: creates a comment authored by the user under the post with the text content
    const newComment: CommentDocument = {
      _id: newCommentId,
      author,
      content,
      post,
      createdAt: now,
    };

    try {
      await this.comments.insertOne(newComment);
      return { comment: newCommentId };
    } catch (e) {
      console.error("Failed to create comment:", e);
      return { error: "Failed to create comment due to a database error." };
    }
  }

  /**
   * deleteComment (user: User, comment: Comment)
   *
   * @requires comment must exist, comment must belong to the user
   * @effects deletes the comment
   */
  async deleteComment(
    { user, comment }: { user: User; comment: Comment },
  ): Promise<Empty | { error: string }> {
    // requires: comment must exist and belong to the user
    const existingComment = await this.comments.findOne({ _id: comment });

    if (!existingComment) {
      return { error: `Comment with ID '${comment}' not found.` };
    }
    if (existingComment.author !== user) {
      return {
        error: `User '${user}' is not the author of comment '${comment}'.`,
      };
    }

    // effects: deletes the comment
    const result = await this.comments.deleteOne({ _id: comment });

    if (result.acknowledged && result.deletedCount === 1) {
      return {};
    } else {
      return { error: "Failed to delete comment due to a database error." };
    }
  }

  /**
   * editComment (user: User, comment: Comment, new_content: String)
   *
   * @requires comment must exist, comment must belong to the user, new_content cannot be empty
   * @effects edits the comment content to be that of new_content
   */
  async editComment(
    { user, comment, new_content }: {
      user: User;
      comment: Comment;
      new_content: string;
    },
  ): Promise<Empty | { error: string }> {
    // requires: new_content cannot be empty
    if (!new_content || new_content.trim().length === 0) {
      return { error: "New comment content cannot be empty." };
    }

    // requires: comment must exist and belong to the user
    const existingComment = await this.comments.findOne({ _id: comment });

    if (!existingComment) {
      return { error: `Comment with ID '${comment}' not found.` };
    }
    if (existingComment.author !== user) {
      return {
        error: `User '${user}' is not the author of comment '${comment}'.`,
      };
    }

    // effects: edits the comment content to be that of new_content
    const result = await this.comments.updateOne(
      { _id: comment },
      { $set: { content: new_content, updatedAt: new Date() } },
    );

    if (result.acknowledged && result.modifiedCount === 1) {
      return {};
    } else if (result.acknowledged && result.modifiedCount === 0) {
      // This means the comment was found, but the content was the same, so no modification occurred.
      // We can treat this as a success as the desired state is achieved.
      return {};
    } else {
      return { error: "Failed to update comment due to a database error." };
    }
  }

  /**
   * _getComment (comment: Comment): (comment: CommentDocument)
   * Query to retrieve a specific comment. Returns an array of dictionaries,
   * where each dictionary has a 'comment' field.
   */
  async _getComment(
    { comment }: { comment: Comment },
  ): Promise<Array<{ comment: CommentDocument }>> {
    const foundComment = await this.comments.findOne({ _id: comment });
    if (foundComment) {
      return [{ comment: foundComment }]; // Wrap single result in an array
    }
    return []; // Return empty array if not found
  }

  /**
   * _getCommentsForPost (post: Post): (comments: CommentDocument[])
   * Query to retrieve all comments for a given post, sorted from most recent to oldest.
   */
  async _getCommentsForPost(
    { post }: { post: Post },
  ): Promise<{ comments: CommentDocument[] }> {
    const foundComments = await this.comments.find({ post }).sort({
      createdAt: -1,
    }).toArray();
    return { comments: foundComments };
  }

  /**
   * _getCommentsByAuthor (author: User): (comments: CommentDocument[])
   * Query to retrieve all comments made by a given user, sorted from most recent to oldest.
   */
  async _getCommentsByAuthor(
    { author }: { author: User },
  ): Promise<{ comments: CommentDocument[] }> {
    const foundComments = await this.comments.find({ author }).sort({
      createdAt: -1,
    }).toArray();
    return { comments: foundComments };
  }
}

```
