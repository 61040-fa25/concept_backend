
# API Specification: PoseBreakdown Concept

**Purpose:** extract poses from videos and represent them as collections of parts and points, which can later be compared

---

## API Endpoints

### POST /api/PoseBreakdown/extractPoses

**Description:** Processes a video source to detect and extract human poses frame by frame, storing the detected pose data. Note: The `videoSource` argument is expected to be a video URL string when interacting with the API.

**Requirements:**
- The video exists and can be processed.

**Effects:**
- Processes each frame.
- Runs pose detection on each frame.
- Stores `PoseData` for each detected pose.
- Returns the generated `poseIDs` for all stored poses.

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

---

### POST /api/PoseBreakdown/_getPoseData

**Description:** Retrieves the detailed pose data (including parts and their point coordinates) for a specific pose identifier.

**Requirements:**
- The `poseID` must correspond to a previously extracted and stored pose.

**Effects:**
- If the `poseID` exists, returns an array containing the `PoseData` object associated with it.
- If the `poseID` does not exist, returns an empty array.

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