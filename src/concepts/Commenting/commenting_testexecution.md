
--- Principle Trace: Add, Edit, Delete ---
Action: addComment(user:Alice, "This is a great post!", post:Article123)
Result: { comment: "0199e0fd-d6ec-72f1-b83a-13708996396c" }
Query: _getComment(0199e0fd-d6ec-72f1-b83a-13708996396c) Result: {
  comments: [
    {
      _id: "0199e0fd-d6ec-72f1-b83a-13708996396c",
      author: "user:Alice",
      content: "This is a great post!",
      post: "post:Article123",
      createdAt: 2025-10-14T04:32:36.077Z
    }
  ]
}
Action: editComment(user:Alice, 0199e0fd-d6ec-72f1-b83a-13708996396c, "This is an updated and even greater post!")
Result: {}
Query: _getComment(0199e0fd-d6ec-72f1-b83a-13708996396c) Result: {
  comments: [
    {
      _id: "0199e0fd-d6ec-72f1-b83a-13708996396c",
      author: "user:Alice",
      content: "This is an updated and even greater post!",
      post: "post:Article123",
      createdAt: 2025-10-14T04:32:36.077Z,
      updatedAt: 2025-10-14T04:32:36.160Z
    }
  ]
}
Action: deleteComment(user:Alice, 0199e0fd-d6ec-72f1-b83a-13708996396c)
Result: {}
Query: _getComment(0199e0fd-d6ec-72f1-b83a-13708996396c) Result: {
  error: "Comment with ID '0199e0fd-d6ec-72f1-b83a-13708996396c' not found."
}

--- Scenario 1: Invalid addComment calls ---
Action: addComment(user:Alice, "", post:Article123)
Result: { error: "Comment content cannot be empty." }
Action: addComment(user:Alice, "   ", post:Article123)
Result: { error: "Comment content cannot be empty." }

--- Scenario 2: Invalid deleteComment calls ---
Action: deleteComment(user:Alice, 0199e0fd-d79b-7cfa-a537-365b02cbfd06)
Result: {
  error: "Comment with ID '0199e0fd-d79b-7cfa-a537-365b02cbfd06' not found."
}
Action: deleteComment(user:Bob, 0199e0fd-d7ad-7ac8-84f0-34eb8f1cab60) (by wrong user)
Result: {
  error: "User 'user:Bob' is not the author of comment '0199e0fd-d7ad-7ac8-84f0-34eb8f1cab60'."
}

--- Scenario 3: Invalid editComment calls ---
Action: editComment(user:Alice, 0199e0fd-d7f4-7d9d-bee1-b51593d140ae, "This is valid new content.")
Result: {
  error: "Comment with ID '0199e0fd-d7f4-7d9d-bee1-b51593d140ae' not found."
}
Action: editComment(user:Bob, 0199e0fd-d805-79ba-99d2-0cc858746695, "This is valid new content.") (by wrong user)
Result: {
  error: "User 'user:Bob' is not the author of comment '0199e0fd-d805-79ba-99d2-0cc858746695'."
}
Action: editComment(user:Alice, 0199e0fd-d805-79ba-99d2-0cc858746695, "")
Result: { error: "New comment content cannot be empty." }

--- Scenario 4: Multiple comments on a post ---
Action: addComment(user:Alice, "First comment by Alice on PostX.", post:Article123)
Result: { comment: "0199e0fd-d84c-7931-a4e2-fb7058833b81" }
Action: addComment(user:Bob, "First comment by Bob on PostX.", post:Article123)
Result: { comment: "0199e0fd-d85f-7e03-ad3d-88aa88e8ccb0" }
Action: addComment(user:Alice, "Second comment by Alice on PostX.", post:Article123)
Result: { comment: "0199e0fd-d871-73a9-af8a-25841900a738" }
Query: _getCommentsForPost(post:Article123)
Result: [
  "Second comment by Alice on PostX.",
  "First comment by Bob on PostX.",
  "First comment by Alice on PostX."
]

--- Scenario 5: User comments on multiple posts ---
Action: addComment(user:Alice, "Alice on PostX.", post:Article123)
Result: { comment: "0199e0fd-d902-716f-be2b-9d1e619528ea" }
Action: addComment(user:Alice, "Alice on PostY.", post:Image456)
Result: { comment: "0199e0fd-d915-7c18-85ad-13174c2fa4e7" }
Action: addComment(user:Bob, "Bob on PostX.", post:Article123)
Result: { comment: "0199e0fd-d929-7531-86b0-beb33d33162e" }
Query: _getCommentsByAuthor(user:Alice)
Result: [ "Alice on PostY.", "Alice on PostX." ]
