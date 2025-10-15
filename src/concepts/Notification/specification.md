### concept Notification [User, ProgressTracking]
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