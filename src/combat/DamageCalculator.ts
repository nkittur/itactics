import type { World } from "@entities/World";
import type { HexGrid } from "@hex/HexGrid";
import type { EntityId } from "@entities/Entity";
import type { StatsComponent } from "@entities/components/Stats";
import type { HealthComponent } from "@entities/components/Health";
import type { EquipmentComponent } from "@entities/components/Equipment";
import type { ArmorComponent } from "@entities/components/Armor";
import type { PositionComponent } from "@entities/components/Position";
import { UNARMED, type WeaponDef, type DamageType } from "@data/WeaponData";
import { type ShieldDef } from "@data/ShieldData";
import { resolveWeapon, resolveShield } from "@data/ItemResolver";
import { BASIC_ATTACK, type SkillDef, skillRange } from "@data/SkillData";
import { hexDistance, hexNeighbors } from "@hex/HexMath";
import { hasLineOfSight } from "@hex/HexLineOfSight";
import { RNG } from "@utils/RNG";
import { clamp } from "@utils/MathUtils";
import type { StatusEffectManager } from "./StatusEffectManager";
import type { CharacterClassComponent } from "@entities/components/CharacterClass";
import { getClassHitBonus, getClassDamageBonus } from "@data/ClassData";
import { getClassDefOptional } from "@data/ClassData";

/** Maximum fraction of raw damage that armor can absorb. Guarantees minimum throughput. */
const MAX_ARMOR_ABSORB_PCT = 0.5;

export interface AttackPreview {
  hitChance: number;
  minDamage: number;
  maxDamage: number;
}

export interface HitChanceModifier {
  label: string;
  value: number;
}

export interface DetailedAttackPreview extends AttackPreview {
  modifiers: HitChanceModifier[];
  weaponName: string;
  damageType: DamageType;
  armorPiercing: number;
  critChance: number;
}

export interface AttackResult {
  hit: boolean;
  hitChance: number;
  /** Raw damage rolled from weapon (before armor reduction). */
  damage: number;
  damageType: DamageType;
  /** Whether this was a critical hit. */
  critical: boolean;
  /** Flat armor piercing applied. */
  armorPiercing: number;
  /** Damage absorbed by armor/magic resist. */
  armorReduction: number;
  /** Final damage dealt to HP. */
  hpDamage: number;
  targetKilled: boolean;
  /** Weapon used for this attack. */
  weaponId: string;
  /** Status effects applied on hit. */
  appliedEffects: string[];
}

/**
 * Weapon-based damage calculator.
 *
 * Damage pipeline:
 * 1. Roll hit chance (meleeSkill + weaponBonus - dodge - shieldDodge + elevation + surround)
 * 2. Roll raw damage between weapon min-max (+ class bonus)
 * 3. Critical hit: roll critChance + weapon.critChanceBonus; if crit, raw *= critMultiplier
 * 4. Calculate effective armor (physical: body+head+shield armor; magical: body+head magicResist + base MR)
 * 5. Apply armor piercing: flat first, then % ignore on remainder
 * 6. Cap armor reduction at MAX_ARMOR_ABSORB_PCT of raw damage (prevents armor from fully negating hits)
 * 7. HP damage = max(1, rawDamage - cappedReduction)
 * 8. Apply vulnerability/dmg_reduce modifiers
 */
export class DamageCalculator {
  private statusEffects: StatusEffectManager | null = null;

  constructor(
    private rng: RNG,
    private grid: HexGrid,
  ) {}

  /** Set the status effect manager (optional, enables effect application). */
  setStatusEffectManager(sem: StatusEffectManager): void {
    this.statusEffects = sem;
  }

