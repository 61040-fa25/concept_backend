import { GeminiLLM } from "../../../gemini-llm.ts";

// // Tag all courses based on department, prof, distribution, and title keywords
export function autoTagCourses(rawCourses: any[]): Course[] {
  return rawCourses.map((course) => {
    const tags: Tag[] = [];

    // 1. Department from course_code
    const dept = course.course_code.split(" ")[0];
    tags.push({ id: dept, category: "Department" });

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
    if (course.professor) {
      course.professor
        .split(",")
        .map((p: string) => p.trim())
        .filter(Boolean)
        .forEach((prof: string) => {
          tags.push({ id: prof, category: "Professor" });
        });
    }

    // 4. Title keywords (optional)
    const titleWords = course.title
      .split(" ")
      .filter((w: string) => w.length > 4) // ignore short words
      .slice(0, 3); // only first few
    titleWords.forEach((word: string) =>
      tags.push({ id: word.toLowerCase(), category: "Topic" })
    );

    return { ...course, tags };
  });
}

// // Type definitions

export interface Tag {
  id: string; // HIST, Guy Rogers, HS, culture
  category: string; // Department, Professor, Distribution, Topic
}

export interface Course {
  course_code: string;
  section: string;
  title: string;
  professor: string;
  meeting_time: string;
  current_enrollment: number;
  seats_available: number;
  seats_total: number;
  distribution: string;
  tags: Tag[]; // system-assigned tags
}

export class CourseFiltering {
  private courses: Course[] = [];
  private tags: Tag[] = [];
  private activeTags: Tag[] = [];
  private filteredCourses: Course[] = [];
  private suggestedCourses: Course[] = [];

  constructor(courses: Course[]) {
    this.courses = courses;
    this.initializeTags();
    this.filteredCourses = [...courses]; // default is to show show all courses if no tags
  }

  // Derive tags automatically from course data
  private initializeTags() {
    const seen = new Map<string, Tag>();
    for (const c of this.courses) {
      for (const t of c.tags) {
        if (!seen.has(t.id)) {
          seen.set(t.id, t);
          this.tags.push(t);
        }
      }
    }
  }

  // // Actions

  /** AddTag: takes in a Tag object and adds it to active set and updates filtered courses */
  addTag(t: Tag): void {
    if (!this.activeTags.find((tag) => tag.id === t.id)) {
      this.activeTags.push(t);
    }
    this.updateFilteredCourses();
  }

  /** RemoveTag: takes in a Tag object and removes it from active set and updates filtered courses */
  removeTag(t: Tag): void {
    this.activeTags = this.activeTags.filter((tag) => tag.id !== t.id);
    this.updateFilteredCourses();
  }

  /** ClearTags: Clears all filters and resets to show all courses */
  clearTags(): void {
    this.activeTags = [];
    this.filteredCourses = [...this.courses];
  }

  // // The three prompt variants

  private prompts = {
    // 1 Default prompt: simple similarity between courses. No prioritization.
    base: `
You are a course recommendation AI.
Given the following course:

Title: {TITLE}
Course Code: {CODE}
Course meeting time: {MEETING_TIME}

And this list of other courses:
{CANDIDATES}

Suggest up to 3 courses that are most similar in topic or department and with similar meeting times.
Respond in JSON:
[
  { "title": "Course A", "course_code": "CODE123", "meeting_time": "MWF 10-11AM" }
]
`,

    // 2 Time-focused prompt: prioritize similar meeting times
    timeFocused: `
You are an academic recommender.
Given the course:
{TITLE} ({CODE}) ({MEETING_TIME})

And this list of other courses:
{CANDIDATES}

Suggest up to 3 courses that share similar meeting times and similar topics. Prioritize meeting time overlap first, then topic similarity.
Respond in JSON:
[
  { "title": "Course A", "course_code": "CODE123", "meeting_time": "MWF 10-11AM" }
]
And other available courses:
{CANDIDATES}
`,

    // 3 Topic-focused prompt: prioritizes similar topics/keywords
    topicFocused: `

  You are a topic-focused course advisor.
Given:

{TITLE} ({CODE}) ({MEETING_TIME})

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

  // SuggestAlternatives: Uses Gemini AI to suggest courses similar to a given course
  async suggestAlternatives(
    c: Course,
    llm: GeminiLLM,
    variant: keyof typeof this.prompts = "base",
  ): Promise<Course[]> {
    console.log(
      `Requesting alternative courses for "${c.title}" "(${c.course_code})" using prompt variant "${variant}"...`,
    );

    const candidateCourses = this.courses.filter((course) =>
      course.course_code !== c.course_code
    );
    const promptTemplate = this.prompts[variant];

    // --- Build the prompt dynamically ---
    const prompt = promptTemplate
      .replace("{TITLE}", c.title)
      .replace("{CODE}", c.course_code)
      .replace("{MEETING_TIME}", c.meeting_time)
      .replace(
        "{CANDIDATES}",
        candidateCourses.map((course) =>
          `- ${course.title} (${course.course_code}) (${course.meeting_time})`
        ).join("\n"),
      );

    let suggestedCourses: Course[] = [];

    try {
      const responseText = await llm.executeLLM(prompt);

      const cleaned = responseText
        .replace(/```json\s*/g, "")
        .replace(/```/g, "")
        .trim();

      // Extract the first JSON array from the response
      const match = cleaned.match(/\[[\s\S]*?\]/);
      if (!match) throw new Error("No JSON array found in Gemini response.");

      const suggestions = JSON.parse(match[0]);

      // Validator 1 : ensure no duplicate courses in suggestions
      const seen = new Set<string>();
      for (const s of suggestions) {
        const key = `${s.title}_${s.course_code}`;
        if (seen.has(key)) {
          throw new Error(
            `Duplicate course detected in Gemini response: ${s.title} (${s.course_code})`,
          );
        }
        seen.add(key);

        // Validator 2 : ensure it doesn't suggest the same course as the input course
        if (s.course_code === c.course_code) {
          throw new Error(
            `Gemini suggested the same course (${s.course_code}) as an alternative.`,
          );
        }
      }

      suggestedCourses = suggestions
        // Validator 3 : check courses exist in database and only return courses that exist
        .map((s: any) => {
          const found = candidateCourses.find(
            (cand) =>
              cand.title === s.title && cand.course_code === s.course_code,
          );
          if (!found) {
            console.warn(`[NOT IN DATABASE] ${s.title} | ${s.course_code}`);
          }
          return found;
        })
        .filter(Boolean) as Course[];

      this.suggestedCourses = suggestedCourses;
      console.log(
        "Suggested Alternatives:",
        suggestedCourses.map((s) =>
          `${s.title} (${s.course_code}) (${s.meeting_time})`
        ),
      );
    } catch (err) {
      console.error("Gemini error or parse issue:", (err as Error).message);
    }

    return suggestedCourses;
  }

  // // Helper functions

  /** Recalculate filteredCourses based on active tags */
  private updateFilteredCourses(): void {
    if (this.activeTags.length === 0) {
      this.filteredCourses = [...this.courses];
      return;
    }

    this.filteredCourses = this.courses.filter((course) =>
      this.activeTags.every((tag) =>
        course.tags.some((t) => t.id === tag.id && t.category === tag.category)
      )
    );
  }

  // // Getters

  getFilteredCourses(): Course[] {
    return this.filteredCourses;
  }

  getSuggestedCourses(): Course[] {
    return this.suggestedCourses;
  }

  getActiveTags(): Tag[] {
    return this.activeTags;
  }
}
