import type { World } from "@entities/World";
import type { HexGrid } from "@hex/HexGrid";
import type { EntityId } from "@entities/Entity";
import type { PositionComponent } from "@entities/components/Position";
import type { HealthComponent } from "@entities/components/Health";
import type { FatigueComponent } from "@entities/components/Fatigue";
import type { EquipmentComponent } from "@entities/components/Equipment";
import { TurnOrder } from "./TurnOrder";
import { DamageCalculator, type AttackResult } from "./DamageCalculator";
import { ActionPointManager, tileAPCost, pathAPCost, pathFatigueCost, MAX_AP } from "./ActionPointManager";
import { getZoCAttacksForMove } from "./ZoneOfControl";
import { StatusEffectManager, type BleedTickResult } from "./StatusEffectManager";
import { MoraleManager, type MoraleCheckResult } from "./MoraleManager";
import { getWeapon, UNARMED } from "@data/WeaponData";
import { decideAIAction } from "./SimpleAI";
import { RNG } from "@utils/RNG";
import { hexDistance, hexNeighbors } from "@hex/HexMath";
import { findPath, reachableHexes } from "@hex/HexPathfinding";

export type CombatPhase = "deployment" | "playerTurn" | "enemyTurn" | "battleEnd";
export type PlayerTurnState = "awaitingInput" | "animating";

interface UndoInfo {
  entityId: EntityId;
  oldQ: number;
  oldR: number;
  oldElevation: number;
  path: Array<{ q: number; r: number }>;
  apSpent: number;
  fatigueSpent: number;
}

export class CombatManager {
  turnOrder: TurnOrder;
  damageCalc: DamageCalculator;
  statusEffects: StatusEffectManager;
  morale: MoraleManager;
  phase: CombatPhase = "playerTurn";
  playerTurnState: PlayerTurnState = "awaitingInput";
  selectedUnit: EntityId | null = null;

  /** Movement range cache for the currently selected unit. */
  moveRange: Map<string, number> | null = null;

  /** AP manager for the current turn. */
  private apManager = new ActionPointManager();

  /** Undo info for reverting the last move. */
  private undoInfo: UndoInfo | null = null;

  /** Continuation to run after animations complete. */
  private pendingContinuation: (() => void) | null = null;

  // ── Callbacks for the rendering/UI layer ──

  onPhaseChange?: (phase: CombatPhase) => void;
  onTurnAdvance?: (entityId: EntityId) => void;
  onAttackResult?: (
    result: AttackResult,
    attackerId: EntityId,
    defenderId: EntityId,
  ) => void;
  onUnitMoved?: (
    entityId: EntityId,
    path: Array<{ q: number; r: number }>,
  ) => void;
  onUnitTeleported?: (entityId: EntityId, q: number, r: number) => void;
  onBattleEnd?: (victory: boolean) => void;
  onPlayerStateChange?: (state: PlayerTurnState) => void;
  onActionComplete?: () => void;
  onZoCAttack?: (
    result: AttackResult,
    attackerId: EntityId,
    defenderId: EntityId,
  ) => void;
  onBleedTick?: (result: BleedTickResult) => void;
  onMoraleChange?: (result: MoraleCheckResult) => void;
  onStatusApplied?: (entityId: EntityId, effectId: string) => void;
  onTurnSkipped?: (entityId: EntityId, reason: string) => void;

  constructor(
    private world: World,
    private grid: HexGrid,
    seed?: number,
  ) {
    const rng = new RNG(seed ?? Date.now());
    this.turnOrder = new TurnOrder();
    this.statusEffects = new StatusEffectManager(rng);
    this.morale = new MoraleManager(rng);
    this.damageCalc = new DamageCalculator(rng, grid);
    this.damageCalc.setStatusEffectManager(this.statusEffects);
  }

  /** Start combat — calculate initial turn order, begin first turn. */
  start(): void {
    this.turnOrder.calculateOrder(this.world);
    this.beginCurrentTurn();
  }

  /** Called by the presentation layer after animations finish. */
  continueAfterAnimation(): void {
    const fn = this.pendingContinuation;
    this.pendingContinuation = null;
    fn?.();
  }

  /** Remaining AP for the current unit's turn. */
  get apRemaining(): number {
    return this.apManager.remaining;
  }

