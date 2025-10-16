---
timestamp: 'Tue Oct 14 2025 23:44:26 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251014_234426.96c9a6a0.md]]'
content_id: 5e83f546de70fd0c0cde813de5ddf867794e0589ee20af0824486ad61f76a528
---

# file: src/Notification/NotificationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Notification" + ".";

/**
 * Represents the ID type for a Notification.
 * This is what actions return and take when referencing a Notification instance.
 */
export type Notification = ID; // This is the ID type exposed for external use.

type User = ID; // Represents the ID of a user
type ProgressTracking = ID; // Represents the ID of a ProgressTracking entity

/**
 * Interface describing the structure of a Notification document stored in MongoDB.
 * It's singular, aligning with "a set of Notifications with..." referring to individual Notification entities.
 */
interface NotificationDocument { // Renamed to clearly denote its a document's structure
  _id: Notification; // Use the exported Notification ID type for the document's _id
  user: User;
  progress: ProgressTracking;
  frequency: number;
  message: string;
}

/**
 * concept Notification [User, ProgressTracking]
 *
 * purpose: remind users to save and celebrate milestones
 * principle: for each user's savings plan, a message is sent to the user to remind them of the amount they planned to save
 */
export default class NotificationConcept {
  notifications: Collection<NotificationDocument>; // Collection uses the document interface

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
  ): Promise<{ notification: Notification } | { error: string }> { // Returns Notification (the ID type)
    try {
      const newNotificationId: Notification = freshID(); // Type newNotificationId as Notification
      const newNotification: NotificationDocument = { // Create instance of NotificationDocument
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
    { user, notification }: { user: User; notification: Notification }, // Parameter notification is of type Notification (ID type)
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
      return { error: `Failed to delete notification: ${e instanceof Error ? e.message : String(e)}` };
    }
  }
}
```
