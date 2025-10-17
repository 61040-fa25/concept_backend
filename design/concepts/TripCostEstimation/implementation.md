
[@implementing-concepts](../../background/implementing-concepts.md)

# implement: the following concept 
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

*   `deleteTravelPlan(user: User, travelPlan: TravelPlan)`
    *   **Requires:** `travelPlan` exists and belongs to user
    *   **Effect:** Delete the `travelPlan` and any associated `CostEstimates`

*   `updateNecessity(user: User, travelPlan: TravelPlan, accommodation: Boolean, diningFlag: Boolean): (travelPlan: TravelPlan, necessity: Necessity)`
    *   **Requires:** `travelPlan` exists and belongs to user, `accommodation` exists as one of the livingSpaces and `diningFlag` indicates whether the user plans to save for eating out (true) or not (false)
    *   **Effect:** Create and add the `necessity` with `accommodation` and `diningFlag` to `travelPlan`

*   `resetNecessity(user: User, travelPlan: TravelPlan)`
    *   **Requires:** `travelPlan` exists and belongs to user
    *   **Effect:** Reset the `necessity` belonging to `travelPlan` to the default as described in the action `createTravelPlan`

*   **async** `generateAICostEstimate(user: User, travelPlan: TravelPlan, llm: GeminiLLM): (costEstimate: CostEstimate)`
    *   **Requires:** `travelPlan` exists and belongs to user
    *   **Effect:** Retrieves trip details (dates, locations) and necessity preference (accommodation, dining) and uses the llm's specialized tool (e.g., Google Search/Flights/Hotels) to calculate and return the median cost estimates for flight, `rooms_per_night`, and `food_daily`; the resulting data is stored as a new `CostEstimate` associated with the `travelPlanID`.
    *   **Note:** The LLM prompt will be specifically tailored to search for accommodation prices matching the `accommodation` Boolean (e.g., true for hotel/motel costs) and food costs based on the `diningFlag` (true for "restaurant costs," false for "no food costs"). If the LLM fails to provide an estimate for any reason or the costs are widely inaccurate (less than 50, more than 100000 for example) then the user can manually enter the total cost of the trip that they plan to save for.

*   `estimateCost (user: User, travelPlan: TravelPlan): (totalCost: Number)`
    *   **Requires:** `travelPlan` exists and belongs to user and an associated `CostEstimate` exists
    *   **Effect:** Calculates and returns the `totalCost` by multiplying the estimated daily/nightly costs by the duration and adding the flight cost.

* `_getAllTravelPlans(user: User): (travelPlans: TravelPlan[])`
	  *  **Requires:** `user` exists
	  *  **Effect:** Returns a list of all `TravelPlans` associated with the given `user`.
## Notes

The LLM augmentation moves the burden of research and calculation from the user to the LLM. The original `estimateCost` action is now strictly a calculation of the stored AI-generated or manually-inputted estimate. A manual fallback for cost input will still be available in the final implementation.





# response:

```typescript
// src/TripCostEstimation/TripCostEstimationConcept.ts

import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts"; // Assuming freshID is available here

// Declare collection prefix, use concept name
const PREFIX = "TripCostEstimation" + ".";

/**
 * @purpose Generate realistic cost estimates based on trip details, using AI for data retrieval and calculation.
 * @principle Based on a user's choice of initial departure city and arrival city, and the user's sheltering
 *            accommodations and food location preferences, an estimate is provided; the LLM is used to search
 *            for and calculate median cost ranges based on the provided necessities.
 */
export default class TripCostEstimationConcept {
  // Generic types of this concept (all are IDs when referenced as foreign keys)
  private type User = ID;
  private type Location = ID;
  private type TravelPlan = ID;
  private type Necessity = ID;
  private type CostEstimate = ID;

  // --- State Interfaces ---

  /**
   * A set of Users
   * (Documents store the user's ID. TravelPlans link back to User IDs.)
   */
  interface UsersDoc {
    _id: User;
    // No other properties explicitly defined by the state for a User itself,
    // as TravelPlans are linked to Users.
  }

  /**
   * A set of Locations with
   *   a city String
   */
  interface LocationsDoc {
    _id: Location;
    city: string;
  }

  /**
   * A set of TravelPlans with
   *   a `userID` User (Implicitly added for linking TravelPlans to Users)
   *   a `fromCity` Location (ID)
   *   a `toCity` Location (ID)
   *   a `fromDate` Date
   *   a `toDate` Date
   *   a `necessityID` Necessity (ID)
   */
  interface TravelPlansDoc {
    _id: TravelPlan;
    userID: User; // Link to UsersDoc
    fromCity: Location; // Link to LocationsDoc
    toCity: Location; // Link to LocationsDoc
    fromDate: Date;
    toDate: Date;
    necessityID: Necessity; // Link to NecessitiesDoc
  }

  /**
   * A set of Necessities with
   *   an `accommodation` Boolean
   *   a `diningFlag` Boolean
   */
  interface NecessitiesDoc {
    _id: Necessity;
    accommodation: boolean; // true for saving for rooms, false for not
    diningFlag: boolean; // true for saving for eating out, false for not
  }

  /**
   * A set of CostEstimates with
   *   a `travelPlanID` TravelPlan (ID)
   *   a `flight` Number // estimated total round-trip flight cost in USD
   *   a `roomsPerNight` Number // estimated cost per night in USD
   *   a `foodDaily` Number // estimated cost per day in USD
   *   a `lastUpdated` Date // tracking when the estimate was generated
   */
  interface CostEstimatesDoc {
    _id: CostEstimate;
    travelPlanID: TravelPlan; // Link to TravelPlansDoc
    flight: number; // estimated total round-trip flight cost in USD
    roomsPerNight: number; // estimated cost per night in USD
    foodDaily: number; // estimated cost per day in USD
    lastUpdated: Date; // tracking when the estimate was generated
  }

  // --- LLM Interface (for mocking/dependency injection) ---
  interface GeminiLLM {
    specializedTool: (prompt: string) => Promise<{
      flight?: number;
      roomsPerNight?: number;
      foodDaily?: number;
      error?: string;
    }>;
  }

  // --- MongoDB Collections ---
  private users: Collection<UsersDoc>;
  private locations: Collection<LocationsDoc>;
  private travelPlans: Collection<TravelPlansDoc>;
  private necessities: Collection<NecessitiesDoc>;
  private costEstimates: Collection<CostEstimatesDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.locations = this.db.collection(PREFIX + "locations");
    this.travelPlans = this.db.collection(PREFIX + "travelPlans");
    this.necessities = this.db.collection(PREFIX + "necessities");
    this.costEstimates = this.db.collection(PREFIX + "costEstimates");
  }

  // --- Actions ---

  /**
   * createTravelPlan (user: User, fromCity: Location, toCity: Location, fromDate: Date, toDate: Date): (travelPlan: TravelPlan)
   *
   * **requires** `fromCity` and `toCity` exists and `toDate` >= `fromDate` and both are greater than the current date
   *
   * **effects** Create and return a `travelPlan` with a `fromCity`, `toCity`, and from and to dates, and a default necessity (`accommodation` = true, `diningFlag` = true)
   */
  async createTravelPlan(
    {
      user,
      fromCity,
      toCity,
      fromDate,
      toDate,
    }: {
      user: ID;
      fromCity: ID;
      toCity: ID;
      fromDate: Date;
      toDate: Date;
    },
  ): Promise<{ travelPlan: ID } | { error: string }> {
    // Requires: fromCity and toCity exist
    const origin = await this.locations.findOne({ _id: fromCity });
    const destination = await this.locations.findOne({ _id: toCity });

    if (!origin) {
      return { error: `Origin city with ID ${fromCity} not found.` };
    }
    if (!destination) {
      return { error: `Destination city with ID ${toCity} not found.` };
    }

    // Requires: toDate >= fromDate
    if (toDate < fromDate) {
      return { error: "Arrival date must be on or after departure date." };
    }

    // Requires: both dates are greater than the current date
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
    if (fromDate < now || toDate < now) {
      return { error: "Departure and arrival dates must be in the future." };
    }

    // Ensure the user exists (or create a placeholder if not found, depending on domain logic)
    await this.users.updateOne(
      { _id: user },
      { $setOnInsert: { _id: user } },
      { upsert: true },
    );

    // Create default Necessity
    const newNecessityID = freshID();
    const newNecessity: NecessitiesDoc = {
      _id: newNecessityID,
      accommodation: true,
      diningFlag: true,
    };
    await this.necessities.insertOne(newNecessity);

    // Create TravelPlan
    const newTravelPlanID = freshID();
    const newTravelPlan: TravelPlansDoc = {
      _id: newTravelPlanID,
      userID: user,
      fromCity: fromCity,
      toCity: toCity,
      fromDate: fromDate,
      toDate: toDate,
      necessityID: newNecessityID,
    };
    await this.travelPlans.insertOne(newTravelPlan);

    return { travelPlan: newTravelPlanID };
  }

  /**
   * deleteTravelPlan (user: User, travelPlan: TravelPlan): Empty
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Delete the `travelPlan` and any associated `CostEstimates` and `Necessities`
   */
  async deleteTravelPlan(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<Empty | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    // Delete associated CostEstimates
    await this.costEstimates.deleteMany({ travelPlanID: travelPlan });

    // Delete associated Necessity
    await this.necessities.deleteOne({ _id: existingTravelPlan.necessityID });

    // Delete the TravelPlan itself
    await this.travelPlans.deleteOne({ _id: travelPlan });

    return {};
  }

  /**
   * updateNecessity (user: User, travelPlan: TravelPlan, accommodation: Boolean, diningFlag: Boolean): (travelPlan: TravelPlan, necessity: Necessity)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Create and add the `necessity` with `accommodation` and `diningFlag` to `travelPlan` (updates existing necessity)
   */
  async updateNecessity(
    {
      user,
      travelPlan,
      accommodation,
      diningFlag,
    }: {
      user: ID;
      travelPlan: ID;
      accommodation: boolean;
      diningFlag: boolean;
    },
  ): Promise<{ travelPlan: ID; necessity: ID } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const updateResult = await this.necessities.updateOne(
      { _id: existingTravelPlan.necessityID },
      { $set: { accommodation: accommodation, diningFlag: diningFlag } },
    );

    if (updateResult.matchedCount === 0) {
      // This should ideally not happen if travelPlan.necessityID is always valid
      return { error: "Associated necessity not found." };
    }

    return {
      travelPlan: travelPlan,
      necessity: existingTravelPlan.necessityID,
    };
  }

  /**
   * resetNecessity (user: User, travelPlan: TravelPlan): Empty
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Reset the `necessity` belonging to `travelPlan` to the default as described in the action `createTravelPlan`
   */
  async resetNecessity(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<Empty | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const updateResult = await this.necessities.updateOne(
      { _id: existingTravelPlan.necessityID },
      { $set: { accommodation: true, diningFlag: true } }, // Default values
    );

    if (updateResult.matchedCount === 0) {
      return { error: "Associated necessity not found." };
    }

    return {};
  }

  /**
   * generateAICostEstimate (user: User, travelPlan: TravelPlan, llm: GeminiLLM): (costEstimate: CostEstimate)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Retrieves trip details (dates, locations) and necessity preference (accommodation, dining) and uses the llm's specialized tool (e.g., Google Search/Flights/Hotels) to calculate and return the median cost estimates for flight, `rooms_per_night`, and `food_daily`; the resulting data is stored as a new `CostEstimate` associated with the `travelPlanID`.
   * **Note:** The LLM prompt will be specifically tailored to search for accommodation prices matching the `accommodation` Boolean (e.g., true for hotel/motel costs) and food costs based on the `diningFlag` (true for "restaurant costs," false for "no food costs"). If the LLM fails to provide an estimate for any reason or the costs are widely inaccurate (less than 50, more than 100000 for example) then the user can manually enter the total cost of the trip that they plan to save for.
   */
  async generateAICostEstimate(
    { user, travelPlan, llm }: { user: ID; travelPlan: ID; llm: GeminiLLM },
  ): Promise<{ costEstimate: ID } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const [originCityDoc, destinationCityDoc, necessityDoc] = await Promise.all(
      [
        this.locations.findOne({ _id: existingTravelPlan.fromCity }),
        this.locations.findOne({ _id: existingTravelPlan.toCity }),
        this.necessities.findOne({ _id: existingTravelPlan.necessityID }),
      ],
    );

    if (!originCityDoc || !destinationCityDoc || !necessityDoc) {
      return { error: "Referenced location or necessity data not found." };
    }

    const numNights = Math.ceil(
      (existingTravelPlan.toDate.getTime() -
        existingTravelPlan.fromDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const fromDateStr = existingTravelPlan.fromDate.toISOString().split("T")[0];
    const toDateStr = existingTravelPlan.toDate.toISOString().split("T")[0];

    const accommodationPreference = necessityDoc.accommodation
      ? "hotel/motel costs"
      : "no accommodation costs (e.g., staying with friends/family)";
    const diningPreference = necessityDoc.diningFlag
      ? "daily restaurant food costs"
      : "no food costs (e.g., cooking own meals)";

    const prompt =
      `Estimate median round-trip flight, ${
        accommodationPreference
      }, and ${diningPreference} ` +
      `from ${originCityDoc.city} to ${destinationCityDoc.city} ` +
      `departing on ${fromDateStr} and returning on ${toDateStr} ` +
      `for a trip lasting approximately ${numNights} nights.`;

    const llmResult = await llm.specializedTool(prompt);

    if (llmResult.error) {
      return { error: `LLM estimation failed: ${llmResult.error}` };
    }

    const flightCost = llmResult.flight ?? 0;
    const roomsPerNightCost = llmResult.roomsPerNight ?? 0;
    const foodDailyCost = llmResult.foodDaily ?? 0;

    // Basic validation for wide inaccuracies
    if (
      flightCost < 50 || flightCost > 100000 ||
      roomsPerNightCost < 0 || roomsPerNightCost > 5000 ||
      foodDailyCost < 0 || foodDailyCost > 1000
    ) {
      return {
        error:
          "LLM provided cost estimates are widely inaccurate. Please consider manual input.",
      };
    }

    const newCostEstimateID = freshID();
    const newCostEstimate: CostEstimatesDoc = {
      _id: newCostEstimateID,
      travelPlanID: travelPlan,
      flight: flightCost,
      roomsPerNight: roomsPerNightCost,
      foodDaily: foodDailyCost,
      lastUpdated: new Date(),
    };

    // Replace any existing estimate for this travel plan
    await this.costEstimates.replaceOne(
      { travelPlanID: travelPlan },
      newCostEstimate,
      { upsert: true },
    );

    return { costEstimate: newCostEstimateID };
  }

  /**
   * estimateCost (user: User, travelPlan: TravelPlan): (totalCost: Number)
   *
   * **requires** `travelPlan` exists and belongs to user and an associated `CostEstimate` exists
   *
   * **effects** Calculates and returns the `totalCost` by multiplying the estimated daily/nightly costs by the duration and adding the flight cost.
   */
  async estimateCost(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<{ totalCost: number } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const costEstimate = await this.costEstimates.findOne({
      travelPlanID: travelPlan,
    });

    if (!costEstimate) {
      return { error: "No cost estimate found for this travel plan." };
    }

    const numDays = Math.max(
      1,
      Math.ceil(
        (existingTravelPlan.toDate.getTime() -
          existingTravelPlan.fromDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    // Assuming numDays also represents nights for roomsPerNight
    const totalCost = costEstimate.flight +
      (costEstimate.roomsPerNight * numDays) +
      (costEstimate.foodDaily * numDays);

    return { totalCost: totalCost };
  }

  // --- Queries ---

  /**
   * _getAllTravelPlans (user: User): (travelPlans: TravelPlansDoc[])
   *
   * **requires** `user` exists
   *
   * **effects** Returns a list of all `TravelPlans` associated with the given `user`.
   */
  async _getAllTravelPlans(
    { user }: { user: ID },
  ): Promise<TravelPlansDoc[] | { error: string }[]> {
    // Check if user exists (optional, could just return empty if no plans)
    const userExists = await this.users.findOne({ _id: user });
    if (!userExists) {
      // Returning an empty array is often more user-friendly for queries
      // than an error for "user not found" if no plans are expected.
      // However, the spec says "Requires: user exists".
      return [{ error: `User with ID ${user} does not exist.` }];
    }

    const plans = await this.travelPlans.find({ userID: user }).toArray();

    // Map to the specified return format (an array of TravelPlan dictionaries)
    // The problem description implies a query can return the full document structure,
    // or a subset. If it specifically asked for `{ travelPlan: TravelPlanDoc }[]`,
    // I would wrap each item. For now, returning the raw docs.
    return plans;
  }
}
```

# prompt: To adhere to separation of concerns, move the GeminiLLM helper functions into a separate file called "gemini-llm.ts". Example: 
``` typescript
/**

 * LLM Integration for TripCostEstimation

 *

 * Handles cost estimation requests using Google's Gemini API with robust error handling,

 * timeouts, retries with exponential backoff, and comprehensive validation.

 */

  

import { GoogleGenerativeAI } from '@google/generative-ai';

  

/**

 * Configuration for API access

 */

export interface Config {

    apiKey: string;

}

  

/**

 * Configuration for retry behavior

 */

interface RetryConfig {

    maxRetries: number;

    baseDelayMs: number;

    maxDelayMs: number;

    timeoutMs: number;

}

  

export class GeminiLLM {

    private apiKey: string;

    private retryConfig: RetryConfig;

  

    constructor(config: Config) {

        this.apiKey = config.apiKey;

        this.retryConfig = {

            maxRetries: 3,

            baseDelayMs: 1000,

            maxDelayMs: 10000,

            timeoutMs: 30000

        };

    }

  

    /**

     * Execute LLM with timeout, retries, and exponential backoff

     * @requires prompt is a non-empty string

     * @returns Promise<string> containing the LLM response

     */

    async executeLLM(prompt: string): Promise<string> {

        if (!prompt || prompt.trim().length === 0) {

            throw new Error('Prompt cannot be empty or null');

        }

  

        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {

            try {

                const result = await this.executeWithTimeout(prompt);

                return result;

            } catch (error) {

                lastError = error as Error;

                // Don't retry on certain types of errors

                if (this.isNonRetryableError(error as Error)) {

                    throw new Error(`Non-retryable error: ${(error as Error).message}`);

                }

                // If this is the last attempt, throw the error

                if (attempt === this.retryConfig.maxRetries) {

                    break;

                }

                // Calculate delay with exponential backoff

                const delay = Math.min(

                    this.retryConfig.baseDelayMs * Math.pow(2, attempt),

                    this.retryConfig.maxDelayMs

                );

                console.log(`❌ Attempt ${attempt + 1} failed: ${(error as Error).message}. Retrying in ${delay}ms...`);

                await this.sleep(delay);

            }

        }

        throw new Error(`LLM request failed after ${this.retryConfig.maxRetries + 1} attempts. Last error: ${lastError?.message}`);

    }

  

    /**

     * Execute LLM request with timeout

     */

    private async executeWithTimeout(prompt: string): Promise<string> {

        const timeoutPromise = new Promise<never>((_, reject) => {

            setTimeout(() => {

                reject(new Error(`LLM request timed out after ${this.retryConfig.timeoutMs}ms`));

            }, this.retryConfig.timeoutMs);

        });

  

        const llmPromise = this.callGeminiAPI(prompt);

        return Promise.race([llmPromise, timeoutPromise]);

    }

  

    /**

     * Make the actual API call to Gemini

     */

    private async callGeminiAPI(prompt: string): Promise<string> {

        try {

            // Initialize Gemini AI

            const genAI = new GoogleGenerativeAI(this.apiKey);

            const model = genAI.getGenerativeModel({

                model: "gemini-2.5-flash-lite",

                generationConfig: {

                    maxOutputTokens: 1000,

                    temperature: 0.1, // Lower temperature for more consistent responses

                }

            });

            // Execute the LLM

            const result = await model.generateContent(prompt);

            const response = await result.response;

            const text = response.text();

            if (!text || text.trim().length === 0) {

                throw new Error('LLM returned empty response');

            }

            return text;

        } catch (error) {

            const errorMessage = (error as Error).message;

            // Provide more specific error messages

            if (errorMessage.includes('API_KEY_INVALID')) {

                throw new Error('Invalid API key provided');

            } else if (errorMessage.includes('QUOTA_EXCEEDED')) {

                throw new Error('API quota exceeded - please try again later');

            } else if (errorMessage.includes('SAFETY')) {

                throw new Error('Request blocked by safety filters - please modify your prompt');

            } else if (errorMessage.includes('PERMISSION_DENIED')) {

                throw new Error('Permission denied - check your API key permissions');

            } else {

                throw new Error(`Gemini API error: ${errorMessage}`);

            }

        }

    }

  

    /**

     * Check if an error should not be retried

     */

    private isNonRetryableError(error: Error): boolean {

        const message = error.message.toLowerCase();

        return message.includes('invalid api key') ||

               message.includes('permission denied') ||

               message.includes('quota exceeded') ||

               message.includes('safety') ||

               message.includes('prompt cannot be empty');

    }

  

    /**

     * Sleep utility for delays

     */

    private sleep(ms: number): Promise<void> {

        return new Promise(resolve => setTimeout(resolve, ms));

    }

}
```

# response:

To adhere to the separation of concerns, we'll move the LLM integration logic into a new utility file, `src/utils/gemini-llm.ts`. This file will contain the `GeminiLLM` class, which handles API calls, retries, timeouts, and most importantly, parsing the LLM's response into a structured cost estimate.

The `generateAICostEstimate` action within the `TripCostEstimationConcept` will then import and use this `GeminiLLM` class, ensuring that the concept focuses solely on business logic and state management, delegating external API interactions to the utility.

### Step 1: Create `src/utils/gemini-llm.ts`

```typescript
// src/utils/gemini-llm.ts

import { GoogleGenerativeAI } from 'npm:@google/generative-ai'; // Use qualified import for Deno

/**
 * Configuration for API access
 */
export interface GeminiLLMConfig {
    apiKey: string;
}

/**
 * Configuration for retry behavior
 */
interface RetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    timeoutMs: number;
}

/**
 * Interface for the structured cost estimate output from the LLM.
 * This matches the expected return type of the specialized tool.
 */
export interface CostEstimateResponse {
    flight?: number;
    roomsPerNight?: number;
    foodDaily?: number;
    error?: string; // Optional error message
}

/**
 * LLM Integration for TripCostEstimation
 *
 * Handles cost estimation requests using Google's Gemini API with robust error handling,
 * timeouts, retries with exponential backoff, and comprehensive validation.
 */
export class GeminiLLM {
    private apiKey: string;
    private retryConfig: RetryConfig;

    constructor(config: GeminiLLMConfig) {
        this.apiKey = config.apiKey;
        this.retryConfig = {
            maxRetries: 3,
            baseDelayMs: 1000,
            maxDelayMs: 10000,
            timeoutMs: 30000
        };
    }

    /**
     * Public method to get cost estimates, acting as the "specialized tool".
     * @param prompt The prompt string to send to the LLM. This prompt should instruct the LLM to return JSON.
     * @returns Promise<CostEstimateResponse> containing the parsed LLM response or an error.
     */
    async specializedTool(prompt: string): Promise<CostEstimateResponse> {
        try {
            const rawResponse = await this.executeLLM(prompt);
            return this.parseCostEstimateResponse(rawResponse);
        } catch (error) {
            console.error("Error in GeminiLLM.specializedTool:", error);
            // Catch errors from executeLLM or parseCostEstimateResponse
            return { error: `LLM estimation failed: ${(error as Error).message}` };
        }
    }

    /**
     * Execute LLM with timeout, retries, and exponential backoff.
     * @requires prompt is a non-empty string.
     * @returns Promise<string> containing the raw LLM response (expected to be a JSON string).
     */
    private async executeLLM(prompt: string): Promise<string> {
        if (!prompt || prompt.trim().length === 0) {
            throw new Error('Prompt cannot be empty or null');
        }

        let lastError: Error | null = null;
        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                const result = await this.executeWithTimeout(prompt);
                return result;
            } catch (error) {
                lastError = error as Error;
                // Don't retry on certain types of errors
                if (this.isNonRetryableError(error as Error)) {
                    throw new Error(`Non-retryable error: ${(error as Error).message}`);
                }
                // If this is the last attempt, throw the error
                if (attempt === this.retryConfig.maxRetries) {
                    break;
                }
                // Calculate delay with exponential backoff
                const delay = Math.min(
                    this.retryConfig.baseDelayMs * Math.pow(2, attempt),
                    this.retryConfig.maxDelayMs
                );
                console.log(`❌ Attempt ${attempt + 1} failed: ${(error as Error).message}. Retrying in ${delay}ms...`);
                await this.sleep(delay);
            }
        }
        throw new Error(`LLM request failed after ${this.retryConfig.maxRetries + 1} attempts. Last error: ${lastError?.message}`);
    }

    /**
     * Execute LLM request with timeout.
     */
    private async executeWithTimeout(prompt: string): Promise<string> {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`LLM request timed out after ${this.retryConfig.timeoutMs}ms`));
            }, this.retryConfig.timeoutMs);
        });

        const llmPromise = this.callGeminiAPI(prompt);
        return Promise.race([llmPromise, timeoutPromise]);
    }

    /**
     * Make the actual API call to Gemini.
     */
    private async callGeminiAPI(prompt: string): Promise<string> {
        try {
            // Initialize Gemini AI
            const genAI = new GoogleGenerativeAI(this.apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash", // Using gemini-1.5-flash as it's typically better for structured output
                generationConfig: {
                    maxOutputTokens: 1000,
                    temperature: 0.1, // Lower temperature for more consistent responses
                    responseMimeType: "application/json", // Explicitly request JSON output
                }
            });
            // Execute the LLM
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            if (!text || text.trim().length === 0) {
                throw new Error('LLM returned empty response');
            }
            return text;
        } catch (error) {
            const errorMessage = (error as Error).message;
            // Provide more specific error messages
            if (errorMessage.includes('API_KEY_INVALID')) {
                throw new Error('Invalid API key provided');
            } else if (errorMessage.includes('QUOTA_EXCEEDED')) {
                throw new Error('API quota exceeded - please try again later');
            } else if (errorMessage.includes('SAFETY')) {
                throw new Error('Request blocked by safety filters - please modify your prompt');
            } else if (errorMessage.includes('PERMISSION_DENIED')) {
                throw new Error('Permission denied - check your API key permissions');
            } else {
                throw new Error(`Gemini API error: ${errorMessage}`);
            }
        }
    }

    /**
     * Parses the LLM's raw string response into a structured CostEstimateResponse object.
     * Assumes the LLM response is a JSON string, potentially wrapped in markdown.
     */
    private parseCostEstimateResponse(rawResponse: string): CostEstimateResponse {
        try {
            let jsonString = rawResponse.trim();

            // Attempt to remove markdown code block wrappers if present
            if (jsonString.startsWith("```json") && jsonString.endsWith("```")) {
                jsonString = jsonString.substring(7, jsonString.length - 3).trim();
            } else if (jsonString.startsWith("```") && jsonString.endsWith("```")) {
                jsonString = jsonString.substring(3, jsonString.length - 3).trim();
            }

            const parsed = JSON.parse(jsonString);

            if (typeof parsed !== 'object' || parsed === null) {
                throw new Error('LLM response is not a valid JSON object.');
            }

            const costEstimate: CostEstimateResponse = {};
            if (typeof parsed.flight === 'number') costEstimate.flight = parsed.flight;
            if (typeof parsed.roomsPerNight === 'number') costEstimate.roomsPerNight = parsed.roomsPerNight;
            if (typeof parsed.foodDaily === 'number') costEstimate.foodDaily = parsed.foodDaily;

            // Log warnings for unexpected types but still return what was successfully parsed
            if (parsed.flight !== undefined && typeof parsed.flight !== 'number') {
                console.warn("LLM response 'flight' field is not a number:", parsed.flight);
            }
            if (parsed.roomsPerNight !== undefined && typeof parsed.roomsPerNight !== 'number') {
                console.warn("LLM response 'roomsPerNight' field is not a number:", parsed.roomsPerNight);
            }
            if (parsed.foodDaily !== undefined && typeof parsed.foodDaily !== 'number') {
                console.warn("LLM response 'foodDaily' field is not a number:", parsed.foodDaily);
            }

            return costEstimate;

        } catch (e) {
            console.error("Failed to parse LLM response:", rawResponse, e);
            throw new Error(`Failed to parse LLM response into expected JSON format: ${(e as Error).message}`);
        }
    }

    /**
     * Check if an error should not be retried.
     */
    private isNonRetryableError(error: Error): boolean {
        const message = error.message.toLowerCase();
        return message.includes('invalid api key') ||
            message.includes('permission denied') ||
            message.includes('quota exceeded') ||
            message.includes('safety') ||
            message.includes('prompt cannot be empty') ||
            message.includes('failed to parse llm response'); // Parsing errors are generally non-retryable as the prompt might be bad.
    }

    /**
     * Sleep utility for delays.
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

### Step 2: Update `src/TripCostEstimation/TripCostEstimationConcept.ts`

```typescript
// src/TripCostEstimation/TripCostEstimationConcept.ts

