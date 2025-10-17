[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: PlaylistHealth

# response:


# response:

# file: src/PlaylistHealth/PlaylistHealthConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "../utils/database.ts";
import { ID } from "../utils/types.ts";
import PlaylistHealthConcept from "./PlaylistHealthConcept.ts";

// Mock data
const userA = "user:A" as ID;
const playlist1 = "playlist:1" as ID;
const sampleTrackIds = ["track:A", "track:B", "track:C", "track:D"] as ID[];

Deno.test("PlaylistHealthConcept", async (t) => {
  const [db, client] = await testDb();
  const playlistHealth = new PlaylistHealthConcept(db);

  await t.step("snapshot action", async (t) => {
    await t.step("should create a snapshot for a valid playlist", async () => {
      const result = await playlistHealth.snapshot({ playlistId: playlist1, userId: userA, trackIds: sampleTrackIds });
      assertNotEquals(result, undefined);
      if ("error" in result) {
        throw new Error(result.error);
      }
      assertEquals("snapshotId" in result, true);
      assertExists(result.snapshotId);

      // Verify state
      const snapshotInDb = await db.collection("PlaylistHealth.snapshots").findOne({ _id: result.snapshotId });
      assertExists(snapshotInDb);
      assertEquals(snapshotInDb.playlistId, playlist1);
      assertEquals(snapshotInDb.userId, userA);
      assertEquals(snapshotInDb.trackIds, sampleTrackIds);
    });

    await t.step("should fail if required parameters are missing or empty", async () => {
      const result = await playlistHealth.snapshot({ playlistId: playlist1, userId: userA, trackIds: [] });
      assertExists(result);
      assertEquals("error" in result, true);
      if ("error" in result) {
        assertEquals(result.error, "Invalid input: playlistId, userId, and a non-empty trackIds array are required.");
      }
    });
  });

  await t.step("analyze action", async (t) => {
    // Setup: create a snapshot first
    const snapshotResult = await playlistHealth.snapshot({ playlistId: playlist1, userId: userA, trackIds: sampleTrackIds });
    const snapshotId = "snapshotId" in snapshotResult ? snapshotResult.snapshotId : ("" as ID);

    await t.step("should generate a report for an existing snapshot", async () => {
      const result = await playlistHealth.analyze({ playlistId: playlist1, snapshotId: snapshotId });
      if ("error" in result) {
        throw new Error(result.error);
      }
      assertEquals("reportId" in result, true);
      assertExists(result.reportId);

      // Verify state
      const reportInDb = await db.collection("PlaylistHealth.reports").findOne({ _id: result.reportId });
      assertExists(reportInDb);
      assertEquals(reportInDb.playlistId, playlist1);
      assertEquals(reportInDb.snapshotId, snapshotId);
      assertExists(reportInDb.findings);
    });

    await t.step("should fail if the snapshot does not exist", async () => {
      const fakeSnapshotId = "snapshot:fake" as ID;
      const result = await playlistHealth.analyze({ playlistId: playlist1, snapshotId: fakeSnapshotId });
      assertEquals("error" in result, true);
      if ("error" in result) {
        assertEquals(result.error, `Snapshot with id ${fakeSnapshotId} for playlist ${playlist1} not found.`);
      }
    });
  });

  await t.step("getReport action", async (t) => {
    // Setup: create snapshot and report
    const snapshotResult = await playlistHealth.snapshot({ playlistId: playlist1, userId: userA, trackIds: sampleTrackIds });
    const snapshotId = "snapshotId" in snapshotResult ? snapshotResult.snapshotId : ("" as ID);
    const analyzeResult = await playlistHealth.analyze({ playlistId: playlist1, snapshotId });
    const reportId = "reportId" in analyzeResult ? analyzeResult.reportId : ("" as ID);

    await t.step("should retrieve an existing report", async () => {
      const result = await playlistHealth.getReport({ reportId });
      if ("error" in result) {
        throw new Error(result.error);
      }
      assertEquals("playlistId" in result, true);
      assertEquals(result.playlistId, playlist1);
      assertEquals(result.snapshotId, snapshotId);
      assertExists(result.findings);
    });

    await t.step("should fail if the report does not exist", async () => {
      const fakeReportId = "report:fake" as ID;
      const result = await playlistHealth.getReport({ reportId: fakeReportId });
      assertEquals("error" in result, true);
      if ("error" in result) {
        assertEquals(result.error, `Report with id ${fakeReportId} not found.`);
      }
    });
  });

  await t.step("fulfills the principle", async () => {
    // Principle: "If given a snapshot such as: list of track IDs, the concept computes findings
    // (duplicates, unavailable tracks, and feature outliers) with no calls to other concepts"
    const tracksWithIssues = [
      "track:A", // 0
      "track:B", // 1
      "track:C", // 2
      "track:A", // 3 - Duplicate
      null, // 4 - Unavailable
      "track:E", // 5
      "track:F", // 6 - Outlier (7th track)
    ] as (ID | null)[];

    // 1. Take a snapshot
    const snapshotResult = await playlistHealth.snapshot({
      playlistId: playlist1,
      userId: userA,
      trackIds: tracksWithIssues as ID[],
    });
    const snapshotId = "snapshotId" in snapshotResult ? snapshotResult.snapshotId : ("" as ID);
    assertExists(snapshotId);

    // 2. Analyze the snapshot
    const analyzeResult = await playlistHealth.analyze({ playlistId: playlist1, snapshotId });
    const reportId = "reportId" in analyzeResult ? analyzeResult.reportId : ("" as ID);
    assertExists(reportId);

    // 3. Get the report and verify findings
    const reportResult = await playlistHealth.getReport({ reportId });
    if ("error" in reportResult) {
      throw new Error(reportResult.error);
    }

    const { findings } = reportResult;
    assertEquals(findings.length, 3);

    const duplicateFinding = findings.find((f) => f.kind === "Duplicate");
    assertExists(duplicateFinding);
    assertEquals(duplicateFinding.idx, 3);
    assertEquals(duplicateFinding.trackId, "track:A");

    const unavailableFinding = findings.find((f) => f.kind === "Unavailable");
    assertExists(unavailableFinding);
    assertEquals(unavailableFinding.idx, 4);
    assertEquals(unavailableFinding.trackId, null);

    const outlierFinding = findings.find((f) => f.kind === "Outlier");
    assertExists(outlierFinding);
    assertEquals(outlierFinding.idx, 6);
    assertEquals(outlierFinding.trackId, "track:F");
  });

  await client.close();
});
```

# trace:

The following trace demonstrates how the `PlaylistHealth` concept fulfills its principle by taking a snapshot of a user's playlist and generating a report with actionable findings, all within a self-contained unit.

1.  **User initiates a playlist check.** A user wants to clean up their playlist and initiates a health check. This translates to an initial action on the `PlaylistHealth` concept.

2.  **`snapshot` action occurs.** The system calls `snapshot` with the user's ID, the playlist's ID, and an array of track IDs from that playlist. This specific array contains known issues: a duplicate track `track:A`, an unavailable track represented by `null`, and a track at the 7th position that will be flagged as a placeholder outlier.

    ```typescript
    // Input to the action
    const playlistData = {
      playlistId: "playlist:1",
      userId: "user:A",
      trackIds: ["track:A", "track:B", "track:C", "track:A", null, "track:E", "track:F"],
    };
    const { snapshotId } = await playlistHealth.snapshot(playlistData);
    ```

    *   **Effect**: A new `Snapshot` document is created and stored in the database, freezing the state of the playlist at this moment in time. The concept returns the unique `snapshotId`.

3.  **`analyze` action occurs.** With the `snapshotId` from the previous step, the system requests an analysis.

    ```typescript
    const { reportId } = await playlistHealth.analyze({
      playlistId: "playlist:1",
      snapshotId: snapshotId,
    });
    ```

    *   **Effect**: The concept retrieves the specified snapshot. It iterates through the `trackIds`, identifying and collecting findings:
        *   It sees `track:A` at index 3 is a repeat of the one at index 0 and creates a `Duplicate` finding.
        *   It sees `null` at index 4 and creates an `Unavailable` finding.
        *   It sees `track:F` at index 6 (the 7th item) and creates an `Outlier` finding based on its internal placeholder logic.
    *   A new `Report` document containing these findings is created and stored. The unique `reportId` is returned.

4.  **`getReport` action occurs.** The system now fetches the completed report to display the results to the user.

    ```typescript
    const { findings } = await playlistHealth.getReport({ reportId });
    ```

    *   **Effect**: The concept retrieves the `Report` document and returns its contents. The returned `findings` array accurately reflects the issues detected in the `analyze` step:
        *   `{ idx: 3, trackId: 'track:A', kind: 'Duplicate' }`
        *   `{ idx: 4, trackId: null, kind: 'Unavailable' }`
        *   `{ idx: 6, trackId: 'track:F', kind: 'Outlier' }`

This trace successfully demonstrates the **principle**: a snapshot was provided, and the concept independently computed findings without any external dependencies, fulfilling its purpose of detecting playlist issues.