---
timestamp: 'Fri Oct 17 2025 16:41:05 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_164105.1feb1330.md]]'
content_id: da0eadcdcdbf5ba79eae528414ec9b5cbe9388ab027678e8497fa1bb0dd14563
---

# file: src/TripCostEstimation/TripCostEstimationConcept.test.ts

```typescript
import { assertEquals, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Import the concept class and its dependencies
import TripCostEstimationConcept from "./TripCostEstimationConcept.ts";
import { GeminiLLM } from "@utils/gemini-llm.ts";

// Helper types from the concept for clarity in tests (module-scoped, consistent with concept)
type User = ID;
type Location = ID;
type TravelPlan = ID;
// Note: Necessity and CostEstimate are internal IDs; their full document structure cannot be queried directly from tests.

// --- Important Note for LLM-related Tests ---
// These tests now use the actual GeminiLLM class.
// For these tests to pass, ensure the following environment variables are set:
// - GEMINI_API_KEY: Your Google Gemini API key.
// - GEMINI_MODEL: The Gemini model to use (e.g., "gemini-1.5-flash").
// Tests that simulate specific LLM response formats (e.g., invalid JSON, inaccurate values)
// cannot be reliably controlled or provoked using a real LLM instance
// without mocks or specific, temporary environment manipulation (e.g., for API key failure).

// Helper function to setup the test environment (DB, concept, base data)
async function setupTestEnvironment() {
    const [db, client] = await testDb();
    const concept = new TripCostEstimationConcept(db);

    const userAlice = "user:Alice" as User;
    const locationNYC = freshID() as Location;
    const locationLA = freshID() as Location;
    const locationCHI = freshID() as Location;

    // Pre-populate locations and user Alice. This is part of setting up the environment.
    // Accessing internal collections directly here is for *setup*, not verification.
    await (concept as any)["locations"].insertOne({ _id: locationNYC, city: "New York City" });
    await (concept as any)["locations"].insertOne({ _id: locationLA, city: "Los Angeles" });
    await (concept as any)["locations"].insertOne({ _id: locationCHI, city: "Chicago" });
    await (concept as any)["users"].updateOne(
        { _id: userAlice },
        { $setOnInsert: { _id: userAlice } },
        { upsert: true },
    );

    return { client, concept, userAlice, locationNYC, locationLA, locationCHI };
}

// --- Operational Principle Test ---
Deno.test("TripCostEstimationConcept: Operational Principle Trace", async () => {
    console.log("\n--- Operational Principle Trace Test ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const principleUser = userAlice; // Use Alice for principle trace
    const principleLocationHome = locationNYC;
    const principleLocationDest = locationLA;

    const fromDateP = new Date();
    fromDateP.setDate(fromDateP.getDate() + 60); // 2 months from now
    const toDateP = new Date();
    toDateP.setDate(toDateP.getDate() + 67); // 7 nights later, making it an 8-day trip (7 nights)

    // 1. Action: Create initial travel plan with default necessity
    console.log("1. Action: createTravelPlan");
    const createPlanResult = await concept.createTravelPlan({
        user: principleUser,
        fromCity: principleLocationHome,
        toCity: principleLocationDest,
        fromDate: fromDateP,
        toDate: toDateP,
    });
    if ("error" in createPlanResult) throw new Error(`Principle Trace failed to create travel plan: ${createPlanResult.error}`);
    const principleTravelPlanId = createPlanResult.travelPlan;
    console.log(`   Created travel plan (${principleTravelPlanId}).`);

    // Verification 1: Check if the plan exists for the user
    const allPlansAfterCreation = await concept._getAllTravelPlans({ user: principleUser });
    if (Array.isArray(allPlansAfterCreation) && allPlansAfterCreation.some(p => 'error' in p)) {
        throw new Error(`Query failed: ${(allPlansAfterCreation[0] as {error: string}).error}`);
    }
    assertEquals((allPlansAfterCreation as ID[]).includes(principleTravelPlanId), true, "Verification: Travel plan ID is listed after creation.");
    // NOTE: Cannot verify detailed fields (fromCity, toDate, default necessity) due to API constraints.

    // 2. Action: Update necessity based on user preferences
    console.log("2. Action: updateNecessity");
    const updateNecessityResult = await concept.updateNecessity({
        user: principleUser,
        travelPlan: principleTravelPlanId,
        accommodation: false, // User prefers to stay with friends/family
        diningFlag: true,     // But still wants to eat out
    });
    if ("error" in updateNecessityResult) throw new Error(`Principle Trace failed to update necessity: ${updateNecessityResult.error}`);
    console.log(`   Updated necessity for plan ${principleTravelPlanId} (accommodation: false, dining: true).`);
    // NOTE: Cannot verify updated necessity content directly due to API constraints.

    // 3. Action: Generate AI cost estimate using LLM
    console.log("3. Action: generateAICostEstimate (Live LLM Call)");
    const llm = new GeminiLLM();
    const generateEstimateResult = await concept.generateAICostEstimate({
        user: principleUser,
        travelPlan: principleTravelPlanId,
        llm: llm,
    });
    if ("error" in generateEstimateResult) throw new Error(`Principle Trace failed to generate estimate: ${generateEstimateResult.error}`);
    console.log(`   Generated AI cost estimate for plan ${principleTravelPlanId}.`);
    // NOTE: Cannot verify detailed cost estimate values directly due to API constraints.

    // 4. Action: Calculate total cost based on generated estimate
    console.log("4. Action: estimateCost");
    const estimateCostResult = await concept.estimateCost({ user: principleUser, travelPlan: principleTravelPlanId });
    if ("error" in estimateCostResult) throw new Error(`Principle Trace failed to get total cost: ${estimateCostResult.error}`);

    const numDaysPrinciple = Math.ceil((toDateP.getTime() - fromDateP.getTime()) / (1000 * 60 * 60 * 24));
    // Without querying the stored CostEstimate, we can only verify the *type* and *reasonableness*
    // of the output. Exact value depends on live LLM.
    assertEquals(typeof estimateCostResult.totalCost, 'number', "Verification: Total estimated cost should be a number.");
    assertEquals(estimateCostResult.totalCost > 0, true, "Verification: Total estimated cost should be greater than 0.");
    console.log(`   Calculated total cost: ${estimateCostResult.totalCost}.`);

    // 5. Query: Retrieve user's travel plans
    console.log("5. Query: _getAllTravelPlans");
    const allPrinciplePlansFinal = await concept._getAllTravelPlans({ user: principleUser });
    if (Array.isArray(allPrinciplePlansFinal) && allPrinciplePlansFinal.some(p => 'error' in p)) {
        throw new Error(`Query failed: ${(allPrinciplePlansFinal[0] as {error: string}).error}`);
    }
    assertEquals((allPrinciplePlansFinal as ID[]).includes(principleTravelPlanId), true, "Verification: Principle travel plan is still listed for the user.");

    console.log("Principle Trace completed successfully.");
    await client.close();
});


// --- Interesting Cases Tests ---

Deno.test("TripCostEstimationConcept: Interesting Case 1 - Invalid Travel Plan Creation Dates", async () => {
    console.log("\n--- Interesting Case 1: Invalid Travel Plan Creation Dates ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Test 1: toDate < fromDate
    const fromDateInvalid1 = new Date(); fromDateInvalid1.setDate(fromDateInvalid1.getDate() + 15);
    const toDateInvalid1 = new Date(); toDateInvalid1.setDate(toDateInvalid1.getDate() + 10);
    console.log(`Action: Attempting createTravelPlan where toDate (${toDateInvalid1.toISOString()}) < fromDate (${fromDateInvalid1.toISOString()}).`);
    let result = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate: fromDateInvalid1, toDate: toDateInvalid1 });
    assertObjectMatch(result, { error: "Arrival date must be on or after departure date." }, "Expected error for invalid date range.");
    console.log(`Requirement Confirmed: ${result.error}`);

    // Test 2: fromDate is in the past
    const fromDateInvalid2 = new Date(); fromDateInvalid2.setDate(fromDateInvalid2.getDate() - 5);
    const toDateInvalid2 = new Date(); toDateInvalid2.setDate(toDateInvalid2.getDate() + 10);
    console.log(`Action: Attempting createTravelPlan where fromDate (${fromDateInvalid2.toISOString()}) is in the past.`);
    result = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate: fromDateInvalid2, toDate: toDateInvalid2 });
    assertObjectMatch(result, { error: "Departure and arrival dates must be in the future." }, "Expected error for past dates.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: Interesting Case 2 - Unauthorized Access/Non-existent IDs for Updates", async () => {
    console.log("\n--- Interesting Case 2: Unauthorized Access/Non-existent IDs for Updates ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const userBob = "user:Bob" as User;
    await (concept as any)["users"].updateOne({ _id: userBob }, { $setOnInsert: { _id: userBob } }, { upsert: true });

    // Test 1: updateNecessity by wrong user
    console.log(`Action: Attempting updateNecessity for plan ${travelPlanId} by user ${userBob}.`);
    let result = await concept.updateNecessity({ user: userBob, travelPlan: travelPlanId, accommodation: false, diningFlag: false });
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Expected error for unauthorized update.");
    console.log(`Requirement Confirmed: ${result.error}`);

    // Test 2: resetNecessity for non-existent travel plan
    const nonExistentTravelPlan = freshID() as TravelPlan;
    console.log(`Action: Attempting resetNecessity for non-existent travel plan ${nonExistentTravelPlan}.`);
    result = await concept.resetNecessity({ user: userAlice, travelPlan: nonExistentTravelPlan });
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Expected error for non-existent travel plan.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: Interesting Case 3 - `estimateCost` without a generated estimate", async () => {
    console.log("\n--- Interesting Case 3: `estimateCost` without a generated estimate ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a new travel plan but skip generateAICostEstimate
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 20);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 25);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error("Setup failed: Failed to create new plan for test.");
    const newTravelPlanId = createResult.travelPlan;
    console.log(`Setup: Created travel plan ${newTravelPlanId} but deliberately did NOT generate a cost estimate.`);

    console.log(`Action: Attempting to estimate cost for plan ${newTravelPlanId} which has no associated estimate.`);
    const result = await concept.estimateCost({ user: userAlice, travelPlan: newTravelPlanId });

    assertObjectMatch(result, { error: "No cost estimate found for this travel plan." }, "Requirement: Should return error if no cost estimate exists.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await (concept as any).deleteTravelPlan({ user: userAlice, travelPlan: newTravelPlanId }); // Clean up
    await client.close();
});

Deno.test("TripCostEstimationConcept: Interesting Case 4 - `generateAICostEstimate` with LLM API failure", async () => {
    console.log("\n--- Interesting Case 4: `generateAICostEstimate` with LLM API failure ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    
    // Temporarily unset GEMINI_API_KEY to simulate API failure
    const originalApiKey = Deno.env.get("GEMINI_API_KEY");
    if (originalApiKey) Deno.env.set("GEMINI_API_KEY", "");
    
    try {
        const llm = new GeminiLLM();
        console.log("Action: Attempting to generate estimate with a (simulated) missing GEMINI_API_KEY.");
        const result = await concept.generateAICostEstimate({
            user: userAlice,
            travelPlan: travelPlanId,
            llm: llm,
        });

        assertObjectMatch(result, { error: (val) => val.includes("LLM API call failed: Missing GEMINI_API_KEY environment variable.") }, "Expected error for missing API key.");
        console.log(`Requirement Confirmed: ${result.error}`);

    } finally {
        // Restore environment variable
        if (originalApiKey) Deno.env.set("GEMINI_API_KEY", originalApiKey);
    }
    
    await client.close();
});

Deno.test("TripCostEstimationConcept: Interesting Case 5 - Delete Travel Plan and verify removal from user's list", async () => {
    console.log("\n--- Interesting Case 5: Delete Travel Plan and verify removal from user's list ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    // Ensure plan is initially listed
    let allPlans = await concept._getAllTravelPlans({ user: userAlice });
    if (Array.isArray(allPlans) && allPlans.some(p => 'error' in p)) { throw new Error(`Query failed: ${(allPlans[0] as {error: string}).error}`); }
    assertEquals((allPlans as ID[]).includes(travelPlanId), true, "Pre-check: Travel plan should be listed before deletion.");
    console.log(`Setup: Travel plan ${travelPlanId} created and confirmed present in user's list.`);

    // Action: Delete the travel plan
    console.log(`Action: Deleting travel plan with ID: ${travelPlanId}.`);
    const deleteResult = await concept.deleteTravelPlan({
        user: userAlice,
        travelPlan: travelPlanId,
    });
    if ("error" in deleteResult) { throw new Error(`Test failed: ${deleteResult.error}`); }
    console.log(`Effect: Travel plan ${travelPlanId} deleted successfully.`);

    // Verification: Check if the plan is no longer listed for the user
    allPlans = await concept._getAllTravelPlans({ user: userAlice });
    if (Array.isArray(allPlans) && allPlans.some(p => 'error' in p)) { throw new Error(`Query failed: ${(allPlans[0] as {error: string}).error}`); }
    assertEquals((allPlans as ID[]).includes(travelPlanId), false, "Verification: Deleted travel plan ID should NOT be listed for the user.");
    console.log("Verification: Travel plan no longer appears in user's list.");

    await client.close();
});

