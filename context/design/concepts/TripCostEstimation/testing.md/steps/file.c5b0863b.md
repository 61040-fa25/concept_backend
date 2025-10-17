---
timestamp: 'Fri Oct 17 2025 18:01:06 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_180106.38aa2ce1.md]]'
content_id: c5b0863b082048eede5d2df5e559edf20e234115097f9882c88bfded06544c4a
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
// This test follows the core flow described in the concept's principle.
Deno.test("TripCostEstimationConcept: Operational Principle Trace", async () => {
    console.log("\n--- Test: Operational Principle Trace ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    try {
        const fromDateP = new Date();
        fromDateP.setDate(fromDateP.getDate() + 60); // 2 months from now
        const toDateP = new Date();
        toDateP.setDate(toDateP.getDate() + 67); // 7 nights later, making it an 8-day trip (7 nights)

        console.log("1. Action: createTravelPlan (London to Paris)");
        const createPlanResult = await concept.createTravelPlan({
            user: userAlice,
            fromCity: locationNYC, // Using NYC as proxy for London from setup
            toCity: locationLA,    // Using LA as proxy for Paris from setup
            fromDate: fromDateP,
            toDate: toDateP,
        });
        if ("error" in createPlanResult) throw new Error(`Principle Trace failed to create travel plan: ${createPlanResult.error}`);
        const principleTravelPlanId = createPlanResult.travelPlan;
        console.log(`   -> Created travel plan ID: ${principleTravelPlanId}.`);
        let allPlans = await concept._getAllTravelPlans({ user: userAlice });
        if (Array.isArray(allPlans) && allPlans.some(p => 'error' in p)) { throw new Error(`Query failed: ${(allPlans[0] as {error: string}).error}`); }
        assertEquals((allPlans as ID[]).includes(principleTravelPlanId), true, "Verification: Travel plan ID is listed after creation.");

        console.log("2. Action: updateNecessity (Accommodation to false, Dining to true)");
        const updateNecessityResult = await concept.updateNecessity({
            user: userAlice,
            travelPlan: principleTravelPlanId,
            accommodation: false, // User prefers to stay with friends/family
            diningFlag: true,     // But still wants to eat out
        });
        if ("error" in updateNecessityResult) throw new Error(`Principle Trace failed to update necessity: ${updateNecessityResult.error}`);
        console.log(`   -> Updated necessity for plan ${principleTravelPlanId}.`);

        console.log("3. Action: generateAICostEstimate (Live LLM Call)");
        const llm = new GeminiLLM();
        const generateEstimateResult = await concept.generateAICostEstimate({
            user: userAlice,
            travelPlan: principleTravelPlanId,
            llm: llm,
        });
        if ("error" in generateEstimateResult) throw new Error(`Principle Trace failed to generate estimate: ${generateEstimateResult.error}`);
        console.log(`   -> Generated AI cost estimate for plan ${principleTravelPlanId}.`);
        // NOTE: Exact cost values are non-deterministic with live LLM, so only successful generation is asserted.

        console.log("4. Action: estimateCost");
        const estimateCostResult = await concept.estimateCost({ user: userAlice, travelPlan: principleTravelPlanId });
        if ("error" in estimateCostResult) throw new Error(`Principle Trace failed to get total cost: ${estimateCostResult.error}`);
        assertEquals(typeof estimateCostResult.totalCost, 'number', "Verification: Total estimated cost should be a number.");
        assertEquals(estimateCostResult.totalCost > 0, true, "Verification: Total estimated cost should be greater than 0.");
        console.log(`   -> Calculated total cost: ${estimateCostResult.totalCost}.`);

        console.log("5. Action: deleteTravelPlan");
        const deleteResult = await concept.deleteTravelPlan({
            user: userAlice,
            travelPlan: principleTravelPlanId,
        });
        if ("error" in deleteResult) throw new Error(`Principle Trace failed to delete travel plan: ${deleteResult.error}`);
        console.log(`   -> Deleted travel plan ${principleTravelPlanId}.`);
        allPlans = await concept._getAllTravelPlans({ user: userAlice });
        if (Array.isArray(allPlans) && allPlans.some(p => 'error' in p)) { throw new Error(`Query failed: ${(allPlans[0] as {error: string}).error}`); }
        assertEquals((allPlans as ID[]).includes(principleTravelPlanId), false, "Verification: Deleted travel plan ID is no longer listed.");

        console.log("Principle Trace completed successfully.");
    } finally {
        await client.close();
    }
});

