---
timestamp: 'Wed Oct 15 2025 21:46:43 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_214643.b791490b.md]]'
content_id: d8e953905ba11f80bef7e6a8f534d761876b95b9f53e28a8ff101bb1a7c1816b
---

# response:

```
concept PasswordAuthentication [User]

- **purpose** limit access to verified users
- **principle** a user must register with a string username and password and subsequent attempts to login is authenticated by matching the ensuring a user exists with the exact username and password
- **state**
  * a set of **Users** with
    * `username` **String**
    * `password` **String**
- **actions**
  * `register (username: String, password: String): (user: User)`
    * **requires** `username` not in **Users** and length of username >= 8
    * **effect** adds username and password and associates it with User user
  * `authenticate (username: String, password: String): (user: User)`
    * **requires** username exists
    * **effect** returns the user if `password` matches the one associated with username, otherwise Error
- **queries**
  * `_getAllUsers (): (users: User[])`
    * **effects**: Returns a list of all registered users.
```
