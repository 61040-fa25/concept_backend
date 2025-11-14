---
timestamp: 'Mon Oct 20 2025 16:57:08 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_165708.2641bfd2.md]]'
content_id: e372affc54375b014e3b8c36630745084da8560ff71d92fa4947cb1c26b55c97
---

# API Specification: AdaptiveSchedule

**Purpose:** Keeps the schedule responsive by moving, canceling, or creating tasks scheduled at future time blocks when reality diverges, ensuring that highest-priority tasks are achieved first while preserving user productivity.

***

## API Endpoints

### POST /api/AdaptiveSchedule/\_getAdaptiveSchedule

**Description:** Retrieves a set of all adaptive blocks for a given user, with end times before the end of the current day.

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
    "timeBlockId": "string",
    "owner": "User",
    "start": "TimeStamp",
    "end": "TimeStamp",
    "taskIdSet": "string[]"
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

**Description:** Returns all tasks that couldn't be scheduled for a given user due to insufficient time.

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
    "taskId": "string",
    "owner": "User",
    "reason": "string"
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

**Description:** Creates a new adaptive time block with a specified owner, start, and end time, and returns its unique ID.

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
  "timeBlockId": "string"
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

**Description:** Assigns a task to an adaptive time block, creating the block if it doesn't already exist.

**Requirements:**

* if exists adaptive block $b$ with matching (owner, start, end), then taskId is not in b.taskIdSet;

**Effects:**

* if b doesn't exist, create it with owner, start, and end (same logic as addTimeBlock);
* add taskId to this adaptive block's taskIdSet;

**Request Body:**

```json
{
  "owner": "User",
  "taskId": "string",
  "start": "TimeStamp",
  "end": "TimeStamp"
}
```

**Success Response Body (Action):**

```json
{
  "timeBlockId": "string"
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

**Description:** Sends a contextualized prompt to an LLM to automatically generate a revised schedule and update the state.

**Requirements:**

* (none specified, but implicit from effects)

**Effects:**

* send the structured contexted\_prompt to the llm;
* llm returns a structured JSON response including:
  * adaptiveBlocks (with start/end times and assigned task ids)
  * droppedTasks (tasks removed due to insufficient time)
  * each droppedTask has a task id and a reason for dropping
* for each adaptive block in llm's returned adaptiveBlocks, assign the task id to the corresponding adaptive block with matching (owner, start, end) using the same logic as assignAdaptiveSchedule;
* for each dropped task in droppedTasks, add to state with (taskId, owner, reason)
* return the set of all AdaptiveBlocks and the set of all droppedTasks under this owner;

**Request Body:**

```json
{
  "owner": "User",
  "contexted_prompt": "string"
}
```

**Success Response Body (Action):**

```json
{
  "adaptiveBlockTable": [
    {
      "timeBlockId": "string",
      "owner": "User",
      "start": "TimeStamp",
      "end": "TimeStamp",
      "taskIdSet": "string[]"
    }
  ],
  "droppedTaskSet": [
    {
      "taskId": "string",
      "owner": "User",
      "reason": "string"
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

**Description:** Removes a specified task from a given adaptive time block.

**Requirements:**

* exists an adaptive block with matching owner and timeBlockId;
* taskId exists in this time block's taskIdSet;

**Effects:**

* remove taskId from that block's taskIdSet

**Request Body:**

```json
{
  "owner": "User",
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

***
