import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { EventBus } from "@core/EventBus";
import type { TransformationComponent, EntitySnapshot } from "@entities/components/Transformation";
import { createTransformation, getTransformationDef } from "@entities/components/Transformation";
import type { StatsComponent } from "@entities/components/Stats";
import type { HealthComponent } from "@entities/components/Health";
import type { AbilitiesComponent } from "@entities/components/Abilities";

/**
 * Manages entity transformations.
 * Handles state snapshot/restore, stat overrides, ability replacement,
 * stances (lightweight toggles), and summon merges.
 */
export class TransformationManager {
  constructor(private eventBus: EventBus) {}

  /**
   * Apply a transformation to an entity.
   * Snapshots current state, applies form overrides, emits events.
   */
  transform(
    world: World,
    entityId: EntityId,
    formId: string,
    durationOverride?: number,
  ): boolean {
    const def = getTransformationDef(formId);
    if (!def) return false;

    // Get or create transformation component
    let comp = world.getComponent<TransformationComponent>(entityId, "transformation");
    if (!comp) {
      comp = createTransformation();
      world.addComponent(entityId, comp);
    }

    // If already transformed, end current form first
    if (comp.activeFormId) {
      this.revert(world, entityId, "replaced");
    }

    // Snapshot current state
    comp.snapshot = this.captureSnapshot(world, entityId);
    comp.activeFormId = formId;
    comp.remainingTurns = durationOverride ?? def.duration;
    comp.isStance = def.duration === 0;

    // Apply stat overrides
    const stats = world.getComponent<StatsComponent>(entityId, "stats");
    if (stats) {
      for (const [key, value] of Object.entries(def.statOverrides)) {
        (stats as any)[key] = value;
      }
      for (const [key, value] of Object.entries(def.statModifiers)) {
        (stats as any)[key] = ((stats as any)[key] ?? 0) + value;
      }
    }

    // Apply ability replacements
    if (def.abilityReplacements.length > 0) {
      const abilities = world.getComponent<AbilitiesComponent>(entityId, "abilities");
      if (abilities) {
        abilities.abilityIds = [...def.abilityReplacements];
      }
    }

    // Add additional abilities
    if (def.abilityAdditions.length > 0) {
      const abilities = world.getComponent<AbilitiesComponent>(entityId, "abilities");
      if (abilities) {
        abilities.abilityIds.push(...def.abilityAdditions);
      }
    }

    // Apply health override if present
    if (def.statOverrides.hitpoints != null) {
      const health = world.getComponent<HealthComponent>(entityId, "health");
      if (health) {
        health.max = def.statOverrides.hitpoints;
        health.current = Math.min(health.current, health.max);
      }
    }

    // Emit event
    this.eventBus.emit("transformation:start", {
      entityId,
      formId,
      duration: comp.remainingTurns,
    });

    return true;
  }

  /**
   * Revert an entity to its pre-transformation state.
   */
  revert(
    world: World,
    entityId: EntityId,
    reason: "expired" | "cancelled" | "death" | "replaced" = "expired",
  ): boolean {
    const comp = world.getComponent<TransformationComponent>(entityId, "transformation");
    if (!comp?.activeFormId || !comp.snapshot) return false;

    const formId = comp.activeFormId;
    const def = getTransformationDef(formId);

    // Restore snapshot
    this.restoreSnapshot(world, entityId, comp.snapshot);

    // Process on-end effects
    if (def?.onEndEffects) {
      // Effects would be resolved by the effect executor
      // Store them for the caller to process
    }

    // Clear transformation state
    comp.activeFormId = null;
    comp.remainingTurns = 0;
    comp.snapshot = null;
    comp.isStance = false;

    // Emit event
    this.eventBus.emit("transformation:end", {
      entityId,
      formId,
      reason,
    });

    return true;
  }

  /**
   * Toggle a stance. If already active, deactivate. If not, activate.
   */
  toggleStance(world: World, entityId: EntityId, stanceId: string): boolean {
    const comp = world.getComponent<TransformationComponent>(entityId, "transformation");
    if (comp?.activeFormId === stanceId) {
      return this.revert(world, entityId, "cancelled");
    }
    return this.transform(world, entityId, stanceId);
  }

