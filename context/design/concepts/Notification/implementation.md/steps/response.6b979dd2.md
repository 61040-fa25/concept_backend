---
timestamp: 'Wed Oct 15 2025 00:17:06 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_001706.3b379bf4.md]]'
content_id: 6b979dd25d98f1e99a0a1937ad0a1f842a79479d8ddd54c45ef3d5e8591bbf08
---

# response:

You are absolutely right. Exposing the full internal representation (`rep`) of the `Notification` object through `_getAllNotifications` is undesirable. The query should indeed return only the IDs.

I will update the `_getAllNotifications` query method to return an array of notification IDs, consistent with the principle of not exposing the full internal representation and adhering to the specified query return format (an array of dictionaries).
