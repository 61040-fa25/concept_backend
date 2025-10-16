[@concept-specifications](../../background/concept-specifications.md)
[@LeaderBoardConcept Spec Example](../../background/LeaderBoardConcept%20Spec%20Example.md)

# prompt: Below is my Notification concept add a getAllNotifications query
### concept Notification [User, ProgressTracking]
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
  * getAllNotifications (user: User) : (notifications:  Notification[])
    * **requires** user exists
    * **effects** returns a list of all notifications belonging to the specified user sorted by the date
