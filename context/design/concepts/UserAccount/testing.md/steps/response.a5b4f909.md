---
timestamp: 'Thu Oct 23 2025 22:32:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_223236.7b2ef787.md]]'
content_id: a5b4f90924442f8bc24cea8529594405a7a3a96dd8742b1821f4282e49005224
---

# response:

That's a great question, and it touches on a nuanced point in the concept design philosophy!

Based on the documentation provided:

> **Concept queries**
> Queries are reads of the concept state. Explicit query specifications are often not required since the concept state is assumed to be visible, so that straightforward queries of the state do not need to be defined in advance. It can be useful, though, to define queries for particularly significant and non-trivial observations of the state.

Your `_getUserProfile` and `_findUserByEmail` queries fall into the category of "straightforward queries." They are direct reads or lookups of the data stored within the `UserAccount` concept's state. They don't involve complex calculations or aggregations like the `_countMutualFriends` example given in the documentation.

**Therefore, they are technically "fine as is" as implicit queries that are part of the concept's observable behavior, but not formally specified in the `.concept` file.**

However, there's a good argument for making them explicit:

1. **Clarity and Documentation:** Even if straightforward, explicitly listing them in the concept specification clarifies that these are *intended* ways for other parts of the system (or even users, conceptually) to observe the state of the `UserAccount` concept. It makes the concept's full external interface explicit.
2. **Consistency:** If you eventually have "particularly significant and non-trivial" queries that *must* be specified, it creates a consistent pattern to specify all queries that are part of the concept's public API.
3. **Design Intent:** By including them, you are formally stating that fetching a user's public profile data or checking for an email's existence are part of the *intended* functionality and purpose of the `UserAccount` concept.

**My recommendation is to make them explicit in the concept specification.** It enhances the clarity, completeness, and documentation of your concept's design, treating them as first-class elements of its user-facing functionality.

Here's how you could add them to your `UserAccount` concept specification:

```
concept UserAccount
purpose to securely identify and authenticate users
principle a user must register and log in to be identified

state
a set of Users with
an email String
a passwordHash String
a displayName String

actions
register (email: String, password: String, displayName: String): (user: User)
register (email: String, password: String, displayName: String): (error: String)
requires email is not already in use
effect creates a new user
login (email: String, password: String): (user: User)
login (email: String, password: String): (error: String)
effect authenticates the user, creating a session (note: Session concept handles actual session creation)
updateProfile (user: User, newDisplayName: String)
updateProfile (user: User, newDisplayName: String): (error: String)
effect changes the user's displayName
deleteAccount (user: User)
deleteAccount (user: User): (error: String)
effect removes the user and all their associated data

queries
_getUserProfile (user: User): (displayName: String, email: String)
_getUserProfile (user: User): (error: String)
effects returns the display name and email of a user.
_findUserByEmail (email: String): (user: User)
_findUserByEmail (email: String): (error: String)
effects returns the user ID if an email exists.
```

**Note on `Empty` vs `error: String` for queries:**
For queries, if there's no result, you'd typically return `null` or an empty array (for list queries) in the implementation, and the specification would reflect that the result is optional. For simplicity, I've added an `error: String` return type to the queries in the example above, similar to actions, to reflect the possibility of a user not being found. If the query returns `null` for "not found" without considering it an "error", you might just omit the error return type for queries.

\`
concept UserAccount
purpose to securely identify and authenticate users
principle a user must register and log in to be identified

state
a set of Users with
an email String
a passwordHash String
a displayName String

actions
register (email: String, password: String, displayName: String)
requires email is not already in use
effect creates a new user
login (email: String, password: String)
effect authenticates the user, creating a session
updateProfile (user: User, newDisplayName: String)
effect changes the user's displayName
deleteAccount (user: User)
effect removes the user and all their associated data
