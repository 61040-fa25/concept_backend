import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";


// Declare collection prefix, use concept name
const PREFIX = "Notifying" + ".";

// Generic types of this concept
type User = ID;
type Post = ID;


//internal ids
type Notification = ID;

/**
 * a set of Notifications with
 *  a message String
 *  a recipient User
 */
interface Notifications {
  _id: Notification;
  recipient: User;
  message: string;
  read: boolean;
  post: Post|null
}


/**
 * @concept Notifying
 * @purpose to message users about updates to posts they have made
 */
export default class NotifyingConcept {
  private notifications: Collection<Notifications>;


  constructor(private readonly db: Db) {
    this.notifications = this.db.collection(PREFIX + "notifications");
  }


  /**
   * Creates a notification
   * @effects creates a notification with message for user and adds it to notifications set
   */
  async notify({ user, message, post }: { user: User; message: string, post:Post|null }): Promise<{notification: Notification}> {

    const notificationId = freshID() as Notification;
    await this.notifications.insertOne({
      _id: notificationId,
      recipient: user,
      message,
      read: false,
      post
    });
    return { notification: notificationId };
  }


  /**
   * Reads a notification
   * @requires notification to exist
   * @effects marks notification as read and returns the message
   */
  async read({notification}: {notification: Notification}): Promise<{message: string}|{error: string}>{
    const existingNotification = await this.notifications.findOne({ _id: notification });
    if (!existingNotification) {
      return { error: `Notification with ID ${notification} not found.` };
    }

    if(!existingNotification.read)
        await this.notifications.updateOne({_id: notification }, { $set: { read: true } });
    return {message: existingNotification.message}

  }



  /**
   * returns all notifications to specified user
   */
  async _getNotificationsByUser({ recipient }: { recipient: User }): Promise<Notifications[]> {
    return await this.notifications.find({ recipient }).toArray();
  }

  /**
   * returns all notifications marked read to specified user
   */
  async _getReadNotificationsByUser({ recipient }: { recipient: User }): Promise<Notifications[]> {
    return await this.notifications.find({ recipient, read: true }).toArray();
  }

  /**
   * returns all notifications marked unread to specified user
   */
  async _getUnreadNotificationsByUser({ recipient }: { recipient: User }): Promise<Notifications[]> {
    return await this.notifications.find({ recipient, read: false }).toArray();
  }

  /**
   * returns all notifications
   */
  async _getAllNotifications({}): Promise<Notifications[]> {
    return await this.notifications.find().toArray();
  }

  async _getRecipient({notification}: {notification: Notification}): Promise<{recipient: User}[]>{
    const notifInDB = await this.notifications.findOne({_id: notification})
    return notifInDB? [{recipient: notifInDB.recipient}]:[]
  }
}
