import { assertEquals, assertExists } from "jsr:@std/assert";
// import { testDb } from "@utils/database.ts";
// import { ID } from "@utils/types.ts";
import ExtractPose from "./ExtractPose.ts";
import { loadImage } from "canvas";

import { NormalizedLandmark } from "@mediapipe/tasks-vision";
// const IMAGE_FILE_PATH =
//   "C:/Users/wendy/Documents/Fall2025/6.104/MirrorMotion/media/testPoseImgs/poseTest1.png";

const initPromise = ExtractPose.initLandmarker();

Deno.test("Extract Pose Concept", async () => {
  console.log("PoseLandmarker before init:", ExtractPose.poseLandmarker);
  await initPromise;
  console.log("PoseLandmarker after init:", ExtractPose.poseLandmarker);
  const img = await loadImage("./media/testPoseImgs/poseTest1.png");
  const landmarks = await ExtractPose.detect(img);

  console.log("PoseLandmarker after detect:", ExtractPose.poseLandmarker);
  console.log("Landmarks:", landmarks);
});

// Deno.test("Extract Pose Concept - ", async (t) => {
//   /// NOTE: The model initialization happens here when the module is first imported.
//   // The first test step will automatically 'await' the initialization.

//   await t.step(
//     "should extract pose successfully and return landmarks",
//     async () => {
//       console.log("PoseLandmarker before init:", ExtractPose.poseLandmarker);
//       await ExtractPose.initLandmarker();
//       console.log("PoseLandmarker after init:", ExtractPose.poseLandmarker);
//       // Calling the static method
//       // const landmarks: NormalizedLandmark[][] | null = await ExtractPose
//       //   .extractPoseFromImage(IMAGE_FILE_PATH);

//       // // Assert that landmarks were found
//       // assertExists(
//       //   landmarks,
//       //   "Landmarks should be extracted from the test image.",
//       // );

//       // // Assert that at least one pose was detected
//       // assertEquals(
//       //   landmarks.length > 0,
//       //   true,
//       //   "At least one pose must be detected.",
//       // );

//       // // Optional: Log a specific landmark for verification (e.g., the nose)
//       // if (landmarks && landmarks.length > 0) {
//       //   const nose = landmarks[0][0]; // First pose, first landmark (Nose)
//       //   console.log(
//       //     `Verified Nose Landmark: x=${nose.x.toFixed(4)}, y=${
//       //       nose.y.toFixed(4)
//       //     }`,
//       //   );
//       // }

//       // ExtractPose.close();
//     },
//   );
// });
