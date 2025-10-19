import {
  assertArrayIncludes,
  assertEquals,
  assertExists,
  assertRejects,
} from "std/assert/mod.ts";

import { CourseScheduling_actions } from "./courseScheduling_actions.ts";
import type { Course, Schedule, Section } from "./courseScheduling.ts";

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

        // --- $addToSet ---
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

// ------------------------
// Test Course Actions
// ------------------------

Deno.test("CourseScheduling_actions: Course Management", async (t) => {
  const course1: Omit<Course, "_id"> = {
    title: "Introduction to Programming",
    id: "CS111",
    department: "CS",
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

  await t.step("getAllCourses should return all stored courses", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);

    const courses = [
      { id: "C001", title: "Intro to Math", department: "MATH" },
      { id: "C002", title: "English Literature", department: "ENG" },
    ];

    for (const c of courses) {
      await mockDb.collection("courses").insertOne({
        ...c,
        _id: new ObjectId(c.id),
      });
    }

    const all = await actions.getAllCourses();
    assertEquals(all.length, 2);
    assertEquals(all[0].title, "Intro to Math");
  });
});

// ------------------------
// Test Section Actions
// ------------------------

Deno.test("CourseScheduling_actions: Section Management", async (t) => {
  const course1: Omit<Course, "_id"> = {
    title: "Introduction to Programming",
    id: "CS111",
    department: "CS",
  };

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
    "createSection should add a new section for a course",
    async () => {
      const mockDb = createMockDb();
      const actions = new CourseScheduling_actions(mockDb as any);

      // Create a fake course to attach the section to
      const course = {
        id: "CS111",
        title: "Intro to Programming",
        department: "CS",
      };
      await mockDb.collection("courses").insertOne({
        ...course,
        _id: new ObjectId(course.id),
      });

      // TimeSlots can be empty or contain dummy values depending on your model
      const timeSlots: any[] = [];

      const section = await actions.createSection(
        course.id,
        "001",
        "Dr. Rivera",
        40,
        timeSlots,
      );

      // Check returned object
      assertExists(section.id);
      assertEquals(section.courseId, course.id);
      assertEquals(section.sectionNumber, "001");
      assertEquals(section.instructor, "Dr. Rivera");
      assertEquals(section.capacity, 40);
      assertEquals(section.timeSlots, timeSlots);

      // Check DB insertion
      const dbState = mockDb._internal.collections.sections;
      assertEquals(dbState.length, 1);
      assertEquals(dbState[0].id, section.id);
      assertEquals(dbState[0].courseId, course.id);
    },
  );

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

  await t.step("getSection should return a section by ID", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);

    const section = {
      id: "SEC101",
      courseId: "COURSE001",
      sectionNumber: "A",
      instructor: "Prof. Lee",
      capacity: 25,
      timeSlots: [],
    };

    await mockDb.collection("sections").insertOne({
      ...section,
      _id: new ObjectId(section.id),
    });

    const found = await actions.getSection("SEC101");
    assertEquals(found?.id, "SEC101");
    assertEquals(found?.instructor, "Prof. Lee");
  });

  await t.step(
    "getSection should return null for non-existent section",
    async () => {
      const mockDb = createMockDb();
      const actions = new CourseScheduling_actions(mockDb as any);

      const result = await actions.getSection("INVALID");
      assertEquals(result, null);
    },
  );

  await t.step("getAllSections should return all stored sections", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);

    const sections = [
      {
        id: "SEC1",
        courseId: "C001",
        sectionNumber: "A",
        instructor: "Prof A",
        capacity: 30,
        timeSlots: [],
      },
      {
        id: "SEC2",
        courseId: "C001",
        sectionNumber: "B",
        instructor: "Prof B",
        capacity: 25,
        timeSlots: [],
      },
    ];

    for (const s of sections) {
      await mockDb.collection("sections").insertOne({
        ...s,
        _id: new ObjectId(s.id),
      });
    }

    const all = await actions.getAllSections();
    assertEquals(all.length, 2);
    assertEquals(all[1].sectionNumber, "B");
  });
});
// ------------------------
// Test Schedule Actions
// ------------------------

