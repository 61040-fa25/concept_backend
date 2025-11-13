---
timestamp: 'Tue Oct 28 2025 21:18:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251028_211829.6336ef5d.md]]'
content_id: 32c8e3df9de82e259a472795dc9fd6dca21f7866bc0917934e9f90b4ba5d3133
---

# API Specification: Shelving Concept

**Purpose:** to label books to assist in searching and organization

***

## API Endpoints

### POST /api/Shelving/addBook

**Description:** Adds a book to the given shelf.

**Requirements:**

* book is not on any of the user's shelves

**Effects:**

* adds book to the shelf specified

**Request Body:**

```json
{
  "user": "string",
  "status": "number",
  "book": "string"
}
```

**Success Response Body (Action):**

```json
{
  "shelf": "string"
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

**Description:** Removes a book from the given shelf.

**Requirements:**

* book is on a shelf

**Effects:**

* removes book from shelf

**Request Body:**

```json
{
  "shelf": "string"
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

**Description:** Moves book to a different shelf.

**Requirements:**

* book is on a shelf

**Effects:**

* moves book to the shelf specified by the user

**Request Body:**

```json
{
  "shelf": "string",
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

### POST /api/Shelving/getUserShelfByBook

**Description:** returns status user added to book.

**Requirements:**

* None specified.

**Effects:**

* None specified.

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
  "number"
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Shelving/getShelvesByBook

**Description:** returns all Shelves added to book, grouped by status.

**Requirements:**

* None specified.

**Effects:**

* None specified.

**Request Body:**

```json
{
  "book": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "status": "number",
    "shelves": [
      {
        "_id": "string",
        "user": "string",
        "status": "number",
        "book": "string"
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

### POST /api/Shelving/getBooksByUser

**Description:** returns all books user has shelved, grouped by status.

**Requirements:**

* None specified.

**Effects:**

* None specified.

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
    "status": "number",
    "shelves": [
      "string"
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

### POST /api/Shelving/getAllShelves

**Description:** returns all Shelves in set, grouped by status.

**Requirements:**

* None specified.

**Effects:**

* None specified.

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
        "_id": "string",
        "user": "string",
        "status": "number",
        "book": "string"
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
