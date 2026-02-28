import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { EventBus } from "@core/EventBus";
import type { Component } from "@entities/Component";

// ── Battle Snapshot ──

/**
 * Complete snapshot of battle state at a point in time.
 * Used for time rewind mechanics.
 */
export interface BattleSnapshot {
  /** Turn number when this snapshot was taken. */
  turnNumber: number;
  /** Round number. */
  roundNumber: number;
  /** Serialized world state (entities + components). */
  worldState: {
    entities: Record<string, Record<string, Component>>;
    nextId: number;
  };
  /** Active zone states. */
  zoneStates: ZoneSnapshotEntry[];
  /** Turn order at time of snapshot. */
  turnOrder: EntityId[];
  /** Delayed effects queue. */
  delayedEffects: any[];
  /** Timestamp for ordering. */
  timestamp: number;
}

interface ZoneSnapshotEntry {
  id: string;
  defId: string;
  center: { q: number; r: number };
  radius: number;
  remainingTurns: number;
}

/** Damage recording buffer for replay mechanics. */
export interface DamageRecordingBuffer {
  entityId: EntityId;
  entries: DamageRecordEntry[];
  active: boolean;
  startTurn: number;
}

export interface DamageRecordEntry {
  turn: number;
  damage: number;
  damageType: string;
  sourceId: EntityId;
}

/**
 * Manages time manipulation mechanics.
 *
 * Features:
 * - Rolling window of battle snapshots for rewind
 * - Damage recording buffers for replay
 * - Delayed detonation scheduling
 * - Time stop / haste / slow via status effects + turn order manipulation
 */
export class TimelineManager {
  private snapshots: BattleSnapshot[] = [];
  private readonly maxSnapshots = 20;
  private currentTurn = 0;
  private currentRound = 0;

  /** Active damage recording buffers. */
  private recordingBuffers = new Map<EntityId, DamageRecordingBuffer>();

  constructor(private eventBus: EventBus) {
    // Listen for damage events to record
    this.eventBus.on("damage:dealt", (ev) => {
      this.recordDamage(ev.defenderId, ev.damage, ev.damageType as string, ev.attackerId);
    });
  }

  // ── Snapshot Management ──