import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
// Import the refactored GeminiLLM and its response interface
import { GeminiLLM, CostEstimateResponse } from "@utils/gemini-llm.ts";

// Declare collection prefix, use concept name
const PREFIX = "TripCostEstimation" + ".";

/**
 * @purpose Generate realistic cost estimates based on trip details, using AI for data retrieval and calculation.
 * @principle Based on a user's choice of initial departure city and arrival city, and the user's sheltering
 *            accommodations and food location preferences, an estimate is provided; the LLM is used to search
 *            for and calculate median cost ranges based on the provided necessities.
 */
export default class TripCostEstimationConcept {
  // Generic types of this concept (all are IDs when referenced as foreign keys)
  // These are private to the class scope and only used for type branding, not actual object types.
  private type User = ID;
  private type Location = ID;
  private type TravelPlan = ID;
  private type Necessity = ID;
  private type CostEstimate = ID;

  // --- State Interfaces ---

  /**
   * A set of Users
   * (Documents store the user's ID. TravelPlans link back to User IDs.)
   */
  interface UsersDoc {
    _id: User;
    // No other properties explicitly defined by the state for a User itself,
    // as TravelPlans are linked to Users.
  }

  /**
   * A set of Locations with
   *   a city String
   */
  interface LocationsDoc {
    _id: Location;
    city: string;
  }

  /**
   * A set of TravelPlans with
   *   a `userID` User (Implicitly added for linking TravelPlans to Users)
   *   a `fromCity` Location (ID)
   *   a `toCity` Location (ID)
   *   a `fromDate` Date
   *   a `toDate` Date
   *   a `necessityID` Necessity (ID)
   */
  interface TravelPlansDoc {
    _id: TravelPlan;
    userID: User; // Link to UsersDoc
    fromCity: Location; // Link to LocationsDoc
    toCity: Location; // Link to LocationsDoc
    fromDate: Date;
    toDate: Date;
    necessityID: Necessity; // Link to NecessitiesDoc
  }

  /**
   * A set of Necessities with
   *   an `accommodation` Boolean
   *   a `diningFlag` Boolean
   */
  interface NecessitiesDoc {
    _id: Necessity;
    accommodation: boolean; // true for saving for rooms, false for not
    diningFlag: boolean; // true for saving for eating out, false for not
  }

  /**
   * A set of CostEstimates with
   *   a `travelPlanID` TravelPlan (ID)
   *   a `flight` Number // estimated total round-trip flight cost in USD
   *   a `roomsPerNight` Number // estimated cost per night in USD
   *   a `foodDaily` Number // estimated cost per day in USD
   *   a `lastUpdated` Date // tracking when the estimate was generated
   */
  interface CostEstimatesDoc {
    _id: CostEstimate;
    travelPlanID: TravelPlan; // Link to TravelPlansDoc
    flight: number; // estimated total round-trip flight cost in USD
    roomsPerNight: number; // estimated cost per night in USD
    foodDaily: number; // estimated cost per day in USD
    lastUpdated: Date; // tracking when the estimate was generated
  }

  // --- MongoDB Collections ---
  private users: Collection<UsersDoc>;
  private locations: Collection<LocationsDoc>;
  private travelPlans: Collection<TravelPlansDoc>;
  private necessities: Collection<NecessitiesDoc>;
  private costEstimates: Collection<CostEstimatesDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.locations = this.db.collection(PREFIX + "locations");
    this.travelPlans = this.db.collection(PREFIX + "travelPlans");
    this.necessities = this.db.collection(PREFIX + "necessities");
    this.costEstimates = this.db.collection(PREFIX + "costEstimates");
  }

  // --- Actions ---

  /**
   * createTravelPlan (user: User, fromCity: Location, toCity: Location, fromDate: Date, toDate: Date): (travelPlan: TravelPlan)
   *
   * **requires** `fromCity` and `toCity` exists and `toDate` >= `fromDate` and both are greater than the current date
   *
   * **effects** Create and return a `travelPlan` with a `fromCity`, `toCity`, and from and to dates, and a default necessity (`accommodation` = true, `diningFlag` = true)
   */
  async createTravelPlan(
    {
      user,
      fromCity,
      toCity,
      fromDate,
      toDate,
    }: {
      user: ID;
      fromCity: ID;
      toCity: ID;
      fromDate: Date;
      toDate: Date;
    },
  ): Promise<{ travelPlan: ID } | { error: string }> {
    // Requires: fromCity and toCity exist
    const origin = await this.locations.findOne({ _id: fromCity });
    const destination = await this.locations.findOne({ _id: toCity });

    if (!origin) {
      return { error: `Origin city with ID ${fromCity} not found.` };
    }
    if (!destination) {
      return { error: `Destination city with ID ${toCity} not found.` };
    }

    // Requires: toDate >= fromDate
    if (toDate < fromDate) {
      return { error: "Arrival date must be on or after departure date." };
    }

    // Requires: both dates are greater than the current date
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
    if (fromDate < now || toDate < now) {
      return { error: "Departure and arrival dates must be in the future." };
    }

    // Ensure the user exists (or create a placeholder if not found, depending on domain logic)
    await this.users.updateOne(
      { _id: user },
      { $setOnInsert: { _id: user } },
      { upsert: true },
    );

    // Create default Necessity
    const newNecessityID = freshID();
    const newNecessity: NecessitiesDoc = {
      _id: newNecessityID,
      accommodation: true,
      diningFlag: true,
    };
    await this.necessities.insertOne(newNecessity);

    // Create TravelPlan
    const newTravelPlanID = freshID();
    const newTravelPlan: TravelPlansDoc = {
      _id: newTravelPlanID,
      userID: user,
      fromCity: fromCity,
      toCity: toCity,
      fromDate: fromDate,
      toDate: toDate,
      necessityID: newNecessityID,
    };
    await this.travelPlans.insertOne(newTravelPlan);

    return { travelPlan: newTravelPlanID };
  }

  /**
   * deleteTravelPlan (user: User, travelPlan: TravelPlan): Empty
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Delete the `travelPlan` and any associated `CostEstimates` and `Necessities`
   */
  async deleteTravelPlan(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<Empty | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    // Delete associated CostEstimates
    await this.costEstimates.deleteMany({ travelPlanID: travelPlan });

    // Delete associated Necessity
    await this.necessities.deleteOne({ _id: existingTravelPlan.necessityID });

    // Delete the TravelPlan itself
    await this.travelPlans.deleteOne({ _id: travelPlan });

    return {};
  }

  /**
   * updateNecessity (user: User, travelPlan: TravelPlan, accommodation: Boolean, diningFlag: Boolean): (travelPlan: TravelPlan, necessity: Necessity)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Create and add the `necessity` with `accommodation` and `diningFlag` to `travelPlan` (updates existing necessity)
   */
  async updateNecessity(
    {
      user,
      travelPlan,
      accommodation,
      diningFlag,
    }: {
      user: ID;
      travelPlan: ID;
      accommodation: boolean;
      diningFlag: boolean;
    },
  ): Promise<{ travelPlan: ID; necessity: ID } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const updateResult = await this.necessities.updateOne(
      { _id: existingTravelPlan.necessityID },
      { $set: { accommodation: accommodation, diningFlag: diningFlag } },
    );

    if (updateResult.matchedCount === 0) {
      // This should ideally not happen if travelPlan.necessityID is always valid
      return { error: "Associated necessity not found." };
    }

    return {
      travelPlan: travelPlan,
      necessity: existingTravelPlan.necessityID,
    };
  }

  /**
   * resetNecessity (user: User, travelPlan: TravelPlan): Empty
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Reset the `necessity` belonging to `travelPlan` to the default as described in the action `createTravelPlan`
   */
  async resetNecessity(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<Empty | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const updateResult = await this.necessities.updateOne(
      { _id: existingTravelPlan.necessityID },
      { $set: { accommodation: true, diningFlag: true } }, // Default values
    );

    if (updateResult.matchedCount === 0) {
      return { error: "Associated necessity not found." };
    }

    return {};
  }

  /**
   * generateAICostEstimate (user: User, travelPlan: TravelPlan, llm: GeminiLLM): (costEstimate: CostEstimate)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Retrieves trip details (dates, locations) and necessity preference (accommodation, dining) and uses the llm's specialized tool (e.g., Google Search/Flights/Hotels) to calculate and return the median cost estimates for flight, `rooms_per_night`, and `food_daily`; the resulting data is stored as a new `CostEstimate` associated with the `travelPlanID`.
   * **Note:** The LLM prompt will be specifically tailored to search for accommodation prices matching the `accommodation` Boolean (e.g., true for hotel/motel costs) and food costs based on the `diningFlag` (true for "restaurant costs," false for "no food costs"). If the LLM fails to provide an estimate for any reason or the costs are widely inaccurate (less than 50, more than 100000 for example) then the user can manually enter the total cost of the trip that they plan to save for.
   */
  async generateAICostEstimate(
    { user, travelPlan, llm }: { user: ID; travelPlan: ID; llm: GeminiLLM }, // Use imported GeminiLLM
  ): Promise<{ costEstimate: ID } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const [originCityDoc, destinationCityDoc, necessityDoc] = await Promise.all(
      [
        this.locations.findOne({ _id: existingTravelPlan.fromCity }),
        this.locations.findOne({ _id: existingTravelPlan.toCity }),
        this.necessities.findOne({ _id: existingTravelPlan.necessityID }),
      ],
    );

    if (!originCityDoc || !destinationCityDoc || !necessityDoc) {
      return { error: "Referenced location or necessity data not found." };
    }

    const numNights = Math.ceil(
      (existingTravelPlan.toDate.getTime() -
        existingTravelPlan.fromDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const fromDateStr = existingTravelPlan.fromDate.toISOString().split("T")[0];
    const toDateStr = existingTravelPlan.toDate.toISOString().split("T")[0];

    const accommodationPreference = necessityDoc.accommodation
      ? "hotel/motel costs"
      : "no accommodation costs (e.g., staying with friends/family)";
    const diningPreference = necessityDoc.diningFlag
      ? "daily restaurant food costs"
      : "no food costs (e.g., cooking own meals)";

    // Modify prompt to explicitly ask for JSON output
    const prompt =
      `Please provide a cost estimate in JSON format for a trip. ` +
      `Estimate median round-trip flight, ${
        accommodationPreference
      }, and ${diningPreference} ` +
      `from ${originCityDoc.city} to ${destinationCityDoc.city} ` +
      `departing on ${fromDateStr} and returning on ${toDateStr} ` +
      `for a trip lasting approximately ${numNights} nights. ` +
      `The JSON object should have the structure: ` +
      `{"flight": <number>, "roomsPerNight": <number>, "foodDaily": <number>}. ` +
      `Return only the JSON object.`;

    const llmResult: CostEstimateResponse = await llm.specializedTool(prompt);

    if (llmResult.error) {
      return { error: `LLM estimation failed: ${llmResult.error}` };
    }

    const flightCost = llmResult.flight ?? 0;
    const roomsPerNightCost = llmResult.roomsPerNight ?? 0;
    const foodDailyCost = llmResult.foodDaily ?? 0;

    // Basic validation for wide inaccuracies
    if (
      flightCost < 50 || flightCost > 100000 ||
      roomsPerNightCost < 0 || roomsPerNightCost > 5000 ||
      foodDailyCost < 0 || foodDailyCost > 1000
    ) {
      return {
        error:
          "LLM provided cost estimates are widely inaccurate. Please consider manual input.",
      };
    }

    const newCostEstimateID = freshID();
    const newCostEstimate: CostEstimatesDoc = {
      _id: newCostEstimateID,
      travelPlanID: travelPlan,
      flight: flightCost,
      roomsPerNight: roomsPerNightCost,
      foodDaily: foodDailyCost,
      lastUpdated: new Date(),
    };

    // Replace any existing estimate for this travel plan
    await this.costEstimates.replaceOne(
      { travelPlanID: travelPlan },
      newCostEstimate,
      { upsert: true },
    );

    return { costEstimate: newCostEstimateID };
  }

  /**
   * estimateCost (user: User, travelPlan: TravelPlan): (totalCost: Number)
   *
   * **requires** `travelPlan` exists and belongs to user and an associated `CostEstimate` exists
   *
   * **effects** Calculates and returns the `totalCost` by multiplying the estimated daily/nightly costs by the duration and adding the flight cost.
   */
  async estimateCost(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<{ totalCost: number } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const costEstimate = await this.costEstimates.findOne({
      travelPlanID: travelPlan,
    });

    if (!costEstimate) {
      return { error: "No cost estimate found for this travel plan." };
    }

    const numDays = Math.max(
      1,
      Math.ceil(
        (existingTravelPlan.toDate.getTime() -
          existingTravelPlan.fromDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    // Assuming numDays also represents nights for roomsPerNight
    const totalCost = costEstimate.flight +
      (costEstimate.roomsPerNight * numDays) +
      (costEstimate.foodDaily * numDays);

    return { totalCost: totalCost };
  }

  // --- Queries ---

  /**
   * _getAllTravelPlans (user: User): (travelPlans: TravelPlansDoc[])
   *
   * **requires** `user` exists
   *
   * **effects** Returns a list of all `TravelPlans` associated with the given `user`.
   */
  async _getAllTravelPlans(
    { user }: { user: ID },
  ): Promise<TravelPlansDoc[] | { error: string }[]> {
    // Check if user exists (optional, could just return empty if no plans)
    const userExists = await this.users.findOne({ _id: user });
    if (!userExists) {
      // Returning an empty array is often more user-friendly for queries
      // than an error for "user not found" if no plans are expected.
      // However, the spec says "Requires: user exists".
      return [{ error: `User with ID ${user} does not exist.` }];
    }

    const plans = await this.travelPlans.find({ userID: user }).toArray();

    return plans;
  }
}
```

# prompt: To further enforce separation of concerns the gemini-llm file should not be the one doing the parsing of its raw output, make it a private method in the concept class
# response:

```typescript
// src/utils/gemini-llm.ts

import { GoogleGenerativeAI } from 'npm:@google/generative-ai'; // Use qualified import for Deno

/**
 * Configuration for API access
 */
export interface GeminiLLMConfig {
    apiKey: string;
}

/**
 * Configuration for retry behavior
 */
interface RetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    timeoutMs: number;
}

/**
 * Interface for the structured cost estimate output that the LLM is expected to generate.
 * This defines the target structure for the parsing logic in the Concept class.
 */
export interface CostEstimateResponse {
    flight?: number;
    roomsPerNight?: number;
    foodDaily?: number;
    // The `error` field is not part of the *successful* LLM response structure itself,
    // but rather part of the action's return type when an error occurs during API call or parsing.
}

/**
 * LLM Integration for TripCostEstimation
 *
 * Handles raw LLM text generation requests using Google's Gemini API with robust error handling,
 * timeouts, retries with exponential backoff, and comprehensive validation.
 * It does NOT perform any parsing of the LLM's output.
 */
export class GeminiLLM {
    private apiKey: string;
    private retryConfig: RetryConfig;

    constructor(config: GeminiLLMConfig) {
        this.apiKey = config.apiKey;
        this.retryConfig = {
            maxRetries: 3,
            baseDelayMs: 1000,
            maxDelayMs: 10000,
            timeoutMs: 30000
        };
    }

    /**
     * Public method to interact with the LLM, acting as the "specialized tool".
     * It handles LLM interaction, retries, and timeouts, but *not* parsing the content.
     * @param prompt The prompt string to send to the LLM. This prompt should instruct the LLM to return JSON.
     * @returns Promise<string | { error: string }> The raw LLM text response (expected to be a JSON string),
     *          or an error object if the LLM API call itself fails.
     */
    async specializedTool(prompt: string): Promise<string | { error: string }> {
        try {
            const rawResponse = await this.executeLLM(prompt);
            return rawResponse;
        } catch (error) {
            console.error("Error in GeminiLLM.specializedTool:", error);
            // Catch errors from executeLLM
            return { error: `LLM API call failed: ${(error as Error).message}` };
        }
    }

    /**
     * Executes LLM with timeout, retries, and exponential backoff.
     * @requires prompt is a non-empty string.
     * @returns Promise<string> containing the raw LLM response (expected to be a JSON string).
     */
    private async executeLLM(prompt: string): Promise<string> {
        if (!prompt || prompt.trim().length === 0) {
            throw new Error('Prompt cannot be empty or null');
        }

        let lastError: Error | null = null;
        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                const result = await this.executeWithTimeout(prompt);
                return result;
            } catch (error) {
                lastError = error as Error;
                // Don't retry on certain types of errors
                if (this.isNonRetryableError(error as Error)) {
                    throw new Error(`Non-retryable error: ${(error as Error).message}`);
                }
                // If this is the last attempt, throw the error
                if (attempt === this.retryConfig.maxRetries) {
                    break;
                }
                // Calculate delay with exponential backoff
                const delay = Math.min(
                    this.retryConfig.baseDelayMs * Math.pow(2, attempt),
                    this.retryConfig.maxDelayMs
                );
                console.log(`❌ Attempt ${attempt + 1} failed: ${(error as Error).message}. Retrying in ${delay}ms...`);
                await this.sleep(delay);
            }
        }
        throw new Error(`LLM request failed after ${this.retryConfig.maxRetries + 1} attempts. Last error: ${lastError?.message}`);
    }

    /**
     * Execute LLM request with timeout.
     */
    private async executeWithTimeout(prompt: string): Promise<string> {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`LLM request timed out after ${this.retryConfig.timeoutMs}ms`));
            }, this.retryConfig.timeoutMs);
        });

        const llmPromise = this.callGeminiAPI(prompt);
        return Promise.race([llmPromise, timeoutPromise]);
    }

    /**
     * Make the actual API call to Gemini.
     */
    private async callGeminiAPI(prompt: string): Promise<string> {
        try {
            // Initialize Gemini AI
            const genAI = new GoogleGenerativeAI(this.apiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash", // Using gemini-1.5-flash as it's typically better for structured output
                generationConfig: {
                    maxOutputTokens: 1000,
                    temperature: 0.1, // Lower temperature for more consistent responses
                    responseMimeType: "application/json", // Explicitly request JSON output
                }
            });
            // Execute the LLM
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            if (!text || text.trim().length === 0) {
                throw new Error('LLM returned empty response');
            }
            return text;
        } catch (error) {
            const errorMessage = (error as Error).message;
            // Provide more specific error messages
            if (errorMessage.includes('API_KEY_INVALID')) {
                throw new Error('Invalid API key provided');
            } else if (errorMessage.includes('QUOTA_EXCEEDED')) {
                throw new Error('API quota exceeded - please try again later');
            } else if (errorMessage.includes('SAFETY')) {
                throw new Error('Request blocked by safety filters - please modify your prompt');
            } else if (errorMessage.includes('PERMISSION_DENIED')) {
                throw new Error('Permission denied - check your API key permissions');
            } else {
                throw new Error(`Gemini API error: ${errorMessage}`);
            }
        }
    }

    /**
     * Check if an error should not be retried.
     */
    private isNonRetryableError(error: Error): boolean {
        const message = error.message.toLowerCase();
        return message.includes('invalid api key') ||
            message.includes('permission denied') ||
            message.includes('quota exceeded') ||
            message.includes('safety') ||
            message.includes('prompt cannot be empty');
    }

    /**
     * Sleep utility for delays.
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

```typescript
// src/TripCostEstimation/TripCostEstimationConcept.ts

import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
// Import the refactored GeminiLLM and its response interface
import { GeminiLLM, CostEstimateResponse } from "@utils/gemini-llm.ts";

// Declare collection prefix, use concept name
const PREFIX = "TripCostEstimation" + ".";

/**
 * @purpose Generate realistic cost estimates based on trip details, using AI for data retrieval and calculation.
 * @principle Based on a user's choice of initial departure city and arrival city, and the user's sheltering
 *            accommodations and food location preferences, an estimate is provided; the LLM is used to search
 *            for and calculate median cost ranges based on the provided necessities.
 */
export default class TripCostEstimationConcept {
  // Generic types of this concept (all are IDs when referenced as foreign keys)
  // These are private to the class scope and only used for type branding, not actual object types.
  private type User = ID;
  private type Location = ID;
  private type TravelPlan = ID;
  private type Necessity = ID;
  private type CostEstimate = ID;

  // --- State Interfaces ---

  /**
   * A set of Users
   * (Documents store the user's ID. TravelPlans link back to User IDs.)
   */
  interface UsersDoc {
    _id: User;
    // No other properties explicitly defined by the state for a User itself,
    // as TravelPlans are linked to Users.
  }

  /**
   * A set of Locations with
   *   a city String
   */
  interface LocationsDoc {
    _id: Location;
    city: string;
  }

  /**
   * A set of TravelPlans with
   *   a `userID` User (Implicitly added for linking TravelPlans to Users)
   *   a `fromCity` Location (ID)
   *   a `toCity` Location (ID)
   *   a `fromDate` Date
   *   a `toDate` Date
   *   a `necessityID` Necessity (ID)
   */
  interface TravelPlansDoc {
    _id: TravelPlan;
    userID: User; // Link to UsersDoc
    fromCity: Location; // Link to LocationsDoc
    toCity: Location; // Link to LocationsDoc
    fromDate: Date;
    toDate: Date;
    necessityID: Necessity; // Link to NecessitiesDoc
  }

  /**
   * A set of Necessities with
   *   an `accommodation` Boolean
   *   a `diningFlag` Boolean
   */
  interface NecessitiesDoc {
    _id: Necessity;
    accommodation: boolean; // true for saving for rooms, false for not
    diningFlag: boolean; // true for saving for eating out, false for not
  }

  /**
   * A set of CostEstimates with
   *   a `travelPlanID` TravelPlan (ID)
   *   a `flight` Number // estimated total round-trip flight cost in USD
   *   a `roomsPerNight` Number // estimated cost per night in USD
   *   a `foodDaily` Number // estimated cost per day in USD
   *   a `lastUpdated` Date // tracking when the estimate was generated
   */
  interface CostEstimatesDoc {
    _id: CostEstimate;
    travelPlanID: TravelPlan; // Link to TravelPlansDoc
    flight: number; // estimated total round-trip flight cost in USD
    roomsPerNight: number; // estimated cost per night in USD
    foodDaily: number; // estimated cost per day in USD
    lastUpdated: Date; // tracking when the estimate was generated
  }

