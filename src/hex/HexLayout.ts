import type { AxialCoord } from "./HexCoord";

const SQRT3 = Math.sqrt(3);

export interface HexLayout {
  /** Outer radius: center to vertex. */
  readonly size: number;
  /** Pixel offset of the grid origin. */
  readonly originX: number;
  readonly originY: number;
}

export function createLayout(size: number, originX = 0, originY = 0): HexLayout {
  return { size, originX, originY };
}

/** Convert axial (q, r) to pixel (x, y). Flat-top orientation. */
export function hexToPixel(layout: HexLayout, q: number, r: number): { x: number; y: number } {
  const x = layout.size * (SQRT3 * q + (SQRT3 / 2) * r) + layout.originX;
  const y = layout.size * ((3 / 2) * r) + layout.originY;
  return { x, y };
}

/**
 * Convert pixel (x, y) to fractional axial coordinates.
 * The result must be rounded to find the nearest hex.
 */
export function pixelToFractionalHex(
  layout: HexLayout,
  px: number,
  py: number
): { q: number; r: number } {
  const x = px - layout.originX;
  const y = py - layout.originY;
  const q = ((SQRT3 / 3) * x - (1 / 3) * y) / layout.size;
  const r = ((2 / 3) * y) / layout.size;
  return { q, r };
}

/**
 * Round fractional axial coordinates to the nearest integer hex.
 * Works by converting to fractional cube, rounding each component,
 * then correcting the component with the largest rounding error.
 */
export function hexRound(fq: number, fr: number): AxialCoord {
  const fs = -fq - fr;
  let q = Math.round(fq);
  let r = Math.round(fr);
  let s = Math.round(fs);

  const qDiff = Math.abs(q - fq);
  const rDiff = Math.abs(r - fr);
  const sDiff = Math.abs(s - fs);

  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - s;
  } else if (rDiff > sDiff) {
    r = -q - s;
  }
  // else s = -q - r (implicit, we only store q and r)

  return { q, r };
}

/** Full pixel-to-hex: convert pixel to fractional, then round. */
export function pixelToHex(layout: HexLayout, px: number, py: number): AxialCoord {
  const frac = pixelToFractionalHex(layout, px, py);
  return hexRound(frac.q, frac.r);
}
