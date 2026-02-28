import type { TargetingDef } from "@combat/TargetingSystem";
import type { ExtendedDamageType } from "@combat/DamagePipeline";

// ── Identity ──

export type AbilityType =
  | "active"          // Standard activated ability
  | "passive"         // Always-on effect with triggers
  | "reactive"        // Fires in response to events (counter, overwatch)
  | "stance"          // Toggle that modifies stats/behavior
  | "transformation"  // Changes form temporarily
  | "summon";         // Creates an entity

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

// ── Effect System (40+ types) ──

export type AbilityEffectType =
  // Damage
  | "damage"            // Deal damage (uses pipeline)
  | "damage_percent_hp" // Deal % of target's max HP
  | "damage_percent_current_hp" // Deal % of target's current HP
  | "damage_execute"    // Bonus damage based on missing HP
  | "damage_multihit"   // Multiple hits (N times)
  | "damage_lifesteal"  // Deal damage + heal attacker
  | "damage_splash"     // Primary target + reduced to adjacent
  | "damage_delayed"    // Damage applied after N turns
  | "damage_reflect"    // Reflect % of incoming damage
  | "damage_recorded"   // Replay recorded damage from buffer

  // Healing
  | "heal"              // Heal flat amount
  | "heal_percent"      // Heal % of max HP
  | "heal_over_time"    // Apply HoT status
  | "heal_absorb"       // Create a shield (temp HP)
  | "heal_transfer"     // Transfer HP from self to target
  | "resurrect"         // Revive dead entity

  // Status Effects
  | "status_apply"      // Apply a status effect
  | "status_remove"     // Remove a status effect
  | "status_transfer"   // Move status from self to target
  | "status_steal"      // Steal a buff from target
  | "status_extend"     // Extend duration of existing effects
  | "dispel"            // Remove dispellable effects

  // Crowd Control
  | "cc_stun"           // Apply stun
  | "cc_root"           // Apply root
  | "cc_silence"        // Apply silence
  | "cc_fear"           // Apply fear
  | "cc_charm"          // Apply charm
  | "cc_taunt"          // Apply taunt
  | "cc_blind"          // Apply blind
  | "cc_sleep"          // Apply sleep (broken by damage)
  | "cc_petrify"        // Apply petrify

  // Movement
  | "move_push"         // Push target away
  | "move_pull"         // Pull target toward caster
  | "move_swap"         // Swap positions with target
  | "move_teleport"     // Move target to a hex
  | "move_dash"         // Caster moves to target hex

  // Resource
  | "resource_modify"   // Modify a resource (+/-)
  | "resource_steal"    // Steal resource from target
  | "resource_convert"  // Convert one resource to another

  // Buff/Stat
  | "buff_stat"         // Temporary stat modification
  | "buff_damage_type"  // Change damage type temporarily

  // Summoning
  | "summon"            // Create a summon entity
  | "summon_sacrifice"  // Destroy a summon for an effect
  | "summon_merge"      // Merge with a summon (transformation)

  // Terrain/Zone
  | "zone_create"       // Create a persistent zone
  | "zone_modify"       // Modify an existing zone
  | "terrain_modify"    // Change terrain type

  // Transformation
  | "transform"         // Enter a new form
  | "transform_end"     // End current transformation

  // Time
  | "time_rewind"       // Rewind entity state
  | "time_record_start" // Start recording damage
  | "time_record_stop"  // Stop recording, store buffer
  | "time_stop"         // Freeze an entity in time
  | "time_delay"        // Schedule a future effect

  // Utility
  | "combo_advance"     // Advance combo counter
  | "mark"              // Apply a targetable mark
  | "taunt_area"        // Force enemies to target caster
  | "stealth"           // Enter stealth
  | "copy_ability"      // Copy target's last used ability
  | "random_effect"     // Choose random effect from a list
  | "chain_effect";     // Apply effect, then chain to next target

/** A single effect in an ability's effect array. */
export interface AbilityEffect {
  type: AbilityEffectType;
  /** Parameters specific to the effect type. */
  params: Record<string, any>;
  /** Targeting override (if different from ability targeting). */
  targetingOverride?: TargetingDef;
  /** Conditions that must be true for this effect to fire. */
  conditions?: EffectCondition[];
  /** Chance to apply (0-100). 100 = always. */
  chance: number;
  /** Power budget cost for procedural generation. */
  power: number;
}

