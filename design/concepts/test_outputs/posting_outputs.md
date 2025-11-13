Check file:///C:/Users/Akosua/Documents/6.104/skrib/src/concepts/skrib/Posting.test.ts

running 8 tests from ./src/concepts/skrib/Posting.test.ts

createPost - should create a new post successfully ...

------- output -------

Trace: createPost action for userA with body1.

  Action result: {"post":"0199fdb4-be5b-76a4-89d1-4e3be4612bdd"}

  Post found in DB: {"_id":"0199fdb4-be5b-76a4-89d1-4e3be4612bdd","author":"user:Alice","body":"This is my first post!"}

----- output end -----

createPost - should create a new post successfully ... ok (499ms)

editPost - should update the body of an existing post ...

------- output -------

Trace: createPost to set up for editPost. Post ID: 0199fdb4-c041-7158-8be6-e9fe1ef5e149

Trace: editPost action for postId 0199fdb4-c041-7158-8be6-e9fe1ef5e149 with newBody.

  Action result: {}

  Post found in DB after edit: {"_id":"0199fdb4-c041-7158-8be6-e9fe1ef5e149","author":"user:Alice","body":"Updated content here."}

----- output end -----

editPost - should update the body of an existing post ... ok (514ms)

editPost - should return an error if post does not exist ...

------- output -------

Trace: editPost action for non-existent post ID post:nonexistent.

  Action result: {"error":"Post with ID post:nonexistent not found."}

----- output end -----

editPost - should return an error if post does not exist ... ok (496ms)

deletePost - should remove an existing post ...

------- output -------

Trace: createPost to set up for deletePost. Post ID: 0199fdb4-c45f-784a-9f73-3d64b75437b3

Trace: deletePost action for postId 0199fdb4-c45f-784a-9f73-3d64b75437b3.

  Action result: {}

  Post found in DB after delete attempt: undefined

----- output end -----

deletePost - should remove an existing post ... ok (693ms)

deletePost - should return an error if post does not exist ...

------- output -------

Trace: deletePost action for non-existent post ID post:nonexistentToDelete.

  Action result: {"error":"Post with ID post:nonexistentToDelete not found."}

----- output end -----

deletePost - should return an error if post does not exist ... ok (460ms)

_getPostsByAuthor - should return all posts by a specific author ...

------- output -------

Trace: Setting up multiple posts for _getPostsByAuthor query.

  Created posts: 0199fdb4-c8ca-7184-a864-523595733c34, 0199fdb4-c8e9-7edb-a1e2-fc90077a4c02, 0199fdb4-c8fa-7431-bab8-5b087dfb9ba2

Trace: Calling _getPostsByAuthor for userA (user:Alice).

  Results for userA: [{"_id":"0199fdb4-c8ca-7184-a864-523595733c34","body":"Alice's first post"},{"_id":"0199fdb4-c8e9-7edb-a1e2-fc90077a4c02","body":"Alice's second post"}]

Trace: Calling _getPostsByAuthor for userB (user:Bob).

  Results for userB: [{"_id":"0199fdb4-c8fa-7431-bab8-5b087dfb9ba2","body":"Bob's post"}]

Trace: Calling _getPostsByAuthor for a non-existent user.

  Results for non-existent user: []

----- output end -----

_getPostsByAuthor - should return all posts by a specific author ... ok (559ms)

_getAllPosts - should return all posts in the database ...

------- output -------

Trace: Setting up posts for _getAllPosts query.

Trace: Calling _getAllPosts.

  All posts found: [{"_id":"0199fdb4-cb18-75e2-9835-eff3006f35b7","author":"user:Alice","body":"Post 1"},{"_id":"0199fdb4-cb37-7f64-8a7a-cdcb96fe51d7","author":"user:Bob","body":"Post 2"}]

----- output end -----

_getAllPosts - should return all posts in the database ... ok (543ms)

Principle Test: A user creates and publishes a post which can then be seen publically. ...

------- output -------

Trace: [Principle] User user:PrincipleAlice creates a post.

  Action: createPost(user:PrincipleAlice, "My public announcement!") -> { post: 0199fdb4-cd10-72ec-8eff-c22dc7d79c21 }

Trace: [Principle] Verify the post is publicly visible using _getAllPosts.

  Query: _getAllPosts({}) -> ["0199fdb4-cd10-72ec-8eff-c22dc7d79c21"]

Principle fully modeled: The post (ID: 0199fdb4-cd10-72ec-8eff-c22dc7d79c21) created by user:PrincipleAlice with body "My public announcement!" is now publically visible.

----- output end -----

Principle Test: A user creates and publishes a post which can then be seen publically. ... ok (468ms)



ok | 8 passed | 0 failed (4s)
