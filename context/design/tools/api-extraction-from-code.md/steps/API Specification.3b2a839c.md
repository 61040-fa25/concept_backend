---
timestamp: 'Mon Oct 20 2025 11:35:35 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_113535.f6bd2851.md]]'
content_id: 3b2a839c3bcc3059d9b86fb3cc525f4a0a063f56bdd16aa8745a1634e45873e2
---

# API Specification: Labeling Concept

**Purpose:** To enable the categorization of items using user-defined labels and to facilitate the retrieval of items based on these labels.

***

## API Endpoints

### POST /api/Labeling/createLabel

**Description:** Creates a new label with a unique name that can then be associated with various items.

**Requirements:**

* The provided `name` must be a non-empty string.
* No `Label` with the given `name` should already exist within the concept's state.

**Effects:**

* A new `Label` entity (`l`) is created.
* The `name` property of `l` is set to the provided `name`.
* The unique identifier (`ID`) of the newly created label is returned as `label`.

**Request Body:**

```json
{
  "name": "string"
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

**Description:** Associates an existing label with a specific item.

**Requirements:**

* The `item` identified by `item` must exist (or be implicitly tracked if new to the concept).
* The `label` identified by `label` must exist within the concept's state.

**Effects:**

* The `label` is added to the set of labels associated with the `item`.
* If the `item` was not previously tracked by the concept, it is now tracked with the given `label`.
* If the `label` was already associated with the `item`, the state remains unchanged.

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

**Description:** Removes the association between a specific label and an item.

**Requirements:**

* The `item` identified by `item` must exist.
* The `label` identified by `label` must exist.
* The `item` must currently be associated with the `label`.

**Effects:**

* The `label` is removed from the set of labels associated with the `item`.
* If the `item` no longer has any associated labels after this operation, its tracking by the concept may cease, depending on specific implementation details (typically, only the association is removed).

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
