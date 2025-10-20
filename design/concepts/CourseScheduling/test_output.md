#Test Results for `courseSchedulingConcept.test.ts`

### Principle: Course scheduling full workflow (Create, schedule, manage student schedule)

This test validates the end-to-end functionality, from creating courses and sections, to managing a student's schedule, including adding, removing, duplicating, and deleting schedules.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   Predefined test data including two courses (`CS101`, `MA201`), two time slots, and two user IDs (`user:alice`, `user:bob`).
*   **Action**:
    1.  Create `CS101` and `MA201` courses.
    2.  Retrieve all courses to confirm creation.
    3.  Create section `001` for `CS101` with `Dr. Ada Lovelace` and `sampleTimeSlot1`.
    4.  Create section `002` for `MA201` with `Dr. Alan Turing` and `sampleTimeSlot2`.
    5.  Retrieve all sections to confirm creation.
    6.  Alice (`user:alice`) creates a new schedule named "Fall 2024 Classes".
    7.  Alice adds `section1` and `section2` to her schedule.
    8.  Retrieve Alice's schedule from the database to verify sections.
    9.  Alice removes `section1` from her schedule.
    10. Retrieve Alice's schedule from the database to verify the removal.
    11. Alice duplicates her updated schedule (which now only contains `section2`) as "Backup Schedule".
    12. Alice deletes her original schedule.
    13. Retrieve the original schedule to confirm deletion.
    14. Retrieve all schedules to confirm only the duplicated one remains.
*   **Result**:
    1.  Courses `CS101` and `MA201` are successfully created and retrieved, with two courses total.
    2.  Sections `001` and `002` are successfully created, linked to their respective courses, and retrieved, with two sections total.
    3.  Alice's schedule "Fall 2024 Classes" is created with an empty `sectionIds` array.
    4.  After adding sections, Alice's schedule contains `[section1.id, section2.id]`.
    5.  After removing `section1`, Alice's schedule contains `[section2.id]`.
    6.  A new `duplicatedSchedule` is created, with a unique ID, owner `user:alice`, name "Backup Schedule", and `sectionIds` matching `[section2.id]` (the state of the original schedule at duplication).
    7.  Alice's original schedule is deleted (returns `null` on lookup).
    8.  Only the `duplicatedSchedule` remains when all schedules are retrieved.

## Action: createCourse - creates and retrieves a course successfully

This test verifies the successful creation and retrieval of a single course.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
*   **Action**:
    1.  Create a course: `actions.createCourse("PH101", "Introduction to Philosophy", "Philosophy")`.
    2.  Retrieve the course using its ID: `actions.getCourse("PH101")`.
*   **Result**:
    1.  The course is created with ID "PH101", title "Introduction to Philosophy", and department "Philosophy".
    2.  The retrieved course matches the created course's properties (excluding the `_id` field).

## Action: getCourse - returns null for non-existent course

This test ensures that attempting to retrieve a non-existent course correctly returns `null`.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   No courses have been created in the database.
*   **Action**:
    1.  Attempt to retrieve a course with a non-existent ID: `actions.getCourse("NONEXISTENT")`.
*   **Result**:
    1.  The retrieval attempt returns `null`, indicating no course was found.

## Action: getAllCourses - retrieves all courses, including empty state

This test checks the `getAllCourses` action, ensuring it works correctly for both empty and populated states.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   `sampleCourse1` and `sampleCourse2` as predefined test data.
*   **Action**:
    1.  Retrieve all courses initially (empty state): `actions.getAllCourses()`.
    2.  Create `sampleCourse1`.
    3.  Create `sampleCourse2`.
    4.  Retrieve all courses again (populated state): `actions.getAllCourses()`.
*   **Result**:
    1.  Initially, `courses.length` is `0`.
    2.  After creating two courses, `courses.length` is `2`.
    3.  The retrieved courses include both `sampleCourse1` and `sampleCourse2`.

## Action: createSection - creates and retrieves a section successfully

