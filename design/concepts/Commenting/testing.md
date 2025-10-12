[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

[@commenting-testing](../../../src/concepts/Commenting/CommentingConcept.test.ts)

# prompt: Please edit the tests so that when getCommentsforPost or getCommentsforAuthor are called, the order of the comments is checked (most recent should come earlier).
# response:

Here's the updated `CommentingConcept.ts` file to include sorting in the queries, and the modified `CommentingConcept.test.ts` file with explicit checks for comment order.

---

### **`src/Commenting/CommentingConcept.ts`**

```typescript
import { Collection, Db, ObjectId } from "npm:mongodb";
import { ID, Empty } from "../../utils/types.ts";
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
  // Optional: timestamp for creation, modification
  createdAt: Date;
  updatedAt: Date;
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
    const result = await this.comments.insertOne({
      _id: newCommentId,
      author,
      content,
      post,
      createdAt: now,
      updatedAt: now,
    });

    if (result.acknowledged) {
      return { comment: newCommentId };
    } else {
      // This case should ideally not happen with insertOne unless there's a serious DB issue
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
   * Query to retrieve a specific comment.
   */
  async _getComment(
    { comment }: { comment: Comment },
  ): Promise<{ comment: CommentDocument } | { error: string }> {
    const foundComment = await this.comments.findOne({ _id: comment });
    if (foundComment) {
      return { comment: foundComment };
    }
    return { error: `Comment with ID '${comment}' not found.` };
  }

  /**
   * _getCommentsForPost (post: Post): (comments: CommentDocument[])
   * Query to retrieve all comments for a given post.
   */
  async _getCommentsForPost(
    { post }: { post: Post },
  ): Promise<{ comments: CommentDocument[] }> {
    // MODIFICATION: Add sort by createdAt in descending order (most recent first)
    const foundComments = await this.comments.find({ post }).sort({
      createdAt: -1,
    }).toArray();
    return { comments: foundComments };
  }

  /**
   * _getCommentsByAuthor (author: User): (comments: CommentDocument[])
   * Query to retrieve all comments made by a given user.
   */
  async _getCommentsByAuthor(
    { author }: { author: User },
  ): Promise<{ comments: CommentDocument[] }> {
    // MODIFICATION: Add sort by createdAt in descending order (most recent first)
    const foundComments = await this.comments.find({ author }).sort({
      createdAt: -1,
    }).toArray();
    return { comments: foundComments };
  }
}
```

---

### **`src/concepts/Commenting/CommentingConcept.test.ts`**

```typescript
import {
  assertEquals,
  assertNotEquals,
  assertObjectMatch,
} from "jsr:@std/assert";
import { freshID, testDb } from "../../utils/database.ts";
import { Empty, ID } from "../../utils/types.ts";
import CommentingConcept from "./CommentingConcept.ts";
import { AssertionError } from "node:assert";

// Mock IDs for User and Post, as these are generic parameters for the concept
const mockUserA: ID = "user:Alice" as ID;
const mockUserB: ID = "user:Bob" as ID;
const mockPostX: ID = "post:Article123" as ID;
const mockPostY: ID = "post:Image456" as ID;

Deno.test("Commenting Concept Tests", async (test) => {
  const [db, client] = await testDb();
  const commentingConcept = new CommentingConcept(db);

  await test.step("Principle Trace: User adds, edits, and deletes a comment", async () => {
    console.log("\n--- Principle Trace: Add, Edit, Delete ---");

    // 1. UserA adds a comment to PostX
    const initialContent = "This is a great post!";
    console.log(
      `Action: addComment(${mockUserA}, "${initialContent}", ${mockPostX})`,
    );
    const addResult = await commentingConcept.addComment({
      author: mockUserA,
      content: initialContent,
      post: mockPostX,
    });
    console.log("Result:", addResult);
    if ("error" in addResult) {
      throw new AssertionError({
        message: `Add should not return an error: ${addResult.error}`,
      });
    }
    const commentId = (addResult as { comment: ID }).comment;
    assertEquals(
      typeof commentId,
      "string",
      "Returned comment ID should be a string",
    );

    // Verify the comment was added
    const getCommentResult1 = await commentingConcept._getComment({
      comment: commentId,
    });
    console.log(
      "Query: _getComment(" + commentId + ") Result:",
      getCommentResult1,
    );
    if ("error" in getCommentResult1) {
      throw new AssertionError({
        message: `Comment should be found: ${getCommentResult1.error}`,
      });
    }
    assertObjectMatch((getCommentResult1 as { comment: any }).comment, {
      _id: commentId,
      author: mockUserA,
      content: initialContent,
      post: mockPostX,
    });

    // 2. UserA edits their comment
    const updatedContent = "This is an updated and even greater post!";
    console.log(
      `Action: editComment(${mockUserA}, ${commentId}, "${updatedContent}")`,
    );
    const editResult = await commentingConcept.editComment({
      user: mockUserA,
      comment: commentId,
      new_content: updatedContent,
    });
    console.log("Result:", editResult);
    assertEquals(editResult, {}, "editComment should succeed");

    // Verify the comment was updated
    const getCommentResult2 = await commentingConcept._getComment({
      comment: commentId,
    });
    console.log(
      "Query: _getComment(" + commentId + ") Result:",
      getCommentResult2,
    );
    if ("error" in getCommentResult2) {
      throw new AssertionError({
        message: `Comment should be found after edit: ${getCommentResult2.error}`,
      });
    }
    assertObjectMatch((getCommentResult2 as { comment: any }).comment, {
      _id: commentId,
      author: mockUserA,
      content: updatedContent,
      post: mockPostX,
    });

    // 3. UserA deletes their comment
    console.log(`Action: deleteComment(${mockUserA}, ${commentId})`);
    const deleteResult = await commentingConcept.deleteComment({
      user: mockUserA,
      comment: commentId,
    });
    console.log("Result:", deleteResult);
    assertEquals(deleteResult, {}, "deleteComment should succeed");

    // Verify the comment was deleted
    const getCommentResult3 = await commentingConcept._getComment({
      comment: commentId,
    });
    console.log(
      "Query: _getComment(" + commentId + ") Result:",
      getCommentResult3,
    );
    assertEquals(
      (getCommentResult3 as { error: string }).error,
      `Comment with ID '${commentId}' not found.`,
      "getComment should not find the deleted comment",
    );
  });

  await test.step("Scenario 1: Invalid addComment calls (requires checks)", async () => {
    console.log("\n--- Scenario 1: Invalid addComment calls ---");

    // 1. Empty content
    const emptyContent = "";
    console.log(
      `Action: addComment(${mockUserA}, "${emptyContent}", ${mockPostX})`,
    );
    const result1 = await commentingConcept.addComment({
      author: mockUserA,
      content: emptyContent,
      post: mockPostX,
    });
    console.log("Result:", result1);
    assertEquals(
      (result1 as { error: string }).error,
      "Comment content cannot be empty.",
      "Should return error for empty content",
    );

    // 2. Content with only whitespace
    const whitespaceContent = "   ";
    console.log(
      `Action: addComment(${mockUserA}, "${whitespaceContent}", ${mockPostX})`,
    );
    const result2 = await commentingConcept.addComment({
      author: mockUserA,
      content: whitespaceContent,
      post: mockPostX,
    });
    console.log("Result:", result2);
    assertEquals(
      (result2 as { error: string }).error,
      "Comment content cannot be empty.",
      "Should return error for whitespace-only content",
    );
  });

  await test.step("Scenario 2: Invalid deleteComment calls (requires checks)", async () => {
    console.log("\n--- Scenario 2: Invalid deleteComment calls ---");

    const nonExistentComment: ID = freshID();

    // 1. Non-existent comment
    console.log(
      `Action: deleteComment(${mockUserA}, ${nonExistentComment})`,
    );
    const result1 = await commentingConcept.deleteComment({
      user: mockUserA,
      comment: nonExistentComment,
    });
    console.log("Result:", result1);
    assertEquals(
      (result1 as { error: string }).error,
      `Comment with ID '${nonExistentComment}' not found.`,
      "Should return error for non-existent comment",
    );

    // Add a comment first for subsequent tests
    const commentToAdd = "A valid comment.";
    const addResult = await commentingConcept.addComment({
      author: mockUserA,
      content: commentToAdd,
      post: mockPostX,
    });
    if ("error" in addResult) {
      throw new AssertionError({
        message: `Add should not return an error: ${addResult.error}`,
      });
    }
    const userACommentId = (addResult as { comment: ID }).comment;

    // 2. UserB tries to delete UserA's comment
    console.log(
      `Action: deleteComment(${mockUserB}, ${userACommentId}) (by wrong user)`,
    );
    const result2 = await commentingConcept.deleteComment({
      user: mockUserB,
      comment: userACommentId,
    });
    console.log("Result:", result2);
    assertEquals(
      (result2 as { error: string }).error,
      `User '${mockUserB}' is not the author of comment '${userACommentId}'.`,
      "Should return error when wrong user tries to delete",
    );

    // Clean up
    await commentingConcept.deleteComment({
      user: mockUserA,
      comment: userACommentId,
    });
  });

  await test.step("Scenario 3: Invalid editComment calls (requires checks)", async () => {
    console.log("\n--- Scenario 3: Invalid editComment calls ---");

    const nonExistentComment: ID = freshID();
    const validNewContent = "This is valid new content.";

    // 1. Non-existent comment
    console.log(
      `Action: editComment(${mockUserA}, ${nonExistentComment}, "${validNewContent}")`,
    );
    const result1 = await commentingConcept.editComment({
      user: mockUserA,
      comment: nonExistentComment,
      new_content: validNewContent,
    });
    console.log("Result:", result1);
    assertEquals(
      (result1 as { error: string }).error,
      `Comment with ID '${nonExistentComment}' not found.`,
      "Should return error for non-existent comment",
    );

    // Add a comment first for subsequent tests
    const commentToAdd = "Initial content.";
    const addResult = await commentingConcept.addComment({
      author: mockUserA,
      content: commentToAdd,
      post: mockPostX,
    });
    if ("error" in addResult) {
      throw new AssertionError({
        message: `Add should not return an error: ${addResult.error}`,
      });
    }
    const userACommentId = (addResult as { comment: ID }).comment;

    // 2. UserB tries to edit UserA's comment
    console.log(
      `Action: editComment(${mockUserB}, ${userACommentId}, "${validNewContent}") (by wrong user)`,
    );
    const result2 = await commentingConcept.editComment({
      user: mockUserB,
      comment: userACommentId,
      new_content: validNewContent,
    });
    console.log("Result:", result2);
    assertEquals(
      (result2 as { error: string }).error,
      `User '${mockUserB}' is not the author of comment '${userACommentId}'.`,
      "Should return error when wrong user tries to edit",
    );

    // 3. Empty new_content
    const emptyNewContent = "";
    console.log(
      `Action: editComment(${mockUserA}, ${userACommentId}, "${emptyNewContent}")`,
    );
    const result3 = await commentingConcept.editComment({
      user: mockUserA,
      comment: userACommentId,
      new_content: emptyNewContent,
    });
    console.log("Result:", result3);
    assertEquals(
      (result3 as { error: string }).error,
      "New comment content cannot be empty.",
      "Should return error for empty new content",
    );

    // Clean up
    await commentingConcept.deleteComment({
      user: mockUserA,
      comment: userACommentId,
    });
  });

  await test.step("Scenario 4: Multiple comments on a post and _getCommentsForPost query (ordered by recency)", async () => {
    console.log("\n--- Scenario 4: Multiple comments on a post ---");

    // UserA comments on PostX (First)
    const commentA1Content = "First comment by Alice on PostX.";
    console.log(
      `Action: addComment(${mockUserA}, "${commentA1Content}", ${mockPostX})`,
    );
    const addResultA1 = await commentingConcept.addComment({
      author: mockUserA,
      content: commentA1Content,
      post: mockPostX,
    });
    if ("error" in addResultA1) {
      throw new AssertionError({
        message: `addResultA1 should not error: ${addResultA1.error}`,
      });
    }
    const commentA1Id = (addResultA1 as { comment: ID }).comment;
    console.log("Result:", addResultA1);

    // UserB comments on PostX (Second)
    const commentB1Content = "First comment by Bob on PostX.";
    console.log(
      `Action: addComment(${mockUserB}, "${commentB1Content}", ${mockPostX})`,
    );
    const addResultB1 = await commentingConcept.addComment({
      author: mockUserB,
      content: commentB1Content,
      post: mockPostX,
    });
    if ("error" in addResultB1) {
      throw new AssertionError({
        message: `addResultB1 should not error: ${addResultB1.error}`,
      });
    }
    const commentB1Id = (addResultB1 as { comment: ID }).comment;
    console.log("Result:", addResultB1);

    // UserA comments again on PostX (Third, Most Recent)
    const commentA2Content = "Second comment by Alice on PostX.";
    console.log(
      `Action: addComment(${mockUserA}, "${commentA2Content}", ${mockPostX})`,
    );
    const addResultA2 = await commentingConcept.addComment({
      author: mockUserA,
      content: commentA2Content,
      post: mockPostX,
    });
    if ("error" in addResultA2) {
      throw new AssertionError({
        message: `addResultA2 should not error: ${addResultA2.error}`,
      });
    }
    const commentA2Id = (addResultA2 as { comment: ID }).comment;
    console.log("Result:", addResultA2);

    // Verify all comments for PostX, expecting most recent first
    console.log(`Query: _getCommentsForPost(${mockPostX})`);
    const { comments: postXComments } = await commentingConcept
      ._getCommentsForPost({
        post: mockPostX,
      });
    console.log("Result (contents in order):", postXComments.map((c) => c.content));
    assertEquals(
      postXComments.length,
      3,
      "There should be 3 comments for PostX",
    );

    // Check the order of comments (Most recent first: A2, then B1, then A1)
    assertEquals(
      postXComments.map(c => c._id),
      [commentA2Id, commentB1Id, commentA1Id],
      "Comments for PostX should be ordered from most recent to oldest (A2, B1, A1)",
    );
    assertEquals(postXComments[0].content, commentA2Content);
    assertEquals(postXComments[1].content, commentB1Content);
    assertEquals(postXComments[2].content, commentA1Content);


    // Clean up
    await commentingConcept.deleteComment({
      user: mockUserA,
      comment: commentA1Id,
    });
    await commentingConcept.deleteComment({
      user: mockUserB,
      comment: commentB1Id,
    });
    await commentingConcept.deleteComment({
      user: mockUserA,
      comment: commentA2Id,
    });
  });

  await test.step("Scenario 5: User comments on multiple posts and _getCommentsByAuthor query (ordered by recency)", async () => {
    console.log("\n--- Scenario 5: User comments on multiple posts ---");

    // UserA comments on PostX (First for UserA)
    const commentA1Content = "Alice on PostX.";
    console.log(
      `Action: addComment(${mockUserA}, "${commentA1Content}", ${mockPostX})`,
    );
    const addResultA1 = await commentingConcept.addComment({
      author: mockUserA,
      content: commentA1Content,
      post: mockPostX,
    });
    if ("error" in addResultA1) {
      throw new AssertionError({
        message: `addResultA1 should not error: ${addResultA1.error}`,
      });
    }
    const commentA1Id = (addResultA1 as { comment: ID }).comment;
    console.log("Result:", addResultA1);

    // UserA comments on PostY (Second for UserA, Most Recent for UserA)
    const commentA2Content = "Alice on PostY.";
    console.log(
      `Action: addComment(${mockUserA}, "${commentA2Content}", ${mockPostY})`,
    );
    const addResultA2 = await commentingConcept.addComment({
      author: mockUserA,
      content: commentA2Content,
      post: mockPostY,
    });
    if ("error" in addResultA2) {
      throw new AssertionError({
        message: `addResultA2 should not error: ${addResultA2.error}`,
      });
    }
    const commentA2Id = (addResultA2 as { comment: ID }).comment;
    console.log("Result:", addResultA2);

    // UserB comments on PostX (Irrelevant for UserA's query, but adds time gap)
    const commentB1Content = "Bob on PostX.";
    console.log(
      `Action: addComment(${mockUserB}, "${commentB1Content}", ${mockPostX})`,
    );
    const addResultB1 = await commentingConcept.addComment({
      author: mockUserB,
      content: commentB1Content,
      post: mockPostX,
    });
    if ("error" in addResultB1) {
      throw new AssertionError({
        message: `addResultB1 should not error: ${addResultB1.error}`,
      });
    }
    const commentB1Id = (addResultB1 as { comment: ID }).comment;
    console.log("Result:", addResultB1);


    // Verify comments by UserA, expecting most recent first
    console.log(`Query: _getCommentsByAuthor(${mockUserA})`);
    const { comments: userAComments } = await commentingConcept
      ._getCommentsByAuthor({
        author: mockUserA,
      });
    console.log("Result (contents in order):", userAComments.map((c) => c.content));
    assertEquals(userAComments.length, 2, "UserA should have 2 comments");

    // Check the order of comments (Most recent first: A2, then A1)
    assertEquals(
      userAComments.map(c => c._id),
      [commentA2Id, commentA1Id],
      "Comments for UserA should be ordered from most recent to oldest (A2, A1)",
    );
    assertEquals(userAComments[0].content, commentA2Content);
    assertEquals(userAComments[1].content, commentA1Content);

    // Clean up
    await commentingConcept.deleteComment({
      user: mockUserA,
      comment: commentA1Id,
    });
    await commentingConcept.deleteComment({
      user: mockUserA,
      comment: commentA2Id,
    });
    await commentingConcept.deleteComment({
      user: mockUserB,
      comment: commentB1Id,
    });
  });

  await client.close();
});
```