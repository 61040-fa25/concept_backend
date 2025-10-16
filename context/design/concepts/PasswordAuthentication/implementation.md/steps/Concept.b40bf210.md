---
timestamp: 'Wed Oct 15 2025 21:06:54 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_210654.aedea943.md]]'
content_id: b40bf21039fb93c6422af0b4eb77f69d5a7b7654bdca579621f1cd1a94e48421
---

# Concept: Sessioning

## purpose

To manage user sessions, allowing users to authenticate and maintain a persistent logged-in state across requests.

## principle

A user can only have one active session at a time. Sessions expire after a certain duration. Authentication requires valid credentials.

## state

```
a set of Users with
  an email String (unique)
  a passwordHash String

a set of Sessions with
  a userId User
  an expiry Number (timestamp)
  a token String (unique, secret)
```

## actions

```
createUser (email: String, password: String): (user: UserID | error: String)
login (email: String, password: String): (session: SessionID | error: String)
logout (token: String): (empty: Empty | error: String)
```

## queries

```
_validateSession (token: String): (session: {userId: UserID, expiry: Number, token: String} | error: String)
_getUserByEmail (email: String): (user: {id: UserID, email: String} | error: String)
_getSessionByToken (token: String): (session: {userId: UserID, expiry: Number, token: String} | error: String)
```

***