  /**
   * Apply a summon merge transformation.
   * Combines summon stats with owner based on merge ratio.
   */
  mergeWithSummon(
    world: World,
    ownerId: EntityId,
    summonId: EntityId,
    mergeFormId: string,
  ): boolean {
    const def = getTransformationDef(mergeFormId);
    if (!def) return false;

    // Get summon stats for bonus
    const summonStats = world.getComponent<StatsComponent>(summonId, "stats");
    const summonHealth = world.getComponent<HealthComponent>(summonId, "health");

    // Transform owner
    const success = this.transform(world, ownerId, mergeFormId);
    if (!success) return false;

    // Apply summon stat contribution
    if (summonStats && def.mergeStatRatio > 0) {
      const ownerStats = world.getComponent<StatsComponent>(ownerId, "stats");
      if (ownerStats) {
        const ratio = def.mergeStatRatio;
        ownerStats.meleeSkill += Math.floor((summonStats.meleeSkill ?? 0) * ratio);
        ownerStats.dodge += Math.floor((summonStats.dodge ?? 0) * ratio);
        ownerStats.bonusDamage += Math.floor((summonStats.bonusDamage ?? 0) * ratio);
      }
    }

    // Add summon's remaining HP
    if (summonHealth) {
      const ownerHealth = world.getComponent<HealthComponent>(ownerId, "health");
      if (ownerHealth) {
        const bonusHp = Math.floor(summonHealth.current * (def.mergeStatRatio));
        ownerHealth.max += bonusHp;
        ownerHealth.current += bonusHp;
      }
    }

    return true;
  }

  /**
   * Tick transformations at turn start.
   * Decrements durations, reverts expired transformations.
   */
  tickTurn(world: World): void {
    const entities = world.query("transformation");
    for (const entityId of entities) {
      const comp = world.getComponent<TransformationComponent>(entityId, "transformation");
      if (!comp?.activeFormId || comp.isStance) continue;

      if (comp.remainingTurns > 0) {
        comp.remainingTurns--;
        if (comp.remainingTurns <= 0) {
          this.revert(world, entityId, "expired");
        }
      }
    }
  }

  /** Check if entity is currently transformed. */
  isTransformed(world: World, entityId: EntityId): boolean {
    const comp = world.getComponent<TransformationComponent>(entityId, "transformation");
    return comp?.activeFormId != null;
  }

  /** Get the current form id, or null. */
  getCurrentForm(world: World, entityId: EntityId): string | null {
    const comp = world.getComponent<TransformationComponent>(entityId, "transformation");
    return comp?.activeFormId ?? null;
  }

  // ── Snapshot ──

  private captureSnapshot(world: World, entityId: EntityId): EntitySnapshot {
    const stats = world.getComponent<StatsComponent>(entityId, "stats");
    const health = world.getComponent<HealthComponent>(entityId, "health");
    const abilities = world.getComponent<AbilitiesComponent>(entityId, "abilities");

    return {
      stats: stats ? { ...stats } : {},
      abilityIds: abilities ? [...abilities.abilityIds] : [],
      resources: {},
      health: health ? { current: health.current, max: health.max } : { current: 0, max: 0 },
    };
  }

  private restoreSnapshot(world: World, entityId: EntityId, snapshot: EntitySnapshot): void {
    // Restore stats
    const stats = world.getComponent<StatsComponent>(entityId, "stats");
    if (stats) {
      for (const [key, value] of Object.entries(snapshot.stats)) {
        if (key !== "type") (stats as any)[key] = value;
      }
    }

    // Restore abilities
    const abilities = world.getComponent<AbilitiesComponent>(entityId, "abilities");
    if (abilities) {
      abilities.abilityIds = [...snapshot.abilityIds];
    }

    // Restore health (keep current HP ratio)
    const health = world.getComponent<HealthComponent>(entityId, "health");
    if (health && snapshot.health.max > 0) {
      const ratio = health.current / health.max;
      health.max = snapshot.health.max;
      health.current = Math.min(Math.floor(ratio * health.max), health.max);
    }
  }
}
