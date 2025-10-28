#!/usr/bin/env -S deno run --allow-read --allow-env --allow-net --allow-sys

/**
 * Script to remove test sections with "Dr" or "dr" in professor names
 *
 * Usage:
 *   deno run --allow-read --allow-env --allow-net --allow-sys scripts/remove_test_sections.ts
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

    // Find sections with "Dr" or "dr" in instructor name
    console.log("🔍 Finding test sections with 'Dr' in instructor name...");
    const testSections = await sectionsCollection.find({
      instructor: { $regex: /dr/i }, // Case-insensitive regex for "dr"
    }).toArray();

    console.log(`   Found ${testSections.length} test sections`);

    if (testSections.length === 0) {
      console.log("✅ No test sections to remove");
      await client.close();
      return;
    }

    // Show sample sections to be removed
    console.log("\n📋 SAMPLE SECTIONS TO BE REMOVED:");
    testSections.slice(0, 10).forEach((section, index) => {
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

    if (testSections.length > 10) {
      console.log(`  ... and ${testSections.length - 10} more sections`);
    }

    // Remove test sections
    console.log("🗑️  Removing test sections...");
    const deleteResult = await sectionsCollection.deleteMany({
      instructor: { $regex: /dr/i },
    });

    console.log("\n" + "=".repeat(60));
    console.log("📊 CLEANUP RESULTS");
    console.log("=".repeat(60));
    console.log(`Sections removed: ${deleteResult.deletedCount}`);

    // Show remaining sections count
    const remainingSections = await sectionsCollection.countDocuments();
    console.log(`Remaining sections: ${remainingSections}`);

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
