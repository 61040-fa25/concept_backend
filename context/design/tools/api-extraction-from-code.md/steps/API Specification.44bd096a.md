---
timestamp: 'Tue Oct 21 2025 15:17:27 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_151727.11e03586.md]]'
content_id: 44bd096ab615fc5a05c34f175a56b4a65d419b304c0a729a68a595f5436f3463
---

# API Specification: Notifying Concept

**Purpose:** to message users about updates to posts they have made

***

## API Endpoints

### POST /api/Notifying/notify

**Description:** Creates a notification with a specified message for a given user.

**Requirements:**

* true

**Effects:**

* creates a notification with the given `message` for the `user`, marks it as unread, and adds it to the set of notifications. Returns the ID of the newly created notification.

**Request Body:**

```json
{
  "user": "string",
  "message": "string"
}
```

**Success Response Body (Action):**

```json
{
  "notification": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Notifying/read

**Description:** Marks a specified notification as read and returns its message.

**Requirements:**

* notification refers to an existing notification

**Effects:**

* If the notification is unread, it is marked as read. Returns the message of the notification. If the notification does not exist, an error is returned.

**Request Body:**

```json
{
  "notification": "string"
}
```

**Success Response Body (Action):**

```json
{
  "message": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Notifying/\_getNotificationsByUser

**Description:** Returns all notifications addressed to a specified user, regardless of their read status.

**Requirements:**

* true

**Effects:**

* returns all notifications to specified user

**Request Body:**

```json
{
  "recipient": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "recipient": "string",
    "message": "string",
    "read": "boolean"
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

### POST /api/Notifying/\_getReadNotificationsByUser

**Description:** Returns all notifications marked as read for a specified user.

**Requirements:**

* true

**Effects:**

* returns all notifications marked read to specified user

**Request Body:**

```json
{
  "recipient": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "recipient": "string",
    "message": "string",
    "read": "boolean"
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

### POST /api/Notifying/\_getUnreadNotificationsByUser

**Description:** Returns all notifications marked as unread for a specified user.

**Requirements:**

* true

**Effects:**

* returns all notifications marked unread to specified user

**Request Body:**

```json
{
  "recipient": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "recipient": "string",
    "message": "string",
    "read": "boolean"
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

### POST /api/Notifying/\_getAllNotifications

**Description:** Returns all notifications currently in the system for any user.

**Requirements:**

* true

**Effects:**

* returns all notifications

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "recipient": "string",
    "message": "string",
    "read": "boolean"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
