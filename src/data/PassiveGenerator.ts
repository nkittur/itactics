import type {
  GeneratedAbility,
  EffectPrimitive,
  TriggerPrimitive,
  EffectType,
  TriggerType,
  Rarity,
} from "./AbilityData";
import { generateAbilityUID } from "./AbilityData";
import { registerAbility } from "./AbilityResolver";
import { applyRarityScaling } from "./AbilityGenerator";

// ── Passive archetypes ──

type PassiveArchetype =
  | "condition_exploiter"   // +damage vs a condition the actives create
  | "kill_rewarder"         // AP refund or buff on kill
  | "debuff_amplifier"      // AP refund or bonus when applying debuffs
  | "reactive_defender"     // buff stat or reduce damage when hit
  | "sustained_fighter"     // turn-start buff for high-stamina builds
  | "stack_builder"         // stacking buff on each hit landed
  | "dot_amplifier"         // bonus damage when target has active DoT
  | "damage_booster"        // flat +X bonus damage
  | "stat_scaler";          // damage scaling from a stat

interface ArchetypeWeight {
  archetype: PassiveArchetype;
  weight: number;
}

// ── Passive naming tables ──

// Condition-specific names for condition_exploiter passives
const CONDITION_NAME_POOL: Record<string, string[]> = {
  bleeding: [
    "Smell Blood", "Bleed Feeder", "Wound Sense", "Crimson Tracker",
    "Gore Scent", "Blood in the Water", "Open Wound Sense",
  ],
  stunned: [
    "Exploit Daze", "Capitalize", "Coup de Grace Instinct", "Dazed Prey",
    "Shatter Focus", "Stunned Quarry", "Concussed Mark",
  ],
  debuffed: [
    "Weakness Seeker", "Exploit Opening", "Prey on the Weak",
    "Vulture's Gaze", "Exposed Nerve", "Read Weakness",
  ],
  displaced: [
    "Off-Balance Exploit", "Scramble Punisher", "Pursuit Instinct",
    "Predator's Chase", "Follow Through", "Knock-Back Strike",
  ],
  low_hp: [
    "Merciless Eye", "Scavenger's Eye", "Killing Instinct",
    "Death Sense", "Carrion Sense", "Savage Finish",
  ],
  in_stance: [
    "Disciplined Focus", "Stance Mastery", "Rooted Power",
    "Fortified Instinct", "Steadfast Precision", "Grounded Strike",
  ],
  dazed: [
    "Daze Exploit", "Disoriented Prey", "Befuddled Target",
    "Jarring Insight", "Crippled Focus", "Stagger Punisher",
  ],
  burning: [
    "Flame Feeder", "Burn Exploit", "Pyromaniac's Eye",
    "Fire Sense", "Searing Focus", "Ember Tracker",
  ],
  poisoned: [
    "Venom Exploit", "Toxic Opportunist", "Poison Feeder",
    "Blight Sense", "Corruption Eye", "Festering Focus",
  ],
  vulnerable: [
    "Weakness Punisher", "Exposed Target", "Vulnerability Exploit",
    "Shattered Guard", "Open Wound", "Critical Eye",
  ],
  rooted: [
    "Root Exploit", "Anchored Prey", "Immobile Target",
    "Binding Focus", "Pinned Quarry", "Entrapped Strike",
  ],
  cursed: [
    "Curse Exploit", "Hexed Prey", "Dark Opportunist",
    "Affliction Sense", "Doom Feeder", "Bane Strike",
  ],
};

