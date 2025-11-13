Check file:///C:/Users/Akosua/Documents/6.104/skrib/src/concepts/skrib/Notifying.test.ts

running 4 tests from ./src/concepts/skrib/Notifying.test.ts

Principle: A user receives and can view a notification ...

------- output -------



--- Principle Test: User notification lifecycle ---

Action: Notifying user:Alice with message: "Your post received a new comment!"

Effect: Notification created with ID: 0199fdb7-608a-7fad-aa90-bc8b23a4b05e

Query: Verified 1 unread notification for user:Alice.

Action: User user:Alice reading notification 0199fdb7-608a-7fad-aa90-bc8b23a4b05e

Effect: Notification 0199fdb7-608a-7fad-aa90-bc8b23a4b05e marked as read. Message: "Your post received a new comment!"

Query: Verified notification 0199fdb7-608a-7fad-aa90-bc8b23a4b05e is now read for user:Alice.

Principle test completed successfully: User received and read a notification.

----- output end -----

Principle: A user receives and can view a notification ... ok (697ms)

Action: notify (user: User, message: String) ...

------- output -------



--- Testing notify action ---

----- output end -----

  should create a new notification for the specified user ...

------- output -------

Action: Notifying user:Alice with message: "Welcome to the app!"

Effect: Verified notification 0199fdb7-62d8-700b-bf47-9e3ff4075b87 created for user:Alice.

----- output end -----

  should create a new notification for the specified user ... ok (458ms)

  should create multiple notifications for the same user ...

------- output -------

Action: Notifying user:Alice with message: "Update 1"

Action: Notifying user:Alice with message: "Update 2"

Effect: Verified two distinct notifications created for user:Alice.

----- output end -----

  should create multiple notifications for the same user ... ok (660ms)

  should create notifications for different users independently ...

------- output -------

Action: Notifying user:Alice with message: "Message for Alice"

Action: Notifying user:Bob with message: "Message for Bob"

Effect: Verified independent notifications for different users.

----- output end -----

  should create notifications for different users independently ... ok (645ms)

Action: notify (user: User, message: String) ... ok (1s)

Action: read (notification: Notification) ...

------- output -------



--- Testing read action ---

----- output end -----

  requires: notification to exist - should return error for non-existent notification ...

------- output -------

Action: Attempting to read non-existent notification nonExistent:123

Requirement check passed: Failed to read non-existent notification.

----- output end -----

  requires: notification to exist - should return error for non-existent notification ... ok (512ms)

  effects: marks notification as read and returns message (initially unread) ...

------- output -------

Action: Reading notification 0199fdb7-6c1a-7453-a492-5114080cc330

Effect: Verified notification 0199fdb7-6c1a-7453-a492-5114080cc330 marked as read and message returned.

----- output end -----

  effects: marks notification as read and returns message (initially unread) ... ok (643ms)

  effects: marks notification as read regardless of previous read status (already read) ...

------- output -------

Action: Re-reading already read notification 0199fdb7-6eba-7b58-9ccc-765e2e8bac32

Effect: Verified re-reading a notification keeps it marked as read and returns message.

----- output end -----

  effects: marks notification as read regardless of previous read status (already read) ... ok (652ms)

Action: read (notification: Notification) ... ok (1s)

Queries: _getNotificationsByUser, _getReadNotificationsByUser, _getUnreadNotificationsByUser, _getAllNotifications ...

------- output -------



--- Testing query methods ---

----- output end -----

  _getAllNotifications should return all notifications ...

------- output -------

Query: _getAllNotifications returned all 3 notifications.

----- output end -----

  _getAllNotifications should return all notifications ... ok (17ms)

  _getNotificationsByUser should return all notifications for a specific user ...

------- output -------

Query: _getNotificationsByUser for user:Alice returned 2 notifications.

Query: _getNotificationsByUser for user:Bob returned 1 notification.

----- output end -----

  _getNotificationsByUser should return all notifications for a specific user ... ok (33ms)

  _getUnreadNotificationsByUser should return unread notifications for a user ...

------- output -------

Query: _getUnreadNotificationsByUser for user:Alice returned 1 unread notification.

Query: _getUnreadNotificationsByUser for user:Bob returned 1 unread notification.

----- output end -----

  _getUnreadNotificationsByUser should return unread notifications for a user ... ok (32ms)

  _getReadNotificationsByUser should return read notifications for a user ...

------- output -------

Query: _getReadNotificationsByUser for user:Alice returned 1 read notification.

Query: _getReadNotificationsByUser for user:Bob returned 0 read notifications.

----- output end -----

  _getReadNotificationsByUser should return read notifications for a user ... ok (34ms)

Queries: _getNotificationsByUser, _getReadNotificationsByUser, _getUnreadNotificationsByUser, _getAllNotifications ... ok (781ms)



ok | 4 passed (10 steps) | 0 failed (5s)
