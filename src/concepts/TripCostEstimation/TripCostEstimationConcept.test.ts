import {
  assertEquals,
  assertNotEquals,
  assertObjectMatch,
} from "jsr:@std/assert"; // Added assertNotEquals
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

// Minimal internal types for safe introspection of concept's collections in tests
type TravelPlansCollectionLite = {
  findOne(
    filter: Record<string, unknown>,
  ): Promise<{ latestCostEstimateID?: ID | null } | null>;
};

// Helper function to setup the test environment (DB, concept, base data)
async function setupTestEnvironment() {
  const [db, client] = await testDb();
  const concept = new TripCostEstimationConcept(db);

  const userAlice = "user:Alice" as User;
  const locationNYC = freshID() as Location;
  const locationLA = freshID() as Location;
  const locationCHI = freshID() as Location; // Additional location for variety

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
  const { client, concept, userAlice, locationNYC, locationLA } =
    await setupTestEnvironment();

  try {
    const fromDateP = new Date();
    fromDateP.setDate(fromDateP.getDate() + 60); // 2 months from now
    const toDateP = new Date();
    toDateP.setDate(toDateP.getDate() + 67); // 7 nights later, making it an 8-day trip (7 nights)

    console.log("1. Action: createTravelPlan (London to Paris)");
    const createPlanResult = await concept.createTravelPlan({
      user: userAlice,
      fromCity: locationNYC, // Using NYC as proxy for London from setup
      toCity: locationLA, // Using LA as proxy for Paris from setup
      fromDate: fromDateP,
      toDate: toDateP,
    });
    if ("error" in createPlanResult) {
      throw new Error(
        `Principle Trace failed to create travel plan: ${createPlanResult.error}`,
      );
    }
    const principleTravelPlanId = createPlanResult.travelPlan;
    console.log(`   -> Created travel plan ID: ${principleTravelPlanId}.`);
    let allPlans = await concept._getAllTravelPlans({ user: userAlice });
    if (
      Array.isArray(allPlans) && allPlans.length > 0 &&
      typeof allPlans[0] === "object" && allPlans[0] !== null &&
      "error" in allPlans[0]
    ) {
      throw new Error(
        `Query failed: ${(allPlans[0] as { error: string }).error}`,
      );
    }
    assertEquals(
      (allPlans as ID[]).includes(principleTravelPlanId),
      true,
      "Verification: Travel plan ID is listed after creation.",
    );

    console.log(
      "2. Action: updateNecessity (Accommodation to false, Dining to true)",
    );
    const updateNecessityResult = await concept.updateNecessity({
      user: userAlice,
      travelPlan: principleTravelPlanId,
      accommodation: false, // User prefers to stay with friends/family
      diningFlag: true, // But still wants to eat out
    });
    if ("error" in updateNecessityResult) {
      throw new Error(
        `Principle Trace failed to update necessity: ${updateNecessityResult.error}`,
      );
    }
    console.log(`   -> Updated necessity for plan ${principleTravelPlanId}.`);

    console.log("3. Action: generateAICostEstimate (Live LLM Call)");
    const generateEstimateResult = await concept.generateAICostEstimate({
      user: userAlice,
      travelPlan: principleTravelPlanId,
    });
    if ("error" in generateEstimateResult) {
      throw new Error(
        `Principle Trace failed to generate estimate: ${generateEstimateResult.error}`,
      );
    }
    console.log(
      `   -> Generated AI cost estimate for plan ${principleTravelPlanId}.`,
    );
    // NOTE: Exact cost values are non-deterministic with live LLM, so only successful generation is asserted.

    console.log("4. Action: estimateCost");
    const estimateCostResult = await concept.estimateCost({
      user: userAlice,
      travelPlan: principleTravelPlanId,
    });
    if ("error" in estimateCostResult) {
      throw new Error(
        `Principle Trace failed to get total cost: ${estimateCostResult.error}`,
      );
    }
    assertEquals(
      typeof estimateCostResult.totalCost,
      "number",
      "Verification: Total estimated cost should be a number.",
    );
    assertEquals(
      estimateCostResult.totalCost > 0,
      true,
      "Verification: Total estimated cost should be greater than 0.",
    );
    console.log(
      `   -> Calculated total cost: ${estimateCostResult.totalCost}.`,
    );

    console.log("5. Action: deleteTravelPlan");
    const deleteResult = await concept.deleteTravelPlan({
      user: userAlice,
      travelPlan: principleTravelPlanId,
    });
    if ("error" in deleteResult) {
      throw new Error(
        `Principle Trace failed to delete travel plan: ${deleteResult.error}`,
      );
    }
    console.log(`   -> Deleted travel plan ${principleTravelPlanId}.`);
    allPlans = await concept._getAllTravelPlans({ user: userAlice });
    if (Array.isArray(allPlans) && allPlans.some((p) => "error" in p)) {
      throw new Error(
        `Query failed: ${(allPlans[0] as { error: string }).error}`,
      );
    }
    assertEquals(
      (allPlans as ID[]).includes(principleTravelPlanId),
      false,
      "Verification: Deleted travel plan ID is no longer listed.",
    );

    console.log("Principle Trace completed successfully.");
  } finally {
    await client.close();
  }
});

