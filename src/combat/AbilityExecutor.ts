import type { World } from "@entities/World";
import type { EntityId } from "@entities/Entity";
import type { GeneratedAbility, EffectPrimitive } from "@data/AbilityData";
import type { WeaponDef } from "@data/WeaponData";
import { UNARMED } from "@data/WeaponData";
import { resolveWeapon } from "@data/ItemResolver";
import type { EquipmentComponent } from "@entities/components/Equipment";
import type { HealthComponent } from "@entities/components/Health";
import type { PositionComponent } from "@entities/components/Position";
import type { HexGrid } from "@hex/HexGrid";
import { hexDirection } from "@hex/HexMath";
import { DamageCalculator, type AttackResult } from "./DamageCalculator";
import type { StatusEffectManager } from "./StatusEffectManager";
import { SkillExecutor } from "./SkillExecutor";
import { RNG } from "@utils/RNG";
import { BASIC_ATTACK, type SkillDef } from "@data/SkillData";

/** Result of executing a generated ability. */
export interface AbilityResult {
  attackResults: AttackResult[];
  appliedEffects: string[];
  stanceActivated?: string;
  pushed?: { entityId: EntityId; toQ: number; toR: number };
  apRefunded?: number;
}

/** Preview for a generated ability (non-destructive). */
export interface AbilityPreview {
  estimatedDamage: [number, number]; // [min, max]
  hitChance: number;
  effects: string[];
}

/**
 * Core ability execution engine.
 * Processes a GeneratedAbility effect-by-effect.
 */
export class AbilityExecutor {
  constructor(
    private rng: RNG,
    private damageCalc: DamageCalculator,
    private statusEffects: StatusEffectManager,
    private skillExecutor: SkillExecutor,
    private grid: HexGrid,
  ) {}

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

