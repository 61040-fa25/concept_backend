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

[@ScheduleTime](../concepts/ScheduleTime/ScheduleTime.md)
# response:

# response:

# API Specification: ScheduleTime

**Purpose:** Manages users' intended schedule of future tasks by allowing them to assign tasks to each time block

---

## API Endpoints

### POST /api/ScheduleTime/_getUserSchedule

**Description:** Retrieves all time blocks for a given owner.

**Requirements:**
- exists at least one time block under this owner

**Effects:**
- return a set of all time blocks under this owner with end before the end of the day

**Request Body:**
```json
{
  "owner": "String"
}
```

**Success Response Body (Query):**
```json
[
  {
    "timeBlockId": "String",
    "owner": "String",
    "start": "String",
    "end": "String",
    "taskIdSet": [
      "String"
    ]
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

### POST /api/ScheduleTime/addTimeBlock

**Description:** Creates a new time block for a user with specified start and end times.

**Requirements:**
- no time block already exists with this owner, start, and end

**Effects:**
- create a new time block $b$ with this owner, start, and end, and empty taskIdSet

**Request Body:**
```json
{
  "owner": "String",
  "start": "String",
  "end": "String"
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

### POST /api/ScheduleTime/assignTimeBlock

**Description:** Assigns a task to an existing or newly created time block.

**Requirements:**
- if exists time block $b$ with matching (owner, start, end), then taskId is not in b.taskIdSet

**Effects:**
- if b doesn't exist, create it with owner, start, and end (same logic as addTimeBlock);
- add taskId to b.taskIdSet;
- return b.timeBlockId;

**Request Body:**
```json
{
  "owner": "String",
  "taskId": "String",
  "start": "String",
  "end": "String"
}
```

**Success Response Body (Action):**
```json
{
  "timeBlockId": "String"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/ScheduleTime/removeTask

**Description:** Removes a specific task from a time block.

**Requirements:**
- exists a time block $b$ with matching owner and timeBlockId;
- taskId exists in b.taskIdSet;

**Effects:**
- remove taskId from b.taskIdSet

**Request Body:**
```json
{
  "owner": "String",
  "taskId": "String",
  "timeBlockId": "String"
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