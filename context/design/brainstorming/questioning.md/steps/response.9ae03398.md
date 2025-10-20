---
timestamp: 'Sun Oct 19 2025 20:36:54 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_203654.343108df.md]]'
content_id: 9ae03398dbb3ad568072a6432c325b7e104e7009db9169ae4b8fa0c55aab075d
---

# response:

To effectively test the `CourseSchedulingConcept`, we need to simulate a full lifecycle for each managed entity: Courses, Schedule Blocks, and Enrollments. The provided `courseSchedulingConcept.ts` correctly uses separate collections for each entity (`courses`, `schedule_blocks`, `enrollments`) within a single `CourseSchedulingConcept` instance, which simplifies testing significantly compared to the initial interpretation.

The test structure will mirror `LikertSurveyConcept.test.ts` by using `Deno.test` with nested `t.step` for individual test cases, a setup step, and a cleanup step. We'll use Deno's standard `assert` module for assertions.

Here's the test file (`CourseSchedulingConcept.test.ts`):

```typescript
// @file: C:\Users\marin\OneDrive\Desktop\61040-portfolio\Academica\src\concepts\CourseScheduling\CourseSchedulingConcept.test.ts

import {
  assertEquals,
  assertExists,
  assertNotEquals,
  assertThrows,
  assertArrayIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { load } from "https://deno.land/std@0.208.0/dotenv/mod.ts";
import {
  CourseSchedulingConcept,
  Course,
  ScheduleBlock,
  Enrollment,
} from "./courseSchedulingConcept.ts"; // Adjust path as necessary
import { ObjectId } from "https://deno.land/x/mongo@v0.32.0/mod.ts";

// Load environment variables from .env file for database connection
await load({ export: true });

const TEST_DB_URL = Deno.env.get("MONGO_URI") || "mongodb://localhost:27017";
const TEST_DB_NAME = "academica_test_db"; // Use a distinct test database

Deno.test("CourseSchedulingConcept CRUD operations", async (t) => {
  let concept: CourseSchedulingConcept;

  // IDs to store for subsequent operations
  let createdCourseId: string;
  let createdScheduleBlockId: string;
  let createdEnrollmentId: string;
  let studentId1: string; // To test student-specific enrollments
  let studentId2: string; // To test another student
  let courseIdForEnrollments: string; // To test course-specific enrollments

  // --- Sample Test Data ---
  const TEST_COURSE_DATA: Omit<Course, "_id"> = {
    title: "Introduction to Deno",
    description: "A comprehensive course on Deno backend development.",
    credits: 3,
    department: "Computer Science",
  };

  const TEST_SCHEDULE_BLOCK_DATA: Omit<ScheduleBlock, "_id"> = {
    courseId: new ObjectId().toHexString(), // Placeholder, will be updated after course creation
    startTime: new Date("2024-09-01T09:00:00Z"),
    endTime: new Date("2024-09-01T10:30:00Z"),
    dayOfWeek: "Monday",
    room: "Online",
    instructor: "Dr. Jane Doe",
    capacity: 30,
    enrolledStudents: 0,
  };

  const TEST_ENROLLMENT_DATA: Omit<Enrollment, "_id"> = {
    studentId: new ObjectId().toHexString(), // Placeholder
    courseId: new ObjectId().toHexString(), // Placeholder
    enrollmentDate: new Date(),
    status: "active",
  };

  // --- Setup and Teardown ---

  t.step("setup", async () => {
    concept = new CourseSchedulingConcept(TEST_DB_URL, TEST_DB_NAME);
    await concept.connect();
    // Clear all test collections before starting tests to ensure a clean state
    await concept.clearCollections();

    // Generate specific IDs for cross-referencing in enrollment tests
    studentId1 = new ObjectId().toHexString();
    studentId2 = new ObjectId().toHexString();
    courseIdForEnrollments = new ObjectId().toHexString(); // Will be an actual course later
  });

  t.step("cleanup", async () => {
    // Clear all test collections after tests are done
    await concept.clearCollections();
    await concept.disconnect();
  });

  // --- Course Management Tests ---

  await t.step("1. Course Management", async (t) => {
    await t.step("should create a new course", async () => {
      const createdCourse = await concept.createCourse(TEST_COURSE_DATA);
      assertExists(createdCourse._id);
      assertEquals(createdCourse.title, TEST_COURSE_DATA.title);
      assertEquals(createdCourse.department, TEST_COURSE_DATA.department);
      createdCourseId = createdCourse._id.toHexString();
      // Update the placeholder courseId for schedule block and enrollment
      TEST_SCHEDULE_BLOCK_DATA.courseId = createdCourseId;
      courseIdForEnrollments = createdCourseId; // Ensure this is a valid course ID
    });

    await t.step("should get a course by its ID", async () => {
      const retrievedCourse = await concept.getCourseById(createdCourseId);
      assertExists(retrievedCourse);
      assertEquals(retrievedCourse!._id.toHexString(), createdCourseId);
      assertEquals(retrievedCourse!.title, TEST_COURSE_DATA.title);
    });

    await t.step("should return null for a non-existent course ID", async () => {
      const nonExistentId = new ObjectId().toHexString();
      const course = await concept.getCourseById(nonExistentId);
      assertEquals(course, null);
    });

    await t.step("should get all courses", async () => {
      const allCourses = await concept.getAllCourses();
      assertEquals(allCourses.length, 1);
      assertEquals(allCourses[0]._id.toHexString(), createdCourseId);
    });

    await t.step("should update an existing course", async () => {
      const updateData = {
        description: "An updated description of Deno.",
        credits: 4,
      };
      const updatedCourse = await concept.updateCourse(createdCourseId, updateData);
      assertExists(updatedCourse);
      assertEquals(updatedCourse!._id.toHexString(), createdCourseId);
      assertEquals(updatedCourse!.description, updateData.description);
      assertEquals(updatedCourse!.credits, updateData.credits);
      // Ensure other fields are unchanged
      assertEquals(updatedCourse!.title, TEST_COURSE_DATA.title);
    });

    await t.step("should not update a non-existent course", async () => {
      const nonExistentId = new ObjectId().toHexString();
      const updateData = { title: "Phantom Course" };
      const updatedCourse = await concept.updateCourse(nonExistentId, updateData);
      assertEquals(updatedCourse, null);
    });

    await t.step("should delete a course by its ID", async () => {
      await concept.deleteCourse(createdCourseId);
      const deletedCourse = await concept.getCourseById(createdCourseId);
      assertEquals(deletedCourse, null);
    });
    
    await t.step("should handle invalid ObjectId format for course operations", async () => {
      const invalidId = "invalid-id-format";
      await assertThrows(
        async () => await concept.getCourseById(invalidId),
        Error,
        "Invalid ObjectId format"
      );
      await assertThrows(
        async () => await concept.updateCourse(invalidId, { title: "X" }),
        Error,
        "Invalid ObjectId format"
      );
      await assertThrows(
        async () => await concept.deleteCourse(invalidId),
        Error,
        "Invalid ObjectId format"
      );
    });
  });

  // Re-create a course for subsequent tests that need a valid course ID
  await t.step("Re-create a course for subsequent tests", async () => {
    const createdCourse = await concept.createCourse(TEST_COURSE_DATA);
    createdCourseId = createdCourse._id.toHexString();
    TEST_SCHEDULE_BLOCK_DATA.courseId = createdCourseId; // Link schedule block to this course
    courseIdForEnrollments = createdCourseId; // Link enrollments to this course
  });

  // --- Schedule Block Management Tests ---

  await t.step("2. Schedule Block Management", async (t) => {
    await t.step("should create a new schedule block", async () => {
      const createdBlock = await concept.createScheduleBlock(TEST_SCHEDULE_BLOCK_DATA);
      assertExists(createdBlock._id);
      assertEquals(createdBlock.courseId, createdCourseId);
      assertEquals(createdBlock.room, TEST_SCHEDULE_BLOCK_DATA.room);
      createdScheduleBlockId = createdBlock._id.toHexString();
    });

    await t.step("should get a schedule block by its ID", async () => {
      const retrievedBlock = await concept.getScheduleBlockById(createdScheduleBlockId);
      assertExists(retrievedBlock);
      assertEquals(retrievedBlock!._id.toHexString(), createdScheduleBlockId);
      assertEquals(retrievedBlock!.instructor, TEST_SCHEDULE_BLOCK_DATA.instructor);
    });

    await t.step("should return null for a non-existent schedule block ID", async () => {
      const nonExistentId = new ObjectId().toHexString();
      const block = await concept.getScheduleBlockById(nonExistentId);
      assertEquals(block, null);
    });

    await t.step("should get all schedule blocks", async () => {
      const allBlocks = await concept.getAllScheduleBlocks();
      assertEquals(allBlocks.length, 1);
      assertEquals(allBlocks[0]._id.toHexString(), createdScheduleBlockId);
    });

    await t.step("should update an existing schedule block", async () => {
      const updateData = {
        room: "Building B, Room 201",
        capacity: 40,
      };
      const updatedBlock = await concept.updateScheduleBlock(createdScheduleBlockId, updateData);
      assertExists(updatedBlock);
      assertEquals(updatedBlock!._id.toHexString(), createdScheduleBlockId);
      assertEquals(updatedBlock!.room, updateData.room);
      assertEquals(updatedBlock!.capacity, updateData.capacity);
    });

    await t.step("should not update a non-existent schedule block", async () => {
      const nonExistentId = new ObjectId().toHexString();
      const updateData = { room: "X" };
      const updatedBlock = await concept.updateScheduleBlock(nonExistentId, updateData);
      assertEquals(updatedBlock, null);
    });

    await t.step("should delete a schedule block by its ID", async () => {
      await concept.deleteScheduleBlock(createdScheduleBlockId);
      const deletedBlock = await concept.getScheduleBlockById(createdScheduleBlockId);
      assertEquals(deletedBlock, null);
    });

    await t.step("should handle invalid ObjectId format for schedule block operations", async () => {
      const invalidId = "invalid-id-format";
      await assertThrows(
        async () => await concept.getScheduleBlockById(invalidId),
        Error,
        "Invalid ObjectId format"
      );
      await assertThrows(
        async () => await concept.updateScheduleBlock(invalidId, { room: "X" }),
        Error,
        "Invalid ObjectId format"
      );
      await assertThrows(
        async () => await concept.deleteScheduleBlock(invalidId),
        Error,
        "Invalid ObjectId format"
      );
    });
  });

  // --- Enrollment Management Tests ---

  await t.step("3. Enrollment Management", async (t) => {
    await t.step("should enroll a student in a course", async () => {
      const enrollmentData = {
        studentId: studentId1,
        courseId: courseIdForEnrollments,
        enrollmentDate: new Date(),
        status: "active",
      };
      const createdEnrollment = await concept.enrollStudentInCourse(enrollmentData);
      assertExists(createdEnrollment._id);
      assertEquals(createdEnrollment.studentId, studentId1);
      assertEquals(createdEnrollment.courseId, courseIdForEnrollments);
      createdEnrollmentId = createdEnrollment._id.toHexString();
    });

    await t.step("should get an enrollment by its ID", async () => {
      const retrievedEnrollment = await concept.getEnrollmentById(createdEnrollmentId);
      assertExists(retrievedEnrollment);
      assertEquals(retrievedEnrollment!._id.toHexString(), createdEnrollmentId);
      assertEquals(retrievedEnrollment!.studentId, studentId1);
    });

    await t.step("should return null for a non-existent enrollment ID", async () => {
      const nonExistentId = new ObjectId().toHexString();
      const enrollment = await concept.getEnrollmentById(nonExistentId);
      assertEquals(enrollment, null);
    });

    await t.step("should get all enrollments", async () => {
      // Create another enrollment for student2 in the same course
      await concept.enrollStudentInCourse({
        studentId: studentId2,
        courseId: courseIdForEnrollments,
        enrollmentDate: new Date(),
        status: "active",
      });
      const allEnrollments = await concept.getAllEnrollments();
      assertEquals(allEnrollments.length, 2);
      assertArrayIncludes(allEnrollments.map(e => e.studentId), [studentId1, studentId2]);
    });

    await t.step("should update an existing enrollment", async () => {
      const updateData = { status: "withdrawn" as "withdrawn" };
      const updatedEnrollment = await concept.updateEnrollment(createdEnrollmentId, updateData);
      assertExists(updatedEnrollment);
      assertEquals(updatedEnrollment!._id.toHexString(), createdEnrollmentId);
      assertEquals(updatedEnrollment!.status, updateData.status);
    });

    await t.step("should not update a non-existent enrollment", async () => {
      const nonExistentId = new ObjectId().toHexString();
      const updateData = { status: "completed" as "completed" };
      const updatedEnrollment = await concept.updateEnrollment(nonExistentId, updateData);
      assertEquals(updatedEnrollment, null);
    });

    await t.step("should get enrollments for a specific student", async () => {
      // We have one for student1, and one for student2.
      // Let's create another for student1 in a different 'dummy' course.
      const dummyCourse = await concept.createCourse({
        title: "Dummy Course", description: "d", credits: 1, department: "dummy"
      });
      await concept.enrollStudentInCourse({
        studentId: studentId1,
        courseId: dummyCourse._id.toHexString(),
        enrollmentDate: new Date(),
        status: "active",
      });

      const student1Enrollments = await concept.getEnrollmentsForStudent(studentId1);
      assertEquals(student1Enrollments.length, 2); // Original + dummy course
      assertArrayIncludes(student1Enrollments.map(e => e.courseId), [courseIdForEnrollments, dummyCourse._id.toHexString()]);

      const student2Enrollments = await concept.getEnrollmentsForStudent(studentId2);
      assertEquals(student2Enrollments.length, 1);
      assertEquals(student2Enrollments[0].courseId, courseIdForEnrollments);

      // Clean up dummy course
      await concept.deleteCourse(dummyCourse._id.toHexString());
    });

    await t.step("should get enrollments for a specific course", async () => {
      // We have student1 (status withdrawn) and student2 (status active) for courseIdForEnrollments
      const courseEnrollments = await concept.getEnrollmentsForCourse(courseIdForEnrollments);
      assertEquals(courseEnrollments.length, 2);
      assertArrayIncludes(courseEnrollments.map(e => e.studentId), [studentId1, studentId2]);
    });

    await t.step("should delete an enrollment by its ID", async () => {
      await concept.deleteEnrollment(createdEnrollmentId);
      const deletedEnrollment = await concept.getEnrollmentById(createdEnrollmentId);
      assertEquals(deletedEnrollment, null);

      // Verify other enrollment for student2 is still there
      const remainingEnrollments = await concept.getEnrollmentsForCourse(courseIdForEnrollments);
      assertEquals(remainingEnrollments.length, 1);
      assertEquals(remainingEnrollments[0].studentId, studentId2);
    });

    await t.step("should handle invalid ObjectId format for enrollment operations", async () => {
      const invalidId = "invalid-id-format";
      await assertThrows(
        async () => await concept.getEnrollmentById(invalidId),
        Error,
        "Invalid ObjectId format"
      );
      await assertThrows(
        async () => await concept.updateEnrollment(invalidId, { status: "completed" as "completed" }),
        Error,
        "Invalid ObjectId format"
      );
      await assertThrows(
        async () => await concept.deleteEnrollment(invalidId),
        Error,
        "Invalid ObjectId format"
      );
      await assertThrows(
        async () => await concept.getEnrollmentsForStudent(invalidId),
        Error,
        "Invalid ObjectId format"
      );
      await assertThrows(
        async () => await concept.getEnrollmentsForCourse(invalidId),
        Error,
        "Invalid ObjectId format"
      );
    });
  });
});
```

