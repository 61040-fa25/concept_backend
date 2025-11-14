---
timestamp: 'Mon Oct 20 2025 14:35:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_143514.162ea7c4.md]]'
content_id: 5040a25a74841461fc71109e2440bc7429ba7a05e3a9baba1d1f9bbb6f45f5be
---

# API Specification: UserProfile Concept (Example)

**Purpose:** manage additional profile information for users.

***

## API Endpoints

### POST /api/UserProfile/\_getUsername

**Description:** Retrieves the username for a specified user.

**Requirements:**

* user exists

**Effects:**

* returns username of user

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
    "username": "String"
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

### POST /api/UserProfile/\_getPassword

**Description:** Retrieves the password for a specified user.

**Requirements:**

* user exists

**Effects:**

* returns password of user

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
    "password": "String"
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

### POST /api/UserProfile/\_getUsers

**Description:** Retrieves a set of users belonging to a specified group.

**Requirements:**

* group exists

**Effects:**

* returns set of all users in the group

**Request Body:**

```json
{
  "group": "Group"
}
```

**Success Response Body (Query):**

```json
[
  {
    "user": "User"
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

### POST /api/UserProfile/\_getUsersWithUsernamesAndPasswords

**Description:** Retrieves a set of users in a group, including their usernames and passwords.

**Requirements:**

* group exists

**Effects:**

* returns set of all users in the group each with its username and password

**Request Body:**

```json
{
  "group": "Group"
}
```

**Success Response Body (Query):**

```json
[
  {
    "user": {
      "username": "String",
      "password": "String"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
