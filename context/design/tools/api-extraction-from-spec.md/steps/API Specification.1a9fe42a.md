---
timestamp: 'Tue Oct 21 2025 15:04:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_150458.b058f8bb.md]]'
content_id: 1a9fe42a68df3299739f8c412842c2d5d615e57395e06c6a18ddf0776843dbe2
---

# API Specification: Posting Concept

**Purpose:** enable users to publish content that can be viewed by others

***

## API Endpoints

### POST /api/Posting/createPost

**Description:** Creates a new post with specified author and content, returning its unique identifier.

**Requirements:**

* author exists and content is valid

**Effects:**

* a new Post is created with a unique postId, the given author and content, the current timestamp, and status "published". The postId is returned.

**Request Body:**

```json
{
  "author": "User",
  "content": "Content"
}
```

**Success Response Body (Action):**

```json
{
  "postId": "String"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Posting/updatePost

**Description:** Updates the content of an existing post, only if the editor is the author.

**Requirements:**

* postId refers to an existing Post AND editor is the author of the Post

**Effects:**

* the content of the Post identified by postId is updated to newContent. The timestamp is updated to the current time.

**Request Body:**

```json
{
  "postId": "String",
  "newContent": "Content",
  "editor": "User"
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

### POST /api/Posting/archivePost

**Description:** Changes the status of a published post to "archived," only if the archiver is the author.

**Requirements:**

* postId refers to an existing Post AND archiver is the author of the Post AND status is "published"

**Effects:**

* the status of the Post identified by postId is changed to "archived".

**Request Body:**

```json
{
  "postId": "String",
  "archiver": "User"
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

### POST /api/Posting/deletePost

**Description:** Permanently removes a post, only if the deleter is the author.

**Requirements:**

* postId refers to an existing Post AND deleter is the author of the Post

**Effects:**

* the Post identified by postId is removed from the set of Posts.

**Request Body:**

```json
{
  "postId": "String",
  "deleter": "User"
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

### POST /api/Posting/\_getPostById

**Description:** Retrieves a single post by its unique identifier.

**Requirements:**

* postId refers to an existing Post

**Effects:**

* returns the Post object corresponding to postId.

**Request Body:**

```json
{
  "postId": "String"
}
```

**Success Response Body (Query):**

```json
[
  {
    "postId": "String",
    "author": "User",
    "content": "Content",
    "timestamp": "DateTime",
    "status": "String"
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

### POST /api/Posting/\_getPostsByAuthor

**Description:** Retrieves all posts authored by a specific user.

**Requirements:**

* author exists

**Effects:**

* returns a set of all Posts authored by the given author.

**Request Body:**

```json
{
  "author": "User"
}
```

**Success Response Body (Query):**

```json
[
  {
    "postId": "String",
    "content": "Content",
    "timestamp": "DateTime",
    "status": "String"
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

### POST /api/Posting/\_getAllPublishedPosts

**Description:** Retrieves all posts that are currently published.

**Requirements:**

* true

**Effects:**

* returns a set of all Posts with status "published".

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "postId": "String",
    "author": "User",
    "content": "Content",
    "timestamp": "DateTime"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
