#!/usr/bin/env -S deno run --allow-read --allow-env --allow-net --allow-sys

/**
 * Script to remove test sections where instructor has "Dr" or "Dr." as a title
 * Examples: "Dr. Jane Doe", "Dr Jane Doe", "Dr John Smith", "Dr. Robert Taylor"
 *
 * This will NOT remove instructors with "dr" in their actual name like:
 * - "Andrea Sequeira" (contains "dre")
 * - "Aalyia Sadruddin" (contains "dru")
 *
 * Usage:
 *   deno run --allow-read --allow-env --allow-net --allow-sys scripts/remove_dr_titled_sections.ts
 */

import "jsr:@std/dotenv/load";
import { getDb } from "../src/utils/database.ts";

async function main() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    const [db, client] = await getDb();
    console.log("✅ Connected to MongoDB");

    const sectionsCollection = db.collection("sections");

    // Find sections where instructor starts with "Dr" or "Dr."
    console.log("🔍 Finding test sections with 'Dr' or 'Dr.' title...");

    // Using regex to match "Dr" or "Dr." at the start of the instructor name
    // ^Dr\.?\s+ matches "Dr" or "Dr." followed by a space at the beginning
    const testSections = await sectionsCollection.find({
      instructor: { $regex: /^Dr\.?\s+/i }, // Case-insensitive, starts with "Dr" or "Dr." + space
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
      console.log(
        `     Instructor: ${section.instructor || section.professor}`,
      );
      console.log("");
    });

    // Remove test sections
    console.log("🗑️  Removing test sections...");
    const deleteResult = await sectionsCollection.deleteMany({
      instructor: { $regex: /^Dr\.?\s+/i },
    });

    console.log("\n" + "=".repeat(60));
    console.log("📊 CLEANUP RESULTS");
    console.log("=".repeat(60));
    console.log(`Sections removed: ${deleteResult.deletedCount}`);

    // Show remaining sections count
    const remainingSections = await sectionsCollection.countDocuments();
    console.log(`Remaining sections: ${remainingSections}`);

    // Verify no false positives - check a few remaining instructors
    console.log("\n📋 SAMPLE REMAINING INSTRUCTORS (verification):");
    const remainingInstructors = await sectionsCollection.aggregate([
      { $group: { _id: "$instructor" } },
      { $limit: 10 },
    ]).toArray();

    remainingInstructors.forEach((doc, index) => {
      console.log(`  ${index + 1}. ${doc._id}`);
    });

    console.log("=".repeat(60));
    console.log("✅ Cleanup completed successfully");

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
