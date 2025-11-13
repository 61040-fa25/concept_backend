---
timestamp: 'Mon Oct 20 2025 11:40:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_114028.5bea0c3b.md]]'
content_id: 49e114939dbf92074b19c80d933dbfd3c85871488364e6d71ddd32e80bbdd3c8
---

# API Specification: Authentication Concept

**Purpose:** manage user identities and provide a mechanism for users to prove their identity

***

## API Endpoints

### POST /api/Authentication/register

**Description:** Registers a new user with a unique username and password.

**Requirements:**

* no User with `username` already exists

**Effects:**

* creates a new User `u`
* sets `u`'s username to `username`, password to `password` (hashed)
* `isActive` to true
* returns `u` as `user`

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
  "user": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Authentication/login

**Description:** Authenticates a user with their username and password.

**Requirements:**

* User with `username` exists and `password` matches

**Effects:**

* returns the authenticated `user`

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
  "user": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Authentication/logout

**Description:** Invalidates the current session for a specified user.

**Requirements:**

* user exists and is currently authenticated (concept implicitly handles sessions)

**Effects:**

* invalidates the current session for `user`

**Request Body:**

```json
{
  "user": "string"
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

### POST /api/Authentication/\_deactivateUser

**Description:** Deactivates a user account, setting their `isActive` status to false.

**Requirements:**

* user exists

**Effects:**

* sets `user`'s `isActive` to false

**Request Body:**

```json
{
  "user": "string"
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

### POST /api/Authentication/\_getUserByUsername

**Description:** Retrieves a user by their username.

**Requirements:**

* User with `username` exists and is active

**Effects:**

* returns the `user` identified by `username`

**Request Body:**

```json
{
  "username": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "user": "string"
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
