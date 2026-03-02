import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { StatusEffectsComponent, StatusEffect } from "@entities/components/StatusEffects";
import type { HealthComponent } from "@entities/components/Health";
import type { RNG } from "@utils/RNG";
import type { EventBus } from "@core/EventBus";

// ── Data-Driven Status Effect Definitions ──

export type StackBehavior =
  | "independent"    // Each stack has its own timer
  | "refresh"        // New application refreshes duration of all stacks
  | "intensity";     // Stacks increase a power value, shared duration

export type EffectCategory = "buff" | "debuff" | "neutral";

/** Periodic effect that ticks each turn. */
export interface PeriodicEffect {
  /** Damage per stack per tick. 0 if non-damaging. */
  damagePerTick: number;
  /** Damage type for periodic damage. */
  damageType: string;
  /** Healing per tick (positive = heal). */
  healPerTick: number;
  /** Resource to modify per tick. */
  resourceModify?: { resourceId: string; amount: number };
}

/** Interaction between two status effects. */
export interface StatusInteraction {
  /** The other effect id that triggers this interaction. */
  withEffect: string;
  /** Result effect id to apply (replaces both). */
  resultEffect: string;
  /** Whether to remove both source effects. */
  removeBoth: boolean;
}

/** Behavioral flags that modify entity behavior. */
export interface BehavioralFlags {
  skipTurn: boolean;
  cannotCast: boolean;
  cannotMove: boolean;
  fleeAI: boolean;
  intangible: boolean;
  invisible: boolean;
  silenced: boolean;
  disarmed: boolean;
  invulnerable: boolean;
  taunted: boolean;
  charmed: boolean;
  phased: boolean;      // Can move through walls/entities
  flying: boolean;
  rooted: boolean;
}

/**
 * Data-driven status effect definition.
 * Loaded from JSON or registered programmatically.
 */
export interface StatusEffectDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: EffectCategory;
  readonly icon: string;

  /** Base duration in turns. */
  readonly duration: number;
  /** Maximum number of stacks. */
  readonly maxStacks: number;
  /** How stacking behaves. */
  readonly stackBehavior: StackBehavior;

  /** Stat modifiers applied while active. Keys match StatsComponent fields. */
  readonly modifiers: Record<string, number>;
  /** Whether modifiers scale per stack. */
  readonly modifiersPerStack: boolean;

  /** Periodic effects (DoT, HoT, resource drain). */
  readonly periodic: PeriodicEffect | null;

  /** Behavioral flags applied while this effect is active. */
  readonly flags: Partial<BehavioralFlags>;

  /** Effects applied when this status is first applied. */
  readonly onApplyEffects: string[];
  /** Effects applied when this status is removed. */
  readonly onRemoveEffects: string[];
  /** Effects applied to the source when this status expires naturally. */
  readonly onExpireEffects: string[];

  /** Interactions with other effects. */
  readonly interactions: StatusInteraction[];

  /** Whether this effect can be dispelled. */
  readonly dispellable: boolean;
  /** Whether this effect persists through death. */
  readonly persistsThroughDeath: boolean;

  /** Tags for filtering (e.g., "fire", "ice", "poison", "curse"). */
  readonly tags: string[];
}

// ── Effect Registry ──

const effectDefs = new Map<string, StatusEffectDef>();

export function registerStatusEffectDef(def: StatusEffectDef): void {
  effectDefs.set(def.id, def);
}

export function getStatusEffectDef(id: string): StatusEffectDef | undefined {
  return effectDefs.get(id);
}

// ── Default flags helper ──

function defaultFlags(): BehavioralFlags {
  return {
    skipTurn: false, cannotCast: false, cannotMove: false,
    fleeAI: false, intangible: false, invisible: false,
    silenced: false, disarmed: false, invulnerable: false,
    taunted: false, charmed: false, phased: false,
    flying: false, rooted: false,
  };
}

