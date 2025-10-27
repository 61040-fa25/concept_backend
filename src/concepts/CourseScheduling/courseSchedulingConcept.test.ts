// src/concepts/CourseScheduling/courseSchedulingConcept.test.ts

import {
  assertEquals,
  assertExists,
  assertNotEquals,
  assertObjectMatch, // Import assertObjectMatch
  assertRejects,
} from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts"; // Adjust path as per your project structure
import { ID } from "../../utils/types.ts"; // Adjust path as per your project structure
import {
  Course,
  CourseSchedulingConcept,
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
  const actions = new CourseSchedulingConcept(db);

  try {
    // 1. Create Courses
    const createdCourse1 = await actions.createCourse({
      id: sampleCourse1.id,
      title: sampleCourse1.title,
      department: sampleCourse1.department,
    });
    assertExists(createdCourse1);
    assertExists(createdCourse1.c);
    // FIX 1: Use assertObjectMatch to ignore the _id field from the database
    assertObjectMatch(
      createdCourse1.c as unknown as Record<string, unknown>,
      sampleCourse1 as unknown as Record<string, unknown>,
    );

    const createdCourse2 = await actions.createCourse({
      id: sampleCourse2.id,
      title: sampleCourse2.title,
      department: sampleCourse2.department,
    });
    assertExists(createdCourse2);
    // FIX 1: Use assertObjectMatch to ignore the _id field from the database
    assertObjectMatch(
      createdCourse2.c as unknown as Record<string, unknown>,
      sampleCourse2 as unknown as Record<string, unknown>,
    );

    const allCourses = await actions.getAllCourses();
    assertEquals(allCourses.length, 2);
    assertEquals(allCourses.some((c) => c.id === sampleCourse1.id), true);

    // 2. Create Sections for Courses
    const section1 = await actions.createSection({
      courseId: createdCourse1.c.id,
      sectionNumber: "001",
      instructor: "Dr. Ada Lovelace",
      capacity: 30,
      timeSlots: [sampleTimeSlot1],
    });
    assertExists(section1);
    assertExists(section1.s);
    assertExists(section1.s.id);
    assertEquals(section1.s.courseId, createdCourse1.c.id);
    assertEquals(section1.s.sectionNumber, "001");

    const section2 = await actions.createSection({
      courseId: createdCourse2.c.id,
      sectionNumber: "002",
      instructor: "Dr. Alan Tuft",
      capacity: 25,
      timeSlots: [sampleTimeSlot2],
    });
    assertExists(section2);
    assertExists(section2.s);
    assertEquals(section2.s.courseId, createdCourse2.c.id);
    assertEquals(section2.s.sectionNumber, "002");

    const allSections = await actions.getAllSections();
    assertEquals(allSections.length, 2);
    assertEquals(allSections.some((s) => s.id === section1.s.id), true);

    // 3. Alice creates a schedule
    const aliceSchedule = await actions.createSchedule({
      userId: TEST_USER_ID_ALICE,
      name: "Fall 2024 Classes",
    });
    assertExists(aliceSchedule);
    assertExists(aliceSchedule.s.id);
    assertEquals(aliceSchedule.s.owner, TEST_USER_ID_ALICE);
    assertEquals(aliceSchedule.s.name, "Fall 2024 Classes");
    assertEquals(aliceSchedule.s.sectionIds, []);

    // 4. Alice adds sections to her schedule
    await actions.addSection({
      userId: TEST_USER_ID_ALICE,
      scheduleId: aliceSchedule.s.id,
      sectionId: section1.s.id,
    });
    await actions.addSection({
      userId: TEST_USER_ID_ALICE,
      scheduleId: aliceSchedule.s.id,
      sectionId: section2.s.id,
    });

    const updatedAliceSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: aliceSchedule.s.id });
    assertExists(updatedAliceSchedule);
    assertEquals(updatedAliceSchedule.sectionIds.length, 2);
    assertEquals(updatedAliceSchedule.sectionIds, [
      section1.s.id,
      section2.s.id,
    ]);

    // 5. Alice removes a section from her schedule
    await actions.removeSection(
      {
        userId: TEST_USER_ID_ALICE,
        scheduleId: aliceSchedule.s.id,
        sectionId: section1.s.id,
      },
    );
    const scheduleAfterRemove = await db.collection<Schedule>("schedules")
      .findOne({ id: aliceSchedule.s.id });
    assertExists(scheduleAfterRemove);
    assertEquals(scheduleAfterRemove.sectionIds.length, 1);
    assertEquals(scheduleAfterRemove.sectionIds, [section2.s.id]);

    // 6. Alice duplicates her schedule
    const duplicatedSchedule = await actions.duplicateSchedule({
      userId: TEST_USER_ID_ALICE,
      sourceScheduleId: aliceSchedule.s.id,
      newName: "Backup Schedule",
    });
    assertExists(duplicatedSchedule);
    assertNotEquals(duplicatedSchedule.s.id, aliceSchedule.s.id);
    assertEquals(duplicatedSchedule.s.name, "Backup Schedule");
    assertEquals(duplicatedSchedule.s.owner, TEST_USER_ID_ALICE);
    // FIX 2 (part of workflow fix): This assertion is now correct because scheduleAfterRemove
    // correctly reflects the state of the original schedule at the time of duplication.
    // The underlying action should be copying these, which this test now expects.
    assertEquals(
      duplicatedSchedule.s.sectionIds,
      scheduleAfterRemove.sectionIds,
    );

    // 7. Alice deletes her original schedule
    await actions.deleteSchedule({
      userId: TEST_USER_ID_ALICE,
      scheduleId: aliceSchedule.s.id,
    });
    const deletedSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: aliceSchedule.s.id });
    assertEquals(deletedSchedule, null);

    const allSchedules = await actions.getAllSchedules();
    assertEquals(allSchedules.length, 1); // Only the duplicated one should remain
    assertEquals(allSchedules[0].id, duplicatedSchedule.s.id);
  } finally {
    await client.close();
  }
});

