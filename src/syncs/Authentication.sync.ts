import { actions, Sync, Frames } from "@engine";
import { Requesting, Sessioning, Authentication } from "@concepts";

//-- User Registration --//

export const RegisterRequest: Sync = ({ request, username, password }) => ({
  when: actions([
    Requesting.request,
    { path: "/Authentication/register", username, password },
    { request },
  ]),
  then: actions([Authentication.register, { username, password }]),
});

export const RegisterResponseSuccess: Sync = ({ request, user }) => ({
  when: actions(
    [Requesting.request, { path: "/Authentication/register" }, { request }],
    [Authentication.register, {}, { user }],
  ),
  then: actions([Requesting.respond, { request, user }]),
});

export const RegisterResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Authentication/register" }, { request }],
    [Authentication.register, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- User Login & Session Creation (Composite Action) --//

export const LoginRequest: Sync = ({ request, username, password }) => ({
  when: actions([
    Requesting.request,
    { path: "/Authentication/authenticate", username, password },
    { request },
  ]),
  then: actions([Authentication.authenticate, { username, password }]),
});

// When a login is successful, automatically create a session for that user.
export const LoginSuccessCreatesSession: Sync = ({ user }) => ({
  when: actions([Authentication.authenticate, {}, { user }]),
  then: actions([Sessioning.create, { user }]),
});

// Once the session is created, respond to the original login request with the session ID.
export const LoginResponseSuccess: Sync = ({ request, user, session }) => ({
  when: actions(
    [Requesting.request, { path: "/Authentication/authenticate" }, { request }],
    [Authentication.authenticate, {}, { user }],
    // This action was caused by the login action above.
    [Sessioning.create, { user }, { session }],
  ),
  then: actions([Requesting.respond, { request, session }]),
});

export const LoginResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Authentication/authenticate" }, { request }],
    [Authentication.authenticate, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

//-- User Logout --//

export const LogoutRequest: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Authentication/logout", session },
    { request },
  ]),
  where: async (frames) => {
    // Authorize the request: a valid session must exist.
    // The 'user' is bound but not used in 'then', just for validation.
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    // console.log(frames);
    return frames
  },
  then: actions([Sessioning.delete, { session }]),
});

export const LogoutResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Authentication/logout" }, { request }],
    [Sessioning.delete, {}, {}],
  ),
  then: actions([Requesting.respond, { request, status: "logged_out" }]),
});

//change password
export const changePasswordRequest: Sync = ({ request, session, currentPassword, user, newPassword, error }) => ({
  when: actions([
    Requesting.request,
    { path: "/Authentication/changePassword", session, newPassword, currentPassword },
    { request },
  ]),
  where: async (frames) => {

    frames = await frames.query(Sessioning._getUser, { session }, { user });
    console.log(frames);
    return frames
  },
  then: actions([Authentication.changePassword, { user, newPassword, currentPassword }]),
});

export const changePasswordResponseSuccess: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/Authentication/changePassword" }, { request }],
    [Authentication.changePassword, {}, {success}],
  ),
  then: actions([Requesting.respond, { request, status: "successfully changed password" }]),
});

export const changePasswordResponseFailure: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Authentication/changePassword" }, { request }],
    [Authentication.changePassword, {}, {error}],
  ),
  then: actions([Requesting.respond, { request, error}]),
});

//delete Account
export const deleteAccountRequest: Sync = ({ request, session, user, newPassword }) => ({
  when: actions([
    Requesting.request,
    { path: "/Authentication/deleteUser", session },
    { request },
  ]),
  where: async (frames) => {
    // Authorize the request: a valid session must exist.
    // The 'user' is bound but not used in 'then', just for validation.
    frames = await frames.query(Sessioning._getUser, { session }, { user });
    console.log(frames);
    return frames
  },
  then: actions([Authentication.deleteUser, { user }]),
});

export const deleteAccountResponseSuccess: Sync = ({ success, request }) => ({
  when: actions(
    [Requesting.request, { path: "/Authentication/deleteUser" }, { request }],
    [Authentication.deleteUser, {}, {success}],
  ),
  then: actions([Requesting.respond, { request, status: "successfully deleted user" }]),
});

export const deleteAccountResponseFailure: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Authentication/deleteUser" }, { request }],
    [Authentication.deleteUser, {}, {error}],
  ),
  then: actions([Requesting.respond, { request, error}]),
});
