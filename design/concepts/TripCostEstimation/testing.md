
[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)


# test: TripCostEstimation given the following implementation
``` typescript
import { Collection, Db } from "npm:mongodb";

import { ID, Empty } from "@utils/types.ts";

import { freshID } from "@utils/database.ts";

// Import the GeminiLLM and its Config interface

import { GeminiLLM} from "@utils/gemini-llm.ts"; // Renamed Config to GeminiLLMConfig to avoid conflict

  

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

  

/**

 * @purpose Generate realistic cost estimates based on trip details, using AI for data retrieval and calculation.

 * @principle Based on a user's choice of initial departure city and arrival city, and the user's sheltering

 *            accommodations and food location preferences, an estimate is provided; the LLM is used to search

 *            for and calculate median cost ranges based on the provided necessities.

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

    return plans.map((plan: TravelPlansDoc) => plan._id as TravelPlan); // Explicitly cast to TravelPlan for type safety

  }

}
```

# response:

# file: src/TripCostEstimation/TripCostEstimationConcept.test.ts

```typescript
import { assertEquals, assertObjectMatch, assertInstanceOf } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Import the concept class and its dependencies
import TripCostEstimationConcept from "./TripCostEstimationConcept.ts";
import { GeminiLLM } from "@utils/gemini-llm.ts"; // Only need GeminiLLM, not Config directly

// Helper types from the concept for clarity in tests
type User = ID;
type Location = ID;
type TravelPlan = ID;
type Necessity = ID;
type CostEstimate = ID;

// Define the state interfaces for easy access in tests, as they are now module-scoped
interface UsersDoc { _id: User; }
interface LocationsDoc { _id: Location; city: string; }
interface TravelPlansDoc { _id: TravelPlan; userID: User; fromCity: Location; toCity: Location; fromDate: Date; toDate: Date; necessityID: Necessity; }
interface NecessitiesDoc { _id: Necessity; accommodation: boolean; diningFlag: boolean; }
interface CostEstimatesDoc { _id: CostEstimate; travelPlanID: TravelPlan; flight: number; roomsPerNight: number; foodDaily: number; lastUpdated: Date; }


// Mock GeminiLLM for testing purposes
class MockGeminiLLM implements GeminiLLM {
    private mockResponse: string | Error;
    private shouldThrow: boolean = false;

    constructor(response: string | Error = "") {
        this.mockResponse = response;
        if (response instanceof Error) {
            this.shouldThrow = true;
        }
    }

    /**
     * Mimics the executeLLM method from the actual GeminiLLM,
     * returning a predefined response or throwing an error.
     */
    async executeLLM(prompt: string): Promise<string> {
        console.log(`[MockGeminiLLM] Received prompt: ${prompt.substring(0, 100)}...`);
        if (this.shouldThrow) {
            throw this.mockResponse;
        }
        return Promise.resolve(this.mockResponse as string);
    }
}


Deno.test("TripCostEstimationConcept: All Actions and Queries", async (t) => {
    const [db, client] = await testDb();
    const concept = new TripCostEstimationConcept(db);

    const userAlice = "user:Alice" as User;
    const locationNYC = freshID() as Location;
    const locationLA = freshID() as Location;
    const locationCHI = freshID() as Location; // Additional location for variety

    // Pre-populate locations for tests
    await concept["locations"].insertOne({ _id: locationNYC, city: "New York City" });
    await concept["locations"].insertOne({ _id: locationLA, city: "Los Angeles" });
    await concept["locations"].insertOne({ _id: locationCHI, city: "Chicago" });

    // Explicitly add user Alice as per some concepts, although createTravelPlan upserts it.
    await concept["users"].updateOne(
        { _id: userAlice },
        { $setOnInsert: { _id: userAlice } },
        { upsert: true },
    );

    // Deno.test.data is used to pass state between sequential `t.step` tests within the same `Deno.test` block.
    interface TestData {
        travelPlanId?: TravelPlan;
        fromDate?: Date;
        toDate?: Date;
        userAlice: User;
        locationNYC: Location;
        locationLA: Location;
        costEstimateId?: CostEstimate;
    }
    const testData: TestData = { userAlice, locationNYC, locationLA };


    await t.step("Action: createTravelPlan - Successful creation", async () => {
        console.log("--- Test: createTravelPlan - Successful creation ---");
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() + 10);
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + 15);

        const result = await concept.createTravelPlan({
            user: testData.userAlice,
            fromCity: testData.locationNYC,
            toCity: testData.locationLA,
            fromDate: fromDate,
            toDate: toDate,
        });

        if ("error" in result) {
            throw new Error(`Failed to create travel plan: ${result.error}`);
        }
        const travelPlanId = result.travelPlan;
        console.log(`Created travel plan with ID: ${travelPlanId}`);

        const createdPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
        assertEquals(createdPlan?._id, travelPlanId, "Travel plan should exist");
        assertEquals(createdPlan?.userID, testData.userAlice, "Travel plan should be linked to user");
        assertEquals(createdPlan?.fromCity, testData.locationNYC, "fromCity should be correct");
        assertEquals(createdPlan?.toCity, testData.locationLA, "toCity should be correct");

        const associatedNecessity = await concept["necessities"].findOne({ _id: createdPlan?.necessityID });
        assertEquals(associatedNecessity?.accommodation, true, "Default accommodation should be true");
        assertEquals(associatedNecessity?.diningFlag, true, "Default diningFlag should be true");

        // Store for subsequent tests
        testData.travelPlanId = travelPlanId;
        testData.fromDate = fromDate;
        testData.toDate = toDate;
    });

    await t.step("Action: createTravelPlan - Requires: fromCity does not exist", async () => {
        console.log("--- Test: createTravelPlan - Requires: fromCity does not exist ---");
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() + 10);
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + 15);
        const nonExistentLocation = freshID() as Location;

        const result = await concept.createTravelPlan({
            user: testData.userAlice,
            fromCity: nonExistentLocation,
            toCity: testData.locationLA,
            fromDate: fromDate,
            toDate: toDate,
        });
        assertObjectMatch(result, { error: `Origin city with ID ${nonExistentLocation} not found.` });
        console.log(`Confirmed error: ${result.error}`);
    });

    await t.step("Action: createTravelPlan - Requires: toDate < fromDate", async () => {
        console.log("--- Test: createTravelPlan - Requires: toDate < fromDate ---");
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() + 15);
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + 10); // toDate is before fromDate

        const result = await concept.createTravelPlan({
            user: testData.userAlice,
            fromCity: testData.locationNYC,
            toCity: testData.locationLA,
            fromDate: fromDate,
            toDate: toDate,
        });
        assertObjectMatch(result, { error: "Arrival date must be on or after departure date." });
        console.log(`Confirmed error: ${result.error}`);
    });

    await t.step("Action: createTravelPlan - Requires: fromDate is in the past", async () => {
        console.log("--- Test: createTravelPlan - Requires: fromDate is in the past ---");
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 5); // in the past
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + 10);

        const result = await concept.createTravelPlan({
            user: testData.userAlice,
            fromCity: testData.locationNYC,
            toCity: testData.locationLA,
            fromDate: fromDate,
            toDate: toDate,
        });
        assertObjectMatch(result, { error: "Departure and arrival dates must be in the future." });
        console.log(`Confirmed error: ${result.error}`);
    });

    await t.step("Action: updateNecessity - Successful update", async () => {
        console.log("--- Test: updateNecessity - Successful update ---");
        const { travelPlanId, userAlice } = testData;

        const updateResult = await concept.updateNecessity({
            user: userAlice,
            travelPlan: travelPlanId!,
            accommodation: false,
            diningFlag: true,
        });

        if ("error" in updateResult) {
            throw new Error(`Failed to update necessity: ${updateResult.error}`);
        }
        console.log(`Updated necessity for travel plan ${travelPlanId}`);

        const updatedPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
        const updatedNecessity = await concept["necessities"].findOne({ _id: updatedPlan?.necessityID });
        assertEquals(updatedNecessity?.accommodation, false, "Accommodation should be false");
        assertEquals(updatedNecessity?.diningFlag, true, "DiningFlag should be true");
        assertEquals(updateResult.travelPlan, travelPlanId);
        assertEquals(updateResult.necessity, updatedPlan?.necessityID);
    });

    await t.step("Action: updateNecessity - Requires: travelPlan does not belong to user", async () => {
        console.log("--- Test: updateNecessity - Requires: travelPlan does not belong to user ---");
        const { travelPlanId } = testData;
        const userBob = "user:Bob" as User;

        const result = await concept.updateNecessity({
            user: userBob,
            travelPlan: travelPlanId!,
            accommodation: true,
            diningFlag: false,
        });
        assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." });
        console.log(`Confirmed error: ${result.error}`);
    });

    await t.step("Action: resetNecessity - Successful reset", async () => {
        console.log("--- Test: resetNecessity - Successful reset ---");
        const { travelPlanId, userAlice } = testData;

        // First, change it to something non-default
        await concept.updateNecessity({ user: userAlice, travelPlan: travelPlanId!, accommodation: false, diningFlag: false });
        const preResetPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
        const preResetNecessity = await concept["necessities"].findOne({ _id: preResetPlan?.necessityID });
        assertEquals(preResetNecessity?.accommodation, false);
        assertEquals(preResetNecessity?.diningFlag, false);
        console.log("Necessity changed from default for reset test.");

        const resetResult = await concept.resetNecessity({
            user: userAlice,
            travelPlan: travelPlanId!,
        });

        if ("error" in resetResult) {
            throw new Error(`Failed to reset necessity: ${resetResult.error}`);
        }
        console.log(`Reset necessity for travel plan ${travelPlanId}`);

        const postResetPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
        const postResetNecessity = await concept["necessities"].findOne({ _id: postResetPlan?.necessityID });
        assertEquals(postResetNecessity?.accommodation, true, "Accommodation should be reset to true");
        assertEquals(postResetNecessity?.diningFlag, true, "DiningFlag should be reset to true");
    });

    await t.step("Action: resetNecessity - Requires: travelPlan does not exist", async () => {
        console.log("--- Test: resetNecessity - Requires: travelPlan does not exist ---");
        const nonExistentTravelPlan = freshID() as TravelPlan;
        const result = await concept.resetNecessity({
            user: testData.userAlice,
            travelPlan: nonExistentTravelPlan,
        });
        assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." });
        console.log(`Confirmed error: ${result.error}`);
    });


    await t.step("Action: generateAICostEstimate - Successful generation", async () => {
        console.log("--- Test: generateAICostEstimate - Successful generation ---");
        const { travelPlanId, userAlice } = testData;

        const mockLlmResponse = JSON.stringify({
            flight: 500,
            roomsPerNight: 150,
            foodDaily: 75,
        });
        const mockLLM = new MockGeminiLLM(mockLlmResponse);

        const result = await concept.generateAICostEstimate({
            user: userAlice,
            travelPlan: travelPlanId!,
            llm: mockLLM,
        });

        if ("error" in result) {
            throw new Error(`Failed to generate AI cost estimate: ${result.error}`);
        }
        const costEstimateId = result.costEstimate;
        console.log(`Generated cost estimate with ID: ${costEstimateId}`);

        const createdEstimate = await concept["costEstimates"].findOne({ _id: costEstimateId, travelPlanID: travelPlanId });
        assertEquals(createdEstimate?.flight, 500);
        assertEquals(createdEstimate?.roomsPerNight, 150);
        assertEquals(createdEstimate?.foodDaily, 75);
        assertInstanceOf(createdEstimate?.lastUpdated, Date);
        testData.costEstimateId = costEstimateId; // Store for next test
    });

    await t.step("Action: generateAICostEstimate - LLM returns invalid JSON", async () => {
        console.log("--- Test: generateAICostEstimate - LLM returns invalid JSON ---");
        const { travelPlanId, userAlice } = testData;
        const mockLLM = new MockGeminiLLM("this is not json");

        const result = await concept.generateAICostEstimate({
            user: userAlice,
            travelPlan: travelPlanId!,
            llm: mockLLM,
        });

        assertObjectMatch(result, { error: (val) => val.includes("Failed to parse LLM response") });
        console.log(`Confirmed error: ${result.error}`);
    });

    await t.step("Action: generateAICostEstimate - LLM returns incomplete JSON", async () => {
      console.log("--- Test: generateAICostEstimate - LLM returns incomplete JSON ---");
      const { travelPlanId, userAlice } = testData;
      const mockLLM = new MockGeminiLLM(JSON.stringify({ flight: 500 })); // Missing roomsPerNight and foodDaily

      const result = await concept.generateAICostEstimate({
          user: userAlice,
          travelPlan: travelPlanId!,
          llm: mockLLM,
      });

      assertObjectMatch(result, { error: (val) => val.includes("LLM response could not be parsed into all required cost components") });
      console.log(`Confirmed error: ${result.error}`);
    });

    await t.step("Action: generateAICostEstimate - LLM returns inaccurate values (too high/low)", async () => {
        console.log("--- Test: generateAICostEstimate - LLM returns inaccurate values ---");
        const { travelPlanId, userAlice } = testData;

        const mockLlmResponseTooHigh = JSON.stringify({
            flight: 200000, // too high
            roomsPerNight: 100,
            foodDaily: 50,
        });
        let mockLLM = new MockGeminiLLM(mockLlmResponseTooHigh);
        let result = await concept.generateAICostEstimate({
            user: userAlice,
            travelPlan: travelPlanId!,
            llm: mockLLM,
        });
        assertObjectMatch(result, { error: (val) => val.includes("LLM provided cost estimates are widely inaccurate") });
        console.log(`Confirmed error for too high flight cost: ${result.error}`);

        const mockLlmResponseTooLow = JSON.stringify({
            flight: 10, // too low
            roomsPerNight: 100,
            foodDaily: 50,
        });
        mockLLM = new MockGeminiLLM(mockLlmResponseTooLow);
        result = await concept.generateAICostEstimate({
            user: userAlice,
            travelPlan: travelPlanId!,
            llm: mockLLM,
        });
        assertObjectMatch(result, { error: (val) => val.includes("LLM provided cost estimates are widely inaccurate") });
        console.log(`Confirmed error for too low flight cost: ${result.error}`);
    });

    await t.step("Action: generateAICostEstimate - LLM API call fails", async () => {
        console.log("--- Test: generateAICostEstimate - LLM API call fails ---");
        const { travelPlanId, userAlice } = testData;
        const mockLLM = new MockGeminiLLM(new Error("Network error during LLM call"));

        const result = await concept.generateAICostEstimate({
            user: userAlice,
            travelPlan: travelPlanId!,
            llm: mockLLM,
        });

        assertObjectMatch(result, { error: (val) => val.includes("LLM API call failed: Network error during LLM call") });
        console.log(`Confirmed error: ${result.error}`);
    });


    await t.step("Action: estimateCost - Successful calculation", async () => {
        console.log("--- Test: estimateCost - Successful calculation ---");
        const { travelPlanId, userAlice, fromDate, toDate } = testData;
        const days = Math.ceil((toDate!.getTime() - fromDate!.getTime()) / (1000 * 60 * 60 * 24)); // 5 days from initial setup

        // Ensure a cost estimate exists (from previous step, re-generate if needed for independence)
        let existingEstimate = await concept["costEstimates"].findOne({ travelPlanID: travelPlanId });
        if (!existingEstimate) {
            const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
            await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId!, llm: new MockGeminiLLM(mockLlmResponse) });
        }

        const calculatedTotal = 500 + (150 * days) + (75 * days); // flight + (roomsPerNight * days) + (foodDaily * days)

        const result = await concept.estimateCost({ user: userAlice, travelPlan: travelPlanId! });

        if ("error" in result) {
            throw new Error(`Failed to estimate cost: ${result.error}`);
        }
        assertEquals(result.totalCost, calculatedTotal, "Total cost should be correctly calculated");
        console.log(`Estimated total cost: ${result.totalCost}`);
    });

    await t.step("Action: estimateCost - Requires: no associated CostEstimate", async () => {
        console.log("--- Test: estimateCost - Requires: no associated CostEstimate ---");
        const { userAlice, locationNYC, locationLA } = testData;
        // Create a new travel plan without an estimate
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() + 20);
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + 25);
        const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
        if ("error" in createResult) throw new Error("Failed to create new plan for test");
        const newTravelPlanId = createResult.travelPlan;

        const result = await concept.estimateCost({ user: userAlice, travelPlan: newTravelPlanId });
        assertObjectMatch(result, { error: "No cost estimate found for this travel plan." });
        console.log(`Confirmed error: ${result.error}`);

        // Clean up the temporary travel plan
        await concept.deleteTravelPlan({user: userAlice, travelPlan: newTravelPlanId});
    });

    await t.step("Query: _getAllTravelPlans - Returns all plan IDs for user", async () => {
        console.log("--- Test: _getAllTravelPlans - Returns all plan IDs for user ---");
        const { userAlice, travelPlanId, locationNYC, locationLA } = testData;

        // Create a second travel plan for userAlice
        const fromDate2 = new Date();
        fromDate2.setDate(fromDate2.getDate() + 30);
        const toDate2 = new Date();
        toDate2.setDate(toDate2.getDate() + 35);
        const result2 = await concept.createTravelPlan({
            user: userAlice,
            fromCity: locationLA,
            toCity: locationNYC,
            fromDate: fromDate2,
            toDate: toDate2,
        });
        if ("error" in result2) {
            throw new Error(`Failed to create second travel plan: ${result2.error}`);
        }
        const travelPlanId2 = result2.travelPlan;
        console.log(`Created second travel plan with ID: ${travelPlanId2}`);

        const allPlans = await concept._getAllTravelPlans({ user: userAlice });
        if (!Array.isArray(allPlans) || allPlans.some(p => typeof p !== 'string')) { // Check if it's an array of IDs or error array
            throw new Error(`_getAllTravelPlans returned an unexpected format: ${JSON.stringify(allPlans)}`);
        }
        assertEquals(allPlans.length, 2, "Should return 2 travel plan IDs");
        assertEquals(allPlans.includes(travelPlanId!), true, `Should include original plan ID ${travelPlanId}`);
        assertEquals(allPlans.includes(travelPlanId2), true, `Should include second plan ID ${travelPlanId2}`);
        console.log(`Retrieved plans: ${JSON.stringify(allPlans)}`);

        // Clean up the second travel plan so the first one is the only remaining
        await concept.deleteTravelPlan({user: userAlice, travelPlan: travelPlanId2});
        console.log(`Cleaned up second travel plan: ${travelPlanId2}`);
    });

    await t.step("Query: _getAllTravelPlans - Returns empty array if user has no plans", async () => {
        console.log("--- Test: _getAllTravelPlans - Returns empty array if user has no plans ---");
        const userNoPlans = "user:Charlie" as User;
        // Ensure user exists but has no plans
        await concept["users"].updateOne(
          { _id: userNoPlans },
          { $setOnInsert: { _id: userNoPlans } },
          { upsert: true },
        );

        const allPlans = await concept._getAllTravelPlans({ user: userNoPlans });
        if (!Array.isArray(allPlans) || allPlans.some(p => 'error' in p)) {
            throw new Error(`_getAllTravelPlans returned an unexpected error: ${JSON.stringify(allPlans)}`);
        }
        assertEquals(allPlans.length, 0, "Should return an empty array for a user with no plans");
        console.log(`Retrieved plans for user Charlie: ${JSON.stringify(allPlans)}`);
    });


    await t.step("Query: _getAllTravelPlans - Requires: user does not exist", async () => {
        console.log("--- Test: _getAllTravelPlans - Requires: user does not exist ---");
        const nonExistentUser = "user:NonExistent" as User;

        const result = await concept._getAllTravelPlans({ user: nonExistentUser });
        if (!Array.isArray(result) || result.length === 0 || !('error' in result[0])) {
             throw new Error(`_getAllTravelPlans did not return expected error for non-existent user: ${JSON.stringify(result)}`);
        }
        assertObjectMatch(result[0], { error: `User with ID ${nonExistentUser} does not exist.` });
        console.log(`Confirmed error: ${result[0].error}`);
    });


    await t.step("Action: deleteTravelPlan - Successful deletion of plan and associated data", async () => {
        console.log("--- Test: deleteTravelPlan - Successful deletion of plan and associated data ---");
        const { travelPlanId, userAlice } = testData;

        // Ensure there's a cost estimate and necessity for this plan
        const planToDelete = await concept["travelPlans"].findOne({ _id: travelPlanId });
        if (!planToDelete) throw new Error("Plan not found for deletion test.");
        const necessityId = planToDelete.necessityID;
        const existingNecessity = await concept["necessities"].findOne({ _id: necessityId });
        if (!existingNecessity) throw new Error("Necessity not found for deletion test.");
        // Ensure there is a cost estimate associated with it (re-generate if necessary)
        let existingCostEstimate = await concept["costEstimates"].findOne({ travelPlanID: travelPlanId });
        if (!existingCostEstimate) {
            const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
            await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId!, llm: new MockGeminiLLM(mockLlmResponse) });
            existingCostEstimate = await concept["costEstimates"].findOne({ travelPlanID: travelPlanId });
        }
        if (!existingCostEstimate) throw new Error("Cost estimate not found for deletion test, even after attempt to generate.");
        const costEstimateId = existingCostEstimate._id;
        console.log(`Pre-check: Plan (${travelPlanId}), Necessity (${necessityId}), CostEstimate (${costEstimateId}) exist.`);

        const deleteResult = await concept.deleteTravelPlan({
            user: userAlice,
            travelPlan: travelPlanId!,
        });

        if ("error" in deleteResult) {
            throw new Error(`Failed to delete travel plan: ${deleteResult.error}`);
        }
        console.log(`Deleted travel plan with ID: ${travelPlanId}`);

        const deletedPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
        assertEquals(deletedPlan, null, "Travel plan should be deleted");

        const deletedNecessity = await concept["necessities"].findOne({ _id: necessityId });
        assertEquals(deletedNecessity, null, "Associated necessity should be deleted");

        const deletedCostEstimate = await concept["costEstimates"].findOne({ _id: costEstimateId });
        assertEquals(deletedCostEstimate, null, "Associated cost estimate should be deleted");
    });

    await t.step("Action: deleteTravelPlan - Requires: travelPlan does not exist", async () => {
        console.log("--- Test: deleteTravelPlan - Requires: travelPlan does not exist ---");
        const nonExistentTravelPlan = freshID() as TravelPlan;
        const result = await concept.deleteTravelPlan({
            user: testData.userAlice,
            travelPlan: nonExistentTravelPlan,
        });
        assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." });
        console.log(`Confirmed error: ${result.error}`);
    });

    console.log("\n--- Principle Trace ---");
    await t.step("Principle Trace: Generate realistic cost estimates based on preferences", async () => {
        const principleUser = "user:PrincipleAlice" as User;
        const principleLocationHome = freshID() as Location;
        const principleLocationDest = freshID() as Location;

        await concept["locations"].insertOne({ _id: principleLocationHome, city: "London" });
        await concept["locations"].insertOne({ _id: principleLocationDest, city: "Paris" });
        // Ensure the principle user exists for _getAllTravelPlans check later
        await concept["users"].updateOne({ _id: principleUser }, { $setOnInsert: { _id: principleUser } }, { upsert: true });
        console.log("1. Setup: Created principle user and locations (London, Paris).");

        const fromDateP = new Date();
        fromDateP.setDate(fromDateP.getDate() + 60); // 2 months from now
        const toDateP = new Date();
        toDateP.setDate(toDateP.getDate() + 67); // 7 nights later, making it an 8-day trip (7 nights)

        const createPlanResult = await concept.createTravelPlan({
            user: principleUser,
            fromCity: principleLocationHome,
            toCity: principleLocationDest,
            fromDate: fromDateP,
            toDate: toDateP,
        });
        if ("error" in createPlanResult) throw new Error(`Principle Trace failed to create travel plan: ${createPlanResult.error}`);
        const principleTravelPlanId = createPlanResult.travelPlan;
        console.log(`2. Action: Created travel plan (${principleTravelPlanId}) for ${principleUser} from London to Paris, with default necessities (accommodation=true, dining=true).`);

        let currentPlan = await concept["travelPlans"].findOne({ _id: principleTravelPlanId });
        if (!currentPlan) throw new Error("Travel plan not found after creation.");
        let currentNecessity = await concept["necessities"].findOne({ _id: currentPlan.necessityID });
        assertEquals(currentNecessity?.accommodation, true, "Initial accommodation is true");
        assertEquals(currentNecessity?.diningFlag, true, "Initial diningFlag is true");
        console.log("   Verification: Default necessities confirmed.");

        const updateNecessityResult = await concept.updateNecessity({
            user: principleUser,
            travelPlan: principleTravelPlanId,
            accommodation: false, // User prefers to stay with friends/family
            diningFlag: true,     // But still wants to eat out
        });
        if ("error" in updateNecessityResult) throw new Error(`Principle Trace failed to update necessity: ${updateNecessityResult.error}`);
        currentNecessity = await concept["necessities"].findOne({ _id: updateNecessityResult.necessity });
        assertEquals(currentNecessity?.accommodation, false, "Updated accommodation is false (staying with friends/family)");
        assertEquals(currentNecessity?.diningFlag, true, "Updated diningFlag is true (eating out)");
        console.log(`3. Action: Updated necessity for plan ${principleTravelPlanId}: accommodation false, dining true.`);

        // Mock LLM response for principle trace, reflecting updated preferences
        const mockPrincipleLlmResponse = JSON.stringify({
            flight: 180,
            roomsPerNight: 0,   // Accommodation is false
            foodDaily: 60,      // Dining is true
        });
        const mockLLM = new MockGeminiLLM(mockPrincipleLlmResponse);

        const generateEstimateResult = await concept.generateAICostEstimate({
            user: principleUser,
            travelPlan: principleTravelPlanId,
            llm: mockLLM,
        });
        if ("error" in generateEstimateResult) throw new Error(`Principle Trace failed to generate estimate: ${generateEstimateResult.error}`);
        const principleCostEstimateId = generateEstimateResult.costEstimate;
        console.log(`4. Action: Generated AI cost estimate (${principleCostEstimateId}) using LLM for plan ${principleTravelPlanId}.`);

        const storedEstimate = await concept["costEstimates"].findOne({ _id: principleCostEstimateId });
        assertEquals(storedEstimate?.flight, 180);
        assertEquals(storedEstimate?.roomsPerNight, 0); // Reflects 'accommodation: false'
        assertEquals(storedEstimate?.foodDaily, 60);    // Reflects 'diningFlag: true'
        console.log(`   Verification: Stored estimate confirmed: Flight ${storedEstimate?.flight}, Rooms/Night ${storedEstimate?.roomsPerNight}, Food/Day ${storedEstimate?.foodDaily}.`);

        const estimateCostResult = await concept.estimateCost({ user: principleUser, travelPlan: principleTravelPlanId });
        if ("error" in estimateCostResult) throw new Error(`Principle Trace failed to get total cost: ${estimateCostResult.error}`);

        const numDaysPrinciple = Math.ceil((toDateP.getTime() - fromDateP.getTime()) / (1000 * 60 * 60 * 24)); // 7 days (8 inclusive days from fromDate to toDate)
        // Calculation: Flight + (RoomsPerNight * numDays) + (FoodDaily * numDays)
        const expectedTotalCost = 180 + (0 * numDaysPrinciple) + (60 * numDaysPrinciple); // 180 + (0 * 7) + (60 * 7) = 180 + 420 = 600
        assertEquals(estimateCostResult.totalCost, expectedTotalCost, "Principle: Total estimated cost should be correct based on updated preferences.");
        console.log(`5. Action: Calculated total cost: ${estimateCostResult.totalCost}.`);
        console.log("   Verification: Total cost aligns with flight, NO accommodation costs, and daily dining costs for the duration.");

        const allPrinciplePlans = await concept._getAllTravelPlans({ user: principleUser });
        if (!Array.isArray(allPrinciplePlans) || allPrinciplePlans.some(p => typeof p !== 'string')) {
            throw new Error(`_getAllTravelPlans returned an unexpected format: ${JSON.stringify(allPrinciplePlans)}`);
        }
        assertEquals(allPrinciplePlans.includes(principleTravelPlanId), true, "Principle travel plan should be listed for the user.");
        console.log("6. Query: User's travel plans retrieved, includes the principle plan.");

        console.log("Principle Trace completed successfully: An estimate was provided based on user's choices and LLM data.");
    });


    await client.close();
});

```