Deno.test("Action: createCourse - creates and retrieves a course successfully", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    const course = await actions.createCourse({
      id: "PH101",
      title: "Introduction to Philosophy",
      department: "Philosophy",
    });
    assertExists(course);
    assertEquals(course.c.id, "PH101");
    assertEquals(course.c.title, "Introduction to Philosophy");
    assertEquals(course.c.department, "Philosophy");

    const retrievedCourse = await actions.getCourse({ courseId: "PH101" });
    assertExists(retrievedCourse);
    // FIX 1: Use assertObjectMatch to ignore the _id field from the database
    assertObjectMatch(
      retrievedCourse[0] as unknown as Record<string, unknown>,
      course.c as unknown as Record<string, unknown>,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: getCourse - returns null for non-existent course", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    const retrievedCourse = await actions.getCourse({
      courseId: "NONEXISTENT",
    });
    assertEquals(retrievedCourse, null);
  } finally {
    await client.close();
  }
});

Deno.test("Action: getAllCourses - retrieves all courses, including empty state", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    let courses = await actions.getAllCourses();
    assertEquals(courses.length, 0);

    await actions.createCourse(
      {
        id: sampleCourse1.id,
        title: sampleCourse1.title,
        department: sampleCourse1.department,
      },
    );
    await actions.createCourse(
      {
        id: sampleCourse2.id,
        title: sampleCourse2.title,
        department: sampleCourse2.department,
      },
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
  const actions = new CourseSchedulingConcept(db);

  try {
    // First, create a course that the section can reference
    await actions.createCourse(
      {
        id: sampleCourse1.id,
        title: sampleCourse1.title,
        department: sampleCourse1.department,
      },
    );

    const section = await actions.createSection(
      {
        courseId: sampleCourse1.id,
        sectionNumber: "001",
        instructor: "Dr. Jane Doe",
        capacity: 25,
        timeSlots: [sampleTimeSlot1],
      },
    );

    assertExists(section);
    assertExists(section.s.id); // freshID should generate one
    assertEquals(section.s.courseId, sampleCourse1.id);
    assertEquals(section.s.sectionNumber, "001");
    assertEquals(section.s.instructor, "Dr. Jane Doe");
    assertEquals(section.s.capacity, 25);
    assertEquals(section.s.timeSlots, [sampleTimeSlot1]);

    const retrievedSection = await actions.getSection({
      sectionId: section.s.id,
    });
    assertExists(retrievedSection);
    // FIX 1: Use assertObjectMatch to ignore the _id field from the database
    assertObjectMatch(
      retrievedSection[0] as unknown as Record<string, unknown>,
      section.s as unknown as Record<string, unknown>,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: editSection - updates section details", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    await actions.createCourse(
      {
        id: sampleCourse1.id,
        title: sampleCourse1.title,
        department: sampleCourse1.department,
      },
    );
    const originalSection = await actions.createSection(
      {
        courseId: sampleCourse1.id,
        sectionNumber: "001",
        instructor: "Dr. Jane Doe",
        capacity: 25,
        timeSlots: [sampleTimeSlot1],
      },
    );

    const updatedSection = await actions.editSection({
      sectionId: originalSection.s.id,
      updates: {
        instructor: "Prof. John Smith",
        capacity: 35,
        timeSlots: [sampleTimeSlot2],
      },
    });

    assertExists(updatedSection);
    assertEquals(updatedSection.s.id, originalSection.s.id);
    assertEquals(updatedSection.s.instructor, "Prof. John Smith");
    assertEquals(updatedSection.s.capacity, 35);
    assertEquals(updatedSection.s.timeSlots, [sampleTimeSlot2]);
    assertEquals(
      updatedSection.s.sectionNumber,
      originalSection.s.sectionNumber,
    ); // Should be unchanged

    const retrievedSection = await actions.getSection({
      sectionId: originalSection.s.id,
    });
    assertExists(retrievedSection);
    // FIX 1: Use assertObjectMatch to ignore the _id field from the database
    assertObjectMatch(
      retrievedSection[0] as unknown as Record<string, unknown>,
      updatedSection.s as unknown as Record<string, unknown>,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: editSection - returns null for non-existent section", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    const updatedSection = await actions.editSection({
      sectionId: "NONEXISTENT_SEC_ID",
      updates: {
        capacity: 100,
      },
    });
    assertEquals(updatedSection, null);
  } finally {
    await client.close();
  }
});

