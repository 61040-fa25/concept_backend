---
timestamp: 'Tue Oct 21 2025 19:10:11 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_191011.97bdd6e4.md]]'
content_id: cef358381bfd28c71fc17770166d8af926605a8d89cf6577b1e13ae7a7ce521f
---

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

### POST /api/TripCostEstimation/\_getAllTravelPlans

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
