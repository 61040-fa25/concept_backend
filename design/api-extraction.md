[@api-extraction-from-spec](tools/api-extraction-from-spec.md)

[@api-extraction-from-code](tools/api-extraction-from-code.md)

Please extract an API for this app from the following three concepts:

## ListCreation

Specification:

[@ListCreation](/design/concepts/ListCreation/specification.md)

Code:

[@ListCreation.ts](/src/concepts/ListCreation/ListCreationConcept.ts)

## TaskBank

Specification:

[@TaskBank](/design/concepts/TaskBank/specification.md)

Code:

[@TaskBank.ts](/src/concepts/TaskBank/TaskBankConcept.ts)

## Session

Specification:

[@Session](/design/concepts/Session/specification.md)

Code:

[@Session.ts](/src/concepts/Session/SessionConcept.ts)
# response:

Here is the API documentation extracted from the provided Concept Specifications and their implementations.

# API Specification: ListCreation Concept

**Purpose:** allow for grouping of tasks into lists, subsets of the task bank

---

## API Endpoints

### POST /api/ListCreation/newList

**Description:** Creates a new list with the specified name and owner.

**Requirements:**
- no List with listName exists in set of Lists with owner = listOwner

**Effects:**
- new List with title = listName, owner = listOwner, itemCount = 0, and an empty set of ListItems is returned and added to set of Lists

**Request Body:**

