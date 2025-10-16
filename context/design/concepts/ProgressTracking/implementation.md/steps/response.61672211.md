---
timestamp: 'Wed Oct 15 2025 22:46:40 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_224640.92baf8e4.md]]'
content_id: 61672211fc38650af11b00532b31d66e0f2c8772b084a92a0fe509e697d5ca64
---

# response:

```typescript
// To run this code, you'll need Node.js and the 'uuid' package.
// Install uuid: npm install uuid @types/uuid
import { v4 as uuidv4 } from 'uuid';

/**
 * @typedef {string} PlanIdentifier
 * Represents a unique identifier for a savings plan within the ProgressTracking concept.
 * This acts as the identity for a 'Plan' entity within the concept's state.
 */
type PlanIdentifier = string;

/**
 * @interface PlanProperties
 * Defines the intrinsic state stored for each savings plan.
 * This corresponds to "a set of Plans with..." in the concept specification.
 * The generic type TTripCostEstimation ensures polymorphism as per the concept definition.
 */
interface PlanProperties<TTripCostEstimation> {
    trip: TTripCostEstimation;     // The generic trip reference
    paymentPeriod: number;         // e.g., in months, as specified
    amountPerPeriod: number;       // Amount to save per paymentPeriod
    goalAmount: number;            // Total amount targeted for the trip
    currentAmount: number;         // Current amount saved towards the goal, initialized to 0
}

/**
 * @concept ProgressTracking
 *
 * @template TTripCostEstimation - The type of the external TripCostEstimation object.
 *                                This type is treated polymorphically by the concept.
 * @template TUser - The type of the external User object.
 *                    This type is treated polymorphically by the concept.
 *
 * @purpose create and track savings plans for discretionary vacation goals
 *
 * @principle a plan breaks a trip’s cost into manageable contributions, the user sets a payment period
 *            and the amount to be paid every period. The user can also change those details for some trip.
 */
class ProgressTracking<TTripCostEstimation, TUser> {
    // --- Concept State ---
    // Represents "a set of Plans with..."
    // Maps a PlanIdentifier (UUID) to its detailed PlanProperties.
    private allPlans: Map<PlanIdentifier, PlanProperties<TTripCostEstimation>>;

    // Represents "a set of Users with a set of Plans".
    // Maps a User identifier to a Set of PlanIdentifiers that user owns.
    // This allows the concept to manage relationships without modifying external User objects.
    private userToPlans: Map<TUser, Set<PlanIdentifier>>;

    constructor() {
        this.allPlans = new Map();
        this.userToPlans = new Map();
    }

    /**
     * Helper method to validate plan existence and ownership.
     * This centralizes common precondition checks for several actions.
     * @private
     * @param user The user attempting the action.
     * @param planId The identifier of the plan.
     * @returns The PlanProperties object if the plan exists and belongs to the user.
     * @throws Error if the plan does not exist or does not belong to the user.
     */
    private validatePlanOwnership(user: TUser, planId: PlanIdentifier): PlanProperties<TTripCostEstimation> {
        if (!this.allPlans.has(planId)) {
            throw new Error(`Plan with ID '${planId}' does not exist.`);
        }

        const userPlans = this.userToPlans.get(user);
        // Check if the user has any plans AND if this specific plan is among them
        if (!userPlans || !userPlans.has(planId)) {
            throw new Error(`Plan with ID '${planId}' does not belong to user '${user}'.`);
        }

        // If checks pass, the plan exists and is owned by the user.
        return this.allPlans.get(planId)!; // '!' asserts that it's not undefined, safe due to has() check.
    }

    /**
     * @action createPlan
     * @param user The `User` (identity) creating the plan.
     * @param trip The `TripCostEstimation` (identity) the plan is for.
     * @param paymentPeriod The number of periods (e.g., months) between payments.
     * @param amountPerPeriod The amount to be paid every `paymentPeriod`.
     * @param goalAmount The total amount to save for the trip.
     * @returns `{ plan: PlanIdentifier }` The identifier of the newly created plan.
     *
     * @requires `paymentPeriod`, `amountPerPeriod`, and `goalAmount` must be positive numbers.
     * @effect Makes a new plan, links it to `trip` and `user`, and initializes `currentAmount` to 0.
     */
    public createPlan(
        user: TUser,
        trip: TTripCostEstimation,
        paymentPeriod: number,
        amountPerPeriod: number,
        goalAmount: number
    ): { plan: PlanIdentifier } {
        // Pre-condition checks as per 'requires'
        if (paymentPeriod <= 0) {
            throw new Error("createPlan: 'paymentPeriod' must be a positive number.");
        }
        if (amountPerPeriod <= 0) {
            throw new Error("createPlan: 'amountPerPeriod' must be a positive number.");
        }
        if (goalAmount <= 0) {
            throw new Error("createPlan: 'goalAmount' must be a positive number.");
        }

        const newPlanId: PlanIdentifier = uuidv4(); // Generate a unique ID for the new plan
        const planProperties: PlanProperties<TTripCostEstimation> = {
            trip,
            paymentPeriod,
            amountPerPeriod,
            goalAmount,
            currentAmount: 0, // New plans always start with zero saved
        };

        // Effects: Update state
        this.allPlans.set(newPlanId, planProperties);

        // Ensure the user has an entry in userToPlans
        if (!this.userToPlans.has(user)) {
            this.userToPlans.set(user, new Set<PlanIdentifier>());
        }
        this.userToPlans.get(user)!.add(newPlanId);

        console.log(`[Concept:ProgressTracking] Created plan '${newPlanId}' for user '${user}'.`);
        return { plan: newPlanId };
    }

    /**
     * @action addAmount
     * @param user The `User` (identity) performing the action.
     * @param plan The `PlanIdentifier` of the plan to update.
     * @param amount The positive amount to add to `currentAmount`.
     * @returns `{ currentAmount: number }` The updated current amount of the plan.
     *
     * @requires `plan` must exist and belong to `user`. `amount` must be a positive number.
     * @effect Increases `currentAmount` of the specified plan by `amount`.
     */
    public addAmount(user: TUser, plan: PlanIdentifier, amount: number): { currentAmount: number } {
        // Pre-condition checks
        if (amount <= 0) {
            throw new Error("addAmount: 'amount' to add must be a positive number.");
        }

        const planProperties = this.validatePlanOwnership(user, plan); // Validates plan existence and ownership

        // Effects: Update state
        planProperties.currentAmount += amount;

        console.log(`[Concept:ProgressTracking] Added ${amount} to plan '${plan}'. New current amount: ${planProperties.currentAmount}.`);
        return { currentAmount: planProperties.currentAmount };
    }

    /**
     * @action removeAmount
     * @param user The `User` (identity) performing the action.
     * @param plan The `PlanIdentifier` of the plan to update.
     * @param amount The positive amount to remove from `currentAmount`.
     * @returns `{}` An empty object indicating successful completion.
     *
     * @requires `plan` must exist and belong to `user`. `amount` must be a positive number
     *           and less than or equal to the plan's `currentAmount`.
     * @effect Decreases `currentAmount` of the specified plan by `amount`.
     */
    public removeAmount(user: TUser, plan: PlanIdentifier, amount: number): {} {
        // Pre-condition checks
        if (amount <= 0) {
            throw new Error("removeAmount: 'amount' to remove must be a positive number.");
        }

        const planProperties = this.validatePlanOwnership(user, plan); // Validates plan existence and ownership

        if (planProperties.currentAmount < amount) {
            throw new Error(`removeAmount: Cannot remove ${amount}. Current amount for plan '${plan}' is only ${planProperties.currentAmount}.`);
        }

        // Effects: Update state
        planProperties.currentAmount -= amount;

        console.log(`[Concept:ProgressTracking] Removed ${amount} from plan '${plan}'. New current amount: ${planProperties.currentAmount}.`);
        return {}; // Return empty object for success as per specification
    }

    /**
     * @action deletePlan
     * @param user The `User` (identity) performing the action.
     * @param plan The `PlanIdentifier` of the plan to delete.
     * @returns `{}` An empty object indicating successful completion.
     *
     * @requires `plan` must exist and belong to `user`.
     * @effect Removes the plan and its association with the user from the concept's state.
     */
    public deletePlan(user: TUser, plan: PlanIdentifier): {} {
        this.validatePlanOwnership(user, plan); // Validates plan existence and ownership

        // Effects: Update state
        this.allPlans.delete(plan); // Remove the plan's properties

        // Remove the plan from the user's set of plans
        const userPlans = this.userToPlans.get(user);
        if (userPlans) { // This check is technically redundant due to validatePlanOwnership, but good for type safety.
            userPlans.delete(plan);
            // If the user no longer has any plans, optionally remove their entry from the map
            if (userPlans.size === 0) {
                this.userToPlans.delete(user);
            }
        }

        console.log(`[Concept:ProgressTracking] Deleted plan '${plan}' for user '${user}'.`);
        return {};
    }

    /**
     * @action modifyPlan
     * @param user The `User` (identity) performing the action.
     * @param plan The `PlanIdentifier` of the plan to modify.
     * @param newPaymentPeriod The new number of periods between payments.
     * @param newAmountPerPeriod The new amount to be paid every new `paymentPeriod`.
     * @returns `{}` An empty object indicating successful completion.
     *
     * @requires `plan` must exist and belong to `user`.
     *           `newPaymentPeriod` and `newAmountPerPeriod` must be positive numbers.
     * @effect Updates the `paymentPeriod` and `amountPerPeriod` of the specified plan.
     */
    public modifyPlan(
        user: TUser,
        plan: PlanIdentifier,
        newPaymentPeriod: number,
        newAmountPerPeriod: number
    ): {} {
        // Pre-condition checks
        if (newPaymentPeriod <= 0) {
            throw new Error("modifyPlan: 'newPaymentPeriod' must be a positive number.");
        }
        if (newAmountPerPeriod <= 0) {
            throw new Error("modifyPlan: 'newAmountPerPeriod' must be a positive number.");
        }

        const planProperties = this.validatePlanOwnership(user, plan); // Validates plan existence and ownership

        // Effects: Update state
        planProperties.paymentPeriod = newPaymentPeriod;
        planProperties.amountPerPeriod = newAmountPerPeriod;

        console.log(`[Concept:ProgressTracking] Modified plan '${plan}'. New schedule: ${newAmountPerPeriod} every ${newPaymentPeriod} periods.`);
        return {};
    }

    // --- Concept Queries ---
    // These queries are explicitly defined to provide read access to the concept's state,
    // following the example of explicit query specifications.

    /**
     * @query getPlanDetails
     * @description Retrieves the full details of a specific plan for a given user.
     * @param user The user whose plan details are being requested.
     * @param planId The identifier of the plan.
     * @returns The `PlanProperties` object for the plan, augmented with its `id`.
     * @requires `planId` exists and belongs to `user`.
     */
    public getPlanDetails(user: TUser, planId: PlanIdentifier): PlanProperties<TTripCostEstimation> & { id: PlanIdentifier } {
        // Uses the same validation logic as actions, ensuring proper access control.
        const properties = this.validatePlanOwnership(user, planId);
        return { id: planId, ...properties };
    }

    /**
     * @query getAllPlanDetailsForUser
     * @description Retrieves all plans and their details for a given user.
     * @param user The user whose plans are to be retrieved.
     * @returns An array of `PlanProperties` objects, each augmented with its `id`.
     *          Returns an empty array if the user has no plans.
     */
    public getAllPlanDetailsForUser(user: TUser): (PlanProperties<TTripCostEstimation> & { id: PlanIdentifier })[] {
        const planIds = this.userToPlans.get(user);
        if (!planIds || planIds.size === 0) {
            return [];
        }

        const userPlans: (PlanProperties<TTripCostEstimation> & { id: PlanIdentifier })[] = [];
        for (const planId of planIds) {
            const planProperties = this.allPlans.get(planId);
            if (planProperties) { // Should always be true if planId is in userPlans and allPlans is consistent.
                userPlans.push({ id: planId, ...planProperties });
            }
        }
        return userPlans;
    }
}

// --- Example Usage ---
// This section demonstrates how the concept class can be used.
// In a real application, TripCostEstimation and User would likely be more complex objects
// or IDs from other parts of the system. Here, we use simple string IDs.

// Define simple types for demonstration
type MyTripId = string;
type MyUserId = string;

const userAlice: MyUserId = 'user-alice-123';
const userBob: MyUserId = 'user-bob-456';
const userCharlie: MyUserId = 'user-charlie-789'; // For testing non-existent plans/users

const tripRome: MyTripId = 'trip-rome-789';
const tripHawaii: MyTripId = 'trip-hawaii-abc';
const tripJapan: MyTripId = 'trip-japan-def';

// Instantiate the ProgressTracking concept
const progressTracker = new ProgressTracking<MyTripId, MyUserId>();

console.log("--- Concept Actions Demonstration ---");

// Alice creates two plans
let aliceRomePlanId: PlanIdentifier = '';
let aliceHawaiiPlanId: PlanIdentifier = '';
try {
    console.log("\n[ACTION] Alice creates a plan for Rome: save 150 every 3 months for a 1500 goal.");
    aliceRomePlanId = progressTracker.createPlan(userAlice, tripRome, 3, 150, 1500).plan;

    console.log("[ACTION] Alice creates another plan for Hawaii: save 200 monthly for a 2000 goal.");
    aliceHawaiiPlanId = progressTracker.createPlan(userAlice, tripHawaii, 1, 200, 2000).plan;
} catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
}

// Bob creates a plan
let bobRomePlanId: PlanIdentifier = '';
try {
    console.log("\n[ACTION] Bob creates a plan for Rome: save 250 every 2 months for a 2500 goal.");
    bobRomePlanId = progressTracker.createPlan(userBob, tripRome, 2, 250, 2500).plan;
} catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
}

console.log("\n--- Querying State ---");
console.log("Alice's plans:", JSON.stringify(progressTracker.getAllPlanDetailsForUser(userAlice), null, 2));
console.log("Bob's plans:", JSON.stringify(progressTracker.getAllPlanDetailsForUser(userBob), null, 2));
console.log("Charlie's plans (should be empty):", JSON.stringify(progressTracker.getAllPlanDetailsForUser(userCharlie), null, 2));


// Alice adds money to her Rome plan
try {
    console.log(`\n[ACTION] Alice adds 300 to her Rome plan (${aliceRomePlanId})...`);
    const result = progressTracker.addAmount(userAlice, aliceRomePlanId, 300);
    console.log(`[RESULT] Alice's Rome plan current amount: ${result.currentAmount}`);
} catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
}

