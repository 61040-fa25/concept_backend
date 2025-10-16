import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import ProgressTrackingConcept from "./ProgressTrackingConcept.ts";
import { ID } from "@utils/types.ts";

// Generic types of this concept for testing
type User = ID;
type Plan = ID;
type TripCostEstimation = ID;

/**
 * Helper to check if a plan ID exists in the _getPlans query result.
 * This function only verifies the presence of the plan ID, not its details,
 * adhering to the strict _getPlans return type (array of {plans: Plan_ID}).
 */
function isPlanPresent(
  plansOutput: Array<{ plans: Plan }> | Array<{ error: string }>,
  planId: Plan,
): boolean {
  if ("error" in plansOutput[0]) {
    return false; // Handle error case in type guard
  }
  return (plansOutput as Array<{ plans: Plan }>).some((item) => item.plans === planId);
}

Deno.test("ProgressTrackingConcept: Principle Test - Full Lifecycle", async () => {
  const [db, client] = await testDb(); // Fresh DB for this test
  const concept = new ProgressTrackingConcept(db);

  const userA: User = freshID();
  const tripA: TripCostEstimation = freshID();

  try {
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
    assertEquals((createResult as { paymentPeriod: number }).paymentPeriod, 12, "Returned paymentPeriod must match");
    assertEquals((createResult as { amountPerPeriod: number }).amountPerPeriod, 100, "Returned amountPerPeriod must match");
    console.log(`Effect: New plan created with ID: ${planId.substring(0,8)}, with initial period 12, amount 100`);

    // Verify initial state using _getPlans (only ID) and updateGoalStatus
    const plansInitial = await concept._getPlans({ user: userA });
    assertNotEquals("error" in plansInitial, true, `Query error: ${JSON.stringify(plansInitial)}`);
    assertEquals(plansInitial.length, 1, "Expected one plan for userA initially");
    assertEquals(isPlanPresent(plansInitial, planId), true, `Plan ${planId.substring(0,8)} should be present in user's plans`);

    const initialGoalStatus = await concept.updateGoalStatus({ user: userA, plan: planId });
    assertNotEquals("error" in initialGoalStatus, true, `Expected no error, got: ${JSON.stringify(initialGoalStatus)}`);
    assertEquals((initialGoalStatus as { goalReachedFlag: boolean }).goalReachedFlag, false, "Initial goalReachedFlag should be false as currentAmount is 0");
    console.log(`Query: updateGoalStatus -> Verified initial goalReachedFlag: false`);


    // trace: 2. Add an amount to the plan
    console.log(`\nAction: addAmount (user: ${userA.substring(0,8)}, plan: ${planId.substring(0,8)}, amount: 300)`);
    const addResult1 = await concept.addAmount({ user: userA, plan: planId, amount: 300 });
    assertNotEquals("error" in addResult1, true, `Expected no error, got: ${JSON.stringify(addResult1)}`);
    assertEquals((addResult1 as { currentAmount: number }).currentAmount, 300, "currentAmount should be 300 after first add");
    console.log(`Effect: Amount $300 added to plan, new currentAmount: ${ (addResult1 as { currentAmount: number }).currentAmount}`);

    // Verify updated amount and goal status using updateGoalStatus (currentAmount is 300, goal is 1200)
    const goalStatusAfterAdd1 = await concept.updateGoalStatus({ user: userA, plan: planId });
    assertNotEquals("error" in goalStatusAfterAdd1, true);
    assertEquals((goalStatusAfterAdd1 as { goalReachedFlag: boolean }).goalReachedFlag, false, "goalReachedFlag should still be false (300 < 1200)");
    console.log(`Query: updateGoalStatus -> Verified goalReachedFlag is false.`);


    // trace: 3. Modify plan's payment details
    console.log(`\nAction: modifyPlan (user: ${userA.substring(0,8)}, plan: ${planId.substring(0,8)}, newPeriod: 6, newAmountPer: 200)`);
    const modifyResult = await concept.modifyPlan({
      user: userA,
      plan: planId,
      newPaymentPeriod: 6,
      newAmountPerPeriod: 200,
    });
    assertNotEquals("error" in modifyResult, true, `Expected no error, got: ${JSON.stringify(modifyResult)}`);
    console.log(`Effect: Plan payment details changed. (Cannot query paymentPeriod/amountPerPeriod directly via _getPlans, as it only returns IDs).`);

    // Verify plan still exists
    const plansAfterModifyCheck = await concept._getPlans({ user: userA });
    assertNotEquals("error" in plansAfterModifyCheck, true);
    assertEquals(isPlanPresent(plansAfterModifyCheck, planId), true, "Plan should still exist after modification");


    // trace: 4. Add more amount to reach the goal
    console.log(`\nAction: addAmount (user: ${userA.substring(0,8)}, plan: ${planId.substring(0,8)}, amount: 900)`);
    const addResult2 = await concept.addAmount({ user: userA, plan: planId, amount: 900 }); // 300 + 900 = 1200
    assertNotEquals("error" in addResult2, true, `Expected no error, got: ${JSON.stringify(addResult2)}`);
    assertEquals((addResult2 as { currentAmount: number }).currentAmount, 1200, "currentAmount should be 1200 (goal)");
    console.log(`Effect: Added $900 to reach goal, new currentAmount: ${ (addResult2 as { currentAmount: number }).currentAmount}`);

    // Verify goal reached status
    const goalStatusAfterGoal = await concept.updateGoalStatus({ user: userA, plan: planId });
    assertNotEquals("error" in goalStatusAfterGoal, true);
    assertEquals((goalStatusAfterGoal as { goalReachedFlag: boolean }).goalReachedFlag, true, "goalReachedFlag should be true after reaching goal");
    console.log(`Query: updateGoalStatus -> Verified goalReachedFlag is true.`);


    // trace: 5. Remove an amount to go below the goal
    console.log(`\nAction: removeAmount (user: ${userA.substring(0,8)}, plan: ${planId.substring(0,8)}, amount: 50)`);
    const removeResult1 = await concept.removeAmount({ user: userA, plan: planId, amount: 50 }); // 1200 - 50 = 1150
    assertNotEquals("error" in removeResult1, true, `Expected no error, got: ${JSON.stringify(removeResult1)}`);
    assertEquals((removeResult1 as { currentAmount: number }).currentAmount, 1150, "currentAmount should be 1150 after removal");
    console.log(`Effect: Amount $50 removed from plan, new currentAmount: ${ (removeResult1 as { currentAmount: number }).currentAmount}`);

    // Verify goal no longer reached
    const goalStatusAfterRemove1 = await concept.updateGoalStatus({ user: userA, plan: planId });
    assertNotEquals("error" in goalStatusAfterRemove1, true);
    assertEquals((goalStatusAfterRemove1 as { goalReachedFlag: boolean }).goalReachedFlag, false, "goalReachedFlag should be false after falling below goal");
    console.log(`Query: updateGoalStatus -> Verified goalReachedFlag is false after falling below goal.`);

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
  } finally {
    await client.close(); // Ensure client is closed
  }
});


