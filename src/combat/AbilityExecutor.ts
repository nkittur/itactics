import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { GeneratedAbility, EffectPrimitive, EffectType } from "@data/AbilityData";
import type { WeaponDef } from "@data/WeaponData";
import { UNARMED } from "@data/WeaponData";
import { resolveWeapon } from "@data/ItemResolver";
import type { EquipmentComponent } from "@entities/components/Equipment";
import type { HealthComponent } from "@entities/components/Health";
import type { PositionComponent } from "@entities/components/Position";
import type { HexGrid } from "@hex/HexGrid";
import { hexDirection, hexDistance, hexNeighbors } from "@hex/HexMath";
import { DamageCalculator, type AttackResult } from "./DamageCalculator";
import type { StatusEffectManager } from "./StatusEffectManager";
import { SkillExecutor } from "./SkillExecutor";
import { RNG } from "@utils/RNG";
import { BASIC_ATTACK, type SkillDef } from "@data/SkillData";
import type { ZoneManager } from "./ZoneManager";
import type { SummonManager } from "./SummonManager";
import type { TransformationManager } from "./TransformationManager";
import type { ResourceManager } from "./ResourceManager";
import type { EventBus } from "@core/EventBus";
import type { AbilityCooldownsComponent } from "@entities/components/AbilityCooldowns";
import { resetCooldowns, reduceCooldowns } from "@entities/components/AbilityCooldowns";
import type { ActiveStancesComponent } from "@entities/components/ActiveStances";

/** One delayed effect to apply at end of caster's turn (e.g. Overclock self-stun). */
export interface DelayedEffect {
  targetEntityId: EntityId;
  effectType: EffectType;
  params: Record<string, number | string>;
}

/** Result of executing a generated ability. */
export interface AbilityResult {
  attackResults: AttackResult[];
  appliedEffects: string[];
  stanceActivated?: string;
  pushed?: { entityId: EntityId; toQ: number; toR: number };
  apRefunded?: number;
  summoned?: EntityId;
  zoneCreated?: string;
  /** Effects to apply at end of caster's turn (e.g. "then 1 turn self-stun"). */
  delayedEffects?: DelayedEffect[];
  /** Grant this many AP to caster this turn (uncapped, for e.g. Overclock double AP). */
  grantAp?: number;
}

/** Preview for a generated ability (non-destructive). */
export interface AbilityPreview {
  estimatedDamage: [number, number]; // [min, max]
  hitChance: number;
  effects: string[];
}

/** Optional managers that can be injected after construction. */
export interface AbilityExecutorManagers {
  zoneManager?: ZoneManager;
  summonManager?: SummonManager;
  transformationManager?: TransformationManager;
  resourceManager?: ResourceManager;
  eventBus?: EventBus;
}

/**
 * Core ability execution engine.
 * Processes a GeneratedAbility effect-by-effect.
 */
export class AbilityExecutor {
  private managers: AbilityExecutorManagers = {};

  constructor(
    private rng: RNG,
    private damageCalc: DamageCalculator,
    private statusEffects: StatusEffectManager,
    private skillExecutor: SkillExecutor,
    private grid: HexGrid,
  ) {}

  /** Inject optional managers for new effect types. */
  setManagers(managers: AbilityExecutorManagers): void {
    this.managers = { ...this.managers, ...managers };
  }

  /** Execute a generated ability's effects. */
  execute(
    world: World,
    attackerId: EntityId,
    targetId: EntityId,
    ability: GeneratedAbility,
    weapon: WeaponDef,
  ): AbilityResult {
    const result: AbilityResult = {
      attackResults: [],
      appliedEffects: [],
    };

    // Check synergy exploit bonuses
    const exploitBonus = this.calculateExploitBonus(world, targetId, ability);

    for (const effect of ability.effects) {
      this.executeEffect(world, attackerId, targetId, effect, ability, weapon, result, exploitBonus);
    }

    // Process triggers (immediate ones only — event-driven triggers handled by TriggerSystem)
    for (const trigger of ability.triggers) {
      if (trigger.triggeredEffect) {
        // trg_onHit: fire on successful hit
        if (trigger.type === "trg_onHit" && result.attackResults.some(r => r.hit)) {
          this.executeEffect(world, attackerId, targetId, trigger.triggeredEffect, ability, weapon, result, 0);
        }
        // trg_onKill: fire if target killed
        if (trigger.type === "trg_onKill" && result.attackResults.some(r => r.targetKilled)) {
          this.executeEffect(world, attackerId, attackerId, trigger.triggeredEffect, ability, weapon, result, 0);
        }
        // trg_onAllyDeath and trg_onSummonDeath are event-driven, handled by TriggerSystem
      }
    }

    // Post-process: heal_pctDmg (legacy lifesteal)
    const healEffect = ability.effects.find(e => e.type === "heal_pctDmg");
    if (healEffect) {
      const pct = (healEffect.params.pct as number) ?? 30;
      const totalDmg = result.attackResults.reduce((sum, r) => sum + r.hpDamage, 0);
      if (totalDmg > 0) {
        const healAmt = Math.round(totalDmg * pct / 100);
        const attackerHealth = world.getComponent<HealthComponent>(attackerId, "health");
        if (attackerHealth) {
          attackerHealth.current = Math.min(attackerHealth.max, attackerHealth.current + healAmt);
          result.appliedEffects.push(`heal_${healAmt}`);
        }
      }
    }

    // Post-process: lifesteal (new)
    const lifestealEffect = ability.effects.find(e => e.type === "lifesteal");
    if (lifestealEffect) {
      const pct = (lifestealEffect.params.pct as number) ?? 30;
      const totalDmg = result.attackResults.reduce((sum, r) => sum + r.hpDamage, 0);
      if (totalDmg > 0) {
        const healAmt = Math.round(totalDmg * pct / 100);
        const attackerHealth = world.getComponent<HealthComponent>(attackerId, "health");
        if (attackerHealth) {
          attackerHealth.current = Math.min(attackerHealth.max, attackerHealth.current + healAmt);
          result.appliedEffects.push(`lifesteal_${healAmt}`);
        }
      }
    }

    return result;
  }

