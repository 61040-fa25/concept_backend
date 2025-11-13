**Concept: Notify[User]**

Purpose: notify users of various events

Principle: A user recieves a notification after a certain event which they can then view in whatever inbox the system specifies

State:

    a set of Notifications with
      a user User
      a message String
      a read flag

Actions:

    notify (user: User, message: String):(notification:Notification)
      effects: creates a Notification for user with message, adds it to the Notifications set, and returns it to the user

    read(notification:Notification):(message: String)
      requires: notification to exist
      effects: marks notification as read regardless of previous read status

Queries:

    _getNotificationsByUser(recipient: User)
      effects: returns notifications for recipient

    _getReadNotificationsByUser(recipient: User)
      effects: returns notifications for recipient that are marked read

    _getUnreadNotificationsByUser(recipient: User)
      effects: returns notifications for recipient that are not marked read

    _getAllNotifications()
      effects: returns all notifications in set