// --- Test 2: Interesting Case - Multiple Travel Plans and Query Verification ---
Deno.test("TripCostEstimationConcept: Interesting Case - Multiple Travel Plans and Query Verification", async () => {
  console.log("\n--- Test: Multiple Travel Plans and Query Verification ---");
  const { client, concept, userAlice, locationNYC, locationLA, locationCHI } =
    await setupTestEnvironment();

  try {
    const fromDate1 = new Date();
    fromDate1.setDate(fromDate1.getDate() + 10);
    const toDate1 = new Date();
    toDate1.setDate(toDate1.getDate() + 15);
    const createResult1 = await concept.createTravelPlan({
      user: userAlice,
      fromCity: locationNYC,
      toCity: locationLA,
      fromDate: fromDate1,
      toDate: toDate1,
    });
    if ("error" in createResult1) {
      throw new Error(`Test failed: ${createResult1.error}`);
    }
    const travelPlanId1 = createResult1.travelPlan;
    console.log(`1. Action: Created first travel plan ID: ${travelPlanId1}.`);

    const fromDate2 = new Date();
    fromDate2.setDate(fromDate2.getDate() + 20);
    const toDate2 = new Date();
    toDate2.setDate(toDate2.getDate() + 25);
    const createResult2 = await concept.createTravelPlan({
      user: userAlice,
      fromCity: locationLA,
      toCity: locationCHI,
      fromDate: fromDate2,
      toDate: toDate2,
    });
    if ("error" in createResult2) {
      throw new Error(`Test failed: ${createResult2.error}`);
    }
    const travelPlanId2 = createResult2.travelPlan;
    console.log(`2. Action: Created second travel plan ID: ${travelPlanId2}.`);

    console.log(`3. Query: _getAllTravelPlans for user ${userAlice}.`);
    let allPlansResult = await concept._getAllTravelPlans({ user: userAlice });
    if (
      Array.isArray(allPlansResult) && allPlansResult.length > 0 &&
      typeof allPlansResult[0] === "object" && allPlansResult[0] !== null &&
      "error" in allPlansResult[0]
    ) {
      throw new Error(
        `Query failed: ${(allPlansResult[0] as { error: string }).error}`,
      );
    }
    const allPlans = allPlansResult as ID[];

    assertEquals(
      allPlans.length,
      2,
      "Verification: Should return 2 travel plan IDs.",
    );
    assertEquals(
      allPlans.includes(travelPlanId1),
      true,
      `Verification: Should include first plan ID ${travelPlanId1}.`,
    );
    assertEquals(
      allPlans.includes(travelPlanId2),
      true,
      `Verification: Should include second plan ID ${travelPlanId2}.`,
    );
    console.log(`   -> Retrieved plans: ${JSON.stringify(allPlans)}`);
  } finally {
    await client.close();
  }
});

// --- Test 3: Interesting Case - Zero-day Trip / Same fromDate and toDate Calculation ---
// WILL FIX THIS BY ADDING ASSERTING ESTIMATE FUNC RETURNS ERROR
// Deno.test("TripCostEstimationConcept: Interesting Case - Zero-day Trip Calculation", async () => {
//     console.log("\n--- Test: Zero-day Trip Calculation ---");
//     const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

//     try {
//         const tripDate = new Date();
//         tripDate.setDate(tripDate.getDate() + 10); // A future date for a single-day trip

