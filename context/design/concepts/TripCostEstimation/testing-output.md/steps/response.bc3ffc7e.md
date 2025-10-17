---
timestamp: 'Fri Oct 17 2025 17:02:20 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_170220.29d88244.md]]'
content_id: bc3ffc7e364839ec60b1fc7dac752479033845b37ed44d99a84a26dbfea18910
---

# response:

Let's stylize that test output with some human-friendly emojis!

```
🏃‍♂️ running 1 test from ./src/concepts/TripCostEstimation/TripCostEstimationConcept.test.ts
TripCostEstimationConcept: createTravelPlan - Successful creation ...
------- output -------
--- Test: createTravelPlan - Successful creation ---
Action: Created travel plan with ID: 0199ee1d-cc2b-7aee-ad49-38ed98f9e829
----- output end -----
TripCostEstimationConcept: createTravelPlan - Successful creation ... ❌ FAILED (2s)

🚨 ERRORS 🚨

TripCostEstimationConcept: createTravelPlan - Successful creation => ./src/concepts/TripCostEstimation/TripCostEstimationConcept.test.ts:69:6
error: TypeError: Cannot use 'in' operator to search for 'error' in 0199ee1d-cc2b-7aee-ad49-38ed98f9e829
    if (Array.isArray(allPlans) && allPlans.some(p => 'error' in p)) {
                                                      ^
    at file:///C:/Users/betwo/6.104/piggy_bankApp/src/concepts/TripCostEstimation/TripCostEstimationConcept.test.ts:94:55
    at Array.some (<anonymous>)
    at file:///C:/Users/betwo/6.104/piggy_bankApp/src/concepts/TripCostEstimation/TripCostEstimationConcept.test.ts:94:45

💥 FAILURES 💥

TripCostEstimationConcept: createTravelPlan - Successful creation => ./src/concepts/TripCostEstimation/TripCostEstimationConcept.test.ts:69:6

💔 FAILED | 0 passed | 1 failed (2s)

❌ error: Test failed
```
