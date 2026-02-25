import type { World } from "@entities/World";
import type { StatsComponent } from "@entities/components/Stats";
import { canLevelUp } from "@data/LevelData";

/** XP constants. */
const XP_PER_KILL = 50;
const SURVIVAL_BONUS = 30;
const VICTORY_BONUS = 100;

export interface XPAward {
  entityId: string;
  name: string;
  xpGained: number;
  newTotal: number;
  leveledUp: boolean;
  newLevel: number;
}

/**
 * Calculate and apply XP for all surviving player units after a battle.
 * Mutates stats.experience in-place.
 */
export function calculateBattleXP(
  victory: boolean,
  killCount: number,
  survivors: string[],
  world: World,
): XPAward[] {
  if (survivors.length === 0) return [];

  // Pool kill XP equally among survivors
  const pooledKillXP = Math.floor((killCount * XP_PER_KILL) / survivors.length);

  const awards: XPAward[] = [];

  for (const entityId of survivors) {
    const stats = world.getComponent<StatsComponent>(entityId, "stats");
    if (!stats) continue;

    const team = world.getComponent<{ readonly type: "team"; team: string; name: string }>(entityId, "team");
    const name = team?.name ?? entityId;

    let xp = pooledKillXP + SURVIVAL_BONUS;
    if (victory) xp += VICTORY_BONUS;

    stats.experience += xp;

    const leveledUp = canLevelUp(stats.level, stats.experience);

    awards.push({
      entityId,
      name,
      xpGained: xp,
      newTotal: stats.experience,
      leveledUp,
      newLevel: stats.level,
    });
  }

  return awards;
}
