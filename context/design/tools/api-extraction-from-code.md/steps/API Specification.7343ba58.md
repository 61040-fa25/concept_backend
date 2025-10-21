---
timestamp: 'Tue Oct 21 2025 10:14:13 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_101413.7b15f38d.md]]'
content_id: 7343ba58c6ccd944c85f3b2e297daedcfdf5577cb53d9f2866a4e8e79c6ce084
---

# API Specification: PoseBreakdown Concept

**Purpose:** extract poses from videos and represent them as collections of parts and points, which can later be compared

***

## API Endpoints

### POST /api/PoseBreakdown/extractPoses

**Description:** Processes a video source to detect and extract human poses frame by frame, storing the detected pose data. Note: The `videoSource` argument is expected to be a video URL string when interacting with the API.

**Requirements:**

* The video exists and can be processed.

**Effects:**

* Processes each frame.
* Runs pose detection on each frame.
* Stores `PoseData` for each detected pose.
* Returns the generated `poseIDs` for all stored poses.

**Request Body:**

```json
{
  "videoSource": "string"
}
```

**Success Response Body (Action):**

```json
{
  "poseIDs": [
    "string"
  ]
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/PoseBreakdown/\_getPoseData

**Description:** Retrieves the detailed pose data (including parts and their point coordinates) for a specific pose identifier.

**Requirements:**

* The `poseID` must correspond to a previously extracted and stored pose.

**Effects:**

* If the `poseID` exists, returns an array containing the `PoseData` object associated with it.
* If the `poseID` does not exist, returns an empty array.

**Request Body:**

```json
{
  "poseID": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "poseID": "string",
    "partData": [
      {
        "part": "string",
        "pointData": {
          "x": "number",
          "y": "number",
          "z": "number"
        }
      }
    ]
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