  /** Resolve a melee attack between attacker and defender. */
  resolveMelee(
    world: World,
    attackerId: EntityId,
    defenderId: EntityId,
  ): AttackResult {
    const attackerStats = world.getComponent<StatsComponent>(attackerId, "stats");
    const defenderStats = world.getComponent<StatsComponent>(defenderId, "stats");
    const defenderHealth = world.getComponent<HealthComponent>(defenderId, "health");
    const attackerEquip = world.getComponent<EquipmentComponent>(attackerId, "equipment");
    const defenderEquip = world.getComponent<EquipmentComponent>(defenderId, "equipment");

    if (!attackerStats || !defenderStats || !defenderHealth) {
      return miss(0, "unarmed");
    }

    const weapon: WeaponDef = attackerEquip?.mainHand
      ? resolveWeapon(attackerEquip.mainHand)
      : UNARMED;

    const shield: ShieldDef | undefined = defenderEquip?.offHand
      ? resolveShield(defenderEquip.offHand)
      : undefined;

    // ── 1. Hit chance ──
    const attackerPos = world.getComponent<PositionComponent>(attackerId, "position");
    const defenderPos = world.getComponent<PositionComponent>(defenderId, "position");

    const shieldBonus = shield?.dodgeBonus ?? 0;

    const defenderTile = defenderPos ? this.grid.get(defenderPos.q, defenderPos.r) : undefined;
    const terrainDefBonus = defenderTile?.defenseBonusMelee ?? 0;

    const attackerElev = attackerPos?.elevation ?? 0;
    const defenderElev = defenderPos?.elevation ?? 0;
    const elevationMod = (attackerElev - defenderElev) * 10;

    const surroundBonus = defenderPos
      ? this.countSurroundBonus(world, attackerId, defenderId)
      : 0;

    // Class passives
    const attackerCC = world.getComponent<CharacterClassComponent>(attackerId, "characterClass");
    const attackerClassDef = attackerCC ? getClassDefOptional(attackerCC.classId) : undefined;
    const classHitBonus = attackerClassDef ? getClassHitBonus(attackerClassDef, weapon) : 0;
    const classDmgBonus = attackerClassDef ? getClassDamageBonus(attackerClassDef, weapon) : 0;

    // Status effect modifiers
    const attackerMeleeSkillMod = this.statusEffects
      ? this.statusEffects.getModifier(world, attackerId, "meleeSkill", attackerStats.meleeSkill)
      : 0;
    const defenderDodgeMod = this.statusEffects
      ? this.statusEffects.getModifier(world, defenderId, "dodge", defenderStats.dodge)
      : 0;

    const hitChance = clamp(
      (attackerStats.meleeSkill + attackerMeleeSkillMod) + weapon.hitChanceBonus
        + classHitBonus
        - (defenderStats.dodge + defenderDodgeMod) - shieldBonus
        - terrainDefBonus
        + elevationMod
        + surroundBonus,
      5,
      95,
    );

    const roll = this.rng.nextInt(1, 100);
    if (roll > hitChance) {
      return miss(hitChance, weapon.id);
    }

    // ── 2. Roll raw damage (with class bonus + level bonus) ──
    let rawDamage = this.rng.nextInt(weapon.minDamage, weapon.maxDamage);
    if (classDmgBonus > 0) rawDamage = Math.floor(rawDamage * (1 + classDmgBonus / 100));
    rawDamage += attackerStats.bonusDamage ?? 0;

    // ── 3. Critical hit ──
    const critChance = clamp((attackerStats.critChance ?? 5) + weapon.critChanceBonus, 0, 75);
    const critical = this.rng.roll(critChance);
    if (critical) {
      rawDamage = Math.floor(rawDamage * (attackerStats.critMultiplier ?? 1.5));
    }

    // ── 4-6. Armor reduction ──
    const defenderArmor = world.getComponent<ArmorComponent>(defenderId, "armor");
    const armorPiercing = weapon.armorPiercing;
    const armorIgnorePct = 0; // base attacks have no % ignore
    const armorReduction = this.calculateArmorReduction(
      weapon.damageType, defenderStats, defenderArmor, shield, armorPiercing, armorIgnorePct,
    );

    // ── 7. HP damage ──
    // Cap armor absorption: armor can block at most MAX_ARMOR_ABSORB_PCT of raw damage
    const cappedReduction = Math.min(armorReduction, Math.floor(rawDamage * MAX_ARMOR_ABSORB_PCT));
    let hpDamage = Math.max(1, rawDamage - cappedReduction);

    // ── 8. Vulnerability + damage reduction ──
    if (this.statusEffects) {
      const vulnBonus = this.statusEffects.getVulnerabilityBonus(world, defenderId);
      if (vulnBonus > 0) hpDamage = Math.floor(hpDamage * (1 + vulnBonus));
      const dmgReduce = this.statusEffects.getDamageReduction(world, defenderId);
      if (dmgReduce > 0) hpDamage = Math.floor(hpDamage * (1 - dmgReduce));
    }

    // ── 9. Apply HP damage ──
    defenderHealth.current = Math.max(0, defenderHealth.current - hpDamage);
    const targetKilled = defenderHealth.current <= 0;

    // ── 10. Weapon family status effects ──
    const appliedEffects: string[] = [];
    if (!targetKilled && this.statusEffects) {
      this.applyWeaponFamilyEffects(world, defenderId, weapon, appliedEffects);
    }

    return {
      hit: true,
      hitChance,
      damage: rawDamage,
      damageType: weapon.damageType,
      critical,
      armorPiercing,
      armorReduction,
      hpDamage,
      targetKilled,
      weaponId: weapon.id,
      appliedEffects,
    };
  }