  /** Preview ability damage and effects without executing. */
  preview(
    world: World,
    attackerId: EntityId,
    targetId: EntityId,
    ability: GeneratedAbility,
    weapon: WeaponDef,
  ): AbilityPreview {
    const effects: string[] = [];
    let minDmg = 0;
    let maxDmg = 0;
    let hitChance = 75;

    for (const effect of ability.effects) {
      switch (effect.type) {
        case "dmg_weapon":
        case "dmg_execute":
        case "dmg_multihit": {
          const hits = effect.type === "dmg_multihit" ? ((effect.params.hits as number) ?? 2) : 1;
          const mult = effect.type === "dmg_multihit"
            ? ((effect.params.multPerHit as number) ?? 0.5)
            : ((effect.params.multiplier as number) ?? (effect.params.mult as number) ?? 1.0);
          minDmg += Math.floor(weapon.minDamage * mult * hits);
          maxDmg += Math.floor(weapon.maxDamage * mult * hits);
          const preview = this.damageCalc.previewMelee(world, attackerId, targetId);
          hitChance = preview.hitChance;
          break;
        }
        case "dot_bleed": effects.push("Bleed"); break;
        case "cc_stun": effects.push("Stun"); break;
        case "cc_root": effects.push("Root"); break;
        case "cc_daze": effects.push("Daze"); break;
        case "cc_fear": effects.push("Fear"); break;
        case "cc_silence": effects.push("Silence"); break;
        case "cc_taunt": effects.push("Taunt"); break;
        case "cc_charm": effects.push("Charm"); break;
        case "disp_push": effects.push("Push"); break;
        case "disp_pull": effects.push("Pull"); break;
        case "disp_dash": effects.push("Dash"); break;
        case "disp_teleport": effects.push("Teleport"); break;
        case "debuff_stat": effects.push(`Debuff ${effect.params.stat}`); break;
        case "debuff_vuln": effects.push("Vulnerable"); break;
        case "debuff_armor": effects.push("Armor Break"); break;
        case "debuff_healReduce": effects.push("Heal Reduction"); break;
        case "buff_stat": effects.push(`Buff ${effect.params.stat}`); break;
        case "buff_dmgReduce": effects.push("Damage Reduction"); break;
        case "buff_stealth": effects.push("Stealth"); break;
        case "buff_shield": effects.push(`Shield ${effect.params.amount ?? 20}`); break;
        case "stance_counter": effects.push("Counter Stance"); break;
        case "stance_overwatch": effects.push("Overwatch"); break;
        case "res_apRefund": effects.push("AP Refund on Kill"); break;
        case "heal_flat": effects.push(`Heal ${effect.params.amount ?? 20}`); break;
        case "heal_hot": effects.push("Regen"); break;
        case "heal_pctDmg":
        case "lifesteal": {
          const pct = (effect.params.pct as number) ?? 30;
          effects.push(`Lifesteal ${pct}%`);
          break;
        }
        case "dmg_reflect": effects.push("Damage Reflect"); break;
        case "summon_unit": effects.push("Summon"); break;
        case "zone_persist": effects.push("Zone"); break;
        case "trap_place": effects.push("Trap"); break;
        case "channel_dmg": effects.push("Channel"); break;
        case "transform_state": effects.push("Transform"); break;
        case "cleanse": effects.push("Cleanse"); break;
        case "cooldown_reset": effects.push("Reset Cooldowns"); break;
      }
    }

    return { estimatedDamage: [minDmg, maxDmg], hitChance, effects };
  }

