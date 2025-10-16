---
timestamp: 'Thu Oct 16 2025 12:47:34 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_124734.bb10b29d.md]]'
content_id: 077ede351d67bc1c7a4a149f013bb1a885f11309bdd730fa9d0163c6b2cfcf00
---

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
