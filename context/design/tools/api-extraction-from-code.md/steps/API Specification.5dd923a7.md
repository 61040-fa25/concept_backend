---
timestamp: 'Mon Oct 20 2025 14:55:22 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_145522.1b395921.md]]'
content_id: 5dd923a7caa9192854437a5893f56ec57927fb2e16ff1a1f01b2ea580561b34b
---

# API Specification: ScheduleTime

**Purpose:** represent specific points or intervals in time for scheduling purposes.

***

## API Endpoints

### POST /api/ScheduleTime/createTimeBlock

**Description:** Creates a new time block with specified properties.

**Requirements:**

* `id` is unique and `startTime` is before `endTime`

**Effects:**

* creates a new `TimeBlock`

**Request Body:**

```json
{
  "id": "string",
  "startTime": "string (ISO DateTime)",
  "endTime": "string (ISO DateTime)",
  "isRecurring": "boolean (optional, default: false)",
  "recurrencePattern": "string (optional)"
}
```

**Success Response Body (Action):**

```json
{
  "timeBlock": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ScheduleTime/deleteTimeBlock

**Description:** Deletes an existing time block.

**Requirements:**

* `TimeBlock` with `id` exists

**Effects:**

* removes the `TimeBlock`

**Request Body:**

```json
{
  "id": "string"
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

### POST /api/ScheduleTime/\_getTimeBlock

**Description:** Retrieves a specific time block by its ID.

**Requirements:**

* `TimeBlock` with `id` exists

**Effects:**

* returns the `TimeBlock`

**Request Body:**

```json
{
  "id": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "timeBlock": {
      "id": "string",
      "startTime": "string (ISO DateTime)",
      "endTime": "string (ISO DateTime)",
      "isRecurring": "boolean",
      "recurrencePattern": "string | null"
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
