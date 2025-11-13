---
timestamp: 'Sat Oct 18 2025 17:03:56 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_170356.7b65d3f4.md]]'
content_id: f46ceecb19c7799167304744b5d56f3c31b14735a75477869abe731c60e9ab0c
---

# file: src/concepts/skrib/Upvoting.test.ts

```typescript
import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UpvotingConcept from "./Upvoting.ts";

Deno.test("UpvotingConcept: successful upvote of an item", async () => {
  console.log("\n--- Test: successful upvote of an item ---");
  const [db, client] = await testDb();
  const upvotingConcept = new UpvotingConcept(db);

  const userA = "user:Alice" as ID;
  const itemX = "item:X" as ID;

  console.log(`Action: User ${userA} upvotes Item ${itemX}`);
  const result = await upvotingConcept.upvote({ user: userA, item: itemX });

  assertEquals(result, {}, "Expected upvote to succeed with an empty result.");

  // Verify effects: vote is added
  const votesForItemX = await upvotingConcept._getUpvotesByItem({
    item: itemX,
  });
  console.log(
    `Query: _getUpvotesByItem for ${itemX}. Result:`,
    votesForItemX,
  );
  assertEquals(
    votesForItemX.length,
    1,
    "Expected 1 vote for item X after upvote.",
  );
  assertEquals(
    votesForItemX[0].user,
    userA,
    "Expected the vote to be from user A.",
  );
  assertEquals(
    votesForItemX[0].target,
    itemX,
    "Expected the vote to be for item X.",
  );

  const votesByUserA = await upvotingConcept._getUpvotessByUser({
    user: userA,
  });
  console.log(
    `Query: _getUpvotessByUser for ${userA}. Result:`,
    votesByUserA,
  );
  assertEquals(
    votesByUserA.length,
    1,
    "Expected 1 vote from user A after upvote.",
  );
  assertEquals(
    votesByUserA[0].user,
    userA,
    "Expected the vote to be from user A.",
  );
  assertEquals(
    votesByUserA[0].target,
    itemX,
    "Expected the vote to be for item X.",
  );

  await client.close();
  console.log("--- End Test: successful upvote of an item ---");
});

Deno.test("UpvotingConcept: preventing double voting", async () => {
  console.log("\n--- Test: preventing double voting ---");
  const [db, client] = await testDb();
  const upvotingConcept = new UpvotingConcept(db);

  const userA = "user:Alice" as ID;
  const itemX = "item:X" as ID;

  console.log(`Action: User ${userA} upvotes Item ${itemX} (first time)`);
  await upvotingConcept.upvote({ user: userA, item: itemX });

  console.log(`Action: User ${userA} upvotes Item ${itemX} (second time)`);
  const result = await upvotingConcept.upvote({ user: userA, item: itemX });

  // Verify requires: no vote by user for item
  assertEquals(
    result,
    { error: `User ${userA} has already upvoted ${itemX}` },
    "Expected error when user tries to upvote the same item twice.",
  );

  // Verify effects: no new vote is added
  const votesForItemX = await upvotingConcept._getUpvotesByItem({
    item: itemX,
  });
  console.log(
    `Query: _getUpvotesByItem for ${itemX}. Result:`,
    votesForItemX,
  );
  assertEquals(
    votesForItemX.length,
    1,
    "Expected only 1 vote for item X, despite double upvote attempt.",
  );

  await client.close();
  console.log("--- End Test: preventing double voting ---");
});

Deno.test("UpvotingConcept: successful unvote of an item", async () => {
  console.log("\n--- Test: successful unvote of an item ---");
  const [db, client] = await testDb();
  const upvotingConcept = new UpvotingConcept(db);

  const userA = "user:Alice" as ID;
  const itemX = "item:X" as ID;

  // Setup: first upvote the item to satisfy unvote's requirement
  console.log(`Setup: User ${userA} upvotes Item ${itemX}`);
  await upvotingConcept.upvote({ user: userA, item: itemX });
  let allVotes = await upvotingConcept._getAllUpvotes();
  console.log(`Setup: Current votes:`, allVotes);
  assertEquals(allVotes.length, 1, "Expected 1 vote before unvoting.");

  console.log(`Action: User ${userA} unvotes Item ${itemX}`);
  const result = await upvotingConcept.unvote({ user: userA, item: itemX });

  assertEquals(result, {}, "Expected unvote to succeed with an empty result.");

  // Verify effects: vote is removed
  allVotes = await upvotingConcept._getAllUpvotes();
  console.log(`Query: _getAllUpvotes after unvote. Result:`, allVotes);
  assertEquals(allVotes.length, 0, "Expected 0 votes after unvote.");

  await client.close();
  console.log("--- End Test: successful unvote of an item ---");
});

Deno.test("UpvotingConcept: attempting to unvote a non-existent vote", async () => {
  console.log("\n--- Test: attempting to unvote a non-existent vote ---");
  const [db, client] = await testDb();
  const upvotingConcept = new UpvotingConcept(db);

  const userA = "user:Alice" as ID;
  const itemX = "item:X" as ID;

  // Verify requires: a vote by user for item exists
  console.log(
    `Action: User ${userA} attempts to unvote Item ${itemX} (no prior upvote)`,
  );
  const result = await upvotingConcept.unvote({ user: userA, item: itemX });

  assertEquals(
    result,
    { error: `User ${userA} hasn't upvoted ${itemX}` },
    "Expected error when user tries to unvote an item not previously upvoted.",
  );

  // Verify effects: state remains unchanged (no vote to remove)
  const allVotes = await upvotingConcept._getAllUpvotes();
  console.log(`Query: _getAllUpvotes. Result:`, allVotes);
  assertEquals(allVotes.length, 0, "Expected 0 votes, as none were added.");

  await client.close();
  console.log("--- End Test: attempting to unvote a non-existent vote ---");
});

