---
timestamp: 'Wed Oct 15 2025 01:11:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_011136.be14885f.md]]'
content_id: c8fb2aa488cd1e46cf84d6e3dbde853a2e43fa13e957e5ebe92f35b29eda9b98
---

# concept: Friending (User)

* **purpose** allow users to add each other as friends to share information with
* **principle** Users can send friend requests to other users. Users who have received friend requests have the option to accept or deny the request. If a friend request (say between User A and User B) is accepted, then User A and User B become friends.
* **state**
  * a set of Friendships with
    * a friend 1 User
    * a friend 2 User
  * a set of FriendRequests with
    * a sender User
    * a receiver User
* **actions**
  * sendRequest (sender: User, receiver: User): (request: FriendRequest)
    * *requires* sender is not the receiver, friend request from sender to receiver or vice versa does not already exist, friendship between sender and receiver does not already exist
    * *effects* creates a new friend request from sender to receiver; returns the new request's ID
  * acceptRequest (sender: User, receiver: User)
    * *requires* request from sender to receiver to exist
    * *effects* removes friend request, records friendship between sender and user
  * denyRequest (sender: User, receiver: User)
    * *requires* request from sender to receiver to exist
    * *effects* removes friend request
  * removeFriend (user: User, to\_be\_removed\_friend: User)
    * *requires* friendship between user and to\_be\_removed\_friend must exist
    * *effects* removes friendship between user and to\_be\_removed\_friend
