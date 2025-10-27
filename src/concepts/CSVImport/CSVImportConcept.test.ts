import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts";
import CSVImportConcept from "./CSVImportConcept.ts";

Deno.test("CSVImportConcept - parseCSVLine", async () => {
  const [db, client] = await testDb();
  const csvImport = new CSVImportConcept(db);

  // Test basic CSV parsing
  const line1 =
    "AFR 105,01,Introduction to the Black Experience,Professor Name,T - 12:45 PM - 3:25 PM,16,14,30,HS, SBA";
  const result1 = (csvImport as any).parseCSVLine(line1);
  assertEquals(result1.length, 10);
  assertEquals(result1[0], "AFR 105");
  assertEquals(result1[1], "01");

  // Test CSV with quoted fields
  const line2 =
    '"AFR 105","01","Introduction to the Black Experience","Professor Name","T - 12:45 PM - 3:25 PM","16","14","30","HS, SBA"';
  const result2 = (csvImport as any).parseCSVLine(line2);
  assertEquals(result2.length, 9);
  assertEquals(result2[0], "AFR 105");

  await client.close();
});

Deno.test("CSVImportConcept - parseDays", async () => {
  const [db, client] = await testDb();
  const csvImport = new CSVImportConcept(db);

  // Test day parsing
  const days1 = (csvImport as any).parseDays("T");
  assertEquals(days1.length, 1);
  assertEquals(days1[0], "T");

  const days2 = (csvImport as any).parseDays("MR");
  assertEquals(days2.length, 2);
  assertEquals(days2[0], "M");
  assertEquals(days2[1], "R");

  await client.close();
});

Deno.test("CSVImportConcept - convertTo24Hour", async () => {
  const [db, client] = await testDb();
  const csvImport = new CSVImportConcept(db);

  // Test time conversion
  const time1 = (csvImport as any).convertTo24Hour("12:45 PM");
  assertEquals(time1, "12:45");

  const time2 = (csvImport as any).convertTo24Hour("3:25 PM");
  assertEquals(time2, "15:25");

  const time3 = (csvImport as any).convertTo24Hour("11:20 AM");
  assertEquals(time3, "11:20");

  const time4 = (csvImport as any).convertTo24Hour("12:00 AM");
  assertEquals(time4, "00:00");

  await client.close();
});

Deno.test("CSVImportConcept - parseMeetingTime", async () => {
  const [db, client] = await testDb();
  const csvImport = new CSVImportConcept(db);

  // Test meeting time parsing
  const timeSlots1 = (csvImport as any).parseMeetingTime(
    "T - 12:45 PM - 3:25 PM",
  );
  assertEquals(timeSlots1.length, 1);
  assertEquals(timeSlots1[0].days, ["T"]);
  assertEquals(timeSlots1[0].startTime, "12:45");
  assertEquals(timeSlots1[0].endTime, "15:25");

  const timeSlots2 = (csvImport as any).parseMeetingTime(
    "MR - 11:20 AM - 12:35 PM",
  );
  assertEquals(timeSlots2.length, 1);
  assertEquals(timeSlots2[0].days, ["M", "R"]);
  assertEquals(timeSlots2[0].startTime, "11:20");
  assertEquals(timeSlots2[0].endTime, "12:35");

  await client.close();
});

Deno.test("CSVImportConcept - importSectionsFromCSV with test data", async () => {
  const [db, client] = await testDb();
  const csvImport = new CSVImportConcept(db);

  // Create a test CSV file
  const testCSVContent =
    `course_code,section,title,professor,meeting_time,current_enrollment,seats_available,seats_total,distribution
AFR 105,01,Introduction to the Black Experience,Professor Name,T - 12:45 PM - 3:25 PM,16,14,30,"HS, SBA"
AFR 212,01,Black Women Writers,Another Professor,MR - 11:20 AM - 12:35 PM,22,3,25,"HS, SBA"`;

  const testFilePath = "./test_sections.csv";
  await Deno.writeTextFile(testFilePath, testCSVContent);

  try {
    // Test import
    const result = await csvImport.importSectionsFromCSV(testFilePath);

    assertEquals(result.success, true);
    assertEquals(result.importedCount, 2);
    assertEquals(result.skippedCount, 0);
    assertEquals(result.errorCount, 0);

    // Verify data was imported
    const sections = await csvImport.getAllSections();
    assertEquals(sections.length, 2);

    const section1 = sections.find((s) => s.course_code === "AFR 105");
    assertExists(section1);
    assertEquals(section1.section, "01");
    assertEquals(section1.title, "Introduction to the Black Experience");
    assertEquals(section1.professor, "Professor Name");
  } finally {
    // Cleanup
    await Deno.remove(testFilePath);
    await client.close();
  }
});

