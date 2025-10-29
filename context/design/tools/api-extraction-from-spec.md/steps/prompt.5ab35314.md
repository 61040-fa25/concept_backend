---
timestamp: 'Tue Oct 21 2025 18:58:09 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_185809.76ded23b.md]]'
content_id: 5ab35314277be4adf96f690c1ac5e6039ea87db7508ad5484f48942da2ba2f45
---

# prompt: Now for the following concept spec

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
