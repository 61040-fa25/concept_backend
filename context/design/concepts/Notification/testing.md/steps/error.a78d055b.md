---
timestamp: 'Wed Oct 15 2025 20:38:12 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_203812.f9505207.md]]'
content_id: a78d055badd07dc612e6be4fcbb578be07a84186e6c5afbc2851e49201cde082
---

# error: ONLY FOR Interesting cases test case running 1 test from ./src/concepts/Notification/NotificationConcept.test.ts

NotificationConcept: Interesting Cases ...

1. createNotification: should successfully create and verify a single notification ...
   \------- output -------

\--- Case 1: createNotification success ---
Effect: Notification created with ID: 0199ea71-f560-7e1e-b30d-e038e515273f
Confirmation: Notification successfully created and verified via query.
\----- output end -----

1. createNotification: should successfully create and verify a single notification ... ok (68ms)
2. deleteNotification: should successfully delete an existing notification ...
   \------- output -------

\--- Case 2: deleteNotification success ---
Setup: Created notification 0199ea71-f5a4-7c32-9a25-95cced27f5f6 for Bob.
Action: Deleting notification 0199ea71-f5a4-7c32-9a25-95cced27f5f6 for user user:Bob.
Effect: Notification 0199ea71-f5a4-7c32-9a25-95cced27f5f6 deleted.
\----- output end -----
2\. deleteNotification: should successfully delete an existing notification ... ok (74ms)
3\. deleteNotification: should handle failure cases (non-existent, wrong user, already deleted) ...
\------- output -------

\--- Case 3: deleteNotification failure scenarios ---
Action: Attempting to delete non-existent notification 0199ea71-f5ef-7b80-93ae-9d902138f286 for user:Alice.
Requirement failure: Notification with ID '0199ea71-f5ef-7b80-93ae-9d902138f286' not found.
Setup: Created notification 0199ea71-f612-7633-994c-09fd38b6230f for user:Bob.
Action: Attempting to delete 0199ea71-f612-7633-994c-09fd38b6230f (Bob's) by user:Alice.
Requirement failure: Notification with ID '0199ea71-f612-7633-994c-09fd38b6230f' does not belong to user 'user:Alice'.
Confirmation: Bob's notification was not deleted.
Setup: Created temporary notification 0199ea71-f663-7232-b819-3722bc5556cc for user:Alice.
Effect: Notification 0199ea71-f663-7232-b819-3722bc5556cc deleted once.
Action: Attempting to delete 0199ea71-f663-7232-b819-3722bc5556cc a second time.
Requirement failure: Notification with ID '0199ea71-f663-7232-b819-3722bc5556cc' not found.
\----- output end -----
3\. deleteNotification: should handle failure cases (non-existent, wrong user, already deleted) ... ok (195ms)
4\. \_getAllNotifications: should return an empty array for a user with no notifications ...
\------- output -------

\--- Case 4: \_getAllNotifications for empty user ---
Action: Getting notifications for user 0199ea71-f6b2-734b-b037-adefccb1454e with no existing notifications.
Confirmation: Empty array returned for user with no notifications.
\----- output end -----
4\. \_getAllNotifications: should return an empty array for a user with no notifications ... ok (18ms)
5\. \_getAllNotifications: should return all notifications for a user, sorted by creation date ...
\------- output -------

\--- Case 5: \_getAllNotifications with multiple sorted results ---
Setup: Created N1 (0199ea71-f6c5-70a5-b634-1c0612276aae), N2 (0199ea71-f6e5-7249-9c1a-8d74af4f0895), N3 (0199ea71-f703-79ab-9b3d-71d6be0cce5a) for Alice.
Setup: Created a notification for Bob for isolation verification.
Action: Getting all notifications for user user:Alice.
\----- output end -----
5\. \_getAllNotifications: should return all notifications for a user, sorted by creation date ... FAILED (129ms)
NotificationConcept: Interesting Cases ... FAILED (due to 1 failed step) (1s)

ERRORS

NotificationConcept: Interesting Cases ... 5. \_getAllNotifications: should return all notifications for a user, sorted by creation date => ./src/concepts/Notification/NotificationConcept.test.ts:185:14
error: AssertionError: Values are not equal: Should return 3 notification IDs for Alice.

```
[Diff] Actual / Expected
```

* 4

- 3

throw new AssertionError(message);
^
at assertEquals (https://jsr.io/@std/assert/1.0.7/equals.ts:51:9)
at file:///C:/Users/betwo/6.104/piggy\_bankApp/src/concepts/Notification/NotificationConcept.test.ts:207:5
at eventLoopTick (ext:core/01\_core.js:179:7)
at async innerWrapped (ext:cli/40\_test.js:181:5)
at async exitSanitizer (ext:cli/40\_test.js:97:27)
at async Object.outerWrapped \[as fn] (ext:cli/40\_test.js:124:14)
at async TestContext.step (ext:cli/40\_test.js:511:22)
at async file:///C:/Users/betwo/6.104/piggy\_bankApp/src/concepts/Notification/NotificationConcept.test.ts:185:3

FAILURES

NotificationConcept: Interesting Cases ... 5. \_getAllNotifications: should return all notifications for a user, sorted by creation date => ./src/concepts/Notification/NotificationConcept.test.ts:185:14

FAILED | 0 passed (4 steps) | 1 failed (1 step) (1s)
