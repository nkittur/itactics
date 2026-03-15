/**
 * Default effect params by effect type and tier (for ruleset abilities).
 * Used when building ruleset from skill_trees when mapping doesn't override.
 */

import type { EffectType } from "../AbilityData";

export function getDefaultEffectParams(type: EffectType, tier: number): Record<string, number | string> {
  const t = Math.min(5, Math.max(1, tier));
  switch (type) {
    case "dmg_weapon":
      return { multiplier: 1.2 };
    case "dmg_execute":
      return { multiplier: 1.2, hpThreshold: 30, bonusMult: 0.5 };
    case "dmg_multihit":
      return { hits: 2, multPerHit: 0.6 };
    case "dmg_spell":
      return { multiplier: 1.2 };
    case "dmg_reflect":
      return { pct: 30, turns: 2 };
    case "dot_bleed":
      return { dmgPerTurn: 4, turns: 2 };
    case "dot_burn":
      return { dmgPerTurn: 4, turns: 2 };
    case "dot_poison":
      return { dmgPerTurn: 3, turns: 3 };
    case "disp_push":
      return { distance: 1 };
    case "disp_teleport":
      return { range: 3 };
    case "disp_dash":
      return { range: 3, damageOnArrival: 0.8 };
    case "disp_pull":
      return { distance: 2 };
    case "cc_stun":
      return { chance: 80 };
    case "cc_root":
      return { turns: 1 };
    case "cc_daze":
      return { apLoss: 1, turns: 1 };
    case "cc_fear":
      return { chance: 75, turns: 1 };
    case "cc_silence":
      return { turns: 2 };
    case "cc_taunt":
      return { turns: 2 };
    case "cc_charm":
      return { turns: 1, chance: 60 };
    case "debuff_stat":
      return { stat: "meleeSkill", amount: 10, turns: 2 };
    case "debuff_vuln":
      return { bonusDmg: 20, turns: 2 };
    case "debuff_armor":
      return { pct: 30, turns: 2 };
    case "debuff_healReduce":
      return { pct: 30, turns: 2 };
    case "buff_stat":
      return { stat: "initiative", amount: 15, turns: 2 };
    case "buff_dmgReduce":
      return { percent: 20, turns: 2 };
    case "buff_stealth":
      return { turns: 2, breakOnAttack: 1 };
    case "buff_shield":
      return { amount: 20, turns: 2 };
    case "stance_counter":
      return { maxCounters: 3 };
    case "stance_overwatch":
      return { maxTriggers: 3 };
    case "res_apRefund":
      return { amount: 2 };
    case "grant_ap":
      return { amount: 9 };
    case "heal_pctDmg":
      return { pct: 30 };
    case "heal_flat":
      return { amount: 25 };
    case "heal_hot":
      return { healPerTurn: 8, turns: 2 };
    case "lifesteal":
      return { pct: 30 };
    case "summon_unit":
      return { hp: 30, turns: 3, count: 1 };
    case "zone_persist":
      return { radius: 2, turns: 3, dmgPerTurn: 4 };
    case "trap_place":
      return { count: 1, triggerDmg: 15 };
    case "channel_dmg":
      return { dmgPerTurn: 10, turns: 2 };
    case "transform_state":
      return { turns: 3, bonusPct: 25 };
    case "cleanse":
      return { count: 2 };
    case "cooldown_reset":
      return {};
    case "extend_status":
      return { statusId: "", turns: 1 };
    case "apply_status":
      return { statusId: "", turns: 1 };
    case "apply_status_self":
      return { statusId: "", turns: 1 };
    case "dmg_to_attacker":
      return { amount: 15 };
    case "apply_status_to_attacker":
      return { statusId: "poison", turns: 2 };
    default:
      return {};
  }
}

export function getTargetingParams(type: string): Record<string, number> {
  switch (type) {
    case "tgt_single_enemy":
    case "tgt_single_ally":
      return { range: 1 };
    case "tgt_aoe_adjacent":
      return { range: 1 };
    case "tgt_aoe_radius2":
      return { radius: 2 };
    case "tgt_aoe_radius3":
      return { radius: 3 };
    case "tgt_aoe_cone":
    case "tgt_aoe_line":
      return { range: 2 };
    default:
      return {};
  }
}
