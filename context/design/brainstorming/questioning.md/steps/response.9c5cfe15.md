---
timestamp: 'Sun Oct 19 2025 22:24:48 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_222448.c402c485.md]]'
content_id: 9c5cfe1583c223cbf8fe9648669e23422457d959c79630fc8b95a2b0ba83133e
---

# response:

```markdown
# Course Scheduling Concept Test Results

## Test File: `src/concepts/CourseScheduling/courseSchedulingConcept.test.ts`
*   **Total Tests Executed:** 23
*   **Total Duration:** 22s

### Principle: Course scheduling full workflow (Create, schedule, manage student schedule)
*   **Type:** Principle
*   **Result:** Passed (ok)
*   **Duration:** 1s

### Action: createCourse - creates and retrieves a course successfully
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 690ms

### Action: getCourse - returns null for non-existent course
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 622ms

### Action: getAllCourses - retrieves all courses, including empty state
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 691ms

### Action: createSection - creates and retrieves a section successfully
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 604ms

### Action: editSection - updates section details
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 802ms

### Action: editSection - returns null for non-existent section
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 580ms

### Action: getSection - returns null for non-existent section
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 689ms

### Action: getAllSections - retrieves all sections, including empty state
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 704ms

### Action: createSchedule - creates an empty schedule for a user
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 756ms

### Action: deleteSchedule - deletes a schedule by owner
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 639ms

### Action: deleteSchedule - throws error if schedule not found
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 520ms

### Action: deleteSchedule - throws error if unauthorized user
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 708ms

### Action: addSection - adds a section to a schedule successfully
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 784ms

### Action: addSection - does not add duplicate sections to a schedule
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 863ms

### Action: addSection - throws error for non-existent schedule or unauthorized user
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 959ms

### Action: removeSection - removes a section from a schedule successfully
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 937ms

### Action: removeSection - handles removing non-existent section gracefully (no error, state unchanged)
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 864ms

### Action: removeSection - handles non-existent schedule or unauthorized access gracefully (no error, state unchanged)
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 860ms

### Action: duplicateSchedule - duplicates a schedule successfully
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 977ms

### Action: duplicateSchedule - throws error if source schedule not found
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 592ms

### Action: duplicateSchedule - throws error if unauthorized user
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 551ms

### Action: getAllSchedules - retrieves all schedules, including empty state
*   **Type:** Action
*   **Result:** Passed (ok)
*   **Duration:** 677ms

## Summary
*   **Passed:** 23
*   **Failed:** 0
```
