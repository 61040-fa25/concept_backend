// These two help you declare synchronizations
import { actions, Sync } from "@engine";
// Choose whatever concepts you have. Assuming PostingConcept and CommentingConcept
// are available and have the necessary actions/queries based on the spec and examples.
import { Requesting, Upvoting, Sessioning } from "@concepts";

//upvote
export const UpvoteRequest: Sync = (
  { request, user, item, session },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Upvoting/upvote", session, item },
    { request },
  ]),
  where: async (frames) => {
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        console.log(frames);
        return frames;
    },
  then: actions([Upvoting.upvote, {
    user,
    item,
  }]),
});

export const UpvoteSuccessResponse: Sync = (
  { request, success },
) => ({
  when: actions([Requesting.request, { path: "/Upvoting/upvote", }, { request }, ],
    [Upvoting.upvote, {}, {success}]
  ),
  then: actions([Requesting.respond, {
    request,
    status: "Successfully upvoted",
  }]),
});

export const UpvoteFailureResponse: Sync = (
  { request, error },
) => ({
  when: actions([Requesting.request, { path: "/Upvoting/upvote", }, { request }, ],
    [Upvoting.upvote, {}, {error}]
  ),
  then: actions([Requesting.respond, {
    request,
    error,
  }]),
});

//unvote
export const UnvoteRequest: Sync = (
  { request, user, item, session },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Upvoting/unvote", session, item },
    { request },
  ]),
  where: async (frames) => {
        return await frames.query( Sessioning._getUser, { session }, { user });
    },
  then: actions([Upvoting.unvote, {
    user,
    item,
  }]),
});

export const UnvoteSuccessResponse: Sync = (
  { request, success },
) => ({
  when: actions([Requesting.request, { path: "/Upvoting/unvote", }, { request }, ],
    [Upvoting.unvote, {}, {success}]
  ),
  then: actions([Requesting.respond, {
    request,
    status: "Successfully unvoted",
  }]),
});

export const UnvoteFailureResponse: Sync = (
  { request, error },
) => ({
  when: actions([Requesting.request, { path: "/Upvoting/unvote", }, { request }, ],
    [Upvoting.unvote, {}, {error}]
  ),
  then: actions([Requesting.respond, {
    request,
    error,
  }]),
});
