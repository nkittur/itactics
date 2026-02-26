import type {
  GeneratedAbility,
  EffectPrimitive,
  TargetingPrimitive,
  ModifierPrimitive,
  TriggerPrimitive,
  AbilityCost,
  EffectType,
  TargetingType,
} from "./AbilityData";
import { generateAbilityUID } from "./AbilityData";
import { registerAbility } from "./AbilityResolver";
import type { Theme, ThemeProgressionSlot } from "./ThemeData";
import { generatePassiveFromActives } from "./PassiveGenerator";

// ── Power costs per effect type ──

const EFFECT_POWER: Record<EffectType, number> = {
  dmg_weapon: 4,
  dmg_execute: 7,
  dmg_multihit: 6,
  dot_bleed: 3,
  disp_push: 3,
  cc_stun: 5,
  cc_root: 4,
  cc_daze: 3,
  debuff_stat: 3,
  debuff_vuln: 4,
  buff_stat: 3,
  buff_dmgReduce: 4,
  stance_counter: 5,
  stance_overwatch: 4,
  res_apRefund: 3,
};

// ── Targeting power multipliers ──

const TARGETING_MULT: Record<TargetingType, number> = {
  tgt_single_enemy: 1.0,
  tgt_single_ally: 1.0,
  tgt_self: 0.8,
  tgt_aoe_adjacent: 1.5,
};

// ── Default effect params per type ──

function defaultEffectParams(type: EffectType, tier: 1 | 2 | 3, rng: () => number): Record<string, number | string> {
  const vary = (base: number, pct: number) => Math.round(base * (1 + (rng() * 2 - 1) * pct));
  switch (type) {
    case "dmg_weapon":
      return { multiplier: vary(tier === 1 ? 70 : tier === 2 ? 100 : 120, 0.1) / 100 };
    case "dmg_execute":
      return {
        multiplier: vary(tier === 1 ? 90 : tier === 2 ? 120 : 140, 0.1) / 100,
        hpThreshold: tier >= 3 ? 30 : 20,
        bonusMult: vary(tier === 1 ? 30 : tier === 2 ? 50 : 80, 0.1) / 100,
      };
    case "dmg_multihit":
      return { hits: tier >= 3 ? 3 : 2, multPerHit: vary(50, 0.1) / 100 };
    case "dot_bleed":
      return { dmgPerTurn: vary(tier === 1 ? 3 : 5, 0.15), turns: tier >= 3 ? 3 : 2 };
    case "disp_push":
      return { distance: tier >= 3 ? 2 : 1 };
    case "cc_stun":
      return { chance: tier === 1 ? 75 : 85 };
    case "cc_root":
      return { turns: tier >= 3 ? 2 : 1 };
    case "cc_daze":
      return { apLoss: tier >= 3 ? 2 : 1, turns: tier >= 3 ? 2 : 1 };
    case "debuff_stat": {
      const stats = ["meleeDefense", "rangedDefense", "meleeSkill"];
      return { stat: stats[Math.floor(rng() * stats.length)]!, amount: vary(tier === 1 ? 8 : 10, 0.15), turns: 2 };
    }
    case "debuff_vuln":
      return { bonusDmg: vary(20, 0.1), turns: 2 };
    case "buff_stat": {
      const bStats = ["meleeDefense", "rangedDefense", "meleeSkill"];
      return { stat: bStats[Math.floor(rng() * bStats.length)]!, amount: vary(tier === 1 ? 8 : 12, 0.15), turns: 2 };
    }
    case "buff_dmgReduce":
      return { percent: vary(25, 0.1), turns: 1 };
    case "stance_counter":
      return { maxCounters: tier >= 3 ? 99 : 3 };
    case "stance_overwatch":
      return { maxTriggers: tier >= 3 ? 5 : 3 };
    case "res_apRefund":
      return { amount: vary(3, 0.15) };
  }
}

// ── Naming tables ──

const NAME_PREFIXES: Record<string, string[]> = {
  dot_bleed: ["Lacerating", "Bleeding", "Rending", "Gashing"],
  cc_stun: ["Concussive", "Crushing", "Shattering", "Staggering"],
  cc_root: ["Binding", "Pinning", "Locking", "Anchoring"],
  cc_daze: ["Crippling", "Blinding", "Disorienting", "Jarring"],
  debuff_stat: ["Enfeebling", "Weakening", "Draining", "Sapping"],
  debuff_vuln: ["Exposing", "Piercing", "Rending", "Sundering"],
  buff_stat: ["Rallying", "Inspiring", "Empowering", "Fortifying"],
  buff_dmgReduce: ["Warding", "Shielding", "Guarding", "Steeling"],
  disp_push: ["Battering", "Shoving", "Thundering", "Driving"],
};

