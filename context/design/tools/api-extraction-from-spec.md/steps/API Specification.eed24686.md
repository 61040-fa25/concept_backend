---
timestamp: 'Mon Oct 20 2025 14:50:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_145018.15ced8ab.md]]'
content_id: eed24686c321816cfc67c9e05ceb20c12a2742079ed3f3b88c698a834898e0bd
---

# API Specification: ScheduleTime

**Purpose:** define a sequence of time slots that comprise a scheduled period.

***

## API Endpoints

### POST /api/ScheduleTime/addSlot

**Description:** Adds a new time slot to the end of the scheduled sequence.

**Requirements:**

* slot is not in the sequence

**Effects:**

* add slot to the end of the sequence

**Request Body:**

```json
{
  "slot": "Slot"
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

### POST /api/ScheduleTime/insertSlot

**Description:** Inserts a new time slot immediately before an existing slot in the sequence.

**Requirements:**

* slot is not in the sequence and beforeSlot is in the sequence

**Effects:**

* insert slot immediately before beforeSlot in the sequence

**Request Body:**

```json
{
  "slot": "Slot",
  "beforeSlot": "Slot"
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

### POST /api/ScheduleTime/removeSlot

**Description:** Removes a specific time slot from the scheduled sequence.

**Requirements:**

* slot is in the sequence

**Effects:**

* remove slot from the sequence

**Request Body:**

```json
{
  "slot": "Slot"
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

### POST /api/ScheduleTime/\_getSlots

**Description:** Retrieves all time slots in their defined order.

**Requirements:**

* true

**Effects:**

* returns all slots in the sequence in their defined order

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "slot": "Slot"
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