const PASSIVE_NAME_POOL: Record<PassiveArchetype, string[]> = {
  condition_exploiter: [
    "Predator's Instinct", "Weakness Seeker", "Cruel Precision",
    "Exploit Opening", "Pain Reader", "Prey on the Weak",
    "Exposed Nerve", "Merciless Eye", "Savage Insight",
  ],
  kill_rewarder: [
    "Blood Rush", "Death's Momentum", "Harvest Energy",
    "Killing Frenzy", "Triumph", "Reaper's Haste",
    "Executioner's High", "Victory Surge", "Soul Reap",
    "Coup de Grace", "Bloodletting Rush", "Final Blow Surge",
    "Death Dealer", "Slayer's Vigor", "Fatal Momentum",
  ],
  debuff_amplifier: [
    "Opportunist's Eye", "Keen Observer", "Crippling Focus",
    "Sadist's Delight", "Tormentor", "Relentless Pressure",
    "Methodical Cruelty", "Compounding Misery", "Venom Insight",
    "Twist the Knife", "Punishing Strikes", "Debilitating Touch",
    "Systematic Dismantling", "Cruel Efficiency", "Grinding Assault",
  ],
  reactive_defender: [
    "Iron Resolve", "Hardened Fighter", "Battle Scars",
    "Adrenaline Surge", "Defiant Stand", "Toughened Hide",
    "Stubborn Guard", "Rage Shield", "Pain Into Power",
    "Resilient Core", "Forged in Fire", "Unyielding Spirit",
    "Steel Nerves", "Battered but Standing", "Scarred Veteran",
  ],
  sustained_fighter: [
    "Hold the Line", "Stalwart Guard", "Immovable",
    "Steady Resolve", "Disciplined Mind", "Unshakeable",
    "Iron Stance", "Warden's Focus", "Patient Warrior",
    "Enduring Will", "Tireless Vigil", "Marathon Fighter",
    "Measured Pace", "Slow Burn", "Deep Reserves",
  ],
  stack_builder: [
    "Reach Advantage", "Mounting Pressure", "Gathering Storm",
    "Rising Fury", "Escalation", "Momentum Builder",
    "Ramp Up", "Snowball Effect", "Growing Menace",
    "Compounding Force", "Accelerating Blows", "Building Tempo",
    "Crescendo", "Chain Reaction", "Relentless Advance",
  ],
  dot_amplifier: [
    "Festering Wounds", "Lingering Agony", "Spreading Decay",
    "Worsening Condition", "Toxic Synergy", "Amplified Suffering",
    "Deep Corruption", "Compounding Pain", "Prolonged Torment",
    "Erosion Expert", "Slow Death", "Deterioration Master",
    "Infectious Fury", "Accelerated Rot", "Burning Vendetta",
  ],
  damage_booster: [
    "Deadly Focus", "Sharpened Edge", "Heavy Hands",
    "Brute Force", "Keen Strike", "Crushing Momentum",
    "Lethal Precision", "Battle Hardened", "Iron Fists",
    "Empowered Strikes", "Raw Power", "Trained Killer",
  ],
  stat_scaler: [
    "Strength of Arms", "Battle Wisdom", "Cunning Strike",
    "Resolve's Edge", "Swift Precision", "Willpower Strike",
    "Stat Mastery", "Inner Power", "Disciplined Force",
    "Focused Might", "Trained Reflexes", "Adaptive Fighting",
  ],
};

// ── Analysis: extract info from active abilities ──

interface ActiveAnalysis {
  createdConditions: Set<string>;
  exploitedConditions: Set<string>;
  effectTypes: Set<EffectType>;
  hasExecute: boolean;
  hasMultiHit: boolean;
  hasAoE: boolean;
  hasStance: boolean;
  hasBleed: boolean;
  hasBurn: boolean;
  hasPoison: boolean;
  hasSpell: boolean;
  hasDebuff: boolean;
  hasCrowdControl: boolean;
  avgApCost: number;
  avgFatigue: number;
  highDamage: boolean; // any effect with dmg_weapon mult >= 1.0
}

function analyzeActiveAbilities(actives: GeneratedAbility[]): ActiveAnalysis {
  const analysis: ActiveAnalysis = {
    createdConditions: new Set(),
    exploitedConditions: new Set(),
    effectTypes: new Set(),
    hasExecute: false,
    hasMultiHit: false,
    hasAoE: false,
    hasStance: false,
    hasBleed: false,
    hasBurn: false,
    hasPoison: false,
    hasSpell: false,
    hasDebuff: false,
    hasCrowdControl: false,
    avgApCost: 0,
    avgFatigue: 0,
    highDamage: false,
  };

  let totalAp = 0;
  let totalFat = 0;

  for (const a of actives) {
    for (const c of a.synergyTags.creates) analysis.createdConditions.add(c);
    for (const c of a.synergyTags.exploits) analysis.exploitedConditions.add(c);

    for (const e of a.effects) {
      analysis.effectTypes.add(e.type);
      if (e.type === "dmg_execute") analysis.hasExecute = true;
      if (e.type === "dmg_multihit") analysis.hasMultiHit = true;
      if (e.type === "dmg_spell") analysis.hasSpell = true;
      if (e.type === "dot_bleed") analysis.hasBleed = true;
      if (e.type === "dot_burn") analysis.hasBurn = true;
      if (e.type === "dot_poison") analysis.hasPoison = true;
      if (e.type === "debuff_stat" || e.type === "debuff_vuln") analysis.hasDebuff = true;
      if (e.type === "cc_stun" || e.type === "cc_root" || e.type === "cc_daze") analysis.hasCrowdControl = true;
      if (e.type === "stance_counter" || e.type === "stance_overwatch") analysis.hasStance = true;
      if (e.type === "dmg_weapon" && (e.params["multiplier"] as number) >= 1.0) analysis.highDamage = true;
    }

    if (a.targeting.type === "tgt_aoe_adjacent") analysis.hasAoE = true;

    totalAp += a.cost.ap;
    totalFat += a.cost.stamina;
  }

  analysis.avgApCost = actives.length > 0 ? totalAp / actives.length : 4;
  analysis.avgFatigue = actives.length > 0 ? totalFat / actives.length : 15;

  return analysis;
}

