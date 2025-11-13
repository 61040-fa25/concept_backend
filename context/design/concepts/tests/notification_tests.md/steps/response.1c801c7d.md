---
timestamp: 'Fri Oct 17 2025 14:03:54 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_140354.a655efee.md]]'
content_id: 1c801c7d415880c15ab79d37eb0bb1261114877fd09c256598762ce40182f96e
---

# response:

```typescript
// file: src/concepts/skrib/Notifying.test.ts

import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import NotifyingConcept from "./Notifying.ts";

// Helper function for user IDs
const userA = "user:Alice" as ID;
const userB = "user:Bob" as ID;

Deno.test("NotifyingConcept", async (t) => {
  const [db, client] = await testDb();
  const notifyingConcept = new NotifyingConcept(db);

  Deno.test.beforeEach(async () => {
    // Clear collections before each test to ensure isolation
    await notifyingConcept["notifications"].deleteMany({});
  });

  await t.step("Principle: A user receives and can view a notification", async () => {
    console.log("\n--- Principle Test: User notification lifecycle ---");

    // 1. Simulate an event and notify user A
    const message = "Your post received a new comment!";
    console.log(`Action: Notifying ${userA} with message: "${message}"`);
    const notifyResult = await notifyingConcept.notify({ user: userA, message });
    assertExists(notifyResult.notification, "Notification ID should be returned");
    const notificationId = notifyResult.notification;
    console.log(`Effect: Notification created with ID: ${notificationId}`);

    // Verify initial state: notification exists and is unread for user A
    let userANotifications = await notifyingConcept._getNotificationsByUser({ recipient: userA });
    assertEquals(userANotifications.length, 1, "User A should have 1 notification");
    assertEquals(userANotifications[0]._id, notificationId, "Notification ID matches");
    assertEquals(userANotifications[0].recipient, userA, "Notification recipient matches User A");
    assertEquals(userANotifications[0].message, message, "Notification message matches");
    assertEquals(userANotifications[0].read, false, "Notification should initially be unread");
    console.log(`Query: Verified 1 unread notification for ${userA}.`);

    let unreadNotifications = await notifyingConcept._getUnreadNotificationsByUser({ recipient: userA });
    assertEquals(unreadNotifications.length, 1, "User A should have 1 unread notification.");
    let readNotifications = await notifyingConcept._getReadNotificationsByUser({ recipient: userA });
    assertEquals(readNotifications.length, 0, "User A should have 0 read notifications.");

    // 2. User A views (reads) the notification
    console.log(`Action: User ${userA} reading notification ${notificationId}`);
    const readResult = await notifyingConcept.read({ notification: notificationId });
    assertExists(readResult.message, "Message should be returned after reading");
    assertNotEquals((readResult as { error?: string }).error, "Survey with ID not found.", "Reading existing notification should not error");
    assertEquals(readResult.message, message, "Returned message should match original notification message");
    console.log(`Effect: Notification ${notificationId} marked as read. Message: "${readResult.message}"`);

    // Verify final state: notification is now read for user A
    userANotifications = await notifyingConcept._getNotificationsByUser({ recipient: userA });
    assertEquals(userANotifications.length, 1, "User A should still have 1 notification");
    assertEquals(userANotifications[0].read, true, "Notification should now be read");
    console.log(`Query: Verified notification ${notificationId} is now read for ${userA}.`);

    unreadNotifications = await notifyingConcept._getUnreadNotificationsByUser({ recipient: userA });
    assertEquals(unreadNotifications.length, 0, "User A should have 0 unread notifications after reading.");
    readNotifications = await notifyingConcept._getReadNotificationsByUser({ recipient: userA });
    assertEquals(readNotifications.length, 1, "User A should have 1 read notification after reading.");

    console.log("Principle test completed successfully: User received and read a notification.");
  });

  await t.step("Action: notify (user: User, message: String)", async (t) => {
    console.log("\n--- Testing notify action ---");

    await t.step("should create a new notification for the specified user", async () => {
      const message1 = "Welcome to the app!";
      console.log(`Action: Notifying ${userA} with message: "${message1}"`);
      const result1 = await notifyingConcept.notify({ user: userA, message: message1 });
      assertExists(result1.notification, "Notification ID should be returned.");

      const allNotifications = await notifyingConcept._getAllNotifications();
      assertEquals(allNotifications.length, 1, "Should have one notification in total.");
      assertEquals(allNotifications[0].recipient, userA, "Notification recipient should be User A.");
      assertEquals(allNotifications[0].message, message1, "Notification message should match.");
      assertEquals(allNotifications[0].read, false, "Notification should be unread by default.");
      assertEquals(allNotifications[0]._id, result1.notification, "Returned notification ID should match stored ID.");
      console.log(`Effect: Verified notification ${result1.notification} created for ${userA}.`);
    });

    await t.step("should create multiple notifications for the same user", async () => {
      const message1 = "Update 1";
      const message2 = "Update 2";

      console.log(`Action: Notifying ${userA} with message: "${message1}"`);
      const result1 = await notifyingConcept.notify({ user: userA, message: message1 });
      console.log(`Action: Notifying ${userA} with message: "${message2}"`);
      const result2 = await notifyingConcept.notify({ user: userA, message: message2 });

      const userANotifications = await notifyingConcept._getNotificationsByUser({ recipient: userA });
      assertEquals(userANotifications.length, 2, "User A should have two notifications.");

      const notificationIds = userANotifications.map(n => n._id);
      assertExists(notificationIds.find(id => id === result1.notification), "First notification ID should be present.");
      assertExists(notificationIds.find(id => id === result2.notification), "Second notification ID should be present.");

      assertEquals(userANotifications.filter(n => n.message === message1 && n.read === false).length, 1, "First notification content correct and unread.");
      assertEquals(userANotifications.filter(n => n.message === message2 && n.read === false).length, 1, "Second notification content correct and unread.");
      console.log(`Effect: Verified two distinct notifications created for ${userA}.`);
    });

    await t.step("should create notifications for different users independently", async () => {
      const messageA = "Message for Alice";
      const messageB = "Message for Bob";

      console.log(`Action: Notifying ${userA} with message: "${messageA}"`);
      await notifyingConcept.notify({ user: userA, message: messageA });
      console.log(`Action: Notifying ${userB} with message: "${messageB}"`);
      await notifyingConcept.notify({ user: userB, message: messageB });

      const userANotifications = await notifyingConcept._getNotificationsByUser({ recipient: userA });
      assertEquals(userANotifications.length, 1, "User A should have one notification.");
      assertEquals(userANotifications[0].message, messageA, "User A's message content correct.");

      const userBNotifications = await notifyingConcept._getNotificationsByUser({ recipient: userB });
      assertEquals(userBNotifications.length, 1, "User B should have one notification.");
      assertEquals(userBNotifications[0].message, messageB, "User B's message content correct.");

      const allNotifications = await notifyingConcept._getAllNotifications();
      assertEquals(allNotifications.length, 2, "Total notifications should be two.");
      console.log("Effect: Verified independent notifications for different users.");
    });
  });

  await t.step("Action: read (notification: Notification)", async (t) => {
    console.log("\n--- Testing read action ---");

    const message = "Important update!";
    let notificationId: ID;

    Deno.test.beforeEach(async () => {
      // Create a fresh notification for each 'read' test
      await notifyingConcept["notifications"].deleteMany({}); // Clear specifically for 'read' tests
      const notifyResult = await notifyingConcept.notify({ user: userA, message });
      notificationId = notifyResult.notification;
    });

    await t.step("requires: notification to exist - should return error for non-existent notification", async () => {
      const nonExistentId = "nonExistent:123" as ID;
      console.log(`Action: Attempting to read non-existent notification ${nonExistentId}`);
      const result = await notifyingConcept.read({ notification: nonExistentId });

      assertExists((result as { error?: string }).error, "Should return an error for non-existent notification.");
      assertEquals((result as { error: string }).error, `Survey with ID ${nonExistentId} not found.`, "Error message should be descriptive.");
      console.log("Requirement check passed: Failed to read non-existent notification.");
    });

    await t.step("effects: marks notification as read and returns message (initially unread)", async () => {
      // Confirm initial state: unread
      let notification = (await notifyingConcept._getNotificationsByUser({ recipient: userA }))[0];
      assertEquals(notification.read, false, "Notification should initially be unread.");

      console.log(`Action: Reading notification ${notificationId}`);
      const result = await notifyingConcept.read({ notification: notificationId });
      assertExists(result.message, "Should return the message.");
      assertEquals(result.message, message, "Returned message should match original.");

      // Confirm effect: marked as read
      notification = (await notifyingConcept._getNotificationsByUser({ recipient: userA }))[0];
      assertEquals(notification.read, true, "Notification should now be marked as read.");

      const unreadNotifications = await notifyingConcept._getUnreadNotificationsByUser({ recipient: userA });
      assertEquals(unreadNotifications.length, 0, "User should have no unread notifications.");
      const readNotifications = await notifyingConcept._getReadNotificationsByUser({ recipient: userA });
      assertEquals(readNotifications.length, 1, "User should have 1 read notification.");
      console.log(`Effect: Verified notification ${notificationId} marked as read and message returned.`);
    });

    await t.step("effects: marks notification as read regardless of previous read status (already read)", async () => {
      // First, read the notification to mark it as read
      await notifyingConcept.read({ notification: notificationId });
      let notification = (await notifyingConcept._getNotificationsByUser({ recipient: userA }))[0];
      assertEquals(notification.read, true, "Notification should be read after first call.");

      console.log(`Action: Re-reading already read notification ${notificationId}`);
      const result = await notifyingConcept.read({ notification: notificationId });
      assertExists(result.message, "Should still return the message.");
      assertEquals(result.message, message, "Returned message should still match original.");

      // Confirm effect: still marked as read
      notification = (await notifyingConcept._getNotificationsByUser({ recipient: userA }))[0];
      assertEquals(notification.read, true, "Notification should remain marked as read.");
      console.log(`Effect: Verified re-reading a notification keeps it marked as read and returns message.`);
    });
  });

  await t.step("Queries: _getNotificationsByUser, _getReadNotificationsByUser, _getUnreadNotificationsByUser, _getAllNotifications", async (t) => {
    console.log("\n--- Testing query methods ---");

    const message1 = "Unread for Alice";
    const message2 = "Read for Alice";
    const message3 = "Unread for Bob";

    const notif1 = (await notifyingConcept.notify({ user: userA, message: message1 })).notification;
    const notif2 = (await notifyingConcept.notify({ user: userA, message: message2 })).notification;
    const notif3 = (await notifyingConcept.notify({ user: userB, message: message3 })).notification;

    await notifyingConcept.read({ notification: notif2 }); // Mark notif2 as read

    await t.step("_getAllNotifications should return all notifications", async () => {
      const all = await notifyingConcept._getAllNotifications();
      assertEquals(all.length, 3, "Should return 3 total notifications.");
      const ids = all.map(n => n._id);
      assertExists(ids.find(id => id === notif1));
      assertExists(ids.find(id => id === notif2));
      assertExists(ids.find(id => id === notif3));
      console.log("Query: _getAllNotifications returned all 3 notifications.");
    });

    await t.step("_getNotificationsByUser should return all notifications for a specific user", async () => {
      const userANotifications = await notifyingConcept._getNotificationsByUser({ recipient: userA });
      assertEquals(userANotifications.length, 2, "Should return 2 notifications for User A.");
      const ids = userANotifications.map(n => n._id);
      assertExists(ids.find(id => id === notif1));
      assertExists(ids.find(id => id === notif2));
      console.log(`Query: _getNotificationsByUser for ${userA} returned 2 notifications.`);

      const userBNotifications = await notifyingConcept._getNotificationsByUser({ recipient: userB });
      assertEquals(userBNotifications.length, 1, "Should return 1 notification for User B.");
      assertEquals(userBNotifications[0]._id, notif3);
      console.log(`Query: _getNotificationsByUser for ${userB} returned 1 notification.`);
    });

    await t.step("_getUnreadNotificationsByUser should return unread notifications for a user", async () => {
      const userAUnread = await notifyingConcept._getUnreadNotificationsByUser({ recipient: userA });
      assertEquals(userAUnread.length, 1, "User A should have 1 unread notification.");
      assertEquals(userAUnread[0]._id, notif1, "The unread notification should be notif1.");
      console.log(`Query: _getUnreadNotificationsByUser for ${userA} returned 1 unread notification.`);

      const userBUnread = await notifyingConcept._getUnreadNotificationsByUser({ recipient: userB });
      assertEquals(userBUnread.length, 1, "User B should have 1 unread notification.");
      assertEquals(userBUnread[0]._id, notif3, "The unread notification should be notif3.");
      console.log(`Query: _getUnreadNotificationsByUser for ${userB} returned 1 unread notification.`);
    });

    await t.step("_getReadNotificationsByUser should return read notifications for a user", async () => {
      const userARead = await notifyingConcept._getReadNotificationsByUser({ recipient: userA });
      assertEquals(userARead.length, 1, "User A should have 1 read notification.");
      assertEquals(userARead[0]._id, notif2, "The read notification should be notif2.");
      console.log(`Query: _getReadNotificationsByUser for ${userA} returned 1 read notification.`);

      const userBRead = await notifyingConcept._getReadNotificationsByUser({ recipient: userB });
      assertEquals(userBRead.length, 0, "User B should have 0 read notifications.");
      console.log(`Query: _getReadNotificationsByUser for ${userB} returned 0 read notifications.`);
    });
  });

  await client.close();
});
```
