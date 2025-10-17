import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { ID } from "@utils/types.ts";

// Generic types for this concept. The spec uses `String` for IDs, but we'll use our branded `ID` type for clarity.
type User = ID;
type SnapshotId = ID;
type ReportId = ID;
type PlaylistId = ID;
type TrackId = ID;

const PREFIX = "PlaylistHealth" + ".";

/**
 * Represents a single finding within a playlist health report.
 */
interface Finding {
  idx: number; // The index of the track in the original snapshot array
  trackId: TrackId;
  kind: "Duplicate" | "Unavailable" | "Outlier";
}

/**
 * State for a set of Snapshots.
 * Each document represents a snapshot of a playlist's tracks at a specific time.
 */
interface SnapshotDoc {
  _id: SnapshotId;
  playlistId: PlaylistId;
  userId: User;
  trackIds: TrackId[];
  takenAt: number; // Unix timestamp
}

/**
 * State for a set of Reports.
 * Each document contains the analysis results for a given snapshot.
 */
interface ReportDoc {
  _id: ReportId;
  playlistId: PlaylistId;
  snapshotId: SnapshotId;
  scannedAt: number; // Unix timestamp
  findings: Finding[];
}

/**
 * @concept PlaylistHealth [User]
 * @purpose Detect duplicates, unavailable tracks, and feature outliers in a playlist from a provided snapshot.
 */
export default class PlaylistHealthConcept {
  private readonly snapshots: Collection<SnapshotDoc>;
  private readonly reports: Collection<ReportDoc>;

  constructor(db: Db) {
    this.snapshots = db.collection<SnapshotDoc>(PREFIX + "snapshots");
    this.reports = db.collection<ReportDoc>(PREFIX + "reports");
  }

  /**
   * Creates and stores a snapshot of a playlist's tracks.
   * @param playlistId The ID of the playlist being snapshotted.
   * @param userId The ID of the user who owns the playlist.
   * @param trackIds An array of track IDs in the playlist.
   * @returns The ID of the newly created snapshot.
   *
   * @requires Non-empty parameters, especially `trackIds`.
   * @effects Stores a new `Snapshot` document with the provided data and a timestamp.
   */
  async snapshot(
    { playlistId, userId, trackIds }: { playlistId: PlaylistId; userId: User; trackIds: TrackId[] },
  ): Promise<{ snapshotId: SnapshotId } | { error: string }> {
    if (!playlistId || !userId || !trackIds || trackIds.length === 0) {
      return { error: "Invalid input: playlistId, userId, and a non-empty trackIds array are required." };
    }

    const snapshotId = freshID() as SnapshotId;
    const takenAt = Date.now();

    const snapshotDoc: SnapshotDoc = {
      _id: snapshotId,
      playlistId,
      userId,
      trackIds,
      takenAt,
    };

    await this.snapshots.insertOne(snapshotDoc);

    return { snapshotId };
  }

  /**
   * Analyzes a given snapshot to find issues like duplicates, unavailable tracks, and outliers.
   * @param playlistId The ID of the playlist.
   * @param snapshotId The ID of the snapshot to analyze.
   * @returns The ID of the newly generated report.
   *
   * @requires A snapshot with the given `snapshotId` and `playlistId` must exist.
   * @effects Computes findings and stores them in a new `Report` document.
   */
  async analyze(
    { playlistId, snapshotId }: { playlistId: PlaylistId; snapshotId: SnapshotId },
  ): Promise<{ reportId: ReportId } | { error: string }> {
    const snapshot = await this.snapshots.findOne({ _id: snapshotId, playlistId });

    if (!snapshot) {
      return { error: `Snapshot with id ${snapshotId} for playlist ${playlistId} not found.` };
    }

    const findings: Finding[] = [];
    const seenTracks = new Map<TrackId, number>(); // Map to track duplicate tracks and their first appearance index.

    snapshot.trackIds.forEach((trackId, idx) => {
      // 1. Detect Unavailable Tracks
      // This concept cannot make external calls. We'll assume a null or empty string
      // in the track list signifies an unavailable track.
      if (!trackId) {
        findings.push({ idx, trackId, kind: "Unavailable" });
        return; // An unavailable track can't be a duplicate or outlier.
      }

      // 2. Detect Duplicates
      if (seenTracks.has(trackId)) {
        findings.push({ idx, trackId, kind: "Duplicate" });
      } else {
        seenTracks.set(trackId, idx);
      }

      // 3. Detect Outliers
      // A true outlier detection requires audio feature data (e.g., danceability, energy)
      // which is outside the scope of this self-contained concept.
      // As a placeholder, we'll mark every 7th track as an "Outlier" to demonstrate the feature.
      if ((idx + 1) % 7 === 0) {
        findings.push({ idx, trackId, kind: "Outlier" });
      }
    });

    const reportId = freshID() as ReportId;
    const scannedAt = Date.now();

    const reportDoc: ReportDoc = {
      _id: reportId,
      playlistId: snapshot.playlistId,
      snapshotId: snapshot._id,
      scannedAt,
      findings,
    };

    await this.reports.insertOne(reportDoc);

    return { reportId };
  }

  /**
   * Retrieves the results of a previously generated playlist health report.
   * @param reportId The ID of the report to retrieve.
   * @returns The playlist ID, snapshot ID, and the list of findings from the report.
   *
   * @requires A report with the given `reportId` must exist.
   * @effects Returns data from an existing `Report` document.
   */
  async getReport(
    { reportId }: { reportId: ReportId },
  ): Promise<{ playlistId: PlaylistId; snapshotId: SnapshotId; findings: Finding[] } | { error: string }> {
    const report = await this.reports.findOne({ _id: reportId });

    if (!report) {
      return { error: `Report with id ${reportId} not found.` };
    }

    const { playlistId, snapshotId, findings } = report;
    return { playlistId, snapshotId, findings };
  }
}