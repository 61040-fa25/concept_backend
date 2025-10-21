---
timestamp: 'Tue Oct 21 2025 09:54:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_095433.c3622178.md]]'
content_id: 45e6d4632a630d8a42f3295ce6c95219e82bf0fb7ace6dee4135915db62448fc
---

# API Specification: User Concept

**Purpose:** To let users securely manage and access their own videos.

***

## API Endpoints

### POST /api/User/register

**Description:** Registers a new user.

**Requirements:**

* username not already taken.

**Effects:**

* A new User is created with login credentials.

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "userID": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/User/login

**Description:** Logs in a user.

**Requirements:**

* username exists and password matches.

**Effects:**

* Authenticates user and conceptually creates a session (represented by userID).

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "userID": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
