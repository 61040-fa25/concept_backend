---
timestamp: 'Fri Oct 31 2025 08:19:19 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251031_081919.88bd8444.md]]'
content_id: 753098c735957c2a8b2b462642af7b35a854fb5922d85179bee9e8ce6d093b0c
---

# solution:

The problem is that the tests are non-deterministic because the concept's logic depends on the real-world time (`new Date()`) when the tests are executed. The solution is to refactor the concept to accept an optional `currentTime` parameter in its time-sensitive actions. This allows the tests to pass in a fixed, predictable "mock" time, making them fully deterministic and reliable.
