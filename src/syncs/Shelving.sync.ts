// These two help you declare synchronizations
import { actions, Sync, Frames } from "@engine";
// Choose whatever concepts you have. Assuming PostingConcept and CommentingConcept
// are available and have the necessary actions/queries based on the spec and examples.
import { Requesting, Shelving, Sessioning } from "@concepts";

//Add book
export const AddBookRequest: Sync = (
  { request, user, status, book, session },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Shelving/addBook", status, book, session },
    { request },
  ]),
  where: async (frames) => {
        return await frames.query( Sessioning._getUser, { session }, { user });
    },
  then: actions([Shelving.addBook, {
    user,
    status,
    book
  }]),
});

export const AddBookSuccessResponse: Sync = (
  { request, shelf },
) => ({
  when: actions([Requesting.request, { path: "/Shelving/addBook", }, { request }, ],
    [Shelving.addBook, {}, {shelf}]
  ),
  then: actions([Requesting.respond, {
    request,
    shelf,
  }]),
});

export const AddBookFailureResponse: Sync = (
  { request, error },
) => ({
  when: actions([Requesting.request, { path: "/Shelving/addBook", }, { request }, ],
    [Shelving.addBook, {}, {error}]
  ),
  then: actions([Requesting.respond, {
    request,
    error,
  }]),
});

//Remove book
export const RemoveBookRequest: Sync = (
  { request, shelf, session, user, owner },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Shelving/removeBook", shelf, session },
    { request },
  ]),
  where: async (frames) => {
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        frames = await frames.query(Shelving._getShelfOwner, { shelf }, { owner });
        return frames.filter(($) => $[owner] == $[user]);
    },
  then: actions([Shelving.removeBook, {
    shelf
  }]),
});

export const RemoveBookSuccessResponse: Sync = (
  { request, success},
) => ({
  when: actions([Requesting.request, { path: "/Shelving/removeBook", }, { request }, ],
    [Shelving.removeBook, {}, {success}]
  ),
  then: actions([Requesting.respond, {
    request,
    status: "Book successfully removed from shelf",
  }]),
});

export const RemoveBookFailureResponse: Sync = (
  { request, error },
) => ({
  when: actions([Requesting.request, { path: "/Shelving/removeBook", }, { request }, ],
    [Shelving.removeBook, {}, {error}]
  ),
  then: actions([Requesting.respond, {
    request,
    error,
  }]),
});

//Change status
export const ChangeStatusRequest: Sync = (
  { request, shelf, newStatus, session, user, owner },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Shelving/changeStatus", shelf, newStatus, session },
    { request },
  ]),
  where: async (frames) => {
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        frames = await frames.query(Shelving._getShelfOwner, { shelf }, { owner });
        return frames.filter(($) => $[owner] == $[user]);
    },
  then: actions([Shelving.changeStatus, {
    shelf, newStatus
  }]),
});

export const ChangeStatusSuccessResponse: Sync = (
  { request, success },
) => ({
  when: actions([Requesting.request, { path: "/Shelving/changeStatus", }, { request }, ],
    [Shelving.changeStatus, {}, {success}]
  ),
  then: actions([Requesting.respond, {
    request,
    status: "Successfully changed book's shelf",
  }]),
});

export const ChangeStatusFailureResponse: Sync = (
  { request, error },
) => ({
  when: actions([Requesting.request, { path: "/Shelving/changeStatus", }, { request }, ],
    [Shelving.changeStatus, {}, {error}]
  ),
  then: actions([Requesting.respond, {
    request,
    error,
  }]),
});

//queries
export const GetUserShelfByBook: Sync = (
    {request, session, user, shelfNumber, book}
) => ({
    when: actions([Requesting.request, { path: "/Shelving/_getUserShelfByBook", session, book}, { request }],),
    where: async (frames) => {
        const originalFrame = frames[0];
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        console.log(frames);
        frames = await frames.query( Shelving._getUserShelfByBook, { user, book}, {shelfNumber});
        console.log(frames);
        if (frames.length === 0) {
          const response = {...originalFrame, [shelfNumber]: []}
          return new Frames(response)
        }
        return frames;
    },
    then: actions([Requesting.respond, {
        request,
        shelfNumber
    }]),
});

export const GetBooksByUser: Sync = (
    {request, session, user, status, shelves, results, shelf}
) => ({
    when: actions([Requesting.request, { path: '/Shelving/_getBooksByUser', session, }, { request }],),
    where: async (frames) => {
        const originalFrame = frames[0];
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        frames = await frames.query( Shelving._getBooksByUser, {user}, {status, shelves});
        if (frames.length === 0) {
          const response = {...originalFrame, [shelf]: []}
          return new Frames(response)
        }
        frames = frames.collectAs([status, shelves], shelf)
        return frames;
    },
    then: actions([Requesting.respond, {
        request,
        shelf
    }]),
});

export const GetShelfByBookAndOwner: Sync = (
    {request, session, user, book, results, shelf}
) => ({
    when: actions([Requesting.request, { path: '/Shelving/_getShelfByBookAndOwner', session, book}, { request }],),
    where: async (frames) => {
        const originalFrame = frames[0];
        frames = await frames.query( Sessioning._getUser, { session }, { user });
        console.log(frames)
        frames = await frames.query( Shelving._getShelfByBookAndOwner, {book, owner: user}, {shelf});

        if (frames.length === 0) {
          const response = {...originalFrame, [shelf]: []}
          return new Frames(response)
        }
        return frames;
    },
    then: actions([Requesting.respond, {
        request,
        shelf
    }]),
});
