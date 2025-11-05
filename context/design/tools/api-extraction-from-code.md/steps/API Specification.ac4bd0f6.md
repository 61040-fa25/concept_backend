---
timestamp: 'Tue Nov 04 2025 18:53:27 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_185327.22803dde.md]]'
content_id: ac4bd0f6983b96486fd73c92e9f7a61e0e2708cdb87ce05840813f42761ae1d3
---

# API Specification: ManageVideo Concept

**Purpose:** To allow dancers and choreographers to upload and manage practice/reference videos, storing the actual video files in Google Cloud Storage and their metadata in MongoDB.

***

## API Endpoints

### POST /api/ManageVideo/upload

**Description:** Uploads a video file to Google Cloud Storage and records its metadata in MongoDB.

**Requirements:**

* videoType must be 'practice' or 'reference'.
* file must be a valid File object.

**Effects:**

* A new video entry is created in MongoDB with a GCS URL, and the video file is uploaded to GCS.

**Request Body:**

```json
{
  "owner": "string",
  "videoType": "string ('practice' | 'reference')",
  "file": "string (base64 encoded file content)",
  "videoName": "string (optional)",
  "referenceVideoId": "string (optional)"
}
```

**Success Response Body (Action):**

```json
{
  "video": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ManageVideo/addPosesToVideo

**Description:** Adds pose data and optional frame range to a video.

**Requirements:**

* Video with the given ID must exist.
* The caller must be the owner of the video.
* poseData must be an array of PoseData objects or a valid JSON string representing such an array.

**Effects:**

* The poseData and optionally matchingFrames fields of the specified video are updated.

**Request Body:**

```json
{
  "video": "string",
  "poseData": [
    {}
  ],
  "caller": "string",
  "matchingFrames": {
    "referenceStartFrame": "number",
    "referenceEndFrame": "number",
    "practiceStartFrame": "number",
    "practiceEndFrame": "number"
  } (optional)
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

### POST /api/ManageVideo/retrieve

**Description:** Retrieves video metadata and its Google Cloud Storage URL.

**Requirements:**

* The video must exist.
* The caller must be the owner of the video.

**Effects:**

* Returns the video type, GCS URL, and associated feedback (IDs).

**Request Body:**

```json
{
  "video": "string",
  "caller": "string"
}
```

**Success Response Body (Action):**

```json
{
  "videoId": "string",
  "videoType": "string ('practice' | 'reference')",
  "gcsUrl": "string",
  "videoName": "string",
  "referenceVideoId": "string",
  "feedback": "string | null",
  "poseData": [
    {}
  ],
  "matchingFrames": {
    "referenceStartFrame": "number",
    "referenceEndFrame": "number",
    "practiceStartFrame": "number",
    "practiceEndFrame": "number"
  } (optional)
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ManageVideo/streamVideo

**Description:** Streams the actual video file from Google Cloud Storage.

**Requirements:**

* The video must exist.
* The caller must be the owner of the video.

**Effects:**

* Streams video data directly to the client.

**Request Body:**

```json
{
  "video": "string",
  "caller": "string"
}
```

**Success Response Body (Action):**
*Note: This endpoint returns a raw video stream (e.g., `video/mp4`), not a JSON object.*

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ManageVideo/delete

**Description:** Deletes a video from MongoDB and Google Cloud Storage.

**Requirements:**

* The video must exist.
* The caller must be the owner of the video.

**Effects:**

* The video document is removed from MongoDB and the video file is deleted from GCS.

**Request Body:**

```json
{
  "video": "string",
  "caller": "string"
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

### POST /api/ManageVideo/setMatchingFrames

**Description:** Set the matchingFrames of a video.

**Requirements:**

* Video with the given ID must exist.
* The caller must be the owner of the video.

**Effects:**

* The matchingFrames field of the specified video is updated.

**Request Body:**

```json
{
  "video": "string",
  "caller": "string",
  "referenceStartFrame": "number",
  "referenceEndFrame": "number",
  "practiceStartFrame": "number",
  "practiceEndFrame": "number"
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

### POST /api/ManageVideo/storeFeedback

**Description:** Stores feedback ID associated with a video.

**Requirements:**

* Video with the given ID must exist.
* The caller must be the owner of the video.

**Effects:**

* The feedback field of the specified video is updated with `feedbackId`.

**Request Body:**

```json
{
  "video": "string",
  "feedbackId": "string",
  "caller": "string"
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

### POST /api/ManageVideo/getOwnedVideos

**Description:** Retrieves all video documents owned by a specific user.

**Requirements:**

* None.

**Effects:**

* Returns an array of VideoDoc objects.

**Request Body:**

```json
{
  "owner": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "owner": "string",
    "videoType": "string ('practice' | 'reference')",
    "videoName": "string",
    "referenceVideoId": "string",
    "gcsUrl": "string",
    "gcsFileName": "string",
    "feedback": "string | null",
    "poseData": [
      {}
    ],
    "matchingFrames": {
      "referenceStartFrame": "number",
      "referenceEndFrame": "number",
      "practiceStartFrame": "number",
      "practiceEndFrame": "number"
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

### POST /api/ManageVideo/getPracticeVideos

**Description:** Retrieves all practice video documents associated with a specific reference video.

**Requirements:**

* None.

**Effects:**

* Returns an array of VideoDoc objects filtered by `referenceVideoId` and `videoType` 'practice'.

**Request Body:**

```json
{
  "referenceVideoId": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "owner": "string",
    "videoType": "string ('practice' | 'reference')",
    "videoName": "string",
    "referenceVideoId": "string",
    "gcsUrl": "string",
    "gcsFileName": "string",
    "feedback": "string | null",
    "poseData": [
      {}
    ],
    "matchingFrames": {
      "referenceStartFrame": "number",
      "referenceEndFrame": "number",
      "practiceStartFrame": "number",
      "practiceEndFrame": "number"
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

### POST /api/ManageVideo/getAllReferenceVideos

**Description:** Retrieves all reference video documents owned by the caller.

**Requirements:**

* None.

**Effects:**

* Returns an array of VideoDoc objects filtered by `owner` and `videoType` 'reference'.

**Request Body:**

```json
{
  "caller": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "_id": "string",
    "owner": "string",
    "videoType": "string ('practice' | 'reference')",
    "videoName": "string",
    "referenceVideoId": "string",
    "gcsUrl": "string",
    "gcsFileName": "string",
    "feedback": "string | null",
    "poseData": [
      {}
    ],
    "matchingFrames": {
      "referenceStartFrame": "number",
      "referenceEndFrame": "number",
      "practiceStartFrame": "number",
      "practiceEndFrame": "number"
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
