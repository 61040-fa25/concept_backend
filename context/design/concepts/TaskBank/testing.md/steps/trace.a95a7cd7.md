---
timestamp: 'Sun Oct 19 2025 14:25:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_142549.bea30322.md]]'
content_id: a95a7cd70e24decb151dcafde20acd0f7b5c8ee6a9ac5eee03147c11dead0b47
---

# trace:

Demonstrating the principle: "users can enter tasks and denote their relationship to other existing tasks."

1. **User Alice creates three tasks:** "Design UI", "Implement Backend", "Write Tests".
2. **Alice adds dependencies:**
   * "Design UI" BLOCKS "Implement Backend" (UI must be done before backend starts)
   * "Implement Backend" REQUIRES "Design UI" (Backend needs UI design to be complete first). Note: This dependency is explicitly added and will coexist with the `BLOCKS` dependency, both contributing to the rule that "Design UI must precede Implement Backend".
   * "Implement Backend" BLOCKS "Write Tests" (Backend must be stable before tests are written)
3. **Alice queries the order:**
   * Can "Implement Backend" be before "Design UI"? (Expected: False, because "Implement Backend" REQUIRES "Design UI", and "Design UI" BLOCKS "Implement Backend")
   * Can "Design UI" be before "Implement Backend"? (Expected: True, as "Design UI" BLOCKS "Implement Backend" and "Implement Backend" REQUIRES "Design UI" both imply this order)
   * Can "Write Tests" be before "Implement Backend"? (Expected: False, because "Implement Backend" BLOCKS "Write Tests")
   * Can "Implement Backend" be before "Write Tests"? (Expected: True, as "Implement Backend" BLOCKS "Write Tests")
   * Can "Design UI" be before "Write Tests"? (Expected: True, transitively: "Design UI" -> "Implement Backend" -> "Write Tests")
   * Can "Write Tests" be before "Design UI"? (Expected: False, transitively, for the same reason)
