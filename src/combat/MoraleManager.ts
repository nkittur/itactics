import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { MoraleComponent, MoraleState } from "@entities/components/Morale";
import type { StatsComponent } from "@entities/components/Stats";
import type { HealthComponent } from "@entities/components/Health";
import type { RNG } from "@utils/RNG";

/**
 * Morale system — Battle Brothers style.
 *
 * States: Confident → Steady → Wavering → Breaking → Fleeing
 *
 * Morale checks trigger on:
 * - Ally death (difficulty 20)
 * - Heavy damage received (>25% max HP in one hit, difficulty 15)
 * - Surrounded by enemies (3+ adjacent, difficulty 10)
 *
 * Recovery:
 * - Passive: +5 morale per turn
 * - On enemy kill: +10 morale to all allies
 *
 * Check formula: pass if rng(1,100) <= resolve + stateBonus - eventDifficulty
 */

/** Morale thresholds for state transitions. */
const STATE_THRESHOLDS: Record<MoraleState, number> = {
  confident: 80,
  steady: 50,
  wavering: 25,
  breaking: 10,
  fleeing: 0,
};

/** Bonus to morale checks based on current state. */
const STATE_CHECK_BONUS: Record<MoraleState, number> = {
  confident: 15,
  steady: 5,
  wavering: 0,
  breaking: -10,
  fleeing: -20,
};

export type MoraleEvent =
  | "allyDeath"
  | "heavyDamage"
  | "surrounded";

const EVENT_DIFFICULTY: Record<MoraleEvent, number> = {
  allyDeath: 20,
  heavyDamage: 15,
  surrounded: 10,
};

export interface MoraleCheckResult {
  entityId: EntityId;
  passed: boolean;
  oldState: MoraleState;
  newState: MoraleState;
  event: MoraleEvent;
}

export class MoraleManager {
  constructor(private rng: RNG) {}

  /**
   * Perform a morale check on an entity for a given event.
   * Returns the result including state transition.
   */
  check(
    world: World,
    entityId: EntityId,
    event: MoraleEvent,
  ): MoraleCheckResult | null {
    const morale = world.getComponent<MoraleComponent>(entityId, "morale");
    const stats = world.getComponent<StatsComponent>(entityId, "stats");
    if (!morale || !stats) return null;

    const difficulty = EVENT_DIFFICULTY[event];
    const stateBonus = STATE_CHECK_BONUS[morale.state];
    const threshold = stats.resolve + stateBonus - difficulty;

    const roll = this.rng.nextInt(1, 100);
    const passed = roll <= threshold;

    const oldState = morale.state;

    if (!passed) {
      // Drop morale value
      morale.current = Math.max(0, morale.current - (difficulty + 5));
      // Recalculate state
      this.updateState(morale);
    }

    return {
      entityId,
      passed,
      oldState,
      newState: morale.state,
      event,
    };
  }

  /**
   * Trigger morale checks for all allies of the dead entity.
   * Returns results for entities that changed state.
   */
  onAllyDeath(
    world: World,
    deadEntityId: EntityId,
    allyIds: EntityId[],
  ): MoraleCheckResult[] {
    const results: MoraleCheckResult[] = [];

    for (const allyId of allyIds) {
      if (allyId === deadEntityId) continue;

      const health = world.getComponent<HealthComponent>(allyId, "health");
      if (!health || health.current <= 0) continue;

      const result = this.check(world, allyId, "allyDeath");
      if (result && result.oldState !== result.newState) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Check morale after heavy damage (>25% max HP).
   */
  onHeavyDamage(
    world: World,
    entityId: EntityId,
    damage: number,
  ): MoraleCheckResult | null {
    const health = world.getComponent<HealthComponent>(entityId, "health");
    if (!health || health.current <= 0) return null;

    if (damage > health.max * 0.25) {
      const result = this.check(world, entityId, "heavyDamage");
      if (result && result.oldState !== result.newState) {
        return result;
      }
    }
    return null;
  }

  /**
   * Boost morale for all allies when an enemy is killed.
   * +10 morale to all living allies.
   */
  onEnemyKill(world: World, allyIds: EntityId[]): void {
    for (const allyId of allyIds) {
      const morale = world.getComponent<MoraleComponent>(allyId, "morale");
      const health = world.getComponent<HealthComponent>(allyId, "health");
      if (!morale || !health || health.current <= 0) continue;

      morale.current = Math.min(100, morale.current + 10);
      this.updateState(morale);
    }
  }

  /**
   * Passive morale recovery at turn start.
   * +5 morale per turn.
   */
  passiveRecovery(world: World, entityId: EntityId): void {
    const morale = world.getComponent<MoraleComponent>(entityId, "morale");
    if (!morale) return;

    morale.current = Math.min(100, morale.current + 5);
    this.updateState(morale);
  }

  /** Get the current morale state of an entity. */
  getState(world: World, entityId: EntityId): MoraleState | null {
    const morale = world.getComponent<MoraleComponent>(entityId, "morale");
    return morale?.state ?? null;
  }

  /** Update morale state based on current morale value. */
  private updateState(morale: MoraleComponent): void {
    if (morale.current >= STATE_THRESHOLDS.confident) {
      morale.state = "confident";
    } else if (morale.current >= STATE_THRESHOLDS.steady) {
      morale.state = "steady";
    } else if (morale.current >= STATE_THRESHOLDS.wavering) {
      morale.state = "wavering";
    } else if (morale.current >= STATE_THRESHOLDS.breaking) {
      morale.state = "breaking";
    } else {
      morale.state = "fleeing";
    }
  }
}
