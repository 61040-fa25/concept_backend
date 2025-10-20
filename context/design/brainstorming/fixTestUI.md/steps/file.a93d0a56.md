---
timestamp: 'Sun Oct 19 2025 19:31:04 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_193104.c931d29d.md]]'
content_id: a93d0a5694e4d2193f12ba1c3f2df21437bc9c5892aebe025b9fa709fab123c8
---

# file: src\frontend\poseBreakdownTest.js

```
// @ts-nocheck
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";

const demosSection = document.getElementById("demos");
const resultsBox = document.getElementById("testResults");

let poseLandmarker;
let runningMode = "IMAGE";

// Utility: log to console and on-page output
function logResult(label, data) {
  if (!data?.landmarks?.length) {
    resultsBox.textContent =
      `🧩 ${label}\n\nNo landmarks detected.\n\n` + resultsBox.textContent;
    return;
  }

  // Define the key landmarks we care about
  const keypoints = {
    NOSE: 0,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28,
  };

  // Assume result.landmarks[0] is the first detected pose
  const pose = data.landmarks[0];
  if (!pose) {
    resultsBox.textContent =
      `🧩 ${label}\n\nNo landmarks found for first pose.\n\n` +
      resultsBox.textContent;
    return;
  }

  // Build a simplified output
  const simplified = {};
  for (const [name, index] of Object.entries(keypoints)) {
    const point = pose[index];
    if (point) {
      simplified[name] = { x: point.x, y: point.y, z: point.z };
    } else {
      simplified[name] = null;
    }
  }

  // Log to console and on-page
  console.log(`🧩 ${label}`, simplified);
  resultsBox.textContent =
    `🧩 ${label}\n\n${JSON.stringify(simplified, null, 2)}\n\n` +
    resultsBox.textContent;
}

// --- Setup PoseLandmarker ---
async function createPoseLandmarker() {
  logResult("Status", "Loading PoseLandmarker...");
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate: "GPU",
    },
    numPoses: 2,
  });
  demosSection.classList.remove("invisible");
  logResult("PoseLandmarker Loaded ✅", "Ready to detect poses");
}

await createPoseLandmarker();

// --- Attach click handlers ---
const imageContainers = document.getElementsByClassName("detectOnClick");
for (let i = 0; i < imageContainers.length; i++) {
  const img = imageContainers[i].querySelector("img");
  img.addEventListener("click", () => handleClick(img));
}

async function handleClick(image) {
  if (!poseLandmarker) {
    logResult("Error", "PoseLandmarker not ready yet!");
    return;
  }
  logResult("Info", `Running detection for ${image.src}`);
  runDetection(image);
}

function runDetection(image) {
  // Remove any existing canvas from this image
  const existingCanvas = image.parentNode.querySelector("canvas");
  if (existingCanvas) existingCanvas.remove();

  // Create a new canvas overlay
  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.width = image.clientWidth + "px";
  canvas.style.height = image.clientHeight + "px";

  canvas.width = image.clientWidth;
  canvas.height = image.clientHeight;

  image.parentNode.style.position = "relative";
  image.parentNode.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const drawingUtils = new DrawingUtils(ctx);

  // Run pose detection
  poseLandmarker.detect(image, (result) => {
    logResult("Got poseLandmarker result ✅", result);

    for (const landmarks of result.landmarks) {
      // Draw landmarks (smaller radius)
      drawingUtils.drawLandmarks(landmarks, {
        radius: 1,
        color: "white",
      });

      // Draw connectors (thinner lines)
      drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
        color: "white",
        lineWidth: 2,
      });
    }
  });
}

```
