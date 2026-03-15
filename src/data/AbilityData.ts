// ── Rarity ──

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

// ── Effect types ──

export type EffectType =
  // Damage
  | "dmg_weapon" | "dmg_execute" | "dmg_multihit" | "dmg_spell" | "dmg_reflect"
  // DoTs
  | "dot_bleed" | "dot_burn" | "dot_poison"
  // Displacement
  | "disp_push" | "disp_teleport" | "disp_dash" | "disp_pull"
  // Crowd control
  | "cc_stun" | "cc_root" | "cc_daze" | "cc_fear" | "cc_silence" | "cc_taunt" | "cc_charm"
  // Debuffs
  | "debuff_stat" | "debuff_vuln" | "debuff_armor" | "debuff_healReduce"
  // Buffs
  | "buff_stat" | "buff_dmgReduce" | "buff_stealth" | "buff_shield"
  // Stances
  | "stance_counter" | "stance_overwatch"
  // Resource (instant when from triggers)
  | "res_apRefund" | "res_mana" | "res_stamina" | "res_mp"
  // Grant AP this turn (e.g. Overclock double AP — uncapped, not a refund)
  | "grant_ap"
  // Triggered utility (e.g. on kill: extend buff; turn start: apply status)
  | "extend_status" | "apply_status"
  // Trigger-only: deal flat damage to the attacker (e.g. Afterimage on dodge)
  | "dmg_to_attacker"
  // Trigger-only (onTakeDamage): apply status to the attacker (e.g. Toxic Skin: poison melee attackers)
  | "apply_status_to_attacker"
  // Active: apply named status to target or to self
  | "apply_status_self"
  // Healing
  | "heal_pctDmg" | "heal_flat" | "heal_hot" | "lifesteal"
  // Summoning / zones / traps
  | "summon_unit" | "zone_persist" | "trap_place"
  // Channeling / transforms
  | "channel_dmg" | "transform_state"
  // Utility
  | "cleanse" | "cooldown_reset";

export interface EffectPrimitive {
  type: EffectType;
  params: Record<string, number | string>;
  /** Power cost of this effect for budget calculation. */
  power: number;
}

export type TargetingType =
  | "tgt_single_enemy" | "tgt_single_ally" | "tgt_self"
  | "tgt_aoe_adjacent" | "tgt_aoe_cone" | "tgt_aoe_line"
  | "tgt_aoe_radius2" | "tgt_aoe_radius3"
  | "tgt_all_allies" | "tgt_all_enemies";

export interface TargetingPrimitive {
  type: TargetingType;
  params: Record<string, number>;
  /** Multiplier applied to total effect power. */
  powerMult: number;
}

export type ModifierType =
  | "mod_accuracy" | "mod_armorIgnore" | "mod_armorDmg"
  | "mod_headTarget" | "mod_requireState" | "mod_turnEnding"
  | "mod_hpCost" | "mod_cooldownReset";

export interface ModifierPrimitive {
  type: ModifierType;
  params: Record<string, number | string>;
  /** Additive power adjustment. */
  powerAdd: number;
}

export type TriggerType = "trg_onKill" | "trg_onHit" | "trg_onTakeDamage" | "trg_turnStart" | "trg_belowHP"
  | "trg_onAllyDeath" | "trg_onSummonDeath" | "trg_onDodge";

/** Condition that must be true for the trigger to fire (e.g. "while hasted"). */
export type TriggerCondition =
  | { type: "has_status"; statusId: string }
  | { type: "below_hp_percent"; percent: number }
  | { type: "above_hp_percent"; percent: number };

export interface TriggerPrimitive {
  type: TriggerType;
  params: Record<string, number>;
  /** Additive power adjustment. */
  powerAdd: number;
  /** Effect fired when trigger activates. */
  triggeredEffect?: EffectPrimitive;
  /** If set, trigger only fires when this condition is true (e.g. "while hasted" = has_status haste). */
  condition?: TriggerCondition;
}

/** When to apply an effect: immediately or at end of caster's turn. */
export type EffectDelay = "immediate" | "end_of_turn";

/** Instant resource grants from triggers (on kill, on dodge, etc.). Applied immediately to the beneficiary. */
export interface TriggerGrants {
  ap?: number;
  mp?: number;
  hp?: number;
  mana?: number;
  stamina?: number;
}

export interface AbilityCost {
  ap: number;
  stamina: number;
  mana: number;
  /** 0 = no cooldown. */
  cooldown: number;
  turnEnding: boolean;
  /** HP self-cost (deducted before execution). 0 = none. */
  hpCost?: number;
  /** Custom resource costs (key = resource def id, value = amount). */
  resourceCosts?: Record<string, number>;
  /** Custom resources generated on use (key = resource def id, value = amount). */
  resourceGenerate?: Record<string, number>;
}

export interface GeneratedAbility {
  uid: string;                    // "ga_..."
  name: string;
  description: string;
  targeting: TargetingPrimitive;
  effects: EffectPrimitive[];     // 1-3
  modifiers: ModifierPrimitive[]; // 0-3
  triggers: TriggerPrimitive[];   // 0-1
  cost: AbilityCost;
  powerBudget: number;
  /** WeaponFamily[] — empty = any weapon. */
  weaponReq: string[];
  tier: 1 | 2 | 3;
  isPassive: boolean;
  rarity: Rarity;
  synergyTags: { creates: string[]; exploits: string[] };
  /** If set, this ability gets bonus effects when used after the named ability. */
  comboFrom?: string;
  /** If true, applies buff effects to allies and debuff/damage to enemies in same AoE. */
  dualTarget?: boolean;
  /** If true, after executing (e.g. Flicker Strike), move caster back to their pre-cast position. */
  returnToStoredPositionAfterExecute?: boolean;
}

// ── UID generation (same pattern as GeneratedItemData.ts gi_ → ga_) ──

let uidCounter = 0;

export function generateAbilityUID(): string {
  const ts = Date.now().toString(36);
  const cnt = (uidCounter++).toString(36);
  const rnd = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");
  return `ga_${ts}${cnt}${rnd}`;
}

export function isGeneratedAbilityId(id: string): boolean {
  return id.startsWith("ga_");
}
