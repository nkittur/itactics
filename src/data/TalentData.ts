export type StatKey =
  | "hitpoints"
  | "fatigue"
  | "resolve"
  | "initiative"
  | "meleeSkill"
  | "rangedSkill"
  | "meleeDefense"
  | "rangedDefense";

export const ALL_STAT_KEYS: readonly StatKey[] = [
  "hitpoints",
  "fatigue",
  "resolve",
  "initiative",
  "meleeSkill",
  "rangedSkill",
  "meleeDefense",
  "rangedDefense",
];

/** HP and Fatigue get +1 to all roll values (wider range). */
const HIGH_RANGE_STATS: ReadonlySet<StatKey> = new Set(["hitpoints", "fatigue"]);

/**
 * Roll ranges by star count.
 * Standard stats: 0★ +1-3, 1★ +2-4, 2★ +3-5, 3★ +4-6
 * HP/FAT:         0★ +2-4, 1★ +3-5, 2★ +4-6, 3★ +5-7
 */
function rollRange(statKey: StatKey, stars: number): [number, number] {
  const clampedStars = Math.max(0, Math.min(3, stars));
  const base = HIGH_RANGE_STATS.has(statKey) ? 2 : 1;
  const min = base + clampedStars;
  const max = min + 2;
  return [min, max];
}

/** Get the [min, max] roll range for a stat at a given star level. */
export function getStatRollRange(statKey: StatKey, stars: number): [number, number] {
  return rollRange(statKey, stars);
}

/** Roll a stat increase for a given stat and star count. rng returns [0,1). */
export function rollStatIncrease(statKey: StatKey, stars: number, rng: () => number): number {
  const [min, max] = rollRange(statKey, stars);
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Generate initial talent stars (~7 total, max 3 per stat).
 * Uses uniform weights (no background weighting yet).
 * rng returns [0,1).
 */
export function generateTalentStars(rng: () => number): Record<StatKey, number> {
  const stars: Record<StatKey, number> = {
    hitpoints: 0,
    fatigue: 0,
    resolve: 0,
    initiative: 0,
    meleeSkill: 0,
    rangedSkill: 0,
    meleeDefense: 0,
    rangedDefense: 0,
  };

  // 6-8 total star points (usually 7)
  const totalPoints = 6 + Math.floor(rng() * 3); // 6, 7, or 8

  for (let i = 0; i < totalPoints; i++) {
    // Find stats that can still accept a star
    const eligible = ALL_STAT_KEYS.filter((k) => stars[k] < 3);
    if (eligible.length === 0) break;

    const idx = Math.floor(rng() * eligible.length);
    stars[eligible[idx]!]++;
  }

  return stars;
}

/** Human-readable short name for a stat key. */
export function statDisplayName(key: StatKey): string {
  switch (key) {
    case "hitpoints": return "HP";
    case "fatigue": return "Fatigue";
    case "resolve": return "Resolve";
    case "initiative": return "Initiative";
    case "meleeSkill": return "Melee Skill";
    case "rangedSkill": return "Ranged Skill";
    case "meleeDefense": return "Melee Def";
    case "rangedDefense": return "Ranged Def";
  }
}
