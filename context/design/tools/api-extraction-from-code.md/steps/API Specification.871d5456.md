---
timestamp: 'Tue Oct 21 2025 15:07:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_150718.8d7a39cb.md]]'
content_id: 871d545679dcbac05eb52d398a3717f70ca7a28bbf509d4bfc2f68d71bd546bf
---

# API Specification: Posting Concept

**Purpose:** to allow users to upload content, generally to ask for book recommendations

**Principle:** A user creates and publishes a post which can then be seen publically.

***

## API Endpoints

### POST /api/Posting/createPost

**Description:** Creates a post with a specified user and body.

**Requirements:**

* true

**Effects:**

* creates a post with body by user and adds it to Posts set

**Request Body:**

```json
{
  "user": "string",
  "body": "string"
}
```

**Success Response Body (Action):**

```json
{
  "post": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Posting/deletePost

**Description:** Deletes an existing post from the system.

**Requirements:**

* post exists

**Effects:**

* removes post from Posts set

**Request Body:**

```json
{
  "post": "string"
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

### POST /api/Posting/editPost

**Description:** Edits the body of an existing post.

**Requirements:**

* post exists

**Effects:**

* replaces body of post with newBody

**Request Body:**

```json
{
  "post": "string",
  "newBody": "string"
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

### POST /api/Posting/\_getPostsByAuthor

**Description:** Returns all posts created by a specific author.

**Requirements:**

* true

**Effects:**

* returns posts authored by user

**Request Body:**

```json
{
  "author": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "author": "string",
    "body": "string"
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

### POST /api/Posting/\_getAllPosts

**Description:** Returns all posts currently stored in the database.

**Requirements:**

* true

**Effects:**

* returns all posts in db

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "author": "string",
    "body": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
