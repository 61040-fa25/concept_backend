import { ListCreation, Requesting } from "@concepts";
import { actions, Sync } from "@engine";

// ListCreation.newList request -> ListCreation.newList action
export const ListCreationNewListRequest: Sync = (
  { request, listName, listOwner },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ListCreation/newList", listName, listOwner },
    { request },
  ]),
  then: actions([ListCreation.newList, { listName, listOwner }]),
});

// ListCreation.newList action completion -> Requesting.respond
export const ListCreationNewListResponse: Sync = ({ request, list }) => ({
  when: actions(
    [Requesting.request, { path: "/ListCreation/newList" }, { request }],
    [ListCreation.newList, {}, { list }],
  ),
  then: actions([Requesting.respond, { request, list }]),
});

// ListCreation.addTask request -> ListCreation.addTask action
export const ListCreationAddTaskRequest: Sync = (
  { request, list, task, adder },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ListCreation/addTask", list, task, adder },
    { request },
  ]),
  then: actions([ListCreation.addTask, { list, task, adder }]),
});

export const ListCreationAddTaskResponse: Sync = ({ request, listItem }) => ({
  when: actions(
    [Requesting.request, { path: "/ListCreation/addTask" }, { request }],
    [ListCreation.addTask, {}, { listItem }],
  ),
  then: actions([Requesting.respond, { request, listItem }]),
});

// ListCreation.deleteTask request -> ListCreation.deleteTask action
export const ListCreationDeleteTaskRequest: Sync = (
  { request, list, task, deleter },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ListCreation/deleteTask", list, task, deleter },
    { request },
  ]),
  then: actions([ListCreation.deleteTask, { list, task, deleter }]),
});

// Respond to deleteTask completion. The ListCreation.deleteTask action
// may return different shapes (e.g. { success }, {} or an error). To ensure
// the waiting Requesting._awaitResponse always receives a response, capture
// the full result as `result` and forward it to Requesting.respond.
export const ListCreationDeleteTaskResponse: Sync = ({ request, result }) => ({
  when: actions(
    [Requesting.request, { path: "/ListCreation/deleteTask" }, { request }],
    // Capture any result returned by the action as `result`
    [ListCreation.deleteTask, {}, { result }],
  ),
  then: actions([Requesting.respond, { request, result }]),
});

// Also handle error result from deleteTask so waiting Requesting callers
// receive the error instead of timing out when the concept reports a problem.
// Keep explicit error mapping as well (in case the action returns an `error` key).
export const ListCreationDeleteTaskErrorResponse: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/ListCreation/deleteTask" }, { request }],
    [ListCreation.deleteTask, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// ListCreation.assignOrder request -> ListCreation.assignOrder action
export const ListCreationAssignOrderRequest: Sync = (
  { request, list, task, newOrder, assigner },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ListCreation/assignOrder", list, task, newOrder, assigner },
    { request },
  ]),
  then: actions([ListCreation.assignOrder, { list, task, newOrder, assigner }]),
});

export const ListCreationAssignOrderResponse: Sync = ({ request, result }) => ({
  when: actions(
    [Requesting.request, { path: "/ListCreation/assignOrder" }, { request }],
    [ListCreation.assignOrder, {}, { result }],
  ),
  then: actions([Requesting.respond, { request, result }]),
});

// Optional: delete list
export const ListCreationDeleteListRequest: Sync = (
  { request, list, deleter },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ListCreation/deleteList", list, deleter },
    { request },
  ]),
  // Map incoming `list` body field to the action's expected `listId` param
  then: actions([ListCreation.deleteList, { listId: list, deleter }]),
});

// Alternate mapping: allow clients to send `listId` in the request body instead of `list`.
export const ListCreationDeleteListRequest_Alt: Sync = (
  { request, listId, deleter },
) => ({
  when: actions([
    Requesting.request,
    { path: "/ListCreation/deleteList", listId, deleter },
    { request },
  ]),
  then: actions([ListCreation.deleteList, { listId, deleter }]),
});

// Ensure Requesting.respond is triggered regardless of the exact shape returned
// by ListCreation.deleteList (it may return an empty object {}). Capture the
// action's returned result under `result` and forward it to Requesting.respond.
export const ListCreationDeleteListResponse: Sync = ({ request, result }) => ({
  when: actions(
    [Requesting.request, { path: "/ListCreation/deleteList" }, { request }],
    // Capture any result returned by the action as `result`
    [ListCreation.deleteList, {}, { result }],
  ),
  then: actions([Requesting.respond, { request, result }]),
});

// Also handle explicit error result from deleteList so waiting Requesting callers
// receive the error instead of timing out when the action reports a problem.
export const ListCreationDeleteListErrorResponse: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/ListCreation/deleteList" }, { request }],
    [ListCreation.deleteList, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
