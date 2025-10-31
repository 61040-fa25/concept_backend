---
timestamp: 'Fri Oct 31 2025 08:24:27 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251031_082427.deeb189f.md]]'
content_id: bd7176845b5e1f1d58fb304fa45e9bca355430669b91de03abc71c0f57892ca5
---

# solution:

We will refactor `PlannerConcept` to use dependency injection for its time source.

1. The `PlannerConcept` constructor will be updated to accept an optional `timeProvider` function. If not provided, it will default to `() => new Date()`, preserving the original behavior for production use.
2. Inside the concept's methods, all calls to `new Date()` will be replaced with calls to `this.timeProvider()`.
3. The test file, `PlannerConcept.test.ts`, will be updated to instantiate the concept with a mock `timeProvider` that returns a fixed, constant date. This ensures that every test run executes against the exact same "now," making the outcomes predictable and reliable regardless of when they are run.
