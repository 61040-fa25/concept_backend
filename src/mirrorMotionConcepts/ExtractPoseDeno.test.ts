import { assertEquals, assertExists } from "jsr:@std/assert";
// import { testDb } from "@utils/database.ts";
// import { ID } from "@utils/types.ts";
import ExtractPose from "./ExtractPose.ts";
import { loadImage } from "canvas";

import { NormalizedLandmark } from "@mediapipe/tasks-vision";
// const IMAGE_FILE_PATH =
//   "C:/Users/wendy/Documents/Fall2025/6.104/MirrorMotion/media/testPoseImgs/poseTest1.png";

// const initPromise = ExtractPose.initLandmarker();

Deno.test("Extract Pose Concept", async () => {
  console.log("PoseLandmarker before init:", ExtractPose.poseLandmarker);
  // await initPromise;
  await ExtractPose.initLandmarker();

  console.log("PoseLandmarker after init:", ExtractPose.poseLandmarker);

  await new Promise((resolve) => setTimeout(resolve, 20000));
  console.log(
    "PoseLandmarker after init + timeout:",
    ExtractPose.poseLandmarker,
  );
  const img = await loadImage("./media/testPoseImgs/poseTest1.png");
  const landmarks = await ExtractPose.detect(img);

  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("PoseLandmarker after detect:", ExtractPose.poseLandmarker);
  console.log("Landmarks:", landmarks);

  // const promise = Promise.allSettled([p1, p2, p3]);
});
