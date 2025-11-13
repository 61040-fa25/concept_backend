// These two help you declare synchronizations
import { actions, Sync } from "@engine";
import { Posting, Commenting, Notifying, Requesting, Sessioning } from "@concepts";


//Creating comments
export const CreateCommentRequest: Sync = (
  { request, user, body, item, session },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Commenting/createComment", body, item, session },
    { request },
  ]),
  where: async (frames) => {
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        return frames;
    },
  then: actions([Commenting.createComment, {
    user,
    body,
    item
  }]),
});

export const CreateCommentResponse: Sync = (
  { request, comment },
) => ({
  when: actions([Requesting.request, { path: "/Commenting/createComment"}, { request },],
    [Commenting.createComment, {}, {comment}]
  ),
  then: actions([Requesting.respond, {
    request,
    comment,
  }]),
});


//Deleting Comments
export const DeleteCommentRequest: Sync = (
  { request, comment, session, user, author },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Commenting/deleteComment", comment, session },
    { request },
  ]),
  where: async (frames) => {
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        frames = await frames.query( Commenting._getAuthor, {comment}, {author});
        return frames.filter(($) => $[author] == $[user]);
    },
  then: actions([Commenting.deleteComment, {
    comment
  }]),
});

export const DeleteCommentSuccessResponse: Sync = (
  { request, success },
) => ({
  when: actions([Requesting.request, { path: "/Commenting/deleteComment"}, { request },],
    [Commenting.deleteComment, {}, {success}]
  ),
  then: actions([Requesting.respond, {
    request,
    status: "Comment successfully deleted"
  }]),
});

export const DeleteCommentFailureResponse: Sync = (
  { request, error },
) => ({
  when: actions([Requesting.request, { path: "/Commenting/deleteComment"}, { request },],
    [Commenting.deleteComment, {}, {error}]
  ),
  then: actions([Requesting.respond, {
    request,
    error
  }]),
});

//Editing Comments
export const EditCommentRequest: Sync = (
  { request, comment, newBody, session, user, author },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Commenting/editComment", session, comment, newBody },
    { request },
  ]),
  where: async (frames) => {
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        frames = await frames.query( Commenting._getAuthor, {comment}, {author});
        return frames.filter(($) => $[author] == $[user]);

    },
  then: actions([Commenting.editComment, {
    comment, newBody
  }]),
});


export const EditCommentSuccessResponse: Sync = (
  { request, success },
) => ({
  when: actions([Requesting.request, { path: "/Commenting/editComment"}, { request },],
    [Commenting.editComment, {}, {success}]
  ),
  then: actions([Requesting.respond, {
    request,
    status: "Comment successfully edited"
  }]),
});

export const EditCommentFailureResponse: Sync = (
  { request, error },
) => ({
  when: actions([Requesting.request, { path: "/Commenting/editComment"}, { request },],
    [Commenting.editComment, {}, {error}]
  ),
  then: actions([Requesting.respond, {
    request,
    error
  }]),
});


//Notification Syncs
export const NotifyWhenGetCommentonPost: Sync = ({ comment, parent, author }) => ({
    when: actions(
        [Commenting.createComment, { }, { comment }],
    ),
    where: async (frames) => {
        frames = await frames.query(Commenting._getParent, {comment}, { parent })
        console.log(frames);
        frames = await frames.query(Posting._getAuthor, {post: parent}, {author})
        console.log(frames);
        return frames;
    },
    then: actions(
        [Notifying.notify, { message: `You got a comment!` , user: author, post: parent }],
    ),
});

export const NotifyWhenGetCommentonComment: Sync = ({ user, body, item, comment, parent, author }) => ({
    when: actions(
        [Commenting.createComment, { user, body, item }, { comment }],
    ),
    where: async (frames) => {
        frames = await frames.query(Commenting._getParent, {comment}, { parent });
        frames = await frames.query(Commenting._getAuthor, {comment: parent}, {author});
        return frames;
    },
    then: actions(
        [Notifying.notify, { message: "You got a comment!", user: author, post: parent }],
    ),
});

export const DeleteCommentsOnCOmmentDeletion: Sync = ({ parent, comment }) => ({
    when: actions(
        [Commenting.deleteComment, { comment: parent }, {}],
    ),
    where: async (frames) => {
        frames = await frames.query( Commenting._getCommentsByParent, { parent: parent }, { _id: comment });
        return frames;
    },
    then: actions(
        // For each frame that made it through the 'where' clause (i.e., for each comment found),
        // delete that specific comment.
        [Commenting.deleteComment, { comment }],
    ),
});
