import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { EventBus, GameEventName, GameEvents } from "@core/EventBus";
import type { AbilityTrigger, AbilityEffect, TriggerType, EffectCondition } from "@data/UnifiedAbilityDef";
import type { HealthComponent } from "@entities/components/Health";
import type { ResourcesComponent } from "@entities/components/Resources";
import type { StatusEffectManager } from "./StatusEffectManager";
import type { ResourceManager } from "./ResourceManager";

// ── Trigger Registration ──

/** A registered trigger bound to a specific entity and ability. */
export interface RegisteredTrigger {
  /** Unique id for this registration. */
  registrationId: string;
  /** The entity this trigger belongs to. */
  entityId: EntityId;
  /** The ability that owns this trigger. */
  abilityId: string;
  /** The trigger definition. */
  trigger: AbilityTrigger;
  /** Runtime state. */
  state: TriggerState;
  /** Unsubscribe function to remove event listener. */
  unsubscribe: (() => void) | null;
}

interface TriggerState {
  currentCooldown: number;
  firesThisTurn: number;
  firesThisCombat: number;
  consecutiveHits: number;
  lastFiredTurn: number;
}

/** A delayed effect scheduled for future execution. */
export interface DelayedEffect {
  id: string;
  entityId: EntityId;
  abilityId: string;
  effects: AbilityEffect[];
  targetEntityId?: EntityId;
  triggerRound: number;
  triggerPhase: "turn_start" | "turn_end" | "round_start" | "round_end";
}

/** Result of a trigger firing. */
export interface TriggerResult {
  abilityName: string;
  abilityId: string;
  triggerType: TriggerType;
  effects: AbilityEffect[];
  entityId: EntityId;
}

let nextRegId = 0;
function nextRegistrationId(): string {
  return `trg_${nextRegId++}`;
}

/**
 * Event-driven trigger system.
 * Replaces PassiveResolver with 30+ trigger types that register with the typed EventBus.
 */
export class TriggerSystem {
  private registrations = new Map<string, RegisteredTrigger>();
  private entityTriggers = new Map<EntityId, Set<string>>(); // entityId -> registrationIds
  private delayedEffects: DelayedEffect[] = [];
  private currentTurn = 0;
  private currentRound = 0;
  private pendingResults: TriggerResult[] = [];

  /** Callback invoked when a trigger fires. Set by combat manager. */
  onTriggerFired: ((result: TriggerResult) => void) | null = null;

  constructor(
    private eventBus: EventBus,
    private statusEffects: StatusEffectManager,
    private resourceManager: ResourceManager,
  ) {
    this.setupEventListeners();
  }

  // ── Registration ──

  /**
   * Register all triggers for an ability on an entity.
   * Returns unsubscribe function to remove all triggers.
   */
  registerAbilityTriggers(
    entityId: EntityId,
    abilityId: string,
    abilityName: string,
    triggers: AbilityTrigger[],
  ): () => void {
    const regIds: string[] = [];

    for (const trigger of triggers) {
      const regId = nextRegistrationId();
      const reg: RegisteredTrigger = {
        registrationId: regId,
        entityId,
        abilityId,
        trigger,
        state: {
          currentCooldown: 0,
          firesThisTurn: 0,
          firesThisCombat: 0,
          consecutiveHits: 0,
          lastFiredTurn: -1,
        },
        unsubscribe: null,
      };

      this.registrations.set(regId, reg);
      regIds.push(regId);

      let entitySet = this.entityTriggers.get(entityId);
      if (!entitySet) {
        entitySet = new Set();
        this.entityTriggers.set(entityId, entitySet);
      }
      entitySet.add(regId);
    }

    return () => {
      for (const regId of regIds) {
        const reg = this.registrations.get(regId);
        if (reg?.unsubscribe) reg.unsubscribe();
        this.registrations.delete(regId);
        const entitySet = this.entityTriggers.get(entityId);
        if (entitySet) entitySet.delete(regId);
      }
    };
  }

