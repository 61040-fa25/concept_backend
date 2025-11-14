---
timestamp: 'Mon Oct 20 2025 14:55:22 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_145522.1b395921.md]]'
content_id: 188dbb00d53334ae2210324b432ebe1da0f06da010761dd522efb404291a96f6
---

# API Specification: TaskCatalog

**Purpose:** manage a collection of tasks, their definitions, and properties.

***

## API Endpoints

### POST /api/TaskCatalog/createTask

**Description:** Creates a new task definition in the catalog.

**Requirements:**

* `id` is unique

**Effects:**

* creates a new `Task`
* sets its `id` to `id`, `name` to `name`, `description` to `description` (defaulting to empty string if not provided), `estimatedDuration` to `estimatedDuration` (defaulting to `0` if not provided), `priority` to `priority` (defaulting to `0` if not provided), and `tags` to `tags` (defaulting to empty array if not provided)
* returns the new `Task`'s `id` as 'task'

**Request Body:**

```json
{
  "id": "string",
  "name": "string",
  "description": "string (optional, default: \"\")",
  "estimatedDuration": "number (optional, default: 0)",
  "priority": "number (optional, default: 0)",
  "tags": "array of string (optional, default: [])"
}
```

**Success Response Body (Action):**

```json
{
  "task": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/TaskCatalog/updateTask

**Description:** Updates the properties of an existing task.

**Requirements:**

* `Task` with `id` exists

**Effects:**

* updates the `name` of the `Task` to `newName` (if provided), `description` to `newDescription` (if provided), `estimatedDuration` to `newEstimatedDuration` (if provided), `priority` to `newPriority` (if provided), and `tags` to `newTags` (if provided)

**Request Body:**

```json
{
  "id": "string",
  "newName": "string (optional)",
  "newDescription": "string (optional)",
  "newEstimatedDuration": "number (optional)",
  "newPriority": "number (optional)",
  "newTags": "array of string (optional)"
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

**Description:** Deletes a task definition from the catalog.

**Requirements:**

* `Task` with `id` exists

**Effects:**

* removes the `Task` with `id`

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

### POST /api/TaskCatalog/\_getTask

**Description:** Retrieves a specific task by its ID.

**Requirements:**

* `Task` with `id` exists

**Effects:**

* returns the `Task` with `id`

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
    "task": {
      "id": "string",
      "name": "string",
      "description": "string",
      "estimatedDuration": "number",
      "priority": "number",
      "tags": "array of string"
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

### POST /api/TaskCatalog/\_getAllTasks

**Description:** Retrieves all tasks present in the catalog.

**Requirements:**

* true

**Effects:**

* returns all `Tasks` in the catalog

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "task": {
      "id": "string",
      "name": "string",
      "description": "string",
      "estimatedDuration": "number",
      "priority": "number",
      "tags": "array of string"
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
