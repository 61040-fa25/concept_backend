---
timestamp: 'Tue Oct 14 2025 22:57:10 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251014_225710.74c39ee3.md]]'
content_id: 374e8ebbb80a6d3a275f7f39da0708d2d2e763080d93bfd7e3815e643b2befc2
---

# prompt: Here is my concept spec: concept Notification \[User, ProgressTracking]

* **purpose** remind users to save and celebrate milestones
* **principle** for each user's savings plan, a message is sent to the user to remind them of the amount they planned to save
* **state**
  * a set of **Notifications** with
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