  /** Preview a melee attack: compute hit chance and damage range without rolling. */
  previewMelee(
    world: World,
    attackerId: EntityId,
    defenderId: EntityId,
  ): AttackPreview {
    const attackerStats = world.getComponent<StatsComponent>(attackerId, "stats");
    const defenderStats = world.getComponent<StatsComponent>(defenderId, "stats");
    const attackerEquip = world.getComponent<EquipmentComponent>(attackerId, "equipment");
    const defenderEquip = world.getComponent<EquipmentComponent>(defenderId, "equipment");

    if (!attackerStats || !defenderStats) {
      return { hitChance: 5, minDamage: 0, maxDamage: 0 };
    }

    const weapon: WeaponDef = attackerEquip?.mainHand
      ? resolveWeapon(attackerEquip.mainHand)
      : UNARMED;

    const shield: ShieldDef | undefined = defenderEquip?.offHand
      ? resolveShield(defenderEquip.offHand)
      : undefined;

    // Class passives
    const attackerCC = world.getComponent<CharacterClassComponent>(attackerId, "characterClass");
    const attackerClassDef = attackerCC ? getClassDefOptional(attackerCC.classId) : undefined;
    const classHitBonus = attackerClassDef ? getClassHitBonus(attackerClassDef, weapon) : 0;
    const classDmgBonus = attackerClassDef ? getClassDamageBonus(attackerClassDef, weapon) : 0;

    const attackerPos = world.getComponent<PositionComponent>(attackerId, "position");
    const defenderPos = world.getComponent<PositionComponent>(defenderId, "position");

    const shieldBonus = shield?.dodgeBonus ?? 0;
    const defenderTile = defenderPos ? this.grid.get(defenderPos.q, defenderPos.r) : undefined;
    const terrainDefBonus = defenderTile?.defenseBonusMelee ?? 0;
    const attackerElev = attackerPos?.elevation ?? 0;
    const defenderElev = defenderPos?.elevation ?? 0;
    const elevationMod = (attackerElev - defenderElev) * 10;
    const surroundBonus = defenderPos
      ? this.countSurroundBonus(world, attackerId, defenderId)
      : 0;

    const attackerMeleeSkillMod = this.statusEffects
      ? this.statusEffects.getModifier(world, attackerId, "meleeSkill", attackerStats.meleeSkill)
      : 0;
    const defenderDodgeMod = this.statusEffects
      ? this.statusEffects.getModifier(world, defenderId, "dodge", defenderStats.dodge)
      : 0;

    const hitChance = clamp(
      (attackerStats.meleeSkill + attackerMeleeSkillMod) + weapon.hitChanceBonus
        + classHitBonus
        - (defenderStats.dodge + defenderDodgeMod) - shieldBonus
        - terrainDefBonus
        + elevationMod
        + surroundBonus,
      5,
      95,
    );

    const dmgMult = classDmgBonus > 0 ? (1 + classDmgBonus / 100) : 1;
    const bonus = attackerStats.bonusDamage ?? 0;
    return {
      hitChance,
      minDamage: Math.floor(weapon.minDamage * dmgMult) + bonus,
      maxDamage: Math.floor(weapon.maxDamage * dmgMult) + bonus,
    };
  }

