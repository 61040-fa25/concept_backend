---
timestamp: 'Mon Oct 20 2025 17:01:04 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_170104.017d4154.md]]'
content_id: c9263dd6258f48ee09c5a7340e8b7ecd70358feb1f7384c93750c2c223d77c7e
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

**Description:** Creates a new task with specified attributes and assigns it to an owner, returning the newly created task.

**Requirements:**

* (none specified)

**Effects:**

* generate a unique taskId that has not been used;
* create a new task $t$ owned by owner with the attributes (taskId, taskName, category, duration, priority, splittable, deadline?, slack?, preDependence?, note?), the optional attributes are not set if not provided;
* set $t$'s timeBlockSet as an empty set;
* add $t$ to postDependence of all tasks in its given preDependence;
* return the newly created task $t$;

**Request Body:**

```json
{
  "owner": "string",
  "taskName": "string",
  "category": "string",
  "duration": "string",
  "priority": "number",
  "splittable": "boolean",
  "deadline": "string (optional)",
  "slack": "number (optional)",
  "preDependence": ["string"] (optional),
  "note": "string (optional)"
}
```

**Success Response Body (Action):**

```json
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
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/TaskCatalog/assignSchedule

**Description:** Assigns a specific time block ID to an existing task's schedule.

**Requirements:**

* exists a task with matching owner and taskId;
* timeBlockId does not already exist in this task's timeBlockSet;

**Effects:**

* add timeBlockId to this task's timeBlockSet

**Request Body:**

```json
{
  "owner": "string",
  "taskId": "string",
  "timeBlockId": "string"
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

### POST /api/TaskCatalog/deleteSchedule

**Description:** Removes a specific time block ID from an existing task's schedule.

**Requirements:**

* exists a task with matching owner and taskId;
* timeBlockId exists in this task's timeBlockSet;

**Effects:**

* remove timeBlockId from this task's timeBlockSet;

**Request Body:**

```json
{
  "owner": "string",
  "taskId": "string",
  "timeBlockId": "string"
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

### POST /api/TaskCatalog/updateTask

**Description:** Updates a specific attribute of an existing task.

**Requirements:**

* exist a task with this taskId and the owner matches the given owner

**Effects:**

* update the given attribute of this task;

**Request Body (to update taskName):**

```json
{
  "owner": "string",
  "taskId": "string",
  "taskName": "string"
}
```

**Request Body (to update category):**

```json
{
  "owner": "string",
  "taskId": "string",
  "category": "string"
}
```

**Request Body (to update duration):**

```json
{
  "owner": "string",
  "taskId": "string",
  "duration": "string"
}
```

**Request Body (to update priority):**

```json
{
  "owner": "string",
  "taskId": "string",
  "priority": "number"
}
```

**Request Body (to update splittable):**

```json
{
  "owner": "string",
  "taskId": "string",
  "splittable": "boolean"
}
```

**Request Body (to update deadline):**

```json
{
  "owner": "string",
  "taskId": "string",
  "deadline": "string"
}
```

**Request Body (to update slack):**

```json
{
  "owner": "string",
  "taskId": "string",
  "slack": "number"
}
```

**Request Body (to update note):**

```json
{
  "owner": "string",
  "taskId": "string",
  "note": "string"
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

### POST /api/TaskCatalog/addPreDependence

**Description:** Adds a new prerequisite task to an existing task, establishing a dependency relationship.

**Requirements:**

* exist a task $t$ with this taskId and the owner matches the given owner

**Effects:**

* add newPreDependence to $t$'s preDependence;
* add $t$ to newPreDependence's postDependence;

**Request Body:**

```json
{
  "owner": "string",
  "taskId": "string",
  "newPreDependence": "string"
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

### POST /api/TaskCatalog/removePreDependence

**Description:** Removes an existing prerequisite task from another task, breaking the dependency.

**Requirements:**

* exist a task $t$ with this taskId and the owner matches the given owner;
* oldPreDependence exists in $t$'s preDependence;

**Effects:**

* remove oldPreDependence from $t$'s preDependence;
* remove $t$ from oldPreDependence's postDependence;

**Request Body:**

```json
{
  "owner": "string",
  "taskId": "string",
  "oldPreDependence": "string"
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

### POST /api/TaskCatalog/deleteTask

**Description:** Deletes a task owned by the specified user, provided it has no dependent tasks.

**Requirements:**

* exist a task $t$ with this taskId;
* task $t$ has no postDependence;
* task $t$ has a matching owner;

**Effects:**

* remove task $t$ from Tasks

**Request Body:**

```json
{
  "owner": "string",
  "taskId": "string"
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
