---
timestamp: 'Wed Oct 29 2025 19:01:08 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251029_190108.2d2a3c16.md]]'
content_id: e537fe63e85bfe2ee42fce4a282a0a20165df3a6fdad11a1ed7ca36a8f785dc8
---

# API Specification: TripCostEstimation Concept

**Purpose:** Generate realistic cost estimates based on trip details, using AI for data retrieval and calculation.

***

## API Endpoints

### POST /api/TripCostEstimation/createTravelPlan

**Description:** Creates a new travel plan for a user with specified cities and dates.

**Requirements:**

* `toDate` >= `fromDate` and both are greater than the current date

**Effects:**

* Create and return a `travelPlan` with a `fromCity`, `toCity`, and from and to dates, and a default necessity (`accommodation` = true, `diningFlag` = true)

**Request Body:**

```json
{
  "user": "ID",
  "fromCity": "ID",
  "toCity": "ID",
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

**Description:** Deletes a specified travel plan and all of its associated data.

**Requirements:**

* `travelPlan` exists and belongs to user

**Effects:**

* Delete the `travelPlan` and any associated `CostEstimates`

**Request Body:**

```json
{
  "user": "ID",
  "travelPlan": "ID"
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

**Effects:**

* Update the `necessity` linked to `travelPlan` with new `accommodation` and `diningFlag` values.

**Request Body:**

```json
{
  "user": "ID",
  "travelPlan": "ID",
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
  "user": "ID",
  "travelPlan": "ID"
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

* Retrieves trip details (dates, locations) and necessity preference (accommodation, dining) and uses the llm's specialized tool (e.g., Google Search/Flights/Hotels) to calculate and return the median cost estimates for flight, `rooms_per_night`, and `food_daily`; the resulting data is stored as a new `CostEstimate` associated with the `travelPlanID`. The `TravelPlan`'s `latestCostEstimateID` is updated to this new estimate.

**Request Body:**

```json
{
  "user": "ID",
  "travelPlan": "ID"
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

### POST /api/TripCostEstimation/editEstimateCost

**Description:** Manually creates or updates a cost estimate with user-provided values.

**Requirements:**

* `travelPlan` exists and belongs to user.
* `flight`, `roomsPerNight`, and `foodDaily` are non-negative numbers.

**Effects:**

* Creates a new `CostEstimate` with the provided values, sets `lastUpdated` to now, and updates the travel plan's `latestCostEstimateID` to this new estimate.

**Request Body:**

```json
{
  "user": "ID",
  "travelPlan": "ID",
  "flight": "Number",
  "roomsPerNight": "Number",
  "foodDaily": "Number"
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

### POST /api/TripCostEstimation/deleteEstimateCost

**Description:** Deletes a specific cost estimate and updates the travel plan to point to the next most recent one.

**Requirements:**

* `costEstimate` exists and belongs to user

**Effects:**

* Deletes the `CostEstimate` and updates the travel plan's `latestCostEstimateID` to the second most recently updated estimate (if any), or clears it if none remain.

**Request Body:**

```json
{
  "user": "ID",
  "costEstimate": "ID"
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

### POST /api/TripCostEstimation/getTravelCities

**Description:** Retrieves the origin and destination cities for a specified travel plan.

**Requirements:**

* `travelPlan` exists and belongs to the user

**Effects:**

* Returns `fromCity` and `toCity` for the specified `travelPlan`

**Request Body:**

```json
{
  "user": "ID",
  "travelPlan": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "fromCity": "Location",
  "toCity": "Location"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/TripCostEstimation/getTravelDates

**Description:** Retrieves the start and end dates for a specified travel plan.

**Requirements:**

* `travelPlan` exists and belongs to the user

**Effects:**

* Returns `fromDate` and `toDate` for the specified `travelPlan`

**Request Body:**

```json
{
  "user": "ID",
  "travelPlan": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "fromDate": "Date",
  "toDate": "Date"
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
  "user": "ID",
  "travelPlan": "ID"
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

**Description:** Retrieves a list of all travel plan IDs associated with a given user.

**Requirements:**

* `user` exists

**Effects:**

* Returns a list of all `TravelPlan` IDs associated with the given `user`.

**Request Body:**

```json
{
  "user": "ID"
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

***
