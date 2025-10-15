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