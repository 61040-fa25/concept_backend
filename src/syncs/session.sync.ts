import { Requesting, Session } from "@concepts";
import { actions, Sync } from "@engine";

// Session syncs: map Requesting requests to Session concept actions and
// forward the results back to requesters.

export const SessionChangeSessionRequest: Sync = (
  { request, list, sessionOwner, ordering, format },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Session/changeSession", list, sessionOwner, ordering, format },
    { request },
  ]),
  then: actions([Session.changeSession, {
    list,
    sessionOwner,
    ordering,
    format,
  }]),
});

export const SessionChangeSessionResponse: Sync = ({ request, session }) => ({
  when: actions(
    [Requesting.request, { path: "/Session/changeSession" }, { request }],
    [Session.changeSession, {}, { session }],
  ),
  then: actions([Requesting.respond, { request, session }]),
});

export const SessionSetOrderingRequest: Sync = (
  { request, session, newType, setter },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Session/setOrdering", session, newType, setter },
    { request },
  ]),
  then: actions([Session.setOrdering, { session, newType, setter }]),
});

export const SessionSetOrderingResponse: Sync = ({ request, result }) => ({
  when: actions(
    [Requesting.request, { path: "/Session/setOrdering" }, { request }],
    [Session.setOrdering, {}, { result }],
  ),
  then: actions([Requesting.respond, { request, result }]),
});

export const SessionSetFormatRequest: Sync = (
  { request, session, newFormat, setter },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Session/setFormat", session, newFormat, setter },
    { request },
  ]),
  then: actions([Session.setFormat, { session, newFormat, setter }]),
});

export const SessionSetFormatResponse: Sync = ({ request, result }) => ({
  when: actions(
    [Requesting.request, { path: "/Session/setFormat" }, { request }],
    [Session.setFormat, {}, { result }],
  ),
  then: actions([Requesting.respond, { request, result }]),
});

export const SessionRandomizeOrderRequest: Sync = (
  { request, session, randomizer },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Session/randomizeOrder", session, randomizer },
    { request },
  ]),
  then: actions([Session.randomizeOrder, { session, randomizer }]),
});

export const SessionRandomizeOrderResponse: Sync = ({ request, result }) => ({
  when: actions(
    [Requesting.request, { path: "/Session/randomizeOrder" }, { request }],
    [Session.randomizeOrder, {}, { result }],
  ),
  then: actions([Requesting.respond, { request, result }]),
});

export const SessionActivateRequest: Sync = (
  { request, session, activator },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Session/activateSession", session, activator },
    { request },
  ]),
  then: actions([Session.activateSession, { session, activator }]),
});

export const SessionActivateResponse: Sync = ({ request, result }) => ({
  when: actions(
    [Requesting.request, { path: "/Session/activateSession" }, { request }],
    [Session.activateSession, {}, { result }],
  ),
  then: actions([Requesting.respond, { request, result }]),
});

export const SessionStartTaskRequest: Sync = (
  { request, session, task, starter },
) => ({
  when: actions([
    Requesting.request,
    // `starter` may be provided by the server (authenticated user) and
    // omitted by the client — don't require it in the when matcher so
    // browser requests without this field still match the sync.
    { path: "/Session/startTask", session, task },
    { request },
  ]),
  then: actions([Session.startTask, { session, task, starter }]),
});

export const SessionStartTaskResponse: Sync = ({ request, result }) => ({
  when: actions(
    [Requesting.request, { path: "/Session/startTask" }, { request }],
    [Session.startTask, {}, { result }],
  ),
  then: actions([Requesting.respond, { request, result }]),
});

export const SessionCompleteTaskRequest: Sync = (
  { request, session, task },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Session/completeTask", session, task },
    { request },
  ]),
  then: actions([Session.completeTask, { session, task }]),
});

export const SessionCompleteTaskResponse: Sync = ({ request, result }) => ({
  when: actions(
    [Requesting.request, { path: "/Session/completeTask" }, { request }],
    [Session.completeTask, {}, { result }],
  ),
  then: actions([Requesting.respond, { request, result }]),
});

export const SessionEndRequest: Sync = ({ request, session }) => ({
  when: actions([
    Requesting.request,
    { path: "/Session/endSession", session },
    { request },
  ]),
  then: actions([Session.endSession, { session }]),
});

export const SessionEndResponse: Sync = ({ request, result }) => ({
  when: actions(
    [Requesting.request, { path: "/Session/endSession" }, { request }],
    [Session.endSession, {}, { result }],
  ),
  then: actions([Requesting.respond, { request, result }]),
});

export const SessionDeleteRequest: Sync = ({ request, session }) => ({
  when: actions([
    Requesting.request,
    { path: "/Session/deleteSession", session },
    { request },
  ]),
  then: actions([Session.deleteSession, { session }]),
});

export const SessionDeleteResponse: Sync = ({ request, result }) => ({
  when: actions(
    [Requesting.request, { path: "/Session/deleteSession" }, { request }],
    [Session.deleteSession, {}, { result }],
  ),
  then: actions([Requesting.respond, { request, result }]),
});
