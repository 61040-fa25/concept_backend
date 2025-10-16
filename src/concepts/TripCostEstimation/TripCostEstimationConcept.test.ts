import { assertEquals, assertObjectMatch, assertInstanceOf } from "jsr:@std/assert";
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
type Necessity = ID; // Although Necessity is internal ID, it's good to keep its type alias.
type CostEstimate = ID;

// Mock GeminiLLM for testing purposes
// It now directly implements the `executeLLM` method.
class MockGeminiLLM implements GeminiLLM {
    private mockResponse: string | Error;
    private shouldThrow: boolean = false;

    constructor(response: string | Error) {
        this.mockResponse = response;
        if (response instanceof Error) {
            this.shouldThrow = true;
        }
    }

    /**
     * Mock implementation of the GeminiLLM's executeLLM method.
     * It returns a predefined response or throws an error.
     */
    async executeLLM(prompt: string): Promise<string> {
        // console.log(`[MockGeminiLLM] Received prompt (first 100 chars): ${prompt.substring(0, 100)}...`);
        if (this.shouldThrow) {
            throw this.mockResponse;
        }
        return Promise.resolve(this.mockResponse as string);
    }
}

// Common setup for most tests: initializes DB, concept, and basic data
async function setupTestEnvironment() {
    const [db, client] = await testDb();
    const concept = new TripCostEstimationConcept(db);

    const userAlice = "user:Alice" as User;
    const locationNYC = freshID() as Location;
    const locationLA = freshID() as Location;
    const locationCHI = freshID() as Location;

    // Pre-populate locations for tests using concept's internal collections
    // This is allowed in setup as it directly manipulates the initial state for the concept to function.
    await concept["locations"].insertOne({ _id: locationNYC, city: "New York City" });
    await concept["locations"].insertOne({ _id: locationLA, city: "Los Angeles" });
    await concept["locations"].insertOne({ _id: locationCHI, city: "Chicago" });

    // Explicitly add user Alice (concept's createTravelPlan upserts, but explicit setup is good)
    await concept["users"].updateOne(
        { _id: userAlice },
        { $setOnInsert: { _id: userAlice } },
        { upsert: true },
    );

    return { client, concept, userAlice, locationNYC, locationLA, locationCHI };
}

Deno.test("TripCostEstimationConcept: createTravelPlan - Successful creation", async () => {
    console.log("--- Test: createTravelPlan - Successful creation ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 15);

    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: locationNYC,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });

    if ("error" in result) {
        throw new Error(`Test failed: ${result.error}`);
    }
    const travelPlanId = result.travelPlan;
    console.log(`Action: Created travel plan with ID: ${travelPlanId}`);

    // Verify effects via the concept's public API
    const allPlans = await concept._getAllTravelPlans({ user: userAlice });
    if (Array.isArray(allPlans) && allPlans.some(p => 'error' in p)) {
        throw new Error(`Query failed: ${(allPlans[0] as {error: string}).error}`);
    }
    assertEquals((allPlans as ID[]).includes(travelPlanId), true, "Effect: New travel plan ID should be listed for the user.");
    // NOTE: Cannot verify detailed fields (fromCity, toDate, default necessity) due to API constraints.

    await client.close();
});

// Deno.test("TripCostEstimationConcept: createTravelPlan - Requirement: fromCity does not exist", async () => {
//     console.log("--- Test: createTravelPlan - Requirement: fromCity does not exist ---");
//     const { client, concept, userAlice, locationLA } = await setupTestEnvironment();

//     const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
//     const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
//     const nonExistentLocation = freshID() as Location;

//     const result = await concept.createTravelPlan({
//         user: userAlice,
//         fromCity: nonExistentLocation,
//         toCity: locationLA,
//         fromDate: fromDate,
//         toDate: toDate,
//     });
//     assertObjectMatch(result, { error: `Origin city with ID ${nonExistentLocation} not found.` }, "Requirement: Should return error for non-existent origin city.");
//     console.log(`Requirement Confirmed: ${result.error}`);

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: createTravelPlan - Requirement: toDate < fromDate", async () => {
//     console.log("--- Test: createTravelPlan - Requirement: toDate < fromDate ---");
//     const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

//     const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 15);
//     const toDate = new Date(); toDate.setDate(toDate.getDate() + 10);

