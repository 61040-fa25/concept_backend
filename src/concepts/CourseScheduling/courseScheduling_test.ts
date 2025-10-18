import {
  assertArrayIncludes,
  assertEquals,
  assertExists,
} from "std/assert/mod.ts";

import { CourseScheduling_actions } from "./courseScheduling_actions.ts";
import type { Course, Schedule, Section } from "./courseScheduling.ts";
import { DayOfWeek } from "./courseScheduling.ts";

// --- Mock MongoDB ObjectId ---
class ObjectId {
  private readonly id: string;
  constructor(id?: string | ObjectId) {
    if (id instanceof ObjectId) {
      this.id = id.toString();
    } else {
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
  _internal: { collections: Record<string, any[]> };
}

function createMockDb(): MockDb {
  const collections: Record<string, any[]> = {
    courses: [],
    sections: [],
    schedules: [],
  };

  const getCollection = (name: string): MockCollection => {
    const data = collections[name] || (collections[name] = []);

    return {
      async insertOne(doc: any) {
        const newDoc = { ...doc };
        if (!newDoc._id) newDoc._id = new ObjectId(newDoc.id);
        data.push(newDoc);
        return { insertedId: newDoc._id };
      },

      async findOne(query: any) {
        const found = data.find((d) => {
          return Object.entries(query || {}).every(
            ([key, value]: [string, any]) => {
              if (key === "_id") return d._id.toString() === value.toString();
              return d[key] === value;
            },
          );
        });
        return found ? JSON.parse(JSON.stringify(found)) : null;
      },

      async updateOne(query: any, update: any) {
        const idQuery = query?._id?.toString() || query?.id;
        const index = data.findIndex((d) =>
          Object.entries(query).every(([k, v]) =>
            (d[k]?.toString() || d[k]) === (v?.toString() || v)
          )
        );
        if (index === -1) return { modifiedCount: 0, matchedCount: 0 };

        let modified = false;

        if (update.$set) {
          data[index] = { ...data[index], ...update.$set };
          modified = true;
        }

        if (update.$push) {
          const field = Object.keys(update.$push)[0];
          if (!data[index][field]) data[index][field] = [];
          data[index][field].push(update.$push[field]);
          modified = true;
        }

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

        // --- NEW: support $addToSet ---
        if (update.$addToSet) {
          const field = Object.keys(update.$addToSet)[0];
          const value = update.$addToSet[field];
          if (!data[index][field]) data[index][field] = [];
          if (
            !data[index][field].some((item: any) =>
              item.toString() === value.toString()
            )
          ) {
            data[index][field].push(value);
            modified = true;
          }
        }

        return { modifiedCount: modified ? 1 : 0, matchedCount: 1 };
      },

      async deleteOne(query: any) {
        const idQuery = query?._id?.toString() || query?.id;
        const initialLength = data.length;
        collections[name] = data.filter((d) =>
          d._id.toString() !== idQuery && d.id !== idQuery
        );
        return { deletedCount: initialLength - collections[name].length };
      },

      find(_query?: any) {
        return {
          async toArray() {
            return JSON.parse(JSON.stringify(data));
          },
        };
      },
    };
  };

  return { collection: getCollection, _internal: { collections } };
}

// --- Tests ---
Deno.test("CourseScheduling_actions: Course Management", async (t) => {
  const course1: Omit<Course, "_id"> = {
    title: "Introduction to Programming",
    id: "CS111",
    department: "CS",
  };
  const course2: Omit<Course, "_id"> = {
    title: "Combinatorics and Graph Theory",
    id: "MATH225",
    department: "Math",
  };

  await t.step("createCourse should add a new course", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);
    const newCourseId = await actions.createCourse(
      course1.id,
      course1.title,
      course1.department,
    );
    assertExists(newCourseId);

    const dbState = mockDb._internal.collections.courses;
    assertEquals(dbState.length, 1);
    assertEquals(dbState[0].title, course1.title);
    assertEquals(dbState[0].id, course1.id);
  });

  await t.step("getCourse should retrieve a course by ID", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);
    const { insertedId } = await mockDb.collection("courses").insertOne({
      ...course1,
      _id: new ObjectId(course1.id),
    });
    const courseId = insertedId.toString();

    const fetchedCourse = await actions.getCourse(courseId);
    assertExists(fetchedCourse);
    assertEquals(fetchedCourse.title, course1.title);
    assertEquals(fetchedCourse.id, course1.id);
  });

  await t.step(
    "getCourse should return null for non-existent course",
    async () => {
      const mockDb = createMockDb();
      const actions = new CourseScheduling_actions(mockDb as any);
      const result = await actions.getCourse(new ObjectId().toString());
      assertEquals(result, null);
    },
  );

  await t.step("editSection should modify an existing section", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);
    const { insertedId: courseId } = await mockDb.collection("courses")
      .insertOne({ ...course1, _id: new ObjectId(course1.id) });

    const section: Section = {
      id: "SEC001",
      courseId: courseId.toString(),
      sectionNumber: "001",
      instructor: "Dr. Smith",
      capacity: 30,
      timeSlots: [],
    };
    await mockDb.collection("sections").insertOne({
      ...section,
      _id: new ObjectId(section.id),
    });

    const result = await actions.editSection(section.id, {
      capacity: 35,
      instructor: "Dr. Jones",
    });
    assertExists(result);
    assertEquals(result?.capacity, 35);
    assertEquals(result?.instructor, "Dr. Jones");
    assertEquals(result?.id, section.id);
  });

  await t.step(
    "removeSection should remove section from schedule",
    async () => {
      const mockDb = createMockDb();
      const actions = new CourseScheduling_actions(mockDb as any);
      const { insertedId: courseId } = await mockDb.collection("courses")
        .insertOne({ ...course1, _id: new ObjectId(course1.id) });

      const section: Section = {
        id: "SEC002",
        courseId: courseId.toString(),
        sectionNumber: "001",
        instructor: "Dr. Leu",
        capacity: 30,
        timeSlots: [],
      };
      await mockDb.collection("sections").insertOne({
        ...section,
        _id: new ObjectId(section.id),
      });

      const schedule: Schedule = {
        name: "FallBackUp",
        id: "SCHED001",
        owner: "user123",
        sectionIds: [section.id],
      };
      await mockDb.collection("schedules").insertOne({
        ...schedule,
        _id: new ObjectId(schedule.id),
      });

      await actions.removeSection("user123", schedule.id, section.id);

      const updatedSchedule = await mockDb.collection("schedules").findOne({
        id: schedule.id,
      });
      assertEquals(updatedSchedule?.sectionIds.length, 0);
    },
  );

  await t.step("addSection should add a section to a schedule", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);

    const section: Section = {
      id: "SEC003",
      courseId: "CS111",
      sectionNumber: "001",
      instructor: "Dr. Smith",
      capacity: 30,
      timeSlots: [],
    };
    await mockDb.collection("sections").insertOne({
      ...section,
      _id: new ObjectId(section.id),
    });

    const schedule: Schedule = {
      name: "Fall2026",
      id: "SCHED002",
      owner: "user456",
      sectionIds: [],
    };
    await mockDb.collection("schedules").insertOne({
      ...schedule,
      _id: new ObjectId(schedule.id),
    });

    await actions.addSection("user456", schedule.id, section.id);

    const updatedSchedule = await mockDb.collection("schedules").findOne({
      id: schedule.id,
    });
    assertExists(updatedSchedule);
    assertArrayIncludes(updatedSchedule.sectionIds, [section.id]);
  });
});
