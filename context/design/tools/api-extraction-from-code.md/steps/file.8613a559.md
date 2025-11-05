---
timestamp: 'Tue Nov 04 2025 18:41:43 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251104_184143.88b5cb9a.md]]'
content_id: 8613a55948360108ba0c93bfee37d65e01d4f4cdd7b7c664f3f9a5462941fa83
---

# file: src\concepts\PoseBreakdown\PoseBreakdownConcept.ts

```typescript
import { ID } from "@utils/types.ts"; // Assuming @utils/types.ts provides ID type.
import { freshID } from "@utils/database.ts"; // Assuming @utils/database.ts provides freshID.
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

// A set of PointData with: a location Number
// MediaPipe provides 3D coordinates (normalized 0-1)
export interface PointData {
  x: number;
  y: number;
  z: number;
}

// Enum for standard body parts (derived from MediaPipe's keypoint names)
export enum PartEnum {
  NOSE = "NOSE",
  LEFT_SHOULDER = "LEFT_SHOULDER",
  RIGHT_SHOULDER = "RIGHT_SHOULDER",
  LEFT_ELBOW = "LEFT_ELBOW",
  RIGHT_ELBOW = "RIGHT_ELBOW",
  LEFT_WRIST = "LEFT_WRIST",
  RIGHT_WRIST = "RIGHT_WRIST",
  LEFT_HIP = "LEFT_HIP",
  RIGHT_HIP = "RIGHT_HIP",
  LEFT_KNEE = "LEFT_KNEE",
  RIGHT_KNEE = "RIGHT_KNEE",
  LEFT_ANKLE = "LEFT_ANKLE",
  RIGHT_ANKLE = "RIGHT_ANKLE",
}

// A set of PartData with: a part Enum, a pointData Set of PointData
export interface PartData {
  part: PartEnum;
  pointData: PointData;
}

// A set of PoseData with: a poseID String, a partData of Set of PartData
export interface PoseData {
  poseID: ID;
  partData: Array<PartData>;
}

/**
 * @concept PoseBreakdown
 * @purpose extract poses from videos and represent them as collections of parts and points, which can later be compared
 * @principle after a video is processed, poses for each frame are stored as structured data
 */
export default class PoseBreakdownConcept {
  // Internal storage for poses, mapping poseID to PoseData
  // In a real application, this would typically be a database collection.
  private readonly poses: Map<ID, PoseData> = new Map();
  private poseLandmarker: PoseLandmarker | null = null;

  constructor() {
    // This concept does not have direct database dependencies for its state,
    // as it's meant to define the structure and logic for pose data itself.
  }

  /**
   * Action: extractPoses
   * Requires: The video exists and can be processed.
   * Effect: Processes each frame, runs pose detection, stores PoseData for each,
   * and returns their generated IDs.
   *
   * @param videoSource HTMLVideoElement or video URL string
   * @returns Set of poseIDs created for each frame.
   */
  public async extractPoses(
    videoSource: string | HTMLVideoElement,
  ): Promise<Set<ID>> {
    console.log("in extractPoses...", videoSource);

    // Lazy init of PoseLandmarker
    if (!this.poseLandmarker) {
      try {
        console.log("Initializing PoseLandmarker...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm",
        );
        console.log("FilesetResolver initialized.", vision);

        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "../../models/pose_landmarker_full.task",
          },
          runningMode: "IMAGE",
        });

        console.log("PoseLandmarker initialized.");
      } catch (err) {
        console.error("Error initializing PoseLandmarker:", err);
      }
    }

    console.log("Starting pose extraction...");

    // const video: HTMLVideoElement = typeof videoSource === "string"
    //   ? await this.loadVideo(videoSource)
    //   : videoSource;

    // console.log("Video loaded.", video);

    // const canvas = document.createElement("canvas");
    // const ctx = canvas.getContext("2d")!;
    // canvas.width = video.videoWidth;
    // canvas.height = video.videoHeight;

    const poseIDs: Set<ID> = new Set();

    // const fps = 30;
    // const totalFrames = Math.floor(video.duration * fps);

    // for (let i = 0; i < totalFrames; i++) {
    //   video.currentTime = i / fps;

    //   await new Promise<void>((resolve) => {
    //     video.onseeked = async () => {
    //       ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    //       const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    //       const result = this.poseLandmarker!.detectForVideo(
    //         imageData,
    //         performance.now(),
    //       );

    //       if (result.landmarks && result.landmarks[0]) {
    //         const landmarks = result.landmarks[0];
    //         const partDataArray: PartData[] = landmarks.map((l, index) => ({
    //           part: Object.values(PartEnum)[index],
    //           pointData: { x: l.x, y: l.y, z: l.z },
    //         }));

    //         const poseID = freshID() as ID;
    //         const newPoseData: PoseData = { poseID, partData: partDataArray };
    //         this.poses.set(poseID, newPoseData);
    //         poseIDs.add(poseID);
    //       }

    //       resolve();
    //     };
    //   });
    // }
    // console.log(poseIDs.size + " poses extracted.");

    return poseIDs;
  }

  /**
   * Helper: Load a video from a URL into an HTMLVideoElement
   */
  private async loadVideo(url: string): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.src = url;
      video.load();
      video.onloadeddata = () => resolve(video);
      video.onerror = () => reject(new Error("Failed to load video."));
    });
  }

  public getPoseData(poseID: ID): PoseData | undefined {
    return this.poses.get(poseID);
  }
}

```