// ── Archetype weighting ──

function weightArchetypes(analysis: ActiveAnalysis): ArchetypeWeight[] {
  const weights: ArchetypeWeight[] = [];

  // Condition exploiter: strong if actives create conditions
  let condWeight = analysis.createdConditions.size * 4;
  if (analysis.createdConditions.size >= 2) condWeight += 3; // bonus for multi-condition themes
  if (analysis.hasBleed) condWeight += 2;
  if (analysis.hasCrowdControl) condWeight += 2;
  weights.push({ archetype: "condition_exploiter", weight: Math.max(1, condWeight) });

  // Kill rewarder: strong for high damage, execute, or AoE
  let killWeight = 1;
  if (analysis.hasExecute) killWeight += 4;
  if (analysis.highDamage) killWeight += 3;
  if (analysis.hasAoE) killWeight += 2;
  weights.push({ archetype: "kill_rewarder", weight: killWeight });

  // Debuff amplifier: strong for debuff/CC actives
  let debuffWeight = 1;
  if (analysis.hasDebuff) debuffWeight += 4;
  if (analysis.hasCrowdControl) debuffWeight += 3;
  if (analysis.hasBleed) debuffWeight += 2;
  weights.push({ archetype: "debuff_amplifier", weight: debuffWeight });

  // Reactive defender: strong for stance builds
  let defWeight = 1;
  if (analysis.hasStance) defWeight += 5;
  if (analysis.avgFatigue > 20) defWeight += 2; // tanky builds tend to be high stamina
  weights.push({ archetype: "reactive_defender", weight: defWeight });

  // Sustained fighter: strong for high-cost actives
  let sustainWeight = 1;
  if (analysis.avgApCost >= 5) sustainWeight += 3;
  if (analysis.avgFatigue >= 20) sustainWeight += 3;
  if (analysis.hasStance) sustainWeight += 2;
  weights.push({ archetype: "sustained_fighter", weight: sustainWeight });

  // Stack builder: strong for multi-hit or fast attacks
  let stackWeight = 1;
  if (analysis.hasMultiHit) stackWeight += 5;
  if (analysis.avgApCost <= 4) stackWeight += 2; // cheap = more attacks = more stacks
  weights.push({ archetype: "stack_builder", weight: stackWeight });

  // DoT amplifier: strong for DoT-heavy themes (bleed, burn, poison)
  let dotWeight = 1;
  if (analysis.hasBleed) dotWeight += 4;
  if (analysis.hasBurn) dotWeight += 4;
  if (analysis.hasPoison) dotWeight += 4;
  weights.push({ archetype: "dot_amplifier", weight: dotWeight });

  // Damage booster: universally useful flat damage
  let dmgBoostWeight = 3;
  if (analysis.highDamage) dmgBoostWeight += 2;
  weights.push({ archetype: "damage_booster", weight: dmgBoostWeight });

  // Stat scaler: damage scales from a stat, great for spell casters
  let scalerWeight = 2;
  if (analysis.hasSpell) scalerWeight += 3;
  weights.push({ archetype: "stat_scaler", weight: scalerWeight });

  return weights;
}

function pickArchetype(weights: ArchetypeWeight[], rng: () => number): PassiveArchetype {
  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  let roll = rng() * total;
  for (const w of weights) {
    roll -= w.weight;
    if (roll <= 0) return w.archetype;
  }
  return weights[0]!.archetype;
}