  /** Preview with full modifier breakdown for the enemy detail panel. */
  previewMeleeDetailed(
    world: World,
    attackerId: EntityId,
    defenderId: EntityId,
  ): DetailedAttackPreview {
    const attackerStats = world.getComponent<StatsComponent>(attackerId, "stats");
    const defenderStats = world.getComponent<StatsComponent>(defenderId, "stats");
    const attackerEquip = world.getComponent<EquipmentComponent>(attackerId, "equipment");
    const defenderEquip = world.getComponent<EquipmentComponent>(defenderId, "equipment");

    if (!attackerStats || !defenderStats) {
      return {
        hitChance: 5, minDamage: 0, maxDamage: 0,
        modifiers: [], weaponName: "Unarmed",
        damageType: "physical", armorPiercing: 0, critChance: 5,
      };
    }

    const weapon: WeaponDef = attackerEquip?.mainHand
      ? resolveWeapon(attackerEquip.mainHand) : UNARMED;
    const shield: ShieldDef | undefined = defenderEquip?.offHand
      ? resolveShield(defenderEquip.offHand) : undefined;

    // Class passives
    const attackerCC = world.getComponent<CharacterClassComponent>(attackerId, "characterClass");
    const attackerClassDef = attackerCC ? getClassDefOptional(attackerCC.classId) : undefined;
    const classHitBonus = attackerClassDef ? getClassHitBonus(attackerClassDef, weapon) : 0;
    const classDmgBonus = attackerClassDef ? getClassDamageBonus(attackerClassDef, weapon) : 0;

    const attackerPos = world.getComponent<PositionComponent>(attackerId, "position");
    const defenderPos = world.getComponent<PositionComponent>(defenderId, "position");

    const shieldBonus = shield?.dodgeBonus ?? 0;
    const defenderTile = defenderPos ? this.grid.get(defenderPos.q, defenderPos.r) : undefined;
    const terrainDefBonus = defenderTile?.defenseBonusMelee ?? 0;
    const attackerElev = attackerPos?.elevation ?? 0;
    const defenderElev = defenderPos?.elevation ?? 0;
    const elevationMod = (attackerElev - defenderElev) * 10;
    const surroundBonus = defenderPos
      ? this.countSurroundBonus(world, attackerId, defenderId) : 0;

    const attackerMeleeSkillMod = this.statusEffects
      ? this.statusEffects.getModifier(world, attackerId, "meleeSkill", attackerStats.meleeSkill) : 0;
    const defenderDodgeMod = this.statusEffects
      ? this.statusEffects.getModifier(world, defenderId, "dodge", defenderStats.dodge) : 0;

    // Build modifier breakdown
    const modifiers: HitChanceModifier[] = [];
    modifiers.push({ label: "Melee Skill", value: attackerStats.meleeSkill });
    if (attackerMeleeSkillMod !== 0)
      modifiers.push({ label: "Skill Effects", value: attackerMeleeSkillMod });
    if (weapon.hitChanceBonus !== 0)
      modifiers.push({ label: weapon.name, value: weapon.hitChanceBonus });
    if (classHitBonus !== 0)
      modifiers.push({ label: "Class", value: classHitBonus });
    modifiers.push({ label: "Dodge", value: -defenderStats.dodge });
    if (defenderDodgeMod !== 0)
      modifiers.push({ label: "Dodge Effects", value: -defenderDodgeMod });
    if (shieldBonus !== 0)
      modifiers.push({ label: shield?.name ?? "Shield", value: -shieldBonus });
    if (terrainDefBonus !== 0)
      modifiers.push({ label: "Terrain", value: -terrainDefBonus });
    if (elevationMod !== 0)
      modifiers.push({ label: "Elevation", value: elevationMod });
    if (surroundBonus !== 0)
      modifiers.push({ label: "Surround", value: surroundBonus });

    const rawHit = (attackerStats.meleeSkill + attackerMeleeSkillMod) + weapon.hitChanceBonus
      + classHitBonus
      - (defenderStats.dodge + defenderDodgeMod) - shieldBonus
      - terrainDefBonus + elevationMod + surroundBonus;
    const hitChance = clamp(rawHit, 5, 95);

    const critChance = clamp((attackerStats.critChance ?? 5) + weapon.critChanceBonus, 0, 75);

    const dmgMult = classDmgBonus > 0 ? (1 + classDmgBonus / 100) : 1;
    const bonus = attackerStats.bonusDamage ?? 0;
    return {
      hitChance,
      minDamage: Math.floor(weapon.minDamage * dmgMult) + bonus,
      maxDamage: Math.floor(weapon.maxDamage * dmgMult) + bonus,
      modifiers,
      weaponName: weapon.name,
      damageType: weapon.damageType,
      armorPiercing: weapon.armorPiercing,
      critChance,
    };
  }

