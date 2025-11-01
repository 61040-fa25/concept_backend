import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts"; // Assuming ID is `string` and Empty is `{}`
import { freshID } from "@utils/database.ts"; // Assuming freshID() generates a unique string ID
import { Storage } from "@google-cloud/storage"; // Import Google Cloud Storage client
import type { User } from "../UserConcept.ts";
import type { Feedback } from "../feedback/FeedbackConcept.ts";
import type { PoseData } from "../PoseBreakdown/PoseBreakdownConcept.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "ManageVideo" + ".";

// Internal entity types, represented as IDs
export type Video = ID;

export type MatchingFrames = {
  referenceStartFrame: number;
  referenceEndFrame: number;
  practiceStartFrame: number;
  practiceEndFrame: number;
};
/**
 * State: A set of Videos with an owner, type, a Google Cloud Storage URL,
 * and the original GCS file name for deletion purposes.
 */
interface VideoDoc {
  _id: Video;
  owner: User;
  videoType: "practice" | "reference";
  videoName: string;
  referenceVideoId?: string;
  gcsUrl: string; // The public URL of the video in Google Cloud Storage
  gcsFileName: string; // The object name in GCS, needed for deletion
  feedback: Feedback; // Feedback ID associated with this video
  poseData: PoseData[]; // Array of PoseData associated with this video
  matchingFrames?: MatchingFrames; // Optional matching frames to sync practice and reference
}

const PROJECT_ID = Deno.env.get("PROJECT_ID");
const GOOGLE_APPLICATION_CREDENTIALS = Deno.env.get(
  "GOOGLE_APPLICATION_CREDENTIALS",
);

/**
 * @concept ManageVideo
 * @purpose To allow dancers and choreographers to upload and manage practice/reference videos,
 * storing the actual video files in Google Cloud Storage and their metadata in MongoDB.
 *
 * @principle After uploading a video, it can be retrieved for analysis, syncing, or feedback.
 */
export default class ManageVideoConcept {
  videos: Collection<VideoDoc>;
  private storage: Storage;
  private bucketName: string;

  /**
   * Initializes the ManageVideoConcept.
   * @param db The MongoDB database instance.
   */
  constructor(private readonly db: Db) {
    this.videos = this.db.collection(PREFIX + "videos");
    this.bucketName = "mirror-motion-test-bucket";

    // Initialize Google Cloud Storage client.
    this.storage = new Storage({
      projectId: PROJECT_ID,
      keyFilename: GOOGLE_APPLICATION_CREDENTIALS,
    });
  }

  /**
   * Action: Uploads a video file to Google Cloud Storage and records its metadata in MongoDB.
   * @param owner The ID of the user uploading the video.
   * @param videoType The type of video ('practice' or 'reference').
   * @param file The video file to be uploaded (a File object, typically from a FormData submission in the frontend).
   * @requires videoType must be 'practice' or 'reference'.
   * @requires file must be a valid File object.
   * @effects A new video entry is created in MongoDB with a GCS URL, and the video file is uploaded to GCS.
   *
   * @returns The ID of the newly created video, or an error message if the upload fails.
   */

  async upload(
    { owner, videoType, file, videoName, referenceVideoId }: {
      owner: User;
      videoType: "practice" | "reference";
      file: File;
      videoName?: string;
      referenceVideoId?: string;
    },
  ): Promise<{ video: Video } | { error: string }> {
    if (!this.bucketName) {
      // init the concept
    }
    console.log(
      "Uploading video for owner:",
      owner,
      "of type:",
      videoType,
      "file:",
      file,
    );

    if (videoType !== "practice" && videoType !== "reference") {
      return { error: "videoType must be 'practice' or 'reference'." };
    }

    const videoId = freshID() as Video;
    const gcsFileName = `${owner}/${videoType}/${videoId}_${Date.now()}.mp4`;

    try {
      const bucket = this.storage.bucket(this.bucketName);

      // Convert the File object to a stream or buffer for uploading
      const fileBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(fileBuffer);

      // Upload buffer to GCS
      await bucket.file(gcsFileName).save(uint8Array, {
        contentType: file.type || "video/mp4",
      });

      const gcsUrl =
        `https://storage.googleapis.com/${this.bucketName}/${gcsFileName}`;

      // Store metadata in MongoDB
      await this.videos.insertOne({
        _id: videoId,
        owner,
        videoType,
        videoName: videoName ? videoName : "untitled",
        referenceVideoId: referenceVideoId ? referenceVideoId : "",
        gcsUrl,
        gcsFileName,
        feedback: null,
        poseData: [],
      });

      return { video: videoId };
    } catch (e: any) {
      console.error("Error uploading video to GCS or inserting into DB:", e);

      // Cleanup partially uploaded file
      try {
        await this.storage.bucket(this.bucketName).file(gcsFileName).delete();
      } catch (deleteError) {
        console.warn(
          `Failed to clean up GCS file ${gcsFileName} after upload error:`,
          deleteError,
        );
      }

      return { error: `Failed to upload video: ${e.message}` };
    }
  }

