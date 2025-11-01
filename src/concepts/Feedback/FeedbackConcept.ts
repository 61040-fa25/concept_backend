import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { PartEnum, PoseData } from "../PoseBreakdown/PoseBreakdownConcept.ts";
import type { Video } from "../manageVideo/ManageVideoConcept.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "Feedback" + ".";

const KEY_LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

const KEYPOINT_WEIGHTS = {
  [KEY_LANDMARKS.NOSE]: 1.0,
  [KEY_LANDMARKS.LEFT_SHOULDER]: 1.0,
  [KEY_LANDMARKS.RIGHT_SHOULDER]: 1.0,
  [KEY_LANDMARKS.LEFT_ELBOW]: 1.0,
  [KEY_LANDMARKS.RIGHT_ELBOW]: 1.0,
  [KEY_LANDMARKS.LEFT_WRIST]: 1.2,
  [KEY_LANDMARKS.RIGHT_WRIST]: 1.2,
  [KEY_LANDMARKS.LEFT_HIP]: 1.0,
  [KEY_LANDMARKS.RIGHT_HIP]: 1.0,
  [KEY_LANDMARKS.LEFT_KNEE]: 1.0,
  [KEY_LANDMARKS.RIGHT_KNEE]: 1.0,
  [KEY_LANDMARKS.LEFT_ANKLE]: 1.2,
  [KEY_LANDMARKS.RIGHT_ANKLE]: 1.2,
};

/**
 * Internal entity type, represented as an ID
 */
export type Feedback = ID;

// TODO: fix this
interface NumericPoseData {
  [key: string]: {
    x: number;
    y: number;
    z: number;
  };
}

/**
 * State: A set of Feedback records.
 * Each record stores the results of a comparison between a practice video and a reference video.
 */
interface FeedbackDoc {
  _id: Feedback;
  referenceVideo: string; // ID of the reference video from which pose data was derived
  practiceVideo: string; // ID of the practice video from which pose data was derived
  feedbackText: string; // The generated textual feedback
  accuracyValue: number; // A numerical score indicating similarity/accuracy (e.g., 0-100)
  frameScores: number[]; // Optional: per-frame accuracy scores
  worstFrames: number[]; // Optional: indices of frames with the lowest scores
}

/**
 * @concept Feedback
 * @purpose To highlight differences between practice video and reference choreography.
 */
export default class FeedbackConcept {
  feedback: Collection<FeedbackDoc>;

  constructor(private readonly db: Db) {
    this.feedback = this.db.collection(PREFIX + "feedback");
  }

  /**
   * Action: Compares practice PoseData to reference PoseData, creates and stores Feedback.
   * @requires Both referenceVideo and practiceVideo IDs must refer to existing videos (assumed valid inputs by this concept).
   * @requires Both referencePoseData and practicePoseData must be provided for the analysis.
   * @effects A new feedback record is created and its ID is returned.
   * @returns The ID of the newly created feedback record, or an error if validation fails.
   */

