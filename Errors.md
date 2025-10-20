You are an expert TypeScript developer and testing engineer.

I have a test file `courseSchedulingConcept.test.ts` which is failing in two specific ways when run with Deno:

1. **Workflow test failure**:
    

`assertEquals(actualCourse, expectedCourse);`

fails because `actualCourse` returned from the database contains an extra `_id` field (e.g., `"_id": new ObjectId(...)`) which is not present in `expectedCourse`.

2. **duplicateSchedule test failure**:
    

`assertEquals(actualScheduleIds, expectedScheduleIds);`

fails because the action returns an empty array (`[]`) instead of the expected array of schedule IDs.

**Tasks:**

1. Modify the workflow test so that it ignores `_id` when comparing objects. This could be done by:
    
    - Using `assertObjectMatch` instead of `assertEquals`, or
        
    - Comparing only the relevant fields (`id`, `department`, `title`) and ignoring `_id`.
        
2. Modify the duplicateSchedule test so that it passes by ensuring the stubbed database contains the data needed for duplication, and that the action returns the correct schedule IDs. This could involve:
    
    - Pre-populating the stub/mock database with a schedule before calling `duplicateSchedule`.
        
    - Ensuring the stub returns the duplicated schedule IDs correctly.
        
3. Keep the **same style, structure, and assertion conventions** as `LikertSurveyConcept.test.ts` (Deno `std/testing/asserts.ts`, isolated `Deno.test` blocks, mocks and stubs for database calls).
    
4. The output should be a ready-to-run `courseSchedulingConcept.test.ts` with these fixes applied.
    

Make sure that the tests remain type-safe with the existing TypeScript interfaces (`Course`, `Section`, `CourseSchedulingState`) and that they remain independent and idempotent.