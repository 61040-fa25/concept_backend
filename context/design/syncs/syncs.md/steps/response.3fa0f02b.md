---
timestamp: 'Fri Nov 07 2025 11:10:25 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251107_111025.a8f036d5.md]]'
content_id: 3fa0f02bd2e8270c57e64709ca80a56aa6119b2d2e40257d72779d28c33757f3
---

# response:

```typescript
// src/syncs/post-comment-deletion.sync.ts

// These two help you declare synchronizations
import { actions, Sync } from "@engine";
// Choose whatever concepts you have. Assuming PostingConcept and CommentingConcept
// are available and have the necessary actions/queries based on the spec and examples.
import { PostingConcept, CommentingConcept } from "@concepts";

/**
 * Sync Spec:
 * when PostingConcept.deletePost(post)
 * where CommentingConcept: post is the parent of comment
 * then CommentingCOncept.deleteComment(comment)
 */
export const DeleteCommentsOnPostDeletion: Sync = ({ post, comment }) => ({
    when: actions(
        // Triggers when a post is deleted. The 'post' variable is bound from the input.
        [PostingConcept.deletePost, { post }, {}],
    ),
    where: async (frames) => {
        // For each frame (which at this point contains the 'post' binding),
        // query CommentingConcept to find all comments where the 'post' is their target/parent.
        // This will expand the frames: if a post has N comments, the single frame
        // (with 'post' bound) will become N frames, each binding a different 'comment'.
        frames = await frames.query(CommentingConcept._getByTarget, { target: post }, { comment });
        // If a post has no comments, 'frames' will become empty, and the 'then' clause will not fire,
        // which is the desired behavior (nothing to delete).
        return frames;
    },
    then: actions(
        // For each frame that made it through the 'where' clause (i.e., for each comment found),
        // delete that specific comment.
        [CommentingConcept.deleteComment, { comment }],
    ),
});
```
