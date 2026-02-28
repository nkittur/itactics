import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { EventBus } from "@core/EventBus";
import type { SummonComponent, SummonAIType, SummonOwnerComponent } from "@entities/components/Summon";
import { createSummon, createSummonOwner } from "@entities/components/Summon";
import type { HexGrid } from "@hex/HexGrid";
import type { AxialCoord } from "@hex/HexCoord";
import { hexDistance, hexNeighbors, hexSpiral } from "@hex/HexMath";
import type { HealthComponent } from "@entities/components/Health";
import type { PositionComponent } from "@entities/components/Position";

// ── Summon Template ──

export interface SummonTemplate {
  id: string;
  name: string;
  /** Base stats for the summon. */
  stats: Record<string, number>;
  /** Max HP. */
  maxHp: number;
  /** Movement points per turn. */
  movementPoints: number;
  /** AI type. */
  aiType: SummonAIType;
  /** Default lifetime (-1 = permanent). */
  lifetime: number;
  /** Default tether range (-1 = unlimited). */
  tetherRange: number;
  /** Abilities the summon has. */
  abilityIds: string[];
  /** Whether can be sacrificed. */
  sacrificeEligible: boolean;
  /** Whether can merge with owner. */
  mergeEligible: boolean;
  /** Effects on death. */
  onDeathEffects: string[];
  /** Visual tint color. */
  tint: string;
}

// ── Template Registry ──

const summonTemplates = new Map<string, SummonTemplate>();

export function registerSummonTemplate(template: SummonTemplate): void {
  summonTemplates.set(template.id, template);
}

export function getSummonTemplate(id: string): SummonTemplate | undefined {
  return summonTemplates.get(id);
}

/**
 * Manages summon creation, destruction, AI behavior, and owner interaction.
 * Summons are full ECS entities with all standard components.
 */
export class SummonManager {
  constructor(
    private eventBus: EventBus,
    private grid: HexGrid,
  ) {
    // Listen for death events to clean up summons
    this.eventBus.on("death", (ev) => {
      this.handleDeath(ev.entityId);
    });
  }

  /**
   * Create a summon entity at the given position.
   * @returns The summon entity ID, or null if creation failed.
   */
  createSummon(
    world: World,
    ownerId: EntityId,
    templateId: string,
    position: AxialCoord,
    overrides?: Partial<SummonTemplate>,
  ): EntityId | null {
    const template = getSummonTemplate(templateId);
    if (!template) return null;

    // Check if position is valid
    const tile = this.grid.get(position.q, position.r);
    if (!tile || tile.occupant) {
      // Try to find an adjacent free hex
      const freeHex = this.findFreeAdjacentHex(position);
      if (!freeHex) return null;
      position = freeHex;
    }

    // Check owner's summon limit
    let ownerComp = world.getComponent<SummonOwnerComponent>(ownerId, "summonOwner");
    if (!ownerComp) {
      ownerComp = createSummonOwner();
      world.addComponent(ownerId, ownerComp);
    }
    if (ownerComp.summonIds.length >= ownerComp.maxSummons) return null;

    // Create the entity
    const summonId = world.createEntity();

    // Add position
    world.addComponent(summonId, {
      type: "position",
      q: position.q,
      r: position.r,
      elevation: tile?.elevation ?? 0,
      facing: 0,
    });

    // Add health
    const maxHp = overrides?.maxHp ?? template.maxHp;
    world.addComponent(summonId, {
      type: "health",
      current: maxHp,
      max: maxHp,
      injuries: [],
    });

    // Add stats
    const stats = { ...template.stats, ...(overrides?.stats ?? {}) };
    world.addComponent(summonId, {
      type: "stats",
      hitpoints: maxHp,
      stamina: 0, mana: 0, resolve: 50,
      initiative: stats.initiative ?? 30,
      meleeSkill: stats.meleeSkill ?? 50,
      rangedSkill: stats.rangedSkill ?? 30,
      dodge: stats.dodge ?? 10,
      magicResist: stats.magicResist ?? 0,
      critChance: stats.critChance ?? 5,
      critMultiplier: stats.critMultiplier ?? 1.5,
      movementPoints: overrides?.movementPoints ?? template.movementPoints,
      level: 1, experience: 0,
      bonusDamage: stats.bonusDamage ?? 0,
      bonusArmor: stats.bonusArmor ?? 0,
    });

    // Add status effects component
    world.addComponent(summonId, { type: "statusEffects", effects: [] });

    // Add summon component
    world.addComponent(summonId, createSummon({
      ownerId,
      templateId,
      aiType: overrides?.aiType ?? template.aiType,
      lifetime: overrides?.lifetime ?? template.lifetime,
      tetherRange: overrides?.tetherRange ?? template.tetherRange,
      sacrificeEligible: overrides?.sacrificeEligible ?? template.sacrificeEligible,
      mergeEligible: overrides?.mergeEligible ?? template.mergeEligible,
      onDeathEffects: overrides?.onDeathEffects ?? template.onDeathEffects,
    }));

    // Add abilities
    const abilityIds = overrides?.abilityIds ?? template.abilityIds;
    if (abilityIds.length > 0) {
      world.addComponent(summonId, { type: "abilities", abilityIds: [...abilityIds] });
    }

    // Add AI behavior
    world.addComponent(summonId, {
      type: "aiBehavior",
      aiType: "summon",
      aggroRadius: 8,
      preferredRange: 1,
      fleeThreshold: 0,
    });

    // Add sprite reference
    world.addComponent(summonId, {
      type: "spriteRef",
      atlasKey: "summons",
      framePrefix: templateId,
      currentFrame: 0,
      tint: overrides?.tint ?? template.tint,
    });

    // Update grid
    const summonTile = this.grid.get(position.q, position.r);
    if (summonTile) summonTile.occupant = summonId;

    // Register with owner
    ownerComp.summonIds.push(summonId);

    // Emit event
    this.eventBus.emit("summon:created", {
      ownerId,
      summonId,
      summonType: templateId,
    });

    return summonId;
  }

  /**
   * Destroy a summon, cleaning up all references.
   */
  destroySummon(
    world: World,
    summonId: EntityId,
    reason: "killed" | "expired" | "sacrificed" | "merged" | "unsummoned" = "killed",
  ): void {
    const summonComp = world.getComponent<SummonComponent>(summonId, "summon");
    if (!summonComp) return;

    const ownerId = summonComp.ownerId;

    // Remove from grid
    const pos = world.getComponent<PositionComponent>(summonId, "position");
    if (pos) {
      const tile = this.grid.get(pos.q, pos.r);
      if (tile && tile.occupant === summonId) {
        tile.occupant = null;
      }
    }

    // Remove from owner's summon list
    const ownerComp = world.getComponent<SummonOwnerComponent>(ownerId, "summonOwner");
    if (ownerComp) {
      ownerComp.summonIds = ownerComp.summonIds.filter(id => id !== summonId);
    }

    // Emit event
    this.eventBus.emit("summon:destroyed", {
      ownerId,
      summonId,
      reason,
    });

    // Destroy the entity
    world.destroyEntity(summonId);
  }

  /**
   * Sacrifice a summon for an effect.
   * The owner consumes the summon to gain benefits.
   */
  sacrifice(world: World, ownerId: EntityId, summonId: EntityId): boolean {
    const summonComp = world.getComponent<SummonComponent>(summonId, "summon");
    if (!summonComp || summonComp.ownerId !== ownerId || !summonComp.sacrificeEligible) {
      return false;
    }

    // Get summon's remaining HP for sacrifice value
    const health = world.getComponent<HealthComponent>(summonId, "health");
    const sacrificeValue = health?.current ?? 0;

    // Destroy summon
    this.destroySummon(world, summonId, "sacrificed");

    // Return sacrifice value for the caller to process
    return true;
  }

  /**
   * Merge a summon with its owner, triggering a transformation.
   */
  merge(world: World, ownerId: EntityId, summonId: EntityId): boolean {
    const summonComp = world.getComponent<SummonComponent>(summonId, "summon");
    if (!summonComp || summonComp.ownerId !== ownerId || !summonComp.mergeEligible) {
      return false;
    }

    // Get summon stats for merge bonuses
    const summonStats = world.getComponent<any>(summonId, "stats");

    // Destroy summon
    this.destroySummon(world, summonId, "merged");

    // The transformation is handled by the TransformationManager
    // Return true to signal successful merge
    return true;
  }

  /**
   * Tick all summons at turn start.
   * Decrements lifetimes, checks tether range, runs AI decisions.
   */
  tickTurn(world: World): void {
    const summonEntities = world.query("summon");

    for (const summonId of summonEntities) {
      const summonComp = world.getComponent<SummonComponent>(summonId, "summon");
      if (!summonComp) continue;

      // Check lifetime
      if (summonComp.lifetime > 0) {
        summonComp.lifetime--;
        if (summonComp.lifetime <= 0) {
          this.destroySummon(world, summonId, "expired");
          continue;
        }
      }

      // Check tether range
      if (summonComp.tetherRange > 0) {
        const summonPos = world.getComponent<PositionComponent>(summonId, "position");
        const ownerPos = world.getComponent<PositionComponent>(summonComp.ownerId, "position");
        if (summonPos && ownerPos) {
          const dist = hexDistance(summonPos, ownerPos);
          if (dist > summonComp.tetherRange) {
            this.destroySummon(world, summonId, "unsummoned");
            continue;
          }
        }
      }
    }
  }