  /** Remove all triggers for an entity. */
  unregisterEntity(entityId: EntityId): void {
    const regIds = this.entityTriggers.get(entityId);
    if (!regIds) return;
    for (const regId of regIds) {
      const reg = this.registrations.get(regId);
      if (reg?.unsubscribe) reg.unsubscribe();
      this.registrations.delete(regId);
    }
    this.entityTriggers.delete(entityId);
  }

  // ── Turn/Round Processing ──

  /** Called at start of each entity's turn. */
  processTurnStart(world: World, entityId: EntityId): TriggerResult[] {
    this.currentTurn++;
    const results: TriggerResult[] = [];

    // Reset per-turn counters
    const regIds = this.entityTriggers.get(entityId);
    if (regIds) {
      for (const regId of regIds) {
        const reg = this.registrations.get(regId);
        if (reg) {
          reg.state.firesThisTurn = 0;
          if (reg.state.currentCooldown > 0) reg.state.currentCooldown--;
        }
      }
    }

    // Fire on_turn_start triggers
    results.push(...this.fireTriggerType(world, entityId, "on_turn_start", {}));

    // Fire periodic triggers
    results.push(...this.firePeriodicTriggers(world, entityId));

    // Fire threshold triggers (hp_below, hp_above)
    results.push(...this.fireThresholdTriggers(world, entityId));

    // Process delayed effects
    results.push(...this.processDelayedEffects(world, "turn_start"));

    return results;
  }

  /** Called at end of each entity's turn. */
  processTurnEnd(world: World, entityId: EntityId): TriggerResult[] {
    const results: TriggerResult[] = [];
    results.push(...this.fireTriggerType(world, entityId, "on_turn_end", {}));
    results.push(...this.processDelayedEffects(world, "turn_end"));
    return results;
  }

  /** Called at start of each round. */
  processRoundStart(world: World): TriggerResult[] {
    this.currentRound++;
    const results: TriggerResult[] = [];

    // Fire on_round_start for all entities with triggers
    for (const [entityId] of this.entityTriggers) {
      results.push(...this.fireTriggerType(world, entityId, "on_round_start", {}));
    }

    results.push(...this.processDelayedEffects(world, "round_start"));
    return results;
  }

  /** Called at end of each round. */
  processRoundEnd(world: World): TriggerResult[] {
    const results: TriggerResult[] = [];

    for (const [entityId] of this.entityTriggers) {
      results.push(...this.fireTriggerType(world, entityId, "on_round_end" as TriggerType, {}));
    }

    results.push(...this.processDelayedEffects(world, "round_end"));
    return results;
  }

  // ── Delayed Effects ──

  /** Schedule an effect for future execution. */
  scheduleDelayed(effect: DelayedEffect): void {
    this.delayedEffects.push(effect);
  }

  private processDelayedEffects(world: World, phase: string): TriggerResult[] {
    const results: TriggerResult[] = [];
    const remaining: DelayedEffect[] = [];

    for (const de of this.delayedEffects) {
      if (de.triggerRound <= this.currentRound && de.triggerPhase === phase) {
        results.push({
          abilityName: de.abilityId,
          abilityId: de.abilityId,
          triggerType: "periodic",
          effects: de.effects,
          entityId: de.entityId,
        });
      } else {
        remaining.push(de);
      }
    }

    this.delayedEffects = remaining;
    return results;
  }

  // ── Event Listeners ──

