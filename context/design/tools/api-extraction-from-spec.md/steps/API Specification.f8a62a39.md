---
timestamp: 'Tue Oct 21 2025 18:58:21 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_185821.d7ab31c7.md]]'
content_id: f8a62a39fe3b90a4513ac61d3d937f03d847f0b4d44c428ce2a78fc270eee8b4
---

# API Specification: Notification Concept

**Purpose:** remind users to save and celebrate milestones

***

## API Endpoints

### POST /api/Notification/createNotification

**Description:** Creates and returns a new notification with the specified details.

**Requirements:**

* None specified.

**Effects:**

* create and return a notification with the above input details

**Request Body:**

```json
{
  "user": "User",
  "progress": "ProgressTracking",
  "frequency": "Number",
  "message": "String"
}
```

**Success Response Body (Action):**

```json
{
  "notification": "Notification"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Notification/deleteNotification

**Description:** Deletes an existing notification belonging to a specific user.

**Requirements:**

* notification exists and belongs to user

**Effects:**

* deletes the notification

**Request Body:**

```json
{
  "user": "User",
  "notification": "Notification"
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

### POST /api/Notification/\_getAllNotifications

**Description:** Returns a list of all notifications belonging to the specified user, sorted by date.

**Requirements:**

* user exists

**Effects:**

* returns a list of all notifications belonging to the specified user sorted by the date

**Request Body:**

```json
{
  "user": "User"
}
```

**Success Response Body (Query):**

```json
[
  {
    "user": "User",
    "progress": "ProgressTracking",
    "frequency": "Number",
    "message": "String"
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
