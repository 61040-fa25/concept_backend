---
timestamp: 'Tue Nov 04 2025 19:00:30 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_190030.db6239ba.md]]'
content_id: 75be325b9a40409611acb8c6ca2aa9233c6e7fc571e188d438a35f0dafdeb9ec
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
  "userID": "ID"
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
  "userID": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***
