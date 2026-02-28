import type { EntityId } from "@entities/Entity";
import type { DamageType } from "@data/WeaponData";

// ── Game Event Definitions ──

export interface DamageDealtEvent {
  attackerId: EntityId;
  defenderId: EntityId;
  damage: number;
  damageType: DamageType | string;
  critical: boolean;
  overkill: boolean;
  source: string; // ability id or "melee"
}

export interface KillEvent {
  killerId: EntityId;
  killedId: EntityId;
  damageType: DamageType | string;
  source: string;
}

export interface StatusAppliedEvent {
  sourceId: EntityId | null;
  targetId: EntityId;
  effectId: string;
  stacks: number;
  duration: number;
}

export interface StatusRemovedEvent {
  targetId: EntityId;
  effectId: string;
  reason: "expired" | "dispelled" | "replaced" | "death";
}

export interface StatusTickEvent {
  targetId: EntityId;
  effectId: string;
  damage: number;
  killed: boolean;
}

export interface ResourceChangedEvent {
  entityId: EntityId;
  resourceId: string;
  previousValue: number;
  newValue: number;
  reason: string;
}

export interface ResourceThresholdEvent {
  entityId: EntityId;
  resourceId: string;
  threshold: number;
  direction: "above" | "below";
}

export interface MovementEvent {
  entityId: EntityId;
  fromQ: number;
  fromR: number;
  toQ: number;
  toR: number;
}

export interface ZoneEnterEvent {
  entityId: EntityId;
  zoneId: string;
  q: number;
  r: number;
}

export interface ZoneExitEvent {
  entityId: EntityId;
  zoneId: string;
  q: number;
  r: number;
}

export interface SummonCreatedEvent {
  ownerId: EntityId;
  summonId: EntityId;
  summonType: string;
}

export interface SummonDestroyedEvent {
  ownerId: EntityId;
  summonId: EntityId;
  reason: "killed" | "expired" | "sacrificed" | "merged" | "unsummoned";
}

export interface TerrainModifiedEvent {
  q: number;
  r: number;
  previousTerrain: string;
  newTerrain: string;
  sourceId: EntityId | null;
}

export interface TransformationStartEvent {
  entityId: EntityId;
  formId: string;
  duration: number;
}

export interface TransformationEndEvent {
  entityId: EntityId;
  formId: string;
  reason: "expired" | "cancelled" | "death" | "replaced";
}

export interface TurnStartEvent {
  entityId: EntityId;
  turnNumber: number;
}

export interface TurnEndEvent {
  entityId: EntityId;
  turnNumber: number;
}

export interface RoundStartEvent {
  roundNumber: number;
}

export interface RoundEndEvent {
  roundNumber: number;
}

export interface AbilityUsedEvent {
  casterId: EntityId;
  abilityId: string;
  targets: EntityId[];
}

export interface DodgeEvent {
  attackerId: EntityId;
  dodgerId: EntityId;
  source: string;
}

export interface ShieldBreakEvent {
  entityId: EntityId;
  shieldId: string;
  breakerId: EntityId | null;
}

export interface HealEvent {
  sourceId: EntityId | null;
  targetId: EntityId;
  amount: number;
  overheal: number;
}

export interface ComboEvent {
  entityId: EntityId;
  comboId: string;
  hits: number;
}

export interface DeathEvent {
  entityId: EntityId;
  killerId: EntityId | null;
}

export interface TimeRewindEvent {
  casterId: EntityId;
  turnsRewound: number;
}

export interface ZoneCreatedEvent {
  zoneId: string;
  creatorId: EntityId | null;
  q: number;
  r: number;
  radius: number;
}

export interface ZoneExpiredEvent {
  zoneId: string;
}

