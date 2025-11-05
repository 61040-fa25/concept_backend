---
timestamp: 'Tue Nov 04 2025 18:41:52 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_184152.a2f9a903.md]]'
content_id: b8e19b85bd2defffddece2e4b872d2a95aeb9f395b1a50b1ef918d93eaccf0e8
---

# response:

````markdown
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
````

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

***

```
```
