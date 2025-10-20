running 5 tests from ./src/mirrorMotionConcepts/Feedback.test.ts
Principle: After a video is broken into different poses, we can generate feedback on different body parts ... ok (594ms)
Action: analyze - Creates feedback successfully with valid and non-empty inputs ... ok (496ms)
Action: analyze - Generates specific feedback for empty pose data (reference or practice) ... ok (527ms)
Action: getFeedback - Successfully retrieves details for an existing feedback record ... ok (510ms)
Action: getFeedback - Fails gracefully when retrieving a non-existent feedback record ... ok (473ms)

running 7 tests from ./src/mirrorMotionConcepts/ManageVideo.test.ts
Principle: After uploading a video, it can be retrieved for analysis, syncing, or feedback ... ok (3s)
Action: retrieve - Successfully retrieves video by owner ... ok (2s)
Action: retrieve - Fails to retrieve video by non-owner ... ok (2s)
Action: retrieve - Fails to retrieve non-existent video ... ok (533ms)
Action: delete - Successfully deletes video by owner ... ok (2s)
Action: delete - Fails to delete video by non-owner ... ok (2s)
Action: delete - Fails to delete non-existent video ... ok (413ms)

running 4 tests from ./src/mirrorMotionConcepts/User.test.ts
Principle: After registering with a username and password, the user can log in to their account ... ok (481ms)
Action: register - Requires username not already taken ... ok (524ms)
Action: login - Requires username exists ... ok (567ms)
Action: login - Requires password matches ... ok (484ms)