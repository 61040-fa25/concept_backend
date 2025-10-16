---
timestamp: 'Thu Oct 16 2025 09:46:51 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_094651.c0a9cb27.md]]'
content_id: 1add1697f4dc3a48dcc929f99e08523de71ad2c400d6e19c047f1cea3b8477b9
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
  * \`addAmount (user: User, plan: Plan, amount: Number)
    * **requires** plan exists and belongs to user
    * **effect** increases `currentAmount` of plan by amount and returns currentAmount
  * `removeAmount (user: User, plan: Plan, amount: Number)`
    * **requires** plan exists and belongs to user and amount less than or equal to currentAmount associated with plan
    * **effect** decreases `currentAmount` by amount
  * `deletePlan (user: User, plan: Plan)`
    * **requires** `plan` exists and belongs to user
    * **effect** removes plan
  * `modifyPlan (user: User, plan: Plan, newPaymentPeriod: Number, newAmountPerPeriod: Number)`
    * **requires** plan exists and belongs to user
    * **effect** updates savings schedule associated with plan by changing the paymentPeriod to newPaymentPeriod and
    * amountPerPeriod to newAmountPerPeriod
