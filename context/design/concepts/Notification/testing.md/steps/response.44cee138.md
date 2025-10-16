---
timestamp: 'Tue Oct 14 2025 23:44:26 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251014_234426.96c9a6a0.md]]'
content_id: 44cee138e1484fa12758b0547dfa9ed2774f6d9b93fe90131387e2a17a07dfe3
---

# response:

You are absolutely right to emphasize representation independence in tests! Referencing internal implementation details like `Notification` as the document interface from the test file breaks this principle.

The solution is to distinguish between:

1. The **ID type** for a notification (what actions return and queries take). This *is* part of the concept's public API.
2. The **interface for the document stored in MongoDB** (an internal implementation detail).

To achieve this, I've made the following changes:

1. **In `NotificationConcept.ts`**:
   * I've explicitly defined `export type Notification = ID;`. This `Notification` type now represents the *ID* of a notification instance, making it the public-facing type for action arguments and return values. This is what the concept specification meant by `(notification: Notification)`.
   * The internal interface for the MongoDB document is now named `NotificationDocument`. This clearly indicates its purpose and prevents confusion with the `Notification` ID type.
   * The `notifications` collection property now uses `NotificationDocument`.
   * Action parameter and return types for `Notification` are adjusted to use the `Notification` (ID type).

2. **In `NotificationConcept.test.ts`**:
   * It now imports `NotificationConcept` and `{ Notification }` (the ID type) from the concept file.
   * All variables and type assertions related to notification IDs now use `Notification` (the ID type), ensuring the test only interacts with the concept's public API for IDs.

This ensures the tests are robust against changes to the internal representation (like renaming the document interface) while still being type-safe and accurately reflecting the concept's public contract.

Here are the updated files:
