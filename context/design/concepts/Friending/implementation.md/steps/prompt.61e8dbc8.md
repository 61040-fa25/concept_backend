---
timestamp: 'Wed Oct 15 2025 01:22:20 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_012220.53ccfc82.md]]'
content_id: 61e8dbc86b562a296aff4ab416c20b20d453afbff53fbe7691b2d64264499b9a
---

# prompt: Edit the queries such that their return types are as such:

* \_areFriends returns Promise<{ areFriends : boolean\[] }
* \_getFriends returns Promise<{ friends: User\[] }
* \_getSentFriendRequests returns Promise<{ sentRequests: User\[] }
* \_getReceivedFriendRequests returns Promise<{ receivedRequests: User\[] }

The Promises do not need to account for errors.
