# Trace of actions shown in video
```-> /api/Commenting/_getCommentsByParent
  -> /api/Commenting/_getAllComments
  -> /api/Commenting/_getParent
  -> /api/Commenting/_getAuthor
  -> /api/Notifying/_getAllNotifications
  -> /api/Notifying/_getRecipient
  -> /api/Posting/_getAllPosts
  -> /api/Posting/_getAuthor
  -> /api/Sessioning/create
  -> /api/Sessioning/delete
  -> /api/Sessioning/_getUser
  -> /api/Shelving/_getShelvesByBook
  -> /api/Shelving/_getAllShelves
  -> /api/Shelving/_getShelfOwner
  -> /api/Tagging/_getBooksByLabel
  -> /api/Tagging/_getAllPublicTags
  -> /api/Tagging/_getAllTags
  -> /api/Tagging/_getTagOwner
  -> /api/Tagging/labelSubSet
  -> /api/Tagging/hasAtLeastOneLabel
  -> /api/Upvoting/_getUpvotesByItem
  -> /api/Upvoting/_getAllUpvotes

🚀 Requesting server listening for POST requests at base path of /api/*
Listening on http://0.0.0.0:10000/ (http://localhost:10000/)

[Requesting] Received request for path: /Authentication/register

Requesting.request {
  username: 'akosua',
  password: '123456',
  path: '/Authentication/register'
} => { request: '019a761e-9deb-7db5-81bf-978339f51e81' }

Authentication.register { username: 'akosua', password: '123456' } => { error: 'username is already in use' }

Requesting.respond {
  request: '019a761e-9deb-7db5-81bf-978339f51e81',
  error: 'username is already in use'
} => { request: '019a761e-9deb-7db5-81bf-978339f51e81' }

[Requesting] Received request for path: /Authentication/register

Requesting.request {
  username: 'akosuae',
  password: '123456',
  path: '/Authentication/register'
} => { request: '019a761e-bc22-7621-99da-64fd13b27044' }


Authentication.register { username: 'akosuae', password: '123456' } => { user: '019a761e-bcaa-70d0-aec8-86968dd06b8d' }

Requesting.respond {
  request: '019a761e-bc22-7621-99da-64fd13b27044',
  user: '019a761e-bcaa-70d0-aec8-86968dd06b8d'
} => { request: '019a761e-bc22-7621-99da-64fd13b27044' }

[Requesting] Received request for path: /Authentication/authenticate

Requesting.request {
  username: 'akosuae',
  password: '123456',
  path: '/Authentication/authenticate'
} => { request: '019a761e-be1d-70ce-ba0e-0f404ab5ba10' }

Authentication.authenticate { username: 'akosuae', password: '123456' } => { user: '019a761e-bcaa-70d0-aec8-86968dd06b8d' }

Sessioning.create { user: '019a761e-bcaa-70d0-aec8-86968dd06b8d' } => { session: '019a761e-bea5-792a-8751-b56c5190911c' }

Requesting.respond {
  request: '019a761e-be1d-70ce-ba0e-0f404ab5ba10',
  session: '019a761e-bea5-792a-8751-b56c5190911c'
} => { request: '019a761e-be1d-70ce-ba0e-0f404ab5ba10' }

[Requesting] Received request for path: /Notifying/_getNotificationsByUser

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  path: '/Notifying/_getNotificationsByUser'
} => { request: '019a761e-c323-73e9-9d96-6b723b493c7f' }

[Requesting] Received request for path: /Tagging/_getTagsByUser

Requesting.respond { request: '019a761e-c323-73e9-9d96-6b723b493c7f', notification: [] } => { request: '019a761e-c323-73e9-9d96-6b723b493c7f' }

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  path: '/Tagging/_getTagsByUser'
} => { request: '019a761e-c3fe-78fc-b0d5-cdfb359ebe02' }

Requesting.respond { request: '019a761e-c3fe-78fc-b0d5-cdfb359ebe02', tag: [] } => { request: '019a761e-c3fe-78fc-b0d5-cdfb359ebe02' }

[Requesting] Received request for path: /Upvoting/upvote

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  item: '019a757f-5093-7fbc-b7be-787b754d6436',
  path: '/Upvoting/upvote'
} => { request: '019a761f-1db3-7bef-ad9a-636f8c8a7d83' }

Upvoting.upvote {
  user: '019a761e-bcaa-70d0-aec8-86968dd06b8d',
  item: '019a757f-5093-7fbc-b7be-787b754d6436'
} => { success: 'successful upvote' }

Requesting.respond {
  request: '019a761f-1db3-7bef-ad9a-636f8c8a7d83',
  status: 'Successfully upvoted'
} => { request: '019a761f-1db3-7bef-ad9a-636f8c8a7d83' }

[Requesting] Received request for path: /Commenting/createComment

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  body: "Try reading Death on the Nile, it's really good!",
  item: '019a6fdf-951b-7d8a-bd1b-4c7f8a288b79',
  path: '/Commenting/createComment'
} => { request: '019a761f-9f10-74b9-a357-a30d084c4110' }

Commenting.createComment {
  user: '019a761e-bcaa-70d0-aec8-86968dd06b8d',
  body: "Try reading Death on the Nile, it's really good!",
  item: '019a6fdf-951b-7d8a-bd1b-4c7f8a288b79'
} => { comment: '019a761f-9f92-71dd-81a7-db9541504ba1' }

Requesting.respond {
  request: '019a761f-9f10-74b9-a357-a30d084c4110',
  comment: '019a761f-9f92-71dd-81a7-db9541504ba1'
} => { request: '019a761f-9f10-74b9-a357-a30d084c4110' }

Notifying.notify {
  message: 'You got a comment!',
  user: '019a4d30-b2c4-74db-a096-22e1b291e234',
  post: '019a6fdf-951b-7d8a-bd1b-4c7f8a288b79'
} => { notification: '019a761f-a12a-7d84-a4b8-dee59a4f58e5' }

[Requesting] Received request for path: /Tagging/_getTagsByBook

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  book: 'uyr8BAAAQBAJ',
  path: '/Tagging/_getTagsByBook'
} => { request: '019a7620-29e2-752a-a29e-d2332dae2ce7' }

Requesting.respond {
  request: '019a7620-29e2-752a-a29e-d2332dae2ce7',
  tag: [
    {
      book: 'uyr8BAAAQBAJ',
      user: '019a0926-6db7-7d3a-83ab-e85fde4d72da',
      _id: '019a09d1-d0ad-7080-84c4-a79fcd7c5eaa',
      label: 'dystopia'
    },
    {
      book: 'uyr8BAAAQBAJ',
      user: '019a0926-6db7-7d3a-83ab-e85fde4d72da',
      _id: '019a09d1-f943-77e6-8a3e-180a5cc30019',
      label: 'classics'
    },
    {
      book: 'uyr8BAAAQBAJ',
      user: '019a0926-6db7-7d3a-83ab-e85fde4d72da',
      _id: '019a09d2-0ea2-7c56-8a5f-4903e506556c',
      label: 'read'
    },
    {
      book: 'uyr8BAAAQBAJ',
      user: '019a757e-046a-74f0-b97f-5bb50c16a95a',
      _id: '019a75b2-8fde-722e-bdc3-c656f48d6430',
      label: 'classics',
      isPrivate: false
    },
    {
      book: 'uyr8BAAAQBAJ',
      user: '019a757e-046a-74f0-b97f-5bb50c16a95a',
      _id: '019a75b2-bb4c-7eee-bee8-451b1ee00c61',
      label: 'dystopia',
      isPrivate: false
    }

  ]
} => { request: '019a7620-29e2-752a-a29e-d2332dae2ce7' }

[Requesting] Received request for path: /Shelving/_getUserShelfByBook

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  book: 'uyr8BAAAQBAJ',
  path: '/Shelving/_getUserShelfByBook'
} => { request: '019a7620-2bdc-7716-aaf7-d68d28013620' }

Requesting.respond { request: '019a7620-2bdc-7716-aaf7-d68d28013620', shelfNumber: [] } => { request: '019a7620-2bdc-7716-aaf7-d68d28013620' }

[Requesting] Received request for path: /Shelving/addBook

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  status: '0',
  book: 'uyr8BAAAQBAJ',
  path: '/Shelving/addBook'
} => { request: '019a7620-53d8-799d-9eb8-e2235cba1884' }

Shelving.addBook {
  user: '019a761e-bcaa-70d0-aec8-86968dd06b8d',
  status: '0',
  book: 'uyr8BAAAQBAJ'
} => { shelf: '019a7620-549f-7a3e-8c7d-0b6d573e2a2e' }

Requesting.respond {
  request: '019a7620-53d8-799d-9eb8-e2235cba1884',
  shelf: '019a7620-549f-7a3e-8c7d-0b6d573e2a2e'
} => { request: '019a7620-53d8-799d-9eb8-e2235cba1884' }

[Requesting] Received request for path: /Shelving/_getBooksByUser

[Requesting] Received request for path: /Tagging/_getTagsByUser

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  path: '/Shelving/_getBooksByUser'
} => { request: '019a7620-616a-714a-abb1-acf16e51a8a5' }

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  path: '/Tagging/_getTagsByUser'
} => { request: '019a7620-6178-786d-b412-8ba149296295' }

Requesting.respond {
  request: '019a7620-616a-714a-abb1-acf16e51a8a5',
  shelf: [
    { status: 0, shelves: [Array] },
    { status: 1, shelves: [] },
    { status: 2, shelves: [] },
    { status: 3, shelves: [] }

  ]
} => { request: '019a7620-616a-714a-abb1-acf16e51a8a5' }

Requesting.respond { request: '019a7620-6178-786d-b412-8ba149296295', tag: [] } => { request: '019a7620-6178-786d-b412-8ba149296295' }

[Requesting] Received request for path: /Tagging/_getTagsByBook

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  book: 'Yz8Fnw0PlEQC',
  path: '/Tagging/_getTagsByBook'
} => { request: '019a7620-ab46-7420-a4d3-70a1a03e3119' }

Requesting.respond {
  request: '019a7620-ab46-7420-a4d3-70a1a03e3119',
  tag: [
    {
      book: 'Yz8Fnw0PlEQC',
      user: '019a4d30-b2c4-74db-a096-22e1b291e234',
      _id: '019a7176-9be0-7ff3-99a1-c9d64ea67d39',
      label: 'fav'
    }

  ]
} => { request: '019a7620-ab46-7420-a4d3-70a1a03e3119' }

[Requesting] Received request for path: /Shelving/_getUserShelfByBook

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  book: 'Yz8Fnw0PlEQC',
  path: '/Shelving/_getUserShelfByBook'
} => { request: '019a7620-ad25-79f5-a438-aa9897fd0257' }

Requesting.respond { request: '019a7620-ad25-79f5-a438-aa9897fd0257', shelfNumber: [] } => { request: '019a7620-ad25-79f5-a438-aa9897fd0257' }

[Requesting] Received request for path: /Tagging/addTag

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  label: 'young-adult',
  book: 'Yz8Fnw0PlEQC',
  path: '/Tagging/addTag'
} => { request: '019a7620-d7f2-77e7-af70-302479029571' }

Tagging.addTag {
  user: '019a761e-bcaa-70d0-aec8-86968dd06b8d',
  label: 'young-adult',
  book: 'Yz8Fnw0PlEQC'
} => { tag: '019a7620-d8b8-7b83-86ed-dc0d71c5938e' }

Requesting.respond {
  request: '019a7620-d7f2-77e7-af70-302479029571',
  tag: '019a7620-d8b8-7b83-86ed-dc0d71c5938e'
} => { request: '019a7620-d7f2-77e7-af70-302479029571' }

[Requesting] Received request for path: /Tagging/_getTagsByBook

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  book: 'Yz8Fnw0PlEQC',
  path: '/Tagging/_getTagsByBook'
} => { request: '019a7620-da20-731a-b99e-ac2b96b4bb25' }

Requesting.respond {
  request: '019a7620-da20-731a-b99e-ac2b96b4bb25',
  tag: [
    {
      book: 'Yz8Fnw0PlEQC',
      user: '019a4d30-b2c4-74db-a096-22e1b291e234',
      _id: '019a7176-9be0-7ff3-99a1-c9d64ea67d39',
      label: 'fav'
    },
    {
      book: 'Yz8Fnw0PlEQC',
      user: '019a761e-bcaa-70d0-aec8-86968dd06b8d',
      _id: '019a7620-d8b8-7b83-86ed-dc0d71c5938e',
      label: 'young-adult',
      isPrivate: false
    }

  ]
} => { request: '019a7620-da20-731a-b99e-ac2b96b4bb25' }

[Requesting] Received request for path: /Shelving/_getBooksByUser

[Requesting] Received request for path: /Tagging/_getTagsByUser

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  path: '/Shelving/_getBooksByUser'
} => { request: '019a7620-eadf-7874-811e-8cdb8dbb2e39' }

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  path: '/Tagging/_getTagsByUser'
} => { request: '019a7620-eae2-7457-982d-c5e43d65b5ac' }

Requesting.respond {
  request: '019a7620-eae2-7457-982d-c5e43d65b5ac',
  tag: [
    {
      user: '019a761e-bcaa-70d0-aec8-86968dd06b8d',
      _id: '019a7620-d8b8-7b83-86ed-dc0d71c5938e',
      label: 'young-adult',
      book: 'Yz8Fnw0PlEQC',
      isPrivate: false
    }

  ]
} => { request: '019a7620-eae2-7457-982d-c5e43d65b5ac' }

Requesting.respond {
  request: '019a7620-eadf-7874-811e-8cdb8dbb2e39',
  shelf: [
    { status: 0, shelves: [Array] },
    { status: 1, shelves: [] },
    { status: 2, shelves: [] },
    { status: 3, shelves: [] }

  ]
} => { request: '019a7620-eadf-7874-811e-8cdb8dbb2e39' }

[Requesting] Received request for path: /Tagging/_getTagsByUser

[Requesting] Received request for path: /Notifying/_getNotificationsByUser

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  path: '/Tagging/_getTagsByUser'
} => { request: '019a7621-15d7-7fc3-919f-a6ffb2ed83af' }

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  path: '/Notifying/_getNotificationsByUser'
} => { request: '019a7621-15df-73c3-af07-ae1edf55c666' }

Requesting.respond {
  request: '019a7621-15d7-7fc3-919f-a6ffb2ed83af',
  tag: [
    {
      user: '019a761e-bcaa-70d0-aec8-86968dd06b8d',
      _id: '019a7620-d8b8-7b83-86ed-dc0d71c5938e',
      label: 'young-adult',
      book: 'Yz8Fnw0PlEQC',
      isPrivate: false
    }

  ]
} => { request: '019a7621-15d7-7fc3-919f-a6ffb2ed83af' }

Requesting.respond { request: '019a7621-15df-73c3-af07-ae1edf55c666', notification: [] } => { request: '019a7621-15df-73c3-af07-ae1edf55c666' }

[Requesting] Received request for path: /Authentication/logout

Requesting.request {
  session: '019a761e-bea5-792a-8751-b56c5190911c',
  path: '/Authentication/logout'
} => { request: '019a7621-31dc-7c78-bb67-b54d30874122' }

Sessioning.delete { session: '019a761e-bea5-792a-8751-b56c5190911c' } => {}

Requesting.respond {
  request: '019a7621-31dc-7c78-bb67-b54d30874122',
  status: 'logged_out'
} => { request: '019a7621-31dc-7c78-bb67-b54d30874122' }```
