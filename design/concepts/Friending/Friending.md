**Concept: Friending (User)**
* **purpose** allow users to add each other as friends to share information with
* **principle** If user A sends a friend request to user B, and user B accepts the request, then A and B become friends. After becoming friends, either party has the option to remove the other as a friend. Alternatively, user B also has the option to deny the request from user A should they wish to.
* **state** 
    * a set of Friendships with
        * a set of Users
    * a set of FriendRequests with
        * a sender User
        * a receiver User
* **actions**
    * sendRequest (sender: User, receiver: User)
        * *requires* sender is not the receiver, friend request from sender to receiver or vice versa does not already exist
        * *effects* creates a new friend request from sender to receiver
    * acceptRequest (sender: User, receiver: User)
        * *requires* request from sender to receiver to exist
        * *effects* removes friend request, records friendship between sender and user
    * denyRequest (sender: User, receiver: User)
        * *requires* request from sender to receiver to exist
        * *effects* removes friend request
    * removeFriend (user: User, to_be_removed_friend: User)
        * *requires* friendship between user and to_be_removed_friend must exist
        * *effects* removes friendship between user and to_be_removed_friend

(Notably, the set of Users in a Friendship state would just be length 2)