# concept: UserAuth

```
concept UserAuth

purpose: Manages user authentication for the app.

principle: After a user registers in the system with their credentials, they will get an unique identifier. They can later log out, then log in again with their credentials.

state
    a set of Users with
        a uid String // this is the unique identifier for users
        a username String
        an email String
        a password Password // this will be a hashed string

actions
    _getUserById (uid: String): (user: User)
        requires:
            user exists with this uid;
        effect:
            return user

    registerUser (username: String, email: String, password: Password): (uid: String)
        requires:
            no user exists with matching email or username
        effect:
            generate a unique identifier uid;
            create a new user with this uid, and with the given username, email, and (hashed) password;
            return the uid;
    
    authenticateUser (email: String, password: Password): (user: User)
        requires:
            user exists with matching (email, password);
        effect:
            return the user
    
    deleteUser (uid: String)
        requires:
            user exists with this uid;
        effect:
            delete user;

```