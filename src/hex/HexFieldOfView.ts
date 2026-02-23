import type { AxialCoord } from "./HexCoord";
import { hexKey } from "./HexCoord";
import { hasLineOfSight } from "./HexLineOfSight";
import type { HexGrid } from "./HexGrid";

/**
 * Compute the set of hexes visible from `origin` within `maxRange`.
 *
 * This implementation uses a simple raycasting approach: for each hex
 * within range, check whether a clear line of sight exists from the origin.
 *
 * For maps up to radius 12-15 (typical tactical combat), this performs
 * well enough. For larger maps, switch to proper hex shadow casting.
 */
export function computeFieldOfView(
  grid: HexGrid,
  origin: AxialCoord,
  maxRange: number
): Set<string> {
  const visible = new Set<string>();
  visible.add(hexKey(origin.q, origin.r));

  // For each hex within range, check LoS
  for (let dq = -maxRange; dq <= maxRange; dq++) {
    for (let dr = -maxRange; dr <= maxRange; dr++) {
      const ds = -dq - dr;
      if (Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds)) > maxRange) continue;

      const target: AxialCoord = { q: origin.q + dq, r: origin.r + dr };
      if (!grid.has(target.q, target.r)) continue;

      if (hasLineOfSight(grid, origin, target)) {
        visible.add(hexKey(target.q, target.r));
      }
    }
  }

  return visible;
}