// ── Power levels ──

export type PowerLevel = "minor" | "standard" | "major";

function tierFromPower(level: PowerLevel): 1 | 2 | 3 {
  switch (level) {
    case "minor": return 1;
    case "standard": return 2;
    case "major": return 3;
  }
}

// ── Build passive trigger + effect for each archetype ──

// Universal bridge conditions — common conditions likely created by party members.
// condition_exploiter passives have a chance to exploit these for cross-tree synergy.
// Weighted by how many themes create each condition (more creators = more reliable cross-tree).
const BRIDGE_CONDITIONS_WEIGHTED = [
  { condition: "debuffed", weight: 5 },    // created by 8+ themes
  { condition: "vulnerable", weight: 4 },  // created by 3 themes, universally useful
  { condition: "bleeding", weight: 3 },    // created by 4 themes
  { condition: "stunned", weight: 3 },     // created by 4 themes
  { condition: "displaced", weight: 3 },   // created by 5 themes
  { condition: "rooted", weight: 3 },      // created by 3 themes
  { condition: "low_hp", weight: 2 },      // created by 2 themes
  { condition: "dazed", weight: 2 },       // created by 6+ themes
  { condition: "burning", weight: 2 },     // created by 1 theme
  { condition: "poisoned", weight: 2 },    // created by 1 theme
  { condition: "cursed", weight: 2 },      // created by 1 theme
];
const BRIDGE_CONDITION_CHANCE = 0.20; // 20% chance to pick a bridge condition instead of own tree's

function buildConditionExploiter(
  analysis: ActiveAnalysis,
  level: PowerLevel,
  rng: () => number,
): { trigger: TriggerPrimitive; effects: EffectPrimitive[]; synergyExploits: string[] } {
  // Pick a condition — sometimes from bridge pool for cross-tree synergy
  const conditions = [...analysis.createdConditions];
  let condition: string;
  if (rng() < BRIDGE_CONDITION_CHANCE && BRIDGE_CONDITIONS_WEIGHTED.length > 0) {
    // Pick a bridge condition not already in our own creates (for cross-tree value), weighted
    const crossConditions = BRIDGE_CONDITIONS_WEIGHTED.filter(c => !analysis.createdConditions.has(c.condition));
    if (crossConditions.length > 0) {
      const totalW = crossConditions.reduce((s, c) => s + c.weight, 0);
      let roll = rng() * totalW;
      condition = crossConditions[0]!.condition;
      for (const c of crossConditions) {
        roll -= c.weight;
        if (roll <= 0) { condition = c.condition; break; }
      }
    } else {
      condition = conditions.length > 0 ? conditions[Math.floor(rng() * conditions.length)]! : "debuffed";
    }
  } else {
    condition = conditions.length > 0
      ? conditions[Math.floor(rng() * conditions.length)]!
      : "debuffed";
  }

  // Determine trigger type based on condition
  let triggerType: TriggerType;
  let triggerParams: Record<string, number> = {};
  const bonusPct = level === "minor" ? 10 : level === "standard" ? 20 : 30;

  if (condition === "low_hp" || condition === "bleeding") {
    triggerType = "trg_belowHP";
    triggerParams = { hpPercent: condition === "bleeding" ? 70 : 50 };
  } else {
    // For stunned, debuffed, dazed, etc. — use generic belowHP as proxy
    // (the actual bonus check happens in synergyTags.exploits)
    triggerType = "trg_belowHP";
    triggerParams = { hpPercent: 100 }; // always active if target has condition
  }

  const powerAdd = level === "minor" ? 2 : level === "standard" ? 4 : 6;

  return {
    trigger: {
      type: triggerType,
      params: triggerParams,
      powerAdd,
      triggeredEffect: {
        type: "dmg_weapon",
        params: { bonusPercent: bonusPct },
        power: powerAdd,
      },
    },
    effects: [],
    synergyExploits: [condition],
  };
}

