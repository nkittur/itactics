import type { World } from "@entities/World";
import type { HexGrid } from "@hex/HexGrid";
import type { EntityId } from "@entities/Entity";
import type { PositionComponent } from "@entities/components/Position";
import type { HealthComponent } from "@entities/components/Health";
import { TurnOrder } from "./TurnOrder";
import { DamageCalculator, type AttackResult } from "./DamageCalculator";
import { decideAIAction } from "./SimpleAI";
import { RNG } from "@utils/RNG";
import { hexDistance, hexNeighbors } from "@hex/HexMath";
import { findPath, reachableHexes } from "@hex/HexPathfinding";

export type CombatPhase = "deployment" | "playerTurn" | "enemyTurn" | "battleEnd";
export type PlayerTurnState =
  | "awaitingInput"
  | "postMove"
  | "animating";

interface UndoInfo {
  entityId: EntityId;
  oldQ: number;
  oldR: number;
  oldElevation: number;
  path: Array<{ q: number; r: number }>;
}

export class CombatManager {
  turnOrder: TurnOrder;
  damageCalc: DamageCalculator;
  phase: CombatPhase = "playerTurn";
  playerTurnState: PlayerTurnState = "awaitingInput";
  selectedUnit: EntityId | null = null;

  /** Movement range cache for the currently selected unit. */
  moveRange: Map<string, number> | null = null;

  /** Undo info for reverting the last move. */
  private undoInfo: UndoInfo | null = null;

  /**
   * Continuation to run after animations complete.
   * Set by executeMove, executeAttack, runEnemyTurn.
   * Consumed by continueAfterAnimation().
   */
  private pendingContinuation: (() => void) | null = null;

  // ── Callbacks for the rendering/UI layer ──

  onPhaseChange?: (phase: CombatPhase) => void;
  onTurnAdvance?: (entityId: EntityId) => void;
  onAttackResult?: (
    result: AttackResult,
    attackerId: EntityId,
    defenderId: EntityId
  ) => void;
  onUnitMoved?: (
    entityId: EntityId,
    path: Array<{ q: number; r: number }>
  ) => void;
  /** Fired when a unit is teleported (e.g. undo) — no animation needed. */
  onUnitTeleported?: (entityId: EntityId, q: number, r: number) => void;
  onBattleEnd?: (victory: boolean) => void;
  onPlayerStateChange?: (state: PlayerTurnState) => void;
  /** Fired after each action that may need animation (move/attack/enemy turn). */
  onActionComplete?: () => void;

  constructor(
    private world: World,
    private grid: HexGrid,
    seed?: number
  ) {
    const rng = new RNG(seed ?? Date.now());
    this.turnOrder = new TurnOrder();
    this.damageCalc = new DamageCalculator(rng);
  }

  /** Start combat -- calculate initial turn order, begin first turn. */
  start(): void {
    this.turnOrder.calculateOrder(this.world);
    this.beginCurrentTurn();
  }

  /**
   * Called by the presentation layer after animations finish.
   * Runs the pending continuation (advance turn, enter postMove, etc.).
   */
  continueAfterAnimation(): void {
    const fn = this.pendingContinuation;
    this.pendingContinuation = null;
    fn?.();
  }

  /** Handle a hex being tapped during player turn. */
  handleHexTap(q: number, r: number): boolean {
    if (this.phase !== "playerTurn") return false;

    const tile = this.grid.get(q, r);

    switch (this.playerTurnState) {
      case "awaitingInput": {
        if (!this.selectedUnit) break;
        const attackerPos = this.world.getComponent<PositionComponent>(
          this.selectedUnit,
          "position"
        );
        if (!attackerPos) break;

        // Tap on adjacent enemy → attack directly
        if (
          tile?.occupant &&
          tile.occupant !== this.selectedUnit &&
          this.isEnemyEntity(tile.occupant) &&
          hexDistance({ q: attackerPos.q, r: attackerPos.r }, { q, r }) === 1
        ) {
          this.executeAttack(this.selectedUnit, tile.occupant);
          return true;
        }

        // Tap on reachable hex → move
        const key = `${q},${r}`;
        if (this.moveRange && this.moveRange.has(key) && !tile?.occupant) {
          this.executeMove(this.selectedUnit, q, r);
          return true;
        }

        return false;
      }

      case "postMove": {
        if (!this.selectedUnit) break;
        const attackerPos = this.world.getComponent<PositionComponent>(
          this.selectedUnit,
          "position"
        );
        if (!attackerPos) break;

        // Tap on adjacent enemy → attack
        if (
          tile?.occupant &&
          tile.occupant !== this.selectedUnit &&
          this.isEnemyEntity(tile.occupant) &&
          hexDistance({ q: attackerPos.q, r: attackerPos.r }, { q, r }) === 1
        ) {
          this.undoInfo = null; // can't undo after attacking
          this.executeAttack(this.selectedUnit, tile.occupant);
          return true;
        }

        return false;
      }

      default:
        break;
    }

    return false;
  }

