/**
 * Geometry and Coordinate Normalization Utilities
 * Supports seamless interop between percentage coordinates (0 - 100%)
 * and raw pixel coordinates (> 100px) across different canvas dimensions.
 */

export function normalizeCoord(val, totalDimension = 1080, defaultVal = 0) {
  if (val === undefined || val === null || isNaN(Number(val))) return defaultVal;
  const num = Number(val);
  // If the number exceeds 100, it was saved in raw pixels
  if (num > 100 && totalDimension > 0) {
    return Math.round(((num / totalDimension) * 100) * 10) / 10;
  }
  return Math.round(num * 10) / 10;
}

export function normalizeGeometry(geo, canvasWidth = 1080, canvasHeight = 1350, defaults = {}) {
  const cw = Number(canvasWidth) || 1080;
  const ch = Number(canvasHeight) || 1350;
  return {
    x: normalizeCoord(geo?.x, cw, defaults.x ?? 0),
    y: normalizeCoord(geo?.y, ch, defaults.y ?? 0),
    width: Math.max(4, normalizeCoord(geo?.width, cw, defaults.width ?? 30)),
    height: Math.max(3, normalizeCoord(geo?.height, ch, defaults.height ?? 20)),
    rotation: Number(geo?.rotation) || 0,
  };
}
