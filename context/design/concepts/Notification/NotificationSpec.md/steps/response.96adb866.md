---
timestamp: 'Thu Oct 30 2025 12:47:37 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251030_124737.7da696c4.md]]'
content_id: 96adb866162e8a1a39ce31b139f7807b278959101e1f7a4162999df436f028c6
---

# response:

### concept Notification \[User, ProgressTracking]

* **purpose** remind users to save and celebrate milestones
* **principle** for each user's savings plan, a message is sent to the user to remind them of the amount they planned to save
* **state**
  * a set of **Notification** with
    * `user` **User**
    * `progress` **ProgressTracking**
    * `frequency` **Number**
    * `message` **String**
* **actions**
  * createNotification(user: User, progress: ProgressTracking, frequency: Number, message: String): (notification: Notification)
    * **effect** create and return a notification with the above input details
  * deleteNotification(user: User, notification: Notification)
    * **requires** notification exists and belongs to user
    * **effect** deletes the notification
* **queries**
  * getAllNotifications (user: User) : (notifications: Notification\[])
    * **requires** user exists
    * **effects** returns a list of all notifications belonging to the specified user sorted by the date
  * getNotificationMessageAndFreq (user: User, notification: Notification): (message: String, frequency: Number)
    * **requires** notification exists and belongs to user
    * **effects** returns the message and frequency of the specified notification
