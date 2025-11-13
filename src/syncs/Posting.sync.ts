import { actions, Sync } from "@engine";
import { Posting, Requesting, Commenting, Sessioning } from "@concepts";

//Creating posts
export const CreatePostRequest: Sync = (
  { request, user, body, session },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Posting/createPost", session, body },
    { request },
  ]),
  where: async (frames) => {
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        return frames;
    },
  then: actions([Posting.createPost, {
    user,
    body,
  }]),
});

export const CreatePostResponse: Sync = (
  { request, post },
) => ({
  when: actions([Requesting.request, { path: "/Posting/createPost"}, { request },],
    [Posting.createPost, {}, {post}]
  ),
  then: actions([Requesting.respond, {
    request,
    post,
  }]),
});


//Deleting Posts
export const DeletePostRequest: Sync = (
  { request, post, session, user, author },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Posting/deletePost", post, session },
    { request },
  ]),
  where: async (frames) => {
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        frames = await frames.query( Posting._getAuthor, {post}, {author});
        return frames.filter(($) => $[author] == $[user]);
    },
  then: actions([Posting.deletePost, {
    post
  }]),
});

export const DeletePostSuccessResponse: Sync = (
  { request, success },
) => ({
  when: actions([Requesting.request, { path: "/Posting/deletePost"}, { request },],
    [Posting.deletePost, {}, {success}]
  ),
  then: actions([Requesting.respond, {
    request,
    status: "Post successfully deleted"
  }]),
});

export const DeletePostFailureResponse: Sync = (
  { request, error },
) => ({
  when: actions([Requesting.request, { path: "/Posting/deletePost"}, { request },],
    [Posting.deletePost, {}, {error}]
  ),
  then: actions([Requesting.respond, {
    request,
    error
  }]),
});


//Editing Posts
export const EditPostRequest: Sync = (
  { request, post, newBody, session, user, author, sameAuthor },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Posting/editPost", post, newBody, session },
    { request },
  ]),
  where: async (frames) => {
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        frames = await frames.query( Posting._getAuthor, {post}, {author});
        return frames.filter(($) => $[author] == $[user]);
    },
  then: actions([Posting.editPost, {
    post, newBody
  }]),
});

export const EditPostSuccessResponse: Sync = (
  { request, success },
) => ({
  when: actions([Requesting.request, { path: "/Posting/editPost"}, { request },],
    [Posting.editPost, {}, {success}]
  ),
  then: actions([Requesting.respond, {
    request,
    status: "Comment successfully edited"
  }]),
});

export const EditPostFailureResponse: Sync = (
  { request, error },
) => ({
  when: actions([Requesting.request, { path: "/Posting/editPost"}, { request },],
    [Posting.editPost, {}, {error}]
  ),
  then: actions([Requesting.respond, {
    request,
    error
  }]),
});


export const DeleteCommentsOnPostDeletion: Sync = ({ post, comment }) => ({
    when: actions(
        [Posting.deletePost, { post }, {}],
    ),
    where: async (frames) => {
        frames = await frames.query( Commenting._getCommentsByParent, { parent: post }, { _id: comment });
        return frames;
    },
    then: actions(
        // For each frame that made it through the 'where' clause (i.e., for each comment found),
        // delete that specific comment.
        [Commenting.deleteComment, { comment }],
    ),
});
