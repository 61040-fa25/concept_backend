---
timestamp: 'Fri Oct 17 2025 18:44:48 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_184448.7dc0da56.md]]'
content_id: bba07e5e12223250a8819d116539511d444f5cb12d3d397e84c4266febd40fea
---

# response:

Of course. I will create a comprehensive unit test file for `courseScheduling_actions.ts` using Deno's built-in testing framework.

The tests will be structured to cover each action, ensuring they handle state immutability correctly and manage all related side effects as described in your instructions (e.g., removing a course also removes its assignments).

First, let's analyze the provided files to ensure the tests are accurate.

**Analysis of `testing-concepts.md`:**
This file defines the core data structures:

* `Id`: A unique string.
* `Course`: `{ id: Id; name: string; credits: number; }`
* `Term`: `{ id: Id; name: string; startDate: Date; endDate: Date; }`
* `Schedule`: The main state object, containing `courses`, `terms`, and `assignments` which is a `Record<TermId, CourseId[]>`.

**Analysis of `courseScheduling_actions.ts`:**
This file contains the pure functions (actions) that manipulate the `Schedule` state:

* `createSchedule`: Creates a new, empty schedule.
* `addCourse`: Adds a course to the schedule.
* `removeCourse`: Removes a course and all its assignments.
* `addTerm`: Adds a term and initializes its assignment list.
* `removeTerm`: Removes a term and its assignment list.
* `assignCourseToTerm`: Assigns a course to a term's assignment list.
* `unassignCourseFromTerm`: Removes a course from a term's assignment list.

A key principle of these actions is **immutability**: each function should return a *new* `Schedule` object rather than modifying the original one. The tests will verify this.

***

Here is the implementation of the unit test file.

### `src/concepts/CourseScheduling/courseScheduling_actions.test.ts`

