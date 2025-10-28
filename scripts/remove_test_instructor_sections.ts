#!/usr/bin/env -S deno run --allow-read --allow-env --allow-net --allow-sys

/**
 * Script to remove test sections with fake instructor names
 * Removes sections with instructors starting with:
 * - "Dr. " (e.g., "Dr. Jane Doe", "Dr. John Smith")
 * - "Prof. " (e.g., "Prof. Alice Johnson", "Prof. Bob Wilson")
 *
 * Usage:
 *   deno run --allow-read --allow-env --allow-net --allow-sys scripts/remove_test_instructor_sections.ts
 */

import "jsr:@std/dotenv/load";
import { Db, MongoClient } from "npm:mongodb";
import { getDb } from "../src/utils/database.ts";

async function main() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    const [db, client]: [Db, MongoClient] = await getDb();
    console.log("✅ Connected to MongoDB");

    const sectionsCollection = db.collection("sections");

    // Find sections where instructor starts with "Dr. " or "Prof. "
    console.log("🔍 Finding test sections with 'Dr.' or 'Prof.' titles...");

    // Using $or to match either pattern
    const testSections = await sectionsCollection.find({
      $or: [
        { instructor: { $regex: /^Dr\.\s+/i } }, // Starts with "Dr. "
        { instructor: { $regex: /^Prof\.\s+/i } }, // Starts with "Prof. "
      ],
    }).toArray();

    console.log(`   Found ${testSections.length} test sections`);

    if (testSections.length === 0) {
      console.log("✅ No test sections to remove");
      await client.close();
      return;
    }

    // Show all sections to be removed
    console.log("\n📋 SECTIONS TO BE REMOVED:");
    testSections.forEach((section, index) => {
      console.log(
        `  ${index + 1}. ${section.courseId || section.course_code} - Section ${
          section.sectionNumber || section.section
        }`,
      );
      console.log(`     Instructor: ${section.instructor}`);
      console.log(`     Course: ${section.courseId}`);
      console.log("");
    });

    // Remove test sections
    console.log("🗑️  Removing test sections...");
    const deleteResult = await sectionsCollection.deleteMany({
      $or: [
        { instructor: { $regex: /^Dr\.\s+/i } },
        { instructor: { $regex: /^Prof\.\s+/i } },
      ],
    });

    console.log("\n" + "=".repeat(60));
    console.log("📊 CLEANUP RESULTS");
    console.log("=".repeat(60));
    console.log(`Sections removed: ${deleteResult.deletedCount}`);

    // Show remaining sections count
    const remainingSections = await sectionsCollection.countDocuments();
    console.log(`Remaining sections: ${remainingSections}`);

    // Verify the courses that had test sections removed
    console.log("\n📋 VERIFYING: Sample remaining instructors");
    const sampleRemaining = await sectionsCollection.find({})
      .limit(5)
      .toArray();

    sampleRemaining.forEach((section, index) => {
      console.log(
        `  ${index + 1}. ${section.courseId} - ${section.instructor}`,
      );
    });

    console.log("=".repeat(60));
    console.log("✅ Cleanup completed successfully");

    await client.close();
    console.log("🔌 Database connection closed");
  } catch (error) {
    console.error("❌ Fatal error:", (error as Error).message);
    Deno.exit(1);
  }
}

// Run the script
if (import.meta.main) {
  main();
}
