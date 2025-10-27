import { Db } from "npm:mongodb";
import { GeminiLLM } from "../../../gemini-llm.ts";

// Tag interface
export interface Tag {
  id: string; // e.g., "HIST", "Guy Rogers", "HS", "culture"
  category: string; // e.g., "Department", "Professor", "Distribution", "Topic"
}

// Course interface (for filtering)
export interface FilteredCourse {
  course_code: string;
  section: string;
  title: string;
  professor: string;
  meeting_time: string;
  current_enrollment: number;
  seats_available: number;
  seats_total: number;
  distribution: string;
  tags: Tag[];
}

/**
 * CourseFilteringConcept
 *
 * Manages course filtering and AI-powered course recommendations.
 * Integrates with MongoDB to pull section data and provides tag-based filtering.
 */
export default class CourseFilteringConcept {
  private db: Db;
  private sectionsCollection = "sections";
  private geminiLLM: GeminiLLM | null = null;

  constructor(db: Db) {
    this.db = db;
  }

  /**
   * Lazy-initialize Gemini LLM (only when needed for AI features)
   */
  private getGeminiLLM(): GeminiLLM {
    if (!this.geminiLLM) {
      const apiKey = Deno.env.get("GEMINI_API_KEY") || "";
      this.geminiLLM = new GeminiLLM({ apiKey });
    }
    return this.geminiLLM;
  }

  /**
   * Auto-tag courses based on department, professor, distribution, and title keywords
   */
  private autoTagCourses(rawCourses: any[]): FilteredCourse[] {
    return rawCourses.map((course) => {
      const tags: Tag[] = [];

      // 1. Department from course_code or courseId
      const courseCode = course.course_code || course.courseId || "";
      const dept = courseCode.split(" ")[0];
      if (dept) {
        tags.push({ id: dept, category: "Department" });
      }

      // 2. Distribution categories (split by commas)
      if (course.distribution) {
        course.distribution
          .split(",")
          .map((d: string) => d.trim())
          .filter(Boolean)
          .forEach((dist: string) => {
            tags.push({ id: dist, category: "Distribution" });
          });
      }

      // 3. Professor name(s)
      const professor = course.professor || course.instructor || "";
      if (professor) {
        professor
          .split(",")
          .map((p: string) => p.trim())
          .filter(Boolean)
          .forEach((prof: string) => {
            tags.push({ id: prof, category: "Professor" });
          });
      }

      // 4. Title keywords (optional)
      if (course.title) {
        const titleWords = course.title
          .split(" ")
          .filter((w: string) => w.length > 4) // ignore short words
          .slice(0, 3); // only first few
        titleWords.forEach((word: string) =>
          tags.push({ id: word.toLowerCase(), category: "Topic" })
        );
      }

      // Construct meeting_time from timeSlots if needed
      let meeting_time = course.meeting_time || "";
      if (!meeting_time && course.timeSlots && course.timeSlots.length > 0) {
        const slot = course.timeSlots[0];
        meeting_time = `${
          slot.days.join("")
        } - ${slot.startTime} - ${slot.endTime}`;
      }

      return {
        course_code: courseCode,
        section: course.section || course.sectionNumber || "",
        title: course.title || "",
        professor: professor,
        meeting_time: meeting_time,
        current_enrollment: course.current_enrollment ||
          course.currentEnrollment || 0,
        seats_available: course.seats_available || course.seatsAvailable || 0,
        seats_total: course.seats_total || course.capacity || 0,
        distribution: course.distribution || "",
        tags,
      };
    });
  }

  /**
   * Get all sections from MongoDB and auto-tag them
   */
  private async getAllTaggedCourses(): Promise<FilteredCourse[]> {
    const sections = await this.db.collection(this.sectionsCollection)
      .find({})
      .toArray();

    return this.autoTagCourses(sections);
  }

  /**
   * Get filtered courses based on active tags
   * If no tags provided, returns all courses
   */
  async getFilteredCourses(
    body: { activeTags?: Tag[] },
  ): Promise<FilteredCourse[]> {
    const { activeTags = [] } = body;

    const allCourses = await this.getAllTaggedCourses();

    if (activeTags.length === 0) {
      return allCourses;
    }

    // Filter courses that match ALL active tags
    const filteredCourses = allCourses.filter((course) =>
      activeTags.every((tag) =>
        course.tags.some((t) => t.id === tag.id && t.category === tag.category)
      )
    );

    return filteredCourses;
  }

