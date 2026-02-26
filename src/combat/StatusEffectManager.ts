import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { StatusEffectsComponent, StatusEffect } from "@entities/components/StatusEffects";
import type { HealthComponent } from "@entities/components/Health";
import type { RNG } from "@utils/RNG";

/**
 * Known status effect IDs and their base definitions.
 *
 * - **stun**: Skip turn, 0 defense, no ZoC. Duration: 1 turn.
 * - **bleed**: 5-10 HP/turn ignoring armor. Stacks up to 5. Duration: 2-3 turns.
 * - **daze**: -25% melee skill, melee defense, initiative. Duration: 1-2 turns.
 * - **fleeing**: -30 to melee skill and defense. Applied by MoraleManager.
 */

export interface StatusEffectDef {
  readonly id: string;
  readonly name: string;
  readonly duration: number;
  /** Stat modifiers applied while active. Keys match StatsComponent fields. */
  readonly modifiers: Record<string, number>;
  /** Max stacks (1 = no stacking, refresh duration instead). */
  readonly maxStacks: number;
}

export const STATUS_EFFECT_DEFS: Record<string, StatusEffectDef> = {
  stun: {
    id: "stun",
    name: "Stunned",
    duration: 1,
    modifiers: { meleeDefense: -999, rangedDefense: -999 },
    maxStacks: 1,
  },
  bleed: {
    id: "bleed",
    name: "Bleeding",
    duration: 2,
    modifiers: {},
    maxStacks: 5,
  },
  daze: {
    id: "daze",
    name: "Dazed",
    duration: 2,
    modifiers: {}, // Applied dynamically as -25% of base stats
    maxStacks: 1,
  },
  fleeing: {
    id: "fleeing",
    name: "Fleeing",
    duration: 99, // Removed by morale recovery, not duration
    modifiers: { meleeSkill: -30, meleeDefense: -30 },
    maxStacks: 1,
  },
  root: {
    id: "root",
    name: "Rooted",
    duration: 1,
    modifiers: { movementPoints: -999 },
    maxStacks: 1,
  },
  vulnerable: {
    id: "vulnerable",
    name: "Vulnerable",
    duration: 2,
    modifiers: {},
    maxStacks: 1,
  },
  dmg_reduce: {
    id: "dmg_reduce",
    name: "Hardened",
    duration: 2,
    modifiers: {},
    maxStacks: 1,
  },
  burn: {
    id: "burn",
    name: "Burning",
    duration: 2,
    modifiers: {},
    maxStacks: 3,
  },
  poison: {
    id: "poison",
    name: "Poisoned",
    duration: 3,
    modifiers: {},
    maxStacks: 3,
  },
  cursed: {
    id: "cursed",
    name: "Cursed",
    duration: 2,
    modifiers: { meleeSkill: -10 },
    maxStacks: 1,
  },
};

export interface BleedTickResult {
  entityId: EntityId;
  damage: number;
  killed: boolean;
}

export class StatusEffectManager {
  constructor(private rng: RNG) {}

  /**
   * Apply a status effect to an entity.
   * Stacking effects (bleed) add a new stack up to max.
   * Non-stacking effects refresh duration.
   */
  apply(
    world: World,
    entityId: EntityId,
    effectId: string,
    durationOverride?: number,
  ): void {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return;

    const def = STATUS_EFFECT_DEFS[effectId];
    if (!def) return;

    const duration = durationOverride ?? def.duration;

    if (def.maxStacks > 1) {
      // Stacking effect — add new stack if below max
      const currentStacks = comp.effects.filter((e) => e.id === effectId).length;
      if (currentStacks < def.maxStacks) {
        comp.effects.push({
          id: def.id,
          name: def.name,
          remainingTurns: duration,
          modifiers: { ...def.modifiers },
        });
      } else {
        // At max stacks — refresh longest-remaining stack
        const existing = comp.effects
          .filter((e) => e.id === effectId)
          .sort((a, b) => a.remainingTurns - b.remainingTurns);
        if (existing.length > 0) {
          existing[0]!.remainingTurns = Math.max(existing[0]!.remainingTurns, duration);
        }
      }
    } else {
      // Non-stacking — replace or refresh
      const existing = comp.effects.find((e) => e.id === effectId);
      if (existing) {
        existing.remainingTurns = Math.max(existing.remainingTurns, duration);
      } else {
        comp.effects.push({
          id: def.id,
          name: def.name,
          remainingTurns: duration,
          modifiers: { ...def.modifiers },
        });
      }
    }
  }

