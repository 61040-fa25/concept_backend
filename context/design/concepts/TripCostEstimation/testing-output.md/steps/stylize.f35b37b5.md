---
timestamp: 'Fri Oct 17 2025 17:11:08 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_171108.34465feb.md]]'
content_id: f35b37b56f12327220a774e8c7ebb6c7e489d92d1498243959dea74a45c299eb
---

# stylize: TripCostEstimationConcept: Operational Principle Trace ...

```
------- output -------

--- Test: Operational Principle Trace ---
1. Action: createTravelPlan
   Created travel plan ID: 0199f3f9-37fb-7370-b8f4-a93d42a34a09.
----- output end -----
TripCostEstimationConcept: Operational Principle Trace ... FAILED (936ms)

 ERRORS 

TripCostEstimationConcept: Operational Principle Trace => ./src/concepts/TripCostEstimation/TripCostEstimationConcept.test.ts:41:6
error: TypeError: Cannot use 'in' operator to search for 'error' in 0199f3f9-37fb-7370-b8f4-a93d42a34a09
    if (Array.isArray(allPlans) && allPlans.some(p => 'error' in p)) { throw new Error(`Query failed: ${(allPlans[0] as {error: string}).error}`); }
                                                      ^
    at file:///C:/Users/betwo/6.104/piggy_bankApp/src/concepts/TripCostEstimation/TripCostEstimationConcept.test.ts:62:55
    at Array.some (<anonymous>)
    at file:///C:/Users/betwo/6.104/piggy_bankApp/src/concepts/TripCostEstimation/TripCostEstimationConcept.test.ts:62:45

 FAILURES 

TripCostEstimationConcept: Operational Principle Trace => ./src/concepts/TripCostEstimation/TripCostEstimationConcept.test.ts:41:6

FAILED | 0 passed | 1 failed
```
