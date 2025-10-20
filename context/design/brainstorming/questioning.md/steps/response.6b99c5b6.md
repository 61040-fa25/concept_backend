---
timestamp: 'Sun Oct 19 2025 11:12:25 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_111225.e442910a.md]]'
content_id: 6b99c5b6f5ac4cb776d963e578cd3f48a899abbd7112058638907b8a5fcbb35a
---

# response:

Okay, you want to modify the `ManageVideoConcept.test.ts` file to interact with a *real* Google Cloud Storage (GCS) bucket, rather than a mock. This requires setting up a GCS client, handling authentication, creating a test bucket, and performing actual uploads and deletions.

**Important Considerations Before You Start:**

1. **Google Cloud Project & Billing:** You need an active Google Cloud Project with billing enabled.
2. **GCS Bucket:** You must create a dedicated GCS bucket for these tests. **Do NOT use a production bucket.** A good practice is to name it something like `your-project-test-videos-bucket`.
3. **Service Account & Credentials:**
   * Create a Service Account in your GCP project (e.g., `video-test-account`).
   * Grant this service account the necessary permissions on your **test bucket**, such as `Storage Object Admin`. If you want the test to be able to create the bucket (using `ensureBucket`), the service account will need `Storage Admin` at the project level, which is a broader permission. For simplicity, I'll assume the bucket already exists.
   * Generate a JSON key file for this service account and download it.
4. **Environment Variables:** You'll use environment variables to pass your GCP project ID, GCS test bucket name, and the path to your service account key file to the Deno test runner. **Never hardcode credentials.**
5. **Deno Permissions:** Running tests that interact with external networks and the file system requires specific Deno permissions.

***

### Setup Steps:

1. **Create `input/testVideos` Directory and Dummy File:**
   Make sure this directory and file exist:
   ```bash
   mkdir -p src/initialCode/concepts/ManageVideo/input/testVideos
   echo "This is a dummy video file for testing real GCS uploads." > src/initialCode/concepts/ManageVideo/input/testVideos/dummy_video.mp4
   ```

2. **Install Google Cloud Storage Client for Deno (via npm):**
   If you have a `deno.json` file, add this to `dependencies`:
   ```json
   {
     "imports": {
       "@utils/types.ts": "./utils/types.ts",
       "@utils/database.ts": "./utils/database.ts"
     },
     "dependencies": {
       "npm:mongodb": "^6.3.0",
       "npm:@google-cloud/storage": "^7.8.0" // Add this line
     }
   }
   ```
   If not, Deno will automatically download it when it encounters the `npm:` specifier.

3. **Set Environment Variables:**
   Before running the test, set these in your terminal (replace placeholders with your actual values):

   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
   export GCLOUD_PROJECT="your-gcp-project-id"
   export GCS_TEST_BUCKET_NAME="your-test-bucket-name"
   ```

   * `/path/to/your/service-account-key.json`: The full path to the JSON key file you downloaded.
   * `your-gcp-project-id`: Your Google Cloud Project ID (e.g., `my-cool-project-12345`).
   * `your-test-bucket-name`: The name of the GCS bucket you created for testing (e.g., `my-project-test-videos-bucket`).

***

### `src\initialCode\concepts\ManageVideo\ManageVideoConcept.ts` (No Changes)

The concept file remains exactly as you provided, which is good. The concept deals with `fileURL`s, abstracting away the actual storage mechanism.

```typescript
// file: src\initialCode\concepts\ManageVideo\ManageVideoConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

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

***

### `src\initialCode\concepts\ManageVideo\ManageVideoConcept.test.ts` (Updated)

