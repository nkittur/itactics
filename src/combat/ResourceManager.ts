import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { ResourcesComponent, ResourceState } from "@entities/components/Resources";
import { getResourceDef } from "@entities/components/Resources";
import type { EventBus } from "@core/EventBus";

/**
 * Manages generic resource pools for all entities.
 * Handles modification, decay, regen, threshold events, and resource conversion.
 */
export class ResourceManager {
  /** Active converters: when source event fires, convert to target resource. */
  private converters: ResourceConverter[] = [];

  constructor(private eventBus: EventBus) {}

  // ── Core Operations ──

  /** Get the current value of a resource on an entity. Returns undefined if not present. */
  get(world: World, entityId: EntityId, resourceId: string): number | undefined {
    const comp = world.getComponent<ResourcesComponent>(entityId, "resources");
    return comp?.pools[resourceId]?.current;
  }

  /** Get full resource state. */
  getState(world: World, entityId: EntityId, resourceId: string): ResourceState | undefined {
    const comp = world.getComponent<ResourcesComponent>(entityId, "resources");
    return comp?.pools[resourceId];
  }

  /** Check if entity has a specific resource. */
  has(world: World, entityId: EntityId, resourceId: string): boolean {
    const comp = world.getComponent<ResourcesComponent>(entityId, "resources");
    return comp?.pools[resourceId] !== undefined;
  }

  /**
   * Modify a resource by a delta amount. Clamps to min/max.
   * Emits resource:changed and resource:threshold events as appropriate.
   * @returns The actual change applied.
   */
  modify(
    world: World,
    entityId: EntityId,
    resourceId: string,
    delta: number,
    reason = "ability",
  ): number {
    const comp = world.getComponent<ResourcesComponent>(entityId, "resources");
    if (!comp) return 0;
    const state = comp.pools[resourceId];
    if (!state) return 0;

    const def = getResourceDef(resourceId);
    const prev = state.current;
    state.current = Math.max(state.effectiveMin, Math.min(state.effectiveMax, prev + delta));
    state.turnsSinceModified = 0;
    const actual = state.current - prev;

    if (actual !== 0) {
      this.eventBus.emit("resource:changed", {
        entityId,
        resourceId,
        previousValue: prev,
        newValue: state.current,
        reason,
      });

      // Check thresholds
      if (def) {
        for (const threshold of def.thresholds) {
          const wasCrossed = threshold.direction === "above"
            ? prev < threshold.value && state.current >= threshold.value
            : prev > threshold.value && state.current <= threshold.value;
          if (wasCrossed) {
            this.eventBus.emit("resource:threshold", {
              entityId,
              resourceId,
              threshold: threshold.value,
              direction: threshold.direction,
            });
          }
        }
      }
    }

    return actual;
  }

  /** Set a resource to an absolute value. */
  set(
    world: World,
    entityId: EntityId,
    resourceId: string,
    value: number,
    reason = "set",
  ): void {
    const comp = world.getComponent<ResourcesComponent>(entityId, "resources");
    if (!comp) return;
    const state = comp.pools[resourceId];
    if (!state) return;
    const delta = value - state.current;
    if (delta !== 0) this.modify(world, entityId, resourceId, delta, reason);
  }

  /** Check if an entity can afford a resource cost. */
  canAfford(world: World, entityId: EntityId, costs: Record<string, number>): boolean {
    const comp = world.getComponent<ResourcesComponent>(entityId, "resources");
    if (!comp) return false;
    for (const [resourceId, amount] of Object.entries(costs)) {
      const state = comp.pools[resourceId];
      if (!state) return false;
      if (state.current < amount) return false;
    }
    return true;
  }

  /** Spend multiple resources at once. Returns false if can't afford. */
  spend(world: World, entityId: EntityId, costs: Record<string, number>, reason = "spend"): boolean {
    if (!this.canAfford(world, entityId, costs)) return false;
    for (const [resourceId, amount] of Object.entries(costs)) {
      this.modify(world, entityId, resourceId, -amount, reason);
    }
    return true;
  }

  /** Get the fill percentage (0-1) of a resource. */
  getPercent(world: World, entityId: EntityId, resourceId: string): number {
    const comp = world.getComponent<ResourcesComponent>(entityId, "resources");
    if (!comp) return 0;
    const state = comp.pools[resourceId];
    if (!state) return 0;
    const range = state.effectiveMax - state.effectiveMin;
    if (range <= 0) return 0;
    return (state.current - state.effectiveMin) / range;
  }

  // ── Turn Processing ──

  /**
   * Process all resources for an entity at turn start.
   * Applies regeneration and decay based on resource definitions.
   */
  tickTurnStart(world: World, entityId: EntityId): void {
    const comp = world.getComponent<ResourcesComponent>(entityId, "resources");
    if (!comp) return;

    for (const [resourceId, state] of Object.entries(comp.pools)) {
      const def = getResourceDef(resourceId);
      if (!def) continue;

      // Regeneration
      if (def.regenRate > 0) {
        this.modify(world, entityId, resourceId, def.regenRate, "regen");
      }

      // Decay
      if (def.decayRate > 0 && def.decayBehavior !== "none") {
        state.turnsSinceModified++;
        if (state.turnsSinceModified > def.decayDelay) {
          if (def.decayBehavior === "toward_zero" && state.current > 0) {
            this.modify(world, entityId, resourceId, -Math.min(def.decayRate, state.current), "decay");
          } else if (def.decayBehavior === "toward_max" && state.current < state.effectiveMax) {
            this.modify(world, entityId, resourceId, Math.min(def.decayRate, state.effectiveMax - state.current), "decay");
          }
        }
      }
    }
  }

  // ── Resource Conversion ──

  /** Register a converter that auto-converts one resource change to another. */
  registerConverter(converter: ResourceConverter): () => void {
    this.converters.push(converter);
    const unsub = this.eventBus.on("resource:changed", (ev) => {
      if (converter.sourceResource === ev.resourceId && ev.reason !== "conversion") {
        const sourceEntity = converter.targetEntity ?? ev.entityId;
        const delta = ev.newValue - ev.previousValue;
        if ((converter.direction === "gain" && delta > 0) ||
            (converter.direction === "loss" && delta < 0) ||
            converter.direction === "any") {
          const amount = Math.floor(Math.abs(delta) * converter.ratio);
          if (amount > 0) {
            const world = converter._world;
            if (world) {
              this.modify(world, sourceEntity, converter.targetResource, amount, "conversion");
            }
          }
        }
      }
    });
    return () => {
      unsub();
      const idx = this.converters.indexOf(converter);
      if (idx >= 0) this.converters.splice(idx, 1);
    };
  }

  /** Get all resource states for an entity. */
  getAllStates(world: World, entityId: EntityId): Record<string, ResourceState> {
    const comp = world.getComponent<ResourcesComponent>(entityId, "resources");
    return comp?.pools ?? {};
  }
}

export interface ResourceConverter {
  /** Source resource to watch. */
  sourceResource: string;
  /** Target resource to modify. */
  targetResource: string;
  /** Conversion ratio (e.g., 0.5 means 50% of source change). */
  ratio: number;
  /** Whether to convert on gain, loss, or any change. */
  direction: "gain" | "loss" | "any";
  /** Optional: target a different entity. */
  targetEntity?: EntityId;
  /** Internal: world reference for conversion. Set by system. */
  _world?: World;
}