  /** Handle action bar button press. */
  handleAction(action: "undo" | "wait" | "endTurn"): void {
    if (this.phase !== "playerTurn") return;

    switch (action) {
      case "undo":
        this.undoMove();
        break;

      case "wait":
        this.turnOrder.wait();
        this.moveRange = null;
        this.undoInfo = null;
        this.endPlayerUnitTurn();
        break;

      case "endTurn":
        this.undoInfo = null;
        this.endPlayerUnitTurn();
        break;
    }
  }

  // ── Private action methods ──

  /** Execute a move action for the given entity to (q, r). */
  private executeMove(entityId: EntityId, q: number, r: number): void {
    const pos = this.world.getComponent<PositionComponent>(
      entityId,
      "position"
    );
    if (!pos) return;

    const pathResult = findPath(
      this.grid,
      { q: pos.q, r: pos.r },
      { q, r },
      4
    );
    if (!pathResult.found) return;

    // Save undo info before moving
    this.undoInfo = {
      entityId,
      oldQ: pos.q,
      oldR: pos.r,
      oldElevation: pos.elevation,
      path: pathResult.path,
    };

    this.playerTurnState = "animating";

    // Check remaining movement before clearing moveRange
    const destKey = `${q},${r}`;
    const remainingMovement = this.moveRange?.get(destKey) ?? 0;

    // Update occupancy on the grid
    const oldTile = this.grid.get(pos.q, pos.r);
    if (oldTile) oldTile.occupant = null;

    const newTile = this.grid.get(q, r);
    if (newTile) newTile.occupant = entityId;

    // Update position component
    pos.q = q;
    pos.r = r;
    if (newTile) pos.elevation = newTile.elevation;

    this.moveRange = null;

    this.onUnitMoved?.(entityId, pathResult.path);

    // Set continuation for after animation
    this.pendingContinuation = () => {
      if (remainingMovement === 0 && !this.hasAdjacentEnemies(entityId)) {
        this.undoInfo = null;
        this.endPlayerUnitTurn();
      } else {
        this.setPlayerState("postMove");
      }
    };

    this.onActionComplete?.();
  }

  /** Undo the last move — instant, no animation. */
  private undoMove(): void {
    if (!this.undoInfo) return;

    const { entityId, oldQ, oldR, oldElevation } = this.undoInfo;
    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (!pos) return;

    // Revert grid occupancy
    const currentTile = this.grid.get(pos.q, pos.r);
    if (currentTile) currentTile.occupant = null;

    const oldTile = this.grid.get(oldQ, oldR);
    if (oldTile) oldTile.occupant = entityId;

    // Revert position
    pos.q = oldQ;
    pos.r = oldR;
    pos.elevation = oldElevation;

    this.undoInfo = null;

    // Teleport the visual (no animation)
    this.onUnitTeleported?.(entityId, oldQ, oldR);

    // Recalculate move range and go back to awaitingInput
    this.calculateMoveRange(entityId);
    this.setPlayerState("awaitingInput");
  }

  /** Execute an attack action. */
  private executeAttack(attackerId: EntityId, defenderId: EntityId): void {
    this.playerTurnState = "animating";

    const result = this.damageCalc.resolveMelee(
      this.world,
      attackerId,
      defenderId
    );

    this.onAttackResult?.(result, attackerId, defenderId);

    if (result.targetKilled) {
      this.handleDeath(defenderId);
    }

    // Set continuation for after animation
    this.pendingContinuation = () => {
      if (!this.checkBattleEnd()) {
        this.endPlayerUnitTurn();
      }
    };

    this.onActionComplete?.();
  }

  /** Calculate and cache move range for a unit. */
  private calculateMoveRange(entityId: EntityId): void {
    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (pos) {
      this.moveRange = reachableHexes(
        this.grid,
        { q: pos.q, r: pos.r },
        4
      );
    }
  }

  /** End the current player unit's turn and advance. */
  private endPlayerUnitTurn(): void {
    this.selectedUnit = null;
    this.moveRange = null;
    this.undoInfo = null;
    this.playerTurnState = "awaitingInput";

    const newRound = this.turnOrder.advance();
    if (newRound) {
      this.turnOrder.calculateOrder(this.world);
    }

    this.beginCurrentTurn();
  }

  /** Begin the current unit's turn based on who it belongs to. */
  private beginCurrentTurn(): void {
    if (this.checkBattleEnd()) return;

    const entry = this.turnOrder.current();
    if (!entry) return;

    this.onTurnAdvance?.(entry.entityId);

    const isEnemy = this.isEnemyEntity(entry.entityId);

    if (isEnemy) {
      this.setPhase("enemyTurn");
      this.runEnemyTurn();
    } else {
      this.setPhase("playerTurn");
      this.selectedUnit = entry.entityId;
      this.calculateMoveRange(entry.entityId);
      this.setPlayerState("awaitingInput");
    }
  }

  /** Set the player turn state and fire the callback. */
  private setPlayerState(state: PlayerTurnState): void {
    this.playerTurnState = state;
    this.onPlayerStateChange?.(state);
  }

  /** Check if the current unit can undo its move. */
  get canUndo(): boolean {
    return this.undoInfo !== null;
  }

