---
timestamp: 'Mon Oct 20 2025 13:58:55 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_135855.c1725f6a.md]]'
content_id: 58748f8d73ae45027fc012fcf31e21771063c77dff500327810e80ce85bac7e0
---

# API Specification: Labeling Concept

**Purpose:** Manage the association of labels with generic items, allowing for flexible organization and retrieval.

***

## API Endpoints

### POST /api/Labeling/createLabel

**Description:** Creates a new label with a specified name.

**Requirements:**

* No Label with the given `name` already exists.

**Effects:**

* Creates a new Label `l`.
* Sets the name of `l` to `name`.
* Returns `l` as `label`.

**Request Body:**

```json
{
  "name": "string"
}
```

**Success Response Body (Action):**

```json
{
  "label": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Labeling/addLabel

**Description:** Associates an existing item with an existing label.

**Requirements:**

* None specified. (Implicitly, the `item` and `label` must exist for this operation to make sense in a real system, but not stated in the concept spec snippet).

**Effects:**

* Adds the specified `label` to the set of labels associated with the `item`.

**Request Body:**

```json
{
  "item": "string",
  "label": "string"
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

### POST /api/Labeling/deleteLabel

**Description:** Removes the association of a specific label from an item.

**Requirements:**

* None specified. (Implicitly, the `item` and `label` must exist and be associated).

**Effects:**

* Removes the specified `label` from the set of labels associated with the `item`.

**Request Body:**

```json
{
  "item": "string",
  "label": "string"
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
