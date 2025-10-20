---
timestamp: 'Sun Oct 19 2025 18:45:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_184529.8e9eaecd.md]]'
content_id: e3786ab136593833b9e9b06244d41eda4f41d32f6e55d8025de893d8916d3318
---

# response:

```typescript
import { assertEquals, assertExists, assertNotEquals, assertInstanceOf } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import ManageVideoConcept from "./ManageVideoConcept.ts";
import type { User } from "./UserConcept.ts";

const BUCKET_NAME = Deno.env.get("BUCKET_NAME") || "";

const testUser = "TestUser" as User;
const anotherUser = "AnotherUser" as User; // A user for non-owner tests
const nonExistentVideoId = "nonExistentVideo123" as ID; // A dummy ID for non-existent video tests

Deno.test("Principle: After uploading a video, it can be retrieved for analysis, syncing, or feedback ", async () => {
  const [db, client] = await testDb();
  const manageVideoConcept = new ManageVideoConcept(db, BUCKET_NAME);

  try {
    // 1. Try to upload a practice video to Google Cloud Storage
    const uploadVideoResult = await manageVideoConcept.upload({
      owner: testUser,
      videoType: "practice",
      filePath: `${Deno.cwd()}/input/testVideos/testVideo1.mp4`,
    });

    assertNotEquals(
      "error" in uploadVideoResult,
      true,
      "Upload video should not fail.",
    );
    const { video } = uploadVideoResult as { video: ID };
    assertExists(video);

    // 2. Try to upload a reference video to Google Cloud Storage
    const uploadReferenceVideoResult = await manageVideoConcept.upload({
      owner: testUser,
      videoType: "reference",
      filePath: `${Deno.cwd()}/input/testVideos/testVideo2.mp4`,
    });

    assertNotEquals(
      "error" in uploadReferenceVideoResult,
      true,
      "Upload video should not fail.",
    );
    const { video: referenceVideo } = uploadReferenceVideoResult as {
      video: ID;
    };
    assertExists(referenceVideo);
  } finally {
    await client.close();
  }
});

Deno.test("Action: retrieve - Successfully retrieves video by owner", async () => {
  const [db, client] = await testDb();
  const manageVideoConcept = new ManageVideoConcept(db, BUCKET_NAME);
  let uploadedVideoId: ID | undefined; // To store the video ID for cleanup

  try {
    // 1. Upload a video first
    const uploadResult = await manageVideoConcept.upload({
      owner: testUser,
      videoType: "practice",
      filePath: `${Deno.cwd()}/input/testVideos/testVideo1.mp4`,
    });
    assertNotEquals("error" in uploadResult, true, "Upload should succeed for retrieval test.");
    uploadedVideoId = (uploadResult as { video: ID }).video;
    assertExists(uploadedVideoId);

    // 2. Retrieve the video as the owner
    const retrieveResult = await manageVideoConcept.retrieve({
      videoID: uploadedVideoId,
      caller: testUser,
    });

    assertNotEquals("error" in retrieveResult, true, "Retrieve should not fail for owner.");
    // Assuming videoFile is returned as a string (e.g., URL or path)
    const { videoType, videoFile, feedback } = retrieveResult as { videoType: string; videoFile: string; feedback: Set<any> };
    
    assertEquals(videoType, "practice", "Retrieved videoType should match uploaded type.");
    assertExists(videoFile, "Retrieved videoFile path/URL should exist.");
    assertInstanceOf(feedback, Set, "Feedback should be a Set.");
    assertEquals(feedback.size, 0, "Initially, feedback should be an empty Set.");

  } finally {
    // Clean up the uploaded video
    if (uploadedVideoId) {
      await manageVideoConcept.delete({ videoID: uploadedVideoId, caller: testUser });
    }
    await client.close();
  }
});

Deno.test("Action: retrieve - Fails to retrieve video by non-owner", async () => {
  const [db, client] = await testDb();
  const manageVideoConcept = new ManageVideoConcept(db, BUCKET_NAME);
  let uploadedVideoId: ID | undefined;

  try {
    // 1. Upload a video by testUser
    const uploadResult = await manageVideoConcept.upload({
      owner: testUser,
      videoType: "practice",
      filePath: `${Deno.cwd()}/input/testVideos/testVideo1.mp4`,
    });
    assertNotEquals("error" in uploadResult, true, "Upload should succeed for non-owner retrieval test.");
    uploadedVideoId = (uploadResult as { video: ID }).video;
    assertExists(uploadedVideoId);

    // 2. Try to retrieve the video as anotherUser (non-owner)
    const retrieveResult = await manageVideoConcept.retrieve({
      videoID: uploadedVideoId,
      caller: anotherUser,
    });

    assertEquals("error" in retrieveResult, true, "Retrieve should fail for non-owner.");
    const { error } = retrieveResult as { error: string };
    assertExists(error, "Error message should be present.");
    // Optionally, assert specific error message: assertEquals(error, "Not authorized", "Error message should indicate authorization issue.");

  } finally {
    // Clean up the uploaded video (by the actual owner)
    if (uploadedVideoId) {
      await manageVideoConcept.delete({ videoID: uploadedVideoId, caller: testUser });
    }
    await client.close();
  }
});

Deno.test("Action: retrieve - Fails to retrieve non-existent video", async () => {
  const [db, client] = await testDb();
  const manageVideoConcept = new ManageVideoConcept(db, BUCKET_NAME);

  try {
    // Try to retrieve a video with a non-existent ID
    const retrieveResult = await manageVideoConcept.retrieve({
      videoID: nonExistentVideoId,
      caller: testUser,
    });

    assertEquals("error" in retrieveResult, true, "Retrieve should fail for non-existent video.");
    const { error } = retrieveResult as { error: string };
    assertExists(error, "Error message should be present.");
    // Optionally, assert specific error message: assertEquals(error, "Video not found", "Error message should indicate video not found.");

  } finally {
    await client.close();
  }
});

Deno.test("Action: delete - Successfully deletes video by owner", async () => {
  const [db, client] = await testDb();
  const manageVideoConcept = new ManageVideoConcept(db, BUCKET_NAME);
  let uploadedVideoId: ID | undefined;

  try {
    // 1. Upload a video first
    const uploadResult = await manageVideoConcept.upload({
      owner: testUser,
      videoType: "practice",
      filePath: `${Deno.cwd()}/input/testVideos/testVideo1.mp4`,
    });
    assertNotEquals("error" in uploadResult, true, "Upload should succeed for deletion test.");
    uploadedVideoId = (uploadResult as { video: ID }).video;
    assertExists(uploadedVideoId);

    // 2. Delete the video as the owner
    const deleteResult = await manageVideoConcept.delete({
      videoID: uploadedVideoId,
      caller: testUser,
    });

    // Check if delete operation itself resulted in an error
    assertNotEquals("error" in deleteResult, true, "Delete should not fail for owner.");
    // If delete returns nothing, the absence of an error means success.
    // If delete returns an explicit success confirmation, assert it here.

    // 3. Try to retrieve the video after deletion to confirm it's gone
    const retrieveAfterDeleteResult = await manageVideoConcept.retrieve({
      videoID: uploadedVideoId,
      caller: testUser,
    });

    assertEquals("error" in retrieveAfterDeleteResult, true, "Retrieve should fail after successful deletion.");
    const { error } = retrieveAfterDeleteResult as { error: string };
    assertExists(error, "Error message should be present after trying to retrieve deleted video.");

  } finally {
    // No need to clean up `uploadedVideoId` here, as it's expected to be deleted by the test.
    await client.close();
  }
});

Deno.test("Action: delete - Fails to delete video by non-owner", async () => {
  const [db, client] = await testDb();
  const manageVideoConcept = new ManageVideoConcept(db, BUCKET_NAME);
  let uploadedVideoId: ID | undefined;

  try {
    // 1. Upload a video by testUser
    const uploadResult = await manageVideoConcept.upload({
      owner: testUser,
      videoType: "practice",
      filePath: `${Deno.cwd()}/input/testVideos/testVideo1.mp4`,
    });
    assertNotEquals("error" in uploadResult, true, "Upload should succeed for non-owner deletion test.");
    uploadedVideoId = (uploadResult as { video: ID }).video;
    assertExists(uploadedVideoId);

    // 2. Try to delete the video as anotherUser (non-owner)
    const deleteResult = await manageVideoConcept.delete({
      videoID: uploadedVideoId,
      caller: anotherUser,
    });

    assertEquals("error" in deleteResult, true, "Delete should fail for non-owner.");
    const { error } = deleteResult as { error: string };
    assertExists(error, "Error message should be present.");
    // Optionally, assert specific error message: assertEquals(error, "Not authorized", "Error message should indicate authorization issue.");

    // 3. Verify the video still exists by retrieving it as the owner
    const retrieveAfterFailedDeleteResult = await manageVideoConcept.retrieve({
      videoID: uploadedVideoId,
      caller: testUser,
    });

    assertNotEquals("error" in retrieveAfterFailedDeleteResult, true, "Video should still be retrievable by owner after failed non-owner delete.");
    const { videoType } = retrieveAfterFailedDeleteResult as { videoType: string };
    assertEquals(videoType, "practice", "Retrieved videoType should still match.");

  } finally {
    // Clean up the video that was not deleted by the failed attempt
    if (uploadedVideoId) {
      await manageVideoConcept.delete({ videoID: uploadedVideoId, caller: testUser });
    }
    await client.close();
  }
});

Deno.test("Action: delete - Fails to delete non-existent video", async () => {
  const [db, client] = await testDb();
  const manageVideoConcept = new ManageVideoConcept(db, BUCKET_NAME);

  try {
    // Try to delete a video with a non-existent ID
    const deleteResult = await manageVideoConcept.delete({
      videoID: nonExistentVideoId,
      caller: testUser,
    });

    assertEquals("error" in deleteResult, true, "Delete should fail for non-existent video.");
    const { error } = deleteResult as { error: string };
    assertExists(error, "Error message should be present.");
    // Optionally, assert specific error message: assertEquals(error, "Video not found", "Error message should indicate video not found.");

  } finally {
    await client.close();
  }
});
```
