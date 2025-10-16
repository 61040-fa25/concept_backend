---
timestamp: 'Tue Oct 14 2025 23:09:37 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251014_230937.15dfa30a.md]]'
content_id: 5639874966e168ee5f4dee720e9570dd83236f10f6671121246715b0495d1b15
---

# file: src/Notification/NotificationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Notification" + ".";

// Generic types of this concept
type Notification = ID;
type User = ID; // Represents the ID of a user, though the User concept is not defined here.

/**
 * a set of Notifications with
 *   a recipient User
 *   a sender User? // Optional sender
 *   a type String
 *   a message String
 *   a isRead Boolean
 *   a createdAt DateTime // Stored as ISO string in MongoDB
 *   a link String? // Optional link/URL
 */
interface Notifications {
  _id: Notification;
  recipient: User;
  sender?: User; // Optional sender
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string; // ISO 8601 string for datetime
  link?: string; // Optional link/URL
}

/**
 * concept Notification [User]
 * purpose: To manage and deliver notifications to users.
 * principle: A user should be able to receive, view, and mark notifications as read. Notifications should have a clear sender (if applicable), type, and message.
 */
export default class NotificationConcept {
  notifications: Collection<Notifications>;

  constructor(private readonly db: Db) {
    this.notifications = this.db.collection(PREFIX + "notifications");
  }

  /**
   * createNotification (recipient: User, sender: User?, type: String, message: String, link: String?) : (notification: Notification) | (error: String)
   *
   * **requires** recipient user exists (though we don't enforce existence of `User` concept here, just its ID)
   *
   * **effects** creates a new Notification `n`; sets its recipient, sender (if provided), type, message, and link (if provided); sets `isRead` to false; sets `createdAt` to current UTC timestamp; returns `n` as `notification`
   */
  async createNotification(
    { recipient, sender, type, message, link }: {
      recipient: User;
      sender?: User;
      type: string;
      message: string;
      link?: string;
    },
  ): Promise<{ notification: Notification } | { error: string }> {
    try {
      const newNotificationId = freshID();
      const newNotification: Notifications = {
        _id: newNotificationId,
        recipient,
        sender,
        type,
        message,
        isRead: false,
        createdAt: new Date().toISOString(),
        link,
      };

      await this.notifications.insertOne(newNotification);
      return { notification: newNotificationId };
    } catch (e) {
      console.error("Error creating notification:", e);
      return { error: `Failed to create notification: ${e.message}` };
    }
  }

  /**
   * markNotificationAsRead (notification: Notification) : Empty | (error: String)
   *
   * **requires** notification exists and is not already read
   *
   * **effects** sets `isRead` of `notification` to true
   */
  async markNotificationAsRead(
    { notification }: { notification: Notification },
  ): Promise<Empty | { error: string }> {
    try {
      const result = await this.notifications.updateOne(
        { _id: notification, isRead: false },
        { $set: { isRead: true } },
      );

      if (result.matchedCount === 0) {
        // Check if notification exists at all
        const existingNotification = await this.notifications.findOne({ _id: notification });
        if (!existingNotification) {
          return { error: `Notification with ID '${notification}' not found.` };
        } else if (existingNotification.isRead) {
          return { error: `Notification with ID '${notification}' is already read.` };
        }
      }
      return {};
    } catch (e) {
      console.error("Error marking notification as read:", e);
      return { error: `Failed to mark notification as read: ${e.message}` };
    }
  }

  /**
   * markAllNotificationsAsReadForUser (recipient: User) : Empty | (error: String)
   *
   * **requires** recipient user exists
   *
   * **effects** sets `isRead` to true for all unread notifications for the given recipient
   */
  async markAllNotificationsAsReadForUser(
    { recipient }: { recipient: User },
  ): Promise<Empty | { error: string }> {
    try {
      // Update all unread notifications for the given recipient
      await this.notifications.updateMany(
        { recipient: recipient, isRead: false },
        { $set: { isRead: true } },
      );
      // Note: We don't check for recipient existence here as per prompt's implicit
      // "recipient user exists (though we don't enforce existence of `User` concept here, just its ID)"
      // and MongoDB updateMany will simply match 0 documents if the recipient has no unread notifications or doesn't exist.
      return {};
    } catch (e) {
      console.error("Error marking all notifications as read for user:", e);
      return { error: `Failed to mark all notifications as read: ${e.message}` };
    }
  }

  /**
   * _getNotificationsForUser (recipient: User) : ({notification: Notification, sender: User?, type: String, message: String, isRead: Boolean, createdAt: String, link: String?})[]
   *
   * **requires** recipient user exists
   *
   * **effects** returns an array of all notifications for the given recipient, including their details
   */
  async _getNotificationsForUser(
    { recipient }: { recipient: User },
  ): Promise<
    {
      notification: Notification;
      sender?: User;
      type: string;
      message: string;
      isRead: boolean;
      createdAt: string;
      link?: string;
    }[]
  > {
    try {
      const notifications = await this.notifications.find({ recipient }).toArray();
      return notifications.map((n) => ({
        notification: n._id,
        sender: n.sender,
        type: n.type,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt,
        link: n.link,
      }));
    } catch (e) {
      console.error("Error getting notifications for user:", e);
      return []; // Return empty array on error as per query return type
    }
  }

  /**
   * _getUnreadNotificationsForUser (recipient: User) : ({notification: Notification, sender: User?, type: String, message: String, isRead: Boolean, createdAt: String, link: String?})[]
   *
   * **requires** recipient user exists
   *
   * **effects** returns an array of all unread notifications for the given recipient, including their details
   */
  async _getUnreadNotificationsForUser(
    { recipient }: { recipient: User },
  ): Promise<
    {
      notification: Notification;
      sender?: User;
      type: string;
      message: string;
      isRead: boolean;
      createdAt: string;
      link?: string;
    }[]
  > {
    try {
      const notifications = await this.notifications.find({ recipient, isRead: false }).toArray();
      return notifications.map((n) => ({
        notification: n._id,
        sender: n.sender,
        type: n.type,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt,
        link: n.link,
      }));
    } catch (e) {
      console.error("Error getting unread notifications for user:", e);
      return []; // Return empty array on error as per query return type
    }
  }

  /**
   * _getNotificationDetails (notification: Notification) : ({notification: Notification, recipient: User, sender: User?, type: String, message: String, isRead: Boolean, createdAt: String, link: String?})[]
   *
   * **requires** notification exists
   *
   * **effects** returns an array containing the details of the specified notification (or empty array if not found)
   */
  async _getNotificationDetails(
    { notification }: { notification: Notification },
  ): Promise<
    {
      notification: Notification;
      recipient: User;
      sender?: User;
      type: string;
      message: string;
      isRead: boolean;
      createdAt: string;
      link?: string;
    }[]
  > {
    try {
      const foundNotification = await this.notifications.findOne({ _id: notification });
      if (foundNotification) {
        return [{
          notification: foundNotification._id,
          recipient: foundNotification.recipient,
          sender: foundNotification.sender,
          type: foundNotification.type,
          message: foundNotification.message,
          isRead: foundNotification.isRead,
          createdAt: foundNotification.createdAt,
          link: foundNotification.link,
        }];
      }
      return []; // Return empty array if not found, as per query return type
    } catch (e) {
      console.error("Error getting notification details:", e);
      return []; // Return empty array on error as per query return type
    }
  }
}
```
