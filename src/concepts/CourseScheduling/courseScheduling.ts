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