  /**
   * Apply a dynamic status effect with custom id/name/modifiers/duration.
   * Used by generated abilities for effects like "debuff_meleeSkill", "buff_meleeSkill", etc.
   */
  applyDynamic(
    world: World,
    entityId: EntityId,
    customDef: { id: string; name: string; duration: number; modifiers: Record<string, number>; maxStacks?: number; dmgPerTurn?: number },
  ): void {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return;

    const maxStacks = customDef.maxStacks ?? 1;

    if (maxStacks > 1) {
      const currentStacks = comp.effects.filter((e) => e.id === customDef.id).length;
      if (currentStacks < maxStacks) {
        comp.effects.push({
          id: customDef.id,
          name: customDef.name,
          remainingTurns: customDef.duration,
          modifiers: { ...customDef.modifiers, ...(customDef.dmgPerTurn != null ? { _dmgPerTurn: customDef.dmgPerTurn } : {}) },
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
          modifiers: { ...customDef.modifiers, ...(customDef.dmgPerTurn != null ? { _dmgPerTurn: customDef.dmgPerTurn } : {}) },
        });
      }
    }
  }

  /**
   * Tick all status effects at turn start for the given entity.
   * Decrements durations and removes expired effects.
   * Returns bleed tick results if any.
   */
  tickTurnStart(world: World, entityId: EntityId): BleedTickResult | null {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return null;

    let bleedResult: BleedTickResult | null = null;

    // Process bleed ticks (both standard and ability-generated with custom dmg)
    const bleedStacks = comp.effects.filter((e) => e.id === "bleed");
    if (bleedStacks.length > 0) {
      const health = world.getComponent<HealthComponent>(entityId, "health");
      if (health) {
        let totalDmg = 0;
        for (const stack of bleedStacks) {
          const customDmg = stack.modifiers._dmgPerTurn;
          totalDmg += customDmg != null ? customDmg : this.rng.nextInt(5, 10);
        }
        health.current = Math.max(0, health.current - totalDmg);
        bleedResult = {
          entityId,
          damage: totalDmg,
          killed: health.current <= 0,
        };
      }
    }

    // Decrement durations
    for (const effect of comp.effects) {
      effect.remainingTurns--;
    }

    // Remove expired effects
    comp.effects = comp.effects.filter((e) => e.remainingTurns > 0);

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
    return comp.effects.filter((e) => e.id === effectId).length;
  }

  /**
   * Get total modifier for a stat from all active status effects.
   * For daze: applies -25% of the base stat value.
   * Handles both static and dynamic effects (debuff_*, buff_*).
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
      if (effect.id === "daze") {
        // Daze applies -25% to melee skill, defense, and initiative
        if (statName === "meleeSkill" || statName === "meleeDefense" || statName === "initiative") {
          total -= Math.floor(baseValue * 0.25);
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
    const debuffIds = new Set(["stun", "bleed", "daze", "root", "vulnerable", "fleeing"]);
    return comp.effects.filter(e => debuffIds.has(e.id) || e.id.startsWith("debuff_")).length;
  }

  /** Remove a specific effect from an entity. */
  removeEffect(world: World, entityId: EntityId, effectId: string): void {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return;
    comp.effects = comp.effects.filter((e) => e.id !== effectId);
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

    // Deduplicate names, show stack count for bleed
    const seen = new Map<string, { name: string; count: number }>();
    for (const e of comp.effects) {
      const existing = seen.get(e.id);
      if (existing) {
        existing.count++;
      } else {
        const def = STATUS_EFFECT_DEFS[e.id];
        seen.set(e.id, { name: def?.name ?? e.name, count: 1 });
      }
    }

    const result: string[] = [];
    for (const [, { name, count }] of seen) {
      result.push(count > 1 ? `${name} x${count}` : name);
    }
    return result;
  }
}
