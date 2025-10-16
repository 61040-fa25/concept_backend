---
timestamp: 'Tue Oct 14 2025 23:44:26 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251014_234426.96c9a6a0.md]]'
content_id: df19a4f92d8b81a15409f848ffa2e9ebec32626160a159cc634627b7c572afdf
---

# file: src/Notification/NotificationConcept.test.ts

```typescript
import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import NotificationConcept, { Notification } from "./NotificationConcept.ts"; // Import the concept AND the Notification ID type

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

    // Type casting result for assertion, since it can be either success or error
    assertExists((result as { notification: Notification }).notification);
    const newNotificationId = (result as { notification: Notification }).notification;
    console.log(`Effect: Notification created with ID: ${newNotificationId}`);

    // Verify the notification exists directly in the database (since no queries are specified in the concept)
    // We access `concept.notifications` directly for internal state verification, which is acceptable in tests.
    const storedNotification = await concept.notifications.findOne({ _id: newNotificationId });
    assertExists(storedNotification, "Notification should be found in the database.");
    assertEquals(storedNotification.user, notificationDetails.user);
    assertEquals(storedNotification.progress, notificationDetails.progress);
    assertEquals(storedNotification.frequency, notificationDetails.frequency);
    assertEquals(storedNotification.message, notificationDetails.message);
    console.log("Confirmation: Notification details matched in DB.");
  });

  await client.close();
});

Deno.test("NotificationConcept: deleteNotification", async (test) => {
  const [db, client] = await testDb();
  const concept = new NotificationConcept(db);

  // For `deleteNotification`, it's better to create fresh notifications inside each relevant step
  // to ensure isolation and a clean slate for each test case.

  await test.step("should successfully delete a notification belonging to the correct user", async () => {
    // Setup for this specific step
    const aliceNotificationResult = await concept.createNotification({
      user: USER_ALICE,
      progress: PROGRESS_TRACKING_SAVINGS,
      frequency: 14,
      message: "Alice, review your savings progress!",
    });
    const aliceNotificationId = (aliceNotificationResult as { notification: Notification }).notification;
    console.log(`Setup: Created notification for Alice: ${aliceNotificationId}`);

    console.log(`Trace: Attempting to delete notification ${aliceNotificationId} for user ${USER_ALICE}.`);
    const result = await concept.deleteNotification({
      user: USER_ALICE,
      notification: aliceNotificationId,
    });

    assertEquals(result, {});
    console.log(`Effect: Notification ${aliceNotificationId} deleted successfully.`);

    // Verify it's gone from the database
    const deletedNotification = await concept.notifications.findOne({ _id: aliceNotificationId });
    assertEquals(deletedNotification, null, "Notification should no longer be in the database.");
    console.log("Confirmation: Notification not found in DB after deletion.");
  });

  await test.step("should return an error if trying to delete a non-existent notification", async () => {
    const nonExistentId = freshID() as Notification; // Cast to Notification (the ID type)
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
  });

  await test.step("should return an error if trying to delete a notification belonging to another user", async () => {
    // Setup for this specific step
    const bobNotificationResult = await concept.createNotification({
      user: USER_BOB,
      progress: PROGRESS_TRACKING_INVESTMENT,
      frequency: 30,
      message: "Bob, check your investment portfolio!",
    });
    const bobNotificationId = (bobNotificationResult as { notification: Notification }).notification;
    console.log(`Setup: Created notification for Bob: ${bobNotificationId}`);

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

    // Verify Bob's notification still exists
    const bobNotification = await concept.notifications.findOne({ _id: bobNotificationId });
    assertExists(bobNotification, "Bob's notification should still exist.");
    console.log("Confirmation: Bob's notification still exists in DB.");
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

    await concept.deleteNotification({ user: USER_ALICE, notification: tempNotificationId });
    console.log(`Effect: Notification ${tempNotificationId} deleted once.`);

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

  // Step 1: Alice creates a savings plan (represented by a ProgressTracking ID)
  // (In a real scenario, another concept like 'SavingsPlan' or 'ProgressTracking' would manage this)
  const aliceSavingsPlanId = "progress:alice_savings_fund" as ID;
  const aliceUserId = USER_ALICE;
  console.log(`Scenario: User ${aliceUserId} has a savings plan ${aliceSavingsPlanId}.`);

  // Step 2: An external system (e.g., a scheduler or another concept) determines a reminder is needed.
  // The Notification concept is used to *record* this reminder.
  console.log(`Action: An external system triggers creation of a weekly reminder notification for ${aliceUserId}.`);
  const createReminderResult = await concept.createNotification({
    user: aliceUserId,
    progress: aliceSavingsPlanId,
    frequency: 7, // weekly reminder
    message: "Don't forget to track your weekly savings for your holiday fund!",
  });

  assertExists((createReminderResult as { notification: Notification }).notification);
  const reminderNotificationId = (createReminderResult as { notification: Notification }).notification;
  console.log(`Effect: Notification ${reminderNotificationId} created to remind ${aliceUserId}.`);

  // Step 3: Later, Alice achieves a milestone.
  // An external system determines a celebration notification is needed.
  console.log(`Action: An external system triggers creation of a milestone celebration notification for ${aliceUserId}.`);
  const createCelebrationResult = await concept.createNotification({
    user: aliceUserId,
    progress: aliceSavingsPlanId,
    frequency: 0, // One-time celebration, frequency 0 or could be 'null' if allowed.
    message: "Congratulations, Alice! You've reached 50% of your savings goal!",
  });

  assertExists((createCelebrationResult as { notification: Notification }).notification);
  const celebrationNotificationId = (createCelebrationResult as { notification: Notification }).notification;
  console.log(`Effect: Notification ${celebrationNotificationId} created to celebrate ${aliceUserId}'s milestone.`);

  // Step 4: Alice views her notifications.
  // (Since this concept has no queries, we simulate checking the DB for her notifications)
  console.log(`Confirmation: Simulating user ${aliceUserId} viewing their notifications (checking DB).`);
  const aliceNotifications = await concept.notifications.find({ user: aliceUserId }).toArray();
  assertEquals(aliceNotifications.length, 2, "Alice should have 2 notifications.");
  console.log(`Confirmation: Alice has ${aliceNotifications.length} notifications:`);
  aliceNotifications.forEach((n) => {
    console.log(`  - ID: ${n._id}, Message: "${n.message}"`);
  });

  // Step 5: Alice decides to delete the reminder as she adjusted her plan.
  console.log(`Action: User ${aliceUserId} deletes the reminder notification ${reminderNotificationId}.`);
  const deleteResult = await concept.deleteNotification({ user: aliceUserId, notification: reminderNotificationId });
  assertEquals(deleteResult, {}, "Reminder notification should be deleted successfully.");
  console.log(`Effect: Reminder notification ${reminderNotificationId} deleted.`);

  // Final confirmation: Check notifications again
  const finalAliceNotifications = await concept.notifications.find({ user: aliceUserId }).toArray();
  assertEquals(finalAliceNotifications.length, 1, "Alice should now have 1 notification.");
  assertEquals(
    finalAliceNotifications[0]._id,
    celebrationNotificationId,
    "Only the celebration notification should remain.",
  );
  console.log("Confirmation: Only the celebration notification remains for Alice.");

  console.log("--- End Principle Trace ---");

  await client.close();
});
```