  // --- MongoDB Collections ---
  private users: Collection<UsersDoc>;
  private locations: Collection<LocationsDoc>;
  private travelPlans: Collection<TravelPlansDoc>;
  private necessities: Collection<NecessitiesDoc>;
  private costEstimates: Collection<CostEstimatesDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.locations = this.db.collection(PREFIX + "locations");
    this.travelPlans = this.db.collection(PREFIX + "travelPlans");
    this.necessities = this.db.collection(PREFIX + "necessities");
    this.costEstimates = this.db.collection(PREFIX + "costEstimates");
  }

  // --- Private Helper Methods ---

  /**
   * Parses the LLM's raw string response into a structured CostEstimateResponse object.
   * Assumes the LLM response is a JSON string, potentially wrapped in markdown.
   * This method is now private to the concept, enforcing separation of concerns
   * between LLM interaction and domain-specific parsing.
   * @param rawResponse The raw string output received from the LLM.
   * @returns CostEstimateResponse if parsing is successful, or an object with an `error` string.
   */
  private _parseLLMCostEstimate(rawResponse: string): CostEstimateResponse | { error: string } {
    try {
      let jsonString = rawResponse.trim();

      // Attempt to remove markdown code block wrappers if present
      if (jsonString.startsWith("```json") && jsonString.endsWith("```")) {
        jsonString = jsonString.substring(7, jsonString.length - 3).trim();
      } else if (jsonString.startsWith("```") && jsonString.endsWith("```")) {
        jsonString = jsonString.substring(3, jsonString.length - 3).trim();
      }

      const parsed = JSON.parse(jsonString);

      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('LLM response is not a valid JSON object.');
      }

      const costEstimate: CostEstimateResponse = {};
      if (typeof parsed.flight === 'number') costEstimate.flight = parsed.flight;
      if (typeof parsed.roomsPerNight === 'number') costEstimate.roomsPerNight = parsed.roomsPerNight;
      if (typeof parsed.foodDaily === 'number') costEstimate.foodDaily = parsed.foodDaily;

      // Log warnings for unexpected types but still return what was successfully parsed
      if (parsed.flight !== undefined && typeof parsed.flight !== 'number') {
        console.warn("LLM response 'flight' field is not a number:", parsed.flight);
      }
      if (parsed.roomsPerNight !== undefined && typeof parsed.roomsPerNight !== 'number') {
        console.warn("LLM response 'roomsPerNight' field is not a number:", parsed.roomsPerNight);
      }
      if (parsed.foodDaily !== undefined && typeof parsed.foodDaily !== 'number') {
        console.warn("LLM response 'foodDaily' field is not a number:", parsed.foodDaily);
      }

      // Check if any *expected* fields are missing or invalid after parsing,
      // and if so, return an error. The prompt explicitly asks for these.
      if (costEstimate.flight === undefined || costEstimate.roomsPerNight === undefined || costEstimate.foodDaily === undefined) {
          // If at least one of the primary expected cost fields is missing/invalid,
          // consider the parsing unsuccessful for a full estimate.
          return { error: `LLM response could not be parsed into all required cost components (flight, roomsPerNight, foodDaily). Raw: ${jsonString}` };
      }

      return costEstimate;

    } catch (e) {
      console.error("Failed to parse LLM response:", rawResponse, e);
      return { error: `Failed to parse LLM response into expected JSON format: ${(e as Error).message}` };
    }
  }

  // --- Actions ---

  /**
   * createTravelPlan (user: User, fromCity: Location, toCity: Location, fromDate: Date, toDate: Date): (travelPlan: TravelPlan)
   *
   * **requires** `fromCity` and `toCity` exists and `toDate` >= `fromDate` and both are greater than the current date
   *
   * **effects** Create and return a `travelPlan` with a `fromCity`, `toCity`, and from and to dates, and a default necessity (`accommodation` = true, `diningFlag` = true)
   */
  async createTravelPlan(
    {
      user,
      fromCity,
      toCity,
      fromDate,
      toDate,
    }: {
      user: ID;
      fromCity: ID;
      toCity: ID;
      fromDate: Date;
      toDate: Date;
    },
  ): Promise<{ travelPlan: ID } | { error: string }> {
    // Requires: fromCity and toCity exist
    const origin = await this.locations.findOne({ _id: fromCity });
    const destination = await this.locations.findOne({ _id: toCity });

    if (!origin) {
      return { error: `Origin city with ID ${fromCity} not found.` };
    }
    if (!destination) {
      return { error: `Destination city with ID ${toCity} not found.` };
    }

    // Requires: toDate >= fromDate
    if (toDate < fromDate) {
      return { error: "Arrival date must be on or after departure date." };
    }

    // Requires: both dates are greater than the current date
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
    if (fromDate < now || toDate < now) {
      return { error: "Departure and arrival dates must be in the future." };
    }

    // Ensure the user exists (or create a placeholder if not found, depending on domain logic)
    await this.users.updateOne(
      { _id: user },
      { $setOnInsert: { _id: user } },
      { upsert: true },
    );

    // Create default Necessity
    const newNecessityID = freshID();
    const newNecessity: NecessitiesDoc = {
      _id: newNecessityID,
      accommodation: true,
      diningFlag: true,
    };
    await this.necessities.insertOne(newNecessity);

    // Create TravelPlan
    const newTravelPlanID = freshID();
    const newTravelPlan: TravelPlansDoc = {
      _id: newTravelPlanID,
      userID: user,
      fromCity: fromCity,
      toCity: toCity,
      fromDate: fromDate,
      toDate: toDate,
      necessityID: newNecessityID,
    };
    await this.travelPlans.insertOne(newTravelPlan);

    return { travelPlan: newTravelPlanID };
  }

  /**
   * deleteTravelPlan (user: User, travelPlan: TravelPlan): Empty
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Delete the `travelPlan` and any associated `CostEstimates` and `Necessities`
   */
  async deleteTravelPlan(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<Empty | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    // Delete associated CostEstimates
    await this.costEstimates.deleteMany({ travelPlanID: travelPlan });

    // Delete associated Necessity
    await this.necessities.deleteOne({ _id: existingTravelPlan.necessityID });

    // Delete the TravelPlan itself
    await this.travelPlans.deleteOne({ _id: travelPlan });

    return {};
  }

  /**
   * updateNecessity (user: User, travelPlan: TravelPlan, accommodation: Boolean, diningFlag: Boolean): (travelPlan: TravelPlan, necessity: Necessity)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Create and add the `necessity` with `accommodation` and `diningFlag` to `travelPlan` (updates existing necessity)
   */
  async updateNecessity(
    {
      user,
      travelPlan,
      accommodation,
      diningFlag,
    }: {
      user: ID;
      travelPlan: ID;
      accommodation: boolean;
      diningFlag: boolean;
    },
  ): Promise<{ travelPlan: ID; necessity: ID } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const updateResult = await this.necessities.updateOne(
      { _id: existingTravelPlan.necessityID },
      { $set: { accommodation: accommodation, diningFlag: diningFlag } },
    );

    if (updateResult.matchedCount === 0) {
      // This should ideally not happen if travelPlan.necessityID is always valid
      return { error: "Associated necessity not found." };
    }

    return {
      travelPlan: travelPlan,
      necessity: existingTravelPlan.necessityID,
    };
  }

  /**
   * resetNecessity (user: User, travelPlan: TravelPlan): Empty
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Reset the `necessity` belonging to `travelPlan` to the default as described in the action `createTravelPlan`
   */
  async resetNecessity(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<Empty | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const updateResult = await this.necessities.updateOne(
      { _id: existingTravelPlan.necessityID },
      { $set: { accommodation: true, diningFlag: true } }, // Default values
    );

    if (updateResult.matchedCount === 0) {
      return { error: "Associated necessity not found." };
    }

    return {};
  }

  /**
   * generateAICostEstimate (user: User, travelPlan: TravelPlan, llm: GeminiLLM): (costEstimate: CostEstimate)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Retrieves trip details (dates, locations) and necessity preference (accommodation, dining) and uses the llm's specialized tool (e.g., Google Search/Flights/Hotels) to calculate and return the median cost estimates for flight, `rooms_per_night`, and `food_daily`; the resulting data is stored as a new `CostEstimate` associated with the `travelPlanID`.
   * **Note:** The LLM prompt will be specifically tailored to search for accommodation prices matching the `accommodation` Boolean (e.g., true for hotel/motel costs) and food costs based on the `diningFlag` (true for "restaurant costs," false for "no food costs"). If the LLM fails to provide an estimate for any reason or the costs are widely inaccurate (less than 50, more than 100000 for example) then the user can manually enter the total cost of the trip that they plan to save for.
   */
  async generateAICostEstimate(
    { user, travelPlan, llm }: { user: ID; travelPlan: ID; llm: GeminiLLM }, // `llm` type is now `GeminiLLM`
  ): Promise<{ costEstimate: ID } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const [originCityDoc, destinationCityDoc, necessityDoc] = await Promise.all(
      [
        this.locations.findOne({ _id: existingTravelPlan.fromCity }),
        this.locations.findOne({ _id: existingTravelPlan.toCity }),
        this.necessities.findOne({ _id: existingTravelPlan.necessityID }),
      ],
    );

    if (!originCityDoc || !destinationCityDoc || !necessityDoc) {
      return { error: "Referenced location or necessity data not found." };
    }

    const numNights = Math.ceil(
      (existingTravelPlan.toDate.getTime() -
        existingTravelPlan.fromDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const fromDateStr = existingTravelPlan.fromDate.toISOString().split("T")[0];
    const toDateStr = existingTravelPlan.toDate.toISOString().split("T")[0];

    const accommodationPreference = necessityDoc.accommodation
      ? "hotel/motel costs"
      : "no accommodation costs (e.g., staying with friends/family)";
    const diningPreference = necessityDoc.diningFlag
      ? "daily restaurant food costs"
      : "no food costs (e.g., cooking own meals)";

    // Prompt now explicitly asks for JSON, as the LLM utility is configured for it.
    const prompt =
      `Please provide a cost estimate in JSON format for a trip. ` +
      `Estimate median round-trip flight, ${
        accommodationPreference
      }, and ${diningPreference} ` +
      `from ${originCityDoc.city} to ${destinationCityDoc.city} ` +
      `departing on ${fromDateStr} and returning on ${toDateStr} ` +
      `for a trip lasting approximately ${numNights} nights. ` +
      `The JSON object should have the structure: ` +
      `{"flight": <number>, "roomsPerNight": <number>, "foodDaily": <number>}. ` +
      `Return only the JSON object.`;

    const llmRawResult: string | { error: string } = await llm.specializedTool(prompt);

    if (typeof llmRawResult !== 'string') {
        // This means the LLM API call itself failed or returned an error object.
        return { error: llmRawResult.error };
    }

    // Parse the raw LLM response using the private method in the concept.
    const parsedCostEstimate = this._parseLLMCostEstimate(llmRawResult);

    if ('error' in parsedCostEstimate) {
        return { error: parsedCostEstimate.error };
    }

    const flightCost = parsedCostEstimate.flight ?? 0;
    const roomsPerNightCost = parsedCostEstimate.roomsPerNight ?? 0;
    const foodDailyCost = parsedCostEstimate.foodDaily ?? 0;

    // Basic validation for wide inaccuracies
    if (
      flightCost < 50 || flightCost > 100000 ||
      roomsPerNightCost < 0 || roomsPerNightCost > 5000 ||
      foodDailyCost < 0 || foodDailyCost > 1000
    ) {
      return {
        error:
          "LLM provided cost estimates are widely inaccurate or outside reasonable bounds. Please consider manual input.",
      };
    }

    const newCostEstimateID = freshID();
    const newCostEstimate: CostEstimatesDoc = {
      _id: newCostEstimateID,
      travelPlanID: travelPlan,
      flight: flightCost,
      roomsPerNight: roomsPerNightCost,
      foodDaily: foodDailyCost,
      lastUpdated: new Date(),
    };

    // Replace any existing estimate for this travel plan
    await this.costEstimates.replaceOne(
      { travelPlanID: travelPlan },
      newCostEstimate,
      { upsert: true },
    );

    return { costEstimate: newCostEstimateID };
  }

  /**
   * estimateCost (user: User, travelPlan: TravelPlan): (totalCost: Number)
   *
   * **requires** `travelPlan` exists and belongs to user and an associated `CostEstimate` exists
   *
   * **effects** Calculates and returns the `totalCost` by multiplying the estimated daily/nightly costs by the duration and adding the flight cost.
   */
  async estimateCost(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<{ totalCost: number } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const costEstimate = await this.costEstimates.findOne({
      travelPlanID: travelPlan,
    });

    if (!costEstimate) {
      return { error: "No cost estimate found for this travel plan." };
    }

    // Calculate number of days (inclusive of arrival day if departing on same day as arrival, min 1 day)
    const numDays = Math.max(
      1, // Ensure at least 1 day for calculation if fromDate and toDate are the same
      Math.ceil(
        (existingTravelPlan.toDate.getTime() -
          existingTravelPlan.fromDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    // Assuming numDays also represents nights for roomsPerNight for simplification
    // For more accuracy, one might adjust `numNights` for accommodation calculations:
    // `numNights = Math.max(0, Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)))`
    // However, the problem statement uses 'numNights' as the duration for the prompt,
    // and 'roomsPerNight' is often calculated based on full nights stay.
    // Sticking to `numDays` for both for consistency with earlier `numNights` calculation in `generateAICostEstimate`.
    const totalCost = costEstimate.flight +
      (costEstimate.roomsPerNight * numDays) +
      (costEstimate.foodDaily * numDays);

    return { totalCost: totalCost };
  }

  // --- Queries ---

  /**
   * _getAllTravelPlans (user: User): (travelPlans: TravelPlansDoc[])
   *
   * **requires** `user` exists
   *
   * **effects** Returns a list of all `TravelPlans` associated with the given `user`.
   */
  async _getAllTravelPlans(
    { user }: { user: ID },
  ): Promise<TravelPlansDoc[] | { error: string }[]> {
    // Check if user exists (as per "requires" clause).
    // If user doesn't exist, return an error as specified for typical error handling.
    const userExists = await this.users.findOne({ _id: user });
    if (!userExists) {
      return [{ error: `User with ID ${user} does not exist.` }];
    }

    const plans = await this.travelPlans.find({ userID: user }).toArray();

    return plans;
  }
}
```

# prompt: Given that the gemini-llm class is the below implement TripCostEstimation
``` typescript
/**

 * LLM Integration for TripCostEstimation

 *

 * Handles cost estimation requests using Google's Gemini API with robust error handling,

 * timeouts, retries with exponential backoff, and comprehensive validation.

 */

  

import { GoogleGenerativeAI } from '@google/generative-ai';

  

/**

 * Configuration for API access

 */

export interface Config {

    apiKey: string;

}

  

/**

 * Configuration for retry behavior

 */

interface RetryConfig {

    maxRetries: number;

    baseDelayMs: number;

    maxDelayMs: number;

    timeoutMs: number;

}

  

export class GeminiLLM {

    private apiKey: string;

    private retryConfig: RetryConfig;

  

    constructor(config: Config) {

        this.apiKey = config.apiKey;

        this.retryConfig = {

            maxRetries: 3,

            baseDelayMs: 1000,

            maxDelayMs: 10000,

            timeoutMs: 30000

        };

    }

  

    /**

     * Execute LLM with timeout, retries, and exponential backoff

     * @requires prompt is a non-empty string

     * @returns Promise<string> containing the LLM response

     */

    async executeLLM(prompt: string): Promise<string> {

        if (!prompt || prompt.trim().length === 0) {

            throw new Error('Prompt cannot be empty or null');

        }

  

        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {

            try {

                const result = await this.executeWithTimeout(prompt);

                return result;

            } catch (error) {

                lastError = error as Error;

                // Don't retry on certain types of errors

                if (this.isNonRetryableError(error as Error)) {

                    throw new Error(`Non-retryable error: ${(error as Error).message}`);

                }

                // If this is the last attempt, throw the error

                if (attempt === this.retryConfig.maxRetries) {

                    break;

                }

                // Calculate delay with exponential backoff

                const delay = Math.min(

                    this.retryConfig.baseDelayMs * Math.pow(2, attempt),

                    this.retryConfig.maxDelayMs

                );

                console.log(`❌ Attempt ${attempt + 1} failed: ${(error as Error).message}. Retrying in ${delay}ms...`);

                await this.sleep(delay);

            }

        }

        throw new Error(`LLM request failed after ${this.retryConfig.maxRetries + 1} attempts. Last error: ${lastError?.message}`);

    }

  

    /**

     * Execute LLM request with timeout

     */

    private async executeWithTimeout(prompt: string): Promise<string> {

        const timeoutPromise = new Promise<never>((_, reject) => {

            setTimeout(() => {

                reject(new Error(`LLM request timed out after ${this.retryConfig.timeoutMs}ms`));

            }, this.retryConfig.timeoutMs);

        });

  

        const llmPromise = this.callGeminiAPI(prompt);

        return Promise.race([llmPromise, timeoutPromise]);

    }

  

    /**

     * Make the actual API call to Gemini

     */

    private async callGeminiAPI(prompt: string): Promise<string> {

        try {

            // Initialize Gemini AI

            const genAI = new GoogleGenerativeAI(this.apiKey);

            const model = genAI.getGenerativeModel({

                model: "gemini-2.5-flash-lite",

                generationConfig: {

                    maxOutputTokens: 1000,

                    temperature: 0.1, // Lower temperature for more consistent responses

                }

            });

            // Execute the LLM

            const result = await model.generateContent(prompt);

            const response = await result.response;

            const text = response.text();

            if (!text || text.trim().length === 0) {

                throw new Error('LLM returned empty response');

            }

            return text;

        } catch (error) {

            const errorMessage = (error as Error).message;

            // Provide more specific error messages

            if (errorMessage.includes('API_KEY_INVALID')) {

                throw new Error('Invalid API key provided');

            } else if (errorMessage.includes('QUOTA_EXCEEDED')) {

                throw new Error('API quota exceeded - please try again later');

            } else if (errorMessage.includes('SAFETY')) {

                throw new Error('Request blocked by safety filters - please modify your prompt');

            } else if (errorMessage.includes('PERMISSION_DENIED')) {

                throw new Error('Permission denied - check your API key permissions');

            } else {

                throw new Error(`Gemini API error: ${errorMessage}`);

            }

        }

    }

  

    /**

     * Check if an error should not be retried

     */

    private isNonRetryableError(error: Error): boolean {

        const message = error.message.toLowerCase();

        return message.includes('invalid api key') ||

               message.includes('permission denied') ||

               message.includes('quota exceeded') ||

               message.includes('safety') ||

               message.includes('prompt cannot be empty');

    }

  

    /**

     * Sleep utility for delays

     */

    private sleep(ms: number): Promise<void> {

        return new Promise(resolve => setTimeout(resolve, ms));

    }

}
```
# response:

```typescript
// src/TripCostEstimation/TripCostEstimationConcept.ts

import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
// Import the GeminiLLM and its Config interface
import { GeminiLLM, Config as GeminiLLMConfig } from "@utils/gemini-llm.ts"; // Renamed Config to GeminiLLMConfig to avoid conflict

// Declare collection prefix, use concept name
const PREFIX = "TripCostEstimation" + ".";

/**
 * Interface for the structured cost estimate output that the LLM is expected to generate.
 * This defines the target structure for the parsing logic in the Concept class.
 */
interface CostEstimateResponse {
  flight?: number;
  roomsPerNight?: number;
  foodDaily?: number;
  // The `error` field is not part of the *successful* LLM response structure itself,
  // but rather part of the action's return type when an error occurs during API call or parsing.
}

/**
 * @purpose Generate realistic cost estimates based on trip details, using AI for data retrieval and calculation.
 * @principle Based on a user's choice of initial departure city and arrival city, and the user's sheltering
 *            accommodations and food location preferences, an estimate is provided; the LLM is used to search
 *            for and calculate median cost ranges based on the provided necessities.
 */
export default class TripCostEstimationConcept {
  // Generic types of this concept (all are IDs when referenced as foreign keys)
  // These are private to the class scope and only used for type branding, not actual object types.
  private type User = ID;
  private type Location = ID;
  private type TravelPlan = ID;
  private type Necessity = ID;
  private type CostEstimate = ID;

  // --- State Interfaces ---

  /**
   * A set of Users
   * (Documents store the user's ID. TravelPlans link back to User IDs.)
   */
  interface UsersDoc {
    _id: User;
    // No other properties explicitly defined by the state for a User itself,
    // as TravelPlans are linked to Users.
  }

  /**
   * A set of Locations with
   *   a city String
   */
  interface LocationsDoc {
    _id: Location;
    city: string;
  }

  /**
   * A set of TravelPlans with
   *   a `userID` User (Implicitly added for linking TravelPlans to Users)
   *   a `fromCity` Location (ID)
   *   a `toCity` Location (ID)
   *   a `fromDate` Date
   *   a `toDate` Date
   *   a `necessityID` Necessity (ID)
   */
  interface TravelPlansDoc {
    _id: TravelPlan;
    userID: User; // Link to UsersDoc
    fromCity: Location; // Link to LocationsDoc
    toCity: Location; // Link to LocationsDoc
    fromDate: Date;
    toDate: Date;
    necessityID: Necessity; // Link to NecessitiesDoc
  }

  /**
   * A set of Necessities with
   *   an `accommodation` Boolean
   *   a `diningFlag` Boolean
   */
  interface NecessitiesDoc {
    _id: Necessity;
    accommodation: boolean; // true for saving for rooms, false for not
    diningFlag: boolean; // true for saving for eating out, false for not
  }

  /**
   * A set of CostEstimates with
   *   a `travelPlanID` TravelPlan (ID)
   *   a `flight` Number // estimated total round-trip flight cost in USD
   *   a `roomsPerNight` Number // estimated cost per night in USD
   *   a `foodDaily` Number // estimated cost per day in USD
   *   a `lastUpdated` Date // tracking when the estimate was generated
   */
  interface CostEstimatesDoc {
    _id: CostEstimate;
    travelPlanID: TravelPlan; // Link to TravelPlansDoc
    flight: number; // estimated total round-trip flight cost in USD
    roomsPerNight: number; // estimated cost per night in USD
    foodDaily: number; // estimated cost per day in USD
    lastUpdated: Date; // tracking when the estimate was generated
  }

  // --- MongoDB Collections ---
  private users: Collection<UsersDoc>;
  private locations: Collection<LocationsDoc>;
  private travelPlans: Collection<TravelPlansDoc>;
  private necessities: Collection<NecessitiesDoc>;
  private costEstimates: Collection<CostEstimatesDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.locations = this.db.collection(PREFIX + "locations");
    this.travelPlans = this.db.collection(PREFIX + "travelPlans");
    this.necessities = this.db.collection(PREFIX + "necessities");
    this.costEstimates = this.db.collection(PREFIX + "costEstimates");
  }

  // --- Private Helper Methods ---

  /**
   * Parses the LLM's raw string response into a structured CostEstimateResponse object.
   * Assumes the LLM response is a JSON string, potentially wrapped in markdown.
   * This method is now private to the concept, enforcing separation of concerns
   * between LLM interaction and domain-specific parsing.
   * @param rawResponse The raw string output received from the LLM.
   * @returns CostEstimateResponse if parsing is successful, or an object with an `error` string.
   */
  private _parseLLMCostEstimate(
    rawResponse: string,
  ): CostEstimateResponse | { error: string } {
    try {
      let jsonString = rawResponse.trim();

      // Attempt to remove markdown code block wrappers if present
      if (jsonString.startsWith("```json") && jsonString.endsWith("```")) {
        jsonString = jsonString.substring(7, jsonString.length - 3).trim();
      } else if (jsonString.startsWith("```") && jsonString.endsWith("```")) {
        jsonString = jsonString.substring(3, jsonString.length - 3).trim();
      }

      const parsed = JSON.parse(jsonString);

      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("LLM response is not a valid JSON object.");
      }

      const costEstimate: CostEstimateResponse = {};
      if (typeof parsed.flight === "number") costEstimate.flight = parsed.flight;
      if (typeof parsed.roomsPerNight === "number") {
        costEstimate.roomsPerNight = parsed.roomsPerNight;
      }
      if (typeof parsed.foodDaily === "number") costEstimate.foodDaily = parsed.foodDaily;

      // Log warnings for unexpected types but still return what was successfully parsed
      if (parsed.flight !== undefined && typeof parsed.flight !== "number") {
        console.warn("LLM response 'flight' field is not a number:", parsed.flight);
      }
      if (
        parsed.roomsPerNight !== undefined &&
        typeof parsed.roomsPerNight !== "number"
      ) {
        console.warn(
          "LLM response 'roomsPerNight' field is not a number:",
          parsed.roomsPerNight,
        );
      }
      if (parsed.foodDaily !== undefined && typeof parsed.foodDaily !== "number") {
        console.warn(
          "LLM response 'foodDaily' field is not a number:",
          parsed.foodDaily,
        );
      }

      // Check if any *expected* fields are missing or invalid after parsing,
      // and if so, return an error. The prompt explicitly asks for these.
      if (
        costEstimate.flight === undefined ||
        costEstimate.roomsPerNight === undefined ||
        costEstimate.foodDaily === undefined
      ) {
        // If at least one of the primary expected cost fields is missing/invalid,
        // consider the parsing unsuccessful for a full estimate.
        return {
          error:
            `LLM response could not be parsed into all required cost components (flight, roomsPerNight, foodDaily). Raw: ${jsonString}`,
        };
      }

      return costEstimate;
    } catch (e) {
      console.error("Failed to parse LLM response:", rawResponse, e);
      return { error: `Failed to parse LLM response into expected JSON format: ${(e as Error).message}` };
    }
  }

  // --- Actions ---

  /**
   * createTravelPlan (user: User, fromCity: Location, toCity: Location, fromDate: Date, toDate: Date): (travelPlan: TravelPlan)
   *
   * **requires** `fromCity` and `toCity` exists and `toDate` >= `fromDate` and both are greater than the current date
   *
   * **effects** Create and return a `travelPlan` with a `fromCity`, `toCity`, and from and to dates, and a default necessity (`accommodation` = true, `diningFlag` = true)
   */
  async createTravelPlan(
    {
      user,
      fromCity,
      toCity,
      fromDate,
      toDate,
    }: {
      user: ID;
      fromCity: ID;
      toCity: ID;
      fromDate: Date;
      toDate: Date;
    },
  ): Promise<{ travelPlan: ID } | { error: string }> {
    // Requires: fromCity and toCity exist
    const origin = await this.locations.findOne({ _id: fromCity });
    const destination = await this.locations.findOne({ _id: toCity });

    if (!origin) {
      return { error: `Origin city with ID ${fromCity} not found.` };
    }
    if (!destination) {
      return { error: `Destination city with ID ${toCity} not found.` };
    }

    // Requires: toDate >= fromDate
    if (toDate < fromDate) {
      return { error: "Arrival date must be on or after departure date." };
    }

    // Requires: both dates are greater than the current date
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
    if (fromDate < now || toDate < now) {
      return { error: "Departure and arrival dates must be in the future." };
    }

    // Ensure the user exists (or create a placeholder if not found, depending on domain logic)
    await this.users.updateOne(
      { _id: user },
      { $setOnInsert: { _id: user } },
      { upsert: true },
    );

    // Create default Necessity
    const newNecessityID = freshID();
    const newNecessity: NecessitiesDoc = {
      _id: newNecessityID,
      accommodation: true,
      diningFlag: true,
    };
    await this.necessities.insertOne(newNecessity);

    // Create TravelPlan
    const newTravelPlanID = freshID();
    const newTravelPlan: TravelPlansDoc = {
      _id: newTravelPlanID,
      userID: user,
      fromCity: fromCity,
      toCity: toCity,
      fromDate: fromDate,
      toDate: toDate,
      necessityID: newNecessityID,
    };
    await this.travelPlans.insertOne(newTravelPlan);

    return { travelPlan: newTravelPlanID };
  }

  /**
   * deleteTravelPlan (user: User, travelPlan: TravelPlan): Empty
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Delete the `travelPlan` and any associated `CostEstimates` and `Necessities`
   */
  async deleteTravelPlan(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<Empty | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    // Delete associated CostEstimates
    await this.costEstimates.deleteMany({ travelPlanID: travelPlan });

    // Delete associated Necessity
    await this.necessities.deleteOne({ _id: existingTravelPlan.necessityID });

    // Delete the TravelPlan itself
    await this.travelPlans.deleteOne({ _id: travelPlan });

    return {};
  }

  /**
   * updateNecessity (user: User, travelPlan: TravelPlan, accommodation: Boolean, diningFlag: Boolean): (travelPlan: TravelPlan, necessity: Necessity)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Create and add the `necessity` with `accommodation` and `diningFlag` to `travelPlan` (updates existing necessity)
   */
  async updateNecessity(
    {
      user,
      travelPlan,
      accommodation,
      diningFlag,
    }: {
      user: ID;
      travelPlan: ID;
      accommodation: boolean;
      diningFlag: boolean;
    },
  ): Promise<{ travelPlan: ID; necessity: ID } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const updateResult = await this.necessities.updateOne(
      { _id: existingTravelPlan.necessityID },
      { $set: { accommodation: accommodation, diningFlag: diningFlag } },
    );

    if (updateResult.matchedCount === 0) {
      // This should ideally not happen if travelPlan.necessityID is always valid
      return { error: "Associated necessity not found." };
    }

    return {
      travelPlan: travelPlan,
      necessity: existingTravelPlan.necessityID,
    };
  }

  /**
   * resetNecessity (user: User, travelPlan: TravelPlan): Empty
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Reset the `necessity` belonging to `travelPlan` to the default as described in the action `createTravelPlan`
   */
  async resetNecessity(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<Empty | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const updateResult = await this.necessities.updateOne(
      { _id: existingTravelPlan.necessityID },
      { $set: { accommodation: true, diningFlag: true } }, // Default values
    );

    if (updateResult.matchedCount === 0) {
      return { error: "Associated necessity not found." };
    }

    return {};
  }

  /**
   * generateAICostEstimate (user: User, travelPlan: TravelPlan, llm: GeminiLLM): (costEstimate: CostEstimate)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Retrieves trip details (dates, locations) and necessity preference (accommodation, dining) and uses the llm's specialized tool (e.g., Google Search/Flights/Hotels) to calculate and return the median cost estimates for flight, `rooms_per_night`, and `food_daily`; the resulting data is stored as a new `CostEstimate` associated with the `travelPlanID`.
   * **Note:** The LLM prompt will be specifically tailored to search for accommodation prices matching the `accommodation` Boolean (e.g., true for hotel/motel costs) and food costs based on the `diningFlag` (true for "restaurant costs," false for "no food costs"). If the LLM fails to provide an estimate for any reason or the costs are widely inaccurate (less than 50, more than 100000 for example) then the user can manually enter the total cost of the trip that they plan to save for.
   */
  async generateAICostEstimate(
    { user, travelPlan, llm }: { user: ID; travelPlan: ID; llm: GeminiLLM }, // `llm` type is now `GeminiLLM`
  ): Promise<{ costEstimate: ID } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const [originCityDoc, destinationCityDoc, necessityDoc] = await Promise.all(
      [
        this.locations.findOne({ _id: existingTravelPlan.fromCity }),
        this.locations.findOne({ _id: existingTravelPlan.toCity }),
        this.necessities.findOne({ _id: existingTravelPlan.necessityID }),
      ],
    );

    if (!originCityDoc || !destinationCityDoc || !necessityDoc) {
      return { error: "Referenced location or necessity data not found." };
    }

    const numNights = Math.ceil(
      (existingTravelPlan.toDate.getTime() -
        existingTravelPlan.fromDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const fromDateStr = existingTravelPlan.fromDate.toISOString().split("T")[0];
    const toDateStr = existingTravelPlan.toDate.toISOString().split("T")[0];

    const accommodationPreference = necessityDoc.accommodation
      ? "hotel/motel costs"
      : "no accommodation costs (e.g., staying with friends/family)";
    const diningPreference = necessityDoc.diningFlag
      ? "daily restaurant food costs"
      : "no food costs (e.g., cooking own meals)";

    // Prompt explicitly asks for JSON, as the LLM utility is configured for it.
    const prompt =
      `Please provide a cost estimate in JSON format for a trip. ` +
      `Estimate median round-trip flight, ${
        accommodationPreference
      }, and ${diningPreference} ` +
      `from ${originCityDoc.city} to ${destinationCityDoc.city} ` +
      `departing on ${fromDateStr} and returning on ${toDateStr} ` +
      `for a trip lasting approximately ${numNights} nights. ` +
      `The JSON object should have the structure: ` +
      `{"flight": <number>, "roomsPerNight": <number>, "foodDaily": <number>}. ` +
      `Return only the JSON object.`;

    let llmRawResult: string;
    try {
      llmRawResult = await llm.executeLLM(prompt);
    } catch (llmError) {
      // Catch errors thrown by GeminiLLM.executeLLM
      return { error: `LLM API call failed: ${(llmError as Error).message}` };
    }

    // Parse the raw LLM response using the private method in the concept.
    const parsedCostEstimate = this._parseLLMCostEstimate(llmRawResult);

    if ("error" in parsedCostEstimate) {
      return { error: parsedCostEstimate.error };
    }

    const flightCost = parsedCostEstimate.flight ?? 0;
    const roomsPerNightCost = parsedCostEstimate.roomsPerNight ?? 0;
    const foodDailyCost = parsedCostEstimate.foodDaily ?? 0;

    // Basic validation for wide inaccuracies
    if (
      flightCost < 50 || flightCost > 100000 ||
      roomsPerNightCost < 0 || roomsPerNightCost > 5000 ||
      foodDailyCost < 0 || foodDailyCost > 1000
    ) {
      return {
        error:
          "LLM provided cost estimates are widely inaccurate or outside reasonable bounds. Please consider manual input.",
      };
    }

    const newCostEstimateID = freshID();
    const newCostEstimate: CostEstimatesDoc = {
      _id: newCostEstimateID,
      travelPlanID: travelPlan,
      flight: flightCost,
      roomsPerNight: roomsPerNightCost,
      foodDaily: foodDailyCost,
      lastUpdated: new Date(),
    };

    // Replace any existing estimate for this travel plan
    await this.costEstimates.replaceOne(
      { travelPlanID: travelPlan },
      newCostEstimate,
      { upsert: true },
    );

    return { costEstimate: newCostEstimateID };
  }

  /**
   * estimateCost (user: User, travelPlan: TravelPlan): (totalCost: Number)
   *
   * **requires** `travelPlan` exists and belongs to user and an associated `CostEstimate` exists
   *
   * **effects** Calculates and returns the `totalCost` by multiplying the estimated daily/nightly costs by the duration and adding the flight cost.
   */
  async estimateCost(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<{ totalCost: number } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const costEstimate = await this.costEstimates.findOne({
      travelPlanID: travelPlan,
    });

    if (!costEstimate) {
      return { error: "No cost estimate found for this travel plan." };
    }

    // Calculate number of days (inclusive of arrival day if departing on same day as arrival, min 1 day)
    const numDays = Math.max(
      1, // Ensure at least 1 day for calculation if fromDate and toDate are the same
      Math.ceil(
        (existingTravelPlan.toDate.getTime() -
          existingTravelPlan.fromDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    // Assuming numDays also represents nights for roomsPerNight for simplification
    // For more accuracy, one might adjust `numNights` for accommodation calculations:
    // `numNights = Math.max(0, Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)))`
    // However, the problem statement uses 'numNights' as the duration for the prompt,
    // and 'roomsPerNight' is often calculated based on full nights stay.
    // Sticking to `numDays` for both for consistency with earlier `numNights` calculation in `generateAICostEstimate`.
    const totalCost = costEstimate.flight +
      (costEstimate.roomsPerNight * numDays) +
      (costEstimate.foodDaily * numDays);

    return { totalCost: totalCost };
  }

  // --- Queries ---

  /**
   * _getAllTravelPlans (user: User): (travelPlans: TravelPlansDoc[])
   *
   * **requires** `user` exists
   *
   * **effects** Returns a list of all `TravelPlans` associated with the given `user`.
   */
  async _getAllTravelPlans(
    { user }: { user: ID },
  ): Promise<TravelPlansDoc[] | { error: string }[]> {
    // Check if user exists (as per "requires" clause).
    // If user doesn't exist, return an error as specified for typical error handling.
    const userExists = await this.users.findOne({ _id: user });
    if (!userExists) {
      return [{ error: `User with ID ${user} does not exist.` }];
    }

    const plans = await this.travelPlans.find({ userID: user }).toArray();

    return plans;
  }
}
```

# prompt: ONLY provide changed code for _getAllTravelPlans the output should be list of TravelPlan id's not TravelPlansDoc
# response:

```typescript
// src/TripCostEstimation/TripCostEstimationConcept.ts

// ... (other imports and class definition remain the same)

export default class TripCostEstimationConcept {
  // ... (existing state interfaces, collections, and other methods)

  // --- Queries ---

  /**
   * _getAllTravelPlans (user: User): (travelPlans: TravelPlan[])
   *
   * **requires** `user` exists
   *
   * **effects** Returns a list of all `TravelPlan` IDs associated with the given `user`.
   */
  async _getAllTravelPlans(
    { user }: { user: ID },
  ): Promise<ID[] | { error: string }[]> { // Changed return type to ID[]
    // Check if user exists (as per "requires" clause).
    // If user doesn't exist, return an error as specified for typical error handling.
    const userExists = await this.users.findOne({ _id: user });
    if (!userExists) {
      return [{ error: `User with ID ${user} does not exist.` }];
    }

    // Project only the _id field
    const plans = await this.travelPlans.find({ userID: user }, {
      projection: { _id: 1 },
    }).toArray();

    // Map to an array of IDs
    return plans.map((plan) => plan._id);
  }
}
```

# prompt: can further specify from Promise of ID[] to TravelPlan[] as type TravelPlan = ID
# response:

```typescript
// src/TripCostEstimation/TripCostEstimationConcept.ts

// ... (other imports and class definition remain the same)

export default class TripCostEstimationConcept {
  // ... (existing generic types, state interfaces, collections, and other methods)

  // --- Queries ---

  /**
   * _getAllTravelPlans (user: User): (travelPlans: TravelPlan[])
   *
   * **requires** `user` exists
   *
   * **effects** Returns a list of all `TravelPlan` IDs associated with the given `user`.
   */
  async _getAllTravelPlans(
    { user }: { user: ID },
  ): Promise<TravelPlan[] | { error: string }[]> { // Changed return type to TravelPlan[]
    // Check if user exists (as per "requires" clause).
    // If user doesn't exist, return an error as specified for typical error handling.
    const userExists = await this.users.findOne({ _id: user });
    if (!userExists) {
      return [{ error: `User with ID ${user} does not exist.` }];
    }

    // Project only the _id field
    const plans = await this.travelPlans.find({ userID: user }, {
      projection: { _id: 1 },
    }).toArray();

    // Map to an array of TravelPlan IDs (which are of type ID)
    return plans.map((plan) => plan._id as TravelPlan); // Explicitly cast to TravelPlan for type safety
  }
}
```

# prompt: I think there are some "mismatching" "brackets" issue causing syntax errors in the below code: 
``` typescript
import { Collection, Db } from "npm:mongodb";

import { ID, Empty } from "@utils/types.ts";

import { freshID } from "@utils/database.ts";

// Import the GeminiLLM and its Config interface

import { GeminiLLM, Config as GeminiLLMConfig } from "@utils/gemini-llm.ts"; // Renamed Config to GeminiLLMConfig to avoid conflict

  

// Declare collection prefix, use concept name

const PREFIX = "TripCostEstimation" + ".";

  

/**

 * Interface for the structured cost estimate output that the LLM is expected to generate.

 * This defines the target structure for the parsing logic in the Concept class.

 */

interface CostEstimateResponse {

  flight?: number;

  roomsPerNight?: number;

  foodDaily?: number;

  // The `error` field is not part of the *successful* LLM response structure itself,

  // but rather part of the action's return type when an error occurs during API call or parsing.

}

  

/**

 * @purpose Generate realistic cost estimates based on trip details, using AI for data retrieval and calculation.

 * @principle Based on a user's choice of initial departure city and arrival city, and the user's sheltering

 *            accommodations and food location preferences, an estimate is provided; the LLM is used to search

 *            for and calculate median cost ranges based on the provided necessities.

 */

export default class TripCostEstimationConcept {

  // Generic types of this concept (all are IDs when referenced as foreign keys)

  // These are private to the class scope and only used for type branding, not actual object types.

  private type User = ID;

  private type Location = ID;

  private type TravelPlan = ID;

  private type Necessity = ID;

  private type CostEstimate = ID;

  

  // --- State Interfaces ---

  

  /**

   * A set of Users

   * (Documents store the user's ID. TravelPlans link back to User IDs.)

   */

  interface UsersDoc {

    _id: User;

    // No other properties explicitly defined by the state for a User itself,

    // as TravelPlans are linked to Users.

  }

  

  /**

   * A set of Locations with

   *   a city String

   */

  interface LocationsDoc {

    _id: Location;

    city: string;

  }

  

  /**

   * A set of TravelPlans with

   *   a `userID` User (Implicitly added for linking TravelPlans to Users)

   *   a `fromCity` Location (ID)

   *   a `toCity` Location (ID)

   *   a `fromDate` Date

   *   a `toDate` Date

   *   a `necessityID` Necessity (ID)

   */

  interface TravelPlansDoc {

    _id: TravelPlan;

    userID: User; // Link to UsersDoc

    fromCity: Location; // Link to LocationsDoc

    toCity: Location; // Link to LocationsDoc

    fromDate: Date;

    toDate: Date;

    necessityID: Necessity; // Link to NecessitiesDoc

  }

  

  /**

   * A set of Necessities with

   *   an `accommodation` Boolean

   *   a `diningFlag` Boolean

   */

  interface NecessitiesDoc {

    _id: Necessity;

    accommodation: boolean; // true for saving for rooms, false for not

    diningFlag: boolean; // true for saving for eating out, false for not

  }

  

  /**

   * A set of CostEstimates with

   *   a `travelPlanID` TravelPlan (ID)

   *   a `flight` Number // estimated total round-trip flight cost in USD

   *   a `roomsPerNight` Number // estimated cost per night in USD

   *   a `foodDaily` Number // estimated cost per day in USD

   *   a `lastUpdated` Date // tracking when the estimate was generated

   */

  interface CostEstimatesDoc {

    _id: CostEstimate;

    travelPlanID: TravelPlan; // Link to TravelPlansDoc

    flight: number; // estimated total round-trip flight cost in USD

    roomsPerNight: number; // estimated cost per night in USD

    foodDaily: number; // estimated cost per day in USD

    lastUpdated: Date; // tracking when the estimate was generated

  }

  

  // --- MongoDB Collections ---

  private users: Collection<UsersDoc>;

  private locations: Collection<LocationsDoc>;

  private travelPlans: Collection<TravelPlansDoc>;

  private necessities: Collection<NecessitiesDoc>;

  private costEstimates: Collection<CostEstimatesDoc>;

  

  constructor(private readonly db: Db) {

    this.users = this.db.collection(PREFIX + "users");

    this.locations = this.db.collection(PREFIX + "locations");

    this.travelPlans = this.db.collection(PREFIX + "travelPlans");

    this.necessities = this.db.collection(PREFIX + "necessities");

    this.costEstimates = this.db.collection(PREFIX + "costEstimates");

  }

  

  // --- Private Helper Methods ---

  

  /**

   * Parses the LLM's raw string response into a structured CostEstimateResponse object.

   * Assumes the LLM response is a JSON string, potentially wrapped in markdown.

   * This method is now private to the concept, enforcing separation of concerns

   * between LLM interaction and domain-specific parsing.

   * @param rawResponse The raw string output received from the LLM.

   * @returns CostEstimateResponse if parsing is successful, or an object with an `error` string.

   */

  private _parseLLMCostEstimate(

    rawResponse: string,

  ): CostEstimateResponse | { error: string } {

    try {

      let jsonString = rawResponse.trim();

  

      // Attempt to remove markdown code block wrappers if present

      if (jsonString.startsWith("```json") && jsonString.endsWith("```")) {

        jsonString = jsonString.substring(7, jsonString.length - 3).trim();

      } else if (jsonString.startsWith("```") && jsonString.endsWith("```")) {

        jsonString = jsonString.substring(3, jsonString.length - 3).trim();

      }

  

      const parsed = JSON.parse(jsonString);

  

      if (typeof parsed !== "object" || parsed === null) {

        throw new Error("LLM response is not a valid JSON object.");

      }

  

      const costEstimate: CostEstimateResponse = {};

      if (typeof parsed.flight === "number") costEstimate.flight = parsed.flight;

      if (typeof parsed.roomsPerNight === "number") {

        costEstimate.roomsPerNight = parsed.roomsPerNight;

      }

      if (typeof parsed.foodDaily === "number") costEstimate.foodDaily = parsed.foodDaily;

  

      // Log warnings for unexpected types but still return what was successfully parsed

      if (parsed.flight !== undefined && typeof parsed.flight !== "number") {

        console.warn("LLM response 'flight' field is not a number:", parsed.flight);

      }

      if (

        parsed.roomsPerNight !== undefined &&

        typeof parsed.roomsPerNight !== "number"

      ) {

        console.warn(

          "LLM response 'roomsPerNight' field is not a number:",

          parsed.roomsPerNight,

        );

      }

      if (parsed.foodDaily !== undefined && typeof parsed.foodDaily !== "number") {

        console.warn(

          "LLM response 'foodDaily' field is not a number:",

          parsed.foodDaily,

        );

      }

  

      // Check if any *expected* fields are missing or invalid after parsing,

      // and if so, return an error. The prompt explicitly asks for these.

      if (

        costEstimate.flight === undefined ||

        costEstimate.roomsPerNight === undefined ||

        costEstimate.foodDaily === undefined

      ) {

        // If at least one of the primary expected cost fields is missing/invalid,

        // consider the parsing unsuccessful for a full estimate.

        return {

          error:

            `LLM response could not be parsed into all required cost components (flight, roomsPerNight, foodDaily). Raw: ${jsonString}`,

        };

      }

  

      return costEstimate;

    } catch (e) {

      console.error("Failed to parse LLM response:", rawResponse, e);

      return { error: `Failed to parse LLM response into expected JSON format: ${(e as Error).message}` };

    }

  }

  

  // --- Actions ---

  

  /**

   * createTravelPlan (user: User, fromCity: Location, toCity: Location, fromDate: Date, toDate: Date): (travelPlan: TravelPlan)

   *

   * **requires** `fromCity` and `toCity` exists and `toDate` >= `fromDate` and both are greater than the current date

   *

   * **effects** Create and return a `travelPlan` with a `fromCity`, `toCity`, and from and to dates, and a default necessity (`accommodation` = true, `diningFlag` = true)

   */

  async createTravelPlan(

    {

      user,

      fromCity,

      toCity,

      fromDate,

      toDate,

    }: {

      user: ID;

      fromCity: ID;

      toCity: ID;

      fromDate: Date;

      toDate: Date;

    },

  ): Promise<{ travelPlan: ID } | { error: string }> {

    // Requires: fromCity and toCity exist

    const origin = await this.locations.findOne({ _id: fromCity });

    const destination = await this.locations.findOne({ _id: toCity });

  

    if (!origin) {

      return { error: `Origin city with ID ${fromCity} not found.` };

    }

    if (!destination) {

      return { error: `Destination city with ID ${toCity} not found.` };

    }

  

    // Requires: toDate >= fromDate

    if (toDate < fromDate) {

      return { error: "Arrival date must be on or after departure date." };

    }

  

    // Requires: both dates are greater than the current date

    const now = new Date();

    now.setHours(0, 0, 0, 0); // Normalize to start of day for comparison

    if (fromDate < now || toDate < now) {

      return { error: "Departure and arrival dates must be in the future." };

    }

  

    // Ensure the user exists (or create a placeholder if not found, depending on domain logic)

    await this.users.updateOne(

      { _id: user },

      { $setOnInsert: { _id: user } },

      { upsert: true },

    );

  

    // Create default Necessity

    const newNecessityID = freshID();

    const newNecessity: NecessitiesDoc = {

      _id: newNecessityID,

      accommodation: true,

      diningFlag: true,

    };

    await this.necessities.insertOne(newNecessity);

  

    // Create TravelPlan

    const newTravelPlanID = freshID();

    const newTravelPlan: TravelPlansDoc = {

      _id: newTravelPlanID,

      userID: user,

      fromCity: fromCity,

      toCity: toCity,

      fromDate: fromDate,

      toDate: toDate,

      necessityID: newNecessityID,

    };

    await this.travelPlans.insertOne(newTravelPlan);

  

    return { travelPlan: newTravelPlanID };

  }

  

  /**

   * deleteTravelPlan (user: User, travelPlan: TravelPlan): Empty

   *

   * **requires** `travelPlan` exists and belongs to user

   *

   * **effects** Delete the `travelPlan` and any associated `CostEstimates` and `Necessities`

   */

  async deleteTravelPlan(

    { user, travelPlan }: { user: ID; travelPlan: ID },

  ): Promise<Empty | { error: string }> {

    const existingTravelPlan = await this.travelPlans.findOne({

      _id: travelPlan,

      userID: user,

    });

  

    if (!existingTravelPlan) {

      return {

        error: "Travel plan not found or does not belong to the user.",

      };

    }

  

    // Delete associated CostEstimates

    await this.costEstimates.deleteMany({ travelPlanID: travelPlan });

  

    // Delete associated Necessity

    await this.necessities.deleteOne({ _id: existingTravelPlan.necessityID });

  

    // Delete the TravelPlan itself

    await this.travelPlans.deleteOne({ _id: travelPlan });

  

    return {};

  }

  

  /**

   * updateNecessity (user: User, travelPlan: TravelPlan, accommodation: Boolean, diningFlag: Boolean): (travelPlan: TravelPlan, necessity: Necessity)

   *

   * **requires** `travelPlan` exists and belongs to user

   *

   * **effects** Create and add the `necessity` with `accommodation` and `diningFlag` to `travelPlan` (updates existing necessity)

   */

  async updateNecessity(

    {

      user,

      travelPlan,

      accommodation,

      diningFlag,

    }: {

      user: ID;

      travelPlan: ID;

      accommodation: boolean;

      diningFlag: boolean;

    },

  ): Promise<{ travelPlan: ID; necessity: ID } | { error: string }> {

    const existingTravelPlan = await this.travelPlans.findOne({

      _id: travelPlan,

      userID: user,

    });

  

    if (!existingTravelPlan) {

      return {

        error: "Travel plan not found or does not belong to the user.",

      };

    }

  

    const updateResult = await this.necessities.updateOne(

      { _id: existingTravelPlan.necessityID },

      { $set: { accommodation: accommodation, diningFlag: diningFlag } },

    );

  

    if (updateResult.matchedCount === 0) {

      // This should ideally not happen if travelPlan.necessityID is always valid

      return { error: "Associated necessity not found." };

    }

  

    return {

      travelPlan: travelPlan,

      necessity: existingTravelPlan.necessityID,

    };

  }

  

  /**

   * resetNecessity (user: User, travelPlan: TravelPlan): Empty

   *

   * **requires** `travelPlan` exists and belongs to user

   *

   * **effects** Reset the `necessity` belonging to `travelPlan` to the default as described in the action `createTravelPlan`

   */

  async resetNecessity(

    { user, travelPlan }: { user: ID; travelPlan: ID },

  ): Promise<Empty | { error: string }> {

    const existingTravelPlan = await this.travelPlans.findOne({

      _id: travelPlan,

      userID: user,

    });

  

    if (!existingTravelPlan) {

      return {

        error: "Travel plan not found or does not belong to the user.",

      };

    }

  

    const updateResult = await this.necessities.updateOne(

      { _id: existingTravelPlan.necessityID },

      { $set: { accommodation: true, diningFlag: true } }, // Default values

    );

  

    if (updateResult.matchedCount === 0) {

      return { error: "Associated necessity not found." };

    }

  

    return {};

  }

  

  /**

   * generateAICostEstimate (user: User, travelPlan: TravelPlan, llm: GeminiLLM): (costEstimate: CostEstimate)

   *

   * **requires** `travelPlan` exists and belongs to user

   *

   * **effects** Retrieves trip details (dates, locations) and necessity preference (accommodation, dining) and uses the llm's specialized tool (e.g., Google Search/Flights/Hotels) to calculate and return the median cost estimates for flight, `rooms_per_night`, and `food_daily`; the resulting data is stored as a new `CostEstimate` associated with the `travelPlanID`.

   * **Note:** The LLM prompt will be specifically tailored to search for accommodation prices matching the `accommodation` Boolean (e.g., true for hotel/motel costs) and food costs based on the `diningFlag` (true for "restaurant costs," false for "no food costs"). If the LLM fails to provide an estimate for any reason or the costs are widely inaccurate (less than 50, more than 100000 for example) then the user can manually enter the total cost of the trip that they plan to save for.

   */

  async generateAICostEstimate(

    { user, travelPlan, llm }: { user: ID; travelPlan: ID; llm: GeminiLLM }, // `llm` type is now `GeminiLLM`

  ): Promise<{ costEstimate: ID } | { error: string }> {

    const existingTravelPlan = await this.travelPlans.findOne({

      _id: travelPlan,

      userID: user,

    });

  

    if (!existingTravelPlan) {

      return {

        error: "Travel plan not found or does not belong to the user.",

      };

    }

  

    const [originCityDoc, destinationCityDoc, necessityDoc] = await Promise.all(

      [

        this.locations.findOne({ _id: existingTravelPlan.fromCity }),

        this.locations.findOne({ _id: existingTravelPlan.toCity }),

        this.necessities.findOne({ _id: existingTravelPlan.necessityID }),

      ],

    );

  

    if (!originCityDoc || !destinationCityDoc || !necessityDoc) {

      return { error: "Referenced location or necessity data not found." };

    }

  

    const numNights = Math.ceil(

      (existingTravelPlan.toDate.getTime() -

        existingTravelPlan.fromDate.getTime()) /

        (1000 * 60 * 60 * 24),

    );

    const fromDateStr = existingTravelPlan.fromDate.toISOString().split("T")[0];

    const toDateStr = existingTravelPlan.toDate.toISOString().split("T")[0];

  

    const accommodationPreference = necessityDoc.accommodation

      ? "hotel/motel costs"

      : "no accommodation costs (e.g., staying with friends/family)";

    const diningPreference = necessityDoc.diningFlag

      ? "daily restaurant food costs"

      : "no food costs (e.g., cooking own meals)";

  

    // Prompt explicitly asks for JSON, as the LLM utility is configured for it.

    const prompt =

      `Please provide a cost estimate in JSON format for a trip. ` +

      `Estimate median round-trip flight, ${

        accommodationPreference

      }, and ${diningPreference} ` +

      `from ${originCityDoc.city} to ${destinationCityDoc.city} ` +

      `departing on ${fromDateStr} and returning on ${toDateStr} ` +

      `for a trip lasting approximately ${numNights} nights. ` +

      `The JSON object should have the structure: ` +

      `{"flight": <number>, "roomsPerNight": <number>, "foodDaily": <number>}. ` +

      `Return only the JSON object.`;

  

    let llmRawResult: string;

    try {

      llmRawResult = await llm.executeLLM(prompt);

    } catch (llmError) {

      // Catch errors thrown by GeminiLLM.executeLLM

      return { error: `LLM API call failed: ${(llmError as Error).message}` };

    }

  

    // Parse the raw LLM response using the private method in the concept.

    const parsedCostEstimate = this._parseLLMCostEstimate(llmRawResult);

  

    if ("error" in parsedCostEstimate) {

      return { error: parsedCostEstimate.error };

    }

  

    const flightCost = parsedCostEstimate.flight ?? 0;

    const roomsPerNightCost = parsedCostEstimate.roomsPerNight ?? 0;

    const foodDailyCost = parsedCostEstimate.foodDaily ?? 0;

  

    // Basic validation for wide inaccuracies

    if (

      flightCost < 50 || flightCost > 100000 ||

      roomsPerNightCost < 0 || roomsPerNightCost > 5000 ||

      foodDailyCost < 0 || foodDailyCost > 1000

    ) {

      return {

        error:

          "LLM provided cost estimates are widely inaccurate or outside reasonable bounds. Please consider manual input.",

      };

    }

  

    const newCostEstimateID = freshID();

    const newCostEstimate: CostEstimatesDoc = {

      _id: newCostEstimateID,

      travelPlanID: travelPlan,

      flight: flightCost,

      roomsPerNight: roomsPerNightCost,

      foodDaily: foodDailyCost,

      lastUpdated: new Date(),

    };

  

    // Replace any existing estimate for this travel plan

    await this.costEstimates.replaceOne(

      { travelPlanID: travelPlan },

      newCostEstimate,

      { upsert: true },

    );

  

    return { costEstimate: newCostEstimateID };

  }

  

  /**

   * estimateCost (user: User, travelPlan: TravelPlan): (totalCost: Number)

   *

   * **requires** `travelPlan` exists and belongs to user and an associated `CostEstimate` exists

   *

   * **effects** Calculates and returns the `totalCost` by multiplying the estimated daily/nightly costs by the duration and adding the flight cost.

   */

  async estimateCost(

    { user, travelPlan }: { user: ID; travelPlan: ID },

  ): Promise<{ totalCost: number } | { error: string }> {

    const existingTravelPlan = await this.travelPlans.findOne({

      _id: travelPlan,

      userID: user,

    });

  

    if (!existingTravelPlan) {

      return {

        error: "Travel plan not found or does not belong to the user.",

      };

    }

  

    const costEstimate = await this.costEstimates.findOne({

      travelPlanID: travelPlan,

    });

  

    if (!costEstimate) {

      return { error: "No cost estimate found for this travel plan." };

    }

  

    // Calculate number of days (inclusive of arrival day if departing on same day as arrival, min 1 day)

    const numDays = Math.max(

      1, // Ensure at least 1 day for calculation if fromDate and toDate are the same

      Math.ceil(

        (existingTravelPlan.toDate.getTime() -

          existingTravelPlan.fromDate.getTime()) /

          (1000 * 60 * 60 * 24),

      ),

    );

  

    // Assuming numDays also represents nights for roomsPerNight for simplification

    // For more accuracy, one might adjust `numNights` for accommodation calculations:

    // `numNights = Math.max(0, Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)))`

    // However, the problem statement uses 'numNights' as the duration for the prompt,

    // and 'roomsPerNight' is often calculated based on full nights stay.

    // Sticking to `numDays` for both for consistency with earlier `numNights` calculation in `generateAICostEstimate`.

    const totalCost = costEstimate.flight +

      (costEstimate.roomsPerNight * numDays) +

      (costEstimate.foodDaily * numDays);

  

    return { totalCost: totalCost };

  }

  

  // --- Queries ---

  

  /**

   * _getAllTravelPlans (user: User): (travelPlans: TravelPlansDoc[])

   *

   * **requires** `user` exists

   *

   * **effects** Returns a list of all `TravelPlans` associated with the given `user`.

   */

  async _getAllTravelPlans(

    { user }: { user: ID },

  ): Promise<TravelPlansDoc[] | { error: string }[]> {

    // Check if user exists (as per "requires" clause).

    // If user doesn't exist, return an error as specified for typical error handling.

    const userExists = await this.users.findOne({ _id: user });

    if (!userExists) {

      return [{ error: `User with ID ${user} does not exist.` }];

    }

  

    const plans = await this.travelPlans.find({ userID: user }).toArray();

  

    return plans;

  }

}
```
# response:

The syntax error "mismatching brackets" is likely caused by the non-standard TypeScript syntax `private type X = ID;` inside the class definition. In standard TypeScript, type aliases are defined using `type` at the module level or within a specific block (like a namespace or module augmentation), but not directly as `private` members of a class. The `private` keyword applies to class properties and methods, not type aliases.

To fix this, we should move the generic type aliases (`User`, `Location`, `TravelPlan`, `Necessity`, `CostEstimate`) outside the class definition, making them module-scoped type aliases, consistent with the initial example provided in the problem description (`type Item = ID;`).

Here's the corrected code for `src/TripCostEstimation/TripCostEstimationConcept.ts`:

```typescript
// src/TripCostEstimation/TripCostEstimationConcept.ts

import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
// Import the GeminiLLM and its Config interface
import { GeminiLLM, Config as GeminiLLMConfig } from "@utils/gemini-llm.ts"; // Renamed Config to GeminiLLMConfig to avoid conflict

// Declare collection prefix, use concept name
const PREFIX = "TripCostEstimation" + ".";

// Generic types of this concept (all are IDs when referenced as foreign keys)
// These types are now defined at the module level, consistent with standard TypeScript.
type User = ID;
type Location = ID;
type TravelPlan = ID;
type Necessity = ID;
type CostEstimate = ID;

/**
 * Interface for the structured cost estimate output that the LLM is expected to generate.
 * This defines the target structure for the parsing logic in the Concept class.
 */
interface CostEstimateResponse {
  flight?: number;
  roomsPerNight?: number;
  foodDaily?: number;
  // The `error` field is not part of the *successful* LLM response structure itself,
  // but rather part of the action's return type when an error occurs during API call or parsing.
}

/**
 * @purpose Generate realistic cost estimates based on trip details, using AI for data retrieval and calculation.
 * @principle Based on a user's choice of initial departure city and arrival city, and the user's sheltering
 *            accommodations and food location preferences, an estimate is provided; the LLM is used to search
 *            for and calculate median cost ranges based on the provided necessities.
 */
export default class TripCostEstimationConcept {
  // --- State Interfaces ---

  /**
   * A set of Users
   * (Documents store the user's ID. TravelPlans link back to User IDs.)
   */
  interface UsersDoc {
    _id: User;
    // No other properties explicitly defined by the state for a User itself,
    // as TravelPlans are linked to Users.
  }

  /**
   * A set of Locations with
   *   a city String
   */
  interface LocationsDoc {
    _id: Location;
    city: string;
  }

  /**
   * A set of TravelPlans with
   *   a `userID` User (Implicitly added for linking TravelPlans to Users)
   *   a `fromCity` Location (ID)
   *   a `toCity` Location (ID)
   *   a `fromDate` Date
   *   a `toDate` Date
   *   a `necessityID` Necessity (ID)
   */
  interface TravelPlansDoc {
    _id: TravelPlan;
    userID: User; // Link to UsersDoc
    fromCity: Location; // Link to LocationsDoc
    toCity: Location; // Link to LocationsDoc
    fromDate: Date;
    toDate: Date;
    necessityID: Necessity; // Link to NecessitiesDoc
  }

  /**
   * A set of Necessities with
   *   an `accommodation` Boolean
   *   a `diningFlag` Boolean
   */
  interface NecessitiesDoc {
    _id: Necessity;
    accommodation: boolean; // true for saving for rooms, false for not
    diningFlag: boolean; // true for saving for eating out, false for not
  }

  /**
   * A set of CostEstimates with
   *   a `travelPlanID` TravelPlan (ID)
   *   a `flight` Number // estimated total round-trip flight cost in USD
   *   a `roomsPerNight` Number // estimated cost per night in USD
   *   a `foodDaily` Number // estimated cost per day in USD
   *   a `lastUpdated` Date // tracking when the estimate was generated
   */
  interface CostEstimatesDoc {
    _id: CostEstimate;
    travelPlanID: TravelPlan; // Link to TravelPlansDoc
    flight: number; // estimated total round-trip flight cost in USD
    roomsPerNight: number; // estimated cost per night in USD
    foodDaily: number; // estimated cost per day in USD
    lastUpdated: Date; // tracking when the estimate was generated
  }

  // --- MongoDB Collections ---
  private users: Collection<UsersDoc>;
  private locations: Collection<LocationsDoc>;
  private travelPlans: Collection<TravelPlansDoc>;
  private necessities: Collection<NecessitiesDoc>;
  private costEstimates: Collection<CostEstimatesDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.locations = this.db.collection(PREFIX + "locations");
    this.travelPlans = this.db.collection(PREFIX + "travelPlans");
    this.necessities = this.db.collection(PREFIX + "necessities");
    this.costEstimates = this.db.collection(PREFIX + "costEstimates");
  }

  // --- Private Helper Methods ---

  /**
   * Parses the LLM's raw string response into a structured CostEstimateResponse object.
   * Assumes the LLM response is a JSON string, potentially wrapped in markdown.
   * This method is now private to the concept, enforcing separation of concerns
   * between LLM interaction and domain-specific parsing.
   * @param rawResponse The raw string output received from the LLM.
   * @returns CostEstimateResponse if parsing is successful, or an object with an `error` string.
   */
  private _parseLLMCostEstimate(
    rawResponse: string,
  ): CostEstimateResponse | { error: string } {
    try {
      let jsonString = rawResponse.trim();

      // Attempt to remove markdown code block wrappers if present
      if (jsonString.startsWith("```json") && jsonString.endsWith("```")) {
        jsonString = jsonString.substring(7, jsonString.length - 3).trim();
      } else if (jsonString.startsWith("```") && jsonString.endsWith("```")) {
        jsonString = jsonString.substring(3, jsonString.length - 3).trim();
      }

      const parsed = JSON.parse(jsonString);

      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("LLM response is not a valid JSON object.");
      }

      const costEstimate: CostEstimateResponse = {};
      if (typeof parsed.flight === "number") costEstimate.flight = parsed.flight;
      if (typeof parsed.roomsPerNight === "number") {
        costEstimate.roomsPerNight = parsed.roomsPerNight;
      }
      if (typeof parsed.foodDaily === "number") costEstimate.foodDaily = parsed.foodDaily;

      // Log warnings for unexpected types but still return what was successfully parsed
      if (parsed.flight !== undefined && typeof parsed.flight !== "number") {
        console.warn("LLM response 'flight' field is not a number:", parsed.flight);
      }
      if (
        parsed.roomsPerNight !== undefined &&
        typeof parsed.roomsPerNight !== "number"
      ) {
        console.warn(
          "LLM response 'roomsPerNight' field is not a number:",
          parsed.roomsPerNight,
        );
      }
      if (parsed.foodDaily !== undefined && typeof parsed.foodDaily !== "number") {
        console.warn(
          "LLM response 'foodDaily' field is not a number:",
          parsed.foodDaily,
        );
      }

      // Check if any *expected* fields are missing or invalid after parsing,
      // and if so, return an error. The prompt explicitly asks for these.
      if (
        costEstimate.flight === undefined ||
        costEstimate.roomsPerNight === undefined ||
        costEstimate.foodDaily === undefined
      ) {
        // If at least one of the primary expected cost fields is missing/invalid,
        // consider the parsing unsuccessful for a full estimate.
        return {
          error:
            `LLM response could not be parsed into all required cost components (flight, roomsPerNight, foodDaily). Raw: ${jsonString}`,
        };
      }

      return costEstimate;
    } catch (e) {
      console.error("Failed to parse LLM response:", rawResponse, e);
      return { error: `Failed to parse LLM response into expected JSON format: ${(e as Error).message}` };
    }
  }

  // --- Actions ---

  /**
   * createTravelPlan (user: User, fromCity: Location, toCity: Location, fromDate: Date, toDate: Date): (travelPlan: TravelPlan)
   *
   * **requires** `fromCity` and `toCity` exists and `toDate` >= `fromDate` and both are greater than the current date
   *
   * **effects** Create and return a `travelPlan` with a `fromCity`, `toCity`, and from and to dates, and a default necessity (`accommodation` = true, `diningFlag` = true)
   */
  async createTravelPlan(
    {
      user,
      fromCity,
      toCity,
      fromDate,
      toDate,
    }: {
      user: ID;
      fromCity: ID;
      toCity: ID;
      fromDate: Date;
      toDate: Date;
    },
  ): Promise<{ travelPlan: ID } | { error: string }> {
    // Requires: fromCity and toCity exist
    const origin = await this.locations.findOne({ _id: fromCity });
    const destination = await this.locations.findOne({ _id: toCity });

    if (!origin) {
      return { error: `Origin city with ID ${fromCity} not found.` };
    }
    if (!destination) {
      return { error: `Destination city with ID ${toCity} not found.` };
    }

    // Requires: toDate >= fromDate
    if (toDate < fromDate) {
      return { error: "Arrival date must be on or after departure date." };
    }

    // Requires: both dates are greater than the current date
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
    if (fromDate < now || toDate < now) {
      return { error: "Departure and arrival dates must be in the future." };
    }

    // Ensure the user exists (or create a placeholder if not found, depending on domain logic)
    await this.users.updateOne(
      { _id: user },
      { $setOnInsert: { _id: user } },
      { upsert: true },
    );

    // Create default Necessity
    const newNecessityID = freshID();
    const newNecessity: NecessitiesDoc = {
      _id: newNecessityID,
      accommodation: true,
      diningFlag: true,
    };
    await this.necessities.insertOne(newNecessity);

    // Create TravelPlan
    const newTravelPlanID = freshID();
    const newTravelPlan: TravelPlansDoc = {
      _id: newTravelPlanID,
      userID: user,
      fromCity: fromCity,
      toCity: toCity,
      fromDate: fromDate,
      toDate: toDate,
      necessityID: newNecessityID,
    };
    await this.travelPlans.insertOne(newTravelPlan);

    return { travelPlan: newTravelPlanID };
  }

  /**
   * deleteTravelPlan (user: User, travelPlan: TravelPlan): Empty
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Delete the `travelPlan` and any associated `CostEstimates` and `Necessities`
   */
  async deleteTravelPlan(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<Empty | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    // Delete associated CostEstimates
    await this.costEstimates.deleteMany({ travelPlanID: travelPlan });

    // Delete associated Necessity
    await this.necessities.deleteOne({ _id: existingTravelPlan.necessityID });

    // Delete the TravelPlan itself
    await this.travelPlans.deleteOne({ _id: travelPlan });

    return {};
  }

  /**
   * updateNecessity (user: User, travelPlan: TravelPlan, accommodation: Boolean, diningFlag: Boolean): (travelPlan: TravelPlan, necessity: Necessity)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Create and add the `necessity` with `accommodation` and `diningFlag` to `travelPlan` (updates existing necessity)
   */
  async updateNecessity(
    {
      user,
      travelPlan,
      accommodation,
      diningFlag,
    }: {
      user: ID;
      travelPlan: ID;
      accommodation: boolean;
      diningFlag: boolean;
    },
  ): Promise<{ travelPlan: ID; necessity: ID } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const updateResult = await this.necessities.updateOne(
      { _id: existingTravelPlan.necessityID },
      { $set: { accommodation: accommodation, diningFlag: diningFlag } },
    );

    if (updateResult.matchedCount === 0) {
      // This should ideally not happen if travelPlan.necessityID is always valid
      return { error: "Associated necessity not found." };
    }

    return {
      travelPlan: travelPlan,
      necessity: existingTravelPlan.necessityID,
    };
  }

  /**
   * resetNecessity (user: User, travelPlan: TravelPlan): Empty
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Reset the `necessity` belonging to `travelPlan` to the default as described in the action `createTravelPlan`
   */
  async resetNecessity(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<Empty | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const updateResult = await this.necessities.updateOne(
      { _id: existingTravelPlan.necessityID },
      { $set: { accommodation: true, diningFlag: true } }, // Default values
    );

    if (updateResult.matchedCount === 0) {
      return { error: "Associated necessity not found." };
    }

    return {};
  }

  /**
   * generateAICostEstimate (user: User, travelPlan: TravelPlan, llm: GeminiLLM): (costEstimate: CostEstimate)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Retrieves trip details (dates, locations) and necessity preference (accommodation, dining) and uses the llm's specialized tool (e.g., Google Search/Flights/Hotels) to calculate and return the median cost estimates for flight, `rooms_per_night`, and `food_daily`; the resulting data is stored as a new `CostEstimate` associated with the `travelPlanID`.
   * **Note:** The LLM prompt will be specifically tailored to search for accommodation prices matching the `accommodation` Boolean (e.g., true for hotel/motel costs) and food costs based on the `diningFlag` (true for "restaurant costs," false for "no food costs"). If the LLM fails to provide an estimate for any reason or the costs are widely inaccurate (less than 50, more than 100000 for example) then the user can manually enter the total cost of the trip that they plan to save for.
   */
  async generateAICostEstimate(
    { user, travelPlan, llm }: { user: ID; travelPlan: ID; llm: GeminiLLM }, // `llm` type is now `GeminiLLM`
  ): Promise<{ costEstimate: ID } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const [originCityDoc, destinationCityDoc, necessityDoc] = await Promise.all(
      [
        this.locations.findOne({ _id: existingTravelPlan.fromCity }),
        this.locations.findOne({ _id: existingTravelPlan.toCity }),
        this.necessities.findOne({ _id: existingTravelPlan.necessityID }),
      ],
    );

    if (!originCityDoc || !destinationCityDoc || !necessityDoc) {
      return { error: "Referenced location or necessity data not found." };
    }

    const numNights = Math.ceil(
      (existingTravelPlan.toDate.getTime() -
        existingTravelPlan.fromDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const fromDateStr = existingTravelPlan.fromDate.toISOString().split("T")[0];
    const toDateStr = existingTravelPlan.toDate.toISOString().split("T")[0];

    const accommodationPreference = necessityDoc.accommodation
      ? "hotel/motel costs"
      : "no accommodation costs (e.g., staying with friends/family)";
    const diningPreference = necessityDoc.diningFlag
      ? "daily restaurant food costs"
      : "no food costs (e.g., cooking own meals)";

    // Prompt explicitly asks for JSON, as the LLM utility is configured for it.
    const prompt =
      `Please provide a cost estimate in JSON format for a trip. ` +
      `Estimate median round-trip flight, ${
        accommodationPreference
      }, and ${diningPreference} ` +
      `from ${originCityDoc.city} to ${destinationCityDoc.city} ` +
      `departing on ${fromDateStr} and returning on ${toDateStr} ` +
      `for a trip lasting approximately ${numNights} nights. ` +
      `The JSON object should have the structure: ` +
      `{"flight": <number>, "roomsPerNight": <number>, "foodDaily": <number>}. ` +
      `Return only the JSON object.`;

    let llmRawResult: string;
    try {
      llmRawResult = await llm.executeLLM(prompt);
    } catch (llmError) {
      // Catch errors thrown by GeminiLLM.executeLLM
      return { error: `LLM API call failed: ${(llmError as Error).message}` };
    }

    // Parse the raw LLM response using the private method in the concept.
    const parsedCostEstimate = this._parseLLMCostEstimate(llmRawResult);

    if ("error" in parsedCostEstimate) {
      return { error: parsedCostEstimate.error };
    }

    const flightCost = parsedCostEstimate.flight ?? 0;
    const roomsPerNightCost = parsedCostEstimate.roomsPerNight ?? 0;
    const foodDailyCost = parsedCostEstimate.foodDaily ?? 0;

    // Basic validation for wide inaccuracies
    if (
      flightCost < 50 || flightCost > 100000 ||
      roomsPerNightCost < 0 || roomsPerNightCost > 5000 ||
      foodDailyCost < 0 || foodDailyCost > 1000
    ) {
      return {
        error:
          "LLM provided cost estimates are widely inaccurate or outside reasonable bounds. Please consider manual input.",
      };
    }

    const newCostEstimateID = freshID();
    const newCostEstimate: CostEstimatesDoc = {
      _id: newCostEstimateID,
      travelPlanID: travelPlan,
      flight: flightCost,
      roomsPerNight: roomsPerNightCost,
      foodDaily: foodDailyCost,
      lastUpdated: new Date(),
    };

    // Replace any existing estimate for this travel plan
    await this.costEstimates.replaceOne(
      { travelPlanID: travelPlan },
      newCostEstimate,
      { upsert: true },
    );

    return { costEstimate: newCostEstimateID };
  }

  /**
   * estimateCost (user: User, travelPlan: TravelPlan): (totalCost: Number)
   *
   * **requires** `travelPlan` exists and belongs to user and an associated `CostEstimate` exists
   *
   * **effects** Calculates and returns the `totalCost` by multiplying the estimated daily/nightly costs by the duration and adding the flight cost.
   */
  async estimateCost(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<{ totalCost: number } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const costEstimate = await this.costEstimates.findOne({
      travelPlanID: travelPlan,
    });

    if (!costEstimate) {
      return { error: "No cost estimate found for this travel plan." };
    }

    // Calculate number of days (inclusive of arrival day if departing on same day as arrival, min 1 day)
    const numDays = Math.max(
      1, // Ensure at least 1 day for calculation if fromDate and toDate are the same
      Math.ceil(
        (existingTravelPlan.toDate.getTime() -
          existingTravelPlan.fromDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    // Assuming numDays also represents nights for roomsPerNight for simplification
    // For more accuracy, one might adjust `numNights` for accommodation calculations:
    // `numNights = Math.max(0, Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)))`
    // However, the problem statement uses 'numNights' as the duration for the prompt,
    // and 'roomsPerNight' is often calculated based on full nights stay.
    // Sticking to `numDays` for both for consistency with earlier `numNights` calculation in `generateAICostEstimate`.
    const totalCost = costEstimate.flight +
      (costEstimate.roomsPerNight * numDays) +
      (costEstimate.foodDaily * numDays);

    return { totalCost: totalCost };
  }

  // --- Queries ---

  /**
   * _getAllTravelPlans (user: User): (travelPlans: TravelPlan[])
   *
   * **requires** `user` exists
   *
   * **effects** Returns a list of all `TravelPlan` IDs associated with the given `user`.
   */
  async _getAllTravelPlans(
    { user }: { user: ID },
  ): Promise<TravelPlan[] | { error: string }[]> { // Changed return type to TravelPlan[]
    // Check if user exists (as per "requires" clause).
    // If user doesn't exist, return an error as specified for typical error handling.
    const userExists = await this.users.findOne({ _id: user });
    if (!userExists) {
      return [{ error: `User with ID ${user} does not exist.` }];
    }

    // Project only the _id field
    const plans = await this.travelPlans.find({ userID: user }, {
      projection: { _id: 1 },
    }).toArray();

    // Map to an array of TravelPlan IDs (which are of type ID)
    return plans.map((plan) => plan._id as TravelPlan); // Explicitly cast to TravelPlan for type safety
  }
}
```

# prompt: also move the definition of the interfaces outside of the class too
# response:

```typescript
// src/TripCostEstimation/TripCostEstimationConcept.ts

import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
// Import the GeminiLLM and its Config interface
import { GeminiLLM, Config as GeminiLLMConfig } from "@utils/gemini-llm.ts"; // Renamed Config to GeminiLLMConfig to avoid conflict

// Declare collection prefix, use concept name
const PREFIX = "TripCostEstimation" + ".";

// Generic types of this concept (all are IDs when referenced as foreign keys)
// These types are now defined at the module level, consistent with standard TypeScript.
type User = ID;
type Location = ID;
type TravelPlan = ID;
type Necessity = ID;
type CostEstimate = ID;

/**
 * Interface for the structured cost estimate output that the LLM is expected to generate.
 * This defines the target structure for the parsing logic in the Concept class.
 */
interface CostEstimateResponse {
  flight?: number;
  roomsPerNight?: number;
  foodDaily?: number;
  // The `error` field is not part of the *successful* LLM response structure itself,
  // but rather part of the action's return type when an error occurs during API call or parsing.
}

// --- State Interfaces ---

/**
 * A set of Users
 * (Documents store the user's ID. TravelPlans link back to User IDs.)
 */
interface UsersDoc {
  _id: User;
  // No other properties explicitly defined by the state for a User itself,
  // as TravelPlans are linked to Users.
}

/**
 * A set of Locations with
 *   a city String
 */
interface LocationsDoc {
  _id: Location;
  city: string;
}

/**
 * A set of TravelPlans with
 *   a `userID` User (Implicitly added for linking TravelPlans to Users)
 *   a `fromCity` Location (ID)
 *   a `toCity` Location (ID)
 *   a `fromDate` Date
 *   a `toDate` Date
 *   a `necessityID` Necessity (ID)
 */
interface TravelPlansDoc {
  _id: TravelPlan;
  userID: User; // Link to UsersDoc
  fromCity: Location; // Link to LocationsDoc
  toCity: Location; // Link to LocationsDoc
  fromDate: Date;
  toDate: Date;
  necessityID: Necessity; // Link to NecessitiesDoc
}

/**
 * A set of Necessities with
 *   an `accommodation` Boolean
 *   a `diningFlag` Boolean
 */
interface NecessitiesDoc {
  _id: Necessity;
  accommodation: boolean; // true for saving for rooms, false for not
  diningFlag: boolean; // true for saving for eating out, false for not
}

/**
 * A set of CostEstimates with
 *   a `travelPlanID` TravelPlan (ID)
 *   a `flight` Number // estimated total round-trip flight cost in USD
 *   a `roomsPerNight` Number // estimated cost per night in USD
 *   a `foodDaily` Number // estimated cost per day in USD
 *   a `lastUpdated` Date // tracking when the estimate was generated
 */
interface CostEstimatesDoc {
  _id: CostEstimate;
  travelPlanID: TravelPlan; // Link to TravelPlansDoc
  flight: number; // estimated total round-trip flight cost in USD
  roomsPerNight: number; // estimated cost per night in USD
  foodDaily: number; // estimated cost per day in USD
  lastUpdated: Date; // tracking when the estimate was generated
}

/**
 * @purpose Generate realistic cost estimates based on trip details, using AI for data retrieval and calculation.
 * @principle Based on a user's choice of initial departure city and arrival city, and the user's sheltering
 *            accommodations and food location preferences, an estimate is provided; the LLM is used to search
 *            for and calculate median cost ranges based on the provided necessities.
 */
export default class TripCostEstimationConcept {
  // --- MongoDB Collections ---
  private users: Collection<UsersDoc>;
  private locations: Collection<LocationsDoc>;
  private travelPlans: Collection<TravelPlansDoc>;
  private necessities: Collection<NecessitiesDoc>;
  private costEstimates: Collection<CostEstimatesDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.locations = this.db.collection(PREFIX + "locations");
    this.travelPlans = this.db.collection(PREFIX + "travelPlans");
    this.necessities = this.db.collection(PREFIX + "necessities");
    this.costEstimates = this.db.collection(PREFIX + "costEstimates");
  }

  // --- Private Helper Methods ---

  /**
   * Parses the LLM's raw string response into a structured CostEstimateResponse object.
   * Assumes the LLM response is a JSON string, potentially wrapped in markdown.
   * This method is now private to the concept, enforcing separation of concerns
   * between LLM interaction and domain-specific parsing.
   * @param rawResponse The raw string output received from the LLM.
   * @returns CostEstimateResponse if parsing is successful, or an object with an `error` string.
   */
  private _parseLLMCostEstimate(
    rawResponse: string,
  ): CostEstimateResponse | { error: string } {
    try {
      let jsonString = rawResponse.trim();

      // Attempt to remove markdown code block wrappers if present
      if (jsonString.startsWith("```json") && jsonString.endsWith("```")) {
        jsonString = jsonString.substring(7, jsonString.length - 3).trim();
      } else if (jsonString.startsWith("```") && jsonString.endsWith("```")) {
        jsonString = jsonString.substring(3, jsonString.length - 3).trim();
      }

      const parsed = JSON.parse(jsonString);

      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("LLM response is not a valid JSON object.");
      }

      const costEstimate: CostEstimateResponse = {};
      if (typeof parsed.flight === "number") costEstimate.flight = parsed.flight;
      if (typeof parsed.roomsPerNight === "number") {
        costEstimate.roomsPerNight = parsed.roomsPerNight;
      }
      if (typeof parsed.foodDaily === "number") costEstimate.foodDaily = parsed.foodDaily;

      // Log warnings for unexpected types but still return what was successfully parsed
      if (parsed.flight !== undefined && typeof parsed.flight !== "number") {
        console.warn("LLM response 'flight' field is not a number:", parsed.flight);
      }
      if (
        parsed.roomsPerNight !== undefined &&
        typeof parsed.roomsPerNight !== "number"
      ) {
        console.warn(
          "LLM response 'roomsPerNight' field is not a number:",
          parsed.roomsPerNight,
        );
      }
      if (parsed.foodDaily !== undefined && typeof parsed.foodDaily !== "number") {
        console.warn(
          "LLM response 'foodDaily' field is not a number:",
          parsed.foodDaily,
        );
      }

      // Check if any *expected* fields are missing or invalid after parsing,
      // and if so, return an error. The prompt explicitly asks for these.
      if (
        costEstimate.flight === undefined ||
        costEstimate.roomsPerNight === undefined ||
        costEstimate.foodDaily === undefined
      ) {
        // If at least one of the primary expected cost fields is missing/invalid,
        // consider the parsing unsuccessful for a full estimate.
        return {
          error:
            `LLM response could not be parsed into all required cost components (flight, roomsPerNight, foodDaily). Raw: ${jsonString}`,
        };
      }

      return costEstimate;
    } catch (e) {
      console.error("Failed to parse LLM response:", rawResponse, e);
      return { error: `Failed to parse LLM response into expected JSON format: ${(e as Error).message}` };
    }
  }

  // --- Actions ---

  /**
   * createTravelPlan (user: User, fromCity: Location, toCity: Location, fromDate: Date, toDate: Date): (travelPlan: TravelPlan)
   *
   * **requires** `fromCity` and `toCity` exists and `toDate` >= `fromDate` and both are greater than the current date
   *
   * **effects** Create and return a `travelPlan` with a `fromCity`, `toCity`, and from and to dates, and a default necessity (`accommodation` = true, `diningFlag` = true)
   */
  async createTravelPlan(
    {
      user,
      fromCity,
      toCity,
      fromDate,
      toDate,
    }: {
      user: ID;
      fromCity: ID;
      toCity: ID;
      fromDate: Date;
      toDate: Date;
    },
  ): Promise<{ travelPlan: ID } | { error: string }> {
    // Requires: fromCity and toCity exist
    const origin = await this.locations.findOne({ _id: fromCity });
    const destination = await this.locations.findOne({ _id: toCity });

    if (!origin) {
      return { error: `Origin city with ID ${fromCity} not found.` };
    }
    if (!destination) {
      return { error: `Destination city with ID ${toCity} not found.` };
    }

    // Requires: toDate >= fromDate
    if (toDate < fromDate) {
      return { error: "Arrival date must be on or after departure date." };
    }

    // Requires: both dates are greater than the current date
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
    if (fromDate < now || toDate < now) {
      return { error: "Departure and arrival dates must be in the future." };
    }

    // Ensure the user exists (or create a placeholder if not found, depending on domain logic)
    await this.users.updateOne(
      { _id: user },
      { $setOnInsert: { _id: user } },
      { upsert: true },
    );

    // Create default Necessity
    const newNecessityID = freshID();
    const newNecessity: NecessitiesDoc = {
      _id: newNecessityID,
      accommodation: true,
      diningFlag: true,
    };
    await this.necessities.insertOne(newNecessity);

    // Create TravelPlan
    const newTravelPlanID = freshID();
    const newTravelPlan: TravelPlansDoc = {
      _id: newTravelPlanID,
      userID: user,
      fromCity: fromCity,
      toCity: toCity,
      fromDate: fromDate,
      toDate: toDate,
      necessityID: newNecessityID,
    };
    await this.travelPlans.insertOne(newTravelPlan);

    return { travelPlan: newTravelPlanID };
  }

  /**
   * deleteTravelPlan (user: User, travelPlan: TravelPlan): Empty
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Delete the `travelPlan` and any associated `CostEstimates` and `Necessities`
   */
  async deleteTravelPlan(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<Empty | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    // Delete associated CostEstimates
    await this.costEstimates.deleteMany({ travelPlanID: travelPlan });

    // Delete associated Necessity
    await this.necessities.deleteOne({ _id: existingTravelPlan.necessityID });

    // Delete the TravelPlan itself
    await this.travelPlans.deleteOne({ _id: travelPlan });

    return {};
  }

  /**
   * updateNecessity (user: User, travelPlan: TravelPlan, accommodation: Boolean, diningFlag: Boolean): (travelPlan: TravelPlan, necessity: Necessity)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Create and add the `necessity` with `accommodation` and `diningFlag` to `travelPlan` (updates existing necessity)
   */
  async updateNecessity(
    {
      user,
      travelPlan,
      accommodation,
      diningFlag,
    }: {
      user: ID;
      travelPlan: ID;
      accommodation: boolean;
      diningFlag: boolean;
    },
  ): Promise<{ travelPlan: ID; necessity: ID } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const updateResult = await this.necessities.updateOne(
      { _id: existingTravelPlan.necessityID },
      { $set: { accommodation: accommodation, diningFlag: diningFlag } },
    );

    if (updateResult.matchedCount === 0) {
      // This should ideally not happen if travelPlan.necessityID is always valid
      return { error: "Associated necessity not found." };
    }

    return {
      travelPlan: travelPlan,
      necessity: existingTravelPlan.necessityID,
    };
  }

  /**
   * resetNecessity (user: User, travelPlan: TravelPlan): Empty
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Reset the `necessity` belonging to `travelPlan` to the default as described in the action `createTravelPlan`
   */
  async resetNecessity(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<Empty | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const updateResult = await this.necessities.updateOne(
      { _id: existingTravelPlan.necessityID },
      { $set: { accommodation: true, diningFlag: true } }, // Default values
    );

    if (updateResult.matchedCount === 0) {
      return { error: "Associated necessity not found." };
    }

    return {};
  }

  /**
   * generateAICostEstimate (user: User, travelPlan: TravelPlan, llm: GeminiLLM): (costEstimate: CostEstimate)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Retrieves trip details (dates, locations) and necessity preference (accommodation, dining) and uses the llm's specialized tool (e.g., Google Search/Flights/Hotels) to calculate and return the median cost estimates for flight, `rooms_per_night`, and `food_daily`; the resulting data is stored as a new `CostEstimate` associated with the `travelPlanID`.
   * **Note:** The LLM prompt will be specifically tailored to search for accommodation prices matching the `accommodation` Boolean (e.g., true for hotel/motel costs) and food costs based on the `diningFlag` (true for "restaurant costs," false for "no food costs"). If the LLM fails to provide an estimate for any reason or the costs are widely inaccurate (less than 50, more than 100000 for example) then the user can manually enter the total cost of the trip that they plan to save for.
   */
  async generateAICostEstimate(
    { user, travelPlan, llm }: { user: ID; travelPlan: ID; llm: GeminiLLM }, // `llm` type is now `GeminiLLM`
  ): Promise<{ costEstimate: ID } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const [originCityDoc, destinationCityDoc, necessityDoc] = await Promise.all(
      [
        this.locations.findOne({ _id: existingTravelPlan.fromCity }),
        this.locations.findOne({ _id: existingTravelPlan.toCity }),
        this.necessities.findOne({ _id: existingTravelPlan.necessityID }),
      ],
    );

    if (!originCityDoc || !destinationCityDoc || !necessityDoc) {
      return { error: "Referenced location or necessity data not found." };
    }

    const numNights = Math.ceil(
      (existingTravelPlan.toDate.getTime() -
        existingTravelPlan.fromDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const fromDateStr = existingTravelPlan.fromDate.toISOString().split("T")[0];
    const toDateStr = existingTravelPlan.toDate.toISOString().split("T")[0];

    const accommodationPreference = necessityDoc.accommodation
      ? "hotel/motel costs"
      : "no accommodation costs (e.g., staying with friends/family)";
    const diningPreference = necessityDoc.diningFlag
      ? "daily restaurant food costs"
      : "no food costs (e.g., cooking own meals)";

    // Prompt explicitly asks for JSON, as the LLM utility is configured for it.
    const prompt =
      `Please provide a cost estimate in JSON format for a trip. ` +
      `Estimate median round-trip flight, ${
        accommodationPreference
      }, and ${diningPreference} ` +
      `from ${originCityDoc.city} to ${destinationCityDoc.city} ` +
      `departing on ${fromDateStr} and returning on ${toDateStr} ` +
      `for a trip lasting approximately ${numNights} nights. ` +
      `The JSON object should have the structure: ` +
      `{"flight": <number>, "roomsPerNight": <number>, "foodDaily": <number>}. ` +
      `Return only the JSON object.`;

    let llmRawResult: string;
    try {
      llmRawResult = await llm.executeLLM(prompt);
    } catch (llmError) {
      // Catch errors thrown by GeminiLLM.executeLLM
      return { error: `LLM API call failed: ${(llmError as Error).message}` };
    }

    // Parse the raw LLM response using the private method in the concept.
    const parsedCostEstimate = this._parseLLMCostEstimate(llmRawResult);

    if ("error" in parsedCostEstimate) {
      return { error: parsedCostEstimate.error };
    }

    const flightCost = parsedCostEstimate.flight ?? 0;
    const roomsPerNightCost = parsedCostEstimate.roomsPerNight ?? 0;
    const foodDailyCost = parsedCostEstimate.foodDaily ?? 0;

    // Basic validation for wide inaccuracies
    if (
      flightCost < 50 || flightCost > 100000 ||
      roomsPerNightCost < 0 || roomsPerNightCost > 5000 ||
      foodDailyCost < 0 || foodDailyCost > 1000
    ) {
      return {
        error:
          "LLM provided cost estimates are widely inaccurate or outside reasonable bounds. Please consider manual input.",
      };
    }

    const newCostEstimateID = freshID();
    const newCostEstimate: CostEstimatesDoc = {
      _id: newCostEstimateID,
      travelPlanID: travelPlan,
      flight: flightCost,
      roomsPerNight: roomsPerNightCost,
      foodDaily: foodDailyCost,
      lastUpdated: new Date(),
    };

    // Replace any existing estimate for this travel plan
    await this.costEstimates.replaceOne(
      { travelPlanID: travelPlan },
      newCostEstimate,
      { upsert: true },
    );

    return { costEstimate: newCostEstimateID };
  }

  /**
   * estimateCost (user: User, travelPlan: TravelPlan): (totalCost: Number)
   *
   * **requires** `travelPlan` exists and belongs to user and an associated `CostEstimate` exists
   *
   * **effects** Calculates and returns the `totalCost` by multiplying the estimated daily/nightly costs by the duration and adding the flight cost.
   */
  async estimateCost(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<{ totalCost: number } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const costEstimate = await this.costEstimates.findOne({
      travelPlanID: travelPlan,
    });

    if (!costEstimate) {
      return { error: "No cost estimate found for this travel plan." };
    }

    // Calculate number of days (inclusive of arrival day if departing on same day as arrival, min 1 day)
    const numDays = Math.max(
      1, // Ensure at least 1 day for calculation if fromDate and toDate are the same
      Math.ceil(
        (existingTravelPlan.toDate.getTime() -
          existingTravelPlan.fromDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    // Assuming numDays also represents nights for roomsPerNight for simplification
    // For more accuracy, one might adjust `numNights` for accommodation calculations:
    // `numNights = Math.max(0, Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)))`
    // However, the problem statement uses 'numNights' as the duration for the prompt,
    // and 'roomsPerNight' is often calculated based on full nights stay.
    // Sticking to `numDays` for both for consistency with earlier `numNights` calculation in `generateAICostEstimate`.
    const totalCost = costEstimate.flight +
      (costEstimate.roomsPerNight * numDays) +
      (costEstimate.foodDaily * numDays);

    return { totalCost: totalCost };
  }

  // --- Queries ---

  /**
   * _getAllTravelPlans (user: User): (travelPlans: TravelPlan[])
   *
   * **requires** `user` exists
   *
   * **effects** Returns a list of all `TravelPlan` IDs associated with the given `user`.
   */
  async _getAllTravelPlans(
    { user }: { user: ID },
  ): Promise<TravelPlan[] | { error: string }[]> { // Changed return type to TravelPlan[]
    // Check if user exists (as per "requires" clause).
    // If user doesn't exist, return an error as specified for typical error handling.
    const userExists = await this.users.findOne({ _id: user });
    if (!userExists) {
      return [{ error: `User with ID ${user} does not exist.` }];
    }

    // Project only the _id field
    const plans = await this.travelPlans.find({ userID: user }, {
      projection: { _id: 1 },
    }).toArray();

    // Map to an array of TravelPlan IDs (which are of type ID)
    return plans.map((plan) => plan._id as TravelPlan); // Explicitly cast to TravelPlan for type safety
  }
}
```


# prompt: you change gemini-llm file to set apiKey as the following code does
``` typescript
import { saveDoc } from "./save.ts";

import { GoogleGenAI } from "npm:@google/genai";

import fs from "node:fs";

  

import "jsr:@std/dotenv/load";

  

// Default spacer to begin completion, could make configurable

const BEGIN_RESPONSE = "\n# response:\n\n";

  

export async function promptLLM(doc: string, file: string) {

  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

  const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL");

  if (GEMINI_API_KEY === undefined) throw new Error("Missing GEMINI_API_KEY");

  if (GEMINI_MODEL === undefined) throw new Error("Missing GEMINI_MODEL");

  let config = {};

  const configPath = Deno.env.get("GEMINI_CONFIG");

  if (configPath) {

    config = JSON.parse(Deno.readTextFileSync(configPath));

  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  

  let completion = BEGIN_RESPONSE;

  fs.appendFileSync(file, completion);

  

  const result = await ai.models.generateContentStream({

    model: GEMINI_MODEL,

    contents: doc,

    config,

  });

  

  let thoughts = "";

  let last;

  for await (const chunk of result) {

    last = chunk;

    const candidates = chunk.candidates?.[0]?.content?.parts;

    if (candidates === undefined) continue;

    for (const part of candidates) {

      const chunkText = part.text;

      if (!chunkText) {

        continue;

      } else if (part.thought) {

        if (!thoughts) {

          console.log("Thoughts summary:\n");

        }

        console.log(part.text);

        thoughts = thoughts + part.text;

      } else {

        // Deno.writeTextFileSync(filePath, chunkText, { append: true });

        completion += chunkText;

        fs.appendFileSync(file, chunkText);

      }

    }

  }

  let meta = {};

  if (last !== undefined) {

    const data = last.usageMetadata;

    const promptTokens = data?.promptTokenCount || "";

    const outputTokens = data?.candidatesTokenCount || "";

    const totalTokens = data?.totalTokenCount || "";

    const thoughtTokens = data?.thoughtsTokenCount || "";

    meta = {

      promptTokens,

      outputTokens,

      totalTokens,

      thoughtTokens,

    };

  }

  const properties = {

    "llm_model": GEMINI_MODEL,

  };

  await saveDoc(doc + completion, file, { ...properties, ...meta });

}
```

# response:

Okay, let's update the `gemini-llm.ts` file to obtain the API key and model from environment variables, similar to the `promptLLM` example provided.

This involves the following changes in `src/utils/gemini-llm.ts`:
1.  Add `import "jsr:@std/dotenv/load";` to load environment variables.
2.  Remove the `Config` interface (since the key is now from `Deno.env`).
3.  Remove the `private apiKey: string;` class property.
4.  Modify the `GeminiLLM` constructor to no longer accept a `config` object.
5.  Inside `private async callGeminiAPI(prompt: string): Promise<string>`, retrieve `GEMINI_API_KEY` and `GEMINI_MODEL` using `Deno.env.get()`.
6.  Add checks for missing environment variables, throwing errors if they are not set.

The `TripCostEstimationConcept.ts` file will also need a minor adjustment to its imports, removing the now-obsolete `Config as GeminiLLMConfig` import alias. The rest of its logic for calling `llm.executeLLM(prompt)` and parsing the result remains correct, as `executeLLM` now directly returns the raw string (or throws an error).

---

### Step 1: Update `src/utils/gemini-llm.ts`

```typescript
// src/utils/gemini-llm.ts

import { GoogleGenerativeAI } from 'npm:@google/generative-ai'; // Use qualified import for Deno
import "jsr:@std/dotenv/load"; // Import dotenv to load environment variables

/**
 * Configuration for retry behavior
 */
interface RetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    timeoutMs: number;
}

/**
 * Interface for the structured cost estimate output that the LLM is expected to generate.
 * This defines the target structure for the parsing logic in the Concept class.
 */
export interface CostEstimateResponse {
    flight?: number;
    roomsPerNight?: number;
    foodDaily?: number;
}

/**
 * LLM Integration for TripCostEstimation
 *
 * Handles raw LLM text generation requests using Google's Gemini API with robust error handling,
 * timeouts, retries with exponential backoff, and comprehensive validation.
 * It does NOT perform any parsing of the LLM's output.
 */
export class GeminiLLM {
    // Removed private apiKey: string; as it's now fetched from environment
    private retryConfig: RetryConfig;

    // Constructor no longer takes config, as API key is from environment
    constructor() {
        this.retryConfig = {
            maxRetries: 3,
            baseDelayMs: 1000,
            maxDelayMs: 10000,
            timeoutMs: 30000
        };
    }

    /**
     * Public method to interact with the LLM, acting as the "specialized tool".
     * It handles LLM interaction, retries, and timeouts, but *not* parsing the content.
     * @param prompt The prompt string to send to the LLM. This prompt should instruct the LLM to return JSON.
     * @returns Promise<string> The raw LLM text response (expected to be a JSON string).
     * @throws Error if the prompt is empty or if the LLM API call fails after retries.
     */
    async executeLLM(prompt: string): Promise<string> {
        if (!prompt || prompt.trim().length === 0) {
            throw new Error('Prompt cannot be empty or null');
        }

        let lastError: Error | null = null;
        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                const result = await this.executeWithTimeout(prompt);
                return result;
            } catch (error) {
                lastError = error as Error;
                // Don't retry on certain types of errors
                if (this.isNonRetryableError(error as Error)) {
                    throw new Error(`Non-retryable error: ${(error as Error).message}`);
                }
                // If this is the last attempt, throw the error
                if (attempt === this.retryConfig.maxRetries) {
                    break;
                }
                // Calculate delay with exponential backoff
                const delay = Math.min(
                    this.retryConfig.baseDelayMs * Math.pow(2, attempt),
                    this.retryConfig.maxDelayMs
                );
                console.log(`❌ Attempt ${attempt + 1} failed: ${(error as Error).message}. Retrying in ${delay}ms...`);
                await this.sleep(delay);
            }
        }
        throw new Error(`LLM request failed after ${this.retryConfig.maxRetries + 1} attempts. Last error: ${lastError?.message}`);
    }

    /**
     * Execute LLM request with timeout.
     */
    private async executeWithTimeout(prompt: string): Promise<string> {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`LLM request timed out after ${this.retryConfig.timeoutMs}ms`));
            }, this.retryConfig.timeoutMs);
        });

        const llmPromise = this.callGeminiAPI(prompt);
        return Promise.race([llmPromise, timeoutPromise]);
    }

    /**
     * Make the actual API call to Gemini.
     */
    private async callGeminiAPI(prompt: string): Promise<string> {
        try {
            // Get API key and model from environment variables
            const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
            const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL");

            if (!GEMINI_API_KEY) {
                throw new Error("Missing GEMINI_API_KEY environment variable.");
            }
            if (!GEMINI_MODEL) {
                throw new Error("Missing GEMINI_MODEL environment variable. Please specify a model (e.g., 'gemini-1.5-flash').");
            }

            // Initialize Gemini AI
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: GEMINI_MODEL,
                generationConfig: {
                    maxOutputTokens: 1000,
                    temperature: 0.1, // Lower temperature for more consistent responses
                    responseMimeType: "application/json", // Explicitly request JSON output
                }
            });
            // Execute the LLM
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            if (!text || text.trim().length === 0) {
                throw new Error('LLM returned empty response');
            }
            return text;
        } catch (error) {
            const errorMessage = (error as Error).message;
            // Provide more specific error messages
            if (errorMessage.includes('API_KEY_INVALID')) {
                throw new Error('Invalid API key provided');
            } else if (errorMessage.includes('QUOTA_EXCEEDED')) {
                throw new Error('API quota exceeded - please try again later');
            } else if (errorMessage.includes('SAFETY')) {
                throw new Error('Request blocked by safety filters - please modify your prompt');
            } else if (errorMessage.includes('PERMISSION_DENIED')) {
                throw new Error('Permission denied - check your API key permissions');
            } else {
                throw new Error(`Gemini API error: ${errorMessage}`);
            }
        }
    }

    /**
     * Check if an error should not be retried.
     */
    private isNonRetryableError(error: Error): boolean {
        const message = error.message.toLowerCase();
        return message.includes('invalid api key') ||
            message.includes('permission denied') ||
            message.includes('quota exceeded') ||
            message.includes('safety') ||
            message.includes('prompt cannot be empty');
    }

    /**
     * Sleep utility for delays.
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

---

### Step 2: Update `src/TripCostEstimation/TripCostEstimationConcept.ts`

```typescript
// src/TripCostEstimation/TripCostEstimationConcept.ts

import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
// Import the GeminiLLM. The Config interface is no longer needed here.
import { GeminiLLM } from "@utils/gemini-llm.ts";

// Declare collection prefix, use concept name
const PREFIX = "TripCostEstimation" + ".";

// Generic types of this concept (all are IDs when referenced as foreign keys)
// These types are now defined at the module level.
type User = ID;
type Location = ID;
type TravelPlan = ID;
type Necessity = ID;
type CostEstimate = ID;

/**
 * Interface for the structured cost estimate output that the LLM is expected to generate.
 * This defines the target structure for the parsing logic in the Concept class.
 */