//     const result = await concept.createTravelPlan({
//         user: userAlice,
//         fromCity: locationNYC,
//         toCity: locationLA,
//         fromDate: fromDate,
//         toDate: toDate,
//     });
//     assertObjectMatch(result, { error: "Arrival date must be on or after departure date." }, "Requirement: Should return error for invalid date range.");
//     console.log(`Requirement Confirmed: ${result.error}`);

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: createTravelPlan - Requirement: fromDate is in the past", async () => {
//     console.log("--- Test: createTravelPlan - Requirement: fromDate is in the past ---");
//     const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

//     const fromDate = new Date(); fromDate.setDate(fromDate.getDate() - 5);
//     const toDate = new Date(); toDate.setDate(toDate.getDate() + 10);

//     const result = await concept.createTravelPlan({
//         user: userAlice,
//         fromCity: locationNYC,
//         toCity: locationLA,
//         fromDate: fromDate,
//         toDate: toDate,
//     });
//     assertObjectMatch(result, { error: "Departure and arrival dates must be in the future." }, "Requirement: Should return error for past dates.");
//     console.log(`Requirement Confirmed: ${result.error}`);

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: updateNecessity - Successful update", async () => {
//     console.log("--- Test: updateNecessity - Successful update ---");
//     const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

//     // Setup: Create a travel plan first
//     const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
//     const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
//     const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
//     if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
//     const travelPlanId = createResult.travelPlan;

//     const updateResult = await concept.updateNecessity({
//         user: userAlice,
//         travelPlan: travelPlanId,
//         accommodation: false,
//         diningFlag: true,
//     });

//     if ("error" in updateResult) {
//         throw new Error(`Test failed: ${updateResult.error}`);
//     }
//     console.log(`Action: Updated necessity for travel plan ${travelPlanId}`);
//     assertEquals(updateResult.travelPlan, travelPlanId, "Effect: Returned travelPlan ID matches.");
//     // NOTE: Cannot verify detailed necessity flags (accommodation, diningFlag) due to API constraints.

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: updateNecessity - Requirement: travelPlan does not belong to user", async () => {
//     console.log("--- Test: updateNecessity - Requirement: travelPlan does not belong to user ---");
//     const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

//     // Setup: Create a travel plan for Alice
//     const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
//     const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
//     const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
//     if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
//     const travelPlanId = createResult.travelPlan;

//     const userBob = "user:Bob" as User;
//     await concept["users"].updateOne({ _id: userBob }, { $setOnInsert: { _id: userBob } }, { upsert: true });

//     const result = await concept.updateNecessity({
//         user: userBob,
//         travelPlan: travelPlanId,
//         accommodation: true,
//         diningFlag: false,
//     });
//     assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error as plan doesn't belong to Bob.");
//     console.log(`Requirement Confirmed: ${result.error}`);

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: resetNecessity - Successful reset", async () => {
//     console.log("--- Test: resetNecessity - Successful reset ---");
//     const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

//     // Setup: Create a travel plan and modify its necessity
//     const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
//     const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
//     const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
//     if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
//     const travelPlanId = createResult.travelPlan;
//     await concept.updateNecessity({ user: userAlice, travelPlan: travelPlanId, accommodation: false, diningFlag: false });

//     const resetResult = await concept.resetNecessity({
//         user: userAlice,
//         travelPlan: travelPlanId,
//     });

//     if ("error" in resetResult) {
//         throw new Error(`Test failed: ${resetResult.error}`);
//     }
//     console.log(`Action: Reset necessity for travel plan ${travelPlanId}.`);
//     // NOTE: Cannot verify detailed necessity flags (accommodation, diningFlag) due to API constraints.

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: resetNecessity - Requirement: travelPlan does not exist", async () => {
//     console.log("--- Test: resetNecessity - Requirement: travelPlan does not exist ---");
//     const { client, concept, userAlice } = await setupTestEnvironment();

//     const nonExistentTravelPlan = freshID() as TravelPlan;
//     const result = await concept.resetNecessity({
//         user: userAlice,
//         travelPlan: nonExistentTravelPlan,
//     });
//     assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error for non-existent travel plan.");
//     console.log(`Requirement Confirmed: ${result.error}`);

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: generateAICostEstimate - Successful generation", async () => {
//     console.log("--- Test: generateAICostEstimate - Successful generation ---");
//     const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

//     // Setup: Create a travel plan
//     const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
//     const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
//     const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
//     if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
//     const travelPlanId = createResult.travelPlan;

//     const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
//     const mockLLM = new MockGeminiLLM(mockLlmResponse);

//     const result = await concept.generateAICostEstimate({
//         user: userAlice,
//         travelPlan: travelPlanId,
//         llm: mockLLM,
//     });

