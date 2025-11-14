/**
 * AdaptiveSchedule syncs
 * Ensures authenticated users can only modify their own adaptive schedules
 */

import { Auth, Requesting, AdaptiveSchedule } from "@concepts";
import { actions, Sync } from "@engine";

// ============= ASSIGN ADAPTIVE SCHEDULE =============

export const ValidateSessionForAssignAdaptiveSchedule: Sync = ({
  request,
  sessionToken,
  taskId,
  start,
  end,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/AdaptiveSchedule/assignAdaptiveSchedule", sessionToken, taskId, start, end },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const AssignAdaptiveScheduleRequest: Sync = ({
  request,
  sessionToken,
  taskId,
  start,
  end,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/AdaptiveSchedule/assignAdaptiveSchedule",
        sessionToken,
        taskId,
        start,
        end,
      },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    AdaptiveSchedule.assignAdaptiveSchedule,
    { owner: userId, taskId, start, end },
  ]),
});

export const AssignAdaptiveScheduleResponse: Sync = ({
  request,
  timeBlockId,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/AdaptiveSchedule/assignAdaptiveSchedule" },
      { request },
    ],
    [Auth.validateSession, {}, {}],
    [AdaptiveSchedule.assignAdaptiveSchedule, {}, { timeBlockId }],
  ),
  then: actions([Requesting.respond, { request, timeBlockId }]),
});

// ============= DELETE ADAPTIVE BLOCK =============

export const ValidateSessionForDeleteAdaptiveBlock: Sync = ({
  request,
  sessionToken,
  timeBlockId,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/AdaptiveSchedule/deleteAdaptiveBlock", sessionToken, timeBlockId },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const DeleteAdaptiveBlockRequest: Sync = ({
  request,
  sessionToken,
  timeBlockId,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/AdaptiveSchedule/deleteAdaptiveBlock",
        sessionToken,
        timeBlockId,
      },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    AdaptiveSchedule.deleteAdaptiveBlock,
    { owner: userId, timeBlockId },
  ]),
});

export const DeleteAdaptiveBlockResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/AdaptiveSchedule/deleteAdaptiveBlock" },
      { request },
    ],
    [Auth.validateSession, {}, {}],
    [AdaptiveSchedule.deleteAdaptiveBlock, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Adaptive block deleted successfully" }]),
});

// ============= REQUEST ADAPTIVE SCHEDULE AI (Backend-only) =============

export const ValidateSessionForRequestAdaptiveScheduleAI: Sync = ({
  request,
  sessionToken,
  contexted_prompt,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/AdaptiveSchedule/requestAdaptiveScheduleAI", sessionToken, contexted_prompt },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const RequestAdaptiveScheduleAIRequest: Sync = ({
  request,
  sessionToken,
  contexted_prompt,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/AdaptiveSchedule/requestAdaptiveScheduleAI",
        sessionToken,
        contexted_prompt,
      },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    AdaptiveSchedule.requestAdaptiveScheduleAI,
    { owner: userId, contexted_prompt },
  ]),
});

export const RequestAdaptiveScheduleAIResponse: Sync = ({
  request,
  adaptiveBlockTable,
  droppedTaskSet,
  analysis,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/AdaptiveSchedule/requestAdaptiveScheduleAI" },
      { request },
    ],
    [Auth.validateSession, {}, {}],
    [
      AdaptiveSchedule.requestAdaptiveScheduleAI,
      {},
      { adaptiveBlockTable, droppedTaskSet, analysis },
    ],
  ),
  then: actions([
    Requesting.respond,
    { request, adaptiveBlockTable, droppedTaskSet, analysis },
  ]),
});
