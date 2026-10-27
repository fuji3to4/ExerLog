import type { NewPhoto } from "./repository";

/** Longest edge, in pixels, of a stored photo. */
export const PHOTO_MAX_EDGE = 1600;

/** Scales (width, height) so the long edge is at most `maxEdge`. Never enlarges; rounds to integers. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number = PHOTO_MAX_EDGE,
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxEdge) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close(): void }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Shrinks a picture to JPEG (long edge at most PHOTO_MAX_EDGE, quality 0.8). Rejects when it cannot be read. */
export async function resizeImage(file: Blob): Promise<NewPhoto> {
  const decoded = await decode(file);
  try {
    if (!decoded.width || !decoded.height) {
      throw new Error("Unreadable image");
    }
    const { width, height } = fitWithin(decoded.width, decoded.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not available");
    }
    context.drawImage(decoded.source, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    if (!blob) {
      throw new Error("Could not encode the image");
    }
    return { blob, width, height };
  } finally {
    decoded.close();
  }
}