  /** Execute a single effect primitive. */
  private executeEffect(
    world: World,
    attackerId: EntityId,
    targetId: EntityId,
    effect: EffectPrimitive,
    ability: GeneratedAbility,
    weapon: WeaponDef,
    result: AbilityResult,
    exploitBonus: number,
  ): void {
    if (effect.params && (effect.params as Record<string, unknown>).delay === "end_of_turn") {
      const { delay: _d, ...params } = effect.params as Record<string, number | string>;
      (result.delayedEffects ??= []).push({
        targetEntityId: targetId,
        effectType: effect.type,
        params: { ...params },
      });
      return;
    }
    switch (effect.type) {
      case "dmg_weapon":
        this.executeDmgWeapon(world, attackerId, targetId, effect, ability, weapon, result, exploitBonus);
        break;
      case "dmg_execute":
        this.executeDmgExecute(world, attackerId, targetId, effect, ability, weapon, result, exploitBonus);
        break;
      case "dmg_multihit":
        this.executeDmgMultihit(world, attackerId, targetId, effect, ability, weapon, result, exploitBonus);
        break;
      case "dmg_spell":
        this.executeDmgSpell(world, attackerId, targetId, effect, ability, weapon, result, exploitBonus);
        break;
      case "dot_bleed":
        this.executeDotBleed(world, attackerId, targetId, effect, result);
        break;
      case "dot_burn":
        this.executeDotBurn(world, attackerId, targetId, effect, result);
        break;
      case "dot_poison":
        this.executeDotPoison(world, attackerId, targetId, effect, result);
        break;
      case "disp_push":
        this.executeDispPush(world, attackerId, targetId, effect, result);
        break;
      case "cc_stun":
        this.executeCCStun(world, targetId, effect, result);
        break;
      case "cc_root":
        this.executeCCRoot(world, targetId, effect, result);
        break;
      case "cc_daze":
        this.executeCCDaze(world, targetId, effect, result);
        break;
      case "debuff_stat":
        this.executeDebuffStat(world, targetId, effect, result);
        break;
      case "debuff_vuln":
        this.executeDebuffVuln(world, targetId, effect, result);
        break;
      case "buff_stat":
        this.executeBuffStat(world, attackerId, effect, result);
        break;
      case "buff_dmgReduce":
        this.executeBuffDmgReduce(world, attackerId, effect, result);
        break;
      case "stance_counter":
        this.executeStanceCounter(world, attackerId, ability, result);
        break;
      case "stance_overwatch":
        this.executeStanceOverwatch(world, attackerId, ability, result);
        break;
      case "res_apRefund": {
        const apAmt = (effect.params.amount as number) ?? 2;
        result.apRefunded = (result.apRefunded ?? 0) + apAmt;
        result.appliedEffects.push(`ap_refund_${apAmt}`);
        break;
      }
      case "grant_ap": {
        const apAmt = (effect.params.amount as number) ?? 0;
        if (apAmt > 0) {
          result.grantAp = (result.grantAp ?? 0) + apAmt;
          result.appliedEffects.push(`grant_ap_${apAmt}`);
        }
        break;
      }
      case "apply_status": {
        const statusId = (effect.params.statusId as string) ?? "";
        const turns = (effect.params.turns as number) ?? 1;
        if (statusId) {
          this.statusEffects.apply(world, targetId, statusId, turns, attackerId);
          result.appliedEffects.push(`apply_status_${statusId}_${turns}`);
        }
        break;
      }
      case "apply_status_self": {
        const statusId = (effect.params.statusId as string) ?? "";
        const turns = (effect.params.turns as number) ?? 1;
        if (statusId) {
          this.statusEffects.apply(world, attackerId, statusId, turns, attackerId);
          result.appliedEffects.push(`apply_status_self_${statusId}_${turns}`);
        }
        break;
      }
      case "heal_pctDmg":
        // Deferred — processed after all damage effects in execute()
        break;
      case "lifesteal":
        // Deferred — processed after all damage effects in execute()
        break;

      // ── New Effect Handlers ──

      case "heal_flat":
        this.executeHealFlat(world, attackerId, targetId, effect, result);
        break;
      case "heal_hot":
        this.executeHealHot(world, targetId, effect, result);
        break;
      case "cc_fear":
        this.executeCCFear(world, targetId, effect, result);
        break;
      case "cc_silence":
        this.executeCCSilence(world, targetId, effect, result);
        break;
      case "cc_taunt":
        this.executeCCTaunt(world, attackerId, targetId, effect, result);
        break;
      case "cc_charm":
        this.executeCCCharm(world, targetId, effect, result);
        break;
      case "debuff_armor":
        this.executeDebuffArmor(world, targetId, effect, result);
        break;
      case "debuff_healReduce":
        this.executeDebuffHealReduce(world, targetId, effect, result);
        break;
      case "buff_stealth":
        this.executeBuffStealth(world, attackerId, effect, result);
        break;
      case "buff_shield":
        this.executeBuffShield(world, attackerId, effect, result);
        break;
      case "disp_teleport":
        this.executeDispTeleport(world, attackerId, targetId, effect, result);
        break;
      case "disp_dash":
        this.executeDispDash(world, attackerId, targetId, effect, ability, weapon, result);
        break;
      case "disp_pull":
        this.executeDispPull(world, attackerId, targetId, effect, result);
        break;
      case "dmg_reflect":
        this.executeDmgReflect(world, attackerId, effect, result);
        break;
      case "summon_unit":
        this.executeSummonUnit(world, attackerId, targetId, effect, result);
        break;
      case "zone_persist":
        this.executeZonePersist(world, attackerId, targetId, effect, result);
        break;
      case "trap_place":
        this.executeTrapPlace(world, attackerId, targetId, effect, result);
        break;
      case "channel_dmg":
        this.executeChannelDmg(world, attackerId, targetId, effect, result);
        break;
      case "transform_state":
        this.executeTransformState(world, attackerId, effect, result);
        break;
      case "cleanse":
        this.executeCleanse(world, attackerId, effect, result);
        break;
      case "cooldown_reset":
        this.executeCooldownReset(world, attackerId, effect, result);
        break;
    }
  }

  // ── Existing Effect Handlers ──

  private executeDmgWeapon(
    world: World, attackerId: EntityId, targetId: EntityId,
    effect: EffectPrimitive, ability: GeneratedAbility, weapon: WeaponDef,
    result: AbilityResult, exploitBonus: number,
  ): void {
    const mult = (effect.params.multiplier as number) ?? (effect.params.mult as number) ?? 1.0;
    const hitMod = (effect.params.hitChanceMod as number) ?? 0;

    // Build a synthetic SkillDef to delegate to DamageCalculator
    const syntheticSkill: SkillDef = {
      id: ability.uid,
      name: ability.name,
      weaponFamilies: [],
      apCost: 0,
      staminaExtra: 0,
      damageMultiplier: mult * (1 + exploitBonus),
      hitChanceModifier: hitMod,
      range: 0,
      targetType: "enemy",
      rangeType: "melee",
      isBasicAttack: false,
      isStance: false,
      description: ability.description,
      // Apply armor modifiers from ability modifiers
      ...this.getArmorOverrides(ability),
    };

    const attackResult = this.damageCalc.resolveSkillAttack(world, attackerId, targetId, syntheticSkill);
    result.attackResults.push(attackResult);
    result.appliedEffects.push(...attackResult.appliedEffects);
  }