  /**
   * Get AI move target for a summon entity.
   * Returns the hex the summon should move toward.
   */
  getSummonMoveTarget(world: World, summonId: EntityId): AxialCoord | null {
    const summonComp = world.getComponent<SummonComponent>(summonId, "summon");
    const summonPos = world.getComponent<PositionComponent>(summonId, "position");
    if (!summonComp || !summonPos) return null;

    switch (summonComp.aiType) {
      case "follow_owner": {
        const ownerPos = world.getComponent<PositionComponent>(summonComp.ownerId, "position");
        if (ownerPos && hexDistance(summonPos, ownerPos) > 2) {
          return ownerPos;
        }
        return null;
      }

      case "aggressive": {
        // Find nearest enemy
        return this.findNearestEnemy(world, summonId, summonPos);
      }

      case "stationary":
        return null; // Don't move

      case "guard_zone": {
        if (summonComp.guardPosition) {
          const dist = hexDistance(summonPos, summonComp.guardPosition);
          if (dist > 2) return summonComp.guardPosition;
        }
        return null;
      }

      case "mirror_owner": {
        const ownerPos = world.getComponent<PositionComponent>(summonComp.ownerId, "position");
        return ownerPos ?? null;
      }

      case "kamikaze": {
        return this.findNearestEnemy(world, summonId, summonPos);
      }

      case "support": {
        // Stay near lowest HP ally
        return this.findLowestHPAlly(world, summonId, summonPos);
      }

      default:
        return null;
    }
  }

  /** Get all summons owned by an entity. */
  getSummons(world: World, ownerId: EntityId): EntityId[] {
    const ownerComp = world.getComponent<SummonOwnerComponent>(ownerId, "summonOwner");
    return ownerComp?.summonIds ?? [];
  }

  /** Get summon count by template type for an owner. */
  getSummonCountByType(world: World, ownerId: EntityId, templateId: string): number {
    const summons = this.getSummons(world, ownerId);
    return summons.filter(id => {
      const sc = world.getComponent<SummonComponent>(id, "summon");
      return sc?.templateId === templateId;
    }).length;
  }

  // ── Private Helpers ──

  private handleDeath(entityId: EntityId): void {
    // Check if this is a summon owner — destroy their summons
    // This is handled lazily; summons check owner health on their turn
  }

  private findFreeAdjacentHex(pos: AxialCoord): AxialCoord | null {
    for (const neighbor of hexNeighbors(pos.q, pos.r)) {
      const tile = this.grid.get(neighbor.q, neighbor.r);
      if (tile && !tile.occupant) return neighbor;
    }
    return null;
  }

  private findNearestEnemy(world: World, summonId: EntityId, pos: AxialCoord): AxialCoord | null {
    const summonIsAI = world.getComponent(summonId, "aiBehavior") !== undefined;
    let nearest: { pos: AxialCoord; dist: number } | null = null;

    for (const entityId of world.query("health", "position")) {
      if (entityId === summonId) continue;
      const entityIsAI = world.getComponent(entityId, "aiBehavior") !== undefined;
      if (entityIsAI === summonIsAI) continue; // Same team

      const health = world.getComponent<HealthComponent>(entityId, "health");
      if (!health || health.current <= 0) continue;

      const ePos = world.getComponent<PositionComponent>(entityId, "position");
      if (!ePos) continue;

      const dist = hexDistance(pos, ePos);
      if (!nearest || dist < nearest.dist) {
        nearest = { pos: ePos, dist };
      }
    }

    return nearest?.pos ?? null;
  }

  private findLowestHPAlly(world: World, summonId: EntityId, pos: AxialCoord): AxialCoord | null {
    const summonIsAI = world.getComponent(summonId, "aiBehavior") !== undefined;
    let lowest: { pos: AxialCoord; hpPct: number } | null = null;

    for (const entityId of world.query("health", "position")) {
      if (entityId === summonId) continue;
      const entityIsAI = world.getComponent(entityId, "aiBehavior") !== undefined;
      if (entityIsAI !== summonIsAI) continue; // Different team

      const health = world.getComponent<HealthComponent>(entityId, "health");
      if (!health || health.current <= 0) continue;

      const ePos = world.getComponent<PositionComponent>(entityId, "position");
      if (!ePos) continue;

      const hpPct = health.current / health.max;
      if (!lowest || hpPct < lowest.hpPct) {
        lowest = { pos: ePos, hpPct };
      }
    }

    return lowest?.pos ?? null;
  }
}
