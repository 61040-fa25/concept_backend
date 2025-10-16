---
timestamp: 'Thu Oct 16 2025 10:27:53 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_102753.0b8b7a2a.md]]'
content_id: 1c53f810347822f144dd4b346718aa0d56b804223afb526e99723f72e6439fe4
---

# response:

```typescript
// src/utils/types.ts
// This file is assumed to exist based on the problem description.
// It provides utility types like ID and Empty.

export type ID = string & { __brand: "ID" };
export type Empty = Record<PropertyKey, never>;
```

```typescript
// src/utils/database.ts
// This file is assumed to exist based on the problem description.
// It provides utility functions like freshID and getDb.
import { MongoClient, Db } from "npm:mongodb";
// It's good practice to load .env for local development, assuming Deno.land/x/dotenv is used.
// For production, environment variables are typically managed by the deployment environment.
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

/**
 * Generates a fresh, unique ID.
 * In a real application, consider using a more robust UUID library.
 */
export function freshID(): ID {
  return crypto.randomUUID() as ID;
}

/**
 * Initializes and returns a MongoDB database client and DB instance.
 * Reads connection details from environment variables.
 */
export async function getDb(): Promise<[Db, MongoClient]> {
  const mongoUrl = Deno.env.get("MONGO_URL") || "mongodb://localhost:27017";
  const dbName = Deno.env.get("MONGO_DB_NAME") || "concept_db";
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db(dbName);
  return [db, client];
}

/**
 * Provides a database instance for testing.
 * Automatically ensures a clean state by dropping the database (handled by Deno.test.beforeAll hook).
 */
export async function testDb(): Promise<[Db, MongoClient]> {
  // In a real testing setup, you might want to use a unique DB name per test run
  // or a more sophisticated cleanup. For this context, we assume a global hook
  // or manual cleanup before tests is handled.
  return await getDb();
}
```