// Alice adds more money
try {
    console.log(`[ACTION] Alice adds 100 to her Hawaii plan (${aliceHawaiiPlanId})...`);
    progressTracker.addAmount(userAlice, aliceHawaiiPlanId, 100);
} catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
}

// Alice modifies her Rome plan's schedule
try {
    console.log(`\n[ACTION] Alice modifies her Rome plan (${aliceRomePlanId}) schedule to 100 monthly.`);
    progressTracker.modifyPlan(userAlice, aliceRomePlanId, 1, 100);
} catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
}

console.log("\n--- Querying State After Modifications ---");
console.log("Alice's Rome plan details:", JSON.stringify(progressTracker.getPlanDetails(userAlice, aliceRomePlanId), null, 2));

// Alice removes money from her Rome plan
try {
    console.log(`\n[ACTION] Alice removes 50 from her Rome plan (${aliceRomePlanId})...`);
    progressTracker.removeAmount(userAlice, aliceRomePlanId, 50);
} catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
}
console.log("Alice's Rome plan details after removal:", JSON.stringify(progressTracker.getPlanDetails(userAlice, aliceRomePlanId), null, 2));


// Demonstrating pre-condition failures
console.log("\n--- Testing Pre-condition Failures ---");
try {
    console.log("\n[INVALID ACTION] Alice tries to remove more than saved (1000 from current: 250)...");
    progressTracker.removeAmount(userAlice, aliceRomePlanId, 1000); // Should fail
} catch (error: any) {
    console.error(`[EXPECTED ERROR] ${error.message}`);
}

