import type { AxialCoord } from "./HexCoord";
import { axialToCube } from "./HexCoord";

/**
 * Hex distance (minimum number of steps between two hexes).
 * Uses the cube-coordinate formula: max(|dq|, |dr|, |ds|)
 * which is equivalent to (|dq| + |dr| + |ds|) / 2.
 */
export function hexDistance(a: AxialCoord, b: AxialCoord): number {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  return Math.max(
    Math.abs(ac.q - bc.q),
    Math.abs(ac.r - bc.r),
    Math.abs(ac.s - bc.s)
  );
}

/**
 * The six axial direction vectors, indexed 0-5 starting from east,
 * proceeding counter-clockwise.
 *
 *   0: (+1,  0)  East
 *   1: (+1, -1)  Northeast
 *   2: ( 0, -1)  Northwest
 *   3: (-1,  0)  West
 *   4: (-1, +1)  Southwest
 *   5: ( 0, +1)  Southeast
 */
export const HEX_DIRECTIONS: readonly AxialCoord[] = [
  { q: +1, r:  0 },
  { q: +1, r: -1 },
  { q:  0, r: -1 },
  { q: -1, r:  0 },
  { q: -1, r: +1 },
  { q:  0, r: +1 },
] as const;

/** Return the neighbor of (q, r) in the given direction (0-5). */
export function hexNeighbor(q: number, r: number, direction: number): AxialCoord {
  const d = HEX_DIRECTIONS[direction]!;
  return { q: q + d.q, r: r + d.r };
}

/** Return all six neighbors. */
export function hexNeighbors(q: number, r: number): AxialCoord[] {
  return HEX_DIRECTIONS.map((d) => ({ q: q + d.q, r: r + d.r }));
}

/**
 * Return all hexes exactly `radius` steps away (a hex ring).
 * Start at the hex `radius` steps in direction 4 (southwest),
 * then walk around the ring in 6 segments.
 */
export function hexRing(center: AxialCoord, radius: number): AxialCoord[] {
  if (radius === 0) return [{ q: center.q, r: center.r }];

  const results: AxialCoord[] = [];
  // Start position: move `radius` steps in direction 4
  let q = center.q + HEX_DIRECTIONS[4]!.q * radius;
  let r = center.r + HEX_DIRECTIONS[4]!.r * radius;

  for (let side = 0; side < 6; side++) {
    for (let step = 0; step < radius; step++) {
      results.push({ q, r });
      const dir = HEX_DIRECTIONS[side]!;
      q += dir.q;
      r += dir.r;
    }
  }
  return results;
}

/** Return all hexes within `radius` steps (a filled hex area). */
export function hexSpiral(center: AxialCoord, radius: number): AxialCoord[] {
  const results: AxialCoord[] = [{ q: center.q, r: center.r }];
  for (let r = 1; r <= radius; r++) {
    results.push(...hexRing(center, r));
  }
  return results;
}
