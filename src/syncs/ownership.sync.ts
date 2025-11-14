/**
 * TaskCatalog ownership syncs
 * Ensures authenticated users can only modify their own tasks
 */

import { Auth, Requesting, TaskCatalog } from "@concepts";
import { actions, Sync } from "@engine";

// ============= CREATE TASK =============

export const ValidateSessionForCreateTask: Sync = ({
  request,
  sessionToken,
  taskName,
  category,
  duration,
  priority,
  splittable,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskCatalog/createTask", sessionToken, taskName, category, duration, priority, splittable },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const CreateTaskRequest: Sync = ({
  request,
  sessionToken,
  userId,
  taskName,
  category,
  duration,
  priority,
  splittable,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/TaskCatalog/createTask", sessionToken, taskName, category, duration, priority, splittable },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    TaskCatalog.createTask,
    {
      owner: userId,
      taskName,
      category,
      duration,
      priority,
      splittable,
    },
  ]),
});

export const CreateTaskResponse: Sync = ({ request, task }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskCatalog/createTask" }, { request }],
    [Auth.validateSession, {}, {}],
    [TaskCatalog.createTask, {}, { task }],
  ),
  then: actions([Requesting.respond, { request, task }]),
});

// ============= DELETE TASK =============

export const ValidateSessionForDeleteTask: Sync = ({
  request,
  sessionToken,
  taskId,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskCatalog/deleteTask", sessionToken, taskId },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const DeleteTaskRequest: Sync = ({
  request,
  sessionToken,
  taskId,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/TaskCatalog/deleteTask", sessionToken, taskId },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([TaskCatalog.deleteTask, { owner: userId, taskId }]),
});

export const DeleteTaskResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskCatalog/deleteTask" }, { request }],
    [Auth.validateSession, {}, {}],
    [TaskCatalog.deleteTask, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Task deleted successfully" }]),
});

// ============= UPDATE TASK NAME =============

export const ValidateSessionForUpdateTaskName: Sync = ({
  request,
  sessionToken,
  taskId,
  taskName,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskCatalog/updateTaskName", sessionToken, taskId, taskName },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const UpdateTaskNameRequest: Sync = ({
  request,
  sessionToken,
  taskId,
  taskName,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/TaskCatalog/updateTaskName", sessionToken, taskId, taskName },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    TaskCatalog.updateTaskName,
    { owner: userId, taskId, taskName: taskName },
  ]),
});

export const UpdateTaskNameResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/TaskCatalog/updateTaskName" },
      { request },
    ],
    [Auth.validateSession, {}, {}],
    [TaskCatalog.updateTaskName, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Task name updated successfully" }]),
});

// ============= UPDATE TASK CATEGORY =============

export const ValidateSessionForUpdateTaskCategory: Sync = ({
  request,
  sessionToken,
  taskId,
  category,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskCatalog/updateTaskCategory", sessionToken, taskId, category },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const UpdateTaskCategoryRequest: Sync = ({
  request,
  sessionToken,
  taskId,
  category,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/TaskCatalog/updateTaskCategory",
        sessionToken,
        taskId,
        category,
      },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    TaskCatalog.updateTaskCategory,
    { owner: userId, taskId, category: category },
  ]),
});

export const UpdateTaskCategoryResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/TaskCatalog/updateTaskCategory" },
      { request },
    ],
    [Auth.validateSession, {}, {}],
    [TaskCatalog.updateTaskCategory, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Task category updated successfully" }]),
});

// ============= UPDATE TASK DURATION =============

export const ValidateSessionForUpdateTaskDuration: Sync = ({
  request,
  sessionToken,
  taskId,
  duration,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskCatalog/updateTaskDuration", sessionToken, taskId, duration },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const UpdateTaskDurationRequest: Sync = ({
  request,
  sessionToken,
  taskId,
  duration,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/TaskCatalog/updateTaskDuration",
        sessionToken,
        taskId,
        duration,
      },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    TaskCatalog.updateTaskDuration,
    { owner: userId, taskId, duration: duration },
  ]),
});

