
--- Principle Test: Create, Edit, Delete ---
Alice creates post: user=user:Alice, images=[image:unsplash_abc1, image:unsplash_xyz2], caption='My first post about nature!' ->  { post: "0199dc9d-4a60-74d9-bddb-16785c2b71cf" }
Query post by ID 0199dc9d-4a60-74d9-bddb-16785c2b71cf:  {
  postDetails: {
    _id: "0199dc9d-4a60-74d9-bddb-16785c2b71cf",
    caption: "My first post about nature!",
    images: [ "image:unsplash_abc1", "image:unsplash_xyz2" ],
    author: "user:Alice",
    createdAt: 2025-10-13T08:08:39.776Z
  }
}
Alice edits post 0199dc9d-4a60-74d9-bddb-16785c2b71cf: user=user:Alice, new_caption='' ->  {}
Query post by ID 0199dc9d-4a60-74d9-bddb-16785c2b71cf after edit:  {
  postDetails: {
    _id: "0199dc9d-4a60-74d9-bddb-16785c2b71cf",
    caption: "",
    images: [ "image:unsplash_abc1", "image:unsplash_xyz2" ],
    author: "user:Alice",
    createdAt: 2025-10-13T08:08:39.776Z
  }
}
Alice deletes post 0199dc9d-4a60-74d9-bddb-16785c2b71cf: user=user:Alice ->  {}
Query post by ID 0199dc9d-4a60-74d9-bddb-16785c2b71cf after delete:  {
  error: "Post with ID '0199dc9d-4a60-74d9-bddb-16785c2b71cf' not found."
}

--- Scenario: Invalid Create Calls ---
Alice tries to create post with no images: user=user:Alice, images=[], caption='Post with no images' ->  { error: "Images cannot be empty for a post." }
Tries to create post with no user: user='', images=[image:unsplash_abc1], caption='Post by no user' ->  { error: "User ID must be provided." }

--- Scenario: Unauthorized Actions ---
Alice creates test post 0199dc9d-4b96-78e8-9545-38d81e30dd09:  { post: "0199dc9d-4b96-78e8-9545-38d81e30dd09" }
Bob tries to delete Alice's post 0199dc9d-4b96-78e8-9545-38d81e30dd09: user=user:Bob ->  { error: "Unauthorized: User is not the author of this post." }
Bob tries to edit Alice's post 0199dc9d-4b96-78e8-9545-38d81e30dd09: user=user:Bob, new_caption='Bob tries to change caption' ->  { error: "Unauthorized: User is not the author of this post." }

--- Scenario: Actions on Non-existent Posts ---
Alice tries to delete non-existent post 0199dc9d-4bee-74d0-a393-e6d9838bc3cb: ->  {
  error: "Post with ID '0199dc9d-4bee-74d0-a393-e6d9838bc3cb' not found."
}
Alice tries to edit non-existent post 0199dc9d-4bee-74d0-a393-e6d9838bc3cb: ->  {
  error: "Post with ID '0199dc9d-4bee-74d0-a393-e6d9838bc3cb' not found."
}

--- Scenario: Multiple Users and Posts ---
Alice creates post A1 (0199dc9d-4c0e-76a6-8d35-2d1f80d2f470):  { post: "0199dc9d-4c0e-76a6-8d35-2d1f80d2f470" }
Alice creates post A2 (0199dc9d-4c20-7005-a7ed-ec2319d0bc47):  { post: "0199dc9d-4c20-7005-a7ed-ec2319d0bc47" }
Bob creates post B1 (0199dc9d-4c31-78fe-ab0a-c2544c5c88a8):  { post: "0199dc9d-4c31-78fe-ab0a-c2544c5c88a8" }
Query posts by Alice (user:Alice):  {
  posts: [
    {
      _id: "0199dc9d-4c20-7005-a7ed-ec2319d0bc47",
      caption: "Alice's second post",
      images: [ "image:unsplash_xyz2", "image:unsplash_def3" ],
      author: "user:Alice",
      createdAt: 2025-10-13T08:08:40.224Z
    },
    {
      _id: "0199dc9d-4c0e-76a6-8d35-2d1f80d2f470",
      caption: "Alice's first post",
      images: [ "image:unsplash_abc1" ],
      author: "user:Alice",
      createdAt: 2025-10-13T08:08:40.206Z
    }
  ]
}
Query posts by Bob (user:Bob):  {
  posts: [
    {
      _id: "0199dc9d-4c31-78fe-ab0a-c2544c5c88a8",
      caption: "Bob's only post",
      images: [ "image:unsplash_def3" ],
      author: "user:Bob",
      createdAt: 2025-10-13T08:08:40.241Z
    }
  ]
}
Query posts by Charlie (user:Charlie):  { posts: [] }
