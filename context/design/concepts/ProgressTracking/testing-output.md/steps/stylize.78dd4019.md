---
timestamp: 'Thu Oct 16 2025 11:06:10 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_110610.d6f9dbde.md]]'
content_id: 78dd40199980df37686666d14f3e634b5584a538ceb166aec631e2d5aa290f71
---

# stylize: running 6 tests from ./src/concepts/ProgressTracking/ProgressTrackingConcept.test.ts

ProgressTrackingConcept: Principle Test - Full Lifecycle ...
\------- output -------

\--- 🚀 Principle Test: Create, Add, Modify, Reach Goal, Remove, Delete ---
Principle: A plan breaks a trip’s cost into manageable contributions, the user sets a payment period and the amount to be paid every period. The user can also change those details for some trip.

Action: createPlan (user: 0199ed8d, trip: 0199ed8d, period: 12, amountPer: 100, goal: 1200)
Effect: ✅ New plan created with ID: 0199ed8d, with initial period 12, amount 100
Query: ✅ updateGoalStatus -> Verified initial goalReachedFlag: false

Action: addAmount (user: 0199ed8d, plan: 0199ed8d, amount: 300)
Effect: ✅ Amount $300 added to plan, new currentAmount: 300
Query: ✅ updateGoalStatus -> Verified goalReachedFlag is false.

Action: modifyPlan (user: 0199ed8d, plan: 0199ed8d, newPeriod: 6, newAmountPer: 200)
Effect: ✅ Plan payment details changed. (Cannot query paymentPeriod/amountPerPeriod directly via \_getPlans, as it only returns IDs).

Action: addAmount (user: 0199ed8d, plan: 0199ed8d, amount: 900)
Effect: ✅ Added $900 to reach goal, new currentAmount: 1200
Query: 🎉 updateGoalStatus -> Verified goalReachedFlag is true.

Action: removeAmount (user: 0199ed8d, plan: 0199ed8d, amount: 50)
Effect: ✅ Amount $50 removed from plan, new currentAmount: 1150
Query: ✅ updateGoalStatus -> Verified goalReachedFlag is false after falling below goal.

Action: deletePlan (user: 0199ed8d, plan: 0199ed8d)
Effect: ✅ Plan deleted
Query: ✅ \_getPlans -> User's plans after deletion: \[]
\--- 🎉 Principle Test Completed Successfully ---
\----- output end -----
ProgressTrackingConcept: Principle Test - Full Lifecycle ... ok (1s)
ProgressTrackingConcept: Interesting Case 1 - Multiple Plans & User Isolation ...
\------- output -------

\--- 🔍 Interesting Case 1: Multiple Plans & User Isolation ---

Action: createPlan for user 0199ed8d, trip 0199ed8d
Effect: ✅ Plan 1 ID: 0199ed8d
Action: createPlan for user 0199ed8d, trip 0199ed8d
Effect: ✅ Plan 2 ID: 0199ed8d
Action: createPlan for user 0199ed8d, trip 0199ed8d
Effect: ✅ Plan 3 ID: 0199ed8d

Query: \_getPlans for user 0199ed8d
Effect: ✅ User 0199ed8d correctly has 2 plans.

Query: \_getPlans for user 0199ed8d
Effect: ✅ User 0199ed8d correctly has 1 plan.
Effect: ✅ User 0199ed8d cannot see User 0199ed8d's plan. (Verified P3 not in UserA's plans)

\--- 🎉 Interesting Case 1 Completed ---
\----- output end -----
ProgressTrackingConcept: Interesting Case 1 - Multiple Plans & User Isolation ... ok (1s)
ProgressTrackingConcept: Interesting Case 2 - Add/Remove Amount Edge Cases ...
\------- output -------

\--- 🔍 Interesting Case 2: Add/Remove Amount Edge Cases ---
Setup: Created plan 0199ed8d for user 0199ed8d with goal 1000, current 0.

Action: addAmount (amount: 0)
Effect: ✅ Adding 0 amount, currentAmount=0, goalReachedFlag=false

