/**
 * Maps design-doc ability types (Attack, Buff, Heal, etc.) to the game's
 * EffectType + TargetingType system for procedural generation hints.
 */

import type { EffectType, TargetingType } from "./AbilityData";

export interface AbilityTypeHints {
  /** Preferred effect types for this doc type. First is most likely. */
  effects: EffectType[];
  /** Preferred targeting. */
  targeting: TargetingType;
  /** Whether this type is passive (no cost, always active). */
  isPassive: boolean;
}

/**
 * Mapping from design-doc ability type strings to game effect hints.
 * Used to bias procedural generation toward appropriate effects.
 */
export const DOC_TYPE_HINTS: Record<string, AbilityTypeHints> = {
  // Active combat types
  Attack:    { effects: ["dmg_weapon"],                        targeting: "tgt_single_enemy", isPassive: false },
  Active:    { effects: ["dmg_weapon", "dmg_spell"],           targeting: "tgt_single_enemy", isPassive: false },
  AoE:       { effects: ["dmg_spell", "dmg_weapon"],           targeting: "tgt_aoe_adjacent", isPassive: false },
  Debuff:    { effects: ["debuff_stat", "debuff_vuln"],        targeting: "tgt_single_enemy", isPassive: false },
  CC:        { effects: ["cc_stun", "cc_root", "cc_daze"],     targeting: "tgt_single_enemy", isPassive: false },
  Buff:      { effects: ["buff_stat", "buff_dmgReduce"],       targeting: "tgt_self",         isPassive: false },
  Heal:      { effects: ["heal_pctDmg"],                       targeting: "tgt_single_ally",  isPassive: false },
  Stance:    { effects: ["stance_counter", "buff_dmgReduce"],  targeting: "tgt_self",         isPassive: false },
  Movement:  { effects: ["disp_push", "buff_stat"],            targeting: "tgt_self",         isPassive: false },
  Summon:    { effects: ["buff_stat"],                         targeting: "tgt_self",         isPassive: false },
  Channel:   { effects: ["dmg_spell"],                         targeting: "tgt_single_enemy", isPassive: false },
  Ultimate:  { effects: ["dmg_weapon", "buff_stat"],           targeting: "tgt_aoe_adjacent", isPassive: false },
  Toggle:    { effects: ["buff_stat", "stance_counter"],       targeting: "tgt_self",         isPassive: false },
  Cleanse:   { effects: ["buff_stat", "heal_pctDmg"],          targeting: "tgt_single_ally",  isPassive: false },
  Stealth:   { effects: ["buff_stat"],                         targeting: "tgt_self",         isPassive: false },
  Transform: { effects: ["buff_stat", "buff_dmgReduce"],       targeting: "tgt_self",         isPassive: false },
  Utility:   { effects: ["buff_stat", "res_apRefund"],         targeting: "tgt_self",         isPassive: false },

  // Passive types
  Passive:   { effects: ["buff_stat"],                         targeting: "tgt_self",         isPassive: true },
  Reactive:  { effects: ["dmg_weapon", "buff_dmgReduce"],      targeting: "tgt_self",         isPassive: true },
  Aura:      { effects: ["buff_stat", "debuff_stat"],          targeting: "tgt_self",         isPassive: true },
};

/** Normalize a doc type string (handles compound types like "Passive/Active"). */
export function normalizeDocType(docType: string): string {
  // "Passive/Active" → use first
  const first = docType.split("/")[0]!.trim();
  // Title-case
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** Get hints for a doc ability type. Falls back to "Active" for unknown types. */
export function getDocTypeHints(docType: string): AbilityTypeHints {
  const normalized = normalizeDocType(docType);
  return DOC_TYPE_HINTS[normalized] ?? DOC_TYPE_HINTS["Active"]!;
}

/** Whether a doc type should be treated as a passive ability. */
export function isDocTypePassive(docType: string): boolean {
  return getDocTypeHints(docType).isPassive;
}