function buildKillRewarder(
  _analysis: ActiveAnalysis,
  level: PowerLevel,
  rng: () => number,
): { trigger: TriggerPrimitive; effects: EffectPrimitive[] } {
  // Randomly pick between AP refund and stat buff on kill
  const useApRefund = rng() < 0.6;

  if (useApRefund) {
    const amount = level === "minor" ? 2 : level === "standard" ? 3 : 4;
    return {
      trigger: {
        type: "trg_onKill",
        params: {},
        powerAdd: level === "minor" ? 2 : level === "standard" ? 3 : 5,
        triggeredEffect: {
          type: "res_apRefund",
          params: { amount },
          power: amount,
        },
      },
      effects: [],
    };
  } else {
    // Stat buff on kill (damage or defense)
    const stats = ["meleeSkill", "dodge", "dodge", "rangedSkill", "initiative", "resolve"];
    const stat = stats[Math.floor(rng() * stats.length)]!;
    const amount = level === "minor" ? 5 : level === "standard" ? 10 : 15;
    return {
      trigger: {
        type: "trg_onKill",
        params: {},
        powerAdd: level === "minor" ? 2 : level === "standard" ? 3 : 5,
        triggeredEffect: {
          type: "buff_stat",
          params: { stat, amount },
          power: level === "minor" ? 2 : 3,
        },
      },
      effects: [],
    };
  }
}

function buildDebuffAmplifier(
  _analysis: ActiveAnalysis,
  level: PowerLevel,
  rng: () => number,
): { trigger: TriggerPrimitive; effects: EffectPrimitive[] } {
  // AP refund on debuff applied
  const amount = level === "minor" ? 1 : level === "standard" ? 2 : 3;
  return {
    trigger: {
      type: "trg_onHit",
      params: {},
      powerAdd: level === "minor" ? 2 : level === "standard" ? 3 : 5,
      triggeredEffect: {
        type: "res_apRefund",
        params: { amount },
        power: amount,
      },
    },
    effects: [],
  };
}

function buildReactiveDefender(
  _analysis: ActiveAnalysis,
  level: PowerLevel,
  rng: () => number,
): { trigger: TriggerPrimitive; effects: EffectPrimitive[] } {
  // Choose between stat buff and damage reduction on hit
  const useDmgReduce = rng() < 0.4;

  if (useDmgReduce) {
    const pct = level === "minor" ? 10 : level === "standard" ? 20 : 30;
    return {
      trigger: {
        type: "trg_onTakeDamage",
        params: {},
        powerAdd: level === "minor" ? 2 : level === "standard" ? 4 : 6,
        triggeredEffect: {
          type: "buff_dmgReduce",
          params: { percent: pct },
          power: level === "minor" ? 2 : 4,
        },
      },
      effects: [],
    };
  } else {
    const defStats = ["dodge", "dodge", "resolve"];
    const stat = defStats[Math.floor(rng() * defStats.length)]!;
    const amount = level === "minor" ? 5 : level === "standard" ? 10 : 15;
    return {
      trigger: {
        type: "trg_onTakeDamage",
        params: {},
        powerAdd: level === "minor" ? 2 : level === "standard" ? 3 : 5,
        triggeredEffect: {
          type: "buff_stat",
          params: { stat, amount },
          power: level === "minor" ? 2 : 3,
        },
      },
      effects: [],
    };
  }
}

function buildSustainedFighter(
  _analysis: ActiveAnalysis,
  level: PowerLevel,
  rng: () => number,
): { trigger: TriggerPrimitive; effects: EffectPrimitive[] } {
  // Turn-start stat buff
  const stats = ["dodge", "meleeSkill", "dodge", "rangedSkill", "initiative", "resolve"];
  const stat = stats[Math.floor(rng() * stats.length)]!;
  const amount = level === "minor" ? 5 : level === "standard" ? 10 : 15;

  return {
    trigger: {
      type: "trg_turnStart",
      params: {},
      powerAdd: level === "minor" ? 2 : level === "standard" ? 3 : 5,
      triggeredEffect: {
        type: "buff_stat",
        params: { stat, amount },
        power: level === "minor" ? 2 : 3,
      },
    },
    effects: [],
  };
}

function buildStackBuilder(
  _analysis: ActiveAnalysis,
  level: PowerLevel,
  rng: () => number,
): { trigger: TriggerPrimitive; effects: EffectPrimitive[] } {
  // On hit: stacking defense or offense buff
  const stackStats = ["dodge", "meleeSkill", "rangedSkill", "initiative"];
  const stat = stackStats[Math.floor(rng() * stackStats.length)]!;
  const amount = level === "minor" ? 5 : level === "standard" ? 5 : 10;

  return {
    trigger: {
      type: "trg_onHit",
      params: {},
      powerAdd: level === "minor" ? 2 : level === "standard" ? 3 : 5,
      triggeredEffect: {
        type: "buff_stat",
        params: { stat, amount },
        power: level === "minor" ? 2 : 3,
      },
    },
    effects: [],
  };
}