Deno.test("Action: getSection - returns null for non-existent section", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    const retrievedSection = await actions.getSection({
      sectionId: "NONEXISTENT_SEC_ID",
    });
    assertEquals(retrievedSection, null);
  } finally {
    await client.close();
  }
});

Deno.test("Action: getAllSections - retrieves all sections, including empty state", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    let sections = await actions.getAllSections();
    assertEquals(sections.length, 0);

    await actions.createCourse(
      {
        id: sampleCourse1.id,
        title: sampleCourse1.title,
        department: sampleCourse1.department,
      },
    );
    const section1 = await actions.createSection(
      {
        courseId: sampleCourse1.id,
        sectionNumber: "001",
        instructor: "Inst1",
        capacity: 30,
        timeSlots: [],
      },
    );
    const section2 = await actions.createSection(
      {
        courseId: sampleCourse1.id,
        sectionNumber: "002",
        instructor: "Inst2",
        capacity: 30,
        timeSlots: [],
      },
    );

    sections = await actions.getAllSections();
    assertEquals(sections.length, 2);
    assertEquals(sections.some((s) => s.id === section1.s.id), true);
    assertEquals(sections.some((s) => s.id === section2.s.id), true);
  } finally {
    await client.close();
  }
});

Deno.test("Action: createSchedule - creates an empty schedule for a user", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    const schedule = await actions.createSchedule(
      { userId: TEST_USER_ID_ALICE, name: "My New Schedule" },
    );
    assertExists(schedule);
    assertExists(schedule.s.id);
    assertEquals(schedule.s.owner, TEST_USER_ID_ALICE);
    assertEquals(schedule.s.name, "My New Schedule");
    assertEquals(schedule.s.sectionIds, []);

    const retrievedSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: schedule.s.id });
    assertExists(retrievedSchedule);
    // FIX 1: Use assertObjectMatch to ignore the _id field from the database
    assertObjectMatch(
      retrievedSchedule as unknown as Record<string, unknown>,
      schedule.s as unknown as Record<string, unknown>,
    );
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteSchedule - deletes a schedule by owner", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    const schedule = await actions.createSchedule(
      { userId: TEST_USER_ID_ALICE, name: "Schedule to Delete" },
    );
    assertExists(schedule);

    await actions.deleteSchedule({
      userId: TEST_USER_ID_ALICE,
      scheduleId: schedule.s.id,
    });

    const deletedSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: schedule.s.id });
    assertEquals(deletedSchedule, null);
  } finally {
    await client.close();
  }
});

