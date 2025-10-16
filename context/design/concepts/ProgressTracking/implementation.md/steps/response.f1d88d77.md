---
timestamp: 'Wed Oct 15 2025 22:42:09 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_224209.b80383fa.md]]'
content_id: f1d88d77f615d1d1b49998308471207f7377c9ba4a42e45bfb0c198835fdf5a9
---

# response:

This implementation provides a TypeScript class `ProgressTracking` that models the specified concept. It manages the state (plans and their associations to users) and implements the defined actions with pre-condition checks and post-condition effects, adhering to the principles outlined in the concept specification.

### Key Implementation Details:

* **Generic Types**: `TripCostEstimation` and `User` are treated as generic type parameters (`TTripCostEstimation`, `TUser` in the class definition), emphasizing that the concept handles them polymorphically as opaque identifiers. In the example usage, they are instantiated as `string` types.
* **State Representation**:
  * `allPlans`: A `Map` to store `PlanIdentifier`s (generated UUIDs) mapped to their `PlanProperties`. This covers "a set of Plans with..."
  * `userToPlans`: A `Map` to store `User` identifiers mapped to a `Set` of `PlanIdentifier`s. This covers "a set of Users with a set of Plans," maintaining the ownership relationship without modifying the external `User` type.
* **Actions**: Each action (`createPlan`, `addAmount`, `removeAmount`, `deletePlan`, `modifyPlan`) is implemented as a public method.
  * **Pre-conditions (`requires`)**: These are enforced by throwing `Error` exceptions if the conditions are not met (e.g., plan not found, not owned by user, invalid amount).
  * **Post-conditions (`effects`)**: These are achieved by modifying the internal `allPlans` and `userToPlans` maps.
  * **Return Values**: Actions return objects matching the specified output arguments (e.g., `{ plan: PlanIdentifier }`) or an empty object `{}` for actions without explicit results, adhering to the "dictionary object" return style mentioned.
* **Plan Identifiers**: `uuid` is used to generate unique `PlanIdentifier`s for new plans.

