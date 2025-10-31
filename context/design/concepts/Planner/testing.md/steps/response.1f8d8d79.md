---
timestamp: 'Fri Oct 31 2025 08:24:27 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251031_082427.deeb189f.md]]'
content_id: 1f8d8d797b20723251bd1aeacb1b6af67eec76dbb01eb72ab70e5a4098dd1759
---

# response:

Of course. You've hit upon a critical insight into testing software that deals with time. **The tests are fragile and non-deterministic because they depend on the actual time they are run.**

A test for `planDay` that passes at 10 AM might fail at 11 PM because there is no time left in the day to schedule anything. This is unacceptable for a reliable test suite.

The solution is to remove the dependency on the real-world `new Date()` from the tests by using **Dependency Injection**. We will modify the `PlannerConcept` to accept an optional "time provider" function. In production, it will default to using the real time. In our tests, we will provide a function that returns a fixed, predictable time, making our tests 100% deterministic.
