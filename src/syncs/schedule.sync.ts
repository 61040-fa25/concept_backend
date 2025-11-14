/**
 * ScheduleTime syncs
 * Ensures authenticated users can only modify their own schedules
 */

import { Auth, Requesting, ScheduleTime } from "@concepts";
import { actions, Sync } from "@engine";

// ============= ASSIGN TIME BLOCK =============

export const ValidateSessionForAssignTimeBlock: Sync = ({
  request,
  sessionToken,
  taskId,
  start,
  end,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleTime/assignTimeBlock", sessionToken, taskId, start, end },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const AssignTimeBlockRequest: Sync = ({
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
        path: "/ScheduleTime/assignTimeBlock",
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
    ScheduleTime.assignTimeBlock,
    { owner: userId, taskId, start, end },
  ]),
});

export const AssignTimeBlockResponse: Sync = ({
  request,
  timeBlockId,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/ScheduleTime/assignTimeBlock" },
      { request },
    ],
    [Auth.validateSession, {}, {}],
    [ScheduleTime.assignTimeBlock, {}, { timeBlockId }],
  ),
  then: actions([Requesting.respond, { request, timeBlockId }]),
});

// ============= REMOVE TASK =============

export const ValidateSessionForRemoveTask: Sync = ({
  request,
  sessionToken,
  taskId,
  timeBlockId,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/ScheduleTime/removeTask", sessionToken, taskId, timeBlockId },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const RemoveTaskRequest: Sync = ({
  request,
  sessionToken,
  taskId,
  timeBlockId,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/ScheduleTime/removeTask",
        sessionToken,
        taskId,
        timeBlockId,
      },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    ScheduleTime.removeTask,
    { owner: userId, taskId, timeBlockId },
  ]),
});

export const RemoveTaskResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/ScheduleTime/removeTask" }, { request }],
    [Auth.validateSession, {}, {}],
    [ScheduleTime.removeTask, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Task removed from schedule successfully" }]),
});