# prompt: First separate the step tests into separate Deno.test segments if it makes sense. Second, have one test following the operational principle of the concept and 3-5 tests testing "interesting" cases
# response:

To refactor the tests, we will separate each distinct logical test case into its own `Deno.test` block. This improves isolation and readability. A `setupTestEnvironment` helper function will be introduced to reduce boilerplate in each test, providing pre-populated `Locations` and a `User`.

The "Principle Trace" will remain as a single `Deno.test` block to demonstrate the end-to-end flow. For "interesting cases," we'll explicitly mark a few tests that highlight important error conditions or edge cases.

# file: src/TripCostEstimation/TripCostEstimationConcept.test.ts

```typescript
import { assertEquals, assertObjectMatch, assertInstanceOf } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Import the concept class and its dependencies
import TripCostEstimationConcept from "./TripCostEstimationConcept.ts";
import { GeminiLLM } from "@utils/gemini-llm.ts";

// Helper types from the concept for clarity in tests (module-scoped, consistent with concept)
type User = ID;
type Location = ID;
type TravelPlan = ID;
type Necessity = ID;
type CostEstimate = ID;

// Define the state interfaces for easy access in tests, as they are now module-scoped
interface UsersDoc { _id: User; }
interface LocationsDoc { _id: Location; city: string; }
interface TravelPlansDoc { _id: TravelPlan; userID: User; fromCity: Location; toCity: Location; fromDate: Date; toDate: Date; necessityID: Necessity; }
interface NecessitiesDoc { _id: Necessity; accommodation: boolean; diningFlag: boolean; }
interface CostEstimatesDoc { _id: CostEstimate; travelPlanID: TravelPlan; flight: number; roomsPerNight: number; foodDaily: number; lastUpdated: Date; }

// Mock GeminiLLM for testing purposes
class MockGeminiLLM implements GeminiLLM {
    private mockResponse: string | Error;
    private shouldThrow: boolean = false;

    constructor(response: string | Error) {
        this.mockResponse = response;
        if (response instanceof Error) {
            this.shouldThrow = true;
        }
    }

    /**
     * Mimics the executeLLM method from the actual GeminiLLM,
     * returning a predefined response or throwing an error.
     */
    async executeLLM(prompt: string): Promise<string> {
        console.log(`[MockGeminiLLM] Received prompt (first 100 chars): ${prompt.substring(0, 100)}...`);
        if (this.shouldThrow) {
            throw this.mockResponse;
        }
        return Promise.resolve(this.mockResponse as string);
    }
}

// Common setup for most tests: initializes DB, concept, and basic data
async function setupTestEnvironment() {
    const [db, client] = await testDb();
    const concept = new TripCostEstimationConcept(db);

    const userAlice = "user:Alice" as User;
    const locationNYC = freshID() as Location;
    const locationLA = freshID() as Location;
    const locationCHI = freshID() as Location; // Additional location for variety

    // Pre-populate locations for tests
    await concept["locations"].insertOne({ _id: locationNYC, city: "New York City" });
    await concept["locations"].insertOne({ _id: locationLA, city: "Los Angeles" });
    await concept["locations"].insertOne({ _id: locationCHI, city: "Chicago" });

    // Explicitly add user Alice as per some concepts, although createTravelPlan upserts it.
    await concept["users"].updateOne(
        { _id: userAlice },
        { $setOnInsert: { _id: userAlice } },
        { upsert: true },
    );

    return { db, client, concept, userAlice, locationNYC, locationLA, locationCHI };
}

Deno.test("TripCostEstimationConcept: createTravelPlan - Successful creation", async () => {
    console.log("--- Test: createTravelPlan - Successful creation ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 15);

    console.log(`Action: Calling createTravelPlan for user ${userAlice} from ${locationNYC} to ${locationLA}, dates ${fromDate.toISOString()} to ${toDate.toISOString()}`);
    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: locationNYC,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });

    if ("error" in result) {
        throw new Error(`Test failed: ${result.error}`);
    }
    const travelPlanId = result.travelPlan;
    console.log(`Effect: Created travel plan with ID: ${travelPlanId}`);

    // Verify effects
    const createdPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
    assertEquals(createdPlan?._id, travelPlanId, "Effect: Travel plan should exist in DB.");
    assertEquals(createdPlan?.userID, userAlice, "Effect: Travel plan should be linked to user.");
    assertEquals(createdPlan?.fromCity, locationNYC, "Effect: fromCity should be correct.");
    assertEquals(createdPlan?.toCity, locationLA, "Effect: toCity should be correct.");

    const associatedNecessity = await concept["necessities"].findOne({ _id: createdPlan?.necessityID });
    assertEquals(associatedNecessity?.accommodation, true, "Effect: Default accommodation should be true.");
    assertEquals(associatedNecessity?.diningFlag, true, "Effect: Default diningFlag should be true.");

    await client.close();
});

Deno.test("TripCostEstimationConcept: createTravelPlan - Requires: fromCity does not exist", async () => {
    console.log("--- Test: createTravelPlan - Requires: fromCity does not exist ---");
    const { client, concept, userAlice, locationLA } = await setupTestEnvironment();

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 15);
    const nonExistentLocation = freshID() as Location;

    console.log(`Action: Attempting to create travel plan with non-existent origin city ID ${nonExistentLocation}`);
    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: nonExistentLocation,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });
    // Verify requirement failure
    assertObjectMatch(result, { error: `Origin city with ID ${nonExistentLocation} not found.` }, "Requirement: Should return error for non-existent origin city.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: createTravelPlan - Requires: toDate < fromDate", async () => {
    console.log("--- Test: createTravelPlan - Requires: toDate < fromDate ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + 15);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 10); // toDate is before fromDate

    console.log(`Action: Attempting to create travel plan where arrival date ${toDate.toISOString()} is before departure date ${fromDate.toISOString()}`);
    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: locationNYC,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });
    // Verify requirement failure
    assertObjectMatch(result, { error: "Arrival date must be on or after departure date." }, "Requirement: Should return error for invalid date range.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: createTravelPlan - Requires: fromDate is in the past", async () => {
    console.log("--- Test: createTravelPlan - Requires: fromDate is in the past ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 5); // in the past
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 10);

    console.log(`Action: Attempting to create travel plan where departure date ${fromDate.toISOString()} is in the past`);
    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: locationNYC,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });
    // Verify requirement failure
    assertObjectMatch(result, { error: "Departure and arrival dates must be in the future." }, "Requirement: Should return error for past dates.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: updateNecessity - Successful update", async () => {
    console.log("--- Test: updateNecessity - Successful update ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan first
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    console.log(`Setup: Created travel plan ${travelPlanId} with default necessity.`);

    console.log(`Action: Updating necessity for plan ${travelPlanId} to accommodation=false, diningFlag=true`);
    const updateResult = await concept.updateNecessity({
        user: userAlice,
        travelPlan: travelPlanId,
        accommodation: false,
        diningFlag: true,
    });

    if ("error" in updateResult) {
        throw new Error(`Test failed: ${updateResult.error}`);
    }
    console.log(`Effect: Necessity updated successfully for travel plan ${travelPlanId}.`);

    // Verify effects
    const updatedPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
    const updatedNecessity = await concept["necessities"].findOne({ _id: updatedPlan?.necessityID });
    assertEquals(updatedNecessity?.accommodation, false, "Effect: Accommodation should be false.");
    assertEquals(updatedNecessity?.diningFlag, true, "Effect: DiningFlag should be true.");
    assertEquals(updateResult.travelPlan, travelPlanId, "Effect: Returned travelPlan ID matches.");
    assertEquals(updateResult.necessity, updatedPlan?.necessityID, "Effect: Returned necessity ID matches.");

    await client.close();
});

Deno.test("TripCostEstimationConcept: updateNecessity - Requires: travelPlan does not belong to user", async () => {
    console.log("--- Test: updateNecessity - Requires: travelPlan does not belong to user ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan for Alice
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    console.log(`Setup: Created travel plan ${travelPlanId} for ${userAlice}.`);

    const userBob = "user:Bob" as User; // A different user
    await concept["users"].insertOne({ _id: userBob }); // Ensure Bob exists

    console.log(`Action: Attempting to update necessity for plan ${travelPlanId} by user ${userBob} (who doesn't own it).`);
    const result = await concept.updateNecessity({
        user: userBob,
        travelPlan: travelPlanId,
        accommodation: true,
        diningFlag: false,
    });
    // Verify requirement failure
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error as plan doesn't belong to Bob.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: resetNecessity - Successful reset", async () => {
    console.log("--- Test: resetNecessity - Successful reset ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan and modify its necessity
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    await concept.updateNecessity({ user: userAlice, travelPlan: travelPlanId, accommodation: false, diningFlag: false });
    console.log(`Setup: Created travel plan ${travelPlanId} and set necessity to (false, false).`);

    const preResetPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
    const preResetNecessity = await concept["necessities"].findOne({ _id: preResetPlan?.necessityID });
    assertEquals(preResetNecessity?.accommodation, false, "Pre-check: Accommodation is false before reset.");
    assertEquals(preResetNecessity?.diningFlag, false, "Pre-check: DiningFlag is false before reset.");

    console.log(`Action: Resetting necessity for travel plan ${travelPlanId}.`);
    const resetResult = await concept.resetNecessity({
        user: userAlice,
        travelPlan: travelPlanId,
    });

    if ("error" in resetResult) {
        throw new Error(`Test failed: ${resetResult.error}`);
    }
    console.log(`Effect: Necessity reset successfully for travel plan ${travelPlanId}.`);

    // Verify effects
    const postResetPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
    const postResetNecessity = await concept["necessities"].findOne({ _id: postResetPlan?.necessityID });
    assertEquals(postResetNecessity?.accommodation, true, "Effect: Accommodation should be reset to true.");
    assertEquals(postResetNecessity?.diningFlag, true, "Effect: DiningFlag should be reset to true.");

    await client.close();
});

