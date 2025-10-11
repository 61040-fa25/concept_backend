---
timestamp: 'Fri Oct 10 2025 20:58:35 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251010_205835.269ffbb5.md]]'
content_id: 6ce39b7ab77cc2efd56c205fcf6dcd8ce186571e91506fedd0b89054a34aac38
---

# prompt: Please help implement this function that I have attached below

/\*\*

* Submits a new score for a player.
* @requires The player with the given ID exists.
* @effects A new score is recorded for the player.
  \*/
  async submitScore(
  { player, value }: { player: Player; value: number },
  ): Promise<{ score: Score } | { error: string }> {
  // TODO (from 07-errorHandling.test.ts)
  // Add a check here: before inserting a score, verify the player exists.
  // Use `findOne` on the `players` collection with the player's ID.
  // If no player is found, return { error: "Player not found" }.

// TODO (from 03-submitScore.test.ts)
// 1. Create a new score document with a fresh ID.
// 2. The document should include the player's ID, the score value, and the current date (`new Date()`).
// 3. Insert the document into the `scores` collection.
// 4. Return the new score's ID: { score: newScoreId }
throw new Error("Not implemented");
}
