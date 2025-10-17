---
timestamp: 'Fri Oct 17 2025 16:57:20 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_165720.00260374.md]]'
content_id: 708c2505d78c3f579b8729fce6851dd0c3d6a7972bf50c533ba635ffa97a7ab6
---

# file: src/TripCostEstimation/TripCostEstimationConcept.test.ts

```typescript
import { assertEquals, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import "jsr:@std/dotenv/load"; // Ensure environment variables are loaded for GeminiLLM

// Import the concept class and its dependencies
import TripCostEstimationConcept from "./TripCostEstimationConcept.ts";
import { GeminiLLM } from "@utils/gemini-llm.ts";

// Helper types from the concept for clarity in tests (module-scoped, consistent with concept)
type User = ID;
type Location = ID;
type TravelPlan = ID;
// Note: Necessity and CostEstimate are internal IDs; their full document structure cannot be queried directly from tests.

// Helper function to setup the test environment (DB, concept, base data)
async function setupTestEnvironment() {
    const [db, client] = await testDb();
    const concept = new TripCostEstimationConcept(db);

    const userAlice = "user:Alice" as User;
    const locationNYC = freshID() as Location;
    const locationLA = freshID() as Location;
    const locationCHI = freshID() as Location; // Additional location for variety

    // Pre-populate locations and user Alice. This is for initial setup, not direct test verification.
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

// --- Test 1: Operational Principle Trace ---
Deno.test("TripCostEstimationConcept: Operational Principle Trace", async () => {
    console.log("\n--- Test: Operational Principle Trace ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDateP = new Date();
    fromDateP.setDate(fromDateP.getDate() + 60); // 2 months from now
    const toDateP = new Date();
    toDateP.setDate(toDateP.getDate() + 67); // 7 nights later, making it an 8-day trip (7 nights)

    console.log("1. Action: createTravelPlan");
    const createPlanResult = await concept.createTravelPlan({
        user: userAlice,
        fromCity: locationNYC,
        toCity: locationLA,
        fromDate: fromDateP,
        toDate: toDateP,
    });
    if ("error" in createPlanResult) throw new Error(`Principle Trace failed to create travel plan: ${createPlanResult.error}`);
    const principleTravelPlanId = createPlanResult.travelPlan;
    console.log(`   Created travel plan ID: ${principleTravelPlanId}.`);
    let allPlans = await concept._getAllTravelPlans({ user: userAlice });
    if (Array.isArray(allPlans) && allPlans.some(p => 'error' in p)) { throw new Error(`Query failed: ${(allPlans[0] as {error: string}).error}`); }
    assertEquals((allPlans as ID[]).includes(principleTravelPlanId), true, "Verification: Travel plan ID is listed after creation.");

    console.log("2. Action: updateNecessity");
    const updateNecessityResult = await concept.updateNecessity({
        user: userAlice,
        travelPlan: principleTravelPlanId,
        accommodation: false, // User prefers to stay with friends/family
        diningFlag: true,     // But still wants to eat out
    });
    if ("error" in updateNecessityResult) throw new Error(`Principle Trace failed to update necessity: ${updateNecessityResult.error}`);
    console.log(`   Updated necessity for plan ${principleTravelPlanId}.`);

    console.log("3. Action: generateAICostEstimate (Live LLM Call)");
    const llm = new GeminiLLM();
    const generateEstimateResult = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: principleTravelPlanId,
        llm: llm,
    });
    if ("error" in generateEstimateResult) throw new Error(`Principle Trace failed to generate estimate: ${generateEstimateResult.error}`);
    console.log(`   Generated AI cost estimate for plan ${principleTravelPlanId}.`);

    console.log("4. Action: estimateCost");
    const estimateCostResult = await concept.estimateCost({ user: userAlice, travelPlan: principleTravelPlanId });
    if ("error" in estimateCostResult) throw new Error(`Principle Trace failed to get total cost: ${estimateCostResult.error}`);
    assertEquals(typeof estimateCostResult.totalCost, 'number', "Verification: Total estimated cost should be a number.");
    assertEquals(estimateCostResult.totalCost > 0, true, "Verification: Total estimated cost should be greater than 0.");
    console.log(`   Calculated total cost: ${estimateCostResult.totalCost}.`);

    console.log("5. Action: deleteTravelPlan");
    const deleteResult = await concept.deleteTravelPlan({
        user: userAlice,
        travelPlan: principleTravelPlanId,
    });
    if ("error" in deleteResult) throw new Error(`Principle Trace failed to delete travel plan: ${deleteResult.error}`);
    console.log(`   Deleted travel plan ${principleTravelPlanId}.`);
    allPlans = await concept._getAllTravelPlans({ user: userAlice });
    if (Array.isArray(allPlans) && allPlans.some(p => 'error' in p)) { throw new Error(`Query failed: ${(allPlans[0] as {error: string}).error}`); }
    assertEquals((allPlans as ID[]).includes(principleTravelPlanId), false, "Verification: Deleted travel plan ID is no longer listed.");

    console.log("Principle Trace completed successfully.");
    await client.close();
});

// --- Test 2: Interesting Case - Invalid Travel Plan Creation Requirements ---
Deno.test("TripCostEstimationConcept: Interesting Case - Invalid Travel Plan Creation Requirements", async () => {
    console.log("\n--- Test: Invalid Travel Plan Creation Requirements ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Test 1: fromCity does not exist
    const fromDate1 = new Date(); fromDate1.setDate(fromDate1.getDate() + 10);
    const toDate1 = new Date(); toDate1.setDate(toDate1.getDate() + 15);
    const nonExistentLocation = freshID() as Location;
    console.log(`Action: Attempting createTravelPlan with non-existent origin city ID ${nonExistentLocation}.`);
    let result = await concept.createTravelPlan({ user: userAlice, fromCity: nonExistentLocation, toCity: locationLA, fromDate: fromDate1, toDate: toDate1 });
    assertObjectMatch(result, { error: `Origin city with ID ${nonExistentLocation} not found.` }, "Requirement: Should return error for non-existent origin city.");
    console.log(`  Confirmed error: ${result.error}`);

    // Test 2: toDate < fromDate
    const fromDate2 = new Date(); fromDate2.setDate(fromDate2.getDate() + 15);
    const toDate2 = new Date(); toDate2.setDate(toDate2.getDate() + 10);
    console.log(`Action: Attempting createTravelPlan where arrival date (${toDate2.toISOString()}) is before departure date (${fromDate2.toISOString()}).`);
    result = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate: fromDate2, toDate: toDate2 });
    assertObjectMatch(result, { error: "Arrival date must be on or after departure date." }, "Requirement: Should return error for invalid date range.");
    console.log(`  Confirmed error: ${result.error}`);

    // Test 3: fromDate is in the past
    const fromDate3 = new Date(); fromDate3.setDate(fromDate3.getDate() - 5);
    const toDate3 = new Date(); toDate3.setDate(toDate3.getDate() + 10);
    console.log(`Action: Attempting createTravelPlan where departure date (${fromDate3.toISOString()}) is in the past.`);
    result = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate: fromDate3, toDate: toDate3 });
    assertObjectMatch(result, { error: "Departure and arrival dates must be in the future." }, "Requirement: Should return error for past dates.");
    console.log(`  Confirmed error: ${result.error}`);

    await client.close();
});

// --- Test 3: Interesting Case - Unauthorized Access/Non-existent IDs for Actions ---
Deno.test("TripCostEstimationConcept: Interesting Case - Unauthorized Access/Non-existent IDs for Actions", async () => {
    console.log("\n--- Test: Unauthorized Access/Non-existent IDs for Actions ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const userBob = "user:Bob" as User;
    await (concept as any)["users"].updateOne({ _id: userBob }, { $setOnInsert: { _id: userBob } }, { upsert: true });
    const nonExistentTravelPlan = freshID() as TravelPlan;

    // Test 1: updateNecessity by wrong user
    console.log(`Action: Attempting updateNecessity for plan ${travelPlanId} by user ${userBob} (who doesn't own it).`);
    let result: any = await concept.updateNecessity({ user: userBob, travelPlan: travelPlanId, accommodation: false, diningFlag: false });
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Expected error for unauthorized update.");
    console.log(`  Confirmed error: ${result.error}`);

    // Test 2: resetNecessity for non-existent travel plan
    console.log(`Action: Attempting resetNecessity for non-existent travel plan ${nonExistentTravelPlan}.`);
    result = await concept.resetNecessity({ user: userAlice, travelPlan: nonExistentTravelPlan });
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Expected error for non-existent travel plan for reset.");
    console.log(`  Confirmed error: ${result.error}`);

    // Test 3: deleteTravelPlan for non-existent travel plan
    console.log(`Action: Attempting deleteTravelPlan for non-existent travel plan ${nonExistentTravelPlan}.`);
    result = await concept.deleteTravelPlan({ user: userAlice, travelPlan: nonExistentTravelPlan });
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Expected error for non-existent travel plan for delete.");
    console.log(`  Confirmed error: ${result.error}`);

    await client.close();
});

