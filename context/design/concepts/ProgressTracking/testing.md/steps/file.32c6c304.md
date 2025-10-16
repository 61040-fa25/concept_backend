---
timestamp: 'Thu Oct 16 2025 10:32:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_103214.f2e300b6.md]]'
content_id: 32c6c30498ea5a3cf9017fb16bfa317687f18d58789ff2469ef48c7fdc891d1a
---

# file: src/concepts/ProgressTrackingConcept.ts

```typescript
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
 *
 * NOTE: The textual effect description in the problem's last block stated `_getPlans`
 * would return `(plans: Plan[])` where `Plan` is an `ID`. This implied returning only
 * plan IDs. However, the general testing principle ("It should be possible to confirm
 * any expectations for what the state looks like... using the chosen set of queries")
 * necessitates access to full plan details for verification of action effects.
 *
 * To allow for comprehensive testing as required, this implementation interprets
 * `_getPlans(user: User): (plans: Plan[])` as returning an array of objects, where
 * each object has a 'plans' key whose value is a *full plan object*. This aligns
 * with the example given for queries returning nested dictionaries. If only IDs were
 * returned, most action effects (e.g., changes to `currentAmount`, `goalReachedFlag`)
 * could not be verified without direct database access, which is forbidden in tests.
 */
interface QueryPlansOutput {
  plans: {
    id: Plan; // Expose _id as 'id' for a cleaner public interface
    userId: User; // Include userId for explicit ownership verification if needed
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
      return { error: `Failed to create plan` };
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
      return { error: `Failed to add amount` };
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
      return { error: `Failed to remove amount` };
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
      return { error: `Failed to delete plan` };
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
      return { error: `Failed to modify plan` };
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
      return { error: `Failed to update goal status` };
    }
  }

  /**
   * _getPlans (user: User): (plans: Plan[])
   *
   * **effect** returns an array of dictionaries, where each dictionary has a 'plans' key
   *            whose value is a single Plan's full details belonging to the user.
   *
   * NOTE: This implementation deviates from the textual description in the problem's last block
   * which stated it would return `Plan` (i.e., `ID`) IDs only. This change is made to enable
   * comprehensive testing of action effects as mandated by the "Concept Implementation" section
   * ("It should be possible to confirm any expectations for what the state looks like... using
   * the chosen set of queries"). Without returning full plan details, such verification is impossible
   * without direct database access, which is forbidden in tests.
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
          userId: p.userId,
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
      return [{ error: `Failed to retrieve plans` }];
    }
  }
}
```
