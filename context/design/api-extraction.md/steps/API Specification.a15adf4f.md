---
timestamp: 'Tue Oct 21 2025 16:04:53 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_160453.97009cde.md]]'
content_id: a15adf4faad0d67214e041b2f8b44a5d2dd43ebc11a20f32e82d2e1655fe25e6
---

# API Specification: ListCreation Concept

**Purpose:** allow for grouping of tasks into lists, subsets of the task bank

***

## API Endpoints

### POST /api/ListCreation/newList

**Description:** Creates a new list with the specified name and owner.

**Requirements:**

* no List with listName exists in set of Lists with owner = listOwner

**Effects:**

* new List with title = listName, owner = listOwner, itemCount = 0, and an empty set of ListItems is returned and added to set of Lists

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

***

### POST /api/ListCreation/addTask

**Description:** Adds a task to a specified list, initializing it as incomplete and assigning an order number.

**Requirements:**

* listItem containing task is not already in list and adder = owner of list

**Effects:**

* a new listItem is created with task = task, taskStatus = incomplete, and orderNumber = itemCount+1.
* itemCount is incremented.
* The new listItem is returned and added to list's set of listItems.

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

***

### POST /api/ListCreation/deleteTask

**Description:** Removes a task from a specified list, adjusting order numbers of subsequent tasks.

**Requirements:**

* a listItem containing task is in list's set of listItems and deleter = owner of list

**Effects:**

* the listItem containing task is removed from list's set of listItems.
* orderNumbers of subsequent items are decremented.
* itemCount is decremented.

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

***

### POST /api/ListCreation/assignOrder

**Description:** Reassigns the order number of a specific task within a list, adjusting other tasks accordingly.

**Requirements:**

* task belongs to a ListItem in list and assigner = owner of list
* newOrder is valid (1 to itemCount)

**Effects:**

* task's ListItem gets orderNumber set to newOrder and the ListItems with orderNumbers between the old value and new value are offset by one accordingly.

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

***

### POST /api/ListCreation/\_getLists

**Description:** Returns all lists stored by this concept.

**Requirements:**

* None

**Effects:**

* returns all lists stored by this concept.

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

***

### POST /api/ListCreation/\_getListById

**Description:** Returns a specific list document by its ID.

**Requirements:**

* None

**Effects:**

* returns a specific list document by its ID.

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

***

### POST /api/ListCreation/\_getListsByOwner

**Description:** Returns all lists owned by a specific user.

**Requirements:**

* None

**Effects:**

* returns all lists owned by a specific user.

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

***

### POST /api/ListCreation/\_getTasksInList

**Description:** Returns all list items (tasks) for a given list, sorted by their orderNumber.

**Requirements:**

* None

**Effects:**

* returns all list items (tasks) for a given list, sorted by their orderNumber.

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

***
