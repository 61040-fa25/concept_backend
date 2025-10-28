#!/usr/bin/env -S deno run --allow-read --allow-env --allow-net --allow-write --allow-sys

/**
 * Script to clean up invalid courses and test data from MongoDB
 *
 * This script removes:
 * - Courses with empty or invalid titles
 * - Test courses with empty fields
 * - Courses without proper course_code
 * - Courses with invalid data structures
 *
 * Usage:
 *   deno run --allow-read --allow-env --allow-net --allow-write --allow-sys scripts/cleanup_invalid_courses.ts
 */

import "jsr:@std/dotenv/load";
import { getDb } from "../src/utils/database.ts";

async function main() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    const [db, client] = await getDb();
    console.log("✅ Connected to MongoDB");

    const sectionsCollection = db.collection("sections");
    const coursesCollection = db.collection("courses");

    // Get all sections first to analyze
    console.log("📊 Analyzing current data...");
    const allSections = await sectionsCollection.find({}).toArray();
    console.log(`   Found ${allSections.length} total sections`);

    // Identify invalid sections
    const invalidSections = allSections.filter((section) => {
      // Check for empty or invalid course_code
      if (!section.course_code || section.course_code.trim() === "") {
        return true;
      }

      // Check for empty or invalid title
      if (!section.title || section.title.trim() === "") {
        return true;
      }

      // Check for test data patterns
      if (
        section.course_code.toLowerCase().includes("test") ||
        section.title.toLowerCase().includes("test")
      ) {
        return true;
      }

      // Check for empty instructor
      if (!section.professor || section.professor.trim() === "") {
        return true;
      }

      // Check for old CourseScheduling structure (has courseId object instead of course_code)
      if (section.courseId && typeof section.courseId === "object") {
        return true;
      }

      return false;
    });

    console.log(
      `   Found ${invalidSections.length} invalid sections to remove`,
    );

    if (invalidSections.length > 0) {
      console.log("\n🗑️  INVALID SECTIONS TO REMOVE:");
      invalidSections.slice(0, 10).forEach((section, index) => {
        console.log(`  ${index + 1}. ID: ${section.id}`);
        console.log(`     Course Code: "${section.course_code || "MISSING"}"`);
        console.log(`     Title: "${section.title || "MISSING"}"`);
        console.log(`     Professor: "${section.professor || "MISSING"}"`);
        console.log(`     Structure: ${section.courseId ? "OLD" : "NEW"}`);
        console.log("");
      });

      if (invalidSections.length > 10) {
        console.log(
          `  ... and ${invalidSections.length - 10} more invalid sections`,
        );
      }

      // Remove invalid sections
      console.log("🧹 Removing invalid sections...");
      const invalidIds = invalidSections.map((section) => section._id);
      const deleteResult = await sectionsCollection.deleteMany({
        _id: { $in: invalidIds },
      });
      console.log(
        `   ✅ Removed ${deleteResult.deletedCount} invalid sections`,
      );
    }

    // Also clean up any invalid courses
    console.log("🧹 Cleaning up invalid courses...");
    const allCourses = await coursesCollection.find({}).toArray();
    console.log(`   Found ${allCourses.length} total courses`);

    const invalidCourses = allCourses.filter((course) => {
      // Check for empty or invalid course code
      if (!course.courseCode || course.courseCode.trim() === "") {
        return true;
      }

      // Check for empty or invalid title
      if (!course.title || course.title.trim() === "") {
        return true;
      }

      // Check for test data patterns
      if (
        course.courseCode.toLowerCase().includes("test") ||
        course.title.toLowerCase().includes("test")
      ) {
        return true;
      }

      return false;
    });

    if (invalidCourses.length > 0) {
      console.log(
        `   Found ${invalidCourses.length} invalid courses to remove`,
      );
      const invalidCourseIds = invalidCourses.map((course) => course._id);
      const courseDeleteResult = await coursesCollection.deleteMany({
        _id: { $in: invalidCourseIds },
      });
      console.log(
        `   ✅ Removed ${courseDeleteResult.deletedCount} invalid courses`,
      );
    }

    // Show final statistics
    console.log("\n" + "=".repeat(60));
    console.log("📊 CLEANUP RESULTS");
    console.log("=".repeat(60));

    const remainingSections = await sectionsCollection.find({}).toArray();
    const remainingCourses = await coursesCollection.find({}).toArray();

    console.log(`Remaining sections: ${remainingSections.length}`);
    console.log(`Remaining courses: ${remainingCourses.length}`);

    if (remainingSections.length > 0) {
      console.log("\n📋 SAMPLE REMAINING SECTIONS:");
      remainingSections.slice(0, 5).forEach((section, index) => {
        console.log(
          `  ${
            index + 1
          }. ${section.course_code} - ${section.section} | ${section.title}`,
        );
        console.log(`     Professor: ${section.professor}`);
        console.log(`     Semester: ${section.semester || "NOT SET"}`);
        console.log("");
      });
    }

    console.log("=".repeat(60));
    console.log("✅ Cleanup completed successfully");

    // Close database connection
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