```typescript
// file: src\initialCode\concepts\ManageVideo\ManageVideoConcept.test.ts

import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Import the real Google Cloud Storage client
import { Storage } from "npm:@google-cloud/storage";
import { dirname, fromFileUrl, resolve } from "https://deno.land/std@0.208.0/path/mod.ts";

// --- Mock MongoDB Setup (remains the same) ---
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

// --- Real Google Cloud Storage (GCS) Client Setup ---
// This client interacts with actual GCS.
interface RealGCSClient {
  uploadFile(localFilePath: string, destinationPath: string): Promise<{ publicUrl: string }>;
  deleteFile(destinationPath: string): Promise<void>;
  clearUploadedFiles(): Promise<void>;
  ensureBucket(): Promise<void>;
  cleanupAllTestFiles(): Promise<void>; // To be called at the end of all tests
}

class GoogleCloudStorageClient implements RealGCSClient {
  private storage: Storage;
  private bucketName: string;
  private project: string;
  private uploadedFilePaths: Set<string> = new Set(); // To keep track of files uploaded in a test session

  constructor() {
    this.project = Deno.env.get("GCLOUD_PROJECT") || "";
    this.bucketName = Deno.env.get("GCS_TEST_BUCKET_NAME") || "";

    if (!this.project || !this.bucketName) {
      throw new Error(
        "GCLOUD_PROJECT and GCS_TEST_BUCKET_NAME environment variables must be set for real GCS tests.",
      );
    }

    // GCS client will automatically pick up GOOGLE_APPLICATION_CREDENTIALS env var
    // or other default authentication mechanisms.
    this.storage = new Storage({ projectId: this.project });
  }

  async ensureBucket(): Promise<void> {
    const [exists] = await this.storage.bucket(this.bucketName).exists();
    if (!exists) {
      console.warn(
        `GCS bucket "${this.bucketName}" does not exist. Attempting to create it. ` +
          "Ensure your service account has 'Storage Admin' role if this is expected.",
      );
      try {
        await this.storage.createBucket(this.bucketName, {
          location: "US-CENTRAL1", // Or choose a region closer to you
        });
        console.log(`Bucket "${this.bucketName}" created.`);
      } catch (e) {
        console.error(`Failed to create bucket "${this.bucketName}": ${e.message}`);
        // If creation fails, we might still proceed if `exists()` returned false
        // but the bucket was created concurrently, or we re-throw if it's a critical error.
        // For robustness, re-throw if it's not a "bucket already exists" error.
        if (!e.message.includes("You already own this bucket")) {
          throw e;
        }
      }
    }
  }

  async uploadFile(localFilePath: string, destinationPath: string): Promise<{ publicUrl: string }> {
    try {
      const [file] = await this.storage.bucket(this.bucketName).upload(localFilePath, {
        destination: destinationPath,
        public: true, // Make the file publicly accessible
        metadata: {
          // Add custom metadata to easily identify test uploads for robust cleanup
          test_upload: "true",
          uploaded_by_deno_test_id: Deno.env.get("DENO_TEST_ID") || "unknown", // Optional: for debugging concurrent tests
        },
      });
      // The public URL format: https://storage.googleapis.com/{bucket}/{object}
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${file.name}`;
      this.uploadedFilePaths.add(destinationPath); // Track for per-test cleanup
      return { publicUrl };
    } catch (error) {
      console.error(
        `Failed to upload file '${localFilePath}' to GCS at '${destinationPath}':`,
        error,
      );
      throw error;
    }
  }

  async deleteFile(destinationPath: string): Promise<void> {
    try {
      await this.storage.bucket(this.bucketName).file(destinationPath).delete();
      this.uploadedFilePaths.delete(destinationPath); // Remove from tracking
    } catch (error) {
      if (error.code === 404) {
        console.warn(`GCS: Attempted to delete non-existent file: ${destinationPath}`);
      } else {
        console.error(`GCS: Failed to delete file '${destinationPath}':`, error);
        throw error;
      }
    }
  }

  async clearUploadedFiles(): Promise<void> {
    // This cleans up files uploaded specifically by the current test lifecycle (e.g., in a beforeEach/afterEach block).
    const deletePromises: Promise<void>[] = [];
    for (const filePath of this.uploadedFilePaths) {
      deletePromises.push(this.deleteFile(filePath));
    }
    await Promise.all(deletePromises);
    this.uploadedFilePaths.clear();
  }

  async cleanupAllTestFiles(): Promise<void> {
    // This is a more aggressive cleanup for all files identified as test files
    // within the bucket, useful for ensuring a clean state before or after a full test run.
    console.log(`GCS: Cleaning up all files with prefix "${gcsUploadPrefix}" from bucket: ${this.bucketName}`);
    const [files] = await this.storage.bucket(this.bucketName).getFiles({
      prefix: gcsUploadPrefix, // Only target files uploaded with our test prefix
      autoPaginate: true, // Handle more than 1000 files
    });

    const deletePromises: Promise<void>[] = [];
    for (const file of files) {
      // Robust check: Only delete files that our client explicitly marked as test_upload=true
      if (file.metadata && file.metadata.test_upload === "true") {
        console.log(`GCS: Deleting test file: ${file.name}`);
        deletePromises.push(file.delete());
      } else {
        console.log(`GCS: Skipping deletion of non-test file: ${file.name} (no test_upload metadata)`);
      }
    }
    await Promise.all(deletePromises);
    console.log(`GCS: Cleaned up ${deletePromises.length} test files from bucket.`);
    this.uploadedFilePaths.clear(); // Ensure tracking is also cleared
  }
}
// --- End Real GCS Client Setup ---