// --- Test 4: Interesting Case - `estimateCost` without a generated estimate ---
Deno.test("TripCostEstimationConcept: Interesting Case - `estimateCost` without a generated estimate", async () => {
    console.log("\n--- Test: `estimateCost` without a generated estimate ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

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

// --- Test 5: Interesting Case - `generateAICostEstimate` with LLM API failure ---
Deno.test("TripCostEstimationConcept: Interesting Case - `generateAICostEstimate` with LLM API failure", async () => {
    console.log("\n--- Test: `generateAICostEstimate` with LLM API failure ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    // Temporarily unset GEMINI_API_KEY to simulate API failure
    const originalApiKey = Deno.env.get("GEMINI_API_KEY");
    if (originalApiKey) Deno.env.set("GEMINI_API_KEY", ""); // Simulate missing API key
    
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

// --- Test 6: Interesting Case - `_getAllTravelPlans` Query Edge Cases ---
Deno.test("TripCostEstimationConcept: Interesting Case - `_getAllTravelPlans` Query Edge Cases", async () => {
    console.log("\n--- Test: `_getAllTravelPlans` Query Edge Cases ---");
    const { client, concept } = await setupTestEnvironment(); // setupTestEnvironment pre-creates userAlice

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
    console.log(`  Verification: Plans for ${userNoPlans}: ${JSON.stringify(allPlans)}`);

    // Test 2: Non-existent user
    const nonExistentUser = "user:NonExistent" as User;
    console.log(`Action: Querying plans for non-existent user ${nonExistentUser}.`);
    const result = await concept._getAllTravelPlans({ user: nonExistentUser });
    if (!Array.isArray(result) || result.length === 0 || !('error' in result[0])) {
         throw new Error(`Test failed: _getAllTravelPlans did not return expected error for non-existent user: ${JSON.stringify(result)}`);
    }
    assertObjectMatch(result[0], { error: `User with ID ${nonExistentUser} does not exist.` }, "Requirement: Should return error for non-existent user.");
    console.log(`  Requirement Confirmed: ${result[0].error}`);

    await client.close();
});
```
