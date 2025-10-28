import { Db } from "npm:mongodb";

/**
 * Google Calendar Integration Concept
 *
 * This concept handles exporting course schedules to Google Calendar.
 * It creates a new calendar for the user and adds all course sections as recurring events.
 *
 * Features:
 * - OAuth2 authentication with Google
 * - Create dedicated calendars for each semester
 * - Export courses as recurring events with proper timezone handling
 * - Color-code events by department
 * - Handle both structured TimeSlot data and meeting_time strings
 *
 * Prerequisites:
 * - Google Cloud Project with Calendar API enabled
 * - OAuth 2.0 credentials (Client ID and Client Secret)
 * - Redirect URI configured in Google Cloud Console
 *
 * Environment Variables Required:
 * - GOOGLE_CLIENT_ID: OAuth 2.0 Client ID
 * - GOOGLE_CLIENT_SECRET: OAuth 2.0 Client Secret
 * - GOOGLE_REDIRECT_URI: Redirect URI for OAuth flow
 */

interface CalendarEvent {
  summary: string;
  description: string;
  location: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  recurrence: string[];
  colorId: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

export default class GoogleCalendarConcept {
  private db: Db;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(db: Db) {
    this.db = db;
    this.clientId = Deno.env.get("GOOGLE_CLIENT_ID") || "";
    this.clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
    this.redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI") ||
      "http://localhost:5173/auth/google/callback";

    if (!this.clientId || !this.clientSecret) {
      console.warn(
        "⚠️  Google Calendar integration not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.",
      );
    }
  }

