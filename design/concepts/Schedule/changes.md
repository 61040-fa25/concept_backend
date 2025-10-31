### Summary of Changes to the Schedule Concept

The `Schedule` concept was refined from a simple, read-only reflection of an external calendar into a more robust **hybrid availability model**. The initial version contained a logical conflict: its "read-only" principle was contradicted by an action to create manual data (`blockTime`), and its sync action was destructive to that manual data.

The following changes resolve these issues, resulting in a safer, more flexible, and user-friendly design.

---

#### 1. Added `origin` Field to Distinguish Data Sources

*   **Change:** A new field, `origin: (EXTERNAL, MANUAL)`, was added to each `BusySlot`.
*   **Reasoning:** This is the core architectural change. It distinguishes between data synced from an external calendar (`EXTERNAL`) and data created by the user within the app (`MANUAL`). This allows the system to apply different rules and behaviors based on where the data came from.

#### 2. Made `syncCalendar` Action Non-Destructive

*   **Change:** The `syncCalendar` action was modified to only delete and replace `BusySlots` where `origin` is `EXTERNAL`.
*   **Reasoning:** The original "replace all" behavior was destructive, as it would have deleted any manually created blocks. The new approach preserves user-created data, aligning with the expectation that a sync should not erase manually entered information.

#### 3. Introduced Full Management for Manual Blocks

*   **Change:** Added `updateSlot` and `deleteSlot` actions, which can only operate on slots where `origin` is `MANUAL`.
*   **Reasoning:** To give users full control over the data they create (Create, Read, Update, Delete). The `requires slot.origin is MANUAL` clause acts as a critical safety guardrail, preventing users from modifying events that should only be managed by the external calendar sync.

#### 4. Added `description` Field for Context

*   **Change:** Added a `description: String` field to the `BusySlot` state.
*   **Reasoning:** A time block without context has limited value. This field stores the event title from an external calendar or a user-provided description for a manual block (e.g., "Lunch"). It provides essential context, making the schedule understandable and truly useful.