  /**
   * Action: Adds pose data and optional frame range to a video.
   * @param video The video ID to update.
   * @param poseData An array of PoseData to be added (or JSON string).
   * @param caller The user attempting to update the video.
   * @param matchingFrames (optional) The start and end frames of the pose data range.
   * @throws Throws an Error if validation or update fails.
   */
  async addPosesToVideo(
    { video: videoId, poseData, caller, matchingFrames }: {
      video: Video;
      poseData: PoseData[] | string;
      caller: User;
      matchingFrames?: MatchingFrames;
    },
  ) {
    // Parse poseData if it's a JSON string
    if (typeof poseData === "string") {
      try {
        poseData = JSON.parse(poseData);
      } catch (e) {
        throw new Error("Pose data JSON could not be parsed: " + String(e));
      }
    }

    // Ensure poseData is an array
    if (!Array.isArray(poseData)) {
      throw new Error("poseData must be an array of PoseData.");
    }

    const videoDoc = await this.videos.findOne({ _id: videoId });
    if (!videoDoc) {
      throw new Error(`Video with ID ${videoId} not found.`);
    }

    // Ensure the caller is the owner
    if (videoDoc.owner.toString() !== caller.toString()) {
      throw new Error("Caller is not the owner of this video.");
    }

    // Prepare update payload
    const updatePayload: Partial<VideoDoc> = {
      poseData: poseData as PoseData[],
    };

    if (matchingFrames) {
      updatePayload.matchingFrames = matchingFrames;
    }

    const updateResult = await this.videos.updateOne(
      { _id: videoId },
      { $set: updatePayload },
    );

    console.log("AddPosesToVideo result:", updateResult);
    // if (
    //   !updateResult ||
    //   (updateResult.matchedCount !== undefined &&
    //     updateResult.matchedCount === 0)
    // ) {
    //   throw new Error("Failed to update pose data: no matching document.");
    // }
  }

  /**
   * Action: Retrieves video metadata and its Google Cloud Storage URL.
   * @param video The ID of the video to retrieve.
   * @param caller The ID of the user attempting to retrieve the video.
   * @requires The video must exist.
   * @requires The caller must be the owner of the video.
   * @effects Returns the video type, GCS URL, and associated feedback (IDs).
   * @returns The video details or an error message.
   */
  async retrieve(
    { video: videoId, caller }: { video: Video; caller: User },
  ): Promise<
    | {
      videoId: Video;
      videoType: "practice" | "reference";
      gcsUrl: string;
      videoName: string;
      referenceVideoId: string;
      feedback: Feedback;
      poseData: PoseData[];
      matchingFrames?: MatchingFrames;
    }
    | { error: string }
  > {
    console.log("Retrieving video:", videoId, "for caller:", caller);

    const videoDoc = await this.videos.findOne({ _id: videoId });

    if (!videoDoc) {
      return { error: `Video with ID ${videoId} not found.` };
    }

    // Ensure the caller is the owner for retrieval access
    if (videoDoc.owner.toString() !== caller.toString()) {
      return { error: "Caller is not the owner of this video." };
    }

    console.log("feedback retrieved:", videoDoc.feedback);
    return {
      videoId: videoDoc._id,
      videoType: videoDoc.videoType,
      gcsUrl: videoDoc.gcsUrl,
      videoName: videoDoc.videoName,
      referenceVideoId: videoDoc.referenceVideoId,
      feedback: videoDoc.feedback,
      poseData: videoDoc.poseData,
      matchingFrames: videoDoc.matchingFrames,
    };
  }

