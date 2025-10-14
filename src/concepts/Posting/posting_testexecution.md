
--- Principle Test: Create, Edit, Delete ---
Alice creates post: user=user:Alice, images=[image:unsplash_abc1, image:unsplash_xyz2], caption='My first post about nature!' ->  { post: "0199e110-cf0b-7f9e-bfd9-6b4ff6087f88" }
Query post by ID 0199e110-cf0b-7f9e-bfd9-6b4ff6087f88:  {
  postDetails: [
    {
      _id: "0199e110-cf0b-7f9e-bfd9-6b4ff6087f88",
      caption: "My first post about nature!",
      images: [ "image:unsplash_abc1", "image:unsplash_xyz2" ],
      author: "user:Alice",
      createdAt: 2025-10-14T04:53:19.243Z
    }
  ]
}
Alice edits post 0199e110-cf0b-7f9e-bfd9-6b4ff6087f88: user=user:Alice, new_caption='' ->  {}
Query post by ID 0199e110-cf0b-7f9e-bfd9-6b4ff6087f88 after edit:  {
  postDetails: [
    {
      _id: "0199e110-cf0b-7f9e-bfd9-6b4ff6087f88",
      caption: "",
      images: [ "image:unsplash_abc1", "image:unsplash_xyz2" ],
      author: "user:Alice",
      createdAt: 2025-10-14T04:53:19.243Z
    }
  ]
}
Alice deletes post 0199e110-cf0b-7f9e-bfd9-6b4ff6087f88: user=user:Alice ->  {}
Query post by ID 0199e110-cf0b-7f9e-bfd9-6b4ff6087f88 after delete:  { postDetails: [] }

--- Scenario: Invalid Create Calls ---
Alice tries to create post with no images: user=user:Alice, images=[], caption='Post with no images' ->  { error: "Images cannot be empty for a post." }
Tries to create post with no user: user='', images=[image:unsplash_abc1], caption='Post by no user' ->  { error: "User ID must be provided." }

--- Scenario: Unauthorized Actions ---
Alice creates test post 0199e110-cfd8-7a53-b53a-db8e19f1292a:  { post: "0199e110-cfd8-7a53-b53a-db8e19f1292a" }
Bob tries to delete Alice's post 0199e110-cfd8-7a53-b53a-db8e19f1292a: user=user:Bob ->  { error: "Unauthorized: User is not the author of this post." }
Bob tries to edit Alice's post 0199e110-cfd8-7a53-b53a-db8e19f1292a: user=user:Bob, new_caption='Bob tries to change caption' ->  { error: "Unauthorized: User is not the author of this post." }

--- Scenario: Actions on Non-existent Posts ---
Alice tries to delete non-existent post 0199e110-d030-71c1-9cad-4d2495cf7724: ->  {
  error: "Post with ID '0199e110-d030-71c1-9cad-4d2495cf7724' not found."
}
Alice tries to edit non-existent post 0199e110-d030-71c1-9cad-4d2495cf7724: ->  {
  error: "Post with ID '0199e110-d030-71c1-9cad-4d2495cf7724' not found."
}

--- Scenario: Multiple Users and Posts ---
Alice creates post A1 (0199e110-d052-743e-b0f5-849c08ffc0f0):  { post: "0199e110-d052-743e-b0f5-849c08ffc0f0" }
Alice creates post A2 (0199e110-d065-7325-aa00-f3c26fa10080):  { post: "0199e110-d065-7325-aa00-f3c26fa10080" }
Bob creates post B1 (0199e110-d076-71cc-b6ec-f85441723f85):  { post: "0199e110-d076-71cc-b6ec-f85441723f85" }
Query posts by Alice (user:Alice):  {
  posts: [
    {
      _id: "0199e110-d065-7325-aa00-f3c26fa10080",
      caption: "Alice's second post",
      images: [ "image:unsplash_xyz2", "image:unsplash_def3" ],
      author: "user:Alice",
      createdAt: 2025-10-14T04:53:19.589Z
    },
    {
      _id: "0199e110-d052-743e-b0f5-849c08ffc0f0",
      caption: "Alice's first post",
      images: [ "image:unsplash_abc1" ],
      author: "user:Alice",
      createdAt: 2025-10-14T04:53:19.570Z
    }
  ]
}
Query posts by Bob (user:Bob):  {
  posts: [
    {
      _id: "0199e110-d076-71cc-b6ec-f85441723f85",
      caption: "Bob's only post",
      images: [ "image:unsplash_def3" ],
      author: "user:Bob",
      createdAt: 2025-10-14T04:53:19.606Z
    }
  ]
}
Query posts by Charlie (user:Charlie):  { posts: [] }
