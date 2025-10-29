---
timestamp: 'Tue Oct 21 2025 19:10:11 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_191011.97bdd6e4.md]]'
content_id: a5b49fa5cc4ed0d7152fb6476939360c43736bd16f73bf9022aa21776fc5b727
---

# prompt: Now for the following concept spec, for getAllNotifications should return list of Notifications which are IDs not composite objects

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