import ManageVideoConcept, { VideoType } from "./ManageVideoConcept.ts";

// Determine the base path for test files
const currentDir = dirname(fromFileUrl(import.meta.url));
const testVideosDirPath = resolve(currentDir, "input", "testVideos");

const gcsUploadPrefix = "test-videos/"; // Prefix for GCS paths to easily identify and clean up test files

Deno.test("ManageVideoConcept (with Real GCS)", async (t) => {
  let mockDb: MockDb;
  let concept: ManageVideoConcept;
  let videosCollection: MockCollection<any>; // Using `any` for convenience in test, as `VideoDoc` is not exported
  let realGcsClient: GoogleCloudStorageClient;

  const testVideoFileName = "dummy_video.mp4";
  const localVideoFilePath = `${testVideosDirPath}/${testVideoFileName}`;


  // Setup before all tests in this file
  t.beforeAll(async () => {
    realGcsClient = new GoogleCloudStorageClient();
    await realGcsClient.ensureBucket(); // Ensure the GCS test bucket exists
    await realGcsClient.cleanupAllTestFiles(); // Clean up any lingering files from previous runs
  });

  // Setup before each test step
  t.beforeEach(async () => {
    mockDb = new MockDb();
    // Cast mockDb to Db because TypeScript types expect the full Db interface
    concept = new ManageVideoConcept(mockDb as unknown as Db);
    videosCollection = mockDb.collection("ManageVideo.videos");
    // Any files uploaded in a *previous* test step and not cleaned up will be caught by afterEach.
    // For per-test isolation, ensure `clearUploadedFiles` is called here if you don't rely on `afterEach`.
  });

  // Cleanup after each test step
  t.afterEach(async () => {
    // Clean up all files that were uploaded specifically during this test step
    await realGcsClient.clearUploadedFiles();
  });

  // Cleanup after all tests in this file (optional, but good for robustness)
  t.afterAll(async () => {
    // Final cleanup of any test files that might have been missed or orphaned
    await realGcsClient.cleanupAllTestFiles();
  });

  const ownerId: ID = "user-123" as ID;
  const anotherUserId: ID = "user-456" as ID;
  // Note: For tests relying on direct URL (without real GCS upload), we can still use dummy GCS URLs.
  const dummyFileUrl1 = "https://storage.googleapis.com/dummy-bucket/video1.mp4";
  const dummyFileUrl2 = "https://storage.googleapis.com/dummy-bucket/video2.mp4";

  await t.step("upload - successfully uploads a video (with direct URL, no real GCS interaction)", async () => {
    // This test simulates a scenario where the file is *already* uploaded to GCS
    // by some external process, and we just store its URL in our database.
    const result = await concept.upload({
      owner: ownerId,
      videoType: "practice",
      fileURL: dummyFileUrl1,
    });

    assertExists(result);
    assert("video" in result, "Result should contain 'video' ID.");
    assertNotEquals(result.video, "", "Video ID should not be empty.");

    const videoId = result.video as ID;
    const storedVideo = await videosCollection.findOne({ _id: videoId });

    assertExists(storedVideo, "Video should be stored in the collection.");
    assertEquals(storedVideo.owner, ownerId);
    assertEquals(storedVideo.videoType, "practice");
    assertEquals(storedVideo.fileURL, dummyFileUrl1);
    assertEquals(storedVideo.feedbackIds, [], "New video should have no feedback.");
  });

  await t.step("upload - uploads a local video file to REAL GCS and stores the returned URL", async () => {
    // This test performs a real upload to GCS using the `GoogleCloudStorageClient`.
    // Ensure `src/initialCode/concepts/ManageVideo/input/testVideos/dummy_video.mp4` exists.
    const uniqueGcsFileName = `${gcsUploadPrefix}${freshID()}-${testVideoFileName}`; // Use freshID for unique object name

    // 1. Upload the local file to real GCS using the real client
    const gcsUploadResult = await realGcsClient.uploadFile(
      localVideoFilePath,
      uniqueGcsFileName,
    );
    const gcsPublicUrl = gcsUploadResult.publicUrl;

    assertExists(gcsPublicUrl, "Real GCS client should return a public URL.");
    assert(
      gcsPublicUrl.startsWith(`https://storage.googleapis.com/${realGcsClient.bucketName}/`),
      `URL should start with GCS bucket URL: ${gcsPublicUrl}`,
    );
    assert(gcsPublicUrl.includes(uniqueGcsFileName), `URL should include the unique file name: ${gcsPublicUrl}`);

    // 2. Call the concept's upload method with the URL obtained from the real GCS upload
    const conceptUploadResult = await concept.upload({
      owner: ownerId,
      videoType: "reference",
      fileURL: gcsPublicUrl,
    });

    assertExists(conceptUploadResult);
    assert("video" in conceptUploadResult, "Concept upload result should contain 'video' ID.");
    const videoId = conceptUploadResult.video as ID;

    // 3. Verify the video metadata in MongoDB (via mockDb)
    const storedVideo = await videosCollection.findOne({ _id: videoId });
    assertExists(storedVideo, "Video should be stored in the collection.");
    assertEquals(storedVideo.owner, ownerId);
    assertEquals(storedVideo.videoType, "reference");
    assertEquals(storedVideo.fileURL, gcsPublicUrl, "The real GCS public URL should be stored.");
    assertEquals(storedVideo.feedbackIds, [], "New video should have no feedback.");

    // The `afterEach` hook will handle deletion of this file from GCS,
    // as `realGcsClient.uploadFile` adds `uniqueGcsFileName` to its tracked files.
  });

  await t.step("retrieve - successfully retrieves an owned video", async () => {
    const uploadResult = await concept.upload({
      owner: ownerId,
      videoType: "reference",
      fileURL: dummyFileUrl2,
    });
    const videoId = uploadResult.video as ID;

    const retrieveResult = await concept.retrieve({
      video: videoId,
      caller: ownerId,
    });

    assertExists(retrieveResult);
    assert("videoType" in retrieveResult, "Retrieve result should contain video details.");
    assertEquals(retrieveResult.videoType, "reference");
    assertEquals(retrieveResult.fileURL, dummyFileUrl2);
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
      fileURL: dummyFileUrl1,
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
      fileURL: dummyFileUrl1,
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
      fileURL: dummyFileUrl2,
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

  // --- Internal/Helper Actions & Queries Tests ---

  await t.step("_addFeedbackToVideo - successfully adds feedback", async () => {
    const uploadResult = await concept.upload({
      owner: ownerId,
      videoType: "practice",
      fileURL: dummyFileUrl1,
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
      fileURL: dummyFileUrl1,
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
    await concept.upload({ owner: ownerId, videoType: "practice", fileURL: dummyFileUrl1 });
    await concept.upload({ owner: ownerId, videoType: "reference", fileURL: dummyFileUrl2 });
    await concept.upload({ owner: anotherUserId, videoType: "practice", fileURL: "https://storage.googleapis.com/other-bucket/video.mp4" });

    const ownerVideos = await concept._getVideosByOwner({ owner: ownerId });
    assertEquals(ownerVideos.length, 2);
    assert(ownerVideos.some(v => v.fileURL === dummyFileUrl1));
    assert(ownerVideos.some(v => v.fileURL === dummyFileUrl2));

    const anotherUserVideos = await concept._getVideosByOwner({ owner: anotherUserId });
    assertEquals(anotherUserVideos.length, 1);
  });
});

```

***

### How to Run the Tests:

1. **Ensure all setup steps above are completed.** This includes creating the `input/testVideos` directory and file, installing `npm:@google-cloud/storage`, and setting the three environment variables (`GOOGLE_APPLICATION_CREDENTIALS`, `GCLOUD_PROJECT`, `GCS_TEST_BUCKET_NAME`).
2. **Execute the Deno test command with necessary permissions:**

   ```bash
   deno test \
     --allow-net \
     --allow-env \
     --allow-read \
     src/initialCode/concepts/ManageVideo/ManageVideoConcept.test.ts
   ```

   * `--allow-net`: Required for network requests to Google Cloud Storage.
   * `--allow-env`: Required to read environment variables for GCS credentials and configuration.
   * `--allow-read`: Required to read the local `dummy_video.mp4` file.

You should see the tests run, including the one that performs a real upload to your configured GCS bucket. The `beforeAll` and `afterEach` hooks are designed to keep your GCS bucket clean by deleting test files.
