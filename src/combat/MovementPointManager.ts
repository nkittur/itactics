import type { HexGrid, HexTile } from "@hex/HexGrid";
import { getArmorDef } from "@data/ArmorData";
import { getShield } from "@data/ShieldData";

export const DEFAULT_MP = 8;

/**
 * Manages movement points for a single unit's turn.
 * Movement uses MP; attacks use AP (separate pool).
 */
export class MovementPointManager {
  private current = 0;
  private max = DEFAULT_MP;

  resetForTurn(maxMP: number): void {
    this.max = maxMP;
    this.current = maxMP;
  }

  canAfford(cost: number): boolean {
    return this.current >= cost;
  }

  spend(cost: number): boolean {
    if (cost > 0 && !this.canAfford(cost)) return false;
    this.current -= cost;
    return true;
  }

  get remaining(): number {
    return this.current;
  }

  get maximum(): number {
    return this.max;
  }
}

/**
 * MP cost to move from one tile to an adjacent tile.
 * Flat/road/sand: 2, forest/snow/hills: 3, swamp: 4, uphill: +1 per level.
 */
export function tileMPCost(grid: HexGrid, from: HexTile, to: HexTile): number {
  if (to.terrain === "water" || to.terrain === "mountains") return Infinity;
  if (to.occupant !== null) return Infinity;

  let mp: number;
  switch (to.terrain) {
    case "forest":
    case "snow":
    case "hills":
      mp = 3;
      break;
    case "swamp":
      mp = 4;
      break;
    default: // grass, road, sand
      mp = 2;
      break;
  }

  const elevDiff = to.elevation - from.elevation;
  if (elevDiff > 0) mp += elevDiff;

  return mp;
}

/**
 * Calculate total MP cost for a movement path.
 */
export function pathMPCost(
  grid: HexGrid,
  path: Array<{ q: number; r: number }>,
  startQ: number,
  startR: number,
): number {
  let total = 0;
  let prevTile = grid.get(startQ, startR);
  if (!prevTile) return Infinity;

  for (const step of path) {
    const nextTile = grid.get(step.q, step.r);
    if (!nextTile) return Infinity;
    total += tileMPCost(grid, prevTile, nextTile);
    prevTile = nextTile;
  }
  return total;
}

/**
 * Compute effective MP after armor and shield penalties.
 * Minimum 2 MP so a unit can always move at least one hex.
 */
export function getEffectiveMP(
  baseMP: number,
  bodyArmorId?: string,
  headArmorId?: string,
  shieldId?: string,
): number {
  let mp = baseMP;
  if (bodyArmorId) {
    const def = getArmorDef(bodyArmorId);
    if (def) mp -= def.mpPenalty;
  }
  if (headArmorId) {
    const def = getArmorDef(headArmorId);
    if (def) mp -= def.mpPenalty;
  }
  if (shieldId) {
    const def = getShield(shieldId);
    if (def) mp -= def.mpPenalty;
  }
  return Math.max(2, mp);
}