//         console.log(`1. Action: createTravelPlan for a zero-night/one-day trip (${tripDate.toISOString()} to ${tripDate.toISOString()}).`);
//         const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate: tripDate, toDate: tripDate });
//         if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
//         const travelPlanId = createResult.travelPlan;

//         console.log("2. Action: generateAICostEstimate (Live LLM Call) for the zero-day trip.");
//         const llm = new GeminiLLM();
//         const generateEstimateResult = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: llm });
//         if ("error" in generateEstimateResult) throw new Error(`Test failed: ${generateEstimateResult.error}`);

//         console.log("3. Action: estimateCost for the zero-day trip.");
//         const estimateCostResult = await concept.estimateCost({ user: userAlice, travelPlan: travelPlanId });
//         if ("error" in estimateCostResult) throw new Error(`Test failed: ${estimateCostResult.error}`);

//         assertEquals(typeof estimateCostResult.totalCost, 'number', "Verification: Total cost should be a number.");
//         assertEquals(estimateCostResult.totalCost > 0, true, "Verification: Total cost should be greater than 0 (includes flight + at least one day of food/rooms if applicable).");
//         console.log(`   -> Calculated total cost for zero-day trip: ${estimateCostResult.totalCost}.`);

//     } finally {
//         await client.close();
//     }
// });

//--- Test 4: Interesting Case - Sequential Estimates for Same Plan (Many-to-One: Latest update) ---
Deno.test("TripCostEstimationConcept: Interesting Case - Sequential Estimates for Same Plan", async () => {
  console.log(
    "\n--- Test: Sequential Estimates for Same Plan (Many-to-One: Latest Update) ---",
  );
  const { client, concept, userAlice, locationNYC, locationLA } =
    await setupTestEnvironment();

  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({
      user: userAlice,
      fromCity: locationNYC,
      toCity: locationLA,
      fromDate,
      toDate,
    });
    if ("error" in createResult) {
      throw new Error(`Setup failed: ${createResult.error}`);
    }
    const travelPlanId = createResult.travelPlan;
    console.log(`1. Action: Created travel plan ID: ${travelPlanId}.`);

    // Generate first estimate
    console.log("2. Action: Generate first AI cost estimate (Live LLM Call).");
    const generateEstimateResult1 = await concept.generateAICostEstimate({
      user: userAlice,
      travelPlan: travelPlanId,
    });
    if ("error" in generateEstimateResult1) {
      throw new Error(`Test failed: ${generateEstimateResult1.error}`);
    }
    const costEstimateId1 = generateEstimateResult1.costEstimate;
    console.log(`   -> Generated first cost estimate ID: ${costEstimateId1}.`);

    // Verify the travel plan now points to this estimate
    const travelPlansCol =
      (concept as unknown as { travelPlans: TravelPlansCollectionLite })
        .travelPlans;
    let travelPlanDoc = await travelPlansCol.findOne({ _id: travelPlanId });
    assertEquals(
      travelPlanDoc?.latestCostEstimateID,
      costEstimateId1,
      "Verification: Travel plan's latestCostEstimateID should be the first estimate.",
    );

    // Generate a second estimate for the *same* travel plan
    console.log(
      "3. Action: Generate second AI cost estimate (Live LLM Call) for the same plan.",
    );
    const generateEstimateResult2 = await concept.generateAICostEstimate({
      user: userAlice,
      travelPlan: travelPlanId,
    });
    if ("error" in generateEstimateResult2) {
      throw new Error(`Test failed: ${generateEstimateResult2.error}`);
    }
    const costEstimateId2 = generateEstimateResult2.costEstimate;
    console.log(`   -> Generated second cost estimate ID: ${costEstimateId2}.`);

    // Verify that a new estimate ID was created and it's different from the first one
    assertNotEquals(
      costEstimateId1,
      costEstimateId2,
      "Verification: A new cost estimate ID should be generated.",
    );

    // Verify the travel plan now points to the *second* estimate
    travelPlanDoc = await travelPlansCol.findOne({ _id: travelPlanId });
    assertEquals(
      travelPlanDoc?.latestCostEstimateID,
      costEstimateId2,
      "Verification: Travel plan's latestCostEstimateID should be the second (newest) estimate.",
    );

    // Verify that both old and new cost estimates still exist in the collection
    // (many-to-one relationship, not replacing in the collection itself)
    const totalEstimatesForPlan = await (concept as any)["costEstimates"]
      .countDocuments({ travelPlanID: travelPlanId });
    assertEquals(
      totalEstimatesForPlan,
      2,
      "Verification: Two cost estimates should exist in the collection for this travel plan.",
    );
  } finally {
    await client.close();
  }
});

