---
timestamp: 'Mon Oct 20 2025 14:55:22 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_145522.1b395921.md]]'
content_id: 3a2f177c1b233fd0bf83e2fbcc96e8cc99c63e872f38b2dd1c68a82a582a35cd
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
* sets its `id` to `id`, `startTime` to `startTime`, `endTime` to `endTime`, `isRecurring` to `isRecurring` (defaulting to `false` if not provided), and `recurrencePattern` to `recurrencePattern` (if provided)
* returns the new `TimeBlock`'s `id` as 'timeBlock'

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

* removes the `TimeBlock` with `id`

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

* returns the `TimeBlock` with `id`

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
      "recurrencePattern": "string (optional)"
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