  /**
   * Resolve an attack using a skill definition.
   * For basic attacks, falls back to weapon family status effects.
   * For special skills, uses skill.onHit and skill modifiers.
   */
  resolveSkillAttack(
    world: World,
    attackerId: EntityId,
    defenderId: EntityId,
    skill: SkillDef,
  ): AttackResult {
    // For basic melee attacks, delegate to existing resolveMelee
    if (skill.isBasicAttack && skill.rangeType === "melee") {
      return this.resolveMelee(world, attackerId, defenderId);
    }

    const attackerStats = world.getComponent<StatsComponent>(attackerId, "stats");
    const defenderStats = world.getComponent<StatsComponent>(defenderId, "stats");
    const defenderHealth = world.getComponent<HealthComponent>(defenderId, "health");
    const attackerEquip = world.getComponent<EquipmentComponent>(attackerId, "equipment");
    const defenderEquip = world.getComponent<EquipmentComponent>(defenderId, "equipment");

    if (!attackerStats || !defenderStats || !defenderHealth) {
      return miss(0, "unarmed");
    }

    const weapon: WeaponDef = attackerEquip?.mainHand
      ? resolveWeapon(attackerEquip.mainHand)
      : UNARMED;

    const shield: ShieldDef | undefined = defenderEquip?.offHand
      ? resolveShield(defenderEquip.offHand)
      : undefined;

    // Class passives
    const attackerCC = world.getComponent<CharacterClassComponent>(attackerId, "characterClass");
    const attackerClassDef = attackerCC ? getClassDefOptional(attackerCC.classId) : undefined;
    const classHitBonus = attackerClassDef ? getClassHitBonus(attackerClassDef, weapon) : 0;
    const classDmgBonus = attackerClassDef ? getClassDamageBonus(attackerClassDef, weapon) : 0;

    // ── 1. Hit chance ──
    const attackerPos = world.getComponent<PositionComponent>(attackerId, "position");
    const defenderPos = world.getComponent<PositionComponent>(defenderId, "position");

    const isRanged = skill.rangeType === "ranged";

    // Ranged: LoS check (auto-miss if blocked)
    if (isRanged && attackerPos && defenderPos) {
      if (!hasLineOfSight(this.grid, attackerPos, defenderPos)) {
        return miss(0, weapon.id);
      }
    }

    const shieldBonus = shield?.dodgeBonus ?? 0;

    const defenderTile = defenderPos ? this.grid.get(defenderPos.q, defenderPos.r) : undefined;
    const terrainDefBonus = isRanged
      ? (defenderTile?.defenseBonusRanged ?? 0)
      : (defenderTile?.defenseBonusMelee ?? 0);

    const attackerElev = attackerPos?.elevation ?? 0;
    const defenderElev = defenderPos?.elevation ?? 0;
    const elevationMod = (attackerElev - defenderElev) * 10;

    const surroundBonus = isRanged ? 0
      : (defenderPos ? this.countSurroundBonus(world, attackerId, defenderId) : 0);

    // Range penalty for ranged: -5 per hex beyond half max range
    let rangePenalty = 0;
    if (isRanged && attackerPos && defenderPos) {
      const dist = hexDistance(attackerPos, defenderPos);
      const maxRange = skillRange(skill, weapon);
      const halfRange = Math.floor(maxRange / 2);
      if (dist > halfRange) {
        rangePenalty = (dist - halfRange) * -5;
      }
    }

    const attackerMeleeSkillMod = this.statusEffects
      ? this.statusEffects.getModifier(world, attackerId, "meleeSkill", attackerStats.meleeSkill)
      : 0;
    const defenderDodgeMod = this.statusEffects
      ? this.statusEffects.getModifier(world, defenderId, "dodge", defenderStats.dodge)
      : 0;

    const hitChance = clamp(
      (attackerStats.meleeSkill + attackerMeleeSkillMod) + weapon.hitChanceBonus
        + classHitBonus
        + skill.hitChanceModifier
        + rangePenalty
        - (defenderStats.dodge + defenderDodgeMod) - shieldBonus
        - terrainDefBonus
        + elevationMod
        + surroundBonus,
      5,
      95,
    );

    const roll = this.rng.nextInt(1, 100);
    if (roll > hitChance) {
      return miss(hitChance, weapon.id);
    }

    // ── 2. Roll raw damage with skill multiplier (and class bonus + level bonus) ──
    let rawDamage = Math.floor(
      this.rng.nextInt(weapon.minDamage, weapon.maxDamage) * skill.damageMultiplier,
    );
    if (classDmgBonus > 0) rawDamage = Math.floor(rawDamage * (1 + classDmgBonus / 100));
    rawDamage += attackerStats.bonusDamage ?? 0;

    // ── 3. Critical hit ──
    const critChance = clamp((attackerStats.critChance ?? 5) + weapon.critChanceBonus, 0, 75);
    const critical = this.rng.roll(critChance);
    if (critical) {
      rawDamage = Math.floor(rawDamage * (attackerStats.critMultiplier ?? 1.5));
    }

    // ── 4-6. Armor reduction ──
    const defenderArmor = world.getComponent<ArmorComponent>(defenderId, "armor");
    const armorPiercing = skill.armorPiercingOverride ?? weapon.armorPiercing;
    const armorIgnorePct = skill.armorIgnoreOverride ?? 0;
    const effectiveDamageType = skill.damageTypeOverride ?? weapon.damageType;
    const armorReduction = this.calculateArmorReduction(
      effectiveDamageType, defenderStats, defenderArmor, shield, armorPiercing, armorIgnorePct,
    );

    // ── 7. HP damage ──
    // Cap armor absorption: armor can block at most MAX_ARMOR_ABSORB_PCT of raw damage
    const cappedReduction = Math.min(armorReduction, Math.floor(rawDamage * MAX_ARMOR_ABSORB_PCT));
    let hpDamage = Math.max(1, rawDamage - cappedReduction);

    // ── 8. Vulnerability + damage reduction ──
    if (this.statusEffects) {
      const vulnBonus = this.statusEffects.getVulnerabilityBonus(world, defenderId);
      if (vulnBonus > 0) hpDamage = Math.floor(hpDamage * (1 + vulnBonus));
      const dmgReduce = this.statusEffects.getDamageReduction(world, defenderId);
      if (dmgReduce > 0) hpDamage = Math.floor(hpDamage * (1 - dmgReduce));
    }

    // ── 9. Apply HP damage ──
    defenderHealth.current = Math.max(0, defenderHealth.current - hpDamage);
    const targetKilled = defenderHealth.current <= 0;

    // ── 10. Status effects ──
    const appliedEffects: string[] = [];
    if (!targetKilled && this.statusEffects) {
      if (skill.onHit && skill.onHit.length > 0) {
        for (const hit of skill.onHit) {
          if (this.rng.roll(hit.chance)) {
            this.statusEffects.apply(world, defenderId, hit.effect, hit.duration);
            appliedEffects.push(hit.effect);
          }
        }
      } else if (skill.isBasicAttack) {
        this.applyWeaponFamilyEffects(world, defenderId, weapon, appliedEffects);
      }
    }

    return {
      hit: true,
      hitChance,
      damage: rawDamage,
      damageType: effectiveDamageType,
      critical,
      armorPiercing,
      armorReduction,
      hpDamage,
      targetKilled,
      weaponId: weapon.id,
      appliedEffects,
    };
  }