  private executeDmgExecute(
    world: World, attackerId: EntityId, targetId: EntityId,
    effect: EffectPrimitive, ability: GeneratedAbility, weapon: WeaponDef,
    result: AbilityResult, exploitBonus: number,
  ): void {
    const baseMult = (effect.params.multiplier as number) ?? (effect.params.mult as number) ?? 1.0;
    const bonusMult = (effect.params.bonusMult as number) ?? 0.5;
    const rawThreshold = (effect.params.hpThreshold as number) ?? 50;
    // Generator stores threshold as percentage (e.g. 30 = 30%), normalize to 0-1
    const hpThreshold = rawThreshold > 1 ? rawThreshold / 100 : rawThreshold;

    const targetHealth = world.getComponent<HealthComponent>(targetId, "health");
    const hpPct = targetHealth ? targetHealth.current / targetHealth.max : 1;
    const executeBase = baseMult * (1 + exploitBonus);
    const executeMult = hpPct < hpThreshold ? executeBase + bonusMult * (1 - hpPct) : executeBase;

    const syntheticSkill: SkillDef = {
      id: ability.uid, name: ability.name, weaponFamilies: [],
      apCost: 0, staminaExtra: 0, damageMultiplier: executeMult,
      hitChanceModifier: 0, range: 0, targetType: "enemy", rangeType: "melee",
      isBasicAttack: false, isStance: false, description: ability.description,
      ...this.getArmorOverrides(ability),
    };

    const attackResult = this.damageCalc.resolveSkillAttack(world, attackerId, targetId, syntheticSkill);
    result.attackResults.push(attackResult);
    result.appliedEffects.push(...attackResult.appliedEffects);
  }

  private executeDmgMultihit(
    world: World, attackerId: EntityId, targetId: EntityId,
    effect: EffectPrimitive, ability: GeneratedAbility, weapon: WeaponDef,
    result: AbilityResult, exploitBonus: number,
  ): void {
    const hits = (effect.params.hits as number) ?? 2;
    const multPerHit = (effect.params.multPerHit as number) ?? 0.5;

    for (let i = 0; i < hits; i++) {
      const health = world.getComponent<HealthComponent>(targetId, "health");
      if (health && health.current <= 0) break;

      const syntheticSkill: SkillDef = {
        id: ability.uid, name: ability.name, weaponFamilies: [],
        apCost: 0, staminaExtra: 0, damageMultiplier: multPerHit * (1 + exploitBonus),
        hitChanceModifier: 0, range: 0, targetType: "enemy", rangeType: "melee",
        isBasicAttack: false, isStance: false, description: ability.description,
      };

      const attackResult = this.damageCalc.resolveSkillAttack(world, attackerId, targetId, syntheticSkill);
      result.attackResults.push(attackResult);
      result.appliedEffects.push(...attackResult.appliedEffects);
    }
  }

  private executeDotBleed(
    world: World, attackerId: EntityId, targetId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const dmgPerTurn = (effect.params.dmgPerTurn as number) ?? 8;
    const turns = (effect.params.turns as number) ?? 3;
    this.statusEffects.applyDynamic(world, targetId, {
      id: "bleed", name: "Bleeding", duration: turns,
      modifiers: {}, maxStacks: 5, dmgPerTurn, sourceId: attackerId,
    });
    result.appliedEffects.push("bleed");
  }

  /** Spell damage: uses weapon damage range but forces magical damage type. */
  private executeDmgSpell(
    world: World, attackerId: EntityId, targetId: EntityId,
    effect: EffectPrimitive, ability: GeneratedAbility, weapon: WeaponDef,
    result: AbilityResult, exploitBonus: number,
  ): void {
    const mult = (effect.params.multiplier as number) ?? 1.0;
    const hitMod = (effect.params.hitChanceMod as number) ?? 0;

    const syntheticSkill: SkillDef = {
      id: ability.uid,
      name: ability.name,
      weaponFamilies: [],
      apCost: 0,
      staminaExtra: 0,
      damageMultiplier: mult * (1 + exploitBonus),
      hitChanceModifier: hitMod,
      range: 0,
      targetType: "enemy",
      rangeType: "melee",
      isBasicAttack: false,
      isStance: false,
      description: ability.description,
      damageTypeOverride: "magical",
      ...this.getArmorOverrides(ability),
    };

    const attackResult = this.damageCalc.resolveSkillAttack(world, attackerId, targetId, syntheticSkill);
    result.attackResults.push(attackResult);
    result.appliedEffects.push(...attackResult.appliedEffects);
  }

  private executeDotBurn(
    world: World, attackerId: EntityId, targetId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const dmgPerTurn = (effect.params.dmgPerTurn as number) ?? 5;
    const turns = (effect.params.turns as number) ?? 2;
    this.statusEffects.applyDynamic(world, targetId, {
      id: "burn", name: "Burning", duration: turns,
      modifiers: {}, maxStacks: 3, dmgPerTurn, sourceId: attackerId,
    });
    result.appliedEffects.push("burn");
  }

  private executeDotPoison(
    world: World, attackerId: EntityId, targetId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const dmgPerTurn = (effect.params.dmgPerTurn as number) ?? 4;
    const turns = (effect.params.turns as number) ?? 3;
    const statReduce = (effect.params.statReduce as number) ?? 0;
    this.statusEffects.applyDynamic(world, targetId, {
      id: "poison", name: "Poisoned", duration: turns,
      modifiers: statReduce > 0 ? { meleeSkill: -statReduce } : {},
      maxStacks: 3, dmgPerTurn, sourceId: attackerId,
    });
    result.appliedEffects.push("poison");
  }