    // Process triggers
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
      }
    }

    // Post-process: heal_pctDmg (lifesteal)
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
          const mult = (effect.params.mult as number) ?? 1.0;
          const hits = effect.type === "dmg_multihit" ? ((effect.params.hits as number) ?? 2) : 1;
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
        case "disp_push": effects.push("Push"); break;
        case "debuff_stat": effects.push(`Debuff ${effect.params.stat}`); break;
        case "debuff_vuln": effects.push("Vulnerable"); break;
        case "buff_stat": effects.push(`Buff ${effect.params.stat}`); break;
        case "buff_dmgReduce": effects.push("Damage Reduction"); break;
        case "stance_counter": effects.push("Counter Stance"); break;
        case "stance_overwatch": effects.push("Overwatch"); break;
        case "res_apRefund": effects.push("AP Refund on Kill"); break;
        case "heal_pctDmg": {
          const pct = (effect.params.pct as number) ?? 30;
          effects.push(`Lifesteal ${pct}%`);
          break;
        }
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
    switch (effect.type) {
      case "dmg_weapon":
        this.executeDmgWeapon(world, attackerId, targetId, effect, ability, weapon, result, exploitBonus);
        break;
      case "dmg_execute":
        this.executeDmgExecute(world, attackerId, targetId, effect, ability, weapon, result);
        break;
      case "dmg_multihit":
        this.executeDmgMultihit(world, attackerId, targetId, effect, ability, weapon, result);
        break;
      case "dot_bleed":
        this.executeDotBleed(world, targetId, effect, result);
        break;
      case "disp_push":
        this.executeDispPush(world, attackerId, targetId, result);
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
      case "res_apRefund":
        // AP refund handled via passive/trigger system, not as direct effect
        break;
      case "heal_pctDmg":
        // Deferred — processed after all damage effects in execute()
        break;
    }
  }

  private executeDmgWeapon(
    world: World, attackerId: EntityId, targetId: EntityId,
    effect: EffectPrimitive, ability: GeneratedAbility, weapon: WeaponDef,
    result: AbilityResult, exploitBonus: number,
  ): void {
    const mult = (effect.params.mult as number) ?? 1.0;
    const hitMod = (effect.params.hitChanceMod as number) ?? 0;

    // Build a synthetic SkillDef to delegate to DamageCalculator
    const syntheticSkill: SkillDef = {
      id: ability.uid,
      name: ability.name,
      weaponFamilies: [],
      apCost: 0,
      fatigueExtra: 0,
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
    result: AbilityResult,
  ): void {
    const baseMult = (effect.params.mult as number) ?? 1.0;
    const bonusMult = (effect.params.bonusMult as number) ?? 0.5;
    const hpThreshold = (effect.params.hpThreshold as number) ?? 0.5;

    const targetHealth = world.getComponent<HealthComponent>(targetId, "health");
    const hpPct = targetHealth ? targetHealth.current / targetHealth.max : 1;
    const executeMult = hpPct < hpThreshold ? baseMult + bonusMult * (1 - hpPct) : baseMult;

    const syntheticSkill: SkillDef = {
      id: ability.uid, name: ability.name, weaponFamilies: [],
      apCost: 0, fatigueExtra: 0, damageMultiplier: executeMult,
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
    result: AbilityResult,
  ): void {
    const hits = (effect.params.hits as number) ?? 2;
    const multPerHit = (effect.params.multPerHit as number) ?? 0.5;

    for (let i = 0; i < hits; i++) {
      const health = world.getComponent<HealthComponent>(targetId, "health");
      if (health && health.current <= 0) break;

      const syntheticSkill: SkillDef = {
        id: ability.uid, name: ability.name, weaponFamilies: [],
        apCost: 0, fatigueExtra: 0, damageMultiplier: multPerHit,
        hitChanceModifier: 0, range: 0, targetType: "enemy", rangeType: "melee",
        isBasicAttack: false, isStance: false, description: ability.description,
      };

      const attackResult = this.damageCalc.resolveSkillAttack(world, attackerId, targetId, syntheticSkill);
      result.attackResults.push(attackResult);
      result.appliedEffects.push(...attackResult.appliedEffects);
    }
  }

  private executeDotBleed(
    world: World, targetId: EntityId, effect: EffectPrimitive, result: AbilityResult,
  ): void {
    const dmgPerTurn = (effect.params.dmgPerTurn as number) ?? 8;
    const turns = (effect.params.turns as number) ?? 3;
    this.statusEffects.applyDynamic(world, targetId, {
      id: "bleed", name: "Bleeding", duration: turns,
      modifiers: {}, maxStacks: 5, dmgPerTurn,
    });
    result.appliedEffects.push("bleed");
  }

  private executeDispPush(
    world: World, attackerId: EntityId, targetId: EntityId, result: AbilityResult,
  ): void {
    const attackerPos = world.getComponent<PositionComponent>(attackerId, "position");
    const targetPos = world.getComponent<PositionComponent>(targetId, "position");
    if (!attackerPos || !targetPos) return;

    const dir = hexDirection(attackerPos, targetPos);
    if (!dir) return;

    const destQ = targetPos.q + dir.dq;
    const destR = targetPos.r + dir.dr;
    const destTile = this.grid.get(destQ, destR);

    if (destTile && !destTile.occupant && destTile.movementCost < Infinity) {
      // Move target
      const oldTile = this.grid.get(targetPos.q, targetPos.r);
      if (oldTile) oldTile.occupant = null;
      destTile.occupant = targetId;
      targetPos.q = destQ;
      targetPos.r = destR;
      targetPos.elevation = destTile.elevation;
      result.pushed = { entityId: targetId, toQ: destQ, toR: destR };
    } else if (destTile?.occupant) {
      // Collision: 5 flat damage to both
      const targetHealth = world.getComponent<HealthComponent>(targetId, "health");
      const collisionHealth = world.getComponent<HealthComponent>(destTile.occupant, "health");
      if (targetHealth) targetHealth.current = Math.max(0, targetHealth.current - 5);
      if (collisionHealth) collisionHealth.current = Math.max(0, collisionHealth.current - 5);
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
    this.statusEffects.apply(world, targetId, "daze", turns);
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
    const pct = (effect.params.pct as number) ?? 20;
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
        case "stunned":
          if (this.statusEffects.hasEffect(world, targetId, "stun")) bonus += 0.2;
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
      }
    }

    return bonus;
  }

  /** Extract armor override modifiers from ability. */
  private getArmorOverrides(ability: GeneratedAbility): { armorIgnoreOverride?: number; armorDamageMultOverride?: number } {
    const overrides: { armorIgnoreOverride?: number; armorDamageMultOverride?: number } = {};
    for (const mod of ability.modifiers) {
      if (mod.type === "mod_armorIgnore") {
        overrides.armorIgnoreOverride = (mod.params.pct as number) ?? 0.5;
      }
      if (mod.type === "mod_armorDmg") {
        overrides.armorDamageMultOverride = (mod.params.mult as number) ?? 1.5;
      }
    }
    return overrides;
  }
}
