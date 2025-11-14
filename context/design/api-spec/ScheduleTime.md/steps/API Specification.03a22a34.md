---
timestamp: 'Mon Oct 20 2025 17:03:01 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_170301.26b25a63.md]]'
content_id: 03a22a34176a5b01107f6417d70fde2236315253161f09f12f70f15f99e9fc7a
---

# API Specification: TaskCatalog

**Purpose:** Allows users to create tasks with different attributes that will get scheduled;

***

## API Endpoints

### POST /api/TaskCatalog/\_getUserTasks

**Description:** Retrieves all tasks associated with a specific user.

**Requirements:**

* exist at least one task with this owner

**Effects:**

* returns ALL tasks under this owner

**Request Body:**

```json
{
  "owner": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "owner": "string",
    "taskId": "string",
    "taskName": "string",
    "category": "string",
    "duration": "string",
    "priority": "number",
    "splittable": "boolean",
    "timeBlockSet": ["string"],
    "deadline": "string",
    "slack": "number",
    "preDependence": ["string"],
    "postDependence": ["string"],
    "note": "string"
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

### POST /api/TaskCatalog/createTask

**Description:** Creates a new task with specified attributes and assigns it to