function buildDotAmplifier(
  _analysis: ActiveAnalysis,
  level: PowerLevel,
  rng: () => number,
): { trigger: TriggerPrimitive; effects: EffectPrimitive[] } {
  // On hit: bonus damage if target has any DoT active
  const bonusPct = level === "minor" ? 10 : level === "standard" ? 20 : 30;
  return {
    trigger: {
      type: "trg_onHit",
      params: {},
      powerAdd: level === "minor" ? 2 : level === "standard" ? 4 : 6,
      triggeredEffect: {
        type: "dmg_weapon",
        params: { bonusPercent: bonusPct },
        power: level === "minor" ? 2 : 4,
      },
    },
    effects: [],
  };
}

function buildDamageBooster(
  _analysis: ActiveAnalysis,
  level: PowerLevel,
  _rng: () => number,
): { trigger: TriggerPrimitive; effects: EffectPrimitive[] } {
  const amount = level === "minor" ? 1 : level === "standard" ? 2 : 3;
  return {
    trigger: {
      type: "trg_turnStart",
      params: {},
      powerAdd: level === "minor" ? 2 : level === "standard" ? 3 : 5,
      triggeredEffect: {
        type: "buff_stat",
        params: { stat: "bonusDamage", amount },
        power: level === "minor" ? 2 : 3,
      },
    },
    effects: [],
  };
}

function buildStatScaler(
  _analysis: ActiveAnalysis,
  level: PowerLevel,
  rng: () => number,
): { trigger: TriggerPrimitive; effects: EffectPrimitive[] } {
  const stats = ["meleeSkill", "resolve", "initiative", "dodge"];
  const stat = stats[Math.floor(rng() * stats.length)]!;
  const pct = level === "minor" ? 10 : level === "standard" ? 15 : 20;
  return {
    trigger: {
      type: "trg_turnStart",
      params: {},
      powerAdd: level === "minor" ? 2 : level === "standard" ? 4 : 6,
      triggeredEffect: {
        type: "buff_stat",
        params: { stat: "bonusDamage", amount: 0, scalingStat: stat, scalingPct: pct },
        power: level === "minor" ? 3 : level === "standard" ? 4 : 6,
      },
    },
    effects: [],
  };
}

// ── Description for generated passives ──

function generatePassiveDesc(
  archetype: PassiveArchetype,
  trigger: TriggerPrimitive,
  synergyExploits: string[],
): string {
  const parts: string[] = [];

  const eff = trigger.triggeredEffect;
  if (!eff) return "Passive ability.";

  switch (trigger.type) {
    case "trg_onKill":
      if (eff.type === "res_apRefund") {
        parts.push(`On kill: refund ${eff.params["amount"]} AP`);
      } else if (eff.type === "buff_stat") {
        parts.push(`On kill: +${eff.params["amount"]} ${formatStat(eff.params["stat"] as string)} for 2 turns`);
      }
      break;
    case "trg_belowHP": {
      const pct = trigger.params["hpPercent"] ?? 50;
      const bonus = eff.params["bonusPercent"] ?? 10;
      if (synergyExploits.length > 0) {
        parts.push(`+${bonus}% damage vs ${synergyExploits.join("/")} targets`);
      } else {
        parts.push(`+${bonus}% damage vs targets below ${pct}% HP`);
      }
      break;
    }
    case "trg_onHit":
      if (eff.type === "res_apRefund") {
        parts.push(`When applying debuff: refund ${eff.params["amount"]} AP`);
      } else if (eff.type === "buff_stat") {
        parts.push(`On hit: +${eff.params["amount"]} ${formatStat(eff.params["stat"] as string)} (stacks)`);
      } else if (eff.type === "dmg_weapon" && eff.params["bonusPercent"]) {
        parts.push(`On hit: +${eff.params["bonusPercent"]}% bonus damage vs bleeding/burning/poisoned targets`);
      }
      break;
    case "trg_turnStart":
      if (eff.type === "buff_stat") {
        const stat = eff.params["stat"] as string;
        const scalingStat = eff.params["scalingStat"] as string | undefined;
        const scalingPct = eff.params["scalingPct"] as number | undefined;
        if (stat === "bonusDamage" && scalingStat && scalingPct) {
          parts.push(`Start of turn: +damage equal to ${scalingPct}% of ${formatStat(scalingStat)}`);
        } else if (stat === "bonusDamage") {
          parts.push(`Start of turn: +${eff.params["amount"]} damage`);
        } else {
          parts.push(`Start of turn: +${eff.params["amount"]} ${formatStat(stat)}`);
        }
      }
      break;
    case "trg_onTakeDamage":
      if (eff.type === "buff_stat") {
        parts.push(`When hit: +${eff.params["amount"]} ${formatStat(eff.params["stat"] as string)} for 1 turn`);
      } else if (eff.type === "buff_dmgReduce") {
        parts.push(`When hit: -${eff.params["percent"]}% damage taken for 1 turn`);
      }
      break;
  }

  if (parts.length === 0) return "Passive ability.";
  return "Passive: " + parts.join(". ") + ".";
}