interface CostEstimateResponse {
  flight?: number;
  roomsPerNight?: number;
  foodDaily?: number;
  // The `error` field is not part of the *successful* LLM response structure itself,
  // but rather part of the action's return type when an error occurs during API call or parsing.
}

// --- State Interfaces ---

/**
 * A set of Users
 * (Documents store the user's ID. TravelPlans link back to User IDs.)
 */
interface UsersDoc {
  _id: User;
  // No other properties explicitly defined by the state for a User itself,
  // as TravelPlans are linked to Users.
}

/**
 * A set of Locations with
 *   a city String
 */
interface LocationsDoc {
  _id: Location;
  city: string;
}

/**
 * A set of TravelPlans with
 *   a `userID` User (Implicitly added for linking TravelPlans to Users)
 *   a `fromCity` Location (ID)
 *   a `toCity` Location (ID)
 *   a `fromDate` Date
 *   a `toDate` Date
 *   a `necessityID` Necessity (ID)
 */
interface TravelPlansDoc {
  _id: TravelPlan;
  userID: User; // Link to UsersDoc
  fromCity: Location; // Link to LocationsDoc
  toCity: Location; // Link to LocationsDoc
  fromDate: Date;
  toDate: Date;
  necessityID: Necessity; // Link to NecessitiesDoc
}

