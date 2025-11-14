---
timestamp: 'Mon Oct 20 2025 14:55:22 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_145522.1b395921.md]]'
content_id: 383f04b8dda9eb7d6ace4af62a00f1e8c95916a61fd4b12ed2986bd042c7b395
---

# API Specification: RoutineLog

**Purpose:** record user adherence to a predefined routine over time.

***

## API Endpoints

### POST /api/RoutineLog/logRoutine

**Description:** Logs the status of a routine for a specific date.

**Requirements:**

* no `RoutineEntry` exists for `routine` and `date`

**Effects:**

* creates a new `RoutineEntry`
* sets its `routine` to `routine`, `date` to `date`, `status` to `status`, and `notes` to `notes` (if provided)

**Request Body:**

```json
{
  "routine": "string",
  "date": "string (ISO Date)",
  "status": "string (done | missed | partially_done)",
  "notes": "string (optional)"
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

### POST /api/RoutineLog/updateRoutineLog

**Description:** Updates the log entry for a routine on a specific date.

**Requirements:**

* a `RoutineEntry` exists for `routine` and `date`

**Effects:**

* updates the `status` of the `RoutineEntry` to `newStatus` (if provided) and/or `notes` to `newNotes` (if provided)

**Request Body:**

```json
{
  "routine": "string",
  "date": "string (ISO Date)",
  "newStatus": "string (done | missed | partially_done, optional)",
  "newNotes": "string (optional)"
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

### POST /api/RoutineLog/\_getRoutineLogByDate

**Description:** Retrieves all routine log entries for a given date.

**Requirements:**

* true

**Effects:**

* returns all `RoutineEntries` for the given `date`

**Request Body:**

```json
{
  "date": "string (ISO Date)"
}
```

**Success Response Body (Query):**

```json
[
  {
    "entry": {
      "routine": "string",
      "status": "string (done | missed | partially_done)",
      "notes": "string (optional)"
    }
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

### POST /api/RoutineLog/\_getRoutineLogForRoutine

**Description:** Retrieves all routine log entries for a specific routine.

**Requirements:**

* true

**Effects:**

* returns all `RoutineEntries` for the given `routine`

**Request Body:**

```json
{
  "routine": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "entry": {
      "date": "string (ISO Date)",
      "status": "string (done | missed | partially_done)",
      "notes": "string (optional)"
    }
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
