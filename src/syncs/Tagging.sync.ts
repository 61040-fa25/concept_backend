// These two help you declare synchronizations
import { actions, Sync, Frames } from "@engine";
// Choose whatever concepts you have. Assuming PostingConcept and CommentingConcept
// are available and have the necessary actions/queries based on the spec and examples.
import { Requesting, Tagging, Sessioning } from "@concepts";

//Add tag
export const AddTagRequest: Sync = (
  { request, user, label, book, session },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Tagging/addTag", label, book, session },
    { request },
  ]),
  where: async (frames) => {
        return await frames.query( Sessioning._getUser, { session }, { user });
    },
  then: actions([Tagging.addTag, {
    user,
    label,
    book
  }]),
});

export const AddTagSuccessResponse: Sync = (
  { request, tag },
) => ({
  when: actions([Requesting.request, { path: "/Tagging/addTag", }, { request }, ],
    [Tagging.addTag, {}, {tag}]
  ),
  then: actions([Requesting.respond, {
    request,
    tag,
  }]),
});

export const AddTagFailureResponse: Sync = (
  { request, error },
) => ({
  when: actions([Requesting.request, { path: "/Tagging/addTag", }, { request }, ],
    [Tagging.addTag, {}, {error}]
  ),
  then: actions([Requesting.respond, {
    request,
    error,
  }]),
});


//Remove tag
export const RemoveTag: Sync = (
  { request, tag, session, user, owner },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Tagging/removeTag", tag, session },
    { request },
  ]),
  where: async (frames) => {
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        frames = await frames.query(Tagging._getTagOwner, { tag }, { owner });
        return frames.filter(($) => $[owner] == $[user]);
    },
  then: actions([Tagging.removeTag, {
    tag
  }]),
});

export const RemoveTagSuccessResponse: Sync = (
  { request },
) => ({
  when: actions([Requesting.request, { path: "/Tagging/removeTag", }, { request }, ],
    [Tagging.removeTag, {}, {}]
  ),
  then: actions([Requesting.respond, {
    request,
    status: "Successfully removed tag",
  }]),
});

export const RemoveTagureResponse: Sync = (
  { request, error },
) => ({
  when: actions([Requesting.request, { path: "/Tagging/removeTag", }, { request }, ],
    [Tagging.removeTag, {}, {error}]
  ),
  then: actions([Requesting.respond, {
    request,
    error,
  }]),
});


//Make private
export const MarkPrivateRequest: Sync = (
  { request, tag, session, user, owner },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Tagging/markPrivate", tag, session },
    { request },
  ]),
  where: async (frames) => {
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        frames = await frames.query(Tagging._getTagOwner, { tag }, { owner });
        return frames.filter(($) => $[owner] == $[user]);
    },
  then: actions([Tagging.markPrivate, {
    tag
  }]),
});

export const MarkPrivateSuccessResponse: Sync = (
  { request, success },
) => ({
  when: actions([Requesting.request, { path: "/Tagging/markPrivate", }, { request }, ],
    [Tagging.markPrivate, {}, {success}]
  ),
  then: actions([Requesting.respond, {
    request,
    status: "Successfully marked tag private",
  }]),
});

export const MarkPrivateFailureResponse: Sync = (
  { request, error },
) => ({
  when: actions([Requesting.request, { path: "/Tagging/markPrivate", }, { request }, ],
    [Tagging.markPrivate, {}, {error}]
  ),
  then: actions([Requesting.respond, {
    request,
    error,
  }]),
});


//make public
export const MarkPublicRequest: Sync = (
  { request, tag, owner, session, user },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Tagging/markPublic", tag,session },
    { request },
  ]),
  where: async (frames) => {
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        frames = await frames.query(Tagging._getTagOwner, { tag }, { owner });
        return frames.filter(($) => $[owner] == $[user]);
    },
  then: actions([Tagging.markPublic, {
    tag
  }]),
});

export const MarkPublicSuccessResponse: Sync = (
  { request, success },
) => ({
  when: actions([Requesting.request, { path: "/Tagging/markPublic", }, { request }, ],
    [Tagging.markPublic, {}, {success}]
  ),
  then: actions([Requesting.respond, {
    request,
    status: "Successfully marked tag public",
  }]),
});

export const MarkPublicFailureResponse: Sync = (
  { request, error },
) => ({
  when: actions([Requesting.request, { path: "/Tagging/markPublic", }, { request }, ],
    [Tagging.markPublic, {}, {error}]
  ),
  then: actions([Requesting.respond, {
    request,
    error,
  }]),
});

//queries
export const GetTagsByBook: Sync = (
    {request, session, user, book, _id, label, isPrivate, tag, results}
) => ({
    when: actions([Requesting.request, { path: "/Tagging/_getTagsByBook", session, book}, { request }],),
    where: async (frames) => {
        const originalFrame = frames[0];
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        frames = await frames.query( Tagging._getTagsByBook, { user, book }, {_id, user, label, book, isPrivate});
        if (frames.length === 0) {
          const response = {...originalFrame, [tag]: []}
          return new Frames(response)
        }
        frames = frames.collectAs([_id, user, label, book, isPrivate], tag);
        return frames;
    },
    then: actions([Requesting.respond, {
        request,
        tag
    }]),
});

export const GetLabelsByBook: Sync = (
    {request, session, user, book, count, label, tag, results}
) => ({
    when: actions([Requesting.request, { path: "/Tagging/_getLabelsByBook", session, book}, { request }],),
    where: async (frames) => {
      const originalFrame = frames[0];
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        frames = await frames.query( Tagging._getLabelsByBook, { user, book }, {label, count});
        if (frames.length === 0) {
          const response = {...originalFrame, [tag]: []}
          return new Frames(response)
        }
        frames = frames.collectAs([label, count], tag);
        return frames;
    },
    then: actions([Requesting.respond, {
        request,
        tag
    }]),
});

export const GetTagsByUser: Sync = (
    {request, session, user, book, _id, label, isPrivate, tag, results}
) => ({
    when: actions([Requesting.request, { path: "/Tagging/_getTagsByUser", session}, { request }],),
    where: async (frames) => {
        const originalFrame = frames[0]
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        console.log(frames)
        frames = await frames.query( Tagging._getTagsByUser, { user }, {_id, user, label, book, isPrivate});
        console.log(frames)
        if (frames.length === 0) {
          const response = {...originalFrame, [tag]: []}
          return new Frames(response)
        }
        frames = frames.collectAs([_id, user, label, book, isPrivate], tag);
        console.log(frames)
        return frames;
    },
    then: actions([Requesting.respond, {
        request,
        tag
    }]),
});