  /** Get the equipped weapon's AP cost for the selected unit. */
  get selectedWeaponAPCost(): number {
    if (!this.selectedUnit) return MAX_AP;
    return this.getWeaponAPCost(this.selectedUnit);
  }

  /** Check if the current unit can undo its move. */
  get canUndo(): boolean {
    return this.undoInfo !== null;
  }

  // ── Input handling ──

  /** Handle a hex being tapped during player turn. */
  handleHexTap(q: number, r: number): boolean {
    if (this.phase !== "playerTurn") return false;
    if (this.playerTurnState !== "awaitingInput") return false;
    if (!this.selectedUnit) return false;

    const tile = this.grid.get(q, r);
    const attackerPos = this.world.getComponent<PositionComponent>(
      this.selectedUnit,
      "position",
    );
    if (!attackerPos) return false;

    // Tap on enemy within weapon range → attack
    if (
      tile?.occupant &&
      tile.occupant !== this.selectedUnit &&
      this.isEnemyEntity(tile.occupant)
    ) {
      const dist = hexDistance({ q: attackerPos.q, r: attackerPos.r }, { q, r });
      const weaponRange = this.getWeaponRange(this.selectedUnit);
      const weaponAP = this.getWeaponAPCost(this.selectedUnit);

      if (dist <= weaponRange && this.apManager.canAfford(weaponAP)) {
        this.executeAttack(this.selectedUnit, tile.occupant);
        return true;
      }
    }

    // Tap on reachable hex → move
    const key = `${q},${r}`;
    if (this.moveRange && this.moveRange.has(key) && !tile?.occupant) {
      this.executeMove(this.selectedUnit, q, r);
      return true;
    }

    return false;
  }

