#!/usr/bin/env -S deno run --allow-read --allow-env --allow-net

/**
 * Standalone script to import course sections from CSV file into MongoDB
 *
 * Usage:
 *   deno run --allow-read --allow-env --allow-net scripts/import_sections.ts <csv_file_path> [semester]
 *
 * Example:
 *   deno run --allow-read --allow-env --allow-net scripts/import_sections.ts data/sections.csv "Fall 2025"
 */

import "jsr:@std/dotenv/load";
import { getDb } from "../src/utils/database.ts";
import CSVImportConcept from "../src/concepts/CSVImport/CSVImportConcept.ts";

async function main() {
  const args = Deno.args;

  if (args.length === 0) {
    console.error("❌ Error: Please provide a CSV file path");
    console.log(
      "Usage: deno run --allow-read --allow-env --allow-net scripts/import_sections.ts <csv_file_path> [semester]",
    );
    console.log(
      'Example: deno run --allow-read --allow-env --allow-net scripts/import_sections.ts data/sections.csv "Fall 2025"',
    );
    Deno.exit(1);
  }

  const csvFilePath = args[0];
  const semester = args[1] || "Fall 2025";

  try {
    // Check if file exists
    try {
      await Deno.stat(csvFilePath);
    } catch {
      console.error(`❌ Error: File '${csvFilePath}' not found`);
      Deno.exit(1);
    }

    console.log(`📁 Reading CSV file: ${csvFilePath}`);
    console.log(`📅 Semester: ${semester}`);

    // Initialize database connection
    console.log("🔌 Connecting to MongoDB...");
    const [db, client] = await getDb();
    console.log("✅ Connected to MongoDB");

    // Initialize CSV import concept
    const csvImport = new CSVImportConcept(db);

    // Import sections
    console.log("📥 Starting CSV import...");
    const result = await csvImport.importSectionsFromCSV(csvFilePath, semester);

    // Display results
    console.log("\n" + "=".repeat(50));
    console.log("📊 IMPORT RESULTS");
    console.log("=".repeat(50));
    console.log(`Status: ${result.success ? "✅ SUCCESS" : "❌ FAILED"}`);
    console.log(`Message: ${result.message}`);
    console.log(`Imported: ${result.importedCount} sections`);
    console.log(`Skipped: ${result.skippedCount} duplicates`);
    console.log(`Errors: ${result.errorCount} rows`);

    if (result.errors.length > 0) {
      console.log("\n❌ ERRORS:");
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    // Show some sample imported data
    if (result.success && result.importedCount > 0) {
      console.log("\n📋 SAMPLE IMPORTED SECTIONS:");
      const sections = await csvImport.getAllSections();
      const sampleSections = sections.slice(0, 3);

      sampleSections.forEach((section, index) => {
        console.log(
          `  ${
            index + 1
          }. ${section.course_code} - ${section.section} | ${section.title}`,
        );
        console.log(`     Professor: ${section.professor}`);
        console.log(`     Time: ${section.meeting_time}`);
        console.log(
          `     Enrollment: ${section.current_enrollment}/${section.seats_total}`,
        );
        console.log(`     Distribution: ${section.distribution}`);
        console.log("");
      });
    }

    console.log("=".repeat(50));

    // Close database connection
    await client.close();
    console.log("🔌 Database connection closed");
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    Deno.exit(1);
  }
}

// Run the script
if (import.meta.main) {
  main();
}
