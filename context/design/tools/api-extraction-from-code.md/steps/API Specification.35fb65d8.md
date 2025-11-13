---
timestamp: 'Mon Oct 20 2025 11:40:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_114028.5bea0c3b.md]]'
content_id: 35fb65d8230944f87375f498398fff02871bcebe3beb6279a39a2a7c642fc9eb
---

# API Specification: Posting Concept

**Purpose:** allow users to create and manage textual content items

***

## API Endpoints

### POST /api/Posting/createPost

**Description:** Creates a new post with specified author and text.

**Requirements:**

* author exists

**Effects:**

* creates a new Post `p`
* sets `p`'s author to `author`, text to `text`, creation time to current time
* `isDeleted` to false
* returns `p` as `post`

**Request Body:**

```json
{
  "author": "string",
  "text": "string"
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

### POST /api/Posting/editPost

**Description:** Edits the text of an existing post.

**Requirements:**

* post exists and `isDeleted` is false

**Effects:**

* updates `post`'s text to `newText`, `lastEditedTime` to current time
* returns `post`

**Request Body:**

```json
{
  "post": "string",
  "newText": "string"
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

**Description:** Marks an existing post as deleted.

**Requirements:**

* post exists and `isDeleted` is false

**Effects:**

* sets `post`'s `isDeleted` to true

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

### POST /api/Posting/\_getPost

**Description:** Retrieves the details of a specific post.

**Requirements:**

* post exists

**Effects:**

* returns the author, text, creation time, last edited time, and deletion status of `post`

**Request Body:**

```json
{
  "post": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "author": "string",
    "text": "string",
    "creationTime": "number",
    "lastEditedTime": "number",
    "isDeleted": "boolean"
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

**Description:** Retrieves all non-deleted posts by a specific author.

**Requirements:**

* author exists

**Effects:**

* returns all non-deleted posts by `author`, along with their text and creation time

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
    "post": "string",
    "text": "string",
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