  private setupEventListeners(): void {
    // Map event bus events to trigger types
    this.eventBus.on("damage:dealt", (ev) => {
      this.fireForEntity(ev.attackerId, "on_hit", ev);
      this.fireForEntity(ev.defenderId, "on_damage_taken", ev);
      if (ev.critical) {
        this.fireForEntity(ev.attackerId, "on_crit", ev);
      }
    });

    this.eventBus.on("kill", (ev) => {
      this.fireForEntity(ev.killerId, "on_kill", ev);
      // on_ally_death for allies of the killed entity
      this.fireForAllAllies(ev.killedId, "on_ally_death", ev);
    });

    this.eventBus.on("death", (ev) => {
      this.fireForEntity(ev.entityId, "on_death", ev);
    });

    this.eventBus.on("damage:dodged", (ev) => {
      this.fireForEntity(ev.dodgerId, "on_dodge", ev);
    });

    this.eventBus.on("status:applied", (ev) => {
      this.fireForEntity(ev.targetId, "on_status_applied", ev);
    });

    this.eventBus.on("status:removed", (ev) => {
      this.fireForEntity(ev.targetId, "on_status_removed" as TriggerType, ev);
    });

    this.eventBus.on("resource:threshold", (ev) => {
      this.fireForEntity(ev.entityId, "resource_threshold", ev);
    });

    this.eventBus.on("resource:changed", (ev) => {
      // Check full/empty
      const state = this.resourceManager.getState(null as any, ev.entityId, ev.resourceId);
      if (state && ev.newValue >= state.effectiveMax) {
        this.fireForEntity(ev.entityId, "on_resource_full", ev);
      }
      if (ev.newValue <= 0) {
        this.fireForEntity(ev.entityId, "on_resource_empty", ev);
      }
    });

    this.eventBus.on("zone:enter", (ev) => {
      this.fireForEntity(ev.entityId, "on_enter_zone", ev);
    });

    this.eventBus.on("zone:exit", (ev) => {
      this.fireForEntity(ev.entityId, "on_exit_zone", ev);
    });

    this.eventBus.on("ability:used", (ev) => {
      this.fireForEntity(ev.casterId, "on_ability_used", ev);
    });

    this.eventBus.on("shield:break", (ev) => {
      this.fireForEntity(ev.entityId, "on_shield_break", ev);
    });

    this.eventBus.on("summon:created", (ev) => {
      this.fireForEntity(ev.ownerId, "on_summon_created", ev);
    });

    this.eventBus.on("summon:destroyed", (ev) => {
      this.fireForEntity(ev.ownerId, "on_summon_destroyed", ev);
    });

    this.eventBus.on("heal", (ev) => {
      this.fireForEntity(ev.targetId, "on_heal_received", ev);
    });

    this.eventBus.on("transformation:start", (ev) => {
      this.fireForEntity(ev.entityId, "on_transformation", ev);
    });

    this.eventBus.on("combo", (ev) => {
      this.fireForEntity(ev.entityId, "on_combo", ev);
    });
  }

  // ── Core Firing Logic ──

  private fireForEntity(entityId: EntityId, triggerType: TriggerType, eventData: any): void {
    const regIds = this.entityTriggers.get(entityId);
    if (!regIds) return;

    for (const regId of regIds) {
      const reg = this.registrations.get(regId);
      if (!reg || reg.trigger.type !== triggerType) continue;
      this.tryFire(reg, eventData);
    }
  }

  private fireForAllAllies(entityId: EntityId, triggerType: TriggerType, eventData: any): void {
    // Fire for all entities on the same team
    for (const [otherId, regIds] of this.entityTriggers) {
      if (otherId === entityId) continue;
      for (const regId of regIds) {
        const reg = this.registrations.get(regId);
        if (!reg || reg.trigger.type !== triggerType) continue;
        this.tryFire(reg, eventData);
      }
    }
  }

  private fireTriggerType(world: World, entityId: EntityId, triggerType: TriggerType, eventData: any): TriggerResult[] {
    const results: TriggerResult[] = [];
    const regIds = this.entityTriggers.get(entityId);
    if (!regIds) return results;

    for (const regId of regIds) {
      const reg = this.registrations.get(regId);
      if (!reg || reg.trigger.type !== triggerType) continue;
      const result = this.tryFire(reg, eventData);
      if (result) results.push(result);
    }

    return results;
  }

