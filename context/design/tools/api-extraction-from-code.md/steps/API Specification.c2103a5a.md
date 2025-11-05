---
timestamp: 'Tue Nov 04 2025 18:49:06 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_184906.8ee335cd.md]]'
content_id: c2103a5a2e4f9cefa37a7ef91f0d783733b02ba7605c3f9f942607b0fbcd669a
---

# API Specification: Feedback Concept

**Purpose:** To highlight differences between practice video and reference choreography.

***

## API Endpoints

### POST /api/Feedback/analyze

**Description:** Action: Compares practice PoseData to reference PoseData, creates and stores Feedback.

**Requirements:**

* Both `referenceVideoId` and `practiceVideoId` IDs must refer to existing videos (assumed valid inputs by this concept).
* Both `referencePoseData` and `practicePoseData` must be provided for the analysis.

**Effects:**

* A new feedback record is created and its ID is returned.

**Request Body:**

```json
{
  "referenceVideoId": "string",
  "practiceVideoId": "string",
  "referencePoseData": [
    {
      "0": { "x": "number", "y": "number", "z": "number" },
      "11": { "x": "number", "y": "number", "z": "number" }
      // ... other landmark indices as string keys
    }
  ],
  "practicePoseData": [
    {
      "0": { "x": "number", "y": "number", "z": "number" },
      "11": { "x": "number", "y": "number", "z": "number" }
      // ... other landmark indices as string keys
    }
  ]
}
```

*Note: `referencePoseData` and `practicePoseData` are arrays of pose objects, where each pose object maps landmark indices (as strings) to their 3D coordinates. The example above shows the structure for two common landmarks.*

**Success Response Body (Action):**

```json
{
  "feedback": "string",
  "feedbackText": "string"
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

**Description:** Query: Retrieves the feedback text and accuracy value for a specific feedback record.

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

### POST /api/Feedback/findFeedback

**Description:** Query: Find feedback by referenceVideo and practiceVideo.

**Requirements:**

* A feedback record matching both `referenceVideo` and `practiceVideo` must exist.

**Effects:**

* Returns the feedback document or an error if not found.

**Request Body:**

```json
{
  "referenceVideo": "string",
  "practiceVideo": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "feedbackDoc": {
      "_id": "string",
      "referenceVideo": "string",
      "practiceVideo": "string",
      "feedbackText": "string",
      "accuracyValue": "number",
      "frameScores": "number[]",
      "worstFrames": "number[]"
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