  /** Handle action bar button press. */
  handleAction(action: "undo" | "wait" | "endTurn" | "recover"): void {
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

      case "recover":
        this.executeRecover();
        break;
    }
  }

  // ── Private action methods ──

  /** Execute a move action for the given entity to (q, r). */
  private executeMove(entityId: EntityId, q: number, r: number): void {
    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (!pos) return;

    const pathResult = findPath(
      this.grid,
      { q: pos.q, r: pos.r },
      { q, r },
      this.apManager.remaining,
      tileAPCost,
    );
    if (!pathResult.found) return;

    // Calculate costs
    const apCost = pathResult.cost;
    const fatigueCost = pathFatigueCost(this.grid, pathResult.path, pos.q, pos.r);

    if (!this.apManager.canAfford(apCost)) return;

    // ── ZoC: Resolve free attacks before moving ──
    const zocAttackers = getZoCAttacksForMove(
      this.world, this.grid, entityId,
      pos.q, pos.r, pathResult.path,
    );

    for (const attackerId of zocAttackers) {
      const result = this.damageCalc.resolveMelee(this.world, attackerId, entityId);
      this.onZoCAttack?.(result, attackerId, entityId);

      if (result.targetKilled) {
        // Unit died from ZoC — cancel the move
        this.handleDeath(entityId);
        this.moveRange = null;
        this.playerTurnState = "animating";
        this.pendingContinuation = () => {
          if (!this.checkBattleEnd()) {
            this.endPlayerUnitTurn();
          }
        };
        this.onActionComplete?.();
        return;
      }
    }

    // Save undo info before moving (undo disabled if ZoC attacks occurred)
    if (zocAttackers.length > 0) {
      this.undoInfo = null; // Can't undo after taking ZoC damage
    } else {
      this.undoInfo = {
        entityId,
        oldQ: pos.q,
        oldR: pos.r,
        oldElevation: pos.elevation,
        path: pathResult.path,
        apSpent: apCost,
        fatigueSpent: fatigueCost,
      };
    }

    this.playerTurnState = "animating";

    // Spend AP and fatigue
    this.apManager.spend(apCost);
    this.addFatigue(entityId, fatigueCost);

    // Update occupancy
    const oldTile = this.grid.get(pos.q, pos.r);
    if (oldTile) oldTile.occupant = null;

    const newTile = this.grid.get(q, r);
    if (newTile) newTile.occupant = entityId;

    // Update position
    pos.q = q;
    pos.r = r;
    if (newTile) pos.elevation = newTile.elevation;

    this.moveRange = null;

    this.onUnitMoved?.(entityId, pathResult.path);

    // Continuation: return to awaitingInput (multi-action turn)
    this.pendingContinuation = () => {
      this.recalculateAndContinue(entityId);
    };

    this.onActionComplete?.();
  }

  /** Undo the last move — instant, no animation. */
  private undoMove(): void {
    if (!this.undoInfo) return;

    const { entityId, oldQ, oldR, oldElevation, apSpent, fatigueSpent } = this.undoInfo;
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

    // Refund AP and fatigue
    this.apManager.spend(-apSpent); // negative spend = refund
    this.addFatigue(entityId, -fatigueSpent);

    this.undoInfo = null;

    this.onUnitTeleported?.(entityId, oldQ, oldR);

    // Recalculate and show overlays
    this.calculateMoveRange(entityId);
    this.setPlayerState("awaitingInput");
  }

  /** Execute an attack action. */
  private executeAttack(attackerId: EntityId, defenderId: EntityId): void {
    const weaponAPCost = this.getWeaponAPCost(attackerId);
    const weaponFatigueCost = this.getWeaponFatigueCost(attackerId);

    if (!this.apManager.canAfford(weaponAPCost)) return;

    this.playerTurnState = "animating";

    // Spend AP and fatigue
    this.apManager.spend(weaponAPCost);
    this.addFatigue(attackerId, weaponFatigueCost);

    // Can't undo after attacking
    this.undoInfo = null;

    const result = this.damageCalc.resolveMelee(this.world, attackerId, defenderId);
    this.onAttackResult?.(result, attackerId, defenderId);

    // Notify about applied status effects
    for (const eff of result.appliedEffects) {
      this.onStatusApplied?.(defenderId, eff);
    }

    if (result.targetKilled) {
      this.handleDeath(defenderId);
      // Morale: ally death check + enemy kill boost
      this.triggerAllyMoraleChecks(defenderId);
      this.triggerEnemyKillBoost(attackerId);
    } else if (result.hit) {
      // Morale: heavy damage check
      const moraleResult = this.morale.onHeavyDamage(this.world, defenderId, result.hpDamage);
      if (moraleResult) {
        this.onMoraleChange?.(moraleResult);
        if (moraleResult.newState === "fleeing") {
          this.statusEffects.apply(this.world, defenderId, "fleeing");
        }
      }
    }

    // Continuation: check battle end, then return to awaitingInput
    this.pendingContinuation = () => {
      if (!this.checkBattleEnd()) {
        this.recalculateAndContinue(attackerId);
      }
    };

    this.onActionComplete?.();
  }

  /** Recover action: spend full turn, recover 50% max fatigue. */
  private executeRecover(): void {
    if (!this.selectedUnit) return;

    const fatigue = this.world.getComponent<FatigueComponent>(this.selectedUnit, "fatigue");
    if (fatigue) {
      const recovery = Math.floor(fatigue.max * 0.5);
      fatigue.current = Math.max(0, fatigue.current - recovery);
    }

    // Recover uses all AP
    this.apManager.spend(this.apManager.remaining);
    this.undoInfo = null;
    this.endPlayerUnitTurn();
  }

  /**
   * After an action completes, recalculate move range and decide whether
   * to continue the turn or auto-end it.
   */
  private recalculateAndContinue(entityId: EntityId): void {
    this.calculateMoveRange(entityId);

    const canMove = this.moveRange && this.moveRange.size > 1; // >1 because start hex is included
    const canAttack = this.canAttackAnyTarget(entityId);

    if (!canMove && !canAttack) {
      // No valid actions left — auto-end turn
      this.undoInfo = null;
      this.endPlayerUnitTurn();
    } else {
      this.setPlayerState("awaitingInput");
    }
  }

  /** Check if the unit can attack any adjacent enemy with current AP. */
  private canAttackAnyTarget(entityId: EntityId): boolean {
    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (!pos) return false;

    const weaponAP = this.getWeaponAPCost(entityId);
    if (!this.apManager.canAfford(weaponAP)) return false;

    const weaponRange = this.getWeaponRange(entityId);

    for (const n of hexNeighbors(pos.q, pos.r)) {
      const tile = this.grid.get(n.q, n.r);
      if (!tile?.occupant || tile.occupant === entityId) continue;
      if (!this.isEnemyEntity(tile.occupant)) continue;
      const health = this.world.getComponent<HealthComponent>(tile.occupant, "health");
      if (!health || health.current <= 0) continue;
      if (hexDistance({ q: pos.q, r: pos.r }, { q: n.q, r: n.r }) <= weaponRange) {
        return true;
      }
    }
    return false;
  }

  /** Calculate and cache move range using AP-based costs. */
  private calculateMoveRange(entityId: EntityId): void {
    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (pos) {
      this.moveRange = reachableHexes(
        this.grid,
        { q: pos.q, r: pos.r },
        this.apManager.remaining,
        tileAPCost,
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

  /** Begin the current unit's turn. */
  private beginCurrentTurn(): void {
    if (this.checkBattleEnd()) return;

    const entry = this.turnOrder.current();
    if (!entry) return;

    const entityId = entry.entityId;

    // Apply fatigue recovery at turn start
    this.applyFatigueRecovery(entityId);

    // Passive morale recovery
    this.morale.passiveRecovery(this.world, entityId);

    // Tick status effects (bleed damage, duration countdown)
    const bleedResult = this.statusEffects.tickTurnStart(this.world, entityId);
    if (bleedResult) {
      this.onBleedTick?.(bleedResult);
      if (bleedResult.killed) {
        this.handleDeath(entityId);
        this.pendingContinuation = () => {
          if (!this.checkBattleEnd()) {
            // Trigger ally morale checks for bleed death
            this.triggerAllyMoraleChecks(entityId);
            const newRound = this.turnOrder.advance();
            if (newRound) this.turnOrder.calculateOrder(this.world);
            this.beginCurrentTurn();
          }
        };
        this.onActionComplete?.();
        return;
      }
    }

    this.onTurnAdvance?.(entityId);

    // Stunned units skip their turn
    if (this.statusEffects.hasEffect(this.world, entityId, "stun")) {
      this.onTurnSkipped?.(entityId, "Stunned");
      this.pendingContinuation = () => {
        const newRound = this.turnOrder.advance();
        if (newRound) this.turnOrder.calculateOrder(this.world);
        this.beginCurrentTurn();
      };
      this.onActionComplete?.();
      return;
    }

    const isEnemy = this.isEnemyEntity(entityId);

    // Fleeing units (both player and enemy) run away automatically
    if (this.statusEffects.hasEffect(this.world, entityId, "fleeing")) {
      this.runFleeingTurn(entityId);
      return;
    }

    if (isEnemy) {
      this.setPhase("enemyTurn");
      this.runEnemyTurn();
    } else {
      this.setPhase("playerTurn");
      this.selectedUnit = entityId;
      this.apManager.resetForTurn();
      this.calculateMoveRange(entityId);
      this.setPlayerState("awaitingInput");
    }
  }

  /** Apply passive fatigue recovery at the start of a unit's turn. */
  private applyFatigueRecovery(entityId: EntityId): void {
    const fatigue = this.world.getComponent<FatigueComponent>(entityId, "fatigue");
    if (fatigue) {
      fatigue.current = Math.max(0, fatigue.current - fatigue.recoveryPerTurn);
    }
  }

  private setPlayerState(state: PlayerTurnState): void {
    this.playerTurnState = state;
    this.onPlayerStateChange?.(state);
  }

  /**
   * Run ONE enemy unit's turn using the AI, then wait for animation.
   * The AI operates with a fixed AP budget.
   */
  private runEnemyTurn(): void {
    const entry = this.turnOrder.current();
    if (!entry) return;

    const entityId = entry.entityId;
    const playerUnits = this.getPlayerUnits();

    // Enemy uses AP-based movement budget
    const enemyAPBudget = MAX_AP;
    const weaponAPCost = this.getWeaponAPCost(entityId);
    // Reserve AP for attack if possible
    const moveAP = enemyAPBudget - weaponAPCost;

    const action = decideAIAction(this.world, this.grid, entityId, playerUnits, moveAP > 0 ? moveAP : 2);

    switch (action.type) {
      case "move": {
        const pos = this.world.getComponent<PositionComponent>(entityId, "position");
        if (pos && action.path.length > 0) {
          // ── ZoC: Resolve free attacks on enemy movement ──
          const zocAttackers = getZoCAttacksForMove(
            this.world, this.grid, entityId,
            pos.q, pos.r, action.path,
          );

          for (const zocAttacker of zocAttackers) {
            const zocResult = this.damageCalc.resolveMelee(this.world, zocAttacker, entityId);
            this.onZoCAttack?.(zocResult, zocAttacker, entityId);

            if (zocResult.targetKilled) {
              this.handleDeath(entityId);
              // Enemy died from ZoC — skip rest of turn
              this.pendingContinuation = () => {
                if (!this.checkBattleEnd()) {
                  const newRound = this.turnOrder.advance();
                  if (newRound) this.turnOrder.calculateOrder(this.world);
                  this.beginCurrentTurn();
                }
              };
              this.onActionComplete?.();
              return;
            }
          }

          const dest = action.path[action.path.length - 1]!;

          // Apply fatigue for movement
          const fatCost = pathFatigueCost(this.grid, action.path, pos.q, pos.r);
          this.addFatigue(entityId, fatCost);

          const oldTile = this.grid.get(pos.q, pos.r);
          if (oldTile) oldTile.occupant = null;

          const newTile = this.grid.get(dest.q, dest.r);
          if (newTile) newTile.occupant = entityId;

          pos.q = dest.q;
          pos.r = dest.r;
          if (newTile) pos.elevation = newTile.elevation;

          this.onUnitMoved?.(entityId, action.path);
        }

        // Try to attack after moving
        const posAfterMove = this.world.getComponent<PositionComponent>(entityId, "position");
        if (posAfterMove) {
          const adjacentTarget = this.findAdjacentEnemy(posAfterMove, playerUnits);
          if (adjacentTarget) {
            const weaponFat = this.getWeaponFatigueCost(entityId);
            this.addFatigue(entityId, weaponFat);

            const result = this.damageCalc.resolveMelee(this.world, entityId, adjacentTarget);
            this.onAttackResult?.(result, entityId, adjacentTarget);
            for (const eff of result.appliedEffects) {
              this.onStatusApplied?.(adjacentTarget, eff);
            }
            if (result.targetKilled) {
              this.handleDeath(adjacentTarget);
              this.triggerAllyMoraleChecks(adjacentTarget);
              this.triggerEnemyKillBoost(entityId);
            } else if (result.hit) {
              const mr = this.morale.onHeavyDamage(this.world, adjacentTarget, result.hpDamage);
              if (mr) {
                this.onMoraleChange?.(mr);
                if (mr.newState === "fleeing") {
                  this.statusEffects.apply(this.world, adjacentTarget, "fleeing");
                }
              }
            }
          }
        }
        break;
      }

      case "attack": {
        const weaponFat = this.getWeaponFatigueCost(entityId);
        this.addFatigue(entityId, weaponFat);

        const result = this.damageCalc.resolveMelee(this.world, entityId, action.targetId);
        this.onAttackResult?.(result, entityId, action.targetId);
        for (const eff of result.appliedEffects) {
          this.onStatusApplied?.(action.targetId, eff);
        }
        if (result.targetKilled) {
          this.handleDeath(action.targetId);
          this.triggerAllyMoraleChecks(action.targetId);
          this.triggerEnemyKillBoost(entityId);
        } else if (result.hit) {
          const mr = this.morale.onHeavyDamage(this.world, action.targetId, result.hpDamage);
          if (mr) {
            this.onMoraleChange?.(mr);
            if (mr.newState === "fleeing") {
              this.statusEffects.apply(this.world, action.targetId, "fleeing");
            }
          }
        }
        break;
      }

      case "wait":
        break;
    }

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

  // ── Morale + Status helpers ──

  /** Trigger morale checks for allies of a dead entity. */
  private triggerAllyMoraleChecks(deadEntityId: EntityId): void {
    const wasEnemy = this.isEnemyEntity(deadEntityId);
    const allies = wasEnemy ? this.getEnemyUnits() : this.getPlayerUnits();
    const results = this.morale.onAllyDeath(this.world, deadEntityId, allies);
    for (const r of results) {
      this.onMoraleChange?.(r);
      if (r.newState === "fleeing") {
        this.statusEffects.apply(this.world, r.entityId, "fleeing");
      }
    }
  }

  /** Boost morale for the attacker's team when an enemy is killed. */
  private triggerEnemyKillBoost(killerId: EntityId): void {
    const killerIsEnemy = this.isEnemyEntity(killerId);
    const allies = killerIsEnemy ? this.getEnemyUnits() : this.getPlayerUnits();
    this.morale.onEnemyKill(this.world, allies);
  }

  /** Run a fleeing unit's turn — move away from enemies. */
  private runFleeingTurn(entityId: EntityId): void {
    const isEnemy = this.isEnemyEntity(entityId);
    this.setPhase(isEnemy ? "enemyTurn" : "playerTurn");
    this.onTurnSkipped?.(entityId, "Fleeing");

    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (pos) {
      // Find hex farthest from nearest enemy
      const enemies = isEnemy ? this.getPlayerUnits() : this.getEnemyUnits();
      const reachable = reachableHexes(
        this.grid, { q: pos.q, r: pos.r }, 4, tileAPCost,
      );

      let bestHex: { q: number; r: number } | null = null;
      let bestDist = -1;

      for (const [key] of reachable) {
        const [hq, hr] = key.split(",").map(Number);
        if (hq === undefined || hr === undefined) continue;
        const tile = this.grid.get(hq, hr);
        if (tile?.occupant && tile.occupant !== entityId) continue;

        let minEnemyDist = Infinity;
        for (const eid of enemies) {
          const ep = this.world.getComponent<PositionComponent>(eid, "position");
          if (ep) {
            const d = hexDistance({ q: hq, r: hr }, { q: ep.q, r: ep.r });
            if (d < minEnemyDist) minEnemyDist = d;
          }
        }
        if (minEnemyDist > bestDist) {
          bestDist = minEnemyDist;
          bestHex = { q: hq, r: hr };
        }
      }

      if (bestHex && (bestHex.q !== pos.q || bestHex.r !== pos.r)) {
        const pathResult = findPath(
          this.grid, { q: pos.q, r: pos.r }, bestHex, 4, tileAPCost,
        );
        if (pathResult.found && pathResult.path.length > 0) {
          const dest = pathResult.path[pathResult.path.length - 1]!;
          const oldTile = this.grid.get(pos.q, pos.r);
          if (oldTile) oldTile.occupant = null;
          const newTile = this.grid.get(dest.q, dest.r);
          if (newTile) newTile.occupant = entityId;
          pos.q = dest.q;
          pos.r = dest.r;
          if (newTile) pos.elevation = newTile.elevation;
          this.onUnitMoved?.(entityId, pathResult.path);
        }
      }
    }

    this.pendingContinuation = () => {
      if (!this.checkBattleEnd()) {
        const newRound = this.turnOrder.advance();
        if (newRound) this.turnOrder.calculateOrder(this.world);
        this.beginCurrentTurn();
      }
    };
    this.onActionComplete?.();
  }

  // ── Helpers ──

  private getWeaponAPCost(entityId: EntityId): number {
    const equip = this.world.getComponent<EquipmentComponent>(entityId, "equipment");
    const weapon = equip?.mainHand ? getWeapon(equip.mainHand) : UNARMED;
    return weapon.apCost;
  }

  private getWeaponFatigueCost(entityId: EntityId): number {
    const equip = this.world.getComponent<EquipmentComponent>(entityId, "equipment");
    const weapon = equip?.mainHand ? getWeapon(equip.mainHand) : UNARMED;
    return weapon.fatigueCost;
  }

  private getWeaponRange(entityId: EntityId): number {
    const equip = this.world.getComponent<EquipmentComponent>(entityId, "equipment");
    const weapon = equip?.mainHand ? getWeapon(equip.mainHand) : UNARMED;
    return weapon.range;
  }

  private addFatigue(entityId: EntityId, amount: number): void {
    const fatigue = this.world.getComponent<FatigueComponent>(entityId, "fatigue");
    if (fatigue) {
      fatigue.current = Math.max(0, Math.min(fatigue.max, fatigue.current + amount));
    }
  }

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
    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
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
    enemyIds: EntityId[],
  ): EntityId | null {
    for (const enemyId of enemyIds) {
      const ePos = this.world.getComponent<PositionComponent>(enemyId, "position");
      if (!ePos) continue;
      if (hexDistance({ q: pos.q, r: pos.r }, { q: ePos.q, r: ePos.r }) === 1) {
        return enemyId;
      }
    }
    return null;
  }
}
