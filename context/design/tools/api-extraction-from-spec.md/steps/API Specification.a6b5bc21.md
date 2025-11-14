---
timestamp: 'Mon Oct 20 2025 14:50:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_145018.15ced8ab.md]]'
content_id: a6b5bc21b5ec9a2eb19531272d41cd5b35bf16c1bad7bb69c3f0541108ae90d9
---

# API Specification: AdaptiveSchedule

**Purpose:** allow tasks to be moved between time slots on a schedule to adapt to changing needs or priorities

***

## API Endpoints

### POST /api/AdaptiveSchedule/assign

**Description:** Assigns a task to a specific time slot.

**Requirements:**

* task is not in ScheduledTasks

**Effects:**

* add {task, slot} to ScheduledTasks

**Request Body:**

```json
{
  "task": "Task",
  "slot": "Slot"
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

### POST /api/AdaptiveSchedule/move

**Description:** Moves an already assigned task from one slot to another.

**Requirements:**

* {task, fromSlot} is in ScheduledTasks

**Effects:**

* remove {task, fromSlot} from ScheduledTasks
* add {task, toSlot} to ScheduledTasks

**Request Body:**

```json
{
  "task": "Task",
  "fromSlot": "Slot",
  "toSlot": "Slot"
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

### POST /api/AdaptiveSchedule/unassign

**Description:** Unassigns a task from a specific time slot.

**Requirements:**

* {task, slot} is in ScheduledTasks

**Effects:**

* remove {task, slot} from ScheduledTasks

**Request Body:**

```json
{
  "task": "Task",
  "slot": "Slot"
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

### POST /api/AdaptiveSchedule/\_getScheduledSlot

**Description:** Retrieves the time slot assigned to a given task.

**Requirements:**

* task is in ScheduledTasks

**Effects:**

* returns the slot assigned to the task

**Request Body:**

```json
{
  "task": "Task"
}
```

**Success Response Body (Query):**

```json
[
  {
    "slot": "Slot"
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

### POST /api/AdaptiveSchedule/\_getScheduledTask

**Description:** Retrieves the task assigned to a given time slot.

**Requirements:**

* slot is in ScheduledTasks

**Effects:**

* returns the task assigned to the slot

**Request Body:**

```json
{
  "slot": "Slot"
}
```

**Success Response Body (Query):**

```json
[
  {
    "task": "Task"
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
