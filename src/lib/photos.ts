// Photo rules shared by the report form and the resolution form (no backend code here).

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const PHOTO_TYPES: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const PHOTO_ACCEPT = Object.keys(PHOTO_TYPES).join(",");

/** Returns an error message, or null when the file is acceptable. */
export function validatePhoto(file: { type: string; size: number }): string | null {
  if (!PHOTO_TYPES[file.type]) return "Please choose a JPEG, PNG or WebP image.";
  if (file.size > PHOTO_MAX_BYTES) return "That photo is larger than 5 MB.";
  if (file.size === 0) return "That file is empty.";
  return null;
}
