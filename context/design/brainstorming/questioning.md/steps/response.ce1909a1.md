---
timestamp: 'Sun Oct 12 2025 19:08:15 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_190815.208db3c1.md]]'
content_id: ce1909a17a768c81915b430cbae4974a23b95ecd9a99899e20b308a23c185a3d
---

# response:

Of course. Based on the provided specification documents, I will implement the `CourseScheduling` concept in Python.

### Analysis of Specifications

1. **`concept-specifications.md`**: This document provides the meta-framework for how a concept should be defined. It outlines the standard sections: Name, Description, Responsibilities, Collaborations, Properties, and Operations.
2. **`implementing-concepts.md`**: This guide instructs how to translate the abstract concept specification into a concrete programming implementation. The key takeaway is the mapping:
   * **Concept** -> `Class`
   * **Responsibilities/Operations** -> `Methods`
   * **Properties** -> `Instance Attributes`
   * **Collaborations** -> `Other classes/objects` that the main class interacts with.
3. **`CourseScheduling.spec`**: This is the core specification I will implement.
   * **Concept**: `CourseScheduling`. This will become our main class, which I'll name `CourseScheduler` following common Python naming conventions for objects that perform actions.
   * **Description**: The class must manage scheduling for a semester, handling constraints and conflicts.
   * **Responsibilities & Operations**: These translate directly to methods like `add_course`, `remove_course`, `check_for_conflict`, etc.
   * **Collaborations**: This requires creating helper classes for `Course`, `Instructor`, `Classroom`, and `TimeSlot`.
   * **Properties**: The `CourseScheduler` class will have attributes for `semester`, `year`, and a list to hold the `scheduled_courses`.

### Implementation Strategy

1. **Define Collaborator Classes**: I will first create simple data classes for `Course`, `Instructor`, `Classroom`, and `TimeSlot`. The `TimeSlot` class will include a crucial `overlaps` method for conflict detection.
2. **Define a Composite Data Structure**: A new class, `ScheduledCourse`, will be created to bundle a `Course` with its assigned `Instructor`, `Classroom`, and `TimeSlot`. This will make the main schedule list clean and easy to manage.
3. **Implement the Main `CourseScheduler` Class**: This class will contain the core logic.
   * The `__init__` method will set up the `semester`, `year`, and the main schedule list.
   * The `add_course` method will be the central point of control, performing all constraint and conflict checks before adding a new `ScheduledCourse`. It will raise an exception if a rule is violated.
   * Helper methods will be implemented to check for conflicts, retrieve parts of the schedule, and manage courses.
4. **Create a Demonstration**: A `if __name__ == "__main__":` block will be used to demonstrate the functionality, showing how to add courses, how conflicts are handled, and how to retrieve schedule information.

***

### `course_scheduler.py`

