# Design Changes

* I removed the precondition that the sender and receiver exist from my sendRequest action as per the advice of Daniel on [Piazza](https://piazza.com/class/melw05erqym3qt/post/165).
* I edited my principle to reflect an operational scenario better.
* I split my state up into a set of Friendships and a set of FriendRequests. This cleans up things quite a bit compared to trying to group friend requests by user from the get-go.
* I edited my sendRequest action slightly to include a precondition that a friend request from receiver to sender also should not exist. I believe this makes sense as there's no functional utility in sending a friend request to someone who has already requested to friend you earlier.
* I added a "denyRequest" action. From a user perspective, this makes sense in case someone does not want to give someone else access to their information. This also reflects what many existing social media apps also have.

# Other Issues

No other issues that I can think of. There were certainly many issues beforehand, but I think that the spec modifications and lots of iterative implementation did well to resolve them.
