// Shared client/server image size cap. Client-side compression targets this;
// server routes re-check it as a defense-in-depth guard against oversized uploads.
export const MAX_IMAGE_BYTES = 200_000;

export function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.round((base64.length * 3) / 4);
}