const NAME_VERBS: Record<string, string[]> = {
  dmg_weapon: [
    "Strike", "Slash", "Blow", "Cut", "Assault",
    "Cleave", "Chop", "Swing", "Hack", "Rend", "Attack",
  ],
  dmg_execute: [
    "Execution", "Reaping", "Toll", "Harvest", "Finishing Blow",
    "Culling", "Headsman's Cut", "Coup", "Death Blow",
  ],
  dmg_multihit: ["Flurry", "Barrage", "Onslaught", "Frenzy", "Rapid Strikes", "Whirlwind"],
  stance_counter: ["Counter-stance", "Riposte Guard", "Ready Stance", "Retaliating Guard"],
  stance_overwatch: ["Overwatch", "Sentinel Guard", "Watchful Stance", "Vigilant Watch"],
  res_apRefund: ["Rush", "Surge", "Momentum", "Quick Step"],
};

const NAME_SUFFIXES: Record<string, string[]> = {
  tgt_aoe_adjacent: ["of Havoc", "of Devastation", "of Ruin"],
  tgt_self: ["of Will", "of Resilience", "of Focus"],
};

// Theme-specific verb overrides for dmg_weapon (replaces generic verbs)
const THEME_VERBS: Record<string, string[]> = {
  bleeder: ["Laceration", "Gash", "Rend", "Carve", "Bleed Cut", "Bloodletting"],
  crusher: ["Crush", "Smash", "Pummel", "Shatter", "Bludgeon", "Demolish"],
  reaper: ["Reap", "Cleave", "Decimate", "Fell", "Mow Down", "Harvest"],
  executioner: ["Sever", "Behead", "Finish", "Cull", "Dispatch", "Terminate"],
  skirmisher: ["Jab", "Lunge", "Thrust", "Feint", "Side-step Cut", "Glancing Blow"],
  sentinel: ["Ward", "Repel", "Brace", "Hold Ground", "Spear Thrust", "Stand Fast"],
  opportunist: ["Exploit", "Capitalize", "Press", "Punish", "Take Advantage", "Seize"],
};

// ── Passive names ──

const PASSIVE_NAMES: Record<string, string[]> = {
  bleeder: ["Blood Scent", "Crimson Instinct", "Gore Tracker"],
  crusher: ["Iron Will", "Unrelenting Force", "Hammer Resolve"],
  skirmisher: ["Fleet Footwork", "Hit and Run", "Nimble Step"],
  opportunist: ["Opportunist's Eye", "Keen Observer", "Weakness Seeker"],
  executioner: ["Smell Blood", "Death Sense", "Killing Instinct"],
  sentinel: ["Hold the Line", "Stalwart Guard", "Immovable"],
  reaper: ["Blood Rush", "Death's Momentum", "Harvest Energy"],
};

// ── Power budget + cost derivation ──

function calculatePowerBudget(
  effects: EffectPrimitive[],
  targeting: TargetingPrimitive,
  modifiers: ModifierPrimitive[],
  triggers: TriggerPrimitive[],
): number {
  const effectPower = effects.reduce((sum, e) => sum + e.power, 0);
  const modPower = modifiers.reduce((sum, m) => sum + m.powerAdd, 0);
  const trgPower = triggers.reduce((sum, t) => sum + t.powerAdd, 0);
  return Math.round(effectPower * targeting.powerMult + modPower + trgPower);
}

function deriveCost(power: number, tier: 1 | 2 | 3, rng: () => number): AbilityCost {
  const varyRange = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

  if (power <= 8) {
    return { ap: 3, fatigue: varyRange(8, 12), cooldown: 0, turnEnding: false };
  } else if (power <= 14) {
    return { ap: 4, fatigue: varyRange(12, 18), cooldown: 0, turnEnding: false };
  } else if (power <= 20) {
    return { ap: 5, fatigue: varyRange(18, 25), cooldown: 0, turnEnding: false };
  } else if (power <= 28) {
    return { ap: 6, fatigue: varyRange(22, 30), cooldown: 2, turnEnding: false };
  } else if (power <= 35) {
    return { ap: 6, fatigue: varyRange(25, 35), cooldown: 3, turnEnding: false };
  } else {
    return { ap: tier >= 3 ? 8 : 7, fatigue: varyRange(30, 40), cooldown: rng() < 0.5 ? 3 : 4, turnEnding: true };
  }
}

