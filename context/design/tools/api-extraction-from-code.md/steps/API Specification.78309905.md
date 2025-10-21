---
timestamp: 'Tue Oct 21 2025 09:53:11 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_095311.3c06fa92.md]]'
content_id: 7830990596f512683881d916d0ad1e3863633bb2a4488a40a010507f11530a44
---

# API Specification: User Concept

**Purpose:** manage user accounts and profiles, enabling authentication and storing basic user information.

***

## API Endpoints

### POST /api/User/register

**Description:** Registers a new user account with a unique username and email, returning the ID of the newly created user.

**Requirements:**

* No User with the given username or email already exists.

**Effects:**

* Creates a new User 'u'.
* Sets u.username to username, u.passwordHash to hash(password), u.email to email, u.bio to empty string.
* Returns 'u' as userId.

**Request Body:**

```json
{
  "username": "String",
  "password": "String",
  "email": "String"
}
```

**Success Response Body (Action):**

```json
{
  "userId": "User"
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

**Description:** Authenticates a user with a given username and password, returning the user's ID upon successful login.

**Requirements:**

* A User 'u' exists with u.username = username and u.passwordHash = hash(password).

**Effects:**

* Returns 'u' as userId.

**Request Body:**

```json
{
  "username": "String",
  "password": "String"
}
```

**Success Response Body (Action):**

```json
{
  "userId": "User"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/User/updateProfile

**Description:** Updates the biographical information (bio) for a specified user.

**Requirements:**

* userId exists.

**Effects:**

* Updates the bio of the User identified by userId to bio.

**Request Body:**

```json
{
  "userId": "User",
  "bio": "String"
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

### POST /api/User/resetPassword

**Description:** Resets the password for a specified user. This is a system-level action, typically triggered by an internal process (e.g., after a password reset token validation).

**Requirements:**

* userId exists.

**Effects:**

* Updates the passwordHash of the User identified by userId to hash(newPassword).

**Request Body:**

```json
{
  "userId": "User",
  "newPassword": "String"
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

### POST /api/User/\_getUserProfile

**Description:** Retrieves the username, email, and biographical information for a specified user.

**Requirements:**

* userId exists.

**Effects:**

* Returns the username, email, and bio of the User.

**Request Body:**

```json
{
  "userId": "User"
}
```

**Success Response Body (Query):**

```json
[
  {
    "username": "String",
    "email": "String",
    "bio": "String"
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

### POST /api/User/\_getUserIdByUsername

**Description:** Retrieves the user ID associated with a given username.

**Requirements:**

* A User 'u' exists with u.username = username.

**Effects:**

* Returns 'u' as userId.

**Request Body:**

```json
{
  "username": "String"
}
```

**Success Response Body (Query):**

```json
[
  {
    "userId": "User"
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