  /**
   * Preview a skill attack with full modifier breakdown.
   */
  previewSkillAttack(
    world: World,
    attackerId: EntityId,
    defenderId: EntityId,
    skill: SkillDef,
  ): DetailedAttackPreview {
    if (skill.isBasicAttack && skill.rangeType === "melee") {
      return this.previewMeleeDetailed(world, attackerId, defenderId);
    }

    const attackerStats = world.getComponent<StatsComponent>(attackerId, "stats");
    const defenderStats = world.getComponent<StatsComponent>(defenderId, "stats");
    const attackerEquip = world.getComponent<EquipmentComponent>(attackerId, "equipment");
    const defenderEquip = world.getComponent<EquipmentComponent>(defenderId, "equipment");

    if (!attackerStats || !defenderStats) {
      return {
        hitChance: 5, minDamage: 0, maxDamage: 0,
        modifiers: [], weaponName: "Unarmed",
        damageType: "physical", armorPiercing: 0, critChance: 5,
      };
    }

    const weapon: WeaponDef = attackerEquip?.mainHand
      ? resolveWeapon(attackerEquip.mainHand) : UNARMED;
    const shield: ShieldDef | undefined = defenderEquip?.offHand
      ? resolveShield(defenderEquip.offHand) : undefined;

    const attackerCC = world.getComponent<CharacterClassComponent>(attackerId, "characterClass");
    const attackerClassDef = attackerCC ? getClassDefOptional(attackerCC.classId) : undefined;
    const classHitBonus = attackerClassDef ? getClassHitBonus(attackerClassDef, weapon) : 0;
    const classDmgBonus = attackerClassDef ? getClassDamageBonus(attackerClassDef, weapon) : 0;

    const attackerPos = world.getComponent<PositionComponent>(attackerId, "position");
    const defenderPos = world.getComponent<PositionComponent>(defenderId, "position");

    const isRanged = skill.rangeType === "ranged";
    const shieldBonus = shield?.dodgeBonus ?? 0;
    const defenderTile = defenderPos ? this.grid.get(defenderPos.q, defenderPos.r) : undefined;
    const terrainDefBonus = isRanged
      ? (defenderTile?.defenseBonusRanged ?? 0)
      : (defenderTile?.defenseBonusMelee ?? 0);
    const attackerElev = attackerPos?.elevation ?? 0;
    const defenderElev = defenderPos?.elevation ?? 0;
    const elevationMod = (attackerElev - defenderElev) * 10;
    const surroundBonus = isRanged ? 0
      : (defenderPos ? this.countSurroundBonus(world, attackerId, defenderId) : 0);

    let rangePenalty = 0;
    if (isRanged && attackerPos && defenderPos) {
      const dist = hexDistance(attackerPos, defenderPos);
      const maxRange = skillRange(skill, weapon);
      const halfRange = Math.floor(maxRange / 2);
      if (dist > halfRange) {
        rangePenalty = (dist - halfRange) * -5;
      }
    }

    const attackerMeleeSkillMod = this.statusEffects
      ? this.statusEffects.getModifier(world, attackerId, "meleeSkill", attackerStats.meleeSkill) : 0;
    const defenderDodgeMod = this.statusEffects
      ? this.statusEffects.getModifier(world, defenderId, "dodge", defenderStats.dodge) : 0;

    const modifiers: HitChanceModifier[] = [];
    modifiers.push({ label: "Melee Skill", value: attackerStats.meleeSkill });
    if (attackerMeleeSkillMod !== 0)
      modifiers.push({ label: "Skill Effects", value: attackerMeleeSkillMod });
    if (weapon.hitChanceBonus !== 0)
      modifiers.push({ label: weapon.name, value: weapon.hitChanceBonus });
    if (classHitBonus !== 0)
      modifiers.push({ label: "Class", value: classHitBonus });
    if (skill.hitChanceModifier !== 0)
      modifiers.push({ label: skill.name, value: skill.hitChanceModifier });
    if (rangePenalty !== 0)
      modifiers.push({ label: "Range", value: rangePenalty });
    modifiers.push({ label: "Dodge", value: -defenderStats.dodge });
    if (defenderDodgeMod !== 0)
      modifiers.push({ label: "Dodge Effects", value: -defenderDodgeMod });
    if (shieldBonus !== 0)
      modifiers.push({ label: shield?.name ?? "Shield", value: -shieldBonus });
    if (terrainDefBonus !== 0)
      modifiers.push({ label: "Terrain", value: -terrainDefBonus });
    if (elevationMod !== 0)
      modifiers.push({ label: "Elevation", value: elevationMod });
    if (surroundBonus !== 0)
      modifiers.push({ label: "Surround", value: surroundBonus });

    const rawHit = (attackerStats.meleeSkill + attackerMeleeSkillMod) + weapon.hitChanceBonus
      + classHitBonus
      + skill.hitChanceModifier + rangePenalty
      - (defenderStats.dodge + defenderDodgeMod) - shieldBonus
      - terrainDefBonus + elevationMod + surroundBonus;
    const hitChance = clamp(rawHit, 5, 95);

    const armorPiercing = skill.armorPiercingOverride ?? weapon.armorPiercing;
    const critChance = clamp((attackerStats.critChance ?? 5) + weapon.critChanceBonus, 0, 75);

    const totalDmgMult = skill.damageMultiplier * (classDmgBonus > 0 ? (1 + classDmgBonus / 100) : 1);
    const bonus = attackerStats.bonusDamage ?? 0;
    return {
      hitChance,
      minDamage: Math.floor(weapon.minDamage * totalDmgMult) + bonus,
      maxDamage: Math.floor(weapon.maxDamage * totalDmgMult) + bonus,
      modifiers,
      weaponName: weapon.name,
      damageType: skill.damageTypeOverride ?? weapon.damageType,
      armorPiercing,
      critChance,
    };
  }

