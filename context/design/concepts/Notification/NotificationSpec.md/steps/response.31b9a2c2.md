---
timestamp: 'Wed Oct 15 2025 00:04:09 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_000409.22348456.md]]'
content_id: 31b9a2c207cae4436abc4957cdde91b5243fdbe1338c8028ee2925497f27cf1b
---

# response:

```
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
  * getAllNotifications (user: User) : (notification: {user: User, progress: ProgressTracking, frequency: Number, message: String})
    * **requires** user exists
    * **effects** returns the set of all notifications belonging to the specified user, each with its associated progress tracking, frequency, and message
```