/** Map of event name → payload type. */
export interface GameEvents {
  "damage:dealt": DamageDealtEvent;
  "damage:dodged": DodgeEvent;
  "kill": KillEvent;
  "death": DeathEvent;
  "status:applied": StatusAppliedEvent;
  "status:removed": StatusRemovedEvent;
  "status:tick": StatusTickEvent;
  "resource:changed": ResourceChangedEvent;
  "resource:threshold": ResourceThresholdEvent;
  "movement:move": MovementEvent;
  "zone:enter": ZoneEnterEvent;
  "zone:exit": ZoneExitEvent;
  "zone:created": ZoneCreatedEvent;
  "zone:expired": ZoneExpiredEvent;
  "summon:created": SummonCreatedEvent;
  "summon:destroyed": SummonDestroyedEvent;
  "terrain:modified": TerrainModifiedEvent;
  "transformation:start": TransformationStartEvent;
  "transformation:end": TransformationEndEvent;
  "turn:start": TurnStartEvent;
  "turn:end": TurnEndEvent;
  "round:start": RoundStartEvent;
  "round:end": RoundEndEvent;
  "ability:used": AbilityUsedEvent;
  "shield:break": ShieldBreakEvent;
  "heal": HealEvent;
  "combo": ComboEvent;
  "time:rewind": TimeRewindEvent;
}

export type GameEventName = keyof GameEvents;

// ── Listener types ──

export type EventCallback<E extends GameEventName> = (event: GameEvents[E]) => void;

export interface MiddlewareContext<E extends GameEventName> {
  event: GameEvents[E];
  eventName: E;
  /** Set to true to cancel the event (prevent further propagation). */
  cancelled: boolean;
  /** Modify the event payload in-place. */
  modify(changes: Partial<GameEvents[E]>): void;
}

export type MiddlewareHandler<E extends GameEventName> = (ctx: MiddlewareContext<E>) => void;

interface ListenerEntry<E extends GameEventName = GameEventName> {
  callback: EventCallback<E>;
  priority: number;
  once: boolean;
}

interface MiddlewareEntry<E extends GameEventName = GameEventName> {
  handler: MiddlewareHandler<E>;
  priority: number;
}

/**
 * Typed event bus with middleware pipeline, priority ordering,
 * wildcard subscriptions, and one-shot listeners.
 */
export class EventBus {
  private listeners = new Map<string, ListenerEntry<any>[]>();
  private middleware = new Map<string, MiddlewareEntry<any>[]>();
  private wildcardListeners: ListenerEntry<any>[] = [];
  private wildcardMiddleware: MiddlewareEntry<any>[] = [];

  /**
   * Subscribe to a typed event. Returns an unsubscribe function.
   * @param priority Lower numbers fire first (default 0).
   */
  on<E extends GameEventName>(
    event: E,
    callback: EventCallback<E>,
    priority = 0,
  ): () => void {
    const entry: ListenerEntry<E> = { callback, priority, once: false };
    const list = this.listeners.get(event);
    if (list) {
      list.push(entry);
      list.sort((a, b) => a.priority - b.priority);
    } else {
      this.listeners.set(event, [entry]);
    }
    return () => this.offEntry(event, entry);
  }

  /** Subscribe for a single firing, then auto-unsubscribe. */
  once<E extends GameEventName>(
    event: E,
    callback: EventCallback<E>,
    priority = 0,
  ): () => void {
    const entry: ListenerEntry<E> = { callback, priority, once: true };
    const list = this.listeners.get(event);
    if (list) {
      list.push(entry);
      list.sort((a, b) => a.priority - b.priority);
    } else {
      this.listeners.set(event, [entry]);
    }
    return () => this.offEntry(event, entry);
  }

  /** Subscribe to ALL events (wildcard). */
  onAny(callback: EventCallback<any>, priority = 0): () => void {
    const entry: ListenerEntry<any> = { callback, priority, once: false };
    this.wildcardListeners.push(entry);
    this.wildcardListeners.sort((a, b) => a.priority - b.priority);
    return () => {
      const idx = this.wildcardListeners.indexOf(entry);
      if (idx >= 0) this.wildcardListeners.splice(idx, 1);
    };
  }

