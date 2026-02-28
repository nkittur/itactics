import type { EffectType, TargetingType } from "./AbilityData";

// ── Functional buckets ──

export type FunctionalBucket = "damage" | "dot" | "cc" | "movement" | "debuff" | "defensive" | "resource";

export const ALL_BUCKETS: FunctionalBucket[] = ["damage", "dot", "cc", "movement", "debuff", "defensive", "resource"];

/** Map each EffectType to its functional bucket. */
export const EFFECT_TO_BUCKET: Record<EffectType, FunctionalBucket> = {
  dmg_weapon: "damage",
  dmg_execute: "damage",
  dmg_multihit: "damage",
  dmg_spell: "damage",
  dot_bleed: "dot",
  dot_burn: "dot",
  dot_poison: "dot",
  disp_push: "movement",
  cc_stun: "cc",
  cc_root: "cc",
  cc_daze: "cc",
  debuff_stat: "debuff",
  debuff_vuln: "debuff",
  buff_stat: "defensive",
  buff_dmgReduce: "defensive",
  stance_counter: "defensive",
  stance_overwatch: "defensive",
  res_apRefund: "resource",
  heal_pctDmg: "resource",
};

// ── Theme progression slot ──

export interface ThemeProgressionSlot {
  /** Role of this tier in the combo chain. */
  role: "setup" | "payoff" | "chain" | "capstone";
  /** Weighted effect pool for this slot. */
  effects: EffectType[];
  /** Synergy conditions created/exploited by abilities at this tier. */
  conditions: { creates: string[]; exploits: string[] };
  /** Restrict targeting for this slot (null = tier-based default). */
  targetingConstraint?: TargetingType;
  /** Whether this slot is a passive ability. */
  isPassive?: boolean;
  /** Power budget range [min, max]. */
  powerRange: [number, number];
}

// ── Theme definition ──

export interface Theme {
  id: string;
  name: string;
  /** Primary condition the theme revolves around. */
  primaryCondition: string;
  /** Optional secondary condition for T3/T4. */
  secondaryCondition?: string;
  /** Weapon families this theme works best with. */
  weaponAffinity: string[];
  /** 4-slot progression (T1-T4). */
  progression: [ThemeProgressionSlot, ThemeProgressionSlot, ThemeProgressionSlot, ThemeProgressionSlot];
  /** Bucket weight distribution (0-10) defining which functional buckets the theme gravitates toward. */
  bucketProfile: Record<FunctionalBucket, number>;
}

// ── 7 V1 themes ──

