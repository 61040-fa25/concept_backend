---
timestamp: 'Wed Oct 15 2025 20:59:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_205958.4fb5daea.md]]'
content_id: 9b8f27f35f2650967bcbbc2929d1836f28553f295878373080f3e61b8e814ebc
---

# file: src/Notification/NotificationConcept.test.ts

```typescript
import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
// Import NotificationConcept and the Notification type (which is the ID type)
import NotificationConcept, { Notification } from "./NotificationConcept.ts";

// Define some dummy IDs for testing
const USER_ALICE = "user:Alice" as ID;
const USER_BOB = "user:Bob" as ID;
const PROGRESS_TRACKING_SAVINGS = "progress:savings_plan_1" as ID;
const PROGRESS_TRACKING_INVESTMENT = "progress:investment_plan_2" as ID;

Deno.test("NotificationConcept: createNotification", async (test) => {
  const [db, client] = await testDb();
  const concept = new NotificationConcept(db);

  await test.step("should successfully create a notification and return its ID", async () => {
    console.log("Trace: Attempting to create a notification for Alice's savings plan.");
    const notificationDetails = {
      user: USER_ALICE,
      progress: PROGRESS_TRACKING_SAVINGS,
      frequency: 7, // every 7 days
      message: "Time to check on your savings goal!",
    };
    const result = await concept.createNotification(notificationDetails);

    // Assert that a notification ID was returned
    assertExists((result as { notification: Notification }).notification, "Result should contain a notification ID.");
    const newNotificationId = (result as { notification: Notification }).notification;
    console.log(`Effect: Notification created with ID: ${newNotificationId}`);

    // Verify the notification exists using the _getAllNotifications query (external interaction only)
    console.log(`Confirmation: Fetching all notifications for user ${USER_ALICE} to verify creation.`);
    const fetchedNotificationsResult = await concept._getAllNotifications({ user: USER_ALICE });
    const fetchedNotificationIds = fetchedNotificationsResult[0].notifications; // Extract the array of Notification IDs

    assertEquals(fetchedNotificationIds.length, 1, "Should have exactly one notification ID for Alice.");
    assertEquals(fetchedNotificationIds[0], newNotificationId, "Fetched notification ID should match created ID.");
    console.log("Confirmation: Notification ID matched using _getAllNotifications query.");
  });

  await client.close();
});

Deno.test("NotificationConcept: deleteNotification", async (test) => {
  const [db, client] = await testDb();
  const concept = new NotificationConcept(db);

  await test.step("should successfully delete a notification belonging to the correct user", async () => {
    // Setup for this specific step: Create a notification for Alice
    const aliceNotificationCreateResult = await concept.createNotification({
      user: USER_ALICE,
      progress: PROGRESS_TRACKING_SAVINGS,
      frequency: 14,
      message: "Alice, review your savings progress!",
    });
    const aliceNotificationId = (aliceNotificationCreateResult as { notification: Notification }).notification;
    console.log(`Setup: Created notification for Alice: ${aliceNotificationId}`);

    // Verify setup via query (external interaction only)
    let initialAliceNotificationsResult = await concept._getAllNotifications({ user: USER_ALICE });
    assertEquals(initialAliceNotificationsResult[0].notifications.length, 1, "Setup: Alice should have 1 notification ID.");

    console.log(`Trace: Attempting to delete notification ${aliceNotificationId} for user ${USER_ALICE}.`);
    const result = await concept.deleteNotification({
      user: USER_ALICE,
      notification: aliceNotificationId,
    });

    assertEquals(result, {}, "Deletion should return an empty success object.");
    console.log(`Effect: Notification ${aliceNotificationId} deleted successfully.`);

    // Verify it's gone using _getAllNotifications query (external interaction only)
    const postDeletionAliceNotificationsResult = await concept._getAllNotifications({ user: USER_ALICE });
    assertEquals(postDeletionAliceNotificationsResult[0].notifications.length, 0, "Alice should have 0 notification IDs after deletion.");
    console.log("Confirmation: Notification ID not found via _getAllNotifications after deletion.");
  });

  await test.step("should return an error if trying to delete a non-existent notification", async () => {
    const nonExistentId = freshID() as Notification; // Cast to Notification (the ID type)
    console.log(`Trace: Attempting to delete non-existent notification ${nonExistentId} for user ${USER_ALICE}.`);
    const result = await concept.deleteNotification({
      user: USER_ALICE,
      notification: nonExistentId,
    });

    assertExists((result as { error: string }).error, "Result should contain an error message.");
    assertEquals(
      (result as { error: string }).error,
      `Notification with ID '${nonExistentId}' not found.`,
    );
    console.log(`Requirement failure: ${
      (result as { error: string }).error
    } - Confirmed deletion failed for non-existent notification.`);

    // Verify no side effects (Alice still has 0 notifications if she started with 0)
    const aliceNotificationsResult = await concept._getAllNotifications({ user: USER_ALICE });
    assertEquals(aliceNotificationsResult[0].notifications.length, 0, "Alice should still have 0 notification IDs.");
  });

  await test.step("should return an error if trying to delete a notification belonging to another user", async () => {
    // Setup for this specific step: Create a notification for Bob
    const bobNotificationCreateResult = await concept.createNotification({
      user: USER_BOB,
      progress: PROGRESS_TRACKING_INVESTMENT,
      frequency: 30,
      message: "Bob, check your investment portfolio!",
    });
    const bobNotificationId = (bobNotificationCreateResult as { notification: Notification }).notification;
    console.log(`Setup: Created notification for Bob: ${bobNotificationId}`);

    // Verify Bob's notification exists via query (external interaction only)
    const initialBobNotificationsResult = await concept._getAllNotifications({ user: USER_BOB });
    assertEquals(initialBobNotificationsResult[0].notifications.length, 1, "Setup: Bob should have 1 notification ID.");

    console.log(
      `Trace: Attempting to delete notification ${bobNotificationId} (Bob's) by user ${USER_ALICE}.`,
    );
    const result = await concept.deleteNotification({
      user: USER_ALICE, // Alice tries to delete Bob's notification
      notification: bobNotificationId,
    });

    assertExists((result as { error: string }).error, "Result should contain an error message.");
    assertNotEquals((result as { error: string }).error, "", "Error message should not be empty.");
    assertEquals(
      (result as { error: string }).error,
      `Notification with ID '${bobNotificationId}' does not belong to user '${USER_ALICE}'.`,
    );
    console.log(`Requirement failure: ${
      (result as { error: string }).error
    } - Confirmed deletion failed for notification belonging to another user.`);

    // Verify Bob's notification still exists using query (external interaction only)
    const postAttemptBobNotificationsResult = await concept._getAllNotifications({ user: USER_BOB });
    assertEquals(postAttemptBobNotificationsResult[0].notifications.length, 1, "Bob's notification ID should still exist.");
    assertEquals(postAttemptBobNotificationsResult[0].notifications[0], bobNotificationId, "Bob's notification ID should match.");
    console.log("Confirmation: Bob's notification ID still exists via _getAllNotifications.");
  });

  await test.step("should return an error if trying to delete an already deleted notification", async () => {
    console.log(`Trace: Creating and then deleting a notification to test double-deletion.`);
    const tempNotificationResult = await concept.createNotification({
      user: USER_ALICE,
      progress: PROGRESS_TRACKING_SAVINGS,
      frequency: 1,
      message: "Temporary notification.",
    });
    const tempNotificationId = (tempNotificationResult as { notification: Notification }).notification;
    console.log(`Setup: Created temporary notification: ${tempNotificationId}`);

    // Verify temporary notification exists
    let aliceNotificationsResult = await concept._getAllNotifications({ user: USER_ALICE });
    assertEquals(aliceNotificationsResult[0].notifications.length, 1, "Setup: Alice should have 1 temporary notification ID.");

    await concept.deleteNotification({ user: USER_ALICE, notification: tempNotificationId });
    console.log(`Effect: Notification ${tempNotificationId} deleted once.`);

    // Verify it's deleted
    aliceNotificationsResult = await concept._getAllNotifications({ user: USER_ALICE });
    assertEquals(aliceNotificationsResult[0].notifications.length, 0, "Confirmation: Alice has 0 notification IDs after first deletion.");

    console.log(`Trace: Attempting to delete notification ${tempNotificationId} a second time.`);
    const result = await concept.deleteNotification({
      user: USER_ALICE,
      notification: tempNotificationId,
    });

    assertExists((result as { error: string }).error, "Result should contain an error message.");
    assertEquals(
      (result as { error: string }).error,
      `Notification with ID '${tempNotificationId}' not found.`,
    );
    console.log(`Requirement failure: ${
      (result as { error: string }).error
    } - Confirmed deletion failed for an already deleted notification.`);
  });

  await client.close();
});

