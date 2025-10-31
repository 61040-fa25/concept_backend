[@concept-specifications](../background/concept-specifications.md)

# Concept API extraction

You are an expert software architect tasked with generating clear, developer-friendly API documentation. Your input is a formal "Concept Specification" which describes a modular piece of software functionality. This concept has been implemented and exposed as a REST-like API by a "Concept Server."

Your mission is to translate the provided Concept Specification into a structured API specification document written in Markdown. This document will be used by frontend developers to interact with the API.

Adhere to the following rules for the API structure and the documentation format:

**API Structure Rules:**

1.  **Base URL:** Assume a base URL of `/api`.
2.  **Endpoint Naming:** Each concept action or query maps to an endpoint. The URL structure is: `/{conceptName}/{actionOrQueryName}`.
    *   For a concept named `Labeling` and an action `createLabel`, the endpoint is `/api/Labeling/createLabel`.
3.  **HTTP Method:** All endpoints use the `POST` method.
4.  **Data Format:** All requests and responses use the `application/json` content type.
5.  **Request Body:** The request body is always a single JSON object. The keys of this object correspond to the input arguments defined in the action's signature.
6.  **Response Body:**
    *   **Actions:** A successful call to an action returns a single JSON object. The keys correspond to the results defined in the action's signature. If there are no results, an empty object `{}` is returned.
    *   **Queries:** A successful call to a query (a method name starting with `_`) returns a JSON **array** of objects.
    *   **Errors:** If an action fails to meet its `requires` condition or encounters another error, it returns a single JSON object with a single key: `{ "error": "A descriptive error message." }`.

**Documentation Format Rules:**

Generate the output in Markdown using the following template. For each action and query in the specification, create a dedicated endpoint section.

~~~markdown
# API Specification: {Concept Name} Concept

