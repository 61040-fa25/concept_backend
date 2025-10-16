---
timestamp: 'Thu Oct 16 2025 12:49:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_124931.e124032e.md]]'
content_id: c3891d45eb77364023a3e57fb802b1b1439b81a5149c484900a2ae500a5321ae
---

# file: src/TripCostEstimation/TripCostEstimationConcept.test.ts

```typescript
import { assertEquals, assertObjectMatch, assertInstanceOf } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Import the concept class and its dependencies
import TripCostEstimationConcept from "./TripCostEstimationConcept.ts";
import { GeminiLLM } from "@utils/gemini-llm.ts"; // Only need GeminiLLM, not Config directly

// Helper types from the concept for clarity in tests
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

    constructor(response: string | Error = "") {
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
        console.log(`[MockGeminiLLM] Received prompt: ${prompt.substring(0, 100)}...`);
        if (this.shouldThrow) {
            throw this.mockResponse;
        }
        return Promise.resolve(this.mockResponse as string);
    }
}


Deno.test("TripCostEstimationConcept: All Actions and Queries", async (t) => {
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

    // Deno.test.data is used to pass state between sequential `t.step` tests within the same `Deno.test` block.
    interface TestData {
        travelPlanId?: TravelPlan;
        fromDate?: Date;
        toDate?: Date;
        userAlice: User;
        locationNYC: Location;
        locationLA: Location;
        costEstimateId?: CostEstimate;
    }
    const testData: TestData = { userAlice, locationNYC, locationLA };


    await t.step("Action: createTravelPlan - Successful creation", async () => {
        console.log("--- Test: createTravelPlan - Successful creation ---");
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() + 10);
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + 15);

        const result = await concept.createTravelPlan({
            user: testData.userAlice,
            fromCity: testData.locationNYC,
            toCity: testData.locationLA,
            fromDate: fromDate,
            toDate: toDate,
        });

        if ("error" in result) {
            throw new Error(`Failed to create travel plan: ${result.error}`);
        }
        const travelPlanId = result.travelPlan;
        console.log(`Created travel plan with ID: ${travelPlanId}`);

        const createdPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
        assertEquals(createdPlan?._id, travelPlanId, "Travel plan should exist");
        assertEquals(createdPlan?.userID, testData.userAlice, "Travel plan should be linked to user");
        assertEquals(createdPlan?.fromCity, testData.locationNYC, "fromCity should be correct");
        assertEquals(createdPlan?.toCity, testData.locationLA, "toCity should be correct");

        const associatedNecessity = await concept["necessities"].findOne({ _id: createdPlan?.necessityID });
        assertEquals(associatedNecessity?.accommodation, true, "Default accommodation should be true");
        assertEquals(associatedNecessity?.diningFlag, true, "Default diningFlag should be true");

        // Store for subsequent tests
        testData.travelPlanId = travelPlanId;
        testData.fromDate = fromDate;
        testData.toDate = toDate;
    });

    await t.step("Action: createTravelPlan - Requires: fromCity does not exist", async () => {
        console.log("--- Test: createTravelPlan - Requires: fromCity does not exist ---");
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() + 10);
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + 15);
        const nonExistentLocation = freshID() as Location;

        const result = await concept.createTravelPlan({
            user: testData.userAlice,
            fromCity: nonExistentLocation,
            toCity: testData.locationLA,
            fromDate: fromDate,
            toDate: toDate,
        });
        assertObjectMatch(result, { error: `Origin city with ID ${nonExistentLocation} not found.` });
        console.log(`Confirmed error: ${result.error}`);
    });

    await t.step("Action: createTravelPlan - Requires: toDate < fromDate", async () => {
        console.log("--- Test: createTravelPlan - Requires: toDate < fromDate ---");
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() + 15);
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + 10); // toDate is before fromDate

        const result = await concept.createTravelPlan({
            user: testData.userAlice,
            fromCity: testData.locationNYC,
            toCity: testData.locationLA,
            fromDate: fromDate,
            toDate: toDate,
        });
        assertObjectMatch(result, { error: "Arrival date must be on or after departure date." });
        console.log(`Confirmed error: ${result.error}`);
    });

    await t.step("Action: createTravelPlan - Requires: fromDate is in the past", async () => {
        console.log("--- Test: createTravelPlan - Requires: fromDate is in the past ---");
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 5); // in the past
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + 10);

        const result = await concept.createTravelPlan({
            user: testData.userAlice,
            fromCity: testData.locationNYC,
            toCity: testData.locationLA,
            fromDate: fromDate,
            toDate: toDate,
        });
        assertObjectMatch(result, { error: "Departure and arrival dates must be in the future." });
        console.log(`Confirmed error: ${result.error}`);
    });

    await t.step("Action: updateNecessity - Successful update", async () => {
        console.log("--- Test: updateNecessity - Successful update ---");
        const { travelPlanId, userAlice } = testData;

        const updateResult = await concept.updateNecessity({
            user: userAlice,
            travelPlan: travelPlanId!,
            accommodation: false,
            diningFlag: true,
        });

        if ("error" in updateResult) {
            throw new Error(`Failed to update necessity: ${updateResult.error}`);
        }
        console.log(`Updated necessity for travel plan ${travelPlanId}`);

        const updatedPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
        const updatedNecessity = await concept["necessities"].findOne({ _id: updatedPlan?.necessityID });
        assertEquals(updatedNecessity?.accommodation, false, "Accommodation should be false");
        assertEquals(updatedNecessity?.diningFlag, true, "DiningFlag should be true");
        assertEquals(updateResult.travelPlan, travelPlanId);
        assertEquals(updateResult.necessity, updatedPlan?.necessityID);
    });

    await t.step("Action: updateNecessity - Requires: travelPlan does not belong to user", async () => {
        console.log("--- Test: updateNecessity - Requires: travelPlan does not belong to user ---");
        const { travelPlanId } = testData;
        const userBob = "user:Bob" as User;

        const result = await concept.updateNecessity({
            user: userBob,
            travelPlan: travelPlanId!,
            accommodation: true,
            diningFlag: false,
        });
        assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." });
        console.log(`Confirmed error: ${result.error}`);
    });

    await t.step("Action: resetNecessity - Successful reset", async () => {
        console.log("--- Test: resetNecessity - Successful reset ---");
        const { travelPlanId, userAlice } = testData;

        // First, change it to something non-default
        await concept.updateNecessity({ user: userAlice, travelPlan: travelPlanId!, accommodation: false, diningFlag: false });
        const preResetPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
        const preResetNecessity = await concept["necessities"].findOne({ _id: preResetPlan?.necessityID });
        assertEquals(preResetNecessity?.accommodation, false);
        assertEquals(preResetNecessity?.diningFlag, false);
        console.log("Necessity changed from default for reset test.");

        const resetResult = await concept.resetNecessity({
            user: userAlice,
            travelPlan: travelPlanId!,
        });

        if ("error" in resetResult) {
            throw new Error(`Failed to reset necessity: ${resetResult.error}`);
        }
        console.log(`Reset necessity for travel plan ${travelPlanId}`);

        const postResetPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
        const postResetNecessity = await concept["necessities"].findOne({ _id: postResetPlan?.necessityID });
        assertEquals(postResetNecessity?.accommodation, true, "Accommodation should be reset to true");
        assertEquals(postResetNecessity?.diningFlag, true, "DiningFlag should be reset to true");
    });

    await t.step("Action: resetNecessity - Requires: travelPlan does not exist", async () => {
        console.log("--- Test: resetNecessity - Requires: travelPlan does not exist ---");
        const nonExistentTravelPlan = freshID() as TravelPlan;
        const result = await concept.resetNecessity({
            user: testData.userAlice,
            travelPlan: nonExistentTravelPlan,
        });
        assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." });
        console.log(`Confirmed error: ${result.error}`);
    });


    await t.step("Action: generateAICostEstimate - Successful generation", async () => {
        console.log("--- Test: generateAICostEstimate - Successful generation ---");
        const { travelPlanId, userAlice } = testData;

        const mockLlmResponse = JSON.stringify({
            flight: 500,
            roomsPerNight: 150,
            foodDaily: 75,
        });
        const mockLLM = new MockGeminiLLM(mockLlmResponse);

        const result = await concept.generateAICostEstimate({
            user: userAlice,
            travelPlan: travelPlanId!,
            llm: mockLLM,
        });

        if ("error" in result) {
            throw new Error(`Failed to generate AI cost estimate: ${result.error}`);
        }
        const costEstimateId = result.costEstimate;
        console.log(`Generated cost estimate with ID: ${costEstimateId}`);

        const createdEstimate = await concept["costEstimates"].findOne({ _id: costEstimateId, travelPlanID: travelPlanId });
        assertEquals(createdEstimate?.flight, 500);
        assertEquals(createdEstimate?.roomsPerNight, 150);
        assertEquals(createdEstimate?.foodDaily, 75);
        assertInstanceOf(createdEstimate?.lastUpdated, Date);
        testData.costEstimateId = costEstimateId; // Store for next test
    });

    await t.step("Action: generateAICostEstimate - LLM returns invalid JSON", async () => {
        console.log("--- Test: generateAICostEstimate - LLM returns invalid JSON ---");
        const { travelPlanId, userAlice } = testData;
        const mockLLM = new MockGeminiLLM("this is not json");

        const result = await concept.generateAICostEstimate({
            user: userAlice,
            travelPlan: travelPlanId!,
            llm: mockLLM,
        });

        assertObjectMatch(result, { error: (val) => val.includes("Failed to parse LLM response") });
        console.log(`Confirmed error: ${result.error}`);
    });

    await t.step("Action: generateAICostEstimate - LLM returns incomplete JSON", async () => {
      console.log("--- Test: generateAICostEstimate - LLM returns incomplete JSON ---");
      const { travelPlanId, userAlice } = testData;
      const mockLLM = new MockGeminiLLM(JSON.stringify({ flight: 500 })); // Missing roomsPerNight and foodDaily

      const result = await concept.generateAICostEstimate({
          user: userAlice,
          travelPlan: travelPlanId!,
          llm: mockLLM,
      });

      assertObjectMatch(result, { error: (val) => val.includes("LLM response could not be parsed into all required cost components") });
      console.log(`Confirmed error: ${result.error}`);
    });

    await t.step("Action: generateAICostEstimate - LLM returns inaccurate values (too high/low)", async () => {
        console.log("--- Test: generateAICostEstimate - LLM returns inaccurate values ---");
        const { travelPlanId, userAlice } = testData;

        const mockLlmResponseTooHigh = JSON.stringify({
            flight: 200000, // too high
            roomsPerNight: 100,
            foodDaily: 50,
        });
        let mockLLM = new MockGeminiLLM(mockLlmResponseTooHigh);
        let result = await concept.generateAICostEstimate({
            user: userAlice,
            travelPlan: travelPlanId!,
            llm: mockLLM,
        });
        assertObjectMatch(result, { error: (val) => val.includes("LLM provided cost estimates are widely inaccurate") });
        console.log(`Confirmed error for too high flight cost: ${result.error}`);

        const mockLlmResponseTooLow = JSON.stringify({
            flight: 10, // too low
            roomsPerNight: 100,
            foodDaily: 50,
        });
        mockLLM = new MockGeminiLLM(mockLlmResponseTooLow);
        result = await concept.generateAICostEstimate({
            user: userAlice,
            travelPlan: travelPlanId!,
            llm: mockLLM,
        });
        assertObjectMatch(result, { error: (val) => val.includes("LLM provided cost estimates are widely inaccurate") });
        console.log(`Confirmed error for too low flight cost: ${result.error}`);
    });

    await t.step("Action: generateAICostEstimate - LLM API call fails", async () => {
        console.log("--- Test: generateAICostEstimate - LLM API call fails ---");
        const { travelPlanId, userAlice } = testData;
        const mockLLM = new MockGeminiLLM(new Error("Network error during LLM call"));

        const result = await concept.generateAICostEstimate({
            user: userAlice,
            travelPlan: travelPlanId!,
            llm: mockLLM,
        });

        assertObjectMatch(result, { error: (val) => val.includes("LLM API call failed: Network error during LLM call") });
        console.log(`Confirmed error: ${result.error}`);
    });


    await t.step("Action: estimateCost - Successful calculation", async () => {
        console.log("--- Test: estimateCost - Successful calculation ---");
        const { travelPlanId, userAlice, fromDate, toDate } = testData;
        const days = Math.ceil((toDate!.getTime() - fromDate!.getTime()) / (1000 * 60 * 60 * 24)); // 5 days from initial setup

        // Ensure a cost estimate exists (from previous step, re-generate if needed for independence)
        let existingEstimate = await concept["costEstimates"].findOne({ travelPlanID: travelPlanId });
        if (!existingEstimate) {
            const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
            await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId!, llm: new MockGeminiLLM(mockLlmResponse) });
        }

        const calculatedTotal = 500 + (150 * days) + (75 * days); // flight + (roomsPerNight * days) + (foodDaily * days)

        const result = await concept.estimateCost({ user: userAlice, travelPlan: travelPlanId! });

        if ("error" in result) {
            throw new Error(`Failed to estimate cost: ${result.error}`);
        }
        assertEquals(result.totalCost, calculatedTotal, "Total cost should be correctly calculated");
        console.log(`Estimated total cost: ${result.totalCost}`);
    });

    await t.step("Action: estimateCost - Requires: no associated CostEstimate", async () => {
        console.log("--- Test: estimateCost - Requires: no associated CostEstimate ---");
        const { userAlice, locationNYC, locationLA } = testData;
        // Create a new travel plan without an estimate
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() + 20);
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + 25);
        const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
        if ("error" in createResult) throw new Error("Failed to create new plan for test");
        const newTravelPlanId = createResult.travelPlan;

        const result = await concept.estimateCost({ user: userAlice, travelPlan: newTravelPlanId });
        assertObjectMatch(result, { error: "No cost estimate found for this travel plan." });
        console.log(`Confirmed error: ${result.error}`);

        // Clean up the temporary travel plan
        await concept.deleteTravelPlan({user: userAlice, travelPlan: newTravelPlanId});
    });

    await t.step("Query: _getAllTravelPlans - Returns all plan IDs for user", async () => {
        console.log("--- Test: _getAllTravelPlans - Returns all plan IDs for user ---");
        const { userAlice, travelPlanId, locationNYC, locationLA } = testData;

        // Create a second travel plan for userAlice
        const fromDate2 = new Date();
        fromDate2.setDate(fromDate2.getDate() + 30);
        const toDate2 = new Date();
        toDate2.setDate(toDate2.getDate() + 35);
        const result2 = await concept.createTravelPlan({
            user: userAlice,
            fromCity: locationLA,
            toCity: locationNYC,
            fromDate: fromDate2,
            toDate: toDate2,
        });
        if ("error" in result2) {
            throw new Error(`Failed to create second travel plan: ${result2.error}`);
        }
        const travelPlanId2 = result2.travelPlan;
        console.log(`Created second travel plan with ID: ${travelPlanId2}`);

        const allPlans = await concept._getAllTravelPlans({ user: userAlice });
        if (!Array.isArray(allPlans) || allPlans.some(p => typeof p !== 'string')) { // Check if it's an array of IDs or error array
            throw new Error(`_getAllTravelPlans returned an unexpected format: ${JSON.stringify(allPlans)}`);
        }
        assertEquals(allPlans.length, 2, "Should return 2 travel plan IDs");
        assertEquals(allPlans.includes(travelPlanId!), true, `Should include original plan ID ${travelPlanId}`);
        assertEquals(allPlans.includes(travelPlanId2), true, `Should include second plan ID ${travelPlanId2}`);
        console.log(`Retrieved plans: ${JSON.stringify(allPlans)}`);

        // Clean up the second travel plan so the first one is the only remaining
        await concept.deleteTravelPlan({user: userAlice, travelPlan: travelPlanId2});
        console.log(`Cleaned up second travel plan: ${travelPlanId2}`);
    });

    await t.step("Query: _getAllTravelPlans - Returns empty array if user has no plans", async () => {
        console.log("--- Test: _getAllTravelPlans - Returns empty array if user has no plans ---");
        const userNoPlans = "user:Charlie" as User;
        // Ensure user exists but has no plans
        await concept["users"].updateOne(
          { _id: userNoPlans },
          { $setOnInsert: { _id: userNoPlans } },
          { upsert: true },
        );

        const allPlans = await concept._getAllTravelPlans({ user: userNoPlans });
        if (!Array.isArray(allPlans) || allPlans.some(p => 'error' in p)) {
            throw new Error(`_getAllTravelPlans returned an unexpected error: ${JSON.stringify(allPlans)}`);
        }
        assertEquals(allPlans.length, 0, "Should return an empty array for a user with no plans");
        console.log(`Retrieved plans for user Charlie: ${JSON.stringify(allPlans)}`);
    });


    await t.step("Query: _getAllTravelPlans - Requires: user does not exist", async () => {
        console.log("--- Test: _getAllTravelPlans - Requires: user does not exist ---");
        const nonExistentUser = "user:NonExistent" as User;

        const result = await concept._getAllTravelPlans({ user: nonExistentUser });
        if (!Array.isArray(result) || result.length === 0 || !('error' in result[0])) {
             throw new Error(`_getAllTravelPlans did not return expected error for non-existent user: ${JSON.stringify(result)}`);
        }
        assertObjectMatch(result[0], { error: `User with ID ${nonExistentUser} does not exist.` });
        console.log(`Confirmed error: ${result[0].error}`);
    });


    await t.step("Action: deleteTravelPlan - Successful deletion of plan and associated data", async () => {
        console.log("--- Test: deleteTravelPlan - Successful deletion of plan and associated data ---");
        const { travelPlanId, userAlice } = testData;

        // Ensure there's a cost estimate and necessity for this plan
        const planToDelete = await concept["travelPlans"].findOne({ _id: travelPlanId });
        if (!planToDelete) throw new Error("Plan not found for deletion test.");
        const necessityId = planToDelete.necessityID;
        const existingNecessity = await concept["necessities"].findOne({ _id: necessityId });
        if (!existingNecessity) throw new Error("Necessity not found for deletion test.");
        // Ensure there is a cost estimate associated with it (re-generate if necessary)
        let existingCostEstimate = await concept["costEstimates"].findOne({ travelPlanID: travelPlanId });
        if (!existingCostEstimate) {
            const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
            await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId!, llm: new MockGeminiLLM(mockLlmResponse) });
            existingCostEstimate = await concept["costEstimates"].findOne({ travelPlanID: travelPlanId });
        }
        if (!existingCostEstimate) throw new Error("Cost estimate not found for deletion test, even after attempt to generate.");
        const costEstimateId = existingCostEstimate._id;
        console.log(`Pre-check: Plan (${travelPlanId}), Necessity (${necessityId}), CostEstimate (${costEstimateId}) exist.`);

        const deleteResult = await concept.deleteTravelPlan({
            user: userAlice,
            travelPlan: travelPlanId!,
        });

        if ("error" in deleteResult) {
            throw new Error(`Failed to delete travel plan: ${deleteResult.error}`);
        }
        console.log(`Deleted travel plan with ID: ${travelPlanId}`);

        const deletedPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
        assertEquals(deletedPlan, null, "Travel plan should be deleted");

        const deletedNecessity = await concept["necessities"].findOne({ _id: necessityId });
        assertEquals(deletedNecessity, null, "Associated necessity should be deleted");

        const deletedCostEstimate = await concept["costEstimates"].findOne({ _id: costEstimateId });
        assertEquals(deletedCostEstimate, null, "Associated cost estimate should be deleted");
    });

    await t.step("Action: deleteTravelPlan - Requires: travelPlan does not exist", async () => {
        console.log("--- Test: deleteTravelPlan - Requires: travelPlan does not exist ---");
        const nonExistentTravelPlan = freshID() as TravelPlan;
        const result = await concept.deleteTravelPlan({
            user: testData.userAlice,
            travelPlan: nonExistentTravelPlan,
        });
        assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." });
        console.log(`Confirmed error: ${result.error}`);
    });

    console.log("\n--- Principle Trace ---");
    await t.step("Principle Trace: Generate realistic cost estimates based on preferences", async () => {
        const principleUser = "user:PrincipleAlice" as User;
        const principleLocationHome = freshID() as Location;
        const principleLocationDest = freshID() as Location;

        await concept["locations"].insertOne({ _id: principleLocationHome, city: "London" });
        await concept["locations"].insertOne({ _id: principleLocationDest, city: "Paris" });
        // Ensure the principle user exists for _getAllTravelPlans check later
        await concept["users"].updateOne({ _id: principleUser }, { $setOnInsert: { _id: principleUser } }, { upsert: true });
        console.log("1. Setup: Created principle user and locations (London, Paris).");

        const fromDateP = new Date();
        fromDateP.setDate(fromDateP.getDate() + 60); // 2 months from now
        const toDateP = new Date();
        toDateP.setDate(toDateP.getDate() + 67); // 7 nights later, making it an 8-day trip (7 nights)

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
        assertEquals(currentNecessity?.accommodation, true, "Initial accommodation is true");
        assertEquals(currentNecessity?.diningFlag, true, "Initial diningFlag is true");
        console.log("   Verification: Default necessities confirmed.");

        const updateNecessityResult = await concept.updateNecessity({
            user: principleUser,
            travelPlan: principleTravelPlanId,
            accommodation: false, // User prefers to stay with friends/family
            diningFlag: true,     // But still wants to eat out
        });
        if ("error" in updateNecessityResult) throw new Error(`Principle Trace failed to update necessity: ${updateNecessityResult.error}`);
        currentNecessity = await concept["necessities"].findOne({ _id: updateNecessityResult.necessity });
        assertEquals(currentNecessity?.accommodation, false, "Updated accommodation is false (staying with friends/family)");
        assertEquals(currentNecessity?.diningFlag, true, "Updated diningFlag is true (eating out)");
        console.log(`3. Action: Updated necessity for plan ${principleTravelPlanId}: accommodation false, dining true.`);

        // Mock LLM response for principle trace, reflecting updated preferences
        const mockPrincipleLlmResponse = JSON.stringify({
            flight: 180,
            roomsPerNight: 0,   // Accommodation is false
            foodDaily: 60,      // Dining is true
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
        assertEquals(storedEstimate?.flight, 180);
        assertEquals(storedEstimate?.roomsPerNight, 0); // Reflects 'accommodation: false'
        assertEquals(storedEstimate?.foodDaily, 60);    // Reflects 'diningFlag: true'
        console.log(`   Verification: Stored estimate confirmed: Flight ${storedEstimate?.flight}, Rooms/Night ${storedEstimate?.roomsPerNight}, Food/Day ${storedEstimate?.foodDaily}.`);

        const estimateCostResult = await concept.estimateCost({ user: principleUser, travelPlan: principleTravelPlanId });
        if ("error" in estimateCostResult) throw new Error(`Principle Trace failed to get total cost: ${estimateCostResult.error}`);

        const numDaysPrinciple = Math.ceil((toDateP.getTime() - fromDateP.getTime()) / (1000 * 60 * 60 * 24)); // 7 days (8 inclusive days from fromDate to toDate)
        // Calculation: Flight + (RoomsPerNight * numDays) + (FoodDaily * numDays)
        const expectedTotalCost = 180 + (0 * numDaysPrinciple) + (60 * numDaysPrinciple); // 180 + (0 * 7) + (60 * 7) = 180 + 420 = 600
        assertEquals(estimateCostResult.totalCost, expectedTotalCost, "Principle: Total estimated cost should be correct based on updated preferences.");
        console.log(`5. Action: Calculated total cost: ${estimateCostResult.totalCost}.`);
        console.log("   Verification: Total cost aligns with flight, NO accommodation costs, and daily dining costs for the duration.");

        const allPrinciplePlans = await concept._getAllTravelPlans({ user: principleUser });
        if (!Array.isArray(allPrinciplePlans) || allPrinciplePlans.some(p => typeof p !== 'string')) {
            throw new Error(`_getAllTravelPlans returned an unexpected format: ${JSON.stringify(allPrinciplePlans)}`);
        }
        assertEquals(allPrinciplePlans.includes(principleTravelPlanId), true, "Principle travel plan should be listed for the user.");
        console.log("6. Query: User's travel plans retrieved, includes the principle plan.");

        console.log("Principle Trace completed successfully: An estimate was provided based on user's choices and LLM data.");
    });


    await client.close();
});

```
