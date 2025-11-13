// import { Deno } from "@deno/runtime";
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import UpvotingConcept from "./UpvotingConcept.ts"; // Adjust path if necessary

Deno.test("UpvotingConcept: Action and Principle Tests", async (t) => {

  // Define some test users and items
  const userA: ID = "user:Alice" as ID;
  const userB: ID = "user:Bob" as ID;
  const userC: ID = "user:Charlie" as ID;
  const item1: ID = "item:Post1" as ID;
  const item2: ID = "item:Post2" as ID;
  const item3: ID = "item:Comment3" as ID;

  const [db, client] = await testDb();
  const upvotingConcept = new UpvotingConcept(db);

  await t.step("upvote: successfully adds a vote", async () => {
    // const [db, client] = await testDb();
    // const upvotingConcept = new UpvotingConcept(db);

    console.log("\n--- Test: upvote: successfully adds a vote ---");

    // Initial state check
    const initialVotes = await upvotingConcept._getAllUpvotes({});
    assertEquals(initialVotes.length, 0, "Initially, no votes should exist.");
    console.log(`Initial votes: ${initialVotes.length}`);

    // Action: User A upvotes Item 1
    const result = await upvotingConcept.upvote({ user: userA, item: item1 });
    assertEquals(result, {success: "successful upvote"}, "Upvote should return an empty object on success.");
    console.log(`User ${userA} upvoted ${item1}. Result: ${JSON.stringify(result)}`);

    // Effect verification: Check if the vote exists
    const votesByItem1 = await upvotingConcept._getUpvotesByItem({ item: item1 });
    assertEquals(votesByItem1.length, 1, "There should be 1 vote for item1.");
    assertEquals(votesByItem1[0].user, userA, "The vote should be from User A.");
    assertEquals(votesByItem1[0].target, item1, "The vote should be for Item 1.");
    assertExists(votesByItem1[0]._id, "The vote should have an _id.");
    console.log(`Votes for ${item1}: ${JSON.stringify(votesByItem1)}`);

    const votesByUserA = await upvotingConcept._getUpvotessByUser({ user: userA });
    assertEquals(votesByUserA.length, 1, "User A should have 1 vote.");
    assertEquals(votesByUserA[0].target, item1, "User A's vote should be for Item 1.");
    console.log(`Votes by ${userA}: ${JSON.stringify(votesByUserA)}`);

    // await client.close();
  });

  await t.step("upvote: requires no existing vote by user for item", async () => {
    // const [db, client] = await testDb();
    // const upvotingConcept = new UpvotingConcept(db);

    console.log("\n--- Test: upvote: requires no existing vote by user for item ---");

    // Action: User A tries to upvote Item 1 again
    const result = await upvotingConcept.upvote({ user: userA, item: item1 });
    assertNotEquals(result, {success: "successful upvote"}, "Upvoting an already upvoted item should return an error.");
    assertEquals(
      (result as { error: string }).error,
      `User ${userA} has already upvoted ${item1}`,
      "Error message should indicate a duplicate vote.",
    );
    console.log(`User ${userA} tried to upvote ${item1} again. Result: ${JSON.stringify(result)}`);

    // Effect verification: State should not change
    const votesByItem1 = await upvotingConcept._getUpvotesByItem({ item: item1 });
    assertEquals(votesByItem1.length, 1, "There should still be only 1 vote for item1.");
    console.log(`Votes for ${item1} after failed attempt: ${JSON.stringify(votesByItem1)}`);

    // await client.close();
  });

  await t.step("unvote: successfully removes a vote", async () => {
    // const [db, client] = await testDb();
    // const upvotingConcept = new UpvotingConcept(db);

    console.log("\n--- Test: unvote: successfully removes a vote ---");

    // Pre-condition: User A has voted for Item 1 (from previous test, or explicit setup here)
    const preUnvoteVotes = await upvotingConcept._getUpvotesByItem({ item: item1 });
    assertEquals(preUnvoteVotes.length, 1, "Pre-condition: 1 vote should exist for item1.");
    console.log(`Pre-unvote votes for ${item1}: ${JSON.stringify(preUnvoteVotes)}`);

    // Action: User A unvotes Item 1
    const result = await upvotingConcept.unvote({ user: userA, item: item1 });
    assertEquals(result, {success: "successful unvote"}, "Unvote should return an empty object on success.");
    console.log(`User ${userA} unvoted ${item1}. Result: ${JSON.stringify(result)}`);

    // Effect verification: Check if the vote is removed
    const postUnvoteVotes = await upvotingConcept._getUpvotesByItem({ item: item1 });
    assertEquals(postUnvoteVotes.length, 0, "No votes should exist for item1 after unvote.");
    console.log(`Post-unvote votes for ${item1}: ${JSON.stringify(postUnvoteVotes)}`);

    const votesByUserA = await upvotingConcept._getUpvotessByUser({ user: userA });
    assertEquals(votesByUserA.length, 0, "User A should have no votes after unvote.");
    console.log(`Votes by ${userA} after unvote: ${JSON.stringify(votesByUserA)}`);

    // await client.close();
  });

  await t.step("unvote: requires a vote by user for item exists", async () => {
    // const [db, client] = await testDb();
    // const upvotingConcept = new UpvotingConcept(db);

    console.log("\n--- Test: unvote: requires a vote by user for item exists ---");

    // Action: User A tries to unvote Item 2 (which they never voted for)
    const result = await upvotingConcept.unvote({ user: userA, item: item2 });
    assertNotEquals(result, {success: "successful unvote"}, "Unvoting a non-existent vote should return an error.");
    assertEquals(
      (result as { error: string }).error,
      `User ${userA} hasn't upvoted ${item2}`,
      "Error message should indicate no existing vote.",
    );
    console.log(`User ${userA} tried to unvote ${item2} (no vote). Result: ${JSON.stringify(result)}`);

    // Effect verification: State should not change (no votes for item2 anyway)
    const votesByItem2 = await upvotingConcept._getUpvotesByItem({ item: item2 });
    assertEquals(votesByItem2.length, 0, "There should still be 0 votes for item2.");
    console.log(`Votes for ${item2} after failed attempt: ${JSON.stringify(votesByItem2)}`);

    // await client.close();
  });

  await t.step("Principle: Various users upvote items. Those items can then be ranked by number of votes.", async () => {
    const [dbp, clientp] = await testDb();
    const upvotingConcept = new UpvotingConcept(dbp);

    console.log("\n--- Principle Test: Ranking Items by Popularity ---");

    // --- Trace of actions to fulfill the principle ---

    // 1. User A upvotes Item 1
    console.log(`Action: ${userA} upvotes ${item1}`);
    await upvotingConcept.upvote({ user: userA, item: item1 });
    let votesItem1 = await upvotingConcept._getUpvotesByItem({ item: item1 });
    let votesItem2 = await upvotingConcept._getUpvotesByItem({ item: item2 });
    console.log(`Current votes: ${item1} (${votesItem1.length}), ${item2} (${votesItem2.length})`);
    assertEquals(votesItem1.length, 1);
    assertEquals(votesItem2.length, 0);

    // 2. User B upvotes Item 1
    console.log(`Action: ${userB} upvotes ${item1}`);
    await upvotingConcept.upvote({ user: userB, item: item1 });
    votesItem1 = await upvotingConcept._getUpvotesByItem({ item: item1 });
    votesItem2 = await upvotingConcept._getUpvotesByItem({ item: item2 });
    console.log(`Current votes: ${item1} (${votesItem1.length}), ${item2} (${votesItem2.length})`);
    assertEquals(votesItem1.length, 2);
    assertEquals(votesItem2.length, 0);

    // 3. User A upvotes Item 2
    console.log(`Action: ${userA} upvotes ${item2}`);
    await upvotingConcept.upvote({ user: userA, item: item2 });
    votesItem1 = await upvotingConcept._getUpvotesByItem({ item: item1 });
    votesItem2 = await upvotingConcept._getUpvotesByItem({ item: item2 });
    console.log(`Current votes: ${item1} (${votesItem1.length}), ${item2} (${votesItem2.length})`);
    assertEquals(votesItem1.length, 2);
    assertEquals(votesItem2.length, 1);

    // 4. User B upvotes Item 2
    console.log(`Action: ${userB} upvotes ${item2}`);
    await upvotingConcept.upvote({ user: userB, item: item2 });
    votesItem1 = await upvotingConcept._getUpvotesByItem({ item: item1 });
    votesItem2 = await upvotingConcept._getUpvotesByItem({ item: item2 });
    console.log(`Current votes: ${item1} (${votesItem1.length}), ${item2} (${votesItem2.length})`);
    assertEquals(votesItem1.length, 2);
    assertEquals(votesItem2.length, 2);

    // 5. User C upvotes Item 1
    console.log(`Action: ${userC} upvotes ${item1}`);
    await upvotingConcept.upvote({ user: userC, item: item1 });
    votesItem1 = await upvotingConcept._getUpvotesByItem({ item: item1 });
    votesItem2 = await upvotingConcept._getUpvotesByItem({ item: item2 });
    console.log(`Current votes: ${item1} (${votesItem1.length}), ${item2} (${votesItem2.length})`);
    assertEquals(votesItem1.length, 3);
    assertEquals(votesItem2.length, 2);

    // --- Verify ranking ---
    console.log("\nVerification: Check item popularity for ranking.");

    const item1Upvotes = await upvotingConcept._getUpvotesByItem({ item: item1 });
    const item2Upvotes = await upvotingConcept._getUpvotesByItem({ item: item2 });
    const item3Upvotes = await upvotingConcept._getUpvotesByItem({ item: item3 }); // Item3 has no votes

    console.log(`Item ${item1} has ${item1Upvotes.length} votes.`);
    console.log(`Item ${item2} has ${item2Upvotes.length} votes.`);
    console.log(`Item ${item3} has ${item3Upvotes.length} votes.`);

    assertEquals(item1Upvotes.length, 3, "Item 1 should have 3 votes.");
    assertEquals(item2Upvotes.length, 2, "Item 2 should have 2 votes.");
    assertEquals(item3Upvotes.length, 0, "Item 3 should have 0 votes.");

    // This confirms that we can retrieve vote counts, which is the basis for ranking.
    console.log("Principle demonstrated: Items can be ranked by the number of upvotes.");

    await clientp.close();
  });

  await client.close();
});
