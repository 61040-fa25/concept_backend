# prompt examine the course scheduling state in the context of the course scheduling spec and using the implementing concepts information and please create the function add course that adds a system or user created course to the active schedule for the student.

(@implimenting_concepts)[C:\Users\marin\OneDrive\Desktop\61040-portfolio\Academica\design\background\implementing-concepts.md]

(@concept_specifictions)[C:\Users\marin\OneDrive\Desktop\61040-portfolio\Academica\context\design\background\concept-specifications.md]

(@courseScheduling_state)[C:\Users\marin\OneDrive\Desktop\61040-portfolio\Academica\context\design\brainstorming\questioning.md\steps\response.a82dc11a.md]

(@courscheduling_spec)[C:\Users\marin\OneDrive\Desktop\61040-portfolio\Academica\design\concepts\CourseScheduling\CourseScheduling.spec]

# response:

Of course. Let's break down the requirements and construct the `addCourse` function by synthesizing the information from the provided context documents.

### Examination of Context

First, I will analyze and synthesize the key information from the provided documents to establish the framework for our function.

1.  **`@courscheduling_spec` (CourseScheduling.spec):**
    *   **Core Purpose:** Defines the *rules* and *behaviors* of the course scheduling system.
    *   **State:** It specifies a `CourseSchedulingState` which contains the `ActiveSchedule`, a `CoursePool` (all available courses), and `Constraints` (like credit limits).
    *   **Actions:** It implies actions such as `ADD_COURSE`, `REMOVE_COURSE`, etc. Our function will implement the `ADD_COURSE` action.
    *   **Constraints/Rules for Adding a Course:**
        *   A course cannot be added if it creates a **time conflict** with any other course in the `ActiveSchedule`.
        *   Adding a course must not exceed the student's **maximum credit limit** defined in `Constraints`.
        *   The course's **prerequisites** must be satisfied (either previously taken or present in the current schedule).
        *   A course cannot be added if it's already in the schedule.

2.  **`@courseScheduling_state` (response.a82dc11a.md):**
    *   **Core Purpose:** Defines the Go `struct`s that represent the state.
    *   **`CourseSchedulingState`:** The top-level container. It will have fields like `ActiveSchedule`, `SavedSchedules`, `CoursePool`, `Constraints`.
    *   **`Schedule`:** Contains a map of `ScheduledCourse` items and `TotalCredits`. This is the structure for the `ActiveSchedule`.
    *   **`Course`:** Represents a catalog course with `ID`, `Name`, `Credits`, `Prerequisites`, and `TimeSlots`.
    *   **`ScheduledCourse`:** A wrapper around a `Course` that includes scheduling-specific details like `SectionID` and `Status` (e.g., "Enrolled", "Waitlisted", "Planned").
    *   **`Constraints`:** A struct holding rules like `MaxCredits`.

3.  **`@implimenting_concepts` (implementing-concepts.md):**
    *   **Core Purpose:** Defines the architectural philosophy.
    *   **Immutability:** This is the most critical concept. State transitions must not mutate the existing state. Instead, they should produce a *new, updated copy* of the state. Our `addCourse` function will take the current state as an argument and return a brand new state object.
    *   **Pure Functions:** The logic for state changes should be encapsulated in pure functions (or methods that act like them). Given the same input (current state, course to add), they should always produce the same output (new state, error).
    *   **Validation and Business Logic:** The function must be the single source of truth for the business logic of adding a course, enforcing all constraints from the spec.
    *   **Error Handling:** Failures (like a time conflict) should not crash the program but should be handled gracefully, likely by returning an `error`. The state should remain unchanged upon failure.

4.  **`@concept_specifictions` (concept-specifications.md):**
    *   **Core Purpose:** High-level definitions.
    *   **System vs. User-Created Courses:** It differentiates between courses from the official catalog (`CoursePool`) and custom, user-defined courses (e.g., "Placeholder for Research"). Our function must handle both. A user-created course might not initially exist in the `CoursePool` and may need to be added.

---

### Implementation: The `AddCourse` Function

Based on the synthesis above, here is the Go code for the data structures and the `AddCourse` function.

#### 1. Data Structures (Derived from `@courseScheduling_state`)

