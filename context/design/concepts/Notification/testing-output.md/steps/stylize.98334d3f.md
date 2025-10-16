---
timestamp: 'Wed Oct 15 2025 20:15:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_201545.c004f03f.md]]'
content_id: 98334d3fb050789cd6ba5746a38de144e84b372eea30933be596ba0d1ad78489
---

# stylize: running 1 test from ./src/concepts/Notification/NotificationConcept.test.ts

NotificationConcept: Interesting Cases ...

1. createNotification: should successfully create and verify a single notification ...
   \------- output -------

\--- Case 1: createNotification success ---
Effect: Notification created with ID: 0199ea5e-316d-7bf0-bc32-4bc438008017
Confirmation: Notification successfully created and verified via query.
\----- output end -----

1. createNotification: should successfully create and verify a single notification ... ok (135ms)
2. deleteNotification: should successfully delete an existing notification ...
   \------- output -------

\--- Case 2: deleteNotification success ---
Setup: Created notification 0199ea5e-31f3-7c4e-a308-422cf4c3afb4 for Bob.
Action: Deleting notification 0199ea5e-31f3-7c4e-a308-422cf4c3afb4 for user user:Bob.
Effect: Notification 0199ea5e-31f3-7c4e-a308-422cf4c3afb4 deleted.
\----- output end -----
2\. deleteNotification: should successfully delete an existing notification ... ok (107ms)
3\. deleteNotification: should handle failure cases (non-existent, wrong user, already deleted) ...
\------- output -------

\--- Case 3: deleteNotification failure scenarios ---
Action: Attempting to delete non-existent notification 0199ea5e-325f-7e12-a249-5eaa4a784775 for user:Alice.
Requirement failure: Notification with ID '0199ea5e-325f-7e12-a249-5eaa4a784775' not found.
Setup: Created notification 0199ea5e-3285-797c-a4f1-d8a749f39fe4 for user:Bob.
Action: Attempting to delete 0199ea5e-3285-797c-a4f1-d8a749f39fe4 (Bob's) by user:Alice.
Requirement failure: Notification with ID '0199ea5e-3285-797c-a4f1-d8a749f39fe4' does not belong to user 'user:Alice'.
Confirmation: Bob's notification was not deleted.
Setup: Created temporary notification 0199ea5e-3330-7e00-a818-d5b87b85dbf0 for user:Alice.
Effect: Notification 0199ea5e-3330-7e00-a818-d5b87b85dbf0 deleted once.
Action: Attempting to delete 0199ea5e-3330-7e00-a818-d5b87b85dbf0 a second time.
Requirement failure: Notification with ID '0199ea5e-3330-7e00-a818-d5b87b85dbf0' not found.
\----- output end -----
3\. deleteNotification: should handle failure cases (non-existent, wrong user, already deleted) ... ok (399ms)
4\. \_getAllNotifications: should return an empty array for a user with no notifications ...
\------- output -------

\--- Case 4: \_getAllNotifications for empty user ---
Action: Getting notifications for user 0199ea5e-33ee-78d0-a149-e19c1c36f2ba with no existing notifications.
Confirmation: Empty array returned for user with no notifications.
\----- output end -----
4\. \_getAllNotifications: should return an empty array for a user with no notifications ... ok (17ms)
NotificationConcept: Interesting Cases ... FAILED (1s)

ERRORS

NotificationConcept: Interesting Cases => ./src/concepts/Notification/NotificationConcept.test.ts:98:6
error: Leaks detected:

* 4 async calls to op\_read were started in this test, but never completed.
* 6 timers were started in this test, but never completed. This is often caused by not calling `clearTimeout`.
* A TLS connection was opened/accepted during the test, but not closed during the test. Close the TLS connection by calling `tlsConn.close()`.
  To get more details where leaks occurred, run again with the --trace-leaks flag.

FAILURES

NotificationConcept: Interesting Cases => ./src/concepts/Notification/NotificationConcept.test.ts:98:6

FAILED | 0 passed (4 steps) | 1 failed (1s)

error: Test failed
