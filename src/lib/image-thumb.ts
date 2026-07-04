// Cloudinary on-the-fly resize via URL transformation — lets list views request
// small thumbnails without re-processing or re-uploading the stored image.
// Falls back to the original URL for non-Cloudinary sources (safe no-op).
export function cloudinaryThumb(url: string, width: number, height: number): string {
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/w_${width},h_${height},c_fill,q_auto,f_auto/`);
}