Deno.test("TripCostEstimationConcept: resetNecessity - Requires: travelPlan does not exist", async () => {
    console.log("--- Test: resetNecessity - Requires: travelPlan does not exist ---");
    const { client, concept, userAlice } = await setupTestEnvironment();

    const nonExistentTravelPlan = freshID() as TravelPlan;
    console.log(`Action: Attempting to reset necessity for non-existent travel plan ${nonExistentTravelPlan}.`);
    const result = await concept.resetNecessity({
        user: userAlice,
        travelPlan: nonExistentTravelPlan,
    });
    // Verify requirement failure
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error for non-existent travel plan.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Successful generation", async () => {
    console.log("--- Test: generateAICostEstimate - Successful generation ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    console.log(`Setup: Created travel plan ${travelPlanId}.`);

    const mockLlmResponse = JSON.stringify({
        flight: 500,
        roomsPerNight: 150,
        foodDaily: 75,
    });
    const mockLLM = new MockGeminiLLM(mockLlmResponse);

    console.log(`Action: Generating AI cost estimate for plan ${travelPlanId}.`);
    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    if ("error" in result) {
        throw new Error(`Test failed: ${result.error}`);
    }
    const costEstimateId = result.costEstimate;
    console.log(`Effect: Generated cost estimate with ID: ${costEstimateId}.`);

    // Verify effects
    const createdEstimate = await concept["costEstimates"].findOne({ _id: costEstimateId, travelPlanID: travelPlanId });
    assertEquals(createdEstimate?.flight, 500, "Effect: Flight cost should be 500.");
    assertEquals(createdEstimate?.roomsPerNight, 150, "Effect: Rooms per night should be 150.");
    assertEquals(createdEstimate?.foodDaily, 75, "Effect: Food daily should be 75.");
    assertInstanceOf(createdEstimate?.lastUpdated, Date, "Effect: lastUpdated should be a Date object.");

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns invalid JSON", async () => {
    console.log("--- Test: generateAICostEstimate - Interesting Case: LLM returns invalid JSON ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    console.log(`Setup: Created travel plan ${travelPlanId}.`);

    const mockLLM = new MockGeminiLLM("this is not json"); // Invalid JSON response
    console.log("Action: Attempting to generate estimate with LLM returning malformed JSON.");
    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    // Verify error due to parsing failure
    assertObjectMatch(result, { error: (val) => val.includes("Failed to parse LLM response") }, "Expected error for invalid JSON format.");
    console.log(`Effect Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns incomplete JSON", async () => {
  console.log("--- Test: generateAICostEstimate - Interesting Case: LLM returns incomplete JSON ---");
  const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

  // Setup: Create a travel plan
  const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
  const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
  const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
  if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
  const travelPlanId = createResult.travelPlan;
  console.log(`Setup: Created travel plan ${travelPlanId}.`);

  // LLM returns JSON missing required fields
  const mockLLM = new MockGeminiLLM(JSON.stringify({ flight: 500 }));
  console.log("Action: Attempting to generate estimate with LLM returning incomplete JSON.");
  const result = await concept.generateAICostEstimate({
      user: userAlice,
      travelPlan: travelPlanId,
      llm: mockLLM,
  });

  // Verify error due to missing required cost components
  assertObjectMatch(result, { error: (val) => val.includes("LLM response could not be parsed into all required cost components") }, "Expected error for incomplete JSON.");
  console.log(`Effect Confirmed: ${result.error}`);

  await client.close();
});


Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns inaccurate values", async () => {
    console.log("--- Test: generateAICostEstimation - Interesting Case: LLM returns inaccurate values (too high/low) ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    console.log(`Setup: Created travel plan ${travelPlanId}.`);

    // Test case 1: Flight cost too high
    const mockLlmResponseTooHigh = JSON.stringify({
        flight: 200000, // too high
        roomsPerNight: 100,
        foodDaily: 50,
    });
    let mockLLM = new MockGeminiLLM(mockLlmResponseTooHigh);
    console.log("Action: Generating estimate with LLM returning excessively high flight cost.");
    let result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });
    assertObjectMatch(result, { error: (val) => val.includes("LLM provided cost estimates are widely inaccurate") }, "Expected error for too high flight cost.");
    console.log(`Effect Confirmed (too high flight cost): ${result.error}`);

    // Test case 2: Flight cost too low
    const mockLlmResponseTooLow = JSON.stringify({
        flight: 10, // too low
        roomsPerNight: 100,
        foodDaily: 50,
    });
    mockLLM = new MockGeminiLLM(mockLlmResponseTooLow);
    console.log("Action: Generating estimate with LLM returning excessively low flight cost.");
    result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });
    assertObjectMatch(result, { error: (val) => val.includes("LLM provided cost estimates are widely inaccurate") }, "Expected error for too low flight cost.");
    console.log(`Effect Confirmed (too low flight cost): ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM API call fails", async () => {
    console.log("--- Test: generateAICostEstimate - Interesting Case: LLM API call fails ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    console.log(`Setup: Created travel plan ${travelPlanId}.`);

    const mockLLM = new MockGeminiLLM(new Error("Network error during LLM call"));
    console.log("Action: Attempting to generate estimate when LLM API call itself fails.");
    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    // Verify error from LLM interaction layer
    assertObjectMatch(result, { error: (val) => val.includes("LLM API call failed: Network error during LLM call") }, "Expected error for LLM API failure.");
    console.log(`Effect Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: estimateCost - Successful calculation", async () => {
    console.log("--- Test: estimateCost - Successful calculation ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan and generate an estimate
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15); // 5 nights / 6 days
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
    await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: new MockGeminiLLM(mockLlmResponse) });
    console.log(`Setup: Created travel plan ${travelPlanId} and generated a cost estimate.`);

    const numDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)); // 5 days
    const expectedTotal = 500 + (150 * numDays) + (75 * numDays); // 500 + (150 * 5) + (75 * 5) = 500 + 750 + 375 = 1625

    console.log(`Action: Estimating total cost for plan ${travelPlanId}.`);
    const result = await concept.estimateCost({ user: userAlice, travelPlan: travelPlanId });

    if ("error" in result) {
        throw new Error(`Test failed: ${result.error}`);
    }
    // Verify effects
    assertEquals(result.totalCost, expectedTotal, "Effect: Total cost should be correctly calculated.");
    console.log(`Effect: Calculated total cost: ${result.totalCost}. Expected: ${expectedTotal}.`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: estimateCost - Interesting Case: Requires no associated CostEstimate", async () => {
    console.log("--- Test: estimateCost - Interesting Case: Requires no associated CostEstimate ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a new travel plan without generating an estimate
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 20);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 25);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error("Setup failed: Failed to create new plan for test.");
    const newTravelPlanId = createResult.travelPlan;
    console.log(`Setup: Created travel plan ${newTravelPlanId} but deliberately did NOT generate a cost estimate.`);

    console.log(`Action: Attempting to estimate cost for plan ${newTravelPlanId} which has no associated estimate.`);
    const result = await concept.estimateCost({ user: userAlice, travelPlan: newTravelPlanId });

    // Verify requirement failure
    assertObjectMatch(result, { error: "No cost estimate found for this travel plan." }, "Requirement: Should return error if no cost estimate exists.");
    console.log(`Requirement Confirmed: ${result.error}`);

    // Cleanup
    await concept.deleteTravelPlan({ user: userAlice, travelPlan: newTravelPlanId });
    await client.close();
});

Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Returns all plan IDs for user", async () => {
    console.log("--- Test: _getAllTravelPlans - Returns all plan IDs for user ---");
    const { client, concept, userAlice, locationNYC, locationLA, locationCHI } = await setupTestEnvironment();

    // Setup: Create multiple travel plans for Alice
    const fromDate1 = new Date(); fromDate1.setDate(fromDate1.getDate() + 10);
    const toDate1 = new Date(); toDate1.setDate(toDate1.getDate() + 15);
    const createResult1 = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate: fromDate1, toDate: toDate1 });
    if ("error" in createResult1) throw new Error(`Setup failed: ${createResult1.error}`);
    const travelPlanId1 = createResult1.travelPlan;

    const fromDate2 = new Date(); fromDate2.setDate(fromDate2.getDate() + 20);
    const toDate2 = new Date(); toDate2.setDate(toDate2.getDate() + 25);
    const createResult2 = await concept.createTravelPlan({ user: userAlice, fromCity: locationLA, toCity: locationCHI, fromDate: fromDate2, toDate: toDate2 });
    if ("error" in createResult2) throw new Error(`Setup failed: ${createResult2.error}`);
    const travelPlanId2 = createResult2.travelPlan;
    console.log(`Setup: Created two travel plans: ${travelPlanId1} and ${travelPlanId2} for ${userAlice}.`);

    console.log(`Action: Querying all travel plan IDs for user ${userAlice}.`);
    const allPlans = await concept._getAllTravelPlans({ user: userAlice });

    if (!Array.isArray(allPlans) || allPlans.some(p => typeof p !== 'string')) {
        throw new Error(`Test failed: _getAllTravelPlans returned an unexpected format: ${JSON.stringify(allPlans)}`);
    }
    // Verify effects
    assertEquals(allPlans.length, 2, "Effect: Should return 2 travel plan IDs.");
    assertEquals(allPlans.includes(travelPlanId1), true, `Effect: Should include plan ID ${travelPlanId1}.`);
    assertEquals(allPlans.includes(travelPlanId2), true, `Effect: Should include plan ID ${travelPlanId2}.`);
    console.log(`Effect: Retrieved plans for ${userAlice}: ${JSON.stringify(allPlans)}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Returns empty array if user has no plans", async () => {
    console.log("--- Test: _getAllTravelPlans - Returns empty array if user has no plans ---");
    const { client, concept } = await setupTestEnvironment();

    const userNoPlans = "user:Charlie" as User;
    // Ensure Charlie exists but has no travel plans assigned
    await concept["users"].updateOne(
      { _id: userNoPlans },
      { $setOnInsert: { _id: userNoPlans } },
      { upsert: true },
    );
    console.log(`Setup: Created user ${userNoPlans} with no travel plans.`);

    console.log(`Action: Querying all travel plan IDs for user ${userNoPlans}.`);
    const allPlans = await concept._getAllTravelPlans({ user: userNoPlans });

    if (!Array.isArray(allPlans) || allPlans.some(p => 'error' in p)) {
        throw new Error(`Test failed: _getAllTravelPlans returned an unexpected error: ${JSON.stringify(allPlans)}`);
    }
    // Verify effects
    assertEquals(allPlans.length, 0, "Effect: Should return an empty array for a user with no plans.");
    console.log(`Effect: Retrieved plans for user ${userNoPlans}: ${JSON.stringify(allPlans)}`);

    await client.close();
});


Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Requires: user does not exist", async () => {
    console.log("--- Test: _getAllTravelPlans - Requires: user does not exist ---");
    const { client, concept } = await setupTestEnvironment();

    const nonExistentUser = "user:NonExistent" as User;
    console.log(`Action: Querying travel plan IDs for non-existent user ${nonExistentUser}.`);
    const result = await concept._getAllTravelPlans({ user: nonExistentUser });

    // Verify requirement failure
    if (!Array.isArray(result) || result.length === 0 || !('error' in result[0])) {
         throw new Error(`Test failed: _getAllTravelPlans did not return expected error for non-existent user: ${JSON.stringify(result)}`);
    }
    assertObjectMatch(result[0], { error: `User with ID ${nonExistentUser} does not exist.` }, "Requirement: Should return error for non-existent user.");
    console.log(`Requirement Confirmed: ${result[0].error}`);

    await client.close();
});


Deno.test("TripCostEstimationConcept: deleteTravelPlan - Successful deletion of plan and associated data", async () => {
    console.log("--- Test: deleteTravelPlan - Successful deletion of plan and associated data ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan, its necessity, and a cost estimate
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
    const generateResult = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: new MockGeminiLLM(mockLlmResponse) });
    if ("error" in generateResult) throw new Error(`Setup failed: ${generateResult.error}`);
    const costEstimateId = generateResult.costEstimate;

    const planToDelete = await concept["travelPlans"].findOne({ _id: travelPlanId });
    if (!planToDelete) throw new Error("Setup failed: Plan not found after creation.");
    const necessityId = planToDelete.necessityID;

    console.log(`Setup: Created plan (${travelPlanId}), Necessity (${necessityId}), CostEstimate (${costEstimateId}).`);

    console.log(`Action: Deleting travel plan ${travelPlanId}.`);
    const deleteResult = await concept.deleteTravelPlan({
        user: userAlice,
        travelPlan: travelPlanId,
    });

    if ("error" in deleteResult) {
        throw new Error(`Test failed: ${deleteResult.error}`);
    }
    console.log(`Effect: Travel plan ${travelPlanId} deleted successfully.`);

    // Verify effects: records should be null
    const deletedPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
    assertEquals(deletedPlan, null, "Effect: Travel plan should be deleted.");

    const deletedNecessity = await concept["necessities"].findOne({ _id: necessityId });
    assertEquals(deletedNecessity, null, "Effect: Associated necessity should be deleted.");

    const deletedCostEstimate = await concept["costEstimates"].findOne({ _id: costEstimateId });
    assertEquals(deletedCostEstimate, null, "Effect: Associated cost estimate should be deleted.");

    await client.close();
});

Deno.test("TripCostEstimationConcept: deleteTravelPlan - Requires: travelPlan does not exist", async () => {
    console.log("--- Test: deleteTravelPlan - Requires: travelPlan does not exist ---");
    const { client, concept, userAlice } = await setupTestEnvironment();

    const nonExistentTravelPlan = freshID() as TravelPlan;
    console.log(`Action: Attempting to delete non-existent travel plan ${nonExistentTravelPlan}.`);
    const result = await concept.deleteTravelPlan({
        user: userAlice,
        travelPlan: nonExistentTravelPlan,
    });
    // Verify requirement failure
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error for non-existent travel plan.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: Principle Trace - Generate realistic cost estimates based on preferences", async () => {
    console.log("\n--- Principle Trace Test ---");
    const { client, concept } = await setupTestEnvironment();

    const principleUser = "user:PrincipleAlice" as User;
    const principleLocationHome = freshID() as Location;
    const principleLocationDest = freshID() as Location;

    // 1. Setup: Create user and locations
    await concept["locations"].insertOne({ _id: principleLocationHome, city: "London" });
    await concept["locations"].insertOne({ _id: principleLocationDest, city: "Paris" });
    await concept["users"].updateOne({ _id: principleUser }, { $setOnInsert: { _id: principleUser } }, { upsert: true });
    console.log("1. Setup: Created principle user and locations (London, Paris).");

    const fromDateP = new Date();
    fromDateP.setDate(fromDateP.getDate() + 60); // 2 months from now
    const toDateP = new Date();
    toDateP.setDate(toDateP.getDate() + 67); // 7 nights later, making it an 8-day trip (7 nights)

    // 2. Action: Create initial travel plan with default necessity
    const createPlanResult = await concept.createTravelPlan({
        user: principleUser,
        fromCity: principleLocationHome,
        toCity: principleLocationDest,
        fromDate: fromDateP,
        toDate: toDateP,
    });
    if ("error" in createPlanResult) throw new Error(`Principle Trace failed to create travel plan: ${createPlanResult.error}`);
    const principleTravelPlanId = createPlanResult.travelPlan;
    console.log(`2. Action: Created travel plan (${principleTravelPlanId}) for ${principleUser} from London to Paris, with default necessities (accommodation=true, dining=true).`);

    let currentPlan = await concept["travelPlans"].findOne({ _id: principleTravelPlanId });
    if (!currentPlan) throw new Error("Travel plan not found after creation.");
    let currentNecessity = await concept["necessities"].findOne({ _id: currentPlan.necessityID });
    assertEquals(currentNecessity?.accommodation, true, "Verification: Initial accommodation is true.");
    assertEquals(currentNecessity?.diningFlag, true, "Verification: Initial diningFlag is true.");
    console.log("   Verification: Default necessities confirmed (accommodation: true, dining: true).");

    // 3. Action: Update necessity based on user preferences
    const updateNecessityResult = await concept.updateNecessity({
        user: principleUser,
        travelPlan: principleTravelPlanId,
        accommodation: false, // User prefers to stay with friends/family
        diningFlag: true,     // But still wants to eat out
    });
    if ("error" in updateNecessityResult) throw new Error(`Principle Trace failed to update necessity: ${updateNecessityResult.error}`);
    currentNecessity = await concept["necessities"].findOne({ _id: updateNecessityResult.necessity });
    assertEquals(currentNecessity?.accommodation, false, "Verification: Updated accommodation is false (staying with friends/family).");
    assertEquals(currentNecessity?.diningFlag, true, "Verification: Updated diningFlag is true (eating out).");
    console.log(`3. Action: Updated necessity for plan ${principleTravelPlanId}: accommodation false, dining true.`);

    // 4. Action: Generate AI cost estimate using LLM with specialized tool
    const mockPrincipleLlmResponse = JSON.stringify({
        flight: 180,
        roomsPerNight: 0,   // Reflects 'accommodation: false'
        foodDaily: 60,      // Reflects 'diningFlag: true'
    });
    const mockLLM = new MockGeminiLLM(mockPrincipleLlmResponse);

    const generateEstimateResult = await concept.generateAICostEstimate({
        user: principleUser,
        travelPlan: principleTravelPlanId,
        llm: mockLLM,
    });
    if ("error" in generateEstimateResult) throw new Error(`Principle Trace failed to generate estimate: ${generateEstimateResult.error}`);
    const principleCostEstimateId = generateEstimateResult.costEstimate;
    console.log(`4. Action: Generated AI cost estimate (${principleCostEstimateId}) using LLM for plan ${principleTravelPlanId}.`);

    const storedEstimate = await concept["costEstimates"].findOne({ _id: principleCostEstimateId });
    assertEquals(storedEstimate?.flight, 180, "Verification: Stored flight estimate confirmed.");
    assertEquals(storedEstimate?.roomsPerNight, 0, "Verification: Stored rooms per night estimate confirmed (0 for no accommodation).");
    assertEquals(storedEstimate?.foodDaily, 60, "Verification: Stored food daily estimate confirmed.");
    console.log(`   Verification: Stored estimate: Flight ${storedEstimate?.flight}, Rooms/Night ${storedEstimate?.roomsPerNight}, Food/Day ${storedEstimate?.foodDaily}.`);

    // 5. Action: Calculate total cost based on generated estimate
    const estimateCostResult = await concept.estimateCost({ user: principleUser, travelPlan: principleTravelPlanId });
    if ("error" in estimateCostResult) throw new Error(`Principle Trace failed to get total cost: ${estimateCostResult.error}`);

    const numDaysPrinciple = Math.ceil((toDateP.getTime() - fromDateP.getTime()) / (1000 * 60 * 60 * 24)); // 7 days
    // Calculation: Flight + (RoomsPerNight * numDays) + (FoodDaily * numDays)
    const expectedTotalCost = 180 + (0 * numDaysPrinciple) + (60 * numDaysPrinciple); // 180 + (0 * 7) + (60 * 7) = 180 + 420 = 600
    assertEquals(estimateCostResult.totalCost, expectedTotalCost, "Verification: Total estimated cost should be correct based on updated preferences.");
    console.log(`5. Action: Calculated total cost: ${estimateCostResult.totalCost}. Expected: ${expectedTotalCost}.`);
    console.log("   Verification: Total cost aligns with flight, NO accommodation costs, and daily dining costs for the duration.");

    // 6. Query: Retrieve user's travel plans
    const allPrinciplePlans = await concept._getAllTravelPlans({ user: principleUser });
    if (!Array.isArray(allPrinciplePlans) || allPrinciplePlans.some(p => typeof p !== 'string')) {
        throw new Error(`_getAllTravelPlans returned an unexpected format: ${JSON.stringify(allPrinciplePlans)}`);
    }
    assertEquals(allPrinciplePlans.includes(principleTravelPlanId), true, "Verification: Principle travel plan should be listed for the user.");
    console.log("6. Query: User's travel plans retrieved, includes the principle plan.");

    console.log("Principle Trace completed successfully: An estimate was provided based on user's choices and LLM data.");
    await client.close();
});
```

# prompt: Make the tests concise but thorough and I don't think you need the interface Docs defined in tests, so get rid of the interface Docs, simply use actions and outputs provided by the concept class. DON'T change the concept class
# response:

Here's the refactored test file for `TripCostEstimationConcept`, making tests more concise and removing the explicit re-definition of `*Doc` interfaces in the test file, as requested. The concept class itself remains unchanged.

The `setupTestEnvironment` helper is now more lean, providing just the necessary setup, and assertions are directly made against the results of the concept's actions and queries, and implicitly verified against the database state when necessary for effects.

# file: src/TripCostEstimation/TripCostEstimationConcept.test.ts

```typescript
import { assertEquals, assertObjectMatch, assertInstanceOf } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Import the concept class and its dependencies
import TripCostEstimationConcept from "./TripCostEstimationConcept.ts";
import { GeminiLLM } from "@utils/gemini-llm.ts";

// Helper types from the concept for clarity in tests (module-scoped, consistent with concept)
type User = ID;
type Location = ID;
type TravelPlan = ID;
type Necessity = ID; // Although Necessity is internal ID, it's good to keep its type alias.
type CostEstimate = ID;

// Mock GeminiLLM for testing purposes
class MockGeminiLLM implements GeminiLLM {
    private mockResponse: string | Error;
    private shouldThrow: boolean = false;

    constructor(response: string | Error) {
        this.mockResponse = response;
        if (response instanceof Error) {
            this.shouldThrow = true;
        }
    }

    /**
     * Mimics the executeLLM method from the actual GeminiLLM,
     * returning a predefined response or throwing an error.
     */
    async executeLLM(prompt: string): Promise<string> {
        // console.log(`[MockGeminiLLM] Received prompt (first 100 chars): ${prompt.substring(0, 100)}...`);
        if (this.shouldThrow) {
            throw this.mockResponse;
        }
        return Promise.resolve(this.mockResponse as string);
    }
}

// Common setup for most tests: initializes DB, concept, and basic data
async function setupTestEnvironment() {
    const [db, client] = await testDb();
    const concept = new TripCostEstimationConcept(db);

    const userAlice = "user:Alice" as User;
    const locationNYC = freshID() as Location;
    const locationLA = freshID() as Location;
    const locationCHI = freshID() as Location; // Additional location for variety

    // Pre-populate locations for tests using concept's internal collections
    await concept["locations"].insertOne({ _id: locationNYC, city: "New York City" });
    await concept["locations"].insertOne({ _id: locationLA, city: "Los Angeles" });
    await concept["locations"].insertOne({ _id: locationCHI, city: "Chicago" });

    // Explicitly add user Alice
    await concept["users"].updateOne(
        { _id: userAlice },
        { $setOnInsert: { _id: userAlice } },
        { upsert: true },
    );

    return { client, concept, userAlice, locationNYC, locationLA, locationCHI };
}

Deno.test("TripCostEstimationConcept: createTravelPlan - Successful creation", async () => {
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();
    console.log("Test: createTravelPlan - Successful creation");

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 15);

    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: locationNYC,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });

    if ("error" in result) {
        throw new Error(`Test failed: ${result.error}`);
    }
    const travelPlanId = result.travelPlan;
    console.log(`Action: Created travel plan with ID: ${travelPlanId}`);

    // Verify effects by querying directly from the collection
    const createdPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
    assertEquals(createdPlan?._id, travelPlanId, "Effect: Travel plan should exist in DB.");
    assertEquals(createdPlan?.userID, userAlice, "Effect: Travel plan should be linked to user.");
    assertEquals(createdPlan?.fromCity, locationNYC, "Effect: fromCity should be correct.");
    assertEquals(createdPlan?.toCity, locationLA, "Effect: toCity should be correct.");

    const associatedNecessity = await concept["necessities"].findOne({ _id: createdPlan?.necessityID });
    assertEquals(associatedNecessity?.accommodation, true, "Effect: Default accommodation should be true.");
    assertEquals(associatedNecessity?.diningFlag, true, "Effect: Default diningFlag should be true.");

    await client.close();
});