### To Run These Tests:

1. **Save the test file:** Save the code above as `CourseSchedulingConcept.test.ts` in the same directory as `courseSchedulingConcept.ts` (or adjust the import path).
2. **Ensure MongoDB is running:** These tests connect to a MongoDB instance. Make sure you have MongoDB running locally, or configure `MONGO_URI` in your `.env` file to point to a remote instance.
3. **Create a `.env` file (if not already existing):** In the root of your project, create a `.env` file with your MongoDB connection string:
   ```
   MONGO_URI=mongodb://localhost:27017
   ```
   (Adjust if your MongoDB instance is elsewhere or requires authentication).
4. **Run with Deno:** Open your terminal in the project's root directory and run the tests:
   ```bash
   deno test --allow-read --allow-env --allow-net --allow-hrtime src/concepts/CourseScheduling/CourseSchedulingConcept.test.ts
   ```
   * `--allow-read`: Needed for `Deno.env.get` (accessing `.env` file).
   * `--allow-env`: Needed for `Deno.env.get` (accessing environment variables).
   * `--allow-net`: Needed for connecting to MongoDB.
   * `--allow-hrtime`: Sometimes needed by MongoDB driver for precise timing.

This test suite provides comprehensive coverage for the CRUD operations of Courses, Schedule Blocks, and Enrollments, including specific queries for enrollments by student and course, and basic error handling for invalid IDs. It cleans up the database before and after the tests to maintain an isolated testing environment.