Deno.test("NotificationConcept: _getAllNotifications", async (test) => {
  const [db, client] = await testDb();
  const concept = new NotificationConcept(db);

  await test.step("should return an empty array if no notifications exist for the user", async () => {
    console.log(`Trace: Attempting to get notifications for user ${USER_ALICE} with no existing notifications.`);
    const result = await concept._getAllNotifications({ user: USER_ALICE });
    assertEquals(result[0].notifications.length, 0, "Should return an empty array of notification IDs for a user with no notifications.");
    console.log("Confirmation: Empty array of IDs returned as expected.");
  });

  await test.step("should return all notification IDs for a user, sorted by createdAt", async () => {
    // Create multiple notifications for Alice with different timestamps (simulate over time)
    // We expect `_getAllNotifications` to return only IDs, but they should be sorted based on `createdAt`.
    const createN1 = await concept.createNotification({ user: USER_ALICE, progress: PROGRESS_TRACKING_SAVINGS, frequency: 7, message: "Reminder 1" });
    const n1Id = (createN1 as { notification: Notification }).notification;
    // Simulate a slight time delay for sorting
    await new Promise((resolve) => setTimeout(resolve, 10));
    const createN2 = await concept.createNotification({ user: USER_ALICE, progress: PROGRESS_TRACKING_INVESTMENT, frequency: 30, message: "Reminder 2" });
    const n2Id = (createN2 as { notification: Notification }).notification;
    await new Promise((resolve) => setTimeout(resolve, 10));
    const createN3 = await concept.createNotification({ user: USER_ALICE, progress: PROGRESS_TRACKING_SAVINGS, frequency: 1, message: "Reminder 3" });
    const n3Id = (createN3 as { notification: Notification }).notification;

    // Create a notification for Bob to ensure isolation
    await concept.createNotification({ user: USER_BOB, progress: PROGRESS_TRACKING_SAVINGS, frequency: 7, message: "Bob's Reminder" });

    console.log(`Trace: Getting all notifications for user ${USER_ALICE}.`);
    const result = await concept._getAllNotifications({ user: USER_ALICE });
    const notificationIds = result[0].notifications;

    assertEquals(notificationIds.length, 3, "Should return 3 notification IDs for Alice.");

    // Verify sorting by createdAt (ascending). The order of IDs should correspond to the creation order.
    assertEquals(notificationIds[0], n1Id, "First notification ID should be N1 (oldest).");
    assertEquals(notificationIds[1], n2Id, "Second notification ID should be N2.");
    assertEquals(notificationIds[2], n3Id, "Third notification ID should be N3 (newest).");

    console.log("Confirmation: All notification IDs for Alice returned and correctly sorted.");

    // Verify Bob's notification IDs are not included in Alice's list
    const bobNotificationsResult = await concept._getAllNotifications({ user: USER_BOB });
    assertEquals(bobNotificationsResult[0].notifications.length, 1, "Bob should have only his notification ID.");
    console.log("Confirmation: Notifications are user-specific.");
  });

  await client.close();
});

