---
timestamp: 'Mon Oct 20 2025 14:40:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_144019.edc10ec9.md]]'
content_id: dabf84e58f6afe122caa0afe41ef9cf1e3fe97d07485ec199a13c7ed510b9106
---

# API Specification: ScheduleTime

**Purpose:** manage fixed-time appointments, allowing users to schedule, view, and cancel specific time slots.

***

## API Endpoints

### POST /api/ScheduleTime/scheduleAppointment

**Description:** Schedules a new fixed-time appointment for a user.

**Requirements:**

* start is before end
* no existing appointment for this user overlaps with the requested time slot

**Effects:**

* creates a new Appointment
* sets its properties
* sets status to 'scheduled'
* returns the new Appointment

**Request Body:**

```json
{
  "user": "ID",
  "title": "string",
  "start": "string",
  "end": "string"
}
```

**Success Response Body (Action):**

```json
{
  "appointment": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ScheduleTime/cancelAppointment

**Description:** Cancels an existing scheduled appointment.

**Requirements:**

* appointment exists and status is 'scheduled'

**Effects:**

* sets appointment status to 'canceled'

**Request Body:**

```json
{
  "appointment": "ID"
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

### POST /api/ScheduleTime/updateAppointmentDetails

**Description:** Updates the specified details of an existing appointment.

**Requirements:**

* appointment exists
* if newStart or newEnd are provided, they must not conflict with other appointments for the user

**Effects:**

* updates the specified details of the appointment

**Request Body:**

```json
{
  "appointment": "ID",
  "newTitle": "string",
  "newStart": "string",
  "newEnd": "string"
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

### POST /api/ScheduleTime/\_getAppointmentsForUser

**Description:** Returns all appointments for a user, optionally filtered by date range.

**Requirements:**

* user exists

**Effects:**

* returns all appointments for the user, optionally filtered by date range

**Request Body:**

```json
{
  "user": "ID",
  "startDate": "string",
  "endDate": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "id": "ID",
    "title": "string",
    "start": "string",
    "end": "string",
    "status": "string"
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