// ── Name generation ──

function generateAbilityName(
  effects: EffectPrimitive[],
  targeting: TargetingPrimitive,
  isPassive: boolean,
  themeId: string,
  rng: () => number,
): string {
  if (isPassive) {
    const names = PASSIVE_NAMES[themeId] ?? ["Passive Skill"];
    return names[Math.floor(rng() * names.length)]!;
  }

  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]!;

  // Find main verb — prefer theme-specific verbs for dmg_weapon
  const primaryEffect = effects[0];
  let verbs: string[];
  let usedThemeVerb = false;
  if (primaryEffect?.type === "dmg_weapon" && THEME_VERBS[themeId]) {
    // 60% chance to use theme verb, 40% generic
    if (rng() < 0.6) {
      verbs = THEME_VERBS[themeId]!;
      usedThemeVerb = true;
    } else {
      verbs = NAME_VERBS[primaryEffect.type] ?? ["Attack"];
    }
  } else {
    verbs = primaryEffect ? (NAME_VERBS[primaryEffect.type] ?? ["Attack"]) : ["Attack"];
  }
  const verb = pick(verbs);

  // Find a prefix from secondary effects — skip if using theme verb to avoid double-theming
  let prefix = "";
  if (!usedThemeVerb) {
    for (const e of effects) {
      const prefixes = NAME_PREFIXES[e.type];
      if (prefixes) {
        prefix = pick(prefixes);
        break;
      }
    }
  }

  // Optional suffix from targeting
  let suffix = "";
  const suffixes = NAME_SUFFIXES[targeting.type];
  if (suffixes && rng() < 0.4) {
    suffix = " " + pick(suffixes);
  }

  if (prefix) {
    return `${prefix} ${verb}${suffix}`;
  }
  return `${verb}${suffix}`;
}

// ── Description generation ──

function generateDescription(ability: GeneratedAbility): string {
  if (ability.isPassive) {
    return generatePassiveDescription(ability);
  }

  const parts: string[] = [];

  for (const effect of ability.effects) {
    switch (effect.type) {
      case "dmg_weapon": {
        const mult = Math.round((effect.params["multiplier"] as number) * 100);
        parts.push(`Deal ${mult}% weapon damage`);
        break;
      }
      case "dmg_execute": {
        const mult = Math.round((effect.params["multiplier"] as number) * 100);
        const thresh = effect.params["hpThreshold"] as number;
        parts.push(`Deal ${mult}% weapon damage. Execute targets below ${thresh}% HP`);
        break;
      }
      case "dmg_multihit": {
        const hits = effect.params["hits"] as number;
        const per = Math.round((effect.params["multPerHit"] as number) * 100);
        parts.push(`Strike ${hits} times at ${per}% damage each`);
        break;
      }
      case "dot_bleed": {
        const dmg = effect.params["dmgPerTurn"] as number;
        const turns = effect.params["turns"] as number;
        parts.push(`Apply Bleed (${dmg} dmg/turn, ${turns} turns)`);
        break;
      }
      case "disp_push": {
        const dist = effect.params["distance"] as number;
        parts.push(`Push target ${dist} tile${dist > 1 ? "s" : ""}`);
        break;
      }
      case "cc_stun": {
        const chance = effect.params["chance"] as number;
        parts.push(`${chance}% chance to Stun`);
        break;
      }
      case "cc_root": {
        const turns = effect.params["turns"] as number;
        parts.push(`Root target for ${turns} turn${turns > 1 ? "s" : ""}`);
        break;
      }
      case "cc_daze": {
        const loss = effect.params["apLoss"] as number;
        parts.push(`Daze target (-${loss} AP next turn)`);
        break;
      }
      case "debuff_stat": {
        const stat = effect.params["stat"] as string;
        const amt = effect.params["amount"] as number;
        const turns = effect.params["turns"] as number;
        const statName = stat.replace(/([A-Z])/g, " $1").trim();
        parts.push(`Reduce ${statName} by ${amt} for ${turns} turns`);
        break;
      }
      case "debuff_vuln": {
        const bonus = effect.params["bonusDmg"] as number;
        parts.push(`Apply Vulnerable (+${bonus}% damage taken)`);
        break;
      }
      case "buff_stat": {
        const stat = effect.params["stat"] as string;
        const amt = effect.params["amount"] as number;
        const statName = stat.replace(/([A-Z])/g, " $1").trim();
        parts.push(`+${amt} ${statName}`);
        break;
      }
      case "buff_dmgReduce": {
        const pct = effect.params["percent"] as number;
        parts.push(`Reduce damage taken by ${pct}%`);
        break;
      }
      case "stance_counter":
        parts.push("Enter counter-stance: counter-attack incoming melee");
        break;
      case "stance_overwatch":
        parts.push("Enter overwatch: attack enemies entering adjacent hexes");
        break;
      case "res_apRefund": {
        const amt = effect.params["amount"] as number;
        parts.push(`Refund ${amt} AP`);
        break;
      }
    }
  }

  // Add synergy exploit info
  if (ability.synergyTags.exploits.length > 0) {
    parts.push(`Bonus vs ${ability.synergyTags.exploits.join(", ")} targets`);
  }

  return parts.join(". ") + ".";
}

