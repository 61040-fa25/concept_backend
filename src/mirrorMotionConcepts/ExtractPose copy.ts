import {
  FilesetResolver,
  NormalizedLandmark,
  PoseLandmarker,
  PoseLandmarkerOptions,
} from "@mediapipe/tasks-vision";
import { createCanvas, Image, loadImage } from "canvas";
import { JSDOM } from "jsdom"; // <-- REQUIRED IMPORT

import * as path from "https://deno.land/std@0.203.0/path/mod.ts";

// -----------------------------------------------------------------
// Creates minimal global 'document' and 'window' objects
// that the MediaPipe library needs to initialize in Node.js.
// -----------------------------------------------------------------
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
(global as any).document = dom.window.document;
(global as any).window = dom.window;
(global as any).navigator = dom.window.navigator;
(globalThis as any).self = dom.window;
(globalThis as any).Image = Image;

// const resolvePath = (base: string, relative: string): string => {
//   if (relative.startsWith("./")) {
//     // In a test environment, often the base is the execution directory.
//     // For simplicity, we assume the model is relative to the execution root.
//     // NOTE: This must be adapted if your execution environment requires a different base.
//     return relative;
//   }
//   return relative;
// };

// --- Configuration ---
// const WASM_PATH = new URL("../wasm", import.meta.url).pathname;

// const RELATIVE_MODEL_PATH = "../models/pose_landmarker_lite.task";

// // const WASM_PATH = new URL("./wasm", import.meta.url).pathname;
// // const filesetResolver = await FilesetResolver.forVisionTasks(WASM_PATH);

// const SCRIPT_DIR = path.dirname(path.fromFileUrl(import.meta.url));
// const ABSOLUTE_MODEL_PATH = path.join(SCRIPT_DIR, RELATIVE_MODEL_PATH);

const SCRIPT_DIR = path.dirname(path.fromFileUrl(import.meta.url));
const WASM_PATH = path.join(SCRIPT_DIR, "../wasm");
const MODEL_PATH = path.join(SCRIPT_DIR, "../models/pose_landmarker_lite.task");

export default class ExtractPose {
  // FIX 3: Initialize the costly resource (PoseLandmarker) only once, statically.
  private static poseLandmarker: PoseLandmarker | null = null;
  private static poseLandmarkerPromise: Promise<void>;

  /**
   * Initializes the PoseLandmarker model asynchronously.
   * This is called automatically when the class is imported.
   */
  private static async initLandmarker() {
    try {
      console.log("Initializing PoseLandmarker (One-time setup)...");

      // const modelBuffer = await Deno.readFile(MODEL_PATH);

      const filesetResolver = await FilesetResolver.forVisionTasks(WASM_PATH);
      // console.log(
      //   "FilesetResolver created from:",
      //   WASM_PATH,
      //   filesetResolver,
      //   typeof filesetResolver,
      // );

      // const wasmLoaderPath = path.join(WASM_PATH, "vision_wasm_internal.js");
      // await import(path.toFileUrl(wasmLoaderPath).href);

      // const filesetResolver = {
      //   wasmLoaderPath: path.join(WASM_PATH, "vision_wasm_internal.js"),
      //   wasmBinaryPath: path.join(WASM_PATH, "vision_wasm_internal.wasm"),
      // };

      // const options: PoseLandmarkerOptions = {
      //   baseOptions: { delegate: "GPU" },
      //   runningMode: "IMAGE",
      // };

      const filesetResolver = {
        wasmLoaderPath: path.join(WASM_PATH, "vision_wasm_internal.js"),
        wasmBinaryPath: path.join(WASM_PATH, "vision_wasm_internal.wasm"),
      };

      const modelBuffer = new Uint8Array(await Deno.readFile(MODEL_PATH));

      console.log(
        "Local model loaded:",
        modelBuffer.byteLength,
        "bytes",
        typeof modelBuffer,
      );
      console.log(modelBuffer instanceof Uint8Array); // should print true
      this.poseLandmarker = await PoseLandmarker.createFromModelBuffer(
        filesetResolver,
        modelBuffer,
      );

      console.log(
        "PoseLandmarker initialized successfully!",
        this.poseLandmarker,
      );
    } catch (error) {
      console.error(
        "FATAL ERROR: Failed to initialize PoseLandmarker. Check model path and file existence:",
        error,
      );
      // Re-throw to ensure the calling code knows the initialization failed
      throw error;
    }
  }

  // Kick off the initialization immediately when the module loads
  static {
    ExtractPose.poseLandmarkerPromise = ExtractPose.initLandmarker();
  }

  /**
   * Extracts pose landmarks from a local image file.
   * @param imagePath The full path to the image file.
   * @returns The NormalizedLandmarkList[] result or null if no pose is found.
   */
  static async extractPoseFromImage(
    imagePath: string,
  ): Promise<NormalizedLandmark[][] | null> {
    // Wait for the model to be fully initialized before proceeding
    await ExtractPose.poseLandmarkerPromise;

    if (!ExtractPose.poseLandmarker) {
      console.error(
        "PoseLandmarker is not available due to a prior initialization failure.",
      );
      return null;
    }

    try {
      console.log(`Starting Pose Extraction for: ${imagePath}...`);

      // 1. Load the local image using the canvas library
      const imageElement: Image = await loadImage(imagePath);
      console.log(
        `Image loaded: ${imageElement.width}x${imageElement.height}`,
      );

      // 2. Run detection (Type assertion for Node/TS compatibility)
      const result = ExtractPose.poseLandmarker.detect(
        imageElement as unknown as TexImageSource,
      );

      // 3. Process results
      if (result.landmarks && result.landmarks.length > 0) {
        console.log(
          `\n--- Detection Successful! Found ${result.landmarks.length} pose(s) ---`,
        );
        // Note: Returning the full landmark array instead of just logging
        return result.landmarks;
      } else {
        console.log("No poses detected.");
        return null;
      }
    } catch (error) {
      console.error("An error occurred during pose extraction:", error);
      return null;
    }
  }

  static close() {
    if (ExtractPose.poseLandmarker) {
      ExtractPose.poseLandmarker.close();
      ExtractPose.poseLandmarker = null;
      console.log("PoseLandmarker resources cleaned up.");
    }
  }
}
