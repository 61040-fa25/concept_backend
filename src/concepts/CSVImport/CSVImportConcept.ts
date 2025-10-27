import { Db } from "npm:mongodb";
import { freshID } from "../../utils/database.ts";
import {
  Course,
  DayOfWeek,
  Section,
  TimeSlot,
} from "../CourseScheduling/courseSchedulingConcept.ts";

/**
 * @interface CSVSectionData
 * Represents the structure of course section data as it appears in the CSV file
 */
export interface CSVSectionData {
  course_code: string;
  section: string;
  title: string;
  professor: string;
  meeting_time: string;
  current_enrollment: number;
  seats_available: number;
  seats_total: number;
  distribution: string;
}

/**
 * @interface ImportResult
 * Represents the result of a CSV import operation
 */
export interface ImportResult {
  success: boolean;
  message: string;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: string[];
}

/**
 * @interface SectionDocument
 * Represents a section document as stored in MongoDB
 */
export interface SectionDocument {
  id: string;
  course_code: string;
  section: string;
  title: string;
  professor: string;
  meeting_time: string;
  current_enrollment: number;
  seats_available: number;
  seats_total: number;
  distribution: string;
  semester: string; // e.g., "Fall 2025", "Spring 2026"
  created_at: Date;
  updated_at: Date;
}

/**
 * CSV Import concept for handling course section data import from CSV files
 */
export class CSVImportConcept {
  private sectionsCollection = "sections";
  private coursesCollection = "courses";

  constructor(private db: Db) {}