export const UpdateTaskDurationResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/TaskCatalog/updateTaskDuration" },
      { request },
    ],
    [Auth.validateSession, {}, {}],
    [TaskCatalog.updateTaskDuration, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Task duration updated successfully" }]),
});

// ============= UPDATE TASK PRIORITY =============

export const ValidateSessionForUpdateTaskPriority: Sync = ({
  request,
  sessionToken,
  taskId,
  priority,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskCatalog/updateTaskPriority", sessionToken, taskId, priority },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const UpdateTaskPriorityRequest: Sync = ({
  request,
  sessionToken,
  taskId,
  priority,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/TaskCatalog/updateTaskPriority",
        sessionToken,
        taskId,
        priority,
      },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    TaskCatalog.updateTaskPriority,
    { owner: userId, taskId, priority: priority },
  ]),
});

export const UpdateTaskPriorityResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/TaskCatalog/updateTaskPriority" },
      { request },
    ],
    [Auth.validateSession, {}, {}],
    [TaskCatalog.updateTaskPriority, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Task priority updated successfully" }]),
});

// ============= UPDATE TASK SPLITTABLE =============

export const ValidateSessionForUpdateTaskSplittable: Sync = ({
  request,
  sessionToken,
  taskId,
  splittable,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskCatalog/updateTaskSplittable", sessionToken, taskId, splittable },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const UpdateTaskSplittableRequest: Sync = ({
  request,
  sessionToken,
  taskId,
  splittable,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/TaskCatalog/updateTaskSplittable",
        sessionToken,
        taskId,
        splittable,
      },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    TaskCatalog.updateTaskSplittable,
    { owner: userId, taskId, splittable: splittable },
  ]),
});

export const UpdateTaskSplittableResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/TaskCatalog/updateTaskSplittable" },
      { request },
    ],
    [Auth.validateSession, {}, {}],
    [TaskCatalog.updateTaskSplittable, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Task splittable updated successfully" }]),
});

// ============= UPDATE TASK DEADLINE =============

export const ValidateSessionForUpdateTaskDeadline: Sync = ({
  request,
  sessionToken,
  taskId,
  deadline,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskCatalog/updateTaskDeadline", sessionToken, taskId, deadline },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const UpdateTaskDeadlineRequest: Sync = ({
  request,
  sessionToken,
  taskId,
  deadline,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/TaskCatalog/updateTaskDeadline",
        sessionToken,
        taskId,
        deadline,
      },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    TaskCatalog.updateTaskDeadline,
    { owner: userId, taskId, deadline: deadline },
  ]),
});

export const UpdateTaskDeadlineResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/TaskCatalog/updateTaskDeadline" },
      { request },
    ],
    [Auth.validateSession, {}, {}],
    [TaskCatalog.updateTaskDeadline, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Task deadline updated successfully" }]),
});

// ============= UPDATE TASK SLACK =============

export const ValidateSessionForUpdateTaskSlack: Sync = ({
  request,
  sessionToken,
  taskId,
  slack,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskCatalog/updateTaskSlack", sessionToken, taskId, slack },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const UpdateTaskSlackRequest: Sync = ({
  request,
  sessionToken,
  taskId,
  slack,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/TaskCatalog/updateTaskSlack", sessionToken, taskId, slack },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    TaskCatalog.updateTaskSlack,
    { owner: userId, taskId, slack: slack },
  ]),
});

export const UpdateTaskSlackResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/TaskCatalog/updateTaskSlack" },
      { request },
    ],
    [Auth.validateSession, {}, {}],
    [TaskCatalog.updateTaskSlack, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Task slack updated successfully" }]),
});

// ============= UPDATE TASK NOTE =============

export const ValidateSessionForUpdateTaskNote: Sync = ({
  request,
  sessionToken,
  taskId,
  note,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskCatalog/updateTaskNote", sessionToken, taskId, note },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const UpdateTaskNoteRequest: Sync = ({
  request,
  sessionToken,
  taskId,
  note,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/TaskCatalog/updateTaskNote", sessionToken, taskId, note },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    TaskCatalog.updateTaskNote,
    { owner: userId, taskId, note: note },
  ]),
});

