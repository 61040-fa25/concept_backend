---
timestamp: 'Tue Oct 21 2025 15:19:47 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_151947.5893be74.md]]'
content_id: ffe7129a0641d87fbeabf65315d93487535cad083c7af4077be2fa4f3423c3b7
---

# API Specification: Tagging Concept

**Purpose:** to label books to assist in searching and organization

***

## API Endpoints

### POST /api/Tagging/addTag

**Description:** Adds a tag to a book.

**Requirements:**

* no user tag with label already associated with book

**Effects:**

* adds a tag from user with label associated with book to Tags set; default is public (private is false)

**Request Body:**

```json
{
  "user": "string",
  "label": "string",
  "book": "string"
}
```

**Success Response Body (Action):**

```json
{
  "tag": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Tagging/removeTag

**Description:** Removes a tag from a book.

**Requirements:**

* tag exists

**Effects:**

* removes tag from Tags set

**Request Body:**

```json
{
  "tag": "string"
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

### POST /api/Tagging/markPrivate

**Description:** Marks a tag as private (only searchable to user).

**Requirements:**

* tag exists

**Effects:**

* sets private flag to true

**Request Body:**

```json
{
  "tag": "string"
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

### POST /api/Tagging/markPublic

**Description:** Marks a tag as public (searchable to all).

**Requirements:**

* tag exists

**Effects:**

* sets private flag to false

**Request Body:**

```json
{
  "tag": "string"
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

### POST /api/Tagging/\_getTagsByBook

**Description:** Returns all public tags associated with book along with private tags created by user associated with book.

**Requirements:**

* book exists
* user exists

**Effects:**

* returns all public tags associated with book along with private tags created by user associated with book

**Request Body:**

```json
{
  "user": "string",
  "book": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "user": "string",
    "label": "string",
    "book": "string",
    "private": "boolean"
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

### POST /api/Tagging/\_getLabelsByBook

**Description:** Returns all labels of public tags associated with book along with private tags created by user associated with book.

**Requirements:**

* book exists
* user exists

**Effects:**

* returns all labels of public tags associated with book along with private tags created by user associated with book.

**Request Body:**

```json
{
  "user": "string",
  "book": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "label": "string",
    "count": "number"
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

### POST /api/Tagging/\_getBooksByLabel

**Description:** Returns all books with every one of the labels in labels, including labels of private tags by user.

**Requirements:**

* user exists
* labels array is not empty
* type is either 'intersect' or 'union'

**Effects:**

* returns all books with every one of the labels in labels, including labels of private tags by user

**Request Body:**

```json
{
  "user": "string",
  "labels": [
    "string"
  ],
  "type": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "book": "string",
    "tagCount": "number"
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

### POST /api/Tagging/\_getTagsByUser

**Description:** Returns all tags created by user.

**Requirements:**

* user exists

**Effects:**

* returns all tags created by user

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "user": "string",
    "label": "string",
    "book": "string",
    "private": "boolean"
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

### POST /api/Tagging/\_getLabelsByUser

**Description:** Returns all labels created by user.

**Requirements:**

* user exists

**Effects:**

* returns all labels created by user

**Request Body:**

```json
{
  "user": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "label": "string",
    "count": "number"
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

### POST /api/Tagging/\_getAllPublicTags

**Description:** Returns all public tags in database.

**Requirements:**

* true

**Effects:**

* returns all public tags in database

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "user": "string",
    "label": "string",
    "book": "string",
    "private": "boolean"
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

### POST /api/Tagging/\_getAllTags

**Description:** Returns all tags in database.

**Requirements:**

* true

**Effects:**

* returns all tags in database

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "user": "string",
    "label": "string",
    "book": "string",
    "private": "boolean"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