//     if ("error" in result) {
//         throw new Error(`Test failed: ${result.error}`);
//     }
//     const costEstimateId = result.costEstimate;
//     console.log(`Action: Generated cost estimate with ID: ${costEstimateId}.`);
//     // NOTE: Cannot verify detailed cost estimate fields (flight, roomsPerNight, foodDaily) due to API constraints.

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns invalid JSON", async () => {
//     console.log("--- Test: generateAICostEstimate - Interesting Case: LLM returns invalid JSON ---");
//     const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

//     const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
//     const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
//     const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
//     if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
//     const travelPlanId = createResult.travelPlan;

//     const mockLLM = new MockGeminiLLM("this is not json");
//     const result = await concept.generateAICostEstimate({
//         user: userAlice,
//         travelPlan: travelPlanId,
//         llm: mockLLM,
//     });

//     assertObjectMatch(result, { error: (val) => val.includes("Failed to parse LLM response") }, "Expected error for invalid JSON format.");
//     console.log(`Requirement Confirmed: ${result.error}`);

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns incomplete JSON", async () => {
//     console.log("--- Test: generateAICostEstimate - Interesting Case: LLM returns incomplete JSON ---");
//     const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

//     const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
//     const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
//     const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
//     if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
//     const travelPlanId = createResult.travelPlan;

//     const mockLLM = new MockGeminiLLM(JSON.stringify({ flight: 500 })); // Missing roomsPerNight and foodDaily
//     const result = await concept.generateAICostEstimate({
//         user: userAlice,
//         travelPlan: travelPlanId,
//         llm: mockLLM,
//     });

//     assertObjectMatch(result, { error: (val) => val.includes("LLM response could not be parsed into all required cost components") }, "Expected error for incomplete JSON.");
//     console.log(`Requirement Confirmed: ${result.error}`);

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns inaccurate values", async () => {
//     console.log("--- Test: generateAICostEstimate - Interesting Case: LLM returns inaccurate values (too high/low) ---");
//     const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

//     const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
//     const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
//     const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
//     if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
//     const travelPlanId = createResult.travelPlan;

//     // Test case 1: Flight cost too high
//     const mockLlmResponseTooHigh = JSON.stringify({ flight: 200000, roomsPerNight: 100, foodDaily: 50 });
//     let mockLLM = new MockGeminiLLM(mockLlmResponseTooHigh);
//     let result = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: mockLLM });
//     assertObjectMatch(result, { error: (val) => val.includes("LLM provided cost estimates are widely inaccurate") }, "Expected error for too high flight cost.");
//     console.log(`Requirement Confirmed (too high flight cost): ${result.error}`);

//     // Test case 2: Flight cost too low
//     const mockLlmResponseTooLow = JSON.stringify({ flight: 10, roomsPerNight: 100, foodDaily: 50 });
//     mockLLM = new MockGeminiLLM(mockLlmResponseTooLow);
//     result = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: mockLLM });
//     assertObjectMatch(result, { error: (val) => val.includes("LLM provided cost estimates are widely inaccurate") }, "Expected error for too low flight cost.");
//     console.log(`Requirement Confirmed (too low flight cost): ${result.error}`);

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM API call fails", async () => {
//     console.log("--- Test: generateAICostEstimate - Interesting Case: LLM API call fails ---");
//     const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

//     const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
//     const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
//     const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
//     if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
//     const travelPlanId = createResult.travelPlan;

//     const mockLLM = new MockGeminiLLM(new Error("Network error during LLM call"));
//     const result = await concept.generateAICostEstimate({
//         user: userAlice,
//         travelPlan: travelPlanId,
//         llm: mockLLM,
//     });

//     assertObjectMatch(result, { error: (val) => val.includes("LLM API call failed: Network error during LLM call") }, "Expected error for LLM API failure.");
//     console.log(`Requirement Confirmed: ${result.error}`);

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: estimateCost - Successful calculation", async () => {
//     console.log("--- Test: estimateCost - Successful calculation ---");
//     const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

//     // Setup: Create a travel plan and generate an estimate
//     const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
//     const toDate = new Date(); toDate.setDate(toDate.getDate() + 15); // 5 nights / 6 days
//     const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
//     if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
//     const travelPlanId = createResult.travelPlan;

//     const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
//     const generateEstimateResult = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: new MockGeminiLLM(mockLlmResponse) });
//     if ("error" in generateEstimateResult) throw new Error(`Setup failed: ${generateEstimateResult.error}`);
//     const costEstimateId = generateEstimateResult.costEstimate;

