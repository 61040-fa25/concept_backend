---
timestamp: 'Fri Oct 17 2025 19:04:50 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_190450.f1d71784.md]]'
content_id: d3fd1255e9322527cfe7697b2669a6ee1c447106b00c8eeaf9e8a1956794b436
---

# response:

```typescript
// courseScheduling_actions.test.ts

import {
  assertEquals,
  assertObjectMatch,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import * as actions from "./courseScheduling_actions.ts";
import type {
  Course,
  CourseSchedulingState,
  Schedule,
} from "./courseScheduling.ts";

/**
 * A simple mock store helper for testing state-mutating actions.
 * This helper initializes a state and provides a `dispatch` method
 * to apply an action function to it, mimicking a state management pattern.
 */
function createMockStore(initialState: CourseSchedulingState) {
  let state = structuredClone(initialState); // Deep clone to prevent test interference
  return {
    getState: () => state,
    dispatch: <P>(
      action: (state: CourseSchedulingState, payload: P) => CourseSchedulingState,
      payload: P,
    ) => {
      state = action(state, payload);
    },
  };
}

// --- Test Data Setup ---

const sampleCourses: Record<string, Course> = {
  "CS101": {
    id: "CS101",
    name: "Introduction to Computer Science",
    credits: 3,
    prerequisites: [],
  },
  "MA201": {
    id: "MA201",
    name: "Calculus II",
    credits: 4,
    prerequisites: ["MA100"],
  },
  "PHY250": {
    id: "PHY250",
    name: "University Physics I",
    credits: 4,
    prerequisites: ["MA201"],
  },
};

const sampleSchedules: Record<string, Schedule> = {
  "fall2024": {
    id: "fall2024",
    name: "Fall 2024 Plan",
    semester: { year: 2024, term: "Fall" },
    entries: [{ courseId: "MA201" }],
    totalCredits: 4,
  },
  "spring2025": {
    id: "spring2025",
    name: "Spring 2025 Draft",
    semester: { year: 2025, term: "Spring" },
    entries: [],
    totalCredits: 0,
  },
};

const getInitialState = (): CourseSchedulingState => ({
  courses: sampleCourses,
  schedules: sampleSchedules,
  selectedScheduleId: "fall2024",
  isLoading: false,
  error: null,
});

// --- Unit Tests for Actions ---

Deno.test("setLoading should update the isLoading flag", () => {
  // Validates that the setLoading action correctly sets the loading state.
  const store = createMockStore(getInitialState());
  assertEquals(store.getState().isLoading, false);

  store.dispatch(actions.setLoading, { isLoading: true });
  assertEquals(store.getState().isLoading, true);

  store.dispatch(actions.setLoading, { isLoading: false });
  assertEquals(store.getState().isLoading, false);
});

Deno.test("setError should update the error message", () => {
  // Validates that the setError action correctly sets the error string.
  const store = createMockStore(getInitialState());
  assertEquals(store.getState().error, null);

  const errorMessage = "Failed to fetch data.";
  store.dispatch(actions.setError, { error: errorMessage });
  assertEquals(store.getState().error, errorMessage);

  store.dispatch(actions.setError, { error: null });
  assertEquals(store.getState().error, null);
});

Deno.test("selectSchedule should update the selectedScheduleId", () => {
  // Validates that selectSchedule correctly changes the active schedule ID.
  const store = createMockStore(getInitialState());
  assertEquals(store.getState().selectedScheduleId, "fall2024");

  store.dispatch(actions.selectSchedule, { scheduleId: "spring2025" });
  assertEquals(store.getState().selectedScheduleId, "spring2025");
});

Deno.test("createSchedule should add a new, empty schedule to the state", () => {
  // Validates that a new schedule can be created and added to the schedules map.
  const store = createMockStore(getInitialState());
  const newSchedulePayload = {
    id: "summer2024",
    name: "Summer 2024 Session",
    semester: { year: 2024, term: "Summer" as const },
  };

  store.dispatch(actions.createSchedule, newSchedulePayload);

  const finalState = store.getState();
  const newSchedule = finalState.schedules["summer2024"];

  assertEquals(Object.keys(finalState.schedules).length, 3);
  assertObjectMatch(newSchedule, {
    id: "summer2024",
    name: "Summer 2024 Session",
    entries: [],
    totalCredits: 0,
  });
});

Deno.test("deleteSchedule should remove a schedule from the state", () => {
  // Validates that a specified schedule is removed from the schedules map.
  const store = createMockStore(getInitialState());
  assertEquals(store.getState().schedules["spring2025"].name, "Spring 2025 Draft");

  store.dispatch(actions.deleteSchedule, { scheduleId: "spring2025" });

  const finalState = store.getState();
  assertEquals(Object.keys(finalState.schedules).length, 1);
  assertEquals(finalState.schedules["spring2025"], undefined);
});

Deno.test("deleteSchedule should nullify selectedScheduleId if the selected schedule is deleted", () => {
  // Validates that selectedScheduleId is reset if the currently selected schedule is deleted.
  const store = createMockStore(getInitialState());
  assertEquals(store.getState().selectedScheduleId, "fall2024");

  store.dispatch(actions.deleteSchedule, { scheduleId: "fall2024" });

  const finalState = store.getState();
  assertEquals(finalState.selectedScheduleId, null);
});

Deno.test("renameSchedule should update the name of an existing schedule", () => {
  // Validates that a schedule's name can be correctly updated.
  const store = createMockStore(getInitialState());
  const payload = { scheduleId: "fall2024", newName: "Fall 2024 Final Plan" };

  store.dispatch(actions.renameSchedule, payload);

  const finalState = store.getState();
  assertEquals(finalState.schedules["fall2024"].name, "Fall 2024 Final Plan");
  // Verify other properties remain unchanged
  assertEquals(finalState.schedules["fall2024"].totalCredits, 4);
});

Deno.test("addCourseToSchedule should add a course and update total credits", () => {
  // Validates adding a new course to an existing schedule.
  const store = createMockStore(getInitialState());
  const payload = { scheduleId: "spring2025", courseId: "CS101" };

  store.dispatch(actions.addCourseToSchedule, payload);

  const finalState = store.getState();
  const updatedSchedule = finalState.schedules["spring2025"];
  assertEquals(updatedSchedule.entries.length, 1);
  assertEquals(updatedSchedule.entries[0].courseId, "CS101");
  assertEquals(updatedSchedule.totalCredits, 3); // 0 initial + 3 for CS101
});

Deno.test("addCourseToSchedule should not add a duplicate course", () => {
  // Validates that the same course cannot be added to a schedule twice.
  const store = createMockStore(getInitialState());
  // MA201 is already in fall2024
  const payload = { scheduleId: "fall2024", courseId: "MA201" };

  store.dispatch(actions.addCourseToSchedule, payload);

  const finalState = store.getState();
  const updatedSchedule = finalState.schedules["fall2024"];
  assertEquals(updatedSchedule.entries.length, 1); // Should still be 1
  assertEquals(updatedSchedule.totalCredits, 4); // Should not change
});

Deno.test("addCourseToSchedule should do nothing if course or schedule ID is invalid", () => {
  // Validates that the state remains unchanged if invalid IDs are provided.
  const store = createMockStore(getInitialState());
  const initialState = store.getState();

  // Invalid courseId
  store.dispatch(actions.addCourseToSchedule, {
    scheduleId: "fall2024",
    courseId: "INVALID",
  });
  assertEquals(store.getState(), initialState);

  // Invalid scheduleId
  store.dispatch(actions.addCourseToSchedule, {
    scheduleId: "INVALID",
    courseId: "CS101",
  });
  assertEquals(store.getState(), initialState);
});

Deno.test("removeCourseFromSchedule should remove a course and update total credits", () => {
  // Validates removing an existing course from a schedule.
  const store = createMockStore(getInitialState());
  const payload = { scheduleId: "fall2024", courseId: "MA201" };

  store.dispatch(actions.removeCourseFromSchedule, payload);

  const finalState = store.getState();
  const updatedSchedule = finalState.schedules["fall2024"];
  assertEquals(updatedSchedule.entries.length, 0);
  assertEquals(updatedSchedule.totalCredits, 0); // 4 initial - 4 for MA201
});

Deno.test("removeCourseFromSchedule should do nothing if the course is not in the schedule", () => {
  // Validates that the state is unchanged if trying to remove a course not present in the schedule.
  const store = createMockStore(getInitialState());
  const initialState = store.getState();
  const payload = { scheduleId: "fall2024", courseId: "CS101" }; // CS101 is not in fall2024

  store.dispatch(actions.removeCourseFromSchedule, payload);

  assertEquals(store.getState(), initialState); // State should be identical
});
```