// --- Principle Trace ---
Deno.test("NotificationConcept: Principle Trace - Remind users to save and celebrate milestones", async (test) => {
  const [db, client] = await testDb();
  const concept = new NotificationConcept(db);

  // Principle: for each user's savings plan, a message is sent to the user to remind them of the amount they planned to save
  console.log("\n--- Principle Trace: Remind users to save and celebrate milestones ---");

  const aliceSavingsPlanId = "progress:alice_savings_fund" as ID;
  const aliceUserId = USER_ALICE;
  console.log(`Scenario: User ${aliceUserId} has a savings plan ${aliceSavingsPlanId}.`);

  // Initial state check: Alice should have no notifications
  let aliceNotificationsResult = await concept._getAllNotifications({ user: aliceUserId });
  assertEquals(aliceNotificationsResult[0].notifications.length, 0, "Initial state: Alice should have 0 notification IDs.");
  console.log("Initial State: Confirmed Alice has no notifications.");

  // Step 2: Create a weekly savings reminder notification
  console.log(`Action: An external system triggers creation of a weekly reminder notification for ${aliceUserId}.`);
  const createReminderResult = await concept.createNotification({
    user: aliceUserId,
    progress: aliceSavingsPlanId,
    frequency: 7, // weekly reminder
    message: "Don't forget to track your weekly savings for your holiday fund!",
  });

  assertExists((createReminderResult as { notification: Notification }).notification, "Reminder notification ID should be returned.");
  const reminderNotificationId = (createReminderResult as { notification: Notification }).notification;
  console.log(`Effect: Notification ${reminderNotificationId} created to remind ${aliceUserId}.`);

  // Verify state: Alice should now have 1 notification ID
  aliceNotificationsResult = await concept._getAllNotifications({ user: aliceUserId });
  assertEquals(aliceNotificationsResult[0].notifications.length, 1, "After reminder: Alice should have 1 notification ID.");
  assertEquals(aliceNotificationsResult[0].notifications[0], reminderNotificationId, "Confirmation: Reminder notification ID exists.");
  console.log("Confirmation: Alice's reminder notification ID is visible via query.");

  // Step 3: Later, Alice achieves a milestone. Create a celebration notification.
  // Simulate a slight delay to ensure different `createdAt` for sorting
  await new Promise((resolve) => setTimeout(resolve, 10));
  console.log(`Action: An external system triggers creation of a milestone celebration notification for ${aliceUserId}.`);
  const createCelebrationResult = await concept.createNotification({
    user: aliceUserId,
    progress: aliceSavingsPlanId,
    frequency: 0, // One-time celebration
    message: "Congratulations, Alice! You've reached 50% of your savings goal!",
  });

  assertExists((createCelebrationResult as { notification: Notification }).notification, "Celebration notification ID should be returned.");
  const celebrationNotificationId = (createCelebrationResult as { notification: Notification }).notification;
  console.log(`Effect: Notification ${celebrationNotificationId} created to celebrate ${aliceUserId}'s milestone.`);

  // Verify state: Alice should now have 2 notification IDs
  aliceNotificationsResult = await concept._getAllNotifications({ user: aliceUserId });
  const aliceNotificationIds = aliceNotificationsResult[0].notifications;
  assertEquals(aliceNotificationIds.length, 2, "After celebration: Alice should have 2 notification IDs.");
  console.log(`Confirmation: Alice has ${aliceNotificationIds.length} notification IDs:`);
  aliceNotificationIds.forEach((id) => {
    console.log(`  - ID: ${id}`);
  });

  // Verify sorting by createdAt (N1 should be before N2 if created sequentially)
  assertEquals(aliceNotificationIds[0], reminderNotificationId, "First notification ID should be the reminder (oldest createdAt).");
  assertEquals(aliceNotificationIds[1], celebrationNotificationId, "Second notification ID should be the celebration (newest createdAt).");
  console.log("Confirmation: Notification IDs are correctly sorted by creation date.");

  // Step 5: Alice decides to delete the reminder as she adjusted her plan.
  console.log(`Action: User ${aliceUserId} deletes the reminder notification ${reminderNotificationId}.`);
  const deleteResult = await concept.deleteNotification({ user: aliceUserId, notification: reminderNotificationId });
  assertEquals(deleteResult, {}, "Reminder notification should be deleted successfully.");
  console.log(`Effect: Reminder notification ${reminderNotificationId} deleted.`);

  // Final confirmation: Check notifications again via query
  aliceNotificationsResult = await concept._getAllNotifications({ user: aliceUserId });
  const finalAliceNotificationIds = aliceNotificationsResult[0].notifications;
  assertEquals(finalAliceNotificationIds.length, 1, "Final state: Alice should now have 1 notification ID.");
  assertEquals(
    finalAliceNotificationIds[0],
    celebrationNotificationId,
    "Only the celebration notification ID should remain.",
  );
  console.log("Confirmation: Only the celebration notification ID remains for Alice via query.");

  console.log("--- End Principle Trace ---");

  await client.close();
});
```