  /**
   * Calculate armor reduction for a given damage type.
   * Physical: uses body.armor + head.armor + shield.armor
   * Magical: uses body.magicResist + head.magicResist + base magicResist
   * Applies flat armorPiercing first, then % armorIgnore. Result is capped at caller site.
   */
  private calculateArmorReduction(
    damageType: DamageType,
    defenderStats: StatsComponent,
    defenderArmor: ArmorComponent | undefined,
    shield: ShieldDef | undefined,
    armorPiercing: number,
    armorIgnorePct: number,
  ): number {
    let totalArmor: number;
    if (damageType === "physical") {
      totalArmor = (defenderArmor?.body?.armor ?? 0)
        + (defenderArmor?.head?.armor ?? 0)
        + (shield?.armor ?? 0)
        + (defenderStats.bonusArmor ?? 0);
    } else {
      // Magical: use magicResist from armor + base stat
      totalArmor = (defenderArmor?.body?.magicResist ?? 0)
        + (defenderArmor?.head?.magicResist ?? 0)
        + defenderStats.magicResist;
    }

    // Apply flat piercing first
    let effectiveArmor = Math.max(0, totalArmor - armorPiercing);
    // Then percentage ignore
    if (armorIgnorePct > 0) {
      effectiveArmor = Math.floor(effectiveArmor * (1 - armorIgnorePct));
    }

    return effectiveArmor;
  }

