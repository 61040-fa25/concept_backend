---
timestamp: 'Wed Oct 15 2025 00:09:24 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_000924.c3e09ea9.md]]'
content_id: 47350731defa7c9c86fdc6f143fab0a358c17b02c0faee6842bdf672e1d31e5d
---

# implement: my Notification Spec

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
  * getAllNotifications (user: User) : (notifications:  Notification\[])
    * **requires** user exists
    * **effects** returns a list of all notifications belonging to the specified user sorted by the date