Deno.test("TripCostEstimationConcept: createTravelPlan - Requirement: fromCity does not exist", async () => {
    const { client, concept, userAlice, locationLA } = await setupTestEnvironment();
    console.log("Test: createTravelPlan - Requirement: fromCity does not exist");

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const nonExistentLocation = freshID() as Location;

    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: nonExistentLocation,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });
    assertObjectMatch(result, { error: `Origin city with ID ${nonExistentLocation} not found.` }, "Requirement: Should return error for non-existent origin city.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: createTravelPlan - Requirement: toDate < fromDate", async () => {
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();
    console.log("Test: createTravelPlan - Requirement: toDate < fromDate");

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 15);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 10);

    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: locationNYC,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });
    assertObjectMatch(result, { error: "Arrival date must be on or after departure date." }, "Requirement: Should return error for invalid date range.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: createTravelPlan - Requirement: fromDate is in the past", async () => {
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();
    console.log("Test: createTravelPlan - Requirement: fromDate is in the past");

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() - 5);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 10);

    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: locationNYC,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });
    assertObjectMatch(result, { error: "Departure and arrival dates must be in the future." }, "Requirement: Should return error for past dates.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: updateNecessity - Successful update", async () => {
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();
    console.log("Test: updateNecessity - Successful update");

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const updateResult = await concept.updateNecessity({
        user: userAlice,
        travelPlan: travelPlanId,
        accommodation: false,
        diningFlag: true,
    });

    if ("error" in updateResult) {
        throw new Error(`Test failed: ${updateResult.error}`);
    }
    console.log(`Action: Updated necessity for travel plan ${travelPlanId}`);

    const updatedPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
    const updatedNecessity = await concept["necessities"].findOne({ _id: updatedPlan?.necessityID });
    assertEquals(updatedNecessity?.accommodation, false, "Effect: Accommodation should be false.");
    assertEquals(updatedNecessity?.diningFlag, true, "Effect: DiningFlag should be true.");
    assertEquals(updateResult.travelPlan, travelPlanId, "Effect: Returned travelPlan ID matches.");
    assertEquals(updateResult.necessity, updatedPlan?.necessityID, "Effect: Returned necessity ID matches.");

    await client.close();
});

