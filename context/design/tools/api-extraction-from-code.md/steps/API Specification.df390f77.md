---
timestamp: 'Mon Oct 20 2025 14:35:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_143514.162ea7c4.md]]'
content_id: df390f77f9415562770b4ce4250062f2f97172f8f2236f9d60b295b06135820b
---

# API Specification: Labeling Concept

**Purpose:** associate labels with generic items to enable categorization and retrieval.

***

## API Endpoints

### POST /api/Labeling/createLabel

**Description:** Creates a new label with a specified name.

**Requirements:**

* no Label with the given `name` already exists

**Effects:**

* creates a new Label `l`
* sets the name of `l` to `name`
* returns `l` as `label`

**Request Body:**

```json
{
  "name": "String"
}
```

**Success Response Body (Action):**

```json
{
  "label": "ID"
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

**Description:** Associates a given label with a specific item.

**Requirements:**

* Not explicitly specified in the provided concept snippet.

**Effects:**

* Not explicitly specified in the provided concept snippet.

**Request Body:**

```json
{
  "item": "ID",
  "label": "ID"
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

**Description:** Removes the association of a given label from a specific item.

**Requirements:**

* Not explicitly specified in the provided concept snippet.

**Effects:**

* Not explicitly specified in the provided concept snippet.

**Request Body:**

```json
{
  "item": "ID",
  "label": "ID"
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