```python
# course_scheduler.py

import datetime
from dataclasses import dataclass, field
from typing import List, Optional

# ==============================================================================
# 1. Implementation of Collaborator Concepts
# These classes represent the collaborating objects defined in the spec.
# ==============================================================================

@dataclass(frozen=True)
class TimeSlot:
    """
    Represents a time slot for a course. (Collaboration)
    - frozen=True makes instances immutable, which is good for keys or sets.
    """
    day: str  # e.g., "Mon", "Tue", "Wed"
    start_time: datetime.time
    end_time: datetime.time

    def __post_init__(self):
        if self.start_time >= self.end_time:
            raise ValueError("Start time must be before end time.")

    def overlaps(self, other: 'TimeSlot') -> bool:
        """Checks if this time slot overlaps with another."""
        if self.day != other.day:
            return False
        # Overlap exists if one slot starts before the other ends, AND
        # it ends after the other one starts.
        return self.start_time < other.end_time and self.end_time > other.start_time

    def __str__(self):
        return (f"{self.day} {self.start_time.strftime('%H:%M')}-"
                f"{self.end_time.strftime('%H:%M')}")

@dataclass
class Course:
    """Represents a course to be scheduled. (Collaboration)"""
    id: str
    name: str
    credits: int

@dataclass
class Instructor:
    """Represents an instructor. (Collaboration)"""
    id: int
    name: str
    availability: List[TimeSlot] = field(default_factory=list)

    def is_available(self, timeslot: TimeSlot) -> bool:
        """Checks if the instructor is available during a given timeslot."""
        # For simplicity, we check if the requested slot is contained within any
        # of the available slots. A more complex system might have specific blocks.
        for available_slot in self.availability:
            if (available_slot.day == timeslot.day and
                available_slot.start_time <= timeslot.start_time and
                available_slot.end_time >= timeslot.end_time):
                return True
        return False

@dataclass
class Classroom:
    """Represents a classroom. (Collaboration)"""
    id: str
    capacity: int

# ==============================================================================
# 2. Composite Data Structure for the Schedule
# This class bundles a course with its scheduled details.
# ==============================================================================

@dataclass
class ScheduledCourse:
    """Represents a fully scheduled course, bundling all collaborators."""
    course: Course
    instructor: Instructor
    classroom: Classroom
    timeslot: TimeSlot

    def __str__(self):
        return (f"[{self.course.id}] {self.course.name} with {self.instructor.name} "
                f"in {self.classroom.id} at {self.timeslot}")

# ==============================================================================
# 3. Main Concept Implementation: CourseScheduler
# Implements the `CourseScheduling` concept from the specification.
# ==============================================================================

class SchedulingConflictError(Exception):
    """Custom exception for scheduling conflicts."""
    pass

class CourseScheduler:
    """
    Manages the process of scheduling courses for a specific semester,
    handling constraints and conflicts as per the CourseScheduling spec.
    """

    # --- Properties ---
    def __init__(self, semester: str, year: int):
        self.semester: str = semester
        self.year: int = year
        self.scheduled_courses: List[ScheduledCourse] = []
        print(f"--- Initialized Course Scheduler for {self.semester} {self.year} ---")

    # --- Operations & Responsibilities ---

    def add_course(self, course: Course, instructor: Instructor, classroom: Classroom, timeslot: TimeSlot) -> ScheduledCourse:
        """
        Adds a course to the schedule after checking for all conflicts and constraints.
        This method directly implements the 'Add a course to the schedule' responsibility.
        """
        new_scheduled_course = ScheduledCourse(course, instructor, classroom, timeslot)

        # 1. Check for scheduling conflicts (time/place/person)
        self.check_for_conflict(new_scheduled_course)

        # 2. Check for other constraints
        if not instructor.is_available(timeslot):
            raise SchedulingConflictError(
                f"Constraint Violation: Instructor {instructor.name} is not available at {timeslot}."
            )

        if classroom.capacity < 30: # Assuming a minimum class size for this example
             print(f"Warning: Classroom {classroom.id} capacity ({classroom.capacity}) is low.")


        # 3. If all checks pass, add the course
        self.scheduled_courses.append(new_scheduled_course)
        print(f"Successfully scheduled: {new_scheduled_course}")
        return new_scheduled_course

    def check_for_conflict(self, new_course_to_schedule: ScheduledCourse):
        """
        Checks a potential new course against the existing schedule for conflicts.
        This is a core responsibility. It raises a SchedulingConflictError if a
        conflict is found.
        """
        for existing_course in self.scheduled_courses:
            # Check for time overlap first
            if existing_course.timeslot.overlaps(new_course_to_schedule.timeslot):
                # If times overlap, check for resource conflicts
                if existing_course.instructor.id == new_course_to_schedule.instructor.id:
                    raise SchedulingConflictError(
                        f"Conflict: Instructor {existing_course.instructor.name} is already scheduled "
                        f"for '{existing_course.course.name}' at {existing_course.timeslot}."
                    )
                if existing_course.classroom.id == new_course_to_schedule.classroom.id:
                    raise SchedulingConflictError(
                        f"Conflict: Classroom {existing_course.classroom.id} is already booked "
                        f"for '{existing_course.course.name}' at {existing_course.timeslot}."
                    )
        # No conflicts found
        return

    def remove_course(self, course_id: str) -> bool:
        """
        Removes a course from the schedule by its ID.
        Implements the 'Remove a course from the schedule' responsibility.
        """
        course_to_remove = self.find_scheduled_course(course_id)
        if course_to_remove:
            self.scheduled_courses.remove(course_to_remove)
            print(f"Successfully removed course: {course_id}")
            return True
        print(f"Could not remove: Course with ID '{course_id}' not found in schedule.")
        return False

    def find_scheduled_course(self, course_id: str) -> Optional[ScheduledCourse]:
        """Helper operation to find a scheduled course by its ID."""
        for scheduled_course in self.scheduled_courses:
            if scheduled_course.course.id == course_id:
                return scheduled_course
        return None

    def get_schedule(self) -> List[ScheduledCourse]:
        """
        Retrieves the full schedule.
        Implements the 'Retrieve the full schedule' responsibility.
        """
        return self.scheduled_courses

    def get_schedule_for_instructor(self, instructor_id: int) -> List[ScheduledCourse]:
        """Retrieves all courses taught by a specific instructor."""
        return [sc for sc in self.scheduled_courses if sc.instructor.id == instructor_id]

    def get_schedule_for_classroom(self, classroom_id: str) -> List[ScheduledCourse]:
        """Retrieves all courses held in a specific classroom."""
        return [sc for sc in self.scheduled_courses if sc.classroom.id == classroom_id]

    def print_schedule(self):
        """Utility method to display the current schedule."""
        print("\n" + "="*50)
        print(f"Current Schedule for {self.semester} {self.year}")
        print("="*50)
        if not self.scheduled_courses:
            print("... Schedule is empty ...")
        else:
            # Sort for consistent output
            sorted_schedule = sorted(self.scheduled_courses, key=lambda s: (s.timeslot.day, s.timeslot.start_time))
            for item in sorted_schedule:
                print(item)
        print("="*50 + "\n")


# ==============================================================================
# 4. Demonstration of Usage
# ==============================================================================
if __name__ == "__main__":
    # --- Setup Collaborators ---
    # TimeSlots
    t9_1030_mw = TimeSlot("Mon", datetime.time(9, 0), datetime.time(10, 30))
    t11_1230_mw = TimeSlot("Mon", datetime.time(11, 0), datetime.time(12, 30))
    t9_1030_th = TimeSlot("Thu", datetime.time(9, 0), datetime.time(10, 30))

    # Instructors
    dr_alan = Instructor(1, "Dr. Alan", availability=[t9_1030_mw, t11_1230_mw])
    prof_ada = Instructor(2, "Prof. Ada", availability=[t9_1030_mw, t9_1030_th])

    # Courses
    cs101 = Course("CS101", "Intro to Programming", 3)
    math202 = Course("MATH202", "Linear Algebra", 3)
    cs305 = Course("CS305", "Algorithms", 4)
    
    # Classrooms
    room101 = Classroom("Room101", 50)
    hall_a = Classroom("Hall A", 200)

    # --- Create Scheduler Instance ---
    scheduler = CourseScheduler("Fall", 2024)
    scheduler.print_schedule()

    # --- Scenario 1: Add valid courses ---
    print(">>> SCENARIO 1: Adding valid courses...")
    try:
        scheduler.add_course(cs101, prof_ada, hall_a, t9_1030_mw)
        scheduler.add_course(math202, dr_alan, room101, t11_1230_mw)
    except SchedulingConflictError as e:
        print(f"Error: {e}")
    scheduler.print_schedule()

    # --- Scenario 2: Attempt to add a course with an INSTRUCTOR conflict ---
    print("\n>>> SCENARIO 2: Attempting to add a course with an instructor conflict...")
    try:
        # Prof. Ada is already teaching CS101 at this time. This should fail.
        scheduler.add_course(cs305, prof_ada, room101, t9_1030_mw)
    except SchedulingConflictError as e:
        print(f"Caught expected error: {e}")
    scheduler.print_schedule()

    # --- Scenario 3: Attempt to add a course with a CLASSROOM conflict ---
    print("\n>>> SCENARIO 3: Attempting to add a course with a classroom conflict...")
    try:
        # Hall A is already booked for CS101 at this time. This should fail.
        scheduler.add_course(cs305, dr_alan, hall_a, t9_1030_mw)
    except SchedulingConflictError as e:
        print(f"Caught expected error: {e}")
    scheduler.print_schedule()

    # --- Scenario 4: Successfully add another course ---
    print("\n>>> SCENARIO 4: Adding another valid course...")
    try:
        scheduler.add_course(cs305, prof_ada, room101, t9_1030_th)
    except SchedulingConflictError as e:
        print(f"Error: {e}")
    scheduler.print_schedule()

    # --- Scenario 5: Retrieve specific schedule information ---
    print("\n>>> SCENARIO 5: Retrieving schedule for Prof. Ada...")
    ada_schedule = scheduler.get_schedule_for_instructor(prof_ada.id)
    for s in ada_schedule:
        print(f"  - {s}")
        
    # --- Scenario 6: Remove a course ---
    print("\n>>> SCENARIO 6: Removing a course (MATH202)...")
    scheduler.remove_course("MATH202")
    scheduler.print_schedule()
```

