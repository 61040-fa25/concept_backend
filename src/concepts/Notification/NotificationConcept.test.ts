import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
// Import NotificationConcept and the Notification type (which is the ID type)
import NotificationConcept from "./NotificationConcept.ts";

type Notification = ID;
// Define some dummy IDs for testing
const USER_ALICE = "user:Alice" as ID;
const USER_BOB = "user:Bob" as ID;
const PROGRESS_TRACKING_SAVINGS = "progress:savings_plan_1" as ID;
const PROGRESS_TRACKING_INVESTMENT = "progress:investment_plan_2" as ID;

// Helper to extract notification IDs from _getAllNotifications query result
function extractNotificationIds(result: Array<{ notifications: Notification[] }>): Notification[] {
  // Queries MUST return an array, and per spec, `_getAllNotifications` returns an array of
  // dictionaries, each with a 'notifications' field containing an array of Notification IDs.
  // We assume there's always at least one such dictionary in the outer array.
  return result[0]?.notifications || [];
}

Deno.test("NotificationConcept: Operational Principle Trace - Remind users to save and celebrate milestones", async (test) => {
  const [db, client] = await testDb();
  const concept = new NotificationConcept(db);

  console.log("\n--- OPERATIONAL PRINCIPLE TRACE: Remind users to save and celebrate milestones ---");

  const aliceSavingsPlanId = "progress:alice_savings_fund" as ID;
  const aliceUserId = USER_ALICE;
  console.log(`Scenario: User ${aliceUserId} has a savings plan ${aliceSavingsPlanId}.`);

  // Initial state check: Alice should have no notifications
  let aliceNotifications = extractNotificationIds(await concept._getAllNotifications({ user: aliceUserId }));
  assertEquals(aliceNotifications.length, 0, "Initial state: Alice should have 0 notification IDs.");
  console.log("Initial State: Confirmed Alice has no notifications.");

  // Step 1: Create a weekly savings reminder notification
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
  aliceNotifications = extractNotificationIds(await concept._getAllNotifications({ user: aliceUserId }));
  assertEquals(aliceNotifications.length, 1, "After reminder: Alice should have 1 notification ID.");
  assertEquals(aliceNotifications[0], reminderNotificationId, "Confirmation: Reminder notification ID exists.");
  console.log("Confirmation: Alice's reminder notification ID is visible via query.");

  // Step 2: Later, Alice achieves a milestone. Create a celebration notification.
  // Simulate a slight delay to ensure different `createdAt` for sorting in query
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
  aliceNotifications = extractNotificationIds(await concept._getAllNotifications({ user: aliceUserId }));
  assertEquals(aliceNotifications.length, 2, "After celebration: Alice should have 2 notification IDs.");
  console.log(`Confirmation: Alice has ${aliceNotifications.length} notification IDs:`);
  aliceNotifications.forEach((id) => console.log(`  - ID: ${id}`));

  // Verify sorting by createdAt (N1 should be before N2 if created sequentially)
  assertEquals(aliceNotifications[0], reminderNotificationId, "First notification ID should be the reminder (oldest createdAt).");
  assertEquals(aliceNotifications[1], celebrationNotificationId, "Second notification ID should be the celebration (newest createdAt).");
  console.log("Confirmation: Notification IDs are correctly sorted by creation date.");

  // Step 3: Alice decides to delete the reminder as she adjusted her plan.
  console.log(`Action: User ${aliceUserId} deletes the reminder notification ${reminderNotificationId}.`);
  const deleteResult = await concept.deleteNotification({ user: aliceUserId, notification: reminderNotificationId });
  assertEquals(deleteResult, {}, "Reminder notification should be deleted successfully.");
  console.log(`Effect: Reminder notification ${reminderNotificationId} deleted.`);

  // Final confirmation: Check notifications again via query
  aliceNotifications = extractNotificationIds(await concept._getAllNotifications({ user: aliceUserId }));
  assertEquals(aliceNotifications.length, 1, "Final state: Alice should now have 1 notification ID.");
  assertEquals(aliceNotifications[0], celebrationNotificationId, "Only the celebration notification ID should remain.");
  console.log("Confirmation: Only the celebration notification ID remains for Alice via query.");

  console.log("--- END OPERATIONAL PRINCIPLE TRACE ---");
  await client.close();
});


