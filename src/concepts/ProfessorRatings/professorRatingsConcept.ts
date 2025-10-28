import { Db } from "npm:mongodb";

/**
 * @interface ProfessorRating
 * Represents a cached professor rating from Rate My Professor
 */
export interface ProfessorRating {
  instructorName: string;
  schoolName?: string;
  rating: number | null;
  difficulty: number | null;
  numRatings: number;
  wouldTakeAgainPercent: number | null;
  lastUpdated: Date;
  rmpId?: string; // Rate My Professor internal ID
}

/**
 * @interface RMPResponse
 * Response structure from Rate My Professor API
 */
interface RMPResponse {
  avgRating: number | null;
  avgDifficulty: number | null;
  numRatings: number;
  wouldTakeAgainPercent: number | null;
  legacyId: number;
  firstName: string;
  lastName: string;
}

/**
 * ProfessorRatingsConcept
 *
 * Handles fetching and caching professor ratings from Rate My Professor.
 * Implements a 24-hour cache to minimize external API calls.
 *
 * Features:
 * - Automatic caching with 24-hour TTL
 * - Graceful fallback for missing/unrated professors
 * - Secure API key management via environment variables
 * - MongoDB-backed cache storage
 */
export default class ProfessorRatingsConcept {
  private db: Db;
  private ratingsCollection = "professorRatings";
  private sectionsCollection = "sections";
  private cacheExpirationHours = 24;

  // Rate My Professor API configuration
  private rmpApiBaseUrl = Deno.env.get("RMP_API_BASE_URL") ||
    "https://www.ratemyprofessors.com/graphql";
  private schoolId = Deno.env.get("RMP_SCHOOL_ID") || "1506"; // Default: Wellesley College

  constructor(db: Db) {
    this.db = db;
  }

