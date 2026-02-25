import type { World } from "@entities/World";
import type { HexGrid } from "@hex/HexGrid";
import type { EntityId } from "@entities/Entity";
import type { PositionComponent } from "@entities/components/Position";
import type { HealthComponent } from "@entities/components/Health";
import type { FatigueComponent } from "@entities/components/Fatigue";
import type { EquipmentComponent } from "@entities/components/Equipment";
import { TurnOrder } from "./TurnOrder";
import { DamageCalculator, type AttackResult } from "./DamageCalculator";
import { ActionPointManager, pathFatigueCost, MAX_AP } from "./ActionPointManager";
import { MovementPointManager, tileMPCost, getEffectiveMP, DEFAULT_MP } from "./MovementPointManager";
import { getZoCAttacksForMove, isInEnemyZoC, getZoCBreakCost } from "./ZoneOfControl";
import type { StatsComponent } from "@entities/components/Stats";
import type { ArmorComponent } from "@entities/components/Armor";
import { StatusEffectManager, type BleedTickResult } from "./StatusEffectManager";
import { MoraleManager, type MoraleCheckResult } from "./MoraleManager";
import { SkillExecutor } from "./SkillExecutor";
import type { ActiveStancesComponent } from "@entities/components/ActiveStances";
import { getWeapon, UNARMED, type WeaponDef } from "@data/WeaponData";
import { BASIC_ATTACK, getSkillsForWeapon, skillAPCost, skillFatigueCost, skillRange, type SkillDef } from "@data/SkillData";
import type { CharacterClassComponent } from "@entities/components/CharacterClass";
import { getClassDef, getClassAPDiscount, getClassArmorMPReduction, canEquipWeapon, canEquipShield } from "@data/ClassData";
import { getShield } from "@data/ShieldData";
import { getConsumable } from "@data/ItemData";
import { decideTacticalAction, type TacticalAction } from "./TacticalAI";
import { hasLineOfSight } from "@hex/HexLineOfSight";
import { RNG } from "@utils/RNG";
import { hexDistance, hexNeighbors } from "@hex/HexMath";
import { findPath, reachableHexes } from "@hex/HexPathfinding";

export type CombatPhase = "deployment" | "playerTurn" | "enemyTurn" | "battleEnd";
export type PlayerTurnState = "awaitingInput" | "skillTargeting" | "animating";

interface UndoInfo {
  entityId: EntityId;
  oldQ: number;
  oldR: number;
  oldElevation: number;
  path: Array<{ q: number; r: number }>;
  apSpent: number;
  mpSpent: number;
  fatigueSpent: number;
}

export class CombatManager {
  turnOrder: TurnOrder;
  damageCalc: DamageCalculator;
  skillExecutor: SkillExecutor;
  statusEffects: StatusEffectManager;
  morale: MoraleManager;
  phase: CombatPhase = "playerTurn";
  playerTurnState: PlayerTurnState = "awaitingInput";
  selectedUnit: EntityId | null = null;

  /** Currently selected skill for attack. Null = basic attack. */
  selectedSkill: SkillDef | null = null;

  /** Skill pending target selection (activation mode). */
  pendingSkill: SkillDef | null = null;

  /** Movement range cache for the currently selected unit. */
  moveRange: Map<string, number> | null = null;

  /** AP manager for the current turn (attacks only). */
  private apManager = new ActionPointManager();

  /** MP manager for the current turn (movement only). */
  private mpManager = new MovementPointManager();

  /** Undo info for reverting the last move. */
  private undoInfo: UndoInfo | null = null;

  /** Continuation to run after animations complete. */
  private pendingContinuation: (() => void) | null = null;

  /** Number of enemy kills this battle (for XP calculation). */
  private _killCount = 0;
  get killCount(): number { return this._killCount; }

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
  onShieldDestroyed?: (entityId: EntityId) => void;
  onSpearwallTriggered?: (
    result: AttackResult,
    attackerId: EntityId,
    defenderId: EntityId,
  ) => void;
  onStanceActivated?: (entityId: EntityId, stanceId: string) => void;

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
    this.skillExecutor = new SkillExecutor(rng, this.damageCalc);
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

  /** Remaining MP for the current unit's turn. */
  get mpRemaining(): number {
    return this.mpManager.remaining;
  }

