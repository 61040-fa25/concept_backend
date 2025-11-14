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

[@AdaptiveSchedule](../concepts/AdaptiveSchedule/AdaptiveSchedule.md)
# response:

# response:

# API Specification: AdaptiveSchedule

**Purpose:** Keeps the schedule responsive by moving, canceling, or creating tasks scheduled at future time blocks when reality diverges, ensuring that highest-priority tasks are achieved first while preserving user productivity.

---

## API Endpoints

### POST /api/AdaptiveSchedule/_getAdaptiveSchedule

**Description:** Returns a set of all adaptive blocks under the given owner with end before the end of the day.

**Requirements:**
- exists at least one adaptive block under this user

**Effects:**
- return a set of all adaptive blocks under this owner with end before the end of the day

**Request Body:**
```json
{
  "owner": "User"
}
```

**Success Response Body (Query):**
```json
[
  {
    "timeBlockId": "String",
    "owner": "User",
    "start": "TimeStamp",
    "end": "TimeStamp",
    "taskIdSet": ["String"]
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

### POST /api/AdaptiveSchedule/_getDroppedTask

**Description:** Returns all tasks that couldn't be scheduled due to insufficient time for the given user.

**Requirements:**
- exists at least one dropped task with this owner

**Effects:**
- returns all dropped tasks for the user (tasks that couldn't be scheduled due to insufficient time)

**Request Body:**
```json
{
  "owner": "User"
}
```

**Success Response Body (Query):**
```json
[
  {
    "taskId": "String",
    "owner": "User",
    "reason": "String"
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

### POST /api/AdaptiveSchedule/addTimeBlock

**Description:** Creates a new adaptive time block for the given owner, start, and end times.

**Requirements:**
- start and end are valid TimeStamps;
- start is before end;
- no adaptive time block exists with this owner, start, and end;

**Effects:**
- create a new adaptive time block $b$ with this owner, start, and end;
- assign $b$ an empty taskIdSet;
- return b.timeBlockId;

**Request Body:**
```json
{
  "owner": "User",
  "start": "TimeStamp",
  "end": "TimeStamp"
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

### POST /api/AdaptiveSchedule/assignAdaptiveSchedule

**Description:** Assigns a task to an existing or new adaptive time block for the given owner, start, and end times.

**Requirements:**
- if exists adaptive block $b$ with matching (owner, start, end), then taskId is not in b.taskIdSet;

**Effects:**
- if b doesn't exist, create it with owner, start, and end (same logic as addTimeBlock);
- add taskId to this adaptive block's taskIdSet;

**Request Body:**
```json
{
  "owner": "User",
  "taskId": "String",
  "start": "TimeStamp",
  "end": "TimeStamp"
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

### POST /api/AdaptiveSchedule/requestAdaptiveScheduleAI

**Description:** Sends a contexted prompt to an LLM to generate a revised adaptive schedule and dropped tasks, then updates the concept state.

**Requirements:**
- true

**Effects:**
- send the structured contexted_prompt to the llm;
- llm returns a structured JSON response including: - adaptiveBlocks (with start/end times and assigned task ids) - droppedTasks (tasks removed due to insufficient time) - each droppedTask has a task id and a reason for dropping
- for each adaptive block in llm's returned adaptiveBlocks, assign the task id to the corresponding adaptive block with matching (owner, start, end) using the same logic as assignAdaptiveSchedule;
- for each dropped task in droppedTasks, add to state with (taskId, owner, reason)
- return the set of all AdaptiveBlocks and the set of all droppedTasks under this owner;

**Request Body:**
```json
{
  "owner": "User",
  "contexted_prompt": "String"
}
```

**Success Response Body (Action):**
```json
{
  "adaptiveBlockTable": [
    {
      "timeBlockId": "String",
      "owner": "User",
      "start": "TimeStamp",
      "end": "TimeStamp",
      "taskIdSet": ["String"]
    }
  ],
  "droppedTaskSet": [
    {
      "taskId": "String",
      "owner": "User",
      "reason": "String"
    }
  ]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/AdaptiveSchedule/unassignBlock

**Description:** Removes a specific task from a designated adaptive time block.

**Requirements:**
- exists an adaptive block with matching owner and timeBlockId;
- taskId exists in this time block's taskIdSet;

**Effects:**
- remove taskId from that block's taskIdSet

**Request Body:**
```json
{
  "owner": "User",
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

---
