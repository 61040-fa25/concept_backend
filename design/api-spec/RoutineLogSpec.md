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

[@RoutineLog](../concepts/RoutineLog/RoutineLog.md)
# response:

# response:

# response:

# API Specification: RoutineLog

**Purpose:** Records what actually happened throughout the day as time-stamped sessions, optionally linked to planned tasks. Allow users to reflect on their planned schedule by comparing with logged routine sessions.

---

## API Endpoints

### POST /api/RoutineLog/_getUserSessions

**Description:** Retrieves all recorded routine sessions for a given user.

**Requirements:**
- exists at least one session with this owner

**Effects:**
- return ALL sessions under this owner

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
    "sessionName": "string",
    "sessionId": "string",
    "isPaused": "boolean",
    "isActive": "boolean",
    "start": "string",
    "end": "string",
    "linkedTaskId": "string",
    "interruptReason": "string"
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

### POST /api/RoutineLog/createSession

**Description:** Creates a new routine session for a user, optionally linking it to a planned task.

**Requirements:**
- true (no explicit requirements specified)

**Effects:**
- generate a unique sessionId;
- create a session owned by owner with sessionName;
- if linkedTaskId is provided, assign it to this session;
- assign start and end for this session as None;
- assign isPaused as False and isActive as False;
- assign interruptReason as None;
- return this newly created session;

**Request Body:**
```json
{
  "owner": "string",
  "sessionName": "string",
  "linkedTaskId": "string"
}
```

**Success Response Body (Action):**
```json
{
  "session": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/RoutineLog/startSession

**Description:** Marks a routine session as active and records its start time.

**Requirements:**
- session exists and is owned by owner and has isActive as False

**Effects:**
- get the current TimeStamp;
- set session.start = current TimeStamp;
- set session.isActive as True

**Request Body:**
```json
{
  "owner": "string",
  "session": "string"
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

### POST /api/RoutineLog/endSession

**Description:** Marks an active routine session as ended and records its end time.

**Requirements:**
- session exists and is owned by owner and has isActive as True

**Effects:**
- get the current TimeStamp;
- set session.end = current TimeStamp;
- set session.isActive as False;

**Request Body:**
```json
{
  "owner": "string",
  "session": "string"
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

### POST /api/RoutineLog/interruptSession

**Description:** Interrupts an active routine session, records the interruption reason, and marks it as paused.

**Requirements:**
- session exists and is owned by owner and has isActive as True;
- session has isPaused as False;

**Effects:**
- get the current TimeStamp;
- set session.end = current TimeStamp;
- set session.isPaused = True;
- set session.interruptReason = interruptReason;

**Request Body:**
```json
{
  "owner": "string",
  "session": "string",
  "interruptReason": "string"
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