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
  logResult(
    "STATUS",
    "Loading PoseLandmarker...",
    "Initializing MediaPipe tasks."
  );
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "../models/pose_landmarker_lite.task",
      delegate: "GPU", // Use GPU for better performance if available
    },
    numPoses: 2, // Detect up to 2 poses in an image
  });
  demosSection.classList.remove("invisible"); // Show the demo section once loaded
  logResult(
    "STATUS",
    "PoseLandmarker Loaded ✅",
    "Ready to detect poses from images."
  );
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
    logResult(
      "ERROR",
      "PoseLandmarker not ready yet!",
      "Please wait for initialization to complete."
    );
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
      logResult(
        "EXTRACTED ✅",
        `Pose ID: ${poseID}`,
        "No landmarks detected for this image."
      );
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
    logResult("EXTRACTED ✅", `Pose ID: ${poseID}`, simplifiedPoseData);

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
    logResult("RETRIEVED ✅", `Retrieving Pose ID: ${poseID}`, poseData);
  } else {
    logResult(
      "ERROR",
      `Retrieving Pose ID: ${poseID}`,
      "Pose data not found in simulated store."
    );
  }
}

// Initialize the extracted poses UI on load to show its initial empty state
updateExtractedPosesUI();