```typescript
// To run this code, you'll need Node.js and the 'uuid' package.
// Install uuid: npm install uuid @types/uuid
import { v4 as uuidv4 } from 'uuid';

/**
 * @typedef {string} PlanIdentifier
 * Represents a unique identifier for a savings plan within the ProgressTracking concept.
 */
type PlanIdentifier = string;

/**
 * @interface PlanProperties
 * Defines the intrinsic state stored for each savings plan.
 */
interface PlanProperties<TTripCostEstimation> {
    trip: TTripCostEstimation; // The generic trip reference
    paymentPeriod: number;     // e.g., in months
    amountPerPeriod: number;   // Amount to save per paymentPeriod
    goalAmount: number;        // Total amount targeted for the trip
    currentAmount: number;     // Current amount saved towards the goal
}

/**
 * @concept ProgressTracking
 * @template TTripCostEstimation - The type of the external TripCostEstimation object (e.g., a string ID).
 * @template TUser - The type of the external User object (e.g., a string ID).
 *
 * @purpose create and track savings plans for discretionary vacation goals
 *
 * @principle a plan breaks a trip’s cost into manageable contributions, the user sets a payment period
 *            and the amount to be paid every period. The user can also change those details for some trip.
 */
class ProgressTracking<TTripCostEstimation, TUser> {
    // --- Concept State ---
    // Maps a PlanIdentifier to its detailed properties
    private allPlans: Map<PlanIdentifier, PlanProperties<TTripCostEstimation>>;
    // Maps a User to a Set of PlanIdentifiers they own.
    // This maintains the "a set of Users with a set of Plans" relationship.
    private userToPlans: Map<TUser, Set<PlanIdentifier>>;

    constructor() {
        this.allPlans = new Map();
        this.userToPlans = new Map();
    }

    /**
     * Helper to validate plan existence and ownership.
     * @private
     * @param user The user attempting the action.
     * @param planId The ID of the plan.
     * @returns The PlanProperties if valid.
     * @throws Error if the plan does not exist or does not belong to the user.
     */
    private validatePlanOwnership(user: TUser, planId: PlanIdentifier): PlanProperties<TTripCostEstimation> {
        if (!this.allPlans.has(planId)) {
            throw new Error(`Plan with ID '${planId}' does not exist.`);
        }
        const userPlans = this.userToPlans.get(user);
        if (!userPlans || !userPlans.has(planId)) {
            // Note: If userPlans doesn't exist, it means the user has no plans, thus doesn't own this one.
            // If userPlans exists but doesn't contain planId, user doesn't own this plan.
            throw new Error(`Plan with ID '${planId}' does not belong to user '${user}'.`);
        }
        // If we reach here, the plan exists and belongs to the user.
        return this.allPlans.get(planId)!;
    }

    /**
     * @action createPlan
     * @description Makes a new plan linked to `trip` and `user`.
     * @param user The user initiating the plan.
     * @param trip The `TripCostEstimation` object (ID/reference) this plan is for.
     * @param paymentPeriod The number of months between payments.
     * @param amountPerPeriod The amount to contribute each payment period.
     * @param goalAmount The total target amount for the trip.
     * @returns `{ plan: PlanIdentifier }` The identifier of the newly created plan.
     * @requires `amountPerPeriod` and `goalAmount` are positive, and `paymentPeriod` is a positive number.
     * @effect A new plan is created with `currentAmount` initialized to 0 and linked to the user.
     */
    public createPlan(
        user: TUser,
        trip: TTripCostEstimation,
        paymentPeriod: number,
        amountPerPeriod: number,
        goalAmount: number
    ): { plan: PlanIdentifier } {
        // Pre-condition checks
        if (paymentPeriod <= 0) {
            throw new Error("createPlan: paymentPeriod must be a positive number.");
        }
        if (amountPerPeriod <= 0) {
            throw new Error("createPlan: amountPerPeriod must be a positive number.");
        }
        if (goalAmount <= 0) {
            throw new Error("createPlan: goalAmount must be a positive number.");
        }

        const newPlanId: PlanIdentifier = uuidv4(); // Generate a unique ID for the new plan
        const planProperties: PlanProperties<TTripCostEstimation> = {
            trip,
            paymentPeriod,
            amountPerPeriod,
            goalAmount,
            currentAmount: 0, // New plans start with no amount saved
        };

        this.allPlans.set(newPlanId, planProperties);

        // Link the new plan to the user
        if (!this.userToPlans.has(user)) {
            this.userToPlans.set(user, new Set());
        }
        this.userToPlans.get(user)!.add(newPlanId);

        console.log(`[Concept Log] Plan '${newPlanId}' created for user '${user}' for trip '${JSON.stringify(trip)}'.`);
        return { plan: newPlanId };
    }

    /**
     * @action addAmount
     * @description Increases the `currentAmount` of a plan by the specified `amount`.
     * @param user The user performing the action.
     * @param plan The identifier of the plan to update.
     * @param amount The positive amount to add to the plan's current savings.
     * @returns `{ currentAmount: number }` The updated current amount of the plan.
     * @requires `plan` exists and belongs to `user`, and `amount` is positive.
     * @effect The `currentAmount` of the plan is increased.
     */
    public addAmount(user: TUser, plan: PlanIdentifier, amount: number): { currentAmount: number } {
        // Pre-condition check
        if (amount <= 0) {
            throw new Error("addAmount: Amount to add must be a positive number.");
        }

        const planProperties = this.validatePlanOwnership(user, plan);

        // Effect
        planProperties.currentAmount += amount;
        console.log(`[Concept Log] Added ${amount} to plan '${plan}'. New current amount: ${planProperties.currentAmount}`);
        return { currentAmount: planProperties.currentAmount };
    }

    /**
     * @action removeAmount
     * @description Decreases the `currentAmount` of a plan by the specified `amount`.
     * @param user The user performing the action.
     * @param plan The identifier of the plan to update.
     * @param amount The positive amount to remove from the plan's current savings.
     * @returns `{}` An empty object on success.
     * @requires `plan` exists and belongs to `user`, `amount` is positive, and `amount` is less than or equal to `currentAmount`.
     * @effect The `currentAmount` of the plan is decreased.
     */
    public removeAmount(user: TUser, plan: PlanIdentifier, amount: number): {} {
        // Pre-condition check
        if (amount <= 0) {
            throw new Error("removeAmount: Amount to remove must be a positive number.");
        }

        const planProperties = this.validatePlanOwnership(user, plan);

        // Pre-condition check: amount less than or equal to currentAmount
        if (planProperties.currentAmount < amount) {
            throw new Error(`removeAmount: Cannot remove ${amount}. Current amount for plan '${plan}' is only ${planProperties.currentAmount}.`);
        }

        // Effect
        planProperties.currentAmount -= amount;
        console.log(`[Concept Log] Removed ${amount} from plan '${plan}'. New current amount: ${planProperties.currentAmount}`);
        return {};
    }

    /**
     * @action deletePlan
     * @description Removes a plan from the system.
     * @param user The user performing the action.
     * @param plan The identifier of the plan to delete.
     * @returns `{}` An empty object on success.
     * @requires `plan` exists and belongs to `user`.
     * @effect The plan and its association with the user are removed from the state.
     */
    public deletePlan(user: TUser, plan: PlanIdentifier): {} {
        this.validatePlanOwnership(user, plan); // Throws if plan doesn't exist or isn't owned by user

        // Effects
        this.allPlans.delete(plan);
        this.userToPlans.get(user)!.delete(plan); // We know user and plan association exists from validatePlanOwnership

        // Clean up user entry if no more plans exist for them
        if (this.userToPlans.get(user)!.size === 0) {
            this.userToPlans.delete(user);
        }

        console.log(`[Concept Log] Plan '${plan}' deleted for user '${user}'.`);
        return {};
    }

    /**
     * @action modifyPlan
     * @description Updates the savings schedule (payment period and amount per period) for a plan.
     * @param user The user performing the action.
     * @param plan The identifier of the plan to modify.
     * @param newPaymentPeriod The new number of months between payments (must be positive).
     * @param newAmountPerPeriod The new amount to contribute each payment period (must be positive).
     * @returns `{}` An empty object on success.
     * @requires `plan` exists and belongs to `user`, and `newPaymentPeriod` and `newAmountPerPeriod` are positive.
     * @effect The `paymentPeriod` and `amountPerPeriod` of the plan are updated.
     */
    public modifyPlan(
        user: TUser,
        plan: PlanIdentifier,
        newPaymentPeriod: number,
        newAmountPerPeriod: number
    ): {} {
        // Pre-condition checks
        if (newPaymentPeriod <= 0) {
            throw new Error("modifyPlan: New paymentPeriod must be a positive number.");
        }
        if (newAmountPerPeriod <= 0) {
            throw new Error("modifyPlan: New amountPerPeriod must be a positive number.");
        }

        const planProperties = this.validatePlanOwnership(user, plan);

        // Effects
        planProperties.paymentPeriod = newPaymentPeriod;
        planProperties.amountPerPeriod = newAmountPerPeriod;

        console.log(`[Concept Log] Plan '${plan}' modified. New payment period: ${newPaymentPeriod}, new amount per period: ${newAmountPerPeriod}.`);
        return {};
    }

    // --- Concept Queries (Implicitly defined by state, but explicitly specified for API) ---

    /**
     * @query getPlanDetails
     * @description Retrieves the full details of a specific plan for a given user.
     * @param user The user whose plan details are being requested.
     * @param planId The identifier of the plan.
     * @returns The `PlanProperties` object for the plan, including its ID.
     * @requires `planId` exists and belongs to `user`.
     */
    public getPlanDetails(user: TUser, planId: PlanIdentifier): PlanProperties<TTripCostEstimation> & { id: PlanIdentifier } {
        const properties = this.validatePlanOwnership(user, planId);
        return { id: planId, ...properties };
    }

    /**
     * @query getAllPlanDetailsForUser
     * @description Retrieves all plans and their details for a given user.
     * @param user The user whose plans are to be retrieved.
     * @returns An array of `PlanProperties` objects, each augmented with its `PlanIdentifier`. Returns an empty array if the user has no plans.
     */
    public getAllPlanDetailsForUser(user: TUser): (PlanProperties<TTripCostEstimation> & { id: PlanIdentifier })[] {
        const planIds = this.userToPlans.get(user);
        if (!planIds) {
            return [];
        }

        const userPlans: (PlanProperties<TTripCostEstimation> & { id: PlanIdentifier })[] = [];
        for (const planId of planIds) {
            const planProperties = this.allPlans.get(planId);
            if (planProperties) {
                userPlans.push({ id: planId, ...planProperties });
            }
        }
        return userPlans;
    }
}

// --- Example Usage ---
// This section demonstrates how the concept class can be used.
// In a real application, TripCostEstimation and User would likely be more complex objects
// or IDs from other parts of the system.

// Define simple types for demonstration
type MyTripId = string;
type MyUserId = string;

const userAlice: MyUserId = 'user-alice-123';
const userBob: MyUserId = 'user-bob-456';

const tripRome: MyTripId = 'trip-rome-789';
const tripHawaii: MyTripId = 'trip-hawaii-abc';

// Instantiate the ProgressTracking concept
const progressTracker = new ProgressTracking<MyTripId, MyUserId>();

console.log("--- Concept Actions Demonstration ---");

// Alice creates two plans
let alicePlan1Id: PlanIdentifier = '';
let alicePlan2Id: PlanIdentifier = '';
try {
    console.log("\n[ACTION] Alice creates a plan for Rome...");
    alicePlan1Id = progressTracker.createPlan(userAlice, tripRome, 3, 150, 1500).plan; // Save 150 every 3 months for Rome, goal 1500

    console.log("[ACTION] Alice creates another plan for Hawaii...");
    alicePlan2Id = progressTracker.createPlan(userAlice, tripHawaii, 1, 200, 2000).plan; // Save 200 monthly for Hawaii, goal 2000
} catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
}

// Bob creates a plan
let bobPlan1Id: PlanIdentifier = '';
try {
    console.log("\n[ACTION] Bob creates a plan for Rome...");
    bobPlan1Id = progressTracker.createPlan(userBob, tripRome, 2, 250, 2500).plan; // Save 250 every 2 months for Rome, goal 2500
} catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
}

console.log("\n--- Querying State ---");
console.log("Alice's current plans:", progressTracker.getAllPlanDetailsForUser(userAlice));
console.log("Bob's current plans:", progressTracker.getAllPlanDetailsForUser(userBob));

// Alice adds money to her Rome plan
try {
    console.log(`\n[ACTION] Alice adds 300 to her Rome plan (${alicePlan1Id})...`);
    const result = progressTracker.addAmount(userAlice, alicePlan1Id, 300);
    console.log(`[RESULT] Alice's Rome plan current amount: ${result.currentAmount}`);
} catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
}

