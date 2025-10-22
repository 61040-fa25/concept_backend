---
timestamp: 'Tue Oct 21 2025 19:02:40 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_190240.9dd5358d.md]]'
content_id: 92a4f871f531f288b8c5a7a63b9c71c6ec1f48300ed6bdf2255e666d519dc814
---

# API Specification: CourseScheduling Concept

**Purpose:** Enables the user to create multiple schedules and add classes to them to compare class schedules.

***

## API Endpoints

### POST /api/CourseScheduling/createCourse

**Description:** Creates a new course with a specified title and department.

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
  "c": {
    "id": "string",
    "title": "string",
    "department": "string"
  }
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

**Description:** Creates a new section for an existing course with specific details including an instructor, capacity, and meeting times.

**Requirements:**

* section is valid (based on day, start, end times)
* section does not already exist in schedule (This requirement from spec is more applicable to `addSection` and will be interpreted as the section being uniquely creatable.)
* user is the owner of the schedule (This requirement from spec is more applicable to `addSection` and `editSection` and will be interpreted as the section being uniquely creatable.)

**Effects:**

* section is created and available in the system.

**Request Body:**

```json
{
  "courseId": "string",
  "sectionNumber": "string",
  "instructor": "string",
  "capacity": 0,
  "timeSlots": [
    {
      "days": ["string"],
      "startTime": "HH:mm",
      "endTime": "HH:mm",
      "location": "string"
    }
  ]
}
```

**Success Response Body (Action):**

```json
{
  "s": {
    "id": "string",
    "courseId": "string",
    "sectionNumber": "string",
    "instructor": "string",
    "capacity": 0,
    "timeSlots": [
      {
        "days": ["string"],
        "startTime": "HH:mm",
        "endTime": "HH:mm",
        "location": "string"
      }
    ]
  }
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

**Description:** Adds an existing course section to a user's specific schedule.

**Requirements:**

* section is valid
* section does not already exist in schedule
* user is the owner of the schedule

**Effects:**

* section is added to the specified schedule.

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

**Description:** Modifies features of an existing section, such as its meeting day, start time, or end time. Other section properties can also be updated.

**Requirements:**

* section, day, start, and end times are valid (applies to `timeSlots` in `updates`)

**Effects:**

* changes the section features to specified day and times (and other updated properties).

**Request Body:**

```json
{
  "sectionId": "string",
  "updates": {
    "sectionNumber": "string",
    "instructor": "string",
    "capacity": 0,
    "timeSlots": [
      {
        "days": ["string"],
        "startTime": "HH:mm",
        "endTime": "HH:mm",
        "location": "string"
      }
    ]
  }
}
```

**Success Response Body (Action):**

```json
{
  "s": {
    "id": "string",
    "courseId": "string",
    "sectionNumber": "string",
    "instructor": "string",
    "capacity": 0,
    "timeSlots": [
      {
        "days": ["string"],
        "startTime": "HH:mm",
        "endTime": "HH:mm",
        "location": "string"
      }
    ]
  }
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

**Description:** Removes a specific course section from a user's schedule.

**Requirements:**

* section is valid
* section exists on the schedule
* user is the owner of the schedule

**Effects:**

* section is removed from the schedule.

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

**Description:** Creates a new empty schedule for a specified user with a given name.

**Requirements:**

* None specified (implicitly, user must exist if user management is external)

**Effects:**

* creates empty schedule with user as the owner.

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
  "s": {
    "id": "string",
    "name": "string",
    "sectionIds": ["string"],
    "owner": "string"
  }
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

**Description:** Deletes a specific schedule owned by a user.

**Requirements:**

* user is the owner of the schedule

**Effects:**

* deletes schedule.

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

### POST /api/CourseScheduling/duplicateSchedule

**Description:** Creates a new schedule by copying all sections from an existing schedule. The new schedule is owned by the specified user and given a new name.

**Requirements:**

* Source schedule must exist.
* User must be the owner of the source schedule.

**Effects:**

* Creates a new schedule with the same sections as the source schedule, with the specified user as owner and the new name.

**Request Body:**

```json
{
  "userId": "string",
  "sourceScheduleId": "string",
  "newName": "string"
}
```

**Success Response Body (Action):**

```json
{
  "s": {
    "id": "string",
    "name": "string",
    "sectionIds": ["string"],
    "owner": "string"
  }
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/CourseScheduling/getCourse

**Description:** Retrieves a single course by its unique identifier.

**Requirements:**

* None specified.

**Effects:**

* Returns the course if found.

**Request Body:**

```json
{
  "courseId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "id": "string",
    "title": "string",
    "department": "string"
  }
]
```

*(Returns an empty array `[]` if the course is not found.)*

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/CourseScheduling/getSection

**Description:** Retrieves a single section by its unique identifier.

**Requirements:**

* None specified.

**Effects:**

* Returns the section if found.

**Request Body:**

```json
{
  "sectionId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "id": "string",
    "courseId": "string",
    "sectionNumber": "string",
    "instructor": "string",
    "capacity": 0,
    "timeSlots": [
      {
        "days": ["string"],
        "startTime": "HH:mm",
        "endTime": "HH:mm",
        "location": "string"
      }
    ]
  }
]
```

*(Returns an empty array `[]` if the section is not found.)*

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/CourseScheduling/getAllCourses

**Description:** Retrieves a list of all available courses in the system.

**Requirements:**

* None specified.

**Effects:**

* Returns all courses.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "id": "string",
    "title": "string",
    "department": "string"
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

### POST /api/CourseScheduling/getAllSections

**Description:** Retrieves a list of all available sections in the system.

**Requirements:**

* None specified.

**Effects:**

* Returns all sections.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "id": "string",
    "courseId": "string",
    "sectionNumber": "string",
    "instructor": "string",
    "capacity": 0,
    "timeSlots": [
      {
        "days": ["string"],
        "startTime": "HH:mm",
        "endTime": "HH:mm",
        "location": "string"
      }
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

### POST /api/CourseScheduling/getAllSchedules

**Description:** Retrieves a list of all schedules created by users.

**Requirements:**

* None specified.

**Effects:**

* Returns all schedules.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "id": "string",
    "name": "string",
    "sectionIds": ["string"],
    "owner": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
