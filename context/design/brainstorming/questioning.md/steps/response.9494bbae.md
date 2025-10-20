---
timestamp: 'Sun Oct 19 2025 20:52:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_205233.e934fbc7.md]]'
content_id: 9494bbae627eafb76aa9c6e53149d4281a6871f49ffb16354b9280c022824ea1
---

# response:

To create `courseSchedulingConcept.test.ts` following the pattern of `LikertSurveyConcept.test.ts`, we first need to define a reasonable structure for `courseSchedulingConcept.ts`. I will assume `courseSchedulingConcept.ts` exports a `CourseScheduler` class that manages courses, students, and their enrollments.

Here's a possible implementation for `courseSchedulingConcept.ts` and then its corresponding test file.

***

### Assumed `courseSchedulingConcept.ts`

```typescript
// C:\Users\marin\OneDrive\Desktop\61040-portfolio\Academica\src\concepts\CourseScheduling\courseSchedulingConcept.ts

/**
 * Interface for a Course object.
 */
export interface Course {
  id: string;
  name: string;
  capacity: number;
  enrolledStudents: Set<string>; // Set of student IDs
}

/**
 * Interface for a Student object.
 */
export interface Student {
  id: string;
  name: string;
  enrolledCourses: Set<string>; // Set of course IDs
}

/**
 * Manages courses, students, and their enrollments.
 */
export class CourseScheduler {
  private courses: Map<string, Course>;
  private students: Map<string, Student>;

  constructor() {
    this.courses = new Map();
    this.students = new Map();
  }

  /**
   * Adds a new course to the scheduler.
   * @param courseId Unique ID for the course.
   * @param name Name of the course.
   * @param capacity Maximum number of students allowed in the course.
   * @throws Error if a course with the given ID already exists.
   */
  addCourse(courseId: string, name: string, capacity: number): void {
    if (this.courses.has(courseId)) {
      throw new Error(`Course with ID '${courseId}' already exists.`);
    }
    this.courses.set(courseId, { id: courseId, name, capacity, enrolledStudents: new Set() });
  }

  /**
   * Adds a new student to the scheduler.
   * @param studentId Unique ID for the student.
   * @param name Name of the student.
   * @throws Error if a student with the given ID already exists.
   */
  addStudent(studentId: string, name: string): void {
    if (this.students.has(studentId)) {
      throw new Error(`Student with ID '${studentId}' already exists.`);
    }
    this.students.set(studentId, { id: studentId, name, enrolledCourses: new Set() });
  }

  /**
   * Enrolls a student in a course.
   * @param studentId ID of the student.
   * @param courseId ID of the course.
   * @throws Error if student or course not found, course is full, or student is already enrolled.
   */
  enrollStudentInCourse(studentId: string, courseId: string): void {
    const student = this.students.get(studentId);
    const course = this.courses.get(courseId);

    if (!student) {
      throw new Error(`Student with ID '${studentId}' not found.`);
    }
    if (!course) {
      throw new Error(`Course with ID '${courseId}' not found.`);
    }

    if (course.enrolledStudents.size >= course.capacity) {
      throw new Error(`Course '${course.name}' is full.`);
    }

    if (course.enrolledStudents.has(studentId)) {
      throw new Error(`Student '${student.name}' is already enrolled in course '${course.name}'.`);
    }

    course.enrolledStudents.add(studentId);
    student.enrolledCourses.add(courseId);
  }

  /**
   * Removes a student from a course.
   * @param studentId ID of the student.
   * @param courseId ID of the course.
   * @throws Error if student or course not found, or student is not enrolled in the course.
   */
  dropStudentFromCourse(studentId: string, courseId: string): void {
    const student = this.students.get(studentId);
    const course = this.courses.get(courseId);

    if (!student) {
      throw new Error(`Student with ID '${studentId}' not found.`);
    }
    if (!course) {
      throw new Error(`Course with ID '${courseId}' not found.`);
    }

    if (!course.enrolledStudents.has(studentId)) {
      throw new Error(`Student '${student.name}' is not enrolled in course '${course.name}'.`);
    }

    course.enrolledStudents.delete(studentId);
    student.enrolledCourses.delete(courseId);
  }

  /**
   * Gets the details of a course.
   * @param courseId ID of the course.
   * @returns Course object or undefined if not found.
   */
  getCourse(courseId: string): Course | undefined {
    return this.courses.get(courseId);
  }

  /**
   * Gets the details of a student.
   * @param studentId ID of the student.
   * @returns Student object or undefined if not found.
   */
  getStudent(studentId: string): Student | undefined {
    return this.students.get(studentId);
  }

  /**
   * Gets a list of student IDs enrolled in a specific course.
   * @param courseId ID of the course.
   * @returns An array of student IDs. Returns an empty array if course not found or no students.
   */
  getStudentsInCourse(courseId: string): string[] {
    const course = this.courses.get(courseId);
    return course ? Array.from(course.enrolledStudents) : [];
  }

  /**
   * Gets a list of course IDs a specific student is enrolled in.
   * @param studentId ID of the student.
   * @returns An array of course IDs. Returns an empty array if student not found or no courses.
   */
  getCoursesForStudent(studentId: string): string[] {
    const student = this.students.get(studentId);
    return student ? Array.from(student.enrolledCourses) : [];
  }
}
```

