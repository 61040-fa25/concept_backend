concept PasswordAuthentication [User]

- **purpose** limit access to verified users  
- **principle** a user must register with a string username and password, and subsequent attempts to login are authenticated by ensuring a user exists with the exact username and password.  
- **state**
  * a set of **Users** with  
    * `username` **String**  
    * `password` **String**
- **actions**
  * `register (username: String, password: String): (user: User)`  
    * **requires** `username` not in **Users** and length of username >= 8  
    * **effect** adds username and password and associates it with User `user`
  * `authenticate (username: String, password: String): (user: User)`  
    * **requires** `username` exists  
    * **effect** returns the user if `password` matches the one associated with username, otherwise Error
- **queries**
  * `_getAllUsers (): (users: User[])`  
    * **effects** Returns a list of all registered users.
  * `_getUserUsername (user: User): (username: String)` 
    * **requires** user exists 
    * **effects** Returns the username associated with the specified `user`.