Deno.test("ProgressTrackingConcept: Interesting Case 1 - Multiple Plans & User Isolation", async () => {
  const [db, client] = await testDb();
  const concept = new ProgressTrackingConcept(db);

  const userA: User = freshID();
  const userB: User = freshID();
  const tripA: TripCostEstimation = freshID();
  const tripB: TripCostEstimation = freshID();

  try {
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
    assertEquals(isPlanPresent(plansUserA, p1Id), true, "Plan 1 should be listed for UserA");
    assertEquals(isPlanPresent(plansUserA, p2Id), true, "Plan 2 should be listed for UserA");
    console.log(`Effect: User ${userA.substring(0,8)} correctly has 2 plans.`);

    // Verify plans for userB
    console.log(`\nQuery: _getPlans for user ${userB.substring(0,8)}`);
    const plansUserB = await concept._getPlans({ user: userB });
    assertNotEquals("error" in plansUserB, true);
    assertEquals(plansUserB.length, 1, "UserB should have 1 plan");
    assertEquals(isPlanPresent(plansUserB, p3Id), true, "Plan 3 should be listed for UserB");
    console.log(`Effect: User ${userB.substring(0,8)} correctly has 1 plan.`);

    // Verify userA cannot see userB's plan
    const checkP3ForUserA = isPlanPresent(plansUserA, p3Id);
    assertEquals(checkP3ForUserA, false, "UserA should not see UserB's plan");
    console.log(`Effect: User ${userA.substring(0,8)} cannot see User ${userB.substring(0,8)}'s plan. (Verified P3 not in UserA's plans)`);

    // Cleanup
    await concept.deletePlan({ user: userA, plan: p1Id });
    await concept.deletePlan({ user: userA, plan: p2Id });
    await concept.deletePlan({ user: userB, plan: p3Id });
    console.log("\n--- Interesting Case 1 Completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("ProgressTrackingConcept: Interesting Case 2 - Add/Remove Amount Edge Cases", async () => {
  const [db, client] = await testDb();
  const concept = new ProgressTrackingConcept(db);

  const user: User = freshID();

  try {
    console.log("\n--- Interesting Case 2: Add/Remove Amount Edge Cases ---");
    const createResult = await concept.createPlan({ user, trip: freshID(), paymentPeriod: 1, amountPerPeriod: 100, goalAmount: 1000 });
    const planId = (createResult as { plan: Plan }).plan;
    console.log(`Setup: Created plan ${planId.substring(0,8)} for user ${user.substring(0,8)} with goal 1000, current 0.`);

    let addAmountResult, removeAmountResult;
    let goalStatusResult;

    // Test: add 0 amount
    console.log(`\nAction: addAmount (amount: 0)`);
    addAmountResult = await concept.addAmount({ user, plan: planId, amount: 0 });
    assertNotEquals("error" in addAmountResult, true, "Expected no error for adding zero amount");
    assertEquals((addAmountResult as { currentAmount: number }).currentAmount, 0, "currentAmount should remain 0 after adding 0");
    goalStatusResult = await concept.updateGoalStatus({ user, plan: planId });
    assertNotEquals("error" in goalStatusResult, true);
    assertEquals((goalStatusResult as { goalReachedFlag: boolean }).goalReachedFlag, false);
    console.log(`Effect: Adding 0 amount, currentAmount=${(addAmountResult as { currentAmount: number }).currentAmount}, goalReachedFlag=${(goalStatusResult as { goalReachedFlag: boolean }).goalReachedFlag}`);

    // Test: add amount to exactly reach goal
    console.log(`\nAction: addAmount (amount: 1000) to reach goal`);
    addAmountResult = await concept.addAmount({ user, plan: planId, amount: 1000 });
    assertNotEquals("error" in addAmountResult, true, "Expected no error for adding exact goal amount");
    assertEquals((addAmountResult as { currentAmount: number }).currentAmount, 1000, "currentAmount should be 1000 (goal)");
    goalStatusResult = await concept.updateGoalStatus({ user, plan: planId });
    assertNotEquals("error" in goalStatusResult, true);
    assertEquals((goalStatusResult as { goalReachedFlag: boolean }).goalReachedFlag, true, "goalReachedFlag should be true");
    console.log(`Effect: Adding exact goal amount, currentAmount=${(addAmountResult as { currentAmount: number }).currentAmount}, goalReachedFlag=${(goalStatusResult as { goalReachedFlag: boolean }).goalReachedFlag}`);

    // Test: remove 0 amount
    console.log(`\nAction: removeAmount (amount: 0)`);
    removeAmountResult = await concept.removeAmount({ user, plan: planId, amount: 0 });
    assertNotEquals("error" in removeAmountResult, true, "Expected no error for removing zero amount");
    assertEquals((removeAmountResult as { currentAmount: number }).currentAmount, 1000, "currentAmount should remain 1000 after removing 0");
    goalStatusResult = await concept.updateGoalStatus({ user, plan: planId });
    assertNotEquals("error" in goalStatusResult, true);
    assertEquals((goalStatusResult as { goalReachedFlag: boolean }).goalReachedFlag, true);
    console.log(`Effect: Removing 0 amount, currentAmount=${(removeAmountResult as { currentAmount: number }).currentAmount}, goalReachedFlag=${(goalStatusResult as { goalReachedFlag: boolean }).goalReachedFlag}`);

    // Test: remove amount that makes current amount exactly 0
    console.log(`\nAction: removeAmount (amount: 1000) to reach 0`);
    removeAmountResult = await concept.removeAmount({ user, plan: planId, amount: 1000 });
    assertNotEquals("error" in removeAmountResult, true, "Expected no error for removing all amount");
    assertEquals((removeAmountResult as { currentAmount: number }).currentAmount, 0, "currentAmount should be 0");
    goalStatusResult = await concept.updateGoalStatus({ user, plan: planId });
    assertNotEquals("error" in goalStatusResult, true);
    assertEquals((goalStatusResult as { goalReachedFlag: boolean }).goalReachedFlag, false, "goalReachedFlag should be false after current becomes 0");
    console.log(`Effect: Removing all amount, currentAmount=${(removeAmountResult as { currentAmount: number }).currentAmount}, goalReachedFlag=${(goalStatusResult as { goalReachedFlag: boolean }).goalReachedFlag}`);

    // Test: try to remove amount exceeding current (error case)
    console.log(`\nAction: removeAmount (amount: 1) from 0 currentAmount`);
    const removeExceedResult = await concept.removeAmount({ user, plan: planId, amount: 1 });
    assertExists((removeExceedResult as { error: string }).error, "Expected error when removing more than current amount");
    assertEquals((removeExceedResult as { error: string }).error, "Amount to remove exceeds current amount.");
    console.log(`Requirement: Failed to remove amount exceeding current amount as expected: ${JSON.stringify(removeExceedResult)}`);

    // Cleanup
    await concept.deletePlan({ user, plan: planId });
    console.log("\n--- Interesting Case 2 Completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("ProgressTrackingConcept: Interesting Case 3 - Automatic & Manual Goal Status Update", async () => {
  const [db, client] = await testDb();
  const concept = new ProgressTrackingConcept(db);

  const user: User = freshID();

  try {
    console.log("\n--- Interesting Case 3: Automatic & Manual Goal Status Update ---");
    const createResult = await concept.createPlan({ user, trip: freshID(), paymentPeriod: 1, amountPerPeriod: 100, goalAmount: 500 });
    const planId = (createResult as { plan: Plan }).plan;
    console.log(`Setup: Created plan ${planId.substring(0,8)} for user ${user.substring(0,8)} with goal 500, current 0.`);

    let addAmountResult, removeAmountResult, goalStatusResult;

    // Add amount, but not enough to reach goal (auto update via addAmount's internal call)
    console.log(`\nAction: addAmount (amount: 400)`);
    addAmountResult = await concept.addAmount({ user, plan: planId, amount: 400 });
    assertNotEquals("error" in addAmountResult, true);
    assertEquals((addAmountResult as { currentAmount: number }).currentAmount, 400);
    goalStatusResult = await concept.updateGoalStatus({ user, plan: planId }); // Query goal status
    assertNotEquals("error" in goalStatusResult, true);
    assertEquals((goalStatusResult as { goalReachedFlag: boolean }).goalReachedFlag, false, "goalReachedFlag should be false (current < goal)");
    console.log(`Effect: currentAmount=${(addAmountResult as { currentAmount: number }).currentAmount}, goalReachedFlag=${(goalStatusResult as { goalReachedFlag: boolean }).goalReachedFlag} (auto updated via addAmount)`);

    // Add enough to reach goal (auto update via addAmount's internal call)
    console.log(`\nAction: addAmount (amount: 100)`);
    addAmountResult = await concept.addAmount({ user, plan: planId, amount: 100 });
    assertNotEquals("error" in addAmountResult, true);
    assertEquals((addAmountResult as { currentAmount: number }).currentAmount, 500);
    goalStatusResult = await concept.updateGoalStatus({ user, plan: planId }); // Query goal status
    assertNotEquals("error" in goalStatusResult, true);
    assertEquals((goalStatusResult as { goalReachedFlag: boolean }).goalReachedFlag, true, "goalReachedFlag should be true (current == goal)");
    console.log(`Effect: currentAmount=${(addAmountResult as { currentAmount: number }).currentAmount}, goalReachedFlag=${(goalStatusResult as { goalReachedFlag: boolean }).goalReachedFlag} (auto updated via addAmount)`);

    // Remove amount, but still above goal (auto update via removeAmount's internal call)
    console.log(`\nAction: removeAmount (amount: 50)`);
    removeAmountResult = await concept.removeAmount({ user, plan: planId, amount: 50 });
    assertNotEquals("error" in removeAmountResult, true);
    assertEquals((removeAmountResult as { currentAmount: number }).currentAmount, 450); // Goal is 500, current 450
    goalStatusResult = await concept.updateGoalStatus({ user, plan: planId }); // Query goal status
    assertNotEquals("error" in goalStatusResult, true);
    assertEquals((goalStatusResult as { goalReachedFlag: boolean }).goalReachedFlag, false, "goalReachedFlag should be false (current < goal)");
    console.log(`Effect: currentAmount=${(removeAmountResult as { currentAmount: number }).currentAmount}, goalReachedFlag=${(goalStatusResult as { goalReachedFlag: boolean }).goalReachedFlag} (auto updated via removeAmount)`);

    // Call updateGoalStatus directly - it should maintain the correct state and return it
    console.log(`\nAction: updateGoalStatus (current amount is 450, goal is 500)`);
    const manualUpdateResult = await concept.updateGoalStatus({ user, plan: planId });
    assertNotEquals("error" in manualUpdateResult, true);
    assertEquals((manualUpdateResult as { goalReachedFlag: boolean }).goalReachedFlag, false, "goalReachedFlag should remain false after manual updateGoalStatus");
    console.log(`Effect: goalReachedFlag=${(manualUpdateResult as { goalReachedFlag: boolean }).goalReachedFlag} (manual update, no state change, returns current status)`);

    // Add back to go over goal (auto update)
    console.log(`\nAction: addAmount (amount: 100)`);
    addAmountResult = await concept.addAmount({ user, plan: planId, amount: 100 }); // 450 + 100 = 550
    assertNotEquals("error" in addAmountResult, true);
    assertEquals((addAmountResult as { currentAmount: number }).currentAmount, 550);
    goalStatusResult = await concept.updateGoalStatus({ user, plan: planId }); // Query goal status
    assertNotEquals("error" in goalStatusResult, true);
    assertEquals((goalStatusResult as { goalReachedFlag: boolean }).goalReachedFlag, true, "goalReachedFlag should be true (current > goal)");
    console.log(`Effect: currentAmount=${(addAmountResult as { currentAmount: number }).currentAmount}, goalReachedFlag=${(goalStatusResult as { goalReachedFlag: boolean }).goalReachedFlag} (auto updated via addAmount)`);

    // Cleanup
    await concept.deletePlan({ user, plan: planId });
    console.log("\n--- Interesting Case 3 Completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("ProgressTrackingConcept: Interesting Case 4 - Invalid Input & Unauthorized Access", async () => {
  const [db, client] = await testDb();
  const concept = new ProgressTrackingConcept(db);

  const user: User = freshID();
  const otherUser: User = freshID();

  try {
    console.log("\n--- Interesting Case 4: Invalid Input & Unauthorized Access ---");
    const createResult = await concept.createPlan({ user, trip: freshID(), paymentPeriod: 12, amountPerPeriod: 100, goalAmount: 1200 });
    const planId = (createResult as { plan: Plan }).plan;
    console.log(`Setup: Created plan ${planId.substring(0,8)} for user ${user.substring(0,8)}.`);

    // Test: createPlan with negative paymentPeriod (requires check)
    console.log(`\nAction: createPlan with negative paymentPeriod`);
    const createError1 = await concept.createPlan({ user, trip: freshID(), paymentPeriod: -5, amountPerPeriod: 10, goalAmount: 100 });
    assertExists((createError1 as { error: string }).error, "Expected error for negative paymentPeriod");
    assertEquals((createError1 as { error: string }).error, "paymentPeriod must be non-negative.");
    console.log(`Requirement: createPlan failed with negative paymentPeriod as expected: ${JSON.stringify(createError1)}`);

    // Test: modifyPlan by unauthorized user (requires check)
    console.log(`\nAction: modifyPlan by ${otherUser.substring(0,8)} for ${user.substring(0,8)}'s plan ${planId.substring(0,8)}`);
    const modifyError1 = await concept.modifyPlan({ user: otherUser, plan: planId, newPaymentPeriod: 1, newAmountPerPeriod: 1 });
    assertExists((modifyError1 as { error: string }).error, "Expected error for unauthorized modify");
    assertEquals((modifyError1 as { error: string }).error, "Plan not found or does not belong to the user.");
    console.log(`Requirement: modifyPlan by unauthorized user failed as expected: ${JSON.stringify(modifyError1)}`);

    // Test: addAmount to non-existent plan (requires check)
    console.log(`\nAction: addAmount to non-existent plan`);
    const addError1 = await concept.addAmount({ user, plan: freshID(), amount: 100 });
    assertExists((addError1 as { error: string }).error, "Expected error for adding to non-existent plan");
    assertEquals((addError1 as { error: string }).error, "Plan not found or does not belong to the user.");
    console.log(`Requirement: addAmount to non-existent plan failed as expected: ${JSON.stringify(addError1)}`);

    // Test: deletePlan by unauthorized user (requires check)
    console.log(`\nAction: deletePlan by ${otherUser.substring(0,8)} for ${user.substring(0,8)}'s plan ${planId.substring(0,8)}`);
    const deleteError1 = await concept.deletePlan({ user: otherUser, plan: planId });
    assertExists((deleteError1 as { error: string }).error, "Expected error for unauthorized delete");
    assertEquals((deleteError1 as { error: string }).error, "Plan not found or does not belong to the user.");
    console.log(`Requirement: deletePlan by unauthorized user failed as expected: ${JSON.stringify(deleteError1)}`);

    // Verify original plan still exists for user
    const plansForUser = await concept._getPlans({ user });
    assertNotEquals("error" in plansForUser, true);
    assertEquals(plansForUser.length, 1, "User's plan should still exist after failed unauthorized attempts");
    assertEquals(isPlanPresent(plansForUser, planId), true, `Plan ${planId.substring(0,8)} still exists`);
    console.log(`Effect: User's plan ${planId.substring(0,8)} still exists after unauthorized attempts.`);

    // Cleanup
    await concept.deletePlan({ user, plan: planId });
    console.log("\n--- Interesting Case 4 Completed ---");
  } finally {
    await client.close();
  }
});

Deno.test("ProgressTrackingConcept: Interesting Case 5 - Querying for Non-existent Users", async () => {
  const [db, client] = await testDb();
  const concept = new ProgressTrackingConcept(db);

  const nonExistentUser: User = freshID();

  try {
    console.log("\n--- Interesting Case 5: Querying for Non-existent Users ---");

    // Test: _getPlans for a user that has never created a plan
    console.log(`\nQuery: _getPlans for non-existent user ${nonExistentUser.substring(0,8)}`);
    const plansResult = await concept._getPlans({ user: nonExistentUser });
    assertNotEquals("error" in plansResult, true, `Expected no error, got: ${JSON.stringify(plansResult)}`);
    assertEquals(plansResult.length, 0, "Expected an empty array for a non-existent user");
    console.log(`Effect: Querying for a non-existent user returns an empty array as expected: ${JSON.stringify(plansResult)}`);

    // Test: create a plan for a user, then query for a different non-existent user
    const actualUser = freshID();
    const actualPlanResult = await concept.createPlan({ user: actualUser, trip: freshID(), paymentPeriod: 1, amountPerPeriod: 100, goalAmount: 100 });
    const actualPlanId = (actualPlanResult as { plan: Plan }).plan;
    console.log(`Setup: Created plan ${actualPlanId.substring(0,8)} for user ${actualUser.substring(0,8)}.`);

    console.log(`\nQuery: _getPlans again for non-existent user ${nonExistentUser.substring(0,8)}`);
    const plansResult2 = await concept._getPlans({ user: nonExistentUser });
    assertNotEquals("error" in plansResult2, true, `Expected no error, got: ${JSON.stringify(plansResult2)}`);
    assertEquals(plansResult2.length, 0, "Still expected an empty array for a non-existent user after other users exist");
    console.log(`Effect: Querying for a non-existent user still returns an empty array: ${JSON.stringify(plansResult2)}`);

    // Verify the actual user's plan exists
    const actualUserPlans = await concept._getPlans({ user: actualUser });
    assertNotEquals("error" in actualUserPlans, true);
    assertEquals(actualUserPlans.length, 1);
    assertEquals(isPlanPresent(actualUserPlans, actualPlanId), true);
    console.log(`Effect: Actual user ${actualUser.substring(0,8)}'s plan is still present.`);

    // Cleanup
    await concept.deletePlan({ user: actualUser, plan: actualPlanId });
    console.log("\n--- Interesting Case 5 Completed ---");
  } finally {
    await client.close();
  }
});