  /**
   * Take a snapshot of the current battle state.
   * Should be called at the start of each turn.
   */
  takeSnapshot(world: World, turnOrder: EntityId[], zoneStates?: ZoneSnapshotEntry[]): void {
    const snapshot: BattleSnapshot = {
      turnNumber: this.currentTurn,
      roundNumber: this.currentRound,
      worldState: world.serialize() as BattleSnapshot["worldState"],
      zoneStates: zoneStates ?? [],
      turnOrder: [...turnOrder],
      delayedEffects: [],
      timestamp: Date.now(),
    };

    this.snapshots.push(snapshot);

    // Maintain rolling window
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  /**
   * Rewind the battle state to N turns ago.
   *
   * @param world The ECS world to restore.
   * @param turnsBack How many turns to rewind.
   * @param excludeEntityId Optional entity that "remembers" (caster). Their state is preserved.
   * @returns The snapshot that was restored, or null if impossible.
   */
  rewind(
    world: World,
    turnsBack: number,
    excludeEntityId?: EntityId,
  ): BattleSnapshot | null {
    const targetIndex = this.snapshots.length - 1 - turnsBack;
    if (targetIndex < 0 || targetIndex >= this.snapshots.length) return null;

    const snapshot = this.snapshots[targetIndex]!;

    // Save excluded entity's current state
    let excludedState: Record<string, Component> | null = null;
    if (excludeEntityId) {
      const currentWorld = world.serialize() as BattleSnapshot["worldState"];
      excludedState = currentWorld.entities[excludeEntityId] ?? null;
    }

    // Restore world state
    world.deserialize(snapshot.worldState);

    // Restore excluded entity's state (they "remember")
    if (excludeEntityId && excludedState) {
      for (const [type, comp] of Object.entries(excludedState)) {
        world.addComponent(excludeEntityId, comp);
      }
    }

    // Trim snapshots to the rewind point
    this.snapshots = this.snapshots.slice(0, targetIndex + 1);

    // Emit event
    this.eventBus.emit("time:rewind", {
      casterId: excludeEntityId ?? ("" as EntityId),
      turnsRewound: turnsBack,
    });

    return snapshot;
  }

  /** Get number of available snapshots for rewind. */
  getAvailableRewindTurns(): number {
    return Math.max(0, this.snapshots.length - 1);
  }

  /** Get the snapshot from N turns ago (for preview). */
  peekSnapshot(turnsBack: number): BattleSnapshot | null {
    const idx = this.snapshots.length - 1 - turnsBack;
    if (idx < 0 || idx >= this.snapshots.length) return null;
    return this.snapshots[idx]!;
  }

  // ── Turn Tracking ──

  advanceTurn(): void {
    this.currentTurn++;
  }

  advanceRound(): void {
    this.currentRound++;
  }

  getCurrentTurn(): number {
    return this.currentTurn;
  }

  getCurrentRound(): number {
    return this.currentRound;
  }

  // ── Damage Recording ──

  /**
   * Start recording damage dealt to an entity.
   * Used for "damage replay" abilities (e.g., Echo, Temporal Wound).
   */
  startRecording(entityId: EntityId): void {
    this.recordingBuffers.set(entityId, {
      entityId,
      entries: [],
      active: true,
      startTurn: this.currentTurn,
    });
  }

  /** Stop recording and return the buffer. */
  stopRecording(entityId: EntityId): DamageRecordingBuffer | null {
    const buffer = this.recordingBuffers.get(entityId);
    if (!buffer) return null;
    buffer.active = false;
    this.recordingBuffers.delete(entityId);
    return buffer;
  }

  /** Get total recorded damage for an entity. */
  getRecordedDamage(entityId: EntityId): number {
    const buffer = this.recordingBuffers.get(entityId);
    if (!buffer) return 0;
    return buffer.entries.reduce((sum, e) => sum + e.damage, 0);
  }

  /** Is damage currently being recorded for this entity? */
  isRecording(entityId: EntityId): boolean {
    return this.recordingBuffers.get(entityId)?.active ?? false;
  }

  private recordDamage(entityId: EntityId, damage: number, damageType: string, sourceId: EntityId): void {
    const buffer = this.recordingBuffers.get(entityId);
    if (!buffer?.active) return;
    buffer.entries.push({
      turn: this.currentTurn,
      damage,
      damageType,
      sourceId,
    });
  }

  // ── Turn Order Manipulation ──

  /**
   * Compute modified turn order based on time effects.
   * Entities with haste get extra turns, slowed entities skip turns,
   * time-stopped entities are removed from the order.
   *
   * @param baseTurnOrder The original turn order.
   * @param world The ECS world.
   * @returns Modified turn order.
   */
  computeModifiedTurnOrder(baseTurnOrder: EntityId[], world: World): EntityId[] {
    const result: EntityId[] = [];

    for (const entityId of baseTurnOrder) {
      const statusComp = world.getComponent<any>(entityId, "statusEffects");
      if (!statusComp) {
        result.push(entityId);
        continue;
      }

      const effects = statusComp.effects as { id: string; modifiers: Record<string, number> }[];

      // Time-stopped entities skip their turn
      const isTimeStopped = effects.some(e => e.id === "time_locked");
      if (isTimeStopped) continue;

      result.push(entityId);

      // Hasted entities get an extra action (insert again later in order)
      const isHasted = effects.some(e => e.id === "haste");
      if (isHasted) {
        // Insert a second action at the end of the current round segment
        result.push(entityId);
      }
    }

    return result;
  }

  /**
   * Save entity state for a "save point" ability.
   * The entity can later restore to this exact state.
   */
  saveEntityState(world: World, entityId: EntityId): EntitySavePoint {
    const worldState = world.serialize() as BattleSnapshot["worldState"];
    const entityState = worldState.entities[entityId];
    return {
      entityId,
      state: entityState ? { ...entityState } : {},
      turn: this.currentTurn,
    };
  }

  /**
   * Restore an entity to a previously saved state.
   */
  restoreEntityState(world: World, savePoint: EntitySavePoint): void {
    for (const [type, comp] of Object.entries(savePoint.state)) {
      world.addComponent(savePoint.entityId, comp as Component);
    }
  }

  /** Clear all snapshots and buffers. Call at combat start. */
  reset(): void {
    this.snapshots = [];
    this.recordingBuffers.clear();
    this.currentTurn = 0;
    this.currentRound = 0;
  }
}

export interface EntitySavePoint {
  entityId: EntityId;
  state: Record<string, any>;
  turn: number;
}
