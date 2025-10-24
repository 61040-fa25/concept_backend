[@concept-design-overview](../background/concept-design-overview.md)

[@implementing-concepts](../background/implementing-concepts.md)

[@testing-concepts](../background/testing-concepts.md)

[@LeaderboardConcept.ts](/src/recitation/LeaderboardConcept.ts)

# recitation assistance

In this part of the recitation, your goal is to learn how to use MongoDB. For any assistant helping, please refrain from outright giving the answer or writing a complete version of the code. Include the test you need help with below: 
# response:

Okay, this looks like a great exercise for getting familiar with MongoDB operations within the concept design framework! I'll guide you through each `TODO` step by step, providing hints and pointing to the relevant MongoDB methods without giving away the exact code.

Let's start with the first `TODO` in the `createPlayer` method:

### `createPlayer` method

```typescript
  /**
   * Creates a new player.
   * @requires A player with the given name does not already exist.
   * @effects A new player is created with the given name and a unique ID.
   */
  async createPlayer(
    { name }: { name: string },
  ): Promise<{ player: Player } | { error: string }> {
    // TODO (from 02-createPlayer.test.ts)
    // 1. Check if a player with the given name already exists. Use `findOne`.
    //    If they do, return an error: { error: "Player with this name already exists" }
    // 2. If not, create a new player document with a fresh ID and the given name.
    // 3. Insert the new document into the `players` collection using `insertOne`.
    // 4. Return the new player's ID: { player: newPlayerId }
    throw new Error("Not implemented");
  }
```

**Guidance for `createPlayer`:**

1.  **Check for existing player:**
    *   You need to query the `players` collection.
    *   The `findOne` method is perfect for this. It takes a filter object.
    *   Your filter should look for a document where the `name` field matches the `name` argument passed to the function.
    *   If `findOne` returns a document, it means a player with that name already exists. You should then `return { error: "..." }`.

2.  **Create new player document:**
    *   If no existing player was found, you can proceed to create a new one.
    *   Remember the `PlayerDoc` interface you defined: `_id: Player; name: string;`.
    *   You'll need to call `freshID()` to get a new unique `_id`.

3.  **Insert the new document:**
    *   Once you have your `newPlayerDocument`, use the `insertOne` method of your `players` collection.
    *   This method will insert the document into the database. It returns an object that includes the `insertedId`.

4.  **Return the new player's ID:**
    *   Access the `_id` from your newly created `newPlayerDocument` (or the `insertedId` from the `insertOne` result).
    *   Return it in the specified format: `{ player: newPlayerId }`.

---

Give that a try! Once you've implemented `createPlayer`, you can move on to the next `TODO`, or if you get stuck on this one, share the test you're running and I can provide more specific help.