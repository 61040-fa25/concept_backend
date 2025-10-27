import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts";
import { GoogleCalendarConcept } from "./GoogleCalendarConcept.ts";

Deno.test("GoogleCalendar: getAuthorizationUrl generates valid URL", async () => {
  const [db, client] = await testDb();
  const calendar = new GoogleCalendarConcept(db);

  try {
    const result = await calendar.getAuthorizationUrl({
      clientId: "test-client-id",
      redirectUri: "http://localhost:4173/auth/callback",
    });

    assertExists(result.authUrl);
    assertEquals(
      result.authUrl.startsWith("https://accounts.google.com/o/oauth2/v2/auth"),
      true,
    );
    assertEquals(result.authUrl.includes("client_id="), true);
    assertEquals(result.authUrl.includes("scope="), true);
    // URL encoded version of the calendar scope
    assertEquals(result.authUrl.includes("calendar"), true);
  } finally {
    await client.close();
  }
});

Deno.test("GoogleCalendar: convertTo24Hour works correctly", async () => {
  const [db, client] = await testDb();
  const calendar = new GoogleCalendarConcept(db);

  try {
    // Access private method through reflection for testing
    const convert = (calendar as any).convertTo24Hour.bind(calendar);

    // Test with space between time and period
    assertEquals(convert("12:00 PM"), "12:00");
    assertEquals(convert("12:00 AM"), "00:00");
    assertEquals(convert("1:30 PM"), "13:30");
    assertEquals(convert("11:45 AM"), "11:45");

    // Test without space between time and period
    assertEquals(convert("12:00PM"), "12:00");
    assertEquals(convert("12:00AM"), "00:00");
    assertEquals(convert("1:30PM"), "13:30");
    assertEquals(convert("11:45AM"), "11:45");

    // Test edge cases
    assertEquals(convert("12:45 PM"), "12:45");
    assertEquals(convert("3:25 PM"), "15:25");
  } finally {
    await client.close();
  }
});

Deno.test("GoogleCalendar: findFirstOccurrence calculates correct date", async () => {
  const [db, client] = await testDb();
  const calendar = new GoogleCalendarConcept(db);

  try {
    const findFirst = (calendar as any).findFirstOccurrence.bind(calendar);

    // If semester starts on Tuesday (2025-01-21), next Tuesday should be same day (2025-01-21)
    const tuesday = findFirst("2025-01-21", "T");
    assertEquals(tuesday, "2025-01-21");

    // If semester starts on Wednesday (2025-01-22), next Monday should be 2025-01-27
    const monday = findFirst("2025-01-22", "M");
    assertEquals(monday, "2025-01-27");

    // If semester starts on Monday (2025-01-20), next Friday should be 2025-01-24
    const friday = findFirst("2025-01-20", "F");
    assertEquals(friday, "2025-01-24");
  } finally {
    await client.close();
  }
});

Deno.test("GoogleCalendar: getColorForDepartment returns appropriate colors", async () => {
  const [db, client] = await testDb();
  const calendar = new GoogleCalendarConcept(db);

  try {
    const getColor = (calendar as any).getColorForDepartment.bind(calendar);

    assertEquals(getColor("CS 101"), "9"); // Blue
    assertEquals(getColor("MATH 201"), "10"); // Green
    assertEquals(getColor("HIST 114"), "5"); // Yellow
    assertEquals(getColor("UNKNOWN 999"), "1"); // Default
  } finally {
    await client.close();
  }
});
