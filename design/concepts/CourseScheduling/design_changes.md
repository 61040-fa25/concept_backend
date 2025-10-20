# Design Changes
During the development of the Course Scheduling concept, I made several key design changes to ensure that the model accurately represents how academic courses and sections function in practice.

The most significant change was introducing a hierarchical relationship between courses and sections. Originally, each section was treated as an independent course-like entity, which led to redundancy in titles, departments, and course codes. This structure made it difficult to manage updates or represent the shared identity of a course across multiple sections.

In the revised design, each Course maintains a set of Sections, where:

All sections under a course share the same course code, title, and department.

Each section has distinct attributes such as instructor, meeting times, and capacity.

Users can add or remove sections from the schedule dynamically, while courses themselves remain stable identifiers of academic offerings.

This change simplifies the logic for retrieving and displaying course information, supports more intuitive scheduling operations, and aligns the data model with real-world academic structures.

It also clarified the distinction between state (the collection of courses and their sections) and actions (the creation, modification, and retrieval of these entities), ensuring consistency across specifications and tests.

Finally, this redesign improved testability: it allowed isolated unit tests for both course-level and section-level actions, such as createCourse, createSection, editSection, and getAllSections, to more accurately reflect expected interactions within a realistic scheduling system.

# Intersting Moments

1. Gemini Misinterpreted Concept as Hardware State Plan
    - Snapshot: Academica\context\design\brainstorming\questioning.md\20251012_190001.709777df.md
    - While prompting Gemini to generate a state implementation for the CourseSchedulingConcept, the model unexpectedly produced a finite state machine instead of a software concept state structure.
    - I refined my prompt to specify: That the output should represent a software concept state consistent with the system’s interfaces; and that it should use TypeScript syntax and reference the CourseSchedulingConcept context files directly. However, I continued to make the mistake of accidentally not linking my context as I swapped brackets and parentheses in the obsidion document. This also hindered my instuction of gemini.

2. Issue with prompt Engineering to create my state
    - Snapshot: Academica\context\design\brainstorming\questioning.md\20251012_191327.38211874 1.md
    - When using the context tool to create a state for my CourseScheduling concept it returned a state that did not match my principle or interned use at all. The state was set up for a College creating courses and assigning professors to courses not for a student creating their academic schedule. 
    - Example:\
    ``
    export interface Instructor
      /** A unique identifier for the instructor. */
      id: string;
      /** The full name of the instructor. */
      name:string;
      /** A list of TimeSlot objects representing when the instructor is available to teach. */
      availability: TimeSlot[];
      /** A list of course IDs that this instructor is qualified to teach. */
      canTeach: string[]; 
    ``
    - I was more specific in my instructions to gemini that the imagined user was a student at a college slecting courses created by the system. However, my overarching problem persisted until I attachted context in obsidian correclty.

3. Assertion Mismatch in Course Scheduling Tests
    - Snapshot: Academica\context\design\brainstorming\questioning.md\20251019_213710.dea6b929.md
    - When testing the CourseSchedulingConcept actions, an assertEquals failure revealed that the database automatically adds an _id field to documents, which wasn’t accounted for in the Course interface.
    - Example: ``AssertionError: Values are not equal.
    _id: new ObjectId("68f58daa9808bab0d36cf21a")``
    - I replaced assertEquals with assertObjectMatch to compare only meaningful fields, preventing failures due to system-generated metadata. This also clarified for me how MongoDB documents differ from pure TypeScript interfaces.

4. TypeScript Type Incompatibility with assertObjectMatch
    - Snapshot: Academica\context\design\brainstorming\questioning.md\20251019_214354.baa17c93.md
    - TypeScript rejected passing a Section type directly into assertObjectMatch because the interface lacked an index signature (Record<PropertyKey, unknown>).
    - Example: ``Argument of type 'Section' is not assignable to parameter of type 'Record<PropertyKey, unknown>``
    - Context had trouble recognizing the issue and focused on implimenting testing using assertObjectMatch. So I used type casting to ensure the tests were evaluating the actions for the information about the courses that would be seen and important to the user. I had corrected my mistake at this point and used context to support gemini but decided to takle this issue independent of gemini. 

5. Gemini Returned Raw Testing Output Instead of Structured Analysis
    - Snapshot: Academica\context\design\brainstorming\questioning.md\20251019_222448.c402c485.md
    - When I first asked Gemini to create a Markdown summary of courseSchedulingConcept.test.ts results, I provided the TestingOutput variable and a format template showing how each test should be described (using “Given / Action / Result” steps). However, instead of producing a structured explanation of what each test did, Gemini simply repeated the raw testing output—listing errors and diffs without contextualizing them. It failed to infer the test inputs or intentions from courseSchedulingConcept.test.ts.
    - Example: 
    `` ### Action: createCourse - creates and retrieves a course successfully **Type:** Action **Result:** Passed (ok) **Duration:** 690ms ### Action: getCourse - returns null for non-existent course **Type:** Action **Result:** Passed (ok) **Duration:** 622ms ``
    - I refined my instructions by using ChatGPT to polish my prompt wording, ensuring clarity about the desired explanatory structure and style and emphasize the readability. After re-prompting with these clarifications, Gemini generated a detailed Markdown document matching the format of Testing.md, with clear “Given / Action / Result” sections. This taught me that example-driven prompting dramatically improves results.


