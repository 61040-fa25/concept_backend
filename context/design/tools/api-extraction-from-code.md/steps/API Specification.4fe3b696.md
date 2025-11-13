---
timestamp: 'Tue Oct 21 2025 15:22:00 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_152200.9dc3cfc0.md]]'
content_id: 4fe3b6960cbc452cecf35f2356399b2e9264881f363dd213b5c33c6fe633d1d5
---

# API Specification: Upvoting Concept

**Purpose:** to rank items by popularity

***

## API Endpoints

### POST /api/Upvoting/upvote

**Description:** Adds a user's upvote to an item.

**Requirements:**

* No vote by `user` for `item` already exists.

**Effects:**

* A vote by `user` for `item` is added to the `Votes` set.

**Request Body:**

```json
{
  "user": "ID",
  "item": "ID"
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

### POST /api/Upvoting/unvote

**Description:** Removes a user's upvote from an item.

**Requirements:**

* A vote by `user` for `item` must exist.

**Effects:**

* The vote by `user` for `item` is removed from the `Votes` set.

**Request Body:**

```json
{
  "user": "ID",
  "item": "ID"
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

### POST /api/Upvoting/\_getUpvotessByUser

**Description:** Returns all votes made by a specific user.

**Requirements:**

* true

**Effects:**

* Returns all votes from `user`.

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
    "_id": "ID",
    "user": "ID",
    "target": "ID"
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

### POST /api/Upvoting/\_getUpvotesByItem

**Description:** Returns all votes associated with a specific item.

**Requirements:**

* true

**Effects:**

* Returns all votes on an `item`.

**Request Body:**

```json
{
  "item": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "user": "ID",
    "target": "ID"
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

### POST /api/Upvoting/\_getAllUpvotes

**Description:** Returns all votes in the system.

**Requirements:**

* true

**Effects:**

* Returns all votes.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "ID",
    "user": "ID",
    "target": "ID"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
