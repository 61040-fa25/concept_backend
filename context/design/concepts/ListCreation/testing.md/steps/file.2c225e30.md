---
timestamp: 'Sun Oct 12 2025 20:47:02 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_204702.99eac4da.md]]'
content_id: 2c225e302aa7869cee773e102d665017a25a08655e1630223f055c009cdf975d
---

# file: src/LikertSurvey/LikertSurveyConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

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

  // Define the fixed Likert scale (ScaleConfig implicitly here)
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
      { _id: ratingId }, // Find by composite ID
      {
        $set: { user, item, value, timestamp: now }, // Set all fields, including user and item for new inserts
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