### Explanation of Implementation

1. **Collaborator Classes (`TimeSlot`, `Course`, `Instructor`, `Classroom`)**: These are implemented as Python `dataclasses` for simplicity and clarity. They hold the data as specified. The `TimeSlot.overlaps()` method is the key piece of logic for conflict detection, correctly identifying when two time periods intersect on the same day. The `Instructor.is_available()` method enforces the availability constraint.

2. **`ScheduledCourse` Class**: This `dataclass` acts as a container, bundling together all the collaborator objects for a single scheduled event. This design simplifies the main `scheduled_courses` list in the `CourseScheduler`, making each element a complete and self-contained entry.

3. **`CourseScheduler` Class**:
   * **Properties**: `__init__` correctly sets up the `semester`, `year`, and the main list `scheduled_courses`.
   * **Responsibilities & Operations**:
     * `add_course()` serves as the primary public method for modifying the schedule. It orchestrates the validation by calling helper methods and checking constraints. It clearly raises a custom `SchedulingConflictError` when a rule is broken, making the reason for failure explicit.
     * `check_for_conflict()` encapsulates the logic for checking time/space/instructor clashes, fulfilling a core responsibility. It is called by `add_course()` to ensure schedule integrity.
     * `remove_course()`, `get_schedule()`, `get_schedule_for_instructor()`, and `get_schedule_for_classroom()` directly implement the corresponding operations from the specification.
     * `find_scheduled_course()` is a private helper method that supports other operations like `remove_course`.

4. **Demonstration Block (`if __name__ == "__main__":`)**: This section proves the concept works. It sets up sample data and runs through several scenarios: successful scheduling, handling of instructor conflicts, handling of classroom conflicts, and using the retrieval and removal methods. The `try...except` blocks show how a user of this class would handle scheduling failures gracefully.

This implementation directly translates the abstract design from your specification files into a functioning, well-structured, and documented Python program.