Action: addAmount (amount: 1000) to reach goal
Effect: ✅ Adding exact goal amount, currentAmount=1000, goalReachedFlag=true

Action: removeAmount (amount: 0)
Effect: ✅ Removing 0 amount, currentAmount=1000, goalReachedFlag=true

Action: removeAmount (amount: 1000) to reach 0
Effect: ✅ Removing all amount, currentAmount=0, goalReachedFlag=false

Action: removeAmount (amount: 1) from 0 currentAmount
Requirement: ✅ Failed to remove amount exceeding current amount as expected: {"error":"Amount to remove exceeds current amount."}

\--- 🎉 Interesting Case 2 Completed ---
\----- output end -----
ProgressTrackingConcept: Interesting Case 2 - Add/Remove Amount Edge Cases ... ok (2s)
ProgressTrackingConcept: Interesting Case 3 - Automatic & Manual Goal Status Update ...
\------- output -------

\--- 🔍 Interesting Case 3: Automatic & Manual Goal Status Update ---
Setup: Created plan 0199ed8d for user 0199ed8d with goal 500, current 0.

Action: addAmount (amount: 400)
Effect: ✅ currentAmount=400, goalReachedFlag=false (auto updated via addAmount)

Action: addAmount (amount: 100)
Effect: 🎉 currentAmount=500, goalReachedFlag=true (auto updated via addAmount)

Action: removeAmount (amount: 50)
Effect: ✅ currentAmount=450, goalReachedFlag=false (auto updated via removeAmount)

Action: updateGoalStatus (current amount is 450, goal is 500)
Effect: ✅ goalReachedFlag=false (manual update, no state change, returns current status)

Action: addAmount (amount: 100)
Effect: 🎉 currentAmount=550, goalReachedFlag=true (auto updated via addAmount)

\--- 🎉 Interesting Case 3 Completed ---
\----- output end -----
ProgressTrackingConcept: Interesting Case 3 - Automatic & Manual Goal Status Update ... ok (1s)
ProgressTrackingConcept: Interesting Case 4 - Invalid Input & Unauthorized Access ...
\------- output -------

\--- 🚫 Interesting Case 4: Invalid Input & Unauthorized Access ---
Setup: Created plan 0199ed8d for user 0199ed8d.

Action: createPlan with negative paymentPeriod
Requirement: ✅ createPlan failed with negative paymentPeriod as expected: {"error":"paymentPeriod must be non-negative."}

Action: modifyPlan by 0199ed8d for 0199ed8d's plan 0199ed8d
Requirement: ✅ modifyPlan by unauthorized user failed as expected: {"error":"Plan not found or does not belong to the user."}

Action: addAmount to non-existent plan
Requirement: ✅ addAmount to non-existent plan failed as expected: {"error":"Plan not found or does not belong to the user."}

Action: deletePlan by 0199ed8d for 0199ed8d's plan 0199ed8d
Requirement: ✅ deletePlan by unauthorized user failed as expected: {"error":"Plan not found or does not belong to the user."}
Effect: ✅ User's plan 0199ed8d still exists after unauthorized attempts.

\--- 🎉 Interesting Case 4 Completed ---
\----- output end -----
ProgressTrackingConcept: Interesting Case 4 - Invalid Input & Unauthorized Access ... ok (782ms)
ProgressTrackingConcept: Interesting Case 5 - Querying for Non-existent Users ...
\------- output -------

\--- 🔍 Interesting Case 5: Querying for Non-existent Users ---

Query: \_getPlans for non-existent user 0199ed8d
Effect: ✅ Querying for a non-existent user returns an empty array as expected: \[]
Setup: Created plan 0199ed8d for user 0199ed8d.

Query: \_getPlans again for non-existent user 0199ed8d
Effect: ✅ Querying for a non-existent user still returns an empty array: \[]
Effect: ✅ Actual user 0199ed8d's plan is still present.

\--- 🎉 Interesting Case 5 Completed ---
\----- output end -----
ProgressTrackingConcept: Interesting Case 5 - Querying for Non-existent Users ... ok (703ms)

✅ ok | 6 passed | 0 failed (7s)