  /**
   * Register middleware that can intercept/modify/cancel events before listeners fire.
   * @param priority Lower numbers execute first (default 0).
   */
  use<E extends GameEventName>(
    event: E,
    handler: MiddlewareHandler<E>,
    priority = 0,
  ): () => void {
    const entry: MiddlewareEntry<E> = { handler, priority };
    const list = this.middleware.get(event);
    if (list) {
      list.push(entry);
      list.sort((a, b) => a.priority - b.priority);
    } else {
      this.middleware.set(event, [entry]);
    }
    return () => {
      const arr = this.middleware.get(event);
      if (arr) {
        const idx = arr.indexOf(entry);
        if (idx >= 0) arr.splice(idx, 1);
      }
    };
  }

  /** Register wildcard middleware (runs on ALL events). */
  useAny(handler: MiddlewareHandler<any>, priority = 0): () => void {
    const entry: MiddlewareEntry<any> = { handler, priority };
    this.wildcardMiddleware.push(entry);
    this.wildcardMiddleware.sort((a, b) => a.priority - b.priority);
    return () => {
      const idx = this.wildcardMiddleware.indexOf(entry);
      if (idx >= 0) this.wildcardMiddleware.splice(idx, 1);
    };
  }

  /**
   * Emit a typed event. Runs middleware pipeline first, then listeners.
   * Returns false if the event was cancelled by middleware.
   */
  emit<E extends GameEventName>(event: E, payload: GameEvents[E]): boolean {
    // Build middleware context
    const ctx: MiddlewareContext<E> = {
      event: payload,
      eventName: event,
      cancelled: false,
      modify(changes: Partial<GameEvents[E]>) {
        Object.assign(ctx.event, changes);
      },
    };

    // Run wildcard middleware
    for (const mw of this.wildcardMiddleware) {
      mw.handler(ctx as MiddlewareContext<any>);
      if (ctx.cancelled) return false;
    }

    // Run event-specific middleware
    const mwList = this.middleware.get(event);
    if (mwList) {
      for (const mw of mwList) {
        mw.handler(ctx);
        if (ctx.cancelled) return false;
      }
    }

    // Fire wildcard listeners
    for (const listener of [...this.wildcardListeners]) {
      listener.callback(ctx.event);
      if (listener.once) {
        const idx = this.wildcardListeners.indexOf(listener);
        if (idx >= 0) this.wildcardListeners.splice(idx, 1);
      }
    }

    // Fire event-specific listeners
    const list = this.listeners.get(event);
    if (list) {
      const toRemove: ListenerEntry<E>[] = [];
      for (const entry of [...list]) {
        entry.callback(ctx.event);
        if (entry.once) toRemove.push(entry);
      }
      for (const entry of toRemove) {
        const idx = list.indexOf(entry);
        if (idx >= 0) list.splice(idx, 1);
      }
    }

    return true;
  }

  /** Remove a specific listener. */
  off<E extends GameEventName>(event: E, callback: EventCallback<E>): void {
    const list = this.listeners.get(event);
    if (!list) return;
    const idx = list.findIndex((e) => e.callback === callback);
    if (idx >= 0) list.splice(idx, 1);
    if (list.length === 0) this.listeners.delete(event);
  }

  /** Remove all listeners and middleware for a specific event. */
  clear(event: GameEventName): void {
    this.listeners.delete(event);
    this.middleware.delete(event);
  }

  /** Remove ALL listeners and middleware. */
  clearAll(): void {
    this.listeners.clear();
    this.middleware.clear();
    this.wildcardListeners.length = 0;
    this.wildcardMiddleware.length = 0;
  }

  private offEntry(event: string, entry: ListenerEntry<any>): void {
    const list = this.listeners.get(event);
    if (!list) return;
    const idx = list.indexOf(entry);
    if (idx >= 0) list.splice(idx, 1);
    if (list.length === 0) this.listeners.delete(event);
  }
}
