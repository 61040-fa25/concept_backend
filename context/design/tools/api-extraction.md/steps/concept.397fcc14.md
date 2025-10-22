---
timestamp: 'Tue Oct 21 2025 14:48:16 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251021_144816.15b99053.md]]'
content_id: 397fcc1413a24c79e84023dd0450665b1a909b0f0a6fbb11075c2133fecb3753
---

# concept: PlatformLink

* **concept**: PlatformLink \[User]
* **purpose**: Provide authenthicated access to a streaming platform. Give other concepts a safe way of talking to the streaming platform without leaking tokens
* **principle**: When a user goes onto our application and links their account sttreaming platform, they will be authenticated which means the app can verify capabilities and renew tokens. other concepts never touch credentials.
* **state**:
  * A set of `Users` with
    * a `userId` of type `String`
    * a `createdAt` timestamp of type `Float`
  * A set of `Links` with
    * a `linkId` of type `String`
    * a `userId` of type `String`
    * a `platform` of type `String`
    * an `accessToken` of type `String`
    * an `tokenExpiration` timestamp of type `Float`
  * A set of `Capabilities` with
    * a `linkId` of type `String`
    * a `capability` of type `String`
* **actions**:
  * `link(user: userId, platform: String): (linkId: String)`
    * **requires**: userId exists, platform is supported. NO existing link
    * **effects**: Creates and returns a new link (note: storing tokens)
  * `refresh(linkId: String): (newExpiration: Float)`
    * **requires**: link exists.
    * **effects**: Updates accessToken, prolongs and returns new expiration time
  * `revoke(linkId: String): (removed: Boolean)`
    * **requires**: Link exists
    * **effects**: Deletes links with associated tokens
  * `can(linkId: String, capability: String): (ok: Boolean)`
    * **effects**: returns whether a Link has the needed access and availability to do an action on the platform. Simply put, returns whether capability exists and token not expired.

Code:
