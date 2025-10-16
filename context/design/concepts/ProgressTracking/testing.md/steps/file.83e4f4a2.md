---
timestamp: 'Thu Oct 16 2025 10:32:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_103214.f2e300b6.md]]'
content_id: 83e4f4a29b8cb4635afd6b459f68341b92963168d9bd2b8a14407e185cc2d024
---

# file: src/concepts/ProgressTrackingConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import ProgressTrackingConcept from "./ProgressTrackingConcept.ts";
import { ID } from "@utils/types.ts";

// Generic types of this concept for testing
type User = ID;
type Plan = ID;
type TripCostEstimation = ID;

/**
 * Helper to extract a plan's details from the _getPlans query result.
 * This helper assumes _getPlans returns full plan details, as implemented
 * in ProgressTrackingConcept.ts to enable comprehensive testing.
 * (See the _getPlans method comment in ProgressTrackingConcept.ts for explanation).
 */
function getPlanDetails(
  plansOutput: Array<{ plans: any }>, // 'any' used here because the structure is nested
  planId: Plan,
) {
  const found = plansOutput.find((item) => item.plans.id === planId);
  return found ? found.plans : undefined;
}

Deno.test("ProgressTrackingConcept Tests", async (test) => {
  const [db, client] = await testDb();
  const concept = new ProgressTrackingConcept(db);

  // Deno.test.beforeAll hook ensures a clean database before running any tests in this file.
  // The database name used by testDb is configured via MONGO_DB_NAME env var.
  // The `testDb()` function itself calls `db.dropDatabase()` to ensure a clean slate.

  Deno.test.afterAll(async () => {
    // Clean up: close the database connection after all tests are done
    await client.close();
    console.log("\nDatabase connection closed after ProgressTrackingConcept tests.");
  });

  const userA: User = freshID();
  const tripA: TripCostEstimation = freshID();
  const tripB: TripCostEstimation = freshID();
  const userB: User = freshID();

  await test.step("Principle Test: Plan creation, contribution, modification, and goal tracking", async () => {
    console.log("\n--- Principle Test: Create, Add, Modify, Reach Goal, Remove, Delete ---");
    console.log("Principle: A plan breaks a trip’s cost into manageable contributions, the user sets a payment period and the amount to be paid every period. The user can also change those details for some trip.");

    // trace: 1. Create a plan for userA for tripA
    console.log(`\nAction: createPlan (user: ${userA.substring(0,8)}, trip: ${tripA.substring(0,8)}, period: 12, amountPer: 100, goal: 1200)`);
    const createResult = await concept.createPlan({
      user: userA,
      trip: tripA,
      paymentPeriod: 12,
      amountPerPeriod: 100,
      goalAmount: 1200,
    });
    assertNotEquals("error" in createResult, true, `Expected no error, got: ${JSON.stringify(createResult)}`);
    const planId: Plan = (createResult as { plan: Plan }).plan;
    assertExists(planId, "Plan ID should be returned on creation");
    console.log(`Effect: New plan created with ID: ${planId.substring(0,8)}`);

    // Verify initial state using _getPlans
    const plansInitial = await concept._getPlans({ user: userA });
    assertNotEquals("error" in plansInitial, true, `Query error: ${JSON.stringify(plansInitial)}`);
    assertEquals(plansInitial.length, 1, "Expected one plan for userA initially");
    let plan = getPlanDetails(plansInitial as Array<{ plans: any }>, planId);
    assertExists(plan, `Plan ${planId.substring(0,8)} should exist`);
    assertEquals(plan.currentAmount, 0, "Initial currentAmount must be 0");
    assertEquals(plan.goalReachedFlag, false, "Initial goalReachedFlag must be false");
    assertEquals(plan.paymentPeriod, 12, "Initial paymentPeriod must be 12");
    assertEquals(plan.amountPerPeriod, 100, "Initial amountPerPeriod must be 100");
    console.log(`Query: _getPlans -> Verified initial plan state: currentAmount=${plan.currentAmount}, goalReachedFlag=${plan.goalReachedFlag}`);

    // trace: 2. Add an amount to the plan
    console.log(`\nAction: addAmount (user: ${userA.substring(0,8)}, plan: ${planId.substring(0,8)}, amount: 300)`);
    const addResult1 = await concept.addAmount({ user: userA, plan: planId, amount: 300 });
    assertNotEquals("error" in addResult1, true, `Expected no error, got: ${JSON.stringify(addResult1)}`);
    console.log(`Effect: Amount $300 added to plan`);

    // Verify updated amount and goal status
    const plansAfterAdd1 = await concept._getPlans({ user: userA });
    assertNotEquals("error" in plansAfterAdd1, true);
    plan = getPlanDetails(plansAfterAdd1 as Array<{ plans: any }>, planId);
    assertExists(plan);
    assertEquals(plan.currentAmount, 300, "currentAmount should be 300 after first add");
    assertEquals(plan.goalReachedFlag, false, "goalReachedFlag should still be false (300 < 1200)");
    console.log(`Query: _getPlans -> Verified plan state after add: currentAmount=${plan.currentAmount}, goalReachedFlag=${plan.goalReachedFlag}`);

    // trace: 3. Modify plan's payment details
    console.log(`\nAction: modifyPlan (user: ${userA.substring(0,8)}, plan: ${planId.substring(0,8)}, newPeriod: 6, newAmountPer: 200)`);
    const modifyResult = await concept.modifyPlan({
      user: userA,
      plan: planId,
      newPaymentPeriod: 6,
      newAmountPerPeriod: 200,
    });
    assertNotEquals("error" in modifyResult, true, `Expected no error, got: ${JSON.stringify(modifyResult)}`);
    console.log(`Effect: Plan payment details changed`);

    // Verify updated payment details
    const plansAfterModify = await concept._getPlans({ user: userA });
    assertNotEquals("error" in plansAfterModify, true);
    plan = getPlanDetails(plansAfterModify as Array<{ plans: any }>, planId);
    assertExists(plan);
    assertEquals(plan.paymentPeriod, 6, "paymentPeriod should be updated to 6");
    assertEquals(plan.amountPerPeriod, 200, "amountPerPeriod should be updated to 200");
    assertEquals(plan.currentAmount, 300, "currentAmount should remain unchanged after modification");
    console.log(`Query: _getPlans -> Verified plan state after modify: paymentPeriod=${plan.paymentPeriod}, amountPerPeriod=${plan.amountPerPeriod}`);

    // trace: 4. Add more amount to reach the goal
    console.log(`\nAction: addAmount (user: ${userA.substring(0,8)}, plan: ${planId.substring(0,8)}, amount: 900)`);
    const addResult2 = await concept.addAmount({ user: userA, plan: planId, amount: 900 }); // 300 + 900 = 1200
    assertNotEquals("error" in addResult2, true, `Expected no error, got: ${JSON.stringify(addResult2)}`);
    console.log(`Effect: Added $900 to reach goal`);

    // Verify goal reached status
    const plansAfterGoal = await concept._getPlans({ user: userA });
    assertNotEquals("error" in plansAfterGoal, true);
    plan = getPlanDetails(plansAfterGoal as Array<{ plans: any }>, planId);
    assertExists(plan);
    assertEquals(plan.currentAmount, 1200, "currentAmount should be 1200 (goal)");
    assertEquals(plan.goalReachedFlag, true, "goalReachedFlag should be true after reaching goal");
    console.log(`Query: _getPlans -> Verified plan state after reaching goal: currentAmount=${plan.currentAmount}, goalReachedFlag=${plan.goalReachedFlag}`);

    // trace: 5. Remove an amount to go below the goal
    console.log(`\nAction: removeAmount (user: ${userA.substring(0,8)}, plan: ${planId.substring(0,8)}, amount: 50)`);
    const removeResult1 = await concept.removeAmount({ user: userA, plan: planId, amount: 50 }); // 1200 - 50 = 1150
    assertNotEquals("error" in removeResult1, true, `Expected no error, got: ${JSON.stringify(removeResult1)}`);
    console.log(`Effect: Amount $50 removed from plan`);

    // Verify goal no longer reached
    const plansAfterRemove1 = await concept._getPlans({ user: userA });
    assertNotEquals("error" in plansAfterRemove1, true);
    plan = getPlanDetails(plansAfterRemove1 as Array<{ plans: any }>, planId);
    assertExists(plan);
    assertEquals(plan.currentAmount, 1150, "currentAmount should be 1150 after removal");
    assertEquals(plan.goalReachedFlag, false, "goalReachedFlag should be false after falling below goal");
    console.log(`Query: _getPlans -> Verified plan state after falling below goal: currentAmount=${plan.currentAmount}, goalReachedFlag=${plan.goalReachedFlag}`);

    // trace: 6. Delete the plan
    console.log(`\nAction: deletePlan (user: ${userA.substring(0,8)}, plan: ${planId.substring(0,8)})`);
    const deleteResult = await concept.deletePlan({ user: userA, plan: planId });
    assertNotEquals("error" in deleteResult, true, `Expected no error, got: ${JSON.stringify(deleteResult)}`);
    console.log(`Effect: Plan deleted`);

    // Verify plan is gone for userA
    const plansAfterDelete = await concept._getPlans({ user: userA });
    assertNotEquals("error" in plansAfterDelete, true);
    assertEquals(plansAfterDelete.length, 0, "No plans should exist for userA after deletion");
    console.log(`Query: _getPlans -> User's plans after deletion: ${JSON.stringify(plansAfterDelete)}`);
    console.log("--- Principle Test Completed Successfully ---");
  });

  await test.step("Interesting Case 1: Multiple plans for a single user and another user", async () => {
    console.log("\n--- Interesting Case 1: Multiple Plans & User Isolation ---");

    // Create multiple plans for userA
    console.log(`\nAction: createPlan for user ${userA.substring(0,8)}, trip ${tripA.substring(0,8)}`);
    const p1Result = await concept.createPlan({ user: userA, trip: tripA, paymentPeriod: 10, amountPerPeriod: 50, goalAmount: 500 });
    const p1Id = (p1Result as { plan: Plan }).plan;
    console.log(`Effect: Plan 1 ID: ${p1Id.substring(0,8)}`);

    console.log(`Action: createPlan for user ${userA.substring(0,8)}, trip ${tripB.substring(0,8)}`);
    const p2Result = await concept.createPlan({ user: userA, trip: tripB, paymentPeriod: 5, amountPerPeriod: 100, goalAmount: 500 });
    const p2Id = (p2Result as { plan: Plan }).plan;
    console.log(`Effect: Plan 2 ID: ${p2Id.substring(0,8)}`);

    // Create a plan for userB
    console.log(`Action: createPlan for user ${userB.substring(0,8)}, trip ${tripA.substring(0,8)}`);
    const p3Result = await concept.createPlan({ user: userB, trip: tripA, paymentPeriod: 1, amountPerPeriod: 1000, goalAmount: 1000 });
    const p3Id = (p3Result as { plan: Plan }).plan;
    console.log(`Effect: Plan 3 ID: ${p3Id.substring(0,8)}`);

    // Verify plans for userA
    console.log(`\nQuery: _getPlans for user ${userA.substring(0,8)}`);
    const plansUserA = await concept._getPlans({ user: userA });
    assertNotEquals("error" in plansUserA, true);
    assertEquals(plansUserA.length, 2, "UserA should have 2 plans");
    assertExists(getPlanDetails(plansUserA as Array<{ plans: any }>, p1Id), "Plan 1 should be listed for UserA");
    assertExists(getPlanDetails(plansUserA as Array<{ plans: any }>, p2Id), "Plan 2 should be listed for UserA");
    console.log(`Effect: User ${userA.substring(0,8)} correctly has 2 plans.`);

    // Verify plans for userB
    console.log(`\nQuery: _getPlans for user ${userB.substring(0,8)}`);
    const plansUserB = await concept._getPlans({ user: userB });
    assertNotEquals("error" in plansUserB, true);
    assertEquals(plansUserB.length, 1, "UserB should have 1 plan");
    assertExists(getPlanDetails(plansUserB as Array<{ plans: any }>, p3Id), "Plan 3 should be listed for UserB");
    console.log(`Effect: User ${userB.substring(0,8)} correctly has 1 plan.`);

    // Verify userA cannot see userB's plan
    const checkP3ForUserA = getPlanDetails(plansUserA as Array<{ plans: any }>, p3Id);
    assertEquals(checkP3ForUserA, undefined, "UserA should not see UserB's plan");
    console.log(`Effect: User ${userA.substring(0,8)} cannot see User ${userB.substring(0,8)}'s plan. (Verified P3 not in UserA's plans)`);

    // Cleanup
    await concept.deletePlan({ user: userA, plan: p1Id });
    await concept.deletePlan({ user: userA, plan: p2Id });
    await concept.deletePlan({ user: userB, plan: p3Id });
    console.log("\n--- Interesting Case 1 Completed ---");
  });

  await test.step("Interesting Case 2: Edge cases for addAmount and removeAmount (zero, exact goal, over/under)", async () => {
    console.log("\n--- Interesting Case 2: Add/Remove Amount Edge Cases ---");
    const user = freshID();
    const createResult = await concept.createPlan({ user, trip: freshID(), paymentPeriod: 1, amountPerPeriod: 100, goalAmount: 1000 });
    const planId = (createResult as { plan: Plan }).plan;
    console.log(`Setup: Created plan ${planId.substring(0,8)} for user ${user.substring(0,8)} with goal 1000, current 0.`);

    let plans, plan;

    // Test: add 0 amount
    console.log(`\nAction: addAmount (amount: 0)`);
    const addZeroResult = await concept.addAmount({ user, plan: planId, amount: 0 });
    assertNotEquals("error" in addZeroResult, true, "Expected no error for adding zero amount");
    plans = await concept._getPlans({ user });
    plan = getPlanDetails(plans as Array<{ plans: any }>, planId);
    assertEquals(plan.currentAmount, 0, "currentAmount should remain 0 after adding 0");
    assertEquals(plan.goalReachedFlag, false);
    console.log(`Effect: Adding 0 amount changes nothing: currentAmount=${plan.currentAmount}`);

    // Test: add amount to exactly reach goal
    console.log(`\nAction: addAmount (amount: 1000) to reach goal`);
    const addExactGoalResult = await concept.addAmount({ user, plan: planId, amount: 1000 });
    assertNotEquals("error" in addExactGoalResult, true, "Expected no error for adding exact goal amount");
    plans = await concept._getPlans({ user });
    plan = getPlanDetails(plans as Array<{ plans: any }>, planId);
    assertEquals(plan.currentAmount, 1000, "currentAmount should be 1000 (goal)");
    assertEquals(plan.goalReachedFlag, true, "goalReachedFlag should be true");
    console.log(`Effect: Adding exact goal amount works, goal reached: currentAmount=${plan.currentAmount}, goalReachedFlag=${plan.goalReachedFlag}`);

    // Test: remove 0 amount
    console.log(`\nAction: removeAmount (amount: 0)`);
    const removeZeroResult = await concept.removeAmount({ user, plan: planId, amount: 0 });
    assertNotEquals("error" in removeZeroResult, true, "Expected no error for removing zero amount");
    plans = await concept._getPlans({ user });
    plan = getPlanDetails(plans as Array<{ plans: any }>, planId);
    assertEquals(plan.currentAmount, 1000, "currentAmount should remain 1000 after removing 0");
    assertEquals(plan.goalReachedFlag, true);
    console.log(`Effect: Removing 0 amount changes nothing: currentAmount=${plan.currentAmount}`);

    // Test: remove amount that makes current amount exactly 0
    console.log(`\nAction: removeAmount (amount: 1000) to reach 0`);
    const removeAllResult = await concept.removeAmount({ user, plan: planId, amount: 1000 });
    assertNotEquals("error" in removeAllResult, true, "Expected no error for removing all amount");
    plans = await concept._getPlans({ user });
    plan = getPlanDetails(plans as Array<{ plans: any }>, planId);
    assertEquals(plan.currentAmount, 0, "currentAmount should be 0");
    assertEquals(plan.goalReachedFlag, false, "goalReachedFlag should be false after current becomes 0");
    console.log(`Effect: Removing all amount works, goal not reached: currentAmount=${plan.currentAmount}, goalReachedFlag=${plan.goalReachedFlag}`);

    // Test: try to remove amount exceeding current (error case)
    console.log(`\nAction: removeAmount (amount: 1) from 0 currentAmount`);
    const removeExceedResult = await concept.removeAmount({ user, plan: planId, amount: 1 });
    assertExists((removeExceedResult as { error: string }).error, "Expected error when removing more than current amount");
    assertEquals((removeExceedResult as { error: string }).error, "Amount to remove exceeds current amount.");
    console.log(`Requirement: Failed to remove amount exceeding current amount as expected: ${JSON.stringify(removeExceedResult)}`);

    // Cleanup
    await concept.deletePlan({ user, plan: planId });
    console.log("\n--- Interesting Case 2 Completed ---");
  });

  await test.step("Interesting Case 3: Goal status updates automatically and manually", async () => {
    console.log("\n--- Interesting Case 3: Automatic Goal Status Update ---");
    const user = freshID();
    const createResult = await concept.createPlan({ user, trip: freshID(), paymentPeriod: 1, amountPerPeriod: 100, goalAmount: 500 });
    const planId = (createResult as { plan: Plan }).plan;
    console.log(`Setup: Created plan ${planId.substring(0,8)} for user ${user.substring(0,8)} with goal 500, current 0.`);

    let plans, plan;

    // Add amount, but not enough to reach goal (auto update)
    console.log(`\nAction: addAmount (amount: 400)`);
    await concept.addAmount({ user, plan: planId, amount: 400 });
    plans = await concept._getPlans({ user });
    plan = getPlanDetails(plans as Array<{ plans: any }>, planId);
    assertEquals(plan.currentAmount, 400);
    assertEquals(plan.goalReachedFlag, false, "goalReachedFlag should be false (current < goal)");
    console.log(`Effect: currentAmount=${plan.currentAmount}, goalReachedFlag=${plan.goalReachedFlag} (auto updated)`);

    // Add enough to reach goal (auto update)
    console.log(`\nAction: addAmount (amount: 100)`);
    await concept.addAmount({ user, plan: planId, amount: 100 });
    plans = await concept._getPlans({ user });
    plan = getPlanDetails(plans as Array<{ plans: any }>, planId);
    assertEquals(plan.currentAmount, 500);
    assertEquals(plan.goalReachedFlag, true, "goalReachedFlag should be true (current == goal)");
    console.log(`Effect: currentAmount=${plan.currentAmount}, goalReachedFlag=${plan.goalReachedFlag} (auto updated)`);

    // Remove amount, but still above goal (auto update)
    console.log(`\nAction: removeAmount (amount: 50)`);
    await concept.removeAmount({ user, plan: planId, amount: 50 });
    plans = await concept._getPlans({ user });
    plan = getPlanDetails(plans as Array<{ plans: any }>, planId);
    assertEquals(plan.currentAmount, 450); // Goal is 500, current 450
    assertEquals(plan.goalReachedFlag, false, "goalReachedFlag should be false (current < goal)");
    console.log(`Effect: currentAmount=${plan.currentAmount}, goalReachedFlag=${plan.goalReachedFlag} (auto updated)`);

    // Call updateGoalStatus directly - it should maintain the correct state (no change)
    console.log(`\nAction: updateGoalStatus (current amount is 450, goal is 500)`);
    const manualUpdateResult = await concept.updateGoalStatus({ user, plan: planId });
    assertNotEquals("error" in manualUpdateResult, true);
    plans = await concept._getPlans({ user });
    plan = getPlanDetails(plans as Array<{ plans: any }>, planId);
    assertEquals(plan.currentAmount, 450);
    assertEquals(plan.goalReachedFlag, false, "goalReachedFlag should remain false after manual updateGoalStatus");
    console.log(`Effect: currentAmount=${plan.currentAmount}, goalReachedFlag=${plan.goalReachedFlag} (manual update, no change needed)`);

    // Add back to go over goal (auto update)
    console.log(`\nAction: addAmount (amount: 100)`);
    await concept.addAmount({ user, plan: planId, amount: 100 }); // 450 + 100 = 550
    plans = await concept._getPlans({ user });
    plan = getPlanDetails(plans as Array<{ plans: any }>, planId);
    assertEquals(plan.currentAmount, 550);
    assertEquals(plan.goalReachedFlag, true, "goalReachedFlag should be true (current > goal)");
    console.log(`Effect: currentAmount=${plan.currentAmount}, goalReachedFlag=${plan.goalReachedFlag} (auto updated)`);

    // Cleanup
    await concept.deletePlan({ user, plan: planId });
    console.log("\n--- Interesting Case 3 Completed ---");
  });

  await test.step("Interesting Case 4: Invalid input and unauthorized access", async () => {
    console.log("\n--- Interesting Case 4: Invalid Input & Unauthorized Access ---");
    const user = freshID();
    const otherUser = freshID();
    const createResult = await concept.createPlan({ user, trip: freshID(), paymentPeriod: 12, amountPerPeriod: 100, goalAmount: 1200 });
    const planId = (createResult as { plan: Plan }).plan;
    console.log(`Setup: Created plan ${planId.substring(0,8)} for user ${user.substring(0,8)}.`);

    // Test: createPlan with negative paymentPeriod
    console.log(`\nAction: createPlan with negative paymentPeriod`);
    const createError1 = await concept.createPlan({ user, trip: freshID(), paymentPeriod: -5, amountPerPeriod: 10, goalAmount: 100 });
    assertExists((createError1 as { error: string }).error, "Expected error for negative paymentPeriod");
    assertEquals((createError1 as { error: string }).error, "paymentPeriod must be non-negative.");
    console.log(`Requirement: createPlan failed with negative paymentPeriod as expected: ${JSON.stringify(createError1)}`);

    // Test: modifyPlan by unauthorized user
    console.log(`\nAction: modifyPlan by ${otherUser.substring(0,8)} for ${user.substring(0,8)}'s plan ${planId.substring(0,8)}`);
    const modifyError1 = await concept.modifyPlan({ user: otherUser, plan: planId, newPaymentPeriod: 1, newAmountPerPeriod: 1 });
    assertExists((modifyError1 as { error: string }).error, "Expected error for unauthorized modify");
    assertEquals((modifyError1 as { error: string }).error, "Plan not found or does not belong to the user.");
    console.log(`Requirement: modifyPlan by unauthorized user failed as expected: ${JSON.stringify(modifyError1)}`);

    // Test: addAmount to non-existent plan
    console.log(`\nAction: addAmount to non-existent plan`);
    const addError1 = await concept.addAmount({ user, plan: freshID(), amount: 100 });
    assertExists((addError1 as { error: string }).error, "Expected error for adding to non-existent plan");
    assertEquals((addError1 as { error: string }).error, "Plan not found or does not belong to the user.");
    console.log(`Requirement: addAmount to non-existent plan failed as expected: ${JSON.stringify(addError1)}`);

    // Test: deletePlan by unauthorized user
    console.log(`\nAction: deletePlan by ${otherUser.substring(0,8)} for ${user.substring(0,8)}'s plan ${planId.substring(0,8)}`);
    const deleteError1 = await concept.deletePlan({ user: otherUser, plan: planId });
    assertExists((deleteError1 as { error: string }).error, "Expected error for unauthorized delete");
    assertEquals((deleteError1 as { error: string }).error, "Plan not found or does not belong to the user.");
    console.log(`Requirement: deletePlan by unauthorized user failed as expected: ${JSON.stringify(deleteError1)}`);

    // Verify original plan still exists for user
    const plansForUser = await concept._getPlans({ user });
    assertNotEquals("error" in plansForUser, true);
    assertEquals(plansForUser.length, 1, "User's plan should still exist after failed unauthorized attempts");
    assertExists(getPlanDetails(plansForUser as Array<{ plans: any }>, planId));
    console.log(`Effect: User's plan ${planId.substring(0,8)} still exists after unauthorized attempts.`);

    // Cleanup
    await concept.deletePlan({ user, plan: planId });
    console.log("\n--- Interesting Case 4 Completed ---");
  });
});
```
