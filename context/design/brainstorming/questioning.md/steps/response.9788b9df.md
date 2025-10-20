---
timestamp: 'Sun Oct 19 2025 20:56:25 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_205625.aaf970af.md]]'
content_id: 9788b9dfcc00a64415d342482f90d7e45569c8eabcf7f987438a7a05c5a03e68
---

# response:

To create the `CourseSchedulingConcept.test.ts` file following the example of `LikertSurveyConcept.test.ts`, we first need to define a reasonable structure and methods for the `CourseSchedulingConcept` class within `courseSchedulingConcept.ts` if it's not already fully fleshed out.

Let's assume `courseSchedulingConcept.ts` contains the following classes and methods, providing a solid foundation for testing:

**Assumed Content of `courseSchedulingConcept.ts`:**

```typescript
// C:\Users\marin\OneDrive\Desktop\61040-portfolio\Academica\src\concepts\CourseScheduling\courseSchedulingConcept.ts

/**
 * Represents a single course offered.
 */
export class Course {
    constructor(
        public id: string,
        public name: string,
        public credits: number
    ) {
        if (!id || !name || credits <= 0) {
            throw new Error("Course ID, name, and positive credits are required.");
        }
    }
}

/**
 * Represents an instructor.
 */
export class Instructor {
    constructor(
        public id: string,
        public name: string
    ) {
        if (!id || !name) {
            throw new Error("Instructor ID and name are required.");
        }
    }
}

/**
 * Represents a scheduled entry in the course timetable.
 */
export class ScheduleEntry {
    constructor(
        public course: Course,
        public instructor: Instructor,
        public time: string, // e.g., "MWF 10:00-10:50 AM", "TTh 1:00-2:15 PM"
        public location: string // e.g., "Building A, Room 101"
    ) {
        if (!course || !instructor || !time || !location) {
            throw new Error("Schedule entry requires a course, instructor, time, and location.");
        }
    }
}

/**
 * Manages the scheduling of courses, instructors, and locations.
 */
export class CourseSchedulingConcept {
    private courses: Map<string, Course>;
    private instructors: Map<string, Instructor>;
    private schedule: ScheduleEntry[];

    constructor() {
        this.courses = new Map<string, Course>();
        this.instructors = new Map<string, Instructor>();
        this.schedule = [];
    }

    /**
     * Adds a new course to the system.
     * @param course The Course object to add.
     * @returns True if the course was added, false if a course with the same ID already exists.
     */
    addCourse(course: Course): boolean {
        if (this.courses.has(course.id)) {
            return false; // Course already exists
        }
        this.courses.set(course.id, course);
        return true;
    }

    /**
     * Retrieves a course by its ID.
     * @param id The ID of the course.
     * @returns The Course object or undefined if not found.
     */
    getCourse(id: string): Course | undefined {
        return this.courses.get(id);
    }

    /**
     * Returns all registered courses.
     * @returns An array of Course objects.
     */
    getAllCourses(): Course[] {
        return Array.from(this.courses.values());
    }

    /**
     * Adds a new instructor to the system.
     * @param instructor The Instructor object to add.
     * @returns True if the instructor was added, false if an instructor with the same ID already exists.
     */
    addInstructor(instructor: Instructor): boolean {
        if (this.instructors.has(instructor.id)) {
            return false; // Instructor already exists
        }
        this.instructors.set(instructor.id, instructor);
        return true;
    }

    /**
     * Retrieves an instructor by their ID.
     * @param id The ID of the instructor.
     * @returns The Instructor object or undefined if not found.
     */
    getInstructor(id: string): Instructor | undefined {
        return this.instructors.get(id);
    }

    /**
     * Returns all registered instructors.
     * @returns An array of Instructor objects.
     */
    getAllInstructors(): Instructor[] {
        return Array.from(this.instructors.values());
    }

    /**
     * Schedules a course with an instructor at a specific time and location.
     * Performs basic conflict checks for instructor and location.
     * @param courseId The ID of the course to schedule.
     * @param instructorId The ID of the instructor.
     * @param time The time slot for the schedule (e.g., "MWF 10:00-10:50 AM").
     * @param location The physical location for the schedule (e.g., "Building A, Room 101").
     * @returns True if the course was scheduled successfully, false otherwise (e.g., conflicts, invalid IDs).
     */
    scheduleCourse(courseId: string, instructorId: string, time: string, location: string): boolean {
        const course = this.courses.get(courseId);
        const instructor = this.instructors.get(instructorId);

        if (!course || !instructor) {
            console.warn(`Cannot schedule: Course ID '${courseId}' or Instructor ID '${instructorId}' not found.`);
            return false;
        }

        // Check for instructor time conflict
        const instructorConflict = this.schedule.some(
            entry => entry.instructor.id === instructorId && entry.time === time
        );
        if (instructorConflict) {
            console.warn(`Conflict: Instructor '${instructor.name}' is already scheduled at '${time}'.`);
            return false;
        }

        // Check for location time conflict
        const locationConflict = this.schedule.some(
            entry => entry.location === location && entry.time === time
        );
        if (locationConflict) {
            console.warn(`Conflict: Location '${location}' is already occupied at '${time}'.`);
            return false;
        }

        const newEntry = new ScheduleEntry(course, instructor, time, location);
        this.schedule.push(newEntry);
        return true;
    }

    /**
     * Returns the entire schedule.
     * @returns An array of ScheduleEntry objects.
     */
    getSchedule(): ScheduleEntry[] {
        return [...this.schedule]; // Return a shallow copy to prevent external modification
    }

    /**
     * Returns the schedule for a specific instructor.
     * @param instructorId The ID of the instructor.
     * @returns An array of ScheduleEntry objects for the given instructor.
     */
    getInstructorSchedule(instructorId: string): ScheduleEntry[] {
        return this.schedule.filter(entry => entry.instructor.id === instructorId);
    }

    /**
     * Returns the schedule for a specific location.
     * @param location The name of the location.
     * @returns An array of ScheduleEntry objects for the given location.
     */
    getLocationSchedule(location: string): ScheduleEntry[] {
        return this.schedule.filter(entry => entry.location === location);
    }
}
```