  private executeDispPush(
    world: World, attackerId: EntityId, targetId: EntityId,
    effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const attackerPos = world.getComponent<PositionComponent>(attackerId, "position");
    const targetPos = world.getComponent<PositionComponent>(targetId, "position");
    if (!attackerPos || !targetPos) return;

    const dir = hexDirection(attackerPos, targetPos);
    if (!dir) return;

    const distance = (effect.params.distance as number) ?? 1;

    for (let step = 0; step < distance; step++) {
      const destQ = targetPos.q + dir.dq;
      const destR = targetPos.r + dir.dr;
      const destTile = this.grid.get(destQ, destR);

      if (destTile && !destTile.occupant && destTile.movementCost < Infinity) {
        const oldTile = this.grid.get(targetPos.q, targetPos.r);
        if (oldTile) oldTile.occupant = null;
        destTile.occupant = targetId;
        targetPos.q = destQ;
        targetPos.r = destR;
        targetPos.elevation = destTile.elevation;
        result.pushed = { entityId: targetId, toQ: destQ, toR: destR };
      } else if (destTile?.occupant) {
        // Collision: 5 flat damage to both, stop pushing
        const targetHealth = world.getComponent<HealthComponent>(targetId, "health");
        const collisionHealth = world.getComponent<HealthComponent>(destTile.occupant, "health");
        if (targetHealth) targetHealth.current = Math.max(0, targetHealth.current - 5);
        if (collisionHealth) collisionHealth.current = Math.max(0, collisionHealth.current - 5);
        break;
      } else {
        // Blocked by impassable terrain or edge — stop pushing
        break;
      }
    }
  }

  private executeCCStun(
    world: World, targetId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const chance = (effect.params.chance as number) ?? 100;
    if (this.rng.roll(chance)) {
      this.statusEffects.apply(world, targetId, "stun");
      result.appliedEffects.push("stun");
    }
  }

  private executeCCRoot(
    world: World, targetId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const turns = (effect.params.turns as number) ?? 2;
    this.statusEffects.applyDynamic(world, targetId, {
      id: "root", name: "Rooted", duration: turns,
      modifiers: { movementPoints: -999 },
    });
    result.appliedEffects.push("root");
  }

  private executeCCDaze(
    world: World, targetId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const turns = (effect.params.turns as number) ?? 2;
    const apLoss = (effect.params.apLoss as number) ?? 1;
    this.statusEffects.applyDynamic(world, targetId, {
      id: "daze", name: "Dazed", duration: turns,
      modifiers: { _apLoss: apLoss },
    });
    result.appliedEffects.push("daze");
  }

  private executeDebuffStat(
    world: World, targetId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const stat = (effect.params.stat as string) ?? "meleeSkill";
    const amount = (effect.params.amount as number) ?? 10;
    const turns = (effect.params.turns as number) ?? 2;
    this.statusEffects.applyDynamic(world, targetId, {
      id: `debuff_${stat}`, name: `Weakened (${stat})`, duration: turns,
      modifiers: { [stat]: -amount },
    });
    result.appliedEffects.push(`debuff_${stat}`);
  }

  private executeDebuffVuln(
    world: World, targetId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const bonusDmg = (effect.params.bonusDmg as number) ?? 20;
    const turns = (effect.params.turns as number) ?? 2;
    this.statusEffects.applyDynamic(world, targetId, {
      id: "vulnerable", name: "Vulnerable", duration: turns,
      modifiers: { _bonusDmgPct: bonusDmg },
    });
    result.appliedEffects.push("vulnerable");
  }

  private executeBuffStat(
    world: World, entityId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const stat = (effect.params.stat as string) ?? "meleeSkill";
    const amount = (effect.params.amount as number) ?? 10;
    const turns = (effect.params.turns as number) ?? 2;
    this.statusEffects.applyDynamic(world, entityId, {
      id: `buff_${stat}`, name: `Empowered (${stat})`, duration: turns,
      modifiers: { [stat]: amount },
    });
    result.appliedEffects.push(`buff_${stat}`);
  }

  private executeBuffDmgReduce(
    world: World, entityId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const pct = (effect.params.percent as number) ?? (effect.params.pct as number) ?? 20;
    const turns = (effect.params.turns as number) ?? 2;
    this.statusEffects.applyDynamic(world, entityId, {
      id: "dmg_reduce", name: "Hardened", duration: turns,
      modifiers: { _reducePct: pct },
    });
    result.appliedEffects.push("dmg_reduce");
  }

  private executeStanceCounter(
    world: World, entityId: EntityId, ability: GeneratedAbility, result: AbilityResult,
  ): void {
    this.skillExecutor.activateStance(world, entityId, "counter", {
      skillId: ability.uid, turnsLeft: 1,
    });
    result.stanceActivated = "counter";
  }

  private executeStanceOverwatch(
    world: World, entityId: EntityId, ability: GeneratedAbility, result: AbilityResult,
  ): void {
    this.skillExecutor.activateStance(world, entityId, "overwatch", {
      skillId: ability.uid, turnsLeft: 1,
    });
    result.stanceActivated = "overwatch";
  }

  // ── New Effect Handlers (Phase 1) ──

  /** heal_flat: Direct HP restore by amount. */
  private executeHealFlat(
    world: World, attackerId: EntityId, targetId: EntityId,
    effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const amount = (effect.params.amount as number) ?? 20;
    // If targeting is self-targeted, heal attacker; otherwise heal target
    const healTarget = targetId === attackerId ? attackerId : targetId;
    const health = world.getComponent<HealthComponent>(healTarget, "health");
    if (health) {
      const prev = health.current;
      health.current = Math.min(health.max, health.current + amount);
      const healed = health.current - prev;
      result.appliedEffects.push(`heal_${healed}`);
      if (this.managers.eventBus) {
        this.managers.eventBus.emit("heal", {
          sourceId: attackerId, targetId: healTarget,
          amount: healed, overheal: Math.max(0, amount - healed),
        });
      }
    }
  }

  /** heal_hot: Apply regen status with periodic heal. */
  private executeHealHot(
    world: World, targetId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const healPerTurn = (effect.params.healPerTurn as number) ?? 10;
    const turns = (effect.params.turns as number) ?? 3;
    this.statusEffects.applyDynamic(world, targetId, {
      id: "regen", name: "Regeneration", duration: turns,
      modifiers: {}, healPerTick: healPerTurn,
    });
    result.appliedEffects.push("regen");
  }

  /** cc_fear: Apply fear status with fleeAI flag. */
  private executeCCFear(
    world: World, targetId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const turns = (effect.params.turns as number) ?? 2;
    const chance = (effect.params.chance as number) ?? 100;
    if (this.rng.roll(chance)) {
      this.statusEffects.apply(world, targetId, "fear", turns);
      result.appliedEffects.push("fear");
    }
  }

  /** cc_silence: Apply silence status. */
  private executeCCSilence(
    world: World, targetId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const turns = (effect.params.turns as number) ?? 2;
    const chance = (effect.params.chance as number) ?? 100;
    if (this.rng.roll(chance)) {
      this.statusEffects.apply(world, targetId, "silence", turns);
      result.appliedEffects.push("silence");
    }
  }

  /** cc_taunt: Apply taunt status (forces target to attack caster). */
  private executeCCTaunt(
    world: World, attackerId: EntityId, targetId: EntityId,
    effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const turns = (effect.params.turns as number) ?? 2;
    // Use the registered taunt status which has the taunted flag
    this.statusEffects.apply(world, targetId, "taunt", turns, attackerId);
    result.appliedEffects.push("taunt");
  }

  /** cc_charm: Apply charm status (target switches faction temporarily). */
  private executeCCCharm(
    world: World, targetId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const turns = (effect.params.turns as number) ?? 2;
    const chance = (effect.params.chance as number) ?? 100;
    if (this.rng.roll(chance)) {
      this.statusEffects.apply(world, targetId, "charm", turns);
      result.appliedEffects.push("charm");
    }
  }

  /** debuff_armor: Reduce target's armor by percentage. */
  private executeDebuffArmor(
    world: World, targetId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const pct = (effect.params.pct as number) ?? 30;
    const turns = (effect.params.turns as number) ?? 3;
    // Apply as a stat debuff to bonusArmor
    this.statusEffects.applyDynamic(world, targetId, {
      id: "armor_break", name: "Armor Break", duration: turns,
      modifiers: { bonusArmor: -Math.round(pct / 10) },
    });
    result.appliedEffects.push("armor_break");
  }

  /** debuff_healReduce: Reduce healing received by target. */
  private executeDebuffHealReduce(
    world: World, targetId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const pct = (effect.params.pct as number) ?? 50;
    const turns = (effect.params.turns as number) ?? 3;
    this.statusEffects.applyDynamic(world, targetId, {
      id: "heal_reduce", name: "Healing Reduced", duration: turns,
      modifiers: { _healReduction: pct },
    });
    result.appliedEffects.push("heal_reduce");
  }

  /** buff_stealth: Apply stealth (invisible flag, breaks on attack). */
  private executeBuffStealth(
    world: World, entityId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const turns = (effect.params.turns as number) ?? 99;
    this.statusEffects.apply(world, entityId, "stealth", turns);
    result.appliedEffects.push("stealth");
  }

  /** buff_shield: Apply a damage-absorbing shield. */
  private executeBuffShield(
    world: World, entityId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const amount = (effect.params.amount as number) ?? 20;
    const turns = (effect.params.turns as number) ?? 3;
    // Apply shield status and store the shield amount in modifiers
    this.statusEffects.applyDynamic(world, entityId, {
      id: "shield", name: "Shielded", duration: turns,
      modifiers: { _shieldAmount: amount },
    });
    result.appliedEffects.push(`shield_${amount}`);
  }

  /** disp_teleport: Move entity to target hex, or a random empty tile within range. When targetId is provided (e.g. Flicker Strike), prefer empty hex adjacent to target. */
  private executeDispTeleport(
    world: World, entityId: EntityId, targetId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const targetQ = (effect.params.targetQ as number);
    const targetR = (effect.params.targetR as number);
    const range = (effect.params.range as number) ?? 3;

    const pos = world.getComponent<PositionComponent>(entityId, "position");
    if (!pos) return;

    let destQ = pos.q;
    let destR = pos.r;

    if (targetQ != null && targetR != null) {
      destQ = targetQ;
      destR = targetR;
    } else {
      let found = false;
      if (targetId !== entityId) {
        const targetPos = world.getComponent<PositionComponent>(targetId, "position");
        if (targetPos) {
          const neighbors = hexNeighbors(targetPos.q, targetPos.r);
        const emptyAdjacent = neighbors.filter((n) => {
          const tile = this.grid.get(n.q, n.r);
          return tile && !tile.occupant && tile.movementCost < Infinity;
        });
        if (emptyAdjacent.length > 0) {
          const pick = emptyAdjacent[Math.floor(this.rng.nextFloat() * emptyAdjacent.length)]!;
          destQ = pick.q;
          destR = pick.r;
          found = true;
        }
        }
      }
      if (!found) {
        const candidates: { q: number; r: number }[] = [];
        for (let dq = -range; dq <= range; dq++) {
          for (let dr = Math.max(-range, -dq - range); dr <= Math.min(range, -dq + range); dr++) {
            const q = pos.q + dq;
            const r = pos.r + dr;
            if (dq === 0 && dr === 0) continue;
            const tile = this.grid.get(q, r);
            if (tile && !tile.occupant && tile.movementCost < Infinity) candidates.push({ q, r });
          }
        }
        if (candidates.length === 0) return;
        const pick = candidates[Math.floor(this.rng.nextFloat() * candidates.length)]!;
        destQ = pick.q;
        destR = pick.r;
      }
    }

    const destTile = this.grid.get(destQ, destR);
    if (!destTile || destTile.occupant) return;

    const oldQ = pos.q;
    const oldR = pos.r;

    // Free old tile
    const oldTile = this.grid.get(pos.q, pos.r);
    if (oldTile) oldTile.occupant = null;

    // Occupy new tile
    destTile.occupant = entityId;
    pos.q = destQ;
    pos.r = destR;
    pos.elevation = destTile.elevation;
    result.appliedEffects.push("teleport");

    if (this.managers.eventBus) {
      this.managers.eventBus.emit("movement:move", {
        entityId, fromQ: oldQ, fromR: oldR,
        toQ: destQ, toR: destR,
      });
    }
  }

  /** disp_dash: Move caster toward target, deal damage on arrival. */
  private executeDispDash(
    world: World, attackerId: EntityId, targetId: EntityId,
    effect: EffectPrimitive, ability: GeneratedAbility, weapon: WeaponDef,
    result: AbilityResult,
  ): void {
    const attackerPos = world.getComponent<PositionComponent>(attackerId, "position");
    const targetPos = world.getComponent<PositionComponent>(targetId, "position");
    if (!attackerPos || !targetPos) return;

    // Find the hex adjacent to target that's closest to attacker's current direction
    const dir = hexDirection(attackerPos, targetPos);
    if (!dir) return;

    const neighbors = hexNeighbors(targetPos.q, targetPos.r);
    let bestHex: { q: number; r: number } | null = null;
    let bestDist = Infinity;

    for (const n of neighbors) {
      const tile = this.grid.get(n.q, n.r);
      if (!tile || tile.occupant || tile.movementCost >= Infinity) continue;
      const dist = hexDistance(attackerPos, n);
      if (dist < bestDist) {
        bestDist = dist;
        bestHex = n;
      }
    }

    if (bestHex) {
      // Move attacker
      const oldTile = this.grid.get(attackerPos.q, attackerPos.r);
      if (oldTile) oldTile.occupant = null;
      const newTile = this.grid.get(bestHex.q, bestHex.r)!;
      newTile.occupant = attackerId;
      attackerPos.q = bestHex.q;
      attackerPos.r = bestHex.r;
      attackerPos.elevation = newTile.elevation;
      result.appliedEffects.push("dash");
    }

    // Deal damage on arrival
    const dmgMult = (effect.params.damageOnArrival as number) ?? (effect.params.mult as number) ?? 0.8;
    const syntheticSkill: SkillDef = {
      id: ability.uid, name: ability.name, weaponFamilies: [],
      apCost: 0, staminaExtra: 0, damageMultiplier: dmgMult,
      hitChanceModifier: 10, range: 0, targetType: "enemy", rangeType: "melee",
      isBasicAttack: false, isStance: false, description: ability.description,
    };
    const attackResult = this.damageCalc.resolveSkillAttack(world, attackerId, targetId, syntheticSkill);
    result.attackResults.push(attackResult);
    result.appliedEffects.push(...attackResult.appliedEffects);
  }

  /** disp_pull: Move target toward caster by N hexes. */
  private executeDispPull(
    world: World, attackerId: EntityId, targetId: EntityId,
    effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const attackerPos = world.getComponent<PositionComponent>(attackerId, "position");
    const targetPos = world.getComponent<PositionComponent>(targetId, "position");
    if (!attackerPos || !targetPos) return;

    const distance = (effect.params.distance as number) ?? 1;

    for (let step = 0; step < distance; step++) {
      // Recalculate direction each step since target position changes
      const dir = hexDirection(targetPos, attackerPos);
      if (!dir) break;

      const destQ = targetPos.q + dir.dq;
      const destR = targetPos.r + dir.dr;

      // Don't pull onto the caster's tile
      if (destQ === attackerPos.q && destR === attackerPos.r) break;

      const destTile = this.grid.get(destQ, destR);
      if (destTile && !destTile.occupant && destTile.movementCost < Infinity) {
        const oldTile = this.grid.get(targetPos.q, targetPos.r);
        if (oldTile) oldTile.occupant = null;
        destTile.occupant = targetId;
        targetPos.q = destQ;
        targetPos.r = destR;
        targetPos.elevation = destTile.elevation;
        result.appliedEffects.push("pull");
      } else {
        break; // Blocked
      }
    }
  }

  /** dmg_reflect: Apply a status that returns % damage to attackers. */
  private executeDmgReflect(
    world: World, entityId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const pct = (effect.params.pct as number) ?? 20;
    const turns = (effect.params.turns as number) ?? 3;
    this.statusEffects.applyDynamic(world, entityId, {
      id: "thorns", name: "Damage Reflect", duration: turns,
      modifiers: { _reflectPct: pct },
    });
    result.appliedEffects.push("thorns");
  }

  /** summon_unit: Spawn entity with SummonComponent + basic AI. */
  private executeSummonUnit(
    world: World, attackerId: EntityId, targetId: EntityId,
    effect: EffectPrimitive, result: AbilityResult,
  ): void {
    if (!this.managers.summonManager) return;

    const templateId = (effect.params.templateId as string) ?? "basic_summon";
    const targetPos = world.getComponent<PositionComponent>(targetId, "position");
    const attackerPos = world.getComponent<PositionComponent>(attackerId, "position");
    const pos = targetPos ?? attackerPos;
    if (!pos) return;

    const summonId = this.managers.summonManager.createSummon(
      world, attackerId, templateId, { q: pos.q, r: pos.r },
    );
    if (summonId) {
      result.summoned = summonId;
      result.appliedEffects.push(`summon_${templateId}`);
    }
  }

  /** zone_persist: Place a persistent zone on the battlefield. */
  private executeZonePersist(
    world: World, attackerId: EntityId, targetId: EntityId,
    effect: EffectPrimitive, result: AbilityResult,
  ): void {
    if (!this.managers.zoneManager) return;

    const zoneType = (effect.params.zoneType as string) ?? "fire_field";
    const radius = (effect.params.radius as number);
    const duration = (effect.params.turns as number) ?? (effect.params.duration as number);

    const targetPos = world.getComponent<PositionComponent>(targetId, "position");
    if (!targetPos) return;

    const zoneId = this.managers.zoneManager.createZone(
      zoneType, { q: targetPos.q, r: targetPos.r }, attackerId,
      radius, duration,
    );
    if (zoneId) {
      result.zoneCreated = zoneId;
      result.appliedEffects.push(`zone_${zoneType}`);
    }
  }

