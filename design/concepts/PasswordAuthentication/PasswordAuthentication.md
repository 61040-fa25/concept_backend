**Concept: PasswordAuthentication (User)**
* **purpose** limit access to known users 
* **principle** after a user registers with a username and a password, they can authenticate with that same username and password and be treated each time as the same user 
* **state** 
    * a set of Users with 
        * a username String
        * a password String
* **actions** 
    * register (username: String, password: String): (user: User) 
        * *requires* username to not already exist in the set of Users 
        * *effects* creates a new user of that username and password, adds that user to the set of users, and returns the new user
    * authenticate (username: String, password: String): (user: User) 
        * *requires* user of the argument username and password to exist in the set of Users 
        * *effects* returns the corresponding User 