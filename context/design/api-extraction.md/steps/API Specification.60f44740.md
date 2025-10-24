---
timestamp: 'Tue Oct 21 2025 16:04:53 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_160453.97009cde.md]]'
content_id: 60f44740a4a4ed3c7bb64320e9f4dcb2662440fdefeef404c44aab9bca9c7046
---

# API Specification: Session Concept

**Purpose:** a focused session of completing all tasks on a list

***

## API Endpoints

### POST /api/Session/changeSession

**Description:** Creates a new session for an owner, or replaces an existing inactive session, linking it to an external list.

**Requirements:**

* there is not an active session for sessionOwner

**Effects:**

* creates new session with SessionList = list, randomOrder = defaultOrder, itemStatus = Incomplete, active = False, ordering = Default, and format = List.
* Deletes existing (inactive) session for sessionOwner if one exists.

**Request Body:**

```json
{
  "list": "ID",
  "sessionOwner": "ID"
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

### POST /api/Session/setOrdering

**Description:** Sets the ordering preference for tasks within a session.

**Requirements:**

* session's active Flag is currently False and setter = owner

**Effects:**

* ordering is set to newType

**Request Body:**

```json
{
  "session": "ID",
  "newType": "string",
  "setter": "ID"
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

### POST /api/Session/setFormat

**Description:** Sets the display format for the session's list.

**Requirements:**

* session's active Flag is currently False and setter = owner

**Effects:**

* format is set to newFormat

**Request Body:**

```json
{
  "session": "ID",
  "newFormat": "string",
  "setter": "ID"
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

### POST /api/Session/randomizeOrder

**Description:** Randomizes the order of tasks within a session if ordering is set to "Random".

**Requirements:**

* session's ordering is set to "Random" and randomizer = owner

**Effects:**

* each ListItems randomOrder value is updated at random, maintaining dependencies between tasks.

**Request Body:**

```json
{
  "session": "ID",
  "randomizer": "ID"
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

### POST /api/Session/activateSession

**Description:** Activates a session, making it the current active session for the owner.

**Requirements:**

* session's active Flag is currently False and activator = owner

**Effects:**

* session's active Flag is set to True

**Request Body:**

```json
{
  "session": "ID",
  "activator": "ID"
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

### POST /api/Session/startTask

**Description:** Marks a task within an active session as "In Progress".

**Requirements:**

* task is in a ListItem for session's list, its status is currently "Incomplete", and no other task is "In Progress"

**Effects:**

* given ListItem's status is set to "In Progress"

**Request Body:**

```json
{
  "session": "ID",
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

### POST /api/Session/completeTask

**Description:** Marks a task within an active session as "Complete".

**Requirements:**

* task is in a ListItem for session's list and its status is currently "In Progress"

**Effects:**

* given ListItem's status is set to "Complete"

**Request Body:**

```json
{
  "session": "ID",
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

### POST /api/Session/endSession

**Description:** Deactivates an active session.

**Requirements:**

* session's active Flag is currently True

**Effects:**

* session's active Flag is set to False

**Request Body:**

```json
{
  "session": "ID"
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

### POST /api/Session/deleteSession

**Description:** Deletes a session from the database.

**Requirements:**

* session exists

**Effects:**

* session is deleted from the database

**Request Body:**

```json
{
  "session": "ID"
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

### POST /api/Session/addListItem

**Description:** Adds a new task item to a session's list.

**Requirements:**

* session exists, and the task is not already in the session's list

**Effects:**

* adds a new ListItem to the session with specified task, default order, and "Incomplete" status.
* Increments session's itemCount.

**Request Body:**

```json
{
  "session": "ID",
  "task": "ID",
  "defaultOrder": "number"
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

### POST /api/Session/removeListItem

**Description:** Removes a task item from a session's list.

**Requirements:**

* session exists, and the task is in the session's list and not "In Progress"

**Effects:**

* removes the ListItem from the session.
* Decrements session's itemCount.

**Request Body:**

```json
{
  "session": "ID",
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

### POST /api/Session/\_getSession

**Description:** Returns the full session document for a given session ID.

**Requirements:**

* None

**Effects:**

* return the full session document for a given session ID

**Request Body:**

```json
{
  "session": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "owner": "ID",
    "listId": "ID",
    "title": "string",
    "itemCount": "number",
    "active": "boolean",
    "ordering": "string",
    "format": "string"
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

### POST /api/Session/\_getTaskStatus

**Description:** Returns the status of a specific task within a session.

**Requirements:**

* None

**Effects:**

* return the status of a specific task within a session

**Request Body:**

```json
{
  "session": "ID",
  "task": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
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

### POST /api/Session/\_getSessionListItems

**Description:** Returns all list items for a given session, ordered by default or random order.

**Requirements:**

* None

**Effects:**

* return all list items for a given session, ordered by default or random order

**Request Body:**

```json
{
  "session": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "sessionId": "ID",
    "taskId": "ID",
    "defaultOrder": "number",
    "randomOrder": "number",
    "itemStatus": "string"
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

### POST /api/Session/\_getSessionForOwner

**Description:** Returns the session for a given owner, or null if none exists.

**Requirements:**

* None

**Effects:**

* returns the session for a given owner, or null if none exists.

**Request Body:**

```json
{
  "owner": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "owner": "ID",
    "listId": "ID",
    "title": "string",
    "itemCount": "number",
    "active": "boolean",
    "ordering": "string",
    "format": "string"
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

### POST /api/Session/\_getActiveSessionForOwner

**Description:** Returns the active session for a given owner, or null if none exists.

**Requirements:**

* None

**Effects:**

* returns the active session for a given owner, or null if none exists.

**Request Body:**

```json
{
  "owner": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "owner": "ID",
    "listId": "ID",
    "title": "string",
    "itemCount": "number",
    "active": "boolean",
    "ordering": "string",
    "format": "string"
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
