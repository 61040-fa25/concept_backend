---
timestamp: 'Sat Oct 18 2025 21:54:54 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_215454.4ee5dfb7.md]]'
content_id: fafbe041cb0e763597ea4024a46d4c994efde970d4761b1b458d2ab145e349b3
---

# response:

Here's the `ManageVideoConcept.ts` concept file and its corresponding test file `ManageVideoConcept.test.ts`, following the structure and style of the `LikertSurveyConcept` example.

For handling video files, instead of storing raw file data in MongoDB (which is generally not recommended for large files), we store a `fileURL` which would point to a cloud storage location like Google Cloud Storage, as hinted by your prompt.

### `src\initialCode\concepts\ManageVideo\ManageVideoConcept.ts`

```typescript
// file: src\initialCode\concepts\ManageVideo\ManageVideoConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts"; // Assuming @utils/types.ts exists in your project
import { freshID } from "@utils/database.ts"; // Assuming @utils/database.ts exists in your project

// Collection prefix to ensure namespace separation
const PREFIX = "ManageVideo" + ".";

// Generic types for the concept's external dependencies
type User = ID;
type Feedback = ID; // Assuming Feedback is an ID representing a Feedback document from another concept

// Internal entity types, represented as IDs
type Video = ID;

/**
 * Valid types for a video.
 */
export type VideoType = "practice" | "reference";

/**
 * State: A set of Videos, each with an owner, type, file URL, and associated feedback.
 */
interface VideoDoc {
  _id: Video;
  owner: User;
  videoType: VideoType;
  fileURL: string; // URL to the video file in cloud storage (e.g., Google Cloud Storage)
  feedbackIds: Feedback[]; // IDs of associated feedback documents
}

/**
 * @concept ManageVideo
 * @purpose To allow dancers and choreographers to upload and manage practice/reference videos.
 * @principle After uploading a video, it can be retrieved for analysis, syncing, or feedback.
 */
export default class ManageVideoConcept {
  videos: Collection<VideoDoc>;

  constructor(private readonly db: Db) {
    this.videos = this.db.collection(PREFIX + "videos");
  }

  /**
   * Action: Uploads a new video.
   * @param {string} fileURL - The URL to the video file in cloud storage.
   * @param {VideoType} videoType - The type of video ('practice' or 'reference').
   * @param {User} owner - The ID of the user uploading the video.
   * @requires videoType must be 'practice' or 'reference'.
   * @effects A new video entry is created, associated with the owner, and its ID is returned.
   */
  async upload(
    { fileURL, videoType, owner }: {
      fileURL: string;
      videoType: VideoType;
      owner: User;
    },
  ): Promise<{ video: Video } | { error: string }> {
    // The VideoType union type already enforces the 'practice' or 'reference' requirement statically.
    // If videoType was just a string, a runtime check would be needed here.

    const videoId = freshID() as Video;
    await this.videos.insertOne({
      _id: videoId,
      owner,
      videoType,
      fileURL,
      feedbackIds: [], // Initialize with no feedback
    });
    return { video: videoId };
  }

  /**
   * Action: Retrieves a video and its metadata.
   * @param {Video} video - The ID of the video to retrieve.
   * @param {User} caller - The ID of the user attempting to retrieve the video.
   * @returns {Promise<object>} An object containing videoType, fileURL, and feedbackIds, or an error.
   * @requires The video must exist.
   * @requires The caller must be the owner of the video.
   * @effects Returns the video's type, file URL, and associated feedback IDs.
   */
  async retrieve(
    { video, caller }: { video: Video; caller: User },
  ): Promise<
    | {
      videoType: VideoType;
      fileURL: string;
      feedbackIds: Feedback[];
    }
    | { error: string }
  > {
    const videoDoc = await this.videos.findOne({ _id: video });
    if (!videoDoc) {
      return { error: `Video with ID ${video} not found.` };
    }

    if (videoDoc.owner !== caller) {
      return { error: "Unauthorized: Caller is not the owner of this video." };
    }

    return {
      videoType: videoDoc.videoType,
      fileURL: videoDoc.fileURL,
      feedbackIds: videoDoc.feedbackIds,
    };
  }

  /**
   * Action: Deletes a video.
   * @param {Video} video - The ID of the video to delete.
   * @param {User} caller - The ID of the user attempting to delete the video.
   * @returns {Promise<Empty | { error: string }>} An empty object on success, or an error object.
   * @requires The video must exist.
   * @requires The caller must be the owner of the video.
   * @effects The video and its metadata are removed from the state.
   */
  async delete(
    { video, caller }: { video: Video; caller: User },
  ): Promise<Empty | { error: string }> {
    const videoDoc = await this.videos.findOne({ _id: video });
    if (!videoDoc) {
      return { error: `Video with ID ${video} not found.` };
    }

    if (videoDoc.owner !== caller) {
      return { error: "Unauthorized: Caller is not the owner of this video." };
    }

    const result = await this.videos.deleteOne({ _id: video });

    if (result.deletedCount === 0) {
      // This case should ideally not be hit if findOne succeeded, but is a safeguard.
      return { error: `Failed to delete video with ID ${video}.` };
    }

    return {};
  }

  // --- Internal/Helper Actions & Queries ---
  // These are not explicitly in the prompt's Actions but are good for managing the state,
  // especially for `feedbackIds` which is part of the `VideoDoc`.

  /**
   * Query: Retrieves all videos owned by a specific user.
   * @param {User} owner - The ID of the owner.
   * @returns {Promise<VideoDoc[]>} An array of video documents.
   */
  async _getVideosByOwner(
    { owner }: { owner: User },
  ): Promise<VideoDoc[]> {
    return await this.videos.find({ owner }).toArray();
  }

  /**
   * Query: Retrieves a specific video document by its ID.
   * @param {Video} videoId - The ID of the video.
   * @returns {Promise<VideoDoc | null>} The video document or null if not found.
   */
  async _getVideoById(
    { videoId }: { videoId: Video },
  ): Promise<VideoDoc | null> {
    return await this.videos.findOne({ _id: videoId });
  }

  /**
   * Action: Adds a feedback ID to a video's feedback list.
   * @param {Video} video - The ID of the video to add feedback to.
   * @param {Feedback} feedbackId - The ID of the feedback to associate.
   * @requires The video must exist.
   * @requires The feedbackId must not already be associated with the video.
   * @effects The feedbackId is added to the video's feedbackIds array.
   */
  async _addFeedbackToVideo(
    { video, feedbackId }: { video: Video; feedbackId: Feedback },
  ): Promise<Empty | { error: string }> {
    const videoDoc = await this.videos.findOne({ _id: video });
    if (!videoDoc) {
      return { error: `Video with ID ${video} not found.` };
    }

    if (videoDoc.feedbackIds.includes(feedbackId)) {
      return { error: `Feedback ID ${feedbackId} already associated with video ${video}.` };
    }

    await this.videos.updateOne(
      { _id: video },
      { $push: { feedbackIds: feedbackId } },
    );
    return {};
  }
}

```

