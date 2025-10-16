---
timestamp: 'Thu Oct 16 2025 10:25:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_102558.b2200244.md]]'
content_id: 9d07f2aaebd7079043663563019da4082d4c40aadc4cdb9692f7c6ba16b576ac
---

# response:

It appears `deno-ts` is interpreting the return type of `findOneAndUpdate` slightly differently than the standard `FindAndModifyResult<TSchema>` wrapper. The error `Property 'value' does not exist on type 'WithId<PlanDoc>'` suggests that `deno-ts` believes `result` itself is already the document (`WithId<PlansDoc>`) or `null`, rather than an object containing the document in a `value` property.

To satisfy `deno-ts` and align with its inferred type, we should directly assign the result of `findOneAndUpdate` to a variable and then check that variable for `null`. This implies `findOneAndUpdate` directly returns `WithId<PlansDoc> | null` in your Deno environment's type resolution for the `mongodb` npm module.

Here's the corrected code for `addAmount` and `removeAmount` methods, removing the `.value` access.

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
 // IDs of plans belonging to this user
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
   *            whose value is a single Plan ID belonging to the user.
   */
  async _getPlans(
    args: { user: User },
  ): Promise<Array<{ plans: Plan }> | Array<{ error: string }>> {
    const { user } = args;

    try {
      // Find all plan documents associated with the user and project only their _id
      const plans = await this.plans.find(
        { userId: user },
        { projection: { _id: 1 } },
      ).toArray();

      // Map the results to the desired format: an array of { plans: Plan_ID }
      return plans.map((p) => ({
        plans: p._id,
      }));
    } catch (e) {
      console.error("Error getting plans:", e);
      return [{ error: `Failed to retrieve plans: ${e.message}` }];
    }
  }
}
```