function defWithDefaults(partial: Partial<StatusEffectDef> & { id: string; name: string }): StatusEffectDef {
  return {
    description: "",
    category: "debuff",
    icon: "",
    duration: 1,
    maxStacks: 1,
    stackBehavior: "refresh",
    modifiers: {},
    modifiersPerStack: false,
    periodic: null,
    flags: {},
    onApplyEffects: [],
    onRemoveEffects: [],
    onExpireEffects: [],
    interactions: [],
    dispellable: true,
    persistsThroughDeath: false,
    tags: [],
    ...partial,
  };
}

// ── Built-in Effect Definitions (legacy + new) ──

const BUILTIN_EFFECTS: StatusEffectDef[] = [
  // Legacy effects (backward compatible)
  defWithDefaults({
    id: "stun", name: "Stunned", category: "debuff", duration: 1, maxStacks: 1,
    modifiers: { dodge: -999 }, flags: { skipTurn: true },
    tags: ["cc", "physical"],
  }),
  defWithDefaults({
    id: "bleed", name: "Bleeding", category: "debuff", duration: 2, maxStacks: 5,
    stackBehavior: "independent",
    periodic: { damagePerTick: 7, damageType: "physical", healPerTick: 0 },
    tags: ["dot", "physical"],
  }),
  defWithDefaults({
    id: "daze", name: "Dazed", category: "debuff", duration: 2, maxStacks: 1,
    modifiers: { meleeSkill: -15, dodge: -15, initiative: -15 },
    tags: ["cc", "physical"],
  }),
  defWithDefaults({
    id: "fleeing", name: "Fleeing", category: "debuff", duration: 99, maxStacks: 1,
    modifiers: { meleeSkill: -30, dodge: -30 }, flags: { fleeAI: true },
    dispellable: false, tags: ["morale"],
  }),
  defWithDefaults({
    id: "root", name: "Rooted", category: "debuff", duration: 1, maxStacks: 1,
    modifiers: { movementPoints: -999 }, flags: { rooted: true },
    tags: ["cc"],
  }),
  defWithDefaults({
    id: "vulnerable", name: "Vulnerable", category: "debuff", duration: 2, maxStacks: 1,
    tags: ["debuff"],
  }),
  defWithDefaults({
    id: "dmg_reduce", name: "Hardened", category: "buff", duration: 2, maxStacks: 1,
    tags: ["defensive"],
  }),
  defWithDefaults({
    id: "burn", name: "Burning", category: "debuff", duration: 2, maxStacks: 3,
    stackBehavior: "independent",
    periodic: { damagePerTick: 8, damageType: "fire", healPerTick: 0 },
    interactions: [{ withEffect: "freeze", resultEffect: "thermal_shock", removeBoth: true }],
    tags: ["dot", "fire"],
  }),
  defWithDefaults({
    id: "poison", name: "Poisoned", category: "debuff", duration: 3, maxStacks: 3,
    stackBehavior: "independent",
    periodic: { damagePerTick: 5, damageType: "poison", healPerTick: 0 },
    tags: ["dot", "poison"],
  }),
  defWithDefaults({
    id: "cursed", name: "Cursed", category: "debuff", duration: 2, maxStacks: 1,
    modifiers: { meleeSkill: -10 },
    tags: ["curse", "magical"],
  }),

  // New effects for expanded mechanics
  defWithDefaults({
    id: "freeze", name: "Frozen", category: "debuff", duration: 1, maxStacks: 1,
    flags: { skipTurn: true, cannotMove: true },
    modifiers: { dodge: -20 },
    interactions: [{ withEffect: "burn", resultEffect: "thermal_shock", removeBoth: true }],
    tags: ["cc", "ice"],
  }),
  defWithDefaults({
    id: "thermal_shock", name: "Thermal Shock", category: "debuff", duration: 1, maxStacks: 1,
    periodic: { damagePerTick: 25, damageType: "fire", healPerTick: 0 },
    modifiers: { dodge: -20 },
    tags: ["combo", "fire", "ice"],
  }),
  defWithDefaults({
    id: "chill", name: "Chilled", category: "debuff", duration: 3, maxStacks: 3,
    stackBehavior: "intensity",
    modifiers: { initiative: -5, movementPoints: -1 }, modifiersPerStack: true,
    tags: ["slow", "ice"],
  }),
  defWithDefaults({
    id: "fear", name: "Feared", category: "debuff", duration: 2, maxStacks: 1,
    flags: { fleeAI: true, cannotCast: true },
    tags: ["cc", "psychic"],
  }),
  defWithDefaults({
    id: "charm", name: "Charmed", category: "debuff", duration: 2, maxStacks: 1,
    flags: { charmed: true },
    tags: ["cc", "psychic"],
  }),
  defWithDefaults({
    id: "silence", name: "Silenced", category: "debuff", duration: 2, maxStacks: 1,
    flags: { silenced: true },
    tags: ["cc", "magical"],
  }),
  defWithDefaults({
    id: "disarm", name: "Disarmed", category: "debuff", duration: 1, maxStacks: 1,
    flags: { disarmed: true },
    tags: ["cc", "physical"],
  }),
  defWithDefaults({
    id: "blind", name: "Blinded", category: "debuff", duration: 2, maxStacks: 1,
    modifiers: { meleeSkill: -30, rangedSkill: -40 },
    tags: ["cc"],
  }),
  defWithDefaults({
    id: "slow", name: "Slowed", category: "debuff", duration: 2, maxStacks: 1,
    modifiers: { movementPoints: -3, initiative: -10 },
    tags: ["slow"],
  }),
  defWithDefaults({
    id: "haste", name: "Hastened", category: "buff", duration: 2, maxStacks: 1,
    modifiers: { movementPoints: 2, initiative: 15 },
    tags: ["speed"],
  }),
  defWithDefaults({
    id: "shield", name: "Shielded", category: "buff", duration: 3, maxStacks: 1,
    tags: ["defensive", "shield"],
  }),
  defWithDefaults({
    id: "regen", name: "Regenerating", category: "buff", duration: 3, maxStacks: 1,
    periodic: { damagePerTick: 0, damageType: "heal", healPerTick: 10 },
    tags: ["hot", "heal"],
  }),
  defWithDefaults({
    id: "berserk", name: "Berserk", category: "buff", duration: 3, maxStacks: 1,
    modifiers: { bonusDamage: 10, dodge: -15 },
    tags: ["offensive"],
  }),
  defWithDefaults({
    id: "stealth", name: "Stealthed", category: "buff", duration: 99, maxStacks: 1,
    flags: { invisible: true },
    dispellable: false,
    tags: ["stealth"],
  }),
  defWithDefaults({
    id: "phased", name: "Phased", category: "buff", duration: 1, maxStacks: 1,
    flags: { intangible: true, phased: true },
    tags: ["time", "defensive"],
  }),
  defWithDefaults({
    id: "marked", name: "Marked", category: "debuff", duration: 3, maxStacks: 1,
    tags: ["debuff"],
  }),
  defWithDefaults({
    id: "taunt", name: "Taunted", category: "debuff", duration: 2, maxStacks: 1,
    flags: { taunted: true },
    tags: ["cc"],
  }),
  defWithDefaults({
    id: "thorns", name: "Thorns", category: "buff", duration: 3, maxStacks: 1,
    tags: ["defensive", "reflect"],
  }),
  defWithDefaults({
    id: "lifesteal", name: "Lifesteal", category: "buff", duration: 3, maxStacks: 1,
    tags: ["offensive", "heal"],
  }),
  defWithDefaults({
    id: "electrified", name: "Electrified", category: "debuff", duration: 2, maxStacks: 1,
    periodic: { damagePerTick: 6, damageType: "lightning", healPerTick: 0 },
    interactions: [{ withEffect: "wet", resultEffect: "shocked", removeBoth: true }],
    tags: ["dot", "lightning"],
  }),
  defWithDefaults({
    id: "wet", name: "Wet", category: "debuff", duration: 3, maxStacks: 1,
    modifiers: { dodge: -5 },
    interactions: [
      { withEffect: "electrified", resultEffect: "shocked", removeBoth: true },
      { withEffect: "freeze", resultEffect: "frozen_solid", removeBoth: true },
    ],
    tags: ["water"],
  }),
  defWithDefaults({
    id: "shocked", name: "Shocked", category: "debuff", duration: 1, maxStacks: 1,
    periodic: { damagePerTick: 20, damageType: "lightning", healPerTick: 0 },
    flags: { skipTurn: true },
    tags: ["combo", "lightning", "water"],
  }),
  defWithDefaults({
    id: "frozen_solid", name: "Frozen Solid", category: "debuff", duration: 2, maxStacks: 1,
    flags: { skipTurn: true, cannotMove: true },
    modifiers: { dodge: -999 },
    tags: ["combo", "ice", "water"],
  }),
  defWithDefaults({
    id: "gravity_well", name: "Gravity Well", category: "debuff", duration: 2, maxStacks: 1,
    modifiers: { movementPoints: -4 },
    flags: { rooted: true },
    tags: ["gravity", "cc"],
  }),
  defWithDefaults({
    id: "void_touched", name: "Void Touched", category: "debuff", duration: 3, maxStacks: 1,
    periodic: { damagePerTick: 8, damageType: "void", healPerTick: 0 },
    modifiers: { magicResist: -10 },
    tags: ["void", "dot"],
  }),
  defWithDefaults({
    id: "sonic_disruption", name: "Disrupted", category: "debuff", duration: 2, maxStacks: 1,
    modifiers: { initiative: -20 },
    flags: { silenced: true },
    tags: ["sonic", "cc"],
  }),
  defWithDefaults({
    id: "petrify", name: "Petrified", category: "debuff", duration: 2, maxStacks: 1,
    flags: { skipTurn: true, cannotMove: true, cannotCast: true },
    modifiers: { dodge: -999 },
    tags: ["cc", "earth"],
  }),
  defWithDefaults({
    id: "entangle", name: "Entangled", category: "debuff", duration: 2, maxStacks: 1,
    flags: { rooted: true },
    modifiers: { dodge: -10 },
    periodic: { damagePerTick: 3, damageType: "nature", healPerTick: 0 },
    tags: ["cc", "nature", "dot"],
  }),
  defWithDefaults({
    id: "inspired", name: "Inspired", category: "buff", duration: 3, maxStacks: 1,
    modifiers: { meleeSkill: 10, dodge: 5, critChance: 5 },
    tags: ["support"],
  }),
  defWithDefaults({
    id: "empowered", name: "Empowered", category: "buff", duration: 2, maxStacks: 3,
    stackBehavior: "intensity",
    modifiers: { bonusDamage: 5 }, modifiersPerStack: true,
    tags: ["offensive"],
  }),
  defWithDefaults({
    id: "fortified", name: "Fortified", category: "buff", duration: 3, maxStacks: 3,
    stackBehavior: "intensity",
    modifiers: { bonusArmor: 3 }, modifiersPerStack: true,
    tags: ["defensive"],
  }),
  defWithDefaults({
    id: "evasive", name: "Evasive", category: "buff", duration: 2, maxStacks: 1,
    modifiers: { dodge: 20 },
    tags: ["defensive"],
  }),
  defWithDefaults({
    id: "death_mark", name: "Death Mark", category: "debuff", duration: 3, maxStacks: 1,
    onExpireEffects: ["death_mark_detonate"],
    tags: ["dark", "delayed"],
  }),
  defWithDefaults({
    id: "time_locked", name: "Time Locked", category: "debuff", duration: 1, maxStacks: 1,
    flags: { skipTurn: true, invulnerable: true },
    tags: ["time", "cc"],
  }),
  // Armor Break
  defWithDefaults({
    id: "armor_break", name: "Armor Break", category: "debuff", duration: 3, maxStacks: 1,
    modifiers: { bonusArmor: -3 },
    tags: ["debuff", "physical"],
  }),
  // Heal Reduction
  defWithDefaults({
    id: "heal_reduce", name: "Healing Reduced", category: "debuff", duration: 3, maxStacks: 1,
    tags: ["debuff"],
  }),
  // Channeled damage
  defWithDefaults({
    id: "channel_dmg", name: "Channeled", category: "debuff", duration: 3, maxStacks: 1,
    periodic: { damagePerTick: 15, damageType: "magical", healPerTick: 0 },
    tags: ["dot", "channel"],
  }),
];

