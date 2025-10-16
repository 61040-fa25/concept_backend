---
timestamp: 'Wed Oct 15 2025 00:12:08 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_001208.2dc7586b.md]]'
content_id: abde0efcd294d7bb19965cadb722dad4b3fd27bc7618f29d87c47356b8171525
---

# file: src/Notification/NotificationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Notification" + ".";

/**
 * Represents the ID type for a Notification instance.
 * This is used when referencing a notification in action parameters or returns (e.g., `notification: NotificationID`).
 */
export type NotificationID = ID; // Exported for use in tests and other concepts.

type User = ID; // Represents the ID of a user
type ProgressTracking = ID; // Represents the ID of a ProgressTracking entity

/**
 * concept Notification [User, ProgressTracking]
 *
 * purpose: remind users to save and celebrate milestones
 * principle: for each user's savings plan, a message is sent to the user to remind them of the amount they planned to save
 *
 * state
 * a set of Notification with
 *   `user` User
 *   `progress` ProgressTracking
 *   `frequency` Number
 *   `message` String
 *   `createdAt` DateTime // Added implicitly as per _getAllNotifications query's sorting requirement
 */
export interface Notification { // Exported for use in query return types (full object structure)
  _id: NotificationID; // The ID of this notification instance
  user: User;
  progress: ProgressTracking;
  frequency: number;
  message: string;
  createdAt: string; // ISO 8601 string for datetime, used for sorting.
}

/**
 * Concept: Notification
 * purpose: remind users to save and celebrate milestones
 * principle: for each user's savings plan, a message is sent to the user to remind them of the amount they planned to save
 */
export default class NotificationConcept {
  notifications: Collection<Notification>; // Collection stores Notification objects

  constructor(private readonly db: Db) {
    this.notifications = this.db.collection(PREFIX + "notifications");
  }

  /**
   * createNotification (user: User, progress: ProgressTracking, frequency: Number, message: String): (notification: NotificationID) | (error: String)
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
  ): Promise<{ notification: NotificationID } | { error: string }> { // Returns NotificationID
    try {
      const newNotificationId: NotificationID = freshID();
      const newNotification: Notification = { // Create instance of Notification interface
        _id: newNotificationId,
        user,
        progress,
        frequency,
        message,
        createdAt: new Date().toISOString(), // Set creation timestamp
      };

      await this.notifications.insertOne(newNotification);
      return { notification: newNotificationId };
    } catch (e) {
      console.error("Error creating notification:", e);
      return { error: `Failed to create notification: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  /**
   * deleteNotification (user: User, notification: NotificationID) : Empty | (error: String)
   *
   * **requires** notification exists and belongs to user
   *
   * **effect** deletes the notification
   */
  async deleteNotification(
    { user, notification }: { user: User; notification: NotificationID }, // Parameter notification is of type NotificationID
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

  /**
   * _getAllNotifications (user: User) : (notifications: Notification[])
   *
   * **requires** user exists
   *
   * **effects** returns a list of all notifications belonging to the specified user sorted by the date
   */
  async _getAllNotifications(
    { user }: { user: User },
  ): Promise<Array<{ notifications: Notification[] }>> { // Returns an array where each item has a 'notifications' field holding an array of Notification objects
    try {
      const notifications = await this.notifications
        .find({ user })
        .sort({ createdAt: 1 }) // Sort by createdAt in ascending order
        .toArray();

      // As per "Dictionaries as arguments and results" for queries, return an array of dictionaries,
      // where each dictionary has a field named 'notifications' that holds the array of Notification objects.
      return [{ notifications: notifications }];
    } catch (e) {
      console.error("Error getting all notifications for user:", e);
      // On error, return an empty array of the specified return type.
      return [{ notifications: [] }];
    }
  }
}
```
