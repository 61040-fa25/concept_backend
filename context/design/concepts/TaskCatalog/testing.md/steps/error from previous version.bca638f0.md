---
timestamp: 'Tue Oct 14 2025 22:38:50 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_223850.cdbe6a9f.md]]'
content_id: bca638f0bd9a5ebe4cab517bfe4ee1271fb0b3a04667711e691b713cceac6785
---

# error from previous version:

```

➜  concept_backend git:(main) ✗ deno test src/concepts/TaskCatalog/TaskCatalog.test.ts 
Check file:///Users/xiaokeai/Desktop/concept_backend/src/concepts/TaskCatalog/TaskCatalog.test.ts
TS2339 [ERROR]: Property 'error' does not exist on type '{ taskTable: TaskDocument[]; } | { error: string; }'.
  Property 'error' does not exist on type '{ taskTable: TaskDocument[]; }'.
      assertEquals(result.error, `No tasks found for owner: ${userCharlie}`);
                          ~~~~~
    at file:///Users/xiaokeai/Desktop/concept_backend/src/concepts/TaskCatalog/TaskCatalog.test.ts:196:27

TS18046 [ERROR]: 'e' is of type 'unknown'.
      return { error: `Failed to create task: ${e.message}` };
                                                ^
    at file:///Users/xiaokeai/Desktop/concept_backend/src/concepts/TaskCatalog/TaskCatalog.ts:140:49

TS18046 [ERROR]: 'e' is of type 'unknown'.
      return { error: `Failed to assign schedule: ${e.message}` };
                                                    ^
    at file:///Users/xiaokeai/Desktop/concept_backend/src/concepts/TaskCatalog/TaskCatalog.ts:181:53

TS18046 [ERROR]: 'e' is of type 'unknown'.
      return { error: `Failed to delete schedule: ${e.message}` };
                                                    ^
    at file:///Users/xiaokeai/Desktop/concept_backend/src/concepts/TaskCatalog/TaskCatalog.ts:223:53

TS18046 [ERROR]: 'e' is of type 'unknown'.
      return { error: `Failed to update task ${attribute}: ${e.message}` };
                                                             ^
    at file:///Users/xiaokeai/Desktop/concept_backend/src/concepts/TaskCatalog/TaskCatalog.ts:251:62

TS18046 [ERROR]: 'e' is of type 'unknown'.
      return { error: `Failed to add pre-dependence: ${e.message}` };
                                                       ^
    at file:///Users/xiaokeai/Desktop/concept_backend/src/concepts/TaskCatalog/TaskCatalog.ts:443:56

TS18046 [ERROR]: 'e' is of type 'unknown'.
      return { error: `Failed to remove pre-dependence: ${e.message}` };
                                                          ^
    at file:///Users/xiaokeai/Desktop/concept_backend/src/concepts/TaskCatalog/TaskCatalog.ts:491:59

TS18046 [ERROR]: 'e' is of type 'unknown'.
      return { error: `Failed to delete task: ${e.message}` };
                                                ^
    at file:///Users/xiaokeai/Desktop/concept_backend/src/concepts/TaskCatalog/TaskCatalog.ts:529:49

Found 8 errors.

error: Type checking failed.

  info: The program failed type-checking, but it still might work correctly.
  hint: Re-run with --no-check to skip type-checking.
```
