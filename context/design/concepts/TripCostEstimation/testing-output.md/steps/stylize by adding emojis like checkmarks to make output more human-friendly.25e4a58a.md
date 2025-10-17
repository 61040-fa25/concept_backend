---
timestamp: 'Thu Oct 16 2025 13:43:55 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_134355.dd32391b.md]]'
content_id: 25e4a58aa6875e32dca72f93c5c9e0d637eb9371288fe4ccb372f134053c2b81
---

# stylize by adding emojis like checkmarks to make output more human-friendly: running 1 test from ./src/concepts/TripCostEstimation/TripCostEstimationConcept.test.ts

TripCostEstimationConcept: createTravelPlan - Successful creation ...
\------- output -------
\--- Test: createTravelPlan - Successful creation ---
Action: Created travel plan with ID: 0199ee1d-cc2b-7aee-ad49-38ed98f9e829
\----- output end -----
TripCostEstimationConcept: createTravelPlan - Successful creation ... FAILED (2s)

ERRORS

TripCostEstimationConcept: createTravelPlan - Successful creation => ./src/concepts/TripCostEstimation/TripCostEstimationConcept.test.ts:69:6
error: TypeError: Cannot use 'in' operator to search for 'error' in 0199ee1d-cc2b-7aee-ad49-38ed98f9e829
if (Array.isArray(allPlans) && allPlans.some(p => 'error' in p)) {
^
at file:///C:/Users/betwo/6.104/piggy\_bankApp/src/concepts/TripCostEstimation/TripCostEstimationConcept.test.ts:94:55
at Array.some (<anonymous>)
at file:///C:/Users/betwo/6.104/piggy\_bankApp/src/concepts/TripCostEstimation/TripCostEstimationConcept.test.ts:94:45

FAILURES

TripCostEstimationConcept: createTravelPlan - Successful creation => ./src/concepts/TripCostEstimation/TripCostEstimationConcept.test.ts:69:6

FAILED | 0 passed | 1 failed (2s)

error: Test failed
