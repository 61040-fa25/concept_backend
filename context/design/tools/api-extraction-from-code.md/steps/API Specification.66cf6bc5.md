---
timestamp: 'Mon Oct 20 2025 11:40:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_114028.5bea0c3b.md]]'
content_id: 66cf6bc5c5125062ce07859f61b4423c72301f4139d80d844cc482025e6c4294
---

# API Specification: Commenting Concept

**Purpose:** associate some text with another artifact (usually itself textual) that remarks on, augments or explains it

***

## API Endpoints

### POST /api/Commenting/addComment

**Description:** Adds a new comment to a specified target by an author.

**Requirements:**

* author exists, target exists

**Effects:**

* creates a new Comment `c`
* sets `c`'s author to `author`, target to `target`, text to `text`, creation time to current time
* `isDeleted` to false
* returns `c` as `comment`

**Request Body:**

```json
{
  "author": "string",
  "target": "string",
  "text": "string"
}
```

**Success Response Body (Action):**

```json
{
  "comment": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Commenting/editComment

**Description:** Edits the text of an existing comment.

**Requirements:**

* comment exists and `isDeleted` is false

**Effects:**

* updates `comment`'s text to `newText`
* returns `comment`

**Request Body:**

```json
{
  "comment": "string",
  "newText": "string"
}
```

**Success Response Body (Action):**

```json
{
  "comment": "string"
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

**Description:** Marks an existing comment as deleted.

**Requirements:**

* comment exists and `isDeleted` is false

**Effects:**

* sets `comment`'s `isDeleted` to true

**Request Body:**

```json
{
  "comment": "string"
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

### POST /api/Commenting/\_getCommentsForTarget

**Description:** Retrieves all non-deleted comments for a specific target.

**Requirements:**

* target exists

**Effects:**

* returns all non-deleted comments for `target`, along with their author, text, and creation time

**Request Body:**

```json
{
  "target": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "comment": "string",
    "author": "string",
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