  /** Maximum MP for the current unit's turn. */
  get mpMaximum(): number {
    return this.mpManager.maximum;
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

  // ── Skill selection ──

  /** Get available skills for the currently selected unit. */
  getAvailableSkills(): SkillDef[] {
    if (!this.selectedUnit) return [];
    const equip = this.world.getComponent<EquipmentComponent>(this.selectedUnit, "equipment");
    const weaponId = equip?.mainHand ?? "unarmed";
    return getSkillsForWeapon(weaponId);
  }

  /** Select a skill for the next attack. */
  selectSkill(skill: SkillDef | null): void {
    this.selectedSkill = skill;
  }

  /** Get the active skill (selected or basic attack). */
  getActiveSkill(): SkillDef {
    return this.selectedSkill ?? BASIC_ATTACK;
  }

  /** Enter skill targeting mode — shows valid targets for the skill. */
  activateSkill(skill: SkillDef): void {
    if (this.phase !== "playerTurn") return;
    if (!this.selectedUnit) return;
    this.pendingSkill = skill;
    this.setPlayerState("skillTargeting");
  }

  /** Cancel skill targeting, return to normal input. */
  cancelSkill(): void {
    this.pendingSkill = null;
    this.setPlayerState("awaitingInput");
  }

  /** Get hexes that are valid targets for the pending skill. */
  getSkillTargetHexes(): Set<string> {
    const hexes = new Set<string>();
    if (!this.selectedUnit || !this.pendingSkill) return hexes;

    const pos = this.world.getComponent<PositionComponent>(this.selectedUnit, "position");
    if (!pos) return hexes;

    const skill = this.pendingSkill;
    const weapon = this.getWeaponDef(this.selectedUnit);
    const range = skillRange(skill, weapon);
    const apCost = this.getEffectiveAPCost(this.selectedUnit, skill, weapon);
    if (!this.apManager.canAfford(apCost)) return hexes;

    if (skill.targetType === "self") {
      hexes.add(`${pos.q},${pos.r}`);
    } else if (skill.targetType === "enemy") {
      const isRanged = skill.rangeType === "ranged";
      if (isRanged) {
        const enemies = this.getEnemyUnits();
        for (const eid of enemies) {
          const ep = this.world.getComponent<PositionComponent>(eid, "position");
          if (!ep) continue;
          const dist = hexDistance(pos, ep);
          if (dist <= range && hasLineOfSight(this.grid, pos, ep)) {
            hexes.add(`${ep.q},${ep.r}`);
          }
        }
      } else {
        for (const n of hexNeighbors(pos.q, pos.r)) {
          const tile = this.grid.get(n.q, n.r);
          if (!tile?.occupant || tile.occupant === this.selectedUnit) continue;
          if (!this.isEnemyEntity(tile.occupant)) continue;
          const health = this.world.getComponent<HealthComponent>(tile.occupant, "health");
          if (!health || health.current <= 0) continue;
          if (hexDistance(pos, { q: n.q, r: n.r }) <= range) {
            hexes.add(`${n.q},${n.r}`);
          }
        }
      }
    }

    return hexes;
  }

  // ── Input handling ──

  /** Check if tapping (q,r) would be a valid attack. Does NOT execute. */
  canAttackHex(q: number, r: number): boolean {
    if (this.phase !== "playerTurn") return false;
    if (this.playerTurnState !== "awaitingInput" && this.playerTurnState !== "skillTargeting") return false;
    if (!this.selectedUnit) return false;

    const skill = this.playerTurnState === "skillTargeting" && this.pendingSkill
      ? this.pendingSkill
      : this.getActiveSkill();
    // Stance skills target self, not enemies
    if (skill.targetType === "self") return false;

    const tile = this.grid.get(q, r);
    const attackerPos = this.world.getComponent<PositionComponent>(
      this.selectedUnit, "position",
    );
    if (!attackerPos) return false;

    if (
      tile?.occupant &&
      tile.occupant !== this.selectedUnit &&
      this.isEnemyEntity(tile.occupant)
    ) {
      const dist = hexDistance({ q: attackerPos.q, r: attackerPos.r }, { q, r });
      const weapon = this.getWeaponDef(this.selectedUnit);
      const range = skillRange(skill, weapon);
      const apCost = this.getEffectiveAPCost(this.selectedUnit, skill, weapon);
      if (dist > range || !this.apManager.canAfford(apCost)) return false;
      // Ranged attacks require line of sight
      if (skill.rangeType === "ranged") {
        return hasLineOfSight(this.grid, attackerPos, { q, r });
      }
      return true;
    }
    return false;
  }

  handleHexTap(q: number, r: number): boolean {
    if (this.phase !== "playerTurn") return false;
    if (this.playerTurnState !== "awaitingInput" && this.playerTurnState !== "skillTargeting") return false;
    if (!this.selectedUnit) return false;

    const tile = this.grid.get(q, r);
    const attackerPos = this.world.getComponent<PositionComponent>(
      this.selectedUnit,
      "position",
    );
    if (!attackerPos) return false;

    // ── Skill targeting mode: execute pending skill on valid target, or cancel ──
    if (this.playerTurnState === "skillTargeting" && this.pendingSkill) {
      const skill = this.pendingSkill;
      const targetHexes = this.getSkillTargetHexes();
      const key = `${q},${r}`;

      if (targetHexes.has(key)) {
        // Valid target — execute the skill
        this.selectedSkill = skill;
        this.pendingSkill = null;

        if (skill.isStance && skill.targetType === "self") {
          this.executeStance(this.selectedUnit, skill);
        } else if (skill.targetType === "enemy" && tile?.occupant) {
          this.executeAttack(this.selectedUnit, tile.occupant);
        }
        return true;
      } else {
        // Invalid target — cancel skill targeting
        this.cancelSkill();
        return false;
      }
    }

    // ── Normal awaitingInput mode ──
    const skill = this.getActiveSkill();

    // Tap on enemy within basic attack range → attack
    if (
      skill.targetType === "enemy" &&
      tile?.occupant &&
      tile.occupant !== this.selectedUnit &&
      this.isEnemyEntity(tile.occupant)
    ) {
      const dist = hexDistance({ q: attackerPos.q, r: attackerPos.r }, { q, r });
      const weapon = this.getWeaponDef(this.selectedUnit);
      const range = skillRange(skill, weapon);
      const apCost = this.getEffectiveAPCost(this.selectedUnit, skill, weapon);

      if (dist <= range && this.apManager.canAfford(apCost)) {
        this.executeAttack(this.selectedUnit, tile.occupant);
        return true;
      }
    }

    // Tap on reachable hex → move
    const moveKey = `${q},${r}`;
    if (this.moveRange && this.moveRange.has(moveKey) && !tile?.occupant) {
      this.executeMove(this.selectedUnit, q, r);
      return true;
    }

    return false;
  }

  /** Handle action bar button press. */
  handleAction(action: "wait" | "endTurn"): void {
    if (this.phase !== "playerTurn") return;

    // Cancel skill targeting if active
    if (this.playerTurnState === "skillTargeting") {
      this.pendingSkill = null;
    }

    switch (action) {
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

  /** Handle undo button press (separate from action bar). */
  handleUndo(): void {
    if (this.phase !== "playerTurn") return;
    this.undoMove();
  }

  // ── Private action methods ──

  /** Execute a move action for the given entity to (q, r). */
  private executeMove(entityId: EntityId, q: number, r: number): void {
    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (!pos) return;

    // Check ZoC break cost first
    const inZoC = isInEnemyZoC(this.world, this.grid, pos.q, pos.r, entityId);
    let zocMPCost = 0;
    if (inZoC) {
      zocMPCost = getZoCBreakCost(this.mpManager.remaining);
    }

    const mpAfterZoC = this.mpManager.remaining - zocMPCost;
    if (mpAfterZoC <= 0) return;

    const pathResult = findPath(
      this.grid,
      { q: pos.q, r: pos.r },
      { q, r },
      mpAfterZoC,
      tileMPCost,
    );
    if (!pathResult.found) return;

    // Calculate costs
    const pathMP = pathResult.cost;
    const totalMPSpent = pathMP + zocMPCost;
    const fatigueCost = pathFatigueCost(this.grid, pathResult.path, pos.q, pos.r);

    if (!this.mpManager.canAfford(totalMPSpent)) return;

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
        apSpent: 0,
        mpSpent: totalMPSpent,
        fatigueSpent: fatigueCost,
      };
    }

    this.playerTurnState = "animating";

    // Spend MP (not AP) and fatigue
    this.mpManager.spend(totalMPSpent);
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

    // Spearwall triggers at destination
    this.checkSpearwallTriggers(entityId, q, r);

    // Continuation: return to awaitingInput (multi-action turn)
    this.pendingContinuation = () => {
      if (!this.checkBattleEnd()) {
        this.recalculateAndContinue(entityId);
      }
    };

    this.onActionComplete?.();
  }

  /** Undo the last move — instant, no animation. */
  private undoMove(): void {
    if (!this.undoInfo) return;

    const { entityId, oldQ, oldR, oldElevation, apSpent, mpSpent, fatigueSpent } = this.undoInfo;
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

    // Refund MP, AP, and fatigue
    this.mpManager.spend(-mpSpent); // negative spend = refund
    this.apManager.spend(-apSpent);
    this.addFatigue(entityId, -fatigueSpent);

    this.undoInfo = null;
    this.selectedSkill = null;
    this.pendingSkill = null;

    this.onUnitTeleported?.(entityId, oldQ, oldR);

    // Recalculate and show overlays
    this.calculateMoveRange(entityId);
    this.setPlayerState("awaitingInput");
  }

  /** Execute an attack action using the active skill. */
  private executeAttack(attackerId: EntityId, defenderId: EntityId): void {
    const skill = this.getActiveSkill();
    const weapon = this.getWeaponDef(attackerId);
    const apCost = this.getEffectiveAPCost(attackerId, skill, weapon);
    const fatCost = skillFatigueCost(skill, weapon);

    if (!this.apManager.canAfford(apCost)) return;

    this.playerTurnState = "animating";

    // Spend AP and fatigue
    this.apManager.spend(apCost);
    this.addFatigue(attackerId, fatCost);

    // Can't undo after attacking
    this.undoInfo = null;

    let result: AttackResult;

    if (skill.id === "split_shield") {
      const splitResult = this.skillExecutor.executeSplitShield(this.world, attackerId, defenderId);
      result = splitResult;
      if (splitResult.shieldDestroyed) {
        this.onShieldDestroyed?.(defenderId);
      }
    } else {
      result = this.damageCalc.resolveSkillAttack(this.world, attackerId, defenderId, skill);
    }

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

  /** Execute a stance skill (self-targeting). */
  private executeStance(entityId: EntityId, skill: SkillDef): void {
    const weapon = this.getWeaponDef(entityId);
    const apCost = this.getEffectiveAPCost(entityId, skill, weapon);
    const fatCost = skillFatigueCost(skill, weapon);

    if (!this.apManager.canAfford(apCost)) return;

    this.apManager.spend(apCost);
    this.addFatigue(entityId, fatCost);
    this.undoInfo = null;

    if (skill.id === "spearwall") {
      this.skillExecutor.activateSpearwall(this.world, entityId);
    }

    this.onStanceActivated?.(entityId, skill.id);
    this.recalculateAndContinue(entityId);
  }

  /**
   * After an action completes, recalculate move range and decide whether
   * to continue the turn or auto-end it.
   */
  private recalculateAndContinue(entityId: EntityId): void {
    this.calculateMoveRange(entityId);

    const canMove = this.moveRange && this.moveRange.size > 1; // >1 because start hex is included
    const canAct = this.canUseAnySkill(entityId);

    if (!canMove && !canAct) {
      // No valid actions left — auto-end turn
      this.undoInfo = null;
      this.endPlayerUnitTurn();
    } else {
      this.setPlayerState("awaitingInput");
    }
  }

  /**
   * Check if the unit can use any skill — attacks with enemies in range,
   * or self-targeted skills like stances. Checks ALL available skills,
   * not just the currently selected one.
   */
  private canUseAnySkill(entityId: EntityId): boolean {
    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (!pos) return false;

    const equip = this.world.getComponent<EquipmentComponent>(entityId, "equipment");
    const weaponId = equip?.mainHand ?? "unarmed";
    const weapon = this.getWeaponDef(entityId);
    const skills = getSkillsForWeapon(weaponId);

    for (const skill of skills) {
      if (skill.isBasicAttack) continue; // basic attack checked separately below
      const apCost = this.getEffectiveAPCost(entityId, skill, weapon);
      if (!this.apManager.canAfford(apCost)) continue;

      // Self-targeted skills (stances) are always usable if affordable
      if (skill.targetType === "self") return true;

      // Enemy-targeted skills: check if any enemy is in range
      if (this.canSkillReachEnemy(entityId, pos, skill, weapon)) return true;
    }

    // Check basic attack separately
    const basicSkill = this.getActiveSkill();
    if (basicSkill.targetType === "enemy") {
      const apCost = this.getEffectiveAPCost(entityId, basicSkill, weapon);
      if (this.apManager.canAfford(apCost)) {
        if (this.canSkillReachEnemy(entityId, pos, basicSkill, weapon)) return true;
      }
    }

    return false;
  }

  /** Check if a specific skill can reach any enemy from the given position. */
  private canSkillReachEnemy(
    entityId: EntityId,
    pos: PositionComponent,
    skill: SkillDef,
    weapon: WeaponDef,
  ): boolean {
    const range = skillRange(skill, weapon);
    const isRanged = skill.rangeType === "ranged";

    if (isRanged) {
      const enemies = this.getEnemyUnits();
      for (const eid of enemies) {
        const ep = this.world.getComponent<PositionComponent>(eid, "position");
        if (!ep) continue;
        const dist = hexDistance(pos, ep);
        if (dist <= range && hasLineOfSight(this.grid, pos, ep)) {
          return true;
        }
      }
    } else {
      for (const n of hexNeighbors(pos.q, pos.r)) {
        const tile = this.grid.get(n.q, n.r);
        if (!tile?.occupant || tile.occupant === entityId) continue;
        if (!this.isEnemyEntity(tile.occupant)) continue;
        const health = this.world.getComponent<HealthComponent>(tile.occupant, "health");
        if (!health || health.current <= 0) continue;
        if (hexDistance(pos, { q: n.q, r: n.r }) <= range) {
          return true;
        }
      }
    }
    return false;
  }

  /** Calculate and cache move range using MP-based costs. */
  private calculateMoveRange(entityId: EntityId): void {
    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (!pos) return;

    let effectiveMP = this.mpManager.remaining;

    // If in enemy ZoC, reduce effective budget by break cost
    if (isInEnemyZoC(this.world, this.grid, pos.q, pos.r, entityId)) {
      effectiveMP = Math.max(0, effectiveMP - getZoCBreakCost(effectiveMP));
    }

    this.moveRange = reachableHexes(
      this.grid,
      { q: pos.q, r: pos.r },
      effectiveMP,
      tileMPCost,
    );
  }

  /** End the current player unit's turn and advance. */
  private endPlayerUnitTurn(): void {
    // Convert remaining AP to stamina recovery (1 AP → 2 fatigue recovered)
    if (this.selectedUnit) {
      const leftoverAP = this.apManager.remaining;
      if (leftoverAP > 0) {
        const fatigue = this.world.getComponent<FatigueComponent>(this.selectedUnit, "fatigue");
        if (fatigue) {
          const recovery = leftoverAP * 2;
          fatigue.current = Math.max(0, fatigue.current - recovery);
        }
      }
    }

    this.selectedUnit = null;
    this.selectedSkill = null;
    this.pendingSkill = null;
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

    // Clear expired stances
    this.skillExecutor.clearStances(this.world, entityId);

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
      this.resetMPForUnit(entityId);
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
   * Run ONE enemy unit's turn using TacticalAI, then wait for animation.
   */
  private runEnemyTurn(): void {
    const entry = this.turnOrder.current();
    if (!entry) return;

    const entityId = entry.entityId;
    const playerUnits = this.getPlayerUnits();

    const action = decideTacticalAction(this.world, this.grid, entityId, playerUnits);

    this.executeEnemyAction(entityId, action);
  }

  /** Execute a TacticalAI action for an enemy unit. */
  private executeEnemyAction(entityId: EntityId, action: TacticalAction): void {
    switch (action.type) {
      case "moveAndAttack": {
        if (!this.executeEnemyMove(entityId, action.path)) return; // died to ZoC or spearwall
        this.executeEnemyAttack(entityId, action.targetId, action.skill);
        break;
      }

      case "move": {
        this.executeEnemyMove(entityId, action.path);
        break;
      }

      case "attack": {
        this.executeEnemyAttack(entityId, action.targetId, action.skill);
        break;
      }

      case "activateStance": {
        this.executeStanceEnemy(entityId, action.skill);
        break;
      }

      case "recover": {
        const fatigue = this.world.getComponent<FatigueComponent>(entityId, "fatigue");
        if (fatigue) {
          const recovery = Math.floor(fatigue.max * 0.5);
          fatigue.current = Math.max(0, fatigue.current - recovery);
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

  /**
   * Execute enemy movement with ZoC resolution.
   * Returns false if the unit died from ZoC (turn ends immediately).
   */
  private executeEnemyMove(entityId: EntityId, path: Array<{ q: number; r: number }>): boolean {
    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (!pos || path.length === 0) return true;

    // ZoC resolution
    const zocAttackers = getZoCAttacksForMove(
      this.world, this.grid, entityId,
      pos.q, pos.r, path,
    );

    for (const zocAttacker of zocAttackers) {
      const zocResult = this.damageCalc.resolveMelee(this.world, zocAttacker, entityId);
      this.onZoCAttack?.(zocResult, zocAttacker, entityId);

      if (zocResult.targetKilled) {
        this.handleDeath(entityId);
        this.pendingContinuation = () => {
          if (!this.checkBattleEnd()) {
            const newRound = this.turnOrder.advance();
            if (newRound) this.turnOrder.calculateOrder(this.world);
            this.beginCurrentTurn();
          }
        };
        this.onActionComplete?.();
        return false;
      }
    }

    const dest = path[path.length - 1]!;
    const fatCost = pathFatigueCost(this.grid, path, pos.q, pos.r);
    this.addFatigue(entityId, fatCost);

    const oldTile = this.grid.get(pos.q, pos.r);
    if (oldTile) oldTile.occupant = null;

    const newTile = this.grid.get(dest.q, dest.r);
    if (newTile) newTile.occupant = entityId;

    pos.q = dest.q;
    pos.r = dest.r;
    if (newTile) pos.elevation = newTile.elevation;

    this.onUnitMoved?.(entityId, path);

    // Spearwall triggers at destination
    this.checkSpearwallTriggers(entityId, dest.q, dest.r);
    const health = this.world.getComponent<HealthComponent>(entityId, "health");
    if (health && health.current <= 0) {
      this.handleDeath(entityId);
      this.pendingContinuation = () => {
        if (!this.checkBattleEnd()) {
          const newRound = this.turnOrder.advance();
          if (newRound) this.turnOrder.calculateOrder(this.world);
          this.beginCurrentTurn();
        }
      };
      this.onActionComplete?.();
      return false;
    }

    return true;
  }

  /** Execute an enemy attack with morale/status handling. */
  private executeEnemyAttack(entityId: EntityId, targetId: EntityId, skill?: SkillDef): void {
    const weapon = this.getWeaponDef(entityId);
    const useSkill = skill ?? BASIC_ATTACK;
    const fatCost = skillFatigueCost(useSkill, weapon);
    this.addFatigue(entityId, fatCost);

    let result: AttackResult;
    if (useSkill.id === "split_shield") {
      const splitResult = this.skillExecutor.executeSplitShield(this.world, entityId, targetId);
      result = splitResult;
      if (splitResult.shieldDestroyed) {
        this.onShieldDestroyed?.(targetId);
      }
    } else {
      result = this.damageCalc.resolveSkillAttack(this.world, entityId, targetId, useSkill);
    }
    this.onAttackResult?.(result, entityId, targetId);
    for (const eff of result.appliedEffects) {
      this.onStatusApplied?.(targetId, eff);
    }
    if (result.targetKilled) {
      this.handleDeath(targetId);
      this.triggerAllyMoraleChecks(targetId);
      this.triggerEnemyKillBoost(entityId);
    } else if (result.hit) {
      const mr = this.morale.onHeavyDamage(this.world, targetId, result.hpDamage);
      if (mr) {
        this.onMoraleChange?.(mr);
        if (mr.newState === "fleeing") {
          this.statusEffects.apply(this.world, targetId, "fleeing");
        }
      }
    }
  }

  /** Execute a stance skill for an enemy unit. */
  private executeStanceEnemy(entityId: EntityId, skill: SkillDef): void {
    const weapon = this.getWeaponDef(entityId);
    this.addFatigue(entityId, skillFatigueCost(skill, weapon));

    if (skill.id === "spearwall") {
      this.skillExecutor.activateSpearwall(this.world, entityId);
    }
    this.onStanceActivated?.(entityId, skill.id);
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
      // Find hex farthest from nearest enemy — use unit's effective MP
      const stats = this.world.getComponent<StatsComponent>(entityId, "stats");
      const equip = this.world.getComponent<EquipmentComponent>(entityId, "equipment");
      const armor = this.world.getComponent<ArmorComponent>(entityId, "armor");
      const cc = this.world.getComponent<CharacterClassComponent>(entityId, "characterClass");
      const fleeClassDef = cc ? getClassDef(cc.classId) : undefined;
      const fleeArmorReduction = fleeClassDef ? getClassArmorMPReduction(fleeClassDef) : 0;
      const fleeMP = getEffectiveMP(stats?.movementPoints ?? DEFAULT_MP, armor?.body?.id, armor?.head?.id, equip?.offHand ?? undefined, fleeArmorReduction);
      const enemies = isEnemy ? this.getPlayerUnits() : this.getEnemyUnits();
      const reachable = reachableHexes(
        this.grid, { q: pos.q, r: pos.r }, fleeMP, tileMPCost,
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
          this.grid, { q: pos.q, r: pos.r }, bestHex, fleeMP, tileMPCost,
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

  /** Reset MP for a unit based on its stats, equipment, and class. */
  private resetMPForUnit(entityId: EntityId): void {
    const stats = this.world.getComponent<StatsComponent>(entityId, "stats");
    const equip = this.world.getComponent<EquipmentComponent>(entityId, "equipment");
    const armor = this.world.getComponent<ArmorComponent>(entityId, "armor");
    const cc = this.world.getComponent<CharacterClassComponent>(entityId, "characterClass");
    const classDef = cc ? getClassDef(cc.classId) : undefined;
    const armorMPReduction = classDef ? getClassArmorMPReduction(classDef) : 0;
    const baseMP = stats?.movementPoints ?? DEFAULT_MP;
    const effectiveMP = getEffectiveMP(baseMP, armor?.body?.id, armor?.head?.id, equip?.offHand ?? undefined, armorMPReduction);
    this.mpManager.resetForTurn(effectiveMP);
  }

  private getWeaponDef(entityId: EntityId): WeaponDef {
    const equip = this.world.getComponent<EquipmentComponent>(entityId, "equipment");
    return equip?.mainHand ? getWeapon(equip.mainHand) : UNARMED;
  }

  /** Get effective AP cost for a skill, applying class discount. Min 1 AP. */
  private getEffectiveAPCost(entityId: EntityId, skill: SkillDef, weapon: WeaponDef): number {
    const base = skillAPCost(skill, weapon);
    const cc = this.world.getComponent<CharacterClassComponent>(entityId, "characterClass");
    if (!cc) return base;
    const classDef = getClassDef(cc.classId);
    const discount = getClassAPDiscount(classDef, weapon, skill.rangeType);
    return Math.max(1, base - discount);
  }

  /** Public: get effective AP cost for the selected unit's pending/active skill. */
  getSkillAPCost(skill: SkillDef): number {
    if (!this.selectedUnit) return skillAPCost(skill, UNARMED);
    const weapon = this.getWeaponDef(this.selectedUnit);
    return this.getEffectiveAPCost(this.selectedUnit, skill, weapon);
  }

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

  /**
   * Check if any neighbor of (q,r) has a spearwall stance from the opposite team.
   * If so, trigger free attacks against the moving entity.
   */
  private checkSpearwallTriggers(movingEntityId: EntityId, q: number, r: number): void {
    const movingIsAI = this.isEnemyEntity(movingEntityId);

    for (const n of hexNeighbors(q, r)) {
      const tile = this.grid.get(n.q, n.r);
      if (!tile?.occupant || tile.occupant === movingEntityId) continue;

      const neighborIsAI = this.isEnemyEntity(tile.occupant);
      if (neighborIsAI === movingIsAI) continue; // Same team, no trigger

      if (this.skillExecutor.hasSpearwall(this.world, tile.occupant)) {
        const result = this.skillExecutor.triggerSpearwall(
          this.world, tile.occupant, movingEntityId,
        );
        if (result) {
          this.onSpearwallTriggered?.(result, tile.occupant, movingEntityId);
          if (result.targetKilled) {
            return; // Entity died, stop checking
          }
        }
      }
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
    if (this.isEnemyEntity(entityId)) {
      this._killCount++;
    }

    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (pos) {
      const tile = this.grid.get(pos.q, pos.r);
      if (tile) tile.occupant = null;
    }
    this.turnOrder.remove(entityId);

    // Defensive: ensure no dead units remain as occupants on any tile
    this.cleanupDeadOccupants();
  }

  /**
   * Scan all tiles and clear occupants that are dead (health <= 0).
   * This is a defensive cleanup to prevent stale occupancy from blocking movement.
   */
  private cleanupDeadOccupants(): void {
    for (const tile of this.grid.toArray()) {
      if (tile.occupant) {
        const health = this.world.getComponent<HealthComponent>(tile.occupant, "health");
        if (health && health.current <= 0) {
          tile.occupant = null;
        }
      }
    }
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

  // ── Equipment management (in-combat) ──

  private static readonly EQUIP_AP_COST = 4;

  /** Swap a bag item into an equipment slot. Returns true on success. */
  swapEquipment(entityId: EntityId, bagIndex: number, slot: "mainHand" | "offHand"): boolean {
    if (!this.apManager.canAfford(CombatManager.EQUIP_AP_COST)) return false;
    const equip = this.world.getComponent<EquipmentComponent>(entityId, "equipment");
    if (!equip || bagIndex < 0 || bagIndex >= equip.bag.length) return false;

    const bagItemId = equip.bag[bagIndex]!;

    // Validate class restrictions
    const cc = this.world.getComponent<CharacterClassComponent>(entityId, "characterClass");
    if (cc) {
      const classDef = getClassDef(cc.classId);
      if (slot === "mainHand") {
        try {
          const weaponDef = getWeapon(bagItemId);
          if (!canEquipWeapon(classDef, weaponDef)) return false;
        } catch { /* not a weapon — skip */ }
      } else if (slot === "offHand") {
        const shieldDef = getShield(bagItemId);
        if (shieldDef && !canEquipShield(classDef, shieldDef)) return false;
      }
    }

    const oldItem = equip[slot];
    equip[slot] = bagItemId ?? null;
    if (oldItem) {
      equip.bag[bagIndex] = oldItem;
    } else {
      equip.bag.splice(bagIndex, 1);
    }

    // Update shield durability when swapping shields
    if (slot === "offHand") {
      const newShield = getShield(bagItemId!);
      equip.shieldDurability = newShield ? newShield.durability : null;
    }

    this.apManager.spend(CombatManager.EQUIP_AP_COST);
    return true;
  }

  /** Unequip an item to bag. Returns true on success. */
  unequipToBag(entityId: EntityId, slot: "mainHand" | "offHand"): boolean {
    if (!this.apManager.canAfford(CombatManager.EQUIP_AP_COST)) return false;
    const equip = this.world.getComponent<EquipmentComponent>(entityId, "equipment");
    if (!equip || !equip[slot]) return false;

    equip.bag.push(equip[slot]!);
    equip[slot] = null;
    if (slot === "offHand") equip.shieldDurability = null;

    this.apManager.spend(CombatManager.EQUIP_AP_COST);
    return true;
  }

  /** Use a consumable from bag. Returns true on success. */
  useConsumable(entityId: EntityId, bagIndex: number): boolean {
    const equip = this.world.getComponent<EquipmentComponent>(entityId, "equipment");
    if (!equip || bagIndex < 0 || bagIndex >= equip.bag.length) return false;

    const itemId = equip.bag[bagIndex]!;
    const consumable = getConsumable(itemId);
    if (!consumable) return false;

    if (!this.apManager.canAfford(consumable.apCost)) return false;

    // Apply effect
    if (consumable.effect.type === "heal") {
      const health = this.world.getComponent<HealthComponent>(entityId, "health");
      if (health) {
        health.current = Math.min(health.max, health.current + consumable.effect.amount);
      }
    }

    equip.bag.splice(bagIndex, 1);
    this.apManager.spend(consumable.apCost);
    return true;
  }
}
