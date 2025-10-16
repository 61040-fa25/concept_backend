---
timestamp: 'Wed Oct 15 2025 20:34:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_203431.9ae9beb2.md]]'
content_id: a0968e1490fa3d62965c6864d6381cdbce482649b76c95d0e9d56dce3c4d13f2
---

# error: Warning `allow-hrtime` and `deny-hrtime` have been removed in Deno 2, as high resolution time is now always allowed

Check file:///C:/Users/betwo/6.104/piggy\_bankApp/src/concepts/Notification/NotificationConcept.test.ts\
TS2339 \[ERROR]: Property 'sleep' does not exist on type 'typeof Deno'.
await Deno.sleep(10); // Using Deno.sleep for clean timer management
\~~~~~
at file:///C:/Users/betwo/6.104/piggy\_bankApp/src/concepts/Notification/NotificationConcept.test.ts:189:16

TS2339 \[ERROR]: Property 'sleep' does not exist on type 'typeof Deno'.
await Deno.sleep(10); // Using Deno.sleep for clean timer management
\~~~~~
await Deno.sleep(50); // Small delay to allow MongoDB client to clean up
\~~~~~
at file:///C:/Users/betwo/6.104/piggy\_bankApp/src/concepts/Notification/NotificationConcept.test.ts:220:14
Found 3 errors.

error: Type checking failed.

info: The program failed type-checking, but it still might work correctly.
hint: Re-run with --no-check to skip type-checking
