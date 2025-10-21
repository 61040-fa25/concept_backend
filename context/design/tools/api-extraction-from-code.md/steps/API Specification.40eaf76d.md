---
timestamp: 'Tue Oct 21 2025 09:51:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_095145.5fb4b770.md]]'
content_id: 40eaf76d29ac40d2df370faf26a380e8322f0c118f52881b209b14b5ccd16e4f
---

# API Specification: Labeling Concept

**Purpose:** To associate labels with generic items and manage these associations.

***

## API Endpoints

### POST /api/Labeling/createLabel

**Description:** Creates a new label with a unique name.

**Requirements:**

* no Label with the given `name` already exists

**Effects:**

* creates a new Label `l`
* sets the name of `l` to `name`
* returns `l` as `label`

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

**Description:** Associates an existing label with a given item.

**Requirements:**

* item exists
* label exists

**Effects:**

* adds `label` to the set of labels associated with `item`

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

**Description:** Removes an existing label from association with a given item.

**Requirements:**

* item exists
* label exists
* label is currently associated with item

**Effects:**

* removes `label` from the set of labels associated with `item`

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