```json
{
  "listName": "string",
  "listOwner": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "list": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/ListCreation/addTask

**Description:** Adds a task to a specified list, initializing it as incomplete and assigning an order number.

**Requirements:**
- listItem containing task is not already in list and adder = owner of list

**Effects:**
- a new listItem is created with task = task, taskStatus = incomplete, and orderNumber = itemCount+1.
- itemCount is incremented.
- The new listItem is returned and added to list's set of listItems.

**Request Body:**

```json
{
  "list": "ID",
  "task": "ID",
  "adder": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "listItem": {
    "task": "ID",
    "orderNumber": "number",
    "taskStatus": "string"
  }
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/ListCreation/deleteTask

**Description:** Removes a task from a specified list, adjusting order numbers of subsequent tasks.

**Requirements:**
- a listItem containing task is in list's set of listItems and deleter = owner of list

**Effects:**
- the listItem containing task is removed from list's set of listItems.
- orderNumbers of subsequent items are decremented.
- itemCount is decremented.

**Request Body:**

```json
{
  "list": "ID",
  "task": "ID",
  "deleter": "ID"
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

---

### POST /api/ListCreation/assignOrder

**Description:** Reassigns the order number of a specific task within a list, adjusting other tasks accordingly.

**Requirements:**
- task belongs to a ListItem in list and assigner = owner of list
- newOrder is valid (1 to itemCount)

**Effects:**
- task's ListItem gets orderNumber set to newOrder and the ListItems with orderNumbers between the old value and new value are offset by one accordingly.

**Request Body:**

```json
{
  "list": "ID",
  "task": "ID",
  "newOrder": "number",
  "assigner": "ID"
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

---

### POST /api/ListCreation/_getLists

**Description:** Returns all lists stored by this concept.

**Requirements:**
- None

**Effects:**
- returns all lists stored by this concept.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "owner": "ID",
    "title": "string",
    "listItems": [
      {
        "task": "ID",
        "orderNumber": "number",
        "taskStatus": "string"
      }
    ],
    "itemCount": "number"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/ListCreation/_getListById

**Description:** Returns a specific list document by its ID.

**Requirements:**
- None

**Effects:**
- returns a specific list document by its ID.

**Request Body:**

```json
{
  "listId": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "owner": "ID",
    "title": "string",
    "listItems": [
      {
        "task": "ID",
        "orderNumber": "number",
        "taskStatus": "string"
      }
    ],
    "itemCount": "number"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/ListCreation/_getListsByOwner

**Description:** Returns all lists owned by a specific user.

**Requirements:**
- None

**Effects:**
- returns all lists owned by a specific user.

**Request Body:**

```json
{
  "ownerId": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "owner": "ID",
    "title": "string",
    "listItems": [
      {
        "task": "ID",
        "orderNumber": "number",
        "taskStatus": "string"
      }
    ],
    "itemCount": "number"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/ListCreation/_getTasksInList

**Description:** Returns all list items (tasks) for a given list, sorted by their orderNumber.

**Requirements:**
- None

**Effects:**
- returns all list items (tasks) for a given list, sorted by their orderNumber.

**Request Body:**

```json
{
  "listId": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "task": "ID",
    "orderNumber": "number",
    "taskStatus": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

# API Specification: TaskBank Concept

**Purpose:** allow for tasks to relate to one another

---

## API Endpoints

### POST /api/TaskBank/addTask

**Description:** Adds a new task with a given name and optional description to the user's task bank.

**Requirements:**
- there is not already a Task with taskName = name in adder's Bank

**Effects:**
- a new Task with taskName = name and description = desc is returned and added to the set of Tasks

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

---

### POST /api/TaskBank/deleteTask

**Description:** Removes a task from the user's task bank and all its associated dependencies.

**Requirements:**
- task is in set of Tasks in deleter's Bank

**Effects:**
- task is removed from set of Tasks, and all its associated dependencies (and their inverses) are also removed.

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

---

### POST /api/TaskBank/addDependency

**Description:** Adds a dependency relationship between two tasks in the user's bank, and its inverse.

**Requirements:**
- task1 and task2 are both in set of Tasks in adder's Bank

**Effects:**
- for task1's set of Dependencies, task2 and dependency are added.
- for task2's set of Dependencies, task1 and the inverse of dependency are added.

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

---

### POST /api/TaskBank/deleteDependency

**Description:** Removes a specific dependency between two tasks and its corresponding inverse.

**Requirements:**
- task has dependency in its set of Dependencies in deleter's Bank

**Effects:**
- dependency is removed from task's set of Dependencies and the corresponding Dependency is deleted from depTask's set of Dependencies

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

---

### POST /api/TaskBank/_getDependencies

**Description:** Returns the set of dependencies for a given task in the user's bank.

**Requirements:**
- task is in set of Tasks in getter's Bank

**Effects:**
- returns the set of Dependencies for task

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

---

### POST /api/TaskBank/_evaluateOrder

**Description:** Evaluates if the order of two tasks is valid according to their dependencies.

**Requirements:**
- task1 and task2 are in set of Tasks in owner's Bank

**Effects:**
- returns True iff task1 and task2 are in a valid order according to their dependencies.

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

---

# API Specification: Session Concept

**Purpose:** a focused session of completing all tasks on a list

---

## API Endpoints

### POST /api/Session/changeSession

**Description:** Creates a new session for an owner, or replaces an existing inactive session, linking it to an external list.

**Requirements:**
- there is not an active session for sessionOwner

**Effects:**
- creates new session with SessionList = list, randomOrder = defaultOrder, itemStatus = Incomplete, active = False, ordering = Default, and format = List.
- Deletes existing (inactive) session for sessionOwner if one exists.

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

---

### POST /api/Session/setOrdering

**Description:** Sets the ordering preference for tasks within a session.

**Requirements:**
- session's active Flag is currently False and setter = owner

**Effects:**
- ordering is set to newType

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

---

### POST /api/Session/setFormat

**Description:** Sets the display format for the session's list.

**Requirements:**
- session's active Flag is currently False and setter = owner

**Effects:**
- format is set to newFormat

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

---

### POST /api/Session/randomizeOrder

**Description:** Randomizes the order of tasks within a session if ordering is set to "Random".

**Requirements:**
- session's ordering is set to "Random" and randomizer = owner

**Effects:**
- each ListItems randomOrder value is updated at random, maintaining dependencies between tasks.

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

---

### POST /api/Session/activateSession

**Description:** Activates a session, making it the current active session for the owner.

**Requirements:**
- session's active Flag is currently False and activator = owner

**Effects:**
- session's active Flag is set to True

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

---

### POST /api/Session/startTask

**Description:** Marks a task within an active session as "In Progress".

**Requirements:**
- task is in a ListItem for session's list, its status is currently "Incomplete", and no other task is "In Progress"

**Effects:**
- given ListItem's status is set to "In Progress"

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

---

### POST /api/Session/completeTask

**Description:** Marks a task within an active session as "Complete".

**Requirements:**
- task is in a ListItem for session's list and its status is currently "In Progress"

**Effects:**
- given ListItem's status is set to "Complete"

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

---

### POST /api/Session/endSession

**Description:** Deactivates an active session.

**Requirements:**
- session's active Flag is currently True

**Effects:**
- session's active Flag is set to False

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

---

### POST /api/Session/deleteSession

**Description:** Deletes a session from the database.

**Requirements:**
- session exists

**Effects:**
- session is deleted from the database

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

---

### POST /api/Session/addListItem

**Description:** Adds a new task item to a session's list.

**Requirements:**
- session exists, and the task is not already in the session's list

**Effects:**
- adds a new ListItem to the session with specified task, default order, and "Incomplete" status.
- Increments session's itemCount.

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

---

### POST /api/Session/removeListItem

**Description:** Removes a task item from a session's list.

**Requirements:**
- session exists, and the task is in the session's list and not "In Progress"

**Effects:**
- removes the ListItem from the session.
- Decrements session's itemCount.

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

---

### POST /api/Session/_getSession

**Description:** Returns the full session document for a given session ID.

**Requirements:**
- None

**Effects:**
- return the full session document for a given session ID

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

---

### POST /api/Session/_getTaskStatus

**Description:** Returns the status of a specific task within a session.

**Requirements:**
- None

**Effects:**
- return the status of a specific task within a session

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

---

### POST /api/Session/_getSessionListItems

**Description:** Returns all list items for a given session, ordered by default or random order.

**Requirements:**
- None

**Effects:**
- return all list items for a given session, ordered by default or random order

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

---

### POST /api/Session/_getSessionForOwner

**Description:** Returns the session for a given owner, or null if none exists.

**Requirements:**
- None

**Effects:**
- returns the session for a given owner, or null if none exists.

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

---

### POST /api/Session/_getActiveSessionForOwner

**Description:** Returns the active session for a given owner, or null if none exists.

**Requirements:**
- None

**Effects:**
- returns the active session for a given owner, or null if none exists.

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

---