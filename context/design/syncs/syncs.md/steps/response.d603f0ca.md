---
timestamp: 'Fri Nov 07 2025 11:03:24 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_110324.7f213c0e.md]]'
content_id: d603f0ca03c765a5f852815fb4be29c1fc4bcd1261ea4db1d792b0420e616713
---

# response:

To implement the given synchronization specification:

```sync
When Post.deletePost(post)
Where Comment: post is the parent of comment
Then Comment.delete(comment)
```

We will create a TypeScript synchronization file, assuming that `Post.deletePost` maps to the `Post.delete` action as seen in the examples, and that `Comment: post is the parent of comment` translates to using the `Comment._getByTarget` query.

Here's the TypeScript implementation:

```typescript
// src/syncs/deletePostComments.sync.ts
import { actions, Sync } from "@engine";
import { Post, Comment } from "@concepts"; // Assuming Post and Comment concepts are defined

/**
 * Sync: DeletePostComments
 *
 * Description:
 * When a Post is deleted, automatically delete all associated comments
 * that have that post as their target/parent.
 */
export const DeletePostComments: Sync = ({ post, comment }) => ({
    // 'when' clause: Triggered when the Post.delete action is performed for a specific 'post'.
    // We capture the 'post' variable from the action's input (and potentially output, though redundant here).
    when: actions(
        [Post.delete, { post }, { post }], // Assumes Post.delete (post) : (post) based on examples
    ),

    // 'where' clause: Filters and enriches the frames.
    // Here, it queries for all comments associated with the 'post' from the 'when' clause.
    where: async (frames) => {
        // For each frame (which at this point contains the 'post' binding),
        // query the Comment concept to find all comments where the 'post' is the 'target'.
        // This will expand the 'frames' array, creating a new frame for each comment found,
        // binding the 'comment' variable for each.
        return await frames.query(Comment._getByTarget, { target: post }, { comment });
    },

    // 'then' clause: Executes actions for each frame that passes through the 'where' clause.
    // For each comment found, trigger the Comment.delete action.
    then: actions(
        [Comment.delete, { comment }],
    ),
});
```