  /**
   * Parse a CSV file and return an array of CSVSectionData objects
   */
  async parseCSVFile(filePath: string): Promise<CSVSectionData[]> {
    try {
      const csvContent = await Deno.readTextFile(filePath);
      const lines = csvContent.split("\n").filter((line) => line.trim() !== "");

      if (lines.length === 0) {
        throw new Error("CSV file is empty");
      }

      // Parse header row
      const headers = this.parseCSVLine(lines[0]);
      const data: CSVSectionData[] = [];

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length !== headers.length) {
          console.warn(`Skipping row ${i + 1}: column count mismatch`);
          continue;
        }

        const rowData: any = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index];
        });

        // Convert numeric fields
        const csvData: CSVSectionData = {
          course_code: rowData.course_code || "",
          section: rowData.section || "",
          title: rowData.title || "",
          professor: rowData.professor || "",
          meeting_time: rowData.meeting_time || "",
          current_enrollment: parseInt(rowData.current_enrollment) || 0,
          seats_available: parseInt(rowData.seats_available) || 0,
          seats_total: parseInt(rowData.seats_total) || 0,
          distribution: rowData.distribution || "",
        };

        data.push(csvData);
      }

      return data;
    } catch (error) {
      throw new Error(
        `Failed to parse CSV file: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Parse a single CSV line, handling quoted fields and commas
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Parse meeting time string and convert to TimeSlot format
   */
  private parseMeetingTime(meetingTime: string): TimeSlot[] {
    if (!meetingTime || meetingTime.trim() === "") {
      return [];
    }

    const timeSlots: TimeSlot[] = [];

    // Handle different time formats
    // Examples: "T - 12:45 PM - 3:25 PM", "MR - 11:20 AM - 12:35 PM"
    const timePattern =
      /([A-Z]+)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i;
    const match = meetingTime.match(timePattern);

    if (match) {
      const daysStr = match[1];
      const startTime = this.convertTo24Hour(match[2]);
      const endTime = this.convertTo24Hour(match[3]);

      const days = this.parseDays(daysStr);

      timeSlots.push({
        days,
        startTime,
        endTime,
        location: "TBD", // Default location since it's not in CSV
      });
    }

    return timeSlots;
  }

  /**
   * Parse day abbreviations (M, T, W, R, F) into DayOfWeek enum
   */
  private parseDays(daysStr: string): DayOfWeek[] {
    const dayMap: Record<string, DayOfWeek> = {
      "M": DayOfWeek.Monday,
      "T": DayOfWeek.Tuesday,
      "W": DayOfWeek.Wednesday,
      "R": DayOfWeek.Thursday,
      "F": DayOfWeek.Friday,
    };

    return daysStr.split("").map((day) => dayMap[day]).filter(Boolean);
  }

  /**
   * Convert 12-hour time format to 24-hour format
   */
  private convertTo24Hour(time12: string): string {
    const [time, period] = time12.split(" ");
    const [hours, minutes] = time.split(":");
    let hour24 = parseInt(hours);

    if (period.toUpperCase() === "PM" && hour24 !== 12) {
      hour24 += 12;
    } else if (period.toUpperCase() === "AM" && hour24 === 12) {
      hour24 = 0;
    }

    return `${hour24.toString().padStart(2, "0")}:${minutes}`;
  }

  /**
   * Import course sections from CSV file into MongoDB
   */
  async importSectionsFromCSV(
    filePath: string,
    semester: string = "Fall 2025",
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      message: "",
      importedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      errors: [],
    };

    try {
      // Parse CSV file
      const csvData = await this.parseCSVFile(filePath);

      if (csvData.length === 0) {
        result.message = "No data found in CSV file";
        return result;
      }

      const sectionsCol = this.db.collection<SectionDocument>(
        this.sectionsCollection,
      );
      const coursesCol = this.db.collection<Course>(this.coursesCollection);

      // Process each row
      for (const row of csvData) {
        try {
          // Validate required fields
          if (!row.course_code || !row.section || !row.title) {
            result.errorCount++;
            result.errors.push(
              `Skipping row: missing required fields (course_code, section, title)`,
            );
            continue;
          }

          // Check for duplicates
          const existingSection = await sectionsCol.findOne({
            course_code: row.course_code,
            section: row.section,
            semester: semester,
          });

          if (existingSection) {
            result.skippedCount++;
            continue;
          }

          // Create or find course
          let course = await coursesCol.findOne({ id: row.course_code });
          if (!course) {
            const newCourse = {
              id: row.course_code,
              title: row.title,
              department: row.course_code.split(" ")[0], // Extract department from course code
            };
            await coursesCol.insertOne(newCourse);
          }

          // Parse meeting time
          const timeSlots = this.parseMeetingTime(row.meeting_time);

          // Create section document
          const sectionDoc: SectionDocument = {
            id: freshID(),
            course_code: row.course_code,
            section: row.section,
            title: row.title,
            professor: row.professor,
            meeting_time: row.meeting_time,
            current_enrollment: row.current_enrollment,
            seats_available: row.seats_available,
            seats_total: row.seats_total,
            distribution: row.distribution,
            semester: semester,
            created_at: new Date(),
            updated_at: new Date(),
          };

          // Insert section
          await sectionsCol.insertOne(sectionDoc);
          result.importedCount++;
        } catch (rowError) {
          result.errorCount++;
          result.errors.push(
            `Error processing row: ${
              rowError instanceof Error ? rowError.message : String(rowError)
            }`,
          );
        }
      }

      result.success = true;
      result.message =
        `✅ Loaded ${result.importedCount} course sections into MongoDB. Skipped ${result.skippedCount} duplicates. ${result.errorCount} errors.`;
    } catch (error) {
      result.success = false;
      result.message = `❌ Import failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      result.errors.push(
        error instanceof Error ? error.message : String(error),
      );
    }

    return result;
  }

  /**
   * Get all sections from the database
   */
  async getAllSections(): Promise<SectionDocument[]> {
    return await this.db.collection<SectionDocument>(this.sectionsCollection)
      .find()
      .toArray();
  }

  /**
   * Get sections by course code
   */
  async getSectionsByCourse(
    body: { courseCode: string },
  ): Promise<SectionDocument[]> {
    const { courseCode } = body;
    return await this.db.collection<SectionDocument>(this.sectionsCollection)
      .find({ course_code: courseCode })
      .toArray();
  }

  /**
   * Search sections by various criteria
   */
  async searchSections(criteria: {
    courseCode?: string;
    professor?: string;
    title?: string;
    distribution?: string;
  }): Promise<SectionDocument[]> {
    const query: any = {};

    if (criteria.courseCode) {
      query.course_code = { $regex: criteria.courseCode, $options: "i" };
    }
    if (criteria.professor) {
      query.professor = { $regex: criteria.professor, $options: "i" };
    }
    if (criteria.title) {
      query.title = { $regex: criteria.title, $options: "i" };
    }
    if (criteria.distribution) {
      query.distribution = { $regex: criteria.distribution, $options: "i" };
    }

    return await this.db.collection<SectionDocument>(this.sectionsCollection)
      .find(query)
      .toArray();
  }

  /**
   * Get sections by semester
   */
  async getSectionsBySemester(
    body: { semester: string },
  ): Promise<SectionDocument[]> {
    const { semester } = body;
    return await this.db.collection<SectionDocument>(this.sectionsCollection)
      .find({ semester: semester })
      .toArray();
  }

  /**
   * Clear all sections from the database
   */
  async clearAllSections(): Promise<{ success: boolean; message: string }> {
    try {
      await this.db.collection(this.sectionsCollection).deleteMany({});
      return {
        success: true,
        message: "All sections cleared from database",
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear sections: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }

  /**
   * Clear sections by semester
   */
  async clearSectionsBySemester(
    body: { semester: string },
  ): Promise<{ success: boolean; message: string; deletedCount: number }> {
    const { semester } = body;
    try {
      const result = await this.db.collection(this.sectionsCollection)
        .deleteMany({ semester: semester });
      return {
        success: true,
        message: `Cleared ${result.deletedCount} sections for ${semester}`,
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear sections for ${semester}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        deletedCount: 0,
      };
    }
  }

  /**
   * Update existing sections to add semester field
   */
  async updateSectionsWithSemester(
    body: { semester: string },
  ): Promise<{ success: boolean; message: string; updatedCount: number }> {
    const { semester } = body;
    try {
      const result = await this.db.collection(this.sectionsCollection)
        .updateMany(
          { semester: { $exists: false } }, // Only update sections without semester
          { $set: { semester: semester } },
        );
      return {
        success: true,
        message:
          `Updated ${result.modifiedCount} sections with semester ${semester}`,
        updatedCount: result.modifiedCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update sections with semester: ${
          error instanceof Error ? error.message : String(error)
        }`,
        updatedCount: 0,
      };
    }
  }
}

// Default export for the server to load dynamically
export default CSVImportConcept;