/**
 * A set of Necessities with
 *   an `accommodation` Boolean
 *   a `diningFlag` Boolean
 */
interface NecessitiesDoc {
  _id: Necessity;
  accommodation: boolean; // true for saving for rooms, false for not
  diningFlag: boolean; // true for saving for eating out, false for not
}

/**
 * A set of CostEstimates with
 *   a `travelPlanID` TravelPlan (ID)
 *   a `flight` Number // estimated total round-trip flight cost in USD
 *   a `roomsPerNight` Number // estimated cost per night in USD
 *   a `foodDaily` Number // estimated cost per day in USD
 *   a `lastUpdated` Date // tracking when the estimate was generated
 */
interface CostEstimatesDoc {
  _id: CostEstimate;
  travelPlanID: TravelPlan; // Link to TravelPlansDoc
  flight: number; // estimated total round-trip flight cost in USD
  roomsPerNight: number; // estimated cost per night in USD
  foodDaily: number; // estimated cost per day in USD
  lastUpdated: Date; // tracking when the estimate was generated
}

/**
 * @purpose Generate realistic cost estimates based on trip details, using AI for data retrieval and calculation.
 * @principle Based on a user's choice of initial departure city and arrival city, and the user's sheltering
 *            accommodations and food location preferences, an estimate is provided; the LLM is used to search
 *            for and calculate median cost ranges based on the provided necessities.
 */