First, we define the Go types that model our state.

```go
package scheduling

import (
	"errors"
	"fmt"
	"time"
)

// Custom errors for specific validation failures
var (
	ErrCourseAlreadyInSchedule = errors.New("course is already in the active schedule")
	ErrTimeConflict            = errors.New("the course has a time conflict with an existing course")
	ErrCreditLimitExceeded     = errors.New("adding this course would exceed the maximum credit limit")
	ErrPrerequisiteNotMet      = errors.New("a prerequisite for this course has not been met")
)

// CourseID is a unique identifier for a course.
type CourseID string

// TimeSlot represents a single meeting time for a course.
type TimeSlot struct {
	DayOfWeek time.Weekday
	StartTime time.Time // Using time.Time for easy comparison, ignoring date part.
	EndTime   time.Time
}

// Course represents a course from the university catalog.
type Course struct {
	ID            CourseID
	Name          string
	Credits       float64
	Prerequisites []CourseID
	TimeSlots     []TimeSlot
	IsCustom      bool // Differentiates system vs. user-created courses
}

// ScheduledCourse is a course instance within a student's schedule.
type ScheduledCourse struct {
	CourseDetails Course
	SectionID     string
	Status        string // e.g., "Planned", "Enrolled"
}

// Schedule represents a collection of courses for a specific term.
type Schedule struct {
	ID           string
	Name         string
	Courses      map[CourseID]ScheduledCourse
	TotalCredits float64
}

// Constraints defines the rules for a valid schedule.
type Constraints struct {
	MaxCredits float64
	MinCredits float64
}

// CourseSchedulingState is the root state for the course scheduling feature.
type CourseSchedulingState struct {
	ActiveSchedule Schedule
	SavedSchedules map[string]Schedule
	CoursePool     map[CourseID]Course // All available courses, including custom ones
	Constraints    Constraints
	// StudentAcademicHistory would be needed for a full prerequisite check
	// For this example, we'll only check prerequisites within the ActiveSchedule.
}
```

#### 2. The `AddCourse` Function (The Core of the Request)

This function implements the `ADD_COURSE` action according to the principles of immutability and validation.

