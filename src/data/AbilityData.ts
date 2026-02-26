// ── Effect types (V1: 14 of 30 — enough for all 7 theme progressions) ──

export type EffectType =
  | "dmg_weapon" | "dmg_execute" | "dmg_multihit"
  | "dot_bleed"
  | "disp_push"
  | "cc_stun" | "cc_root" | "cc_daze"
  | "debuff_stat" | "debuff_vuln"
  | "buff_stat" | "buff_dmgReduce"
  | "stance_counter" | "stance_overwatch"
  | "res_apRefund";

export interface EffectPrimitive {
  type: EffectType;
  params: Record<string, number | string>;
  /** Power cost of this effect for budget calculation. */
  power: number;
}

export type TargetingType = "tgt_single_enemy" | "tgt_single_ally" | "tgt_self" | "tgt_aoe_adjacent";

export interface TargetingPrimitive {
  type: TargetingType;
  params: Record<string, number>;
  /** Multiplier applied to total effect power. */
  powerMult: number;
}

export type ModifierType =
  | "mod_accuracy" | "mod_armorIgnore" | "mod_armorDmg"
  | "mod_headTarget" | "mod_requireState" | "mod_turnEnding";

export interface ModifierPrimitive {
  type: ModifierType;
  params: Record<string, number | string>;
  /** Additive power adjustment. */
  powerAdd: number;
}

export type TriggerType = "trg_onKill" | "trg_onHit" | "trg_onTakeDamage" | "trg_turnStart" | "trg_belowHP";

export interface TriggerPrimitive {
  type: TriggerType;
  params: Record<string, number>;
  /** Additive power adjustment. */
  powerAdd: number;
  /** Effect fired when trigger activates. */
  triggeredEffect?: EffectPrimitive;
}

export interface AbilityCost {
  ap: number;
  fatigue: number;
  /** 0 = no cooldown. */
  cooldown: number;
  turnEnding: boolean;
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
  synergyTags: { creates: string[]; exploits: string[] };
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
