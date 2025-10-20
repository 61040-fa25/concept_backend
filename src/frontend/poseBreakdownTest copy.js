// @ts-nocheck

import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";

// from "@mediapipe/tasks-vision";
console.log(PoseLandmarker, FilesetResolver);
// from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";
console.log("motion.js is loaded!");
const demosSection = document.getElementById("demos");
let poseLandmarker = undefined;
let runningMode = "IMAGE";
let enableWebcamButton;
let webcamRunning = false;
const videoHeight = "360px";
const videoWidth = "480px";
// Before we can use PoseLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createPoseLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
      delegate: "GPU",
    },
    numPoses: 2,
  });
  console.log("*** PoseLandmarker is loaded ***", poseLandmarker);
  if (demosSection) {
    demosSection.classList.remove("invisible");
  } else {
    // Handle the case when demosSection is null
    console.error("demosSection is null");
  }
};
createPoseLandmarker();
console.log("Creating PoseLandmarker...");
// In this demo, we have put all our clickable images in divs with the
// CSS class 'detectionOnClick'. Lets get all the elements that have
// this class.
const imageContainers = document.getElementsByClassName("detectOnClick");
// Now let's go through all of these and add a click event listener.
for (let i = 0; i < imageContainers.length; i++) {
  // Add event listener to the child element whichis the img element.
  imageContainers[i].children[0].addEventListener("click", (event) =>
    handleClick(event)
  );
}
// When an image is clicked, let's detect it and display results!
async function handleClick(event) {
  console.log("clicked!!!", event);
  if (!poseLandmarker) {
    console.log("Wait for poseLandmarker to load before clicking!");
    return;
  }
  const imgElement = document.querySelector("img");
  if (!imgElement.complete || imgElement.naturalWidth === 0) {
    console.warn("Image not ready yet, waiting...");
    imgElement.onload = () => runDetection(imgElement);
  } else {
    console.log("image element:", imgElement);
    console.log("img ready");
    runDetection(imgElement);
  }
}
async function runDetection(image) {
  console.log("Running detection...");
  // Remove all landmarks drawed before
  const allCanvas = event.target.getElementsByClassName("canvas");
  for (var i = allCanvas.length - 1; i >= 0; i--) {
    const n = allCanvas[i];
    n.parentNode.removeChild(n);
  }
  console.log("Detecting...", event.target);
  // We can call poseLandmarker.detect as many times as we like with
  // different image data each time. The result is returned in a callback.
  if (event.target) {
    // const image = new Image();
    // image.src = (event.target as HTMLImageElement).src;
    console.log(image);
    poseLandmarker.detect(image, (result) => {
      console.log("Got poseLandmarker result: ", result);
      const canvas = document.createElement("canvas");
      canvas.setAttribute("class", "canvas");
      canvas.setAttribute("width", image.naturalWidth + "px");
      canvas.setAttribute("height", image.naturalHeight + "px");
      canvas.style =
        "position: absolute;" +
        "left: 0px;" +
        "top: 0px;" +
        "width: " +
        image.width +
        "px;" +
        "height: " +
        image.height +
        "px;";
      image.parentNode.appendChild(canvas);
      // const canvasCtx = canvas.getContext("2d");
      const canvasCtx = canvas?.getContext("2d");
      if (!canvasCtx) {
        console.error("Failed to get 2D rendering context for the canvas");
        return;
      }
      // const drawingUtils = new DrawingUtils(canvasCtx);/
      const drawingUtils = new DrawingUtils(canvasCtx);
      for (const landmark of result.landmarks) {
        drawingUtils.drawLandmarks(landmark, {
          radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1),
        });
        drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
      }
    });
  } else {
    console.error("Event target is null");
  }
}
