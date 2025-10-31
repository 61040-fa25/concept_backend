---
timestamp: 'Thu Oct 30 2025 12:47:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251030_124729.305db3af.md]]'
content_id: b112c8a2ff60776054910ee6662e170dc9a3a912cd79f838775a8c1d6f42a666
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
  * getAllNotifications (user: User) : (notifications:  Notification\[])
    * **requires** user exists
    * **effects** returns a list of all notifications belonging to the specified user sorted by the date
