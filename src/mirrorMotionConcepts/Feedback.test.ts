import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
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
    assertExists(
      feedbackId,
      "A feedback ID should be returned after analysis.",
    );

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
    assert(
      accuracyValue >= 60 && accuracyValue <= 95,
      `Expected ${accuracyValue} to be between ${60} and ${95}`,
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
    assertExists(
      createdFeedbackId,
      "A feedback record must be created for this test.",
    );

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
    assertExists(
      accuracyValue,
      "The retrieved accuracyValue should be present.",
    );
    assert(
      accuracyValue >= 60 && accuracyValue <= 95,
      `Expected ${accuracyValue} to be between ${60} and ${95}`,
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
    assertExists(
      error,
      "An error message should be provided for non-existent feedback.",
    );
    assertEquals(
      error,
      `Feedback with ID ${NON_EXISTENT_FEEDBACK_ID} not found.`,
      "The error message should clearly state that the feedback was not found.",
    );
  } finally {
    await client.close();
  }
});
