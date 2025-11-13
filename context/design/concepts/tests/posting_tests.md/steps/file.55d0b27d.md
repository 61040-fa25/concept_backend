---
timestamp: 'Fri Oct 17 2025 12:42:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_124249.0bca27ad.md]]'
content_id: 55d0b27d99f75d2b4391a9f9a26de8fb29c9d4d6eb6a217459ef4ac2f2286a58
---

# file: src/concepts/skrib/Posting.test.ts

```typescript
import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import PostingConcept from "./Posting.ts";

Deno.test("PostingConcept", async (t) => {
  const [db, client] = await testDb();
  const postingConcept = new PostingConcept(db);

  // Define some test users and bodies
  const userA = "user:Alice" as ID;
  const userB = "user:Bob" as ID;
  const body1 = "This is my first post!";
  const body2 = "Another great thought.";
  const newBody = "Updated content here.";

  // A helper function to fetch a post by ID
  const getPostById = async (postId: ID) => {
    return await postingConcept.posts.findOne({ _id: postId });
  };

  await t.step("createPost - should create a new post successfully", async () => {
    console.log("Trace: createPost action for userA with body1.");
    const result = await postingConcept.createPost({ user: userA, body: body1 });
    console.log(`  Action result: ${JSON.stringify(result)}`);

    assertNotEquals(result.post, undefined, "Expected a post ID to be returned");
    const postId = result.post;

    const postInDb = await getPostById(postId);
    console.log(`  Post found in DB: ${JSON.stringify(postInDb)}`);

    assertEquals(postInDb?.author, userA, "Post author should match the creator");
    assertEquals(postInDb?.body, body1, "Post body should match the provided body");
    assertEquals(await postingConcept.posts.countDocuments(), 1, "There should be exactly one post in the database");
  });

  await t.step("editPost - should update the body of an existing post", async () => {
    // First, create a post to edit
    const createResult = await postingConcept.createPost({ user: userA, body: body1 });
    const postId = createResult.post;
    console.log(`Trace: createPost to set up for editPost. Post ID: ${postId}`);

    console.log(`Trace: editPost action for postId ${postId} with newBody.`);
    const editResult = await postingConcept.editPost({ post: postId, newBody: newBody });
    console.log(`  Action result: ${JSON.stringify(editResult)}`);

    assertEquals(Object.keys(editResult).length, 0, "Expected an empty object for successful edit");

    const postInDb = await getPostById(postId);
    console.log(`  Post found in DB after edit: ${JSON.stringify(postInDb)}`);

    assertEquals(postInDb?.body, newBody, "Post body should be updated to newBody");
    assertEquals(postInDb?.author, userA, "Post author should remain unchanged");
  });

  await t.step("editPost - should return an error if post does not exist", async () => {
    const nonExistentPostId = "post:nonexistent" as ID;
    console.log(`Trace: editPost action for non-existent post ID ${nonExistentPostId}.`);
    const result = await postingConcept.editPost({ post: nonExistentPostId, newBody: newBody });
    console.log(`  Action result: ${JSON.stringify(result)}`);

    assertNotEquals(result.error, undefined, "Expected an error for non-existent post");
    assertEquals(result.error, `Survey with ID ${nonExistentPostId} not found.`, "Error message should indicate post not found");
  });

  await t.step("deletePost - should remove an existing post", async () => {
    // First, create a post to delete
    const createResult = await postingConcept.createPost({ user: userA, body: body1 });
    const postId = createResult.post;
    console.log(`Trace: createPost to set up for deletePost. Post ID: ${postId}`);

    assertEquals(await postingConcept.posts.countDocuments(), 1, "Pre-condition: one post should exist");

    console.log(`Trace: deletePost action for postId ${postId}.`);
    const deleteResult = await postingConcept.deletePost({ post: postId });
    console.log(`  Action result: ${JSON.stringify(deleteResult)}`);

    assertEquals(Object.keys(deleteResult).length, 0, "Expected an empty object for successful deletion");

    const postInDb = await getPostById(postId);
    console.log(`  Post found in DB after delete attempt: ${JSON.stringify(postInDb)}`);

    assertEquals(postInDb, null, "Post should no longer exist in the database");
    assertEquals(await postingConcept.posts.countDocuments(), 0, "There should be no posts left in the database");
  });

  await t.step("deletePost - should return an error if post does not exist", async () => {
    const nonExistentPostId = "post:nonexistentToDelete" as ID;
    console.log(`Trace: deletePost action for non-existent post ID ${nonExistentPostId}.`);
    const result = await postingConcept.deletePost({ post: nonExistentPostId });
    console.log(`  Action result: ${JSON.stringify(result)}`);

    assertNotEquals(result.error, undefined, "Expected an error for non-existent post");
    assertEquals(result.error, `Survey with ID ${nonExistentPostId} not found.`, "Error message should indicate post not found");
  });

  await t.step("_getPostsByAuthor - should return all posts by a specific author", async () => {
    // Create multiple posts by different users
    console.log("Trace: Setting up multiple posts for _getPostsByAuthor query.");
    const postA1Result = await postingConcept.createPost({ user: userA, body: "Alice's first post" });
    const postA2Result = await postingConcept.createPost({ user: userA, body: "Alice's second post" });
    const postB1Result = await postingConcept.createPost({ user: userB, body: "Bob's post" });
    console.log(`  Created posts: ${postA1Result.post}, ${postA2Result.post}, ${postB1Result.post}`);

    console.log(`Trace: Calling _getPostsByAuthor for userA (${userA}).`);
    const alicePosts = await postingConcept._getPostsByAuthor({ author: userA });
    console.log(`  Results for userA: ${JSON.stringify(alicePosts.map(p => ({_id: p._id, body: p.body})))}`);

    assertEquals(alicePosts.length, 2, "Should return 2 posts for userA");
    assertEquals(alicePosts.some(p => p._id === postA1Result.post), true, "Alice's first post should be included");
    assertEquals(alicePosts.some(p => p._id === postA2Result.post), true, "Alice's second post should be included");
    assertEquals(alicePosts.every(p => p.author === userA), true, "All returned posts should be by userA");

    console.log(`Trace: Calling _getPostsByAuthor for userB (${userB}).`);
    const bobPosts = await postingConcept._getPostsByAuthor({ author: userB });
    console.log(`  Results for userB: ${JSON.stringify(bobPosts.map(p => ({_id: p._id, body: p.body})))}`);

    assertEquals(bobPosts.length, 1, "Should return 1 post for userB");
    assertEquals(bobPosts[0]._id, postB1Result.post, "Bob's post should be included");

    console.log(`Trace: Calling _getPostsByAuthor for a non-existent user.`);
    const nonExistentUserPosts = await postingConcept._getPostsByAuthor({ author: "user:Charlie" as ID });
    console.log(`  Results for non-existent user: ${JSON.stringify(nonExistentUserPosts)}`);

    assertEquals(nonExistentUserPosts.length, 0, "Should return 0 posts for a non-existent user");
  });

  await t.step("_getAllPosts - should return all posts in the database", async () => {
    // Ensure some posts exist
    console.log("Trace: Setting up posts for _getAllPosts query.");
    await postingConcept.createPost({ user: userA, body: "Post 1" });
    await postingConcept.createPost({ user: userB, body: "Post 2" });

    console.log("Trace: Calling _getAllPosts.");
    const allPosts = await postingConcept._getAllPosts();
    console.log(`  All posts found: ${JSON.stringify(allPosts.map(p => ({_id: p._id, author: p.author, body: p.body})))}`);

    assertEquals(allPosts.length, 2, "Should return all 2 posts created");
    assertEquals(allPosts.some(p => p.body === "Post 1"), true, "Post 1 should be included");
    assertEquals(allPosts.some(p => p.body === "Post 2"), true, "Post 2 should be included");
  });

  await t.step("Principle Test: A user creates and publishes a post which can then be seen publically.", async () => {
    const principleUser = "user:PrincipleAlice" as ID;
    const principlePostBody = "My public announcement!";

    // # trace:
    // 1. A user (PrincipleAlice) creates a post.
    console.log(`Trace: [Principle] User ${principleUser} creates a post.`);
    const createResult = await postingConcept.createPost({ user: principleUser, body: principlePostBody });
    const principlePostId = createResult.post;
    console.log(`  Action: createPost(${principleUser}, "${principlePostBody}") -> { post: ${principlePostId} }`);
    assertNotEquals(principlePostId, undefined, "Expected a post ID from creation");

    // 2. The post is now published and can be seen publicly.
    // We verify this by using _getAllPosts, which represents public visibility.
    console.log(`Trace: [Principle] Verify the post is publicly visible using _getAllPosts.`);
    const allPublicPosts = await postingConcept._getAllPosts();
    console.log(`  Query: _getAllPosts() -> ${JSON.stringify(allPublicPosts.map(p => p._id))}`);

    const foundPost = allPublicPosts.find(p => p._id === principlePostId);
    assertEquals(foundPost !== undefined, true, "The principle post should be found in all public posts");
    assertEquals(foundPost?.body, principlePostBody, "The found post's body should match the created body");
    assertEquals(foundPost?.author, principleUser, "The found post's author should match the creator");

    console.log(`Principle fully modeled: The post (ID: ${principlePostId}) created by ${principleUser} with body "${principlePostBody}" is now publically visible.`);
  });

  // Close the database client after all tests in this file are done
  await client.close();
});
```