// Register all built-in effects
for (const def of BUILTIN_EFFECTS) {
  registerStatusEffectDef(def);
}

export interface BleedTickResult {
  entityId: EntityId;
  damage: number;
  killed: boolean;
}

/**
 * Data-driven status effect manager.
 * Supports 100+ effects with interactions, periodic ticks, behavioral flags, and stacking.
 */
export class StatusEffectManager {
  private eventBus: EventBus | null = null;

  constructor(private rng: RNG) {}

  setEventBus(bus: EventBus): void {
    this.eventBus = bus;
  }

  /**
   * Apply a status effect to an entity.
   * Handles stacking, interactions, and event emission.
   */
  apply(
    world: World,
    entityId: EntityId,
    effectId: string,
    durationOverride?: number,
    sourceId?: EntityId | null,
  ): void {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return;

    const def = getStatusEffectDef(effectId);
    if (!def) return;

    const duration = durationOverride ?? def.duration;
    const maxStacks = def.maxStacks;
    const stackBehavior = "stackBehavior" in def ? def.stackBehavior : (maxStacks > 1 ? "independent" : "refresh");

    // Check for interactions with existing effects
    if ("interactions" in def && (def as StatusEffectDef).interactions.length > 0) {
      for (const interaction of (def as StatusEffectDef).interactions) {
        if (this.hasEffect(world, entityId, interaction.withEffect)) {
          if (interaction.removeBoth) {
            this.removeEffect(world, entityId, interaction.withEffect);
          }
          // Apply the result effect instead
          this.apply(world, entityId, interaction.resultEffect, undefined, sourceId);
          return;
        }
      }
    }

    // Check behavioral flag: invulnerable blocks debuffs
    if ("category" in def && (def as StatusEffectDef).category === "debuff") {
      if (this.hasFlag(world, entityId, "invulnerable")) return;
    }

    if (maxStacks > 1) {
      const currentStacks = comp.effects.filter((e) => e.id === effectId).length;

      if (stackBehavior === "refresh") {
        // Refresh all existing stacks, add new if below max
        for (const eff of comp.effects.filter(e => e.id === effectId)) {
          eff.remainingTurns = Math.max(eff.remainingTurns, duration);
        }
        if (currentStacks < maxStacks) {
          comp.effects.push({
            id: effectId,
            name: ("name" in def ? def.name : effectId),
            remainingTurns: duration,
            modifiers: { ...("modifiers" in def ? def.modifiers : {}) },
          });
        }
      } else if (stackBehavior === "intensity") {
        // Shared duration, increase intensity counter
        const existing = comp.effects.find(e => e.id === effectId);
        if (existing) {
          existing.remainingTurns = Math.max(existing.remainingTurns, duration);
          existing.modifiers._stacks = Math.min((existing.modifiers._stacks ?? 1) + 1, maxStacks);
        } else {
          comp.effects.push({
            id: effectId,
            name: ("name" in def ? def.name : effectId),
            remainingTurns: duration,
            modifiers: { ...("modifiers" in def ? def.modifiers : {}), _stacks: 1 },
          });
        }
      } else {
        // Independent stacks
        if (currentStacks < maxStacks) {
          comp.effects.push({
            id: effectId,
            name: ("name" in def ? def.name : effectId),
            remainingTurns: duration,
            modifiers: { ...("modifiers" in def ? def.modifiers : {}) },
          });
        } else {
          const existing = comp.effects
            .filter((e) => e.id === effectId)
            .sort((a, b) => a.remainingTurns - b.remainingTurns);
          if (existing.length > 0) {
            existing[0]!.remainingTurns = Math.max(existing[0]!.remainingTurns, duration);
          }
        }
      }
    } else {
      // Non-stacking: replace or refresh
      const existing = comp.effects.find((e) => e.id === effectId);
      if (existing) {
        existing.remainingTurns = Math.max(existing.remainingTurns, duration);
      } else {
        comp.effects.push({
          id: effectId,
          name: ("name" in def ? def.name : effectId),
          remainingTurns: duration,
          modifiers: { ...("modifiers" in def ? def.modifiers : {}) },
        });
      }
    }

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit("status:applied", {
        sourceId: sourceId ?? null,
        targetId: entityId,
        effectId,
        stacks: this.getStacks(world, entityId, effectId),
        duration,
      });
    }
  }

  /**
   * Apply a dynamic status effect with custom id/name/modifiers/duration.
   * Used by generated abilities for effects like "debuff_meleeSkill", "buff_meleeSkill", etc.
   */
  applyDynamic(
    world: World,
    entityId: EntityId,
    customDef: { id: string; name: string; duration: number; modifiers: Record<string, number>; maxStacks?: number; dmgPerTurn?: number; healPerTick?: number; tags?: string[] },
  ): void {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return;

    const maxStacks = customDef.maxStacks ?? 1;

    // Build extra modifier entries for dynamic periodic values
    const dynamicMods: Record<string, number> = {};
    if (customDef.dmgPerTurn != null) dynamicMods._dmgPerTurn = customDef.dmgPerTurn;
    if (customDef.healPerTick != null) dynamicMods._healPerTick = customDef.healPerTick;

    if (maxStacks > 1) {
      const currentStacks = comp.effects.filter((e) => e.id === customDef.id).length;
      if (currentStacks < maxStacks) {
        comp.effects.push({
          id: customDef.id,
          name: customDef.name,
          remainingTurns: customDef.duration,
          modifiers: { ...customDef.modifiers, ...dynamicMods },
        });
      } else {
        const existing = comp.effects
          .filter((e) => e.id === customDef.id)
          .sort((a, b) => a.remainingTurns - b.remainingTurns);
        if (existing.length > 0) {
          existing[0]!.remainingTurns = Math.max(existing[0]!.remainingTurns, customDef.duration);
        }
      }
    } else {
      const existing = comp.effects.find((e) => e.id === customDef.id);
      if (existing) {
        existing.remainingTurns = Math.max(existing.remainingTurns, customDef.duration);
      } else {
        comp.effects.push({
          id: customDef.id,
          name: customDef.name,
          remainingTurns: customDef.duration,
          modifiers: { ...customDef.modifiers, ...dynamicMods },
        });
      }
    }
  }

  /**
   * Tick all status effects at turn start for the given entity.
   * Processes periodic effects (DoT/HoT), decrements durations, removes expired effects.
   */
  tickTurnStart(world: World, entityId: EntityId): BleedTickResult | null {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return null;

    let bleedResult: BleedTickResult | null = null;
    const health = world.getComponent<HealthComponent>(entityId, "health");

    // Process all periodic effects
    let totalPeriodicDamage = 0;
    for (const effect of comp.effects) {
      const def = getStatusEffectDef(effect.id);

      if (def?.periodic) {
        const stacks = effect.modifiers._stacks ?? 1;
        if (def.periodic.damagePerTick > 0 && health) {
          totalPeriodicDamage += def.periodic.damagePerTick * stacks;
        }
        if (def.periodic.healPerTick > 0 && health) {
          health.current = Math.min(health.max, health.current + def.periodic.healPerTick * stacks);
        }
      }

      // Legacy bleed handling
      if (effect.id === "bleed" && !def?.periodic) {
        if (health) {
          const customDmg = effect.modifiers._dmgPerTurn;
          totalPeriodicDamage += customDmg != null ? customDmg : this.rng.nextInt(5, 10);
        }
      }

      // Handle custom dmgPerTurn for dynamic effects
      if (effect.modifiers._dmgPerTurn != null && effect.id !== "bleed") {
        if (health) {
          totalPeriodicDamage += effect.modifiers._dmgPerTurn;
        }
      }

      // Handle custom healPerTick for dynamic effects (e.g., heal_hot)
      if (effect.modifiers._healPerTick != null && health) {
        health.current = Math.min(health.max, health.current + effect.modifiers._healPerTick);
      }
    }

    if (totalPeriodicDamage > 0 && health) {
      health.current = Math.max(0, health.current - totalPeriodicDamage);
      bleedResult = {
        entityId,
        damage: totalPeriodicDamage,
        killed: health.current <= 0,
      };

      if (this.eventBus) {
        this.eventBus.emit("status:tick", {
          targetId: entityId,
          effectId: "periodic",
          damage: totalPeriodicDamage,
          killed: health.current <= 0,
        });
      }
    }

    // Decrement durations
    for (const effect of comp.effects) {
      effect.remainingTurns--;
    }

    // Remove expired effects
    const expired = comp.effects.filter(e => e.remainingTurns <= 0);
    comp.effects = comp.effects.filter((e) => e.remainingTurns > 0);

    // Emit removal events and process onExpire effects
    for (const eff of expired) {
      if (this.eventBus) {
        this.eventBus.emit("status:removed", {
          targetId: entityId,
          effectId: eff.id,
          reason: "expired",
        });
      }
      const def = getStatusEffectDef(eff.id);
      if (def?.onExpireEffects) {
        for (const expireEffect of def.onExpireEffects) {
          this.apply(world, entityId, expireEffect);
        }
      }
    }

    return bleedResult;
  }

  /** Check if an entity has a specific effect. */
  hasEffect(world: World, entityId: EntityId, effectId: string): boolean {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return false;
    return comp.effects.some((e) => e.id === effectId);
  }

  /** Get the count of stacks of a specific effect. */
  getStacks(world: World, entityId: EntityId, effectId: string): number {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return 0;
    const effects = comp.effects.filter(e => e.id === effectId);
    if (effects.length === 0) return 0;
    // For intensity stacking, use _stacks modifier
    const first = effects[0]!;
    if (first.modifiers._stacks != null) return first.modifiers._stacks;
    return effects.length;
  }

  /** Check if a behavioral flag is active on an entity from any effect. */
  hasFlag(world: World, entityId: EntityId, flag: keyof BehavioralFlags): boolean {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return false;
    for (const effect of comp.effects) {
      const def = getStatusEffectDef(effect.id);
      if (def?.flags[flag]) return true;
    }
    return false;
  }

  /** Get all active behavioral flags on an entity. */
  getActiveFlags(world: World, entityId: EntityId): Partial<BehavioralFlags> {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return {};
    const flags: Partial<BehavioralFlags> = {};
    for (const effect of comp.effects) {
      const def = getStatusEffectDef(effect.id);
      if (def?.flags) {
        for (const [key, val] of Object.entries(def.flags)) {
          if (val) (flags as any)[key] = true;
        }
      }
    }
    return flags;
  }

  /**
   * Get total modifier for a stat from all active status effects.
   * Handles per-stack scaling for intensity-stacked effects.
   */
  getModifier(
    world: World,
    entityId: EntityId,
    statName: string,
    baseValue: number,
  ): number {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return 0;

    let total = 0;

    for (const effect of comp.effects) {
      // Legacy daze: -25% to specific stats
      if (effect.id === "daze") {
        if (statName === "meleeSkill" || statName === "dodge" || statName === "initiative") {
          total -= Math.floor(baseValue * 0.25);
        }
        continue;
      }

      const def = getStatusEffectDef(effect.id);
      if (def && def.modifiersPerStack) {
        const stacks = effect.modifiers._stacks ?? 1;
        if (def.modifiers[statName] !== undefined) {
          total += def.modifiers[statName]! * stacks;
        }
      } else if (effect.modifiers[statName] !== undefined) {
        total += effect.modifiers[statName]!;
      }
    }

    return total;
  }

  /** Get the vulnerability bonus damage multiplier (0 if not vulnerable). */
  getVulnerabilityBonus(world: World, entityId: EntityId): number {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return 0;
    const vuln = comp.effects.find(e => e.id === "vulnerable");
    return vuln ? (vuln.modifiers._bonusDmgPct ?? 20) / 100 : 0;
  }

  /** Get the damage reduction percentage (0 if no dmg_reduce). */
  getDamageReduction(world: World, entityId: EntityId): number {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return 0;
    const reduce = comp.effects.find(e => e.id === "dmg_reduce");
    return reduce ? (reduce.modifiers._reducePct ?? 20) / 100 : 0;
  }

  /** Count total active debuffs on an entity. */
  countDebuffs(world: World, entityId: EntityId): number {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return 0;
    return comp.effects.filter(e => {
      const def = getStatusEffectDef(e.id);
      if (def) return def.category === "debuff";
      // Legacy: known debuff ids
      const debuffIds = new Set(["stun", "bleed", "daze", "root", "vulnerable", "fleeing"]);
      return debuffIds.has(e.id) || e.id.startsWith("debuff_");
    }).length;
  }

  /** Count total active buffs on an entity. */
  countBuffs(world: World, entityId: EntityId): number {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return 0;
    return comp.effects.filter(e => {
      const def = getStatusEffectDef(e.id);
      return def?.category === "buff";
    }).length;
  }

  /** Get all effects matching a tag. */
  getEffectsWithTag(world: World, entityId: EntityId, tag: string): StatusEffect[] {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return [];
    return comp.effects.filter(e => {
      const def = getStatusEffectDef(e.id);
      return def?.tags.includes(tag);
    });
  }

  /** Remove a specific effect from an entity. */
  removeEffect(world: World, entityId: EntityId, effectId: string, reason: "expired" | "dispelled" | "replaced" | "death" = "dispelled"): void {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return;
    const hadEffect = comp.effects.some(e => e.id === effectId);
    comp.effects = comp.effects.filter((e) => e.id !== effectId);
    if (hadEffect && this.eventBus) {
      this.eventBus.emit("status:removed", { targetId: entityId, effectId, reason });
    }
  }

  /** Dispel all dispellable effects of a given category. */
  dispel(world: World, entityId: EntityId, category?: EffectCategory, count = Infinity): number {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return 0;
    let removed = 0;
    const toKeep: StatusEffect[] = [];
    for (const effect of comp.effects) {
      const def = getStatusEffectDef(effect.id);
      const isDispellable = def?.dispellable !== false;
      const matchesCategory = !category || def?.category === category;
      if (isDispellable && matchesCategory && removed < count) {
        removed++;
        if (this.eventBus) {
          this.eventBus.emit("status:removed", { targetId: entityId, effectId: effect.id, reason: "dispelled" });
        }
      } else {
        toKeep.push(effect);
      }
    }
    comp.effects = toKeep;
    return removed;
  }

  /**
   * Cleanse debuffs from an entity by tag or category.
   * @param tag If provided, only removes debuffs with this tag. Otherwise removes all debuffs.
   * @param count Max number of debuffs to cleanse (default: all).
   * @returns Number of debuffs removed.
   */
  cleanse(world: World, entityId: EntityId, tag?: string, count = Infinity): number {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return 0;
    let removed = 0;
    const toKeep: StatusEffect[] = [];
    for (const effect of comp.effects) {
      const def = getStatusEffectDef(effect.id);
      const isDebuff = def ? def.category === "debuff" : effect.id.startsWith("debuff_");
      const isDispellable = def?.dispellable !== false;
      const matchesTag = !tag || def?.tags.includes(tag);
      if (isDebuff && isDispellable && matchesTag && removed < count) {
        removed++;
        if (this.eventBus) {
          this.eventBus.emit("status:removed", { targetId: entityId, effectId: effect.id, reason: "dispelled" });
        }
      } else {
        toKeep.push(effect);
      }
    }
    comp.effects = toKeep;
    return removed;
  }

  /** Remove all effects from an entity. */
  clearAll(world: World, entityId: EntityId): void {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (comp) comp.effects = [];
  }

  /** Get all active effect names for display. */
  getActiveEffects(world: World, entityId: EntityId): string[] {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return [];

    const seen = new Map<string, { name: string; count: number }>();
    for (const e of comp.effects) {
      const existing = seen.get(e.id);
      if (existing) {
        existing.count++;
      } else {
        const def = getStatusEffectDef(e.id);
        seen.set(e.id, { name: def?.name ?? e.name, count: e.modifiers._stacks ?? 1 });
      }
    }

    const result: string[] = [];
    for (const [, { name, count }] of seen) {
      result.push(count > 1 ? `${name} x${count}` : name);
    }
    return result;
  }
}
