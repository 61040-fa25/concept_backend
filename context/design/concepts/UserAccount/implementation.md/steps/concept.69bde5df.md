---
timestamp: 'Sun Oct 19 2025 22:47:57 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_224757.5ccc4f9a.md]]'
content_id: 69bde5dfadde6d33ab2387bf745d1adf2e0e48e3c2819c5904061cb5b2ccadfd
---

# concept: UserAccount

* **concept**: `UserAccount`
* **purpose**: To establish and manage a persistent, unique identity for a user within an application, associated with core identifying information like name and email.
* **principle**: If a user creates an account with a unique email and a name, the system creates a persistent record for that user. This record can later be retrieved using the email, and the user's name can be updated without affecting their unique identity.
* **state**:
  * a set of `User`s with
    * an `email` `String` (unique)
    * a `name` `String`
* **actions**:
  * `create(email: String, name: String): (user: User)`
    * **requires**: no `User` exists with the given `email`.
    * **effects**: a new `User` is created with the given `email` and `name`; returns the ID of the new `User`.
  * `create(email: String, name: String): (error: String)`
    * **requires**: a `User` already exists with the given `email`.
    * **effects**: returns an error message.
  * `updateName(user: User, newName: String): ()`
    * **requires**: `User` with id `user` exists.
    * **effects**: the `name` of the `User` is updated to `newName`.
  * `delete(user: User): ()`
    * **requires**: `User` with id `user` exists.
    * **effects**: the `User` is deleted.
* **queries**:
  * `_findUserByEmail(email: String): (user: User, name: String, email: String)`
    * **effects**: returns the `User` record associated with the given `email`.
  * `_getAccountInfo(user: User): (name: String, email: String)`
    * **effects**: returns the `email` and `name` for the given `User`.
