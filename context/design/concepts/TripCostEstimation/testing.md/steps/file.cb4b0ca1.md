---
timestamp: 'Thu Oct 16 2025 12:52:47 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_125247.67d5c12e.md]]'
content_id: cb4b0ca11ed7b727db533cb98a6bbd3e01c63c08d5b415c31afbd41fc1e7e2ee
---

# file: src/TripCostEstimation/TripCostEstimationConcept.test.ts

```typescript
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
type Necessity = ID;
type CostEstimate = ID;

// Define the state interfaces for easy access in tests, as they are now module-scoped
interface UsersDoc { _id: User; }
interface LocationsDoc { _id: Location; city: string; }
interface TravelPlansDoc { _id: TravelPlan; userID: User; fromCity: Location; toCity: Location; fromDate: Date; toDate: Date; necessityID: Necessity; }
interface NecessitiesDoc { _id: Necessity; accommodation: boolean; diningFlag: boolean; }
interface CostEstimatesDoc { _id: CostEstimate; travelPlanID: TravelPlan; flight: number; roomsPerNight: number; foodDaily: number; lastUpdated: Date; }

// Mock GeminiLLM for testing purposes
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
     * Mimics the executeLLM method from the actual GeminiLLM,
     * returning a predefined response or throwing an error.
     */
    async executeLLM(prompt: string): Promise<string> {
        console.log(`[MockGeminiLLM] Received prompt (first 100 chars): ${prompt.substring(0, 100)}...`);
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
    const locationCHI = freshID() as Location; // Additional location for variety

    // Pre-populate locations for tests
    await concept["locations"].insertOne({ _id: locationNYC, city: "New York City" });
    await concept["locations"].insertOne({ _id: locationLA, city: "Los Angeles" });
    await concept["locations"].insertOne({ _id: locationCHI, city: "Chicago" });

    // Explicitly add user Alice as per some concepts, although createTravelPlan upserts it.
    await concept["users"].updateOne(
        { _id: userAlice },
        { $setOnInsert: { _id: userAlice } },
        { upsert: true },
    );

    return { db, client, concept, userAlice, locationNYC, locationLA, locationCHI };
}

Deno.test("TripCostEstimationConcept: createTravelPlan - Successful creation", async () => {
    console.log("--- Test: createTravelPlan - Successful creation ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 15);

    console.log(`Action: Calling createTravelPlan for user ${userAlice} from ${locationNYC} to ${locationLA}, dates ${fromDate.toISOString()} to ${toDate.toISOString()}`);
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
    console.log(`Effect: Created travel plan with ID: ${travelPlanId}`);

    // Verify effects
    const createdPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
    assertEquals(createdPlan?._id, travelPlanId, "Effect: Travel plan should exist in DB.");
    assertEquals(createdPlan?.userID, userAlice, "Effect: Travel plan should be linked to user.");
    assertEquals(createdPlan?.fromCity, locationNYC, "Effect: fromCity should be correct.");
    assertEquals(createdPlan?.toCity, locationLA, "Effect: toCity should be correct.");

    const associatedNecessity = await concept["necessities"].findOne({ _id: createdPlan?.necessityID });
    assertEquals(associatedNecessity?.accommodation, true, "Effect: Default accommodation should be true.");
    assertEquals(associatedNecessity?.diningFlag, true, "Effect: Default diningFlag should be true.");

    await client.close();
});

Deno.test("TripCostEstimationConcept: createTravelPlan - Requires: fromCity does not exist", async () => {
    console.log("--- Test: createTravelPlan - Requires: fromCity does not exist ---");
    const { client, concept, userAlice, locationLA } = await setupTestEnvironment();

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 15);
    const nonExistentLocation = freshID() as Location;

    console.log(`Action: Attempting to create travel plan with non-existent origin city ID ${nonExistentLocation}`);
    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: nonExistentLocation,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });
    // Verify requirement failure
    assertObjectMatch(result, { error: `Origin city with ID ${nonExistentLocation} not found.` }, "Requirement: Should return error for non-existent origin city.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: createTravelPlan - Requires: toDate < fromDate", async () => {
    console.log("--- Test: createTravelPlan - Requires: toDate < fromDate ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + 15);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 10); // toDate is before fromDate

    console.log(`Action: Attempting to create travel plan where arrival date ${toDate.toISOString()} is before departure date ${fromDate.toISOString()}`);
    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: locationNYC,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });
    // Verify requirement failure
    assertObjectMatch(result, { error: "Arrival date must be on or after departure date." }, "Requirement: Should return error for invalid date range.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: createTravelPlan - Requires: fromDate is in the past", async () => {
    console.log("--- Test: createTravelPlan - Requires: fromDate is in the past ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 5); // in the past
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 10);

    console.log(`Action: Attempting to create travel plan where departure date ${fromDate.toISOString()} is in the past`);
    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: locationNYC,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });
    // Verify requirement failure
    assertObjectMatch(result, { error: "Departure and arrival dates must be in the future." }, "Requirement: Should return error for past dates.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: updateNecessity - Successful update", async () => {
    console.log("--- Test: updateNecessity - Successful update ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan first
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    console.log(`Setup: Created travel plan ${travelPlanId} with default necessity.`);

    console.log(`Action: Updating necessity for plan ${travelPlanId} to accommodation=false, diningFlag=true`);
    const updateResult = await concept.updateNecessity({
        user: userAlice,
        travelPlan: travelPlanId,
        accommodation: false,
        diningFlag: true,
    });

    if ("error" in updateResult) {
        throw new Error(`Test failed: ${updateResult.error}`);
    }
    console.log(`Effect: Necessity updated successfully for travel plan ${travelPlanId}.`);

    // Verify effects
    const updatedPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
    const updatedNecessity = await concept["necessities"].findOne({ _id: updatedPlan?.necessityID });
    assertEquals(updatedNecessity?.accommodation, false, "Effect: Accommodation should be false.");
    assertEquals(updatedNecessity?.diningFlag, true, "Effect: DiningFlag should be true.");
    assertEquals(updateResult.travelPlan, travelPlanId, "Effect: Returned travelPlan ID matches.");
    assertEquals(updateResult.necessity, updatedPlan?.necessityID, "Effect: Returned necessity ID matches.");

    await client.close();
});

Deno.test("TripCostEstimationConcept: updateNecessity - Requires: travelPlan does not belong to user", async () => {
    console.log("--- Test: updateNecessity - Requires: travelPlan does not belong to user ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan for Alice
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    console.log(`Setup: Created travel plan ${travelPlanId} for ${userAlice}.`);

    const userBob = "user:Bob" as User; // A different user
    await concept["users"].insertOne({ _id: userBob }); // Ensure Bob exists

    console.log(`Action: Attempting to update necessity for plan ${travelPlanId} by user ${userBob} (who doesn't own it).`);
    const result = await concept.updateNecessity({
        user: userBob,
        travelPlan: travelPlanId,
        accommodation: true,
        diningFlag: false,
    });
    // Verify requirement failure
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error as plan doesn't belong to Bob.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: resetNecessity - Successful reset", async () => {
    console.log("--- Test: resetNecessity - Successful reset ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan and modify its necessity
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    await concept.updateNecessity({ user: userAlice, travelPlan: travelPlanId, accommodation: false, diningFlag: false });
    console.log(`Setup: Created travel plan ${travelPlanId} and set necessity to (false, false).`);

    const preResetPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
    const preResetNecessity = await concept["necessities"].findOne({ _id: preResetPlan?.necessityID });
    assertEquals(preResetNecessity?.accommodation, false, "Pre-check: Accommodation is false before reset.");
    assertEquals(preResetNecessity?.diningFlag, false, "Pre-check: DiningFlag is false before reset.");

    console.log(`Action: Resetting necessity for travel plan ${travelPlanId}.`);
    const resetResult = await concept.resetNecessity({
        user: userAlice,
        travelPlan: travelPlanId,
    });

    if ("error" in resetResult) {
        throw new Error(`Test failed: ${resetResult.error}`);
    }
    console.log(`Effect: Necessity reset successfully for travel plan ${travelPlanId}.`);

    // Verify effects
    const postResetPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
    const postResetNecessity = await concept["necessities"].findOne({ _id: postResetPlan?.necessityID });
    assertEquals(postResetNecessity?.accommodation, true, "Effect: Accommodation should be reset to true.");
    assertEquals(postResetNecessity?.diningFlag, true, "Effect: DiningFlag should be reset to true.");

    await client.close();
});