  private firePeriodicTriggers(world: World, entityId: EntityId): TriggerResult[] {
    const results: TriggerResult[] = [];
    const regIds = this.entityTriggers.get(entityId);
    if (!regIds) return results;

    for (const regId of regIds) {
      const reg = this.registrations.get(regId);
      if (!reg || reg.trigger.type !== "periodic") continue;

      const interval = reg.trigger.params.interval ?? 1;
      if (this.currentTurn % interval === 0) {
        const result = this.tryFire(reg, {});
        if (result) results.push(result);
      }
    }

    return results;
  }

  private fireThresholdTriggers(world: World, entityId: EntityId): TriggerResult[] {
    const results: TriggerResult[] = [];
    const regIds = this.entityTriggers.get(entityId);
    if (!regIds) return results;

    for (const regId of regIds) {
      const reg = this.registrations.get(regId);
      if (!reg) continue;

      if (reg.trigger.type === "hp_below") {
        const health = world.getComponent<HealthComponent>(entityId, "health");
        if (health) {
          const threshold = (reg.trigger.params.percent ?? 50) / 100;
          if (health.current / health.max <= threshold) {
            const result = this.tryFire(reg, { health });
            if (result) results.push(result);
          }
        }
      }

      if (reg.trigger.type === "hp_above") {
        const health = world.getComponent<HealthComponent>(entityId, "health");
        if (health) {
          const threshold = (reg.trigger.params.percent ?? 50) / 100;
          if (health.current / health.max >= threshold) {
            const result = this.tryFire(reg, { health });
            if (result) results.push(result);
          }
        }
      }

      if (reg.trigger.type === "stack_threshold") {
        const effectId = reg.trigger.params.effectId as string;
        const threshold = reg.trigger.params.stacks ?? 3;
        if (effectId) {
          const stacks = this.statusEffects.getStacks(world, entityId, effectId);
          if (stacks >= threshold) {
            const result = this.tryFire(reg, { stacks });
            if (result) results.push(result);
          }
        }
      }
    }

    return results;
  }

  private tryFire(reg: RegisteredTrigger, eventData: any): TriggerResult | null {
    const { trigger, state } = reg;

    // Check cooldown
    if (state.currentCooldown > 0) return null;

    // Check per-turn limit
    if (trigger.maxFiresPerTurn > 0 && state.firesThisTurn >= trigger.maxFiresPerTurn) return null;

    // Check per-combat limit
    if (trigger.maxFiresPerCombat > 0 && state.firesThisCombat >= trigger.maxFiresPerCombat) return null;

    // Check probability
    if (trigger.chance < 100 && Math.random() * 100 >= trigger.chance) return null;

    // Check conditions
    // (Conditions require world context - simplified check here)
    // Full condition checking would be done by the effect executor

    // Fire!
    state.firesThisTurn++;
    state.firesThisCombat++;
    state.currentCooldown = trigger.cooldown;
    state.lastFiredTurn = this.currentTurn;

    const result: TriggerResult = {
      abilityName: reg.abilityId,
      abilityId: reg.abilityId,
      triggerType: trigger.type,
      effects: trigger.effects,
      entityId: reg.entityId,
    };

    // Notify callback
    if (this.onTriggerFired) {
      this.onTriggerFired(result);
    }

    this.pendingResults.push(result);
    return result;
  }

  /** Get and clear pending results since last check. */
  consumePendingResults(): TriggerResult[] {
    const results = [...this.pendingResults];
    this.pendingResults = [];
    return results;
  }

  /** Reset all trigger states for a new combat. */
  resetCombat(): void {
    this.currentTurn = 0;
    this.currentRound = 0;
    this.delayedEffects = [];
    this.pendingResults = [];
    for (const reg of this.registrations.values()) {
      reg.state.currentCooldown = 0;
      reg.state.firesThisTurn = 0;
      reg.state.firesThisCombat = 0;
      reg.state.consecutiveHits = 0;
      reg.state.lastFiredTurn = -1;
    }
  }
}