function formatStat(stat: string): string {
  return stat.replace(/([A-Z])/g, " $1").trim();
}

// ── Main generation function ──

/**
 * Generate a complementary passive ability based on one or more active abilities.
 * Analyzes the actives to determine the best passive archetype and generates
 * a synergistic passive at the specified power level.
 *
 * @param actives - One or more active GeneratedAbility to complement
 * @param level - Power level: "minor" (T1), "standard" (T2), or "major" (T3)
 * @param rng - Random number generator [0, 1)
 * @param register - Whether to register in the ability registry (default true)
 * @returns Generated passive ability
 */
export function generatePassiveFromActives(
  actives: GeneratedAbility[],
  level: PowerLevel,
  rng: () => number,
  register = true,
): GeneratedAbility {
  const analysis = analyzeActiveAbilities(actives);
  const weights = weightArchetypes(analysis);
  const archetype = pickArchetype(weights, rng);

  return buildPassive(archetype, analysis, level, rng, register);
}

/**
 * Generate multiple passives at varying power levels, ensuring variety.
 * Returns one passive per power level requested, each with a different archetype.
 */
export function generatePassiveSuite(
  actives: GeneratedAbility[],
  levels: PowerLevel[],
  rng: () => number,
  register = true,
  rarities?: Rarity[],
): GeneratedAbility[] {
  const analysis = analyzeActiveAbilities(actives);
  const weights = weightArchetypes(analysis);
  const usedArchetypes = new Set<PassiveArchetype>();
  const results: GeneratedAbility[] = [];

  // Find strongly-weighted archetypes (weight >= 5) that can repeat earlier
  const topWeight = Math.max(...weights.map(w => w.weight));
  const strongArchetypes = new Set(
    weights.filter(w => w.weight >= 5 || w.weight >= topWeight * 0.7).map(w => w.archetype),
  );

  // Track archetype usage counts for cap (max 3 of same archetype)
  const archetypeCounts = new Map<PassiveArchetype, number>();
  // Track which conditions condition_exploiters have covered
  const exploitedConditions = new Set<string>();

  for (let li = 0; li < levels.length; li++) {
    const level = levels[li]!;
    const rarity: Rarity = rarities?.[li] ?? "common";
    let archetype: PassiveArchetype;
    // Allow strongly-weighted archetypes to repeat, but cap at 3
    const available = weights.filter(w => {
      const count = archetypeCounts.get(w.archetype) ?? 0;
      if (count >= 3) return false; // hard cap
      if (!usedArchetypes.has(w.archetype)) return true;
      return strongArchetypes.has(w.archetype) && rng() < 0.3;
    });
    if (available.length > 0) {
      archetype = pickArchetype(available, rng);
    } else {
      // When all used or capped, bias toward top-weighted uncapped archetypes
      const biased = weights
        .filter(w => (archetypeCounts.get(w.archetype) ?? 0) < 3)
        .map(w => ({
          archetype: w.archetype,
          weight: w.weight >= topWeight * 0.5 ? w.weight * 2 : w.weight,
        }));
      archetype = biased.length > 0 ? pickArchetype(biased, rng) : pickArchetype(weights, rng);
    }
    usedArchetypes.add(archetype);
    archetypeCounts.set(archetype, (archetypeCounts.get(archetype) ?? 0) + 1);

    // For condition_exploiter: prefer unexploited conditions
    let passiveAnalysis = analysis;
    if (archetype === "condition_exploiter" && exploitedConditions.size > 0 && analysis.createdConditions.size > 1) {
      const unexploited = [...analysis.createdConditions].filter(c => !exploitedConditions.has(c));
      if (unexploited.length > 0) {
        // Create a modified analysis that only has unexploited conditions
        passiveAnalysis = { ...analysis, createdConditions: new Set(unexploited) };
      }
    }

    const passive = buildPassive(archetype, passiveAnalysis, level, rng, register, rarity);

    // Track exploited conditions
    for (const c of passive.synergyTags.exploits) exploitedConditions.add(c);

    results.push(passive);
  }

  return results;
}

