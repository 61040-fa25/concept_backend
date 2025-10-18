---
timestamp: 'Fri Oct 17 2025 18:54:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_185423.617ec65e.md]]'
content_id: 8c6935df0c0cac8a731a871c930ac4fce7a2681e34d2b064f6d38e7373e5e082
---

# response:

Of course. I will implement the unit tests for the actions in `courseScheduling_actions.ts` using Deno's built-in test framework. The tests will follow the Arrange-Act-Assert pattern, ensuring that each action correctly transforms the state as expected.

Here is the implementation of the test file `courseScheduling_actions.test.ts`.

```typescript
// File: src/concepts/CourseScheduling/courseScheduling_actions.test.ts

import {
  assertEquals,
  assert,
  assertNotEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import * as actions from "./courseScheduling_actions.ts";
import type { Course, CourseSchedulingState, Term } from "./courseScheduling.ts";

/**
 * Creates a pristine, empty state for use in tests.
 * @returns An empty CourseSchedulingState object.
 */
const getInitialState = (): CourseSchedulingState => ({
  terms: [],
  courses: [],
  coursePlacements: [],
});

// --- Test Suite for Term Actions ---

Deno.test("addTerm should add a new term to the state", () => {
  // Arrange
  const initialState = getInitialState();
  const newTermPayload = { name: "Fall 2024" };

  // Act
  const newState = actions.addTerm(initialState, newTermPayload);

  // Assert
  assertEquals(newState.terms.length, 1);
  assertEquals(newState.terms[0].name, "Fall 2024");
  assert(newState.terms[0].id, "The new term should have an ID");
  // Ensure other parts of the state are untouched
  assertEquals(newState.courses, initialState.courses);
  assertEquals(newState.coursePlacements, initialState.coursePlacements);
});

Deno.test("updateTerm should modify an existing term's properties", () => {
  // Arrange
  const termToUpdate: Term = { id: "term-1", name: "Old Name" };
  const initialState: CourseSchedulingState = {
    ...getInitialState(),
    terms: [termToUpdate, { id: "term-2", name: "Another Term" }],
  };
  const updatedTerm: Term = { id: "term-1", name: "Fall 2025 Semester" };

  // Act
  const newState = actions.updateTerm(initialState, updatedTerm);

  // Assert
  assertEquals(newState.terms.length, 2);
  const resultTerm = newState.terms.find((t) => t.id === "term-1");
  assertEquals(resultTerm?.name, "Fall 2025 Semester");
  // Ensure the other term was not modified
  assertEquals(newState.terms.find((t) => t.id === "term-2")?.name, "Another Term");
});

Deno.test("updateTerm should not change state if term ID does not exist", () => {
  // Arrange
  const initialState: CourseSchedulingState = {
    ...getInitialState(),
    terms: [{ id: "term-1", name: "Fall 2024" }],
  };
  const nonExistentUpdate: Term = { id: "term-999", name: "Ghost Term" };

  // Act
  const newState = actions.updateTerm(initialState, nonExistentUpdate);

  // Assert
  assertEquals(newState, initialState); // State should be identical
});

Deno.test("removeTerm should remove a term and any associated course placements", () => {
  // Arrange
  const initialState: CourseSchedulingState = {
    terms: [
      { id: "term-1", name: "Term to Keep" },
      { id: "term-2", name: "Term to Remove" },
    ],
    courses: [
      { id: "course-1", name: "CS 101", credits: 3 },
      { id: "course-2", name: "MATH 201", credits: 4 },
    ],
    coursePlacements: [
      { courseId: "course-1", termId: "term-2" }, // This placement should be removed
      { courseId: "course-2", termId: "term-1" }, // This placement should be kept
    ],
  };
  const termIdToRemove = "term-2";

  // Act
  const newState = actions.removeTerm(initialState, termIdToRemove);

  // Assert
  assertEquals(newState.terms.length, 1);
  assertEquals(newState.terms[0].id, "term-1");
  assertEquals(newState.coursePlacements.length, 1);
  assertEquals(newState.coursePlacements[0].termId, "term-1");
  // Ensure master course list is untouched
  assertEquals(newState.courses.length, 2);
});

// --- Test Suite for Course Actions ---

Deno.test("addCourse should add a new course to the master list", () => {
  // Arrange
  const initialState = getInitialState();
  const newCoursePayload = { name: "Data Structures", credits: 4 };

  // Act
  const newState = actions.addCourse(initialState, newCoursePayload);

  // Assert
  assertEquals(newState.courses.length, 1);
  assertEquals(newState.courses[0].name, "Data Structures");
  assertEquals(newState.courses[0].credits, 4);
  assert(newState.courses[0].id, "The new course should have an ID");
});

Deno.test("updateCourse should modify an existing course's properties", () => {
    // Arrange
    const courseToUpdate: Course = { id: "course-1", name: "Old Course", credits: 3 };
    const initialState: CourseSchedulingState = {
        ...getInitialState(),
        courses: [courseToUpdate, { id: "course-2", name: "Another Course", credits: 3 }],
    };
    const updatedCourse: Course = { id: "course-1", name: "Algorithms", credits: 4 };

    // Act
    const newState = actions.updateCourse(initialState, updatedCourse);

    // Assert
    assertEquals(newState.courses.length, 2);
    const resultCourse = newState.courses.find(c => c.id === "course-1");
    assertEquals(resultCourse?.name, "Algorithms");
    assertEquals(resultCourse?.credits, 4);
    // Ensure the other course was not modified
    assertEquals(newState.courses.find(c => c.id === "course-2")?.name, "Another Course");
});

Deno.test("removeCourse should remove a course and its placement", () => {
    // Arrange
    const initialState: CourseSchedulingState = {
        terms: [{ id: "term-1", name: "Fall 2024" }],
        courses: [
            { id: "course-1", name: "Course to Keep", credits: 3 },
            { id: "course-2", name: "Course to Remove", credits: 4 },
        ],
        coursePlacements: [
            { courseId: "course-1", termId: "term-1" },
            { courseId: "course-2", termId: "term-1" }, // This should be removed
        ],
    };
    const courseIdToRemove = "course-2";

    // Act
    const newState = actions.removeCourse(initialState, courseIdToRemove);

    // Assert
    assertEquals(newState.courses.length, 1);
    assertEquals(newState.courses[0].id, "course-1");
    assertEquals(newState.coursePlacements.length, 1);
    assertEquals(newState.coursePlacements[0].courseId, "course-1");
});


// --- Test Suite for Placement Actions ---

Deno.test("placeCourse should create a placement for an unplaced course", () => {
  // Arrange
  const initialState: CourseSchedulingState = {
    terms: [{ id: "term-1", name: "Fall 2024" }],
    courses: [{ id: "course-1", name: "CS 101", credits: 3 }],
    coursePlacements: [],
  };
  const placementPayload = { courseId: "course-1", termId: "term-1" };

  // Act
  const newState = actions.placeCourse(initialState, placementPayload);

  // Assert
  assertEquals(newState.coursePlacements.length, 1);
  assertEquals(newState.coursePlacements[0], placementPayload);
});

Deno.test("placeCourse should not create a duplicate placement for an already placed course", () => {
  // Arrange
  const initialState: CourseSchedulingState = {
    terms: [
      { id: "term-1", name: "Fall 2024" },
      { id: "term-2", name: "Spring 2025" },
    ],
    courses: [{ id: "course-1", name: "CS 101", credits: 3 }],
    coursePlacements: [{ courseId: "course-1", termId: "term-1" }],
  };
  // Attempt to place the same course in a different term
  const placementPayload = { courseId: "course-1", termId: "term-2" };

  // Act
  const newState = actions.placeCourse(initialState, placementPayload);

  // Assert
  // The state should remain unchanged because the course is already placed
  assertEquals(newState, initialState);
  assertEquals(newState.coursePlacements.length, 1);
  assertEquals(newState.coursePlacements[0].termId, "term-1");
});

Deno.test("unplaceCourse should remove a placement, returning the course to an 'unplaced' state", () => {
  // Arrange
  const initialState: CourseSchedulingState = {
    terms: [{ id: "term-1", name: "Fall 2024" }],
    courses: [{ id: "course-1", name: "CS 101", credits: 3 }],
    coursePlacements: [{ courseId: "course-1", termId: "term-1" }],
  };
  const courseIdToUnplace = "course-1";

  // Act
  const newState = actions.unplaceCourse(initialState, courseIdToUnplace);

  // Assert
  assertEquals(newState.coursePlacements.length, 0);
  // Ensure the course and term master lists are not affected
  assertEquals(newState.courses.length, 1);
  assertEquals(newState.terms.length, 1);
});
```

