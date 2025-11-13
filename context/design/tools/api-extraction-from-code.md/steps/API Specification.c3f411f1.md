---
timestamp: 'Tue Oct 28 2025 21:20:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251028_212058.7f1d6c88.md]]'
content_id: c3f411f1f55a63dc20b448e53d7c7d790d5b28e0354b62e64ce37cf3ef09eea9
---

# API Specification: Shelving Concept

**Purpose:** to label books to assist in searching and organization

***

## API Endpoints

### POST /api/Shelving/addBook

**Description:** Adds a book to the given shelf

**Requirements:**

* book is not on any of the user's shelves

**Effects:**

* adds book to the shelf specified, 0 means want to read, 1 means currently reading, 2 means read, 3 means did not finish

**Request Body:**

```json
{
  "user": "ID",
  "status": "number",
  "book": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "shelf": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Shelving/removeBook

**Description:** Removes a book from the given shelf

**Requirements:**

* book is on a shelf

**Effects:**

* removes book from shelf

**Request Body:**

```json
{
  "shelf": "ID"
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

### POST /api/Shelving/changeStatus

**Description:** Moves book to a different shelf

**Requirements:**

* book is on a shelf

**Effects:**

* moves book to the shelf specified by the user

**Request Body:**

```json
{
  "shelf": "ID",
  "newStatus": "number"
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

### POST /api/Shelving/\_getUserShelfByBook

**Description:** returns status user added to book

**Requirements:**

* None.

**Effects:**

* None.

**Request Body:**

```json
{
  "user": "ID",
  "book": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "status": "number"
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

### POST /api/Shelving/\_getShelvesByBook

**Description:** returns all Shelves added to book, grouped by status

**Requirements:**

* None.

**Effects:**

* None.

**Request Body:**

```json
{
  "book": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "status": "number",
    "shelves": [
      {
        "_id": "ID",
        "user": "ID",
        "status": "number",
        "book": "ID"
      }
    ]
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

### POST /api/Shelving/\_getBooksByUser

**Description:** returns all books user has shelved, grouped by status

**Requirements:**

* None.

**Effects:**

* None.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "status": "number",
    "shelves": [
      "ID"
    ]
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

### POST /api/Shelving/\_getAllShelves

**Description:** returns all Shelves in set, grouped by status

**Requirements:**

* None.

**Effects:**

* None.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "status": "number",
    "shelves": [
      {
        "_id": "ID",
        "user": "ID",
        "status": "number",
        "book": "ID"
      }
    ]
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
