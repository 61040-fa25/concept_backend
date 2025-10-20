## Concept: User  
**Purpose**: let users securely manage and access their own videos  
**Principle**: after registering with a username and password, the user can log in to their account

**State**  
A set of **User** with:  
- a username String  
- a password String  

**Actions**  
- `register(username: String, password: String): (userID: String)`  
  - Requires: username not already taken  
  - Effect: creates a new User with login credentials  

- `login(username: String, password: String): (sessionID: String)`  
  - Requires: username exists and password matches  
  - Effect: authenticates user and creates a session  
