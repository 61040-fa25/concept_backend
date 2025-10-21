import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts"; // Assuming ID is `string` and Empty is `{}`
import { freshID } from "@utils/database.ts"; // Assuming freshID() generates a unique string ID
import { Storage } from "@google-cloud/storage"; // Import Google Cloud Storage client
import type { User } from "../UserConcept.ts";
import type { Feedback } from "../feedback/FeedbackConcept.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "ManageVideo" + ".";

// Internal entity types, represented as IDs
export type Video = ID;

/**
 * State: A set of Videos with an owner, type, a Google Cloud Storage URL,
 * and the original GCS file name for deletion purposes.
 */
interface VideoDoc {
  _id: Video;
  owner: User;
  videoType: "practice" | "reference";
  gcsUrl: string; // The public URL of the video in Google Cloud Storage
  gcsFileName: string; // The object name in GCS, needed for deletion
  feedback: Feedback[]; // Array of Feedback IDs, assuming Feedback is managed separately
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
    { owner, videoType, file }: {
      owner: User;
      videoType: "practice" | "reference";
      file: File;
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
        gcsUrl,
        gcsFileName,
        feedback: [],
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
      videoType: "practice" | "reference";
      gcsUrl: string;
      feedback: Feedback[];
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

    return {
      videoType: videoDoc.videoType,
      gcsUrl: videoDoc.gcsUrl,
      feedback: videoDoc.feedback,
    };
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

  // --- Query functions (can be expanded based on needs) ---

  /**
   * Query: Retrieves all video documents owned by a specific user.
   * @param owner The ID of the user whose videos are to be retrieved.
   * @returns An array of VideoDoc objects.
   */
  async _getOwnedVideos({ owner }: { owner: User }): Promise<VideoDoc[]> {
    return await this.videos.find({ owner }).toArray();
  }
}
