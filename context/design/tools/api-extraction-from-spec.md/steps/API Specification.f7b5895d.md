---
timestamp: 'Mon Oct 20 2025 14:50:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_145018.15ced8ab.md]]'
content_id: f7b5895d013a16e3a33189a8cf4401003eae0eb5f1d03e6d64057782f0bf2790
---

# API Specification: RoutineLog

**Purpose:** record when a task was completed on a given day to track adherence to routines

***

## API Endpoints

### POST /api/RoutineLog/logCompletion

**Description:** Logs that a specific task was completed on a given day.

**Requirements:**

* {task, day} is not already in CompletedTasks

**Effects:**

* add {task, day} to CompletedTasks

**Request Body:**

```json
{
  "task": "Task",
  "day": "Day"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/RoutineLog/clearCompletion

**Description:** Clears the record that a specific task was completed on a given day.

**Requirements:**

* {task, day} is in CompletedTasks

**Effects:**

* remove {task, day} from CompletedTasks

**Request Body:**

```json
{
  "task": "Task",
  "day": "Day"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/RoutineLog/\_getCompletedTasks

**Description:** Retrieves all tasks that were completed on a specific day.

**Requirements:**

* true

**Effects:**

* returns the set of tasks completed on the specified day

**Request Body:**

```json
{
  "day": "Day"
}
```

**Success Response Body (Query):**

```json
[
  {
    "task": "Task"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
