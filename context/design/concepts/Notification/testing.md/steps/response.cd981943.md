---
timestamp: 'Wed Oct 15 2025 20:38:44 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_203844.06aca8e2.md]]'
content_id: cd9819436eebbf9f45db3ce6ce4476a8f15c4a7f215e39a898d983d9cf2b9cc2
---

# response:

You are absolutely correct. The error `AssertionError: Values are not equal: Should return 3 notification IDs for Alice. (Actual: 4, Expected: 3)` in "Case 5" of the `Interesting Cases` test suite indicates a state leakage between your test steps.

When you use multiple `test.step` blocks within a single `Deno.test` block, the `concept` instance and the underlying database connection (`db`) are shared across all those steps. This means notifications created in an earlier step (e.g., "Case 1") for `USER_ALICE` would still exist when a later step (e.g., "Case 5") queries for `USER_ALICE`'s notifications.

**The Problem:**
In "Case 1", one notification is created for `USER_ALICE`.
In "Case 5", three more notifications are created for `USER_ALICE`.
So, when "Case 5" queries for Alice's notifications, it finds `1 (from Case 1) + 3 (from Case 5) = 4` notifications, instead of the expected 3 from within that specific step.

**The Solution:**
To ensure proper isolation and representation independence, each distinct test scenario should operate on a clean slate. The `testDb()` utility already provides a fresh database *for each top-level `Deno.test` block*. Therefore, the most robust solution is to separate each of your "Interesting Cases" `test.step` blocks into its own `Deno.test` block. This ensures that:

1. Each test runs against a completely fresh database instance.
2. There is no state leakage between your "interesting cases".
3. Each test is truly isolated and only depends on its own setup.

I will refactor the `NotificationConcept: Interesting Cases` `Deno.test` suite into five separate `Deno.test` blocks, one for each case, and rename them to be more descriptive. I'll also ensure that the `client.close()` is called at the end of *each* top-level `Deno.test` block.

Here is the updated `NotificationConcept.test.ts` file:
