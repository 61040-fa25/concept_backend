---
timestamp: 'Mon Oct 20 2025 11:40:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_114028.5bea0c3b.md]]'
content_id: 8c48901c5a7c644a6e092af945848d03d92d178e3b37f0704bd94b1beb51e02c
---

# API Specification: Notifying Concept

**Purpose:** inform users about events or changes relevant to them

***

## API Endpoints

### POST /api/Notifying/createNotification

**Description:** Creates a new notification for a recipient with a message and source.

**Requirements:**

* recipient exists

**Effects:**

* creates a new Notification `n`
* sets `n`'s recipient to `recipient`, message to `message`, source to `source`, `isRead` to false, creation time to current time
* returns `n` as `notification`

**Request Body:**

```json
{
  "recipient": "string",
  "message": "string",
  "source": "string"
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

### POST /api/Notifying/markAsRead

**Description:** Marks a specific notification as read.

**Requirements:**

* notification exists

**Effects:**

* sets `notification`'s `isRead` to true

**Request Body:**

```json
{
  "notification": "string"
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

### POST /api/Notifying/\_getUnreadNotifications

**Description:** Retrieves all unread notifications for a specific recipient.

**Requirements:**

* recipient exists

**Effects:**

* returns all unread notifications for `recipient`, including their message, source, and creation time

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
    "notification": "string",
    "message": "string",
    "source": "string",
    "creationTime": "number"
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

**Description:** Retrieves all notifications (read and unread) for a specific recipient.

**Requirements:**

* recipient exists

**Effects:**

* returns all notifications for `recipient`, including their message, source, read status, and creation time

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
    "notification": "string",
    "message": "string",
    "source": "string",
    "isRead": "boolean",
    "creationTime": "number"
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
