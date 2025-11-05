```markdown
# NOTE: not using PoseBreakdown API since PoseLandmarker setup does connect with the frontend if it's initialized in the backend. Move all poseBreakdown methods to mirror-motion-vue-app\src\services\poseBreakdownService.js in the frontend app

# API Specification: PoseBreakdown Concept

**Purpose:** extract poses from videos and represent them as collections of parts and points, which can later be compared

---

## API Endpoints

### POST /api/PoseBreakdown/extractPoses

**Description:** Processes a video source to extract poses from each frame, stores the resulting pose data, and returns the generated IDs for the extracted poses.

**Requirements:**
- The video exists and can be processed.

**Effects:**
- Processes each frame.
- Runs pose detection.
- Stores PoseData for each frame.
- Returns their generated IDs.

**Request Body:**
```json
{
  "videoSource": "string"
}
```

**Success Response Body (Action):**
```json
{
  "poseIDs": ["string"]
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
```