export const UpdateTaskNoteResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/TaskCatalog/updateTaskNote" },
      { request },
    ],
    [Auth.validateSession, {}, {}],
    [TaskCatalog.updateTaskNote, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Task note updated successfully" }]),
});

// ============= ADD PRE DEPENDENCE =============

export const ValidateSessionForAddPreDependence: Sync = ({
  request,
  sessionToken,
  taskId,
  newPreDependence,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskCatalog/addPreDependence", sessionToken, taskId, newPreDependence },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const AddPreDependenceRequest: Sync = ({
  request,
  sessionToken,
  taskId,
  newPreDependence,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/TaskCatalog/addPreDependence",
        sessionToken,
        taskId,
        newPreDependence,
      },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    TaskCatalog.addPreDependence,
    { owner: userId, taskId, newPreDependence },
  ]),
});

export const AddPreDependenceResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/TaskCatalog/addPreDependence" },
      { request },
    ],
    [Auth.validateSession, {}, {}],
    [TaskCatalog.addPreDependence, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Pre-dependence added successfully" }]),
});

// ============= REMOVE PRE DEPENDENCE =============

export const ValidateSessionForRemovePreDependence: Sync = ({
  request,
  sessionToken,
  taskId,
  oldPreDependence,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskCatalog/removePreDependence", sessionToken, taskId, oldPreDependence },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const RemovePreDependenceRequest: Sync = ({
  request,
  sessionToken,
  taskId,
  oldPreDependence,
  userId,
}) => ({
  when: actions(
    [
      Requesting.request,
      {
        path: "/TaskCatalog/removePreDependence",
        sessionToken,
        taskId,
        oldPreDependence,
      },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    TaskCatalog.removePreDependence,
    { owner: userId, taskId, oldPreDependence },
  ]),
});

export const RemovePreDependenceResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/TaskCatalog/removePreDependence" },
      { request },
    ],
    [Auth.validateSession, {}, {}],
    [TaskCatalog.removePreDependence, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Pre-dependence removed successfully" }]),
});

// ============= ASSIGN SCHEDULE =============

export const ValidateSessionForAssignSchedule: Sync = ({
  request,
  sessionToken,
  taskId,
  timeBlockId,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskCatalog/assignSchedule", sessionToken, taskId, timeBlockId },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const AssignScheduleRequest: Sync = ({
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
        path: "/TaskCatalog/assignSchedule",
        sessionToken,
        taskId,
        timeBlockId,
      },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    TaskCatalog.assignSchedule,
    { owner: userId, taskId, timeBlockId },
  ]),
});

export const AssignScheduleResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/TaskCatalog/assignSchedule" },
      { request },
    ],
    [Auth.validateSession, {}, {}],
    [TaskCatalog.assignSchedule, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Schedule assigned successfully" }]),
});

// ============= DELETE SCHEDULE =============

export const ValidateSessionForDeleteSchedule: Sync = ({
  request,
  sessionToken,
  taskId,
  timeBlockId,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskCatalog/deleteSchedule", sessionToken, taskId, timeBlockId },
    { request },
  ]),
  then: actions([Auth.validateSession, { sessionToken }]),
});

export const DeleteScheduleRequest: Sync = ({
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
        path: "/TaskCatalog/deleteSchedule",
        sessionToken,
        taskId,
        timeBlockId,
      },
      { request },
    ],
    [Auth.validateSession, { sessionToken }, { userId }],
  ),
  then: actions([
    TaskCatalog.deleteSchedule,
    { owner: userId, taskId, timeBlockId },
  ]),
});

export const DeleteScheduleResponse: Sync = ({ request }) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/TaskCatalog/deleteSchedule" },
      { request },
    ],
    [Auth.validateSession, {}, {}],
    [TaskCatalog.deleteSchedule, {}, {}],
  ),
  then: actions([Requesting.respond, { request, msg: "Schedule deleted successfully" }]),
});
