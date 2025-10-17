---
timestamp: 'Fri Oct 17 2025 17:42:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_174217.5c7139a0.md]]'
content_id: 79f0461734569a5a5150f349fd1bf0911a490dd5288e03d197cd160c5d2013f3
---

# same error: Deno.test("TripCostEstimationConcept: Operational Principle Trace", async () => {

    console.log("\n--- Test: Operational Principle Trace ---");

    const {client, concept, userAlice, locationNYC, locationLA} = await setupTestEnvironment();

    try {

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

        console.log(`   Created travel plan ID: ${principleTravelPlanId}.`);

        let allPlans = await concept.\_getAllTravelPlans({ user: userAlice });

        // Corrected error check for \_getAllTravelPlans

        if (Array.isArray(allPlans) && allPlans.length > 0 && typeof allPlans\[0] === 'object' && 'error' in allPlans\[0]) {

            throw new Error(`Query failed: ${(allPlans[0] as {error: string}).error}`);

        }

        assertEquals((allPlans as ID\[]).includes(principleTravelPlanId), true, "Verification: Travel plan ID is listed after creation.");

        console.log("2. Action: updateNecessity");

        const updateNecessityResult = await concept.updateNecessity({

            user: userAlice,

            travelPlan: principleTravelPlanId,

            accommodation: false, // User prefers to stay with friends/family

            diningFlag: true,     // But still wants to eat out

        });

        if ("error" in updateNecessityResult) throw new Error(`Principle Trace failed to update necessity: ${updateNecessityResult.error}`);

        console.log(`   Updated necessity for plan ${principleTravelPlanId}.`);

        console.log("3. Action: generateAICostEstimate (Live LLM Call)");

        const llm = new GeminiLLM();

        const generateEstimateResult = await concept.generateAICostEstimate({

            user: userAlice,

            travelPlan: principleTravelPlanId,

            llm: llm,

        });

        if ("error" in generateEstimateResult) throw new Error(`Principle Trace failed to generate estimate: ${generateEstimateResult.error}`);

        console.log(`   Generated AI cost estimate for plan ${principleTravelPlanId}.`);

        console.log("4. Action: estimateCost");

        const estimateCostResult = await concept.estimateCost({ user: userAlice, travelPlan: principleTravelPlanId });

        if ("error" in estimateCostResult) throw new Error(`Principle Trace failed to get total cost: ${estimateCostResult.error}`);

        assertEquals(typeof estimateCostResult.totalCost, 'number', "Verification: Total estimated cost should be a number.");

        assertEquals(estimateCostResult.totalCost > 0, true, "Verification: Total estimated cost should be greater than 0.");

        console.log(`   Calculated total cost: ${estimateCostResult.totalCost}.`);

        console.log("5. Action: deleteTravelPlan");

        const deleteResult = await concept.deleteTravelPlan({

            user: userAlice,

            travelPlan: principleTravelPlanId,

        });

        if ("error" in deleteResult) throw new Error(`Principle Trace failed to delete travel plan: ${deleteResult.error}`);

        console.log(`   Deleted travel plan ${principleTravelPlanId}.`);

        allPlans = await concept.\_getAllTravelPlans({ user: userAlice });

        // Corrected error check for \_getAllTravelPlans

        if (Array.isArray(allPlans) && allPlans.length > 0 && typeof allPlans\[0] === 'object' && 'error' in allPlans\[0]) {

            throw new Error(`Query failed: ${(allPlans[0] as {error: string}).error}`);

        }

        assertEquals((allPlans as ID\[]).includes(principleTravelPlanId), false, "Verification: Deleted travel plan ID is no longer listed.");

        console.log("Principle Trace completed successfully.");

    }

    finally {

        await client.close();

    }

});