export default class TripCostEstimationConcept {
  // --- MongoDB Collections ---
  private users: Collection<UsersDoc>;
  private locations: Collection<LocationsDoc>;
  private travelPlans: Collection<TravelPlansDoc>;
  private necessities: Collection<NecessitiesDoc>;
  private costEstimates: Collection<CostEstimatesDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.locations = this.db.collection(PREFIX + "locations");
    this.travelPlans = this.db.collection(PREFIX + "travelPlans");
    this.necessities = this.db.collection(PREFIX + "necessities");
    this.costEstimates = this.db.collection(PREFIX + "costEstimates");
  }

  // --- Private Helper Methods ---

  /**
   * Parses the LLM's raw string response into a structured CostEstimateResponse object.
   * Assumes the LLM response is a JSON string, potentially wrapped in markdown.
   * This method is now private to the concept, enforcing separation of concerns
   * between LLM interaction and domain-specific parsing.
   * @param rawResponse The raw string output received from the LLM.
   * @returns CostEstimateResponse if parsing is successful, or an object with an `error` string.
   */
  private _parseLLMCostEstimate(
    rawResponse: string,
  ): CostEstimateResponse | { error: string } {
    try {
      let jsonString = rawResponse.trim();

      // Attempt to remove markdown code block wrappers if present
      if (jsonString.startsWith("```json") && jsonString.endsWith("```")) {
        jsonString = jsonString.substring(7, jsonString.length - 3).trim();
      } else if (jsonString.startsWith("```") && jsonString.endsWith("```")) {
        jsonString = jsonString.substring(3, jsonString.length - 3).trim();
      }

      const parsed = JSON.parse(jsonString);

      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("LLM response is not a valid JSON object.");
      }

      const costEstimate: CostEstimateResponse = {};
      if (typeof parsed.flight === "number") costEstimate.flight = parsed.flight;
      if (typeof parsed.roomsPerNight === "number") {
        costEstimate.roomsPerNight = parsed.roomsPerNight;
      }
      if (typeof parsed.foodDaily === "number") costEstimate.foodDaily = parsed.foodDaily;

      // Log warnings for unexpected types but still return what was successfully parsed
      if (parsed.flight !== undefined && typeof parsed.flight !== "number") {
        console.warn("LLM response 'flight' field is not a number:", parsed.flight);
      }
      if (
        parsed.roomsPerNight !== undefined &&
        typeof parsed.roomsPerNight !== "number"
      ) {
        console.warn(
          "LLM response 'roomsPerNight' field is not a number:",
          parsed.roomsPerNight,
        );
      }
      if (parsed.foodDaily !== undefined && typeof parsed.foodDaily !== "number") {
        console.warn(
          "LLM response 'foodDaily' field is not a number:",
          parsed.foodDaily,
        );
      }

      // Check if any *expected* fields are missing or invalid after parsing,
      // and if so, return an error. The prompt explicitly asks for these.
      if (
        costEstimate.flight === undefined ||
        costEstimate.roomsPerNight === undefined ||
        costEstimate.foodDaily === undefined
      ) {
        // If at least one of the primary expected cost fields is missing/invalid,
        // consider the parsing unsuccessful for a full estimate.
        return {
          error:
            `LLM response could not be parsed into all required cost components (flight, roomsPerNight, foodDaily). Raw: ${jsonString}`,
        };
      }

      return costEstimate;
    } catch (e) {
      console.error("Failed to parse LLM response:", rawResponse, e);
      return { error: `Failed to parse LLM response into expected JSON format: ${(e as Error).message}` };
    }
  }

  // --- Actions ---

  /**
   * createTravelPlan (user: User, fromCity: Location, toCity: Location, fromDate: Date, toDate: Date): (travelPlan: TravelPlan)
   *
   * **requires** `fromCity` and `toCity` exists and `toDate` >= `fromDate` and both are greater than the current date
   *
   * **effects** Create and return a `travelPlan` with a `fromCity`, `toCity`, and from and to dates, and a default necessity (`accommodation` = true, `diningFlag` = true)
   */
  async createTravelPlan(
    {
      user,
      fromCity,
      toCity,
      fromDate,
      toDate,
    }: {
      user: ID;
      fromCity: ID;
      toCity: ID;
      fromDate: Date;
      toDate: Date;
    },
  ): Promise<{ travelPlan: ID } | { error: string }> {
    // Requires: fromCity and toCity exist
    const origin = await this.locations.findOne({ _id: fromCity });
    const destination = await this.locations.findOne({ _id: toCity });

    if (!origin) {
      return { error: `Origin city with ID ${fromCity} not found.` };
    }
    if (!destination) {
      return { error: `Destination city with ID ${toCity} not found.` };
    }

    // Requires: toDate >= fromDate
    if (toDate < fromDate) {
      return { error: "Arrival date must be on or after departure date." };
    }

    // Requires: both dates are greater than the current date
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
    if (fromDate < now || toDate < now) {
      return { error: "Departure and arrival dates must be in the future." };
    }

    // Ensure the user exists (or create a placeholder if not found, depending on domain logic)
    await this.users.updateOne(
      { _id: user },
      { $setOnInsert: { _id: user } },
      { upsert: true },
    );

    // Create default Necessity
    const newNecessityID = freshID();
    const newNecessity: NecessitiesDoc = {
      _id: newNecessityID,
      accommodation: true,
      diningFlag: true,
    };
    await this.necessities.insertOne(newNecessity);

    // Create TravelPlan
    const newTravelPlanID = freshID();
    const newTravelPlan: TravelPlansDoc = {
      _id: newTravelPlanID,
      userID: user,
      fromCity: fromCity,
      toCity: toCity,
      fromDate: fromDate,
      toDate: toDate,
      necessityID: newNecessityID,
    };
    await this.travelPlans.insertOne(newTravelPlan);

    return { travelPlan: newTravelPlanID };
  }

  /**
   * deleteTravelPlan (user: User, travelPlan: TravelPlan): Empty
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Delete the `travelPlan` and any associated `CostEstimates` and `Necessities`
   */
  async deleteTravelPlan(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<Empty | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    // Delete associated CostEstimates
    await this.costEstimates.deleteMany({ travelPlanID: travelPlan });

    // Delete associated Necessity
    await this.necessities.deleteOne({ _id: existingTravelPlan.necessityID });

    // Delete the TravelPlan itself
    await this.travelPlans.deleteOne({ _id: travelPlan });

    return {};
  }

  /**
   * updateNecessity (user: User, travelPlan: TravelPlan, accommodation: Boolean, diningFlag: Boolean): (travelPlan: TravelPlan, necessity: Necessity)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Create and add the `necessity` with `accommodation` and `diningFlag` to `travelPlan` (updates existing necessity)
   */
  async updateNecessity(
    {
      user,
      travelPlan,
      accommodation,
      diningFlag,
    }: {
      user: ID;
      travelPlan: ID;
      accommodation: boolean;
      diningFlag: boolean;
    },
  ): Promise<{ travelPlan: ID; necessity: ID } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const updateResult = await this.necessities.updateOne(
      { _id: existingTravelPlan.necessityID },
      { $set: { accommodation: accommodation, diningFlag: diningFlag } },
    );

    if (updateResult.matchedCount === 0) {
      // This should ideally not happen if travelPlan.necessityID is always valid
      return { error: "Associated necessity not found." };
    }

    return {
      travelPlan: travelPlan,
      necessity: existingTravelPlan.necessityID,
    };
  }

  /**
   * resetNecessity (user: User, travelPlan: TravelPlan): Empty
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Reset the `necessity` belonging to `travelPlan` to the default as described in the action `createTravelPlan`
   */
  async resetNecessity(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<Empty | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const updateResult = await this.necessities.updateOne(
      { _id: existingTravelPlan.necessityID },
      { $set: { accommodation: true, diningFlag: true } }, // Default values
    );

    if (updateResult.matchedCount === 0) {
      return { error: "Associated necessity not found." };
    }

    return {};
  }

  /**
   * generateAICostEstimate (user: User, travelPlan: TravelPlan, llm: GeminiLLM): (costEstimate: CostEstimate)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Retrieves trip details (dates, locations) and necessity preference (accommodation, dining) and uses the llm's specialized tool (e.g., Google Search/Flights/Hotels) to calculate and return the median cost estimates for flight, `rooms_per_night`, and `food_daily`; the resulting data is stored as a new `CostEstimate` associated with the `travelPlanID`.
   * **Note:** The LLM prompt will be specifically tailored to search for accommodation prices matching the `accommodation` Boolean (e.g., true for hotel/motel costs) and food costs based on the `diningFlag` (true for "restaurant costs," false for "no food costs"). If the LLM fails to provide an estimate for any reason or the costs are widely inaccurate (less than 50, more than 100000 for example) then the user can manually enter the total cost of the trip that they plan to save for.
   */
  async generateAICostEstimate(
    { user, travelPlan, llm }: { user: ID; travelPlan: ID; llm: GeminiLLM }, // `llm` type is now `GeminiLLM`
  ): Promise<{ costEstimate: ID } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const [originCityDoc, destinationCityDoc, necessityDoc] = await Promise.all(
      [
        this.locations.findOne({ _id: existingTravelPlan.fromCity }),
        this.locations.findOne({ _id: existingTravelPlan.toCity }),
        this.necessities.findOne({ _id: existingTravelPlan.necessityID }),
      ],
    );

    if (!originCityDoc || !destinationCityDoc || !necessityDoc) {
      return { error: "Referenced location or necessity data not found." };
    }

    const numNights = Math.ceil(
      (existingTravelPlan.toDate.getTime() -
        existingTravelPlan.fromDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const fromDateStr = existingTravelPlan.fromDate.toISOString().split("T")[0];
    const toDateStr = existingTravelPlan.toDate.toISOString().split("T")[0];

    const accommodationPreference = necessityDoc.accommodation
      ? "hotel/motel costs"
      : "no accommodation costs (e.g., staying with friends/family)";
    const diningPreference = necessityDoc.diningFlag
      ? "daily restaurant food costs"
      : "no food costs (e.g., cooking own meals)";

    // Prompt explicitly asks for JSON, as the LLM utility is configured for it.
    const prompt =
      `Please provide a cost estimate in JSON format for a trip. ` +
      `Estimate median round-trip flight, ${
        accommodationPreference
      }, and ${diningPreference} ` +
      `from ${originCityDoc.city} to ${destinationCityDoc.city} ` +
      `departing on ${fromDateStr} and returning on ${toDateStr} ` +
      `for a trip lasting approximately ${numNights} nights. ` +
      `The JSON object should have the structure: ` +
      `{"flight": <number>, "roomsPerNight": <number>, "foodDaily": <number>}. ` +
      `Return only the JSON object.`;

    let llmRawResult: string;
    try {
      llmRawResult = await llm.executeLLM(prompt);
    } catch (llmError) {
      // Catch errors thrown by GeminiLLM.executeLLM
      return { error: `LLM API call failed: ${(llmError as Error).message}` };
    }

    // Parse the raw LLM response using the private method in the concept.
    const parsedCostEstimate = this._parseLLMCostEstimate(llmRawResult);

    if ("error" in parsedCostEstimate) {
      return { error: parsedCostEstimate.error };
    }

    const flightCost = parsedCostEstimate.flight ?? 0;
    const roomsPerNightCost = parsedCostEstimate.roomsPerNight ?? 0;
    const foodDailyCost = parsedCostEstimate.foodDaily ?? 0;

    // Basic validation for wide inaccuracies
    if (
      flightCost < 50 || flightCost > 100000 ||
      roomsPerNightCost < 0 || roomsPerNightCost > 5000 ||
      foodDailyCost < 0 || foodDailyCost > 1000
    ) {
      return {
        error:
          "LLM provided cost estimates are widely inaccurate or outside reasonable bounds. Please consider manual input.",
      };
    }

    const newCostEstimateID = freshID();
    const newCostEstimate: CostEstimatesDoc = {
      _id: newCostEstimateID,
      travelPlanID: travelPlan,
      flight: flightCost,
      roomsPerNight: roomsPerNightCost,
      foodDaily: foodDailyCost,
      lastUpdated: new Date(),
    };

    // Replace any existing estimate for this travel plan
    await this.costEstimates.replaceOne(
      { travelPlanID: travelPlan },
      newCostEstimate,
      { upsert: true },
    );

    return { costEstimate: newCostEstimateID };
  }

  /**
   * estimateCost (user: User, travelPlan: TravelPlan): (totalCost: Number)
   *
   * **requires** `travelPlan` exists and belongs to user and an associated `CostEstimate` exists
   *
   * **effects** Calculates and returns the `totalCost` by multiplying the estimated daily/nightly costs by the duration and adding the flight cost.
   */
  async estimateCost(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<{ totalCost: number } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const costEstimate = await this.costEstimates.findOne({
      travelPlanID: travelPlan,
    });

    if (!costEstimate) {
      return { error: "No cost estimate found for this travel plan." };
    }

    // Calculate number of days (inclusive of arrival day if departing on same day as arrival, min 1 day)
    const numDays = Math.max(
      1, // Ensure at least 1 day for calculation if fromDate and toDate are the same
      Math.ceil(
        (existingTravelPlan.toDate.getTime() -
          existingTravelPlan.fromDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    // Assuming numDays also represents nights for roomsPerNight for simplification
    // For more accuracy, one might adjust `numNights` for accommodation calculations:
    // `numNights = Math.max(0, Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)))`
    // However, the problem statement uses 'numNights' as the duration for the prompt,
    // and 'roomsPerNight' is often calculated based on full nights stay.
    // Sticking to `numDays` for both for consistency with earlier `numNights` calculation in `generateAICostEstimate`.
    const totalCost = costEstimate.flight +
      (costEstimate.roomsPerNight * numDays) +
      (costEstimate.foodDaily * numDays);

    return { totalCost: totalCost };
  }

  // --- Queries ---

  /**
   * _getAllTravelPlans (user: User): (travelPlans: TravelPlan[])
   *
   * **requires** `user` exists
   *
   * **effects** Returns a list of all `TravelPlan` IDs associated with the given `user`.
   */
  async _getAllTravelPlans(
    { user }: { user: ID },
  ): Promise<TravelPlan[] | { error: string }[]> { // Changed return type to TravelPlan[]
    // Check if user exists (as per "requires" clause).
    // If user doesn't exist, return an error as specified for typical error handling.
    const userExists = await this.users.findOne({ _id: user });
    if (!userExists) {
      return [{ error: `User with ID ${user} does not exist.` }];
    }

    // Project only the _id field
    const plans = await this.travelPlans.find({ userID: user }, {
      projection: { _id: 1 },
    }).toArray();

    // Map to an array of TravelPlan IDs (which are of type ID)
    return plans.map((plan) => plan._id as TravelPlan); // Explicitly cast to TravelPlan for type safety
  }
}
```

# how did TripCostEstimationConcept.ts change? I don't think it changed at all, right? b/c we only changed gemini-llm
# response:

You are correct to observe that the changes to `TripCostEstimationConcept.ts` were minimal in response to the update to `gemini-llm.ts`.

The primary change in `TripCostEstimationConcept.ts` involved its **import statement** for `gemini-llm.ts`.

Here's the exact difference:

**Before the `apiKey` update (and after moving interfaces out):**

```typescript
import { GeminiLLM, Config as GeminiLLMConfig } from "@utils/gemini-llm.ts"; // Renamed Config to GeminiLLMConfig to avoid conflict
```

**After the `apiKey` update (where `GeminiLLM` no longer needs a `Config` object in its constructor):**

```typescript
import { GeminiLLM } from "@utils/gemini-llm.ts"; // The Config interface is no longer needed here.
```

The alias `Config as GeminiLLMConfig` was removed from the import because the `GeminiLLM` class's constructor no longer accepts a `Config` object, as it now retrieves the API key directly from environment variables. Therefore, the `TripCostEstimationConcept` no longer needed to import that `Config` type.

No other parts of `TripCostEstimationConcept.ts` (like method signatures or internal logic for actions/queries) were directly altered by this change to how `GeminiLLM` is configured.


# implement: concept TripCostEstimation

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
    *   **Effect:** Retrieves trip details (dates, locations) and necessity preference (accommodation, dining) and uses the llm's specialized tool (e.g., Google Search/Flights/Hotels) to calculate and return the median cost estimates for flight, `rooms_per_night`, and `food_daily`; the resulting data is stored as a new `CostEstimate` associated with the `travelPlanID`.
    *   **Note:** The LLM prompt will be specifically tailored to search for accommodation prices matching the `accommodation` Boolean (e.g., true for hotel/motel costs) and food costs based on the `diningFlag` (true for "restaurant costs," false for "no food costs"). If the LLM fails to provide an estimate for any reason or the costs are widely inaccurate (less than 50, more than 100000 for example) then the user can manually enter the total cost of the trip that they plan to save for.

*   `estimateCost (user: User, travelPlan: TravelPlan): (totalCost: Number)`
    *   **Requires:** `travelPlan` exists and belongs to user and an associated `CostEstimate` exists
    *   **Effect:** Calculates and returns the `totalCost` by multiplying the estimated daily/nightly costs by the duration and adding the flight cost.

* `_getAllTravelPlans(user: User): (travelPlans: TravelPlan[])`
	  *  **Requires:** `user` exists
	  *  **Effect:** Returns a list of all `TravelPlans` associated with the given `user`.

# response:

# file: src/utils/gemini-llm.ts

```typescript
import { GoogleGenerativeAI } from 'npm:@google/generative-ai';
import "jsr:@std/dotenv/load"; // Import dotenv to load environment variables

/**
 * Configuration for retry behavior
 */
interface RetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    timeoutMs: number;
}

/**
 * LLM Integration for TripCostEstimation
 *
 * Handles raw LLM text generation requests using Google's Gemini API with robust error handling,
 * timeouts, retries with exponential backoff, and comprehensive validation.
 * It does NOT perform any parsing of the LLM's output.
 */
export class GeminiLLM {
    private retryConfig: RetryConfig;

    // Constructor no longer takes config, as API key and model are fetched from environment
    constructor() {
        this.retryConfig = {
            maxRetries: 3,
            baseDelayMs: 1000,
            maxDelayMs: 10000,
            timeoutMs: 30000
        };
    }

    /**
     * Execute LLM with timeout, retries, and exponential backoff
     * @requires prompt is a non-empty string
     * @returns Promise<string> containing the LLM response (raw text, expected JSON)
     * @throws Error if the prompt is empty or if the LLM API call fails after retries.
     */
    async executeLLM(prompt: string): Promise<string> {
        if (!prompt || prompt.trim().length === 0) {
            throw new Error('Prompt cannot be empty or null');
        }

        let lastError: Error | null = null;
        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                const result = await this.executeWithTimeout(prompt);
                return result;
            } catch (error) {
                lastError = error as Error;
                // Don't retry on certain types of errors
                if (this.isNonRetryableError(error as Error)) {
                    throw new Error(`Non-retryable error: ${(error as Error).message}`);
                }
                // If this is the last attempt, throw the error
                if (attempt === this.retryConfig.maxRetries) {
                    break;
                }
                // Calculate delay with exponential backoff
                const delay = Math.min(
                    this.retryConfig.baseDelayMs * Math.pow(2, attempt),
                    this.retryConfig.maxDelayMs
                );
                console.log(`❌ Attempt ${attempt + 1} failed: ${(error as Error).message}. Retrying in ${delay}ms...`);
                await this.sleep(delay);
            }
        }
        throw new Error(`LLM request failed after ${this.retryConfig.maxRetries + 1} attempts. Last error: ${lastError?.message}`);
    }

    /**
     * Execute LLM request with timeout.
     */
    private async executeWithTimeout(prompt: string): Promise<string> {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`LLM request timed out after ${this.retryConfig.timeoutMs}ms`));
            }, this.retryConfig.timeoutMs);
        });

        const llmPromise = this.callGeminiAPI(prompt);
        return Promise.race([llmPromise, timeoutPromise]);
    }

    /**
     * Make the actual API call to Gemini.
     */
    private async callGeminiAPI(prompt: string): Promise<string> {
        try {
            // Get API key and model from environment variables
            const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
            const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL");

            if (!GEMINI_API_KEY) {
                throw new Error("Missing GEMINI_API_KEY environment variable.");
            }
            if (!GEMINI_MODEL) {
                throw new Error("Missing GEMINI_MODEL environment variable. Please specify a model (e.g., 'gemini-1.5-flash').");
            }

            // Initialize Gemini AI
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: GEMINI_MODEL,
                generationConfig: {
                    maxOutputTokens: 1000,
                    temperature: 0.1, // Lower temperature for more consistent responses
                    responseMimeType: "application/json", // Explicitly request JSON output for structured response
                }
            });
            // Execute the LLM
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            if (!text || text.trim().length === 0) {
                throw new Error('LLM returned empty response');
            }
            return text;
        } catch (error) {
            const errorMessage = (error as Error).message;
            // Provide more specific error messages
            if (errorMessage.includes('API_KEY_INVALID')) {
                throw new Error('Invalid API key provided');
            } else if (errorMessage.includes('QUOTA_EXCEEDED')) {
                throw new Error('API quota exceeded - please try again later');
            } else if (errorMessage.includes('SAFETY')) {
                throw new Error('Request blocked by safety filters - please modify your prompt');
            } else if (errorMessage.includes('PERMISSION_DENIED')) {
                throw new Error('Permission denied - check your API key permissions');
            } else {
                throw new Error(`Gemini API error: ${errorMessage}`);
            }
        }
    }

    /**
     * Check if an error should not be retried.
     */
    private isNonRetryableError(error: Error): boolean {
        const message = error.message.toLowerCase();
        return message.includes('invalid api key') ||
            message.includes('permission denied') ||
            message.includes('quota exceeded') ||
            message.includes('safety') ||
            message.includes('prompt cannot be empty');
    }

    /**
     * Sleep utility for delays.
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

# file: src/TripCostEstimation/TripCostEstimationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { GeminiLLM } from "@utils/gemini-llm.ts";

// Declare collection prefix, use concept name
const PREFIX = "TripCostEstimation" + ".";

// Generic types of this concept (all are IDs when referenced as foreign keys)
type User = ID;
type Location = ID;
type TravelPlan = ID;
type Necessity = ID;
type CostEstimate = ID;

/**
 * Interface for the structured cost estimate output that the LLM is expected to generate.
 * This defines the target structure for the parsing logic in the Concept class.
 */