// --- Test 5: Interesting Case - `_getAllTravelPlans` Query Edge Cases ---
Deno.test("TripCostEstimationConcept: Interesting Case - `_getAllTravelPlans` Query Edge Cases", async () => {
  console.log("\n--- Test: `_getAllTravelPlans` Query Edge Cases ---");
  const { client, concept } = await setupTestEnvironment(); // setupTestEnvironment pre-creates userAlice

  try {
    // Test 1: User with no plans
    const userNoPlans = "user:Charlie" as User;
    await (concept as any)["users"].updateOne(
      { _id: userNoPlans },
      { $setOnInsert: { _id: userNoPlans } },
      { upsert: true },
    );
    console.log(
      `1. Action: Querying plans for user ${userNoPlans} (no plans).`,
    );
    let allPlansResult1 = await concept._getAllTravelPlans({
      user: userNoPlans,
    });
    if (
      Array.isArray(allPlansResult1) && allPlansResult1.length > 0 &&
      typeof allPlansResult1[0] === "object" && allPlansResult1[0] !== null &&
      "error" in allPlansResult1[0]
    ) {
      throw new Error(
        `Query failed: ${(allPlansResult1[0] as { error: string }).error}`,
      );
    }
    const allPlans1 = allPlansResult1 as ID[];
    assertEquals(
      allPlans1.length,
      0,
      "Effect: Should return an empty array for a user with no plans.",
    );
    console.log(
      `   -> Verification: Plans for ${userNoPlans}: ${
        JSON.stringify(allPlans1)
      }`,
    );

    // Test 2: Non-existent user
    const nonExistentUser = "user:NonExistent" as User;
    console.log(
      `2. Action: Querying plans for non-existent user ${nonExistentUser}.`,
    );
    const result = await concept._getAllTravelPlans({ user: nonExistentUser });
    if (
      !Array.isArray(result) || result.length === 0 || !("error" in result[0])
    ) {
      throw new Error(
        `Test failed: _getAllTravelPlans did not return expected error for non-existent user: ${
          JSON.stringify(result)
        }`,
      );
    }
    assertObjectMatch(result[0], {
      error: `User with ID ${nonExistentUser} does not exist.`,
    }, "Requirement: Should return error for non-existent user.");
    console.log(`   -> Requirement Confirmed: ${result[0].error}`);
  } finally {
    await client.close();
  }
});

// --- Test 6: New Actions - getTravelCities and getTravelDates ---
Deno.test("TripCostEstimationConcept: New Actions - getTravelCities and getTravelDates", async () => {
  console.log(
    "\n--- Test: New Actions - getTravelCities and getTravelDates ---",
  );
  const { client, concept, userAlice, locationNYC, locationLA } =
    await setupTestEnvironment();

  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + 5);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 9);

    const createResult = await concept.createTravelPlan({
      user: userAlice,
      fromCity: locationNYC,
      toCity: locationLA,
      fromDate,
      toDate,
    });
    if ("error" in createResult) {
      throw new Error(`Setup failed: ${createResult.error}`);
    }
    const travelPlanId = createResult.travelPlan;

    const cities = await concept.getTravelCities({
      user: userAlice,
      travelPlan: travelPlanId,
    });
    if ("error" in cities) {
      throw new Error(`getTravelCities failed: ${cities.error}`);
    }
    assertEquals(
      cities.fromCity,
      locationNYC,
      "fromCity should match created plan",
    );
    assertEquals(cities.toCity, locationLA, "toCity should match created plan");

    const dates = await concept.getTravelDates({
      user: userAlice,
      travelPlan: travelPlanId,
    });
    if ("error" in dates) {
      throw new Error(`getTravelDates failed: ${dates.error}`);
    }
    assertEquals(
      new Date(dates.fromDate).toISOString(),
      fromDate.toISOString(),
      "fromDate should match created plan",
    );
    assertEquals(
      new Date(dates.toDate).toISOString(),
      toDate.toISOString(),
      "toDate should match created plan",
    );
  } finally {
    await client.close();
  }
});

