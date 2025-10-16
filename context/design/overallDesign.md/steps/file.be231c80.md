---
timestamp: 'Wed Oct 15 2025 20:59:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_205958.4fb5daea.md]]'
content_id: be231c8019d627caffaeb4882f8f6ba3e88a757ad7d0238643b9c885dd24c63a
---

# file: src/Notification/NotificationConcept.test.ts

```typescript
import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts"; // Note: Empty is not used if actions always return concrete objects or errors
import { freshID } from "@utils/database.ts";
// Import NotificationConcept and the specific types for ID (NotificationID) and full object (Notification)
import NotificationConcept, { NotificationID, Notification } from "./NotificationConcept.ts";

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
    assertExists((result as { notification: NotificationID }).notification);
    const newNotificationId = (result as { notification: NotificationID }).notification;
    console.log(`Effect: Notification created with ID: ${newNotificationId}`);

    // Verify the notification exists and its details using the _getAllNotifications query
    console.log(`Confirmation: Fetching all notifications for user ${USER_ALICE} to verify creation.`);
    const fetchedNotificationsResult = await concept._getAllNotifications({ user: USER_ALICE });
    const fetchedNotifications = fetchedNotificationsResult[0].notifications; // Extract the array of notifications

    assertEquals(fetchedNotifications.length, 1, "Should have exactly one notification for Alice.");
    const storedNotification = fetchedNotifications[0];

    assertEquals(storedNotification._id, newNotificationId, "Stored notification ID should match created ID.");
    assertEquals(storedNotification.user, notificationDetails.user);
    assertEquals(storedNotification.progress, notificationDetails.progress);
    assertEquals(storedNotification.frequency, notificationDetails.frequency);
    assertEquals(storedNotification.message, notificationDetails.message);
    assertExists(storedNotification.createdAt, "Notification should have a createdAt timestamp.");
    console.log("Confirmation: Notification details matched using _getAllNotifications query.");
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
    const aliceNotificationId = (aliceNotificationCreateResult as { notification: NotificationID }).notification;
    console.log(`Setup: Created notification for Alice: ${aliceNotificationId}`);

    // Verify setup via query
    const initialAliceNotifications = await concept._getAllNotifications({ user: USER_ALICE });
    assertEquals(initialAliceNotifications[0].notifications.length, 1, "Setup: Alice should have 1 notification.");

    console.log(`Trace: Attempting to delete notification ${aliceNotificationId} for user ${USER_ALICE}.`);
    const result = await concept.deleteNotification({
      user: USER_ALICE,
      notification: aliceNotificationId,
    });

    assertEquals(result, {}, "Deletion should return an empty success object.");
    console.log(`Effect: Notification ${aliceNotificationId} deleted successfully.`);

    // Verify it's gone using _getAllNotifications query
    const postDeletionAliceNotifications = await concept._getAllNotifications({ user: USER_ALICE });
    assertEquals(postDeletionAliceNotifications[0].notifications.length, 0, "Alice should have 0 notifications after deletion.");
    console.log("Confirmation: Notification not found via _getAllNotifications after deletion.");
  });

  await test.step("should return an error if trying to delete a non-existent notification", async () => {
    const nonExistentId = freshID() as NotificationID; // Cast to NotificationID
    console.log(`Trace: Attempting to delete non-existent notification ${nonExistentId} for user ${USER_ALICE}.`);
    const result = await concept.deleteNotification({
      user: USER_ALICE,
      notification: nonExistentId,
    });

    assertExists((result as { error: string }).error);
    assertEquals(
      (result as { error: string }).error,
      `Notification with ID '${nonExistentId}' not found.`,
    );
    console.log(`Requirement failure: ${
      (result as { error: string }).error
    } - Confirmed deletion failed for non-existent notification.`);

    // Verify no side effects (Alice still has 0 notifications if she started with 0)
    const aliceNotifications = await concept._getAllNotifications({ user: USER_ALICE });
    assertEquals(aliceNotifications[0].notifications.length, 0, "Alice should still have 0 notifications.");
  });

  await test.step("should return an error if trying to delete a notification belonging to another user", async () => {
    // Setup for this specific step: Create a notification for Bob
    const bobNotificationCreateResult = await concept.createNotification({
      user: USER_BOB,
      progress: PROGRESS_TRACKING_INVESTMENT,
      frequency: 30,
      message: "Bob, check your investment portfolio!",
    });
    const bobNotificationId = (bobNotificationCreateResult as { notification: NotificationID }).notification;
    console.log(`Setup: Created notification for Bob: ${bobNotificationId}`);

    // Verify Bob's notification exists via query
    const initialBobNotifications = await concept._getAllNotifications({ user: USER_BOB });
    assertEquals(initialBobNotifications[0].notifications.length, 1, "Setup: Bob should have 1 notification.");

    console.log(
      `Trace: Attempting to delete notification ${bobNotificationId} (Bob's) by user ${USER_ALICE}.`,
    );
    const result = await concept.deleteNotification({
      user: USER_ALICE, // Alice tries to delete Bob's notification
      notification: bobNotificationId,
    });

    assertExists((result as { error: string }).error);
    assertNotEquals((result as { error: string }).error, "");
    assertEquals(
      (result as { error: string }).error,
      `Notification with ID '${bobNotificationId}' does not belong to user '${USER_ALICE}'.`,
    );
    console.log(`Requirement failure: ${
      (result as { error: string }).error
    } - Confirmed deletion failed for notification belonging to another user.`);

    // Verify Bob's notification still exists using query
    const postAttemptBobNotifications = await concept._getAllNotifications({ user: USER_BOB });
    assertEquals(postAttemptBobNotifications[0].notifications.length, 1, "Bob's notification should still exist.");
    assertEquals(postAttemptBobNotifications[0].notifications[0]._id, bobNotificationId, "Bob's notification ID should match.");
    console.log("Confirmation: Bob's notification still exists via _getAllNotifications.");
  });

  await test.step("should return an error if trying to delete an already deleted notification", async () => {
    console.log(`Trace: Creating and then deleting a notification to test double-deletion.`);
    const tempNotificationResult = await concept.createNotification({
      user: USER_ALICE,
      progress: PROGRESS_TRACKING_SAVINGS,
      frequency: 1,
      message: "Temporary notification.",
    });
    const tempNotificationId = (tempNotificationResult as { notification: NotificationID }).notification;
    console.log(`Setup: Created temporary notification: ${tempNotificationId}`);

    // Verify temporary notification exists
    let aliceNotifications = await concept._getAllNotifications({ user: USER_ALICE });
    assertEquals(aliceNotifications[0].notifications.length, 1, "Setup: Alice should have 1 temporary notification.");

    await concept.deleteNotification({ user: USER_ALICE, notification: tempNotificationId });
    console.log(`Effect: Notification ${tempNotificationId} deleted once.`);

    // Verify it's deleted
    aliceNotifications = await concept._getAllNotifications({ user: USER_ALICE });
    assertEquals(aliceNotifications[0].notifications.length, 0, "Confirmation: Alice has 0 notifications after first deletion.");

    console.log(`Trace: Attempting to delete notification ${tempNotificationId} a second time.`);
    const result = await concept.deleteNotification({
      user: USER_ALICE,
      notification: tempNotificationId,
    });

    assertExists((result as { error: string }).error);
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
  assertEquals(aliceNotificationsResult[0].notifications.length, 0, "Initial state: Alice should have 0 notifications.");
  console.log("Initial State: Confirmed Alice has no notifications.");

  // Step 2: Create a weekly savings reminder notification
  console.log(`Action: An external system triggers creation of a weekly reminder notification for ${aliceUserId}.`);
  const createReminderResult = await concept.createNotification({
    user: aliceUserId,
    progress: aliceSavingsPlanId,
    frequency: 7, // weekly reminder
    message: "Don't forget to track your weekly savings for your holiday fund!",
  });

  assertExists((createReminderResult as { notification: NotificationID }).notification);
  const reminderNotificationId = (createReminderResult as { notification: NotificationID }).notification;
  console.log(`Effect: Notification ${reminderNotificationId} created to remind ${aliceUserId}.`);

  // Verify state: Alice should now have 1 notification
  aliceNotificationsResult = await concept._getAllNotifications({ user: aliceUserId });
  assertEquals(aliceNotificationsResult[0].notifications.length, 1, "After reminder: Alice should have 1 notification.");
  assertEquals(aliceNotificationsResult[0].notifications[0]._id, reminderNotificationId, "Confirmation: Reminder notification exists.");
  console.log("Confirmation: Alice's reminder notification is visible via query.");

  // Step 3: Later, Alice achieves a milestone. Create a celebration notification.
  console.log(`Action: An external system triggers creation of a milestone celebration notification for ${aliceUserId}.`);
  const createCelebrationResult = await concept.createNotification({
    user: aliceUserId,
    progress: aliceSavingsPlanId,
    frequency: 0, // One-time celebration
    message: "Congratulations, Alice! You've reached 50% of your savings goal!",
  });

  assertExists((createCelebrationResult as { notification: NotificationID }).notification);
  const celebrationNotificationId = (createCelebrationResult as { notification: NotificationID }).notification;
  console.log(`Effect: Notification ${celebrationNotificationId} created to celebrate ${aliceUserId}'s milestone.`);

  // Verify state: Alice should now have 2 notifications
  aliceNotificationsResult = await concept._getAllNotifications({ user: aliceUserId });
  const aliceNotifications = aliceNotificationsResult[0].notifications;
  assertEquals(aliceNotifications.length, 2, "After celebration: Alice should have 2 notifications.");
  console.log(`Confirmation: Alice has ${aliceNotifications.length} notifications:`);
  aliceNotifications.forEach((n) => {
    console.log(`  - ID: ${n._id}, Message: "${n.message}", Created: ${n.createdAt}`);
  });

  // Verify sorting by createdAt (N1 should be before N2 if created sequentially)
  assertEquals(aliceNotifications[0]._id, reminderNotificationId, "First notification should be the reminder (earlier createdAt).");
  assertEquals(aliceNotifications[1]._id, celebrationNotificationId, "Second notification should be the celebration (later createdAt).");
  console.log("Confirmation: Notifications are correctly sorted by creation date.");

  // Step 5: Alice decides to delete the reminder as she adjusted her plan.
  console.log(`Action: User ${aliceUserId} deletes the reminder notification ${reminderNotificationId}.`);
  const deleteResult = await concept.deleteNotification({ user: aliceUserId, notification: reminderNotificationId });
  assertEquals(deleteResult, {}, "Reminder notification should be deleted successfully.");
  console.log(`Effect: Reminder notification ${reminderNotificationId} deleted.`);

  // Final confirmation: Check notifications again via query
  aliceNotificationsResult = await concept._getAllNotifications({ user: aliceUserId });
  const finalAliceNotifications = aliceNotificationsResult[0].notifications;
  assertEquals(finalAliceNotifications.length, 1, "Final state: Alice should now have 1 notification.");
  assertEquals(
    finalAliceNotifications[0]._id,
    celebrationNotificationId,
    "Only the celebration notification should remain.",
  );
  console.log("Confirmation: Only the celebration notification remains for Alice via query.");

  console.log("--- End Principle Trace ---");

  await client.close();
});
```
