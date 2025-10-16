---
timestamp: 'Wed Oct 15 2025 20:59:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_205958.4fb5daea.md]]'
content_id: 0a93eddbaca3b95e294e2b231ea5ab4a775a4e13d1056fc62a82038e13ab322e
---

# test: Notification not using NotificationID using Notification itself as the ID here is the implementation import { Collection, Db } from "npm:mongodb";

```typescript
import { ID, Empty } from "@utils/types.ts";

import { freshID } from "@utils/database.ts";

  

// Declare collection prefix, use concept name

const PREFIX = "Notification" + ".";

  

// Generic types of this concept

type Notification = ID; // Renamed from NotificationID to Notification (represents the concept ID)

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

 *   `user` User

 *   `progress` ProgressTracking

 *   `frequency` Number

 *   `message` String

 *   `createdAt` DateTime // Added for sorting as per query spec

 */

interface NotificationDoc { // Renamed from Notification to NotificationDoc (represents the MongoDB document)

  _id: Notification; // Uses the Notification type (which is an ID)

  user: User;

  progress: ProgressTracking;

  frequency: number;

  message: string;

  createdAt: string; // ISO 8601 string for datetime, added to support sorting in queries

}

  

/**

 * Concept: Notification

 * purpose: remind users to save and celebrate milestones

 * principle: for each user's savings plan, a message is sent to the user to remind them of the amount they planned to save

 */

export default class NotificationConcept {

  notifications: Collection<NotificationDoc>; // Collection uses NotificationDoc

  

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

  ): Promise<{ notification: Notification } | { error: string }> { // Return type refers to Notification (the ID type)

    try {

      const newNotificationId = freshID();

      const newNotification: NotificationDoc = { // Use NotificationDoc interface for the document

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

    { user, notification }: { user: User; notification: Notification }, // Parameter uses Notification (the ID type)

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

  

  /**

   * _getAllNotifications (user: User) : (notifications: Notification[])

   *

   * **requires** user exists

   *

   * **effects** returns a list of all notification IDs belonging to the specified user sorted by the date

   *

   * Note: The concept spec's return signature `(notifications: Notification[])` is interpreted as `(notifications: Notification[])`

   * where `Notification` refers to the ID type, to align with the "don't expose rep" instruction.

   */

  async _getAllNotifications(

    { user }: { user: User },

  ): Promise<Array<{ notifications: Notification[] }>> { // Return an array of dictionaries, each with a 'notifications' field containing an array of Notification IDs

    try {

      const notifications = await this.notifications

        .find({ user }, { projection: { _id: 1 } }) // Only retrieve the _id field

        .sort({ createdAt: 1 }) // Sort by createdAt in ascending order

        .toArray();

  

      const notificationIds = notifications.map((n) => n._id);

  

      // As per "Dictionaries as arguments and results" for queries,

      // `_query (...) : (c: C)` returns `Array<{ c: C_TYPE }>`.

      // Here, `c` is `notifications`, and `C_TYPE` is `Notification[]` (array of Notification IDs).

      return [{ notifications: notificationIds }];

    } catch (e) {

      console.error("Error getting all notification IDs for user:", e);

      // On error, return an empty array of the specified return type.

      return [{ notifications: [] }];

    }

  }

}

```
