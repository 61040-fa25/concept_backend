#!/usr/bin/env -S deno run --allow-read --allow-env --allow-net --allow-write

/**
 * Script to import course sections from courses_archive.json into MongoDB
 * with Fall 2025 semester marking
 *
 * Usage:
 *   deno run --allow-read --allow-env --allow-net --allow-write scripts/import_archive_sections.ts
 */

import "jsr:@std/dotenv/load";
import { getDb } from "../src/utils/database.ts";
import CSVImportConcept from "../src/concepts/CSVImport/CSVImportConcept.ts";

async function main() {
  const archiveFilePath = "src/concepts/CourseFiltering/courses_archive.json";
  const csvFilePath = "data/fall_2025_sections.csv";
  const semester = "Fall 2025";

  try {
    console.log("📁 Reading courses archive...");

    // Read the JSON archive
    const archiveContent = await Deno.readTextFile(archiveFilePath);
    const sections = JSON.parse(archiveContent);

    console.log(`📊 Found ${sections.length} course sections in archive`);

    // Convert to CSV format
    console.log("🔄 Converting to CSV format...");

    const csvHeader =
      "course_code,section,title,professor,meeting_time,current_enrollment,seats_available,seats_total,distribution";
    const csvRows = sections.map((section: any) => {
      return [
        section.course_code,
        section.section,
        section.title,
        section.professor,
        section.meeting_time,
        section.current_enrollment,
        section.seats_available,
        section.seats_total,
        section.distribution,
      ].map((field) => `"${field}"`).join(",");
    });

    const csvContent = [csvHeader, ...csvRows].join("\n");

    // Write CSV file
    await Deno.writeTextFile(csvFilePath, csvContent);
    console.log(`✅ CSV file created: ${csvFilePath}`);

    // Initialize database connection
    console.log("🔌 Connecting to MongoDB...");
    const [db, client] = await getDb();
    console.log("✅ Connected to MongoDB");

    // Initialize CSV import concept
    const csvImport = new CSVImportConcept(db);

    // Clear any existing Fall 2025 sections first
    console.log(`🧹 Clearing existing ${semester} sections...`);
    const clearResult = await csvImport.clearSectionsBySemester(semester);
    console.log(`   ${clearResult.message}`);

    // Import sections
    console.log(`📥 Starting CSV import for ${semester}...`);
    const result = await csvImport.importSectionsFromCSV(csvFilePath, semester);

    // Display results
    console.log("\n" + "=".repeat(60));
    console.log("📊 IMPORT RESULTS");
    console.log("=".repeat(60));
    console.log(`Status: ${result.success ? "✅ SUCCESS" : "❌ FAILED"}`);
    console.log(`Message: ${result.message}`);
    console.log(`Imported: ${result.importedCount} sections`);
    console.log(`Skipped: ${result.skippedCount} duplicates`);
    console.log(`Errors: ${result.errorCount} rows`);
    console.log(`Semester: ${semester}`);

    if (result.errors.length > 0) {
      console.log("\n❌ ERRORS:");
      result.errors.slice(0, 10).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      if (result.errors.length > 10) {
        console.log(`  ... and ${result.errors.length - 10} more errors`);
      }
    }

    // Show some sample imported data
    if (result.success && result.importedCount > 0) {
      console.log("\n📋 SAMPLE IMPORTED SECTIONS:");
      const sections = await csvImport.getSectionsBySemester(semester);
      const sampleSections = sections.slice(0, 5);

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
        console.log(`     Semester: ${section.semester}`);
        console.log("");
      });

      // Show statistics by department
      console.log("📈 STATISTICS BY DEPARTMENT:");
      const departmentStats = new Map<string, number>();
      sections.forEach((section) => {
        const dept = section.course_code.split(" ")[0];
        departmentStats.set(dept, (departmentStats.get(dept) || 0) + 1);
      });

      const sortedDepts = Array.from(departmentStats.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      sortedDepts.forEach(([dept, count]) => {
        console.log(`  ${dept}: ${count} sections`);
      });
    }

    console.log("=".repeat(60));

    // Close database connection
    await client.close();
    console.log("🔌 Database connection closed");

    // Cleanup CSV file
    await Deno.remove(csvFilePath);
    console.log("🧹 Cleaned up temporary CSV file");
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    Deno.exit(1);
  }
}

// Run the script
if (import.meta.main) {
  main();
}