```typescript
// file: src/concepts/ProgressTrackingConcept.ts
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "ProgressTracking" + ".";

/**
 * ProgressTrackingConcept
 *
 * @purpose create and track savings plans for discretionary vacation goals
 * @principle a plan breaks a trip’s cost into manageable contributions, the user sets a payment period and the amount to be paid every period. The user can also change those details for some trip.
 */

// Generic types of this concept, treated as branded IDs
type User = ID;
type Plan = ID;
type TripCostEstimation = ID; // This refers to another concept, so it's an ID.

/**
 * State: a set of Users with a set of Plans
 *
 * Represents a document in the 'ProgressTracking.users' collection.
 * Stores the IDs of plans associated with a user.
 */
interface UsersDoc {
  _id: User;
  plans: Plan[]; // IDs of plans belonging to this user
}

/**
 * State: a set of Plans with
 *   a `trip` TripCostEstimation
 *   a `paymentPeriod` Number
 *   a `amountPerPeriod` Number
 *   a `goalAmount` Number
 *   a `currentAmount` Number
 *   a `goalReachedFlag` Boolean
 *
 * Represents a document in the 'ProgressTracking.plans' collection.
 * Stores details of a savings plan.
 */
interface PlansDoc {
  _id: Plan;
  userId: User; // Link to the owning user
  trip: TripCostEstimation;
  paymentPeriod: number; // E.g., number of months, days, etc.
  amountPerPeriod: number; // Amount to contribute every period
  goalAmount: number;
  currentAmount: number;
  goalReachedFlag: boolean;
}

/**
 * Structure for the output of _getPlans query, adhering to the dictionary format.
 * Interpreting `_getPlans(user: User): (plans: Plan[])` as returning an array of
 * dictionaries, where each dictionary has a 'plans' key whose value is a single full plan object.
 * This allows for comprehensive testing of plan details.
 */
interface QueryPlansOutput {
  plans: {
    id: Plan; // Map _id to id for cleaner public interface
    trip: TripCostEstimation;
    paymentPeriod: number;
    amountPerPeriod: number;
    goalAmount: number;
    currentAmount: number;
    goalReachedFlag: boolean;
  };
}

export default class ProgressTrackingConcept {
  private users: Collection<UsersDoc>;
  private plans: Collection<PlansDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.plans = this.db.collection(PREFIX + "plans");
  }

  /**
   * createPlan (user: User, trip: TripCostEstimation, paymentPeriod: Number, amountPerPeriod: Number, goalAmount: Number): (plan: Plan)
   *
   * **requires** amountPerPeriod is a >= 0 amount that the user selects to pay every paymentPeriod month, and goalAmount is >= 0
   *
   * **effect** makes a new plan linked to `trip` and `user`. Sets `currentAmount` to `0`. Sets `goalReachedFlag` to `false`. Returns the created plan's ID.
   */
  async createPlan(
    args: {
      user: User;
      trip: TripCostEstimation;
      paymentPeriod: number;
      amountPerPeriod: number;
      goalAmount: number;
    },
  ): Promise<{ plan: Plan } | { error: string }> {
    const { user, trip, paymentPeriod, amountPerPeriod, goalAmount } = args;

    if (amountPerPeriod < 0 || goalAmount < 0) {
      return { error: "amountPerPeriod and goalAmount must be non-negative." };
    }
    if (paymentPeriod < 0) { // Assuming paymentPeriod also should be non-negative
      return { error: "paymentPeriod must be non-negative." };
    }

    const newPlanId = freshID();
    const newPlan: PlansDoc = {
      _id: newPlanId,
      userId: user,
      trip,
      paymentPeriod,
      amountPerPeriod,
      goalAmount,
      currentAmount: 0,
      goalReachedFlag: false,
    };

    try {
      // Insert the new plan document
      await this.plans.insertOne(newPlan);

      // Add plan to user's plans array, creating user document if it doesn't exist
      await this.users.updateOne(
        { _id: user },
        { $addToSet: { plans: newPlanId } },
        { upsert: true }, // Create the user document if it doesn't already exist
      );

      return { plan: newPlanId };
    } catch (e) {
      console.error("Error creating plan:", e);
      return { error: `Failed to create plan: ${e.message}` };
    }
  }

  /**
   * addAmount (user: User, plan: Plan, amount: Number): Empty
   *
   * **requires** plan exists and belongs to user, amount >= 0
   *
   * **effect** increases `currentAmount` of plan by `amount` and then calls `updateGoalStatus(user, plan)`.
   */
  async addAmount(
    args: { user: User; plan: Plan; amount: number },
  ): Promise<Empty | { error: string }> {
    const { user, plan, amount } = args;

    if (amount < 0) {
      return { error: "Amount to add must be non-negative." };
    }

    try {
      // Deno-ts seems to infer findOneAndUpdate returns the document directly or null
      const updatedPlanDoc = await this.plans.findOneAndUpdate(
        { _id: plan, userId: user },
        { $inc: { currentAmount: amount } },
        { returnDocument: "after" }, // Return the updated document to check status
      );

      // Check the returned document directly for null
      if (updatedPlanDoc === null) {
        return { error: "Plan not found or does not belong to the user." };
      }

      // Automatically call updateGoalStatus
      const updateStatusResult = await this.updateGoalStatus({ user, plan });
      if ("error" in updateStatusResult) {
        // This indicates an internal error in updateGoalStatus, unlikely if plan exists
        console.warn("Warning: updateGoalStatus failed after addAmount:", updateStatusResult.error);
      }

      return {};
    } catch (e) {
      console.error("Error adding amount:", e);
      return { error: `Failed to add amount: ${e.message}` };
    }
  }

  /**
   * removeAmount (user: User, plan: Plan, amount: Number): Empty
   *
   * **requires** plan exists and belongs to user and amount less than or equal to currentAmount associated with plan, amount >= 0
   *
   * **effect** decreases `currentAmount` by `amount` and then calls `updateGoalStatus(user, plan)`.
   */
  async removeAmount(
    args: { user: User; plan: Plan; amount: number },
  ): Promise<Empty | { error: string }> {
    const { user, plan, amount } = args;

    if (amount < 0) {
      return { error: "Amount to remove must be non-negative." };
    }

    try {
      // Find the plan first to check currentAmount before decrementing
      const existingPlan = await this.plans.findOne({ _id: plan, userId: user });

      if (!existingPlan) {
        return { error: "Plan not found or does not belong to the user." };
      }

      if (existingPlan.currentAmount < amount) {
        return { error: "Amount to remove exceeds current amount." };
      }

      // Deno-ts seems to infer findOneAndUpdate returns the document directly or null
      const updatedPlanDoc = await this.plans.findOneAndUpdate(
        { _id: plan, userId: user },
        { $inc: { currentAmount: -amount } },
        { returnDocument: "after" }, // Return the updated document
      );

      // Check the returned document directly for null
      if (updatedPlanDoc === null) {
        // This case should be rare if existingPlan was found, but ensures robustness.
        return { error: "Failed to update plan current amount after check." };
      }

      // Automatically call updateGoalStatus
      const updateStatusResult = await this.updateGoalStatus({ user, plan });
      if ("error" in updateStatusResult) {
        console.warn("Warning: updateGoalStatus failed after removeAmount:", updateStatusResult.error);
      }

      return {};
    } catch (e) {
      console.error("Error removing amount:", e);
      return { error: `Failed to remove amount: ${e.message}` };
    }
  }

  /**
   * deletePlan (user: User, plan: Plan): Empty
   *
   * **requires** `plan` exists and belongs to user
   *
   * **effect** removes plan from the plans collection and from the user's plans array.
   */
  async deletePlan(
    args: { user: User; plan: Plan },
  ): Promise<Empty | { error: string }> {
    const { user, plan } = args;

    try {
      // Find and delete the plan document, verifying ownership
      const deleteResult = await this.plans.deleteOne({ _id: plan, userId: user });

      if (deleteResult.deletedCount === 0) {
        // Either plan not found or did not belong to the user
        return { error: "Plan not found or does not belong to the user." };
      }

      // Remove the plan ID from the user's plans array
      await this.users.updateOne(
        { _id: user },
        { $pull: { plans: plan } },
      );

      return {};
    } catch (e) {
      console.error("Error deleting plan:", e);
      return { error: `Failed to delete plan: ${e.message}` };
    }
  }

  /**
   * modifyPlan (user: User, plan: Plan, newPaymentPeriod: Number, newAmountPerPeriod: Number): Empty
   *
   * **requires** plan exists and belongs to user, newPaymentPeriod >= 0, newAmountPerPeriod >= 0
   *
   * **effect** updates savings schedule associated with plan by changing the `paymentPeriod` to `newPaymentPeriod` and `amountPerPeriod` to `newAmountPerPeriod`.
   */
  async modifyPlan(
    args: {
      user: User;
      plan: Plan;
      newPaymentPeriod: number;
      newAmountPerPeriod: number;
    },
  ): Promise<Empty | { error: string }> {
    const { user, plan, newPaymentPeriod, newAmountPerPeriod } = args;

    if (newPaymentPeriod < 0 || newAmountPerPeriod < 0) {
      return { error: "newPaymentPeriod and newAmountPerPeriod must be non-negative." };
    }

    try {
      const result = await this.plans.updateOne(
        { _id: plan, userId: user },
        {
          $set: {
            paymentPeriod: newPaymentPeriod,
            amountPerPeriod: newAmountPerPeriod,
          },
        },
      );

      if (result.matchedCount === 0) {
        return { error: "Plan not found or does not belong to the user." };
      }

      return {};
    } catch (e) {
      console.error("Error modifying plan:", e);
      return { error: `Failed to modify plan: ${e.message}` };
    }
  }

  /**
   * updateGoalStatus (user: User, plan: Plan): Empty
   *
   * **requires** `plan` exists and belongs to `user`.
   *
   * **effect**
   *   If `plan.currentAmount >= plan.goalAmount`, sets `plan.goalReachedFlag` to `true`.
   *   Otherwise (`plan.currentAmount < plan.goalAmount`), sets `plan.goalReachedFlag` to `false`.
   */
  async updateGoalStatus(
    args: { user: User; plan: Plan },
  ): Promise<Empty | { error: string }> {
    const { user, plan } = args;

    try {
      const planDoc = await this.plans.findOne({ _id: plan, userId: user });

      if (!planDoc) {
        return { error: "Plan not found or does not belong to the user." };
      }

      const newGoalReachedFlag = planDoc.currentAmount >= planDoc.goalAmount;

      // Only update if the flag actually needs to change to avoid unnecessary writes
      if (newGoalReachedFlag !== planDoc.goalReachedFlag) {
        await this.plans.updateOne(
          { _id: plan, userId: user },
          { $set: { goalReachedFlag: newGoalReachedFlag } },
        );
      }

      return {};
    } catch (e) {
      console.error("Error updating goal status:", e);
      return { error: `Failed to update goal status: ${e.message}` };
    }
  }

  /**
   * _getPlans (user: User): (plans: Plan[])
   *
   * **effect** returns an array of dictionaries, where each dictionary has a 'plans' key
   *            whose value is a single Plan's full details belonging to the user.
   */
  async _getPlans(
    args: { user: User },
  ): Promise<QueryPlansOutput[] | Array<{ error: string }>> {
    const { user } = args;

    try {
      const plans = await this.plans.find({ userId: user }).toArray();

      // Map the PlansDoc objects to the desired QueryPlansOutput format
      return plans.map((p) => ({
        plans: {
          id: p._id,
          trip: p.trip,
          paymentPeriod: p.paymentPeriod,
          amountPerPeriod: p.amountPerPeriod,
          goalAmount: p.goalAmount,
          currentAmount: p.currentAmount,
          goalReachedFlag: p.goalReachedFlag,
        },
      }));
    } catch (e) {
      console.error("Error getting plans:", e);
      return [{ error: `Failed to retrieve plans: ${e.message}` }];
    }
  }
}
```

