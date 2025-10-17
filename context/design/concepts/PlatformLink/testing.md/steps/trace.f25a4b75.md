---
timestamp: 'Thu Oct 16 2025 23:01:41 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_230141.7882bf13.md]]'
content_id: f25a4b7595320ba7e87c3ea9f0742281299f654cb224ff70a145544c0426d4d0
---

# trace:

The operational principle of the `PlatformLink` concept is that a user can link their streaming platform account, which allows the application to securely interact with the platform on their behalf (e.g., check capabilities, refresh tokens) without other parts of the application needing to handle sensitive credentials. This lifecycle can be traced through the concept's actions:

1. **`link`**: A user `userA` decides to connect their Spotify account to the application. The application calls `PlatformLink.link({ userId: "user:A", platform: "spotify" })`. This action creates a new link record, stores a newly acquired access token and its expiration date, and returns a unique `linkId`.
2. **Grant Capability (External)**: As part of the authentication flow with Spotify, the application determines that `userA` has granted permission to `create_playlist`. The application's backend records this by inserting a document into the `PlatformLink.capabilities` collection: `{ linkId: <linkId_from_step_1>, capability: "create_playlist" }`.
3. **`can`**: Another concept in the application wants to create a playlist for `userA`. Before attempting the API call to Spotify, it first checks for permission by calling `PlatformLink.can({ linkId: <linkId_from_step_1>, capability: "create_playlist" })`. This returns `{ ok: true }` because the link is active (token is not expired) and the capability exists.
4. **`refresh`**: Some time later, a background job in the application notices the access token for the link is about to expire. It calls `PlatformLink.refresh({ linkId: <linkId_from_step_1> })`. The concept handles the logic of getting a new access token from Spotify, updates the link record with the new token and a new, later expiration time, and returns the new expiration time.
5. **`can` (Post-Refresh)**: The other concept again needs to check if it can create a playlist. It calls `PlatformLink.can(...)` as before. The result is still `{ ok: true }` because the token has been successfully refreshed.
6. **`revoke`**: The user `userA` decides they no longer want the application connected to their Spotify account. They click "Disconnect" in the UI, which triggers a call to `PlatformLink.revoke({ linkId: <linkId_from_step_1> })`. This action deletes the link record and all associated capabilities (including the `create_playlist` one).
7. **`can` (Post-Revoke)**: If any part of the system were to check for the capability again using the now-invalid `linkId`, `PlatformLink.can(...)` would return `{ ok: false }`, correctly reflecting that the application is no longer authorized to act on the user's behalf.
