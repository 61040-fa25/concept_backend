---
timestamp: 'Tue Oct 21 2025 17:15:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_171533.20728623.md]]'
content_id: 7854c513cd3a5fb383f765d120a4ada32b86b54e5b5d79a7dc72b08593fe06cf
---

# API Specification: AdaptiveSchedule

**Purpose:** Keeps the schedule responsive by moving, canceling, or creating tasks scheduled at future time blocks when reality diverges, ensuring that highest-priority tasks are achieved first while preserving user productivity.

***

## API Endpoints

### POST /api/AdaptiveSchedule/\_getAdaptiveSchedule

**Description:** Returns a set of all adaptive blocks under the given owner with end before the end of the day.

**Requirements:**

* exists at least one adaptive block under this user

**Effects:**

* return a set of all adaptive blocks under this owner with end before the end of the day

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

***

### POST /api/AdaptiveSchedule/\_getDroppedTask

**Description:** Returns all tasks that couldn't be scheduled due to insufficient time for the given user.

**Requirements:**

* exists at least one dropped task with this owner

**Effects:**

* returns all dropped tasks for the user (tasks that couldn't be scheduled due to insufficient time)

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

***

### POST /api/AdaptiveSchedule/addTimeBlock

**Description:** Creates a new adaptive time block for the given owner, start, and end times.

**Requirements:**

* start and end are valid TimeStamps;
* start is before end;
* no adaptive time block exists with this owner, start, and end;

**Effects:**

* create a new adaptive time block $b$ with this owner, start, and end;
* assign $b$ an empty taskIdSet;
* return b.timeBlockId;

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

***

### POST /api/AdaptiveSchedule/assignAdaptiveSchedule

**Description:** Assigns a task to an existing or new adaptive time block for the given owner, start, and end times.

**Requirements:**

* if exists adaptive block $b$ with matching (owner, start, end), then taskId is not in b.taskIdSet;

**Effects:**

* if b doesn't exist, create it with owner, start, and end (same logic as addTimeBlock);
* add taskId to this adaptive block's taskIdSet;

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

***

### POST /api/AdaptiveSchedule/requestAdaptiveScheduleAI

**Description:** Sends a contexted prompt to an LLM to generate a revised adaptive schedule and dropped tasks, then updates the concept state.

**Requirements:**

* true

**Effects:**

* send the structured contexted\_prompt to the llm;
* llm returns a structured JSON response including: - adaptiveBlocks (with start/end times and assigned task ids) - droppedTasks (tasks removed due to insufficient time) - each droppedTask has a task id and a reason for dropping
* for each adaptive block in llm's returned adaptiveBlocks, assign the task id to the corresponding adaptive block with matching (owner, start, end) using the same logic as assignAdaptiveSchedule;
* for each dropped task in droppedTasks, add to state with (taskId, owner, reason)
* return the set of all AdaptiveBlocks and the set of all droppedTasks under this owner;

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

***

### POST /api/AdaptiveSchedule/unassignBlock

**Description:** Removes a specific task from a designated adaptive time block.

**Requirements:**

* exists an adaptive block with matching owner and timeBlockId;
* taskId exists in this time block's taskIdSet;

**Effects:**

* remove taskId from that block's taskIdSet

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

***