  // First, add interface for the incoming pose format
  async analyze(
    { referenceVideoId, practiceVideoId, referencePoseData, practicePoseData }:
      {
        referenceVideoId: string;
        practiceVideoId: string;
        referencePoseData: NumericPoseData[][];
        practicePoseData: NumericPoseData[][];
      },
  ): Promise<{ feedback: Feedback; feedbackText: string } | { error: string }> {
    // Parse JSON if needed
    try {
      if (typeof referencePoseData === "string") {
        referencePoseData = JSON.parse(referencePoseData);
      }
      if (typeof practicePoseData === "string") {
        practicePoseData = JSON.parse(practicePoseData);
      }
    } catch (e) {
      return { error: `Failed to parse pose data: ${e}` };
    }

    // Validate array format
    if (!Array.isArray(referencePoseData) || !Array.isArray(practicePoseData)) {
      return { error: "Pose data must be arrays after parsing" };
    }

    // Compare poses frame by frame
    const n = Math.min(referencePoseData.length, practicePoseData.length);
    const frameScores: number[] = [];
    const frameIntervalMs = 100; // 10 frames per second

    for (let i = 0; i < n; i++) {
      const refPose = referencePoseData[i];
      const pracPose = practicePoseData[i];

      if (!refPose || !pracPose) {
        frameScores.push(0);
        continue;
      }

      let totalDist = 0;
      let totalWeight = 0;

      // First create mapping from numeric indices to landmark names
      const LANDMARK_INDICES: Record<number, keyof typeof KEY_LANDMARKS> = {};
      Object.entries(KEY_LANDMARKS).forEach(([name, index]) => {
        LANDMARK_INDICES[index] = name as keyof typeof KEY_LANDMARKS;
      });

      // Then in the frame comparison loop
      Object.entries(KEYPOINT_WEIGHTS).forEach(([landmarkIndex, weight]) => {
        const idx = landmarkIndex; // Already a string number from KEYPOINT_WEIGHTS
        const landmarkName = LANDMARK_INDICES[idx];

        const refPoint = refPose[idx];
        const pracPoint = pracPose[idx];

        if (!refPoint || !pracPoint) {
          console.log(
            `Missing point data for landmark ${landmarkName} (${idx})`,
          );
          return;
        }

        // Compute 3D distance
        const dx = refPoint.x - pracPoint.x;
        const dy = refPoint.y - pracPoint.y;
        const dz = refPoint.z - pracPoint.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        totalDist += dist * weight;
        totalWeight += weight;
      });
      if (totalWeight === 0) {
        frameScores.push(0);
        continue;
      }

      // Normalize distance by weights
      const avgDist = totalDist / totalWeight;

      // Convert distance to score (0-100)
      const maxGoodDist = 0.4;
      const score = Math.max(
        0,
        Math.min(
          100,
          Math.round((1 - Math.min(avgDist / maxGoodDist, 1)) * 100),
        ),
      );
      frameScores.push(score);
    }

    // Calculate overall accuracy
    const accuracyValue = Math.round(
      frameScores.reduce((sum, score) => sum + score, 0) / frameScores.length,
    );

    // Find worst frames
    const worstFrames = frameScores
      .map((score, idx) => ({ score, frameIdx: idx }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map((item) => item.frameIdx);

    // Generate feedback text
    const feedbackText = accuracyValue >= 80
      ? `Great job! Overall accuracy: ${accuracyValue}%`
      : `Overall accuracy: ${accuracyValue}%. Focus on improving at seconds: ${
        worstFrames
          .map((frameIdx) => {
            const seconds = ((frameIdx + 1) * frameIntervalMs) / 1000;
            const score = frameScores[frameIdx];
            return `${seconds.toFixed(1)}s (${score}%)`;
          })
          .join(", ")
      }`;

    // Store feedback
    const feedbackId = freshID() as Feedback;
    await this.feedback.insertOne({
      _id: feedbackId,
      referenceVideo: referenceVideoId,
      practiceVideo: practiceVideoId,
      feedbackText,
      accuracyValue,
      frameScores,
      worstFrames,
    });

    return { feedback: feedbackId, feedbackText };
  }
  /**
   * Query: Retrieves the feedback text and accuracy value for a specific feedback record.
   * @requires The feedback record with the given ID must exist.
   * @returns An object containing the feedback text and accuracy value, or an error if not found.
   */
  async getFeedback(
    { feedback: feedbackId }: { feedback: Feedback },
  ): Promise<
    | { feedbackText: string; accuracyValue: number }
    | { error: string }
  > {
    const feedbackDoc = await this.feedback.findOne({ _id: feedbackId });
    if (!feedbackDoc) {
      return { error: `Feedback with ID ${feedbackId} not found.` };
    }
    return {
      feedbackText: feedbackDoc.feedbackText,
      accuracyValue: feedbackDoc.accuracyValue,
    };
  }

  /**
   * Query: Find feedback by referenceVideo and practiceVideo
   * @param referenceVideo - The reference video ID
   * @param practiceVideo - The practice video ID
   * @returns The feedback document or an error if not found
   */
  async findFeedback(
    referenceVideo: string,
    practiceVideo: string,
  ): Promise<
    | { feedbackDoc: FeedbackDoc }
    | { error: string }
  > {
    try {
      const feedbackDoc = await this.feedback.findOne({
        referenceVideo,
        practiceVideo,
      });

      if (!feedbackDoc) {
        return { error: `Feedback not found for given videos.` };
      }

      return {
        feedbackDoc,
      };
    } catch (err) {
      return { error: `Database query failed: ${err}` };
    }
  }
}
