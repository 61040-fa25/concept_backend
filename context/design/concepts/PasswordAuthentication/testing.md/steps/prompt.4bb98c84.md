---
timestamp: 'Wed Oct 15 2025 21:51:06 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_215106.1dd3a3d8.md]]'
content_id: 4bb98c84c6896faa22c886890b940bd4e5e88937357ae371e714987dd9b816c0
---

# prompt: add a query action \_getAllUsers for concept concept PasswordAuthentication \[User]

* **purpose** limit access to verified users
* **principle** a user must register with a string username and password and subsequent attempts to login is authenticated by matching the ensuring a user exists with the exact username and password
* **state**
  * a set of **Users** with
    * `username` **String**
    * `password` **String**
* **actions**
  * `register (username: String, password: String): (user: User)`
    * **requires** `username` not in **Users** and length of username >= 8
    * **effect** adds username and password and associates it with User user
  * `authenticate (username: String, password: String): (user: User)`
    * **requires** username exists
    * **effect** returns the user if `password` matches the one associated with username, otherwise Error
* **queries**
  * `_getAllUsers (): (users: User[])`
    * **effects**: Returns a list of all registered users.
