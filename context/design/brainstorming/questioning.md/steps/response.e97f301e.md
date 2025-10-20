---
timestamp: 'Sun Oct 19 2025 19:44:30 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_194430.48fc21bf.md]]'
content_id: e97f301eb0e873bb67e1073ca42344320a230621eb0f73ea6a0fbee31e1b8e26
---

# response:

```typescript
// file: src\mirrorMotionConcepts\FeedbackConcept.ts
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Collection prefix to ensure namespace separation
const PREFIX = "Feedback" + ".";

// Generic types for the concept's external dependencies
// Assuming Video is an ID type from another concept (e.g., ManageVideoConcept)
type Video = ID;

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
type Feedback = ID;

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
    let feedbackText = `Analysis complete. Overall accuracy: ${accuracyValue}%.`;

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

```typescript
// file: src\mirrorMotionConcepts\FeedbackConcept.test.ts
import {
  assertEquals,
  assertExists,
  assertNotEquals,
  assertBetween,
} from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import FeedbackConcept from "./FeedbackConcept.ts";

// Dummy IDs for videos. In a real application, these would come from the ManageVideoConcept.
const DUMMY_REFERENCE_VIDEO_ID = "refVideo123" as ID;
const DUMMY_PRACTICE_VIDEO_ID = "pracVideo456" as ID;
const NON_EXISTENT_FEEDBACK_ID = "nonExistentFeedback789" as ID;

// Dummy PoseData structures for testing.
// These simulate the output from a pose estimation model.
const DUMMY_POSE_DATA_REF = {
  "left_shoulder": [{ x: 100, y: 100, score: 0.95 }],
  "right_shoulder": [{ x: 150, y: 100, score: 0.92 }],
  "left_hip": [{ x: 100, y: 200, score: 0.90 }],
  "right_hip": [{ x: 150, y: 200, score: 0.88 }],
};

const DUMMY_POSE_DATA_PRAC = {
  "left_shoulder": [{ x: 105, y: 102, score: 0.94 }],
  "right_shoulder": [{ x: 155, y: 103, score: 0.91 }],
  "left_hip": [{ x: 102, y: 205, score: 0.89 }],
  "right_hip": [{ x: 152, y: 203, score: 0.87 }],
};

// An empty pose data object to test edge cases
const EMPTY_POSE_DATA = {};

