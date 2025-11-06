import { Requesting, TaskBank } from "@concepts";
import { actions, Sync } from "@engine";

// TaskBank syncs: map Requesting requests to TaskBank concept actions and
// forward the results back to requesters. Each action has two syncs: a
// Request (triggers the concept action) and a Response (forwards the result
// back to Requesting.respond).

export const TaskBankAddTaskRequest: Sync = (
  { request, adder, name, description },
) => ({
  when: actions([
    Requesting.request,
    // description is optional from the client; don't require it to match the request
    { path: "/TaskBank/addTask", adder, name },
    { request },
  ]),
  then: actions([TaskBank.addTask, { adder, name, description }]),
});

export const TaskBankAddTaskResponse: Sync = ({ request, task }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskBank/addTask" }, { request }],
    [TaskBank.addTask, {}, { task }],
  ),
  then: actions([Requesting.respond, { request, task }]),
});

export const TaskBankDeleteTaskRequest: Sync = (
  { request, deleter, task },
) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskBank/deleteTask", deleter, task },
    { request },
  ]),
  then: actions([TaskBank.deleteTask, { deleter, task }]),
});

export const TaskBankDeleteTaskResponse: Sync = ({ request, success }) => ({
  when: actions(
    [Requesting.request, { path: "/TaskBank/deleteTask" }, { request }],
    [TaskBank.deleteTask, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});

export const TaskBankAddDependencyRequest: Sync = (
  { request, adder, task1, task2, dependency },
) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskBank/addDependency", adder, task1, task2, dependency },
    { request },
  ]),
  then: actions([TaskBank.addDependency, { adder, task1, task2, dependency }]),
});

export const TaskBankAddDependencyResponse: Sync = (
  { request, dependency },
) => ({
  when: actions(
    [Requesting.request, { path: "/TaskBank/addDependency" }, { request }],
    [TaskBank.addDependency, {}, { dependency }],
  ),
  then: actions([Requesting.respond, { request, dependency }]),
});

export const TaskBankDeleteDependencyRequest: Sync = (
  { request, deleter, task, dependency },
) => ({
  when: actions([
    Requesting.request,
    { path: "/TaskBank/deleteDependency", deleter, task, dependency },
    { request },
  ]),
  then: actions([TaskBank.deleteDependency, { deleter, task, dependency }]),
});

export const TaskBankDeleteDependencyResponse: Sync = (
  { request, success },
) => ({
  when: actions(
    [Requesting.request, { path: "/TaskBank/deleteDependency" }, { request }],
    [TaskBank.deleteDependency, {}, { success }],
  ),
  then: actions([Requesting.respond, { request, success }]),
});
