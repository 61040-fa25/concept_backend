---
timestamp: 'Sun Oct 12 2025 20:47:02 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251012_204702.99eac4da.md]]'
content_id: 42ea60beb3125bfac85302c8c06d24bbe0c07f6f3806dcec9f98dfe9e63c1db8
---

# file: src/LikertSurvey/LikertSurveyConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNull, assertNotEquals } from "jsr:@std/assert";
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
    // Clear item1 ratings for a clean trace by unrating all existing for item1
    const currentItem1Ratings = await concept._getAllRatingsForItem({ item: item1 });
    for (const rating of currentItem1Ratings) {
      await concept.unrateItem({ user: rating.user, item: rating.item });
    }

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
    
    // Ensure timestamp is updated (though not explicitly asserted, crucial for effects)
    // For robust tests, one might capture and compare timestamps. Here, just checking it exists.
    assertExists(ratingA.timestamp);

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