  /**
   * Get the authorization URL for Google OAuth2
   */
  async getAuthorizationUrl(body: {
    state?: string;
  }): Promise<{ authUrl: string }> {
    const scope = encodeURIComponent(
      "https://www.googleapis.com/auth/calendar",
    );
    const state = body.state || "default_state";

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.clientId}&redirect_uri=${
        encodeURIComponent(this.redirectUri)
      }&response_type=code&scope=${scope}&access_type=offline&state=${state}&prompt=consent`;

    return { authUrl };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(body: {
    code: string;
  }): Promise<GoogleTokenResponse> {
    const tokenEndpoint = "https://oauth2.googleapis.com/token";

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: body.code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    return await response.json();
  }

  /**
   * Main method to export a schedule to Google Calendar
   */
  async exportScheduleToCalendar(body: {
    accessToken: string;
    scheduleId: string;
    calendarName: string;
    semesterStart: string; // YYYY-MM-DD
    semesterEnd: string; // YYYY-MM-DD
    timeZone?: string;
  }): Promise<{ calendarId: string; eventCount: number }> {
    const timeZone = body.timeZone || "America/New_York";

    // Get schedule and its sections
    const schedules = this.db.collection("schedules");
    const schedule = await schedules.findOne({ id: body.scheduleId });

    if (!schedule) {
      throw new Error("Schedule not found");
    }

    // Create a new calendar
    const calendarId = await this.createCalendar(
      body.accessToken,
      body.calendarName,
    );

    // Get all sections in the schedule
    const sections = this.db.collection("sections");
    const scheduleSections = await sections.find({
      id: { $in: schedule.sectionIds },
    }).toArray();

    // Convert sections to calendar events
    let eventCount = 0;
    for (const section of scheduleSections) {
      const events = this.convertSectionToEvents(
        section,
        timeZone,
        body.semesterStart,
        body.semesterEnd,
      );

      for (const event of events) {
        await this.createCalendarEvent(
          body.accessToken,
          calendarId,
          event,
        );
        eventCount++;
      }
    }

    return { calendarId, eventCount };
  }

  /**
   * Create a new Google Calendar
   */
  async createCalendar(
    accessToken: string,
    calendarName: string,
  ): Promise<string> {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: calendarName,
          timeZone: "America/New_York",
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create calendar: ${error}`);
    }

    const calendar = await response.json();
    return calendar.id;
  }

  /**
   * Convert a section to calendar events
   */
  private convertSectionToEvents(
    section: any,
    timeZone: string,
    semesterStart: string,
    semesterEnd: string,
  ): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    // Handle sections with structured timeSlots (from CourseScheduling concept)
    if (section.timeSlots && Array.isArray(section.timeSlots)) {
      for (const timeSlot of section.timeSlots) {
        const event = this.createEventFromTimeSlot(
          section,
          timeSlot,
          timeZone,
          semesterStart,
          semesterEnd,
        );
        if (event) events.push(event);
      }
    } // Handle sections with meeting_time string (from CSV import)
    else if (section.meeting_time) {
      const event = this.createEventFromMeetingTime(
        section,
        timeZone,
        semesterStart,
        semesterEnd,
      );
      if (event) events.push(event);
    }

    return events;
  }

  /**
   * Create a calendar event from a TimeSlot object
   */
  private createEventFromTimeSlot(
    section: any,
    timeSlot: any,
    timeZone: string,
    semesterStart: string,
    semesterEnd: string,
  ): CalendarEvent | null {
    if (!timeSlot.days || timeSlot.days.length === 0) return null;

    const courseCode = section.course_code || section.courseId || "";
    const title = section.title || "";
    const instructor = section.instructor || section.professor || "";
    const sectionNum = section.section || section.sectionNumber || "";

    // Convert days to RRULE BYDAY format
    const dayMap: Record<string, string> = {
      M: "MO",
      T: "TU",
      W: "WE",
      R: "TH",
      F: "FR",
    };

    const byDay = timeSlot.days
      .map((d: string) => dayMap[d] || d)
      .join(",");

    // Find the first occurrence date
    const firstDate = this.findFirstOccurrence(
      semesterStart,
      timeSlot.days[0],
    );

    return {
      summary: `${courseCode}${sectionNum ? ` (${sectionNum})` : ""}${
        title ? ` - ${title}` : ""
      }`,
      description: [
        `Course: ${courseCode}`,
        sectionNum ? `Section: ${sectionNum}` : "",
        title ? `Title: ${title}` : "",
        instructor ? `Instructor: ${instructor}` : "",
        timeSlot.location ? `Location: ${timeSlot.location}` : "",
      ].filter(Boolean).join("\n"),
      location: timeSlot.location || "TBD",
      start: {
        dateTime: `${firstDate}T${timeSlot.startTime}:00`,
        timeZone,
      },
      end: {
        dateTime: `${firstDate}T${timeSlot.endTime}:00`,
        timeZone,
      },
      recurrence: [
        `RRULE:FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${
          semesterEnd.replace(
            /-/g,
            "",
          )
        }T235959Z`,
      ],
      colorId: this.getColorForDepartment(courseCode),
    };
  }

  /**
   * Create a calendar event from a meeting_time string
   */
  private createEventFromMeetingTime(
    section: any,
    timeZone: string,
    semesterStart: string,
    semesterEnd: string,
  ): CalendarEvent | null {
    const meetingTime = section.meeting_time;
    if (!meetingTime) return null;

    // Parse meeting time: "MR - 11:20 AM - 12:35 PM"
    const timePattern =
      /([A-Z]+)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i;
    const match = meetingTime.match(timePattern);

    if (!match) return null;

    const daysStr = match[1];
    const startTime = this.convertTo24Hour(match[2]);
    const endTime = this.convertTo24Hour(match[3]);

    // Validate time conversion
    if (startTime === "00:00" && endTime === "00:00") {
      console.error(`Failed to parse meeting times: ${meetingTime}`);
      return null;
    }

    // Convert days to RRULE format
    const dayMap: Record<string, string> = {
      M: "MO",
      T: "TU",
      W: "WE",
      R: "TH",
      F: "FR",
    };

    const byDay = daysStr
      .split("")
      .map((d: string) => dayMap[d])
      .filter(Boolean)
      .join(",");

    if (!byDay) return null;

    const firstDate = this.findFirstOccurrence(semesterStart, daysStr[0]);

    const courseCode = section.course_code || "";
    const title = section.title || "";
    const instructor = section.professor || section.instructor || "";
    const sectionNum = section.section || "";

    return {
      summary: `${courseCode}${sectionNum ? ` (${sectionNum})` : ""}${
        title ? ` - ${title}` : ""
      }`,
      description: [
        `Course: ${courseCode}`,
        sectionNum ? `Section: ${sectionNum}` : "",
        title ? `Title: ${title}` : "",
        instructor ? `Instructor: ${instructor}` : "",
        section.distribution ? `Distribution: ${section.distribution}` : "",
      ].filter(Boolean).join("\n"),
      location: "TBD",
      start: {
        dateTime: `${firstDate}T${startTime}:00`,
        timeZone,
      },
      end: {
        dateTime: `${firstDate}T${endTime}:00`,
        timeZone,
      },
      recurrence: [
        `RRULE:FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${
          semesterEnd.replace(
            /-/g,
            "",
          )
        }T235959Z`,
      ],
      colorId: this.getColorForDepartment(courseCode),
    };
  }

  /**
   * Convert 12-hour time to 24-hour format
   */
  private convertTo24Hour(time12: string): string {
    // Handle both "12:45 PM" and "12:45PM" formats
    const trimmed = time12.trim();

    // Extract time and period using regex to handle with/without space
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

    if (!match) {
      console.error(`Invalid time format: ${time12}`);
      return "00:00"; // Return default time if parsing fails
    }

    const hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    let hour24 = hours;

    if (period === "PM" && hour24 !== 12) {
      hour24 += 12;
    } else if (period === "AM" && hour24 === 12) {
      hour24 = 0;
    }

    return `${hour24.toString().padStart(2, "0")}:${minutes}`;
  }

  /**
   * Find the first occurrence of a day in the semester
   */
  private findFirstOccurrence(
    semesterStart: string,
    dayLetter: string,
  ): string {
    const dayMap: Record<string, number> = {
      M: 1, // Monday
      T: 2, // Tuesday
      W: 3, // Wednesday
      R: 4, // Thursday
      F: 5, // Friday
    };

    const targetDay = dayMap[dayLetter];
    if (!targetDay) return semesterStart;

    // Parse as local date to avoid timezone issues
    const [year, month, day] = semesterStart.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const currentDay = date.getDay() || 7; // Convert Sunday (0) to 7

    // Calculate days to add to reach the target day
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd < 0) daysToAdd += 7;

    date.setDate(date.getDate() + daysToAdd);

    // Format as YYYY-MM-DD
    const resultYear = date.getFullYear();
    const resultMonth = String(date.getMonth() + 1).padStart(2, "0");
    const resultDay = String(date.getDate()).padStart(2, "0");
    return `${resultYear}-${resultMonth}-${resultDay}`;
  }

  /**
   * Get a color ID for a department (Google Calendar colors 1-11)
   */
  private getColorForDepartment(courseCode: string): string {
    // Extract department prefix (e.g., "CS" from "CS 101")
    const dept = courseCode.split(/[\s-]/)[0] || "";

    // Hash the department name to a number between 1 and 11
    let hash = 0;
    for (let i = 0; i < dept.length; i++) {
      hash = dept.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colorId = (Math.abs(hash) % 11) + 1;
    return colorId.toString();
  }

  /**
   * Create a calendar event
   */
  private async createCalendarEvent(
    accessToken: string,
    calendarId: string,
    event: CalendarEvent,
  ): Promise<void> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to create event: ${error}`);
      throw new Error(`Failed to create event: ${error}`);
    }
  }
}