  /**
   * Get all available tags from courses
   */
  async getActiveTags(): Promise<Tag[]> {
    const allCourses = await this.getAllTaggedCourses();
    const seen = new Map<string, Tag>();

    for (const course of allCourses) {
      for (const tag of course.tags) {
        const key = `${tag.category}:${tag.id}`;
        if (!seen.has(key)) {
          seen.set(key, tag);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Get tags grouped by category
   */
  async getTagsByCategory(): Promise<{
    [category: string]: Tag[];
  }> {
    const tags = await this.getActiveTags();
    const grouped: { [category: string]: Tag[] } = {};

    for (const tag of tags) {
      if (!grouped[tag.category]) {
        grouped[tag.category] = [];
      }
      grouped[tag.category].push(tag);
    }

    return grouped;
  }

  /**
   * AI-powered course recommendations
   * Suggests alternative courses similar to a given course
   */
  async suggestAlternatives(body: {
    course: FilteredCourse;
    variant?: "base" | "timeFocused" | "topicFocused";
  }): Promise<FilteredCourse[]> {
    const { course, variant = "base" } = body;

    if (!course) {
      return [];
    }

    const allCourses = await this.getAllTaggedCourses();

    // Get candidate courses (exclude the requested course)
    const candidateCourses = allCourses.filter((c) =>
      c.course_code !== course.course_code
    );

    const suggestions = await this.generateSuggestions(
      course,
      candidateCourses,
      variant,
    );

    return suggestions;
  }

  /**
   * Generate AI suggestions using Gemini
   */
  private async generateSuggestions(
    course: FilteredCourse,
    candidates: FilteredCourse[],
    variant: "base" | "timeFocused" | "topicFocused",
  ): Promise<FilteredCourse[]> {
    const prompts = {
      base: `
You are a course recommendation AI.
Given the following course:

Title: {TITLE}
Course Code: {CODE}
Meeting Time: {MEETING_TIME}

And this list of other courses:
{CANDIDATES}

Suggest up to 3 courses that are most similar in topic or department and with similar meeting times.
Respond in JSON:
[
  { "title": "Course A", "course_code": "CODE123" }
]
`,

      timeFocused: `
You are an academic recommender.
Given the course:
{TITLE} ({CODE}) - {MEETING_TIME}

And this list of other courses:
{CANDIDATES}

Suggest up to 3 courses that share similar meeting times and similar topics. Prioritize meeting time overlap first, then topic similarity.
Respond in JSON:
[
  { "title": "Course A", "course_code": "CODE123" }
]
`,

      topicFocused: `
You are a topic-focused course advisor.
Given:
{TITLE} ({CODE}) - {MEETING_TIME}

And other available courses:
{CANDIDATES}

Recommend 3 courses that share topic-related keywords or themes (e.g., culture, history, gender).
Prefer topic overlap over department or meeting time.
Return JSON array:
[
  { "title": "Course A", "course_code": "CODE123" }
]
`,
    };

    const promptTemplate = prompts[variant];

    // Build the prompt
    const prompt = promptTemplate
      .replace("{TITLE}", course.title)
      .replace("{CODE}", course.course_code)
      .replace("{MEETING_TIME}", course.meeting_time)
      .replace(
        "{CANDIDATES}",
        candidates.slice(0, 100).map((c) =>
          `- ${c.title} (${c.course_code}) - ${c.meeting_time}`
        ).join("\n"),
      );

    try {
      console.log(
        `Requesting alternative courses for "${course.title}" (${course.course_code}) using variant "${variant}"...`,
      );

      const gemini = this.getGeminiLLM();
      const responseText = await gemini.executeLLM(prompt);

      const cleaned = responseText
        .replace(/```json\s*/g, "")
        .replace(/```/g, "")
        .trim();

      // Extract JSON array
      const match = cleaned.match(/\[[\s\S]*?\]/);
      if (!match) {
        console.warn("No JSON array found in Gemini response");
        return [];
      }

      const suggestions = JSON.parse(match[0]);

      // Validate and map to actual courses
      const seen = new Set<string>();
      const validSuggestions: FilteredCourse[] = [];

      for (const s of suggestions) {
        const key = s.course_code;

        // Skip duplicates
        if (seen.has(key)) continue;

        // Skip if it's the same course
        if (s.course_code === course.course_code) continue;

        seen.add(key);

        // Find the actual course by course_code (more flexible matching)
        const found = candidates.find(
          (c) => c.course_code === s.course_code,
        );

        if (found) {
          validSuggestions.push(found);
        } else {
          console.warn(
            `[NOT IN DATABASE] ${s.title} | ${s.course_code}`,
          );
        }
      }

      console.log(
        `Found ${validSuggestions.length} valid suggestions`,
      );

      return validSuggestions;
    } catch (error) {
      console.error("Error generating suggestions:", error);
      return [];
    }
  }

  /**
   * Search courses by text query
   */
  async searchCourses(body: { query: string }): Promise<FilteredCourse[]> {
    const { query } = body;
    const allCourses = await this.getAllTaggedCourses();

    if (!query || query.trim() === "") {
      return allCourses;
    }

    const lowerQuery = query.toLowerCase();

    const filtered = allCourses.filter((course) => {
      return (
        course.title.toLowerCase().includes(lowerQuery) ||
        course.course_code.toLowerCase().includes(lowerQuery) ||
        course.professor.toLowerCase().includes(lowerQuery) ||
        course.distribution.toLowerCase().includes(lowerQuery)
      );
    });

    return filtered;
  }
}