Deno.test("Action: deleteSchedule - throws error if schedule not found", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    await assertRejects(
      async () => {
        await actions.deleteSchedule({
          userId: TEST_USER_ID_ALICE,
          scheduleId: "NONEXISTENT_SCHED",
        });
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
  const actions = new CourseSchedulingConcept(db);

  try {
    const schedule = await actions.createSchedule(
      { userId: TEST_USER_ID_ALICE, name: "Alice's Schedule" },
    );
    assertExists(schedule);

    await assertRejects(
      async () => {
        await actions.deleteSchedule({
          userId: TEST_USER_ID_BOB,
          scheduleId: schedule.s.id,
        }); // Bob tries to delete Alice's schedule
      },
      Error,
      "Unauthorized",
    );

    // Ensure schedule still exists
    const existingSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: schedule.s.id });
    assertExists(existingSchedule);
  } finally {
    await client.close();
  }
});

Deno.test("Action: addSection - adds a section to a schedule successfully", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    await actions.createCourse(
      {
        id: sampleCourse1.id,
        title: sampleCourse1.title,
        department: sampleCourse1.department,
      },
    );
    const section = await actions.createSection(
      {
        courseId: sampleCourse1.id,
        sectionNumber: "001",
        instructor: "Inst",
        capacity: 30,
        timeSlots: [],
      },
    );
    const schedule = await actions.createSchedule(
      { userId: TEST_USER_ID_ALICE, name: "My Schedule" },
    );

    await actions.addSection({
      userId: TEST_USER_ID_ALICE,
      scheduleId: schedule.s.id,
      sectionId: section.s.id,
    });

    const updatedSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: schedule.s.id });
    assertExists(updatedSchedule);
    assertEquals(updatedSchedule.sectionIds, [section.s.id]);
  } finally {
    await client.close();
  }
});

Deno.test("Action: addSection - does not add duplicate sections to a schedule", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    await actions.createCourse(
      {
        id: sampleCourse1.id,
        title: sampleCourse1.title,
        department: sampleCourse1.department,
      },
    );
    const section = await actions.createSection(
      {
        courseId: sampleCourse1.id,
        sectionNumber: "001",
        instructor: "Inst",
        capacity: 30,
        timeSlots: [],
      },
    );
    const schedule = await actions.createSchedule(
      { userId: TEST_USER_ID_ALICE, name: "My Schedule" },
    );

    await actions.addSection({
      userId: TEST_USER_ID_ALICE,
      scheduleId: schedule.s.id,
      sectionId: section.s.id,
    });
    await actions.addSection({
      userId: TEST_USER_ID_ALICE,
      scheduleId: schedule.s.id,
      sectionId: section.s.id,
    }); // Try adding again

    const updatedSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: schedule.s.id });
    assertExists(updatedSchedule);
    assertEquals(updatedSchedule.sectionIds.length, 1);
    assertEquals(updatedSchedule.sectionIds, [section.s.id]);
  } finally {
    await client.close();
  }
});