// Alice adds more money
try {
    console.log(`[ACTION] Alice adds 100 to her Hawaii plan (${alicePlan2Id})...`);
    progressTracker.addAmount(userAlice, alicePlan2Id, 100);
} catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
}

// Alice modifies her Rome plan's schedule
try {
    console.log(`\n[ACTION] Alice modifies her Rome plan (${alicePlan1Id}) schedule...`);
    progressTracker.modifyPlan(userAlice, alicePlan1Id, 1, 100); // Change to 100 monthly
} catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
}

console.log("\n--- Querying State After Modifications ---");
console.log("Alice's Rome plan details:", progressTracker.getPlanDetails(userAlice, alicePlan1Id));

// Alice removes money from her Rome plan
try {
    console.log(`\n[ACTION] Alice removes 50 from her Rome plan (${alicePlan1Id})...`);
    progressTracker.removeAmount(userAlice, alicePlan1Id, 50);
} catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
}
console.log("Alice's Rome plan details after removal:", progressTracker.getPlanDetails(userAlice, alicePlan1Id));


// Demonstrating pre-condition failures
console.log("\n--- Testing Pre-condition Failures ---");
try {
    console.log("\n[INVALID ACTION] Alice tries to remove more than saved...");
    progressTracker.removeAmount(userAlice, alicePlan1Id, 1000); // Should fail
} catch (error: any) {
    console.error(`[EXPECTED ERROR] ${error.message}`);
}

try {
    console.log("\n[INVALID ACTION] Bob tries to modify Alice's plan...");
    progressTracker.modifyPlan(userBob, alicePlan1Id, 1, 50); // Should fail (not Bob's plan)
} catch (error: any) {
    console.error(`[EXPECTED ERROR] ${error.message}`);
}

try {
    console.log("\n[INVALID ACTION] Alice tries to create a plan with zero goal amount...");
    progressTracker.createPlan(userAlice, "trip-invalid", 1, 100, 0); // Should fail
} catch (error: any) {
    console.error(`[EXPECTED ERROR] ${error.message}`);
}


// Alice deletes her Hawaii plan
try {
    console.log(`\n[ACTION] Alice deletes her Hawaii plan (${alicePlan2Id})...`);
    progressTracker.deletePlan(userAlice, alicePlan2Id);
} catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
}

console.log("\n--- Querying State After Deletion ---");
console.log("Alice's plans after Hawaii plan deletion:", progressTracker.getAllPlanDetailsForUser(userAlice));
console.log("Bob's plans (should be unchanged):", progressTracker.getAllPlanDetailsForUser(userBob));

```