Deno.test("NotificationConcept: Interesting Case 3 - deleteNotification failure scenarios", async () => {
  const [db, client] = await testDb();
  const concept = new NotificationConcept(db);

  console.log("\n--- Interesting Case 3: deleteNotification failure scenarios ---");

  // Scenario A: Delete non-existent notification
  const nonExistentId = freshID() as Notification;
  console.log(`Action: Attempting to delete non-existent notification ${nonExistentId} for ${USER_ALICE}.`);
  let result = await concept.deleteNotification({ user: USER_ALICE, notification: nonExistentId });
  assertExists((result as { error: string }).error, "Should return an error for non-existent notification.");
  assertEquals((result as { error: string }).error, `Notification with ID '${nonExistentId}' not found.`);
  console.log(`Requirement failure: ${ (result as { error: string }).error }`);

  // Scenario B: Delete another user's notification
  const bobNotificationResult = await concept.createNotification({ user: USER_BOB, progress: PROGRESS_TRACKING_SAVINGS, frequency: 10, message: "Bob's private note." });
  const bobNotificationId = (bobNotificationResult as { notification: Notification }).notification;
  console.log(`Setup: Created notification ${bobNotificationId} for ${USER_BOB}.`);
  console.log(`Action: Attempting to delete ${bobNotificationId} (Bob's) by ${USER_ALICE}.`);
  result = await concept.deleteNotification({ user: USER_ALICE, notification: bobNotificationId });
  assertExists((result as { error: string }).error, "Should return an error for deleting another user's notification.");
  assertEquals((result as { error: string }).error, `Notification with ID '${bobNotificationId}' does not belong to user '${USER_ALICE}'.`);
  console.log(`Requirement failure: ${ (result as { error: string }).error }`);
  // Verify Bob's notification still exists
  assertEquals(extractNotificationIds(await concept._getAllNotifications({ user: USER_BOB })).length, 1, "Bob's notification should still exist.");
  console.log("Confirmation: Bob's notification was not deleted.");

  // Scenario C: Delete an already deleted notification
  const tempNotificationResult = await concept.createNotification({ user: USER_ALICE, progress: PROGRESS_TRACKING_INVESTMENT, frequency: 5, message: "Ephemeral message." });
  const tempNotificationId = (tempNotificationResult as { notification: Notification }).notification;
  console.log(`Setup: Created temporary notification ${tempNotificationId} for ${USER_ALICE}.`);
  await concept.deleteNotification({ user: USER_ALICE, notification: tempNotificationId }); // First deletion
  console.log(`Effect: Notification ${tempNotificationId} deleted once.`);

  console.log(`Action: Attempting to delete ${tempNotificationId} a second time.`);
  result = await concept.deleteNotification({ user: USER_ALICE, notification: tempNotificationId }); // Second deletion attempt
  assertExists((result as { error: string }).error, "Should return an error for deleting an already deleted notification.");
  assertEquals((result as { error: string }).error, `Notification with ID '${tempNotificationId}' not found.`);
  console.log(`Requirement failure: ${ (result as { error: string }).error }`);

  await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay for MongoDB client cleanup
  await client.close();
});

Deno.test("NotificationConcept: Interesting Case 4 - _getAllNotifications for empty user", async () => {
  const [db, client] = await testDb();
  const concept = new NotificationConcept(db);

  console.log("\n--- Interesting Case 4: _getAllNotifications for empty user ---");
  const nonExistentUser = freshID() as ID; // User with no created notifications
  console.log(`Action: Getting notifications for user ${nonExistentUser} with no existing notifications.`);
  const result = await concept._getAllNotifications({ user: nonExistentUser });
  assertEquals(result[0].notifications.length, 0, "Should return an empty array of IDs.");
  console.log("Confirmation: Empty array returned for user with no notifications.");

  await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay for MongoDB client cleanup
  await client.close();
});

Deno.test("NotificationConcept: Interesting Case 5 - _getAllNotifications with multiple sorted results", async () => {
  const [db, client] = await testDb();
  const concept = new NotificationConcept(db);

  console.log("\n--- Interesting Case 5: _getAllNotifications with multiple sorted results ---");
  // Create notifications for Alice with delays to ensure distinct `createdAt` for sorting
  const createN1 = await concept.createNotification({ user: USER_ALICE, progress: PROGRESS_TRACKING_SAVINGS, frequency: 7, message: "First reminder" });
  await new Promise((resolve) => setTimeout(resolve, 10)); // Using setTimeout
  const createN2 = await concept.createNotification({ user: USER_ALICE, progress: PROGRESS_TRACKING_INVESTMENT, frequency: 30, message: "Second reminder" });
  await new Promise((resolve) => setTimeout(resolve, 10)); // Using setTimeout
  const createN3 = await concept.createNotification({ user: USER_ALICE, progress: PROGRESS_TRACKING_SAVINGS, frequency: 1, message: "Third reminder" });

  const n1Id = (createN1 as { notification: Notification }).notification;
  const n2Id = (createN2 as { notification: Notification }).notification;
  const n3Id = (createN3 as { notification: Notification }).notification;
  console.log(`Setup: Created N1 (${n1Id}), N2 (${n2Id}), N3 (${n3Id}) for Alice.`);

  // Create a notification for Bob to ensure it's not mixed with Alice's
  await concept.createNotification({ user: USER_BOB, progress: PROGRESS_TRACKING_SAVINGS, frequency: 7, message: "Bob's notification" });
  console.log("Setup: Created a notification for Bob for isolation verification.");

  console.log(`Action: Getting all notifications for user ${USER_ALICE}.`);
  const result = await concept._getAllNotifications({ user: USER_ALICE });
  const notificationIds = extractNotificationIds(result);

  assertEquals(notificationIds.length, 3, "Should return 3 notification IDs for Alice.");
  assertEquals(notificationIds[0], n1Id, "First notification ID should be N1 (oldest).");
  assertEquals(notificationIds[1], n2Id, "Second notification ID should be N2.");
  assertEquals(notificationIds[2], n3Id, "Third notification ID should be N3 (newest).");
  console.log("Confirmation: All notification IDs for Alice returned and correctly sorted by creation time.");

  // Verify Bob's notification IDs are not in Alice's list
  const bobNotifications = extractNotificationIds(await concept._getAllNotifications({ user: USER_BOB }));
  assertEquals(bobNotifications.length, 1, "Bob should have only his notification ID.");
  assertNotEquals(bobNotifications[0], n1Id, "Bob's notification should not be Alice's.");
  console.log("Confirmation: Notifications are user-specific and not cross-contaminated.");

  await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay for MongoDB client cleanup
  await client.close();
});
