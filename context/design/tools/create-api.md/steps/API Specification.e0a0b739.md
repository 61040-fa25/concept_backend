---
timestamp: 'Fri Oct 24 2025 19:52:50 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251024_195250.2119a567.md]]'
content_id: e0a0b7390c246a38c7897932634a620afefa904bb009d0d1f9ca209b7a5fe7c1
---

# API Specification: Library Concept

**Purpose:** allow users to add, remove, view, and access their uploaded documents

***

## API Endpoints

### POST /api/Library/createLibrary

**Description:** Creates a new library for a user.

**Requirements:**

* The user must not already be associated with a library.

**Effects:**

* Creates a new library linked to the user with an empty set of documents.
* Returns the ID of the newly created library.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "library": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Library/removeDocument

**Description:** Removes a document from a user's library and deletes the document record.

**Requirements:**

* The library must exist.
* The document must be present in the specified library.

**Effects:**

* Removes the document's ID from the library's documents set.
* Deletes the document record from the set of all documents.

**Request Body:**

```json
{
  "library": "ID",
  "document": "ID"
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

### POST /api/Library/createDocument

**Description:** Creates a new document and adds it to a user's library.

**Requirements:**

* The library must exist.
* A document with the given name must not already exist in the specified library.

**Effects:**

* Creates a new document record with the provided name and epub content.
* Adds the new document's ID to the library's documents set.
* Returns the ID of the newly created document.

**Request Body:**

```json
{
  "name": "string",
  "epubContent": "string",
  "library": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "document": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Library/renameDocument

**Description:** Changes the name of an existing document within a user's library.

**Requirements:**

* The document must exist.
* The document must be associated with a library owned by the specified user.
* The newName must not be the name of an existing document within that user's library (excluding the document being renamed).

**Effects:**

* Changes the specified document's name to the newName.
* Returns the ID of the updated document.

**Request Body:**

```json
{
  "user": "ID",
  "newName": "string",
  "document": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "document": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Library/openDocument

**Description:** Confirms a document is accessible to a user.

**Requirements:**

* The user must be in a library that contains the specified document.

**Effects:**

* Confirms the document is accessible to the user (no state change explicitly tracked by this concept for "open" status).
* Returns the ID of the document.

**Request Body:**

```json
{
  "user": "ID",
  "document": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "document": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Library/closeDocument

**Description:** Confirms a document is no longer actively being accessed by a user.

**Requirements:**

* The user must be in a library that contains the specified document.

**Effects:**

* Confirms the document is no longer actively being accessed by the user (no state change explicitly tracked by this concept for "close" status).
* Returns the ID of the document.

**Request Body:**

```json
{
  "user": "ID",
  "document": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "document": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Library/\_getLibraryByUser

**Description:** Retrieves the library document associated with a specific user.

**Requirements:**

* The user must exist and have a library.

**Effects:**

* Returns the full library document for the specified user.

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
    "library": {
      "_id": "ID",
      "user": "ID",
      "documents": ["ID"]
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

***

### POST /api/Library/\_getDocumentsInLibrary

**Description:** Retrieves all documents (including their content) that are part of a given library.

**Requirements:**

* The library must exist.

**Effects:**

* Returns an array of document objects, each containing its ID, name, and epub content, for all documents in the specified library.

**Request Body:**

```json
{
  "library": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "document": {
      "_id": "ID",
      "name": "string",
      "epubContent": "string"
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

***

### POST /api/Library/\_getDocumentDetails

**Description:** Retrieves the full details (name, epubContent) of a specific document.

**Requirements:**

* The document must exist.

**Effects:**

* Returns the document object containing its ID, name, and epub content.

**Request Body:**

```json
{
  "document": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "document": {
      "_id": "ID",
      "name": "string",
      "epubContent": "string"
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

***
