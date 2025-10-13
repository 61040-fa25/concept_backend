
--- Principle Trace: Add, Edit, Delete ---
Action: addComment(user:Alice, "This is a great post!", post:Article123)
Result: { comment: "0199dc9c-0aa3-7bb5-9486-93f7593a8653" }
Query: _getComment(0199dc9c-0aa3-7bb5-9486-93f7593a8653) Result: {
  comment: {
    _id: "0199dc9c-0aa3-7bb5-9486-93f7593a8653",
    author: "user:Alice",
    content: "This is a great post!",
    post: "post:Article123",
    createdAt: 2025-10-13T08:07:17.923Z
  }
}
Action: editComment(user:Alice, 0199dc9c-0aa3-7bb5-9486-93f7593a8653, "This is an updated and even greater post!")
Result: {}
Query: _getComment(0199dc9c-0aa3-7bb5-9486-93f7593a8653) Result: {
  comment: {
    _id: "0199dc9c-0aa3-7bb5-9486-93f7593a8653",
    author: "user:Alice",
    content: "This is an updated and even greater post!",
    post: "post:Article123",
    createdAt: 2025-10-13T08:07:17.923Z,
    updatedAt: 2025-10-13T08:07:18.090Z
  }
}
Action: deleteComment(user:Alice, 0199dc9c-0aa3-7bb5-9486-93f7593a8653)
Result: {}
Query: _getComment(0199dc9c-0aa3-7bb5-9486-93f7593a8653) Result: {
  error: "Comment with ID '0199dc9c-0aa3-7bb5-9486-93f7593a8653' not found."
}

--- Scenario 1: Invalid addComment calls ---
Action: addComment(user:Alice, "", post:Article123)
Result: { error: "Comment content cannot be empty." }
Action: addComment(user:Alice, "   ", post:Article123)
Result: { error: "Comment content cannot be empty." }

--- Scenario 2: Invalid deleteComment calls ---
Action: deleteComment(user:Alice, 0199dc9c-0bab-751d-ab77-944797b91760)
Result: {
  error: "Comment with ID '0199dc9c-0bab-751d-ab77-944797b91760' not found."
}
Action: deleteComment(user:Bob, 0199dc9c-0bbd-7df5-8e6c-26fb1da01dea) (by wrong user)
Result: {
  error: "User 'user:Bob' is not the author of comment '0199dc9c-0bbd-7df5-8e6c-26fb1da01dea'."
}

--- Scenario 3: Invalid editComment calls ---
Action: editComment(user:Alice, 0199dc9c-0c07-7820-b7cf-187772cea165, "This is valid new content.")
Result: {
  error: "Comment with ID '0199dc9c-0c07-7820-b7cf-187772cea165' not found."
}
Action: editComment(user:Bob, 0199dc9c-0c19-7845-a887-8480fe374af4, "This is valid new content.") (by wrong user)
Result: {
  error: "User 'user:Bob' is not the author of comment '0199dc9c-0c19-7845-a887-8480fe374af4'."
}
Action: editComment(user:Alice, 0199dc9c-0c19-7845-a887-8480fe374af4, "")
Result: { error: "New comment content cannot be empty." }

--- Scenario 4: Multiple comments on a post ---
Action: addComment(user:Alice, "First comment by Alice on PostX.", post:Article123)
Result: { comment: "0199dc9c-0c65-7bad-a857-34cae8c4cf73" }
Action: addComment(user:Bob, "First comment by Bob on PostX.", post:Article123)
Result: { comment: "0199dc9c-0c79-7495-afd9-c932dcf9d930" }
Action: addComment(user:Alice, "Second comment by Alice on PostX.", post:Article123)
Result: { comment: "0199dc9c-0c8b-757d-9f7e-458ce1a4f141" }
Query: _getCommentsForPost(post:Article123)
Result: [
  "Second comment by Alice on PostX.",
  "First comment by Bob on PostX.",
  "First comment by Alice on PostX."
]

--- Scenario 5: User comments on multiple posts ---
Action: addComment(user:Alice, "Alice on PostX.", post:Article123)
Result: { comment: "0199dc9c-0d6b-71ce-824e-572ffee59c8a" }
Action: addComment(user:Alice, "Alice on PostY.", post:Image456)
Result: { comment: "0199dc9c-0d85-7614-8837-63fd6ab5bb36" }
Action: addComment(user:Bob, "Bob on PostX.", post:Article123)
Result: { comment: "0199dc9c-0d9c-78fe-b346-633fadfdd8c7" }
Query: _getCommentsByAuthor(user:Alice)
Result: [ "Alice on PostY.", "Alice on PostX." ]
