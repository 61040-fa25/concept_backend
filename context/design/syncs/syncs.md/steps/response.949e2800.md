---
timestamp: 'Fri Nov 07 2025 11:09:50 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_110950.e9332e26.md]]'
content_id: 949e28007adbeabc6a70c079594744b289a8361b4710ebd484f1f88d3db88c35
---

# response:

```typescript
// src/syncs/deletePostComments.sync.ts
import { actions, Sync } from "@engine";
import { Post, Comment } from "@concepts"; // Assuming Post and Comment concepts are defined based on previous examples

/**
 * Sync: DeletePostComments
 *
 * Description:
 * This synchronization ensures referential integrity between posts and comments.
 * When a Post is deleted, all comments that are associated with that post
 * (i.e., have the deleted post as their 'target' or parent) are also
 * automatically deleted.
 *
 * Corresponds to the specification:
 * when
 * 	Post.deletePost(post)
 * where
 * 	Comment: post is the parent of comment
 * then
 * 	Comment.deleteComment(comment)
 */
export const DeletePostComments: Sync = ({ post, comment }) => ({
    // The 'when' clause specifies the trigger for this synchronization.
    // It listens for the 'Post.delete' action (assuming 'deletePost' maps to 'delete' from examples).
    // We capture the 'post' variable, which represents the post being deleted.
    when: actions(
        // [Concept.action, input_pattern, output_pattern]
        // The first 'post' in the input pattern `{ post }` matches the parameter of the action.
        // The second 'post' in the output pattern `{ post }` binds the output of the action to our 'post' variable.
        [Post.delete, { post }, { post }],
    ),

    // The 'where' clause is an asynchronous function that takes a set of 'Frames'.
    // It refines the frames by querying for additional data and applying filters.
    where: async (frames) => {
        // At this point, each frame in 'frames' contains the 'post' variable
        // (bound from the 'when' clause trigger).

        // We use the 'Comment._getByTarget' query to find all comments
        // where the 'target' parameter matches the 'post' variable from the current frame.
        // For each comment found, a new frame is created, and the 'comment' variable
        // is bound to the retrieved comment. If a post has multiple comments,
        // this will result in multiple frames, each with the same 'post' but a different 'comment'.
        // The 'await' is crucial because queries are asynchronous operations.
        return await frames.query(
            Comment._getByTarget, // The query function to call on the Comment concept
            { target: post },     // Input pattern: 'target' parameter of the query is bound to our 'post' variable
            { comment },          // Output pattern: The 'comment' output from the query is bound to our 'comment' variable
        );
    },

    // The 'then' clause specifies the actions to be executed for each frame that
    // successfully passes through the 'when' and 'where' clauses.
    then: actions(
        // For each frame where a 'comment' was found to be associated with the deleted 'post',
        // trigger the 'Comment.delete' action (assuming 'deleteComment' maps to 'delete' from examples).
        // The 'comment' variable from the frame is used as the input for this action.
        [Comment.delete, { comment }],
    ),
});
```
