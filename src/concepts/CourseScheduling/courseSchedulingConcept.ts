import { Db } from "npm:mongodb";
import { freshID } from "../../utils/database.ts";

/**
 * @enum DayOfWeek
 * Represents the days of the week, typically used for scheduling classes.
 * 'R' is commonly used for Thursday in academic scheduling.
 */
export enum DayOfWeek {
  Monday = "M",
  Tuesday = "T",
  Wednesday = "W",
  Thursday = "R",
  Friday = "F",
}

/**
 * @interface TimeSlot
 * Defines a specific meeting time and place for a course section.
 * A section can have multiple time slots (e.g., for a lecture and a lab).
 */
export interface TimeSlot {
  days: DayOfWeek[];
  startTime: string; // Format: "HH:mm" (e.g., "14:00")
  endTime: string; // Format: "HH:mm" (e.g., "15:20")
  location: string; // e.g., "Science Building, Room 301"
}

/**
 * @interface Course
 * Represents a general course offered by the college, independent of any specific
 * semester or instructor.
 */
export interface Course {
  id: string; // Unique identifier, e.g., "CS-101"
  title: string; // e.g., "Introduction to Computer Science"
  department: string; // e.g., "Computer Science"
}

/**
 * @interface Section
 * Represents a specific instance of a Course being taught in a given term.
 * It has a specific instructor, time, and location.
 */
export interface Section {
  id: string; // Globally unique identifier for the section, e.g., "SEC-48102"
  courseId: string; // Foreign key referencing Course.id
  sectionNumber: string; // e.g., "1" or "2"
  instructor: string; // e.g., "Dr. Ada Lovelace"
  capacity: number; // Maximum number of students
  timeSlots: TimeSlot[]; // An array of meeting times for this section
  distribution?: string; // Distribution requirements, e.g., "HS, SBA"
}

/**
 * @interface Schedule
 * Represents a single schedule plan created by a student. A student might create
 * multiple potential schedules.
 */
export interface Schedule {
  id: string; // Unique ID for this schedule plan, e.g., "sched-fall-2024-main"
  name: string; // User-defined name, e.g., "My Ideal Schedule"
  sectionIds: string[]; // A list of Section IDs the student has added to this plan.
  owner: string; // User ID of the student who owns this schedule
}

/**
 * @interface CourseSchedulingState
 * The top-level state interface for the entire course scheduling concept. It holds
 * all the data required for the feature to function.
 */
export interface CourseSchedulingState {
  /**
   * A collection of all available courses, indexed by their ID for efficient lookup.
   */
  courses: Record<string, Course>;

  /**
   * A collection of all available sections for the selected term, indexed by their ID.
   */
  sections: Record<string, Section>;

  /**
   * A collection of all schedule plans created by the student, indexed by schedule ID.
   */
  schedules: Record<string, Schedule>;

  /**
   * The ID of the schedule currently being viewed or edited by the student.
   */
  activeScheduleId: string | null;

  /**
   * Represents the loading status of data fetching from the system.
   */
  loadingStatus: "idle" | "loading" | "succeeded" | "failed";

  /**
   * Stores any error message if a data fetching operation fails.
   */
  error: string | null;
}

/**
 * Backend class for the CourseScheduling concept.
 * Implements all actions for courses, sections, and student schedules.
 */
export class CourseSchedulingConcept {
  private coursesCollection = "courses";
  private sectionsCollection = "sections";
  private schedulesCollection = "schedules";

  constructor(private db: Db) {}

  // ------------------------
  // COURSE ACTIONS
  // ------------------------

  /** Create a new course with a fixed ID */
  async createCourse( //TESTED
    body: { id: string; title: string; department: string },
  ): Promise<{ c: Course }> {
    const { id, title, department } = body;

    // Validation: check for empty strings
    if (!id || !title || !department) {
      throw new Error("All fields (id, title, department) are required");
    }

    const course: Course = { id, title, department };
    await this.db.collection(this.coursesCollection).insertOne(course);
    return { c: course };
  }

  // ------------------------
  // SECTION ACTIONS
  // ------------------------

  /** Create a new section for a course */
  async createSection( //TESTED
    body: {
      courseId: string;
      sectionNumber: string;
      instructor: string;
      capacity: number;
      timeSlots: TimeSlot[];
      distribution?: string;
    },
  ): Promise<{ s: Section }> {
    const {
      courseId,
      sectionNumber,
      instructor,
      capacity,
      timeSlots,
      distribution,
    } = body;

    // Validation: check for required fields
    if (!courseId || !sectionNumber || !instructor || capacity < 0) {
      throw new Error(
        "All fields (courseId, sectionNumber, instructor, capacity) are required",
      );
    }

    const section: Section = {
      id: freshID(),
      courseId,
      sectionNumber,
      instructor,
      capacity,
      timeSlots,
      ...(distribution !== undefined && { distribution }),
    };
    await this.db.collection(this.sectionsCollection).insertOne(section);
    return { s: section };
  }

