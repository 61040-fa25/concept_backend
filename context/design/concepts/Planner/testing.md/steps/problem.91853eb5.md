---
timestamp: 'Fri Oct 31 2025 08:24:27 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251031_082427.deeb189f.md]]'
content_id: 91853eb5b4018a6bdd63bed0c6859c964b9756f70cf34db3a93f32f92fc56035
---

# problem:

The current implementation of `PlannerConcept` and its tests rely on `new Date()` to determine the current time (`now`). This makes the tests non-deterministic and fragile. A test's success or failure depends on the time of day it is executed. For example, the `planDay` action has less available time to schedule tasks later in the day, which can cause assertions to fail unpredictably.
