import type { HexGrid, HexTile } from "@hex/HexGrid";

export const MAX_AP = 9;

/**
 * Manages action points for a single unit's turn.
 * Every action (move, attack, recover) costs AP.
 */
export class ActionPointManager {
  private current = MAX_AP;

  resetForTurn(): void {
    this.current = MAX_AP;
  }

  canAfford(cost: number): boolean {
    return this.current >= cost;
  }

  spend(cost: number): boolean {
    if (!this.canAfford(cost)) return false;
    this.current -= cost;
    return true;
  }

  get remaining(): number {
    return this.current;
  }
}

/**
 * AP cost to move from one tile to an adjacent tile.
 * Flat/road/sand: 2, forest/snow/hills: 3, swamp: 4, uphill: +1 per level.
 */
export function tileAPCost(grid: HexGrid, from: HexTile, to: HexTile): number {
  if (to.terrain === "water" || to.terrain === "mountains") return Infinity;
  if (to.occupant !== null) return Infinity;

  let ap: number;
  switch (to.terrain) {
    case "forest":
    case "snow":
    case "hills":
      ap = 3;
      break;
    case "swamp":
      ap = 4;
      break;
    default: // grass, road, sand
      ap = 2;
      break;
  }

  const elevDiff = to.elevation - from.elevation;
  if (elevDiff > 0) ap += elevDiff;

  return ap;
}

/**
 * Fatigue cost to move from one tile to an adjacent tile.
 * Flat: 4, forest/snow: 6, swamp: 8, uphill: +2/level, downhill: -1 (min 2).
 */
export function tileFatigueCost(_grid: HexGrid, from: HexTile, to: HexTile): number {
  let fat: number;
  switch (to.terrain) {
    case "forest":
    case "snow":
    case "hills":
      fat = 6;
      break;
    case "swamp":
      fat = 8;
      break;
    default:
      fat = 4;
      break;
  }

  const elevDiff = to.elevation - from.elevation;
  if (elevDiff > 0) {
    fat += elevDiff * 2;
  } else if (elevDiff < 0) {
    fat = Math.max(2, fat + elevDiff); // downhill saves fatigue
  }

  return fat;
}

/**
 * Calculate total AP cost for a movement path.
 */
export function pathAPCost(grid: HexGrid, path: Array<{ q: number; r: number }>, startQ: number, startR: number): number {
  let total = 0;
  let prevTile = grid.get(startQ, startR);
  if (!prevTile) return Infinity;

  for (const step of path) {
    const nextTile = grid.get(step.q, step.r);
    if (!nextTile) return Infinity;
    total += tileAPCost(grid, prevTile, nextTile);
    prevTile = nextTile;
  }
  return total;
}

/**
 * Calculate total fatigue cost for a movement path.
 */
export function pathFatigueCost(grid: HexGrid, path: Array<{ q: number; r: number }>, startQ: number, startR: number): number {
  let total = 0;
  let prevTile = grid.get(startQ, startR);
  if (!prevTile) return Infinity;

  for (const step of path) {
    const nextTile = grid.get(step.q, step.r);
    if (!nextTile) return Infinity;
    total += tileFatigueCost(grid, prevTile, nextTile);
    prevTile = nextTile;
  }
  return total;
}
