---
timestamp: 'Mon Oct 20 2025 11:40:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_114028.5bea0c3b.md]]'
content_id: a8318abc44f6144fec15d66a4a203ef9e2826435b43cd61270f09179de59d842
---

# API Specification: Tagging Concept

**Purpose:** categorize items with keywords for easier organization and retrieval

***

## API Endpoints

### POST /api/Tagging/createTag

**Description:** Creates a new tag with a unique name.

**Requirements:**

* no Tag with `name` already exists

**Effects:**

* creates a new Tag `t`
* sets `t`'s name to `name`
* returns `t` as `tag`

**Request Body:**

```json
{
  "name": "string"
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

### POST /api/Tagging/addTag

**Description:** Associates an existing tag with an item.

**Requirements:**

* item exists, tag exists, item does not already have tag

**Effects:**

* associates `tag` with `item`

**Request Body:**

```json
{
  "item": "string",
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

### POST /api/Tagging/removeTag

**Description:** Dissociates an existing tag from an item.

**Requirements:**

* item exists, tag exists, item currently has tag

**Effects:**

* dissociates `tag` from `item`

**Request Body:**

```json
{
  "item": "string",
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

### POST /api/Tagging/\_getItemsByTag

**Description:** Retrieves all items associated with a specific tag.

**Requirements:**

* tag exists

**Effects:**

* returns all items associated with `tag`

**Request Body:**

```json
{
  "tag": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "item": "string"
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

### POST /api/Tagging/\_getTagsForItem

**Description:** Retrieves all tags associated with a specific item.

**Requirements:**

* item exists

**Effects:**

* returns all tags associated with `item`, including their names

**Request Body:**

```json
{
  "item": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "tag": "string",
    "name": "string"
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