try {
    console.log("\n[INVALID ACTION] Bob tries to modify Alice's plan...");
    progressTracker.modifyPlan(userBob, aliceRomePlanId, 1, 50); // Should fail (not Bob's plan)
} catch (error: any) {
    console.error(`[EXPECTED ERROR] ${error.message}`);
}

try {
    console.log("\n[INVALID ACTION] Alice tries to create a plan with zero goal amount...");
    progressTracker.createPlan(userAlice, tripJapan, 1, 100, 0); // Should fail
} catch (error: any) {
    console.error(`[EXPECTED ERROR] ${error.message}`);
}

try {
    console.log("\n[INVALID ACTION] Alice tries to add a negative amount...");
    progressTracker.addAmount(userAlice, aliceRomePlanId, -50); // Should fail
} catch (error: any) {
    console.error(`[EXPECTED ERROR] ${error.message}`);
}


// Alice deletes her Hawaii plan
try {
    console.log(`\n[ACTION] Alice deletes her Hawaii plan (${aliceHawaiiPlanId})...`);
    progressTracker.deletePlan(userAlice, aliceHawaiiPlanId);
} catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
}

console.log("\n--- Querying State After Deletion ---");
console.log("Alice's plans after Hawaii plan deletion:", JSON.stringify(progressTracker.getAllPlanDetailsForUser(userAlice), null, 2));
console.log("Bob's plans (should be unchanged):", JSON.stringify(progressTracker.getAllPlanDetailsForUser(userBob), null, 2));

try {
    console.log("\n[INVALID ACTION] Alice tries to access the deleted Hawaii plan...");
    progressTracker.getPlanDetails(userAlice, aliceHawaiiPlanId);
} catch (error: any) {
    console.error(`[EXPECTED ERROR] ${error.message}`);
}

// Delete all plans to clean up
try {
    console.log(`\n[ACTION] Alice deletes her Rome plan (${aliceRomePlanId})...`);
    progressTracker.deletePlan(userAlice, aliceRomePlanId);
    console.log(`[ACTION] Bob deletes his Rome plan (${bobRomePlanId})...`);
    progressTracker.deletePlan(userBob, bobRomePlanId);
} catch (error: any) {
    console.error(`[ERROR] ${error.message}`);
}

console.log("\n--- Final State Check ---");
console.log("Alice's plans:", JSON.stringify(progressTracker.getAllPlanDetailsForUser(userAlice), null, 2));
console.log("Bob's plans:", JSON.stringify(progressTracker.getAllPlanDetailsForUser(userBob), null, 2));
```