Deno.test("CourseScheduling_actions: Schedule Management", async (t) => {
  await t.step(
    "createSchedule should create a new empty schedule for a user",
    async () => {
      const mockDb = createMockDb();
      const actions = new CourseScheduling_actions(mockDb as any);

      const userId = "user789";
      const scheduleName = "Spring 2026";

      const schedule = await actions.createSchedule(userId, scheduleName);

      // Check returned schedule object
      assertExists(schedule.id);
      assertEquals(schedule.name, scheduleName);
      assertEquals(schedule.owner, userId);
      assertEquals(schedule.sectionIds, []);

      // Check DB insertion
      const dbState = mockDb._internal.collections.schedules;
      assertEquals(dbState.length, 1);
      assertEquals(dbState[0].name, scheduleName);
      assertEquals(dbState[0].owner, userId);
      assertEquals(dbState[0].sectionIds.length, 0);
    },
  );

  await t.step(
    "deleteSchedule should remove a schedule if owned by the user",
    async () => {
      const mockDb = createMockDb();
      const actions = new CourseScheduling_actions(mockDb as any);

      const schedule = {
        id: "SCHED010",
        name: "Winter Plan",
        owner: "user123",
        sectionIds: [],
      };
      await mockDb.collection("schedules").insertOne({
        ...schedule,
        _id: new ObjectId(schedule.id),
      });

      // Perform delete
      await actions.deleteSchedule("user123", schedule.id);

      // Verify schedule was deleted
      const dbState = mockDb._internal.collections.schedules;
      assertEquals(dbState.length, 0);
    },
  );

  await t.step("should throw if user is not the owner", async () => {
    const mockDb = createMockDb();
    const actions = new CourseScheduling_actions(mockDb as any);

    const schedule = {
      id: "SCHED200",
      name: "Unauthorized Delete",
      owner: "user999",
      sectionIds: [],
    };
    await mockDb.collection("schedules").insertOne({
      ...schedule,
      _id: new ObjectId(schedule.id),
    });

    let threw = false;
    try {
      await actions.deleteSchedule("user123", schedule.id);
    } catch (err) {
      threw = true;
      if (err instanceof Error) {
        assertEquals(err.message, "Unauthorized");
      } else {
        throw err; // rethrow unexpected error type
      }
    }
    assertEquals(threw, true);

    const dbState = mockDb._internal.collections.schedules;
    assertEquals(dbState.length, 1); // should not have deleted
  });

  await t.step(
    "deleteSchedule should throw if schedule does not exist",
    async () => {
      const mockDb = createMockDb();
      const actions = new CourseScheduling_actions(mockDb as any);

      let threw = false;
      try {
        await actions.deleteSchedule("user123", "NON_EXISTENT_ID");
      } catch (err) {
        threw = true;
        if (err instanceof Error) {
          assertEquals(err.message, "Schedule not found");
        } else {
          throw err;
        }
      }
      assertEquals(threw, true);
    },
  );

  await t.step(
    "should duplicate an existing schedule with same sections",
    async () => {
      const mockDb = createMockDb();
      const actions = new CourseScheduling_actions(mockDb as any);

      // insert an existing schedule
      const originalSchedule = {
        id: "SCHED001",
        name: "Original Schedule",
        owner: "user123",
        sectionIds: ["SEC001", "SEC002"],
      };
      await mockDb.collection("schedules").insertOne({
        ...originalSchedule,
        _id: new ObjectId(originalSchedule.id),
      });

      // duplicate it
      const duplicated = await actions.duplicateSchedule(
        "user123",
        "SCHED001",
        "Duplicated Schedule",
      );

      // verify new schedule was created
      assertEquals(duplicated.name, "Duplicated Schedule");
      assertEquals(duplicated.owner, "user123");
      assertEquals(duplicated.sectionIds, ["SEC001", "SEC002"]);
      assertEquals(duplicated.id !== "SCHED001", true); // should have new ID

      // verify it exists in mock DB
      const allSchedules = mockDb._internal.collections.schedules;
      assertEquals(allSchedules.length, 2);
    },
  );

  await t.step(
    "duplicateSchedule should throw if user does not own the schedule",
    async () => {
      const mockDb = createMockDb();
      const actions = new CourseScheduling_actions(mockDb as any);

      const originalSchedule = {
        id: "SCHED002",
        name: "Private Schedule",
        owner: "user999",
        sectionIds: [],
      };
      await mockDb.collection("schedules").insertOne({
        ...originalSchedule,
        _id: new ObjectId(originalSchedule.id),
      });

      await assertRejects(
        () =>
          actions.duplicateSchedule("user123", "SCHED002", "Duplicate Fail"),
        Error,
        "Unauthorized",
      );
    },
  );

  await t.step(
    "duplicateSchedule should throw if source schedule not found",
    async () => {
      const mockDb = createMockDb();
      const actions = new CourseScheduling_actions(mockDb as any);

      await assertRejects(
        () =>
          actions.duplicateSchedule(
            "user123",
            "NON_EXISTENT",
            "Duplicate Fail",
          ),
        Error,
        "Source schedule not found",
      );
    },
  );

  await t.step(
    "getAllSchedules should return all stored schedules",
    async () => {
      const mockDb = createMockDb();
      const actions = new CourseScheduling_actions(mockDb as any);

      const schedules = [
        {
          id: "SCHED1",
          name: "Fall Plan",
          sectionIds: ["SEC1"],
          owner: "userA",
        },
        { id: "SCHED2", name: "Spring Plan", sectionIds: [], owner: "userB" },
      ];

      for (const s of schedules) {
        await mockDb.collection("schedules").insertOne({
          ...s,
          _id: new ObjectId(s.id),
        });
      }

      const all = await actions.getAllSchedules();
      assertEquals(all.length, 2);
      assertEquals(all[0].name, "Fall Plan");
    },
  );
});
