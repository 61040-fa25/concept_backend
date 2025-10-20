Removed video-related actions (uploadVideo, getUserVideos, deleteVideo) to maintain separation of concerns.

User now only handles account information (username, password) and authentication (register/login).

Ensures modularity: video management is not coupled to User.