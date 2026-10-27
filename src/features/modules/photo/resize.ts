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