  /**
   * Get professor rating for a specific section
   * Main entry point for the API endpoint
   */
  async getRatingForSection(body: { sectionId: string }): Promise<
    {
      success: boolean;
      data?: ProfessorRating;
      message?: string;
    }
  > {
    try {
      const { sectionId } = body;

      // Look up the section to get instructor name
      const section = await this.db.collection(this.sectionsCollection)
        .findOne({ id: sectionId });

      if (!section) {
        return {
          success: false,
          message: "Section not found",
        };
      }

      const instructorName = section.instructor;
      if (!instructorName || instructorName.trim() === "") {
        return {
          success: false,
          message: "No instructor assigned to this section",
        };
      }

      // Get or fetch rating
      const rating = await this.getOrFetchRating(instructorName);

      return {
        success: true,
        data: rating,
      };
    } catch (error) {
      console.error("Error getting professor rating:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get rating from cache or fetch from RMP API
   */
  private async getOrFetchRating(
    instructorName: string,
  ): Promise<ProfessorRating> {
    // Check cache first
    const cached = await this.getCachedRating(instructorName);
    if (cached && this.isCacheValid(cached)) {
      console.log(`Using cached rating for ${instructorName}`);
      return cached;
    }

    // Fetch fresh rating from RMP
    console.log(`Fetching fresh rating for ${instructorName}`);
    const freshRating = await this.fetchRatingFromRMP(instructorName);

    // Update cache
    await this.updateCache(freshRating);

    return freshRating;
  }

  /**
   * Get cached rating from MongoDB
   */
  private async getCachedRating(
    instructorName: string,
  ): Promise<ProfessorRating | null> {
    const cached = await this.db.collection<ProfessorRating>(
      this.ratingsCollection,
    ).findOne({
      instructorName: instructorName,
    });

    return cached;
  }

  /**
   * Check if cached rating is still valid (< 24 hours old)
   */
  private isCacheValid(rating: ProfessorRating): boolean {
    const now = new Date();
    const cacheAge = now.getTime() - rating.lastUpdated.getTime();
    const maxAge = this.cacheExpirationHours * 60 * 60 * 1000; // 24 hours in ms

    return cacheAge < maxAge;
  }

  /**
   * Fetch rating from Rate My Professor API
   */
  private async fetchRatingFromRMP(
    instructorName: string,
  ): Promise<ProfessorRating> {
    try {
      // Parse instructor name
      const nameParts = this.parseInstructorName(instructorName);

      // Search for professor on RMP
      const professorData = await this.searchProfessorOnRMP(
        nameParts.firstName,
        nameParts.lastName,
      );

      if (!professorData) {
        // Return empty rating if not found
        return {
          instructorName,
          rating: null,
          difficulty: null,
          numRatings: 0,
          wouldTakeAgainPercent: null,
          lastUpdated: new Date(),
        };
      }

      // Return the rating data
      return {
        instructorName,
        schoolName: "Wellesley College",
        rating: professorData.avgRating,
        difficulty: professorData.avgDifficulty,
        numRatings: professorData.numRatings,
        wouldTakeAgainPercent: professorData.wouldTakeAgainPercent,
        rmpId: professorData.legacyId.toString(),
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error(`Error fetching RMP data for ${instructorName}:`, error);

      // Return empty rating on error
      return {
        instructorName,
        rating: null,
        difficulty: null,
        numRatings: 0,
        wouldTakeAgainPercent: null,
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Search for professor on Rate My Professor using GraphQL API
   */
  private async searchProfessorOnRMP(
    firstName: string,
    lastName: string,
  ): Promise<RMPResponse | null> {
    try {
      // RMP GraphQL query
      const query = {
        query: `query NewSearchTeachersQuery($text: String!, $schoolID: ID!) {
          newSearch {
            teachers(query: {text: $text, schoolID: $schoolID}) {
              edges {
                node {
                  legacyId
                  firstName
                  lastName
                  avgRating
                  avgDifficulty
                  numRatings
                  wouldTakeAgainPercent
                }
              }
            }
          }
        }`,
        variables: {
          text: `${firstName} ${lastName}`,
          schoolID: btoa(`School-${this.schoolId}`), // Base64 encode school ID
        },
      };

      const response = await fetch(this.rmpApiBaseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${Deno.env.get("RMP_API_KEY") || ""}`,
        },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        console.warn(
          `RMP API request failed: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const data = await response.json();

      // Extract first matching professor
      const edges = data?.data?.newSearch?.teachers?.edges;
      if (!edges || edges.length === 0) {
        console.log(`No RMP data found for ${firstName} ${lastName}`);
        return null;
      }

      const professor = edges[0].node;
      return {
        avgRating: professor.avgRating,
        avgDifficulty: professor.avgDifficulty,
        numRatings: professor.numRatings,
        wouldTakeAgainPercent: professor.wouldTakeAgainPercent,
        legacyId: professor.legacyId,
        firstName: professor.firstName,
        lastName: professor.lastName,
      };
    } catch (error) {
      console.error("Error calling RMP API:", error);
      return null;
    }
  }

  /**
   * Parse instructor name into first and last name
   * Handles formats like:
   * - "John Smith"
   * - "Dr. John Smith"
   * - "Prof. Jane Doe"
   * - "John Q. Smith"
   */
  private parseInstructorName(fullName: string): {
    firstName: string;
    lastName: string;
  } {
    // Remove common titles
    let cleanName = fullName
      .replace(/^(Dr\.|Prof\.|Professor)\s+/i, "")
      .trim();

    // Split by whitespace
    const parts = cleanName.split(/\s+/);

    if (parts.length === 0) {
      return { firstName: "", lastName: "" };
    }

    if (parts.length === 1) {
      return { firstName: parts[0], lastName: "" };
    }

    // Assume first part is first name, last part is last name
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];

    return { firstName, lastName };
  }

  /**
   * Update cache in MongoDB
   */
  private async updateCache(rating: ProfessorRating): Promise<void> {
    try {
      await this.db.collection(this.ratingsCollection).updateOne(
        { instructorName: rating.instructorName },
        { $set: rating },
        { upsert: true },
      );
    } catch (error) {
      console.error("Error updating cache:", error);
    }
  }

  /**
   * Clear all cached ratings (utility method for testing/admin)
   */
  async clearCache(): Promise<{ success: boolean; deletedCount: number }> {
    try {
      const result = await this.db.collection(this.ratingsCollection)
        .deleteMany({});
      return {
        success: true,
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      console.error("Error clearing cache:", error);
      return {
        success: false,
        deletedCount: 0,
      };
    }
  }

  /**
   * Get all cached ratings (utility method for admin/debugging)
   */
  async getAllCachedRatings(): Promise<ProfessorRating[]> {
    try {
      return await this.db.collection<ProfessorRating>(this.ratingsCollection)
        .find({})
        .toArray();
    } catch (error) {
      console.error("Error getting cached ratings:", error);
      return [];
    }
  }

  /**
   * Manually refresh a specific professor's rating
   */
  async refreshRating(body: { instructorName: string }): Promise<
    {
      success: boolean;
      data?: ProfessorRating;
      message?: string;
    }
  > {
    try {
      const { instructorName } = body;
      const freshRating = await this.fetchRatingFromRMP(instructorName);
      await this.updateCache(freshRating);

      return {
        success: true,
        data: freshRating,
      };
    } catch (error) {
      console.error("Error refreshing rating:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
