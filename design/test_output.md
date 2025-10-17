## OUTPUT OF TEST CASES

    deno test -A
    Check file:///Users/notyahir/MIT/6.1040/resurfacer_4a/src/concepts/LibraryCache/LibraryCacheConcept.test.ts
    Check file:///Users/notyahir/MIT/6.1040/resurfacer_4a/src/concepts/LikertSurvey/LikertSurveyConcept.test.ts
    Check file:///Users/notyahir/MIT/6.1040/resurfacer_4a/src/concepts/PlatformLink/PlatformLinkConcept.test.ts
    Check file:///Users/notyahir/MIT/6.1040/resurfacer_4a/src/concepts/PlaylistHealth/PlaylistHealthConcept.test.ts
    Check file:///Users/notyahir/MIT/6.1040/resurfacer_4a/src/concepts/SwipeSessions/SwipeSessionsConcept.test.ts
    Check file:///Users/notyahir/MIT/6.1040/resurfacer_4a/src/concepts/TrackScoring/TrackScoringConcept.test.ts
    running 2 tests from ./src/concepts/LibraryCache/LibraryCacheConcept.test.ts
    LibraryCacheConcept: Principle Trace ...
    1. A user's library is ingested for the first time ... ok (307ms)
    2. The user's liked tracks can be queried ... ok (21ms)
    3. The user likes a new track, and a periodic sync occurs ... ok (172ms)
    4. The cache reflects the updated library ... ok (20ms)
    LibraryCacheConcept: Principle Trace ... ok (1s)
    LibraryCacheConcept: Actions and Queries ...
    sync() should populate all collections correctly on first run ... ok (402ms)
    sync() should replace existing user data ... ok (181ms)
    sync() should not affect other users' data ... ok (131ms)
    _getLiked() should return an ordered list of trackIds ... ok (162ms)
    _getLiked() should return an empty array for a user with no likes ... ok (18ms)
    _getPlaylist() should return an ordered list of trackIds ... ok (202ms)
    _getPlaylist() should return an empty array for a non-existent playlist ... ok (31ms)
    LibraryCacheConcept: Actions and Queries ... ok (1s)
    running 5 tests from ./src/concepts/LikertSurvey/LikertSurveyConcept.test.ts
    Principle: Author creates survey, respondent answers, author views results ... ok (904ms)
    Action: createSurvey requires scaleMin < scaleMax ... ok (525ms)
    Action: addQuestion requires an existing survey ... ok (520ms)
    Action: submitResponse requirements are enforced ... ok (872ms)
    Action: updateResponse successfully updates a response and enforces requirements ... ok (897ms)
    running 1 test from ./src/concepts/PlatformLink/PlatformLinkConcept.test.ts
    PlatformLinkConcept ...
    link action ...
        should link a new account for a new user successfully ... ok (143ms)
        should fail to link an unsupported platform ... ok (0ms)
        should fail if a link already exists for the user and platform ... ok (20ms)
    link action ... ok (166ms)
    refresh action ...
        should refresh an existing token successfully ... ok (141ms)
        should fail to refresh a non-existent link ... ok (20ms)
    refresh action ... ok (161ms)
    revoke action ...
        should revoke an existing link successfully ... ok (193ms)
        should fail to revoke a non-existent link ... ok (20ms)
    revoke action ... ok (213ms)
    can action ...
        should return true for a valid link with the right capability ... ok (57ms)
        should return false if the capability does not exist ... ok (36ms)
        should return false if the link token is expired ... ok (53ms)
        should return false for a non-existent link ... ok (18ms)
    can action ... ok (257ms)
    Principle Trace: Full lifecycle of a platform link ... ok (351ms)
    PlatformLinkConcept ... ok (1s)
    running 1 test from ./src/concepts/PlaylistHealth/PlaylistHealthConcept.test.ts
    PlaylistHealthConcept ...
    snapshot action ...
        should create a snapshot for a valid playlist ... ok (57ms)
        should fail if required parameters are missing or empty ... ok (0ms)
    snapshot action ... ok (58ms)
    analyze action ...
        should generate a report for an existing snapshot ... ok (73ms)
        should fail if the snapshot does not exist ... ok (20ms)
    analyze action ... ok (114ms)
    getReport action ...
        should retrieve an existing report ... ok (18ms)
        should fail if the report does not exist ... ok (19ms)
    getReport action ... ok (96ms)
    fulfills the principle ... ok (76ms)
    PlaylistHealthConcept ... ok (993ms)
    running 1 test from ./src/concepts/SwipeSessions/SwipeSessionsConcept.test.ts
    SwipeSessionsConcept ...
    start action ...
        should start a session successfully ... ok (56ms)
        should start a session with a truncated queue size ... ok (40ms)
        should fail if userId is empty ... ok (0ms)
        should fail if size is larger than queue length ... ok (0ms)
    start action ... ok (99ms)
    next action ...
        should return the first track and increment index ... ok (58ms)
        should return the second track and increment index ... ok (57ms)
        should return -1 when the queue is finished ... ok (36ms)
        should fail for a non-existent session ... ok (19ms)
    next action ... ok (192ms)
    decide* actions ...
        should fail to decide if next() has not been called ... ok (19ms)
        should fail to decide if trackId does not match current track ... ok (17ms)
        should record a 'keep' decision ... ok (71ms)
        should record a 'snooze' decision ... ok (56ms)
        should record an 'add to playlist' decision ... ok (57ms)
        should record a 'create playlist' decision ... ok (57ms)
    decide* actions ... ok (468ms)
    end action ...
        should end a session and return true ... ok (37ms)
        should return false when ending a non-existent session ... ok (17ms)
        should return false when ending an already ended session ... ok (56ms)
    end action ... ok (133ms)
    SwipeSessionsConcept ... ok (1s)
    running 4 tests from ./src/concepts/TrackScoring/TrackScoringConcept.test.ts
    TrackScoringConcept - Principle Trace ... ok (1s)
    TrackScoringConcept - Action: updateWeights ... ok (666ms)
    TrackScoringConcept - Action: updateStats ... ok (683ms)
    TrackScoringConcept - Action: keep and snooze ... ok (674ms)

    ok | 14 passed (58 steps) | 0 failed (14s)