Deno.test("TripCostEstimationConcept: resetNecessity - Requires: travelPlan does not exist", async () => {
    console.log("--- Test: resetNecessity - Requires: travelPlan does not exist ---");
    const { client, concept, userAlice } = await setupTestEnvironment();

    const nonExistentTravelPlan = freshID() as TravelPlan;
    console.log(`Action: Attempting to reset necessity for non-existent travel plan ${nonExistentTravelPlan}.`);
    const result = await concept.resetNecessity({
        user: userAlice,
        travelPlan: nonExistentTravelPlan,
    });
    // Verify requirement failure
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error for non-existent travel plan.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Successful generation", async () => {
    console.log("--- Test: generateAICostEstimate - Successful generation ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    console.log(`Setup: Created travel plan ${travelPlanId}.`);

    const mockLlmResponse = JSON.stringify({
        flight: 500,
        roomsPerNight: 150,
        foodDaily: 75,
    });
    const mockLLM = new MockGeminiLLM(mockLlmResponse);

    console.log(`Action: Generating AI cost estimate for plan ${travelPlanId}.`);
    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    if ("error" in result) {
        throw new Error(`Test failed: ${result.error}`);
    }
    const costEstimateId = result.costEstimate;
    console.log(`Effect: Generated cost estimate with ID: ${costEstimateId}.`);

    // Verify effects
    const createdEstimate = await concept["costEstimates"].findOne({ _id: costEstimateId, travelPlanID: travelPlanId });
    assertEquals(createdEstimate?.flight, 500, "Effect: Flight cost should be 500.");
    assertEquals(createdEstimate?.roomsPerNight, 150, "Effect: Rooms per night should be 150.");
    assertEquals(createdEstimate?.foodDaily, 75, "Effect: Food daily should be 75.");
    assertInstanceOf(createdEstimate?.lastUpdated, Date, "Effect: lastUpdated should be a Date object.");

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns invalid JSON", async () => {
    console.log("--- Test: generateAICostEstimate - Interesting Case: LLM returns invalid JSON ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    console.log(`Setup: Created travel plan ${travelPlanId}.`);

    const mockLLM = new MockGeminiLLM("this is not json"); // Invalid JSON response
    console.log("Action: Attempting to generate estimate with LLM returning malformed JSON.");
    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    // Verify error due to parsing failure
    assertObjectMatch(result, { error: (val) => val.includes("Failed to parse LLM response") }, "Expected error for invalid JSON format.");
    console.log(`Effect Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns incomplete JSON", async () => {
  console.log("--- Test: generateAICostEstimate - Interesting Case: LLM returns incomplete JSON ---");
  const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

  // Setup: Create a travel plan
  const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
  const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
  const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
  if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
  const travelPlanId = createResult.travelPlan;
  console.log(`Setup: Created travel plan ${travelPlanId}.`);

  // LLM returns JSON missing required fields
  const mockLLM = new MockGeminiLLM(JSON.stringify({ flight: 500 }));
  console.log("Action: Attempting to generate estimate with LLM returning incomplete JSON.");
  const result = await concept.generateAICostEstimate({
      user: userAlice,
      travelPlan: travelPlanId,
      llm: mockLLM,
  });

  // Verify error due to missing required cost components
  assertObjectMatch(result, { error: (val) => val.includes("LLM response could not be parsed into all required cost components") }, "Expected error for incomplete JSON.");
  console.log(`Effect Confirmed: ${result.error}`);

  await client.close();
});


Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns inaccurate values", async () => {
    console.log("--- Test: generateAICostEstimation - Interesting Case: LLM returns inaccurate values (too high/low) ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    console.log(`Setup: Created travel plan ${travelPlanId}.`);

    // Test case 1: Flight cost too high
    const mockLlmResponseTooHigh = JSON.stringify({
        flight: 200000, // too high
        roomsPerNight: 100,
        foodDaily: 50,
    });
    let mockLLM = new MockGeminiLLM(mockLlmResponseTooHigh);
    console.log("Action: Generating estimate with LLM returning excessively high flight cost.");
    let result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });
    assertObjectMatch(result, { error: (val) => val.includes("LLM provided cost estimates are widely inaccurate") }, "Expected error for too high flight cost.");
    console.log(`Effect Confirmed (too high flight cost): ${result.error}`);

    // Test case 2: Flight cost too low
    const mockLlmResponseTooLow = JSON.stringify({
        flight: 10, // too low
        roomsPerNight: 100,
        foodDaily: 50,
    });
    mockLLM = new MockGeminiLLM(mockLlmResponseTooLow);
    console.log("Action: Generating estimate with LLM returning excessively low flight cost.");
    result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });
    assertObjectMatch(result, { error: (val) => val.includes("LLM provided cost estimates are widely inaccurate") }, "Expected error for too low flight cost.");
    console.log(`Effect Confirmed (too low flight cost): ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM API call fails", async () => {
    console.log("--- Test: generateAICostEstimate - Interesting Case: LLM API call fails ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    console.log(`Setup: Created travel plan ${travelPlanId}.`);

    const mockLLM = new MockGeminiLLM(new Error("Network error during LLM call"));
    console.log("Action: Attempting to generate estimate when LLM API call itself fails.");
    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    // Verify error from LLM interaction layer
    assertObjectMatch(result, { error: (val) => val.includes("LLM API call failed: Network error during LLM call") }, "Expected error for LLM API failure.");
    console.log(`Effect Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: estimateCost - Successful calculation", async () => {
    console.log("--- Test: estimateCost - Successful calculation ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan and generate an estimate
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15); // 5 nights / 6 days
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
    await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: new MockGeminiLLM(mockLlmResponse) });
    console.log(`Setup: Created travel plan ${travelPlanId} and generated a cost estimate.`);

    const numDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)); // 5 days
    const expectedTotal = 500 + (150 * numDays) + (75 * numDays); // 500 + (150 * 5) + (75 * 5) = 500 + 750 + 375 = 1625

    console.log(`Action: Estimating total cost for plan ${travelPlanId}.`);
    const result = await concept.estimateCost({ user: userAlice, travelPlan: travelPlanId });

    if ("error" in result) {
        throw new Error(`Test failed: ${result.error}`);
    }
    // Verify effects
    assertEquals(result.totalCost, expectedTotal, "Effect: Total cost should be correctly calculated.");
    console.log(`Effect: Calculated total cost: ${result.totalCost}. Expected: ${expectedTotal}.`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: estimateCost - Interesting Case: Requires no associated CostEstimate", async () => {
    console.log("--- Test: estimateCost - Interesting Case: Requires no associated CostEstimate ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a new travel plan without generating an estimate
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 20);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 25);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error("Setup failed: Failed to create new plan for test.");
    const newTravelPlanId = createResult.travelPlan;
    console.log(`Setup: Created travel plan ${newTravelPlanId} but deliberately did NOT generate a cost estimate.`);

    console.log(`Action: Attempting to estimate cost for plan ${newTravelPlanId} which has no associated estimate.`);
    const result = await concept.estimateCost({ user: userAlice, travelPlan: newTravelPlanId });

    // Verify requirement failure
    assertObjectMatch(result, { error: "No cost estimate found for this travel plan." }, "Requirement: Should return error if no cost estimate exists.");
    console.log(`Requirement Confirmed: ${result.error}`);

    // Cleanup
    await concept.deleteTravelPlan({ user: userAlice, travelPlan: newTravelPlanId });
    await client.close();
});

Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Returns all plan IDs for user", async () => {
    console.log("--- Test: _getAllTravelPlans - Returns all plan IDs for user ---");
    const { client, concept, userAlice, locationNYC, locationLA, locationCHI } = await setupTestEnvironment();

    // Setup: Create multiple travel plans for Alice
    const fromDate1 = new Date(); fromDate1.setDate(fromDate1.getDate() + 10);
    const toDate1 = new Date(); toDate1.setDate(toDate1.getDate() + 15);
    const createResult1 = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate: fromDate1, toDate: toDate1 });
    if ("error" in createResult1) throw new Error(`Setup failed: ${createResult1.error}`);
    const travelPlanId1 = createResult1.travelPlan;

    const fromDate2 = new Date(); fromDate2.setDate(fromDate2.getDate() + 20);
    const toDate2 = new Date(); toDate2.setDate(toDate2.getDate() + 25);
    const createResult2 = await concept.createTravelPlan({ user: userAlice, fromCity: locationLA, toCity: locationCHI, fromDate: fromDate2, toDate: toDate2 });
    if ("error" in createResult2) throw new Error(`Setup failed: ${createResult2.error}`);
    const travelPlanId2 = createResult2.travelPlan;
    console.log(`Setup: Created two travel plans: ${travelPlanId1} and ${travelPlanId2} for ${userAlice}.`);

    console.log(`Action: Querying all travel plan IDs for user ${userAlice}.`);
    const allPlans = await concept._getAllTravelPlans({ user: userAlice });

    if (!Array.isArray(allPlans) || allPlans.some(p => typeof p !== 'string')) {
        throw new Error(`Test failed: _getAllTravelPlans returned an unexpected format: ${JSON.stringify(allPlans)}`);
    }
    // Verify effects
    assertEquals(allPlans.length, 2, "Effect: Should return 2 travel plan IDs.");
    assertEquals(allPlans.includes(travelPlanId1), true, `Effect: Should include plan ID ${travelPlanId1}.`);
    assertEquals(allPlans.includes(travelPlanId2), true, `Effect: Should include plan ID ${travelPlanId2}.`);
    console.log(`Effect: Retrieved plans for ${userAlice}: ${JSON.stringify(allPlans)}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Returns empty array if user has no plans", async () => {
    console.log("--- Test: _getAllTravelPlans - Returns empty array if user has no plans ---");
    const { client, concept } = await setupTestEnvironment();

    const userNoPlans = "user:Charlie" as User;
    // Ensure Charlie exists but has no travel plans assigned
    await concept["users"].updateOne(
      { _id: userNoPlans },
      { $setOnInsert: { _id: userNoPlans } },
      { upsert: true },
    );
    console.log(`Setup: Created user ${userNoPlans} with no travel plans.`);

    console.log(`Action: Querying all travel plan IDs for user ${userNoPlans}.`);
    const allPlans = await concept._getAllTravelPlans({ user: userNoPlans });

    if (!Array.isArray(allPlans) || allPlans.some(p => 'error' in p)) {
        throw new Error(`Test failed: _getAllTravelPlans returned an unexpected error: ${JSON.stringify(allPlans)}`);
    }
    // Verify effects
    assertEquals(allPlans.length, 0, "Effect: Should return an empty array for a user with no plans.");
    console.log(`Effect: Retrieved plans for user ${userNoPlans}: ${JSON.stringify(allPlans)}`);

    await client.close();
});


Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Requires: user does not exist", async () => {
    console.log("--- Test: _getAllTravelPlans - Requires: user does not exist ---");
    const { client, concept } = await setupTestEnvironment();

    const nonExistentUser = "user:NonExistent" as User;
    console.log(`Action: Querying travel plan IDs for non-existent user ${nonExistentUser}.`);
    const result = await concept._getAllTravelPlans({ user: nonExistentUser });

    // Verify requirement failure
    if (!Array.isArray(result) || result.length === 0 || !('error' in result[0])) {
         throw new Error(`Test failed: _getAllTravelPlans did not return expected error for non-existent user: ${JSON.stringify(result)}`);
    }
    assertObjectMatch(result[0], { error: `User with ID ${nonExistentUser} does not exist.` }, "Requirement: Should return error for non-existent user.");
    console.log(`Requirement Confirmed: ${result[0].error}`);

    await client.close();
});


Deno.test("TripCostEstimationConcept: deleteTravelPlan - Successful deletion of plan and associated data", async () => {
    console.log("--- Test: deleteTravelPlan - Successful deletion of plan and associated data ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan, its necessity, and a cost estimate
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
    const generateResult = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: new MockGeminiLLM(mockLlmResponse) });
    if ("error" in generateResult) throw new Error(`Setup failed: ${generateResult.error}`);
    const costEstimateId = generateResult.costEstimate;

    const planToDelete = await concept["travelPlans"].findOne({ _id: travelPlanId });
    if (!planToDelete) throw new Error("Setup failed: Plan not found after creation.");
    const necessityId = planToDelete.necessityID;

    console.log(`Setup: Created plan (${travelPlanId}), Necessity (${necessityId}), CostEstimate (${costEstimateId}).`);

    console.log(`Action: Deleting travel plan ${travelPlanId}.`);
    const deleteResult = await concept.deleteTravelPlan({
        user: userAlice,
        travelPlan: travelPlanId,
    });

    if ("error" in deleteResult) {
        throw new Error(`Test failed: ${deleteResult.error}`);
    }
    console.log(`Effect: Travel plan ${travelPlanId} deleted successfully.`);

    // Verify effects: records should be null
    const deletedPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
    assertEquals(deletedPlan, null, "Effect: Travel plan should be deleted.");

    const deletedNecessity = await concept["necessities"].findOne({ _id: necessityId });
    assertEquals(deletedNecessity, null, "Effect: Associated necessity should be deleted.");

    const deletedCostEstimate = await concept["costEstimates"].findOne({ _id: costEstimateId });
    assertEquals(deletedCostEstimate, null, "Effect: Associated cost estimate should be deleted.");

    await client.close();
});

Deno.test("TripCostEstimationConcept: deleteTravelPlan - Requires: travelPlan does not exist", async () => {
    console.log("--- Test: deleteTravelPlan - Requires: travelPlan does not exist ---");
    const { client, concept, userAlice } = await setupTestEnvironment();

    const nonExistentTravelPlan = freshID() as TravelPlan;
    console.log(`Action: Attempting to delete non-existent travel plan ${nonExistentTravelPlan}.`);
    const result = await concept.deleteTravelPlan({
        user: userAlice,
        travelPlan: nonExistentTravelPlan,
    });
    // Verify requirement failure
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error for non-existent travel plan.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: Principle Trace - Generate realistic cost estimates based on preferences", async () => {
    console.log("\n--- Principle Trace Test ---");
    const { client, concept } = await setupTestEnvironment();

    const principleUser = "user:PrincipleAlice" as User;
    const principleLocationHome = freshID() as Location;
    const principleLocationDest = freshID() as Location;

    // 1. Setup: Create user and locations
    await concept["locations"].insertOne({ _id: principleLocationHome, city: "London" });
    await concept["locations"].insertOne({ _id: principleLocationDest, city: "Paris" });
    await concept["users"].updateOne({ _id: principleUser }, { $setOnInsert: { _id: principleUser } }, { upsert: true });
    console.log("1. Setup: Created principle user and locations (London, Paris).");

    const fromDateP = new Date();
    fromDateP.setDate(fromDateP.getDate() + 60); // 2 months from now
    const toDateP = new Date();
    toDateP.setDate(toDateP.getDate() + 67); // 7 nights later, making it an 8-day trip (7 nights)

    // 2. Action: Create initial travel plan with default necessity
    const createPlanResult = await concept.createTravelPlan({
        user: principleUser,
        fromCity: principleLocationHome,
        toCity: principleLocationDest,
        fromDate: fromDateP,
        toDate: toDateP,
    });
    if ("error" in createPlanResult) throw new Error(`Principle Trace failed to create travel plan: ${createPlanResult.error}`);
    const principleTravelPlanId = createPlanResult.travelPlan;
    console.log(`2. Action: Created travel plan (${principleTravelPlanId}) for ${principleUser} from London to Paris, with default necessities (accommodation=true, dining=true).`);

    let currentPlan = await concept["travelPlans"].findOne({ _id: principleTravelPlanId });
    if (!currentPlan) throw new Error("Travel plan not found after creation.");
    let currentNecessity = await concept["necessities"].findOne({ _id: currentPlan.necessityID });
    assertEquals(currentNecessity?.accommodation, true, "Verification: Initial accommodation is true.");
    assertEquals(currentNecessity?.diningFlag, true, "Verification: Initial diningFlag is true.");
    console.log("   Verification: Default necessities confirmed (accommodation: true, dining: true).");

    // 3. Action: Update necessity based on user preferences
    const updateNecessityResult = await concept.updateNecessity({
        user: principleUser,
        travelPlan: principleTravelPlanId,
        accommodation: false, // User prefers to stay with friends/family
        diningFlag: true,     // But still wants to eat out
    });
    if ("error" in updateNecessityResult) throw new Error(`Principle Trace failed to update necessity: ${updateNecessityResult.error}`);
    currentNecessity = await concept["necessities"].findOne({ _id: updateNecessityResult.necessity });
    assertEquals(currentNecessity?.accommodation, false, "Verification: Updated accommodation is false (staying with friends/family).");
    assertEquals(currentNecessity?.diningFlag, true, "Verification: Updated diningFlag is true (eating out).");
    console.log(`3. Action: Updated necessity for plan ${principleTravelPlanId}: accommodation false, dining true.`);

    // 4. Action: Generate AI cost estimate using LLM with specialized tool
    const mockPrincipleLlmResponse = JSON.stringify({
        flight: 180,
        roomsPerNight: 0,   // Reflects 'accommodation: false'
        foodDaily: 60,      // Reflects 'diningFlag: true'
    });
    const mockLLM = new MockGeminiLLM(mockPrincipleLlmResponse);

    const generateEstimateResult = await concept.generateAICostEstimate({
        user: principleUser,
        travelPlan: principleTravelPlanId,
        llm: mockLLM,
    });
    if ("error" in generateEstimateResult) throw new Error(`Principle Trace failed to generate estimate: ${generateEstimateResult.error}`);
    const principleCostEstimateId = generateEstimateResult.costEstimate;
    console.log(`4. Action: Generated AI cost estimate (${principleCostEstimateId}) using LLM for plan ${principleTravelPlanId}.`);

    const storedEstimate = await concept["costEstimates"].findOne({ _id: principleCostEstimateId });
    assertEquals(storedEstimate?.flight, 180, "Verification: Stored flight estimate confirmed.");
    assertEquals(storedEstimate?.roomsPerNight, 0, "Verification: Stored rooms per night estimate confirmed (0 for no accommodation).");
    assertEquals(storedEstimate?.foodDaily, 60, "Verification: Stored food daily estimate confirmed.");
    console.log(`   Verification: Stored estimate: Flight ${storedEstimate?.flight}, Rooms/Night ${storedEstimate?.roomsPerNight}, Food/Day ${storedEstimate?.foodDaily}.`);

    // 5. Action: Calculate total cost based on generated estimate
    const estimateCostResult = await concept.estimateCost({ user: principleUser, travelPlan: principleTravelPlanId });
    if ("error" in estimateCostResult) throw new Error(`Principle Trace failed to get total cost: ${estimateCostResult.error}`);

    const numDaysPrinciple = Math.ceil((toDateP.getTime() - fromDateP.getTime()) / (1000 * 60 * 60 * 24)); // 7 days
    // Calculation: Flight + (RoomsPerNight * numDays) + (FoodDaily * numDays)
    const expectedTotalCost = 180 + (0 * numDaysPrinciple) + (60 * numDaysPrinciple); // 180 + (0 * 7) + (60 * 7) = 180 + 420 = 600
    assertEquals(estimateCostResult.totalCost, expectedTotalCost, "Verification: Total estimated cost should be correct based on updated preferences.");
    console.log(`5. Action: Calculated total cost: ${estimateCostResult.totalCost}. Expected: ${expectedTotalCost}.`);
    console.log("   Verification: Total cost aligns with flight, NO accommodation costs, and daily dining costs for the duration.");

    // 6. Query: Retrieve user's travel plans
    const allPrinciplePlans = await concept._getAllTravelPlans({ user: principleUser });
    if (!Array.isArray(allPrinciplePlans) || allPrinciplePlans.some(p => typeof p !== 'string')) {
        throw new Error(`_getAllTravelPlans returned an unexpected format: ${JSON.stringify(allPrinciplePlans)}`);
    }
    assertEquals(allPrinciplePlans.includes(principleTravelPlanId), true, "Verification: Principle travel plan should be listed for the user.");
    console.log("6. Query: User's travel plans retrieved, includes the principle plan.");

    console.log("Principle Trace completed successfully: An estimate was provided based on user's choices and LLM data.");
    await client.close();
});
```