Deno.test("Principle: After a video is broken into different poses, we can generate feedback on different body parts", async () => {
  const [db, client] = await testDb();
  const feedbackConcept = new FeedbackConcept(db);

  try {
    // 1. Action: analyze - Successfully analyzes pose data and creates feedback
    const analyzeResult = await feedbackConcept.analyze({
      referenceVideo: DUMMY_REFERENCE_VIDEO_ID,
      practiceVideo: DUMMY_PRACTICE_VIDEO_ID,
      referencePoseData: DUMMY_POSE_DATA_REF,
      practicePoseData: DUMMY_POSE_DATA_PRAC,
    });

    assertNotEquals(
      "error" in analyzeResult,
      true,
      "Analyze action should succeed and not return an error.",
    );
    const { feedback: feedbackId } = analyzeResult as { feedback: ID };
    assertExists(feedbackId, "A feedback ID should be returned after analysis.");

    // 2. Action: getFeedback - Successfully retrieves the generated feedback
    const getFeedbackResult = await feedbackConcept.getFeedback({
      feedback: feedbackId,
    });

    assertNotEquals(
      "error" in getFeedbackResult,
      true,
      "Get feedback action should succeed for an existing feedback ID.",
    );
    const { feedbackText, accuracyValue } = getFeedbackResult as {
      feedbackText: string;
      accuracyValue: number;
    };

    assertExists(feedbackText, "Retrieved feedback text should exist.");
    assertExists(accuracyValue, "Retrieved accuracy value should exist.");
    assertBetween(
      accuracyValue,
      60,
      95,
      "Accuracy value should be within the expected mocked range (60-95).",
    );
    assertEquals(
      feedbackText.startsWith("Analysis complete."),
      true,
      "Feedback text should start with the expected prefix.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: analyze - Creates feedback successfully with valid and non-empty inputs", async () => {
  const [db, client] = await testDb();
  const feedbackConcept = new FeedbackConcept(db);

  try {
    const analyzeResult = await feedbackConcept.analyze({
      referenceVideo: DUMMY_REFERENCE_VIDEO_ID,
      practiceVideo: DUMMY_PRACTICE_VIDEO_ID,
      referencePoseData: DUMMY_POSE_DATA_REF,
      practicePoseData: DUMMY_POSE_DATA_PRAC,
    });

    assertNotEquals(
      "error" in analyzeResult,
      true,
      "Analyze should succeed when given valid and non-empty pose data.",
    );
    const { feedback } = analyzeResult as { feedback: ID };
    assertExists(feedback, "Analyze should return a valid feedback ID.");
  } finally {
    await client.close();
  }
});

Deno.test("Action: analyze - Generates specific feedback for empty pose data (reference or practice)", async () => {
  const [db, client] = await testDb();
  const feedbackConcept = new FeedbackConcept(db);

  try {
    // Scenario 1: Empty practice pose data
    const analyzeResultEmptyPrac = await feedbackConcept.analyze({
      referenceVideo: DUMMY_REFERENCE_VIDEO_ID,
      practiceVideo: DUMMY_PRACTICE_VIDEO_ID,
      referencePoseData: DUMMY_POSE_DATA_REF,
      practicePoseData: EMPTY_POSE_DATA,
    });

    assertNotEquals(
      "error" in analyzeResultEmptyPrac,
      true,
      "Analyze should still process and return a feedback ID even with empty practice data.",
    );
    const { feedback: feedbackIdEmptyPrac } = analyzeResultEmptyPrac as {
      feedback: ID;
    };
    assertExists(
      feedbackIdEmptyPrac,
      "A feedback ID should be returned when practice pose data is empty.",
    );

    const getFeedbackResultEmptyPrac = await feedbackConcept.getFeedback({
      feedback: feedbackIdEmptyPrac,
    });
    assertNotEquals(
      "error" in getFeedbackResultEmptyPrac,
      true,
      "Retrieval of feedback for empty practice data should succeed.",
    );
    assertEquals(
      (getFeedbackResultEmptyPrac as { feedbackText: string }).feedbackText,
      "Cannot analyze. One or both pose datasets are empty.",
      "Feedback text should indicate an issue with empty practice pose data.",
    );
    assertEquals(
      (getFeedbackResultEmptyPrac as { accuracyValue: number }).accuracyValue,
      0,
      "Accuracy value should be 0 when practice pose data is empty.",
    );

    // Scenario 2: Empty reference pose data
    const analyzeResultEmptyRef = await feedbackConcept.analyze({
      referenceVideo: DUMMY_REFERENCE_VIDEO_ID,
      practiceVideo: DUMMY_PRACTICE_VIDEO_ID,
      referencePoseData: EMPTY_POSE_DATA,
      practicePoseData: DUMMY_POSE_DATA_PRAC,
    });

    assertNotEquals(
      "error" in analyzeResultEmptyRef,
      true,
      "Analyze should still process and return a feedback ID even with empty reference data.",
    );
    const { feedback: feedbackIdEmptyRef } = analyzeResultEmptyRef as {
      feedback: ID;
    };
    assertExists(
      feedbackIdEmptyRef,
      "A feedback ID should be returned when reference pose data is empty.",
    );

    const getFeedbackResultEmptyRef = await feedbackConcept.getFeedback({
      feedback: feedbackIdEmptyRef,
    });
    assertNotEquals(
      "error" in getFeedbackResultEmptyRef,
      true,
      "Retrieval of feedback for empty reference data should succeed.",
    );
    assertEquals(
      (getFeedbackResultEmptyRef as { feedbackText: string }).feedbackText,
      "Cannot analyze. One or both pose datasets are empty.",
      "Feedback text should indicate an issue with empty reference pose data.",
    );
    assertEquals(
      (getFeedbackResultEmptyRef as { accuracyValue: number }).accuracyValue,
      0,
      "Accuracy value should be 0 when reference pose data is empty.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: getFeedback - Successfully retrieves details for an existing feedback record", async () => {
  const [db, client] = await testDb();
  const feedbackConcept = new FeedbackConcept(db);
  let createdFeedbackId: ID | undefined;

  try {
    // 1. First, create a feedback record to ensure one exists for retrieval
    const analyzeResult = await feedbackConcept.analyze({
      referenceVideo: DUMMY_REFERENCE_VIDEO_ID,
      practiceVideo: DUMMY_PRACTICE_VIDEO_ID,
      referencePoseData: DUMMY_POSE_DATA_REF,
      practicePoseData: DUMMY_POSE_DATA_PRAC,
    });
    createdFeedbackId = (analyzeResult as { feedback: ID }).feedback;
    assertExists(createdFeedbackId, "A feedback record must be created for this test.");

    // 2. Now, attempt to retrieve the created feedback record
    const getFeedbackResult = await feedbackConcept.getFeedback({
      feedback: createdFeedbackId,
    });

    assertNotEquals(
      "error" in getFeedbackResult,
      true,
      "Get feedback should succeed when retrieving an existing feedback record.",
    );
    const { feedbackText, accuracyValue } = getFeedbackResult as {
      feedbackText: string;
      accuracyValue: number;
    };
    assertExists(feedbackText, "The retrieved feedbackText should be present.");
    assertExists(accuracyValue, "The retrieved accuracyValue should be present.");
    assertBetween(
      accuracyValue,
      60,
      95,
      "The retrieved accuracy value should be within the expected range.",
    );
    assertEquals(
      feedbackText.startsWith("Analysis complete."),
      true,
      "The retrieved feedback text should match the expected format.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: getFeedback - Fails gracefully when retrieving a non-existent feedback record", async () => {
  const [db, client] = await testDb();
  const feedbackConcept = new FeedbackConcept(db);

  try {
    // Attempt to retrieve a feedback record using a non-existent ID
    const getFeedbackResult = await feedbackConcept.getFeedback({
      feedback: NON_EXISTENT_FEEDBACK_ID,
    });

    assertEquals(
      "error" in getFeedbackResult,
      true,
      "Get feedback should fail when the provided ID does not correspond to an existing record.",
    );
    const { error } = getFeedbackResult as { error: string };
    assertExists(error, "An error message should be provided for non-existent feedback.");
    assertEquals(
      error,
      `Feedback with ID ${NON_EXISTENT_FEEDBACK_ID} not found.`,
      "The error message should clearly state that the feedback was not found.",
    );
  } finally {
    await client.close();
  }
});
```
