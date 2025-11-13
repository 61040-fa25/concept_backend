---
timestamp: 'Tue Oct 21 2025 15:15:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_151523.fe4b820b.md]]'
content_id: 4d9c15f383a7923771066f8f7c384239287496b36765bf605933df4531d21626
---

# API Specification: Commenting Concept

**Purpose:** associate user-generated text with an item, allowing for remarks or explanations.

***

## API Endpoints

### POST /api/Commenting/createComment

**Description:** Creates a new comment on a specified item by a user.

**Requirements:**

* true (assumes valid user, body, and item)

**Effects:**

* A new comment is created with a unique ID, associated with the item, user, and body, and added to the comments collection. The new comment's ID is returned.

**Request Body:**

```json
{
  "user": "ID",
  "body": "string",
  "item": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "comment": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Commenting/deleteComment

**Description:** Deletes an existing comment from the collection.

**Requirements:**

* The `comment` ID must refer to an existing comment.

**Effects:**

* The specified comment is removed from the comments collection.

**Request Body:**

```json
{
  "comment": "ID"
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

### POST /api/Commenting/editComment

**Description:** Edits the body of an existing comment.

**Requirements:**

* The `comment` ID must refer to an existing comment.

**Effects:**

* The body of the specified comment is replaced with `newBody`.

**Request Body:**

```json
{
  "comment": "ID",
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

### POST /api/Commenting/\_getCommentsByAuthor

**Description:** Retrieves all comments created by a specific author.

**Requirements:**

* The `author` ID must refer to an existing user.

**Effects:**

* Returns an array of comment objects authored by the given `author`.

**Request Body:**

```json
{
  "author": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "parent": "ID",
    "author": "ID",
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

### POST /api/Commenting/\_getCommentsByParent

**Description:** Retrieves all comments associated with a specific parent item.

**Requirements:**

* The `parent` ID must refer to an existing item.

**Effects:**

* Returns an array of comment objects associated with the given `parent` item.

**Request Body:**

```json
{
  "parent": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "parent": "ID",
    "author": "ID",
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

### POST /api/Commenting/\_getAllComments

**Description:** Retrieves all comments stored in the database.

**Requirements:**

* true

**Effects:**

* Returns an array of all comment objects.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "parent": "ID",
    "author": "ID",
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
