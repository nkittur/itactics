/**
 * Ruleset data schema for a multiverse/universe.
 * One ruleset = one set of classes + abilities (data only; combat rules are shared).
 */

import type { EffectType, TriggerType, TriggerCondition } from "../AbilityData";

// ── Effect (engine-executable) ──

export interface RulesetEffect {
  type: EffectType;
  params: Record<string, number | string>;
}

// ── Trigger condition ("while X") ──
export type { TriggerCondition };

// ── Targeting (matches AbilityData) ──

export type RulesetTargetingType =
  | "tgt_single_enemy" | "tgt_single_ally" | "tgt_self"
  | "tgt_aoe_adjacent" | "tgt_aoe_cone" | "tgt_aoe_line"
  | "tgt_aoe_radius2" | "tgt_aoe_radius3"
  | "tgt_all_allies" | "tgt_all_enemies";

export interface RulesetTargeting {
  type: RulesetTargetingType;
  params: Record<string, number>;
}

// ── Cost ──

export interface RulesetAbilityCost {
  ap: number;
  stamina: number;
  mana: number;
  cooldown: number;
  turnEnding: boolean;
  hpCost?: number;
}

// ── Ability definition (in ruleset data) ──

export type RulesetAbilityType =
  | "Attack" | "Buff" | "Passive" | "Movement" | "Debuff" | "Heal"
  | "CC" | "Summon" | "Stance" | "Reactive" | "Aura" | "Ultimate"
  | "Active" | "Channel" | "Toggle" | "Cleanup" | "Utility";

/** Optional trigger for passives/reactives (e.g. onKill, onTakeDamage). */
export interface RulesetTrigger {
  type: TriggerType;
  triggeredEffect: RulesetEffect;
  /** If set, trigger only fires when condition is true (e.g. "while hasted"). */
  condition?: TriggerCondition;
}

export interface RulesetAbilityDef {
  id: string;
  name: string;
  type: RulesetAbilityType;
  description: string;
  targeting: RulesetTargeting;
  effects: RulesetEffect[];
  cost: RulesetAbilityCost;
  /** If true, engine may not support all effects; run what is supported. */
  notFullyImplemented?: boolean;
  /** Weapon families required (empty = any). */
  weaponReq?: string[];
  /** For passives/reactives: when to fire and what effect to apply. */
  trigger?: RulesetTrigger;
  /** If true, after executing (e.g. Flicker Strike), move caster back to pre-cast position. */
  returnToStoredPositionAfterExecute?: boolean;
}

// ── Ability slot in a tree (references ability by id) ──

export interface RulesetAbilitySlot {
  abilityId: string;
  tier: 1 | 2 | 3 | 4 | 5;
  position: number;
  /** Node IDs (e.g. tier_position) that must be unlocked first. */
  prerequisites?: string[];
}

// ── Archetype ──

export interface RulesetArchetype {
  id: string;
  name: string;
  mechanic: string;
  identity: string;
  abilitySlots: RulesetAbilitySlot[];
}

// ── Class ──

export interface RulesetClass {
  id: string;
  name: string;
  subtitle: string;
  fantasy: string;
  archetypes: [RulesetArchetype, RulesetArchetype, RulesetArchetype];
}

// ── Ruleset (full dataset for one universe) ──

export interface Ruleset {
  id: string;
  name?: string;
  /** All classes in this ruleset. */
  classes: RulesetClass[];
  /** All abilities keyed by id. */
  abilities: RulesetAbilityDef[];
}