### `src\initialCode\concepts\ManageVideo\ManageVideoConcept.test.ts`

```typescript
// file: src\initialCode\concepts\ManageVideo\ManageVideoConcept.test.ts

import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Collection, Db } from "npm:mongodb"; // Will be mocked for tests
import { ID, Empty } from "@utils/types.ts"; // Assuming @utils/types.ts exists
import { freshID } from "@utils/database.ts"; // This will generate real IDs; if predictable IDs are needed, mock this.

// --- Mock MongoDB Setup ---
// This mock simulates the behavior of MongoDB Collection and Db for testing purposes.
// It uses in-memory Maps to store data.
class MockCollection<T extends { _id: ID }> implements Partial<Collection<T>> {
  data: Map<ID, T> = new Map();
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  async insertOne(doc: T): Promise<any> {
    if (this.data.has(doc._id)) {
      // In a real MongoDB, this might throw a duplicate key error if _id is not unique.
      // For this mock, we ensure it doesn't overwrite.
      throw new Error(`MockCollection Error: Duplicate ID ${doc._id}`);
    }
    this.data.set(doc._id, { ...doc }); // Store a shallow clone
    return { acknowledged: true, insertedId: doc._id };
  }

  async findOne(filter: Partial<T>): Promise<T | null> {
    for (const doc of this.data.values()) {
      let match = true;
      for (const key in filter) {
        if ((doc as any)[key] !== filter[key]) {
          match = false;
          break;
        }
      }
      if (match) return { ...doc }; // Return a shallow clone
    }
    return null;
  }

  async find(filter: Partial<T>): Promise<{ toArray: () => Promise<T[]> }> {
    const results: T[] = [];
    for (const doc of this.data.values()) {
      let match = true;
      for (const key in filter) {
        // Basic filter matching. For more complex MongoDB queries ($in, $gt, etc.),
        // this mock would need to be extended.
        if ((doc as any)[key] !== filter[key]) {
          match = false;
          break;
        }
      }
      if (match) results.push({ ...doc });
    }
    return { toArray: async () => results };
  }

  async updateOne(filter: Partial<T>, update: any): Promise<any> {
    const docToUpdate = await this.findOne(filter);
    if (docToUpdate) {
      const originalId = docToUpdate._id;
      const updatedDoc = { ...docToUpdate, ...update.$set }; // Apply $set operations

      if (update.$push) { // Basic support for $push
        for (const field in update.$push) {
          const valueToPush = update.$push[field];
          const currentArray = (updatedDoc as any)[field] || [];
          (updatedDoc as any)[field] = [...currentArray, valueToPush];
        }
      }

      this.data.set(originalId, updatedDoc);
      return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    }
    return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
  }

  async deleteOne(filter: Partial<T>): Promise<any> {
    const docToDelete = await this.findOne(filter);
    if (docToDelete) {
      this.data.delete(docToDelete._id);
      return { acknowledged: true, deletedCount: 1 };
    }
    return { acknowledged: true, deletedCount: 0 };
  }

  clear() {
    this.data.clear();
  }
}

class MockDb implements Partial<Db> {
  collections: Map<string, MockCollection<any>> = new Map();

  collection<T extends { _id: ID }>(name: string): MockCollection<T> {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockCollection<T>(name));
    }
    return this.collections.get(name) as MockCollection<T>;
  }

  clearAllCollections() {
    this.collections.forEach((col) => col.clear());
  }
}
// --- End Mock MongoDB Setup ---

import ManageVideoConcept, { VideoType } from "./ManageVideoConcept.ts";

Deno.test("ManageVideoConcept", async (t) => {
  let mockDb: MockDb;
  let concept: ManageVideoConcept;
  let videosCollection: MockCollection<any>; // Using `any` for convenience in test, as `VideoDoc` is not exported

  // Setup before each test
  t.beforeEach(() => {
    mockDb = new MockDb();
    // Cast mockDb to Db because TypeScript types expect the full Db interface
    concept = new ManageVideoConcept(mockDb as unknown as Db);
    videosCollection = mockDb.collection("ManageVideo.videos");
  });

  const ownerId: ID = "user-123" as ID;
  const anotherUserId: ID = "user-456" as ID;
  const fileUrl1 = "gs://my-bucket/video1.mp4"; // Google Cloud Storage URL example
  const fileUrl2 = "gs://my-bucket/video2.mp4";

  await t.step("upload - successfully uploads a video", async () => {
    const result = await concept.upload({
      owner: ownerId,
      videoType: "practice",
      fileURL: fileUrl1,
    });

    assertExists(result);
    assert("video" in result, "Result should contain 'video' ID.");
    assertNotEquals(result.video, "", "Video ID should not be empty.");

    const videoId = result.video as ID;
    const storedVideo = await videosCollection.findOne({ _id: videoId });

    assertExists(storedVideo, "Video should be stored in the collection.");
    assertEquals(storedVideo.owner, ownerId);
    assertEquals(storedVideo.videoType, "practice");
    assertEquals(storedVideo.fileURL, fileUrl1);
    assertEquals(storedVideo.feedbackIds, [], "New video should have no feedback.");
  });

  await t.step("retrieve - successfully retrieves an owned video", async () => {
    const uploadResult = await concept.upload({
      owner: ownerId,
      videoType: "reference",
      fileURL: fileUrl2,
    });
    const videoId = uploadResult.video as ID;

    const retrieveResult = await concept.retrieve({
      video: videoId,
      caller: ownerId,
    });

    assertExists(retrieveResult);
    assert("videoType" in retrieveResult, "Retrieve result should contain video details.");
    assertEquals(retrieveResult.videoType, "reference");
    assertEquals(retrieveResult.fileURL, fileUrl2);
    assertEquals(retrieveResult.feedbackIds, []);
  });

  await t.step("retrieve - returns error if video not found", async () => {
    const result = await concept.retrieve({
      video: "non-existent-video" as ID,
      caller: ownerId,
    });

    assertExists(result);
    assert("error" in result);
    assertEquals(result.error, "Video with ID non-existent-video not found.");
  });

  await t.step("retrieve - returns error if caller is not the owner", async () => {
    const uploadResult = await concept.upload({
      owner: ownerId,
      videoType: "practice",
      fileURL: fileUrl1,
    });
    const videoId = uploadResult.video as ID;

    const result = await concept.retrieve({
      video: videoId,
      caller: anotherUserId,
    });

    assertExists(result);
    assert("error" in result);
    assertEquals(result.error, "Unauthorized: Caller is not the owner of this video.");
  });

  await t.step("delete - successfully deletes an owned video", async () => {
    const uploadResult = await concept.upload({
      owner: ownerId,
      videoType: "practice",
      fileURL: fileUrl1,
    });
    const videoId = uploadResult.video as ID;

    let storedVideo = await videosCollection.findOne({ _id: videoId });
    assertExists(storedVideo, "Video should exist before deletion.");

    const deleteResult = await concept.delete({ video: videoId, caller: ownerId });

    assertExists(deleteResult);
    // An empty object {} is expected for successful Empty return
    assertEquals(Object.keys(deleteResult).length, 0, "Delete result should be an empty object.");

    storedVideo = await videosCollection.findOne({ _id: videoId });
    assertEquals(storedVideo, null, "Video should be deleted after successful operation.");
  });

  await t.step("delete - returns error if video not found", async () => {
    const result = await concept.delete({
      video: "non-existent-video" as ID,
      caller: ownerId,
    });

    assertExists(result);
    assert("error" in result);
    assertEquals(result.error, "Video with ID non-existent-video not found.");
  });

  await t.step("delete - returns error if caller is not the owner", async () => {
    const uploadResult = await concept.upload({
      owner: ownerId,
      videoType: "reference",
      fileURL: fileUrl2,
    });
    const videoId = uploadResult.video as ID;

    const result = await concept.delete({
      video: videoId,
      caller: anotherUserId,
    });

    assertExists(result);
    assert("error" in result);
    assertEquals(result.error, "Unauthorized: Caller is not the owner of this video.");
  });

  await t.step("_addFeedbackToVideo - successfully adds feedback", async () => {
    const uploadResult = await concept.upload({
      owner: ownerId,
      videoType: "practice",
      fileURL: fileUrl1,
    });
    const videoId = uploadResult.video as ID;
    const feedbackId1: ID = "feedback-1" as ID;

    const addFeedbackResult = await concept._addFeedbackToVideo({ video: videoId, feedbackId: feedbackId1 });

    assertExists(addFeedbackResult);
    assertEquals(Object.keys(addFeedbackResult).length, 0, "Adding feedback should succeed.");

    const videoDoc = await videosCollection.findOne({ _id: videoId });
    assertExists(videoDoc);
    assertEquals(videoDoc.feedbackIds, [feedbackId1], "Feedback ID should be added.");

    // Add another feedback
    const feedbackId2: ID = "feedback-2" as ID;
    await concept._addFeedbackToVideo({ video: videoId, feedbackId: feedbackId2 });
    const updatedVideoDoc = await videosCollection.findOne({ _id: videoId });
    assertExists(updatedVideoDoc);
    assertEquals(updatedVideoDoc.feedbackIds, [feedbackId1, feedbackId2], "Second feedback ID should be added.");
  });

  await t.step("_addFeedbackToVideo - returns error if video not found", async () => {
    const result = await concept._addFeedbackToVideo({
      video: "non-existent-video" as ID,
      feedbackId: "feedback-1" as ID,
    });
    assertExists(result);
    assert("error" in result);
    assertEquals(result.error, "Video with ID non-existent-video not found.");
  });

  await t.step("_addFeedbackToVideo - returns error if feedback already associated", async () => {
    const uploadResult = await concept.upload({
      owner: ownerId,
      videoType: "practice",
      fileURL: fileUrl1,
    });
    const videoId = uploadResult.video as ID;
    const feedbackId: ID = "feedback-1" as ID;

    await concept._addFeedbackToVideo({ video: videoId, feedbackId: feedbackId });
    const result = await concept._addFeedbackToVideo({ video: videoId, feedbackId: feedbackId });

    assertExists(result);
    assert("error" in result);
    assertEquals(result.error, `Feedback ID ${feedbackId} already associated with video ${videoId}.`);
  });

  await t.step("_getVideosByOwner - retrieves all videos for a given owner", async () => {
    await concept.upload({ owner: ownerId, videoType: "practice", fileURL: fileUrl1 });
    await concept.upload({ owner: ownerId, videoType: "reference", fileURL: fileUrl2 });
    await concept.upload({ owner: anotherUserId, videoType: "practice", fileURL: "gs://other/video.mp4" });

    const ownerVideos = await concept._getVideosByOwner({ owner: ownerId });
    assertEquals(ownerVideos.length, 2);
    assert(ownerVideos.some(v => v.fileURL === fileUrl1));
    assert(ownerVideos.some(v => v.fileURL === fileUrl2));

    const anotherUserVideos = await concept._getVideosByOwner({ owner: anotherUserId });
    assertEquals(anotherUserVideos.length, 1);
  });
});

```
