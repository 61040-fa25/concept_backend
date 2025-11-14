---
timestamp: 'Mon Oct 20 2025 14:40:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_144019.edc10ec9.md]]'
content_id: dcc7864cfe0ff3333c533530596f9ad9253b1fbed120ceb4883b051c7a276a7e
---

# API Specification: AdaptiveSchedule

**Purpose:** support dynamic adjustment of a user's schedule based on progress and priorities

***

## API Endpoints

### POST /api/AdaptiveSchedule/createScheduleItem

**Description:** Creates a new schedule item for a user with planned start/end times and priority.

**Requirements:**

* plannedStart is before plannedEnd

**Effects:**

* creates a new ScheduleItem
* sets its properties
* returns the new ScheduleItem

**Request Body:**

```json
{
  "user": "ID",
  "name": "string",
  "plannedStart": "string",
  "plannedEnd": "string",
  "priority": "number"
}
```

**Success Response Body (Action):**

```json
{
  "scheduleItem": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/AdaptiveSchedule/markStarted

**Description:** Marks a schedule item as started with an actual start time.

**Requirements:**

* scheduleItem exists and status is 'planned'

**Effects:**

* sets actualStart for scheduleItem
* sets status to 'inProgress'

**Request Body:**

```json
{
  "scheduleItem": "ID",
  "actualStart": "string"
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

### POST /api/AdaptiveSchedule/markCompleted

**Description:** Marks a schedule item as completed with an actual end time, triggering schedule adjustments.

**Requirements:**

* scheduleItem exists and status is 'inProgress'

**Effects:**

* sets actualEnd for scheduleItem
* sets status to 'completed'
* system adjusts subsequent items

**Request Body:**

```json
{
  "scheduleItem": "ID",
  "actualEnd": "string"
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

### POST /api/AdaptiveSchedule/markSkipped

**Description:** Marks a schedule item as skipped, triggering schedule adjustments.

**Requirements:**

* scheduleItem exists and status is 'planned' or 'inProgress'

**Effects:**

* sets status to 'skipped'
* system adjusts subsequent items

**Request Body:**

```json
{
  "scheduleItem": "ID"
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

### POST /api/AdaptiveSchedule/updateScheduleItem

**Description:** Updates specified properties of an existing schedule item.

**Requirements:**

* scheduleItem exists

**Effects:**

* updates specified properties of scheduleItem
* system may adjust subsequent items

**Request Body:**

```json
{
  "scheduleItem": "ID",
  "newName": "string",
  "newPlannedStart": "string",
  "newPlannedEnd": "string",
  "newPriority": "number"
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

### POST /api/AdaptiveSchedule/adjustSchedule

**Description:** System action to automatically adjust the schedule based on recent changes or external factors.

**Requirements:**

* there are schedule items with 'completed' or 'skipped' status where adjustments have not yet been applied, or external factors trigger adjustment

**Effects:**

* modifies plannedStart/plannedEnd of dependent or subsequent schedule items to optimize the schedule

**Request Body:**

```json
{}
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

### POST /api/AdaptiveSchedule/\_getScheduleItemsForUser

**Description:** Returns a list of schedule items for a given user, optionally filtered by date range.

**Requirements:**

* user exists

**Effects:**

* returns a list of schedule items for the given user, optionally filtered by date range

**Request Body:**

```json
{
  "user": "ID",
  "startDate": "string",
  "endDate": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "id": "ID",
    "name": "string",
    "plannedStart": "string",
    "plannedEnd": "string",
    "actualStart": "string",
    "actualEnd": "string",
    "priority": "number",
    "status": "string"
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