/** Condition for an effect to activate. */
export interface EffectCondition {
  type: EffectConditionType;
  params: Record<string, any>;
  /** If true, condition is inverted (NOT). */
  negate: boolean;
}

export type EffectConditionType =
  | "target_has_status"
  | "target_hp_below"
  | "target_hp_above"
  | "caster_has_status"
  | "caster_hp_below"
  | "caster_resource_above"
  | "caster_resource_below"
  | "target_is_type"
  | "random_chance"
  | "target_adjacent_count"
  | "combo_count_above";

// ── Trigger System (for passives) ──

export type TriggerType =
  | "on_hit"              // When caster deals damage
  | "on_kill"             // When caster kills a target
  | "on_dodge"            // When caster dodges an attack
  | "on_death"            // When this entity dies
  | "on_turn_start"       // At the start of this entity's turn
  | "on_turn_end"         // At the end of this entity's turn
  | "on_round_start"      // At the start of each round
  | "on_resource_full"    // When a resource reaches max
  | "on_resource_empty"   // When a resource reaches 0
  | "on_status_applied"   // When a status is applied to this entity
  | "on_status_removed"   // When a status is removed
  | "on_enter_zone"       // When entering a zone
  | "on_exit_zone"        // When leaving a zone
  | "on_ability_used"     // When any ability is used
  | "on_shield_break"     // When a shield is broken
  | "on_summon_created"   // When a summon is created
  | "on_summon_destroyed" // When a summon is destroyed
  | "on_damage_taken"     // When this entity takes damage
  | "on_heal_received"    // When this entity is healed
  | "on_crit"             // When caster lands a critical hit
  | "on_ally_death"       // When an ally dies
  | "on_ally_damaged"     // When an ally takes damage
  | "periodic"            // Every N turns
  | "hp_below"            // While HP is below X%
  | "hp_above"            // While HP is above X%
  | "consecutive_hits"    // After N consecutive hits
  | "stack_threshold"     // When status reaches N stacks
  | "resource_threshold"  // When resource crosses a threshold
  | "on_combo"            // When combo counter reaches N
  | "on_transformation";  // When entering/leaving a form

/** A trigger definition for passive/reactive abilities. */
export interface AbilityTrigger {
  type: TriggerType;
  params: Record<string, any>;
  /** All conditions must be true for trigger to fire. */
  conditions: EffectCondition[];
  /** Cooldown in turns before this trigger can fire again. */
  cooldown: number;
  /** Max times this can fire per turn. 0 = unlimited. */
  maxFiresPerTurn: number;
  /** Max times this can fire per combat. 0 = unlimited. */
  maxFiresPerCombat: number;
  /** Probability of firing (0-100). */
  chance: number;
  /** Effects to apply when triggered. */
  effects: AbilityEffect[];
}

// ── Cost ──

/** Resource costs for using an ability. */
export interface AbilityCost {
  /** Action points. */
  ap: number;
  /** Generic resource costs (key = resource def id, value = amount). */
  resources: Record<string, number>;
  /** HP cost (self-damage). */
  hp: number;
  /** Whether this ability ends the turn. */
  turnEnding: boolean;
}

/** Cooldown configuration. */
export interface CooldownConfig {
  /** Base cooldown in turns. 0 = no cooldown. */
  turns: number;
  /** Number of charges. 1 = standard cooldown. */
  charges: number;
  /** Conditions that reset the cooldown. */
  resetConditions: TriggerType[];
}

/** Requirements to use an ability. */
export interface AbilityRequirement {
  type: RequirementType;
  params: Record<string, any>;
}

export type RequirementType =
  | "weapon_family"     // Must have specific weapon equipped
  | "weapon_type"       // Must have ranged/melee weapon
  | "stance_active"     // Must be in a specific stance
  | "status_active"     // Must have a specific status
  | "resource_above"    // Resource must be above threshold
  | "resource_below"    // Resource must be below threshold
  | "hp_above"          // HP must be above %
  | "hp_below"          // HP must be below %
  | "has_summon"        // Must have active summon
  | "no_summon"         // Must NOT have active summon
  | "in_form"           // Must be in specific transformation
  | "not_in_form"       // Must NOT be in specific transformation
  | "target_marked"     // Target must have a mark
  | "adjacent_to_ally"  // Must be adjacent to an ally
  | "combo_count";      // Must have N combo points

