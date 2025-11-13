**Concept: Authenticate**

Purpose: authenticate users with passwords

Principle: A user registers with a username and password to create an account. They can then log in with their username and password to access their account

State:

    a set of Users with
      a username String
      a password String

Actions:

    register (username: String, password: String):(user:User)
      requires: no User in the Users set has username
      effects: creates a User with username and password and adds it to Users set

    deleteUser (user: User)
      effects: deletes user from Users set

    changePassword (user: User, newPassword: String)
        effects: replaces password of user with newPassword

    authenticate (username: String, password: String):(user:User)
        requires: User with username and password exists in the Users set
        effects: returns that user

Queries:

    _getAllUsers()
      effects: returns all users in set
