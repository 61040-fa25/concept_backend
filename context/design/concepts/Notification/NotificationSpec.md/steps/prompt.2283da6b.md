---
timestamp: 'Wed Oct 15 2025 00:04:01 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_000401.ed6088f3.md]]'
content_id: 2283da6b4c09771c232eb544fee9249e85f1f146706392defd38cc1b8c54b60f
---

# prompt: Below is my Notification concept add a getAllNotifications query

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
