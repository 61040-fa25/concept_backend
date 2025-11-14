---
timestamp: 'Mon Oct 20 2025 14:40:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_144019.edc10ec9.md]]'
content_id: 74cf5c51dcafacd1a8f5bcb7c71d8f0f66e1bfe1696736f7a78c2abb5a807064
---

# API Specification: TaskCatalog

**Purpose:** provide a centralized catalog for users to manage tasks, including creation, categorization, and status tracking.

***

## API Endpoints

### POST /api/TaskCatalog/createTask

**Description:** Creates a new task for a user.

**Requirements:**

* title is not empty

**Effects:**

* creates a new Task
* sets properties including createdDate to current time
* sets status to 'pending'
* returns the new Task

**Request Body:**

```json
{
  "user": "ID",
  "title": "string",
  "description": "string",
  "categories": "string[]",
  "dueDate": "string"
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

### POST /api/TaskCatalog/updateTask

**Description:** Updates specified properties of an existing task.

**Requirements:**

* task exists

**Effects:**

* updates specified properties of the task

**Request Body:**

```json
{
  "task": "ID",
  "newTitle": "string",
  "newDescription": "string",
  "newCategories": "string[]",
  "newDueDate": "string",
  "newStatus": "string"
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

**Description:** Deletes an existing task.

**Requirements:**

* task exists

**Effects:**

* deletes the task

**Request Body:**

```json
{
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

### POST /api/TaskCatalog/addCategoryToTask

**Description:** Adds a category to a task.

**Requirements:**

* task exists
* category not already present for task

**Effects:**

* adds the category to the task's categories

**Request Body:**

```json
{
  "task": "ID",
  "category": "string"
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

### POST /api/TaskCatalog/removeCategoryFromTask

**Description:** Removes a category from a task.

**Requirements:**

* task exists
* category is present for task

**Effects:**

* removes the category from the task's categories

**Request Body:**

```json
{
  "task": "ID",
  "category": "string"
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

### POST /api/TaskCatalog/\_getTasksForUser

**Description:** Returns all tasks for a user, optionally filtered by status, category, or due date range.

**Requirements:**

* user exists

**Effects:**

* returns all tasks for the user, optionally filtered by status, category, or due date range

**Request Body:**

```json
{
  "user": "ID",
  "status": "string",
  "category": "string",
  "dueDateBefore": "string",
  "dueDateAfter": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "id": "ID",
    "title": "string",
    "description": "string",
    "categories": "string[]",
    "dueDate": "string",
    "status": "string",
    "createdDate": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