// --- Test 7: New Actions - editEstimateCost and deleteEstimateCost with Latest pointer updates ---
Deno.test("TripCostEstimationConcept: New Actions - edit/delete EstimateCost and Latest pointer", async () => {
  console.log(
    "\n--- Test: New Actions - edit/delete EstimateCost and Latest pointer ---",
  );
  const { client, concept, userAlice, locationNYC, locationLA } =
    await setupTestEnvironment();

  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + 3);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 8);
    const createResult = await concept.createTravelPlan({
      user: userAlice,
      fromCity: locationNYC,
      toCity: locationLA,
      fromDate,
      toDate,
    });
    if ("error" in createResult) {
      throw new Error(`Setup failed: ${createResult.error}`);
    }
    const travelPlanId = createResult.travelPlan;

    // First manual estimate
    const edit1 = await concept.editEstimateCost({
      user: userAlice,
      travelPlan: travelPlanId,
      flight: 400,
      roomsPerNight: 120,
      foodDaily: 50,
    });
    if ("error" in edit1) {
      throw new Error(`editEstimateCost failed: ${edit1.error}`);
    }
    const costEstimateId1 = edit1.costEstimate;

    let travelPlanDoc = await (concept as any)["travelPlans"].findOne({
      _id: travelPlanId,
    });
    assertEquals(
      travelPlanDoc?.latestCostEstimateID,
      costEstimateId1,
      "latest should point to first manual estimate",
    );

    // Verify estimateCost math
    const millisPerDay = 1000 * 60 * 60 * 24;
    const rawDays = Math.ceil(
      (toDate.getTime() - fromDate.getTime()) / millisPerDay,
    );
    const numDays = Math.max(1, rawDays);
    const expectedTotal1 = 400 + (120 * numDays) + (50 * numDays);
    const total1 = await concept.estimateCost({
      user: userAlice,
      travelPlan: travelPlanId,
    });
    if ("error" in total1) {
      throw new Error(`estimateCost failed: ${total1.error}`);
    }
    assertEquals(
      total1.totalCost,
      expectedTotal1,
      "estimateCost should use latest estimate and correct duration math",
    );

    // Second manual estimate (different values)
    const edit2 = await concept.editEstimateCost({
      user: userAlice,
      travelPlan: travelPlanId,
      flight: 500,
      roomsPerNight: 100,
      foodDaily: 40,
    });
    if ("error" in edit2) {
      throw new Error(`editEstimateCost (2) failed: ${edit2.error}`);
    }
    const costEstimateId2 = edit2.costEstimate;
    assertNotEquals(
      costEstimateId1,
      costEstimateId2,
      "new manual estimate should create a new ID",
    );

    travelPlanDoc = await (concept as any)["travelPlans"].findOne({
      _id: travelPlanId,
    });
    assertEquals(
      travelPlanDoc?.latestCostEstimateID,
      costEstimateId2,
      "latest should update to second manual estimate",
    );

    // Delete the latest estimate -> latest should fall back to previous one
    const del2 = await concept.deleteEstimateCost({
      user: userAlice,
      costEstimate: costEstimateId2,
    });
    if ("error" in del2) {
      throw new Error(`deleteEstimateCost failed: ${del2.error}`);
    }
    travelPlanDoc = await (concept as any)["travelPlans"].findOne({
      _id: travelPlanId,
    });
    assertEquals(
      travelPlanDoc?.latestCostEstimateID,
      costEstimateId1,
      "latest should fall back to first estimate after deleting second",
    );

    // Delete the last remaining estimate -> latest should be null
    const del1 = await concept.deleteEstimateCost({
      user: userAlice,
      costEstimate: costEstimateId1,
    });
    if ("error" in del1) {
      throw new Error(`deleteEstimateCost (2) failed: ${del1.error}`);
    }
    travelPlanDoc = await (concept as any)["travelPlans"].findOne({
      _id: travelPlanId,
    });
    assertEquals(
      travelPlanDoc?.latestCostEstimateID,
      null,
      "latest should be null when no estimates remain",
    );
  } finally {
    await client.close();
  }
});