**Purpose:** {The concept's purpose.}

---

## API Endpoints

### POST /api/{conceptName}/{actionName}

**Description:** {A brief, one-sentence description of what this action does.}

**Requirements:**
- {List each point from the 'requires' section of the specification.}

**Effects:**
- {List each point from the 'effects' section of the specification.}

**Request Body:**
```json
{
  "argument1": "{type}",
  "argument2": "{type}"
}
```

**Success Response Body (Action):**
```json
{
  "result1": "{type}",
  "result2": "{type}"
}
```

**Success Response Body (Query):**
```json
[
  {
    "result1": "{type}",
    "result2": "{type}"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
*(Repeat for each action and query)*
~~~

# prompt:

Now, analyze the following Concept Specification and generate the API documentation based on these instructions:
concept PasswordAuthentication [User]

- **purpose** limit access to verified users
- **principle** a user must register with a string username and password and subsequent attempts to login is authenticated by matching the ensuring a user exists with the exact username and password
- **state**
  * a set of **Users** with
    * `username` **String**
    * `password` **String**
- **actions**
  * `register (username: String, password: String): (user: User)`
    * **requires** `username` not in **Users** and length of username  and password >= 8
    * **effect** adds username and password and associates it with User user
  * `authenticate (username: String, password: String): (user: User)`
    * **requires** username exists
    * **effect** returns the user if `password` matches the one associated with username, otherwise Error
- **queries**
  * `_getAllUsers (): (users: User[])`
    * **effects**: Returns a list of all registered users.



# response:

# API Specification: PasswordAuthentication Concept

**Purpose:** limit access to verified users

---

## API Endpoints

### POST /api/PasswordAuthentication/register

**Description:** Registers a new user with a unique username and a password.

**Requirements:**
- `username` not in **Users**
- length of username and password >= 8

**Effects:**
- adds username and password and associates it with User user

**Request Body:**
```json
{
  "username": "String",
  "password": "String"
}
```

**Success Response Body (Action):**
```json
{
  "user": "User"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/PasswordAuthentication/authenticate

**Description:** Authenticates an existing user by verifying their username and password.

**Requirements:**
- username exists

**Effects:**
- returns the user if `password` matches the one associated with username, otherwise Error

**Request Body:**
```json
{
  "username": "String",
  "password": "String"
}
```

**Success Response Body (Action):**
```json
{
  "user": "User"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/PasswordAuthentication/_getAllUsers

**Description:** Retrieves a list of all registered users.

**Requirements:**
- None specified.

**Effects:**
- Returns a list of all registered users.

**Request Body:**
```json
{}
```

**Success Response Body (Query):**
```json
[
  {
    "user": "User"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/PasswordAuthentication/_getUserUsername

**Description:** Retrieves the username associated with a specific user ID.

**Requirements:**
- user exists

**Effects:**
- Returns the username associated with the specified `user`.

**Request Body:**
```json
{
  "user": "User"
}
```

**Success Response Body (Query):**
```json
[
  {
    "username": "String"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# prompt: Now for the following concept spec, for getAllNotifications should return list of Notifications which are IDs not composite objects
### concept Notification \[User, ProgressTracking]

* **purpose** remind users to save and celebrate milestones
* **principle** for each user's savings plan, a message is sent to the user to remind them of the amount they planned to save
* **state**
  * a set of **Notification** with
    * `user` **User**
    * `progress` **ProgressTracking**
    * `frequency` **Number**
    * `message` **String**
* **actions**
  * createNotification(user: User, progress: ProgressTracking, frequency: Number, message: String): (notification: Notification)
    * **effect** create and return a notification with the above input details
  * deleteNotification(user: User, notification: Notification)
    * **requires** notification exists and belongs to user
    * **effect** deletes the notification
* **queries**
  * getAllNotifications (user: User) : (notifications:  Notification[])
    * **requires** user exists
    * **effects** returns a list of all notifications belonging to the specified user sorted by the date




# response:

# API Specification: Notification Concept

**Purpose:** remind users to save and celebrate milestones

---

## API Endpoints

### POST /api/Notification/createNotification

**Description:** Creates a new notification with the specified user, progress tracking, frequency, and message.

**Requirements:**
- None specified.

**Effects:**
- create and return a notification with the above input details

**Request Body:**
```json
{
  "user": "User",
  "progress": "ProgressTracking",
  "frequency": "Number",
  "message": "String"
}
```

**Success Response Body (Action):**
```json
{
  "notification": "Notification"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Notification/deleteNotification

**Description:** Deletes a specific notification belonging to a user.

**Requirements:**
- notification exists and belongs to user

**Effects:**
- deletes the notification

**Request Body:**
```json
{
  "user": "User",
  "notification": "Notification"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Notification/\_getAllNotifications

**Description:** Returns a list of all notifications belonging to the specified user, sorted by date.

**Requirements:**
- user exists

**Effects:**
- returns a list of all notifications belonging to the specified user sorted by the date

**Request Body:**
```json
{
  "user": "User"
}
```

**Success Response Body (Query):**
```json
[
  {
    "notification": "Notification"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

### POST /api/Notification/getNotificationMessageAndFreq

**Description:** Retrieves the message and frequency for a notification belonging to the specified user.

**Requirements:**
- notification exists and belongs to user

**Effects:**
- returns the message and frequency of the specified notification

**Request Body:**
```json
{
  "user": "User",
  "notification": "Notification"
}
```

**Success Response Body (Query):**
```json
{
  "message": "String",
  "frequency": "Number"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---

# prompt: Now for the following concept spec
# ProgressTracking [TripCostEstimation, User]

*   **purpose** create and track savings plans for discretionary vacation goals
*   **principle** a plan breaks a trip’s cost into manageable contributions, the user sets a payment period and the amount to be paid every period. The user can also change those details for some trip.
*   **state**
    *   a set of **Users** with
        *   a set of **Plans**
    *   a set of **Plans** with
        *   a `trip` **TripCostEstimation**
        *   a `paymentPeriod` **Number**
        *   a `amountPerPeriod` **Number**
        *   a `goalAmount` **Number**
        *   a `currentAmount` **Number**
        *   a `goalReachedFlag` **Boolean**
*   **actions**
    *   `createPlan (user: User, trip: TripCostEstimation, paymentPeriod: Number, amountPerPeriod: Number, goalAmount: Number): (plan: Plan, paymentPeriod: Number, amountPerPeriod: Number)`
        *   **requires** amountPerPeriod is a >= 0 amount that the user selects to pay every paymentPeriod month, and goalAmount is >= 0
        *   **effect** makes a new plan linked to `trip` and `user`. Sets `currentAmount` to `0`. Sets `goalReachedFlag` to `false` 
    *   `addAmount (user: User, plan: Plan, amount: Number): currentAmount: Number`
        *   **requires** plan exists and belongs to user
        *   **effect** increases `currentAmount` of plan by `amount` and then calls `updateGoalStatus(user, plan)`.
    *   `removeAmount (user: User, plan: Plan, amount: Number): currentAmount: number`
        *   **requires** plan exists and belongs to user and amount less than or equal to currentAmount associated with plan
        *   **effect** decreases `currentAmount` by `amount` and then calls `updateGoalStatus(user, plan)`.
    *   `deletePlan (user: User, plan: Plan)`
        *   **requires** `plan` exists and belongs to user
        *   **effect** removes plan
    *   `modifyPlan (user: User, plan: Plan, newPaymentPeriod: Number, newAmountPerPeriod: Number)`
        *   **requires** plan exists and belongs to user
        *   **effect** updates savings schedule associated with plan by changing the `paymentPeriod` to `newPaymentPeriod` and `amountPerPeriod` to `newAmountPerPeriod`.
    *   `updateGoalStatus (user: User, plan: Plan): goalReachedFlag: boolean`
        *   **requires** `plan` exists and belongs to `user`.
        *   **effect**
            *   If `plan.currentAmount >= plan.goalAmount`, sets `plan.goalReachedFlag` to `true`.
            *   Otherwise (`plan.currentAmount < plan.goalAmount`), sets `plan.goalReachedFlag` to `false`.
	*  `_getPlans(user: User): plans: Plan[]`
		*  **effect** returns an array of all existing Plans belonging to user
# response:

# API Specification: ProgressTracking Concept

**Purpose:** create and track savings plans for discretionary vacation goals

***

## API Endpoints

### POST /api/ProgressTracking/createPlan

**Description:** Creates a new savings plan for a user, linked to a specific trip.

**Requirements:**

*   amountPerPeriod is a >= 0 amount that the user selects to pay every paymentPeriod month, and goalAmount is >= 0

**Effects:**

*   makes a new plan linked to `trip` and `user`. Sets `currentAmount` to `0`. Sets `goalReachedFlag` to `false`

**Request Body:**

```json
{
  "user": "User",
  "trip": "TripCostEstimation",
  "paymentPeriod": "Number",
  "amountPerPeriod": "Number",
  "goalAmount": "Number"
}
```

**Success Response Body (Action):**

```json
{
  "plan": "Plan",
  "paymentPeriod": "Number",
  "amountPerPeriod": "Number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ProgressTracking/addAmount

**Description:** Adds a specified amount to a user's savings plan and updates the goal status.

**Requirements:**

*   plan exists and belongs to user

**Effects:**

*   increases `currentAmount` of plan by `amount` and then calls `updateGoalStatus(user, plan)`.

**Request Body:**

```json
{
  "user": "User",
  "plan": "Plan",
  "amount": "Number"
}
```

**Success Response Body (Action):**

```json
{
  "currentAmount": "Number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ProgressTracking/removeAmount

**Description:** Decreases the current amount in a savings plan and updates the goal status.

**Requirements:**

*   plan exists and belongs to user and amount less than or equal to currentAmount associated with plan

**Effects:**

*   decreases `currentAmount` by `amount` and then calls `updateGoalStatus(user, plan)`.

**Request Body:**

```json
{
  "user": "User",
  "plan": "Plan",
  "amount": "Number"
}
```

**Success Response Body (Action):**

```json
{
  "currentAmount": "Number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ProgressTracking/deletePlan

**Description:** Removes a user's specified savings plan.

**Requirements:**

*   `plan` exists and belongs to user

**Effects:**

*   removes plan

**Request Body:**

```json
{
  "user": "User",
  "plan": "Plan"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ProgressTracking/modifyPlan

**Description:** Updates the payment period and amount per period for an existing savings plan.

**Requirements:**

*   plan exists and belongs to user

**Effects:**

*   updates savings schedule associated with plan by changing the `paymentPeriod` to `newPaymentPeriod` and `amountPerPeriod` to `newAmountPerPeriod`.

**Request Body:**

```json
{
  "user": "User",
  "plan": "Plan",
  "newPaymentPeriod": "Number",
  "newAmountPerPeriod": "Number"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ProgressTracking/updateGoalStatus

**Description:** Updates the goal-reached flag for a plan based on its current and goal amounts.

**Requirements:**

*   `plan` exists and belongs to `user`.

**Effects:**

*   If `plan.currentAmount >= plan.goalAmount`, sets `plan.goalReachedFlag` to `true`.
*   Otherwise (`plan.currentAmount < plan.goalAmount`), sets `plan.goalReachedFlag` to `false`.

**Request Body:**

```json
{
  "user": "User",
  "plan": "Plan"
}
```

**Success Response Body (Action):**

```json
{
  "goalReachedFlag": "Boolean"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ProgressTracking/_getPlans

**Description:** Returns an array of all existing savings plans belonging to a user.

**Requirements:**

*   None specified.

**Effects:**

*   returns an array of all existing Plans belonging to user

**Request Body:**

```json
{
  "user": "User"
}
```

**Success Response Body (Query):**

```json
[
  {
    "plan": "Plan"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

# prompt: Now for the following concept spec
# TripCostEstimation

## Purpose

Generate realistic cost estimates based on trip details, using AI for data retrieval and calculation.

## Principle

Based on a user's choice of initial departure city and arrival city, and the user's sheltering accommodations and food location preferences, an estimate is provided; the LLM is used to search for and calculate median cost ranges based on the provided necessities.

## State

*   A set of `Users` with
    *   A set of `TravelPlans`
*   A set of `Locations` with
    *   A `city` String
*   A set of `TravelPlans` with
    *   A `fromCity` Location
    *   A `toCity` Location
    *   A `fromDate` Date
    *   A `toDate` Date
    *   A `necessity` Necessity
    *  A LatestUpdatedCostEstimate CostEstimate
*   A set of `Necessities` with
    *   An `accommodation` Boolean // true for saving for rooms, false for not
    *   A `diningFlag` Boolean // true for saving for eating out, false for not
*   A set of `CostEstimates` with
    *   A `travelPlanID` String
    *   A `flight` Number // estimated total round-trip flight cost in USD
    *   A `roomsPerNight` Number // estimated cost per night in USD
    *   A `foodDaily` Number // estimated cost per day in USD
    *   A `lastUpdated` Date // tracking when the estimate was generated

## Actions

*   `createTravelPlan(user: User, fromCity: Location, toCity: Location, fromDate: Date, toDate: Date): (travelPlan: TravelPlan)`
    *   **Requires:** `fromCity` and `toCity` exists and `toDate` >= `fromDate` and both are greater than the current date
    *   **Effect:** Create and return a `travelPlan` with a `fromCity`, `toCity`, and from and to dates, and a default necessity (`accommodation` = true, `diningFlag` = true)

*   `deleteTravelPlan(user: User, travelPlan: TravelPlan):  (travelPlan: TravelPlan)`
    *   **Requires:** `travelPlan` exists and belongs to user
    *   **Effect:** Delete the `travelPlan` and any associated `CostEstimates`

*   `updateNecessity(user: User, travelPlan: TravelPlan, accommodation: Boolean, diningFlag: Boolean): (travelPlan: TravelPlan, necessity: Necessity)`
    *   **Requires:** `travelPlan` exists and belongs to user, `accommodation` exists as one of the livingSpaces and `diningFlag` indicates whether the user plans to save for eating out (true) or not (false)
    *   **Effect:** Create and add the `necessity` with `accommodation` and `diningFlag` to `travelPlan`

*   `resetNecessity(user: User, travelPlan: TravelPlan): (necessity: Necessity)`
    *   **Requires:** `travelPlan` exists and belongs to user
    *   **Effect:** Reset the `necessity` belonging to `travelPlan` to the default as described in the action `createTravelPlan`

*   **async** `generateAICostEstimate(user: User, travelPlan: TravelPlan, llm: GeminiLLM): (costEstimate: CostEstimate)`
    *   **Requires:** `travelPlan` exists and belongs to user
    *   **Effect:** Retrieves trip details (dates, locations) and necessity preference (accommodation, dining) and uses the llm's specialized tool (e.g., Google Search/Flights/Hotels) to calculate and return the median cost estimates for flight, `rooms_per_night`, and `food_daily`; the resulting data is stored as a new `CostEstimate` associated with the `travelPlanID. Also, add the most recent CostEstimate to travelPlan` 
    *   **Note:** The LLM prompt will be specifically tailored to search for accommodation prices matching the `accommodation` Boolean (e.g., true for hotel/motel costs) and food costs based on the `diningFlag` (true for "restaurant costs," false for "no food costs"). If the LLM fails to provide an estimate for any reason or the costs are widely inaccurate (less than 50, more than 100000 for example) then the user can manually enter the total cost of the trip that they plan to save for.

*   `estimateCost (user: User, travelPlan: TravelPlan): (totalCost: Number)`
    *   **Requires:** `travelPlan` exists and belongs to user and an associated `CostEstimate` exists
    *   **Effect:** Calculates and returns the `totalCost` by multiplying the estimated daily/nightly costs by the duration and adding the flight cost.

* `_getAllTravelPlans(user: User): (travelPlans: TravelPlan[])`
	  *  **Requires:** `user` exists
	  *  **Effect:** Returns a list of all `TravelPlans` associated with the given `user`.

# response:

# API Specification: TripCostEstimation Concept

**Purpose:** Generate realistic cost estimates based on trip details, using AI for data retrieval and calculation.

***

## API Endpoints

### POST /api/TripCostEstimation/createTravelPlan

**Description:** Creates a new travel plan for a user with specified cities and dates.

**Requirements:**

* `fromCity` and `toCity` exists
* `toDate` >= `fromDate`
* both `fromDate` and `toDate` are greater than the current date

**Effects:**

* Create and return a `travelPlan` with a `fromCity`, `toCity`, and from and to dates, and a default necessity (`accommodation` = true, `diningFlag` = true)

**Request Body:**

```json
{
  "user": "User",
  "fromCity": "Location",
  "toCity": "Location",
  "fromDate": "Date",
  "toDate": "Date"
}
```

**Success Response Body (Action):**

```json
{
  "travelPlan": "TravelPlan"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/TripCostEstimation/deleteTravelPlan

**Description:** Deletes a specified travel plan and all of its associated cost estimates.

**Requirements:**

* `travelPlan` exists and belongs to user

**Effects:**

* Delete the `travelPlan` and any associated `CostEstimates`

**Request Body:**

```json
{
  "user": "User",
  "travelPlan": "TravelPlan"
}
```

**Success Response Body (Action):**

```json
{
  "travelPlan": "TravelPlan"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/TripCostEstimation/updateNecessity

**Description:** Updates the accommodation and dining preferences for a given travel plan.

**Requirements:**

* `travelPlan` exists and belongs to user
* `accommodation` exists as one of the livingSpaces
* `diningFlag` indicates whether the user plans to save for eating out (true) or not (false)

**Effects:**

* Create and add the `necessity` with `accommodation` and `diningFlag` to `travelPlan`

**Request Body:**

```json
{
  "user": "User",
  "travelPlan": "TravelPlan",
  "accommodation": "Boolean",
  "diningFlag": "Boolean"
}
```

**Success Response Body (Action):**

```json
{
  "travelPlan": "TravelPlan",
  "necessity": "Necessity"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/TripCostEstimation/resetNecessity

**Description:** Resets a travel plan's necessity preferences to their default values.

**Requirements:**

* `travelPlan` exists and belongs to user

**Effects:**

* Reset the `necessity` belonging to `travelPlan` to the default as described in the action `createTravelPlan`

**Request Body:**

```json
{
  "user": "User",
  "travelPlan": "TravelPlan"
}
```

**Success Response Body (Action):**

```json
{
  "necessity": "Necessity"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/TripCostEstimation/generateAICostEstimate

**Description:** Generates a new cost estimate for a travel plan using an AI model.

**Requirements:**

* `travelPlan` exists and belongs to user

**Effects:**

* Retrieves trip details (dates, locations) and necessity preference (accommodation, dining) and uses the llm's specialized tool (e.g., Google Search/Flights/Hotels) to calculate and return the median cost estimates for flight, `rooms_per_night`, and `food_daily`; the resulting data is stored as a new `CostEstimate` associated with the `travelPlanID`. Also, add the most recent CostEstimate to travelPlan

**Request Body:**

```json
{
  "user": "User",
  "travelPlan": "TravelPlan"
}
```

**Success Response Body (Action):**

```json
{
  "costEstimate": "CostEstimate"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/TripCostEstimation/estimateCost

**Description:** Calculates the total estimated cost for a travel plan based on its most recent cost estimate.

**Requirements:**

* `travelPlan` exists and belongs to user and an associated `CostEstimate` exists

**Effects:**

* Calculates and returns the `totalCost` by multiplying the estimated daily/nightly costs by the duration and adding the flight cost.

**Request Body:**

```json
{
  "user": "User",
  "travelPlan": "TravelPlan"
}
```

**Success Response Body (Action):**

```json
{
  "totalCost": "Number"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/TripCostEstimation/_getAllTravelPlans

**Description:** Retrieves a list of all travel plans associated with a given user.

**Requirements:**

* `user` exists

**Effects:**

* Returns a list of all `TravelPlans` associated with the given `user`.

**Request Body:**

```json
{
  "user": "User"
}
```

**Success Response Body (Query):**

```json
[
  {
    "travelPlan": "TravelPlan"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```