Deno.test("TripCostEstimationConcept: updateNecessity - Requirement: travelPlan does not belong to user", async () => {
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();
    console.log("Test: updateNecessity - Requirement: travelPlan does not belong to user");

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const userBob = "user:Bob" as User;
    await concept["users"].insertOne({ _id: userBob });

    const result = await concept.updateNecessity({
        user: userBob,
        travelPlan: travelPlanId,
        accommodation: true,
        diningFlag: false,
    });
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error as plan doesn't belong to Bob.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: resetNecessity - Successful reset", async () => {
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();
    console.log("Test: resetNecessity - Successful reset");

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    await concept.updateNecessity({ user: userAlice, travelPlan: travelPlanId, accommodation: false, diningFlag: false });

    const resetResult = await concept.resetNecessity({
        user: userAlice,
        travelPlan: travelPlanId,
    });

    if ("error" in resetResult) {
        throw new Error(`Test failed: ${resetResult.error}`);
    }
    console.log(`Action: Reset necessity for travel plan ${travelPlanId}.`);

    const postResetPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
    const postResetNecessity = await concept["necessities"].findOne({ _id: postResetPlan?.necessityID });
    assertEquals(postResetNecessity?.accommodation, true, "Effect: Accommodation should be reset to true.");
    assertEquals(postResetNecessity?.diningFlag, true, "Effect: DiningFlag should be reset to true.");

    await client.close();
});

Deno.test("TripCostEstimationConcept: resetNecessity - Requirement: travelPlan does not exist", async () => {
    const { client, concept, userAlice } = await setupTestEnvironment();
    console.log("Test: resetNecessity - Requirement: travelPlan does not exist");

    const nonExistentTravelPlan = freshID() as TravelPlan;
    const result = await concept.resetNecessity({
        user: userAlice,
        travelPlan: nonExistentTravelPlan,
    });
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error for non-existent travel plan.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Successful generation", async () => {
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();
    console.log("Test: generateAICostEstimate - Successful generation");

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
    const mockLLM = new MockGeminiLLM(mockLlmResponse);

    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    if ("error" in result) {
        throw new Error(`Test failed: ${result.error}`);
    }
    const costEstimateId = result.costEstimate;
    console.log(`Action: Generated cost estimate with ID: ${costEstimateId}.`);

    const createdEstimate = await concept["costEstimates"].findOne({ _id: costEstimateId, travelPlanID: travelPlanId });
    assertEquals(createdEstimate?.flight, 500, "Effect: Flight cost should be 500.");
    assertEquals(createdEstimate?.roomsPerNight, 150, "Effect: Rooms per night should be 150.");
    assertEquals(createdEstimate?.foodDaily, 75, "Effect: Food daily should be 75.");
    assertInstanceOf(createdEstimate?.lastUpdated, Date, "Effect: lastUpdated should be a Date object.");

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns invalid JSON", async () => {
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();
    console.log("Test: generateAICostEstimate - Interesting Case: LLM returns invalid JSON");

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLLM = new MockGeminiLLM("this is not json");
    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    assertObjectMatch(result, { error: (val) => val.includes("Failed to parse LLM response") }, "Expected error for invalid JSON format.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns incomplete JSON", async () => {
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();
    console.log("Test: generateAICostEstimate - Interesting Case: LLM returns incomplete JSON");

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLLM = new MockGeminiLLM(JSON.stringify({ flight: 500 })); // Missing roomsPerNight and foodDaily
    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    assertObjectMatch(result, { error: (val) => val.includes("LLM response could not be parsed into all required cost components") }, "Expected error for incomplete JSON.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns inaccurate values", async () => {
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();
    console.log("Test: generateAICostEstimate - Interesting Case: LLM returns inaccurate values (too high/low)");

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    // Test case 1: Flight cost too high
    const mockLlmResponseTooHigh = JSON.stringify({ flight: 200000, roomsPerNight: 100, foodDaily: 50 });
    let mockLLM = new MockGeminiLLM(mockLlmResponseTooHigh);
    let result = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: mockLLM });
    assertObjectMatch(result, { error: (val) => val.includes("LLM provided cost estimates are widely inaccurate") }, "Expected error for too high flight cost.");
    console.log(`Requirement Confirmed (too high flight cost): ${result.error}`);

    // Test case 2: Flight cost too low
    const mockLlmResponseTooLow = JSON.stringify({ flight: 10, roomsPerNight: 100, foodDaily: 50 });
    mockLLM = new MockGeminiLLM(mockLlmResponseTooLow);
    result = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: mockLLM });
    assertObjectMatch(result, { error: (val) => val.includes("LLM provided cost estimates are widely inaccurate") }, "Expected error for too low flight cost.");
    console.log(`Requirement Confirmed (too low flight cost): ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM API call fails", async () => {
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();
    console.log("Test: generateAICostEstimate - Interesting Case: LLM API call fails");

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLLM = new MockGeminiLLM(new Error("Network error during LLM call"));
    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    assertObjectMatch(result, { error: (val) => val.includes("LLM API call failed: Network error during LLM call") }, "Expected error for LLM API failure.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: estimateCost - Successful calculation", async () => {
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();
    console.log("Test: estimateCost - Successful calculation");

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
    await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: new MockGeminiLLM(mockLlmResponse) });

    const numDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    const expectedTotal = 500 + (150 * numDays) + (75 * numDays);

    const result = await concept.estimateCost({ user: userAlice, travelPlan: travelPlanId });

    if ("error" in result) {
        throw new Error(`Test failed: ${result.error}`);
    }
    assertEquals(result.totalCost, expectedTotal, "Effect: Total cost should be correctly calculated.");
    console.log(`Action: Estimated total cost: ${result.totalCost}.`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: estimateCost - Interesting Case: Requirement: no associated CostEstimate", async () => {
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();
    console.log("Test: estimateCost - Interesting Case: Requirement: no associated CostEstimate");

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 20);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 25);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error("Setup failed: Failed to create new plan for test.");
    const newTravelPlanId = createResult.travelPlan;

    const result = await concept.estimateCost({ user: userAlice, travelPlan: newTravelPlanId });

    assertObjectMatch(result, { error: "No cost estimate found for this travel plan." }, "Requirement: Should return error if no cost estimate exists.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await concept.deleteTravelPlan({ user: userAlice, travelPlan: newTravelPlanId }); // Clean up
    await client.close();
});

Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Returns all plan IDs for user", async () => {
    const { client, concept, userAlice, locationNYC, locationLA, locationCHI } = await setupTestEnvironment();
    console.log("Test: _getAllTravelPlans - Returns all plan IDs for user");

    const fromDate1 = new Date(); fromDate1.setDate(fromDate1.getDate() + 10);
    const toDate1 = new Date(); toDate1.setDate(toDate1.getDate() + 15);
    const createResult1 = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate: fromDate1, toDate: toDate1 });
    if ("error" in createResult1) throw new Error(`Setup failed: ${createResult1.error}`);
    const travelPlanId1 = createResult1.travelPlan;

    const fromDate2 = new Date(); fromDate2.setDate(fromDate2.getDate() + 20);
    const toDate2 = new Date(); toDate2.setDate(toDate2.getDate() + 25);
    const createResult2 = await concept.createTravelPlan({ user: userAlice, fromCity: locationLA, toCity: locationCHI, fromDate: fromDate2, toDate: toDate2 });
    if ("error" in createResult2) throw new Error(`Setup failed: ${createResult2.error}`);
    const travelPlanId2 = createResult2.travelPlan;

    const allPlans = await concept._getAllTravelPlans({ user: userAlice });

    if (!Array.isArray(allPlans) || allPlans.some(p => typeof p !== 'string')) {
        throw new Error(`Test failed: _getAllTravelPlans returned an unexpected format: ${JSON.stringify(allPlans)}`);
    }
    assertEquals(allPlans.length, 2, "Effect: Should return 2 travel plan IDs.");
    assertEquals(allPlans.includes(travelPlanId1), true, `Effect: Should include plan ID ${travelPlanId1}.`);
    assertEquals(allPlans.includes(travelPlanId2), true, `Effect: Should include plan ID ${travelPlanId2}.`);
    console.log(`Action: Retrieved plans for ${userAlice}: ${JSON.stringify(allPlans)}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Returns empty array if user has no plans", async () => {
    const { client, concept } = await setupTestEnvironment();
    console.log("Test: _getAllTravelPlans - Returns empty array if user has no plans");

    const userNoPlans = "user:Charlie" as User;
    await concept["users"].updateOne(
      { _id: userNoPlans },
      { $setOnInsert: { _id: userNoPlans } },
      { upsert: true },
    );

    const allPlans = await concept._getAllTravelPlans({ user: userNoPlans });

    if (!Array.isArray(allPlans) || allPlans.some(p => typeof p !== 'string')) {
        throw new Error(`Test failed: _getAllTravelPlans returned an unexpected error: ${JSON.stringify(allPlans)}`);
    }
    assertEquals(allPlans.length, 0, "Effect: Should return an empty array for a user with no plans.");
    console.log(`Action: Retrieved plans for user ${userNoPlans}: ${JSON.stringify(allPlans)}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Requirement: user does not exist", async () => {
    const { client, concept } = await setupTestEnvironment();
    console.log("Test: _getAllTravelPlans - Requirement: user does not exist");

    const nonExistentUser = "user:NonExistent" as User;
    const result = await concept._getAllTravelPlans({ user: nonExistentUser });

    if (!Array.isArray(result) || result.length === 0 || !('error' in result[0])) {
         throw new Error(`Test failed: _getAllTravelPlans did not return expected error for non-existent user: ${JSON.stringify(result)}`);
    }
    assertObjectMatch(result[0], { error: `User with ID ${nonExistentUser} does not exist.` }, "Requirement: Should return error for non-existent user.");
    console.log(`Requirement Confirmed: ${result[0].error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: deleteTravelPlan - Successful deletion of plan and associated data", async () => {
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();
    console.log("Test: deleteTravelPlan - Successful deletion of plan and associated data");

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
    const generateResult = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: new MockGeminiLLM(mockLlmResponse) });
    if ("error" in generateResult) throw new Error(`Setup failed: ${generateResult.error}`);
    const costEstimateId = generateResult.costEstimate;

    const planToDelete = await concept["travelPlans"].findOne({ _id: travelPlanId });
    if (!planToDelete) throw new Error("Setup failed: Plan not found after creation.");
    const necessityId = planToDelete.necessityID;

    const deleteResult = await concept.deleteTravelPlan({
        user: userAlice,
        travelPlan: travelPlanId,
    });

    if ("error" in deleteResult) {
        throw new Error(`Test failed: ${deleteResult.error}`);
    }
    console.log(`Action: Deleted travel plan with ID: ${travelPlanId}.`);

    const deletedPlan = await concept["travelPlans"].findOne({ _id: travelPlanId });
    assertEquals(deletedPlan, null, "Effect: Travel plan should be deleted.");

    const deletedNecessity = await concept["necessities"].findOne({ _id: necessityId });
    assertEquals(deletedNecessity, null, "Effect: Associated necessity should be deleted.");

    const deletedCostEstimate = await concept["costEstimates"].findOne({ _id: costEstimateId });
    assertEquals(deletedCostEstimate, null, "Effect: Associated cost estimate should be deleted.");

    await client.close();
});

Deno.test("TripCostEstimationConcept: deleteTravelPlan - Requirement: travelPlan does not exist", async () => {
    const { client, concept, userAlice } = await setupTestEnvironment();
    console.log("Test: deleteTravelPlan - Requirement: travelPlan does not exist");

    const nonExistentTravelPlan = freshID() as TravelPlan;
    const result = await concept.deleteTravelPlan({
        user: userAlice,
        travelPlan: nonExistentTravelPlan,
    });
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error for non-existent travel plan.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: Principle Trace - Generate realistic cost estimates based on preferences", async () => {
    console.log("\n--- Principle Trace Test ---");
    const { client, concept } = await setupTestEnvironment();

    const principleUser = "user:PrincipleAlice" as User;
    const principleLocationHome = freshID() as Location;
    const principleLocationDest = freshID() as Location;

    // 1. Setup: Create user and locations
    await concept["locations"].insertOne({ _id: principleLocationHome, city: "London" });
    await concept["locations"].insertOne({ _id: principleLocationDest, city: "Paris" });
    await concept["users"].updateOne({ _id: principleUser }, { $setOnInsert: { _id: principleUser } }, { upsert: true });
    console.log("1. Setup: Created principle user and locations (London, Paris).");

    const fromDateP = new Date();
    fromDateP.setDate(fromDateP.getDate() + 60); // 2 months from now
    const toDateP = new Date();
    toDateP.setDate(toDateP.getDate() + 67); // 7 nights later, making it an 8-day trip (7 nights)

    // 2. Action: Create initial travel plan with default necessity
    const createPlanResult = await concept.createTravelPlan({
        user: principleUser,
        fromCity: principleLocationHome,
        toCity: principleLocationDest,
        fromDate: fromDateP,
        toDate: toDateP,
    });
    if ("error" in createPlanResult) throw new Error(`Principle Trace failed to create travel plan: ${createPlanResult.error}`);
    const principleTravelPlanId = createPlanResult.travelPlan;
    console.log(`2. Action: Created travel plan (${principleTravelPlanId}) for ${principleUser} from London to Paris, with default necessities (accommodation=true, dining=true).`);

    let currentPlan = await concept["travelPlans"].findOne({ _id: principleTravelPlanId });
    if (!currentPlan) throw new Error("Travel plan not found after creation.");
    let currentNecessity = await concept["necessities"].findOne({ _id: currentPlan.necessityID });
    assertEquals(currentNecessity?.accommodation, true, "Verification: Initial accommodation is true.");
    assertEquals(currentNecessity?.diningFlag, true, "Verification: Initial diningFlag is true.");
    console.log("   Verification: Default necessities confirmed (accommodation: true, dining: true).");

    // 3. Action: Update necessity based on user preferences
    const updateNecessityResult = await concept.updateNecessity({
        user: principleUser,
        travelPlan: principleTravelPlanId,
        accommodation: false, // User prefers to stay with friends/family
        diningFlag: true,     // But still wants to eat out
    });
    if ("error" in updateNecessityResult) throw new Error(`Principle Trace failed to update necessity: ${updateNecessityResult.error}`);
    currentNecessity = await concept["necessities"].findOne({ _id: updateNecessityResult.necessity });
    assertEquals(currentNecessity?.accommodation, false, "Verification: Updated accommodation is false (staying with friends/family).");
    assertEquals(currentNecessity?.diningFlag, true, "Verification: Updated diningFlag is true (eating out).");
    console.log(`3. Action: Updated necessity for plan ${principleTravelPlanId}: accommodation false, dining true.`);

    // 4. Action: Generate AI cost estimate using LLM with specialized tool
    const mockPrincipleLlmResponse = JSON.stringify({
        flight: 180,
        roomsPerNight: 0,   // Reflects 'accommodation: false'
        foodDaily: 60,      // Reflects 'diningFlag: true'
    });
    const mockLLM = new MockGeminiLLM(mockPrincipleLlmResponse);

    const generateEstimateResult = await concept.generateAICostEstimate({
        user: principleUser,
        travelPlan: principleTravelPlanId,
        llm: mockLLM,
    });
    if ("error" in generateEstimateResult) throw new Error(`Principle Trace failed to generate estimate: ${generateEstimateResult.error}`);
    const principleCostEstimateId = generateEstimateResult.costEstimate;
    console.log(`4. Action: Generated AI cost estimate (${principleCostEstimateId}) using LLM for plan ${principleTravelPlanId}.`);

    const storedEstimate = await concept["costEstimates"].findOne({ _id: principleCostEstimateId });
    assertEquals(storedEstimate?.flight, 180, "Verification: Stored flight estimate confirmed.");
    assertEquals(storedEstimate?.roomsPerNight, 0, "Verification: Stored rooms per night estimate confirmed (0 for no accommodation).");
    assertEquals(storedEstimate?.foodDaily, 60, "Verification: Stored food daily estimate confirmed.");
    console.log(`   Verification: Stored estimate: Flight ${storedEstimate?.flight}, Rooms/Night ${storedEstimate?.roomsPerNight}, Food/Day ${storedEstimate?.foodDaily}.`);

    // 5. Action: Calculate total cost based on generated estimate
    const estimateCostResult = await concept.estimateCost({ user: principleUser, travelPlan: principleTravelPlanId });
    if ("error" in estimateCostResult) throw new Error(`Principle Trace failed to get total cost: ${estimateCostResult.error}`);

    const numDaysPrinciple = Math.ceil((toDateP.getTime() - fromDateP.getTime()) / (1000 * 60 * 60 * 24)); // 7 days
    const expectedTotalCost = 180 + (0 * numDaysPrinciple) + (60 * numDaysPrinciple); // 180 + (0 * 7) + (60 * 7) = 180 + 420 = 600
    assertEquals(estimateCostResult.totalCost, expectedTotalCost, "Verification: Total estimated cost should be correct based on updated preferences.");
    console.log(`5. Action: Calculated total cost: ${estimateCostResult.totalCost}. Expected: ${expectedTotalCost}.`);
    console.log("   Verification: Total cost aligns with flight, NO accommodation costs, and daily dining costs for the duration.");

    // 6. Query: Retrieve user's travel plans
    const allPrinciplePlans = await concept._getAllTravelPlans({ user: principleUser });
    if (!Array.isArray(allPrinciplePlans) || allPrinciplePlans.some(p => typeof p !== 'string')) {
        throw new Error(`_getAllTravelPlans returned an unexpected format: ${JSON.stringify(allPrinciplePlans)}`);
    }
    assertEquals(allPrinciplePlans.includes(principleTravelPlanId), true, "Verification: Principle travel plan should be listed for the user.");
    console.log("6. Query: User's travel plans retrieved, includes the principle plan.");

    console.log("Principle Trace completed successfully: An estimate was provided based on user's choices and LLM data.");
    await client.close();
});
```

# prompt: If you explicitly queried the database, you shouldn't have. 
# response:

The instruction "If you explicitly queried the database, you shouldn't have" coupled with "DON'T change the concept class" and "queries MUST return an **array**" creates a strong constraint. It implies that all state verification must happen through the concept's existing public API (actions and queries), and internal collections (`concept["collection"]`) should not be accessed directly in the tests for verification.

Given that the `TripCostEstimationConcept` only provides one query, `_getAllTravelPlans`, which returns an array of `TravelPlan` IDs (not full `TravelPlansDoc` objects), it becomes impossible to verify the detailed content of created or updated documents (like `fromCity`, `toDate`, `accommodation` status, or specific cost estimates) using *only* the public API. The tests will therefore focus on:
1.  Verifying that actions return the correct IDs or an empty object on success.
2.  Verifying that actions return an `{error: string}` object when requirements are not met.
3.  Verifying the existence or non-existence of `TravelPlan` IDs using `_getAllTravelPlans`.
4.  Directly verifying the output of `estimateCost`, as its effect is its direct return value.

This approach will result in more "black-box" tests, where the internal state cannot be fully inspected from the test file itself. I will add comments to the tests to highlight where detailed state verification is omitted due to these constraints.

Here's the revised test file:

# file: src/TripCostEstimation/TripCostEstimationConcept.test.ts

```typescript
import { assertEquals, assertObjectMatch, assertInstanceOf } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Import the concept class and its dependencies
import TripCostEstimationConcept from "./TripCostEstimationConcept.ts";
import { GeminiLLM } from "@utils/gemini-llm.ts";

// Helper types from the concept for clarity in tests (module-scoped, consistent with concept)
type User = ID;
type Location = ID;
type TravelPlan = ID;
type Necessity = ID;
type CostEstimate = ID;

// Mock GeminiLLM for testing purposes
class MockGeminiLLM implements GeminiLLM {
    private mockResponse: string | Error;
    private shouldThrow: boolean = false;

    constructor(response: string | Error) {
        this.mockResponse = response;
        if (response instanceof Error) {
            this.shouldThrow = true;
        }
    }

    /**
     * Mimics the executeLLM method from the actual GeminiLLM,
     * returning a predefined response or throwing an error.
     */
    async executeLLM(prompt: string): Promise<string> {
        // console.log(`[MockGeminiLLM] Received prompt (first 100 chars): ${prompt.substring(0, 100)}...`);
        if (this.shouldThrow) {
            throw this.mockResponse;
        }
        return Promise.resolve(this.mockResponse as string);
    }
}

// Common setup for most tests: initializes DB, concept, and basic data
async function setupTestEnvironment() {
    const [db, client] = await testDb();
    const concept = new TripCostEstimationConcept(db);

    const userAlice = "user:Alice" as User;
    const locationNYC = freshID() as Location;
    const locationLA = freshID() as Location;
    const locationCHI = freshID() as Location;

    // Pre-populate locations for tests using concept's internal collections
    // This is allowed in setup as it directly manipulates the initial state for the concept to function.
    await concept["locations"].insertOne({ _id: locationNYC, city: "New York City" });
    await concept["locations"].insertOne({ _id: locationLA, city: "Los Angeles" });
    await concept["locations"].insertOne({ _id: locationCHI, city: "Chicago" });

    // Explicitly add user Alice (concept's createTravelPlan upserts, but explicit setup is good)
    await concept["users"].updateOne(
        { _id: userAlice },
        { $setOnInsert: { _id: userAlice } },
        { upsert: true },
    );

    return { client, concept, userAlice, locationNYC, locationLA, locationCHI };
}

Deno.test("TripCostEstimationConcept: createTravelPlan - Successful creation", async () => {
    console.log("--- Test: createTravelPlan - Successful creation ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 15);

    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: locationNYC,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });

    if ("error" in result) {
        throw new Error(`Test failed: ${result.error}`);
    }
    const travelPlanId = result.travelPlan;
    console.log(`Action: Created travel plan with ID: ${travelPlanId}`);

    // Verify effects via the concept's public API
    const allPlans = await concept._getAllTravelPlans({ user: userAlice });
    if (Array.isArray(allPlans) && allPlans.some(p => 'error' in p)) {
        throw new Error(`Query failed: ${(allPlans[0] as {error: string}).error}`);
    }
    assertEquals((allPlans as ID[]).includes(travelPlanId), true, "Effect: New travel plan ID should be listed for the user.");
    // NOTE: Cannot verify detailed fields (fromCity, toDate, default necessity) due to API constraints.

    await client.close();
});