  /** Apply weapon family status effects (extracted from resolveMelee). */
  private applyWeaponFamilyEffects(
    world: World,
    defenderId: EntityId,
    weapon: WeaponDef,
    appliedEffects: string[],
  ): void {
    if (!this.statusEffects) return;
    if (weapon.family === "mace" && this.rng.roll(10)) {
      this.statusEffects.apply(world, defenderId, "stun");
      appliedEffects.push("stun");
    }
    if ((weapon.family === "sword" || weapon.family === "cleaver") && this.rng.roll(15)) {
      this.statusEffects.apply(world, defenderId, "bleed", this.rng.nextInt(2, 3));
      appliedEffects.push("bleed");
    }
    if (weapon.family === "axe" && this.rng.roll(10)) {
      this.statusEffects.apply(world, defenderId, "bleed", this.rng.nextInt(2, 3));
      appliedEffects.push("bleed");
    }
    if (weapon.family === "dagger" && this.rng.roll(20)) {
      this.statusEffects.apply(world, defenderId, "bleed", 2);
      appliedEffects.push("bleed");
    }
  }

  /**
   * Count surrounding bonus: +5 per ally of the attacker adjacent to the defender,
   * beyond the first (the attacker themselves).
   */
  private countSurroundBonus(
    world: World,
    attackerId: EntityId,
    defenderId: EntityId,
  ): number {
    const defenderPos = world.getComponent<PositionComponent>(defenderId, "position");
    if (!defenderPos) return 0;

    const attackerIsAI = world.getComponent(attackerId, "aiBehavior") !== undefined;

    let allyCount = 0;
    for (const n of hexNeighbors(defenderPos.q, defenderPos.r)) {
      const tile = this.grid.get(n.q, n.r);
      if (!tile?.occupant || tile.occupant === defenderId) continue;

      const occupantIsAI = world.getComponent(tile.occupant, "aiBehavior") !== undefined;
      if (occupantIsAI === attackerIsAI) {
        const health = world.getComponent<HealthComponent>(tile.occupant, "health");
        if (health && health.current > 0) {
          allyCount++;
        }
      }
    }

    return Math.max(0, allyCount - 1) * 5;
  }
}

function miss(hitChance: number, weaponId: string): AttackResult {
  return {
    hit: false,
    hitChance,
    damage: 0,
    damageType: "physical",
    critical: false,
    armorPiercing: 0,
    armorReduction: 0,
    hpDamage: 0,
    targetKilled: false,
    weaponId,
    appliedEffects: [],
  };
}
