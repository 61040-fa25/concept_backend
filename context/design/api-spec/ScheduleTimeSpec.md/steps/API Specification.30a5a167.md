---
timestamp: 'Mon Oct 20 2025 16:59:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_165931.c3cd6087.md]]'
content_id: 30a5a16727b93003c15e8fc214e97eb509bc2816b4167e41c5b4b0e258073aab
---

# API Specification: ScheduleTime

**Purpose:** Manages users' intended schedule of future tasks by allowing them to assign tasks to each time block

***

## API Endpoints

### POST /api/ScheduleTime/\_getUserSchedule

**Description:** Retrieves all time blocks for a given owner.

**Requirements:**

* exists at least one time block under this owner

**Effects:**

* return a set of all time blocks under this owner with end before the end of the day

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

***

### POST /api/ScheduleTime/addTimeBlock

**Description:** Creates a new time block for a user with specified start and end times.

**Requirements:**

* no time block already exists with this owner, start, and end

**Effects:**

* create a new time block $b$ with this owner, start, and end, and empty taskIdSet

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

***

### POST /api/ScheduleTime/assignTimeBlock

**Description:** Assigns a task to an existing or newly created time block.

**Requirements:**

* if exists time block $b$ with matching (owner, start, end), then taskId is not in b.taskIdSet

**Effects:**

* if b doesn't exist, create it with owner, start, and end (same logic as addTimeBlock);
* add taskId to b.taskIdSet;
* return b.timeBlockId;

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

***

### POST /api/ScheduleTime/removeTask

**Description:** Removes a specific task from a time block.

**Requirements:**

* exists a time block $b$ with matching owner and timeBlockId;
* taskId exists in b.taskIdSet;

**Effects:**

* remove taskId from b.taskIdSet

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
