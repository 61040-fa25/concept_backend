[@concept-specifications](../background/concept-specifications.md)

# Concept API extraction

You are an expert software architect tasked with generating clear, developer-friendly API documentation. Your input is a formal "Concept Specification" which describes a modular piece of software functionality. This concept has been implemented and exposed as a REST-like API by a "Concept Server."

Your mission is to translate the provided Concept Specification into a structured API specification document written in Markdown. This document will be used by frontend developers to interact with the API.

Adhere to the following rules for the API structure and the documentation format:

**API Structure Rules:**

1.  **Base URL:** Assume a base URL of `/api`.
2.  **Endpoint Naming:** Each concept action or query maps to an endpoint. The URL structure is: `/{conceptName}/{actionOrQueryName}`.
    *   For a concept named `Labeling` and an action `createLabel`, the endpoint is `/api/Labeling/createLabel`.
3.  **HTTP Method:** All endpoints use the `POST` method.
4.  **Data Format:** All requests and responses use the `application/json` content type.
5.  **Request Body:** The request body is always a single JSON object. The keys of this object correspond to the input arguments defined in the action's signature.
6.  **Response Body:**
    *   **Actions:** A successful call to an action returns a single JSON object. The keys correspond to the results defined in the action's signature. If there are no results, an empty object `{}` is returned.
    *   **Queries:** A successful call to a query (a method name starting with `_`) returns a JSON **array** of objects.
    *   **Errors:** If an action fails to meet its `requires` condition or encounters another error, it returns a single JSON object with a single key: `{ "error": "A descriptive error message." }`.

**Documentation Format Rules:**

Generate the output in Markdown using the following template. For each action and query in the specification, create a dedicated endpoint section.

~~~markdown
# API Specification: {Concept Name}

**Purpose:** {The concept's purpose.}

---

## API Endpoints

### POST /api/{conceptName}/{actionName}

**Description:** {A brief, one-sentence description of what this action does.}

**Requirements:**
- {List each point from the 'requires' section of the specification.}

**Effects:**
- {List each point from the 'effects' section of the specification.}

**Request Body:**
```json
{
  "argument1": "{type}",
  "argument2": "{type}"
}
```

**Success Response Body (Action):**
```json
{
  "result1": "{type}",
  "result2": "{type}"
}
```

**Success Response Body (Query):**
```json
[
  {
    "result1": "{type}",
    "result2": "{type}"
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
*(Repeat for each action and query)*
~~~

# prompt:

Now, analyze the following Concept Specification and generate the API documentation based on these instructions. Your API documentation should be generated to based exactly on how I defined my concepts:

[@TaskCatalog](../concepts/TaskCatalog/TaskCatalog.md)
# response:


# response:

# API Specification: TaskCatalog

**Purpose:** Allows users to create tasks with different attributes that will get scheduled;

---

## API Endpoints

### POST /api/TaskCatalog/_getUserTasks

**Description:** This query retrieves all tasks associated with a specific user.

**Requirements:**
- exist at least one task with this owner

**Effects:**
- returns ALL tasks under this owner

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

---

### POST /api/TaskCatalog/createTask

**Description:** Creates a new task with specified attributes and assigns it to an owner, returning the newly created task.

**Requirements:**
- (none specified)

**Effects:**
- generate a unique taskId that has not been used;
- create a new task $t$ owned by owner with the attributes (taskId, taskName, category, duration, priority, splittable, deadline?, slack?, preDependence?, note?), the optional attributes are not set if not provided;
- set $t$'s timeBlockSet as an empty set;
- add $t$ to postDependence of all tasks in its given preDependence;
- return the newly created task $t$;

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
  "preDependence": ["string"] (optional, array of taskId strings),
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

---

### POST /api/TaskCatalog/assignSchedule

**Description:** Assigns a specific time block ID to an existing task's schedule.

**Requirements:**
- exists a task with matching owner and taskId;
- timeBlockId does not already exist in this task's timeBlockSet;

**Effects:**
- add timeBlockId to this task's timeBlockSet

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

---

### POST /api/TaskCatalog/deleteSchedule

**Description:** Removes a specific time block ID from an existing task's schedule.

**Requirements:**
- exists a task with matching owner and taskId;
- timeBlockId exists in this task's timeBlockSet;

**Effects:**
- remove timeBlockId from this task's timeBlockSet;

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

---

### POST /api/TaskCatalog/updateTask

**Description:** Updates a specific attribute of an existing task.

**Requirements:**
- exist a task with this taskId and the owner matches the given owner

**Effects:**
- update the given attribute of this task;

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

---

### POST /api/TaskCatalog/addPreDependence

**Description:** Adds a new prerequisite task to an existing task, establishing a dependency relationship.

**Requirements:**
- exist a task $t$ with this taskId and the owner matches the given owner

**Effects:**
- add newPreDependence to $t$'s preDependence;
- add $t$ to newPreDependence's postDependence;

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

---

### POST /api/TaskCatalog/removePreDependence

**Description:** Removes an existing prerequisite task from another task, breaking the dependency.

**Requirements:**
- exist a task $t$ with this taskId and the owner matches the given owner;
- oldPreDependence exists in $t$'s preDependence;

**Effects:**
- remove oldPreDependence from $t$'s preDependence;
- remove $t$ from oldPreDependence's postDependence;

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

---

### POST /api/TaskCatalog/deleteTask

**Description:** Deletes a task owned by the specified user, provided it has no dependent tasks.

**Requirements:**
- exist a task $t$ with this taskId;
- task $t$ has no postDependence;
- task $t$ has a matching owner;

**Effects:**
- remove task $t$ from Tasks

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