function generatePassiveDescription(ability: GeneratedAbility): string {
  const parts: string[] = [];

  for (const trigger of ability.triggers) {
    switch (trigger.type) {
      case "trg_onKill": {
        const eff = trigger.triggeredEffect;
        if (eff?.type === "res_apRefund") {
          parts.push(`On kill: refund ${eff.params["amount"]} AP`);
        } else if (eff?.type === "buff_stat") {
          parts.push(`On kill: +${eff.params["amount"]} ${eff.params["stat"]}`);
        }
        break;
      }
      case "trg_belowHP": {
        const pct = trigger.params["hpPercent"] ?? 50;
        const eff = trigger.triggeredEffect;
        const bonus = eff?.params["bonusPercent"] ?? 10;
        parts.push(`+${bonus}% damage vs targets below ${pct}% HP`);
        break;
      }
      case "trg_turnStart": {
        const eff = trigger.triggeredEffect;
        if (eff?.type === "buff_stat") {
          parts.push(`Start of turn: +${eff.params["amount"]} ${eff.params["stat"]}`);
        }
        break;
      }
      case "trg_onTakeDamage": {
        const eff = trigger.triggeredEffect;
        if (eff?.type === "buff_stat") {
          parts.push(`When hit: +${eff.params["amount"]} ${eff.params["stat"]} for 1 turn`);
        }
        break;
      }
      case "trg_onHit": {
        const eff = trigger.triggeredEffect;
        if (eff?.type === "res_apRefund") {
          parts.push(`When applying debuff: refund ${eff.params["amount"]} AP`);
        }
        break;
      }
    }
  }

  // Add static effect descriptions for passives with non-triggered effects
  for (const effect of ability.effects) {
    if (effect.type === "buff_stat") {
      const stat = effect.params["stat"] as string;
      const amt = effect.params["amount"] as number;
      const statName = stat.replace(/([A-Z])/g, " $1").trim();
      parts.push(`+${amt} ${statName} while active`);
    }
  }

  if (parts.length === 0) return "Passive ability.";
  return "Passive: " + parts.join(". ") + ".";
}

// ── Main generation functions ──

/**
 * Generate a single ability for a given theme progression slot.
 */
export function generateAbility(
  slot: ThemeProgressionSlot,
  tier: 1 | 2 | 3,
  themeId: string,
  weaponReq: string[],
  rng: () => number,
): GeneratedAbility {
  const isPassive = slot.isPassive ?? false;

  // Build effects from the slot's effect pool
  const effects: EffectPrimitive[] = slot.effects.map(type => ({
    type,
    params: defaultEffectParams(type, tier, rng),
    power: EFFECT_POWER[type],
  }));

  // Build targeting
  const targetingType: TargetingType = slot.targetingConstraint ?? (
    isPassive ? "tgt_self" : "tgt_single_enemy"
  );
  const targeting: TargetingPrimitive = {
    type: targetingType,
    params: targetingType === "tgt_aoe_adjacent" ? { radius: 1 } : {},
    powerMult: TARGETING_MULT[targetingType],
  };

  // Build modifiers from exploit conditions
  const modifiers: ModifierPrimitive[] = [];
  if (slot.conditions.exploits.length > 0) {
    modifiers.push({
      type: "mod_requireState",
      params: {
        condition: slot.conditions.exploits[0]!,
        bonusPercent: tier === 1 ? 20 : tier === 2 ? 30 : 50,
      },
      powerAdd: 2,
    });
  }

  // Build triggers for passives
  const triggers: TriggerPrimitive[] = [];
  if (isPassive) {
    const triggerEffect = buildPassiveTriggerEffect(themeId, tier, rng);
    if (triggerEffect) {
      triggers.push(triggerEffect);
    }
  }

  // Calculate power
  const power = calculatePowerBudget(effects, targeting, modifiers, triggers);

  // Derive cost
  const cost = isPassive
    ? { ap: 0, fatigue: 0, cooldown: 0, turnEnding: false }
    : deriveCost(power, tier, rng);

  // Generate name and description
  const uid = generateAbilityUID();
  const name = generateAbilityName(effects, targeting, isPassive, themeId, rng);

  const ability: GeneratedAbility = {
    uid,
    name,
    description: "", // Will be set after construction
    targeting,
    effects,
    modifiers,
    triggers,
    cost,
    powerBudget: power,
    weaponReq,
    tier,
    isPassive,
    synergyTags: {
      creates: [...slot.conditions.creates],
      exploits: [...slot.conditions.exploits],
    },
  };

  // Execute abilities inherently create low_hp condition
  const hasExecute = effects.some(e => e.type === "dmg_execute");
  if (hasExecute && !ability.synergyTags.creates.includes("low_hp")) {
    ability.synergyTags.creates.push("low_hp");
  }

  ability.description = generateDescription(ability);
  return ability;
}