This test confirms that a course section can be created and then successfully retrieved from the database.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   `sampleCourse1` is first created to serve as a reference for the section.
*   **Action**:
    1.  Create `sampleCourse1`.
    2.  Create a section for `sampleCourse1`: `actions.createSection(sampleCourse1.id, "001", "Dr. Jane Doe", 25, [sampleTimeSlot1])`.
    3.  Retrieve the newly created section using its generated ID: `actions.getSection(section.id)`.
*   **Result**:
    1.  The section is created with a unique ID, correctly linked to `sampleCourse1.id`, section number "001", instructor "Dr. Jane Doe", capacity 25, and `sampleTimeSlot1`.
    2.  The retrieved section matches the properties of the created section (excluding the `_id` field).

## Action: editSection - updates section details

This test verifies the ability to modify an existing course section's details.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   `sampleCourse1` is created, and an `originalSection` is created for it.
*   **Action**:
    1.  Update the `originalSection` by changing its instructor, capacity, and time slots: `actions.editSection(originalSection.id, { instructor: "Prof. John Smith", capacity: 35, timeSlots: [sampleTimeSlot2] })`.
    2.  Retrieve the updated section to confirm changes: `actions.getSection(originalSection.id)`.
*   **Result**:
    1.  The `updatedSection` exists with the same ID as the original.
    2.  Its `instructor` is now "Prof. John Smith", `capacity` is 35, `timeSlots` is `[sampleTimeSlot2]`.
    3.  The `sectionNumber` remains unchanged.
    4.  The retrieved section matches the `updatedSection` properties (excluding the `_id` field).

## Action: editSection - returns null for non-existent section

This test ensures that attempting to edit a section that does not exist gracefully returns `null`.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   No sections have been created in the database.
*   **Action**:
    1.  Attempt to edit a section with a non-existent ID: `actions.editSection("NONEXISTENT_SEC_ID", { capacity: 100 })`.
*   **Result**:
    1.  The update attempt returns `null`, indicating no section was found to update.

## Action: getSection - returns null for non-existent section

This test confirms that retrieving a non-existent section returns `null`.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   No sections have been created in the database.
*   **Action**:
    1.  Attempt to retrieve a section with a non-existent ID: `actions.getSection("NONEXISTENT_SEC_ID")`.
*   **Result**:
    1.  The retrieval attempt returns `null`.

## Action: getAllSections - retrieves all sections, including empty state

This test ensures the `getAllSections` action works correctly for both empty and populated states.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   `sampleCourse1` is created to provide a valid `courseId` for sections.
*   **Action**:
    1.  Retrieve all sections initially (empty state): `actions.getAllSections()`.
    2.  Create `section1` and `section2` for `sampleCourse1`.
    3.  Retrieve all sections again (populated state): `actions.getAllSections()`.
*   **Result**:
    1.  Initially, `sections.length` is `0`.
    2.  After creating two sections, `sections.length` is `2`.
    3.  The retrieved sections include both `section1` and `section2`.

## Action: createSchedule - creates an empty schedule for a user

This test verifies that a new schedule can be successfully created for a user.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   User `user:alice`.
*   **Action**:
    1.  Create a schedule for `user:alice`: `actions.createSchedule("user:alice", "My New Schedule")`.
    2.  Retrieve the newly created schedule from the database using its ID.
*   **Result**:
    1.  A `schedule` is created with a unique ID, `owner` "user:alice", `name` "My New Schedule", and an empty `sectionIds` array.
    2.  The `retrievedSchedule` matches the properties of the created `schedule` (excluding the `_id` field).

## Action: deleteSchedule - deletes a schedule by owner

This test ensures that a user can successfully delete their own schedule.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   A `schedule` is created for `user:alice`.
*   **Action**:
    1.  Delete the `schedule` by `user:alice`: `actions.deleteSchedule("user:alice", schedule.id)`.
    2.  Attempt to find the deleted schedule in the database.
*   **Result**:
    1.  The schedule is successfully deleted.
    2.  The attempt to find the schedule returns `null`.

## Action: deleteSchedule - throws error if schedule not found

This test confirms that attempting to delete a non-existent schedule results in an error.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   No schedules have been created in the database.
*   **Action**:
    1.  Attempt to delete a schedule with a non-existent ID: `actions.deleteSchedule("user:alice", "NONEXISTENT_SCHED")`.