  /**
   * Run ONE enemy unit's turn, then wait for animation.
   * Does NOT recurse — DemoBattle calls continueAfterAnimation()
   * after animations finish, which runs pendingContinuation.
   */
  private runEnemyTurn(): void {
    const entry = this.turnOrder.current();
    if (!entry) return;

    const entityId = entry.entityId;
    const playerUnits = this.getPlayerUnits();

    const action = decideAIAction(this.world, this.grid, entityId, playerUnits);

    switch (action.type) {
      case "move": {
        const pos = this.world.getComponent<PositionComponent>(
          entityId,
          "position"
        );
        if (pos && action.path.length > 0) {
          const dest = action.path[action.path.length - 1]!;

          const oldTile = this.grid.get(pos.q, pos.r);
          if (oldTile) oldTile.occupant = null;

          const newTile = this.grid.get(dest.q, dest.r);
          if (newTile) newTile.occupant = entityId;

          pos.q = dest.q;
          pos.r = dest.r;
          if (newTile) pos.elevation = newTile.elevation;

          this.onUnitMoved?.(entityId, action.path);
        }

        const posAfterMove = this.world.getComponent<PositionComponent>(
          entityId,
          "position"
        );
        if (posAfterMove) {
          const adjacentTarget = this.findAdjacentEnemy(
            posAfterMove,
            playerUnits
          );
          if (adjacentTarget) {
            const result = this.damageCalc.resolveMelee(
              this.world,
              entityId,
              adjacentTarget
            );
            this.onAttackResult?.(result, entityId, adjacentTarget);
            if (result.targetKilled) {
              this.handleDeath(adjacentTarget);
            }
          }
        }
        break;
      }

      case "attack": {
        const result = this.damageCalc.resolveMelee(
          this.world,
          entityId,
          action.targetId
        );
        this.onAttackResult?.(result, entityId, action.targetId);
        if (result.targetKilled) {
          this.handleDeath(action.targetId);
        }
        break;
      }

      case "wait":
        break;
    }

    // Set continuation: advance and start next turn (after animations)
    this.pendingContinuation = () => {
      if (!this.checkBattleEnd()) {
        const newRound = this.turnOrder.advance();
        if (newRound) {
          this.turnOrder.calculateOrder(this.world);
        }
        this.beginCurrentTurn();
      }
    };

    this.onActionComplete?.();
  }

  // ── Helpers ──

  /** Check whether a unit has any living enemy units on adjacent hexes. */
  private hasAdjacentEnemies(entityId: EntityId): boolean {
    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (!pos) return false;
    for (const n of hexNeighbors(pos.q, pos.r)) {
      const tile = this.grid.get(n.q, n.r);
      if (tile?.occupant && tile.occupant !== entityId && this.isEnemyEntity(tile.occupant)) {
        const health = this.world.getComponent<HealthComponent>(tile.occupant, "health");
        if (health && health.current > 0) return true;
      }
    }
    return false;
  }

  private handleDeath(entityId: EntityId): void {
    const pos = this.world.getComponent<PositionComponent>(
      entityId,
      "position"
    );
    if (pos) {
      const tile = this.grid.get(pos.q, pos.r);
      if (tile) tile.occupant = null;
    }
    this.turnOrder.remove(entityId);
  }

  private checkBattleEnd(): boolean {
    const playerUnits = this.getPlayerUnits();
    const enemyUnits = this.getEnemyUnits();

    if (enemyUnits.length === 0) {
      this.setPhase("battleEnd");
      this.onBattleEnd?.(true);
      return true;
    }

    if (playerUnits.length === 0) {
      this.setPhase("battleEnd");
      this.onBattleEnd?.(false);
      return true;
    }

    return false;
  }

  private setPhase(phase: CombatPhase): void {
    this.phase = phase;
    this.onPhaseChange?.(phase);
  }

  private isEnemyEntity(entityId: EntityId): boolean {
    return this.world.getComponent(entityId, "aiBehavior") !== undefined;
  }

  private getPlayerUnits(): EntityId[] {
    const allCombatants = this.world.query("health", "position");
    return allCombatants.filter((id) => {
      const health = this.world.getComponent<HealthComponent>(id, "health");
      return health && health.current > 0 && !this.isEnemyEntity(id);
    });
  }

  private getEnemyUnits(): EntityId[] {
    const allCombatants = this.world.query("health", "position");
    return allCombatants.filter((id) => {
      const health = this.world.getComponent<HealthComponent>(id, "health");
      return health && health.current > 0 && this.isEnemyEntity(id);
    });
  }

  private findAdjacentEnemy(
    pos: PositionComponent,
    enemyIds: EntityId[]
  ): EntityId | null {
    for (const enemyId of enemyIds) {
      const ePos = this.world.getComponent<PositionComponent>(
        enemyId,
        "position"
      );
      if (!ePos) continue;
      if (
        hexDistance(
          { q: pos.q, r: pos.r },
          { q: ePos.q, r: ePos.r }
        ) === 1
      ) {
        return enemyId;
      }
    }
    return null;
  }
}
