---
timestamp: 'Sun Oct 12 2025 17:11:51 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_171151.05149be4.md]]'
content_id: 5b50757f7eabbc5ba32383c7813896880e119a32ff9b6051c7638778f951d0e1
---

# concept: LikertSurvey

* **concept**: LikertSurvey \[User, Item]
* **purpose**: To gather quantitative feedback on items using a standardized Likert scale, allowing for analysis of sentiment and preferences.
* **principle**: A user can rate a specific item on a predefined Likert scale (e.g., 1-5). Once rated, the system records this rating. If the user rates the same item again, their previous rating is updated. The system can then provide aggregated data, such as the average rating for an item.
* **state**:
  * `Ratings`: a set of `Ratings` with
    * `_id`: a unique identifier for the rating (string combining `User` and `Item` for uniqueness per user per item)
    * `user`: User (ID)
    * `item`: Item (ID)
    * `value`: Number (integer representing the Likert scale value, e.g., 1-5)
    * `timestamp`: Date (the time the rating was last given/updated)
  * `ScaleConfig`: (This will be an internal constant for simplicity in this concept, assuming a fixed 1-5 scale. If configurable, it would be a separate state entity.)
    * `min_value`: Number = 1
    * `max_value`: Number = 5
* **actions**:
  * `rateItem (user: User, item: Item, value: Number)`
    * **requires**: `value` is an integer between `min_value` and `max_value` (inclusive).
    * **effects**: If no existing rating by `user` for `item`, a new `Rating` is created with the given `user`, `item`, `value`, and current `timestamp`. If an existing rating by `user` for `item` exists, its `value` and `timestamp` are updated.
  * `unrateItem (user: User, item: Item)`
    * **requires**: An existing `Rating` by `user` for `item` exists.
    * **effects**: The `Rating` by `user` for `item` is removed from the set of `Ratings`.
* **queries**:
  * `_getRating (user: User, item: Item) : Rating | null`
    * **effects**: Returns the `Rating` object by the specified `user` for the `item`, or `null` if not found.
  * `_getAverageRating (item: Item) : Number | null`
    * **effects**: Returns the average `value` of all ratings for the specified `item`, or `null` if no ratings exist for the item.
  * `_getAllRatingsForItem (item: Item) : Rating[]`
    * **effects**: Returns an array of all `Rating` objects for the specified `item`.

***

