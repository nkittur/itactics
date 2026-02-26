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
    progression: [
      {
        // T1: Firebrand Strike — weapon damage + ignite target
        role: "setup",
        effects: ["dot_burn", "dmg_weapon"],
        conditions: { creates: ["burning"], exploits: [] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [3, 5],
      },
      {
        // T2: Flame Mastery — passive: +dmg vs burning targets
        role: "payoff",
        effects: [],
        conditions: { creates: [], exploits: ["burning"] },
        isPassive: true,
        powerRange: [5, 8],
      },
      {
        // T3: Searing Vulnerability — burn + expose weakness, extra vs debuffed
        role: "chain",
        effects: ["dot_burn", "debuff_vuln"],
        conditions: { creates: ["burning", "vulnerable"], exploits: ["debuffed"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [8, 12],
      },
      {
        // T4: Inferno — AoE fire damage + burn, extra vs burning/vulnerable
        role: "capstone",
        effects: ["dmg_weapon", "dot_burn"],
        conditions: { creates: ["burning", "vulnerable"], exploits: ["burning", "vulnerable"] },
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
    progression: [
      {
        // T1: Venom Strike — weapon damage + poison
        role: "setup",
        effects: ["dot_poison", "dmg_weapon"],
        conditions: { creates: ["poisoned"], exploits: [] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [3, 5],
      },
      {
        // T2: Binding Toxin — root + debuff, bonus vs poisoned
        role: "payoff",
        effects: ["cc_root", "debuff_stat"],
        conditions: { creates: ["rooted", "debuffed"], exploits: ["poisoned"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [5, 8],
      },
      {
        // T3: Noxious Cloud — poison + daze, bonus vs debuffed
        role: "chain",
        effects: ["dot_poison", "cc_daze"],
        conditions: { creates: ["poisoned", "dazed"], exploits: ["debuffed"] },
        powerRange: [8, 12],
      },
      {
        // T4: Plague Bearer — heavy poison + vulnerability, bonus vs poisoned/rooted
        role: "capstone",
        effects: ["dot_poison", "debuff_vuln"],
        conditions: { creates: ["poisoned", "vulnerable"], exploits: ["poisoned", "rooted"] },
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
    progression: [
      {
        // T1: Binding Strike — weapon damage + root
        role: "setup",
        effects: ["cc_root", "dmg_weapon"],
        conditions: { creates: ["rooted"], exploits: [] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [3, 5],
      },
      {
        // T2: Warden's Resolve — passive: damage reduction vs rooted attackers
        role: "payoff",
        effects: ["buff_dmgReduce"],
        conditions: { creates: [], exploits: ["rooted"] },
        isPassive: true,
        powerRange: [5, 8],
      },
      {
        // T3: Scatter and Pin — root + push + buff, bonus vs displaced
        role: "chain",
        effects: ["cc_root", "disp_push", "buff_stat"],
        conditions: { creates: ["rooted", "displaced", "debuffed"], exploits: ["displaced"] },
        powerRange: [8, 12],
      },
      {
        // T4: Earthshatter — heavy root + damage + damage reduction, bonus vs rooted/stunned
        role: "capstone",
        effects: ["cc_root", "dmg_weapon", "buff_dmgReduce"],
        conditions: { creates: ["rooted", "stunned"], exploits: ["rooted", "stunned"] },
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
    progression: [
      {
        // T1: Arcane Bolt — spell damage + expose vulnerability
        role: "setup",
        effects: ["dmg_spell", "debuff_vuln"],
        conditions: { creates: ["vulnerable"], exploits: [] },
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
        // T3: Mind Shatter — spell damage + daze + root, bonus vs debuffed
        role: "chain",
        effects: ["dmg_spell", "cc_daze"],
        conditions: { creates: ["vulnerable", "dazed", "rooted"], exploits: ["debuffed"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [8, 12],
      },
      {
        // T4: Arcane Cataclysm — AoE spell damage + vulnerability, bonus vs vulnerable/stunned
        role: "capstone",
        effects: ["dmg_spell", "debuff_vuln"],
        conditions: { creates: ["vulnerable", "dazed"], exploits: ["vulnerable", "stunned"] },
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
    progression: [
      {
        // T1: Hex — debuff + vulnerability, applies curse
        role: "setup",
        effects: ["debuff_stat", "debuff_vuln"],
        conditions: { creates: ["cursed", "debuffed"], exploits: [] },
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
        // T3: Bane Bolt — spell damage + daze, bonus vs debuffed/cursed, applies vulnerability
        role: "chain",
        effects: ["dmg_spell", "cc_daze"],
        conditions: { creates: ["cursed", "vulnerable", "dazed"], exploits: ["debuffed", "cursed"] },
        targetingConstraint: "tgt_single_enemy",
        powerRange: [8, 12],
      },
      {
        // T4: Mass Hex — AoE curse + vulnerability + debuff, bonus vs cursed/low_hp
        role: "capstone",
        effects: ["debuff_vuln", "debuff_stat", "dmg_spell"],
        conditions: { creates: ["cursed", "vulnerable"], exploits: ["cursed", "low_hp"] },
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
