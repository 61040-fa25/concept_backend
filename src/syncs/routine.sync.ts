/**
 * RoutineLog syncs
 * Ensures authenticated users can only modify their own sessions
 */

import { Auth, Requesting, RoutineLog } from "@concepts";
import { actions, Sync } from "@engine";

// ============= CREATE SESSION =============

// Validation for create session
export const ValidateSessionForCreateRoutineSession: Sync = ({
  request,
  sessionToken,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/RoutineLog/createSession", sessionToken },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

// Create session sync - pass request ID so RoutineLog can extract linkedTaskId
export const CreateRoutineSessionRequest: Sync = ({
  request,
  sessionToken,
  sessionName,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/RoutineLog/createSession",
        sessionToken,
        sessionName,
      },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    RoutineLog.createSession,
    { owner: userId, sessionName, requestId: request },
  ]),
});

export const CreateRoutineSessionResponse: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, { path: "/RoutineLog/createSession" }, { request }],
    [Auth.validateSession, {}, {}],
    [RoutineLog.createSession, {}, { session }],
  ),
  then: actions([Requesting.respond, { request, session }]),
});

// ============= START SESSION =============

export const ValidateSessionForStartSession: Sync = ({
  request,
  sessionToken,
  session,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/RoutineLog/startSession", sessionToken, session },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const StartSessionRequest: Sync = ({
  request,
  sessionToken,
  session,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/RoutineLog/startSession", sessionToken, session },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([RoutineLog.startSession, { owner: userId, session }]),
});

export const StartSessionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/RoutineLog/startSession" }, { request }],
    [Auth.validateSession, {}, {}],
    [RoutineLog.startSession, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Session started successfully" }]),
});

// ============= END SESSION =============

export const ValidateSessionForEndSession: Sync = ({
  request,
  sessionToken,
  session,
  isDone,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/RoutineLog/endSession", sessionToken, session, isDone },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const EndSessionRequest: Sync = ({
  request,
  sessionToken,
  session,
  isDone,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/RoutineLog/endSession", sessionToken, session, isDone },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    RoutineLog.endSession,
    { owner: userId, session, isDone },
  ]),
});

export const EndSessionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/RoutineLog/endSession" }, { request }],
    [Auth.validateSession, {}, {}],
    [RoutineLog.endSession, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Session ended successfully" }]),
});

// ============= INTERRUPT SESSION =============

export const ValidateSessionForInterruptSession: Sync = ({
  request,
  sessionToken,
  session,
  interruptReason,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/RoutineLog/interruptSession", sessionToken, session, interruptReason },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const InterruptSessionRequest: Sync = ({
  request,
  sessionToken,
  session,
  interruptReason,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/RoutineLog/interruptSession",
        sessionToken,
        session,
        interruptReason,
      },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    RoutineLog.interruptSession,
    { owner: userId, session, interruptReason },
  ]),
});

export const InterruptSessionResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/RoutineLog/interruptSession" },
      { request },
    ],
    [Auth.validateSession, {}, {}],
    [RoutineLog.interruptSession, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Session interrupted successfully" }]),
});

// ============= DELETE SESSION =============

export const ValidateSessionForDeleteRoutineSession: Sync = ({
  request,
  sessionToken,
  session,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/RoutineLog/deleteSession", sessionToken, session },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const DeleteRoutineSessionRequest: Sync = ({
  request,
  sessionToken,
  session,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/RoutineLog/deleteSession", sessionToken, session },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([RoutineLog.deleteSession, { owner: userId, session }]),
});

export const DeleteRoutineSessionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/RoutineLog/deleteSession" }, { request }],
    [Auth.validateSession, {}, {}],
    [RoutineLog.deleteSession, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Session deleted successfully" }]),
});