Deno.test("Action: addSection - throws error for non-existent schedule or unauthorized user", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    await actions.createCourse(
      {
        id: sampleCourse1.id,
        title: sampleCourse1.title,
        department: sampleCourse1.department,
      },
    );
    const section = await actions.createSection(
      {
        courseId: sampleCourse1.id,
        sectionNumber: "001",
        instructor: "Inst",
        capacity: 30,
        timeSlots: [],
      },
    );
    const schedule = await actions.createSchedule(
      { userId: TEST_USER_ID_ALICE, name: "My Schedule" },
    );

    await assertRejects(
      async () => {
        await actions.addSection(
          {
            userId: TEST_USER_ID_ALICE,
            scheduleId: "NONEXISTENT_SCHED",
            sectionId: section.s.id,
          },
        );
      },
      Error,
      "Schedule not found or unauthorized",
    );

    await assertRejects(
      async () => {
        await actions.addSection({
          userId: TEST_USER_ID_BOB,
          scheduleId: schedule.s.id,
          sectionId: section.s.id,
        }); // Bob tries to add to Alice's schedule
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
  const actions = new CourseSchedulingConcept(db);

  try {
    await actions.createCourse(
      {
        id: sampleCourse1.id,
        title: sampleCourse1.title,
        department: sampleCourse1.department,
      },
    );
    const section1 = await actions.createSection(
      {
        courseId: sampleCourse1.id,
        sectionNumber: "001",
        instructor: "Inst1",
        capacity: 30,
        timeSlots: [],
      },
    );
    const section2 = await actions.createSection(
      {
        courseId: sampleCourse1.id,
        sectionNumber: "002",
        instructor: "Inst2",
        capacity: 30,
        timeSlots: [],
      },
    );
    const schedule = await actions.createSchedule(
      { userId: TEST_USER_ID_ALICE, name: "My Schedule" },
    );

    await actions.addSection({
      userId: TEST_USER_ID_ALICE,
      scheduleId: schedule.s.id,
      sectionId: section1.s.id,
    });
    await actions.addSection({
      userId: TEST_USER_ID_ALICE,
      scheduleId: schedule.s.id,
      sectionId: section2.s.id,
    });

    let updatedSchedule = await db.collection<Schedule>("schedules").findOne({
      id: schedule.s.id,
    });
    assertEquals(updatedSchedule?.sectionIds.length, 2);

    await actions.removeSection({
      userId: TEST_USER_ID_ALICE,
      scheduleId: schedule.s.id,
      sectionId: section1.s.id,
    });

    updatedSchedule = await db.collection<Schedule>("schedules").findOne({
      id: schedule.s.id,
    });
    assertExists(updatedSchedule);
    assertEquals(updatedSchedule.sectionIds.length, 1);
    assertEquals(updatedSchedule.sectionIds, [section2.s.id]);
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeSection - handles removing non-existent section gracefully (no error, state unchanged)", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    await actions.createCourse(
      {
        id: sampleCourse1.id,
        title: sampleCourse1.title,
        department: sampleCourse1.department,
      },
    );
    const section1 = await actions.createSection(
      {
        courseId: sampleCourse1.id,
        sectionNumber: "001",
        instructor: "Inst1",
        capacity: 30,
        timeSlots: [],
      },
    );
    const schedule = await actions.createSchedule(
      { userId: TEST_USER_ID_ALICE, name: "My Schedule" },
    );
    await actions.addSection({
      userId: TEST_USER_ID_ALICE,
      scheduleId: schedule.s.id,
      sectionId: section1.s.id,
    });

    // Attempt to remove a section that was never added
    await actions.removeSection(
      {
        userId: TEST_USER_ID_ALICE,
        scheduleId: schedule.s.id,
        sectionId: "NONEXISTENT_SEC_ID",
      },
    );

    const updatedSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: schedule.s.id });
    assertExists(updatedSchedule);
    assertEquals(updatedSchedule.sectionIds.length, 1); // Should still have original section
    assertEquals(updatedSchedule.sectionIds, [section1.s.id]);
  } finally {
    await client.close();
  }
});

Deno.test("Action: removeSection - handles non-existent schedule or unauthorized access gracefully (no error, state unchanged)", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    await actions.createCourse(
      {
        id: sampleCourse1.id,
        title: sampleCourse1.title,
        department: sampleCourse1.department,
      },
    );
    const section1 = await actions.createSection({
      courseId: sampleCourse1.id,
      sectionNumber: "001",
      instructor: "Inst1",
      capacity: 30,
      timeSlots: [],
    });
    const schedule = await actions.createSchedule(
      { userId: TEST_USER_ID_ALICE, name: "My Schedule" },
    );
    await actions.addSection({
      userId: TEST_USER_ID_ALICE,
      scheduleId: schedule.s.id,
      sectionId: section1.s.id,
    });

    // Removing from a non-existent schedule (MongoDB updateOne with no match does nothing)
    await actions.removeSection(
      {
        userId: TEST_USER_ID_ALICE,
        scheduleId: "NONEXISTENT_SCHED",
        sectionId: section1.s.id,
      },
    );
    // Removing by an unauthorized user (MongoDB updateOne with owner mismatch does nothing)
    await actions.removeSection({
      userId: TEST_USER_ID_BOB,
      scheduleId: schedule.s.id,
      sectionId: section1.s.id,
    });

    const updatedSchedule = await db.collection<Schedule>("schedules")
      .findOne({ id: schedule.s.id });
    assertExists(updatedSchedule);
    assertEquals(updatedSchedule.sectionIds.length, 1); // Section should still be there
    assertEquals(updatedSchedule.sectionIds, [section1.s.id]);
  } finally {
    await client.close();
  }
});