// ── The Unified AbilityDef ──

/**
 * Single unified schema for all 3,600+ skills.
 * Covers active abilities, passives, reactives, stances, transformations, and summons.
 */
export interface AbilityDef {
  // ── Identity ──
  /** Unique identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Description (may include dynamic values). */
  description: string;
  /** Which class this belongs to. Empty string for generic. */
  classId: string;
  /** Which archetype within the class. */
  archetypeId: string;
  /** Skill tier (1-5 for tree, 0 for generic). */
  tier: number;
  /** Rarity for loot/generation. */
  rarity: Rarity;
  /** Ability type. */
  abilityType: AbilityType;
  /** Icon identifier. */
  icon: string;

  // ── Targeting ──
  /** How this ability selects targets. */
  targeting: TargetingDef;

  // ── Cost ──
  /** Resource costs to use this ability. */
  cost: AbilityCost;
  /** Cooldown configuration. */
  cooldown: CooldownConfig;
  /** Requirements that must be met to use. */
  requirements: AbilityRequirement[];

  // ── Effects ──
  /** Effects applied when the ability is used. */
  effects: AbilityEffect[];

  // ── Triggers (for passives/reactives) ──
  /** Trigger definitions. Only used for passive/reactive abilities. */
  triggers: AbilityTrigger[];

  // ── Stance (for stance type) ──
  /** Stat modifiers while stance is active. */
  stanceModifiers?: Record<string, number>;
  /** Effects applied each turn while stance is active. */
  stanceTurnEffects?: AbilityEffect[];

  // ── Transformation (for transformation type) ──
  /** Transformation definition id to apply. */
  transformationId?: string;

  // ── Summon (for summon type) ──
  /** Summon definition to create. */
  summonDef?: SummonAbilityDef;

  // ── Combo/Synergy ──
  /** Tags that this ability creates for combo tracking. */
  comboCreates: string[];
  /** Tags that this ability benefits from / exploits. */
  comboExploits: string[];
  /** Synergy tags for build recommendations. */
  synergyTags: string[];

  // ── Procedural Generation ──
  /** Power budget for balancing. */
  powerBudget: number;
  /** Weapon family requirements. Empty = any weapon. */
  weaponReq: string[];

  // ── Animation ──
  /** Animation to play when used. */
  animation: string;
  /** Sound effect to play. */
  sfx: string;
}

/** Definition for a summon created by an ability. */
export interface SummonAbilityDef {
  /** Template id for the summon. */
  templateId: string;
  /** Override base stats. */
  statOverrides: Record<string, number>;
  /** AI type for the summon. */
  aiType: string;
  /** Maximum lifetime in turns. 0 = permanent. */
  lifetime: number;
  /** Max number of this summon type active at once. */
  maxCount: number;
  /** Abilities the summon gets. */
  abilityIds: string[];
}

// ── AbilityDef Registry ──

const abilityDefs = new Map<string, AbilityDef>();

export function registerAbilityDef(def: AbilityDef): void {
  abilityDefs.set(def.id, def);
}

export function getAbilityDef(id: string): AbilityDef | undefined {
  return abilityDefs.get(id);
}

export function getAllAbilityDefs(): AbilityDef[] {
  return [...abilityDefs.values()];
}

export function getAbilityDefsByClass(classId: string): AbilityDef[] {
  return [...abilityDefs.values()].filter(a => a.classId === classId);
}

export function getAbilityDefsByArchetype(classId: string, archetypeId: string): AbilityDef[] {
  return [...abilityDefs.values()].filter(a => a.classId === classId && a.archetypeId === archetypeId);
}

// ── Legacy Adapter ──

import type { GeneratedAbility, EffectPrimitive, TargetingPrimitive, ModifierPrimitive, TriggerPrimitive, AbilityCost as LegacyCost } from "./AbilityData";
import { selfTarget as selfTgt, singleEnemyTarget, circleAoE } from "@combat/TargetingSystem";

/**
 * Convert a legacy GeneratedAbility to the new UnifiedAbilityDef format.
 */