//     const numDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
//     const expectedTotal = 500 + (150 * numDays) + (75 * numDays);

//     const result = await concept.estimateCost({ user: userAlice, travelPlan: travelPlanId });

//     if ("error" in result) {
//         throw new Error(`Test failed: ${result.error}`);
//     }
//     assertEquals(result.totalCost, expectedTotal, "Effect: Total cost should be correctly calculated and returned.");
//     console.log(`Action: Estimated total cost: ${result.totalCost}.`);

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: estimateCost - Interesting Case: Requirement: no associated CostEstimate", async () => {
//     console.log("--- Test: estimateCost - Interesting Case: Requirement: no associated CostEstimate ---");
//     const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

//     // Setup: Create a new travel plan without generating an estimate
//     const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 20);
//     const toDate = new Date(); toDate.setDate(toDate.getDate() + 25);
//     const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
//     if ("error" in createResult) throw new Error("Setup failed: Failed to create new plan for test.");
//     const newTravelPlanId = createResult.travelPlan;

//     const result = await concept.estimateCost({ user: userAlice, travelPlan: newTravelPlanId });

//     assertObjectMatch(result, { error: "No cost estimate found for this travel plan." }, "Requirement: Should return error if no cost estimate exists.");
//     console.log(`Requirement Confirmed: ${result.error}`);

//     await concept.deleteTravelPlan({ user: userAlice, travelPlan: newTravelPlanId }); // Clean up
//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Returns all plan IDs for user", async () => {
//     console.log("--- Test: _getAllTravelPlans - Returns all plan IDs for user ---");
//     const { client, concept, userAlice, locationNYC, locationLA, locationCHI } = await setupTestEnvironment();

//     // Setup: Create multiple travel plans for Alice
//     const fromDate1 = new Date(); fromDate1.setDate(fromDate1.getDate() + 10);
//     const toDate1 = new Date(); toDate1.setDate(toDate1.getDate() + 15);
//     const createResult1 = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate: fromDate1, toDate: toDate1 });
//     if ("error" in createResult1) throw new Error(`Setup failed: ${createResult1.error}`);
//     const travelPlanId1 = createResult1.travelPlan;

//     const fromDate2 = new Date(); fromDate2.setDate(fromDate2.getDate() + 20);
//     const toDate2 = new Date(); toDate2.setDate(toDate2.getDate() + 25);
//     const createResult2 = await concept.createTravelPlan({ user: userAlice, fromCity: locationLA, toCity: locationCHI, fromDate: fromDate2, toDate: toDate2 });
//     if ("error" in createResult2) throw new Error(`Setup failed: ${createResult2.error}`);
//     const travelPlanId2 = createResult2.travelPlan;

//     const allPlans = await concept._getAllTravelPlans({ user: userAlice });

//     if (!Array.isArray(allPlans) || allPlans.some(p => typeof p !== 'string')) {
//         throw new Error(`Test failed: _getAllTravelPlans returned an unexpected format: ${JSON.stringify(allPlans)}`);
//     }
//     assertEquals(allPlans.length, 2, "Effect: Should return 2 travel plan IDs.");
//     assertEquals(allPlans.includes(travelPlanId1), true, `Effect: Should include plan ID ${travelPlanId1}.`);
//     assertEquals(allPlans.includes(travelPlanId2), true, `Effect: Should include plan ID ${travelPlanId2}.`);
//     console.log(`Action: Retrieved plans for ${userAlice}: ${JSON.stringify(allPlans)}`);

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Returns empty array if user has no plans", async () => {
//     console.log("--- Test: _getAllTravelPlans - Returns empty array if user has no plans ---");
//     const { client, concept } = await setupTestEnvironment();

//     const userNoPlans = "user:Charlie" as User;
//     await concept["users"].updateOne(
//       { _id: userNoPlans },
//       { $setOnInsert: { _id: userNoPlans } },
//       { upsert: true },
//     );

//     const allPlans = await concept._getAllTravelPlans({ user: userNoPlans });

//     if (!Array.isArray(allPlans) || allPlans.some(p => typeof p !== 'string')) {
//         throw new Error(`Test failed: _getAllTravelPlans returned an unexpected error: ${JSON.stringify(allPlans)}`);
//     }
//     assertEquals(allPlans.length, 0, "Effect: Should return an empty array for a user with no plans.");
//     console.log(`Action: Retrieved plans for user ${userNoPlans}: ${JSON.stringify(allPlans)}`);

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Requirement: user does not exist", async () => {
//     console.log("--- Test: _getAllTravelPlans - Requirement: user does not exist ---");
//     const { client, concept } = await setupTestEnvironment();

