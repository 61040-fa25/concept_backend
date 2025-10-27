---
timestamp: 'Wed Oct 22 2025 18:22:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251022_182218.ec68b219.md]]'
content_id: e2a32453b58cbf1b334d114cc1bffff0363061ed0043cc5e3fac3b9bec388bee
---

# file: src\concepts\Session\Session.spec

```
<concept_spec>

Concept UserSession

Purpose Enables the user to stay logged in during an interaction period so they can perform actions without authenticating each time

Principle The user is successfully authenticated, and a session is created and associated with the user. The user can extend their session or explicitly end it or allow it to expire after a fixed duration.

State
  A set of sessions with
    A userID
    An expiry time

Actions

startSession ( u : userID) : ( s : session)
requires a valid authenticated user
effects creates a session associated with the user and an expiry time
endSession ( s : session)
requires session is valid
effects deletes session
useSession (s : session)
requires session is not expired
effects allows user to proceed as authenticated user
extendSession (s : session)
requires valid session
effects deletes session and creates a new session for that user
System expire ( s : session)
requires session has passed expiry time
effects deletes session

</concept_spec>


```
