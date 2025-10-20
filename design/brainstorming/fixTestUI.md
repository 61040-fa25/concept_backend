# fixTestUI

[@PoseBreakdown concept spec](../concepts/MirrorMotionConcepts/PoseBreakdown/PoseBreakdownSpecs.md)

[@poseBreakdownTest.js](../../src/frontend/poseBreakdownTest.js)

[@poseBreakdownTest UI](../../src/frontend/postBreakdownTestUI.html)

[@good concept test example](../../src/mirrorMotionConcepts/ManageVideo.test.ts)

# prompt: Given the current poseBreakdownTest.js and poseBreakdownTestUI, and the good concept test example as reference, can u update the UI to clearly show us testing the different actions specified in PoseBreakdown concept spec?
# response:

Okay, I've updated the `poseBreakdownTest.js` and `poseBreakdownTestUI.html` files to clearly demonstrate the `extractPoses` and `getPoseData` actions from your `PoseBreakdown` concept.

Here's a summary of the changes:

1.  **Simulated `extractPoses`**:
    *   When you click an image, it now simulates the `extractPoses` action.
    *   A unique `poseID` is generated for the detected pose in that image.
    *   The simplified pose data (mapping keypoints to x,y,z coordinates) is "stored" in a local `Map` (simulating a database).
    *   The `testResults` output now explicitly labels this as an `[EXTRACT]` action and displays the `poseID` along with the structured pose data, formatted to reflect the `PoseData`, `PartData`, and `PointData` concept.

2.  **Simulated `getPoseData`**:
    *   A new section "Extracted Poses (Simulated Storage)" has been added to the UI.
    *   Every time `extractPoses` is simulated, a new entry appears in this list, showing the `poseID` and a "Get Pose Data" button.
    *   Clicking this button simulates the `getPoseData` action, retrieving the stored pose data by its `poseID` from the local `Map`.
    *   The `testResults` output then displays this as a `[RETRIEVE]` action, showing the same structured pose data.

3.  **Improved Output Formatting**:
    *   The `logResult` function has been refactored to take a `type` argument (`EXTRACT`, `RETRIEVE`, `STATUS`, `INFO`, `ERROR`).
    *   When `type` is `EXTRACT` or `RETRIEVE`, the output in `testResults` is formatted to closely match your `PoseData` concept structure:
        *   `poseID` is included.
        *   `partData` is an array where each entry represents a conceptual "part" (e.g., `NOSE`, `LEFT_SHOULDER`). For this demo, each keypoint is treated as a separate "part".
        *   Each "part" contains `pointData` with `orderID` (the original MediaPipe index) and `location` (x, y, z coordinates).

These changes provide a clear, interactive demonstration of how your frontend could interact with the `PoseBreakdown` concept's actions and represent its data.

---

### file: src\frontend\poseBreakdownTest.js