Deno.test("Action: duplicateSchedule - duplicates a schedule successfully", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    await actions.createCourse(
      {
        id: sampleCourse1.id,
        title: sampleCourse1.title,
        department: sampleCourse1.department,
      },
    );
    const section1 = await actions.createSection({
      courseId: sampleCourse1.id,
      sectionNumber: "001",
      instructor: "Inst1",
      capacity: 30,
      timeSlots: [],
    });
    const originalSchedule = await actions.createSchedule({
      userId: TEST_USER_ID_ALICE,
      name: "Original Schedule",
    });
    await actions.addSection({
      userId: TEST_USER_ID_ALICE,
      scheduleId: originalSchedule.s.id,
      sectionId: section1.s.id,
    });

    // FIX 2: Retrieve the original schedule from the DB to get its updated state
    const originalScheduleFromDb = await db.collection<Schedule>("schedules")
      .findOne({ id: originalSchedule.s.id });
    assertExists(originalScheduleFromDb); // Ensure it was found

    const duplicatedSchedule = await actions.duplicateSchedule(
      {
        userId: TEST_USER_ID_ALICE,
        sourceScheduleId: originalSchedule.s.id,
        newName: "Duplicated Schedule",
      },
    );

    assertExists(duplicatedSchedule);
    assertNotEquals(duplicatedSchedule.s.id, originalSchedule.s.id);
    assertEquals(duplicatedSchedule.s.name, "Duplicated Schedule");
    assertEquals(duplicatedSchedule.s.owner, TEST_USER_ID_ALICE);
    // Compare against the state fetched from the database, not the initial in-memory object
    assertEquals(
      duplicatedSchedule.s.sectionIds,
      originalScheduleFromDb.sectionIds,
    );

    // Verify it's truly a new entry in DB
    const originalRetrieved = await db.collection<Schedule>("schedules")
      .findOne({ id: originalSchedule.s.id });
    assertExists(originalRetrieved);
    const duplicatedRetrieved = await db.collection<Schedule>("schedules")
      .findOne({ id: duplicatedSchedule.s.id });
    assertExists(duplicatedRetrieved);
    assertNotEquals(originalRetrieved.id, duplicatedRetrieved.id);
  } finally {
    await client.close();
  }
});

Deno.test("Action: duplicateSchedule - throws error if source schedule not found", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    await assertRejects(
      async () => {
        await actions.duplicateSchedule(
          {
            userId: TEST_USER_ID_ALICE,
            sourceScheduleId: "NONEXISTENT_SOURCE",
            newName: "New Name",
          },
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
  const actions = new CourseSchedulingConcept(db);

  try {
    const originalSchedule = await actions.createSchedule(
      { userId: TEST_USER_ID_ALICE, name: "My Schedule" },
    );
    assertExists(originalSchedule);

    await assertRejects(
      async () => {
        await actions.duplicateSchedule(
          {
            userId: TEST_USER_ID_BOB,
            sourceScheduleId: originalSchedule.s.id,
            newName: "Bob's Copy",
          },
        );
      },
      Error,
      "Unauthorized",
    );

    // Ensure no new schedule was created for Bob
    const allSchedules = await actions.getAllSchedules();
    assertEquals(allSchedules.length, 1);
    assertEquals(allSchedules[0].id, originalSchedule.s.id);
  } finally {
    await client.close();
  }
});

Deno.test("Action: getAllSchedules - retrieves all schedules, including empty state", async () => {
  const [db, client] = await testDb();
  const actions = new CourseSchedulingConcept(db);

  try {
    // Should be empty initially
    let schedules = await actions.getAllSchedules();
    assertEquals(schedules.length, 0);

    const schedule1 = await actions.createSchedule(
      { userId: TEST_USER_ID_ALICE, name: "Alice's Schedule" },
    );
    const schedule2 = await actions.createSchedule(
      { userId: TEST_USER_ID_BOB, name: "Bob's Schedule" },
    );

    schedules = await actions.getAllSchedules();
    assertEquals(schedules.length, 2);
    assertEquals(schedules.some((s) => s.id === schedule1.s.id), true);
    assertEquals(schedules.some((s) => s.id === schedule2.s.id), true);
  } finally {
    await client.close();
  }
});