```typescript
// file: src/LikertSurvey/LikertSurveyConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
// Using `freshID` is generally for new top-level entities where a unique string ID is needed.
// For `Ratings`, we can use a composite ID based on user and item for easier lookup and uniqueness constraint.

// Declare collection prefix, use concept name
const PREFIX = "LikertSurvey" + ".";

// Generic types of this concept
type User = ID; // The ID of a user, external to LikertSurvey
type Item = ID; // The ID of an item being rated, external to LikertSurvey

/**
 * @interface RatingDocument
 * Represents a single user's rating of an item.
 * The _id combines user and item to ensure uniqueness per user per item.
 *
 * @state a set of Ratings with
 *   _id: a unique identifier for the rating (User-Item composite ID)
 *   user: User (ID)
 *   item: Item (ID)
 *   value: Number (integer representing the Likert scale value, e.g., 1-5)
 *   timestamp: Date (the time the rating was last given/updated)
 */
interface RatingDocument {
  _id: string; // Composite ID: `${User}-${Item}`
  user: User;
  item: Item;
  value: number;
  timestamp: Date;
}

export default class LikertSurveyConcept {
  private ratings: Collection<RatingDocument>;

  // Define the fixed Likert scale
  private readonly MIN_RATING_VALUE = 1;
  private readonly MAX_RATING_VALUE = 5;

  /**
   * @concept LikertSurvey
   * @purpose To gather quantitative feedback on items using a standardized Likert scale,
   *          allowing for analysis of sentiment and preferences.
   */
  constructor(private readonly db: Db) {
    this.ratings = this.db.collection(PREFIX + "ratings");
  }

  /**
   * @action rateItem
   * @principle A user can rate a specific item on a predefined Likert scale (e.g., 1-5).
   *            Once rated, the system records this rating. If the user rates the same item again,
   *            their previous rating is updated. The system can then provide aggregated data,
   *            such as the average rating for an item.
   *
   * Allows a user to rate a specific item on a Likert scale.
   * If a rating already exists for the user and item, it updates the existing rating.
   *
   * @param {object} params - The action arguments.
   * @param {User} params.user - The ID of the user giving the rating.
   * @param {Item} params.item - The ID of the item being rated.
   * @param {number} params.value - The rating value (integer, e.g., 1-5).
   * @returns {Empty | {error: string}} - An empty object on success, or an error message.
   *
   * @requires value is an integer between MIN_RATING_VALUE and MAX_RATING_VALUE (inclusive).
   * @effects If no existing rating by `user` for `item`, a new `Rating` is created with the given
   *          `user`, `item`, `value`, and current `timestamp`. If an existing rating by `user`
   *          for `item` exists, its `value` and `timestamp` are updated.
   */
  async rateItem({ user, item, value }: { user: User; item: Item; value: number }): Promise<Empty | { error: string }> {
    // Requires: value is an integer between MIN_RATING_VALUE and MAX_RATING_VALUE
    if (!Number.isInteger(value) || value < this.MIN_RATING_VALUE || value > this.MAX_RATING_VALUE) {
      return { error: `Rating value must be an integer between ${this.MIN_RATING_VALUE} and ${this.MAX_RATING_VALUE}.` };
    }

    const ratingId = `${user}-${item}`; // Composite ID for uniqueness per user per item
    const now = new Date();

    // Effects: Create or update the rating
    const updateResult = await this.ratings.updateOne(
      { _id: ratingId, user, item }, // Filter by composite ID and user/item
      {
        $set: { value, timestamp: now }, // Set new value and timestamp
        $setOnInsert: { user, item }, // Set user and item only on insert
      },
      { upsert: true }, // Create new document if not found
    );

    if (updateResult.acknowledged) {
      return {};
    } else {
      return { error: "Failed to create or update rating due to unknown database issue." };
    }
  }

  /**
   * @action unrateItem
   *
   * Removes a user's rating for a specific item.
   *
   * @param {object} params - The action arguments.
   * @param {User} params.user - The ID of the user whose rating is to be removed.
   * @param {Item} params.item - The ID of the item for which the rating is to be removed.
   * @returns {Empty | {error: string}} - An empty object on success, or an error message.
   *
   * @requires An existing `Rating` by `user` for `item` exists.
   * @effects The `Rating` by `user` for `item` is removed from the set of `Ratings`.
   */
  async unrateItem({ user, item }: { user: User; item: Item }): Promise<Empty | { error: string }> {
    const ratingId = `${user}-${item}`;

    // Check requires: An existing rating by user for item exists
    const existingRating = await this.ratings.findOne({ _id: ratingId });
    if (!existingRating) {
      return { error: `No rating found by user '${user}' for item '${item}'.` };
    }

    // Effects: Remove the rating
    const deleteResult = await this.ratings.deleteOne({ _id: ratingId });

    if (deleteResult.acknowledged && deleteResult.deletedCount === 1) {
      return {};
    } else {
      return { error: "Failed to delete rating due to unknown database issue." };
    }
  }

  // --- Concept Queries ---

  /**
   * @query _getRating
   * Returns a specific rating given by a user for an item.
   *
   * @param {object} params - The query arguments.
   * @param {User} params.user - The ID of the user.
   * @param {Item} params.item - The ID of the item.
   * @returns {Promise<RatingDocument | null>} - The RatingDocument if found, otherwise null.
   *
   * @effects Returns the `Rating` object by the specified `user` for the `item`, or `null` if not found.
   */
  async _getRating({ user, item }: { user: User; item: Item }): Promise<RatingDocument | null> {
    const ratingId = `${user}-${item}`;
    return this.ratings.findOne({ _id: ratingId });
  }

  /**
   * @query _getAverageRating
   * Calculates the average rating for a given item.
   *
   * @param {object} params - The query arguments.
   * @param {Item} params.item - The ID of the item.
   * @returns {Promise<number | null>} - The average rating (number) or null if no ratings exist for the item.
   *
   * @effects Returns the average `value` of all ratings for the specified `item`,
   *          or `null` if no ratings exist for the item.
   */
  async _getAverageRating({ item }: { item: Item }): Promise<number | null> {
    const result = await this.ratings.aggregate([
      { $match: { item: item } },
      { $group: { _id: "$item", averageRating: { $avg: "$value" } } },
    ]).toArray();

    if (result.length > 0 && result[0].averageRating !== null) {
      return result[0].averageRating;
    }
    return null;
  }

  /**
   * @query _getAllRatingsForItem
   * Retrieves all ratings for a given item.
   *
   * @param {object} params - The query arguments.
   * @param {Item} params.item - The ID of the item.
   * @returns {Promise<RatingDocument[]>} - An array of all RatingDocuments for the item.
   *
   * @effects Returns an array of all `Rating` objects for the specified `item`.
   */
  async _getAllRatingsForItem({ item }: { item: Item }): Promise<RatingDocument[]> {
    return this.ratings.find({ item }).toArray();
  }
}
```

