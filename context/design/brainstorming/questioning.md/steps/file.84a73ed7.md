---
timestamp: 'Sun Oct 19 2025 21:36:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_213614.0328112e.md]]'
content_id: 84a73ed7a68863fe21f1c643faef5280b2ad79c802c2ab2b23f1d5f312df9dc1
---

# file: src\concepts\CourseScheduling\LikertSurveyConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import LikertSurveyConcept from "./LikertSurveyConcept.ts";

const authorA = "author:Alice" as ID;
const respondentB = "respondent:Bob" as ID;
const respondentC = "respondent:Charlie" as ID;

Deno.test("Principle: Author creates survey, respondent answers, author views results", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);

  try {
    // 1. Author creates a survey with a 1-5 scale
    const createSurveyResult = await surveyConcept.createSurvey({
      author: authorA,
      title: "Customer Satisfaction",
      scaleMin: 1,
      scaleMax: 5,
    });
    assertNotEquals(
      "error" in createSurveyResult,
      true,
      "Survey creation should not fail.",
    );
    const { survey } = createSurveyResult as { survey: ID };
    assertExists(survey);

    // 2. Author adds several questions
    const addQ1Result = await surveyConcept.addQuestion({
      survey,
      text: "How satisfied are you with our product?",
    });
    assertNotEquals(
      "error" in addQ1Result,
      true,
      "Adding question 1 should not fail.",
    );
    const { question: q1 } = addQ1Result as { question: ID };

    const addQ2Result = await surveyConcept.addQuestion({
      survey,
      text: "How likely are you to recommend us?",
    });
    assertNotEquals(
      "error" in addQ2Result,
      true,
      "Adding question 2 should not fail.",
    );
    const { question: q2 } = addQ2Result as { question: ID };

    const questions = await surveyConcept._getSurveyQuestions({ survey });
    assertEquals(
      questions.length,
      2,
      "There should be two questions in the survey.",
    );

    // 3. A respondent submits their answers to those questions
    const submitR1Result = await surveyConcept.submitResponse({
      respondent: respondentB,
      question: q1,
      value: 5,
    });
    assertEquals(
      "error" in submitR1Result,
      false,
      "Submitting response 1 should succeed.",
    );

    const submitR2Result = await surveyConcept.submitResponse({
      respondent: respondentB,
      question: q2,
      value: 4,
    });
    assertEquals(
      "error" in submitR2Result,
      false,
      "Submitting response 2 should succeed.",
    );

    // 4. The author can view the collected responses
    const surveyResponses = await surveyConcept._getSurveyResponses({ survey });
    assertEquals(
      surveyResponses.length,
      2,
      "There should be two responses for the survey.",
    );
    assertEquals(surveyResponses.find((r) => r.question === q1)?.value, 5);
    assertEquals(surveyResponses.find((r) => r.question === q2)?.value, 4);

    const respondentAnswers = await surveyConcept._getRespondentAnswers({
      respondent: respondentB,
    });
    assertEquals(
      respondentAnswers.length,
      2,
      "The respondent should have two answers recorded.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: createSurvey requires scaleMin < scaleMax", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);

  try {
    const invalidResult = await surveyConcept.createSurvey({
      author: authorA,
      title: "Invalid Survey",
      scaleMin: 5,
      scaleMax: 1,
    });
    assertEquals(
      "error" in invalidResult,
      true,
      "Should fail when scaleMin > scaleMax.",
    );

    const equalResult = await surveyConcept.createSurvey({
      author: authorA,
      title: "Invalid Survey",
      scaleMin: 3,
      scaleMax: 3,
    });
    assertEquals(
      "error" in equalResult,
      true,
      "Should fail when scaleMin == scaleMax.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: addQuestion requires an existing survey", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);
  const nonExistentSurveyId = "survey:fake" as ID;

  try {
    const result = await surveyConcept.addQuestion({
      survey: nonExistentSurveyId,
      text: "This will fail",
    });
    assertEquals(
      "error" in result,
      true,
      "Adding a question to a non-existent survey should fail.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: submitResponse requirements are enforced", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);

  try {
    // Setup a valid survey and question
    const { survey } = (await surveyConcept.createSurvey({
      author: authorA,
      title: "Test Survey",
      scaleMin: 1,
      scaleMax: 5,
    })) as { survey: ID };
    const { question } =
      (await surveyConcept.addQuestion({ survey, text: "A question" })) as {
        question: ID;
      };

    // Requires: question must exist
    const nonExistentQuestionId = "question:fake" as ID;
    const res1 = await surveyConcept.submitResponse({
      respondent: respondentB,
      question: nonExistentQuestionId,
      value: 3,
    });
    assertEquals(
      "error" in res1,
      true,
      "Submitting a response to a non-existent question should fail.",
    );

    // Requires: respondent must not have already submitted a response
    await surveyConcept.submitResponse({
      respondent: respondentB,
      question,
      value: 3,
    }); // First submission is OK
    const res2 = await surveyConcept.submitResponse({
      respondent: respondentB,
      question,
      value: 4,
    }); // Second submission fails
    assertEquals(
      "error" in res2,
      true,
      "Submitting a response twice for the same question should fail.",
    );
    assertEquals(
      (res2 as { error: string }).error,
      "Respondent has already answered this question. Use updateResponse to change it.",
    );

    // Requires: value must be within survey's scale
    const res3 = await surveyConcept.submitResponse({
      respondent: respondentC,
      question,
      value: 0,
    }); // Below min
    assertEquals(
      "error" in res3,
      true,
      "Submitting a value below the minimum scale should fail.",
    );
    const res4 = await surveyConcept.submitResponse({
      respondent: respondentC,
      question,
      value: 6,
    }); // Above max
    assertEquals(
      "error" in res4,
      true,
      "Submitting a value above the maximum scale should fail.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: updateResponse successfully updates a response and enforces requirements", async () => {
  const [db, client] = await testDb();
  const surveyConcept = new LikertSurveyConcept(db);
  try {
    // Setup
    const { survey } = (await surveyConcept.createSurvey({
      author: authorA,
      title: "Test Survey",
      scaleMin: 1,
      scaleMax: 5,
    })) as { survey: ID };
    const { question } =
      (await surveyConcept.addQuestion({ survey, text: "A question" })) as {
        question: ID;
      };
    await surveyConcept.submitResponse({
      respondent: respondentB,
      question,
      value: 3,
    });

    // Requires: A response must already exist to be updated
    const res1 = await surveyConcept.updateResponse({
      respondent: respondentC,
      question,
      value: 4,
    });
    assertEquals(
      "error" in res1,
      true,
      "Updating a non-existent response should fail.",
    );

    // Requires: value must be within survey's scale
    const res2 = await surveyConcept.updateResponse({
      respondent: respondentB,
      question,
      value: 6,
    });
    assertEquals(
      "error" in res2,
      true,
      "Updating with a value outside the scale should fail.",
    );

    // Successful update
    const successResult = await surveyConcept.updateResponse({
      respondent: respondentB,
      question,
      value: 5,
    });
    assertEquals(
      "error" in successResult,
      false,
      "A valid update should succeed.",
    );

    // Verify the update
    const answers = await surveyConcept._getRespondentAnswers({
      respondent: respondentB,
    });
    assertEquals(answers.length, 1, "There should still be only one answer.");
    assertEquals(
      answers[0].value,
      5,
      "The answer's value should be updated to 5.",
    );
  } finally {
    await client.close();
  }
});

```

You are an expert TypeScript developer and testing engineer.

I have a test file `courseSchedulingConcept.test.ts` which is failing in two specific ways when run with Deno:

1. **Workflow test failure**:

`assertEquals(actualCourse, expectedCourse);`

fails because `actualCourse` returned from the database contains an extra `_id` field (e.g., `"_id": new ObjectId(...)`) which is not present in `expectedCourse`.

2. **duplicateSchedule test failure**:

`assertEquals(actualScheduleIds, expectedScheduleIds);`

fails because the action returns an empty array (`[]`) instead of the expected array of schedule IDs.

**Tasks:**

1. Modify the workflow test so that it ignores `_id` when comparing objects. This could be done by:

   * Using `assertObjectMatch` instead of `assertEquals`, or

   * Comparing only the relevant fields (`id`, `department`, `title`) and ignoring `_id`.

2. Modify the duplicateSchedule test so that it passes by ensuring the stubbed database contains the data needed for duplication, and that the action returns the correct schedule IDs. This could involve:

   * Pre-populating the stub/mock database with a schedule before calling `duplicateSchedule`.

   * Ensuring the stub returns the duplicated schedule IDs correctly.

3. Keep the **same style, structure, and assertion conventions** as `LikertSurveyConcept.test.ts` (Deno `std/testing/asserts.ts`, isolated `Deno.test` blocks, mocks and stubs for database calls).

4. The output should be a ready-to-run `courseSchedulingConcept.test.ts` with these fixes applied.

Make sure that the tests remain type-safe with the existing TypeScript interfaces (`Course`, `Section`, `CourseSchedulingState`) and that they remain independent and idempotent.

You are an expert TypeScript developer and testing engineer.

I have a file `courseSchedulingConcept.ts` that exports several asynchronous actions (functions) which interact with a database. The file uses TypeScript interfaces for `Course`, `Section`, and `CourseSchedulingState`.

I also have a reference test file, `LikertSurveyConcept.test.ts`, which shows the exact structure, style, and conventions I want to replicate:

* Using Deno’s `std/testing/asserts.ts` for assertions (`assert`, `assertEquals`, `assertExists`)

* Using stubs, spies, and mocks for database calls

* Structuring tests in isolated `Deno.test` blocks

Your task: Generate a **complete test file** called `courseSchedulingConcept.test.ts` that implements unit tests for **all actions exported from `courseSchedulingConcept.ts`**.

Requirements:

1. Follow the **same style and structure** as `LikertSurveyConcept.test.ts`.

2. Ensure each action is tested with proper mocking of the database (`db.collection` calls).

3. Respect the TypeScript interfaces (`Course`, `Section`, `CourseSchedulingState`) so that the tests type-check correctly.

4. Include tests for normal behavior, edge cases, and error handling where applicable.

5. Make each test independent and idempotent (state reset for each test).

Output a ready-to-use TypeScript test file that can be placed alongside `courseSchedulingConcept.ts`.