*   **Result**:
    1.  The action rejects with an `Error` containing the message "Schedule not found".

## Action: deleteSchedule - throws error if unauthorized user

This test verifies that only the owner of a schedule can delete it; unauthorized attempts result in an error.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   A `schedule` is created for `user:alice`.
*   **Action**:
    1.  User `user:bob` attempts to delete `user:alice`'s schedule: `actions.deleteSchedule("user:bob", schedule.id)`.
    2.  Verify that `user:alice`'s schedule still exists.
*   **Result**:
    1.  The action rejects with an `Error` containing the message "Unauthorized".
    2.  Alice's schedule remains in the database, untouched.

## Action: addSection - adds a section to a schedule successfully

This test confirms that a section can be successfully added to a user's schedule.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   `sampleCourse1` is created, a `section` is created, and a `schedule` is created for `user:alice`.
*   **Action**:
    1.  Alice adds the `section` to her `schedule`: `actions.addSection("user:alice", schedule.id, section.id)`.
    2.  Retrieve the `schedule` from the database to verify the addition.
*   **Result**:
    1.  The `updatedSchedule` exists.
    2.  Its `sectionIds` array correctly contains `[section.id]`.

## Action: addSection - does not add duplicate sections to a schedule

This test ensures that adding the same section multiple times to a schedule does not create duplicates.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   `sampleCourse1` is created, a `section` is created, and a `schedule` is created for `user:alice`.
*   **Action**:
    1.  Alice adds the `section` to her `schedule` once: `actions.addSection("user:alice", schedule.id, section.id)`.
    2.  Alice attempts to add the *same* `section` to her `schedule` again: `actions.addSection("user:alice", schedule.id, section.id)`.
    3.  Retrieve the `schedule` from the database to verify its contents.
*   **Result**:
    1.  The `updatedSchedule` exists.
    2.  Its `sectionIds` array has a `length` of `1`, and still contains only `[section.id]`, confirming no duplicate was added.

## Action: addSection - throws error for non-existent schedule or unauthorized user

This test verifies that `addSection` correctly throws an error when the target schedule does not exist or the user is unauthorized.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   `sampleCourse1` is created, a `section` is created, and a `schedule` is created for `user:alice`.
*   **Action**:
    1.  Alice attempts to add a `section` to a non-existent schedule: `actions.addSection("user:alice", "NONEXISTENT_SCHED", section.id)`.
    2.  Bob (`user:bob`) attempts to add a `section` to Alice's `schedule`: `actions.addSection("user:bob", schedule.id, section.id)`.
*   **Result**:
    1.  Both attempts reject with an `Error` containing the message "Schedule not found or unauthorized".

## Action: removeSection - removes a section from a schedule successfully

This test confirms that a section can be successfully removed from a user's schedule.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   `sampleCourse1` is created. `section1` and `section2` are created. A `schedule` for `user:alice` is created, and both `section1` and `section2` are added to it.
*   **Action**:
    1.  Alice removes `section1` from her `schedule`: `actions.removeSection("user:alice", schedule.id, section1.id)`.
    2.  Retrieve the `schedule` from the database to verify the removal.
*   **Result**:
    1.  The `updatedSchedule` exists.
    2.  Its `sectionIds` array has a `length` of `1`, and correctly contains `[section2.id]`. `section1` was removed.

## Action: removeSection - handles removing non-existent section gracefully (no error, state unchanged)

This test ensures that attempting to remove a section that was never in the schedule does not cause an error and leaves the schedule state unchanged.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   `sampleCourse1` is created, `section1` is created, and a `schedule` for `user:alice` is created with `section1` added.
*   **Action**:
    1.  Alice attempts to remove a non-existent section from her `schedule`: `actions.removeSection("user:alice", schedule.id, "NONEXISTENT_SEC_ID")`.
    2.  Retrieve the `schedule` from the database to verify its contents.
*   **Result**:
    1.  The action completes without throwing an error.
    2.  The `updatedSchedule` exists, its `sectionIds` array has a `length` of `1`, and still contains `[section1.id]`. The schedule state is unchanged.

