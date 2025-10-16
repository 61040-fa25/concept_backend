---
timestamp: 'Wed Oct 15 2025 21:08:00 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_210800.5daaea4a.md]]'
content_id: c5b1d17824447be6aa0040c40daf5b5d7ea257d2deb0f7ed03775bbc9cc8c7f2
---

# implement:  the below PasswordAuthentication concept

```markdown
### concept PasswordAuthentication [User]
* **purpose** limit access to verified users
* **principle** a user must register and confirm their email before they can authenticate and use the app
* **state**
    * a set of **Users** with
        * `username` **String**
        * `password` **String**
* **actions**
    * `register (username: String, password: String): (user: User)`
        * **requires** `username` not in **Users**
        * **effect** adds username and password and associates it with User user
    * `authenticate (username: String, password: String): (user: User)`
        * **requires** username exists
        * **effect** returns the user if `password` matches the one associated with username, otherwise Error
```
