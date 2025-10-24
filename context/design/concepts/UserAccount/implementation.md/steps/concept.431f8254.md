---
timestamp: 'Sun Oct 19 2025 22:49:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_224933.511be023.md]]'
content_id: 431f82543f9046d9fd18e2d17b90bfe410882dc3227cea219c6edcd148359934
---

# concept: UserAccount

* **concept**: UserAccount
* **purpose**: to securely identify and authenticate users
* **principle**: a user must register and log in to be identified
* **state**:
  * a set of Users with
    * an email String
    * a passwordHash String
    * a displayName String
* **actions**:
  * `register (email: String, password: String, displayName: String): (user: User) | (error: String)`
    * **requires**: email is not already in use
    * **effect**: creates a new user
  * `login (email: String, password: String): (user: User) | (error: String)`
    * **effect**: authenticates the user
  * `updateProfile (user: User, newDisplayName: String): () | (error: String)`
    * **effect**: changes the user's displayName
  * `deleteAccount (user: User): () | (error: String)`
    * **effect**: removes the user and all their associated data
