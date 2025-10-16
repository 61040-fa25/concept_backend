---
timestamp: 'Wed Oct 15 2025 22:28:56 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_222856.3581b877.md]]'
content_id: 11ed08e5002f2850776fe0b628930336235a7171df3ae9fd43103fb51498c6ed
---

# question: got the following comment Comment: Is goalAmount in ProgressTracking dependent on paymentPeriod and amountPerPeriod? If so, it should be a part of your requires clause to enforce the relationship between them. My idea behind goalAmount and paymentPeriod is that they're essentially independent of each other, goalAmount is the amount paid each paymentPeriod. what do you think? Reference the below concept to inform your response

### concept ProgressTracking \[TripCostEstimation, User]

* **purpose** create and track savings plans for discretionary vacation goals
* **principle** a plan breaks a trip’s cost into manageable contributions, the user sets a payment period and the amount to be paid every period. The user can also change those details for some trip.
* **state**
  * a set of **Users** with
    * a set of **Plans**
  * a set of **Plans** with
    * a `trip` **TripCostEstimation**
    * a `paymentPeriod` **Number**
    * a `amountPerPeriod` **Number**
    * a `goalAmount` **Number**
    * a `currentAmount` **Number**
* **actions**
  * `createPlan (user: User, trip: TripCostEstimation, paymentPeriod: Number, amountPerPeriod: Number, goalAmount: Number): (plan: Plan)`
    * **requires** amountPerPeriod is the amount that the user selects to pay every paymentPeriod month
    * **effect** makes a new plan linked to `trip` and `user`
  * `addAmount (user: User, plan: Plan, amount: Number)`
    * **requires** plan exists and belongs to user
    * **effect** increases `currentAmount` of plan by amount
  * `removeAmount (user: User, plan: Plan, amount: Number)`
    * **requires** plan exists and belongs to user and amount less than or equal to currentAmount associated with plan
    * **effect** decreses `currentAmount` by amount
  * `deletePlan (user: User, plan: Plan)`
    * **requires** `plan` exists and belongs to user
    * **effect** removes plan
  * `modifyPlan (user: User, plan: Plan, newPaymentPeriod: Number, newAmountPerPeriod: Number)`
    * **requires** plan exists and belongs to user
    * **effect** updates savings schedule associated with plan by changing the paymentPeriod to newPaymentPeriod and
    * amountPerPeriod to newAmountPerPeriod
