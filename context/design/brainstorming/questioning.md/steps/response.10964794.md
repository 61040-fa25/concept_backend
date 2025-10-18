---
timestamp: 'Fri Oct 17 2025 19:12:13 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_191213.079764d6.md]]'
content_id: 10964794d652784f1b469d3f2e63d3bb89bdf92fc4901da68662c1f32031b382
---

# response:

Of course. Here is a complete Deno test file for `courseScheduling_actions.ts`. This file implements a mock MongoDB client as requested and provides comprehensive unit tests for each action.

This single file can be saved as `courseScheduling_actions.test.ts` in the same directory as the source files and run directly with the `deno test` command.

```typescript
// courseScheduling_actions.test.ts

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.218.2/assert/mod.ts";

// Note: Adjust the import paths according to your project's file structure.
// This example assumes the test file is in the same directory as the source files.
import { CourseScheduling_actions } from "./courseScheduling_actions.ts";
import type { Course, Section, Schedule } from "./courseScheduling.ts";

// --- Mock MongoDB ObjectId ---
// The actions class likely uses the official MongoDB driver's ObjectId.
// We create a simple mock class to simulate its behavior for our tests.
class ObjectId {
  private readonly id: string;
  constructor(id?: string | ObjectId) {
    if (id instanceof ObjectId) {
      this.id = id.toString();
    } else {
      // In a real scenario this would be a 24-char hex string, but UUID is fine for mocking.
      this.id = id || crypto.randomUUID();
    }
  }
  toString() {
    return this.id;
  }
  toHexString() {
    return this.id;
  }
}

// --- Mock Database Implementation ---
// This mock simulates the MongoDB driver's behavior for testing purposes.
// It stores data in-memory in plain JavaScript objects instead of a real database.

interface MockCollection {
  insertOne(doc: any): Promise<{ insertedId: ObjectId }>;
  findOne(query: any): Promise<any | null>;
  updateOne(
    query: any,
    update: any,
  ): Promise<{ modifiedCount: number; matchedCount: number }>;
  deleteOne(query: any): Promise<{ deletedCount: number }>;
  find(query?: any): { toArray(): Promise<any[]> };
}

interface MockDb {
  collection: (name: string) => MockCollection;
  _internal: { // Helper to inspect the DB state directly in tests
    collections: Record<string, any[]>;
  };
}

/**
 * Creates a mock database object that mimics a subset of the MongoDB Db object's API.
 */
function createMockDb(): MockDb {
  const collections: Record<string, any[]> = {
    courses: [],
    sections: [],
    schedules: [],
  };

  const getCollection = (name: string): MockCollection => {
    if (!collections[name]) {
      collections[name] = []; // Dynamically create collection array if not present
    }
    const data = collections[name];

    return {
      async insertOne(doc: any) {
        const newDoc = { ...doc };
        if (!newDoc._id) {
          newDoc._id = new ObjectId();
        }
        data.push(newDoc);
        return { insertedId: newDoc._id };
      },

      async findOne(query: any) {
        if (query?._id) {
          const idString = query._id.toString();
          const found = data.find((d) => d._id.toString() === idString);
          return found ? JSON.parse(JSON.stringify(found)) : null; // Return a copy
        }
        return null;
      },

      async updateOne(query: any, update: any) {
        if (!query?._id) return { modifiedCount: 0, matchedCount: 0 };
        const idString = query._id.toString();
        const index = data.findIndex((d) => d._id.toString() === idString);

        if (index === -1) {
          return { modifiedCount: 0, matchedCount: 0 };
        }

        let modified = false;
        // Handle $set operator
        if (update.$set) {
          data[index] = { ...data[index], ...update.$set };
          modified = true;
        }
        // Handle $push operator (for adding sections to a schedule)
        if (update.$push) {
          const field = Object.keys(update.$push)[0];
          if (!data[index][field]) data[index][field] = [];
          data[index][field].push(update.$push[field]);
          modified = true;
        }
        // Handle $pull operator (for removing sections from a schedule)
        if (update.$pull) {
          const field = Object.keys(update.$pull)[0];
          if (Array.isArray(data[index][field])) {
            const valueToPull = update.$pull[field].toString();
            const initialLength = data[index][field].length;
            data[index][field] = data[index][field].filter(
              (item: any) => item.toString() !== valueToPull,
            );
            if (data[index][field].length < initialLength) modified = true;
          }
        }
        return { modifiedCount: modified ? 1 : 0, matchedCount: 1 };
      },

      async deleteOne(query: any) {
        if (query?._id) {
          const idString = query._id.toString();
          const initialLength = data.length;
          collections[name] = data.filter((d) => d._id.toString() !== idString);
          return { deletedCount: initialLength - collections[name].length };
        }
        return { deletedCount: 0 };
      },

      find(_query?: any) {
        // Simplified find that ignores the query and returns all documents.
        return {
          async toArray() {
            return JSON.parse(JSON.stringify(data)); // Return a deep copy
          },
        };
      },
    };
  };

  return {
    collection: (name: string) => getCollection(name),
    _internal: { collections },
  };
}

// --- Test Suites ---

Deno.test("CourseScheduling_actions: Course Management", async (t) => {
  const course1: Omit<Course, "_id"> = {
    name: "Introduction to TypeScript",
    code: "CS101",
    credits: 3,
    description: "A foundational course on TypeScript.",
  };
  const course2: Omit<Course, "_id"> = {
    name: "Advanced Deno",
    code: "CS404",
    credits: 4,
    description: "Deep dive into the Deno runtime.",
  };

  await t.step("createCourse should add a new course to the database", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);

    const newCourseId = await actions.createCourse(course1);
    assertExists(newCourseId);

    const dbState = mockDb._internal.collections.courses;
    assertEquals(dbState.length, 1);
    assertEquals(dbState[0].name, course1.name);
    assertEquals(dbState[0].code, course1.code);
  });

  await t.step("getCourse should retrieve a course by its ID", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);
    const { insertedId } = await mockDb.collection("courses").insertOne(course1);
    const courseId = insertedId.toString();

    const fetchedCourse = await actions.getCourse(courseId);
    assertExists(fetchedCourse);
    assertEquals(fetchedCourse.name, course1.name);
    assertEquals(fetchedCourse._id.toString(), courseId);
  });

  await t.step("getCourse should return null for a non-existent course", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);
    const result = await actions.getCourse(new ObjectId().toString());
    assertEquals(result, null);
  });

  await t.step("updateCourse should modify an existing course", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);
    const { insertedId } = await mockDb.collection("courses").insertOne(course1);
    const courseId = insertedId.toString();

    const updates = { credits: 4, description: "Updated description." };
    const result = await actions.updateCourse(courseId, updates);

    assertEquals(result.modifiedCount, 1);
    const updatedCourse = await mockDb.collection("courses").findOne({ _id: insertedId });
    assertEquals(updatedCourse?.credits, 4);
    assertEquals(updatedCourse?.description, "Updated description.");
  });

  await t.step("deleteCourse should remove a course from the database", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);
    const { insertedId } = await mockDb.collection("courses").insertOne(course1);

    const result = await actions.deleteCourse(insertedId.toString());
    assertEquals(result.deletedCount, 1);
    assertEquals(mockDb._internal.collections.courses.length, 0);
  });

  await t.step("listCourses should return all courses", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);
    await mockDb.collection("courses").insertOne(course1);
    await mockDb.collection("courses").insertOne(course2);

    const allCourses = await actions.listCourses();
    assertEquals(allCourses.length, 2);
    assertEquals(allCourses.some((c) => c.code === "CS101"), true);
    assertEquals(allCourses.some((c) => c.code === "CS404"), true);
  });
});

Deno.test("CourseScheduling_actions: Section Management", async (t) => {
  const sampleCourseId = new ObjectId().toString();
  const section1: Omit<Section, "_id"> = {
    courseId: sampleCourseId,
    instructor: "Dr. Ada Lovelace",
    capacity: 30,
    timeSlot: "MWF 10:00-10:50",
  };

  await t.step("createSection should add a new section", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);

    const newSectionId = await actions.createSection(section1);
    assertExists(newSectionId);
    const dbState = mockDb._internal.collections.sections;
    assertEquals(dbState.length, 1);
    assertEquals(dbState[0].instructor, section1.instructor);
  });

  await t.step("getSection should retrieve a section by ID", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);
    const { insertedId } = await mockDb.collection("sections").insertOne(section1);
    const sectionId = insertedId.toString();

    const fetchedSection = await actions.getSection(sectionId);
    assertExists(fetchedSection);
    assertEquals(fetchedSection.instructor, section1.instructor);
  });

  await t.step("updateSection should modify an existing section", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);
    const { insertedId } = await mockDb.collection("sections").insertOne(section1);
    const sectionId = insertedId.toString();
    const updates = { capacity: 35 };

    const result = await actions.updateSection(sectionId, updates);
    assertEquals(result.modifiedCount, 1);
    const updatedSection = await mockDb.collection("sections").findOne({ _id: insertedId });
    assertEquals(updatedSection?.capacity, 35);
  });

  await t.step("deleteSection should remove a section", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);
    const { insertedId } = await mockDb.collection("sections").insertOne(section1);

    const result = await actions.deleteSection(insertedId.toString());
    assertEquals(result.deletedCount, 1);
    assertEquals(mockDb._internal.collections.sections.length, 0);
  });
});

Deno.test("CourseScheduling_actions: Schedule Management & Relations", async (t) => {
  const scheduleData: Omit<Schedule, "_id"> = {
    studentId: "student-123",
    term: "Fall 2024",
    sectionIds: [],
  };
  const sectionId1 = new ObjectId();
  const sectionId2 = new ObjectId();

  await t.step("createSchedule should add a new schedule", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);
    const newScheduleId = await actions.createSchedule(scheduleData);

    assertExists(newScheduleId);
    const dbState = mockDb._internal.collections.schedules;
    assertEquals(dbState.length, 1);
    assertEquals(dbState[0].studentId, "student-123");
  });

  await t.step("assignSectionToSchedule should add a section ID to a schedule", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);
    const { insertedId: scheduleId } = await mockDb.collection("schedules").insertOne(scheduleData);

    const result = await actions.assignSectionToSchedule(sectionId1.toString(), scheduleId.toString());

    assertEquals(result.modifiedCount, 1);
    const updatedSchedule = await mockDb.collection("schedules").findOne({ _id: scheduleId });
    assertExists(updatedSchedule);
    assertEquals(updatedSchedule.sectionIds.length, 1);
    assertEquals(updatedSchedule.sectionIds[0].toString(), sectionId1.toString());
  });

  await t.step("removeSectionFromSchedule should remove a section ID from a schedule", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);
    const scheduleWithSections = { ...scheduleData, sectionIds: [sectionId1, sectionId2] };
    const { insertedId: scheduleId } = await mockDb.collection("schedules").insertOne(scheduleWithSections);

    const result = await actions.removeSectionFromSchedule(sectionId1.toString(), scheduleId.toString());

    assertEquals(result.modifiedCount, 1);
    const updatedSchedule = await mockDb.collection("schedules").findOne({ _id: scheduleId });
    assertExists(updatedSchedule);
    assertEquals(updatedSchedule.sectionIds.length, 1);
    assertEquals(updatedSchedule.sectionIds[0].toString(), sectionId2.toString());
  });
});
```
