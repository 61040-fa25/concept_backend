---
timestamp: 'Mon Oct 20 2025 14:40:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_144019.edc10ec9.md]]'
content_id: 8963339b6f176f326b61ca488f35036047f58c2adbe52c7e6a8403c3463b917a
---

# API Specification: RoutineLog

**Purpose:** enable users to log daily routines and track their consistency and completion

***

## API Endpoints

### POST /api/RoutineLog/createRoutine

**Description:** Creates a new routine for a user.

**Requirements:**

* no Routine with the same name exists for the user

**Effects:**

* creates a new Routine
* returns the new Routine

**Request Body:**

```json
{
  "user": "ID",
  "name": "string",
  "description": "string"
}
```

**Success Response Body (Action):**

```json
{
  "routine": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/RoutineLog/logRoutineCompletion

**Description:** Records completion status for a routine on a specific date.

**Requirements:**

* routine exists

**Effects:**

* records completion status for the routine on the given date
* updates if an entry for date already exists

**Request Body:**

```json
{
  "routine": "ID",
  "date": "string",
  "completed": "boolean",
  "notes": "string"
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

### POST /api/RoutineLog/deleteRoutine

**Description:** Deletes an existing routine and all its associated entries.

**Requirements:**

* routine exists

**Effects:**

* deletes the routine and all its entries

**Request Body:**

```json
{
  "routine": "ID"
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

### POST /api/RoutineLog/\_getRoutinesForUser

**Description:** Returns all routines associated with a user.

**Requirements:**

* user exists

**Effects:**

* returns all routines associated with the user

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "id": "ID",
    "name": "string",
    "description": "string"
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

### POST /api/RoutineLog/\_getRoutineLogHistory

**Description:** Returns all log entries for a routine, optionally filtered by date range.

**Requirements:**

* routine exists

**Effects:**

* returns all log entries for the routine, optionally filtered by date range

**Request Body:**

```json
{
  "routine": "ID",
  "startDate": "string",
  "endDate": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "date": "string",
    "completed": "boolean",
    "notes": "string"
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