Deno.test("TripCostEstimationConcept: createTravelPlan - Requirement: fromCity does not exist", async () => {
    console.log("--- Test: createTravelPlan - Requirement: fromCity does not exist ---");
    const { client, concept, userAlice, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const nonExistentLocation = freshID() as Location;

    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: nonExistentLocation,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });
    assertObjectMatch(result, { error: `Origin city with ID ${nonExistentLocation} not found.` }, "Requirement: Should return error for non-existent origin city.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: createTravelPlan - Requirement: toDate < fromDate", async () => {
    console.log("--- Test: createTravelPlan - Requirement: toDate < fromDate ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 15);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 10);

    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: locationNYC,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });
    assertObjectMatch(result, { error: "Arrival date must be on or after departure date." }, "Requirement: Should return error for invalid date range.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: createTravelPlan - Requirement: fromDate is in the past", async () => {
    console.log("--- Test: createTravelPlan - Requirement: fromDate is in the past ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() - 5);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 10);

    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: locationNYC,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });
    assertObjectMatch(result, { error: "Departure and arrival dates must be in the future." }, "Requirement: Should return error for past dates.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: updateNecessity - Successful update", async () => {
    console.log("--- Test: updateNecessity - Successful update ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan first
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const updateResult = await concept.updateNecessity({
        user: userAlice,
        travelPlan: travelPlanId,
        accommodation: false,
        diningFlag: true,
    });

    if ("error" in updateResult) {
        throw new Error(`Test failed: ${updateResult.error}`);
    }
    console.log(`Action: Updated necessity for travel plan ${travelPlanId}`);
    assertEquals(updateResult.travelPlan, travelPlanId, "Effect: Returned travelPlan ID matches.");
    // NOTE: Cannot verify detailed necessity flags (accommodation, diningFlag) due to API constraints.

    await client.close();
});

Deno.test("TripCostEstimationConcept: updateNecessity - Requirement: travelPlan does not belong to user", async () => {
    console.log("--- Test: updateNecessity - Requirement: travelPlan does not belong to user ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan for Alice
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const userBob = "user:Bob" as User;
    await concept["users"].updateOne({ _id: userBob }, { $setOnInsert: { _id: userBob } }, { upsert: true });

    const result = await concept.updateNecessity({
        user: userBob,
        travelPlan: travelPlanId,
        accommodation: true,
        diningFlag: false,
    });
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error as plan doesn't belong to Bob.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: resetNecessity - Successful reset", async () => {
    console.log("--- Test: resetNecessity - Successful reset ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan and modify its necessity
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    await concept.updateNecessity({ user: userAlice, travelPlan: travelPlanId, accommodation: false, diningFlag: false });

    const resetResult = await concept.resetNecessity({
        user: userAlice,
        travelPlan: travelPlanId,
    });

    if ("error" in resetResult) {
        throw new Error(`Test failed: ${resetResult.error}`);
    }
    console.log(`Action: Reset necessity for travel plan ${travelPlanId}.`);
    // NOTE: Cannot verify detailed necessity flags (accommodation, diningFlag) due to API constraints.

    await client.close();
});

Deno.test("TripCostEstimationConcept: resetNecessity - Requirement: travelPlan does not exist", async () => {
    console.log("--- Test: resetNecessity - Requirement: travelPlan does not exist ---");
    const { client, concept, userAlice } = await setupTestEnvironment();

    const nonExistentTravelPlan = freshID() as TravelPlan;
    const result = await concept.resetNecessity({
        user: userAlice,
        travelPlan: nonExistentTravelPlan,
    });
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error for non-existent travel plan.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Successful generation", async () => {
    console.log("--- Test: generateAICostEstimate - Successful generation ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
    const mockLLM = new MockGeminiLLM(mockLlmResponse);

    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    if ("error" in result) {
        throw new Error(`Test failed: ${result.error}`);
    }
    const costEstimateId = result.costEstimate;
    console.log(`Action: Generated cost estimate with ID: ${costEstimateId}.`);
    // NOTE: Cannot verify detailed cost estimate fields (flight, roomsPerNight, foodDaily) due to API constraints.

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns invalid JSON", async () => {
    console.log("--- Test: generateAICostEstimate - Interesting Case: LLM returns invalid JSON ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLLM = new MockGeminiLLM("this is not json");
    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    assertObjectMatch(result, { error: (val) => val.includes("Failed to parse LLM response") }, "Expected error for invalid JSON format.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns incomplete JSON", async () => {
    console.log("--- Test: generateAICostEstimate - Interesting Case: LLM returns incomplete JSON ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLLM = new MockGeminiLLM(JSON.stringify({ flight: 500 })); // Missing roomsPerNight and foodDaily
    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    assertObjectMatch(result, { error: (val) => val.includes("LLM response could not be parsed into all required cost components") }, "Expected error for incomplete JSON.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns inaccurate values", async () => {
    console.log("--- Test: generateAICostEstimate - Interesting Case: LLM returns inaccurate values (too high/low) ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    // Test case 1: Flight cost too high
    const mockLlmResponseTooHigh = JSON.stringify({ flight: 200000, roomsPerNight: 100, foodDaily: 50 });
    let mockLLM = new MockGeminiLLM(mockLlmResponseTooHigh);
    let result = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: mockLLM });
    assertObjectMatch(result, { error: (val) => val.includes("LLM provided cost estimates are widely inaccurate") }, "Expected error for too high flight cost.");
    console.log(`Requirement Confirmed (too high flight cost): ${result.error}`);

    // Test case 2: Flight cost too low
    const mockLlmResponseTooLow = JSON.stringify({ flight: 10, roomsPerNight: 100, foodDaily: 50 });
    mockLLM = new MockGeminiLLM(mockLlmResponseTooLow);
    result = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: mockLLM });
    assertObjectMatch(result, { error: (val) => val.includes("LLM provided cost estimates are widely inaccurate") }, "Expected error for too low flight cost.");
    console.log(`Requirement Confirmed (too low flight cost): ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM API call fails", async () => {
    console.log("--- Test: generateAICostEstimate - Interesting Case: LLM API call fails ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLLM = new MockGeminiLLM(new Error("Network error during LLM call"));
    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    assertObjectMatch(result, { error: (val) => val.includes("LLM API call failed: Network error during LLM call") }, "Expected error for LLM API failure.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: estimateCost - Successful calculation", async () => {
    console.log("--- Test: estimateCost - Successful calculation ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan and generate an estimate
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15); // 5 nights / 6 days
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
    const generateEstimateResult = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: new MockGeminiLLM(mockLlmResponse) });
    if ("error" in generateEstimateResult) throw new Error(`Setup failed: ${generateEstimateResult.error}`);
    const costEstimateId = generateEstimateResult.costEstimate;

    const numDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    const expectedTotal = 500 + (150 * numDays) + (75 * numDays);

    const result = await concept.estimateCost({ user: userAlice, travelPlan: travelPlanId });

    if ("error" in result) {
        throw new Error(`Test failed: ${result.error}`);
    }
    assertEquals(result.totalCost, expectedTotal, "Effect: Total cost should be correctly calculated and returned.");
    console.log(`Action: Estimated total cost: ${result.totalCost}.`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: estimateCost - Interesting Case: Requirement: no associated CostEstimate", async () => {
    console.log("--- Test: estimateCost - Interesting Case: Requirement: no associated CostEstimate ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a new travel plan without generating an estimate
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 20);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 25);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error("Setup failed: Failed to create new plan for test.");
    const newTravelPlanId = createResult.travelPlan;

    const result = await concept.estimateCost({ user: userAlice, travelPlan: newTravelPlanId });

    assertObjectMatch(result, { error: "No cost estimate found for this travel plan." }, "Requirement: Should return error if no cost estimate exists.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await concept.deleteTravelPlan({ user: userAlice, travelPlan: newTravelPlanId }); // Clean up
    await client.close();
});

Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Returns all plan IDs for user", async () => {
    console.log("--- Test: _getAllTravelPlans - Returns all plan IDs for user ---");
    const { client, concept, userAlice, locationNYC, locationLA, locationCHI } = await setupTestEnvironment();

    // Setup: Create multiple travel plans for Alice
    const fromDate1 = new Date(); fromDate1.setDate(fromDate1.getDate() + 10);
    const toDate1 = new Date(); toDate1.setDate(toDate1.getDate() + 15);
    const createResult1 = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate: fromDate1, toDate: toDate1 });
    if ("error" in createResult1) throw new Error(`Setup failed: ${createResult1.error}`);
    const travelPlanId1 = createResult1.travelPlan;

    const fromDate2 = new Date(); fromDate2.setDate(fromDate2.getDate() + 20);
    const toDate2 = new Date(); toDate2.setDate(toDate2.getDate() + 25);
    const createResult2 = await concept.createTravelPlan({ user: userAlice, fromCity: locationLA, toCity: locationCHI, fromDate: fromDate2, toDate: toDate2 });
    if ("error" in createResult2) throw new Error(`Setup failed: ${createResult2.error}`);
    const travelPlanId2 = createResult2.travelPlan;

    const allPlans = await concept._getAllTravelPlans({ user: userAlice });

    if (!Array.isArray(allPlans) || allPlans.some(p => typeof p !== 'string')) {
        throw new Error(`Test failed: _getAllTravelPlans returned an unexpected format: ${JSON.stringify(allPlans)}`);
    }
    assertEquals(allPlans.length, 2, "Effect: Should return 2 travel plan IDs.");
    assertEquals(allPlans.includes(travelPlanId1), true, `Effect: Should include plan ID ${travelPlanId1}.`);
    assertEquals(allPlans.includes(travelPlanId2), true, `Effect: Should include plan ID ${travelPlanId2}.`);
    console.log(`Action: Retrieved plans for ${userAlice}: ${JSON.stringify(allPlans)}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Returns empty array if user has no plans", async () => {
    console.log("--- Test: _getAllTravelPlans - Returns empty array if user has no plans ---");
    const { client, concept } = await setupTestEnvironment();

    const userNoPlans = "user:Charlie" as User;
    await concept["users"].updateOne(
      { _id: userNoPlans },
      { $setOnInsert: { _id: userNoPlans } },
      { upsert: true },
    );

    const allPlans = await concept._getAllTravelPlans({ user: userNoPlans });

    if (!Array.isArray(allPlans) || allPlans.some(p => typeof p !== 'string')) {
        throw new Error(`Test failed: _getAllTravelPlans returned an unexpected error: ${JSON.stringify(allPlans)}`);
    }
    assertEquals(allPlans.length, 0, "Effect: Should return an empty array for a user with no plans.");
    console.log(`Action: Retrieved plans for user ${userNoPlans}: ${JSON.stringify(allPlans)}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Requirement: user does not exist", async () => {
    console.log("--- Test: _getAllTravelPlans - Requirement: user does not exist ---");
    const { client, concept } = await setupTestEnvironment();

    const nonExistentUser = "user:NonExistent" as User;
    const result = await concept._getAllTravelPlans({ user: nonExistentUser });

    if (!Array.isArray(result) || result.length === 0 || !('error' in result[0])) {
         throw new Error(`Test failed: _getAllTravelPlans did not return expected error for non-existent user: ${JSON.stringify(result)}`);
    }
    assertObjectMatch(result[0], { error: `User with ID ${nonExistentUser} does not exist.` }, "Requirement: Should return error for non-existent user.");
    console.log(`Requirement Confirmed: ${result[0].error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: deleteTravelPlan - Successful deletion of plan and associated data", async () => {
    console.log("--- Test: deleteTravelPlan - Successful deletion of plan and associated data ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan, its necessity, and a cost estimate
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
    const generateResult = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: new MockGeminiLLM(mockLlmResponse) });
    if ("error" in generateResult) throw new Error(`Setup failed: ${generateResult.error}`);
    const costEstimateId = generateResult.costEstimate; // Cost estimate ID is returned

    console.log(`Action: Deleting travel plan with ID: ${travelPlanId}.`);
    const deleteResult = await concept.deleteTravelPlan({
        user: userAlice,
        travelPlan: travelPlanId,
    });

    if ("error" in deleteResult) {
        throw new Error(`Test failed: ${deleteResult.error}`);
    }
    console.log(`Effect: Travel plan ${travelPlanId} deleted successfully.`);

    // Verify effects via the concept's public API
    const allPlans = await concept._getAllTravelPlans({ user: userAlice });
    if (Array.isArray(allPlans) && allPlans.some(p => 'error' in p)) {
        throw new Error(`Query failed: ${(allPlans[0] as {error: string}).error}`);
    }
    assertEquals((allPlans as ID[]).includes(travelPlanId), false, "Effect: Deleted travel plan ID should not be listed for the user.");
    // NOTE: Cannot verify deletion of associated necessity and cost estimate documents directly due to API constraints.

    await client.close();
});

Deno.test("TripCostEstimationConcept: deleteTravelPlan - Requirement: travelPlan does not exist", async () => {
    console.log("--- Test: deleteTravelPlan - Requirement: travelPlan does not exist ---");
    const { client, concept, userAlice } = await setupTestEnvironment();

    const nonExistentTravelPlan = freshID() as TravelPlan;
    const result = await concept.deleteTravelPlan({
        user: userAlice,
        travelPlan: nonExistentTravelPlan,
    });
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error for non-existent travel plan.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: Principle Trace - Generate realistic cost estimates based on preferences", async () => {
    console.log("\n--- Principle Trace Test ---");
    const { client, concept } = await setupTestEnvironment();

    const principleUser = "user:PrincipleAlice" as User;
    const principleLocationHome = freshID() as Location;
    const principleLocationDest = freshID() as Location;

    // 1. Setup: Create user and locations
    await concept["locations"].insertOne({ _id: principleLocationHome, city: "London" });
    await concept["locations"].insertOne({ _id: principleLocationDest, city: "Paris" });
    await concept["users"].updateOne({ _id: principleUser }, { $setOnInsert: { _id: principleUser } }, { upsert: true });
    console.log("1. Setup: Created principle user and locations (London, Paris).");

    const fromDateP = new Date();
    fromDateP.setDate(fromDateP.getDate() + 60); // 2 months from now
    const toDateP = new Date();
    toDateP.setDate(toDateP.getDate() + 67); // 7 nights later, making it an 8-day trip (7 nights)

    // 2. Action: Create initial travel plan with default necessity
    const createPlanResult = await concept.createTravelPlan({
        user: principleUser,
        fromCity: principleLocationHome,
        toCity: principleLocationDest,
        fromDate: fromDateP,
        toDate: toDateP,
    });
    if ("error" in createPlanResult) throw new Error(`Principle Trace failed to create travel plan: ${createPlanResult.error}`);
    const principleTravelPlanId = createPlanResult.travelPlan;
    console.log(`2. Action: Created travel plan (${principleTravelPlanId}) for ${principleUser} from London to Paris, with default necessities.`);

    const allPlansAfterCreation = await concept._getAllTravelPlans({ user: principleUser });
    if (Array.isArray(allPlansAfterCreation) && allPlansAfterCreation.some(p => 'error' in p)) {
        throw new Error(`Query failed: ${(allPlansAfterCreation[0] as {error: string}).error}`);
    }
    assertEquals((allPlansAfterCreation as ID[]).includes(principleTravelPlanId), true, "Verification: Travel plan ID is listed after creation.");
    // NOTE: Cannot verify default necessity content (accommodation: true, dining: true) due to API constraints.

    // 3. Action: Update necessity based on user preferences
    const updateNecessityResult = await concept.updateNecessity({
        user: principleUser,
        travelPlan: principleTravelPlanId,
        accommodation: false, // User prefers to stay with friends/family
        diningFlag: true,     // But still wants to eat out
    });
    if ("error" in updateNecessityResult) throw new Error(`Principle Trace failed to update necessity: ${updateNecessityResult.error}`);
    console.log(`3. Action: Updated necessity for plan ${principleTravelPlanId}: accommodation false, dining true.`);
    // NOTE: Cannot verify updated necessity content directly due to API constraints.

    // 4. Action: Generate AI cost estimate using LLM with specialized tool
    const mockPrincipleLlmResponse = JSON.stringify({
        flight: 180,
        roomsPerNight: 0,   // Reflects 'accommodation: false'
        foodDaily: 60,      // Reflects 'diningFlag: true'
    });
    const mockLLM = new MockGeminiLLM(mockPrincipleLlmResponse);

    const generateEstimateResult = await concept.generateAICostEstimate({
        user: principleUser,
        travelPlan: principleTravelPlanId,
        llm: mockLLM,
    });
    if ("error" in generateEstimateResult) throw new Error(`Principle Trace failed to generate estimate: ${generateEstimateResult.error}`);
    const principleCostEstimateId = generateEstimateResult.costEstimate;
    console.log(`4. Action: Generated AI cost estimate (${principleCostEstimateId}) using LLM for plan ${principleTravelPlanId}.`);
    // NOTE: Cannot verify detailed cost estimate values (flight, roomsPerNight, foodDaily) directly due to API constraints.

    // 5. Action: Calculate total cost based on generated estimate
    const estimateCostResult = await concept.estimateCost({ user: principleUser, travelPlan: principleTravelPlanId });
    if ("error" in estimateCostResult) throw new Error(`Principle Trace failed to get total cost: ${estimateCostResult.error}`);

    const numDaysPrinciple = Math.ceil((toDateP.getTime() - fromDateP.getTime()) / (1000 * 60 * 60 * 24)); // 7 days (e.g., May 1st to May 8th is 7 nights, 8 days)
    const expectedTotalCost = 180 + (0 * numDaysPrinciple) + (60 * numDaysPrinciple); // 180 + (0 * 7) + (60 * 7) = 180 + 420 = 600
    assertEquals(estimateCostResult.totalCost, expectedTotalCost, "Verification: Total estimated cost should be correct based on updated preferences.");
    console.log(`5. Action: Calculated total cost: ${estimateCostResult.totalCost}. Expected: ${expectedTotalCost}.`);
    console.log("   Verification: Total cost aligns with flight, NO accommodation costs, and daily dining costs for the duration.");

    // 6. Query: Retrieve user's travel plans
    const allPrinciplePlans = await concept._getAllTravelPlans({ user: principleUser });
    if (Array.isArray(allPrinciplePlans) && allPrinciplePlans.some(p => 'error' in p)) {
        throw new Error(`Query failed: ${(allPrinciplePlans[0] as {error: string}).error}`);
    }
    assertEquals((allPrinciplePlans as ID[]).includes(principleTravelPlanId), true, "Verification: Principle travel plan should be listed for the user.");
    console.log("6. Query: User's travel plans retrieved, includes the principle plan.");

    console.log("Principle Trace completed successfully: An estimate was provided based on user's choices and LLM data.");
    await client.close();
});
```


# prompt: given helper gemini-llm.ts file, change the tests to use functions from gemini-llm.ts
``` typescript
  

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
# response:

Okay, I understand. The `MockGeminiLLM` in the test file needs to reflect the current `GeminiLLM` interface, which now only exposes the `executeLLM` method and handles its own API key retrieval.

Here's the updated `src/TripCostEstimation/TripCostEstimationConcept.test.ts` file with the `MockGeminiLLM` adjusted accordingly.

# file: src/TripCostEstimation/TripCostEstimationConcept.test.ts

```typescript
import { assertEquals, assertObjectMatch, assertInstanceOf } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Import the concept class and its dependencies
import TripCostEstimationConcept from "./TripCostEstimationConcept.ts";
import { GeminiLLM } from "@utils/gemini-llm.ts";

// Helper types from the concept for clarity in tests (module-scoped, consistent with concept)
type User = ID;
type Location = ID;
type TravelPlan = ID;
type Necessity = ID; // Although Necessity is internal ID, it's good to keep its type alias.
type CostEstimate = ID;

// Mock GeminiLLM for testing purposes
// It now directly implements the `executeLLM` method.
class MockGeminiLLM implements GeminiLLM {
    private mockResponse: string | Error;
    private shouldThrow: boolean = false;

    constructor(response: string | Error) {
        this.mockResponse = response;
        if (response instanceof Error) {
            this.shouldThrow = true;
        }
    }

    /**
     * Mock implementation of the GeminiLLM's executeLLM method.
     * It returns a predefined response or throws an error.
     */
    async executeLLM(prompt: string): Promise<string> {
        // console.log(`[MockGeminiLLM] Received prompt (first 100 chars): ${prompt.substring(0, 100)}...`);
        if (this.shouldThrow) {
            throw this.mockResponse;
        }
        return Promise.resolve(this.mockResponse as string);
    }
}

// Common setup for most tests: initializes DB, concept, and basic data
async function setupTestEnvironment() {
    const [db, client] = await testDb();
    const concept = new TripCostEstimationConcept(db);

    const userAlice = "user:Alice" as User;
    const locationNYC = freshID() as Location;
    const locationLA = freshID() as Location;
    const locationCHI = freshID() as Location;

    // Pre-populate locations for tests using concept's internal collections
    // This is allowed in setup as it directly manipulates the initial state for the concept to function.
    await concept["locations"].insertOne({ _id: locationNYC, city: "New York City" });
    await concept["locations"].insertOne({ _id: locationLA, city: "Los Angeles" });
    await concept["locations"].insertOne({ _id: locationCHI, city: "Chicago" });

    // Explicitly add user Alice (concept's createTravelPlan upserts, but explicit setup is good)
    await concept["users"].updateOne(
        { _id: userAlice },
        { $setOnInsert: { _id: userAlice } },
        { upsert: true },
    );

    return { client, concept, userAlice, locationNYC, locationLA, locationCHI };
}

Deno.test("TripCostEstimationConcept: createTravelPlan - Successful creation", async () => {
    console.log("--- Test: createTravelPlan - Successful creation ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 15);

    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: locationNYC,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });

    if ("error" in result) {
        throw new Error(`Test failed: ${result.error}`);
    }
    const travelPlanId = result.travelPlan;
    console.log(`Action: Created travel plan with ID: ${travelPlanId}`);

    // Verify effects via the concept's public API
    const allPlans = await concept._getAllTravelPlans({ user: userAlice });
    if (Array.isArray(allPlans) && allPlans.some(p => 'error' in p)) {
        throw new Error(`Query failed: ${(allPlans[0] as {error: string}).error}`);
    }
    assertEquals((allPlans as ID[]).includes(travelPlanId), true, "Effect: New travel plan ID should be listed for the user.");
    // NOTE: Cannot verify detailed fields (fromCity, toDate, default necessity) due to API constraints.

    await client.close();
});

Deno.test("TripCostEstimationConcept: createTravelPlan - Requirement: fromCity does not exist", async () => {
    console.log("--- Test: createTravelPlan - Requirement: fromCity does not exist ---");
    const { client, concept, userAlice, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const nonExistentLocation = freshID() as Location;

    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: nonExistentLocation,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });
    assertObjectMatch(result, { error: `Origin city with ID ${nonExistentLocation} not found.` }, "Requirement: Should return error for non-existent origin city.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: createTravelPlan - Requirement: toDate < fromDate", async () => {
    console.log("--- Test: createTravelPlan - Requirement: toDate < fromDate ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 15);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 10);

    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: locationNYC,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });
    assertObjectMatch(result, { error: "Arrival date must be on or after departure date." }, "Requirement: Should return error for invalid date range.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: createTravelPlan - Requirement: fromDate is in the past", async () => {
    console.log("--- Test: createTravelPlan - Requirement: fromDate is in the past ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() - 5);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 10);

    const result = await concept.createTravelPlan({
        user: userAlice,
        fromCity: locationNYC,
        toCity: locationLA,
        fromDate: fromDate,
        toDate: toDate,
    });
    assertObjectMatch(result, { error: "Departure and arrival dates must be in the future." }, "Requirement: Should return error for past dates.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: updateNecessity - Successful update", async () => {
    console.log("--- Test: updateNecessity - Successful update ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan first
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const updateResult = await concept.updateNecessity({
        user: userAlice,
        travelPlan: travelPlanId,
        accommodation: false,
        diningFlag: true,
    });

    if ("error" in updateResult) {
        throw new Error(`Test failed: ${updateResult.error}`);
    }
    console.log(`Action: Updated necessity for travel plan ${travelPlanId}`);
    assertEquals(updateResult.travelPlan, travelPlanId, "Effect: Returned travelPlan ID matches.");
    // NOTE: Cannot verify detailed necessity flags (accommodation, diningFlag) due to API constraints.

    await client.close();
});

Deno.test("TripCostEstimationConcept: updateNecessity - Requirement: travelPlan does not belong to user", async () => {
    console.log("--- Test: updateNecessity - Requirement: travelPlan does not belong to user ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan for Alice
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const userBob = "user:Bob" as User;
    await concept["users"].updateOne({ _id: userBob }, { $setOnInsert: { _id: userBob } }, { upsert: true });

    const result = await concept.updateNecessity({
        user: userBob,
        travelPlan: travelPlanId,
        accommodation: true,
        diningFlag: false,
    });
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error as plan doesn't belong to Bob.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: resetNecessity - Successful reset", async () => {
    console.log("--- Test: resetNecessity - Successful reset ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan and modify its necessity
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;
    await concept.updateNecessity({ user: userAlice, travelPlan: travelPlanId, accommodation: false, diningFlag: false });

    const resetResult = await concept.resetNecessity({
        user: userAlice,
        travelPlan: travelPlanId,
    });

    if ("error" in resetResult) {
        throw new Error(`Test failed: ${resetResult.error}`);
    }
    console.log(`Action: Reset necessity for travel plan ${travelPlanId}.`);
    // NOTE: Cannot verify detailed necessity flags (accommodation, diningFlag) due to API constraints.

    await client.close();
});

Deno.test("TripCostEstimationConcept: resetNecessity - Requirement: travelPlan does not exist", async () => {
    console.log("--- Test: resetNecessity - Requirement: travelPlan does not exist ---");
    const { client, concept, userAlice } = await setupTestEnvironment();

    const nonExistentTravelPlan = freshID() as TravelPlan;
    const result = await concept.resetNecessity({
        user: userAlice,
        travelPlan: nonExistentTravelPlan,
    });
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error for non-existent travel plan.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Successful generation", async () => {
    console.log("--- Test: generateAICostEstimate - Successful generation ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
    const mockLLM = new MockGeminiLLM(mockLlmResponse);

    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    if ("error" in result) {
        throw new Error(`Test failed: ${result.error}`);
    }
    const costEstimateId = result.costEstimate;
    console.log(`Action: Generated cost estimate with ID: ${costEstimateId}.`);
    // NOTE: Cannot verify detailed cost estimate fields (flight, roomsPerNight, foodDaily) due to API constraints.

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns invalid JSON", async () => {
    console.log("--- Test: generateAICostEstimate - Interesting Case: LLM returns invalid JSON ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLLM = new MockGeminiLLM("this is not json");
    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    assertObjectMatch(result, { error: (val) => val.includes("Failed to parse LLM response") }, "Expected error for invalid JSON format.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns incomplete JSON", async () => {
    console.log("--- Test: generateAICostEstimate - Interesting Case: LLM returns incomplete JSON ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLLM = new MockGeminiLLM(JSON.stringify({ flight: 500 })); // Missing roomsPerNight and foodDaily
    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    assertObjectMatch(result, { error: (val) => val.includes("LLM response could not be parsed into all required cost components") }, "Expected error for incomplete JSON.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM returns inaccurate values", async () => {
    console.log("--- Test: generateAICostEstimate - Interesting Case: LLM returns inaccurate values (too high/low) ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    // Test case 1: Flight cost too high
    const mockLlmResponseTooHigh = JSON.stringify({ flight: 200000, roomsPerNight: 100, foodDaily: 50 });
    let mockLLM = new MockGeminiLLM(mockLlmResponseTooHigh);
    let result = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: mockLLM });
    assertObjectMatch(result, { error: (val) => val.includes("LLM provided cost estimates are widely inaccurate") }, "Expected error for too high flight cost.");
    console.log(`Requirement Confirmed (too high flight cost): ${result.error}`);

    // Test case 2: Flight cost too low
    const mockLlmResponseTooLow = JSON.stringify({ flight: 10, roomsPerNight: 100, foodDaily: 50 });
    mockLLM = new MockGeminiLLM(mockLlmResponseTooLow);
    result = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: mockLLM });
    assertObjectMatch(result, { error: (val) => val.includes("LLM provided cost estimates are widely inaccurate") }, "Expected error for too low flight cost.");
    console.log(`Requirement Confirmed (too low flight cost): ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: generateAICostEstimate - Interesting Case: LLM API call fails", async () => {
    console.log("--- Test: generateAICostEstimate - Interesting Case: LLM API call fails ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLLM = new MockGeminiLLM(new Error("Network error during LLM call"));
    const result = await concept.generateAICostEstimate({
        user: userAlice,
        travelPlan: travelPlanId,
        llm: mockLLM,
    });

    assertObjectMatch(result, { error: (val) => val.includes("LLM API call failed: Network error during LLM call") }, "Expected error for LLM API failure.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: estimateCost - Successful calculation", async () => {
    console.log("--- Test: estimateCost - Successful calculation ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan and generate an estimate
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15); // 5 nights / 6 days
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
    const generateEstimateResult = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: new MockGeminiLLM(mockLlmResponse) });
    if ("error" in generateEstimateResult) throw new Error(`Setup failed: ${generateEstimateResult.error}`);
    const costEstimateId = generateEstimateResult.costEstimate;

    const numDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    const expectedTotal = 500 + (150 * numDays) + (75 * numDays);

    const result = await concept.estimateCost({ user: userAlice, travelPlan: travelPlanId });

    if ("error" in result) {
        throw new Error(`Test failed: ${result.error}`);
    }
    assertEquals(result.totalCost, expectedTotal, "Effect: Total cost should be correctly calculated and returned.");
    console.log(`Action: Estimated total cost: ${result.totalCost}.`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: estimateCost - Interesting Case: Requirement: no associated CostEstimate", async () => {
    console.log("--- Test: estimateCost - Interesting Case: Requirement: no associated CostEstimate ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a new travel plan without generating an estimate
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 20);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 25);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error("Setup failed: Failed to create new plan for test.");
    const newTravelPlanId = createResult.travelPlan;

    const result = await concept.estimateCost({ user: userAlice, travelPlan: newTravelPlanId });

    assertObjectMatch(result, { error: "No cost estimate found for this travel plan." }, "Requirement: Should return error if no cost estimate exists.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await concept.deleteTravelPlan({ user: userAlice, travelPlan: newTravelPlanId }); // Clean up
    await client.close();
});

Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Returns all plan IDs for user", async () => {
    console.log("--- Test: _getAllTravelPlans - Returns all plan IDs for user ---");
    const { client, concept, userAlice, locationNYC, locationLA, locationCHI } = await setupTestEnvironment();

    // Setup: Create multiple travel plans for Alice
    const fromDate1 = new Date(); fromDate1.setDate(fromDate1.getDate() + 10);
    const toDate1 = new Date(); toDate1.setDate(toDate1.getDate() + 15);
    const createResult1 = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate: fromDate1, toDate: toDate1 });
    if ("error" in createResult1) throw new Error(`Setup failed: ${createResult1.error}`);
    const travelPlanId1 = createResult1.travelPlan;

    const fromDate2 = new Date(); fromDate2.setDate(fromDate2.getDate() + 20);
    const toDate2 = new Date(); toDate2.setDate(toDate2.getDate() + 25);
    const createResult2 = await concept.createTravelPlan({ user: userAlice, fromCity: locationLA, toCity: locationCHI, fromDate: fromDate2, toDate: toDate2 });
    if ("error" in createResult2) throw new Error(`Setup failed: ${createResult2.error}`);
    const travelPlanId2 = createResult2.travelPlan;

    const allPlans = await concept._getAllTravelPlans({ user: userAlice });

    if (!Array.isArray(allPlans) || allPlans.some(p => typeof p !== 'string')) {
        throw new Error(`Test failed: _getAllTravelPlans returned an unexpected format: ${JSON.stringify(allPlans)}`);
    }
    assertEquals(allPlans.length, 2, "Effect: Should return 2 travel plan IDs.");
    assertEquals(allPlans.includes(travelPlanId1), true, `Effect: Should include plan ID ${travelPlanId1}.`);
    assertEquals(allPlans.includes(travelPlanId2), true, `Effect: Should include plan ID ${travelPlanId2}.`);
    console.log(`Action: Retrieved plans for ${userAlice}: ${JSON.stringify(allPlans)}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Returns empty array if user has no plans", async () => {
    console.log("--- Test: _getAllTravelPlans - Returns empty array if user has no plans ---");
    const { client, concept } = await setupTestEnvironment();

    const userNoPlans = "user:Charlie" as User;
    await concept["users"].updateOne(
      { _id: userNoPlans },
      { $setOnInsert: { _id: userNoPlans } },
      { upsert: true },
    );

    const allPlans = await concept._getAllTravelPlans({ user: userNoPlans });

    if (!Array.isArray(allPlans) || allPlans.some(p => typeof p !== 'string')) {
        throw new Error(`Test failed: _getAllTravelPlans returned an unexpected error: ${JSON.stringify(allPlans)}`);
    }
    assertEquals(allPlans.length, 0, "Effect: Should return an empty array for a user with no plans.");
    console.log(`Action: Retrieved plans for user ${userNoPlans}: ${JSON.stringify(allPlans)}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: _getAllTravelPlans - Requirement: user does not exist", async () => {
    console.log("--- Test: _getAllTravelPlans - Requirement: user does not exist ---");
    const { client, concept } = await setupTestEnvironment();

    const nonExistentUser = "user:NonExistent" as User;
    const result = await concept._getAllTravelPlans({ user: nonExistentUser });

    if (!Array.isArray(result) || result.length === 0 || !('error' in result[0])) {
         throw new Error(`Test failed: _getAllTravelPlans did not return expected error for non-existent user: ${JSON.stringify(result)}`);
    }
    assertObjectMatch(result[0], { error: `User with ID ${nonExistentUser} does not exist.` }, "Requirement: Should return error for non-existent user.");
    console.log(`Requirement Confirmed: ${result[0].error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: deleteTravelPlan - Successful deletion of plan and associated data", async () => {
    console.log("--- Test: deleteTravelPlan - Successful deletion of plan and associated data ---");
    const { client, concept, userAlice, locationNYC, locationLA } = await setupTestEnvironment();

    // Setup: Create a travel plan, its necessity, and a cost estimate
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() + 10);
    const toDate = new Date(); toDate.setDate(toDate.getDate() + 15);
    const createResult = await concept.createTravelPlan({ user: userAlice, fromCity: locationNYC, toCity: locationLA, fromDate, toDate });
    if ("error" in createResult) throw new Error(`Setup failed: ${createResult.error}`);
    const travelPlanId = createResult.travelPlan;

    const mockLlmResponse = JSON.stringify({ flight: 500, roomsPerNight: 150, foodDaily: 75 });
    const generateResult = await concept.generateAICostEstimate({ user: userAlice, travelPlan: travelPlanId, llm: new MockGeminiLLM(mockLlmResponse) });
    if ("error" in generateResult) throw new Error(`Setup failed: ${generateResult.error}`);
    const costEstimateId = generateResult.costEstimate; // Cost estimate ID is returned

    console.log(`Action: Deleting travel plan with ID: ${travelPlanId}.`);
    const deleteResult = await concept.deleteTravelPlan({
        user: userAlice,
        travelPlan: travelPlanId,
    });

    if ("error" in deleteResult) {
        throw new Error(`Test failed: ${deleteResult.error}`);
    }
    console.log(`Effect: Travel plan ${travelPlanId} deleted successfully.`);

    // Verify effects via the concept's public API
    const allPlans = await concept._getAllTravelPlans({ user: userAlice });
    if (Array.isArray(allPlans) && allPlans.some(p => 'error' in p)) {
        throw new Error(`Query failed: ${(allPlans[0] as {error: string}).error}`);
    }
    assertEquals((allPlans as ID[]).includes(travelPlanId), false, "Effect: Deleted travel plan ID should not be listed for the user.");
    // NOTE: Cannot verify deletion of associated necessity and cost estimate documents directly due to API constraints.

    await client.close();
});

Deno.test("TripCostEstimationConcept: deleteTravelPlan - Requirement: travelPlan does not exist", async () => {
    console.log("--- Test: deleteTravelPlan - Requirement: travelPlan does not exist ---");
    const { client, concept, userAlice } = await setupTestEnvironment();

    const nonExistentTravelPlan = freshID() as TravelPlan;
    const result = await concept.deleteTravelPlan({
        user: userAlice,
        travelPlan: nonExistentTravelPlan,
    });
    assertObjectMatch(result, { error: "Travel plan not found or does not belong to the user." }, "Requirement: Should return error for non-existent travel plan.");
    console.log(`Requirement Confirmed: ${result.error}`);

    await client.close();
});

Deno.test("TripCostEstimationConcept: Principle Trace - Generate realistic cost estimates based on preferences", async () => {
    console.log("\n--- Principle Trace Test ---");
    const { client, concept } = await setupTestEnvironment();

    const principleUser = "user:PrincipleAlice" as User;
    const principleLocationHome = freshID() as Location;
    const principleLocationDest = freshID() as Location;

    // 1. Setup: Create user and locations
    await concept["locations"].insertOne({ _id: principleLocationHome, city: "London" });
    await concept["locations"].insertOne({ _id: principleLocationDest, city: "Paris" });
    await concept["users"].updateOne({ _id: principleUser }, { $setOnInsert: { _id: principleUser } }, { upsert: true });
    console.log("1. Setup: Created principle user and locations (London, Paris).");

    const fromDateP = new Date();
    fromDateP.setDate(fromDateP.getDate() + 60); // 2 months from now
    const toDateP = new Date();
    toDateP.setDate(toDateP.getDate() + 67); // 7 nights later, making it an 8-day trip (7 nights)

    // 2. Action: Create initial travel plan with default necessity
    const createPlanResult = await concept.createTravelPlan({
        user: principleUser,
        fromCity: principleLocationHome,
        toCity: principleLocationDest,
        fromDate: fromDateP,
        toDate: toDateP,
    });
    if ("error" in createPlanResult) throw new Error(`Principle Trace failed to create travel plan: ${createPlanResult.error}`);
    const principleTravelPlanId = createPlanResult.travelPlan;
    console.log(`2. Action: Created travel plan (${principleTravelPlanId}) for ${principleUser} from London to Paris, with default necessities.`);

    const allPlansAfterCreation = await concept._getAllTravelPlans({ user: principleUser });
    if (Array.isArray(allPlansAfterCreation) && allPlansAfterCreation.some(p => 'error' in p)) {
        throw new Error(`Query failed: ${(allPlansAfterCreation[0] as {error: string}).error}`);
    }
    assertEquals((allPlansAfterCreation as ID[]).includes(principleTravelPlanId), true, "Verification: Travel plan ID is listed after creation.");
    // NOTE: Cannot verify default necessity content (accommodation: true, dining: true) due to API constraints.

    // 3. Action: Update necessity based on user preferences
    const updateNecessityResult = await concept.updateNecessity({
        user: principleUser,
        travelPlan: principleTravelPlanId,
        accommodation: false, // User prefers to stay with friends/family
        diningFlag: true,     // But still wants to eat out
    });
    if ("error" in updateNecessityResult) throw new Error(`Principle Trace failed to update necessity: ${updateNecessityResult.error}`);
    console.log(`3. Action: Updated necessity for plan ${principleTravelPlanId}: accommodation false, dining true.`);
    // NOTE: Cannot verify updated necessity content directly due to API constraints.

    // 4. Action: Generate AI cost estimate using LLM with specialized tool
    const mockPrincipleLlmResponse = JSON.stringify({
        flight: 180,
        roomsPerNight: 0,   // Reflects 'accommodation: false'
        foodDaily: 60,      // Reflects 'diningFlag: true'
    });
    const mockLLM = new MockGeminiLLM(mockPrincipleLlmResponse);

    const generateEstimateResult = await concept.generateAICostEstimate({
        user: principleUser,
        travelPlan: principleTravelPlanId,
        llm: mockLLM,
    });
    if ("error" in generateEstimateResult) throw new Error(`Principle Trace failed to generate estimate: ${generateEstimateResult.error}`);
    const principleCostEstimateId = generateEstimateResult.costEstimate;
    console.log(`4. Action: Generated AI cost estimate (${principleCostEstimateId}) using LLM for plan ${principleTravelPlanId}.`);
    // NOTE: Cannot verify detailed cost estimate values (flight, roomsPerNight, foodDaily) directly due to API constraints.

    // 5. Action: Calculate total cost based on generated estimate
    const estimateCostResult = await concept.estimateCost({ user: principleUser, travelPlan: principleTravelPlanId });
    if ("error" in estimateCostResult) throw new Error(`Principle Trace failed to get total cost: ${estimateCostResult.error}`);

    const numDaysPrinciple = Math.ceil((toDateP.getTime() - fromDateP.getTime()) / (1000 * 60 * 60 * 24)); // 7 days (e.g., May 1st to May 8th is 7 nights, 8 days)
    const expectedTotalCost = 180 + (0 * numDaysPrinciple) + (60 * numDaysPrinciple); // 180 + (0 * 7) + (60 * 7) = 180 + 420 = 600
    assertEquals(estimateCostResult.totalCost, expectedTotalCost, "Verification: Total estimated cost should be correct based on updated preferences.");
    console.log(`5. Action: Calculated total cost: ${estimateCostResult.totalCost}. Expected: ${expectedTotalCost}.`);
    console.log("   Verification: Total cost aligns with flight, NO accommodation costs, and daily dining costs for the duration.");

    // 6. Query: Retrieve user's travel plans
    const allPrinciplePlans = await concept._getAllTravelPlans({ user: principleUser });
    if (Array.isArray(allPrinciplePlans) && allPrinciplePlans.some(p => 'error' in p)) {
        throw new Error(`Query failed: ${(allPrinciplePlans[0] as {error: string}).error}`);
    }
    assertEquals((allPrinciplePlans as ID[]).includes(principleTravelPlanId), true, "Verification: Principle travel plan should be listed for the user.");
    console.log("6. Query: User's travel plans retrieved, includes the principle plan.");

    console.log("Principle Trace completed successfully: An estimate was provided based on user's choices and LLM data.");
    await client.close();
});
```