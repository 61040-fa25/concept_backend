[@api-extraction-from-spec](ScheduleTimeSpec.md)

# Extracting from code

The following is an explanation of how concepts are implemented, for the purposes of understanding how to extract an API.

[@implementing-concepts](../background/implementing-concepts.md)

# prompt: 

Now, analyze the following Concept Implementation and generate the API documentation based on these instructions. Your API documentation should be generated exactly based on  how I implemented these concepts:
[@ScheduleTimeSpec](../implementation/ScheduleTimeSpec.md)

# response
# response:


# response:


# response:

# API Specification: TaskCatalog

**Purpose:** Allows users to create tasks with different attributes that will get scheduled;

---

## API Endpoints

### POST /api/TaskCatalog/\_getUserTasks

**Description:** Retrieves all tasks associated with a specific user.

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

**Description:** Creates a new task with specified attributes and assigns it to
# response:

# API Specification: ScheduleTime

**Purpose:** Manages users' intended schedule of future tasks by allowing them to assign tasks to each time block

---

## API Endpoints

### POST /api/ScheduleTime/\_getUserSchedule

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

### POST /api/ScheduleTime/\_getTaskSchedule

**Description:** Retrieves a specific time block for a given owner and time block ID.

**Requirements:**
- exists at least one time block under this owner with matching timeBlockId

**Effects:**
- return this time block

**Request Body:**
```json
{
  "owner": "string",
  "timeBlockId": "string"
}
```

**Success Response Body (Query):**
```json
{
  "timeBlock": {
    "_id": "string",
    "owner": "string",
    "start": "number",
    "end": "number",
    "taskIdSet": ["string"]
  }
}
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