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
   * Tick all status effects at turn start for the given entity.
   * Decrements durations and removes expired effects.
   * Returns bleed tick results if any.
   */
  tickTurnStart(world: World, entityId: EntityId): BleedTickResult | null {
    const comp = world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!comp) return null;

    let bleedResult: BleedTickResult | null = null;

    // Process bleed ticks
    const bleedStacks = comp.effects.filter((e) => e.id === "bleed");
    if (bleedStacks.length > 0) {
      const health = world.getComponent<HealthComponent>(entityId, "health");
      if (health) {
        // Each bleed stack deals 5-10 damage
        let totalDmg = 0;
        for (let i = 0; i < bleedStacks.length; i++) {
          totalDmg += this.rng.nextInt(5, 10);
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
    const seen = new Map<string, number>();
    for (const e of comp.effects) {
      seen.set(e.id, (seen.get(e.id) ?? 0) + 1);
    }

    const result: string[] = [];
    for (const [id, count] of seen) {
      const def = STATUS_EFFECT_DEFS[id];
      const name = def?.name ?? id;
      result.push(count > 1 ? `${name} x${count}` : name);
    }
    return result;
  }
}
