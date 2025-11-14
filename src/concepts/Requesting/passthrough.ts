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
  // Auth - Public actions for registration/login
  "/api/Auth/registerUser": "public action - new user registration",
  "/api/Auth/authenticateUser": "public action - user login",

  // Auth - Public queries for user information
  "/api/Auth/getUserById": "public query - user profile lookup",
  "/api/Auth/getUserByUsername": "public query - user lookup by username",

  // TaskCatalog - Read-only queries
  "/api/TaskCatalog/_getUserTasks": "read query - returns user's tasks",
  "/api/TaskCatalog/_getTask": "read query - returns specific task",

  // ScheduleTime - Read-only queries
  "/api/ScheduleTime/_getUserSchedule": "read query - returns user's schedule",
  "/api/ScheduleTime/_getTaskSchedule": "read query - returns specific time block",

  // RoutineLog - Read-only queries
  "/api/RoutineLog/_getUserSessions": "read query - returns user's sessions",

  // AdaptiveSchedule - Read-only queries
  "/api/AdaptiveSchedule/_getAdaptiveSchedule": "read query - returns AI schedule",
  "/api/AdaptiveSchedule/_getDroppedTask": "read query - returns dropped tasks",
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
  // === Auth - Account modifications & Session management ===
  "/api/Auth/updatePassword",
  "/api/Auth/deleteUser",
  "/api/Auth/createSession", // Internal - used by syncs
  "/api/Auth/validateSession", // Internal - used by syncs
  "/api/Auth/deleteSession", // Logout
  "/api/Auth/cleanupExpiredSessions", // Maintenance - backend only

  // === TaskCatalog - All modifications ===
  "/api/TaskCatalog/createTask",
  "/api/TaskCatalog/assignSchedule",
  "/api/TaskCatalog/deleteSchedule",
  "/api/TaskCatalog/updateTaskName",
  "/api/TaskCatalog/updateTaskCategory",
  "/api/TaskCatalog/updateTaskDuration",
  "/api/TaskCatalog/updateTaskPriority",
  "/api/TaskCatalog/updateTaskSplittable",
  "/api/TaskCatalog/updateTaskDeadline",
  "/api/TaskCatalog/updateTaskSlack",
  "/api/TaskCatalog/updateTaskNote",
  "/api/TaskCatalog/addPreDependence",
  "/api/TaskCatalog/removePreDependence",
  "/api/TaskCatalog/deleteTask",

  // === ScheduleTime - All modifications ===
  "/api/ScheduleTime/addTimeBlock",
  "/api/ScheduleTime/assignTimeBlock",
  "/api/ScheduleTime/removeTask",

  // === RoutineLog - All modifications ===
  "/api/RoutineLog/createSession",
  "/api/RoutineLog/startSession",
  "/api/RoutineLog/endSession",
  "/api/RoutineLog/interruptSession",
  "/api/RoutineLog/deleteSession",
  "/api/RoutineLog/completeTask",

  // === AdaptiveSchedule - All modifications ===
  "/api/AdaptiveSchedule/addTimeBlock",
  "/api/AdaptiveSchedule/assignAdaptiveSchedule",
  "/api/AdaptiveSchedule/deleteAdaptiveBlock",
  "/api/AdaptiveSchedule/requestAdaptiveScheduleAI", // Backend-only AI operation
  "/api/AdaptiveSchedule/unassignBlock",
];
