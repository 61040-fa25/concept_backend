---
timestamp: 'Sun Oct 12 2025 20:47:02 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_204702.99eac4da.md]]'
content_id: 9a17a6f3a631bb91ff3ecfdfc1b13710fa62bf2a105b2c926481df2ee71f56d4
---

# concept: LikertSurvey

* **concept**: LikertSurvey \[User, Item]
* **purpose**: To gather quantitative feedback on items using a standardized Likert scale, allowing for analysis of sentiment and preferences.
* **principle**: A user can rate a specific item on a predefined Likert scale (e.g., 1-5). Once rated, the system records this rating. If the user rates the same item again, their previous rating is updated. The system can then provide aggregated data, such as the average rating for an item.
* **state**:
  * `Ratings`: a set of `Ratings` with
    * `_id`: a unique identifier for the rating (string combining `User` and `Item` for uniqueness per user per item, e.g., "user:Alice-item:ProductX")
    * `user`: User (ID)
    * `item`: Item (ID)
    * `value`: Number (integer representing the Likert scale value, e.g., 1-5)
    * `timestamp`: Date (the time the rating was last given/updated)
  * `ScaleConfig`: (Internal constant for this concept: fixed 1-5 scale)
    * `min_value`: Number = 1
    * `max_value`: Number = 5
* **actions**:
  * `rateItem (user: User, item: Item, value: Number) : Empty | {error: String}`
    * **requires**: `value` is an integer between `min_value` and `max_value` (inclusive).
    * **effects**: If no existing rating by `user` for `item`, a new `Rating` is created with the given `user`, `item`, `value`, and current `timestamp`. If an existing rating by `user` for `item` exists, its `value` and `timestamp` are updated.
  * `unrateItem (user: User, item: Item) : Empty | {error: String}`
    * **requires**: An existing `Rating` by `user` for `item` exists.
    * **effects**: The `Rating` by `user` for `item` is removed from the set of `Ratings`.
* **queries**:
  * `_getRating (user: User, item: Item) : RatingDocument | null`
    * **effects**: Returns the `Rating` object by the specified `user` for the `item`, or `null` if not found.
  * `_getAverageRating (item: Item) : Number | null`
    * **effects**: Returns the average `value` of all ratings for the specified `item`, or `null` if no ratings exist for the item.
  * `_getAllRatingsForItem (item: Item) : RatingDocument[]`
    * **effects**: Returns an array of all `Rating` objects for the specified `item`.

***
