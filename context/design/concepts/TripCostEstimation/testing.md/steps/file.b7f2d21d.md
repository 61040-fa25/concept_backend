---
timestamp: 'Fri Oct 17 2025 18:33:51 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251017_183351.72d1c2a3.md]]'
content_id: b7f2d21db41f9851c72c7f81a9d86295400bbbab5796dd43dcbfcee8e53a154a
---

# file: src/TripCostEstimation/TripCostEstimationConcept.ts

````typescript
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
}

// --- State Interfaces ---

/**
 * A set of Users
 * (Documents store the user's ID. TravelPlans link back to User IDs.)
 */
interface UsersDoc {
  _id: User;
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
 *   a `latestCostEstimateID` CostEstimate (ID) - NEW: Reference to the most recent estimate
 */
interface TravelPlansDoc {
  _id: TravelPlan;
  userID: User; // Link to UsersDoc
  fromCity: Location; // Link to LocationsDoc
  toCity: Location; // Link to LocationsDoc
  fromDate: Date;
  toDate: Date;
  necessityID: Necessity; // Link to NecessitiesDoc
  latestCostEstimateID?: CostEstimate; // NEW: Optional link to the latest cost estimate
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
  travelPlanID: TravelPlan; // Link to TravelPlansDoc (many-to-one)
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
      // NEW: No latestCostEstimateID initially
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

    // Delete all associated CostEstimates (many-to-one relationship)
    await this.costEstimates.deleteMany({ travelPlanID: travelPlan });

    // Delete associated Necessity
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
   * **effects** Update the `necessity` linked to `travelPlan` with new `accommodation` and `diningFlag` values.
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
   * **effects** Retrieves trip details (dates, locations) and necessity preference (accommodation, dining) and uses the llm's specialized tool (e.g., Google Search/Flights/Hotels) to calculate and return the median cost estimates for flight, `rooms_per_night`, and `food_daily`; the resulting data is stored as a new `CostEstimate` associated with the `travelPlanID`. The `TravelPlan`'s `latestCostEstimateID` is updated to this new estimate.
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
      return { error: `LLM API call failed: ${(llmError as Error).message}` };
    }

    const parsedCostEstimate = this._parseLLMCostEstimate(llmRawResult);

    if ("error" in parsedCostEstimate) {
      return { error: parsedCostEstimate.error };
    }

    const flightCost = parsedCostEstimate.flight ?? 0;
    const roomsPerNightCost = parsedCostEstimate.roomsPerNight ?? 0;
    const foodDailyCost = parsedCostEstimate.foodDaily ?? 0;

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

    // NEW: Always insert a new cost estimate (many-to-one)
    await this.costEstimates.insertOne(newCostEstimate);

    // NEW: Update the travel plan to reference this new cost estimate as the latest
    await this.travelPlans.updateOne(
        { _id: travelPlan },
        { $set: { latestCostEstimateID: newCostEstimateID } }
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

    // NEW: Retrieve the LATEST cost estimate via the travel plan's reference
    if (!existingTravelPlan.latestCostEstimateID) {
      return { error: "No latest cost estimate found for this travel plan." };
    }

    const costEstimate = await this.costEstimates.findOne({
      _id: existingTravelPlan.latestCostEstimateID,
      travelPlanID: travelPlan, // Optional: for extra validation that the estimate belongs to this plan
    });

    if (!costEstimate) {
      // This could happen if latestCostEstimateID points to a deleted or non-existent estimate
      return { error: "Referenced cost estimate not found." };
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
    const userExists = await this.users.findOne({ _id: user });
    if (!userExists) {
      return [{ error: `User with ID ${user} does not exist.` }];
    }

    const plans = await this.travelPlans.find({ userID: user }, {
      projection: { _id: 1 },
    }).toArray();

    return plans.map((plan) => plan._id as TravelPlan);
  }
}
````
