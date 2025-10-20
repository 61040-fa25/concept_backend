import assert from "assert";
import ExtractPose from "./ExtractPose.ts";
import * as path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// const assert = require("assert");
// const ExtractPose = require("./ExtractPose.ts");

(async () => {
  console.log("****Starting ExtractPose test...");
  console.log(
    pathToFileURL(
      path.join(__dirname, "../wasm/vision_wasm_internal.js"),
    ).href,
  );

  const vision = {
    wasmLoaderPath: pathToFileURL(
      path.join(__dirname, "../wasm/vision_wasm_internal.js"),
    ).href,
    wasmBinaryPath: pathToFileURL(
      path.join(__dirname, "../wasm/vision_wasm_internal.wasm"),
    ).href,
  };

  // // Mock or load a real modelBuffer
  const modelBuffer = pathToFileURL(
    path.join(__dirname, "../models/pose_landmarker.lite.task"),
  ).href; // placeholder for now

  console.log("****Loading model from: ", modelBuffer);
  const poseLandmarker = await ExtractPose.getPoseLandmarker(
    vision,
    modelBuffer,
  );

  // assert.ok(poseLandmarker, "PoseLandmarker should be created");
  // console.log("✅ PoseLandmarker successfully created:", poseLandmarker);
})();