  async editSection( //TESTED
    body: {
      sectionId: string;
      updates: Partial<Omit<Section, "id" | "courseId">>;
    },
  ): Promise<{ s: Section } | null> {
    const { sectionId, updates } = body;
    const sectionsCol = this.db.collection<Section>(this.sectionsCollection);

    // Fetch the existing section
    const existingSection = await sectionsCol.findOne({ id: sectionId });
    if (!existingSection) return null;

    // Apply updates
    const updatedSection = { ...existingSection, ...updates };

    // Update in DB
    await sectionsCol.updateOne({ id: sectionId }, { $set: updates });

    return { s: updatedSection };
  }

  // ------------------------
  // STUDENT SCHEDULE ACTIONS
  // ------------------------

  /** Create an empty schedule for a student */
  async createSchedule(
    body: { userId: string; name: string },
  ): Promise<{ s: Schedule }> { //TESTED
    const { userId, name } = body;

    // Validation: check for required fields
    if (!userId || !name) {
      throw new Error("All fields (userId, name) are required");
    }

    const schedule: Schedule = {
      id: freshID(),
      name,
      sectionIds: [],
      owner: userId,
    };
    await this.db.collection(this.schedulesCollection).insertOne(schedule);
    return { s: schedule };
  }

  /** Delete a schedule (user must be owner) */
  async deleteSchedule(
    body: { userId: string; scheduleId: string },
  ): Promise<{}> { //TESTED
    const { userId, scheduleId } = body;
    const schedule = await this.db.collection(this.schedulesCollection).findOne(
      { id: scheduleId },
    );
    if (!schedule) throw new Error("Schedule not found");
    if (schedule.owner !== userId) throw new Error("Unauthorized");

    await this.db.collection(this.schedulesCollection).deleteOne({
      id: scheduleId,
    });
    return {};
  }

  /** Add a course section to a student's schedule (atomic) */
  async addSection( //TESTED
    body: { userId: string; scheduleId: string; sectionId: string },
  ): Promise<{}> {
    const { userId, scheduleId, sectionId } = body;
    const result = await this.db.collection(this.schedulesCollection).updateOne(
      { id: scheduleId, owner: userId },
      { $addToSet: { sectionIds: sectionId } }, // adds if not already present
    );

    if (result.matchedCount === 0) {
      throw new Error("Schedule not found or unauthorized");
    }
    return {};
  }

  /** Remove a course section from a student's schedule (atomic) */
  async removeSection( //TESTED
    body: { userId: string; scheduleId: string; sectionId: string },
  ): Promise<{}> {
    const { userId, scheduleId, sectionId } = body;
    const schedulesCol = this.db.collection<Schedule>(
      this.schedulesCollection,
    );
    await schedulesCol.updateOne(
      { id: scheduleId, owner: userId },
      { $pull: { sectionIds: sectionId } }, // now TS knows sectionIds is string[]
    );
    return {};
  }

  /** Duplicate an existing schedule for a student */
  async duplicateSchedule( //TESTED
    body: { userId: string; sourceScheduleId: string; newName: string },
  ): Promise<{ s: Schedule }> {
    const { userId, sourceScheduleId, newName } = body;
    // Find the original schedule
    const sourceSchedule = await this.db
      .collection<Schedule>(this.schedulesCollection)
      .findOne({ id: sourceScheduleId });

    if (!sourceSchedule) {
      throw new Error("Source schedule not found");
    }

    // Ensure the user owns the schedule
    if (sourceSchedule.owner !== userId) {
      throw new Error("Unauthorized");
    }

    // Create the duplicated schedule
    const newSchedule: Schedule = {
      id: freshID(),
      name: newName,
      sectionIds: [...sourceSchedule.sectionIds], // copy existing sections
      owner: userId,
    };

    // Insert the new schedule into the database
    await this.db.collection(this.schedulesCollection).insertOne(newSchedule);

    return { s: newSchedule };
  }

  // ------------------------
  // RETRIEVAL ACTIONS
  // ------------------------

  async getCourse(body: { courseId: string }): Promise<Course[] | null> { //TESTED
    const { courseId } = body;
    const course = await this.db.collection<Course>(this.coursesCollection)
      .findOne({
        id: courseId,
      });
    return course ? [course] : null;
  }

  async getSection(body: { sectionId: string }): Promise<Section[] | null> {
    const { sectionId } = body;
    const section = await this.db.collection<Section>(this.sectionsCollection)
      .findOne({
        id: sectionId,
      });
    return section ? [section] : null;
  }

  async getAllCourses(body: {} = {}): Promise<Course[]> {
    return await this.db.collection<Course>(this.coursesCollection).find()
      .toArray();
  }

  async getAllSections(body: {} = {}): Promise<Section[]> {
    return await this.db.collection<Section>(this.sectionsCollection).find()
      .toArray();
  }

  async getAllSchedules(body: {} = {}): Promise<Schedule[]> {
    return await this.db.collection<Schedule>(this.schedulesCollection)
      .find().toArray();
  }
}

// Default export for the server to load dynamically
export default CourseSchedulingConcept;