Deno.test("TripCostEstimationConcept: Query Test - `_getAllTravelPlans` edge cases", async () => {
    console.log("\n--- Query Test: `_getAllTravelPlans` edge cases ---");
    const { client, concept, userAlice } = await setupTestEnvironment(); // setupTestEnvironment pre-creates userAlice

    // Test 1: User with no plans
    const userNoPlans = "user:Charlie" as User;
    await (concept as any)["users"].updateOne(
      { _id: userNoPlans },
      { $setOnInsert: { _id: userNoPlans } },
      { upsert: true },
    );
    console.log(`Action: Querying plans for user ${userNoPlans} (no plans).`);
    let allPlans = await concept._getAllTravelPlans({ user: userNoPlans });
    if (Array.isArray(allPlans) && allPlans.some(p => 'error' in p)) { throw new Error(`Query failed: ${(allPlans[0] as {error: string}).error}`); }
    assertEquals(allPlans.length, 0, "Effect: Should return an empty array for a user with no plans.");
    console.log(`Verification: Plans for ${userNoPlans}: ${JSON.stringify(allPlans)}`);

    // Test 2: Non-existent user
    const nonExistentUser = "user:NonExistent" as User;
    console.log(`Action: Querying plans for non-existent user ${nonExistentUser}.`);
    const result = await concept._getAllTravelPlans({ user: nonExistentUser });
    if (!Array.isArray(result) || result.length === 0 || !('error' in result[0])) {
         throw new Error(`Test failed: _getAllTravelPlans did not return expected error for non-existent user: ${JSON.stringify(result)}`);
    }
    assertObjectMatch(result[0], { error: `User with ID ${nonExistentUser} does not exist.` }, "Requirement: Should return error for non-existent user.");
    console.log(`Requirement Confirmed: ${result[0].error}`);

    await client.close();
});
```
