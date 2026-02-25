/**
 * XP requirements per level (from planning/02-classes-and-perks.md).
 * Index i = XP needed to advance FROM level (i+1) TO level (i+2).
 * E.g. XP_TABLE[0] = 200 means level 1→2 costs 200 XP.
 */
export const XP_TABLE: readonly number[] = [
  200,   // 1→2
  400,   // 2→3
  600,   // 3→4
  800,   // 4→5
  1100,  // 5→6
  1400,  // 6→7
  1800,  // 7→8
  2300,  // 8→9
  2900,  // 9→10
  3600,  // 10→11
];

export const VETERAN_XP = 4500;
export const MAX_REGULAR_LEVEL = 11;

/** XP needed to go from `currentLevel` to `currentLevel + 1`. */
export function xpForNextLevel(currentLevel: number): number {
  if (currentLevel < 1) return XP_TABLE[0]!;
  if (currentLevel >= MAX_REGULAR_LEVEL) return VETERAN_XP;
  return XP_TABLE[currentLevel - 1] ?? VETERAN_XP;
}

/** Cumulative XP threshold to reach `targetLevel` from level 1. */
export function cumulativeXPForLevel(targetLevel: number): number {
  let total = 0;
  for (let lv = 1; lv < targetLevel; lv++) {
    total += xpForNextLevel(lv);
  }
  return total;
}

/** Whether a unit with the given level and total XP can level up. */
export function canLevelUp(level: number, totalXP: number): boolean {
  return totalXP >= cumulativeXPForLevel(level + 1);
}