// --- Test 2: Interesting Case - Multiple Travel Plans and Query Verification ---
Deno.test("TripCostEstimationConcept: Interesting Case - Multiple Travel Plans and Query Verification", async () => {
    console.log("\n--- Test: Multiple Travel Plans and Query Verification ---");
    const { client, concept, userAlice, locationNYC, locationLA, locationCHI } = await setupTestEnvironment();

    try {
        const fromDate1 = new Date(); fromDate1.setDate(fromDate1.getDate() + 10);
        const toDate1 = new Date(); toDate1.setDate(toDate1.getDate() + 15);
        const createResult1 = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate: fromDate1, toDate: toDate1 });
        if ("error" in createResult1) throw new Error(`Test failed: ${createResult1.error}`);
        const travelPlanId1 = createResult1.travelPlan;
        console.log(`1. Action: Created first travel plan ID: ${travelPlanId1}.`);

        const fromDate2 = new Date(); fromDate2.setDate(fromDate2.getDate() + 20);
        const toDate2 = new Date(); toDate2.setDate(toDate2.getDate() + 25);
        const createResult2 = await concept.createTravelPlan({ user: userAlice, fromCity: locationLA, toCity: locationCHI, fromDate: fromDate2, toDate: toDate2 });
        if ("error" in createResult2) throw new Error(`Test failed: ${createResult2.error}`);
        const travelPlanId2 = createResult2.travelPlan;
        console.log(`2. Action: Created second travel plan ID: ${travelPlanId2}.`);

        console.log(`3. Query: _getAllTravelPlans for user ${userAlice}.`);
        const allPlans = await concept._getAllTravelPlans({ user: userAlice });
        if (Array.isArray(allPlans) && allPlans.some(p => 'error' in p)) { throw new Error(`Query failed: ${(allPlans[0] as {error: string}).error}`); }

        assertEquals(allPlans.length, 2, "Verification: Should return 2 travel plan IDs.");
        assertEquals(allPlans.includes(travelPlanId1), true, `Verification: Should include first plan ID ${travelPlanId1}.`);
        assertEquals(allPlans.includes(travelPlanId2), true, `Verification: Should include second plan ID ${travelPlanId2}.`);
        console.log(`   -> Retrieved plans: ${JSON.stringify(allPlans)}`);

    } finally {
        await client.close();
    }
});

// --- Test 3: Interesting Case - Zero-day Trip / Same fromDate and toDate Calculation ---
Deno.test("TripCostEstimationConcept: Interesting Case - Zero-day Trip Calculation", async () => {
    console.log("\n--- Test: Zero-day Trip Calculation ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    try {
        const tripDate = new Date();
        tripDate.setDate(tripDate.getDate() + 10); // A future date for a single-day trip

        console.log(`1. Action: createTravelPlan for a zero-night/one-day trip (${tripDate.toISOString()} to ${tripDate.toISOString()}).`);
        const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate: tripDate, toDate: tripDate });
        if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
        const travelPlanId = createResult.travelPlan;

        console.log("2. Action: generateAICostEstimate (Live LLM Call) for the zero-day trip.");
        const llm = new GeminiLLM();
        const generateEstimateResult = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: llm });
        if ("error" in generateEstimateResult) throw new Error(`Test failed: ${generateEstimateResult.error}`);

        console.log("3. Action: estimateCost for the zero-day trip.");
        const estimateCostResult = await concept.estimateCost({ user: userAlice, travelPlan: travelPlanId });
        if ("error" in estimateCostResult) throw new Error(`Test failed: ${estimateCostResult.error}`);

        assertEquals(typeof estimateCostResult.totalCost, 'number', "Verification: Total cost should be a number.");
        assertEquals(estimateCostResult.totalCost > 0, true, "Verification: Total cost should be greater than 0 (includes flight + at least one day of food/rooms if applicable).");
        console.log(`   -> Calculated total cost for zero-day trip: ${estimateCostResult.totalCost}.`);

    } finally {
        await client.close();
    }
});