```typescript
// file: src/concepts/ProgressTrackingConcept.test.ts
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import ProgressTrackingConcept from "./ProgressTrackingConcept.ts";
import { ID } from "@utils/types.ts";

// Generic types of this concept for testing
type User = ID;
type Plan = ID;
type TripCostEstimation = ID;

// Helper to extract a plan's details from the _getPlans query result
function getPlanDetails(
  plansOutput: Array<{ plans: any }>,
  planId: Plan,
) {
  const found = plansOutput.find((item) => item.plans.id === planId);
  return found ? found.plans : undefined;
}

Deno.test("ProgressTrackingConcept Tests", async (test) => {
  const [db, client] = await testDb();
  const concept = new ProgressTrackingConcept(db);

  Deno.test.beforeAll(async () => {
    // Drop the database to ensure a clean slate before all tests
    await db.dropDatabase();
    console.log("Database dropped for clean test environment.");
  });

  Deno.test.afterAll(async () => {
    // Clean up: close the database connection after all tests are done
    await client.close();
    console.log("Database connection closed after tests.");
  });

  const userA: User = freshID();
  const tripA: TripCostEstimation = freshID();
  const tripB: TripCostEstimation = freshID();

  await test.step("Principle Test: A plan breaks a trip’s cost into manageable contributions, the user sets a payment period and the amount to be paid every period. The user can also change those details for some trip.", async () => {
    console.log("\n--- Principle Test ---");

    // Trace: 1. Create a plan
    console.log(`Trace: Creating a plan for user ${userA}, trip ${tripA}`);
    const createResult = await concept.createPlan({
      user: userA,
      trip: tripA,
      paymentPeriod: 12, // 12 months
      amountPerPeriod: 100, // $100 per month
      goalAmount: 1200, // Total goal $1200
    });
    assertExists(createResult);
    assertNotEquals("error" in createResult, true, `Expected no error, got: ${JSON.stringify(createResult)}`);
    const planId: Plan = (createResult as { plan: Plan }).plan;
    assertExists(planId);
    console.log(`Action: createPlan -> Plan ID: ${planId}`);

    // Verify initial state
    const plansBeforeAdd = await concept._getPlans({ user: userA });
    assertNotEquals("error" in plansBeforeAdd, true);
    assertEquals(plansBeforeAdd.length, 1);
    let plan = getPlanDetails(plansBeforeAdd as Array<{ plans: any }>, planId);
    assertExists(plan);
    assertEquals(plan.currentAmount, 0, "Initial currentAmount should be 0");
    assertEquals(plan.goalReachedFlag, false, "Initial goalReachedFlag should be false");
    console.log(`Query: _getPlans -> Initial plan state: ${JSON.stringify(plan)}`);

    // Trace: 2. User adds some amount
    console.log(`Trace: Adding $200 to plan ${planId}`);
    const addResult = await concept.addAmount({
      user: userA,
      plan: planId,
      amount: 200,
    });
    assertNotEquals("error" in addResult, true, `Expected no error, got: ${JSON.stringify(addResult)}`);
    console.log(`Action: addAmount -> Added $200`);

    // Verify updated amount and goal status
    const plansAfterAdd = await concept._getPlans({ user: userA });
    assertNotEquals("error" in plansAfterAdd, true);
    plan = getPlanDetails(plansAfterAdd as Array<{ plans: any }>, planId);
    assertExists(plan);
    assertEquals(plan.currentAmount, 200, "currentAmount should be 200 after adding");
    assertEquals(plan.goalReachedFlag, false, "goalReachedFlag should still be false");
    console.log(`Query: _getPlans -> Plan state after add: ${JSON.stringify(plan)}`);

    // Trace: 3. User changes payment details
    console.log(`Trace: Modifying plan ${planId} to new payment period 6 and amount 150`);
    const modifyResult = await concept.modifyPlan({
      user: userA,
      plan: planId,
      newPaymentPeriod: 6, // 6 months
      newAmountPerPeriod: 150, // $150 per month
    });
    assertNotEquals("error" in modifyResult, true, `Expected no error, got: ${JSON.stringify(modifyResult)}`);
    console.log(`Action: modifyPlan -> Changed payment details`);

    // Verify updated payment details
    const plansAfterModify = await concept._getPlans({ user: userA });
    assertNotEquals("error" in plansAfterModify, true);
    plan = getPlanDetails(plansAfterModify as Array<{ plans: any }>, planId);
    assertExists(plan);
    assertEquals(plan.paymentPeriod, 6, "paymentPeriod should be updated to 6");
    assertEquals(plan.amountPerPeriod, 150, "amountPerPeriod should be updated to 150");
    assertEquals(plan.currentAmount, 200, "currentAmount should remain 200");
    console.log(`Query: _getPlans -> Plan state after modify: ${JSON.stringify(plan)}`);

    // Trace: 4. Add more amount to reach goal
    console.log(`Trace: Adding $1000 to plan ${planId} to reach goal (200 + 1000 = 1200)`);
    const addMoreResult = await concept.addAmount({
      user: userA,
      plan: planId,
      amount: 1000,
    });
    assertNotEquals("error" in addMoreResult, true, `Expected no error, got: ${JSON.stringify(addMoreResult)}`);
    console.log(`Action: addAmount -> Added $1000`);

    // Verify goal reached
    const plansAfterGoal = await concept._getPlans({ user: userA });
    assertNotEquals("error" in plansAfterGoal, true);
    plan = getPlanDetails(plansAfterGoal as Array<{ plans: any }>, planId);
    assertExists(plan);
    assertEquals(plan.currentAmount, 1200, "currentAmount should be 1200");
    assertEquals(plan.goalReachedFlag, true, "goalReachedFlag should be true");
    console.log(`Query: _getPlans -> Plan state after reaching goal: ${JSON.stringify(plan)}`);

    // Trace: 5. Remove amount to go below goal
    console.log(`Trace: Removing $50 from plan ${planId} to go below goal (1200 - 50 = 1150)`);
    const removeResult = await concept.removeAmount({
      user: userA,
      plan: planId,
      amount: 50,
    });
    assertNotEquals("error" in removeResult, true, `Expected no error, got: ${JSON.stringify(removeResult)}`);
    console.log(`Action: removeAmount -> Removed $50`);

    // Verify goal no longer reached
    const plansAfterRemove = await concept._getPlans({ user: userA });
    assertNotEquals("error" in plansAfterRemove, true);
    plan = getPlanDetails(plansAfterRemove as Array<{ plans: any }>, planId);
    assertExists(plan);
    assertEquals(plan.currentAmount, 1150, "currentAmount should be 1150");
    assertEquals(plan.goalReachedFlag, false, "goalReachedFlag should be false after removing amount");
    console.log(`Query: _getPlans -> Plan state after going below goal: ${JSON.stringify(plan)}`);

    // Trace: 6. Delete the plan
    console.log(`Trace: Deleting plan ${planId}`);
    const deleteResult = await concept.deletePlan({ user: userA, plan: planId });
    assertNotEquals("error" in deleteResult, true, `Expected no error, got: ${JSON.stringify(deleteResult)}`);
    console.log(`Action: deletePlan -> Deleted plan`);

    // Verify plan is gone
    const plansAfterDelete = await concept._getPlans({ user: userA });
    assertNotEquals("error" in plansAfterDelete, true);
    assertEquals(plansAfterDelete.length, 0, "No plans should exist for userA after deletion");
    console.log(`Query: _getPlans -> User's plans after deletion: ${JSON.stringify(plansAfterDelete)}`);
  });

  await test.step("createPlan action tests", async () => {
    console.log("\n--- createPlan Action Tests ---");
    const user = freshID();
    const trip = freshID();

    // Test 1: Successful plan creation
    console.log("Test: Successful plan creation");
    const createResult = await concept.createPlan({
      user,
      trip,
      paymentPeriod: 10,
      amountPerPeriod: 50,
      goalAmount: 500,
    });
    assertNotEquals("error" in createResult, true, `Expected no error, got: ${JSON.stringify(createResult)}`);
    const planId = (createResult as { plan: Plan }).plan;
    assertExists(planId);
    console.log(`Action: createPlan -> Plan ID: ${planId}`);

    const plans = await concept._getPlans({ user });
    assertNotEquals("error" in plans, true);
    assertEquals(plans.length, 1, "Expected one plan for the user");
    const createdPlan = getPlanDetails(plans as Array<{ plans: any }>, planId);
    assertExists(createdPlan);
    assertEquals(createdPlan.id, planId);
    assertEquals(createdPlan.trip, trip);
    assertEquals(createdPlan.paymentPeriod, 10);
    assertEquals(createdPlan.amountPerPeriod, 50);
    assertEquals(createdPlan.goalAmount, 500);
    assertEquals(createdPlan.currentAmount, 0, "currentAmount should be initialized to 0");
    assertEquals(createdPlan.goalReachedFlag, false, "goalReachedFlag should be initialized to false");
    console.log(`Effect: Plan created with correct initial state: ${JSON.stringify(createdPlan)}`);

    // Test 2: Requirement - negative amountPerPeriod
    console.log("Test: Requirement - negative amountPerPeriod");
    const errorResult1 = await concept.createPlan({
      user,
      trip: freshID(),
      paymentPeriod: 10,
      amountPerPeriod: -10,
      goalAmount: 100,
    });
    assertExists((errorResult1 as { error: string }).error);
    assertEquals(
      (errorResult1 as { error: string }).error,
      "amountPerPeriod and goalAmount must be non-negative.",
      "Expected error for negative amountPerPeriod",
    );
    console.log(`Requirement: Failed to create plan with negative amountPerPeriod as expected: ${JSON.stringify(errorResult1)}`);

    // Test 3: Requirement - negative goalAmount
    console.log("Test: Requirement - negative goalAmount");
    const errorResult2 = await concept.createPlan({
      user,
      trip: freshID(),
      paymentPeriod: 10,
      amountPerPeriod: 10,
      goalAmount: -100,
    });
    assertExists((errorResult2 as { error: string }).error);
    assertEquals(
      (errorResult2 as { error: string }).error,
      "amountPerPeriod and goalAmount must be non-negative.",
      "Expected error for negative goalAmount",
    );
    console.log(`Requirement: Failed to create plan with negative goalAmount as expected: ${JSON.stringify(errorResult2)}`);

    // Test 4: Requirement - negative paymentPeriod
    console.log("Test: Requirement - negative paymentPeriod");
    const errorResult3 = await concept.createPlan({
      user,
      trip: freshID(),
      paymentPeriod: -5,
      amountPerPeriod: 10,
      goalAmount: 100,
    });
    assertExists((errorResult3 as { error: string }).error);
    assertEquals(
      (errorResult3 as { error: string }).error,
      "paymentPeriod must be non-negative.",
      "Expected error for negative paymentPeriod",
    );
    console.log(`Requirement: Failed to create plan with negative paymentPeriod as expected: ${JSON.stringify(errorResult3)}`);
  });

  await test.step("addAmount action tests", async () => {
    console.log("\n--- addAmount Action Tests ---");
    const user = freshID();
    const otherUser = freshID();
    const createResult = await concept.createPlan({
      user,
      trip: freshID(),
      paymentPeriod: 10,
      amountPerPeriod: 50,
      goalAmount: 500,
    });
    const planId = (createResult as { plan: Plan }).plan;
    console.log(`Setup: Created plan ${planId} for user ${user}`);

    // Test 1: Successfully add amount
    console.log("Test: Successfully add amount");
    const addResult = await concept.addAmount({ user, plan: planId, amount: 150 });
    assertNotEquals("error" in addResult, true, `Expected no error, got: ${JSON.stringify(addResult)}`);
    console.log(`Action: addAmount -> Added $150`);

    let plans = await concept._getPlans({ user });
    let plan = getPlanDetails(plans as Array<{ plans: any }>, planId);
    assertExists(plan);
    assertEquals(plan.currentAmount, 150, "currentAmount should be 150");
    assertEquals(plan.goalReachedFlag, false, "goalReachedFlag should be false");
    console.log(`Effect: currentAmount updated, goalReachedFlag is false: ${JSON.stringify(plan)}`);

    // Test 2: Add amount to reach goal
    console.log("Test: Add amount to reach goal");
    await concept.addAmount({ user, plan: planId, amount: 350 }); // 150 + 350 = 500 (goal)
    console.log(`Action: addAmount -> Added $350 to reach goal`);

    plans = await concept._getPlans({ user });
    plan = getPlanDetails(plans as Array<{ plans: any }>, planId);
    assertExists(plan);
    assertEquals(plan.currentAmount, 500, "currentAmount should be 500");
    assertEquals(plan.goalReachedFlag, true, "goalReachedFlag should be true after reaching goal");
    console.log(`Effect: currentAmount reached goal, goalReachedFlag is true: ${JSON.stringify(plan)}`);

    // Test 3: Add amount exceeding goal
    console.log("Test: Add amount exceeding goal");
    await concept.addAmount({ user, plan: planId, amount: 100 }); // 500 + 100 = 600 (exceeds goal)
    console.log(`Action: addAmount -> Added $100 exceeding goal`);

    plans = await concept._getPlans({ user });
    plan = getPlanDetails(plans as Array<{ plans: any }>, planId);
    assertExists(plan);
    assertEquals(plan.currentAmount, 600, "currentAmount should be 600");
    assertEquals(plan.goalReachedFlag, true, "goalReachedFlag should remain true if exceeding goal");
    console.log(`Effect: currentAmount exceeded goal, goalReachedFlag remains true: ${JSON.stringify(plan)}`);

    // Test 4: Requirement - plan does not exist
    console.log("Test: Requirement - plan does not exist");
    const errorResult1 = await concept.addAmount({
      user,
      plan: freshID(),
      amount: 50,
    });
    assertExists((errorResult1 as { error: string }).error);
    assertEquals(
      (errorResult1 as { error: string }).error,
      "Plan not found or does not belong to the user.",
      "Expected error for non-existent plan",
    );
    console.log(`Requirement: Failed to add amount to non-existent plan as expected: ${JSON.stringify(errorResult1)}`);

    // Test 5: Requirement - plan belongs to another user
    console.log("Test: Requirement - plan belongs to another user");
    const errorResult2 = await concept.addAmount({
      user: otherUser,
      plan: planId,
      amount: 50,
    });
    assertExists((errorResult2 as { error: string }).error);
    assertEquals(
      (errorResult2 as { error: string }).error,
      "Plan not found or does not belong to the user.",
      "Expected error for plan belonging to another user",
    );
    console.log(`Requirement: Failed to add amount to another user's plan as expected: ${JSON.stringify(errorResult2)}`);

    // Test 6: Requirement - negative amount
    console.log("Test: Requirement - negative amount");
    const errorResult3 = await concept.addAmount({
      user,
      plan: planId,
      amount: -10,
    });
    assertExists((errorResult3 as { error: string }).error);
    assertEquals(
      (errorResult3 as { error: string }).error,
      "Amount to add must be non-negative.",
      "Expected error for negative amount",
    );
    console.log(`Requirement: Failed to add negative amount as expected: ${JSON.stringify(errorResult3)}`);
  });

  await test.step("removeAmount action tests", async () => {
    console.log("\n--- removeAmount Action Tests ---");
    const user = freshID();
    const otherUser = freshID();
    const createResult = await concept.createPlan({
      user,
      trip: freshID(),
      paymentPeriod: 10,
      amountPerPeriod: 50,
      goalAmount: 500,
    });
    const planId = (createResult as { plan: Plan }).plan;
    await concept.addAmount({ user, plan: planId, amount: 600 }); // Set initial amount
    console.log(`Setup: Created plan ${planId} for user ${user} with currentAmount 600 (goal 500)`);

    // Test 1: Successfully remove amount
    console.log("Test: Successfully remove amount");
    const removeResult = await concept.removeAmount({ user, plan: planId, amount: 150 });
    assertNotEquals("error" in removeResult, true, `Expected no error, got: ${JSON.stringify(removeResult)}`);
    console.log(`Action: removeAmount -> Removed $150`);

    let plans = await concept._getPlans({ user });
    let plan = getPlanDetails(plans as Array<{ plans: any }>, planId);
    assertExists(plan);
    assertEquals(plan.currentAmount, 450, "currentAmount should be 450");
    assertEquals(plan.goalReachedFlag, false, "goalReachedFlag should be false after falling below goal");
    console.log(`Effect: currentAmount updated, goalReachedFlag is false: ${JSON.stringify(plan)}`);

    // Test 2: Remove exact currentAmount
    console.log("Test: Remove exact currentAmount");
    await concept.removeAmount({ user, plan: planId, amount: 450 }); // 450 - 450 = 0
    console.log(`Action: removeAmount -> Removed $450`);

    plans = await concept._getPlans({ user });
    plan = getPlanDetails(plans as Array<{ plans: any }>, planId);
    assertExists(plan);
    assertEquals(plan.currentAmount, 0, "currentAmount should be 0");
    assertEquals(plan.goalReachedFlag, false, "goalReachedFlag should remain false");
    console.log(`Effect: currentAmount is 0, goalReachedFlag is false: ${JSON.stringify(plan)}`);

    // Test 3: Requirement - amount to remove exceeds currentAmount
    console.log("Test: Requirement - amount to remove exceeds currentAmount");
    const errorResult1 = await concept.removeAmount({
      user,
      plan: planId,
      amount: 10,
    }); // currentAmount is 0
    assertExists((errorResult1 as { error: string }).error);
    assertEquals(
      (errorResult1 as { error: string }).error,
      "Amount to remove exceeds current amount.",
      "Expected error when removing more than current amount",
    );
    console.log(`Requirement: Failed to remove amount exceeding current amount as expected: ${JSON.stringify(errorResult1)}`);

    // Test 4: Requirement - plan does not exist
    console.log("Test: Requirement - plan does not exist");
    const errorResult2 = await concept.removeAmount({
      user,
      plan: freshID(),
      amount: 10,
    });
    assertExists((errorResult2 as { error: string }).error);
    assertEquals(
      (errorResult2 as { error: string }).error,
      "Plan not found or does not belong to the user.",
      "Expected error for non-existent plan",
    );
    console.log(`Requirement: Failed to remove amount from non-existent plan as expected: ${JSON.stringify(errorResult2)}`);

    // Test 5: Requirement - plan belongs to another user
    console.log("Test: Requirement - plan belongs to another user");
    const errorResult3 = await concept.removeAmount({
      user: otherUser,
      plan: planId,
      amount: 10,
    });
    assertExists((errorResult3 as { error: string }).error);
    assertEquals(
      (errorResult3 as { error: string }).error,
      "Plan not found or does not belong to the user.",
      "Expected error for plan belonging to another user",
    );
    console.log(`Requirement: Failed to remove amount from another user's plan as expected: ${JSON.stringify(errorResult3)}`);

    // Test 6: Requirement - negative amount
    console.log("Test: Requirement - negative amount");
    const errorResult4 = await concept.removeAmount({
      user,
      plan: planId,
      amount: -10,
    });
    assertExists((errorResult4 as { error: string }).error);
    assertEquals(
      (errorResult4 as { error: string }).error,
      "Amount to remove must be non-negative.",
      "Expected error for negative amount",
    );
    console.log(`Requirement: Failed to remove negative amount as expected: ${JSON.stringify(errorResult4)}`);
  });

  await test.step("deletePlan action tests", async () => {
    console.log("\n--- deletePlan Action Tests ---");
    const user = freshID();
    const otherUser = freshID();
    const createResult = await concept.createPlan({
      user,
      trip: freshID(),
      paymentPeriod: 10,
      amountPerPeriod: 50,
      goalAmount: 500,
    });
    const planId = (createResult as { plan: Plan }).plan;
    console.log(`Setup: Created plan ${planId} for user ${user}`);

    // Test 1: Successfully delete plan
    console.log("Test: Successfully delete plan");
    const deleteResult = await concept.deletePlan({ user, plan: planId });
    assertNotEquals("error" in deleteResult, true, `Expected no error, got: ${JSON.stringify(deleteResult)}`);
    console.log(`Action: deletePlan -> Deleted plan ${planId}`);

    const plans = await concept._getPlans({ user });
    assertNotEquals("error" in plans, true);
    assertEquals(plans.length, 0, "Expected no plans for the user after deletion");
    console.log(`Effect: Plan no longer exists for user: ${JSON.stringify(plans)}`);

    // Test 2: Requirement - plan does not exist
    console.log("Test: Requirement - plan does not exist");
    const errorResult1 = await concept.deletePlan({
      user,
      plan: freshID(),
    });
    assertExists((errorResult1 as { error: string }).error);
    assertEquals(
      (errorResult1 as { error: string }).error,
      "Plan not found or does not belong to the user.",
      "Expected error for non-existent plan",
    );
    console.log(`Requirement: Failed to delete non-existent plan as expected: ${JSON.stringify(errorResult1)}`);

    // Test 3: Requirement - plan belongs to another user
    console.log("Test: Requirement - plan belongs to another user");
    // Re-create a plan for the user to test deletion by other user
    const createResult2 = await concept.createPlan({
      user,
      trip: freshID(),
      paymentPeriod: 10,
      amountPerPeriod: 50,
      goalAmount: 500,
    });
    const planId2 = (createResult2 as { plan: Plan }).plan;
    console.log(`Setup: Created plan ${planId2} for user ${user} for cross-user deletion test`);

    const errorResult2 = await concept.deletePlan({
      user: otherUser,
      plan: planId2,
    });
    assertExists((errorResult2 as { error: string }).error);
    assertEquals(
      (errorResult2 as { error: string }).error,
      "Plan not found or does not belong to the user.",
      "Expected error for plan belonging to another user",
    );
    console.log(`Requirement: Failed to delete another user's plan as expected: ${JSON.stringify(errorResult2)}`);

    // Clean up the plan created for this specific sub-test
    await concept.deletePlan({ user, plan: planId2 });
  });

  await test.step("modifyPlan action tests", async () => {
    console.log("\n--- modifyPlan Action Tests ---");
    const user = freshID();
    const otherUser = freshID();
    const createResult = await concept.createPlan({
      user,
      trip: freshID(),
      paymentPeriod: 12,
      amountPerPeriod: 100,
      goalAmount: 1200,
    });
    const planId = (createResult as { plan: Plan }).plan;
    console.log(`Setup: Created plan ${planId} for user ${user}`);

    // Test 1: Successfully modify plan details
    console.log("Test: Successfully modify plan details");
    const modifyResult = await concept.modifyPlan({
      user,
      plan: planId,
      newPaymentPeriod: 6,
      newAmountPerPeriod: 150,
    });
    assertNotEquals("error" in modifyResult, true, `Expected no error, got: ${JSON.stringify(modifyResult)}`);
    console.log(`Action: modifyPlan -> Changed period to 6, amount to 150`);

    let plans = await concept._getPlans({ user });
    let plan = getPlanDetails(plans as Array<{ plans: any }>, planId);
    assertExists(plan);
    assertEquals(plan.paymentPeriod, 6, "paymentPeriod should be updated");
    assertEquals(plan.amountPerPeriod, 150, "amountPerPeriod should be updated");
    console.log(`Effect: Plan details updated: ${JSON.stringify(plan)}`);

    // Test 2: Requirement - plan does not exist
    console.log("Test: Requirement - plan does not exist");
    const errorResult1 = await concept.modifyPlan({
      user,
      plan: freshID(),
      newPaymentPeriod: 1,
      newAmountPerPeriod: 1,
    });
    assertExists((errorResult1 as { error: string }).error);
    assertEquals(
      (errorResult1 as { error: string }).error,
      "Plan not found or does not belong to the user.",
      "Expected error for non-existent plan",
    );
    console.log(`Requirement: Failed to modify non-existent plan as expected: ${JSON.stringify(errorResult1)}`);

    // Test 3: Requirement - plan belongs to another user
    console.log("Test: Requirement - plan belongs to another user");
    const errorResult2 = await concept.modifyPlan({
      user: otherUser,
      plan: planId,
      newPaymentPeriod: 1,
      newAmountPerPeriod: 1,
    });
    assertExists((errorResult2 as { error: string }).error);
    assertEquals(
      (errorResult2 as { error: string }).error,
      "Plan not found or does not belong to the user.",
      "Expected error for plan belonging to another user",
    );
    console.log(`Requirement: Failed to modify another user's plan as expected: ${JSON.stringify(errorResult2)}`);

    // Test 4: Requirement - negative newPaymentPeriod
    console.log("Test: Requirement - negative newPaymentPeriod");
    const errorResult3 = await concept.modifyPlan({
      user,
      plan: planId,
      newPaymentPeriod: -1,
      newAmountPerPeriod: 100,
    });
    assertExists((errorResult3 as { error: string }).error);
    assertEquals(
      (errorResult3 as { error: string }).error,
      "newPaymentPeriod and newAmountPerPeriod must be non-negative.",
      "Expected error for negative newPaymentPeriod",
    );
    console.log(`Requirement: Failed to modify with negative newPaymentPeriod as expected: ${JSON.stringify(errorResult3)}`);

    // Test 5: Requirement - negative newAmountPerPeriod
    console.log("Test: Requirement - negative newAmountPerPeriod");
    const errorResult4 = await concept.modifyPlan({
      user,
      plan: planId,
      newPaymentPeriod: 12,
      newAmountPerPeriod: -10,
    });
    assertExists((errorResult4 as { error: string }).error);
    assertEquals(
      (errorResult4 as { error: string }).error,
      "newPaymentPeriod and newAmountPerPeriod must be non-negative.",
      "Expected error for negative newAmountPerPeriod",
    );
    console.log(`Requirement: Failed to modify with negative newAmountPerPeriod as expected: ${JSON.stringify(errorResult4)}`);

    await concept.deletePlan({ user, plan: planId }); // Clean up
  });

  await test.step("updateGoalStatus action tests", async () => {
    console.log("\n--- updateGoalStatus Action Tests ---");
    const user = freshID();
    const otherUser = freshID();

    // Setup: Create a plan below goal
    const createResult1 = await concept.createPlan({
      user,
      trip: freshID(),
      paymentPeriod: 1,
      amountPerPeriod: 100,
      goalAmount: 500,
    });
    const planId1 = (createResult1 as { plan: Plan }).plan;
    await concept.addAmount({ user, plan: planId1, amount: 200 }); // currentAmount = 200
    console.log(`Setup: Plan ${planId1} for ${user} with currentAmount 200, goalAmount 500`);

    // Test 1: Manually update status when currentAmount < goalAmount
    console.log("Test: Manually update status when currentAmount < goalAmount");
    const updateResult1 = await concept.updateGoalStatus({ user, plan: planId1 });
    assertNotEquals("error" in updateResult1, true, `Expected no error, got: ${JSON.stringify(updateResult1)}`);
    console.log(`Action: updateGoalStatus -> Called for plan ${planId1}`);

    let plans = await concept._getPlans({ user });
    let plan = getPlanDetails(plans as Array<{ plans: any }>, planId1);
    assertExists(plan);
    assertEquals(plan.goalReachedFlag, false, "goalReachedFlag should be false");
    console.log(`Effect: goalReachedFlag correctly false: ${JSON.stringify(plan)}`);

    // Setup: Update plan to be at or above goal
    await concept.addAmount({ user, plan: planId1, amount: 300 }); // currentAmount = 500
    console.log(`Setup: Updated plan ${planId1} to currentAmount 500, goalAmount 500`);

    // Test 2: Manually update status when currentAmount >= goalAmount
    console.log("Test: Manually update status when currentAmount >= goalAmount");
    const updateResult2 = await concept.updateGoalStatus({ user, plan: planId1 });
    assertNotEquals("error" in updateResult2, true, `Expected no error, got: ${JSON.stringify(updateResult2)}`);
    console.log(`Action: updateGoalStatus -> Called for plan ${planId1}`);

    plans = await concept._getPlans({ user });
    plan = getPlanDetails(plans as Array<{ plans: any }>, planId1);
    assertExists(plan);
    assertEquals(plan.goalReachedFlag, true, "goalReachedFlag should be true");
    console.log(`Effect: goalReachedFlag correctly true: ${JSON.stringify(plan)}`);

    // Test 3: Requirement - plan does not exist
    console.log("Test: Requirement - plan does not exist");
    const errorResult1 = await concept.updateGoalStatus({
      user,
      plan: freshID(),
    });
    assertExists((errorResult1 as { error: string }).error);
    assertEquals(
      (errorResult1 as { error: string }).error,
      "Plan not found or does not belong to the user.",
      "Expected error for non-existent plan",
    );
    console.log(`Requirement: Failed to update goal status for non-existent plan as expected: ${JSON.stringify(errorResult1)}`);

    // Test 4: Requirement - plan belongs to another user
    console.log("Test: Requirement - plan belongs to another user");
    const errorResult2 = await concept.updateGoalStatus({
      user: otherUser,
      plan: planId1,
    });
    assertExists((errorResult2 as { error: string }).error);
    assertEquals(
      (errorResult2 as { error: string }).error,
      "Plan not found or does not belong to the user.",
      "Expected error for plan belonging to another user",
    );
    console.log(`Requirement: Failed to update goal status for another user's plan as expected: ${JSON.stringify(errorResult2)}`);

    await concept.deletePlan({ user, plan: planId1 }); // Clean up
  });

  await test.step("_getPlans query tests", async () => {
    console.log("\n--- _getPlans Query Tests ---");
    const user1 = freshID();
    const user2 = freshID();
    const trip1 = freshID();
    const trip2 = freshID();

    // Test 1: No plans for a user
    console.log("Test: Query for user with no plans");
    const plans1 = await concept._getPlans({ user: user1 });
    assertNotEquals("error" in plans1, true);
    assertEquals(plans1.length, 0, "Expected empty array for user with no plans");
    console.log(`Effect: User ${user1} has no plans: ${JSON.stringify(plans1)}`);

    // Test 2: One plan for a user
    console.log("Test: Query for user with one plan");
    const createResult1 = await concept.createPlan({
      user: user1,
      trip: trip1,
      paymentPeriod: 12,
      amountPerPeriod: 100,
      goalAmount: 1200,
    });
    const planId1 = (createResult1 as { plan: Plan }).plan;
    console.log(`Setup: Created plan ${planId1} for user ${user1}`);

    const plans2 = await concept._getPlans({ user: user1 });
    assertNotEquals("error" in plans2, true);
    assertEquals(plans2.length, 1, "Expected one plan for user1");
    const fetchedPlan1 = getPlanDetails(plans2 as Array<{ plans: any }>, planId1);
    assertExists(fetchedPlan1);
    assertEquals(fetchedPlan1.id, planId1);
    assertEquals(fetchedPlan1.trip, trip1);
    console.log(`Effect: Retrieved single plan for user ${user1}: ${JSON.stringify(plans2)}`);

    // Test 3: Multiple plans for a user
    console.log("Test: Query for user with multiple plans");
    const createResult2 = await concept.createPlan({
      user: user1,
      trip: trip2,
      paymentPeriod: 6,
      amountPerPeriod: 50,
      goalAmount: 300,
    });
    const planId2 = (createResult2 as { plan: Plan }).plan;
    console.log(`Setup: Created plan ${planId2} for user ${user1}`);

    const plans3 = await concept._getPlans({ user: user1 });
    assertNotEquals("error" in plans3, true);
    assertEquals(plans3.length, 2, "Expected two plans for user1");
    const fetchedPlan2 = getPlanDetails(plans3 as Array<{ plans: any }>, planId2);
    assertExists(fetchedPlan2);
    assertEquals(fetchedPlan2.id, planId2);
    assertEquals(fetchedPlan2.trip, trip2);
    console.log(`Effect: Retrieved multiple plans for user ${user1}: ${JSON.stringify(plans3)}`);

    // Test 4: Plans for a different user
    console.log("Test: Query for a different user (user2)");
    const createResult3 = await concept.createPlan({
      user: user2,
      trip: freshID(),
      paymentPeriod: 3,
      amountPerPeriod: 200,
      goalAmount: 600,
    });
    const planId3 = (createResult3 as { plan: Plan }).plan;
    console.log(`Setup: Created plan ${planId3} for user ${user2}`);

    const plansForUser2 = await concept._getPlans({ user: user2 });
    assertNotEquals("error" in plansForUser2, true);
    assertEquals(plansForUser2.length, 1, "Expected one plan for user2");
    const fetchedPlan3 = getPlanDetails(plansForUser2 as Array<{ plans: any }>, planId3);
    assertExists(fetchedPlan3);
    assertEquals(fetchedPlan3.id, planId3);
    console.log(`Effect: Retrieved plans for user ${user2}: ${JSON.stringify(plansForUser2)}`);

    const plansForUser1Again = await concept._getPlans({ user: user1 });
    assertNotEquals("error" in plansForUser1Again, true);
    assertEquals(plansForUser1Again.length, 2, "User1's plans should be unaffected and still two");
    const fetchedPlan3Check = getPlanDetails(plansForUser1Again as Array<{ plans: any }>, planId3);
    assertEquals(fetchedPlan3Check, undefined, "User1 should not see User2's plans");
    console.log(`Effect: User ${user1} cannot see user ${user2}'s plans. Verified: ${JSON.stringify(plansForUser1Again)}`);

    // Clean up
    await concept.deletePlan({ user: user1, plan: planId1 });
    await concept.deletePlan({ user: user1, plan: planId2 });
    await concept.deletePlan({ user: user2, plan: planId3 });
  });
});
```