Deno.test("UpvotingConcept: Principle Test - Ranking items by popularity", async () => {
  console.log(
    "\n--- Principle Test: Ranking items by popularity ---",
  );
  const [db, client] = await testDb();
  const upvotingConcept = new UpvotingConcept(db);

  const userA = "user:Alice" as ID;
  const userB = "user:Bob" as ID;
  const userC = "user:Charlie" as ID;
  const itemX = "item:X" as ID;
  const itemY = "item:Y" as ID;
  const itemZ = "item:Z" as ID;

  console.log("Principle: Various users upvote items. Those items can then be ranked by number of votes.");

  // Trace 1: Initial upvotes
  console.log("\n--- Trace 1: Initial upvotes ---");
  console.log(`Action: ${userA} upvotes ${itemX}`);
  await upvotingConcept.upvote({ user: userA, item: itemX });
  console.log(`Action: ${userB} upvotes ${itemX}`);
  await upvotingConcept.upvote({ user: userB, item: itemX });
  console.log(`Action: ${userC} upvotes ${itemY}`);
  await upvotingConcept.upvote({ user: userC, item: itemY });
  console.log(`Action: ${userA} upvotes ${itemY}`);
  await upvotingConcept.upvote({ user: userA, item: itemY });
  console.log(`Action: ${userB} upvotes ${itemZ}`);
  await upvotingConcept.upvote({ user: userB, item: itemZ });

  // Verify initial state and rank
  console.log("\n--- Verifying initial ranks ---");
  const getVoteCount = async (item: ID) => {
    const votes = await upvotingConcept._getUpvotesByItem({ item });
    return votes.length;
  };

  let itemX_votes = await getVoteCount(itemX);
  let itemY_votes = await getVoteCount(itemY);
  let itemZ_votes = await getVoteCount(itemZ);

  console.log(`Item ${itemX} has ${itemX_votes} votes.`); // Expected 2
  console.log(`Item ${itemY} has ${itemY_votes} votes.`); // Expected 2
  console.log(`Item ${itemZ} has ${itemZ_votes} votes.`); // Expected 1

  assertEquals(itemX_votes, 2, `Expected ${itemX} to have 2 votes.`);
  assertEquals(itemY_votes, 2, `Expected ${itemY} to have 2 votes.`);
  assertEquals(itemZ_votes, 1, `Expected ${itemZ} to have 1 vote.`);

  // Manual ranking: (itemX, itemY) tie at 2 votes, then itemZ at 1.
  console.log(
    "Current Ranking (by vote count, highest first): Item X (2), Item Y (2), Item Z (1)",
  );

  // Trace 2: An unvote changes the ranking
  console.log("\n--- Trace 2: An unvote changes the ranking ---");
  console.log(`Action: ${userA} unvotes ${itemX}`);
  await upvotingConcept.unvote({ user: userA, item: itemX });

  // Verify updated state and rank
  console.log("\n--- Verifying updated ranks ---");
  itemX_votes = await getVoteCount(itemX);
  itemY_votes = await getVoteCount(itemY);
  itemZ_votes = await getVoteCount(itemZ);

  console.log(`Item ${itemX} has ${itemX_votes} votes.`); // Expected 1
  console.log(`Item ${itemY} has ${itemY_votes} votes.`); // Expected 2
  console.log(`Item ${itemZ} has ${itemZ_votes} votes.`); // Expected 1

  assertEquals(itemX_votes, 1, `Expected ${itemX} to have 1 vote after unvote.`);
  assertEquals(itemY_votes, 2, `Expected ${itemY} to still have 2 votes.`);
  assertEquals(itemZ_votes, 1, `Expected ${itemZ} to still have 1 vote.`);

  // Manual ranking: itemY at 2 votes, then (itemX, itemZ) tie at 1.
  console.log(
    "New Ranking (by vote count, highest first): Item Y (2), Item X (1), Item Z (1)",
  );

  await client.close();
  console.log(
    "--- End Principle Test: Ranking items by popularity ---",
  );
});
```
