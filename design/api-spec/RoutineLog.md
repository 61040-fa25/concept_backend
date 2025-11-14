[@api-extraction-from-spec](RoutineLogSpec.md)

# Extracting from code

The following is an explanation of how concepts are implemented, for the purposes of understanding how to extract an API.

[@implementing-concepts](../background/implementing-concepts.md)

# prompt: 

Now, analyze the following Concept Implementation and generate the API documentation based on these instructions. Your API documentation should be generated exactly based on  how I implemented these concepts:
[@RoutineLog](../implementation/RoutineLog.md)

# response
# response:

# API Specification: RoutineLog

**Purpose:** Records what actually happened throughout the day as time-stamped sessions, optionally linked to planned tasks. Allow users to reflect on their planned schedule by comparing with logged routine sessions.

---

## API Endpoints

### POST /api/RoutineLog/\_getUserSessions

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