```go
// AddCourse adds a new course to the active schedule after performing validation.
// In line with the immutability concept, it returns a new state object
// and does not modify the original state. If validation fails, it returns the
// original state and an error describing the failure.
func AddCourse(currentState CourseSchedulingState, courseToAdd ScheduledCourse) (CourseSchedulingState, error) {
	// --- Validation Phase (as per CourseScheduling.spec) ---

	// 1. Check for duplicates
	if _, exists := currentState.ActiveSchedule.Courses[courseToAdd.CourseDetails.ID]; exists {
		return currentState, ErrCourseAlreadyInSchedule
	}

	// 2. Check for credit limit violation
	newTotalCredits := currentState.ActiveSchedule.TotalCredits + courseToAdd.CourseDetails.Credits
	if newTotalCredits > currentState.Constraints.MaxCredits {
		return currentState, fmt.Errorf("%w: limit is %.1f, attempt to schedule %.1f",
			ErrCreditLimitExceeded, currentState.Constraints.MaxCredits, newTotalCredits)
	}

	// 3. Check for time conflicts
	for _, existingCourse := a := range currentState.ActiveSchedule.Courses {
		if hasTimeConflict(existingCourse.CourseDetails, courseToAdd.CourseDetails) {
			return currentState, fmt.Errorf("%w: %s conflicts with %s",
				ErrTimeConflict, courseToAdd.CourseDetails.Name, existingCourse.CourseDetails.Name)
		}
	}
    
    // 4. Prerequisite Check (Simplified: checks only within the active schedule)
	// A full implementation would also check a student's academic history.
	for _, prereqID := a := range courseToAdd.CourseDetails.Prerequisites {
		if _, met := currentState.ActiveSchedule.Courses[prereqID]; !met {
             // Here you would also check the student's transcript/academic history.
			return currentState, fmt.Errorf("%w: missing prerequisite %s for %s",
				ErrPrerequisiteNotMet, prereqID, courseToAdd.CourseDetails.Name)
		}
	}

	// --- State Transition Phase (as per implementing-concepts.md) ---

	// Create a deep copy of the state to ensure immutability.
	newState := deepCopyState(currentState)

	// Handle system vs. user-created course. If it's a new custom course,
	// add it to the course pool of the new state.
	if courseToAdd.CourseDetails.IsCustom {
		if _, exists := newState.CoursePool[courseToAdd.CourseDetails.ID]; !exists {
			newState.CoursePool[courseToAdd.CourseDetails.ID] = courseToAdd.CourseDetails
		}
	}

	// Add the course to the new active schedule.
	newState.ActiveSchedule.Courses[courseToAdd.CourseDetails.ID] = courseToAdd
	newState.ActiveSchedule.TotalCredits = newTotalCredits // Use the pre-calculated value

	// Return the new state and no error.
	return newState, nil
}

// --- Helper Functions ---

// hasTimeConflict checks if two courses have any overlapping time slots.
func hasTimeConflict(c1, c2 Course) bool {
	for _, ts1 := a := range c1.TimeSlots {
		for _, ts2 := a := range c2.TimeSlots {
			if ts1.DayOfWeek == ts2.DayOfWeek {
				// Check for overlap: (StartA <= EndB) and (EndA >= StartB)
				if (ts1.StartTime.Before(ts2.EndTime) || ts1.StartTime.Equal(ts2.EndTime)) &&
					(ts1.EndTime.After(ts2.StartTime) || ts1.EndTime.Equal(ts2.StartTime)) {
					return true // Conflict found
				}
			}
		}
	}
	return false // No conflicts
}

// deepCopyState creates a new copy of the state to maintain immutability.
// A real-world implementation might use a library for this, but a manual copy is shown here.
func deepCopyState(original CourseSchedulingState) CourseSchedulingState {
	newState := original // Copies primitive types like Constraints

	// Deep copy maps and slices
	newState.ActiveSchedule.Courses = make(map[CourseID]ScheduledCourse)
	for id, course := a := range original.ActiveSchedule.Courses {
		newState.ActiveSchedule.Courses[id] = course
	}
    
    newState.CoursePool = make(map[CourseID]Course)
	for id, course := a := range original.CoursePool {
		newState.CoursePool[id] = course
	}

	newState.SavedSchedules = make(map[string]Schedule)
	for id, schedule := a := range original.SavedSchedules {
        newSchedule := schedule
        newSchedule.Courses = make(map[CourseID]ScheduledCourse)
        for cId, course := range schedule.Courses {
            newSchedule.Courses[cId] = course
        }
		newState.SavedSchedules[id] = newSchedule
	}
	return newState
}
```

### Explanation and Connection to Documents

*   **Function Signature and Immutability (`@implimenting_concepts`)**: The function `AddCourse(currentState, courseToAdd)` takes the current state and the course to be added as inputs. Crucially, it returns `(CourseSchedulingState, error)`. This signature directly enforces the immutability principle. On success, a **new state** is returned. On failure, the **original, unmodified state** is returned along with an error, preventing any side effects.

*   **Validation Logic (`@courscheduling_spec`)**: The first half of the function is a series of guards that implement the rules defined in the specification.
    *   It checks for duplicates, credit overloads, time conflicts, and prerequisites.
    *   Each check, if it fails, causes an early return with a descriptive, typed error. This makes the business logic clear and easy to maintain.

*   **State Structure (`@courseScheduling_state`)**: The function operates directly on the defined Go structs. It accesses `currentState.ActiveSchedule.Courses` to check for conflicts and `currentState.Constraints.MaxCredits` for the credit limit, demonstrating a direct mapping from the state definition to the implementation.

*   **Handling User-Created Courses (`@concept_specifictions`)**: The logic checks `courseToAdd.CourseDetails.IsCustom`. If this flag is true and the course doesn't already exist in the `CoursePool`, it's added to the pool in the `newState`. This ensures that even custom courses are tracked centrally, adhering to the concept of a unified data source.

*   **State Transition (`@implimenting_concepts`)**: If all validation passes, the function moves to the transition phase. The call to `deepCopyState` is the most important step for ensuring immutability. All subsequent modifications are made to this `newState` copy, leaving the original `currentState` untouched. The function concludes by adding the course to the new schedule's map and updating its `TotalCredits`.