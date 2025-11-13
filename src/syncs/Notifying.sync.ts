// These two help you declare synchronizations
import { actions, Sync, Frames } from "@engine";
// Choose whatever concepts you have. Assuming PostingConcept and CommentingConcept
// are available and have the necessary actions/queries based on the spec and examples.
import { Requesting, Notifying, Sessioning } from "@concepts";


export const MarkReadRequest: Sync = (
  { request, notification, session, user, recipient },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Notifying/read", notification, session },
    { request },
  ]),
  where: async (frames) => {
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        frames = await frames.query( Notifying._getRecipient, {notification}, {recipient});
        return frames.filter(($) => $[recipient] == $[user]);
    },
  then: actions([Notifying.read, {
    notification,
  }]),
});

export const MarkReadSuccessResponse: Sync = (
  { request, notification },
) => ({
  when: actions([Requesting.request, { path: "/Notifying/read", notification, }, { request }],
    [Notifying.read, {}, {}]
  ),
  then: actions([Requesting.respond, {
    request,
    status: "Notification successfully read"
  }]),
});

export const MarkReadErrorResponse: Sync = (
  { request, notification, error },
) => ({
  when: actions([Requesting.request, { path: "/Notifying/read", notification, }, { request }],
    [Notifying.read, {}, {error}]
  ),
  then: actions([Requesting.respond, {
    request,
    error
  }]),
});

//queries
export const GetNotificationsByUser: Sync = (
    {request, session, user, _id, recipient, message, read, notification, results}
) => ({
    when: actions([Requesting.request, { path: "/Notifying/_getNotificationsByUser", session, }, { request }],),
    where: async (frames) => {
        const originalFrame = frames[0];
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        frames = await frames.query( Notifying._getNotificationsByUser, {recipient: user}, {_id, recipient, message, read});
        // console.log(frames);
        if (frames.length === 0) {
            const response = {...originalFrame, [notification]: []}
            // Note the additional import `Frames` available from @engine
            return new Frames(response)
        //   const response = {...originalFrame, [notification]: []}
        //   console.log(originalFrame)
        //   return new Frames(response)
        }
        frames = frames.collectAs([_id, recipient, message, read], notification);
        // console.log(frames)
        return frames;
    },
    then: actions([Requesting.respond, {
        request,
        notification
    }]),
});

export const GetReadNotificationsByUser: Sync = (
    {request, session, user, _id, recipient, message, read, notification, results}
) => ({
    when: actions([Requesting.request, { path: "/Notifying/_getReadNotificationsByUser", session, }, { request }],),
    where: async (frames) => {
        const originalFrame = frames[0]
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        frames = await frames.query( Notifying._getReadNotificationsByUser, {recipient: user}, {_id, recipient, message, read});
        if (frames.length === 0) {
          const response = {...originalFrame, [notification]: []}
          return new Frames(response)
        }
        // console.log(frames);
        frames = frames.collectAs([_id, recipient, message, read], notification);
        // console.log(frames)
        return frames;
    },
    then: actions([Requesting.respond, {
        request,
        notification
    }]),
});

export const GetUnreadNotificationsByUser: Sync = (
    {request, session, user, _id, recipient, message, read, notification, results}
) => ({
    when: actions([Requesting.request, { path: "/Notifying/_getUnreadNotificationsByUser", session, }, { request }],),
    where: async (frames) => {
        const originalFrame = frames[0]
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        frames = await frames.query( Notifying._getUnreadNotificationsByUser, {recipient: user}, {_id, recipient, message, read});
        // console.log(frames);
        if (frames.length === 0) {
          const response = {...originalFrame, [notification]: []}
          return new Frames(response)
        }
        frames = frames.collectAs([_id, recipient, message, read], notification);
        // console.log(frames)
        return frames;
    },
    then: actions([Requesting.respond, {
        request,
        notification
    }]),
});