### How to Run the Tests

1. Make sure this test file is saved as `courseScheduling_actions.test.ts` in the same directory as `courseScheduling_actions.ts` and `courseScheduling.ts`.
2. Open your terminal in the root of your Deno project.
3. Run the Deno test runner, pointing it to the test file:

   ```sh
   deno test src/concepts/CourseScheduling/courseScheduling_actions.test.ts
   ```

   Or, to run all tests in your project:

   ```sh
   deno test
   ```

### Test Coverage Summary

This test file covers all the primary actions provided in the `courseScheduling_actions.ts` file:

* **Term Management:**
  * `addTerm`: Confirms a new term is added with a unique ID.
  * `updateTerm`: Confirms an existing term is correctly updated and handles cases where the term ID is not found.
  * `removeTerm`: Confirms a term is removed and, crucially, that its dependent `coursePlacements` are also cleaned up.
* **Course Management:**
  * `addCourse`: Confirms a new course is added to the central list.
  * `updateCourse`: Confirms an existing course's details can be modified.
  * `removeCourse`: Confirms a course is removed from the master list along with any of its placements.
* **Placement Management:**
  * `placeCourse`: Confirms a valid placement can be created and that the logic correctly prevents a course from being placed in more than one term at a time.
  * `unplaceCourse`: Confirms that a course placement can be successfully removed.