```javascript
// @ts-nocheck
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";

const demosSection = document.getElementById("demos");
const resultsBox = document.getElementById("testResults");
const extractedPosesListDiv = document.getElementById("extractedPosesList"); // New element for listing extracted poses

let poseLandmarker;
let runningMode = "IMAGE";

// Global store for extracted poses (poseID -> PoseData concept structure representation)
const extractedPoses = new Map();

// Define the key landmarks we care about and their MediaPipe indices
// This also implicitly defines the 'orderID' for our conceptual 'PointData'
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

// Utility: log to console and on-page output
function logResult(type, label, data) {
  let output = `[${type}] ${label}\n\n`;
  let consoleData = data; // Data to log to browser console (can be original or formatted)

  // Format data specifically for PoseData concept display if type is EXTRACT or RETRIEVE
  if (type === "EXTRACT" || type === "RETRIEVE") {
    if (!data || Object.keys(data).length === 0) {
      output += "No pose data found for this ID.\n\n";
    } else {
      // Construct a PoseData object according to the concept spec:
      // - poseID
      // - partData: Set of PartData (represented as an array here)
      //   - PartData: part Enum (string name here), pointData Set of PointData
      //     - PointData: orderID, location
      const formattedPoseData = {
        poseID: label.replace("Pose ID: ", ""), // Extract ID from label for consistency
        partData: [], // Array to hold 'PartData' entries
      };

      for (const [name, point] of Object.entries(data)) {
        if (point) {
          // For simplicity in this demo, each keypoint is treated as a distinct "PartData" entry.
          // In a full implementation, you'd group relevant points under broader parts (e.g., 'LEFT_ARM').
          formattedPoseData.partData.push({
            part: name, // Using the landmark name as the 'part Enum'
            pointData: [
              {
                orderID: keypoints[name], // The original MediaPipe index as orderID
                location: { x: point.x, y: point.y, z: point.z }, // The point location
              },
            ],
          });
        }
      }
      output += `${JSON.stringify(formattedPoseData, null, 2)}\n\n`;
      consoleData = formattedPoseData; // Log structured data to console
    }
  } else if (typeof data === "object" && data !== null) {
    // For other types, pretty-print objects
    output += `${JSON.stringify(data, null, 2)}\n\n`;
  } else {
    // For simple strings or primitives
    output += `${data}\n\n`;
  }

  // Prepend new results to the testResults box
  console.log(`🧩 ${type} ${label}`, consoleData);
  resultsBox.textContent = output + resultsBox.textContent;
}

// --- Setup PoseLandmarker ---
async function createPoseLandmarker() {
  logResult("STATUS", "Loading PoseLandmarker...", "Initializing MediaPipe tasks.");
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate: "GPU", // Use GPU for better performance if available
    },
    numPoses: 2, // Detect up to 2 poses in an image
  });
  demosSection.classList.remove("invisible"); // Show the demo section once loaded
  logResult("STATUS", "PoseLandmarker Loaded ✅", "Ready to detect poses from images.");
}

// Initialize the PoseLandmarker when the script loads
await createPoseLandmarker();

// --- Attach click handlers for image detection ---
const imageContainers = document.getElementsByClassName("detectOnClick");
for (let i = 0; i < imageContainers.length; i++) {
  const img = imageContainers[i].querySelector("img");
  img.addEventListener("click", () => handleClick(img));
}

// Handler for when an image is clicked, simulating 'extractPoses'
async function handleClick(image) {
  if (!poseLandmarker) {
    logResult("ERROR", "PoseLandmarker not ready yet!", "Please wait for initialization to complete.");
    return;
  }
  logResult("INFO", `Simulating extractPoses for image`, image.src);
  runDetection(image); // Proceed with pose detection and storage simulation
}

// Function to simulate the 'extractPoses' action by processing one image
// (This would typically process a video frame by frame in a full implementation)
function runDetection(image) {
  // Clear any existing canvas overlay from previous detections on this image
  const existingCanvas = image.parentNode.querySelector("canvas");
  if (existingCanvas) existingCanvas.remove();

  // Create a new canvas overlay for drawing landmarks
  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.left = "0";
  canvas.style.top = "0";
  canvas.style.pointerEvents = "none"; // Make canvas non-interactive
  canvas.style.width = image.clientWidth + "px";
  canvas.style.height = image.clientHeight + "px";

  canvas.width = image.clientWidth;
  canvas.height = image.clientHeight;

  image.parentNode.style.position = "relative"; // Ensure parent is positioned for absolute canvas
  image.parentNode.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const drawingUtils = new DrawingUtils(ctx);

  // Run pose detection on the image
  poseLandmarker.detect(image, (result) => {
    // Generate a unique poseID for this "extraction" (simulating backend ID generation)
    const poseID = `pose-${crypto.randomUUID().slice(0, 8)}`; // Shortened UUID for display

    const firstPose = result.landmarks[0]; // We'll focus on the first detected pose
    if (!firstPose) {
      logResult("EXTRACT", `Pose ID: ${poseID}`, "No landmarks detected for this image.");
      updateExtractedPosesUI(); // Update UI even if no detection, to show the attempt
      return;
    }

    // Build a simplified output structure that maps our keypoints to their x,y,z coords.
    // This 'simplifiedPoseData' will serve as our in-memory representation of a 'PoseData' object's content.
    const simplifiedPoseData = {};
    for (const [name, index] of Object.entries(keypoints)) {
      const point = firstPose[index];
      if (point) {
        simplifiedPoseData[name] = { x: point.x, y: point.y, z: point.z };
      } else {
        simplifiedPoseData[name] = null; // Mark missing points
      }
    }

    // Store the extracted pose data in our simulated storage
    extractedPoses.set(poseID, simplifiedPoseData);
    logResult("EXTRACT", `Pose ID: ${poseID}`, simplifiedPoseData);

    // Update the UI to show this newly extracted pose in the list
    updateExtractedPosesUI();

    // Draw landmarks and connectors on the canvas for visual feedback
    for (const landmarks of result.landmarks) {
      drawingUtils.drawLandmarks(landmarks, { radius: 1, color: "white" });
      drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
        color: "white",
        lineWidth: 2,
      });
    }
  });
}

// Function to update the list of extracted poses displayed in the UI
function updateExtractedPosesUI() {
  extractedPosesListDiv.innerHTML = ""; // Clear existing list content

  if (extractedPoses.size === 0) {
    extractedPosesListDiv.textContent = "No poses extracted yet.";
    return;
  }

  extractedPoses.forEach((_, poseID) => {
    const div = document.createElement("div");
    div.className = "extracted-pose-item";

    const idSpan = document.createElement("span");
    idSpan.textContent = `Pose ID: ${poseID}`;
    div.appendChild(idSpan);

    const getButton = document.createElement("button");
    getButton.textContent = "Get Pose Data";
    getButton.onclick = () => getPoseDataAction(poseID); // Attach click handler for retrieval
    div.appendChild(getButton);

    extractedPosesListDiv.appendChild(div);
  });
}

// Function to simulate the 'getPoseData' action
function getPoseDataAction(poseID) {
  const poseData = extractedPoses.get(poseID); // Retrieve from simulated storage
  if (poseData) {
    logResult("RETRIEVE", `Retrieving Pose ID: ${poseID}`, poseData);
  } else {
    logResult("ERROR", `Retrieving Pose ID: ${poseID}`, "Pose data not found in simulated store.");
  }
}

// Initialize the extracted poses UI on load to show its initial empty state
updateExtractedPosesUI();

```

