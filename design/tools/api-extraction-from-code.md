[@api-extraction-from-spec](api-extraction-from-spec.md)

# Extracting from code

The following is an explanation of how concepts are implemented, for the purposes of understanding how to extract an API.

[@implementing-concepts](../background/implementing-concepts.md)

# prompt: 

Now, analyze each of the following Concept Implementation and generate the API documentation based on these instructions for each concept. Your API documentation should be generated exactly based on  how I implemented these concepts:
[@AdaptiveSchedule](../implementation/AdaptiveSchedule.md)
[@RoutineLog](../implementation/RoutineLog.md)
[@ScheduleTime](../implementation/ScheduleTime.md)
[@TaskCatalog](../implementation/TaskCatalog.md)

# response
# response:

# API Specification: AdaptiveSchedule

**Purpose:** Keeps the schedule responsive by moving, canceling, or creating tasks scheduled at future time blocks when reality diverges, ensuring that highest-priority tasks are achieved first while preserving user productivity.

---

## API Endpoints

### POST /api/AdaptiveSchedule/\_getAdaptiveSchedule

**Description:** Returns a set of all adaptive blocks for a given owner with end times before the end of the day.

**Requirements:**
- exists at least one adaptive block under this user

**Effects:**
- return a set of all adaptive blocks under this owner with end before the end of the day

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
    "start": "TimeStamp",
    "end": "TimeStamp",
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

### POST /api/AdaptiveSchedule/\_getDroppedTask

**Description:** Returns all tasks that couldn't be scheduled for a user due to insufficient time.

**Requirements:**
- exists at least one dropped task with this owner

**Effects:**
- returns all dropped tasks for the user (tasks that couldn't be scheduled due to insufficient time)

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
    "taskId": "String",
    "owner": "String",
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

**Description:** Creates a new adaptive time block for a user with specified start and end times.

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
  "owner": "String",
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

**Description:** Assigns a task to an existing or newly created adaptive time block for a user.

**Requirements:**
- if exists adaptive block $b$ with matching (owner, start, end), then taskId is not in b.taskIdSet;

**Effects:**
- if b doesn't exist, create it with owner, start, and end (same logic as addTimeBlock);
- add taskId to this adaptive block's taskIdSet;

**Request Body:**
```json
{
  "owner": "String",
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

**Description:** Sends a contextual prompt to the LLM to generate a revised schedule, then applies the suggested adaptive blocks and dropped tasks to the system state.

**Requirements:**
- (No explicit requirements specified)

**Effects:**
- send the structured contexted_prompt to the llm;
- llm returns a structured JSON response including:
  - adaptiveBlocks (with start/end times and assigned task ids)
  - droppedTasks (tasks removed due to insufficient time)
  - each droppedTask has a task id and a reason for dropping
- for each adaptive block in llm's returned adaptiveBlocks, assign the task id to the corresponding adaptive block with matching (owner, start, end) using the same logic as assignAdaptiveSchedule;
- for each dropped task in droppedTasks, add to state with (taskId, owner, reason)
- return the set of all AdaptiveBlocks and the set of all droppedTasks under this owner;

**Request Body:**
```json
{
  "owner": "String",
  "contexted_prompt": "String"
}
```

**Success Response Body (Action):**
```json
{
  "adaptiveBlockTable": [
    {
      "timeBlockId": "String",
      "owner": "String",
      "start": "TimeStamp",
      "end": "TimeStamp",
      "taskIdSet": [
        "String"
      ]
    }
  ],
  "droppedTaskSet": [
    {
      "taskId": "String",
      "owner": "String",
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

**Description:** Removes a specific task from an adaptive time block.

**Requirements:**
- exists an adaptive block with matching owner and timeBlockId;
- taskId exists in this time block's taskIdSet;

**Effects:**
- remove taskId from that block's taskIdSet

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

---
# response:

