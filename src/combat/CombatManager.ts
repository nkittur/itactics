import type { World } from "@entities/World";
import type { HexGrid } from "@hex/HexGrid";
import type { EntityId } from "@entities/Entity";
import type { PositionComponent } from "@entities/components/Position";
import type { HealthComponent } from "@entities/components/Health";
import type { StaminaComponent } from "@entities/components/Stamina";
import type { ManaComponent } from "@entities/components/Mana";
import type { EquipmentComponent } from "@entities/components/Equipment";
import { TurnOrder } from "./TurnOrder";
import { DamageCalculator, type AttackResult } from "./DamageCalculator";
import { ActionPointManager, pathStaminaCost, MAX_AP } from "./ActionPointManager";
import { MovementPointManager, tileMPCost, getEffectiveMP, DEFAULT_MP } from "./MovementPointManager";
import { getZoCAttacksForMove, isInEnemyZoC, getZoCBreakCost } from "./ZoneOfControl";
import type { StatsComponent } from "@entities/components/Stats";
import type { ArmorComponent } from "@entities/components/Armor";
import { StatusEffectManager, type BleedTickResult } from "./StatusEffectManager";
import { MoraleManager, type MoraleCheckResult } from "./MoraleManager";
import { SkillExecutor } from "./SkillExecutor";
import { AbilityExecutor, type AbilityResult, type DelayedEffect } from "./AbilityExecutor";
import { PassiveResolver, type PassiveResult } from "./PassiveResolver";
import type { TriggerGrants } from "@data/AbilityData";
import type { ActiveStancesComponent } from "@entities/components/ActiveStances";
import { UNARMED, type WeaponDef } from "@data/WeaponData";
import { resolveWeapon, resolveShield } from "@data/ItemResolver";
import { BASIC_ATTACK, getSkillsForWeapon, skillAPCost, skillStaminaCost, skillRange, type SkillDef } from "@data/SkillData";
import type { CombatSkill } from "@data/CombatSkill";
import { wrapSkillDef, wrapGeneratedAbility, getExecutableAbility } from "@data/CombatSkill";
import { resolveAbility } from "@data/AbilityResolver";
import { getAbility } from "@data/ruleset/RulesetLoader";
import { wrapRulesetAbility } from "@data/CombatSkill";
import type { AbilitiesComponent } from "@entities/components/Abilities";
import type { AbilityCooldownsComponent } from "@entities/components/AbilityCooldowns";
import type { StatusEffectsComponent } from "@entities/components/StatusEffects";
import type { CharacterClassComponent } from "@entities/components/CharacterClass";
import { getClassAPDiscount, getClassArmorMPReduction, canEquipWeapon, canEquipShield } from "@data/ClassData";
import { getClassDefOptional } from "@data/ClassData";
import { getConsumable } from "@data/ItemData";
import { decideTacticalAction, type TacticalAction } from "./TacticalAI";
import { hasLineOfSight } from "@hex/HexLineOfSight";
import { RNG } from "@utils/RNG";
import { EventBus } from "@core/EventBus";
import { refreshAuras } from "@combat/AuraManager";
import { ResourceManager } from "./ResourceManager";
import { hexDistance, hexNeighbors } from "@hex/HexMath";
import { findPath, reachableHexes } from "@hex/HexPathfinding";
import { createActionTracker, trackAction, trackKill, CP_PER_ACTION, type BattleActionTracker } from "./CPCalculator";

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
  staminaSpent: number;
}

export class CombatManager {
  eventBus: EventBus;
  resourceManager: ResourceManager;
  turnOrder: TurnOrder;
  damageCalc: DamageCalculator;
  skillExecutor: SkillExecutor;
  abilityExecutor: AbilityExecutor;
  passiveResolver: PassiveResolver;
  statusEffects: StatusEffectManager;
  morale: MoraleManager;
  phase: CombatPhase = "playerTurn";
  playerTurnState: PlayerTurnState = "awaitingInput";
  selectedUnit: EntityId | null = null;

  /** Currently selected skill for attack. Null = basic attack. */
  selectedSkill: CombatSkill | null = null;

  /** Skill pending target selection (activation mode). */
  pendingSkill: CombatSkill | null = null;

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

  /** Per-unit action/kill tracking for CP awards. */
  private _actionTracker: BattleActionTracker = createActionTracker();
  get actionTracker(): BattleActionTracker { return this._actionTracker; }

  /** Tracks the last ability used per entity (for combo chain sequencing). */
  private _lastAbilityUsed = new Map<EntityId, string>();

  /**
   * AP available immediately for a unit (e.g. from on-dodge res_apRefund).
   * Use getReactionAp / spendReactionAp so reaction abilities can use this before the unit's turn.
   * Any unspent amount is merged into normal AP when that unit's turn starts.
   */
  private reactionApByEntity = new Map<EntityId, number>();

  /** Effects to apply at end of a unit's turn (e.g. Overclock self-stun). sourceEntityId = whose turn. */
  private pendingDelayedEffects: Array<DelayedEffect & { sourceEntityId: EntityId }> = [];

  /** AP available right now for reactions (e.g. after dodging). Use spendReactionAp when they use a reaction. */
  getReactionAp(entityId: EntityId): number {
    return this.reactionApByEntity.get(entityId) ?? 0;
  }

  /** Spend AP from the entity's reaction pool. Returns true if they had enough. */
  spendReactionAp(entityId: EntityId, amount: number): boolean {
    const cur = this.reactionApByEntity.get(entityId) ?? 0;
    if (cur < amount) return false;
    const next = cur - amount;
    if (next <= 0) this.reactionApByEntity.delete(entityId);
    else this.reactionApByEntity.set(entityId, next);
    return true;
  }

  /** MP available immediately for reactions (e.g. after dodging). Unspent is merged at turn start. */
  private reactionMpByEntity = new Map<EntityId, number>();
  getReactionMp(entityId: EntityId): number {
    return this.reactionMpByEntity.get(entityId) ?? 0;
  }
  spendReactionMp(entityId: EntityId, amount: number): boolean {
    const cur = this.reactionMpByEntity.get(entityId) ?? 0;
    if (cur < amount) return false;
    const next = cur - amount;
    if (next <= 0) this.reactionMpByEntity.delete(entityId);
    else this.reactionMpByEntity.set(entityId, next);
    return true;
  }

  /** Apply trigger grants immediately: HP/mana/stamina to components; AP/MP to current unit or reaction pools. */
  private applyTriggerGrants(entityId: EntityId, grants: TriggerGrants, isCurrentUnit: boolean): void {
    const health = this.world.getComponent<HealthComponent>(entityId, "health");
    if (health && (grants.hp ?? 0) > 0) {
      health.current = Math.min(health.max, health.current + (grants.hp ?? 0));
    }
    const mana = this.world.getComponent<ManaComponent>(entityId, "mana");
    if (mana && (grants.mana ?? 0) > 0) {
      mana.current = Math.min(mana.max, mana.current + (grants.mana ?? 0));
    }
    const stamina = this.world.getComponent<StaminaComponent>(entityId, "stamina");
    if (stamina && (grants.stamina ?? 0) > 0) {
      stamina.current = Math.min(stamina.max, stamina.current + (grants.stamina ?? 0));
    }
    const ap = grants.ap ?? 0;
    if (ap > 0) {
      if (isCurrentUnit) this.apManager.refund(ap);
      else {
        const cur = this.reactionApByEntity.get(entityId) ?? 0;
        this.reactionApByEntity.set(entityId, cur + ap);
      }
    }
    const mp = grants.mp ?? 0;
    if (mp > 0) {
      if (isCurrentUnit) this.mpManager.add(mp);
      else {
        const cur = this.reactionMpByEntity.get(entityId) ?? 0;
        this.reactionMpByEntity.set(entityId, cur + mp);
      }
    }
  }

  /** Get the last ability used by an entity. */
  getLastAbilityUsed(entityId: EntityId): string | undefined {
    return this._lastAbilityUsed.get(entityId);
  }

  // ── Callbacks for the rendering/UI layer ──

  onPhaseChange?: (phase: CombatPhase) => void;
  onTurnAdvance?: (entityId: EntityId) => void;
  onAttackResult?: (
    result: AttackResult,
    attackerId: EntityId,
    defenderId: EntityId,
    skillName?: string,
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
  onPassiveTriggered?: (entityId: EntityId, passiveName: string, effect: string) => void;
  /** Called when a player unit earns CP from an action (move, attack, ability). */
  onCPEarned?: (entityId: EntityId, amount: number) => void;

  constructor(
    private world: World,
    private grid: HexGrid,
    seed?: number,
  ) {
    const rng = new RNG(seed ?? Date.now());
    this.eventBus = new EventBus();
    this.turnOrder = new TurnOrder();
    this.statusEffects = new StatusEffectManager(rng);
    this.statusEffects.setEventBus(this.eventBus);
    this.resourceManager = new ResourceManager(this.eventBus);
    this.morale = new MoraleManager(rng);
    this.damageCalc = new DamageCalculator(rng, grid);
    this.damageCalc.setStatusEffectManager(this.statusEffects);
    this.skillExecutor = new SkillExecutor(rng, this.damageCalc);
    this.abilityExecutor = new AbilityExecutor(rng, this.damageCalc, this.statusEffects, this.skillExecutor, grid);
    this.passiveResolver = new PassiveResolver(this.statusEffects);
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

  /** Get available skills for the currently selected unit as CombatSkills. */
  getAvailableSkills(): CombatSkill[] {
    if (!this.selectedUnit) return [];
    const equip = this.world.getComponent<EquipmentComponent>(this.selectedUnit, "equipment");
    const weaponId = equip?.mainHand ?? "unarmed";
    const weapon = this.getWeaponDef(this.selectedUnit);

    // Static weapon skills (Attack, Puncture, Stun, etc.)
    const staticSkills = getSkillsForWeapon(weaponId);
    const result: CombatSkill[] = staticSkills.map(s => wrapSkillDef(s, weapon));

    // Abilities from AbilitiesComponent (ruleset or legacy generated)
    const abilities = this.world.getComponent<AbilitiesComponent>(this.selectedUnit, "abilities");
    const cooldowns = this.world.getComponent<AbilityCooldownsComponent>(this.selectedUnit, "abilityCooldowns");
    if (abilities) {
      for (const uid of abilities.abilityIds) {
        const rulesetDef = getAbility(uid);
        if (rulesetDef) {
          if (rulesetDef.type.toLowerCase().includes("passive") || rulesetDef.type === "Aura") continue;
          if (cooldowns && (cooldowns.cooldowns[uid] ?? 0) > 0) continue;
          if (rulesetDef.weaponReq && rulesetDef.weaponReq.length > 0 && !rulesetDef.weaponReq.includes(weapon.family)) continue;
          result.push(wrapRulesetAbility(rulesetDef, weapon));
          continue;
        }
        const ability = resolveAbility(uid);
        if (!ability) continue;
        if (ability.isPassive) continue;
        if (cooldowns && (cooldowns.cooldowns[uid] ?? 0) > 0) continue;
        if (ability.weaponReq.length > 0 && !ability.weaponReq.includes(weapon.family)) continue;
        result.push(wrapGeneratedAbility(ability, weapon));
      }
    }

    return result;
  }

  /** Get available skills as raw SkillDef[] (legacy support for AI and other callers). */
  getAvailableSkillDefs(): SkillDef[] {
    if (!this.selectedUnit) return [];
    const equip = this.world.getComponent<EquipmentComponent>(this.selectedUnit, "equipment");
    const weaponId = equip?.mainHand ?? "unarmed";
    return getSkillsForWeapon(weaponId);
  }

  /** Select a skill for the next attack. */
  selectSkill(skill: CombatSkill | null): void {
    this.selectedSkill = skill;
  }

  /** Get the active skill as a SkillDef (selected or basic attack). */
  getActiveSkill(): SkillDef {
    if (this.selectedSkill?.skillDef) return this.selectedSkill.skillDef;
    return BASIC_ATTACK;
  }

  /** Get the active CombatSkill wrapper (or null). */
  getActiveCombatSkill(): CombatSkill | null {
    return this.selectedSkill;
  }

  /** Enter skill targeting mode — shows valid targets for the skill. */
  activateSkill(skill: CombatSkill): void {
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

    const cs = this.pendingSkill;
    const apCost = getExecutableAbility(cs)
      ? cs.apCost
      : this.getEffectiveAPCost(this.selectedUnit, cs.skillDef!, this.getWeaponDef(this.selectedUnit));
    if (!this.apManager.canAfford(apCost)) return hexes;

    const range = cs.range;

    if (cs.targetType === "self") {
      hexes.add(`${pos.q},${pos.r}`);
    } else if (cs.targetType === "enemy") {
      const isRanged = cs.rangeType === "ranged";
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

    // Use pending CombatSkill if in targeting, otherwise active SkillDef
    const cs = this.playerTurnState === "skillTargeting" && this.pendingSkill
      ? this.pendingSkill : null;
    const skill = cs?.skillDef ?? this.getActiveSkill();
    const targetType = cs?.targetType ?? skill.targetType;
    const rangeType = cs?.rangeType ?? skill.rangeType;

    // Stance skills target self, not enemies
    if (targetType === "self") return false;

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
      const range = cs ? cs.range : skillRange(skill, weapon);
      const apCost = cs?.isGenerated ? cs.apCost : this.getEffectiveAPCost(this.selectedUnit, skill, weapon);
      if (dist > range || !this.apManager.canAfford(apCost)) return false;
      if (rangeType === "ranged") {
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
      const cs = this.pendingSkill;
      const targetHexes = this.getSkillTargetHexes();
      const key = `${q},${r}`;

      if (targetHexes.has(key)) {
        // Valid target — execute the skill
        this.selectedSkill = cs;
        this.pendingSkill = null;

        if (cs.isStance && cs.targetType === "self") {
          this.executeStanceCombatSkill(this.selectedUnit, cs);
        } else if (cs.targetType === "enemy" && tile?.occupant) {
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

  private isPlayerUnit(entityId: EntityId): boolean {
    const team = this.world.getComponent<{ type: "team"; team: string }>(entityId, "team");
    return team?.team === "player";
  }

  private awardCPIfPlayer(entityId: EntityId, amount: number): void {
    if (!this.isPlayerUnit(entityId)) return;
    trackAction(this._actionTracker, entityId);
    this.onCPEarned?.(entityId, amount);
  }

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
    const staminaCost = pathStaminaCost(this.grid, pathResult.path, pos.q, pos.r);

    if (!this.mpManager.canAfford(totalMPSpent)) return;

    // ── ZoC: Resolve free attacks before moving ──
    const zocAttackers = getZoCAttacksForMove(
      this.world, this.grid, entityId,
      pos.q, pos.r, pathResult.path,
    );

    for (const attackerId of zocAttackers) {
      const result = this.damageCalc.resolveMelee(this.world, attackerId, entityId);
      this.onZoCAttack?.(result, attackerId, entityId);
      if (!result.hit) {
        this.fireOnDodgePassives(entityId, attackerId, "melee");
      } else if (result.hpDamage > 0) {
        this.fireOnTakeDamagePassives(entityId, attackerId, result.hpDamage);
      }
      if (result.targetKilled) {
        // Unit died from ZoC — cancel the move
        this.handleDeath(entityId, attackerId);
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
        staminaSpent: staminaCost,
      };
    }

    this.playerTurnState = "animating";

    // Spend MP (not AP) and stamina
    this.mpManager.spend(totalMPSpent);
    this.addStamina(entityId, staminaCost);

    this.awardCPIfPlayer(entityId, CP_PER_ACTION);

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

    const { entityId, oldQ, oldR, oldElevation, apSpent, mpSpent, staminaSpent } = this.undoInfo;
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

    // Refund MP, AP, and stamina
    this.mpManager.spend(-mpSpent); // negative spend = refund
    this.apManager.spend(-apSpent);
    this.addStamina(entityId, -staminaSpent);

    this.undoInfo = null;
    this.selectedSkill = null;
    this.pendingSkill = null;
    this.onUnitTeleported?.(entityId, oldQ, oldR);
    this.calculateMoveRange(entityId);
    this.setPlayerState("awaitingInput");
  }

  /** Set entity position and grid occupancy (e.g. for Flicker Strike return). */
  private setEntityPosition(entityId: EntityId, q: number, r: number, elevation?: number): void {
    const pos = this.world.getComponent<PositionComponent>(entityId, "position");
    if (!pos) return;
    const currentTile = this.grid.get(pos.q, pos.r);
    if (currentTile) currentTile.occupant = null;
    const newTile = this.grid.get(q, r);
    if (newTile) newTile.occupant = entityId;
    pos.q = q;
    pos.r = r;
    if (elevation !== undefined) pos.elevation = elevation;
    else if (newTile) pos.elevation = newTile.elevation;
  }

  /** Execute an attack action using the active skill. */
  private executeAttack(attackerId: EntityId, defenderId: EntityId): void {
    const activeCombatSkill = this.getActiveCombatSkill();
    const weapon = this.getWeaponDef(attackerId);

    // Route generated or ruleset abilities through AbilityExecutor
    if (activeCombatSkill && getExecutableAbility(activeCombatSkill)) {
      this.executeGeneratedAbility(attackerId, defenderId, activeCombatSkill);
      return;
    }

    const skill = this.getActiveSkill();
    const apCost = this.getEffectiveAPCost(attackerId, skill, weapon);
    const fatCost = skillStaminaCost(skill, weapon);

    if (!this.apManager.canAfford(apCost)) return;

    this.playerTurnState = "animating";

    // Spend AP, stamina, and mana
    this.apManager.spend(apCost);
    this.addStamina(attackerId, fatCost);
    if (weapon.manaCost > 0) this.spendMana(attackerId, weapon.manaCost);

    this.awardCPIfPlayer(attackerId, CP_PER_ACTION);

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

    this.onAttackResult?.(result, attackerId, defenderId, skill?.name);

    if (!result.hit) {
      this.fireOnDodgePassives(defenderId, attackerId, skill?.name ?? "melee");
    }

    // Notify about applied status effects
    for (const eff of result.appliedEffects) {
      this.onStatusApplied?.(defenderId, eff);
    }

    if (result.targetKilled) {
      this.handleDeath(defenderId, attackerId);
      this.triggerAllyMoraleChecks(defenderId);
      this.triggerEnemyKillBoost(attackerId);
      this.fireOnKillPassives(attackerId, defenderId);
    } else if (result.hit) {
      const moraleResult = this.morale.onHeavyDamage(this.world, defenderId, result.hpDamage);
      if (moraleResult) {
        this.onMoraleChange?.(moraleResult);
        if (moraleResult.newState === "fleeing") {
          this.statusEffects.apply(this.world, defenderId, "fleeing");
        }
      }
      if (result.hpDamage > 0) {
        this.fireOnTakeDamagePassives(defenderId, attackerId, result.hpDamage);
      }
    }

    this.pendingContinuation = () => {
      if (!this.checkBattleEnd()) {
        this.recalculateAndContinue(attackerId);
      }
    };

    this.onActionComplete?.();
  }

  /** Execute a generated or ruleset ability through AbilityExecutor. */
  private executeGeneratedAbility(attackerId: EntityId, defenderId: EntityId, cs: CombatSkill): void {
    const ability = getExecutableAbility(cs)!;
    const weapon = this.getWeaponDef(attackerId);

    if (!this.apManager.canAfford(cs.apCost)) return;

    this.playerTurnState = "animating";
    this.apManager.spend(cs.apCost);
    this.addStamina(attackerId, cs.staminaCost);
    if (cs.manaCost > 0) this.spendMana(attackerId, cs.manaCost);
    this.undoInfo = null;

    this.awardCPIfPlayer(attackerId, CP_PER_ACTION);

    // HP self-cost (Phase 2)
    if (ability.cost.hpCost && ability.cost.hpCost > 0) {
      const attackerHealth = this.world.getComponent<HealthComponent>(attackerId, "health");
      if (attackerHealth) {
        attackerHealth.current = Math.max(1, attackerHealth.current - ability.cost.hpCost);
      }
    }

    // Custom resource costs (Phase 3)
    if (ability.cost.resourceCosts) {
      for (const [resId, amount] of Object.entries(ability.cost.resourceCosts)) {
        this.resourceManager?.modify(this.world, attackerId, resId, -amount, "ability_cost");
      }
    }

    let storedPosition: { q: number; r: number; elevation: number } | null = null;
    if (ability.returnToStoredPositionAfterExecute) {
      const pos = this.world.getComponent<PositionComponent>(attackerId, "position");
      if (pos) storedPosition = { q: pos.q, r: pos.r, elevation: pos.elevation };
    }

    let abilityResult: ReturnType<typeof this.abilityExecutor.execute>;
    if (ability.targeting.type === "tgt_all_allies" && !this.isEnemyEntity(attackerId)) {
      const allies = this.getPlayerUnits();
      abilityResult = {
        attackResults: [],
        appliedEffects: [],
        delayedEffects: [],
        apRefunded: 0,
        grantAp: 0,
      };
      for (const allyId of allies) {
        const r = this.abilityExecutor.execute(this.world, attackerId, allyId, ability, weapon);
        abilityResult.attackResults.push(...(r.attackResults ?? []));
        abilityResult.appliedEffects.push(...(r.appliedEffects ?? []));
        (abilityResult.delayedEffects ??= []).push(...(r.delayedEffects ?? []));
        abilityResult.apRefunded! += r.apRefunded ?? 0;
        abilityResult.grantAp = (abilityResult.grantAp ?? 0) + (r.grantAp ?? 0);
        for (const ar of r.attackResults ?? []) {
          this.onAttackResult?.(ar, attackerId, allyId, cs.name);
          if (!ar.hit) this.fireOnDodgePassives(allyId, attackerId, cs.name);
          else if (ar.hpDamage > 0) this.fireOnTakeDamagePassives(allyId, attackerId, ar.hpDamage);
        }
        for (const eff of r.appliedEffects ?? []) this.onStatusApplied?.(allyId, eff);
        const th = this.world.getComponent<HealthComponent>(allyId, "health");
        if (th && th.current <= 0) {
          this.handleDeath(allyId, attackerId);
          this.triggerAllyMoraleChecks(allyId);
          this.triggerEnemyKillBoost(attackerId);
          this.fireOnKillPassives(attackerId, allyId);
        }
      }
    } else {
      abilityResult = this.abilityExecutor.execute(this.world, attackerId, defenderId, ability, weapon);
    }

    const isAllAllies = ability.targeting.type === "tgt_all_allies" && !this.isEnemyEntity(attackerId);

    if (abilityResult.delayedEffects?.length) {
      for (const d of abilityResult.delayedEffects) {
        this.pendingDelayedEffects.push({ ...d, sourceEntityId: attackerId });
      }
    }

    // Apply AP refund from res_apRefund effects
    if (abilityResult.apRefunded && abilityResult.apRefunded > 0) {
      this.apManager.refund(abilityResult.apRefunded);
    }
    // Grant AP this turn (e.g. Overclock double AP — uncapped)
    if (abilityResult.grantAp && abilityResult.grantAp > 0) {
      this.apManager.addAp(abilityResult.grantAp);
    }

    // Track last ability used for combo chains (Phase 8)
    this._lastAbilityUsed.set(attackerId, ability.uid);

    // Custom resource generation (Phase 3)
    if (ability.cost.resourceGenerate) {
      for (const [resId, amount] of Object.entries(ability.cost.resourceGenerate)) {
        this.resourceManager?.modify(this.world, attackerId, resId, amount, "ability_generate");
      }
    }

    if (!isAllAllies) {
      // Notify UI about each attack result; emit dodge and fire on-dodge/on-take-damage passives
      for (const ar of abilityResult.attackResults) {
        this.onAttackResult?.(ar, attackerId, defenderId, cs.name);
        if (!ar.hit) {
          this.fireOnDodgePassives(defenderId, attackerId, cs.name);
        } else if (ar.hpDamage > 0) {
          this.fireOnTakeDamagePassives(defenderId, attackerId, ar.hpDamage);
        }
      }
      for (const eff of abilityResult.appliedEffects) {
        this.onStatusApplied?.(defenderId, eff);
      }
      if (abilityResult.stanceActivated) {
        this.onStanceActivated?.(attackerId, abilityResult.stanceActivated);
      }
    }

    // Start cooldown
    if (ability.cost.cooldown > 0) {
      this.startAbilityCooldown(attackerId, ability.uid, ability.cost.cooldown);
    }

    if (!isAllAllies) {
      // Check kills
      const targetHealth = this.world.getComponent<HealthComponent>(defenderId, "health");
      if (targetHealth && targetHealth.current <= 0) {
        this.handleDeath(defenderId, attackerId);
        this.triggerAllyMoraleChecks(defenderId);
        this.triggerEnemyKillBoost(attackerId);
        this.fireOnKillPassives(attackerId, defenderId);
      } else {
        // Morale check from total damage
        const totalHpDmg = abilityResult.attackResults.reduce((sum, r) => sum + r.hpDamage, 0);
        if (totalHpDmg > 0) {
          const moraleResult = this.morale.onHeavyDamage(this.world, defenderId, totalHpDmg);
          if (moraleResult) {
            this.onMoraleChange?.(moraleResult);
            if (moraleResult.newState === "fleeing") {
              this.statusEffects.apply(this.world, defenderId, "fleeing");
            }
          }
        }
      }
    }

    if (ability.returnToStoredPositionAfterExecute && storedPosition) {
      this.setEntityPosition(attackerId, storedPosition.q, storedPosition.r, storedPosition.elevation);
    }

    this.pendingContinuation = () => {
      if (!this.checkBattleEnd()) {
        this.recalculateAndContinue(attackerId);
      }
    };

    this.onActionComplete?.();
  }

  /** Execute a stance skill (self-targeting) from a SkillDef. */
  private executeStance(entityId: EntityId, skill: SkillDef): void {
    const weapon = this.getWeaponDef(entityId);
    const apCost = this.getEffectiveAPCost(entityId, skill, weapon);
    const fatCost = skillStaminaCost(skill, weapon);

    if (!this.apManager.canAfford(apCost)) return;

    this.apManager.spend(apCost);
    this.addStamina(entityId, fatCost);
    this.undoInfo = null;

    if (skill.id === "spearwall") {
      this.skillExecutor.activateSpearwall(this.world, entityId);
    }

    this.onStanceActivated?.(entityId, skill.id);
    this.recalculateAndContinue(entityId);
  }

  /** Execute a stance from a CombatSkill (handles both static and generated). */
  private executeStanceCombatSkill(entityId: EntityId, cs: CombatSkill): void {
    if (cs.skillDef) {
      this.executeStance(entityId, cs.skillDef);
      return;
    }
    // Generated stance ability — spend AP/stamina/mana, activate stance
    if (!this.apManager.canAfford(cs.apCost)) return;
    this.apManager.spend(cs.apCost);
    this.addStamina(entityId, cs.staminaCost);
    if (cs.manaCost > 0) this.spendMana(entityId, cs.manaCost);
    this.undoInfo = null;
    // Generated stances handled by AbilityExecutor (Step 3)
    this.onStanceActivated?.(entityId, cs.id);
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

    // Check generated abilities
    const abilities = this.world.getComponent<AbilitiesComponent>(entityId, "abilities");
    const cooldowns = this.world.getComponent<AbilityCooldownsComponent>(entityId, "abilityCooldowns");
    if (abilities) {
      for (const uid of abilities.abilityIds) {
        const ability = resolveAbility(uid);
        if (!ability || ability.isPassive) continue;
        if (cooldowns && (cooldowns.cooldowns[uid] ?? 0) > 0) continue;
        if (ability.weaponReq.length > 0 && !ability.weaponReq.includes(weapon.family)) continue;
        if (!this.apManager.canAfford(ability.cost.ap)) continue;
        const cs = wrapGeneratedAbility(ability, weapon);
        if (cs.targetType === "self") return true;
        if (cs.targetType === "enemy") {
          // Check if any enemy in range
          const range = cs.range;
          for (const n of hexNeighbors(pos.q, pos.r)) {
            const tile = this.grid.get(n.q, n.r);
            if (!tile?.occupant || tile.occupant === entityId) continue;
            if (!this.isEnemyEntity(tile.occupant)) continue;
            const health = this.world.getComponent<HealthComponent>(tile.occupant, "health");
            if (health && health.current > 0 && hexDistance(pos, { q: n.q, r: n.r }) <= range) return true;
          }
        }
      }
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

  /** Apply all delayed effects scheduled for end of this entity's turn (e.g. Overclock self-stun). */
  private processDelayedEffectsForEntity(entityId: EntityId): void {
    const toApply = this.pendingDelayedEffects.filter((e) => e.sourceEntityId === entityId);
    this.pendingDelayedEffects = this.pendingDelayedEffects.filter((e) => e.sourceEntityId !== entityId);
    for (const d of toApply) {
      const turns = (d.params.turns as number) ?? 1;
      switch (d.effectType) {
        case "cc_stun":
          this.statusEffects.apply(this.world, d.targetEntityId, "stun", turns);
          break;
        case "cc_root":
          this.statusEffects.apply(this.world, d.targetEntityId, "root", turns);
          break;
        case "cc_daze":
          this.statusEffects.apply(this.world, d.targetEntityId, "daze", turns);
          break;
        default:
          break;
      }
    }
  }

  /** End the current player unit's turn and advance. */
  private endPlayerUnitTurn(): void {
    if (this.selectedUnit) {
      this.processDelayedEffectsForEntity(this.selectedUnit);
      // Convert remaining AP to stamina recovery (1 AP → 2 stamina recovered)
      const leftoverAP = this.apManager.remaining;
      if (leftoverAP > 0) {
        const stamina = this.world.getComponent<StaminaComponent>(this.selectedUnit, "stamina");
        if (stamina) {
          const recovery = leftoverAP * 2;
          stamina.current = Math.max(0, stamina.current - recovery);
        }
      }
    }

    this.selectedUnit = null;
    this.selectedSkill = null;
    this.pendingSkill = null;
    this.moveRange = null;
    this.undoInfo = null;
    this.playerTurnState = "awaitingInput";

    this.advanceToNextTurn();
  }

  /** Process delayed effects for the current entity, advance turn order, begin next turn. */
  private advanceToNextTurn(): void {
    const entry = this.turnOrder.current();
    if (entry) this.processDelayedEffectsForEntity(entry.entityId);
    const newRound = this.turnOrder.advance();
    if (newRound) this.turnOrder.calculateOrder(this.world);
    this.beginCurrentTurn();
  }

  /** Begin the current unit's turn. */
  private beginCurrentTurn(): void {
    if (this.checkBattleEnd()) return;

    const entry = this.turnOrder.current();
    if (!entry) return;

    const entityId = entry.entityId;

    // Apply stamina/mana recovery at turn start
    this.applyStaminaRecovery(entityId);
    this.applyManaRecovery(entityId);

    // Clear expired stances
    this.skillExecutor.clearStances(this.world, entityId);

    // Tick ability cooldowns
    this.tickAbilityCooldowns(entityId);

    // Fire turn-start passives (grants applied below for player, after reset)
    const turnStartOut = this.passiveResolver.onTurnStart(this.world, entityId);
    for (const pr of turnStartOut.results) {
      this.onPassiveTriggered?.(entityId, pr.abilityName, pr.effect);
    }

    // Refresh auras (R3: caster-centered radius effects)
    refreshAuras(this.world, this.grid, this.statusEffects, (id) => this.isEnemyEntity(id));

    // Passive morale recovery
    this.morale.passiveRecovery(this.world, entityId);

    // Tick class resources (regen, decay)
    this.resourceManager.tickTurnStart(this.world, entityId);

    // Tick status effects (bleed damage, duration countdown)
    const bleedResult = this.statusEffects.tickTurnStart(this.world, entityId);
    if (bleedResult) {
      this.onBleedTick?.(bleedResult);
      if (bleedResult.killed) {
        this.handleDeath(entityId);
        this.pendingContinuation = () => {
          if (!this.checkBattleEnd()) {
            this.triggerAllyMoraleChecks(entityId);
            this.advanceToNextTurn();
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
        this.advanceToNextTurn();
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
      const reactionAp = this.reactionApByEntity.get(entityId) ?? 0;
      if (reactionAp > 0) {
        this.apManager.refund(reactionAp);
        this.reactionApByEntity.delete(entityId);
      }
      this.applyDazeAPPenalty(entityId);
      const apBonusPct = this.statusEffects.getApBonusPercent(this.world, entityId);
      if (apBonusPct > 0) {
        this.apManager.addAp(Math.floor(MAX_AP * apBonusPct / 100));
      }
      this.resetMPForUnit(entityId);
      const reactionMp = this.reactionMpByEntity.get(entityId) ?? 0;
      if (reactionMp > 0) {
        this.mpManager.add(reactionMp);
        this.reactionMpByEntity.delete(entityId);
      }
      this.applyTriggerGrants(entityId, turnStartOut.grants, true);
      this.calculateMoveRange(entityId);
      this.setPlayerState("awaitingInput");
    }
  }

  /** Reduce starting AP if the unit has a daze status with _apLoss modifier. */
  private applyDazeAPPenalty(entityId: EntityId): void {
    const statusComp = this.world.getComponent<StatusEffectsComponent>(entityId, "statusEffects");
    if (!statusComp) return;
    for (const eff of statusComp.effects) {
      if (eff.id === "daze" && eff.modifiers._apLoss) {
        this.apManager.spend(eff.modifiers._apLoss);
      }
    }
  }

  /** Apply passive stamina recovery at the start of a unit's turn. */
  private applyStaminaRecovery(entityId: EntityId): void {
    const stamina = this.world.getComponent<StaminaComponent>(entityId, "stamina");
    if (stamina) {
      stamina.current = Math.max(0, stamina.current - stamina.recoveryPerTurn);
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

  /**
   * Run the current player unit's turn using TacticalAI.
   * Called by DemoBattle when AI mode is active.
   */
  runPlayerTurnAsAI(): void {
    if (!this.selectedUnit || this.phase !== "playerTurn") return;
    const enemyIds = this.getEnemyUnits();
    const action = decideTacticalAction(this.world, this.grid, this.selectedUnit, enemyIds);
    this.executeEnemyAction(this.selectedUnit, action);
  }

  /** Execute a TacticalAI action for an enemy unit. */
  private executeEnemyAction(entityId: EntityId, action: TacticalAction): void {
    switch (action.type) {
      case "moveAndAttack": {
        if (!this.executeEnemyMove(entityId, action.path)) return; // died to ZoC or spearwall
        this.executeEnemyAttack(entityId, action.targetId, action.skill, action.combatSkill);
        break;
      }

      case "move": {
        this.executeEnemyMove(entityId, action.path);
        break;
      }

      case "attack": {
        this.executeEnemyAttack(entityId, action.targetId, action.skill, action.combatSkill);
        break;
      }

      case "activateStance": {
        if (action.combatSkill && getExecutableAbility(action.combatSkill)) {
          this.executeStanceCombatSkill(entityId, action.combatSkill);
        } else {
          this.executeStanceEnemy(entityId, action.skill);
        }
        break;
      }

      case "recover": {
        const stamina = this.world.getComponent<StaminaComponent>(entityId, "stamina");
        if (stamina) {
          const recovery = Math.floor(stamina.max * 0.5);
          stamina.current = Math.max(0, stamina.current - recovery);
        }
        break;
      }

      case "wait":
        break;
    }

    this.pendingContinuation = () => {
      if (!this.checkBattleEnd()) {
        this.advanceToNextTurn();
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
        this.handleDeath(entityId, zocAttacker);
        this.pendingContinuation = () => {
          if (!this.checkBattleEnd()) {
            this.advanceToNextTurn();
          }
        };
        this.onActionComplete?.();
        return false;
      }
    }

    const dest = path[path.length - 1]!;
    const fatCost = pathStaminaCost(this.grid, path, pos.q, pos.r);
    this.addStamina(entityId, fatCost);

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
          this.advanceToNextTurn();
        }
      };
      this.onActionComplete?.();
      return false;
    }

    return true;
  }

  /** Execute an enemy attack with morale/status handling. */
  private executeEnemyAttack(entityId: EntityId, targetId: EntityId, skill?: SkillDef, combatSkill?: CombatSkill): void {
    if (combatSkill && getExecutableAbility(combatSkill)) {
      this.executeGeneratedAbility(entityId, targetId, combatSkill);
      return;
    }

    const weapon = this.getWeaponDef(entityId);
    const useSkill = skill ?? BASIC_ATTACK;
    const fatCost = skillStaminaCost(useSkill, weapon);
    this.addStamina(entityId, fatCost);
    if (weapon.manaCost > 0) this.spendMana(entityId, weapon.manaCost);

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
    this.onAttackResult?.(result, entityId, targetId, useSkill.name);
    if (!result.hit) {
      this.fireOnDodgePassives(targetId, entityId, useSkill.name);
    }
    for (const eff of result.appliedEffects) {
      this.onStatusApplied?.(targetId, eff);
    }
    if (result.targetKilled) {
      this.handleDeath(targetId, entityId);
      this.triggerAllyMoraleChecks(targetId);
      this.triggerEnemyKillBoost(entityId);
      this.fireOnKillPassives(entityId, targetId);
    } else if (result.hit) {
      const mr = this.morale.onHeavyDamage(this.world, targetId, result.hpDamage);
      if (mr) {
        this.onMoraleChange?.(mr);
        if (mr.newState === "fleeing") {
          this.statusEffects.apply(this.world, targetId, "fleeing");
        }
      }
      if (result.hpDamage > 0) {
        this.fireOnTakeDamagePassives(targetId, entityId, result.hpDamage);
      }
    }
  }

  /** Execute a stance skill for an enemy unit. */
  private executeStanceEnemy(entityId: EntityId, skill: SkillDef): void {
    const weapon = this.getWeaponDef(entityId);
    this.addStamina(entityId, skillStaminaCost(skill, weapon));

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
      const fleeClassDef = cc ? getClassDefOptional(cc.classId) : undefined;
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
        this.advanceToNextTurn();
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
    const classDef = cc ? getClassDefOptional(cc.classId) : undefined;
    const armorMPReduction = classDef ? getClassArmorMPReduction(classDef) : 0;
    const baseMP = stats?.movementPoints ?? DEFAULT_MP;
    const effectiveMP = getEffectiveMP(baseMP, armor?.body?.id, armor?.head?.id, equip?.offHand ?? undefined, armorMPReduction);
    this.mpManager.resetForTurn(effectiveMP);
  }

  private getWeaponDef(entityId: EntityId): WeaponDef {
    const equip = this.world.getComponent<EquipmentComponent>(entityId, "equipment");
    return equip?.mainHand ? resolveWeapon(equip.mainHand) : UNARMED;
  }

  /** Get effective AP cost for a skill, applying class discount. Min 1 AP. */
  private getEffectiveAPCost(entityId: EntityId, skill: SkillDef, weapon: WeaponDef): number {
    const base = skillAPCost(skill, weapon);
    const cc = this.world.getComponent<CharacterClassComponent>(entityId, "characterClass");
    if (!cc) return base;
    const classDef = getClassDefOptional(cc.classId);
    if (!classDef) return base;
    const discount = getClassAPDiscount(classDef, weapon, skill.rangeType);
    return Math.max(1, base - discount);
  }

  /** Public: get effective AP cost for the selected unit's pending/active skill. */
  getSkillAPCost(skill: SkillDef): number {
    if (!this.selectedUnit) return skillAPCost(skill, UNARMED);
    const weapon = this.getWeaponDef(this.selectedUnit);
    return this.getEffectiveAPCost(this.selectedUnit, skill, weapon);
  }

  /** Public: get AP cost for a CombatSkill. */
  getCombatSkillAPCost(cs: CombatSkill): number {
    if (getExecutableAbility(cs) || !cs.skillDef) return cs.apCost;
    return this.getSkillAPCost(cs.skillDef);
  }

  private getWeaponAPCost(entityId: EntityId): number {
    const equip = this.world.getComponent<EquipmentComponent>(entityId, "equipment");
    const weapon = equip?.mainHand ? resolveWeapon(equip.mainHand) : UNARMED;
    return weapon.apCost;
  }

  private getWeaponStaminaCost(entityId: EntityId): number {
    const equip = this.world.getComponent<EquipmentComponent>(entityId, "equipment");
    const weapon = equip?.mainHand ? resolveWeapon(equip.mainHand) : UNARMED;
    return weapon.staminaCost;
  }

  private getWeaponRange(entityId: EntityId): number {
    const equip = this.world.getComponent<EquipmentComponent>(entityId, "equipment");
    const weapon = equip?.mainHand ? resolveWeapon(equip.mainHand) : UNARMED;
    return weapon.range;
  }

  private addStamina(entityId: EntityId, amount: number): void {
    const stamina = this.world.getComponent<StaminaComponent>(entityId, "stamina");
    if (stamina) {
      stamina.current = Math.max(0, Math.min(stamina.max, stamina.current + amount));
    }
  }

  /** Spend mana (positive = spend, negative = recover). */
  private spendMana(entityId: EntityId, amount: number): void {
    const mana = this.world.getComponent<ManaComponent>(entityId, "mana");
    if (mana) {
      mana.current = Math.max(0, Math.min(mana.max, mana.current - amount));
    }
  }

  /** Recover mana at turn start. */
  private applyManaRecovery(entityId: EntityId): void {
    const mana = this.world.getComponent<ManaComponent>(entityId, "mana");
    if (mana) {
      mana.current = Math.min(mana.max, mana.current + mana.recoveryPerTurn);
    }
  }

  /** Decrement ability cooldowns by 1 at turn start, removing entries at 0. */
  private tickAbilityCooldowns(entityId: EntityId): void {
    const cd = this.world.getComponent<AbilityCooldownsComponent>(entityId, "abilityCooldowns");
    if (!cd) return;
    for (const uid of Object.keys(cd.cooldowns)) {
      cd.cooldowns[uid] = (cd.cooldowns[uid] ?? 1) - 1;
      if (cd.cooldowns[uid]! <= 0) {
        delete cd.cooldowns[uid];
      }
    }
  }

  /** Start cooldown for an ability after use. */
  startAbilityCooldown(entityId: EntityId, abilityUid: string, turns: number): void {
    if (turns <= 0) return;
    let cd = this.world.getComponent<AbilityCooldownsComponent>(entityId, "abilityCooldowns");
    if (!cd) {
      this.world.addComponent(entityId, { type: "abilityCooldowns" as const, cooldowns: {} });
      cd = this.world.getComponent<AbilityCooldownsComponent>(entityId, "abilityCooldowns")!;
    }
    cd.cooldowns[abilityUid] = turns;
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

  /** Fire on-kill passives for the killer and refund AP. */
  private fireOnKillPassives(killerId: EntityId, killedId: EntityId): void {
    const { results, grants } = this.passiveResolver.onKill(this.world, killerId, killedId);
    const isCurrent = this.turnOrder.current()?.entityId === killerId;
    this.applyTriggerGrants(killerId, grants, isCurrent);
    for (const pr of results) {
      this.onPassiveTriggered?.(killerId, pr.abilityName, pr.effect);
    }
  }

  /** Emit damage:dodged and fire on-dodge passives for the defender who dodged. */
  private fireOnDodgePassives(dodgerId: EntityId, attackerId: EntityId, source: string): void {
    this.eventBus.emit("damage:dodged", { attackerId, dodgerId, source });
    const { results, grants } = this.passiveResolver.onDodge(this.world, dodgerId, attackerId);
    const isCurrent = this.turnOrder.current()?.entityId === dodgerId;
    this.applyTriggerGrants(dodgerId, grants, isCurrent);
    for (const pr of results) {
      this.onPassiveTriggered?.(dodgerId, pr.abilityName, pr.effect);
    }
  }

  /** Fire on-take-damage passives (reflect, root attacker, etc.) and apply reflected damage. */
  private fireOnTakeDamagePassives(victimId: EntityId, attackerId: EntityId, hpDamage: number): void {
    const reactive = this.passiveResolver.onDamageTaken(this.world, victimId, hpDamage, attackerId);
    for (const pr of reactive.results) {
      this.onPassiveTriggered?.(victimId, pr.abilityName, pr.effect);
    }
    if (reactive.reflectDamage > 0) {
      const attackerHealth = this.world.getComponent<HealthComponent>(attackerId, "health");
      if (attackerHealth) {
        attackerHealth.current = Math.max(0, attackerHealth.current - reactive.reflectDamage);
        if (attackerHealth.current <= 0) {
          this.handleDeath(attackerId, victimId);
        }
      }
    }
  }

  private handleDeath(entityId: EntityId, killerId?: EntityId): void {
    if (this.isEnemyEntity(entityId)) {
      this._killCount++;
      // Track kill for CP if a player unit made the kill
      if (killerId && !this.isEnemyEntity(killerId)) {
        trackKill(this._actionTracker, killerId);
      }
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
      const classDef = getClassDefOptional(cc.classId);
      if (classDef) {
        if (slot === "mainHand") {
          try {
            const weaponDef = resolveWeapon(bagItemId);
            if (!canEquipWeapon(classDef, weaponDef)) return false;
          } catch { /* not a weapon — skip */ }
        } else if (slot === "offHand") {
          const shieldDef = resolveShield(bagItemId);
          if (shieldDef && !canEquipShield(classDef, shieldDef)) return false;
        }
      }
    }

    const oldItem = equip[slot];
    equip[slot] = bagItemId ?? null;
    if (oldItem) {
      equip.bag[bagIndex] = oldItem;
    } else {
      equip.bag.splice(bagIndex, 1);
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
