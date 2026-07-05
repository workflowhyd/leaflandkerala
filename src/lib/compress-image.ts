// Client-side image compression.
//
// The actual resize/quality-step loop runs in a Web Worker
// (public/workers/image-compress-worker.js) so uploading a large photo never
// freezes taps/scrolling on the main thread — this was the main cause of the
// app "freezing for a few seconds" on low-end Android phones (a single photo
// could take up to ~24 synchronous canvas encodes).
//
// The worker is a plain static JS file served from /public rather than a
// bundled TS module: Turbopack's `new Worker(new URL("./x.ts", import.meta.url))`
// pattern (the standard Webpack 5 idiom) does NOT compile the referenced file —
// it copies the raw, unparseable TypeScript source to the static output as-is.
// A plain-JS file under /public sidesteps bundling entirely and just works.
//
// Falls back to the old synchronous main-thread implementation if Web Workers or
// OffscreenCanvas aren't available, so image upload never breaks entirely — it
// just loses the responsiveness benefit on that one unsupported device/browser.

import { MAX_IMAGE_BYTES, estimateDataUrlBytes } from "@/lib/image-limits";

interface CompressWorkerRequest {
  file: File;
  maxBytes: number;
  maxDimension: number;
}

type CompressWorkerResponse = { ok: true; blob: Blob } | { ok: false; error: string };

const MAX_DIMENSION = 1200;
const MIN_DIMENSION = 400;
const QUALITY_STEPS = [0.82, 0.7, 0.58, 0.45, 0.32, 0.2];

export class ImageTooLargeError extends Error {
  constructor() {
    super("This image is too large to compress under 200 KB. Please choose a smaller image.");
    this.name = "ImageTooLargeError";
  }
}

export interface CompressOptions {
  maxBytes?: number;
  maxDimension?: number;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read compressed image."));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

function workerSupported(): boolean {
  return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined";
}

function compressViaWorker(file: File, maxBytes: number, maxDimension: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker("/workers/image-compress-worker.js");
    } catch (err) {
      reject(err);
      return;
    }

    worker.onmessage = async (e: MessageEvent<CompressWorkerResponse>) => {
      worker.terminate();
      if (!e.data.ok) {
        reject(e.data.error === "too_large" ? new ImageTooLargeError() : new Error(e.data.error));
        return;
      }
      try {
        resolve(await blobToDataUrl(e.data.blob));
      } catch (err) {
        reject(err);
      }
    };
    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };

    const request: CompressWorkerRequest = { file, maxBytes, maxDimension };
    worker.postMessage(request);
  });
}

// ─── Fallback: synchronous main-thread compression ────────────────────────────
// Used only if Workers/OffscreenCanvas aren't available, or the worker fails.

function supportsWebP(): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL("image/webp").startsWith("data:image/webp");
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file isn't a valid image."));
      img.onload = () => resolve(img);
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function compressOnMainThread(file: File, maxBytes: number, maxDimension: number): Promise<string> {
  const img = await loadImage(file);
  const mimeType = supportsWebP() ? "image/webp" : "image/jpeg";

  while (maxDimension >= MIN_DIMENSION) {
    let { width, height } = img;
    if (width > maxDimension || height > maxDimension) {
      if (width >= height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

    for (const quality of QUALITY_STEPS) {
      const output = canvas.toDataURL(mimeType, quality);
      if (estimateDataUrlBytes(output) <= maxBytes) return output;
    }

    maxDimension = Math.round(maxDimension * 0.75);
  }

  throw new ImageTooLargeError();
}

/**
 * Compresses an image file to WebP (or JPEG fallback), resizing and iteratively
 * lowering quality until it's under maxBytes. Runs in a Web Worker when available
 * (keeps the UI responsive), falling back to the main thread otherwise. Throws
 * ImageTooLargeError if it still can't get under the cap.
 */
export async function compressImageToTarget(file: File, options: CompressOptions = {}): Promise<string> {
  const maxBytes = options.maxBytes ?? MAX_IMAGE_BYTES;
  const maxDimension = options.maxDimension ?? MAX_DIMENSION;

  if (workerSupported()) {
    try {
      return await compressViaWorker(file, maxBytes, maxDimension);
    } catch (err) {
      if (err instanceof ImageTooLargeError) throw err;
      // Worker failed to initialize/run for some other reason — fall back.
    }
  }

  return compressOnMainThread(file, maxBytes, maxDimension);
}
