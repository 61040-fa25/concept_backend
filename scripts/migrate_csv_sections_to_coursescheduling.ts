#!/usr/bin/env -S deno run --allow-read --allow-env --allow-net --allow-write --allow-sys

/**
 * Script to migrate CSV-imported sections to CourseScheduling format
 *
 * This script converts sections from the CSVImport format to the CourseScheduling format
 * so they can be used with the schedule builder frontend.
 *
 * CSVImport format:
 * - course_code, section, professor, meeting_time (string), current_enrollment, etc.
 *
 * CourseScheduling format:
 * - courseId, sectionNumber, instructor, capacity, timeSlots (array of TimeSlot objects)
 *
 * Usage:
 *   deno run --allow-read --allow-env --allow-net --allow-write --allow-sys scripts/migrate_csv_sections_to_coursescheduling.ts
 */

import "jsr:@std/dotenv/load";
import { getDb } from "../src/utils/database.ts";
import { freshID } from "../src/utils/database.ts";

interface DayTimeRange {
  days: string[];
  startTime: string;
  endTime: string;
}

function parseMeetingTime(meetingTime: string): DayTimeRange | null {
  if (!meetingTime || meetingTime === "null" || meetingTime.trim() === "") {
    return null;
  }

  try {
    // Format: "MR - 8:30 AM - 9:45 AM" or "T - 12:45 PM - 3:25 PM"
    const parts = meetingTime.split(" - ");
    if (parts.length !== 3) {
      return null;
    }

    const daysStr = parts[0].trim();
    const startTimeStr = parts[1].trim();
    const endTimeStr = parts[2].trim();

    // Parse days (e.g., "MR" -> ["M", "R"], "MWF" -> ["M", "W", "F"])
    const days = daysStr.split("").filter((d) =>
      ["M", "T", "W", "R", "F"].includes(d)
    );

    // Convert 12-hour time to 24-hour format
    const convertTo24Hour = (time12h: string): string => {
      const [time, period] = time12h.split(" ");
      let [hours, minutes] = time.split(":").map(Number);

      if (period === "PM" && hours !== 12) {
        hours += 12;
      } else if (period === "AM" && hours === 12) {
        hours = 0;
      }

      return `${hours.toString().padStart(2, "0")}:${
        minutes.toString().padStart(2, "0")
      }`;
    };

    const startTime = convertTo24Hour(startTimeStr);
    const endTime = convertTo24Hour(endTimeStr);

    return { days, startTime, endTime };
  } catch (error) {
    console.error(`Error parsing meeting time "${meetingTime}":`, error);
    return null;
  }
}

async function main() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    const [db, client] = await getDb();
    console.log("✅ Connected to MongoDB");

    const sectionsCollection = db.collection("sections");
    const coursesCollection = db.collection("courses");

    // Get all CSV-formatted sections
    console.log("📊 Finding CSV-formatted sections...");
    const csvSections = await sectionsCollection.find({
      course_code: { $exists: true },
    }).toArray();

    console.log(`   Found ${csvSections.length} CSV-formatted sections`);

    if (csvSections.length === 0) {
      console.log("✅ No sections to migrate");
      await client.close();
      return;
    }

    // First, create courses from unique course codes
    console.log("📚 Creating courses...");
    const uniqueCourses = new Map<string, { code: string; title: string }>();
    csvSections.forEach((section) => {
      if (!uniqueCourses.has(section.course_code)) {
        uniqueCourses.set(section.course_code, {
          code: section.course_code,
          title: section.title,
        });
      }
    });

    let coursesCreated = 0;
    for (const [courseCode, courseData] of uniqueCourses) {
      const department = courseCode.split(" ")[0]; // e.g., "CS" from "CS 101"

      const existingCourse = await coursesCollection.findOne({
        id: courseCode,
      });
      if (!existingCourse) {
        await coursesCollection.insertOne({
          id: courseCode,
          title: courseData.title,
          department: department,
        });
        coursesCreated++;
      }
    }
    console.log(`   Created ${coursesCreated} courses`);

    // Now migrate sections
    console.log("🔄 Migrating sections to CourseScheduling format...");
    let sectionsConverted = 0;
    let sectionsFailed = 0;

    for (const csvSection of csvSections) {
      try {
        const timeSlotData = parseMeetingTime(csvSection.meeting_time);

        const newSection: any = {
          id: freshID(),
          courseId: csvSection.course_code,
          sectionNumber: csvSection.section,
          instructor: csvSection.professor,
          capacity: csvSection.seats_total || 30,
          timeSlots: timeSlotData
            ? [
              {
                days: timeSlotData.days,
                startTime: timeSlotData.startTime,
                endTime: timeSlotData.endTime,
                location: "TBA", // Location not in CSV data
              },
            ]
            : [],
          semester: csvSection.semester || "Fall 2025",
          distribution: csvSection.distribution,
          currentEnrollment: csvSection.current_enrollment,
          seatsAvailable: csvSection.seats_available,
        };

        // Insert the new section
        await sectionsCollection.insertOne(newSection);
        sectionsConverted++;
      } catch (error) {
        console.error(
          `Error converting section ${csvSection.course_code} ${csvSection.section}:`,
          error,
        );
        sectionsFailed++;
      }
    }

    // Delete old CSV-formatted sections
    console.log("🧹 Removing old CSV-formatted sections...");
    const deleteResult = await sectionsCollection.deleteMany({
      course_code: { $exists: true },
      courseId: { $exists: false }, // Only delete sections that don't have courseId
    });
    console.log(`   Removed ${deleteResult.deletedCount} old sections`);

    // Show results
    console.log("\n" + "=".repeat(60));
    console.log("📊 MIGRATION RESULTS");
    console.log("=".repeat(60));
    console.log(`Courses created: ${coursesCreated}`);
    console.log(`Sections converted: ${sectionsConverted}`);
    console.log(`Sections failed: ${sectionsFailed}`);
    console.log(`Old sections removed: ${deleteResult.deletedCount}`);

    // Show sample migrated sections
    console.log("\n📋 SAMPLE MIGRATED SECTIONS:");
    const sampleSections = await sectionsCollection.find({
      courseId: { $exists: true },
    }).limit(5).toArray();

    sampleSections.forEach((section, index) => {
      console.log(
        `  ${
          index + 1
        }. ${section.courseId} - Section ${section.sectionNumber}`,
      );
      console.log(`     Instructor: ${section.instructor}`);
      console.log(`     Capacity: ${section.capacity}`);
      console.log(`     Time Slots: ${section.timeSlots.length}`);
      if (section.timeSlots.length > 0) {
        const slot = section.timeSlots[0];
        console.log(
          `       ${slot.days.join("")} ${slot.startTime} - ${slot.endTime}`,
        );
      }
      console.log("");
    });

    console.log("=".repeat(60));
    console.log("✅ Migration completed successfully");

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
