---
timestamp: 'Tue Oct 21 2025 10:09:38 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_100938.dd290a1d.md]]'
content_id: 2f0516252a843dec83826b12e54d55a8d93aec6be4c9e5d5b0b9e9e95431c101
---

# API Specification: Feedback Concept

**Purpose:** To highlight differences between practice video and reference choreography.

***

## API Endpoints

### POST /api/Feedback/analyze

**Description:** Compares practice PoseData to reference PoseData, creates and stores Feedback.

**Requirements:**

* Both referenceVideo and practiceVideo IDs must refer to existing videos (assumed valid inputs by this concept).
* Both referencePoseData and practicePoseData must be provided for the analysis.

**Effects:**

* A new feedback record is created and its ID is returned.
* Returns the ID of the newly created feedback record, or an error if validation fails.

**Request Body:**

```json
{
  "referenceVideo": "string",
  "practiceVideo": "string",
  "referencePoseData": {
    "keypointName1": [
      {
        "x": "number",
        "y": "number",
        "z": "number (optional)",
        "score": "number"
      }
    ],
    "keypointName2": [...]
  },
  "practicePoseData": {
    "keypointName1": [
      {
        "x": "number",
        "y": "number",
        "z": "number (optional)",
        "score": "number"
      }
    ],
    "keypointName2": [...]
  }
}
```

**Success Response Body (Action):**

```json
{
  "feedback": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Feedback/getFeedback

**Description:** Retrieves the feedback text and accuracy value for a specific feedback record.

**Requirements:**

* The feedback record with the given ID must exist.

**Effects:**

* Returns an object containing the feedback text and accuracy value, or an error if not found.

**Request Body:**

```json
{
  "feedback": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "feedbackText": "string",
    "accuracyValue": "number"
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