/** Build trigger + triggered effect for passive abilities based on theme. */
function buildPassiveTriggerEffect(
  themeId: string,
  tier: 1 | 2 | 3,
  rng: () => number,
): TriggerPrimitive | null {
  switch (themeId) {
    case "reaper":
      // Blood Rush: on kill, refund AP
      return {
        type: "trg_onKill",
        params: {},
        powerAdd: 3,
        triggeredEffect: {
          type: "res_apRefund",
          params: { amount: Math.round(2 + rng()) }, // 2-3
          power: 3,
        },
      };

    case "executioner":
      // Smell Blood: +dmg vs low HP
      return {
        type: "trg_belowHP",
        params: { hpPercent: 50 },
        powerAdd: 4,
        triggeredEffect: {
          type: "dmg_weapon",
          params: { bonusPercent: tier === 1 ? 10 : 20 },
          power: 3,
        },
      };

    case "opportunist":
      // Opportunist's Eye: AP on debuff applied
      return {
        type: "trg_onHit",
        params: {},
        powerAdd: 3,
        triggeredEffect: {
          type: "res_apRefund",
          params: { amount: Math.round(1 + rng()) }, // 1-2
          power: 2,
        },
      };

    case "sentinel":
      // Hold the Line: +defense in stance
      return {
        type: "trg_turnStart",
        params: {},
        powerAdd: 3,
        triggeredEffect: {
          type: "buff_stat",
          params: {
            stat: "meleeDefense",
            amount: Math.round(8 + rng() * 4), // 8-12
          },
          power: 3,
        },
      };

    default:
      // Generic turn-start buff
      return {
        type: "trg_turnStart",
        params: {},
        powerAdd: 2,
        triggeredEffect: {
          type: "buff_stat",
          params: {
            stat: "meleeSkill",
            amount: Math.round(5 + rng() * 5),
          },
          power: 2,
        },
      };
  }
}

/**
 * Generate all 4 recruit skills for a theme.
 * Returns array of 4 GeneratedAbility objects (T1-T4), registered in the ability registry.
 *
 * Slot layout: T1 active, T2 passive (generated from T1), T3 active, T4 active/capstone.
 * The T2 passive is generated by PassiveGenerator based on the T1 active to ensure synergy.
 */
export function generateRecruitSkills(
  theme: Theme,
  rng: () => number,
): GeneratedAbility[] {
  const abilities: GeneratedAbility[] = [];

  // T1: first active
  const t1Slot = theme.progression[0]!;
  const t1 = generateAbility(t1Slot, 1, theme.id, theme.weaponAffinity, rng);
  registerAbility(t1);
  abilities.push(t1);

  // T2: passive generated from T1 active (synergistic)
  const t2Slot = theme.progression[1]!;
  if (t2Slot.isPassive) {
    const passive = generatePassiveFromActives([t1], "standard", rng, true);
    abilities.push(passive);
  } else {
    const t2 = generateAbility(t2Slot, 1, theme.id, theme.weaponAffinity, rng);
    registerAbility(t2);
    abilities.push(t2);
  }

  // T3: active
  const t3Slot = theme.progression[2]!;
  const t3 = generateAbility(t3Slot, 2, theme.id, theme.weaponAffinity, rng);
  registerAbility(t3);
  abilities.push(t3);

  // T4: capstone active
  const t4Slot = theme.progression[3]!;
  const t4 = generateAbility(t4Slot, 3, theme.id, theme.weaponAffinity, rng);
  registerAbility(t4);
  abilities.push(t4);

  return abilities;
}
