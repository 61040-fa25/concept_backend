---
timestamp: 'Wed Oct 15 2025 20:29:48 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_202948.df1544cb.md]]'
content_id: 39305475fa22ce2da0c42c819fe3b7ad1f5267e0c8d5c8bd39c88e15ca145610
---

# error: running 1 test from ./src/concepts/Notification/NotificationConcept.test.ts

NotificationConcept: Interesting Cases ...

1. createNotification: should successfully create and verify a single notification ...
   \------- output -------

\--- Case 1: createNotification success ---
Effect: Notification created with ID: 0199ea6a-7a39-7d8e-8465-71f6b11ff6c3
Confirmation: Notification successfully created and verified via query.
\----- output end -----

1. createNotification: should successfully create and verify a single notification ... ok (73ms)
2. deleteNotification: should successfully delete an existing notification ...
   \------- output -------

\--- Case 2: deleteNotification success ---
Setup: Created notification 0199ea6a-7a81-78c0-b891-d786522a0bb9 for Bob.
Action: Deleting notification 0199ea6a-7a81-78c0-b891-d786522a0bb9 for user user:Bob.
Effect: Notification 0199ea6a-7a81-78c0-b891-d786522a0bb9 deleted.
\----- output end -----
2\. deleteNotification: should successfully delete an existing notification ... ok (87ms)
3\. deleteNotification: should handle failure cases (non-existent, wrong user, already deleted) ...
\------- output -------

\--- Case 3: deleteNotification failure scenarios ---
Action: Attempting to delete non-existent notification 0199ea6a-7ada-766c-b4e3-ce76ce01451a for user:Alice.
Requirement failure: Notification with ID '0199ea6a-7ada-766c-b4e3-ce76ce01451a' not found.
Setup: Created notification 0199ea6a-7b05-7ada-aff8-dfff83d25db2 for user:Bob.
Action: Attempting to delete 0199ea6a-7b05-7ada-aff8-dfff83d25db2 (Bob's) by user:Alice.
Requirement failure: Notification with ID '0199ea6a-7b05-7ada-aff8-dfff83d25db2' does not belong to user 'user:Alice'.
Confirmation: Bob's notification was not deleted.
Setup: Created temporary notification 0199ea6a-7b56-7537-a442-313eba88bc9d for user:Alice.
Effect: Notification 0199ea6a-7b56-7537-a442-313eba88bc9d deleted once.
Action: Attempting to delete 0199ea6a-7b56-7537-a442-313eba88bc9d a second time.
Requirement failure: Notification with ID '0199ea6a-7b56-7537-a442-313eba88bc9d' not found.
\----- output end -----
3\. deleteNotification: should handle failure cases (non-existent, wrong user, already deleted) ... ok (205ms)
4\. \_getAllNotifications: should return an empty array for a user with no notifications ...
\------- output -------

\--- Case 4: \_getAllNotifications for empty user ---
Action: Getting notifications for user 0199ea6a-7ba7-7702-b6d4-bcfc594d2e33 with no existing notifications.
Confirmation: Empty array returned for user with no notifications.
\----- output end -----
4\. \_getAllNotifications: should return an empty array for a user with no notifications ... ok (20ms)
5\. \_getAllNotifications: should return all notifications for a user, sorted by creation date ...
\------- output -------

\--- Case 5: \_getAllNotifications with multiple sorted results ---
\----- output end -----
5\. \_getAllNotifications: should return all notifications for a user, sorted by creation date ... FAILED (27ms)
NotificationConcept: Interesting Cases ... FAILED (1s)

ERRORS

NotificationConcept: Interesting Cases ... 5. \_getAllNotifications: should return all notifications for a user, sorted by creation date => ./src/concepts/Notification/NotificationConcept.test.ts:185:14
error: TypeError: Deno.sleep is not a function
await Deno.sleep(10); // Using Deno.sleep for clean timer management
^
at file:///C:/Users/betwo/6.104/piggy\_bankApp/src/concepts/Notification/NotificationConcept.test.ts:189:16
at eventLoopTick (ext:core/01\_core.js:179:7)
at async innerWrapped (ext:cli/40\_test.js:181:5)
at async exitSanitizer (ext:cli/40\_test.js:97:27)
at async Object.outerWrapped \[as fn] (ext:cli/40\_test.js:124:14)
at async TestContext.step (ext:cli/40\_test.js:511:22)
at async file:///C:/Users/betwo/6.104/piggy\_bankApp/src/concepts/Notification/NotificationConcept.test.ts:185:3

NotificationConcept: Interesting Cases => ./src/concepts/Notification/NotificationConcept.test.ts:97:6
error: TypeError: Deno.sleep is not a function
await Deno.sleep(50); // Small delay to allow MongoDB client to clean up
^
at file:///C:/Users/betwo/6.104/piggy\_bankApp/src/concepts/Notification/NotificationConcept.test.ts:220:14

FAILURES

NotificationConcept: Interesting Cases ... 5. \_getAllNotifications: should return all notifications for a user, sorted by creation date => ./src/concepts/Notification/NotificationConcept.test.ts:185:14
NotificationConcept: Interesting Cases => ./src/concepts/Notification/NotificationConcept.test.ts:97:6

FAILED | 0 passed (4 steps) | 1 failed (1 step) (1s)

error: Test failed