***

```typescript
// file: src/LikertSurvey/LikertSurveyConcept.test.ts

import { assertEquals, assertExists, assertNull, assertGreaterOrEqual, assertLessOrEqual } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import LikertSurveyConcept from "@concepts/LikertSurvey/LikertSurveyConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("LikertSurveyConcept", async (t) => {
  const [db, client] = await testDb();
  const concept = new LikertSurveyConcept(db);

  // Mock User and Item IDs
  const userA = "user:Alice" as ID;
  const userB = "user:Bob" as ID;
  const userC = "user:Charlie" as ID;
  const item1 = "item:ProductX" as ID;
  const item2 = "item:ServiceY" as ID;

  await t.step("rateItem: should successfully create a new rating", async () => {
    const result = await concept.rateItem({ user: userA, item: item1, value: 4 });
    assertEquals(result, {}, "Should return empty object on success.");

    const rating = await concept._getRating({ user: userA, item: item1 });
    assertExists(rating);
    assertEquals(rating.user, userA);
    assertEquals(rating.item, item1);
    assertEquals(rating.value, 4);
    assertExists(rating.timestamp);

    const allRatings = await concept._getAllRatingsForItem({ item: item1 });
    assertEquals(allRatings.length, 1);
    assertEquals(allRatings[0].value, 4);
  });

  await t.step("rateItem: should successfully update an existing rating", async () => {
    // UserA changes their mind about item1
    const result = await concept.rateItem({ user: userA, item: item1, value: 5 });
    assertEquals(result, {}, "Should return empty object on success.");

    const rating = await concept._getRating({ user: userA, item: item1 });
    assertExists(rating);
    assertEquals(rating.user, userA);
    assertEquals(rating.item, item1);
    assertEquals(rating.value, 5, "Rating value should be updated.");
    assertExists(rating.timestamp); // Timestamp should also be updated

    const allRatings = await concept._getAllRatingsForItem({ item: item1 });
    assertEquals(allRatings.length, 1, "Should still be one rating from userA for item1.");
    assertEquals(allRatings[0].value, 5);
  });

  await t.step("rateItem: should return an error for out-of-bounds rating values", async () => {
    const resultLow = await concept.rateItem({ user: userB, item: item1, value: 0 });
    assertExists((resultLow as { error: string }).error, "Should return an error for value < 1.");
    assertEquals((resultLow as { error: string }).error, "Rating value must be an integer between 1 and 5.");

    const resultHigh = await concept.rateItem({ user: userB, item: item1, value: 6 });
    assertExists((resultHigh as { error: string }).error, "Should return an error for value > 5.");
    assertEquals((resultHigh as { error: string }).error, "Rating value must be an integer between 1 and 5.");

    const resultDecimal = await concept.rateItem({ user: userB, item: item1, value: 3.5 });
    assertExists((resultDecimal as { error: string }).error, "Should return an error for non-integer value.");
    assertEquals((resultDecimal as { error: string }).error, "Rating value must be an integer between 1 and 5.");

    const rating = await concept._getRating({ user: userB, item: item1 });
    assertNull(rating, "No rating should be created for invalid values.");
  });

  await t.step("unrateItem: should successfully remove an existing rating", async () => {
    // Add another rating by userB for item1
    await concept.rateItem({ user: userB, item: item1, value: 3 });
    let ratingB = await concept._getRating({ user: userB, item: item1 });
    assertExists(ratingB);

    const result = await concept.unrateItem({ user: userB, item: item1 });
    assertEquals(result, {}, "Should return empty object on success.");

    ratingB = await concept._getRating({ user: userB, item: item1 });
    assertNull(ratingB, "Rating should be removed.");

    const allRatings = await concept._getAllRatingsForItem({ item: item1 });
    assertEquals(allRatings.length, 1, "Only userA's rating should remain.");
    assertEquals(allRatings[0].user, userA);
  });

  await t.step("unrateItem: should return an error if rating does not exist", async () => {
    const result = await concept.unrateItem({ user: userC, item: item1 }); // UserC never rated item1
    assertExists((result as { error: string }).error, "Should return an error for non-existent rating.");
    assertEquals((result as { error: string }).error, `No rating found by user '${userC}' for item '${item1}'.`);
  });

  await t.step("_getAverageRating: should calculate average correctly with multiple ratings", async () => {
    // Current: UserA rates item1 at 5
    await concept.rateItem({ user: userB, item: item1, value: 2 }); // Add UserB's rating for item1
    await concept.rateItem({ user: userC, item: item1, value: 3 }); // Add UserC's rating for item1

    const average = await concept._getAverageRating({ item: item1 });
    assertExists(average);
    // (5 + 2 + 3) / 3 = 10 / 3 = 3.333...
    assertEquals(average, 10 / 3);

    const allRatings = await concept._getAllRatingsForItem({ item: item1 });
    assertEquals(allRatings.length, 3);
  });

  await t.step("_getAverageRating: should return null if no ratings exist for an item", async () => {
    const average = await concept._getAverageRating({ item: item2 }); // item2 has no ratings yet
    assertNull(average);
  });

  await t.step("_getAllRatingsForItem: should return all ratings for a specific item", async () => {
    await concept.rateItem({ user: userA, item: item2, value: 1 });
    await concept.rateItem({ user: userB, item: item2, value: 5 });

    const ratings = await concept._getAllRatingsForItem({ item: item2 });
    assertExists(ratings);
    assertEquals(ratings.length, 2);
    const ratingValues = ratings.map(r => r.value).sort();
    assertEquals(ratingValues, [1, 5]);

    const average = await concept._getAverageRating({ item: item2 });
    assertEquals(average, 3); // (1+5)/2 = 3
  });

  await t.step("Principle Trace: user rates an item, then updates their rating, then another user rates the same item. Check the average rating.", async () => {
    // Clear item1 ratings for a clean trace
    await concept.unrateItem({ user: userA, item: item1 });
    await concept.unrateItem({ user: userB, item: item1 });
    await concept.unrateItem({ user: userC, item: item1 });

    let averageRatingItem1 = await concept._getAverageRating({ item: item1 });
    assertNull(averageRatingItem1, "No ratings for item1 initially.");

    // 1. UserA rates item1
    await concept.rateItem({ user: userA, item: item1, value: 2 });
    averageRatingItem1 = await concept._getAverageRating({ item: item1 });
    assertEquals(averageRatingItem1, 2);
    let ratingA = await concept._getRating({ user: userA, item: item1 });
    assertExists(ratingA);
    assertEquals(ratingA.value, 2);

    // 2. UserA updates their rating for item1
    await concept.rateItem({ user: userA, item: item1, value: 4 });
    averageRatingItem1 = await concept._getAverageRating({ item: item1 });
    assertEquals(averageRatingItem1, 4, "Average should reflect updated rating.");
    ratingA = await concept._getRating({ user: userA, item: item1 });
    assertExists(ratingA);
    assertEquals(ratingA.value, 4, "UserA's rating should be updated.");

    // 3. UserB rates the same item1
    await concept.rateItem({ user: userB, item: item1, value: 5 });
    averageRatingItem1 = await concept._getAverageRating({ item: item1 });
    // (4 + 5) / 2 = 4.5
    assertEquals(averageRatingItem1, 4.5, "Average should include UserB's rating.");

    const allRatingsItem1 = await concept._getAllRatingsForItem({ item: item1 });
    assertEquals(allRatingsItem1.length, 2, "Two distinct ratings should exist.");
  });

  await client.close();
});
```