interface CostEstimateResponse {
  flight?: number;
  roomsPerNight?: number;
  foodDaily?: number;
  // The `error` field is handled by the action's overall return type, not by this specific LLM parsing output.
}

// --- State Interfaces ---

/**
 * A set of Users
 * (Documents store the user's ID. TravelPlans link back to User IDs.)
 */
interface UsersDoc {
  _id: User;
  // No other properties explicitly defined by the state for a User itself,
  // as TravelPlans are linked to Users.
}

/**
 * A set of Locations with
 *   a city String
 */
interface LocationsDoc {
  _id: Location;
  city: string;
}

/**
 * A set of TravelPlans with
 *   a `userID` User (Implicitly added for linking TravelPlans to Users)
 *   a `fromCity` Location (ID)
 *   a `toCity` Location (ID)
 *   a `fromDate` Date
 *   a `toDate` Date
 *   a `necessityID` Necessity (ID)
 */
interface TravelPlansDoc {
  _id: TravelPlan;
  userID: User; // Link to UsersDoc
  fromCity: Location; // Link to LocationsDoc
  toCity: Location; // Link to LocationsDoc
  fromDate: Date;
  toDate: Date;
  necessityID: Necessity; // Link to NecessitiesDoc
}

/**
 * A set of Necessities with
 *   an `accommodation` Boolean
 *   a `diningFlag` Boolean
 */
