import type { World } from "@entities/World";
import type { HexGrid } from "@hex/HexGrid";
import type { EntityId } from "@entities/Entity";
import type { PositionComponent } from "@entities/components/Position";
import type { HealthComponent } from "@entities/components/Health";
import { TurnOrder } from "./TurnOrder";
import { DamageCalculator, type AttackResult } from "./DamageCalculator";
import { decideAIAction } from "./SimpleAI";
import { RNG } from "@utils/RNG";
import { hexDistance } from "@hex/HexMath";
import { findPath, reachableHexes } from "@hex/HexPathfinding";

export type CombatPhase = "deployment" | "playerTurn" | "enemyTurn" | "battleEnd";
export type PlayerTurnState =
  | "selectUnit"
  | "selectAction"
  | "selectMoveTarget"
  | "selectAttackTarget"
  | "animating";

export class CombatManager {
  turnOrder: TurnOrder;
  damageCalc: DamageCalculator;
  phase: CombatPhase = "playerTurn";
  playerTurnState: PlayerTurnState = "selectUnit";
  selectedUnit: EntityId | null = null;

  /** Movement range cache for the currently selected unit. */
  private moveRange: Map<string, number> | null = null;

  // Callbacks for the rendering/UI layer
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
  onBattleEnd?: (victory: boolean) => void;

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

  /** Handle a hex being tapped during player turn. */
  handleHexTap(q: number, r: number): void {
    if (this.phase !== "playerTurn") return;

    switch (this.playerTurnState) {
      case "selectUnit": {
        // If a friendly unit is on this hex, select it (only if it's the current turn unit)
        const tile = this.grid.get(q, r);
        const currentEntry = this.turnOrder.current();
        if (
          tile?.occupant &&
          currentEntry &&
          tile.occupant === currentEntry.entityId
        ) {
          this.selectedUnit = tile.occupant;
          this.playerTurnState = "selectAction";
        }
        break;
      }

      case "selectMoveTarget": {
        if (!this.selectedUnit) break;
        const key = `${q},${r}`;
        if (this.moveRange && this.moveRange.has(key)) {
          this.executeMove(this.selectedUnit, q, r);
        }
        break;
      }

      case "selectAttackTarget": {
        if (!this.selectedUnit) break;
        const tile = this.grid.get(q, r);
        if (tile?.occupant && tile.occupant !== this.selectedUnit) {
          // Check if target is in melee range (adjacent)
          const attackerPos = this.world.getComponent<PositionComponent>(
            this.selectedUnit,
            "position"
          );
          if (
            attackerPos &&
            hexDistance(
              { q: attackerPos.q, r: attackerPos.r },
              { q, r }
            ) === 1
          ) {
            this.executeAttack(this.selectedUnit, tile.occupant);
          }
        }
        break;
      }

      default:
        break;
    }
  }

  /** Handle action bar button press. */
  handleAction(action: "move" | "attack" | "wait" | "endTurn"): void {
    if (this.phase !== "playerTurn") return;

    switch (action) {
      case "move":
        if (this.selectedUnit) {
          // Calculate reachable hexes (budget 4 for Phase 1)
          const pos = this.world.getComponent<PositionComponent>(
            this.selectedUnit,
            "position"
          );
          if (pos) {
            this.moveRange = reachableHexes(
              this.grid,
              { q: pos.q, r: pos.r },
              4
            );
          }
          this.playerTurnState = "selectMoveTarget";
        }
        break;

      case "attack":
        if (this.selectedUnit) {
          this.playerTurnState = "selectAttackTarget";
        }
        break;

      case "wait":
        this.turnOrder.wait();
        this.moveRange = null;
        this.endPlayerUnitTurn();
        break;

      case "endTurn":
        this.endPlayerUnitTurn();
        break;
    }
  }

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

    this.playerTurnState = "animating";

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

    // After move, go back to selectAction so the unit can still attack
    this.playerTurnState = "selectAction";
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

    // After attacking, end this unit's turn
    if (!this.checkBattleEnd()) {
      this.endPlayerUnitTurn();
    }
  }

  /** End the current player unit's turn and advance. */
  private endPlayerUnitTurn(): void {
    this.selectedUnit = null;
    this.moveRange = null;
    this.playerTurnState = "selectUnit";

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
    if (!entry) {
      // No units left; shouldn't happen if checkBattleEnd passed
      return;
    }

    this.onTurnAdvance?.(entry.entityId);

    // Determine if this entity is player-controlled or AI
    const isEnemy = this.isEnemyEntity(entry.entityId);

    if (isEnemy) {
      this.setPhase("enemyTurn");
      this.runEnemyTurn();
    } else {
      this.setPhase("playerTurn");
      this.selectedUnit = entry.entityId;
      this.playerTurnState = "selectAction";
    }
  }

  /** Run simple enemy AI turn. */
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

          // Update grid occupancy
          const oldTile = this.grid.get(pos.q, pos.r);
          if (oldTile) oldTile.occupant = null;

          const newTile = this.grid.get(dest.q, dest.r);
          if (newTile) newTile.occupant = entityId;

          pos.q = dest.q;
          pos.r = dest.r;
          if (newTile) pos.elevation = newTile.elevation;

          this.onUnitMoved?.(entityId, action.path);
        }

        // After moving, check if now adjacent to a player unit and attack
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
        // AI waits (does nothing)
        break;
    }

    // Advance to next unit
    if (!this.checkBattleEnd()) {
      const newRound = this.turnOrder.advance();
      if (newRound) {
        this.turnOrder.calculateOrder(this.world);
      }
      this.beginCurrentTurn();
    }
  }

  /** Handle the death of an entity: remove from grid and turn order. */
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

  /** Check if combat is over. Returns true if battle ended. */
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

  /** Set the combat phase and fire the callback. */
  private setPhase(phase: CombatPhase): void {
    this.phase = phase;
    this.onPhaseChange?.(phase);
  }

  /**
   * Determine if an entity is enemy-controlled.
   * Entities with an "aiBehavior" component are considered enemies.
   */
  private isEnemyEntity(entityId: EntityId): boolean {
    return this.world.getComponent(entityId, "aiBehavior") !== undefined;
  }

  /** Get all living player units (no aiBehavior component). */
  private getPlayerUnits(): EntityId[] {
    const allCombatants = this.world.query("health", "position");
    return allCombatants.filter((id) => {
      const health = this.world.getComponent<HealthComponent>(id, "health");
      return (
        health &&
        health.current > 0 &&
        !this.isEnemyEntity(id)
      );
    });
  }

  /** Get all living enemy units (have aiBehavior component). */
  private getEnemyUnits(): EntityId[] {
    const allCombatants = this.world.query("health", "position");
    return allCombatants.filter((id) => {
      const health = this.world.getComponent<HealthComponent>(id, "health");
      return (
        health &&
        health.current > 0 &&
        this.isEnemyEntity(id)
      );
    });
  }

  /** Find an adjacent enemy entity to the given position. */
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
