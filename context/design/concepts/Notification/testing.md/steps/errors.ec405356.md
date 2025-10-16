---
timestamp: 'Tue Oct 14 2025 23:26:30 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251014_232630.e5ca16d0.md]]'
content_id: ec405356fac08b576ced6d71784da12fdad87c25010a7fe791daf66bcff57d1c
---

# errors:

PS C:\deno test -A src/concepts/Notification/NotificationConcept.test.ts
Check file:///C:/Users/betwo/6.104/piggy\_bankApp/src/concepts/Notification/NotificationConcept.test.ts
TS2304 \[ERROR]: Cannot find name 'Notification'.
assertExists((result as { notification: Notification }).notification);
\~~~~~~~~~~~~
at file:///C:/Users/betwo/6.104/piggy\_bankApp/src/concepts/Notification/NotificationConcept.test.ts:27:45

TS2304 \[ERROR]: Cannot find name 'Notification'.
const newNotificationId = (result as { notification: Notification }).notification;
\~~~~~~~~~~~~
at file:///C:/Users/betwo/6.104/piggy\_bankApp/src/concepts/Notification/NotificationConcept.test.ts:28:58

TS18046 \[ERROR]: 'e' is of type 'unknown'.
return { error: `Failed to create notification: ${e.message}` };
^
at file:///C:/Users/betwo/6.104/piggy\_bankApp/src/concepts/Notification/NotificationConcept.ts:73:57

TS18046 \[ERROR]: 'e' is of type 'unknown'.
return { error: `Failed to delete notification: ${e.message}` };
^
at file:///C:/Users/betwo/6.104/piggy\_bankApp/src/concepts/Notification/NotificationConcept.ts:105:57

Found 4 errors.

error: Type checking failed.