// --- Test 4: Interesting Case - Sequential Estimates for the Same Plan (Upsert behavior) ---
Deno.test("TripCostEstimationConcept: Interesting Case - Sequential Estimates for Same Plan", async () => {
    console.log("\n--- Test: Sequential Estimates for Same Plan ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    try {
        const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
        const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
        const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
        if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
        const travelPlanId = createResult.travelPlan;
        console.log(`1. Action: Created travel plan ID: ${travelPlanId}.`);

        console.log("2. Action: Generate first AI cost estimate (Live LLM Call).");
        const llm = new GeminiLLM();
        const generateEstimateResult1 = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: llm });
        if ("error" in generateEstimateResult1) throw new Error(`Test failed: ${generateEstimateResult1.error}`);
        const costEstimateId1 = generateEstimateResult1.costEstimate;
        console.log(`   -> Generated first cost estimate ID: ${costEstimateId1}.`);

        // Get count of cost estimates for this plan (using internal knowledge for verification)
        let count = await (concept as any)["costEstimates"].countDocuments({ travelPlanID: travelPlanId });
        assertEquals(count, 1, "Verification: Only one cost estimate should exist for the plan after first generation.");

        console.log("3. Action: Generate second AI cost estimate (Live LLM Call) for the same plan.");
        const generateEstimateResult2 = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: llm });
        if ("error" in generateEstimateResult2) throw new Error(`Test failed: ${generateEstimateResult2.error}`);
        const costEstimateId2 = generateEstimateResult2.costEstimate;
        console.log(`   -> Generated second cost estimate ID: ${costEstimateId2}.`);

        count = await (concept as any)["costEstimates"].countDocuments({ travelPlanID: travelPlanId });
        assertEquals(count, 1, "Verification: Still only one cost estimate should exist due to upsert (replacement).");
        // NOTE: Cannot assert that costEstimateId2 is the *new* ID and costEstimateId1 is gone
        // without querying the internal collection's _id directly, which is currently disallowed.
        // The count check verifies the "upsert" behavior.

    } finally {
        await client.close();
    }
});

// --- Test 5: Interesting Case - `generateAICostEstimate` with LLM API failure ---
Deno.test("TripCostEstimationConcept: Interesting Case - `generateAICostEstimate` with LLM API failure", async () => {
    console.log("\n--- Test: `generateAICostEstimate` with LLM API failure ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    try {
        const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
        const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
        const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
        if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
        const travelPlanId = createResult.travelPlan;
        console.log(`1. Action: Created travel plan ID: ${travelPlanId}.`);

        // Temporarily unset GEMINI_API_KEY to simulate API failure
        const originalApiKey = Deno.env.get("GEMINI_API_KEY");
        if (originalApiKey) Deno.env.set("GEMINI_API_KEY", ""); // Simulate missing API key
        
        try {
            const llm = new GeminiLLM();
            console.log("2. Action: Attempting to generate estimate with a (simulated) missing GEMINI_API_KEY.");
            const result = await concept.generateAICostEstimate({
                user: userAlice,
                travelPlan: travelPlanId,
                llm: llm,
            });

            assertObjectMatch(result, { error: (val) => val.includes("LLM API call failed: Missing GEMINI_API_KEY environment variable.") }, "Expected error for missing API key.");
            console.log(`   -> Requirement Confirmed: ${result.error}`);

        } finally {
            // Restore environment variable
            if (originalApiKey) Deno.env.set("GEMINI_API_KEY", originalApiKey);
        }
    } finally {
        await client.close();
    }
});
```
