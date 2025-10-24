---
timestamp: 'Tue Oct 21 2025 16:04:53 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_160453.97009cde.md]]'
content_id: ccfb9863bb6a3e0d03e0b745f32c8de867e699f05a2b3420ded03abc8949a07f
---

# API Specification: TaskBank Concept

**Purpose:** allow for tasks to relate to one another

***

## API Endpoints

### POST /api/TaskBank/addTask

**Description:** Adds a new task with a given name and optional description to the user's task bank.

**Requirements:**

* there is not already a Task with taskName = name in adder's Bank

**Effects:**

* a new Task with taskName = name and description = desc is returned and added to the set of Tasks

**Request Body:**

```json
{
  "adder": "ID",
  "name": "string",
  "description": "string"
}
```

**Success Response Body (Action):**

```json
{
  "task": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/TaskBank/deleteTask

**Description:** Removes a task from the user's task bank and all its associated dependencies.

**Requirements:**

* task is in set of Tasks in deleter's Bank

**Effects:**

* task is removed from set of Tasks, and all its associated dependencies (and their inverses) are also removed.

**Request Body:**

```json
{
  "deleter": "ID",
  "task": "ID"
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

### POST /api/TaskBank/addDependency

**Description:** Adds a dependency relationship between two tasks in the user's bank, and its inverse.

**Requirements:**

* task1 and task2 are both in set of Tasks in adder's Bank

**Effects:**

* for task1's set of Dependencies, task2 and dependency are added.
* for task2's set of Dependencies, task1 and the inverse of dependency are added.

**Request Body:**

```json
{
  "adder": "ID",
  "task1": "ID",
  "task2": "ID",
  "dependency": "string"
}
```

**Success Response Body (Action):**

```json
{
  "dependency": {
    "depTask": "ID",
    "depRelation": "string"
  }
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/TaskBank/deleteDependency

**Description:** Removes a specific dependency between two tasks and its corresponding inverse.

**Requirements:**

* task has dependency in its set of Dependencies in deleter's Bank

**Effects:**

* dependency is removed from task's set of Dependencies and the corresponding Dependency is deleted from depTask's set of Dependencies

**Request Body:**

```json
{
  "deleter": "ID",
  "sourceTask": "ID",
  "targetTask": "ID",
  "relation": "string"
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

### POST /api/TaskBank/\_getDependencies

**Description:** Returns the set of dependencies for a given task in the user's bank.

**Requirements:**

* task is in set of Tasks in getter's Bank

**Effects:**

* returns the set of Dependencies for task

**Request Body:**

```json
{
  "getter": "ID",
  "task": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "depTask": "ID",
    "depRelation": "string"
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

### POST /api/TaskBank/\_evaluateOrder

**Description:** Evaluates if the order of two tasks is valid according to their dependencies.

**Requirements:**

* task1 and task2 are in set of Tasks in owner's Bank

**Effects:**

* returns True iff task1 and task2 are in a valid order according to their dependencies.

**Request Body:**

```json
{
  "owner": "ID",
  "task1": "ID",
  "task2": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "orderValid": "boolean"
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
