// Compress image via Canvas API, iteratively reducing JPEG quality until the
// base64 payload is under maxBytes (accounting for ~33% base64 overhead).
export function compressImageToMaxSize(file: File, maxBytes = 500_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          } else {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

        const target = maxBytes / 0.75; // base64 string length target
        let output = canvas.toDataURL("image/jpeg", 0.85);
        for (const q of [0.7, 0.55, 0.4, 0.25]) {
          if (output.length <= target) break;
          output = canvas.toDataURL("image/jpeg", q);
        }
        resolve(output);
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Compress image via Canvas API — max 1200px, WebP preferred, falls back to JPEG
export function compressImage(file: File, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width >= height) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          } else {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        const webp = canvas.toDataURL("image/webp", quality);
        resolve(webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}