```typescript
import {
  assert,
  assertEquals,
  assertNotEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { Schedule, Course, Term } from "./courseScheduling_types.ts";
import {
  createSchedule,
  addCourse,
  removeCourse,
  addTerm,
  removeTerm,
  assignCourseToTerm,
  unassignCourseFromTerm,
} from "./courseScheduling_actions.ts";

// --- Test Fixtures ---
// Reusable data for our tests to keep them clean and consistent.

const course1: Course = {
  id: "c1",
  name: "Introduction to Deno",
  credits: 3,
};
const course2: Course = { id: "c2", name: "Advanced TypeScript", credits: 4 };
const term1: Term = {
  id: "t1",
  name: "Fall 2024",
  startDate: new Date("2024-09-01"),
  endDate: new Date("2024-12-15"),
};
const term2: Term = {
  id: "t2",
  name: "Spring 2025",
  startDate: new Date("2025-01-15"),
  endDate: new Date("2025-05-10"),
};

/** A pre-populated schedule for testing actions that require existing data. */
const baseSchedule: Schedule = {
  id: "s1",
  name: "Computer Science Plan",
  courses: [course1, course2],
  terms: [term1, term2],
  assignments: {
    [term1.id]: [],
    [term2.id]: [],
  },
};

// --- Test Suites ---

Deno.test("createSchedule should create a new schedule with a name and empty values", () => {
  // Act
  const newSchedule = createSchedule("My New Degree Plan");

  // Assert
  assertExists(newSchedule.id);
  assertEquals(newSchedule.name, "My New Degree Plan");
  assertEquals(newSchedule.courses, []);
  assertEquals(newSchedule.terms, []);
  assertEquals(newSchedule.assignments, {});
});

Deno.test("addCourse", async (t) => {
  await t.step("should add a new course and return a new schedule object", () => {
    // Arrange
    const initialSchedule = createSchedule("Initial Plan");
    const newCourseData = { name: "Web Development 101", credits: 3 };

    // Act
    const updatedSchedule = addCourse(initialSchedule, newCourseData);

    // Assert
    assertNotEquals(updatedSchedule, initialSchedule, "Should return a new object (immutability).");
    assertEquals(updatedSchedule.courses.length, 1);
    assertEquals(updatedSchedule.courses[0].name, "Web Development 101");
    assertEquals(updatedSchedule.courses[0].credits, 3);
    assertExists(updatedSchedule.courses[0].id, "Should generate an ID for the new course.");
    assertEquals(updatedSchedule.terms, initialSchedule.terms, "Terms should not be affected.");
  });
});

Deno.test("removeCourse", async (t) => {
  await t.step("should remove a course from the schedule", () => {
    // Act
    const updatedSchedule = removeCourse(baseSchedule, course1.id);

    // Assert
    assertNotEquals(updatedSchedule, baseSchedule, "Should return a new object.");
    assertEquals(updatedSchedule.courses.length, 1);
    assertEquals(updatedSchedule.courses[0].id, course2.id);
    assert(!updatedSchedule.courses.some(c => c.id === course1.id), "Course 1 should be removed.");
  });

  await t.step("should also unassign the removed course from all terms", () => {
    // Arrange: create a schedule where course1 is assigned to term1 and term2
    const scheduleWithAssignments: Schedule = {
      ...baseSchedule,
      assignments: {
        [term1.id]: [course1.id, course2.id],
        [term2.id]: [course1.id],
      },
    };

    // Act
    const updatedSchedule = removeCourse(scheduleWithAssignments, course1.id);

    // Assert
    assertEquals(updatedSchedule.assignments[term1.id], [course2.id], "Course 1 should be unassigned from term 1.");
    assertEquals(updatedSchedule.assignments[term2.id], [], "Course 1 should be unassigned from term 2.");
  });
});

Deno.test("addTerm", async (t) => {
    await t.step("should add a new term and initialize its assignments list", () => {
        // Arrange
        const initialSchedule = createSchedule("Plan with Terms");
        const newTermData = {
            name: "Summer 2025",
            startDate: new Date("2025-06-01"),
            endDate: new Date("2025-08-15"),
        };

        // Act
        const updatedSchedule = addTerm(initialSchedule, newTermData);
        const newTermId = updatedSchedule.terms[0].id;

        // Assert
        assertNotEquals(updatedSchedule, initialSchedule, "Should return a new object.");
        assertEquals(updatedSchedule.terms.length, 1);
        assertEquals(updatedSchedule.terms[0].name, "Summer 2025");
        assertExists(newTermId);
        assert(newTermId in updatedSchedule.assignments, "Assignments object should have a key for the new term.");
        assertEquals(updatedSchedule.assignments[newTermId], [], "New term's assignment list should be empty.");
    });
});

Deno.test("removeTerm", async (t) => {
    await t.step("should remove a term and its corresponding assignments", () => {
        // Arrange
        const scheduleWithAssignment: Schedule = {
            ...baseSchedule,
            assignments: {
                ...baseSchedule.assignments,
                [term1.id]: [course1.id],
            },
        };

        // Act
        const updatedSchedule = removeTerm(scheduleWithAssignment, term1.id);
        
        // Assert
        assertNotEquals(updatedSchedule, scheduleWithAssignment, "Should return a new object.");
        assertEquals(updatedSchedule.terms.length, 1);
        assertEquals(updatedSchedule.terms[0].id, term2.id);
        assert(!(term1.id in updatedSchedule.assignments), "Term 1 should be removed from assignments.");
        assert(term2.id in updatedSchedule.assignments, "Term 2 should remain in assignments.");
    });
});

Deno.test("assignCourseToTerm", async (t) => {
    await t.step("should assign a course to a term", () => {
        // Act
        const updatedSchedule = assignCourseToTerm(baseSchedule, course1.id, term1.id);
        
        // Assert
        assertNotEquals(updatedSchedule, baseSchedule, "Should return a new object.");
        assertEquals(updatedSchedule.assignments[term1.id], [course1.id]);
        assertEquals(updatedSchedule.assignments[term2.id], [], "Other terms should not be affected.");
    });

    await t.step("should add a course to a term that already has assignments", () => {
        // Arrange
        const scheduleWithAssignment: Schedule = {
            ...baseSchedule,
            assignments: {
                ...baseSchedule.assignments,
                [term1.id]: [course2.id],
            },
        };

        // Act
        const updatedSchedule = assignCourseToTerm(scheduleWithAssignment, course1.id, term1.id);
        
        // Assert
        assertEquals(updatedSchedule.assignments[term1.id].length, 2);
        assert(updatedSchedule.assignments[term1.id].includes(course1.id));
        assert(updatedSchedule.assignments[term1.id].includes(course2.id));
    });
});


Deno.test("unassignCourseFromTerm", async (t) => {
    await t.step("should unassign a course from a term", () => {
        // Arrange
        const scheduleWithAssignments: Schedule = {
            ...baseSchedule,
            assignments: {
                [term1.id]: [course1.id, course2.id],
                [term2.id]: [course1.id],
            },
        };
        
        // Act
        const updatedSchedule = unassignCourseFromTerm(scheduleWithAssignments, course1.id, term1.id);
        
        // Assert
        assertNotEquals(updatedSchedule, scheduleWithAssignments, "Should return a new object.");
        assertEquals(updatedSchedule.assignments[term1.id], [course2.id], "Course 1 should be removed from term 1.");
        assertEquals(updatedSchedule.assignments[term2.id], [course1.id], "Term 2 assignments should not be affected.");
    });

    await t.step("should do nothing if the course is not assigned to the term", () => {
        // Arrange
        const scheduleWithAssignments: Schedule = {
            ...baseSchedule,
            assignments: {
                [term1.id]: [course2.id],
                [term2.id]: [],
            },
        };

        // Act: Attempt to unassign course1, which is not in term1's list
        const updatedSchedule = unassignCourseFromTerm(scheduleWithAssignments, course1.id, term1.id);
        
        // Assert
        // A new object is still returned due to the spread syntax, which is acceptable behavior.
        // The important part is that the data is logically equivalent.
        assertEquals(updatedSchedule.assignments[term1.id], [course2.id], "Term 1 assignments should be unchanged.");
    });
});
```

### How to Run the Tests

1. Save the code above as `courseScheduling_actions.test.ts` inside the `src/concepts/CourseScheduling/` directory, alongside your `courseScheduling_actions.ts` file.
2. Make sure your project structure looks like this:
   ```
   Academica/
   └── src/
       └── concepts/
           └── CourseScheduling/
               ├── courseScheduling_actions.ts
               ├── courseScheduling_actions.test.ts
               └── courseScheduling_types.ts
   ```
3. Open your terminal in the root directory of your project (`Academica/`).
4. Run the tests using the Deno CLI:

   ```sh
   deno test src/concepts/CourseScheduling/courseScheduling_actions.test.ts
   ```

Deno will automatically discover and run all the tests defined with `Deno.test()`, providing a summary of the results. This test file provides robust coverage for all the actions, including edge cases and the crucial immutability constraint.