function buildPassive(
  archetype: PassiveArchetype,
  analysis: ActiveAnalysis,
  level: PowerLevel,
  rng: () => number,
  register: boolean,
  rarity: Rarity = "common",
): GeneratedAbility {
  let trigger: TriggerPrimitive;
  let effects: EffectPrimitive[] = [];
  let synergyExploits: string[] = [];

  switch (archetype) {
    case "condition_exploiter": {
      const result = buildConditionExploiter(analysis, level, rng);
      trigger = result.trigger;
      effects = result.effects;
      synergyExploits = result.synergyExploits;
      break;
    }
    case "kill_rewarder": {
      const result = buildKillRewarder(analysis, level, rng);
      trigger = result.trigger;
      effects = result.effects;
      break;
    }
    case "debuff_amplifier": {
      const result = buildDebuffAmplifier(analysis, level, rng);
      trigger = result.trigger;
      effects = result.effects;
      break;
    }
    case "reactive_defender": {
      const result = buildReactiveDefender(analysis, level, rng);
      trigger = result.trigger;
      effects = result.effects;
      break;
    }
    case "sustained_fighter": {
      const result = buildSustainedFighter(analysis, level, rng);
      trigger = result.trigger;
      effects = result.effects;
      break;
    }
    case "stack_builder": {
      const result = buildStackBuilder(analysis, level, rng);
      trigger = result.trigger;
      effects = result.effects;
      break;
    }
    case "dot_amplifier": {
      const result = buildDotAmplifier(analysis, level, rng);
      trigger = result.trigger;
      effects = result.effects;
      break;
    }
    case "damage_booster": {
      const result = buildDamageBooster(analysis, level, rng);
      trigger = result.trigger;
      effects = result.effects;
      break;
    }
    case "stat_scaler": {
      const result = buildStatScaler(analysis, level, rng);
      trigger = result.trigger;
      effects = result.effects;
      break;
    }
  }

  const tier = tierFromPower(level);
  const uid = generateAbilityUID();

  // Pick name — condition-aware for condition_exploiter
  let namePool: string[];
  if (archetype === "condition_exploiter" && synergyExploits.length > 0) {
    const condNames = CONDITION_NAME_POOL[synergyExploits[0]!];
    namePool = condNames && condNames.length > 0 ? condNames : PASSIVE_NAME_POOL[archetype];
  } else {
    namePool = PASSIVE_NAME_POOL[archetype];
  }
  const name = namePool[Math.floor(rng() * namePool.length)]!;

  // Build synergy tags
  const creates: string[] = [];
  const exploits = [...synergyExploits];

  // Condition exploiter exploits what the actives create (pick randomly, not always first)
  if (archetype === "condition_exploiter" && exploits.length === 0) {
    const created = [...analysis.createdConditions];
    if (created.length > 0) exploits.push(created[Math.floor(rng() * created.length)]!);
  }

  const description = generatePassiveDesc(archetype, trigger, exploits);

  const ability: GeneratedAbility = {
    uid,
    name,
    description,
    targeting: { type: "tgt_self", params: {}, powerMult: 0.8 },
    effects,
    modifiers: [],
    triggers: [trigger],
    cost: { ap: 0, stamina: 0, mana: 0, cooldown: 0, turnEnding: false },
    powerBudget: trigger.powerAdd + effects.reduce((s, e) => s + e.power, 0),
    weaponReq: [],
    tier,
    isPassive: true,
    rarity,
    synergyTags: { creates, exploits },
  };

  // Apply rarity scaling to passive params
  applyRarityScaling(ability);

  // Regenerate description after scaling
  ability.description = generatePassiveDesc(archetype, ability.triggers[0]!, exploits);

  if (register) {
    registerAbility(ability);
  }

  return ability;
}
