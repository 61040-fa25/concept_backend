---
timestamp: 'Tue Oct 21 2025 10:09:15 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_100915.a2641319.md]]'
content_id: 50b0ecec77a140aec1f1e7764c66074a3d4809506d8d1943cfbc6d11883c0936
---

# file: src\concepts\Feedback\FeedbackConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import type { Video } from "./ManageVideoConcept.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "Feedback" + ".";

// Placeholder for PoseData structure.
// This type represents the output of a pose estimation process,
// used as input for the analysis but not stored directly in FeedbackDoc.
// In a real system, this would be a detailed type for pose estimation output,
// e.g., containing keypoints and their coordinates/scores.
type PoseData = {
  [key: string]: Array<{ x: number; y: number; z?: number; score: number }>;
}; // Example: { "left_shoulder": [{x,y,z,score}], "right_hip": [{x,y,z,score}], ... }

/**
 * Internal entity type, represented as an ID
 */
export type Feedback = ID;

/**
 * State: A set of Feedback records.
 * Each record stores the results of a comparison between a practice video and a reference video.
 */
interface FeedbackDoc {
  _id: Feedback;
  referenceVideo: Video; // ID of the reference video from which pose data was derived
  practiceVideo: Video; // ID of the practice video from which pose data was derived
  feedbackText: string; // The generated textual feedback
  accuracyValue: number; // A numerical score indicating similarity/accuracy (e.g., 0-100)
  createdAt: Date; // Timestamp when the feedback record was created
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
  async analyze(
    { referenceVideo, practiceVideo, referencePoseData, practicePoseData }: {
      referenceVideo: Video;
      practiceVideo: Video;
      referencePoseData: PoseData;
      practicePoseData: PoseData;
    },
  ): Promise<{ feedback: Feedback } | { error: string }> {
    // Basic validation for pose data presence (mocking an actual analysis requirement)
    if (
      !referencePoseData || Object.keys(referencePoseData).length === 0 ||
      !practicePoseData || Object.keys(practicePoseData).length === 0
    ) {
      // In a real scenario, pose data might be legitimately empty for very short videos
      // or if pose estimation failed. For this mock, we'll treat it as a condition
      // for generating specific feedback.
      const feedbackId = freshID() as Feedback;
      await this.feedback.insertOne({
        _id: feedbackId,
        referenceVideo,
        practiceVideo,
        feedbackText: "Cannot analyze. One or both pose datasets are empty.",
        accuracyValue: 0, // Indicate no meaningful analysis
        createdAt: new Date(),
      });
      return { feedback: feedbackId };
    }

    // --- Simulate actual pose analysis logic here ---
    // In a production system, this would involve complex algorithms:
    // 1. Aligning the two pose sequences (e.g., dynamic time warping).
    // 2. Comparing keypoint positions, angles, velocities frame-by-frame.
    // 3. Identifying specific discrepancies (e.g., "left arm too low," "right leg movement too slow").
    // 4. Calculating an overall accuracy score.

    // For this concept, we'll generate mock feedback and accuracy values.
    const accuracyValue = Math.floor(Math.random() * (95 - 60 + 1)) + 60; // Random accuracy between 60-95%
    let feedbackText =
      `Analysis complete. Overall accuracy: ${accuracyValue}%.`;

    // Example of mock detailed feedback:
    if (accuracyValue < 70) {
      feedbackText +=
        " Focus on coordinating your arm and leg movements. Your left arm seems slightly out of sync.";
    } else if (accuracyValue < 85) {
      feedbackText +=
        " Good effort! Pay attention to the subtle nuances in your torso rotation and hip alignment.";
    } else {
      feedbackText +=
        " Excellent work! Your form is very close to the reference. Perhaps refine the timing of your transitions.";
    }
    // --- End simulation ---

    const feedbackId = freshID() as Feedback;
    await this.feedback.insertOne({
      _id: feedbackId,
      referenceVideo,
      practiceVideo,
      feedbackText,
      accuracyValue,
      createdAt: new Date(),
    });
    return { feedback: feedbackId };
  }

  /**
   * Query: Retrieves the feedback text and accuracy value for a specific feedback record.
   * @requires The feedback record with the given ID must exist.
   * @returns An object containing the feedback text and accuracy value, or an error if not found.
   */
  async getFeedback(
    { feedback }: { feedback: Feedback },
  ): Promise<
    | { feedbackText: string; accuracyValue: number }
    | { error: string }
  > {
    const feedbackDoc = await this.feedback.findOne({ _id: feedback });
    if (!feedbackDoc) {
      return { error: `Feedback with ID ${feedback} not found.` };
    }
    return {
      feedbackText: feedbackDoc.feedbackText,
      accuracyValue: feedbackDoc.accuracyValue,
    };
  }
}

```