Deno.test("CSVImportConcept - duplicate handling", async () => {
  const [db, client] = await testDb();
  const csvImport = new CSVImportConcept(db);

  // Create a test CSV file
  const testCSVContent =
    `course_code,section,title,professor,meeting_time,current_enrollment,seats_available,seats_total,distribution
AFR 105,01,Introduction to the Black Experience,Professor Name,T - 12:45 PM - 3:25 PM,16,14,30,"HS, SBA"`;

  const testFilePath = "./test_sections_duplicate.csv";
  await Deno.writeTextFile(testFilePath, testCSVContent);

  try {
    // First import
    const result1 = await csvImport.importSectionsFromCSV(testFilePath);
    assertEquals(result1.success, true);
    assertEquals(result1.importedCount, 1);

    // Second import (should skip duplicates)
    const result2 = await csvImport.importSectionsFromCSV(testFilePath);
    assertEquals(result2.success, true);
    assertEquals(result2.importedCount, 0);
    assertEquals(result2.skippedCount, 1);

    // Verify only one section exists
    const sections = await csvImport.getAllSections();
    assertEquals(sections.length, 1);
  } finally {
    // Cleanup
    await Deno.remove(testFilePath);
    await client.close();
  }
});

Deno.test("CSVImportConcept - searchSections", async () => {
  const [db, client] = await testDb();
  const csvImport = new CSVImportConcept(db);

  // Create test data
  const testCSVContent =
    `course_code,section,title,professor,meeting_time,current_enrollment,seats_available,seats_total,distribution
AFR 105,01,Introduction to the Black Experience,Professor Name,T - 12:45 PM - 3:25 PM,16,14,30,"HS, SBA"
AFR 212,01,Black Women Writers,Another Professor,MR - 11:20 AM - 12:35 PM,22,3,25,"HS, SBA"
CS 101,01,Introduction to Computer Science,CS Professor,MWF - 10:00 AM - 10:50 AM,30,0,30,"SBA"`;

  const testFilePath = "./test_sections_search.csv";
  await Deno.writeTextFile(testFilePath, testCSVContent);

  try {
    // Import data
    await csvImport.importSectionsFromCSV(testFilePath);

    // Test search by course code
    const afrSections = await csvImport.searchSections({ courseCode: "AFR" });
    assertEquals(afrSections.length, 2);

    // Test search by professor
    const profSections = await csvImport.searchSections({
      professor: "Professor Name",
    });
    assertEquals(profSections.length, 1);

    // Test search by distribution
    const sbaSections = await csvImport.searchSections({ distribution: "SBA" });
    assertEquals(sbaSections.length, 3);
  } finally {
    // Cleanup
    await Deno.remove(testFilePath);
    await client.close();
  }
});

Deno.test("CSVImportConcept - clearAllSections", async () => {
  const [db, client] = await testDb();
  const csvImport = new CSVImportConcept(db);

  // Create test data
  const testCSVContent =
    `course_code,section,title,professor,meeting_time,current_enrollment,seats_available,seats_total,distribution
AFR 105,01,Introduction to the Black Experience,Professor Name,T - 12:45 PM - 3:25 PM,16,14,30,"HS, SBA"`;

  const testFilePath = "./test_sections_clear.csv";
  await Deno.writeTextFile(testFilePath, testCSVContent);

  try {
    // Import data
    await csvImport.importSectionsFromCSV(testFilePath);
    let sections = await csvImport.getAllSections();
    assertEquals(sections.length, 1);

    // Clear sections
    const clearResult = await csvImport.clearAllSections();
    assertEquals(clearResult.success, true);

    // Verify sections are cleared
    sections = await csvImport.getAllSections();
    assertEquals(sections.length, 0);
  } finally {
    // Cleanup
    await Deno.remove(testFilePath);
    await client.close();
  }
});
