/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  //List Creation
  // "/api/ListCreation/newList": "public action to create a list",
  // "/api/ListCreation/addTask": "add task to a list",
  // "/api/ListCreation/deleteTask": "delete task from a list",
  // "/api/ListCreation/assignOrder": "assign order to tasks in a list",
  "/api/ListCreation/_getLists": "get all lists",
  "/api/ListCreation/_getListById": "get a list by its ID",
  "/api/ListCreation/getListsByOwner": "get lists by their owner",
  "/api/ListCreation/_getTasksInList": "get tasks in a list",
  // deleteList is state-changing; handled via Requesting sync
  //Session
  "/api/Session/findListItem": "find a list item",
  // "/api/Session/changeSession": "change the current session",
  // "/api/Session/setOrdering": "set the ordering of list items",
  // "/api/Session/setFormat": "set the format of the session",
  // "/api/Session/randomizeOrder": "randomize the order of list items",
  // "/api/Session/activateSession": "activate the current session",
  // "/api/Session/startTask": "start a task in the current session",
  // "/api/Session/completeTask": "complete a task in the current session",
  // "/api/Session/endSession": "end the current session",
  // "/api/Session/deleteSession": "delete the current session",
  "/api/Session/_getSession": "get the current session",
  "/api/Session/_getTaskStatus":
    "get the status of a task in the current session",
  "/api/Session/_getSessionListItems":
    "get the list items in the current session",
  "/api/Session/_getSessionForOwner": "get the session for a specific owner",
  "/api/Session/_getActiveSessionForOwner":
    "get the active session for a specific owner",
  "/api/Session/addListItem": "add a list item to the current session",
  // add/remove list items are state-changing; handled via Requesting syncs
  //Task Bank
  "/api/TaskBank/_getOrCreateBank": "get or create a task bank",
  // "/api/TaskBank/addTask": "add a task to the task bank",
  // "/api/TaskBank/deleteTask": "delete a task from the task bank",
  // "/api/TaskBank/addDependency": "add a dependency to a task",
  // "/api/TaskBank/deleteDependency": "delete a dependency from a task",
  "/api/TaskBank/_getDependencies": "get the dependencies of a task",
  "/api/TaskBank/listTasks": "list all tasks in the task bank",
  "/api/TaskBank/getTask": "get a specific task from the task bank",
  "/api/TaskBank/_evaluateOrder":
    "evaluate the order of tasks in the task bank",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Feel free to delete these example exclusions
  "/api/LikertSurvey/createSurvey",
  "/api/LikertSurvey/addQuestion",
  //List Creation
  "/api/ListCreation/newList",
  "/api/ListCreation/addTask",
  "/api/ListCreation/deleteTask",
  "/api/ListCreation/assignOrder",
  "/api/ListCreation/deleteList",
  //Session
  "/api/Session/changeSession",
  "/api/Session/setOrdering",
  "/api/Session/setFormat",
  "/api/Session/randomizeOrder",
  "/api/Session/activateSession",
  "/api/Session/startTask",
  "/api/Session/completeTask",
  "/api/Session/endSession",
  "/api/Session/deleteSession",
  "/api/Session/addListItem",
  "/api/Session/removeListItem",
  //Task Bank
  "/api/TaskBank/addTask",
  "/api/TaskBank/deleteTask",
  "/api/TaskBank/addDependency",
  "/api/TaskBank/deleteDependency",
];
