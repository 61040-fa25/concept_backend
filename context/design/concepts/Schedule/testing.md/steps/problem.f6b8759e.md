---
timestamp: 'Thu Oct 30 2025 22:51:46 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251030_225146.1233cfe3.md]]'
content_id: f6b8759e98eeead35e54b311d743cd497f8f53165213464c04d5ff2d16aa96ff
---

# problem:

The test `Interesting Scenario: Attempt to modify external slots` is failing with an `AssertionError`. The test expected the error message `"Cannot update a slot with an external origin."` but instead received `"Start time must be before end time."`.

This indicates that the `updateSlot` action is failing at the initial time validation check, before it even gets to the logic that prevents modification of `EXTERNAL` slots.

Looking at the failing test code:

```typescript
const updateResult = await schedule.updateSlot({
  slotId: externalSlotId,
  newStartTime: new Date(),
  newEndTime: new Date(),
  newDescription: "Trying to change",
});
```

The `newStartTime` and `newEndTime` are being created at almost the exact same millisecond. The `updateSlot` method's first check is `if (newStartTime >= newEndTime)`. This condition is evaluating to `true`, causing the method to return the time validation error prematurely. The test is not correctly testing the intended requirement (preventing updates to external slots) because its inputs are invalid for a different reason.
