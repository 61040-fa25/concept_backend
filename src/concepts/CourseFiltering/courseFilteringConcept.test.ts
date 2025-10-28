import coursesData from "./courses_archive.json" with { type: "json" };
import {
  autoTagCourses,
  Course,
  CourseFiltering,
  Tag,
} from "./CourseFilteringConcept.ts";
import { GeminiLLM } from "../../../gemini-llm.ts"; // Needed for AI suggestion test

// -----------------------------
// Setup
// -----------------------------

// Ensure JSON is typed as Course[]
const rawCourses: Course[] = coursesData as Course[];

// Auto-tag courses
const taggedCourses: Course[] = autoTagCourses(rawCourses);
console.log("Sample tagged course:", taggedCourses[0]);

// Initialize CourseFiltering
const courseFilter = new CourseFiltering(taggedCourses);
console.log("Filtered courses:", courseFilter.getFilteredCourses());

// Total number of courses
console.log("Total courses loaded:", taggedCourses.length);

async function testManualFilters() {
  // // -----------------------------
  // // Test 1: Filter by Department tag
  // // -----------------------------
  const historyTag: Tag = { id: "HIST", category: "Department" };
  courseFilter.addTag(historyTag);
  console.log("======================================");
  console.log(
    "Active tags after adding HIST department tag:",
    courseFilter.getActiveTags(),
  );
  console.log("======================================");
  console.log("Filtered courses:", courseFilter.getFilteredCourses());
  console.log("\n");

  // // Remove tag
  courseFilter.removeTag(historyTag);
  console.log("======================================");
  console.log(
    "Active tags after removing HIST department tag:",
    courseFilter.getActiveTags(),
  );
  console.log("======================================");
  console.log("\n");

  // // -----------------------------
  // // Test 2: Filter by multiple tags
  // // -----------------------------
  const profTag: Tag = { id: "Guy Rogers", category: "Professor" };
  courseFilter.addTag(historyTag);
  courseFilter.addTag(profTag);
  console.log("======================================");
  console.log(
    "Active tags after adding HIST and Professor Guy Rogers tags:",
    courseFilter.getActiveTags(),
  );
  console.log("======================================");
  console.log("Filtered courses:", courseFilter.getFilteredCourses());
  console.log("\n");

  // // Clear tags
  courseFilter.clearTags();
  console.log("======================================");
  console.log(
    "Active tags after clearing all tags:",
    courseFilter.getActiveTags(),
  );
  console.log("======================================");
  console.log("\n");
}

// -----------------------------
// Test 3: AI suggestions
// -----------------------------

// Load environment variables using Deno's built-in env support
const config = {
  apiKey: Deno.env.get("GEMINI_API_KEY") || "",
};

async function testAISuggestions() {
  // Initialize Ai
  const llm = new GeminiLLM({ apiKey: config.apiKey });

  // Chose a course for testing from courses_archive.json
  const courseToSuggest = taggedCourses[226];

  // Define the prompt variants to try
  const variants: ("base" | "timeFocused" | "topicFocused")[] = [
    "base",
    "timeFocused",
    "topicFocused",
  ];

  // Run the same course through each prompt variant
  for (const variant of variants) {
    console.log("======================================");
    console.log(`Prompt Variant: ${variant.toUpperCase()}`);
    console.log("======================================");

    try {
      const suggestions = await courseFilter.suggestAlternatives(
        courseToSuggest,
        llm,
        variant,
      );

      if (suggestions.length === 0) {
        console.log("No suggestions returned.\n");
      }
    } catch (err) {
      console.error(`Error for ${variant} variant:`, (err as Error).message);
    }

    console.log("\n");
  }
}

// // Run both tests
async function main(): Promise<void> {
  await testManualFilters();
  await testAISuggestions();
}

// Run the main function if this file is executed directly
if (import.meta.main) {
  main();
}