export function fromLegacyAbility(legacy: GeneratedAbility): AbilityDef {
  // Convert targeting
  const targeting = convertLegacyTargeting(legacy.targeting);

  // Convert effects
  const effects: AbilityEffect[] = legacy.effects.map(convertLegacyEffect);

  // Convert triggers
  const triggers: AbilityTrigger[] = legacy.triggers.map(convertLegacyTrigger);

  // Convert cost
  const cost: AbilityCost = {
    ap: legacy.cost.ap,
    resources: {
      ...(legacy.cost.stamina > 0 ? { stamina: legacy.cost.stamina } : {}),
      ...(legacy.cost.mana > 0 ? { mana: legacy.cost.mana } : {}),
    },
    hp: 0,
    turnEnding: legacy.cost.turnEnding,
  };

  return {
    id: legacy.uid,
    name: legacy.name,
    description: legacy.description,
    classId: "",
    archetypeId: "",
    tier: legacy.tier,
    rarity: legacy.rarity,
    abilityType: legacy.isPassive ? "passive" : "active",
    icon: "",
    targeting,
    cost,
    cooldown: { turns: legacy.cost.cooldown, charges: 1, resetConditions: [] },
    requirements: legacy.weaponReq.map(w => ({ type: "weapon_family" as RequirementType, params: { family: w } })),
    effects,
    triggers,
    comboCreates: legacy.synergyTags.creates,
    comboExploits: legacy.synergyTags.exploits,
    synergyTags: [...legacy.synergyTags.creates, ...legacy.synergyTags.exploits],
    powerBudget: legacy.powerBudget,
    weaponReq: legacy.weaponReq,
    animation: "",
    sfx: "",
  };
}

function convertLegacyTargeting(t: TargetingPrimitive): TargetingDef {
  switch (t.type) {
    case "tgt_single_enemy":
      return singleEnemyTarget(t.params.range ?? 1);
    case "tgt_single_ally":
      return {
        mode: "entity", shape: "single",
        minRange: 1, maxRange: t.params.range ?? 3, radius: 0,
        requiresLoS: true, throughWalls: false,
        faction: "ally", filters: [{ type: "alive", params: {} }],
        countMode: "all", countLimit: 1, includeCaster: false,
      };
    case "tgt_self":
      return selfTgt();
    case "tgt_aoe_adjacent":
      return circleAoE(0, 1, "enemy");
    default:
      return singleEnemyTarget(1);
  }
}

function convertLegacyEffect(e: EffectPrimitive): AbilityEffect {
  const typeMap: Record<string, AbilityEffectType> = {
    dmg_weapon: "damage",
    dmg_execute: "damage_execute",
    dmg_multihit: "damage_multihit",
    dmg_spell: "damage",
    dot_bleed: "status_apply",
    dot_burn: "status_apply",
    dot_poison: "status_apply",
    disp_push: "move_push",
    cc_stun: "cc_stun",
    cc_root: "cc_root",
    cc_daze: "status_apply",
    debuff_stat: "buff_stat",
    debuff_vuln: "status_apply",
    buff_stat: "buff_stat",
    buff_dmgReduce: "status_apply",
    stance_counter: "status_apply",
    stance_overwatch: "status_apply",
    res_apRefund: "resource_modify",
    heal_pctDmg: "damage_lifesteal",
  };

  return {
    type: typeMap[e.type] ?? "damage",
    params: { ...e.params, legacyType: e.type },
    chance: 100,
    power: e.power,
  };
}

function convertLegacyTrigger(t: TriggerPrimitive): AbilityTrigger {
  const typeMap: Record<string, TriggerType> = {
    trg_onKill: "on_kill",
    trg_onHit: "on_hit",
    trg_onTakeDamage: "on_damage_taken",
    trg_turnStart: "on_turn_start",
    trg_belowHP: "hp_below",
  };

  return {
    type: typeMap[t.type] ?? "on_hit",
    params: { ...t.params },
    conditions: [],
    cooldown: 0,
    maxFiresPerTurn: 0,
    maxFiresPerCombat: 0,
    chance: 100,
    effects: t.triggeredEffect ? [convertLegacyEffect(t.triggeredEffect)] : [],
  };
}
