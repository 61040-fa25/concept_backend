---
timestamp: 'Wed Oct 15 2025 00:11:22 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_001122.84ff6ec9.md]]'
content_id: 2e19a98e720c7cf1d96de21cb5ee3d3e4e82cf463d5f9ea4b6037fe2ba7a36b2
---

# file: src/Notification/NotificationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Notification" + ".";

// Generic types of this concept
type NotificationID = ID; // Renamed to NotificationID to avoid clash with the interface name
type User = ID; // Represents the ID of a user
type ProgressTracking = ID; // Represents the ID of a ProgressTracking entity

/**
 * concept Notification [User, ProgressTracking]
 *
 * purpose: remind users to save and celebrate milestones
 * principle: for each user's savings plan, a message is sent to the user to remind them of the amount they planned to save
 *
 * state
 * a set of Notifications with
 *   `user` User
 *   `progress` ProgressTracking
 *   `frequency` Number
 *   `message` String
 */
interface Notification { // Using singular "Notification" as requested
  _id: NotificationID;
  user: User;
  progress: ProgressTracking;
  frequency: number;
  message: string;
}

/**
 * Concept: Notification
 * purpose: remind users to save and celebrate milestones
 * principle: for each user's savings plan, a message is sent to the user to remind them of the amount they planned to save
 */
export default class NotificationConcept {
  notifications: Collection<Notification>; // Collection uses the singular interface

  constructor(private readonly db: Db) {
    this.notifications = this.db.collection(PREFIX + "notifications");
  }

  /**
   * createNotification (user: User, progress: ProgressTracking, frequency: Number, message: String): (notification: Notification) | (error: String)
   *
   * **effect** create and return a notification with the above input details
   */
  async createNotification(
    { user, progress, frequency, message }: {
      user: User;
      progress: ProgressTracking;
      frequency: number;
      message: string;
    },
  ): Promise<{ notification: NotificationID } | { error: string }> { // Return type refers to NotificationID
    try {
      const newNotificationId = freshID();
      const newNotification: Notification = { // Use the singular interface name
        _id: newNotificationId,
        user,
        progress,
        frequency,
        message,
      };

      await this.notifications.insertOne(newNotification);
      return { notification: newNotificationId };
    } catch (e) {
      console.error("Error creating notification:", e);
      return { error: `Failed to create notification: ${e.message}` };
    }
  }

  /**
   * deleteNotification (user: User, notification: Notification) : Empty | (error: String)
   *
   * **requires** notification exists and belongs to user
   *
   * **effect** deletes the notification
   */
  async deleteNotification(
    { user, notification }: { user: User; notification: NotificationID }, // Parameter uses NotificationID
  ): Promise<Empty | { error: string }> {
    try {
      const result = await this.notifications.deleteOne({ _id: notification, user: user });

      if (result.deletedCount === 0) {
        // To provide a more specific error message, check why it failed.
        // It could be that the notification didn't exist, or it existed but didn't belong to the user.
        const existingNotification = await this.notifications.findOne({ _id: notification });
        if (!existingNotification) {
          return { error: `Notification with ID '${notification}' not found.` };
        } else {
          // Notification exists but its 'user' field does not match the provided 'user'
          return {
            error:
              `Notification with ID '${notification}' does not belong to user '${user}'.`,
          };
        }
      }
      return {};
    } catch (e) {
      console.error("Error deleting notification:", e);
      return { error: `Failed to delete notification: ${e.message}` };
    }
  }
}
```