  /** trap_place: Place a hidden zone entity, triggers on enemy movement. */
  private executeTrapPlace(
    world: World, attackerId: EntityId, targetId: EntityId,
    effect: EffectPrimitive, result: AbilityResult,
  ): void {
    if (!this.managers.zoneManager) return;

    const trapType = (effect.params.trapType as string) ?? "fire_field";
    const duration = (effect.params.duration as number) ?? 10;

    const targetPos = world.getComponent<PositionComponent>(targetId, "position");
    const attackerPos = world.getComponent<PositionComponent>(attackerId, "position");
    const pos = targetPos ?? attackerPos;
    if (!pos) return;

    // Create a zone with 0 radius (single hex) and long duration
    const zoneId = this.managers.zoneManager.createZone(
      trapType, { q: pos.q, r: pos.r }, attackerId, 0, duration,
    );
    if (zoneId) {
      result.zoneCreated = zoneId;
      result.appliedEffects.push(`trap_${trapType}`);
    }
  }

  /** channel_dmg: Apply channeling status that deals damage each turn. */
  private executeChannelDmg(
    world: World, attackerId: EntityId, targetId: EntityId,
    effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const dmgPerTurn = (effect.params.dmgPerTurn as number) ?? 15;
    const turns = (effect.params.turns as number) ?? 3;

    // Apply a DoT-like status to the target representing channel damage
    this.statusEffects.applyDynamic(world, targetId, {
      id: "channel_dmg", name: "Channeled", duration: turns,
      modifiers: {}, dmgPerTurn, sourceId: attackerId,
    });
    result.appliedEffects.push("channel_dmg");
  }

  /** transform_state: Activate TransformationComponent with stat bonuses. */
  private executeTransformState(
    world: World, entityId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    if (!this.managers.transformationManager) return;

    const formId = (effect.params.formId as string) ?? "default_form";
    const duration = (effect.params.turns as number) ?? (effect.params.duration as number);

    const success = this.managers.transformationManager.transform(
      world, entityId, formId, duration,
    );
    if (success) {
      result.appliedEffects.push(`transform_${formId}`);
    }
  }

  /** cleanse: Remove debuffs from caster or target. */
  private executeCleanse(
    world: World, entityId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const tag = effect.params.tag as string | undefined;
    const count = (effect.params.count as number) ?? Infinity;
    const removed = this.statusEffects.cleanse(world, entityId, tag, count);
    if (removed > 0) {
      result.appliedEffects.push(`cleanse_${removed}`);
    }
  }

  /** cooldown_reset: Reset or reduce all ability cooldowns. */
  private executeCooldownReset(
    world: World, entityId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const comp = world.getComponent<AbilityCooldownsComponent>(entityId, "abilityCooldowns");
    if (!comp) return;
    const reduceBy = (effect.params.reduceBy as number);
    if (reduceBy != null) {
      reduceCooldowns(comp, reduceBy);
      result.appliedEffects.push(`cooldown_reduce_${reduceBy}`);
    } else {
      resetCooldowns(comp);
      result.appliedEffects.push("cooldown_reset");
    }
  }

  // ── Utility Methods ──

  /** Calculate bonus damage from exploiting target conditions. */
  private calculateExploitBonus(world: World, targetId: EntityId, ability: GeneratedAbility): number {
    const exploits = ability.synergyTags.exploits;
    if (exploits.length === 0) return 0;

    let bonus = 0;
    for (const condition of exploits) {
      switch (condition) {
        case "bleeding":
          if (this.statusEffects.hasEffect(world, targetId, "bleed")) bonus += 0.15;
          break;
        case "poisoned":
          if (this.statusEffects.hasEffect(world, targetId, "poison")) bonus += 0.15;
          break;
        case "burning":
          if (this.statusEffects.hasEffect(world, targetId, "burn")) bonus += 0.15;
          break;
        case "stunned":
          if (this.statusEffects.hasEffect(world, targetId, "stun")) bonus += 0.2;
          break;
        case "dazed":
          if (this.statusEffects.hasEffect(world, targetId, "daze")) bonus += 0.1;
          break;
        case "rooted":
          if (this.statusEffects.hasEffect(world, targetId, "root")) bonus += 0.15;
          break;
        case "displaced":
          // Target was recently pushed — check for a displacement marker
          if (this.statusEffects.hasEffect(world, targetId, "displaced")) bonus += 0.1;
          break;
        case "vulnerable":
          if (this.statusEffects.hasEffect(world, targetId, "vulnerable")) bonus += 0.15;
          break;
        case "cursed":
          if (this.statusEffects.hasEffect(world, targetId, "cursed")) bonus += 0.15;
          break;
        case "low_hp": {
          const health = world.getComponent<HealthComponent>(targetId, "health");
          if (health && health.current / health.max < 0.3) bonus += 0.2;
          break;
        }
        case "debuffed": {
          const debuffCount = this.statusEffects.countDebuffs(world, targetId);
          bonus += debuffCount * 0.05;
          break;
        }
        case "in_stance": {
          const stances = world.getComponent<ActiveStancesComponent>(targetId, "activeStances");
          if (stances && stances.stances.size > 0) bonus += 0.15;
          break;
        }
      }
    }

    return bonus;
  }

  /** Extract armor override modifiers from ability. */
  private getArmorOverrides(ability: GeneratedAbility): { armorIgnoreOverride?: number } {
    const overrides: { armorIgnoreOverride?: number } = {};
    for (const mod of ability.modifiers) {
      if (mod.type === "mod_armorIgnore") {
        overrides.armorIgnoreOverride = (mod.params.pct as number) ?? 0.5;
      }
    }
    return overrides;
  }
}