export const THEMES: Record<string, Theme> = {
  bleeder: {
    id: "bleeder",
    name: "Bleeder",
    primaryCondition: "bleeding",
    secondaryCondition: "low_hp",
    weaponAffinity: ["sword", "cleaver", "dagger"],
    bucketProfile: { damage: 2, dot: 8, cc: 1, movement: 1, debuff: 2, defensive: 1, resource: 1 },
    progression: [
      {
        // T1: Lacerating Strike — weapon damage + apply bleed, extra effective vs weakened targets
        role: "setup",
        effects: ["dmg_weapon", "dot_bleed"],
        conditions: { creates: ["bleeding"], exploits: ["debuffed"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [3, 5],
      },
      {
        // T2: Blood Feast — weapon damage, bonus vs bleeding/poisoned, heavy blood loss disorients
        role: "payoff",
        effects: ["dmg_weapon"],
        conditions: { creates: ["dazed"], exploits: ["bleeding", "poisoned"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [5, 8],
      },
      {
        // T3: Hemorrhage — weapon damage, extra bleed on bleeding targets, heavy blood loss debilitates
        role: "chain",
        effects: ["dmg_weapon", "dot_bleed"],
        conditions: { creates: ["bleeding", "debuffed"], exploits: ["bleeding"] },
        powerRange: [8, 12],
      },
      {
        // T4: Exsanguinate — heavy damage exploiting bleed + low HP + stunned
        role: "capstone",
        effects: ["dmg_execute"],
        conditions: { creates: [], exploits: ["bleeding", "low_hp", "stunned"] },
        powerRange: [12, 18],
      },
    ],
  },

  crusher: {
    id: "crusher",
    name: "Crusher",
    primaryCondition: "stunned",
    secondaryCondition: "debuffed",
    weaponAffinity: ["mace", "flail"],
    bucketProfile: { damage: 4, dot: 0, cc: 8, movement: 2, debuff: 3, defensive: 2, resource: 1 },
    progression: [
      {
        // T1: Concussive Blow — damage + stun chance, knockback on impact
        role: "setup",
        effects: ["dmg_weapon", "cc_stun"],
        conditions: { creates: ["stunned", "displaced"], exploits: [] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [3, 5],
      },
      {
        // T2: Coup de Grace — heavy damage vs stunned, dazed, or rooted targets
        role: "payoff",
        effects: ["dmg_weapon"],
        conditions: { creates: [], exploits: ["stunned", "dazed", "rooted"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [5, 8],
      },
      {
        // T3: Shatterguard — damage + defense debuff, stun if already debuffed, massive trauma drives to low HP
        role: "chain",
        effects: ["dmg_weapon", "debuff_stat", "cc_stun"],
        conditions: { creates: ["debuffed", "stunned", "low_hp"], exploits: ["debuffed"] },
        powerRange: [8, 12],
      },
      {
        // T4: Demolisher — AoE damage, double vs stunned/displaced, debuff defense, dazes on impact
        role: "capstone",
        effects: ["dmg_weapon", "debuff_stat"],
        conditions: { creates: ["debuffed", "dazed"], exploits: ["stunned", "displaced"] },
        targetingConstraint: "tgt_aoe_adjacent",
        powerRange: [12, 18],
      },
    ],
  },

  skirmisher: {
    id: "skirmisher",
    name: "Skirmisher",
    primaryCondition: "displaced",
    weaponAffinity: ["spear", "sword", "axe"],
    bucketProfile: { damage: 3, dot: 0, cc: 2, movement: 8, debuff: 2, defensive: 1, resource: 3 },
    progression: [
      {
        // T1: Shoulder Check — damage + push
        role: "setup",
        effects: ["dmg_weapon", "disp_push"],
        conditions: { creates: ["displaced"], exploits: [] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [3, 5],
      },
      {
        // T2: Follow-up Strike — damage exploiting displaced or rooted target
        role: "payoff",
        effects: ["dmg_weapon"],
        conditions: { creates: [], exploits: ["displaced", "rooted"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [5, 8],
      },
      {
        // T3: Battering Ram — push + damage if collision, disorients and stuns on wall impact
        role: "chain",
        effects: ["dmg_weapon", "disp_push"],
        conditions: { creates: ["displaced", "debuffed", "stunned"], exploits: [] },
        powerRange: [8, 12],
      },
      {
        // T4: Wrecking Ball — AoE push + damage + AP refund, dazes on impact
        role: "capstone",
        effects: ["dmg_weapon", "disp_push", "res_apRefund"],
        conditions: { creates: ["displaced", "dazed"], exploits: [] },
        targetingConstraint: "tgt_aoe_adjacent",
        powerRange: [12, 18],
      },
    ],
  },

  opportunist: {
    id: "opportunist",
    name: "Opportunist",
    primaryCondition: "debuffed",
    secondaryCondition: "dazed",
    weaponAffinity: ["sword", "dagger", "mace"],
    bucketProfile: { damage: 3, dot: 0, cc: 3, movement: 2, debuff: 8, defensive: 1, resource: 3 },
    progression: [
      {
        // T1: Enfeebling Strike — damage + defense debuff, knocks off balance
        role: "setup",
        effects: ["dmg_weapon", "debuff_stat"],
        conditions: { creates: ["debuffed", "displaced"], exploits: [] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [3, 5],
      },
      {
        // T2: Opportunist's Eye — passive: AP on debuff applied nearby
        role: "payoff",
        effects: ["res_apRefund"],
        conditions: { creates: [], exploits: ["debuffed"] },
        isPassive: true,
        powerRange: [5, 8],
      },
      {
        // T3: Crippling Flurry — multihit + daze + bonus per debuff, extra effective vs displaced/cursed targets
        role: "chain",
        effects: ["dmg_multihit", "cc_daze"],
        conditions: { creates: ["dazed", "debuffed"], exploits: ["debuffed", "displaced", "cursed"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [8, 12],
      },
      {
        // T4: Plague of Weakness — AoE debuffs + bonus per debuff
        role: "capstone",
        effects: ["dmg_weapon", "debuff_stat", "cc_daze"],
        conditions: { creates: ["debuffed", "dazed"], exploits: ["debuffed"] },
        targetingConstraint: "tgt_aoe_adjacent",
        powerRange: [12, 18],
      },
    ],
  },

  executioner: {
    id: "executioner",
    name: "Executioner",
    primaryCondition: "low_hp",
    secondaryCondition: "bleeding",
    weaponAffinity: ["axe", "cleaver", "dagger"],
    bucketProfile: { damage: 8, dot: 3, cc: 1, movement: 0, debuff: 1, defensive: 0, resource: 4 },
    progression: [
      {
        // T1: Raking Cut — damage, conditional bleed when target below 50% HP, wounds weaken
        role: "setup",
        effects: ["dmg_weapon", "dot_bleed"],
        conditions: { creates: ["bleeding", "debuffed"], exploits: ["low_hp"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [3, 5],
      },
      {
        // T2: Smell Blood — passive: +dmg vs low HP
        role: "payoff",
        effects: [],
        conditions: { creates: [], exploits: ["low_hp"] },
        isPassive: true,
        powerRange: [5, 8],
      },
      {
        // T3: Eviscerate — heavy damage, bonus vs bleeding/stunned/vulnerable, execute threshold
        role: "chain",
        effects: ["dmg_execute"],
        conditions: { creates: [], exploits: ["bleeding", "low_hp", "stunned", "vulnerable"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [8, 12],
      },
      {
        // T4: Reaper's Toll — damage, execute threshold, on-kill: +AP + buff, bonus vs dazed
        role: "capstone",
        effects: ["dmg_execute", "res_apRefund"],
        conditions: { creates: [], exploits: ["low_hp", "bleeding", "dazed"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [12, 18],
      },
    ],
  },

  sentinel: {
    id: "sentinel",
    name: "Sentinel",
    primaryCondition: "in_stance",
    secondaryCondition: "adjacent_to_ally",
    weaponAffinity: ["spear", "polearm"],
    bucketProfile: { damage: 1, dot: 0, cc: 1, movement: 0, debuff: 2, defensive: 8, resource: 2 },
    progression: [
      {
        // T1: Spearwall stance — overwatch on adjacent entry + damage on trigger, pushes back attackers
        role: "setup",
        effects: ["stance_overwatch", "dmg_weapon"],
        conditions: { creates: ["in_stance", "displaced"], exploits: [] },
        targetingConstraint: "tgt_self",
        powerRange: [3, 5],
      },
      {
        // T2: Hold the Line — passive: +def while in stance
        role: "payoff",
        effects: ["buff_stat"],
        conditions: { creates: [], exploits: ["in_stance"] },
        isPassive: true,
        powerRange: [5, 8],
      },
      {
        // T3: Stalwart Presence — stance: buff adjacent allies, debuff and disorient nearby enemies, punish displaced/rooted targets
        role: "chain",
        effects: ["stance_overwatch", "buff_stat"],
        conditions: { creates: ["in_stance", "debuffed", "dazed"], exploits: ["displaced", "rooted"] },
        targetingConstraint: "tgt_self",
        powerRange: [8, 12],
      },
      {
        // T4: Unbreakable Wall — stance: counter all melee + ally buff, counter-attacks stun and wound
        role: "capstone",
        effects: ["stance_counter", "buff_stat"],
        conditions: { creates: ["in_stance", "stunned", "bleeding"], exploits: ["in_stance"] },
        targetingConstraint: "tgt_self",
        powerRange: [12, 18],
      },
    ],
  },

  reaper: {
    id: "reaper",
    name: "Reaper",
    primaryCondition: "low_hp",
    weaponAffinity: ["axe", "sword", "cleaver"],
    bucketProfile: { damage: 8, dot: 2, cc: 1, movement: 0, debuff: 1, defensive: 1, resource: 5 },
    progression: [
      {
        // T1: Heavy Strike — high damage, high fatigue → drives enemies to low HP, intimidating presence debuffs
        role: "setup",
        effects: ["dmg_weapon"],
        conditions: { creates: ["low_hp", "debuffed"], exploits: [] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [3, 5],
      },
      {
        // T2: Blood Rush — passive: on kill, refund AP
        role: "payoff",
        effects: ["res_apRefund"],
        conditions: { creates: [], exploits: ["low_hp"] },
        isPassive: true,
        powerRange: [5, 8],
      },
      {
        // T3: Triumphant Cleave — AoE damage, causes bleeding, stuns with impact → drives enemies to low HP
        role: "chain",
        effects: ["dmg_weapon", "buff_stat"],
        conditions: { creates: ["low_hp", "bleeding", "stunned"], exploits: [] },
        targetingConstraint: "tgt_aoe_adjacent",
        powerRange: [8, 12],
      },
      {
        // T4: Avatar of Death — heavy damage, on-kill: full AP refund + buff, extra vs debuffed/stunned/vulnerable
        role: "capstone",
        effects: ["dmg_execute", "res_apRefund", "buff_stat"],
        conditions: { creates: [], exploits: ["low_hp", "debuffed", "stunned", "vulnerable"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [12, 18],
      },
    ],
  },
  pyromaniac: {
    id: "pyromaniac",
    name: "Pyromaniac",
    primaryCondition: "burning",
    secondaryCondition: "vulnerable",
    weaponAffinity: ["mace", "flail", "staff"],
    bucketProfile: { damage: 2, dot: 8, cc: 2, movement: 0, debuff: 3, defensive: 0, resource: 1 },
    progression: [
      {
        // T1: Firebrand Strike — weapon damage + ignite target, fire weakens
        role: "setup",
        effects: ["dot_burn", "dmg_weapon"],
        conditions: { creates: ["burning", "debuffed"], exploits: [] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [3, 5],
      },
      {
        // T2: Flame Mastery — passive: +dmg vs burning/dazed targets
        role: "payoff",
        effects: [],
        conditions: { creates: [], exploits: ["burning", "dazed"] },
        isPassive: true,
        powerRange: [5, 8],
      },
      {
        // T3: Searing Vulnerability — burn + expose weakness + daze, extra vs debuffed
        role: "chain",
        effects: ["dot_burn", "debuff_vuln", "cc_daze"],
        conditions: { creates: ["burning", "vulnerable", "dazed"], exploits: ["debuffed"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [8, 12],
      },
      {
        // T4: Inferno — AoE fire damage + burn, extra vs burning/vulnerable/debuffed/dazed
        role: "capstone",
        effects: ["dmg_weapon", "dot_burn"],
        conditions: { creates: ["burning", "vulnerable"], exploits: ["burning", "vulnerable", "debuffed", "dazed"] },
        targetingConstraint: "tgt_aoe_adjacent",
        powerRange: [12, 18],
      },
    ],
  },

  venomancer: {
    id: "venomancer",
    name: "Venomancer",
    primaryCondition: "poisoned",
    secondaryCondition: "rooted",
    weaponAffinity: ["dagger", "crossbow", "throwing"],
    bucketProfile: { damage: 1, dot: 8, cc: 3, movement: 0, debuff: 4, defensive: 0, resource: 1 },
    progression: [
      {
        // T1: Venom Strike — weapon damage + poison, toxic disorientation, weakens defenses
        role: "setup",
        effects: ["dot_poison", "dmg_weapon"],
        conditions: { creates: ["poisoned", "dazed", "vulnerable"], exploits: [] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [3, 5],
      },
      {
        // T2: Binding Toxin — root + debuff, bonus vs poisoned/debuffed
        role: "payoff",
        effects: ["cc_root", "debuff_stat"],
        conditions: { creates: ["rooted", "debuffed"], exploits: ["poisoned", "debuffed"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [5, 8],
      },
      {
        // T3: Noxious Cloud — poison + daze, bonus vs debuffed/poisoned
        role: "chain",
        effects: ["dot_poison", "cc_daze"],
        conditions: { creates: ["poisoned", "dazed"], exploits: ["debuffed", "poisoned"] },
        powerRange: [8, 12],
      },
      {
        // T4: Plague Bearer — heavy poison + vulnerability, bonus vs poisoned/rooted/dazed/vulnerable
        role: "capstone",
        effects: ["dot_poison", "debuff_vuln"],
        conditions: { creates: ["poisoned", "vulnerable"], exploits: ["poisoned", "rooted", "dazed", "vulnerable"] },
        targetingConstraint: "tgt_aoe_adjacent",
        powerRange: [12, 18],
      },
    ],
  },

  warden: {
    id: "warden",
    name: "Warden",
    primaryCondition: "rooted",
    weaponAffinity: ["spear", "polearm", "mace"],
    bucketProfile: { damage: 2, dot: 0, cc: 6, movement: 3, debuff: 2, defensive: 5, resource: 1 },
    progression: [
      {
        // T1: Binding Strike — weapon damage + root, impact weakens
        role: "setup",
        effects: ["cc_root", "dmg_weapon"],
        conditions: { creates: ["rooted", "debuffed"], exploits: [] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [3, 5],
      },
      {
        // T2: Warden's Resolve — passive: damage reduction vs rooted/debuffed attackers
        role: "payoff",
        effects: ["buff_dmgReduce"],
        conditions: { creates: [], exploits: ["rooted", "debuffed"] },
        isPassive: true,
        powerRange: [5, 8],
      },
      {
        // T3: Scatter and Pin — root + push + buff, bonus vs displaced, impact stuns
        role: "chain",
        effects: ["cc_root", "disp_push", "buff_stat"],
        conditions: { creates: ["rooted", "displaced", "debuffed", "stunned"], exploits: ["displaced"] },
        powerRange: [8, 12],
      },
      {
        // T4: Earthshatter — heavy root + damage + damage reduction, bonus vs rooted/stunned/debuffed/displaced
        role: "capstone",
        effects: ["cc_root", "dmg_weapon", "buff_dmgReduce"],
        conditions: { creates: ["rooted", "stunned"], exploits: ["rooted", "stunned", "debuffed", "displaced"] },
        targetingConstraint: "tgt_aoe_adjacent",
        powerRange: [12, 18],
      },
    ],
  },

  arcanist: {
    id: "arcanist",
    name: "Arcanist",
    primaryCondition: "vulnerable",
    secondaryCondition: "dazed",
    weaponAffinity: ["staff"],
    bucketProfile: { damage: 6, dot: 0, cc: 3, movement: 0, debuff: 4, defensive: 0, resource: 2 },
    progression: [
      {
        // T1: Arcane Bolt — spell damage + expose vulnerability, arcane disruption
        role: "setup",
        effects: ["dmg_spell", "debuff_vuln"],
        conditions: { creates: ["vulnerable", "debuffed"], exploits: [] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [3, 5],
      },
      {
        // T2: Spell Attunement — passive: +dmg vs vulnerable
        role: "payoff",
        effects: [],
        conditions: { creates: [], exploits: ["vulnerable"] },
        isPassive: true,
        powerRange: [5, 8],
      },
      {
        // T3: Mind Shatter — spell damage + daze + root, bonus vs debuffed, impact stuns
        role: "chain",
        effects: ["dmg_spell", "cc_daze"],
        conditions: { creates: ["vulnerable", "dazed", "rooted", "stunned"], exploits: ["debuffed"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [8, 12],
      },
      {
        // T4: Arcane Cataclysm — AoE spell damage + vulnerability, bonus vs vulnerable/dazed
        role: "capstone",
        effects: ["dmg_spell", "debuff_vuln"],
        conditions: { creates: ["vulnerable", "dazed"], exploits: ["vulnerable", "dazed"] },
        targetingConstraint: "tgt_aoe_adjacent",
        powerRange: [12, 18],
      },
    ],
  },

  hexcurser: {
    id: "hexcurser",
    name: "Hexcurser",
    primaryCondition: "cursed",
    weaponAffinity: ["staff", "dagger"],
    bucketProfile: { damage: 2, dot: 0, cc: 3, movement: 0, debuff: 8, defensive: 0, resource: 3 },
    progression: [
      {
        // T1: Hex — debuff + vulnerability, applies curse, exposes weakness
        role: "setup",
        effects: ["debuff_stat", "debuff_vuln"],
        conditions: { creates: ["cursed", "debuffed", "vulnerable"], exploits: [] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [3, 5],
      },
      {
        // T2: Dark Insight — passive: AP refund when applying curses/debuffs
        role: "payoff",
        effects: [],
        conditions: { creates: [], exploits: ["cursed"] },
        isPassive: true,
        powerRange: [5, 8],
      },
      {
        // T3: Bane Bolt — spell damage + daze, bonus vs debuffed/cursed/vulnerable
        role: "chain",
        effects: ["dmg_spell", "cc_daze"],
        conditions: { creates: ["cursed", "vulnerable", "dazed"], exploits: ["debuffed", "cursed", "vulnerable"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [8, 12],
      },
      {
        // T4: Mass Hex — AoE curse + vulnerability + debuff, bonus vs cursed/debuffed
        role: "capstone",
        effects: ["debuff_vuln", "debuff_stat", "dmg_spell"],
        conditions: { creates: ["cursed", "vulnerable"], exploits: ["cursed", "debuffed"] },
        targetingConstraint: "tgt_aoe_adjacent",
        powerRange: [12, 18],
      },
    ],
  },
};

/**
 * Theme weights by class for recruit generation.
 * Each class has weighted themes — higher weight = more likely.
 */
export const CLASS_THEME_WEIGHTS: Record<string, Record<string, number>> = {
  fighter:   { crusher: 3, sentinel: 2, reaper: 2, warden: 1, bleeder: 1, opportunist: 1, skirmisher: 1, executioner: 1 },
  spearman:  { sentinel: 3, skirmisher: 2, warden: 2, bleeder: 1, crusher: 1, opportunist: 1, reaper: 1, executioner: 1 },
  rogue:     { bleeder: 3, executioner: 3, opportunist: 2, venomancer: 2, skirmisher: 1, crusher: 1, reaper: 1, sentinel: 1, hexcurser: 1 },
  ranger:    { opportunist: 2, executioner: 2, bleeder: 2, skirmisher: 2, venomancer: 1, crusher: 1, sentinel: 1, reaper: 1 },
  brute:     { reaper: 3, crusher: 3, skirmisher: 2, pyromaniac: 2, warden: 1, bleeder: 1, executioner: 1, sentinel: 1, opportunist: 1 },
  occultist: { arcanist: 3, hexcurser: 3, venomancer: 2, pyromaniac: 2, opportunist: 1, bleeder: 1 },
  priest:    { sentinel: 3, arcanist: 2, hexcurser: 1, warden: 2, opportunist: 1, pyromaniac: 1 },
};

/** Find themes compatible with the primary theme (shared weapons + conditions). */
export function findCompatibleThemes(primary: Theme): { theme: Theme; weight: number }[] {
  const results: { theme: Theme; weight: number }[] = [];
  const primaryConds = new Set(
    primary.progression.flatMap(s => [...s.conditions.creates, ...s.conditions.exploits]),
  );
  for (const theme of Object.values(THEMES)) {
    if (theme.id === primary.id) continue;
    const sharedWeapons = theme.weaponAffinity.filter(w => primary.weaponAffinity.includes(w));
    if (sharedWeapons.length === 0) continue;
    let weight = sharedWeapons.length * 3;
    const themeConds = new Set(
      theme.progression.flatMap(s => [...s.conditions.creates, ...s.conditions.exploits]),
    );
    for (const c of themeConds) if (primaryConds.has(c)) weight += 2;
    results.push({ theme, weight });
  }
  return results;
}

/**
 * Pick a secondary theme that complements the primary by covering different buckets.
 * Biased toward themes whose bucket profile peaks don't overlap with primary's.
 */
export function pickSecondaryTheme(primary: Theme, rng: () => number): Theme | null {
  const compatible = findCompatibleThemes(primary);
  if (compatible.length === 0) return null;

  // Score each compatible theme: higher bucket difference = more complementary
  const scored = compatible.map(({ theme, weight }) => {
    let bucketDiff = 0;
    for (const b of ALL_BUCKETS) {
      bucketDiff += Math.abs(primary.bucketProfile[b] - theme.bucketProfile[b]);
    }
    // Combine compatibility weight with bucket difference
    return { theme, score: weight * (1 + bucketDiff * 0.1) };
  });

  const totalScore = scored.reduce((s, c) => s + c.score, 0);
  let roll = rng() * totalScore;
  for (const { theme, score } of scored) {
    roll -= score;
    if (roll <= 0) return theme;
  }
  return scored[scored.length - 1]?.theme ?? null;
}

/** Pick a theme by weighted random for a character class. */
export function pickTheme(classId: string, rng: () => number): Theme {
  const weights = CLASS_THEME_WEIGHTS[classId] ?? CLASS_THEME_WEIGHTS["fighter"]!;
  const entries = Object.entries(weights);
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * totalWeight;
  for (const [themeId, w] of entries) {
    roll -= w;
    if (roll <= 0) return THEMES[themeId]!;
  }
  return THEMES["bleeder"]!;
}
