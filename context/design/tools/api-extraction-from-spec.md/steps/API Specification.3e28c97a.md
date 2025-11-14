---
timestamp: 'Mon Oct 20 2025 14:50:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_145018.15ced8ab.md]]'
content_id: 3e28c97ad07cb11bdef8c0cc0b7d7d2d9f83240ffd46765f742a3f33d236393a
---

# API Specification: TaskCatalog

**Purpose:** define a set of tasks that can be scheduled or logged.

***

## API Endpoints

### POST /api/TaskCatalog/createTask

**Description:** Creates a new task with a given name and description.

**Requirements:**

* a task with this name does not already exist

**Effects:**

* add a new task {name, description} to Tasks and return its id

**Request Body:**

```json
{
  "name": "String",
  "description": "String"
}
```

**Success Response Body (Action):**

```json
{
  "task": "Task"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/TaskCatalog/deleteTask

**Description:** Deletes an existing task from the catalog.

**Requirements:**

* task is in Tasks

**Effects:**

* remove task from Tasks

**Request Body:**

```json
{
  "task": "Task"
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

### POST /api/TaskCatalog/updateTaskName

**Description:** Updates the name of an existing task.

**Requirements:**

* task is in Tasks and no other task has newName

**Effects:**

* update the name of task to newName

**Request Body:**

```json
{
  "task": "Task",
  "newName": "String"
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

### POST /api/TaskCatalog/updateTaskDescription

**Description:** Updates the description of an existing task.

**Requirements:**

* task is in Tasks

**Effects:**

* update the description of task to newDescription

**Request Body:**

```json
{
  "task": "Task",
  "newDescription": "String"
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

### POST /api/TaskCatalog/\_getTaskByName

**Description:** Retrieves a task by its name.

**Requirements:**

* a task with the given name exists

**Effects:**

* returns the task with the specified name

**Request Body:**

```json
{
  "name": "String"
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

### POST /api/TaskCatalog/\_getTaskName

**Description:** Retrieves the name of a specified task.

**Requirements:**

* task is in Tasks

**Effects:**

* returns the name of the specified task

**Request Body:**

```json
{
  "task": "Task"
}
```

**Success Response Body (Query):**

```json
[
  {
    "name": "String"
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

### POST /api/TaskCatalog/\_getTaskDescription

**Description:** Retrieves the description of a specified task.

**Requirements:**

* task is in Tasks

**Effects:**

* returns the description of the specified task

**Request Body:**

```json
{
  "task": "Task"
}
```

**Success Response Body (Query):**

```json
[
  {
    "description": "String"
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
