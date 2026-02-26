import type { EffectType, TargetingType } from "./AbilityData";

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
}

// ── 7 V1 themes ──

export const THEMES: Record<string, Theme> = {
  bleeder: {
    id: "bleeder",
    name: "Bleeder",
    primaryCondition: "bleeding",
    secondaryCondition: "low_hp",
    weaponAffinity: ["sword", "cleaver", "dagger"],
    progression: [
      {
        // T1: Lacerating Strike — weapon damage + apply bleed
        role: "setup",
        effects: ["dmg_weapon", "dot_bleed"],
        conditions: { creates: ["bleeding"], exploits: [] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [3, 5],
      },
      {
        // T2: Blood Feast — weapon damage, bonus vs bleeding
        role: "payoff",
        effects: ["dmg_weapon"],
        conditions: { creates: [], exploits: ["bleeding"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [5, 8],
      },
      {
        // T3: Hemorrhage — weapon damage, extra bleed on bleeding targets
        role: "chain",
        effects: ["dmg_weapon", "dot_bleed"],
        conditions: { creates: ["bleeding"], exploits: ["bleeding"] },
        powerRange: [8, 12],
      },
      {
        // T4: Exsanguinate — heavy damage exploiting bleed + low HP
        role: "capstone",
        effects: ["dmg_execute"],
        conditions: { creates: [], exploits: ["bleeding", "low_hp"] },
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
    progression: [
      {
        // T1: Concussive Blow — damage + stun chance
        role: "setup",
        effects: ["dmg_weapon", "cc_stun"],
        conditions: { creates: ["stunned"], exploits: [] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [3, 5],
      },
      {
        // T2: Coup de Grace — heavy damage vs stunned
        role: "payoff",
        effects: ["dmg_weapon"],
        conditions: { creates: [], exploits: ["stunned"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [5, 8],
      },
      {
        // T3: Shatterguard — damage + defense debuff, stun if already debuffed
        role: "chain",
        effects: ["dmg_weapon", "debuff_stat", "cc_stun"],
        conditions: { creates: ["debuffed", "stunned"], exploits: ["debuffed"] },
        powerRange: [8, 12],
      },
      {
        // T4: Demolisher — AoE damage, double vs stunned, debuff defense
        role: "capstone",
        effects: ["dmg_weapon", "debuff_stat"],
        conditions: { creates: ["debuffed"], exploits: ["stunned"] },
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
        // T2: Follow-up Strike — damage exploiting displaced target
        role: "payoff",
        effects: ["dmg_weapon"],
        conditions: { creates: [], exploits: ["displaced"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [5, 8],
      },
      {
        // T3: Battering Ram — push + damage if collision
        role: "chain",
        effects: ["dmg_weapon", "disp_push"],
        conditions: { creates: ["displaced"], exploits: [] },
        powerRange: [8, 12],
      },
      {
        // T4: Wrecking Ball — AoE push + damage + AP refund
        role: "capstone",
        effects: ["dmg_weapon", "disp_push", "res_apRefund"],
        conditions: { creates: ["displaced"], exploits: [] },
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
    progression: [
      {
        // T1: Enfeebling Strike — damage + defense debuff
        role: "setup",
        effects: ["dmg_weapon", "debuff_stat"],
        conditions: { creates: ["debuffed"], exploits: [] },
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
        // T3: Crippling Flurry — multihit + daze + bonus per debuff
        role: "chain",
        effects: ["dmg_multihit", "cc_daze"],
        conditions: { creates: ["dazed", "debuffed"], exploits: ["debuffed"] },
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
    progression: [
      {
        // T1: Raking Cut — damage, conditional bleed when target below 50% HP
        role: "setup",
        effects: ["dmg_weapon", "dot_bleed"],
        conditions: { creates: ["bleeding"], exploits: ["low_hp"] },
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
        // T3: Eviscerate — heavy damage, bonus vs bleeding, execute threshold
        role: "chain",
        effects: ["dmg_execute"],
        conditions: { creates: [], exploits: ["bleeding", "low_hp"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [8, 12],
      },
      {
        // T4: Reaper's Toll — damage, execute threshold, on-kill: +AP + buff
        role: "capstone",
        effects: ["dmg_execute", "res_apRefund"],
        conditions: { creates: [], exploits: ["low_hp", "bleeding"] },
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
    progression: [
      {
        // T1: Spearwall stance — overwatch on adjacent entry + damage on trigger
        role: "setup",
        effects: ["stance_overwatch", "dmg_weapon"],
        conditions: { creates: ["in_stance"], exploits: [] },
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
        // T3: Stalwart Presence — stance: buff adjacent allies, debuff nearby enemies
        role: "chain",
        effects: ["stance_overwatch", "buff_stat"],
        conditions: { creates: ["in_stance", "debuffed"], exploits: [] },
        targetingConstraint: "tgt_self",
        powerRange: [8, 12],
      },
      {
        // T4: Unbreakable Wall — stance: counter all melee + ally buff
        role: "capstone",
        effects: ["stance_counter", "buff_stat"],
        conditions: { creates: ["in_stance"], exploits: ["in_stance"] },
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
    progression: [
      {
        // T1: Heavy Strike — high damage, high fatigue → drives enemies to low HP
        role: "setup",
        effects: ["dmg_weapon"],
        conditions: { creates: ["low_hp"], exploits: [] },
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
        // T3: Triumphant Cleave — AoE damage, causes bleeding → drives enemies to low HP
        role: "chain",
        effects: ["dmg_weapon", "buff_stat"],
        conditions: { creates: ["low_hp", "bleeding"], exploits: [] },
        targetingConstraint: "tgt_aoe_adjacent",
        powerRange: [8, 12],
      },
      {
        // T4: Avatar of Death — heavy damage, on-kill: full AP refund + buff
        role: "capstone",
        effects: ["dmg_execute", "res_apRefund", "buff_stat"],
        conditions: { creates: [], exploits: ["low_hp"] },
        targetingConstraint: "tgt_single_enemy",
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
  fighter:  { crusher: 3, sentinel: 2, reaper: 2, bleeder: 1, opportunist: 1, skirmisher: 1, executioner: 1 },
  spearman: { sentinel: 3, skirmisher: 2, bleeder: 1, crusher: 1, opportunist: 1, reaper: 1, executioner: 1 },
  rogue:    { bleeder: 3, executioner: 3, opportunist: 2, skirmisher: 1, crusher: 1, reaper: 1, sentinel: 1 },
  ranger:   { opportunist: 2, executioner: 2, bleeder: 2, skirmisher: 2, crusher: 1, sentinel: 1, reaper: 1 },
  brute:    { reaper: 3, crusher: 3, skirmisher: 2, bleeder: 1, executioner: 1, sentinel: 1, opportunist: 1 },
};

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