  /**
   * Action: Streams the actual video file from Google Cloud Storage.
   * @param video The ID of the video to stream.
   * @param caller The ID of the user requesting the video.
   * @param c The Hono context (to build the response)
   * @effects Streams video data directly to the client.
   */
  async streamVideo(
    { video, caller, c }: { video: Video; caller: User; c: any },
  ): Promise<Response> {
    // TODO: Assume streamVideo is only called after retrieve has verified ownership
    // So no need to re-check here, unless we want extra safety
    console.log("Streaming video:", video, "for caller:", caller);

    const videoDoc = await this.videos.findOne({ _id: video });
    if (!videoDoc) {
      return c.json({ error: `Video with ID ${video} not found.` }, 404);
    }

    // Ensure ownership
    if (videoDoc.owner.toString() !== caller.toString()) {
      return c.json({ error: "Caller is not the owner of this video." }, 403);
    }

    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(videoDoc.gcsFileName);

      // Check existence
      const [exists] = await file.exists();
      if (!exists) {
        return c.json({ error: "Video file not found in storage." }, 404);
      }

      // Fetch metadata for headers
      const [metadata] = await file.getMetadata();

      // Create readable stream
      const [fileStream] = await file.download();

      // Return streaming response with headers
      return new Response(fileStream, {
        headers: {
          "Content-Type": metadata.contentType || "video/mp4",
          "Accept-Ranges": "bytes",
        },
      });
    } catch (error) {
      console.error("Error streaming video:", error);
      return c.json({ error: "Failed to stream video." }, 500);
    }
  }

  /**
   * Action: Deletes a video from MongoDB and Google Cloud Storage.
   * @param video The ID of the video to delete.
   * @param caller The ID of the user attempting to delete the video.
   * @requires The video must exist.
   * @requires The caller must be the owner of the video.
   * @effects The video document is removed from MongoDB and the video file is deleted from GCS.
   * @returns An empty object on success, or an error message.
   */
  async delete(
    { video: videoId, caller }: { video: Video; caller: User },
  ): Promise<Empty | { error: string }> {
    const videoDoc = await this.videos.findOne({ _id: videoId });

    if (!videoDoc) {
      return { error: `Video with ID ${videoId} not found.` };
    }

    // Ensure the caller is the owner for deletion
    if (videoDoc.owner.toString() !== caller.toString()) {
      return { error: "Caller is not the owner of this video." };
    }

    try {
      // Delete the video file from Google Cloud Storage
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(videoDoc.gcsFileName);
      await file.delete();

      // Delete the video metadata from MongoDB
      const result = await this.videos.deleteOne({ _id: videoId });
      if (result.deletedCount === 0) {
        // This case should ideally not happen if findOne succeeded, but good safeguard
        return {
          error: `Video with ID ${videoId} not found in DB for deletion.`,
        };
      }

      return {};
    } catch (e: any) {
      console.error("Error deleting video from GCS or DB:", e);
      // It's possible the GCS file was already gone, but we still want to delete from DB if possible.
      // For simplicity, we just return an error if any part of the deletion fails.
      return { error: `Failed to delete video: ${e.message}` };
    }
  }

  // --- Mutation functions ---
  /**
   * Action: Set the matchingFrames of a video.
   * @param video The ID of the video to update.
   * @param caller The ID of the user attempting to update the video.
   * @param referenceStartFrame The start frame of the reference video.
   * @param referenceEndFrame The end frame of the reference video.
   * @param practiceStartFrame The start frame of the practice video.
   * @param practiceEndFrame The end frame of the practice video.
   */
  async setMatchingFrames({
    video,
    caller,
    referenceStartFrame,
    referenceEndFrame,
    practiceStartFrame,
    practiceEndFrame,
  }: {
    video: Video;
    caller: User;
    referenceStartFrame: number;
    referenceEndFrame: number;
    practiceStartFrame: number;
    practiceEndFrame: number;
  }) {
    console.log(
      "Setting matchingFrames for video:",
      video,
      "for caller:",
      caller,
    );

    const videoDoc = await this.videos.findOne({ _id: video });
    if (!videoDoc) {
      return { error: `Video with ID ${video} not found.` };
    }

    // Ensure ownership
    if (videoDoc.owner.toString() !== caller.toString()) {
      return { error: "Caller is not the owner of this video." };
    }

    const matchingFrames = {
      referenceStartFrame,
      referenceEndFrame,
      practiceStartFrame,
      practiceEndFrame,
    };

    // Update matchingFrames
    console.log("Updating matchingFrames:", matchingFrames);
    videoDoc.matchingFrames = matchingFrames;
    await this.videos.replaceOne({ _id: video }, videoDoc);
  }

  // TODO: likely don't need this in the future, can just use getFeedback(ref, prac)
  async storeFeedback({
    video,
    feedbackId,
    caller,
  }: {
    video: Video;
    feedbackId: Feedback;
    caller: User;
  }): Promise<Empty | { error: string }> {
    console.log(
      "Storing feedback for video:",
      video,
      "feedback:",
      feedbackId,
      "by caller:",
      caller,
    );

    const videoDoc = await this.videos.findOne({ _id: video });
    if (!videoDoc) {
      return { error: `Video with ID ${video} not found.` };
    }
    if (videoDoc.owner.toString() !== caller.toString()) {
      return { error: "Caller is not the owner of this video." };
    }

    // Use updateOne with $set instead of replaceOne
    const result = await this.videos.updateOne(
      { _id: video },
      { $set: { feedback: feedbackId } },
    );

    if (result.matchedCount === 0) {
      return { error: "Failed to update feedback" };
    }

    if (result.modifiedCount === 0) {
      return { error: "No changes made to feedback" };
    }

    console.log("Feedback stored successfully:", result);
    return {};
  }

  // --- Query functions ---

  /**
   * Query: Retrieves all video documents owned by a specific user.
   * @param owner The ID of the user whose videos are to be retrieved.
   * @returns An array of VideoDoc objects.
   */
  async getOwnedVideos({ owner }: { owner: User }): Promise<VideoDoc[]> {
    return await this.videos.find({ owner }).toArray();
  }

  async getPracticeVideos({
    referenceVideoId,
  }: {
    referenceVideoId: string;
  }): Promise<VideoDoc[]> {
    console.log(
      "Retrieving practice videos for reference video:",
      referenceVideoId,
    );

    console.log(
      "found",
      await this.videos.find({ videoType: "practice" }).toArray(),
    );
    // Find all videos that are of type 'practice' and have the given referenceVideoId
    return await this.videos
      .find({ videoType: "practice", referenceVideoId })
      .toArray();
  }

  async getAllReferenceVideos({ caller }): Promise<VideoDoc[]> {
    return await this.videos.find({ videoType: "reference", owner: caller })
      .toArray();
  }
}
