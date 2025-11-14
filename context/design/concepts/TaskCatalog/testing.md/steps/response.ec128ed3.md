---
timestamp: 'Tue Oct 14 2025 22:49:08 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_224908.635da888.md]]'
content_id: ec128ed3e7a4ee33172df0fb4bd139ea3de19778f31725dbf0a73f7f5d0c852d
---

# response:

The `TS2304: Cannot find name 'principleUser'` error occurs because `principleUser` was declared inside a specific `Deno.test.step` block, making it local to that block. However, Deno's test runner evaluates all `t.step` definitions (and their associated closures) before executing them. To make `principleUser` accessible within the "Principle Trace" step, it needs to be declared in the broader scope of the `Deno.test` callback, alongside `userAlice`, `userBob`, and `userCharlie`.

I will provide the corrected `src/TaskCatalog/TaskCatalog.ts` (which already had the correct error handling) and the corrected `src/TaskCatalog/TaskCatalog.test.ts` with the `principleUser` declaration moved to the correct scope.

***
