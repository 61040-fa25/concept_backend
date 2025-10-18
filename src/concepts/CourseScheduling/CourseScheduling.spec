<concept_spec>

Concept CourseScheduling [User]

Purpose 
  Enables the user to create multiple schedules and add classes to them to compare class schedules.

Principle 
  The user begins by creating a schedule. The user selects courses from a set of system created courses and adds them to the schedule. The user can create their own course and then remove a course from the schedule. The user can delete previous schedules and create a new empty schedule to add and remove courses from.

State
  A set of schedules with
    A set of courses
    An owner user
  A set of courses with
    A day
    A start time
    An end time

Actions
  createCourse (d : day, start : time, end : time) : (c : course)
    requires valid day and start and end times. And that course does not already exist
    effects creates course
  
  addCourse (c : course, u: user, s : schedule)
    requires course is valid, course does not already exist in schedule and user is the owner of the schedule
    effects course is added to the schedule

  editCourse (c: course, d: day, start: time, end: time)
    requires course, day, start, and end times are valid
    effects changes the course features to specified day and times

  removeCourse (c : course, u : user, s : schedule)
    requires course is valid, course exists on the schedule, and that user is the owner of the schedule
    effects course is removed from the schedule

  createSchedule (u : user) : (s : schedule)
    effects creates empty schedule with user as the owner

  deleteSchedule (u: user)
    requires user is the owner of the schedule
    effects deletes schedule


</concept_spec>