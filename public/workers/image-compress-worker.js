// Plain static JS (not bundled by Turbopack — see src/lib/compress-image.ts for why).
// Runs the resize/quality-step loop off the main thread so uploading a large
// photo never freezes taps/scrolling. Uses createImageBitmap/OffscreenCanvas
// (available in Workers, unlike <img>/document.createElement("canvas")).

const MIN_DIMENSION = 400;
const QUALITY_STEPS = [0.82, 0.7, 0.58, 0.45, 0.32, 0.2];

async function supportsWebP() {
  try {
    const canvas = new OffscreenCanvas(1, 1);
    const blob = await canvas.convertToBlob({ type: "image/webp" });
    return blob.type === "image/webp";
  } catch {
    return false;
  }
}

self.onmessage = async (e) => {
  const { file, maxBytes, maxDimension: startDimension } = e.data;
  try {
    const bitmap = await createImageBitmap(file);
    const mimeType = (await supportsWebP()) ? "image/webp" : "image/jpeg";
    let maxDimension = startDimension;

    while (maxDimension >= MIN_DIMENSION) {
      let width = bitmap.width;
      let height = bitmap.height;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0, width, height);

      for (const quality of QUALITY_STEPS) {
        const blob = await canvas.convertToBlob({ type: mimeType, quality });
        if (blob.size <= maxBytes) {
          self.postMessage({ ok: true, blob });
          return;
        }
      }

      maxDimension = Math.round(maxDimension * 0.75);
    }

    self.postMessage({ ok: false, error: "too_large" });
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : "unknown" });
  }
};
