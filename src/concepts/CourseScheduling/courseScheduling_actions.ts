import { Db } from "npm:mongodb";
import { Course, Schedule, Section, TimeSlot } from "./courseScheduling.ts";
import { freshID } from "../../utils/database.ts";

/**
 * Backend class for the CourseScheduling concept.
 * Implements all actions for courses, sections, and student schedules.
 */
export class CourseScheduling_actions {
  private coursesCollection = "courses";
  private sectionsCollection = "sections";
  private schedulesCollection = "schedules";

  constructor(private db: Db) {}

  // ------------------------
  // COURSE ACTIONS
  // ------------------------

  /** Create a new course with a fixed ID */
  async createCourse(
    id: string,
    title: string,
    department: string,
  ): Promise<Course> {
    const course: Course = { id, title, department };
    await this.db.collection(this.coursesCollection).insertOne(course);
    return course;
  }

  // ------------------------
  // SECTION ACTIONS
  // ------------------------

  /** Create a new section for a course */
  async createSection(
    courseId: string,
    sectionNumber: string,
    instructor: string,
    capacity: number,
    timeSlots: TimeSlot[],
  ): Promise<Section> {
    const section: Section = {
      id: freshID(),
      courseId,
      sectionNumber,
      instructor,
      capacity,
      timeSlots,
    };
    await this.db.collection(this.sectionsCollection).insertOne(section);
    return section;
  }

  async editSection(
    sectionId: string,
    updates: Partial<Omit<Section, "id" | "courseId">>,
  ): Promise<Section | null> {
    const sectionsCol = this.db.collection<Section>(this.sectionsCollection);

    // Fetch the existing section
    const existingSection = await sectionsCol.findOne({ id: sectionId });
    if (!existingSection) return null;

    // Apply updates
    const updatedSection = { ...existingSection, ...updates };

    // Update in DB
    await sectionsCol.updateOne({ id: sectionId }, { $set: updates });

    return updatedSection;
  }

  // ------------------------
  // STUDENT SCHEDULE ACTIONS
  // ------------------------

  /** Create an empty schedule for a student */
  async createSchedule(userId: string, name: string): Promise<Schedule> {
    const schedule: Schedule = {
      id: freshID(),
      name,
      sectionIds: [],
      owner: userId,
    };
    await this.db.collection(this.schedulesCollection).insertOne(schedule);
    return schedule;
  }

  /** Delete a schedule (user must be owner) */
  async deleteSchedule(userId: string, scheduleId: string): Promise<void> {
    const schedule = await this.db.collection(this.schedulesCollection).findOne(
      { id: scheduleId },
    );
    if (!schedule) throw new Error("Schedule not found");
    if (schedule.owner !== userId) throw new Error("Unauthorized");

    await this.db.collection(this.schedulesCollection).deleteOne({
      id: scheduleId,
    });
  }

  /** Add a course section to a student's schedule (atomic) */
  async addSection(
    userId: string,
    scheduleId: string,
    sectionId: string,
  ): Promise<void> {
    const result = await this.db.collection(this.schedulesCollection).updateOne(
      { id: scheduleId, owner: userId },
      { $addToSet: { sectionIds: sectionId } }, // adds if not already present
    );

    if (result.matchedCount === 0) {
      throw new Error("Schedule not found or unauthorized");
    }
  }

  /** Remove a course section from a student's schedule (atomic) */
  async removeSection(
    userId: string,
    scheduleId: string,
    sectionId: string,
  ): Promise<void> {
    const schedulesCol = this.db.collection<Schedule>(
      this.schedulesCollection,
    );
    await schedulesCol.updateOne(
      { id: scheduleId, owner: userId },
      { $pull: { sectionIds: sectionId } }, // now TS knows sectionIds is string[]
    );
  }

  /** Duplicate an existing schedule for a student */
  async duplicateSchedule(
    userId: string,
    sourceScheduleId: string,
    newName: string,
  ): Promise<Schedule> {
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

    return newSchedule;
  }

  // ------------------------
  // RETRIEVAL ACTIONS
  // ------------------------

  async getCourse(courseId: string): Promise<Course | null> {
    return await this.db.collection<Course>(this.coursesCollection).findOne({
      id: courseId,
    });
  }

  async getSection(sectionId: string): Promise<Section | null> {
    return await this.db.collection<Section>(this.sectionsCollection).findOne({
      id: sectionId,
    });
  }

  async getAllCourses(): Promise<Course[]> {
    return await this.db.collection<Course>(this.coursesCollection).find()
      .toArray();
  }

  async getAllSections(): Promise<Section[]> {
    return await this.db.collection<Section>(this.sectionsCollection).find()
      .toArray();
  }

  async getAllSchedules(): Promise<Schedule[]> {
    return await this.db.collection<Schedule>(this.schedulesCollection)
      .find().toArray();
  }
}
