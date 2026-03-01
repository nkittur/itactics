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
  Heal:      { effects: ["heal_flat"],                          targeting: "tgt_single_ally",  isPassive: false },
  Stance:    { effects: ["stance_counter", "buff_dmgReduce"],  targeting: "tgt_self",         isPassive: false },
  Movement:  { effects: ["disp_dash", "disp_teleport"],        targeting: "tgt_self",         isPassive: false },
  Summon:    { effects: ["summon_unit"],                        targeting: "tgt_self",         isPassive: false },
  Channel:   { effects: ["channel_dmg"],                       targeting: "tgt_single_enemy", isPassive: false },
  Ultimate:  { effects: ["transform_state", "dmg_weapon"],     targeting: "tgt_aoe_adjacent", isPassive: false },
  Toggle:    { effects: ["buff_stat", "stance_counter"],       targeting: "tgt_self",         isPassive: false },
  Cleanse:   { effects: ["heal_flat", "buff_stat"],            targeting: "tgt_single_ally",  isPassive: false },
  Stealth:   { effects: ["buff_stealth"],                      targeting: "tgt_self",         isPassive: false },
  Transform: { effects: ["transform_state", "buff_stat"],      targeting: "tgt_self",         isPassive: false },
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

/**
 * Synergy conditions (creates/exploits) appropriate for each doc type.
 * Used when building synthetic ThemeProgressionSlots from doc type hints.
 */
export const DOC_TYPE_CONDITIONS: Record<string, { creates: string[]; exploits: string[] }> = {
  Attack:    { creates: ["debuffed"],   exploits: [] },
  Active:    { creates: ["debuffed"],   exploits: [] },
  AoE:       { creates: ["debuffed"],   exploits: [] },
  Debuff:    { creates: ["debuffed"],   exploits: [] },
  CC:        { creates: ["stunned"],    exploits: [] },
  Buff:      { creates: [],             exploits: [] },
  Heal:      { creates: [],             exploits: [] },
  Stance:    { creates: ["in_stance"],  exploits: [] },
  Movement:  { creates: [],             exploits: [] },
  Summon:    { creates: [],             exploits: [] },
  Channel:   { creates: ["debuffed"],   exploits: [] },
  Ultimate:  { creates: ["debuffed"],   exploits: [] },
  Toggle:    { creates: ["in_stance"],  exploits: [] },
  Cleanse:   { creates: [],             exploits: [] },
  Stealth:   { creates: [],             exploits: [] },
  Transform: { creates: ["in_stance"],  exploits: [] },
  Utility:   { creates: [],             exploits: [] },
  Passive:   { creates: [],             exploits: [] },
  Reactive:  { creates: [],             exploits: [] },
  Aura:      { creates: [],             exploits: [] },
};

/** Get synergy conditions for a doc type. Falls back to empty. */
export function getDocTypeConditions(docType: string): { creates: string[]; exploits: string[] } {
  const normalized = normalizeDocType(docType);
  return DOC_TYPE_CONDITIONS[normalized] ?? { creates: [], exploits: [] };
}

// Note: Description-level effect mapping is now handled by
// src/data/parsed/AbilityEffectMappings.ts (LLM-generated).
// The DOC_TYPE_HINTS above serve as a fallback for unmapped abilities.
