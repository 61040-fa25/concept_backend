# trace: running 3 tests from courseScheduling_test.ts

The following trace demonstrates how the **principle** of the `CourseScheduling` concept is fulfilled by a sequence of actions.

CourseScheduling_actions: Course Management ...
  createCourse should add a new course ... ok (1ms)
  getCourse should retrieve a course by ID ... ok (0ms)
  getCourse should return null for non-existent course ... ok (1ms)
  getAllCourses should return all stored courses ... ok (0ms)
**CourseScheduling_actions: Course Management ... ok (3ms)**

CourseScheduling_actions: Section Management ...
  editSection should modify an existing section ... ok (0ms)
  createSection should add a new section for a course ... ok (1ms)
  removeSection should remove section from schedule ... ok (0ms)
  addSection should add a section to a schedule ... ok (1ms)
  getSection should return a section by ID ... ok (0ms)
  getSection should return null for non-existent section ... ok (0ms)
  getAllSections should return all stored sections ... ok (0ms)
**CourseScheduling_actions: Section Management ... ok (4ms)**

CourseScheduling_actions: Schedule Management ...
  createSchedule should create a new empty schedule for a user ... ok (0ms)
  deleteSchedule should remove a schedule if owned by the user ... ok (0ms)
  should throw if user is not the owner ... ok (0ms)
  deleteSchedule should throw if schedule does not exist ... ok (0ms)
  should duplicate an existing schedule with same sections ... ok (1ms)
  duplicateSchedule should throw if user does not own the schedule ... ok (0ms)
  duplicateSchedule should throw if source schedule not found ... ok (1ms)
  getAllSchedules should return all stored schedules ... ok (0ms)
**CourseScheduling_actions: Schedule Management ... ok (5ms)**

ok | 3 passed (19 steps) | 0 failed (28ms)