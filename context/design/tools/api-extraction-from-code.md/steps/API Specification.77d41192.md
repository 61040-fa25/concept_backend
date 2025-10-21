---
timestamp: 'Tue Oct 21 2025 10:10:35 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_101035.724314e7.md]]'
content_id: 77d41192034cad5a8856b1fd9be39965aef8a779ac524bf7bb783321145b4789
---

# API Specification: ManageVideo Concept

**Purpose:** To allow dancers and choreographers to upload and manage practice/reference videos, storing the actual video files in Google Cloud Storage and their metadata in MongoDB.

***

## API Endpoints

### POST /api/ManageVideo/upload

**Description:** Uploads a video file to Google Cloud Storage and records its metadata in MongoDB.

**Requirements:**

* `videoType` must be 'practice' or 'reference'.
* `filePath` must point to an existing, readable video file.

**Effects:**

* A new video entry is created in MongoDB with a GCS URL, and the video file is uploaded to GCS.

**Request Body:**

```json
{
  "owner": "string",
  "videoType": "practice" | "reference",
  "filePath": "string"
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
  "videoType": "practice" | "reference",
  "gcsUrl": "string",
  "feedback": ["string"]
}
```

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

### POST /api/ManageVideo/\_getOwnedVideos

**Description:** Retrieves all video documents owned by a specific user.

**Requirements:**

* None explicitly stated, implies the user may or may not exist.

**Effects:**

* Returns an array of VideoDoc objects for the given owner.

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
    "videoType": "practice" | "reference",
    "gcsUrl": "string",
    "gcsFileName": "string",
    "feedback": ["string"]
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
