---
timestamp: 'Tue Oct 14 2025 23:26:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251014_232649.b588af32.md]]'
content_id: ce5b06c2ec02a3b4fe6b64c3d90f6017e67d47ff581ec1277efabb6dee1f1bc2
---

# file: src/Notification/NotificationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Notification" + ".";

// Generic types of this concept
export type Notification = ID; // Exporting Notification type for use in test file
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
interface Notifications {
  _id: Notification;
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
  notifications: Collection<Notifications>;

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
  ): Promise<{ notification: Notification } | { error: string }> {
    try {
      const newNotificationId = freshID();
      const newNotification: Notifications = {
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
      // Safely access message property if 'e' is an Error object
      return { error: `Failed to create notification: ${e instanceof Error ? e.message : String(e)}` };
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
    { user, notification }: { user: User; notification: Notification },
  ): Promise<Empty | { error: string }> {
    try {
      const result = await this.notifications.deleteOne({ _id: notification, user: user });

      if (result.deletedCount === 0) {
        // Check if it failed because it didn't exist or didn't belong to the user
        const existingNotification = await this.notifications.findOne({ _id: notification });
        if (!existingNotification) {
          return { error: `Notification with ID '${notification}' not found.` };
        } else {
          return {
            error:
              `Notification with ID '${notification}' does not belong to user '${user}', or was already deleted.`,
          };
        }
      }
      return {};
    } catch (e) {
      console.error("Error deleting notification:", e);
      // Safely access message property if 'e' is an Error object
      return { error: `Failed to delete notification: ${e instanceof Error ? e.message : String(e)}` };
    }
  }
}
```
