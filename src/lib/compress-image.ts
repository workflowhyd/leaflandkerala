// Client-side image compression via the Canvas API.
//
// Every uploaded image is resized to fit within MAX_DIMENSION (aspect ratio
// preserved), re-encoded as WebP (falling back to JPEG if the browser can't
// produce WebP), and quality is stepped down until the output is within the
// target size. Re-encoding through canvas also strips all EXIF metadata as a
// side effect, since canvas pixel data carries no metadata.
//
// Target: 150-200 KB. Hard cap: 200 KB — if compression can't get under the
// cap even at the lowest quality/size, `compressImageToTarget` throws so the
// caller can show a "choose a smaller image" message instead of storing an
// oversized file.

import { MAX_IMAGE_BYTES, estimateDataUrlBytes } from "@/lib/image-limits";

const MAX_DIMENSION = 1200;
const MIN_DIMENSION = 400;
const QUALITY_STEPS = [0.82, 0.7, 0.58, 0.45, 0.32, 0.2];

export class ImageTooLargeError extends Error {
  constructor() {
    super("This image is too large to compress under 200 KB. Please choose a smaller image.");
    this.name = "ImageTooLargeError";
  }
}

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

export interface CompressOptions {
  maxBytes?: number;
  maxDimension?: number;
  onProgress?: (_stage: "reading" | "resizing" | "compressing", _attempt: number) => void;
}

/**
 * Compresses an image file to WebP (or JPEG fallback), resizing and
 * iteratively lowering quality until it's under maxBytes. Throws
 * ImageTooLargeError if it still can't get under the cap.
 */
export async function compressImageToTarget(file: File, options: CompressOptions = {}): Promise<string> {
  const { maxBytes = MAX_IMAGE_BYTES, onProgress } = options;
  let maxDimension = options.maxDimension ?? MAX_DIMENSION;

  onProgress?.("reading", 0);
  const img = await loadImage(file);
  const useWebP = supportsWebP();
  const mimeType = useWebP ? "image/webp" : "image/jpeg";

  let attempt = 0;
  while (maxDimension >= MIN_DIMENSION) {
    onProgress?.("resizing", attempt);
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
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, width, height);

    for (const quality of QUALITY_STEPS) {
      attempt++;
      onProgress?.("compressing", attempt);
      const output = canvas.toDataURL(mimeType, quality);
      if (estimateDataUrlBytes(output) <= maxBytes) return output;
    }

    // Still too big at the lowest quality — shrink further and retry.
    maxDimension = Math.round(maxDimension * 0.75);
  }

  throw new ImageTooLargeError();
}