//     const nonExistentUser = "user:NonExistent" as User;
//     const result = await concept._getAllTravelPlans({ user: nonExistentUser });

//     if (!Array.isArray(result) || result.length === 0 || !('error' in result[0])) {
//          throw new Error(`Test failed: _getAllTravelPlans did not return expected error for non-existent user: ${JSON.stringify(result)}`);
//     }
//     assertObjectMatch(result[0], { error: `User with ID ${nonExistentUser} does not exist.` }, "Requirement: Should return error for non-existent user.");
//     console.log(`Requirement Confirmed: ${result[0].error}`);

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: deleteTravelPlan - Successful deletion of plan and associated data", async () => {
//     console.log("--- Test: deleteTravelPlan - Successful deletion of plan and associated data ---");
//     const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

//     // Setup: Create a travel plan, its necessity, and a cost estimate
//     const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
//     const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
//     const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
//     if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
//     const travelPlanId = createResult.travelPlan;

//     const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
//     const generateResult = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: new MockGeminiLLM(mockLlmResponse) });
//     if ("error" in generateResult) throw new Error(`Setup failed: ${generateResult.error}`);
//     const costEstimateId = generateResult.costEstimate; // Cost estimate ID is returned

//     console.log(`Action: Deleting travel plan with ID: ${travelPlanId}.`);
//     const deleteResult = await concept.deleteTravelPlan({
//         user: userAlice,
//         travelPlan: travelPlanId,
//     });

//     if ("error" in deleteResult) {
//         throw new Error(`Test failed: ${deleteResult.error}`);
//     }
//     console.log(`Effect: Travel plan ${travelPlanId} deleted successfully.`);

//     // Verify effects via the concept's public API
//     const allPlans = await concept._getAllTravelPlans({ user: userAlice });
//     if (Array.isArray(allPlans) && allPlans.some(p => 'error' in p)) {
//         throw new Error(`Query failed: ${(allPlans[0] as {error: string}).error}`);
//     }
//     assertEquals((allPlans as ID[]).includes(travelPlanId), false, "Effect: Deleted travel plan ID should not be listed for the user.");
//     // NOTE: Cannot verify deletion of associated necessity and cost estimate documents directly due to API constraints.

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: deleteTravelPlan - Requirement: travelPlan does not exist", async () => {
//     console.log("--- Test: deleteTravelPlan - Requirement: travelPlan does not exist ---");
//     const { client, concept, userAlice } = await setupTestEnvironment();

//     const nonExistentTravelPlan = freshID() as TravelPlan;
//     const result = await concept.deleteTravelPlan({
//         user: userAlice,
//         travelPlan: nonExistentTravelPlan,
//     });
//     assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error for non-existent travel plan.");
//     console.log(`Requirement Confirmed: ${result.error}`);

//     await client.close();
// });

// Deno.test("TripCostEstimationConcept: Principle Trace - Generate realistic cost estimates based on preferences", async () => {
//     console.log("\n--- Principle Trace Test ---");
//     const { client, concept } = await setupTestEnvironment();

//     const principleUser = "user:PrincipleAlice" as User;
//     const principleLocationHome = freshID() as Location;
//     const principleLocationDest = freshID() as Location;

//     // 1. Setup: Create user and locations
//     await concept["locations"].insertOne({ _id: principleLocationHome, city: "London" });
//     await concept["locations"].insertOne({ _id: principleLocationDest, city: "Paris" });
//     await concept["users"].updateOne({ _id: principleUser }, { $setOnInsert: { _id: principleUser } }, { upsert: true });
//     console.log("1. Setup: Created principle user and locations (London, Paris).");

//     const fromDateP = new Date();
//     fromDateP.setDate(fromDateP.getDate() + 60); // 2 months from now
//     const toDateP = new Date();
//     toDateP.setDate(toDateP.getDate() + 67); // 7 nights later, making it an 8-day trip (7 nights)