interface NecessitiesDoc {
  _id: Necessity;
  accommodation: boolean; // true for saving for rooms, false for not
  diningFlag: boolean; // true for saving for eating out, false for not
}

/**
 * A set of CostEstimates with
 *   a `travelPlanID` TravelPlan (ID)
 *   a `flight` Number // estimated total round-trip flight cost in USD
 *   a `roomsPerNight` Number // estimated cost per night in USD
 *   a `foodDaily` Number // estimated cost per day in USD
 *   a `lastUpdated` Date // tracking when the estimate was generated
 */
interface CostEstimatesDoc {
  _id: CostEstimate;
  travelPlanID: TravelPlan; // Link to TravelPlansDoc
  flight: number; // estimated total round-trip flight cost in USD
  roomsPerNight: number; // estimated cost per night in USD
  foodDaily: number; // estimated cost per day in USD
  lastUpdated: Date; // tracking when the estimate was generated
}

/**
 * @purpose Generate realistic cost estimates based on trip details, using AI for data retrieval and calculation.
 * @principle Based on a user's choice of initial departure city and arrival city, and the user's sheltering
 *            accommodations and food location preferences, an estimate is provided; the LLM is used to search
 *            for and calculate median cost ranges based on the provided necessities.
 */
export default class TripCostEstimationConcept {
  // --- MongoDB Collections ---
  private users: Collection<UsersDoc>;
  private locations: Collection<LocationsDoc>;
  private travelPlans: Collection<TravelPlansDoc>;
  private necessities: Collection<NecessitiesDoc>;
  private costEstimates: Collection<CostEstimatesDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
    this.locations = this.db.collection(PREFIX + "locations");
    this.travelPlans = this.db.collection(PREFIX + "travelPlans");
    this.necessities = this.db.collection(PREFIX + "necessities");
    this.costEstimates = this.db.collection(PREFIX + "costEstimates");
  }

  // --- Private Helper Methods ---

  /**
   * Parses the LLM's raw string response into a structured CostEstimateResponse object.
   * Assumes the LLM response is a JSON string, potentially wrapped in markdown.
   * This method is private to the concept, enforcing separation of concerns
   * between LLM interaction and domain-specific parsing.
   * @param rawResponse The raw string output received from the LLM.
   * @returns CostEstimateResponse if parsing is successful, or an object with an `error` string.
   */
  private _parseLLMCostEstimate(
    rawResponse: string,
  ): CostEstimateResponse | { error: string } {
    try {
      let jsonString = rawResponse.trim();

      // Attempt to remove markdown code block wrappers if present
      if (jsonString.startsWith("```json") && jsonString.endsWith("```")) {
        jsonString = jsonString.substring(7, jsonString.length - 3).trim();
      } else if (jsonString.startsWith("```") && jsonString.endsWith("```")) {
        jsonString = jsonString.substring(3, jsonString.length - 3).trim();
      }

      const parsed = JSON.parse(jsonString);

      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("LLM response is not a valid JSON object.");
      }

      const costEstimate: CostEstimateResponse = {};
      if (typeof parsed.flight === "number") costEstimate.flight = parsed.flight;
      if (typeof parsed.roomsPerNight === "number") {
        costEstimate.roomsPerNight = parsed.roomsPerNight;
      }
      if (typeof parsed.foodDaily === "number") costEstimate.foodDaily = parsed.foodDaily;

      // Log warnings for unexpected types but still return what was successfully parsed
      if (parsed.flight !== undefined && typeof parsed.flight !== "number") {
        console.warn("LLM response 'flight' field is not a number:", parsed.flight);
      }
      if (
        parsed.roomsPerNight !== undefined &&
        typeof parsed.roomsPerNight !== "number"
      ) {
        console.warn(
          "LLM response 'roomsPerNight' field is not a number:",
          parsed.roomsPerNight,
        );
      }
      if (parsed.foodDaily !== undefined && typeof parsed.foodDaily !== "number") {
        console.warn(
          "LLM response 'foodDaily' field is not a number:",
          parsed.foodDaily,
        );
      }

      // Check if any *expected* fields are missing or invalid after parsing,
      // and if so, return an error. The prompt explicitly asks for these.
      if (
        costEstimate.flight === undefined ||
        costEstimate.roomsPerNight === undefined ||
        costEstimate.foodDaily === undefined
      ) {
        // If at least one of the primary expected cost fields is missing/invalid,
        // consider the parsing unsuccessful for a full estimate.
        return {
          error:
            `LLM response could not be parsed into all required cost components (flight, roomsPerNight, foodDaily). Raw: ${jsonString}`,
        };
      }

      return costEstimate;
    } catch (e) {
      console.error("Failed to parse LLM response:", rawResponse, e);
      return { error: `Failed to parse LLM response into expected JSON format: ${(e as Error).message}` };
    }
  }

  // --- Actions ---

  /**
   * createTravelPlan (user: User, fromCity: Location, toCity: Location, fromDate: Date, toDate: Date): (travelPlan: TravelPlan)
   *
   * **requires** `fromCity` and `toCity` exists and `toDate` >= `fromDate` and both are greater than the current date
   *
   * **effects** Create and return a `travelPlan` with a `fromCity`, `toCity`, and from and to dates, and a default necessity (`accommodation` = true, `diningFlag` = true)
   */
  async createTravelPlan(
    {
      user,
      fromCity,
      toCity,
      fromDate,
      toDate,
    }: {
      user: ID;
      fromCity: ID;
      toCity: ID;
      fromDate: Date;
      toDate: Date;
    },
  ): Promise<{ travelPlan: TravelPlan } | { error: string }> {
    // Requires: fromCity and toCity exist
    const origin = await this.locations.findOne({ _id: fromCity });
    const destination = await this.locations.findOne({ _id: toCity });

    if (!origin) {
      return { error: `Origin city with ID ${fromCity} not found.` };
    }
    if (!destination) {
      return { error: `Destination city with ID ${toCity} not found.` };
    }

    // Requires: toDate >= fromDate
    if (toDate < fromDate) {
      return { error: "Arrival date must be on or after departure date." };
    }

    // Requires: both dates are greater than the current date
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
    if (fromDate < now || toDate < now) {
      return { error: "Departure and arrival dates must be in the future." };
    }

    // Ensure the user exists (or create a placeholder if not found, depending on domain logic)
    await this.users.updateOne(
      { _id: user },
      { $setOnInsert: { _id: user } },
      { upsert: true },
    );

    // Create default Necessity
    const newNecessityID = freshID();
    const newNecessity: NecessitiesDoc = {
      _id: newNecessityID,
      accommodation: true,
      diningFlag: true,
    };
    await this.necessities.insertOne(newNecessity);

    // Create TravelPlan
    const newTravelPlanID = freshID();
    const newTravelPlan: TravelPlansDoc = {
      _id: newTravelPlanID,
      userID: user,
      fromCity: fromCity,
      toCity: toCity,
      fromDate: fromDate,
      toDate: toDate,
      necessityID: newNecessityID,
    };
    await this.travelPlans.insertOne(newTravelPlan);

    return { travelPlan: newTravelPlanID as TravelPlan };
  }

  /**
   * deleteTravelPlan (user: User, travelPlan: TravelPlan): (travelPlan: TravelPlan)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Delete the `travelPlan` and any associated `CostEstimates`
   */
  async deleteTravelPlan(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<{ travelPlan: TravelPlan } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    // Delete associated CostEstimates
    await this.costEstimates.deleteMany({ travelPlanID: travelPlan });

    // Delete associated Necessity (implicitly linked to the travel plan, so it should also be cleaned up)
    await this.necessities.deleteOne({ _id: existingTravelPlan.necessityID });

    // Delete the TravelPlan itself
    await this.travelPlans.deleteOne({ _id: travelPlan });

    return { travelPlan: travelPlan as TravelPlan };
  }

  /**
   * updateNecessity (user: User, travelPlan: TravelPlan, accommodation: Boolean, diningFlag: Boolean): (travelPlan: TravelPlan, necessity: Necessity)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Create and add the `necessity` with `accommodation` and `diningFlag` to `travelPlan` (updates existing necessity)
   */
  async updateNecessity(
    {
      user,
      travelPlan,
      accommodation,
      diningFlag,
    }: {
      user: ID;
      travelPlan: ID;
      accommodation: boolean;
      diningFlag: boolean;
    },
  ): Promise<{ travelPlan: TravelPlan; necessity: Necessity } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const updateResult = await this.necessities.updateOne(
      { _id: existingTravelPlan.necessityID },
      { $set: { accommodation: accommodation, diningFlag: diningFlag } },
    );

    if (updateResult.matchedCount === 0) {
      // This should ideally not happen if travelPlan.necessityID is always valid
      return { error: "Associated necessity not found." };
    }

    return {
      travelPlan: travelPlan as TravelPlan,
      necessity: existingTravelPlan.necessityID as Necessity,
    };
  }

  /**
   * resetNecessity (user: User, travelPlan: TravelPlan): (necessity: Necessity)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Reset the `necessity` belonging to `travelPlan` to the default as described in the action `createTravelPlan`
   */
  async resetNecessity(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<{ necessity: Necessity } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const updateResult = await this.necessities.updateOne(
      { _id: existingTravelPlan.necessityID },
      { $set: { accommodation: true, diningFlag: true } }, // Default values
    );

    if (updateResult.matchedCount === 0) {
      return { error: "Associated necessity not found." };
    }

    return { necessity: existingTravelPlan.necessityID as Necessity };
  }

  /**
   * generateAICostEstimate (user: User, travelPlan: TravelPlan, llm: GeminiLLM): (costEstimate: CostEstimate)
   *
   * **requires** `travelPlan` exists and belongs to user
   *
   * **effects** Retrieves trip details (dates, locations) and necessity preference (accommodation, dining) and uses the llm's specialized tool (e.g., Google Search/Flights/Hotels) to calculate and return the median cost estimates for flight, `rooms_per_night`, and `food_daily`; the resulting data is stored as a new `CostEstimate` associated with the `travelPlanID`.
   * **Note:** The LLM prompt will be specifically tailored to search for accommodation prices matching the `accommodation` Boolean (e.g., true for hotel/motel costs) and food costs based on the `diningFlag` (true for "restaurant costs," false for "no food costs"). If the LLM fails to provide an estimate for any reason or the costs are widely inaccurate (less than 50, more than 100000 for example) then the user can manually enter the total cost of the trip that they plan to save for.
   */
  async generateAICostEstimate(
    { user, travelPlan, llm }: { user: ID; travelPlan: ID; llm: GeminiLLM },
  ): Promise<{ costEstimate: CostEstimate } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const [originCityDoc, destinationCityDoc, necessityDoc] = await Promise.all(
      [
        this.locations.findOne({ _id: existingTravelPlan.fromCity }),
        this.locations.findOne({ _id: existingTravelPlan.toCity }),
        this.necessities.findOne({ _id: existingTravelPlan.necessityID }),
      ],
    );

    if (!originCityDoc || !destinationCityDoc || !necessityDoc) {
      return { error: "Referenced location or necessity data not found." };
    }

    const numNights = Math.ceil(
      (existingTravelPlan.toDate.getTime() -
        existingTravelPlan.fromDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const fromDateStr = existingTravelPlan.fromDate.toISOString().split("T")[0];
    const toDateStr = existingTravelPlan.toDate.toISOString().split("T")[0];

    const accommodationPreference = necessityDoc.accommodation
      ? "hotel/motel costs"
      : "no accommodation costs (e.g., staying with friends/family)";
    const diningPreference = necessityDoc.diningFlag
      ? "daily restaurant food costs"
      : "no food costs (e.g., cooking own meals)";

    // Prompt explicitly asks for JSON, as the LLM utility is configured for it.
    const prompt =
      `Please provide a cost estimate in JSON format for a trip. ` +
      `Estimate median round-trip flight, ${
        accommodationPreference
      }, and ${diningPreference} ` +
      `from ${originCityDoc.city} to ${destinationCityDoc.city} ` +
      `departing on ${fromDateStr} and returning on ${toDateStr} ` +
      `for a trip lasting approximately ${numNights} nights. ` +
      `The JSON object should have the structure: ` +
      `{"flight": <number>, "roomsPerNight": <number>, "foodDaily": <number>}. ` +
      `Return only the JSON object.`;

    let llmRawResult: string;
    try {
      // Call executeLLM directly as per the refined gemini-llm.ts
      llmRawResult = await llm.executeLLM(prompt);
    } catch (llmError) {
      // Catch errors thrown by GeminiLLM.executeLLM
      return { error: `LLM API call failed: ${(llmError as Error).message}` };
    }

    // Parse the raw LLM response using the private method in the concept.
    const parsedCostEstimate = this._parseLLMCostEstimate(llmRawResult);

    if ("error" in parsedCostEstimate) {
      return { error: parsedCostEstimate.error };
    }

    const flightCost = parsedCostEstimate.flight ?? 0;
    const roomsPerNightCost = parsedCostEstimate.roomsPerNight ?? 0;
    const foodDailyCost = parsedCostEstimate.foodDaily ?? 0;

    // Basic validation for wide inaccuracies
    if (
      flightCost < 50 || flightCost > 100000 ||
      roomsPerNightCost < 0 || roomsPerNightCost > 5000 ||
      foodDailyCost < 0 || foodDailyCost > 1000
    ) {
      return {
        error:
          "LLM provided cost estimates are widely inaccurate or outside reasonable bounds. Please consider manual input.",
      };
    }

    const newCostEstimateID = freshID();
    const newCostEstimate: CostEstimatesDoc = {
      _id: newCostEstimateID,
      travelPlanID: travelPlan,
      flight: flightCost,
      roomsPerNight: roomsPerNightCost,
      foodDaily: foodDailyCost,
      lastUpdated: new Date(),
    };

    // Replace any existing estimate for this travel plan
    await this.costEstimates.replaceOne(
      { travelPlanID: travelPlan },
      newCostEstimate,
      { upsert: true },
    );

    return { costEstimate: newCostEstimateID as CostEstimate };
  }

  /**
   * estimateCost (user: User, travelPlan: TravelPlan): (totalCost: Number)
   *
   * **requires** `travelPlan` exists and belongs to user and an associated `CostEstimate` exists
   *
   * **effects** Calculates and returns the `totalCost` by multiplying the estimated daily/nightly costs by the duration and adding the flight cost.
   */
  async estimateCost(
    { user, travelPlan }: { user: ID; travelPlan: ID },
  ): Promise<{ totalCost: number } | { error: string }> {
    const existingTravelPlan = await this.travelPlans.findOne({
      _id: travelPlan,
      userID: user,
    });

    if (!existingTravelPlan) {
      return {
        error: "Travel plan not found or does not belong to the user.",
      };
    }

    const costEstimate = await this.costEstimates.findOne({
      travelPlanID: travelPlan,
    });

    if (!costEstimate) {
      return { error: "No cost estimate found for this travel plan." };
    }

    // Calculate number of days (inclusive of arrival day if departing on same day as arrival, min 1 day)
    const numDays = Math.max(
      1, // Ensure at least 1 day for calculation if fromDate and toDate are the same
      Math.ceil(
        (existingTravelPlan.toDate.getTime() -
          existingTravelPlan.fromDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    const totalCost = costEstimate.flight +
      (costEstimate.roomsPerNight * numDays) +
      (costEstimate.foodDaily * numDays);

    return { totalCost: totalCost };
  }

  // --- Queries ---

  /**
   * _getAllTravelPlans (user: User): (travelPlans: TravelPlan[])
   *
   * **requires** `user` exists
   *
   * **effects** Returns a list of all `TravelPlan` IDs associated with the given `user`.
   */
  async _getAllTravelPlans(
    { user }: { user: ID },
  ): Promise<TravelPlan[] | { error: string }[]> {
    // Check if user exists (as per "requires" clause).
    const userExists = await this.users.findOne({ _id: user });
    if (!userExists) {
      return [{ error: `User with ID ${user} does not exist.` }];
    }

    // Project only the _id field
    const plans = await this.travelPlans.find({ userID: user }, {
      projection: { _id: 1 },
    }).toArray();

    // Map to an array of TravelPlan IDs (which are of type ID)
    return plans.map((plan) => plan._id as TravelPlan);
  }
}
```

# question: for the above code: except for primitive types, like number, string, the return types are ID's right?
# response:

Yes, your understanding is largely correct!

To be precise:

1.  **`ID` is a primitive type (string) under the hood:** The `ID` type is a "branded type" in TypeScript. While it gives you strong type checking for identifiers, at runtime and for serialization (like JSON), it's still just a `string`. So, when you see a return type like `{ travelPlan: TravelPlan }` where `TravelPlan` is `ID`, it means it's returning a dictionary with a key `travelPlan` whose value is a string (an ID).

2.  **Actions always return a dictionary:**
    *   For successful operations, the dictionary contains the specific ID(s) (`TravelPlan`, `Necessity`, `CostEstimate`) or primitive values (`number` for `totalCost`) as specified.
    *   For errors, they return `{ error: string }`. Both `string` and `number` are primitive types.
    *   `Empty` is `Record<PropertyKey, never>`, which means an empty object `{}`. This is also considered primitive in terms of JSON structure (an empty object).

3.  **Queries always return an array of dictionaries (or an array of primitives for ID lists):**
    *   For `_getAllTravelPlans`, it now correctly returns `TravelPlan[]`, which is an array of `ID`s. Since `ID` is a `string`, this is an array of primitive strings.
    *   If a query were designed to return multiple properties for each item (e.g., `_getUserDetails(id: ID): (username: String, email: String)[]`), it would return an array of dictionaries, where each dictionary's values (`username`, `email`) would be primitives.

**In summary:**

The values within the returned dictionaries (for actions) or within the items of the returned array (for queries) will *always* be primitive TypeScript types (`string`, `number`, `boolean`, `null`) or the `ID` type (which *is* a `string`). You will not see nested custom objects in the immediate return signature for actions, and for queries, any nested objects are composed of these primitive types.

This strict adherence ensures that the inputs and outputs are easily serializable to and from JSON, which is a key principle of the concept implementation.


# getting different AI cost estimates because i think the temperature is too high, for my use case i think the temperature should be lower
# response:

You are right, a higher temperature typically leads to more varied and creative responses, while a lower temperature makes the model more deterministic and focused. Since you're looking for consistent cost estimates, a lower temperature is indeed appropriate.

The current `temperature` in your `gemini-llm.ts` file is already set to `0.1`. To make it even more deterministic and consistent, you can set it to `0.0`, which is typically the lowest possible value and aims for the most "factual" or consistent output.

Here's the change in `src/utils/gemini-llm.ts`:

```typescript
// src/utils/gemini-llm.ts

import { GoogleGenerativeAI } from 'npm:@google/generative-ai';
import "jsr:@std/dotenv/load"; // Import dotenv to load environment variables

/**
 * Configuration for retry behavior
 */
interface RetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    timeoutMs: number;
}

/**
 * LLM Integration for TripCostEstimation
 *
 * Handles raw LLM text generation requests using Google's Gemini API with robust error handling,
 * timeouts, retries with exponential backoff, and comprehensive validation.
 * It does NOT perform any parsing of the LLM's output.
 */
export class GeminiLLM {
    private retryConfig: RetryConfig;

    // Constructor no longer takes config, as API key and model are fetched from environment
    constructor() {
        this.retryConfig = {
            maxRetries: 3,
            baseDelayMs: 1000,
            maxDelayMs: 10000,
            timeoutMs: 30000
        };
    }

    /**
     * Execute LLM with timeout, retries, and exponential backoff
     * @requires prompt is a non-empty string
     * @returns Promise<string> containing the LLM response (raw text, expected JSON)
     * @throws Error if the prompt is empty or if the LLM API call fails after retries.
     */
    async executeLLM(prompt: string): Promise<string> {
        if (!prompt || prompt.trim().length === 0) {
            throw new Error('Prompt cannot be empty or null');
        }

        let lastError: Error | null = null;
        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                const result = await this.executeWithTimeout(prompt);
                return result;
            } catch (error) {
                lastError = error as Error;
                // Don't retry on certain types of errors
                if (this.isNonRetryableError(error as Error)) {
                    throw new Error(`Non-retryable error: ${(error as Error).message}`);
                }
                // If this is the last attempt, throw the error
                if (attempt === this.retryConfig.maxRetries) {
                    break;
                }
                // Calculate delay with exponential backoff
                const delay = Math.min(
                    this.retryConfig.baseDelayMs * Math.pow(2, attempt),
                    this.retryConfig.maxDelayMs
                );
                console.log(`❌ Attempt ${attempt + 1} failed: ${(error as Error).message}. Retrying in ${delay}ms...`);
                await this.sleep(delay);
            }
        }
        throw new Error(`LLM request failed after ${this.retryConfig.maxRetries + 1} attempts. Last error: ${lastError?.message}`);
    }

    /**
     * Execute LLM request with timeout.
     */
    private async executeWithTimeout(prompt: string): Promise<string> {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`LLM request timed out after ${this.retryConfig.timeoutMs}ms`));
            }, this.retryConfig.timeoutMs);
        });

        const llmPromise = this.callGeminiAPI(prompt);
        return Promise.race([llmPromise, timeoutPromise]);
    }

    /**
     * Make the actual API call to Gemini.
     */
    private async callGeminiAPI(prompt: string): Promise<string> {
        try {
            // Get API key and model from environment variables
            const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
            const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL");

            if (!GEMINI_API_KEY) {
                throw new Error("Missing GEMINI_API_KEY environment variable.");
            }
            if (!GEMINI_MODEL) {
                throw new Error("Missing GEMINI_MODEL environment variable. Please specify a model (e.g., 'gemini-1.5-flash').");
            }

            // Initialize Gemini AI
            const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: GEMINI_MODEL,
                generationConfig: {
                    maxOutputTokens: 1000,
                    temperature: 0.0, // Changed temperature from 0.1 to 0.0 for maximum consistency
                    responseMimeType: "application/json", // Explicitly request JSON output for structured response
                }
            });
            // Execute the LLM
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            if (!text || text.trim().length === 0) {
                throw new Error('LLM returned empty response');
            }
            return text;
        } catch (error) {
            const errorMessage = (error as Error).message;
            // Provide more specific error messages
            if (errorMessage.includes('API_KEY_INVALID')) {
                throw new Error('Invalid API key provided');
            } else if (errorMessage.includes('QUOTA_EXCEEDED')) {
                throw new Error('API quota exceeded - please try again later');
            } else if (errorMessage.includes('SAFETY')) {
                throw new Error('Request blocked by safety filters - please modify your prompt');
            } else if (errorMessage.includes('PERMISSION_DENIED')) {
                throw new Error('Permission denied - check your API key permissions');
            } else {
                throw new Error(`Gemini API error: ${errorMessage}`);
            }
        }
    }

    /**
     * Check if an error should not be retried.
     */
    private isNonRetryableError(error: Error): boolean {
        const message = error.message.toLowerCase();
        return message.includes('invalid api key') ||
            message.includes('permission denied') ||
            message.includes('quota exceeded') ||
            message.includes('safety') ||
            message.includes('prompt cannot be empty');
    }

    /**
     * Sleep utility for delays.
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```