***

### `courseSchedulingConcept.test.ts`

```typescript
// C:\Users\marin\OneDrive\Desktop\61040-portfolio\Academica\src\concepts\CourseScheduling\courseSchedulingConcept.test.ts

import { CourseScheduler, Course, Student } from './courseSchedulingConcept';

describe('CourseScheduler', () => {
  let scheduler: CourseScheduler;

  beforeEach(() => {
    scheduler = new CourseScheduler();
  });

  // --- Initialization Tests ---
  it('should initialize with no courses or students', () => {
    expect(scheduler.getCourse('CS101')).toBeUndefined();
    expect(scheduler.getStudent('S001')).toBeUndefined();
    expect(scheduler.getStudentsInCourse('CS101')).toEqual([]);
    expect(scheduler.getCoursesForStudent('S001')).toEqual([]);
  });

  // --- Course Management Tests ---
  it('should allow adding a new course', () => {
    scheduler.addCourse('CS101', 'Intro to CS', 30);
    const course = scheduler.getCourse('CS101');
    expect(course).toBeDefined();
    expect(course?.name).toBe('Intro to CS');
    expect(course?.capacity).toBe(30);
    expect(course?.enrolledStudents.size).toBe(0);
  });

  it('should throw error when adding a course with a duplicate ID', () => {
    scheduler.addCourse('CS101', 'Intro to CS', 30);
    expect(() => scheduler.addCourse('CS101', 'Advanced CS', 20)).toThrow(
      "Course with ID 'CS101' already exists."
    );
  });

  // --- Student Management Tests ---
  it('should allow adding a new student', () => {
    scheduler.addStudent('S001', 'Alice');
    const student = scheduler.getStudent('S001');
    expect(student).toBeDefined();
    expect(student?.name).toBe('Alice');
    expect(student?.enrolledCourses.size).toBe(0);
  });

  it('should throw error when adding a student with a duplicate ID', () => {
    scheduler.addStudent('S001', 'Alice');
    expect(() => scheduler.addStudent('S001', 'Bob')).toThrow(
      "Student with ID 'S001' already exists."
    );
  });

  // --- Enrollment Tests ---
  it('should allow a student to enroll in a course', () => {
    scheduler.addCourse('CS101', 'Intro to CS', 30);
    scheduler.addStudent('S001', 'Alice');
    scheduler.enrollStudentInCourse('S001', 'CS101');

    const course = scheduler.getCourse('CS101');
    const student = scheduler.getStudent('S001');

    expect(course?.enrolledStudents.has('S001')).toBe(true);
    expect(course?.enrolledStudents.size).toBe(1);
    expect(student?.enrolledCourses.has('CS101')).toBe(true);
    expect(student?.enrolledCourses.size).toBe(1);
    expect(scheduler.getStudentsInCourse('CS101')).toEqual(['S001']);
    expect(scheduler.getCoursesForStudent('S001')).toEqual(['CS101']);
  });

  it('should throw error when enrolling a non-existent student', () => {
    scheduler.addCourse('CS101', 'Intro to CS', 30);
    expect(() => scheduler.enrollStudentInCourse('S001', 'CS101')).toThrow(
      "Student with ID 'S001' not found."
    );
  });

  it('should throw error when enrolling in a non-existent course', () => {
    scheduler.addStudent('S001', 'Alice');
    expect(() => scheduler.enrollStudentInCourse('S001', 'CS101')).toThrow(
      "Course with ID 'CS101' not found."
    );
  });

  it('should throw error when enrolling in a full course', () => {
    scheduler.addCourse('CS102', 'Limited Seating', 1);
    scheduler.addStudent('S001', 'Alice');
    scheduler.addStudent('S002', 'Bob');

    scheduler.enrollStudentInCourse('S001', 'CS102');
    expect(() => scheduler.enrollStudentInCourse('S002', 'CS102')).toThrow(
      "Course 'Limited Seating' is full."
    );
  });

  it('should throw error when enrolling an already enrolled student', () => {
    scheduler.addCourse('CS101', 'Intro to CS', 30);
    scheduler.addStudent('S001', 'Alice');
    scheduler.enrollStudentInCourse('S001', 'CS101');
    expect(() => scheduler.enrollStudentInCourse('S001', 'CS101')).toThrow(
      "Student 'Alice' is already enrolled in course 'Intro to CS'."
    );
  });

  // --- Dropping Students Tests ---
  it('should allow a student to drop a course', () => {
    scheduler.addCourse('CS101', 'Intro to CS', 30);
    scheduler.addStudent('S001', 'Alice');
    scheduler.enrollStudentInCourse('S001', 'CS101');
    scheduler.dropStudentFromCourse('S001', 'CS101');

    const course = scheduler.getCourse('CS101');
    const student = scheduler.getStudent('S001');

    expect(course?.enrolledStudents.has('S001')).toBe(false);
    expect(course?.enrolledStudents.size).toBe(0);
    expect(student?.enrolledCourses.has('CS101')).toBe(false);
    expect(student?.enrolledCourses.size).toBe(0);
    expect(scheduler.getStudentsInCourse('CS101')).toEqual([]);
    expect(scheduler.getCoursesForStudent('S001')).toEqual([]);
  });

  it('should throw error when dropping a non-existent student', () => {
    scheduler.addCourse('CS101', 'Intro to CS', 30);
    expect(() => scheduler.dropStudentFromCourse('S001', 'CS101')).toThrow(
      "Student with ID 'S001' not found."
    );
  });

  it('should throw error when dropping from a non-existent course', () => {
    scheduler.addStudent('S001', 'Alice');
    expect(() => scheduler.dropStudentFromCourse('S001', 'CS101')).toThrow(
      "Course with ID 'CS101' not found."
    );
  });

  it('should throw error when dropping a student not enrolled in the course', () => {
    scheduler.addCourse('CS101', 'Intro to CS', 30);
    scheduler.addStudent('S001', 'Alice');
    expect(() => scheduler.dropStudentFromCourse('S001', 'CS101')).toThrow(
      "Student 'Alice' is not enrolled in course 'Intro to CS'."
    );
  });

  // --- Getters and Edge Cases ---
  it('should return empty array for students in a course with no enrollments', () => {
    scheduler.addCourse('CS101', 'Intro to CS', 30);
    expect(scheduler.getStudentsInCourse('CS101')).toEqual([]);
  });

  it('should return empty array for courses for a student with no enrollments', () => {
    scheduler.addStudent('S001', 'Alice');
    expect(scheduler.getCoursesForStudent('S001')).toEqual([]);
  });

  it('should handle multiple enrollments correctly', () => {
    scheduler.addCourse('CS101', 'Intro to CS', 30);
    scheduler.addCourse('MA101', 'Calculus I', 25);
    scheduler.addStudent('S001', 'Alice');
    scheduler.addStudent('S002', 'Bob');

    scheduler.enrollStudentInCourse('S001', 'CS101');
    scheduler.enrollStudentInCourse('S002', 'CS101');
    scheduler.enrollStudentInCourse('S001', 'MA101');

    expect(scheduler.getStudentsInCourse('CS101')).toEqual(expect.arrayContaining(['S001', 'S002']));
    expect(scheduler.getStudentsInCourse('CS101').length).toBe(2);
    expect(scheduler.getStudentsInCourse('MA101')).toEqual(['S001']);
    expect(scheduler.getCoursesForStudent('S001')).toEqual(expect.arrayContaining(['CS101', 'MA101']));
    expect(scheduler.getCoursesForStudent('S001').length).toBe(2);
    expect(scheduler.getCoursesForStudent('S002')).toEqual(['CS101']);
  });

  it('should allow dropping one course while remaining enrolled in others', () => {
    scheduler.addCourse('CS101', 'Intro to CS', 30);
    scheduler.addCourse('MA101', 'Calculus I', 25);
    scheduler.addStudent('S001', 'Alice');

    scheduler.enrollStudentInCourse('S001', 'CS101');
    scheduler.enrollStudentInCourse('S001', 'MA101');
    scheduler.dropStudentFromCourse('S001', 'CS101');

    expect(scheduler.getStudentsInCourse('CS101')).toEqual([]);
    expect(scheduler.getCoursesForStudent('S001')).toEqual(['MA101']);
  });
});
```
