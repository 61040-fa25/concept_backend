---
timestamp: 'Sun Oct 19 2025 21:43:54 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_214354.baa17c93.md]]'
content_id: 5a0dd1c2c142b73ed2deed2b6c0eb769b4c077efd839cdd918f5ea62e563a0e5
---

# response:

```typescript
// src/concepts/CourseScheduling/courseSchedulingConcept.test.ts

import {
  assertEquals,
  assertExists,
  assertNotEquals,
  assertRejects,
  assertObjectMatch, // Import assertObjectMatch
} from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts"; // Adjust path as per your project structure
import { ID } from "../../utils/types.ts"; // Adjust path as per your project structure
import {
  Course,
  CourseScheduling_actions,
  DayOfWeek,
  Schedule,
  Section,
  TimeSlot,
} from "./courseSchedulingConcept.ts";

// --- Test Data ---
const TEST_USER_ID_ALICE = "user:alice" as ID;
const TEST_USER_ID_BOB = "user:bob" as ID;

const sampleCourse1: Course = {
  id: "CS101",
  title: "Introduction to Computer Science",
  department: "Computer Science",
};

const sampleCourse2: Course = {
  id: "MA201",
  title: "Calculus I",
  department: "Mathematics",
};

const sampleTimeSlot1: TimeSlot = {
  days: [DayOfWeek.Monday, DayOfWeek.Wednesday, DayOfWeek.Friday],
  startTime: "10:00",
  endTime: "10:50",
  location: "Building A, Room 101",
};

const sampleTimeSlot2: TimeSlot = {
  days: [DayOfWeek.Tuesday, DayOfWeek.Thursday],
  startTime: "14:00",
  endTime: "15:15",
  location: "Building B, Room 205",
};

Deno.test("Principle: Course scheduling full workflow (Create, schedule, manage student schedule)", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    // 1. Create Courses
    const createdCourse1 = await actions.createCourse(
      sampleCourse1.id,
      sampleCourse1.title,
      sampleCourse1.department,
    );
    assertExists(createdCourse1);
    // FIX 1: Use assertObjectMatch to ignore the _id field from the database
    assertObjectMatch(createdCourse1, sampleCourse1);

    const createdCourse2 = await actions.createCourse(
      sampleCourse2.id,
      sampleCourse2.title,
      sampleCourse2.department,
    );
    assertExists(createdCourse2);
    // FIX 1: Use assertObjectMatch to ignore the _id field from the database
    assertObjectMatch(createdCourse2, sampleCourse2);

    const allCourses = await actions.getAllCourses();
    assertEquals(allCourses.length, 2);
    assertEquals(allCourses.some((c) => c.id === sampleCourse1.id), true);

    // 2. Create Sections for Courses
    const section1 = await actions.createSection(
      createdCourse1.id,
      "001",
      "Dr. Ada Lovelace",
      30,
      [sampleTimeSlot1],
    );
    assertExists(section1);
    assertExists(section1.id);
    assertEquals(section1.courseId, createdCourse1.id);
    assertEquals(section1.sectionNumber, "001");

    const section2 = await actions.createSection(
      createdCourse2.id,
      "002",
      "Dr. Alan Turing",
      25,
      [sampleTimeSlot2],
    );
    assertExists(section2);
    assertExists(section2.id);

    const allSections = await actions.getAllSections();
    assertEquals(allSections.length, 2);
    assertEquals(allSections.some((s) => s.id === section1.id), true);

    // 3. Alice creates a schedule
    const aliceSchedule = await actions.createSchedule(
      TEST_USER_ID_ALICE,
      "Fall 2024 Classes",
    );
    assertExists(aliceSchedule);
    assertExists(aliceSchedule.id);
    assertEquals(aliceSchedule.owner, TEST_USER_ID_ALICE);
    assertEquals(aliceSchedule.name, "Fall 2024 Classes");
    assertEquals(aliceSchedule.sectionIds, []);

    // 4. Alice adds sections to her schedule
    await actions.addSection(TEST_USER_ID_ALICE, aliceSchedule.id, section1.id);
    await actions.addSection(TEST_USER_ID_ALICE, aliceSchedule.id, section2.id);

    const updatedAliceSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: aliceSchedule.id });
    assertExists(updatedAliceSchedule);
    assertEquals(updatedAliceSchedule.sectionIds.length, 2);
    assertEquals(updatedAliceSchedule.sectionIds, [section1.id, section2.id]);

    // 5. Alice removes a section from her schedule
    await actions.removeSection(
      TEST_USER_ID_ALICE,
      aliceSchedule.id,
      section1.id,
    );
    const scheduleAfterRemove = await db.collection<Schedule>("schedules")
      .findOne({ id: aliceSchedule.id });
    assertExists(scheduleAfterRemove);
    assertEquals(scheduleAfterRemove.sectionIds.length, 1);
    assertEquals(scheduleAfterRemove.sectionIds, [section2.id]);

    // 6. Alice duplicates her schedule
    const duplicatedSchedule = await actions.duplicateSchedule(
      TEST_USER_ID_ALICE,
      aliceSchedule.id, // This refers to the schedule that now only contains section2.id
      "Backup Schedule",
    );
    assertExists(duplicatedSchedule);
    assertNotEquals(duplicatedSchedule.id, aliceSchedule.id);
    assertEquals(duplicatedSchedule.name, "Backup Schedule");
    assertEquals(duplicatedSchedule.owner, TEST_USER_ID_ALICE);
    // The assertion is now correct because scheduleAfterRemove
    // correctly reflects the state of the original schedule at the time of duplication.
    // The underlying action should be copying these, which this test now expects.
    assertEquals(duplicatedSchedule.sectionIds, scheduleAfterRemove.sectionIds);

    // 7. Alice deletes her original schedule
    await actions.deleteSchedule(TEST_USER_ID_ALICE, aliceSchedule.id);
    const deletedSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: aliceSchedule.id });
    assertEquals(deletedSchedule, null);

    const allSchedules = await actions.getAllSchedules();
    assertEquals(allSchedules.length, 1); // Only the duplicated one should remain
    assertEquals(allSchedules[0].id, duplicatedSchedule.id);
  } finally {
    await client.close();
  }
});

Deno.test("Action: createCourse - creates and retrieves a course successfully", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    const course = await actions.createCourse(
      "PH101",
      "Introduction to Philosophy",
      "Philosophy",
    );
    assertExists(course);
    assertEquals(course.id, "PH101");
    assertEquals(course.title, "Introduction to Philosophy");
    assertEquals(course.department, "Philosophy");

    const retrievedCourse = await actions.getCourse("PH101");
    assertExists(retrievedCourse);
    // Use assertObjectMatch to ignore the _id field from the database
    assertObjectMatch(retrievedCourse, course);
  } finally {
    await client.close();
  }
});

Deno.test("Action: getCourse - returns null for non-existent course", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    const retrievedCourse = await actions.getCourse("NONEXISTENT");
    assertEquals(retrievedCourse, null);
  } finally {
    await client.close();
  }
});

Deno.test("Action: getAllCourses - retrieves all courses, including empty state", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    let courses = await actions.getAllCourses();
    assertEquals(courses.length, 0);

    await actions.createCourse(
      sampleCourse1.id,
      sampleCourse1.title,
      sampleCourse1.department,
    );
    await actions.createCourse(
      sampleCourse2.id,
      sampleCourse2.title,
      sampleCourse2.department,
    );

    courses = await actions.getAllCourses();
    assertEquals(courses.length, 2);
    assertEquals(courses.some((c) => c.id === sampleCourse1.id), true);
    assertEquals(courses.some((c) => c.id === sampleCourse2.id), true);
  } finally {
    await client.close();
  }
});

Deno.test("Action: createSection - creates and retrieves a section successfully", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    // First, create a course that the section can reference
    await actions.createCourse(
      sampleCourse1.id,
      sampleCourse1.title,
      sampleCourse1.department,
    );

    const section = await actions.createSection(
      sampleCourse1.id,
      "001",
      "Dr. Jane Doe",
      25,
      [sampleTimeSlot1],
    );

    assertExists(section);
    assertExists(section.id); // freshID should generate one
    assertEquals(section.courseId, sampleCourse1.id);
    assertEquals(section.sectionNumber, "001");
    assertEquals(section.instructor, "Dr. Jane Doe");
    assertEquals(section.capacity, 25);
    assertEquals(section.timeSlots, [sampleTimeSlot1]);

    const retrievedSection = await actions.getSection(section.id);
    assertExists(retrievedSection);
    // Use assertObjectMatch to ignore the _id field from the database
    assertObjectMatch(retrievedSection, section);
  } finally {
    await client.close();
  }
});

Deno.test("Action: editSection - updates section details", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    await actions.createCourse(
      sampleCourse1.id,
      sampleCourse1.title,
      sampleCourse1.department,
    );
    const originalSection = await actions.createSection(
      sampleCourse1.id,
      "001",
      "Dr. Jane Doe",
      25,
      [sampleTimeSlot1],
    );

    const updatedSection = await actions.editSection(originalSection.id, {
      instructor: "Prof. John Smith",
      capacity: 35,
      timeSlots: [sampleTimeSlot2],
    });

    assertExists(updatedSection);
    assertEquals(updatedSection.id, originalSection.id);
    assertEquals(updatedSection.instructor, "Prof. John Smith");
    assertEquals(updatedSection.capacity, 35);
    assertEquals(updatedSection.timeSlots, [sampleTimeSlot2]);
    assertEquals(updatedSection.sectionNumber, originalSection.sectionNumber); // Should be unchanged

    const retrievedSection = await actions.getSection(originalSection.id);
    assertExists(retrievedSection);
    // Use assertObjectMatch to ignore the _id field from the database
    assertObjectMatch(retrievedSection, updatedSection);
  } finally {
    await client.close();
  }
});

Deno.test("Action: editSection - returns null for non-existent section", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    const updatedSection = await actions.editSection("NONEXISTENT_SEC_ID", {
      capacity: 100,
    });
    assertEquals(updatedSection, null);
  } finally {
    await client.close();
  }
});

Deno.test("Action: getSection - returns null for non-existent section", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    const retrievedSection = await actions.getSection("NONEXISTENT_SEC_ID");
    assertEquals(retrievedSection, null);
  } finally {
    await client.close();
  }
});

Deno.test("Action: getAllSections - retrieves all sections, including empty state", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    let sections = await actions.getAllSections();
    assertEquals(sections.length, 0);

    await actions.createCourse(
      sampleCourse1.id,
      sampleCourse1.title,
      sampleCourse1.department,
    );
    const section1 = await actions.createSection(
      sampleCourse1.id,
      "001",
      "Inst1",
      30,
      [],
    );
    const section2 = await actions.createSection(
      sampleCourse1.id,
      "002",
      "Inst2",
      30,
      [],
    );

    sections = await actions.getAllSections();
    assertEquals(sections.length, 2);
    assertEquals(sections.some((s) => s.id === section1.id), true);
    assertEquals(sections.some((s) => s.id === section2.id), true);
  } finally {
    await client.close();
  }
});

Deno.test("Action: createSchedule - creates an empty schedule for a user", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    const schedule = await actions.createSchedule(
      TEST_USER_ID_ALICE,
      "My New Schedule",
    );
    assertExists(schedule);
    assertExists(schedule.id);
    assertEquals(schedule.owner, TEST_USER_ID_ALICE);
    assertEquals(schedule.name, "My New Schedule");
    assertEquals(schedule.sectionIds, []);

    const retrievedSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: schedule.id });
    assertExists(retrievedSchedule);
    // Use assertObjectMatch to ignore the _id field from the database
    assertObjectMatch(retrievedSchedule, schedule);
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteSchedule - deletes a schedule by owner", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    const schedule = await actions.createSchedule(
      TEST_USER_ID_ALICE,
      "Schedule to Delete",
    );
    assertExists(schedule);

    await actions.deleteSchedule(TEST_USER_ID_ALICE, schedule.id);

    const deletedSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: schedule.id });
    assertEquals(deletedSchedule, null);
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteSchedule - throws error if schedule not found", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    await assertRejects(
      async () => {
        await actions.deleteSchedule(TEST_USER_ID_ALICE, "NONEXISTENT_SCHED");
      },
      Error,
      "Schedule not found",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteSchedule - throws error if unauthorized user", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    const schedule = await actions.createSchedule(
      TEST_USER_ID_ALICE,
      "Alice's Schedule",
    );
    assertExists(schedule);

    await assertRejects(
      async () => {
        await actions.deleteSchedule(TEST_USER_ID_BOB, schedule.id); // Bob tries to delete Alice's schedule
      },
      Error,
      "Unauthorized",
    );

    // Ensure schedule still exists
    const existingSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: schedule.id });
    assertExists(existingSchedule);
  } finally {
    await client.close();
  }
});

Deno.test("Action: addSection - adds a section to a schedule successfully", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    await actions.createCourse(
      sampleCourse1.id,
      sampleCourse1.title,
      sampleCourse1.department,
    );
    const section = await actions.createSection(
      sampleCourse1.id,
      "001",
      "Inst",
      30,
      [],
    );
    const schedule = await actions.createSchedule(
      TEST_USER_ID_ALICE,
      "My Schedule",
    );

    await actions.addSection(TEST_USER_ID_ALICE, schedule.id, section.id);

    const updatedSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: schedule.id });
    assertExists(updatedSchedule);
    assertEquals(updatedSchedule.sectionIds, [section.id]);
  } finally {
    await client.close();
  }
});

Deno.test("Action: addSection - does not add duplicate sections to a schedule", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    await actions.createCourse(
      sampleCourse1.id,
      sampleCourse1.title,
      sampleCourse1.department,
    );
    const section = await actions.createSection(
      sampleCourse1.id,
      "001",
      "Inst",
      30,
      [],
    );
    const schedule = await actions.createSchedule(
      TEST_USER_ID_ALICE,
      "My Schedule",
    );

    await actions.addSection(TEST_USER_ID_ALICE, schedule.id, section.id);
    await actions.addSection(TEST_USER_ID_ALICE, schedule.id, section.id); // Try adding again

    const updatedSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: schedule.id });
    assertExists(updatedSchedule);
    assertEquals(updatedSchedule.sectionIds.length, 1);
    assertEquals(updatedSchedule.sectionIds, [section.id]);
  } finally {
    await client.close();
  }
});

Deno.test("Action: addSection - throws error for non-existent schedule or unauthorized user", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    await actions.createCourse(
      sampleCourse1.id,
      sampleCourse1.title,
      sampleCourse1.department,
    );
    const section = await actions.createSection(
      sampleCourse1.id,
      "001",
      "Inst",
      30,
      [],
    );
    const schedule = await actions.createSchedule(
      TEST_USER_ID_ALICE,
      "My Schedule",
    );

    await assertRejects(
      async () => {
        await actions.addSection(
          TEST_USER_ID_ALICE,
          "NONEXISTENT_SCHED",
          section.id,
        );
      },
      Error,
      "Schedule not found or unauthorized",
    );

    await assertRejects(
      async () => {
        await actions.addSection(TEST_USER_ID_BOB, schedule.id, section.id); // Bob tries to add to Alice's schedule
      },
      Error,
      "Schedule not found or unauthorized",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeSection - removes a section from a schedule successfully", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    await actions.createCourse(
      sampleCourse1.id,
      sampleCourse1.title,
      sampleCourse1.department,
    );
    const section1 = await actions.createSection(
      sampleCourse1.id,
      "001",
      "Inst1",
      30,
      [],
    );
    const section2 = await actions.createSection(
      sampleCourse1.id,
      "002",
      "Inst2",
      30,
      [],
    );
    const schedule = await actions.createSchedule(
      TEST_USER_ID_ALICE,
      "My Schedule",
    );

    await actions.addSection(TEST_USER_ID_ALICE, schedule.id, section1.id);
    await actions.addSection(TEST_USER_ID_ALICE, schedule.id, section2.id);

    let updatedSchedule = await db.collection<Schedule>("schedules").findOne({
      id: schedule.id,
    });
    assertEquals(updatedSchedule?.sectionIds.length, 2);

    await actions.removeSection(TEST_USER_ID_ALICE, schedule.id, section1.id);

    updatedSchedule = await db.collection<Schedule>("schedules").findOne({
      id: schedule.id,
    });
    assertExists(updatedSchedule);
    assertEquals(updatedSchedule.sectionIds.length, 1);
    assertEquals(updatedSchedule.sectionIds, [section2.id]);
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeSection - handles removing non-existent section gracefully (no error, state unchanged)", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    await actions.createCourse(
      sampleCourse1.id,
      sampleCourse1.title,
      sampleCourse1.department,
    );
    const section1 = await actions.createSection(
      sampleCourse1.id,
      "001",
      "Inst1",
      30,
      [],
    );
    const schedule = await actions.createSchedule(
      TEST_USER_ID_ALICE,
      "My Schedule",
    );
    await actions.addSection(TEST_USER_ID_ALICE, schedule.id, section1.id);

    // Attempt to remove a section that was never added
    await actions.removeSection(
      TEST_USER_ID_ALICE,
      schedule.id,
      "NONEXISTENT_SEC_ID",
    );

    const updatedSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: schedule.id });
    assertExists(updatedSchedule);
    assertEquals(updatedSchedule.sectionIds.length, 1); // Should still have original section
    assertEquals(updatedSchedule.sectionIds, [section1.id]);
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeSection - handles non-existent schedule or unauthorized access gracefully (no error, state unchanged)", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    await actions.createCourse(
      sampleCourse1.id,
      sampleCourse1.title,
      sampleCourse1.department,
    );
    const section1 = await actions.createSection(
      sampleCourse1.id,
      "001",
      "Inst1",
      30,
      [],
    );
    const schedule = await actions.createSchedule(
      TEST_USER_ID_ALICE,
      "My Schedule",
    );
    await actions.addSection(TEST_USER_ID_ALICE, schedule.id, section1.id);

    // Removing from a non-existent schedule (MongoDB updateOne with no match does nothing)
    await actions.removeSection(
      TEST_USER_ID_ALICE,
      "NONEXISTENT_SCHED",
      section1.id,
    );
    // Removing by an unauthorized user (MongoDB updateOne with owner mismatch does nothing)
    await actions.removeSection(TEST_USER_ID_BOB, schedule.id, section1.id);

    const updatedSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: schedule.id });
    assertExists(updatedSchedule);
    assertEquals(updatedSchedule.sectionIds.length, 1); // Section should still be there
    assertEquals(updatedSchedule.sectionIds, [section1.id]);
  } finally {
    await client.close();
  }
});

Deno.test("Action: duplicateSchedule - duplicates a schedule successfully", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    await actions.createCourse(
      sampleCourse1.id,
      sampleCourse1.title,
      sampleCourse1.department,
    );
    const section1 = await actions.createSection(
      sampleCourse1.id,
      "001",
      "Inst1",
      30,
      [],
    );
    const originalSchedule = await actions.createSchedule(
      TEST_USER_ID_ALICE,
      "Original Schedule",
    );
    await actions.addSection(
      TEST_USER_ID_ALICE,
      originalSchedule.id,
      section1.id,
    );

    // Retrieve the original schedule from the DB to get its updated state
    const originalScheduleFromDb = await db.collection<Schedule>("schedules")
      .findOne({ id: originalSchedule.id });
    assertExists(originalScheduleFromDb); // Ensure it was found

    const duplicatedSchedule = await actions.duplicateSchedule(
      TEST_USER_ID_ALICE,
      originalSchedule.id,
      "Duplicated Schedule",
    );

    assertExists(duplicatedSchedule);
    assertNotEquals(duplicatedSchedule.id, originalSchedule.id);
    assertEquals(duplicatedSchedule.name, "Duplicated Schedule");
    assertEquals(duplicatedSchedule.owner, TEST_USER_ID_ALICE);
    // Compare against the state fetched from the database, not the initial in-memory object
    assertEquals(duplicatedSchedule.sectionIds, originalScheduleFromDb.sectionIds);

    // Verify it's truly a new entry in DB
    const originalRetrieved = await db.collection<Schedule>("schedules")
      .findOne({ id: originalSchedule.id });
    assertExists(originalRetrieved);
    const duplicatedRetrieved = await db.collection<Schedule>("schedules")
      .findOne({ id: duplicatedSchedule.id });
    assertExists(duplicatedRetrieved);
    assertNotEquals(originalRetrieved.id, duplicatedRetrieved.id);
  } finally {
    await client.close();
  }
});

Deno.test("Action: duplicateSchedule - throws error if source schedule not found", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    await assertRejects(
      async () => {
        await actions.duplicateSchedule(
          TEST_USER_ID_ALICE,
          "NONEXISTENT_SOURCE",
          "New Name",
        );
      },
      Error,
      "Source schedule not found",
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: duplicateSchedule - throws error if unauthorized user", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    const originalSchedule = await actions.createSchedule(
      TEST_USER_ID_ALICE,
      "Original Schedule",
    );
    assertExists(originalSchedule);

    await assertRejects(
      async () => {
        await actions.duplicateSchedule(
          TEST_USER_ID_BOB, // Bob trying to duplicate Alice's schedule
          originalSchedule.id,
          "Bob's Copy",
        );
      },
      Error,
      "Unauthorized",
    );

    // Ensure no new schedule was created for Bob
    const allSchedules = await actions.getAllSchedules();
    assertEquals(allSchedules.length, 1);
    assertEquals(allSchedules[0].id, originalSchedule.id);
  } finally {
    await client.close();
  }
});

Deno.test("Action: getAllSchedules - retrieves all schedules, including empty state", async () => {
  const [db, client] = await testDb();
  const actions = new CourseScheduling_actions(db);

  try {
    // Should be empty initially
    let schedules = await actions.getAllSchedules();
    assertEquals(schedules.length, 0);

    const schedule1 = await actions.createSchedule(
      TEST_USER_ID_ALICE,
      "Alice's Schedule",
    );
    const schedule2 = await actions.createSchedule(
      TEST_USER_ID_BOB,
      "Bob's Schedule",
    );

    schedules = await actions.getAllSchedules();
    assertEquals(schedules.length, 2);
    assertEquals(schedules.some((s) => s.id === schedule1.id), true);
    assertEquals(schedules.some((s) => s.id === schedule2.id), true);
  } finally {
    await client.close();
  }
});
```
