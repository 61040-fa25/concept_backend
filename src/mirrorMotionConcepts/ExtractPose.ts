// @ts-nocheck: MediaPipe library lacks TypeScript types

import { createCanvas, Image, loadImage } from "canvas";
import { JSDOM } from "jsdom";
import * as path from "https://deno.land/std@0.203.0/path/mod.ts";
import { Worker as NodeWorker } from "worker_threads";

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

// if (typeof (globalThis as any).Worker === "undefined") {
//   (globalThis as any).Worker = NodeWorker;
// }

import {
  FilesetResolver,
  NormalizedLandmark,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";

const SCRIPT_DIR = path.dirname(path.fromFileUrl(import.meta.url));
const WASM_PATH = path.join(SCRIPT_DIR, "../wasm");
const MODEL_PATH = path.join(SCRIPT_DIR, "../models/pose_landmarker_lite.task");

export default class ExtractPose {
  public static poseLandmarker: PoseLandmarker | null = null;
  private static poseLandmarkerPromise: Promise<void> | null = null;

  public static async getVision(): Promise<any> {
    console.log("in getVision...");
    const vision = await FilesetResolver.forVisionTasks(
      path.toFileUrl(path.join(SCRIPT_DIR, "../wasm")).href,
    );

    // const vision = await FilesetResolver.forVisionTasks(
    //   "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm",
    // );
    console.log("FilesetResolver loaded:", vision);
    return vision;
  }

  public static async getModelBuffer(): Promise<Uint8Array> {
    console.log("in getModelBuffer...");
    const modelBuffer = new Uint8Array(await Deno.readFile(MODEL_PATH));
    console.log("Local model loaded:", modelBuffer.byteLength, "bytes");
    return modelBuffer;
  }

  // public static async getPoseLandmarker(
  //   vision: any,
  //   modelBuffer: Uint8Array,
  // ): Promise<PoseLandmarker> {
  //   console.log("in getPoseLandmarker...");
  //   const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
  //     baseOptions: { modelAssetBuffer: modelBuffer, delegate: "CPU" },
  //     numPoses: 2,
  //   });

  //   console.log("PoseLandmarker created:", poseLandmarker);
  //   return poseLandmarker;
  // }

  public static async getPoseLandmarker(
    vision: any,
    modelBuffer: string,
  ): Promise<PoseLandmarker> {
    console.log("in getPoseLandmarker...");
    const poseLandmarker = await PoseLandmarker.createFromModelPath(
      vision,
      modelBuffer,
    );

    console.log("PoseLandmarker created:", poseLandmarker);
    return poseLandmarker;
  }
  public static async initLandmarker(): Promise<PoseLandmarker> {
    // console.log("in initLandmarker1...", this.poseLandmarkerPromise);

    // if (this.poseLandmarkerPromise) {
    //   console.log("PoseLandmarker already initializing...");
    //   // If already initializing, wait for it
    //   return this.poseLandmarkerPromise;
    // }

    // this.poseLandmarkerPromise = async () => {
    //   console.log("in initLandmarker2 before...");
    //   if (this.poseLandmarker) return; // Already initialized

    //   console.log("in initLandmarker2...");

    //   const vision = await this.getVision();
    //   const modelBuffer = await this.getModelBuffer();
    //   console.log("got vision and modelBuffer", vision, modelBuffer);

    //   this.poseLandmarker = await this.getPoseLandmarker(vision, modelBuffer);

    //   console.log("*** PoseLandmarker is loaded ***", this.poseLandmarker);
    // };
    console.log("in initLandmarker2 before...", this.poseLandmarker);
    // if (this.poseLandmarker) return; // Already initialized

    console.log("in initLandmarker2...");

    const vision = await this.getVision();
    const modelBuffer = await this.getModelBuffer();
    console.log("got vision and modelBuffer", vision, modelBuffer);

    this.poseLandmarker = await this.getPoseLandmarker(vision, modelBuffer);

    console.log("*** PoseLandmarker is loaded ***", this.poseLandmarker);

    console.log("in initLandmarker3...");
    return this.poseLandmarker;
  }

  public static async detect(img: Image): Promise<NormalizedLandmark[][]> {
    console.log("in detect...", this.poseLandmarker);
    if (!this.poseLandmarker) await this.initLandmarker;

    console.log("PoseLandmarker ready:", this.poseLandmarker);

    const result = await ExtractPose.poseLandmarker!.detect(
      img as unknown as HTMLImageElement,
    );
    return result.landmarks;
  }
}
