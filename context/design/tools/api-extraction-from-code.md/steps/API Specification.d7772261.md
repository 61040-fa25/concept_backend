---
timestamp: 'Mon Oct 20 2025 14:55:22 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_145522.1b395921.md]]'
content_id: d7772261ee7a61c27f2af9f6883bdba4e5ea37698d9b49f3b8bd6ded4889f4e8
---

# API Specification: AdaptiveSchedule

**Purpose:** dynamically adjust a schedule based on actual task completion and availability.

***

## API Endpoints

### POST /api/AdaptiveSchedule/scheduleTask

**Description:** Schedules a new task at a desired time.

**Requirements:**

* `task` is not already scheduled and `desiredTime` is within `currentAvailability`

**Effects:**

* adds a new `ScheduledTask` with `pending` status
* returns the new `ScheduledTask` as 'scheduledTask'

**Request Body:**

```json
{
  "task": "string",
  "desiredTime": "string (ISO DateTime)"
}
```

**Success Response Body (Action):**

```json
{
  "scheduledTask": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/AdaptiveSchedule/completeTask

**Description:** Marks a scheduled task as completed.

**Requirements:**

* `scheduledTask` exists and `status` is `pending`

**Effects:**

* sets `status` of `scheduledTask` to `completed`

**Request Body:**

```json
{
  "scheduledTask": "string"
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

### POST /api/AdaptiveSchedule/skipTask

**Description:** Marks a scheduled task as skipped.

**Requirements:**

* `scheduledTask` exists and `status` is `pending`

**Effects:**

* sets `status` of `scheduledTask` to `skipped`

**Request Body:**

```json
{
  "scheduledTask": "string"
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

### POST /api/AdaptiveSchedule/updateAvailability

**Description:** Updates the current availability for scheduling.

**Requirements:**

* true

**Effects:**

* `currentAvailability` := `newAvailability`

**Request Body:**

```json
{
  "newAvailability": {
    "start": "string (ISO DateTime)",
    "end": "string (ISO DateTime)"
  }
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

### POST /api/AdaptiveSchedule/\_getPendingTasks

**Description:** Retrieves all tasks that are currently pending in the schedule.

**Requirements:**

* true

**Effects:**

* returns all `ScheduledTasks` with `status` `pending`

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "task": {
      "task": "string",
      "scheduledTime": "string (ISO DateTime)"
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
