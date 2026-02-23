import type { AxialCoord, CubeCoord } from "./HexCoord";
import { axialToCube, cubeToAxial } from "./HexCoord";
import { hexDistance } from "./HexMath";
import type { HexGrid } from "./HexGrid";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function cubeLerp(a: CubeCoord, b: CubeCoord, t: number): CubeCoord {
  return {
    q: lerp(a.q, b.q, t),
    r: lerp(a.r, b.r, t),
    s: lerp(a.s, b.s, t),
  };
}

function cubeRound(q: number, r: number, s: number): CubeCoord {
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);

  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }

  return { q: rq, r: rr, s: rs };
}

/**
 * Draw a hex line from `a` to `b`.
 * Returns every hex along the line, including start and end.
 * Nudges the start slightly to avoid ambiguous midpoint snapping.
 */
export function hexLineDraw(a: AxialCoord, b: AxialCoord): AxialCoord[] {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  const dist = hexDistance(a, b);
  if (dist === 0) return [{ q: a.q, r: a.r }];

  // Nudge to avoid ties at edge midpoints
  const nudgedA: CubeCoord = {
    q: ac.q + 1e-6,
    r: ac.r + 1e-6,
    s: ac.s - 2e-6,
  };
  const nudgedB: CubeCoord = {
    q: bc.q + 1e-6,
    r: bc.r + 1e-6,
    s: bc.s - 2e-6,
  };

  const results: AxialCoord[] = [];
  for (let i = 0; i <= dist; i++) {
    const t = i / dist;
    const lerped = cubeLerp(nudgedA, nudgedB, t);
    const rounded = cubeRound(lerped.q, lerped.r, lerped.s);
    results.push(cubeToAxial(rounded));
  }
  return results;
}

/**
 * Check line of sight from `source` to `target`.
 * Returns true if the line is clear (no blocking hexes between them).
 * The source and target hexes themselves are NOT checked for blocking.
 *
 * Elevation rule: a hex blocks LoS only if its elevation is >= both
 * the source elevation and the target elevation.
 */
export function hasLineOfSight(
  grid: HexGrid,
  source: AxialCoord,
  target: AxialCoord
): boolean {
  const line = hexLineDraw(source, target);

  const sourceTile = grid.get(source.q, source.r);
  const targetTile = grid.get(target.q, target.r);
  if (!sourceTile || !targetTile) return false;

  const sourceElev = sourceTile.elevation;
  const targetElev = targetTile.elevation;

  // Check intermediate hexes (skip first = source, skip last = target)
  for (let i = 1; i < line.length - 1; i++) {
    const hex = line[i]!;
    const tile = grid.get(hex.q, hex.r);
    if (!tile) return false; // off-grid = blocked

    if (tile.blocksLoS && tile.elevation >= sourceElev && tile.elevation >= targetElev) {
      return false;
    }
  }

  return true;
}
