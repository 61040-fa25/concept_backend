---
timestamp: 'Tue Oct 21 2025 15:06:51 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_150651.d4d7b47d.md]]'
content_id: 0465e06efff3c30868c6d2b7bd08e4add324197f8a11c29c8f59ec8c1b58f0c2
---

# prompt:

Now, analyze the following Concept Specification and generate the API documentation based on these instructions.

**Concept: Posting \[User]**

Purpose: allow users to upload content

Principle: A user creates and publishes a post which can then be seen publically.

State:

```
a set of Posts with
  a body String
  an author User
```

Actions:

```
createPost (user: User, body: String):(post:Post)
  effects: creates a post with body by user and adds it to Posts set

deletePost (post: Post):(post:Post)
  effects: removes said post from Posts set

editPost (post: Post, newBody: String):(editedPost: Post)
  effects: replaces body of post with newBody
```

Queries:

```
_getPostsByAuthor(user: User)
  effects: returns posts authored by user

_getAllPosts()
  effects: returns all posts in db
```