## Action: removeSection - handles non-existent schedule or unauthorized access gracefully (no error, state unchanged)

This test confirms that attempts to remove a section from a non-existent schedule or by an unauthorized user do not result in errors and do not change existing state.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   `sampleCourse1` is created, `section1` is created, and a `schedule` for `user:alice` is created with `section1` added.
*   **Action**:
    1.  Alice attempts to remove `section1` from a non-existent schedule: `actions.removeSection("user:alice", "NONEXISTENT_SCHED", section1.id)`.
    2.  Bob (`user:bob`) attempts to remove `section1` from Alice's `schedule`: `actions.removeSection("user:bob", schedule.id, section1.id)`.
    3.  Retrieve Alice's `schedule` from the database to verify its contents after these attempts.
*   **Result**:
    1.  Both actions complete without throwing an error.
    2.  The `updatedSchedule` exists, its `sectionIds` array has a `length` of `1`, and still contains `[section1.id]`. The schedule state is unchanged.

## Action: duplicateSchedule - duplicates a schedule successfully

This test ensures that a user can successfully duplicate their own schedule, resulting in a new, independent schedule with the same contents.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   `sampleCourse1` is created, `section1` is created, and an `originalSchedule` for `user:alice` is created with `section1` added to it.
*   **Action**:
    1.  Alice duplicates her `originalSchedule` as "Duplicated Schedule": `actions.duplicateSchedule("user:alice", originalSchedule.id, "Duplicated Schedule")`.
    2.  Retrieve both the original and duplicated schedules from the database.
*   **Result**:
    1.  A `duplicatedSchedule` is successfully created and returned.
    2.  The `duplicatedSchedule.id` is different from `originalSchedule.id`.
    3.  The `duplicatedSchedule.name` is "Duplicated Schedule" and `owner` is "user:alice".
    4.  The `duplicatedSchedule.sectionIds` (`[section1.id]`) matches the sections in the `originalSchedule`.
    5.  Both schedules exist independently in the database.

## Action: duplicateSchedule - throws error if source schedule not found

This test confirms that attempting to duplicate a non-existent schedule results in an error.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   No schedules have been created in the database.
*   **Action**:
    1.  Alice attempts to duplicate a schedule with a non-existent ID: `actions.duplicateSchedule("user:alice", "NONEXISTENT_SOURCE", "New Name")`.
*   **Result**:
    1.  The action rejects with an `Error` containing the message "Source schedule not found".

## Action: duplicateSchedule - throws error if unauthorized user

This test verifies that only the owner of a schedule can duplicate it; unauthorized attempts result in an error and no new schedule being created.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
    *   An `originalSchedule` is created for `user:alice`.
*   **Action**:
    1.  Bob (`user:bob`) attempts to duplicate Alice's `originalSchedule`: `actions.duplicateSchedule("user:bob", originalSchedule.id, "Bob's Copy")`.
    2.  Retrieve all schedules to ensure no new schedule was created for Bob.
*   **Result**:
    1.  The action rejects with an `Error` containing the message "Unauthorized".
    2.  Only `originalSchedule` remains in the database, with no new schedule created for Bob.

## Action: getAllSchedules - retrieves all schedules, including empty state

This test ensures the `getAllSchedules` action works correctly for both empty and populated states, including schedules owned by different users.

*   **Given**:
    *   A fresh in-memory database and an instance of `CourseScheduling_actions`.
*   **Action**:
    1.  Retrieve all schedules initially (empty state): `actions.getAllSchedules()`.
    2.  Alice creates a schedule: `actions.createSchedule("user:alice", "Alice's Schedule")`.
    3.  Bob creates a schedule: `actions.createSchedule("user:bob", "Bob's Schedule")`.
    4.  Retrieve all schedules again (populated state): `actions.getAllSchedules()`.
*   **Result**:
    1.  Initially, `schedules.length` is `0`.
    2.  After creating two schedules, `schedules.length` is `2`.
    3.  The retrieved schedules include both `schedule1` (Alice's) and `schedule2` (Bob's).

```text
ok | 23 passed | 0 failed (22s)
```