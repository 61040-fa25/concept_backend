---
timestamp: 'Sun Oct 12 2025 07:11:20 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251012_071120.2e05a414.md]]'
content_id: 8bedba48750e2c86a54e1f571757e8a1d1c8201c2b48e78660bb68a213be99b4
---

# response:

```typescript
// file: src/Commenting/CommentingConcept.test.ts

import { assertEquals, assertNotEquals, assertObjectMatch } from "jsr:@std/assert";
import { testDb, freshID } from "../../utils/database.ts";
import { ID, Empty } from "../../utils/types.ts";
import CommentingConcept from "./CommentingConcept.ts";

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
    assertNotEquals((addResult as { error?: string }).error, undefined, "addComment should succeed");
    const commentId = (addResult as { comment: Comment }).comment;
    assertEquals(typeof commentId, "string", "Returned comment ID should be a string");

    // Verify the comment was added
    const getCommentResult1 = await commentingConcept._getComment({
      comment: commentId,
    });
    console.log("Query: _getComment(" + commentId + ") Result:", getCommentResult1);
    assertNotEquals((getCommentResult1 as { error?: string }).error, undefined, "getComment should find the comment");
    assertObjectMatch(getCommentResult1.comment, {
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
    console.log("Query: _getComment(" + commentId + ") Result:", getCommentResult2);
    assertObjectMatch(getCommentResult2.comment, {
      _id: commentId,
      author: mockUserA,
      content: updatedContent,
      post: mockPostX,
    });
    assertNotEquals(getCommentResult2.comment.createdAt, getCommentResult2.comment.updatedAt, "updatedAt should be different from createdAt");

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
    console.log("Query: _getComment(" + commentId + ") Result:", getCommentResult3);
    assertEquals((getCommentResult3 as { error: string }).error, `Comment with ID '${commentId}' not found.`, "getComment should not find the deleted comment");
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
    assertEquals((result1 as { error: string }).error, "Comment content cannot be empty.", "Should return error for empty content");

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
    assertEquals((result2 as { error: string }).error, "Comment content cannot be empty.", "Should return error for whitespace-only content");
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
    assertEquals((result1 as { error: string }).error, `Comment with ID '${nonExistentComment}' not found.`, "Should return error for non-existent comment");

    // Add a comment first for subsequent tests
    const commentToAdd = "A valid comment.";
    const addResult = await commentingConcept.addComment({
      author: mockUserA,
      content: commentToAdd,
      post: mockPostX,
    });
    const userACommentId = (addResult as { comment: Comment }).comment;

    // 2. UserB tries to delete UserA's comment
    console.log(
      `Action: deleteComment(${mockUserB}, ${userACommentId}) (by wrong user)`,
    );
    const result2 = await commentingConcept.deleteComment({
      user: mockUserB,
      comment: userACommentId,
    });
    console.log("Result:", result2);
    assertEquals((result2 as { error: string }).error, `User '${mockUserB}' is not the author of comment '${userACommentId}'.`, "Should return error when wrong user tries to delete");

    // Clean up
    await commentingConcept.deleteComment({ user: mockUserA, comment: userACommentId });
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
    assertEquals((result1 as { error: string }).error, `Comment with ID '${nonExistentComment}' not found.`, "Should return error for non-existent comment");

    // Add a comment first for subsequent tests
    const commentToAdd = "Initial content.";
    const addResult = await commentingConcept.addComment({
      author: mockUserA,
      content: commentToAdd,
      post: mockPostX,
    });
    const userACommentId = (addResult as { comment: Comment }).comment;

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
    assertEquals((result2 as { error: string }).error, `User '${mockUserB}' is not the author of comment '${userACommentId}'.`, "Should return error when wrong user tries to edit");

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
    assertEquals((result3 as { error: string }).error, "New comment content cannot be empty.", "Should return error for empty new content");

    // 4. new_content with only whitespace
    const whitespaceNewContent = "   ";
    console.log(
      `Action: editComment(${mockUserA}, ${userACommentId}, "${whitespaceNewContent}")`,
    );
    const result4 = await commentingConcept.editComment({
      user: mockUserA,
      comment: userACommentId,
      new_content: whitespaceNewContent,
    });
    console.log("Result:", result4);
    assertEquals((result4 as { error: string }).error, "New comment content cannot be empty.", "Should return error for whitespace-only new content");

    // Clean up
    await commentingConcept.deleteComment({ user: mockUserA, comment: userACommentId });
  });

  await test.step("Scenario 4: Multiple comments on a post and _getCommentsForPost query", async () => {
    console.log("\n--- Scenario 4: Multiple comments on a post ---");

    // UserA comments on PostX
    const commentA1Content = "First comment by Alice on PostX.";
    console.log(
      `Action: addComment(${mockUserA}, "${commentA1Content}", ${mockPostX})`,
    );
    const addResultA1 = await commentingConcept.addComment({
      author: mockUserA,
      content: commentA1Content,
      post: mockPostX,
    });
    const commentA1Id = (addResultA1 as { comment: Comment }).comment;
    console.log("Result:", addResultA1);

    // UserB comments on PostX
    const commentB1Content = "First comment by Bob on PostX.";
    console.log(
      `Action: addComment(${mockUserB}, "${commentB1Content}", ${mockPostX})`,
    );
    const addResultB1 = await commentingConcept.addComment({
      author: mockUserB,
      content: commentB1Content,
      post: mockPostX,
    });
    const commentB1Id = (addResultB1 as { comment: Comment }).comment;
    console.log("Result:", addResultB1);

    // UserA comments again on PostX
    const commentA2Content = "Second comment by Alice on PostX.";
    console.log(
      `Action: addComment(${mockUserA}, "${commentA2Content}", ${mockPostX})`,
    );
    const addResultA2 = await commentingConcept.addComment({
      author: mockUserA,
      content: commentA2Content,
      post: mockPostX,
    });
    const commentA2Id = (addResultA2 as { comment: Comment }).comment;
    console.log("Result:", addResultA2);

    // Verify all comments for PostX
    console.log(`Query: _getCommentsForPost(${mockPostX})`);
    const { comments: postXComments } = await commentingConcept._getCommentsForPost({
      post: mockPostX,
    });
    console.log("Result:", postXComments.map(c => c.content));
    assertEquals(postXComments.length, 3, "There should be 3 comments for PostX");
    const contents = postXComments.map((c) => c.content);
    assertEquals(contents.includes(commentA1Content), true);
    assertEquals(contents.includes(commentB1Content), true);
    assertEquals(contents.includes(commentA2Content), true);

    // Clean up
    await commentingConcept.deleteComment({ user: mockUserA, comment: commentA1Id });
    await commentingConcept.deleteComment({ user: mockUserB, comment: commentB1Id });
    await commentingConcept.deleteComment({ user: mockUserA, comment: commentA2Id });
  });

  await test.step("Scenario 5: User comments on multiple posts and _getCommentsByAuthor query", async () => {
    console.log("\n--- Scenario 5: User comments on multiple posts ---");

    // UserA comments on PostX
    const commentA1Content = "Alice on PostX.";
    console.log(
      `Action: addComment(${mockUserA}, "${commentA1Content}", ${mockPostX})`,
    );
    const addResultA1 = await commentingConcept.addComment({
      author: mockUserA,
      content: commentA1Content,
      post: mockPostX,
    });
    const commentA1Id = (addResultA1 as { comment: Comment }).comment;
    console.log("Result:", addResultA1);

    // UserA comments on PostY
    const commentA2Content = "Alice on PostY.";
    console.log(
      `Action: addComment(${mockUserA}, "${commentA2Content}", ${mockPostY})`,
    );
    const addResultA2 = await commentingConcept.addComment({
      author: mockUserA,
      content: commentA2Content,
      post: mockPostY,
    });
    const commentA2Id = (addResultA2 as { comment: Comment }).comment;
    console.log("Result:", addResultA2);

    // UserB comments on PostX
    const commentB1Content = "Bob on PostX.";
    console.log(
      `Action: addComment(${mockUserB}, "${commentB1Content}", ${mockPostX})`,
    );
    const addResultB1 = await commentingConcept.addComment({
      author: mockUserB,
      content: commentB1Content,
      post: mockPostX,
    });
    const commentB1Id = (addResultB1 as { comment: Comment }).comment;
    console.log("Result:", addResultB1);

    // Verify comments by UserA
    console.log(`Query: _getCommentsByAuthor(${mockUserA})`);
    const { comments: userAComments } = await commentingConcept._getCommentsByAuthor({
      author: mockUserA,
    });
    console.log("Result:", userAComments.map(c => c.content));
    assertEquals(userAComments.length, 2, "UserA should have 2 comments");
    const userAContents = userAComments.map((c) => c.content);
    assertEquals(userAContents.includes(commentA1Content), true);
    assertEquals(userAContents.includes(commentA2Content), true);

    // Clean up
    await commentingConcept.deleteComment({ user: mockUserA, comment: commentA1Id });
    await commentingConcept.deleteComment({ user: mockUserA, comment: commentA2Id });
    await commentingConcept.deleteComment({ user: mockUserB, comment: commentB1Id });
  });

  await test.step("Scenario 6: Edit comment with identical content", async () => {
    console.log("\n--- Scenario 6: Edit comment with identical content ---");

    // Add a comment
    const originalContent = "This is the original content.";
    console.log(
      `Action: addComment(${mockUserA}, "${originalContent}", ${mockPostX})`,
    );
    const addResult = await commentingConcept.addComment({
      author: mockUserA,
      content: originalContent,
      post: mockPostX,
    });
    const commentId = (addResult as { comment: Comment }).comment;
    console.log("Result:", addResult);

    // Edit with identical content
    console.log(
      `Action: editComment(${mockUserA}, ${commentId}, "${originalContent}") (identical content)`,
    );
    const editResult = await commentingConcept.editComment({
      user: mockUserA,
      comment: commentId,
      new_content: originalContent,
    });
    console.log("Result:", editResult);
    assertEquals(editResult, {}, "editComment with identical content should succeed (no actual modification)");

    // Verify the comment content is still the same, and updatedAt might not change
    const getCommentResult = await commentingConcept._getComment({
      comment: commentId,
    });
    console.log("Query: _getComment(" + commentId + ") Result:", getCommentResult);
    assertObjectMatch(getCommentResult.comment, {
      _id: commentId,
      author: mockUserA,
      content: originalContent,
      post: mockPostX,
    });

    // Clean up
    await commentingConcept.deleteComment({ user: mockUserA, comment: commentId });
  });

  await client.close();
});
```
