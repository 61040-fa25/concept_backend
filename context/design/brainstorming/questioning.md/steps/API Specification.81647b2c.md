---
timestamp: 'Mon Oct 20 2025 13:00:01 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_130001.1206c69a.md]]'
content_id: 81647b2cfb895989cdf998da53f049baccd8298ca6b92dbe9c510172ddb66740
---

# API Specification: CourseScheduling Concept

**Purpose:** Enables the user to create multiple schedules and add classes to them to compare class schedules.

***

## API Endpoints

### POST /api/CourseScheduling/createCourse

**Description:** Creates a new course.

**Requirements:**

* course does not already exist

**Effects:**

* creates course

**Request Body:**

```json
{
  "id": "string",
  "title": "string",
  "department": "string"
}
```

**Success Response Body (Action):**

```json
{
  "id": "string",
  "title": "string",
  "department": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/CourseScheduling/createSection

**Description:** Creates a new section for a course.
*(Note: The `requires` and `effects` here are from the concept specification, which appear to describe adding a section to a schedule, rather than creating a new section entity, which the implementation method handles.)*

**Requirements:**

* section is valid, section does not already exist in schedule and user is the owner of the schedule

**Effects:**

* section is added to the schedule

**Request Body:**

```json
{
  "courseId": "string",
  "sectionNumber": "string",
  "instructor": "string",
  "capacity": "number",
  "timeSlots": [
    {
      "days": ["M", "T", "W", "R", "F"],
      "startTime": "string (HH:mm)",
      "endTime": "string (HH:mm)",
      "location": "string"
    }
  ]
}
```

**Success Response Body (Action):**

```json
{
  "id": "string",
  "courseId": "string",
  "sectionNumber": "string",
  "instructor": "string",
  "capacity": "number",
  "timeSlots": [
    {
      "days": ["M", "T", "W", "R", "F"],
      "startTime": "string (HH:mm)",
      "endTime": "string (HH:mm)",
      "location": "string"
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

### POST /api/CourseScheduling/addSection

**Description:** Adds an existing course section to a student's schedule.

**Requirements:**

* section is valid, course does not already exist in schedule and user is the owner of the schedule

**Effects:**

* section is added to the schedule

**Request Body:**

```json
{
  "userId": "string",
  "scheduleId": "string",
  "sectionId": "string"
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

### POST /api/CourseScheduling/editSection

**Description:** Edits the details of an existing section.

**Requirements:**

* section, day, start, and end times are valid

**Effects:**

* changes the section features to specified day and times

**Request Body:**

```json
{
  "sectionId": "string",
  "updates": {
    "sectionNumber": "string",
    "instructor": "string",
    "capacity": "number",
    "timeSlots": [
      {
        "days": ["M", "T", "W", "R", "F"],
        "startTime": "string (HH:mm)",
        "endTime": "string (HH:mm)",
        "location": "string"
      }
    ]
  }
}
```

**Success Response Body (Action):**

```json
{
  "id": "string",
  "courseId": "string",
  "sectionNumber": "string",
  "instructor": "string",
  "capacity": "number",
  "timeSlots": [
    {
      "days": ["M", "T", "W", "R", "F"],
      "startTime": "string (HH:mm)",
      "endTime": "string (HH:mm)",
      "location": "string"
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

### POST /api/CourseScheduling/removeSection

**Description:** Removes a course section from a student's schedule.

**Requirements:**

* section is valid, section exists on the schedule, and that user is the owner of the schedule

**Effects:**

* section is removed from the schedule

**Request Body:**

```json
{
  "userId": "string",
  "scheduleId": "string",
  "sectionId": "string"
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

### POST /api/CourseScheduling/createSchedule

**Description:** Creates a new empty schedule for a user.

**Requirements:**

* (none specified in concept spec)

**Effects:**

* creates empty schedule with user as the owner

**Request Body:**

```json
{
  "userId": "string",
  "name": "string"
}
```

**Success Response Body (Action):**

```json
{
  "id": "string",
  "name": "string",
  "sectionIds": ["string"],
  "owner": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/CourseScheduling/deleteSchedule

**Description:** Deletes an existing schedule.

**Requirements:**

* user is the owner of the schedule

**Effects:**

* deletes schedule

**Request Body:**

```json
{
  "userId": "string",
  "scheduleId": "string"
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