***

**`CourseSchedulingConcept.test.ts` (Following `LikertSurveyConcept.test.ts` structure):**

```typescript
// C:\Users\marin\OneDrive\Desktop\61040-portfolio\Academica\src\concepts\CourseScheduling\CourseSchedulingConcept.test.ts

import {
    CourseSchedulingConcept,
    Course,
    Instructor,
    ScheduleEntry
} from './courseSchedulingConcept'; // Adjust path if necessary

describe('CourseSchedulingConcept', () => {
    let scheduler: CourseSchedulingConcept;
    let course1: Course;
    let course2: Course;
    let instructor1: Instructor;
    let instructor2: Instructor;

    beforeEach(() => {
        scheduler = new CourseSchedulingConcept();
        course1 = new Course('CS101', 'Intro to CS', 3);
        course2 = new Course('MA201', 'Calculus I', 4);
        instructor1 = new Instructor('I001', 'Dr. Smith');
        instructor2 = new Instructor('I002', 'Prof. Johnson');

        // Add some base data for scheduling tests
        scheduler.addCourse(course1);
        scheduler.addCourse(course2);
        scheduler.addInstructor(instructor1);
        scheduler.addInstructor(instructor2);
    });

    describe('Course Management', () => {
        it('should initialize with no courses', () => {
            expect(new CourseSchedulingConcept().getAllCourses()).toEqual([]);
        });

        it('should add a new course', () => {
            const course3 = new Course('PH101', 'Philosophy Basics', 3);
            expect(scheduler.addCourse(course3)).toBe(true);
            expect(scheduler.getAllCourses()).toContain(course3);
            expect(scheduler.getCourse('PH101')).toEqual(course3);
        });

        it('should not add a course with a duplicate ID', () => {
            const duplicateCourse = new Course('CS101', 'Duplicate CS', 3);
            expect(scheduler.addCourse(duplicateCourse)).toBe(false); // Should fail
            expect(scheduler.getCourse('CS101')).toEqual(course1); // Original should remain
            expect(scheduler.getAllCourses().filter(c => c.id === 'CS101').length).toBe(1);
        });

        it('should retrieve an existing course', () => {
            expect(scheduler.getCourse('CS101')).toEqual(course1);
        });

        it('should return undefined for a non-existent course', () => {
            expect(scheduler.getCourse('NONEXISTENT')).toBeUndefined();
        });

        it('should return all added courses', () => {
            expect(scheduler.getAllCourses()).toEqual([course1, course2]);
        });
    });

    describe('Instructor Management', () => {
        it('should initialize with no instructors', () => {
            expect(new CourseSchedulingConcept().getAllInstructors()).toEqual([]);
        });

        it('should add a new instructor', () => {
            const instructor3 = new Instructor('I003', 'Ms. Davis');
            expect(scheduler.addInstructor(instructor3)).toBe(true);
            expect(scheduler.getAllInstructors()).toContain(instructor3);
            expect(scheduler.getInstructor('I003')).toEqual(instructor3);
        });

        it('should not add an instructor with a duplicate ID', () => {
            const duplicateInstructor = new Instructor('I001', 'Duplicate Name');
            expect(scheduler.addInstructor(duplicateInstructor)).toBe(false); // Should fail
            expect(scheduler.getInstructor('I001')).toEqual(instructor1); // Original should remain
            expect(scheduler.getAllInstructors().filter(i => i.id === 'I001').length).toBe(1);
        });

        it('should retrieve an existing instructor', () => {
            expect(scheduler.getInstructor('I001')).toEqual(instructor1);
        });

        it('should return undefined for a non-existent instructor', () => {
            expect(scheduler.getInstructor('NONEXISTENT')).toBeUndefined();
        });

        it('should return all added instructors', () => {
            expect(scheduler.getAllInstructors()).toEqual([instructor1, instructor2]);
        });
    });

    describe('Course Scheduling', () => {
        it('should initialize with an empty schedule', () => {
            expect(new CourseSchedulingConcept().getSchedule()).toEqual([]);
        });

        it('should successfully schedule a course', () => {
            const success = scheduler.scheduleCourse(
                'CS101',
                'I001',
                'MWF 10:00-10:50 AM',
                'Room 101'
            );
            expect(success).toBe(true);
            const schedule = scheduler.getSchedule();
            expect(schedule.length).toBe(1);
            expect(schedule[0]).toEqual(
                new ScheduleEntry(course1, instructor1, 'MWF 10:00-10:50 AM', 'Room 101')
            );
        });

        it('should not schedule if course ID does not exist', () => {
            const success = scheduler.scheduleCourse(
                'NONEXISTENT',
                'I001',
                'MWF 10:00-10:50 AM',
                'Room 101'
            );
            expect(success).toBe(false);
            expect(scheduler.getSchedule().length).toBe(0);
        });

        it('should not schedule if instructor ID does not exist', () => {
            const success = scheduler.scheduleCourse(
                'CS101',
                'NONEXISTENT',
                'MWF 10:00-10:50 AM',
                'Room 101'
            );
            expect(success).toBe(false);
            expect(scheduler.getSchedule().length).toBe(0);
        });

        it('should prevent an instructor from being double-booked at the same time', () => {
            scheduler.scheduleCourse('CS101', 'I001', 'MWF 10:00-10:50 AM', 'Room 101');
            const conflict = scheduler.scheduleCourse(
                'MA201',
                'I001', // Same instructor
                'MWF 10:00-10:50 AM', // Same time
                'Room 102' // Different room (doesn't matter for instructor conflict)
            );
            expect(conflict).toBe(false);
            expect(scheduler.getSchedule().length).toBe(1); // Only the first schedule should exist
        });

        it('should prevent a location from being double-booked at the same time', () => {
            scheduler.scheduleCourse('CS101', 'I001', 'MWF 10:00-10:50 AM', 'Room 101');
            const conflict = scheduler.scheduleCourse(
                'MA201',
                'I002', // Different instructor
                'MWF 10:00-10:50 AM', // Same time
                'Room 101' // Same room
            );
            expect(conflict).toBe(false);
            expect(scheduler.getSchedule().length).toBe(1); // Only the first schedule should exist
        });

        it('should allow scheduling different courses with different instructors at the same time in different rooms', () => {
            const success1 = scheduler.scheduleCourse('CS101', 'I001', 'MWF 10:00-10:50 AM', 'Room 101');
            const success2 = scheduler.scheduleCourse('MA201', 'I002', 'MWF 10:00-10:50 AM', 'Room 102');
            expect(success1).toBe(true);
            expect(success2).toBe(true);
            expect(scheduler.getSchedule().length).toBe(2);
        });

        it('should allow scheduling the same course with the same instructor at different times', () => {
            const success1 = scheduler.scheduleCourse('CS101', 'I001', 'MWF 10:00-10:50 AM', 'Room 101');
            const success2 = scheduler.scheduleCourse('CS101', 'I001', 'TTh 1:00-2:15 PM', 'Room 101'); // Same room okay if time is different
            expect(success1).toBe(true);
            expect(success2).toBe(true);
            expect(scheduler.getSchedule().length).toBe(2);
        });
    });

    describe('Schedule Retrieval', () => {
        beforeEach(() => {
            // Setup a more complex schedule for retrieval tests
            scheduler.scheduleCourse('CS101', 'I001', 'MWF 10:00-10:50 AM', 'Room 101');
            scheduler.scheduleCourse('MA201', 'I002', 'MWF 10:00-10:50 AM', 'Room 102');
            scheduler.scheduleCourse('CS101', 'I001', 'TTh 1:00-2:15 PM', 'Room 101');
            // Add another instructor for a course
            const course3 = new Course('PH101', 'Philosophy Basics', 3);
            const instructor3 = new Instructor('I003', 'Ms. Davis');
            scheduler.addCourse(course3);
            scheduler.addInstructor(instructor3);
            scheduler.scheduleCourse('PH101', 'I003', 'TTh 1:00-2:15 PM', 'Room 205');
        });

        it('should return the full schedule', () => {
            const fullSchedule = scheduler.getSchedule();
            expect(fullSchedule.length).toBe(4);
            // Check specific entries for content
            expect(fullSchedule).toContainEqual(new ScheduleEntry(course1, instructor1, 'MWF 10:00-10:50 AM', 'Room 101'));
            expect(fullSchedule).toContainEqual(new ScheduleEntry(course2, instructor2, 'MWF 10:00-10:50 AM', 'Room 102'));
        });

        it('should return the schedule for a specific instructor', () => {
            const instructor1Schedule = scheduler.getInstructorSchedule('I001');
            expect(instructor1Schedule.length).toBe(2);
            expect(instructor1Schedule).toContainEqual(new ScheduleEntry(course1, instructor1, 'MWF 10:00-10:50 AM', 'Room 101'));
            expect(instructor1Schedule).toContainEqual(new ScheduleEntry(course1, instructor1, 'TTh 1:00-2:15 PM', 'Room 101'));
        });

        it('should return an empty array if instructor has no schedule', () => {
            const instructor4 = new Instructor('I004', 'Dr. Green');
            scheduler.addInstructor(instructor4);
            expect(scheduler.getInstructorSchedule('I004')).toEqual([]);
        });

        it('should return the schedule for a specific location', () => {
            const room101Schedule = scheduler.getLocationSchedule('Room 101');
            expect(room101Schedule.length).toBe(2);
            expect(room101Schedule).toContainEqual(new ScheduleEntry(course1, instructor1, 'MWF 10:00-10:50 AM', 'Room 101'));
            expect(room101Schedule).toContainEqual(new ScheduleEntry(course1, instructor1, 'TTh 1:00-2:15 PM', 'Room 101'));
        });

        it('should return an empty array if location has no schedule', () => {
            expect(scheduler.getLocationSchedule('Room 500')).toEqual([]);
        });
    });

    describe('Edge Cases and Data Validation', () => {
        it('should throw error for invalid Course creation', () => {
            expect(() => new Course('', 'Invalid', 3)).toThrow('Course ID, name, and positive credits are required.');
            expect(() => new Course('C999', '', 3)).toThrow('Course ID, name, and positive credits are required.');
            expect(() => new Course('C999', 'Invalid', 0)).toThrow('Course ID, name, and positive credits are required.');
        });

        it('should throw error for invalid Instructor creation', () => {
            expect(() => new Instructor('', 'Invalid')).toThrow('Instructor ID and name are required.');
            expect(() => new Instructor('I999', '')).toThrow('Instructor ID and name are required.');
        });

        it('should throw error for invalid ScheduleEntry creation', () => {
            expect(() => new ScheduleEntry(course1, instructor1, '', 'Room 101')).toThrow('Schedule entry requires a course, instructor, time, and location.');
            expect(() => new ScheduleEntry(course1, instructor1, 'MWF', '')).toThrow('Schedule entry requires a course, instructor, time, and location.');
        });
    });
});
```
