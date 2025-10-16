---
timestamp: 'Thu Oct 16 2025 12:47:34 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_124734.bb10b29d.md]]'
content_id: f69bde7ad71d825d170bbcfa340f892c879472136751aeb44d6178e0d6ab1362
---

# response:

To adhere to the separation of concerns, we'll move the LLM integration logic into a new utility file, `src/utils/gemini-llm.ts`. This file will contain the `GeminiLLM` class, which handles API calls, retries, timeouts, and most importantly, parsing the LLM's response into a structured cost estimate.

The `generateAICostEstimate` action within the `TripCostEstimationConcept` will then import and use this `GeminiLLM` class, ensuring that the concept focuses solely on business logic and state management, delegating external API interactions to the utility.

### Step 1: Create `src/utils/gemini-llm.ts`

````typescript
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
````

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
