---
timestamp: 'Mon Oct 20 2025 11:40:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_114028.5bea0c3b.md]]'
content_id: 5d7deb11b642b3f2e6f587aadd3ac31cb70f0e22ca8cd325dc2596825495e7f0
---

# API Specification: Upvoting Concept

**Purpose:** use crowd-sourced approval to rank items

***

## API Endpoints

### POST /api/Upvoting/upvote

**Description:** Records an upvote by a user for an item and increments the item's upvote count.

**Requirements:**

* user exists, item exists, user has not already upvoted this item

**Effects:**

* creates a new Upvote `u`
* sets `u`'s user to `user`, item to `item`, timestamp to current time
* increments `item`'s `upvoteCount`
* returns `u` as `upvote`

**Request Body:**

```json
{
  "user": "string",
  "item": "string"
}
```

**Success Response Body (Action):**

```json
{
  "upvote": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Upvoting/removeUpvote

**Description:** Removes an existing upvote by a user for an item and decrements the item's upvote count.

**Requirements:**

* user exists, item exists, user has upvoted this item

**Effects:**

* deletes the Upvote by `user` for `item`
* decrements `item`'s `upvoteCount`

**Request Body:**

```json
{
  "user": "string",
  "item": "string"
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

### POST /api/Upvoting/\_getUpvoteCount

**Description:** Retrieves the total number of upvotes for a specific item.

**Requirements:**

* item exists

**Effects:**

* returns the total `upvoteCount` for `item`

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

### POST /api/Upvoting/\_getUsersWhoUpvoted

**Description:** Retrieves the set of users who have upvoted a specific item.

**Requirements:**

* item exists

**Effects:**

* returns the set of users who have upvoted `item`

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
    "user": "string"
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

### POST /api/Upvoting/\_hasUserUpvoted

**Description:** Checks if a specific user has upvoted a specific item.

**Requirements:**

* user exists, item exists

**Effects:**

* returns true if `user` has upvoted `item`, false otherwise

**Request Body:**

```json
{
  "user": "string",
  "item": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "hasUpvoted": "boolean"
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