---

### file: src\frontend\postBreakdownTestUI.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>PoseLandmarker Test UI</title>
    <script type="module" src="./poseBreakdownTest.js"></script>
    <style>
      body {
        font-family: system-ui, sans-serif;
        background: #fafafa;
        margin: 2rem;
        color: #222;
        line-height: 1.6;
      }
      h1, h2 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
        color: #333;
      }
      p {
        margin-bottom: 1rem;
      }
      #testResults {
        background: #1e1e1e;
        color: #d4d4d4;
        padding: 1rem;
        margin-top: 1rem;
        border-radius: 8px;
        white-space: pre-wrap; /* Preserves whitespace and line breaks */
        max-height: 400px;
        overflow-y: auto; /* Scroll for long output */
        font-family: monospace;
        font-size: 0.85em;
      }
      .demos-container {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
        margin-bottom: 2rem;
      }
      .testImage {
        position: relative;
        display: inline-block; /* Aligns items in a row */
        margin: 0; /* Remove default margin from old structure */
        cursor: pointer;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        overflow: hidden; /* Ensures child elements respect border-radius */
      }
      .testImage img {
        display: block; /* Remove extra space below image */
        border-radius: 10px; /* Rounded corners for the image */
        transition: transform 0.2s ease-in-out;
        width: 320px;
        height: auto;
      }
      .testImage img:hover {
        transform: scale(1.03); /* Slight zoom on hover */
      }
      canvas {
        position: absolute;
        left: 0;
        top: 0;
        pointer-events: none; /* Allows clicks to pass through to the image */
      }

      /* Styles for the new extracted poses list */
      #extractedPosesSection {
        margin-top: 2rem;
        background: #fdfdfd;
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }
      #extractedPosesList {
        margin-top: 1rem;
        border: 1px solid #eee;
        border-radius: 5px;
        padding: 1rem;
        min-height: 80px; /* Ensure some visibility even if empty */
        background: #ffffff;
      }
      .extracted-pose-item {
        background: #e8f4fd; /* Light blue background for each item */
        border: 1px solid #b3e0ff;
        padding: 0.75rem 1rem;
        margin-bottom: 0.5rem;
        border-radius: 5px;
        display: flex;
        align-items: center;
        gap: 15px; /* Space between ID and button */
        font-size: 0.95em;
        color: #333;
      }
      .extracted-pose-item:last-child {
        margin-bottom: 0; /* No margin after the last item */
      }
      .extracted-pose-item button {
        padding: 8px 15px;
        background-color: #007bff; /* Primary blue button */
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 0.9em;
        transition: background-color 0.2s ease-in-out;
      }
      .extracted-pose-item button:hover {
        background-color: #0056b3; /* Darker blue on hover */
      }

      /* Utility for initial hiding */
      .invisible {
        display: none;
      }
    </style>
  </head>

  <body>
    <h1>Pose Breakdown Test Interface</h1>
    <p>
      This UI demonstrates the `extractPoses` and `getPoseData` actions from the `PoseBreakdown` concept.
    </p>

    <section id="demos" class="demos-container invisible">
      <div class="testImage detectOnClick">
        <img
          src="../../input/testPoseImgs/poseTest1.png"
          crossorigin="anonymous"
          title="Click to simulate `extractPoses` for this image"
        />
      </div>
      <div class="testImage detectOnClick">
        <img
          src="https://assets.codepen.io/9177687/woman-g1af8d3deb_640.jpg"
          crossorigin="anonymous"
          title="Click to simulate `extractPoses` for this image"
        />
      </div>
    </section>

    <section id="extractedPosesSection">
      <h2>Extracted Poses (Simulated Storage)</h2>
      <p>Click an image above to `extractPoses`. Then, click a "Get Pose Data" button below to `getPoseData` for that specific pose.</p>
      <div id="extractedPosesList">
        <p>No poses extracted yet. Click an image above to start!</p>
      </div>
    </section>

    <h2>Test Output</h2>
    <pre id="testResults">(Click an image above to start test)</pre>
  </body>
</html>

```