//     // 2. Action: Create initial travel plan with default necessity
//     const createPlanResult = await concept.createTravelPlan({
//         user: principleUser,
//         fromCity: principleLocationHome,
//         toCity: principleLocationDest,
//         fromDate: fromDateP,
//         toDate: toDateP,
//     });
//     if ("error" in createPlanResult) throw new Error(`Principle Trace failed to create travel plan: ${createPlanResult.error}`);
//     const principleTravelPlanId = createPlanResult.travelPlan;
//     console.log(`2. Action: Created travel plan (${principleTravelPlanId}) for ${principleUser} from London to Paris, with default necessities.`);

//     const allPlansAfterCreation = await concept._getAllTravelPlans({ user: principleUser });
//     if (Array.isArray(allPlansAfterCreation) && allPlansAfterCreation.some(p => 'error' in p)) {
//         throw new Error(`Query failed: ${(allPlansAfterCreation[0] as {error: string}).error}`);
//     }
//     assertEquals((allPlansAfterCreation as ID[]).includes(principleTravelPlanId), true, "Verification: Travel plan ID is listed after creation.");
//     // NOTE: Cannot verify default necessity content (accommodation: true, dining: true) due to API constraints.

//     // 3. Action: Update necessity based on user preferences
//     const updateNecessityResult = await concept.updateNecessity({
//         user: principleUser,
//         travelPlan: principleTravelPlanId,
//         accommodation: false, // User prefers to stay with friends/family
//         diningFlag: true,     // But still wants to eat out
//     });
//     if ("error" in updateNecessityResult) throw new Error(`Principle Trace failed to update necessity: ${updateNecessityResult.error}`);
//     console.log(`3. Action: Updated necessity for plan ${principleTravelPlanId}: accommodation false, dining true.`);
//     // NOTE: Cannot verify updated necessity content directly due to API constraints.

//     // 4. Action: Generate AI cost estimate using LLM with specialized tool
//     const mockPrincipleLlmResponse = JSON.stringify({
//         flight: 180,
//         roomsPerNight: 0,   // Reflects 'accommodation: false'
//         foodDaily: 60,      // Reflects 'diningFlag: true'
//     });
//     const mockLLM = new MockGeminiLLM(mockPrincipleLlmResponse);

//     const generateEstimateResult = await concept.generateAICostEstimate({
//         user: principleUser,
//         travelPlan: principleTravelPlanId,
//         llm: mockLLM,
//     });
//     if ("error" in generateEstimateResult) throw new Error(`Principle Trace failed to generate estimate: ${generateEstimateResult.error}`);
//     const principleCostEstimateId = generateEstimateResult.costEstimate;
//     console.log(`4. Action: Generated AI cost estimate (${principleCostEstimateId}) using LLM for plan ${principleTravelPlanId}.`);
//     // NOTE: Cannot verify detailed cost estimate values (flight, roomsPerNight, foodDaily) directly due to API constraints.

//     // 5. Action: Calculate total cost based on generated estimate
//     const estimateCostResult = await concept.estimateCost({ user: principleUser, travelPlan: principleTravelPlanId });
//     if ("error" in estimateCostResult) throw new Error(`Principle Trace failed to get total cost: ${estimateCostResult.error}`);

//     const numDaysPrinciple = Math.ceil((toDateP.getTime() - fromDateP.getTime()) / (1000 * 60 * 60 * 24)); // 7 days (e.g., May 1st to May 8th is 7 nights, 8 days)
//     const expectedTotalCost = 180 + (0 * numDaysPrinciple) + (60 * numDaysPrinciple); // 180 + (0 * 7) + (60 * 7) = 180 + 420 = 600
//     assertEquals(estimateCostResult.totalCost, expectedTotalCost, "Verification: Total estimated cost should be correct based on updated preferences.");
//     console.log(`5. Action: Calculated total cost: ${estimateCostResult.totalCost}. Expected: ${expectedTotalCost}.`);
//     console.log("   Verification: Total cost aligns with flight, NO accommodation costs, and daily dining costs for the duration.");

//     // 6. Query: Retrieve user's travel plans
//     const allPrinciplePlans = await concept._getAllTravelPlans({ user: principleUser });
//     if (Array.isArray(allPrinciplePlans) && allPrinciplePlans.some(p => 'error' in p)) {
//         throw new Error(`Query failed: ${(allPrinciplePlans[0] as {error: string}).error}`);
//     }
//     assertEquals((allPrinciplePlans as ID[]).includes(principleTravelPlanId), true, "Verification: Principle travel plan should be listed for the user.");
//     console.log("6. Query: User's travel plans retrieved, includes the principle plan.");

//     console.log("Principle Trace completed successfully: An estimate was provided based on user's choices and LLM data.");
//     await client.close();
// });