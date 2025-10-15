
--- Principle Trace: Add, Edit, Delete ---

Action: addComment(user:Alice, "This is a great post!", post:Article123)
Result: { comment: "0199e615-6e95-7f34-8d10-da455aefd6c2" }
Query: _getComment(0199e615-6e95-7f34-8d10-da455aefd6c2) Result: {
  comments: [
    {
      _id: "0199e615-6e95-7f34-8d10-da455aefd6c2",
      author: "user:Alice",
      content: "This is a great post!",
      post: "post:Article123",
      createdAt: 2025-10-15T04:16:28.309Z
    }
  ]
}

Action: editComment(user:Alice, 0199e615-6e95-7f34-8d10-da455aefd6c2, "This is an updated and even greater post!")
Result: {}
Query: _getComment(0199e615-6e95-7f34-8d10-da455aefd6c2) Result: {
  comments: [
    {
      _id: "0199e615-6e95-7f34-8d10-da455aefd6c2",
      author: "user:Alice",
      content: "This is an updated and even greater post!",
      post: "post:Article123",
      createdAt: 2025-10-15T04:16:28.309Z
    }
  ]
}

Action: deleteComment(user:Alice, 0199e615-6e95-7f34-8d10-da455aefd6c2)
Result: {}
Query: _getComment(0199e615-6e95-7f34-8d10-da455aefd6c2) Result: {
  error: "Comment with ID '0199e615-6e95-7f34-8d10-da455aefd6c2' not found."
}

--- Scenario 1: Invalid addComment calls ---

Action: addComment(user:Alice, "", post:Article123)
Result: { error: "Comment content cannot be empty." }

Action: addComment(user:Alice, "   ", post:Article123)
Result: { error: "Comment content cannot be empty." }

--- Scenario 2: Invalid deleteComment calls ---

Action: deleteComment(user:Alice, 0199e615-6fa0-7d17-8a24-af35eeb9f06a)
Result: {
  error: "Comment with ID '0199e615-6fa0-7d17-8a24-af35eeb9f06a' not found."
}

Action: addComment(user:Alice, "A valid comment.", post:Article123)
Query: _getComment(0199e615-6fb5-73b7-97d1-6b98d8940a23) Result: {
  comments: [
    {
      _id: "0199e615-6fb5-73b7-97d1-6b98d8940a23",
      author: "user:Alice",
      content: "A valid comment.",
      post: "post:Article123",
      createdAt: 2025-10-15T04:16:28.597Z
    }
  ]
}

Action: deleteComment(user:Bob, 0199e615-6fb5-73b7-97d1-6b98d8940a23) (by wrong user)
Result: {
  error: "User 'user:Bob' is not the author of comment '0199e615-6fb5-73b7-97d1-6b98d8940a23'."
}

--- Scenario 3: Invalid editComment calls ---

Action: editComment(user:Alice, 0199e615-701d-74a6-9b51-6bfe640a2aed, "This is valid new content.")
Result: {
  error: "Comment with ID '0199e615-701d-74a6-9b51-6bfe640a2aed' not found."
}

Action: addComment(user:Alice, "Initial content.", post:Article123)
Query: _getComment(0199e615-7030-733f-adb9-7eedf0c4d232) Result: {
  comments: [
    {
      _id: "0199e615-7030-733f-adb9-7eedf0c4d232",
      author: "user:Alice",
      content: "Initial content.",
      post: "post:Article123",
      createdAt: 2025-10-15T04:16:28.720Z
    }
  ]
}

Action: editComment(user:Bob, 0199e615-7030-733f-adb9-7eedf0c4d232, "This is valid new content.") (by wrong user)
Result: {
  error: "User 'user:Bob' is not the author of comment '0199e615-7030-733f-adb9-7eedf0c4d232'."
}

Action: editComment(user:Alice, 0199e615-7030-733f-adb9-7eedf0c4d232, "")
Result: { error: "New comment content cannot be empty." }

--- Scenario 4: Multiple comments on a post ---

Action: addComment(user:Alice, "First comment by Alice on PostX.", post:Article123)
Result: { comment: "0199e615-7095-7275-8ffd-a303cdeb381c" }

Action: addComment(user:Bob, "First comment by Bob on PostX.", post:Article123)
Result: { comment: "0199e615-70ac-7c07-9daa-0929a4ae548a" }

Action: addComment(user:Alice, "Second comment by Alice on PostX.", post:Article123)
Result: { comment: "0199e615-7111-7939-81d9-a6eae1d93a70" }

Query: _getCommentsForPost(post:Article123)
Result: [
  "Second comment by Alice on PostX.",
  "First comment by Bob on PostX.",
  "First comment by Alice on PostX."
]

--- Scenario 5: User comments on multiple posts ---

Action: addComment(user:Alice, "Alice on PostX.", post:Article123)
Result: { comment: "0199e615-71b9-7488-80f7-21e53beba865" }

Action: addComment(user:Alice, "Alice on PostY.", post:Image456)
Result: { comment: "0199e615-71cf-7ccc-90da-a66372101424" }

Action: addComment(user:Bob, "Bob on PostX.", post:Article123)
Result: { comment: "0199e615-71e6-760f-9515-bf0daff51749" }

Query: _getCommentsByAuthor(user:Alice)
Result: [ "Alice on PostY.", "Alice on PostX." ]
