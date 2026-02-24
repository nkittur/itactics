import type { World } from "@entities/World";
import type { HexGrid } from "@hex/HexGrid";
import type { EntityId } from "@entities/Entity";
import type { StatsComponent } from "@entities/components/Stats";
import type { HealthComponent } from "@entities/components/Health";
import type { ArmorComponent } from "@entities/components/Armor";
import type { EquipmentComponent } from "@entities/components/Equipment";
import type { PositionComponent } from "@entities/components/Position";
import { getWeapon, UNARMED, type WeaponDef } from "@data/WeaponData";
import { getShield, type ShieldDef } from "@data/ShieldData";
import { BASIC_ATTACK, type SkillDef, skillRange } from "@data/SkillData";
import { hexDistance, hexNeighbors } from "@hex/HexMath";
import { hasLineOfSight } from "@hex/HexLineOfSight";
import { RNG } from "@utils/RNG";
import { clamp } from "@utils/MathUtils";
import type { StatusEffectManager } from "./StatusEffectManager";

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
  armorIgnorePct: number;
  armorDamageMult: number;
  headHitChance: number;
}

export interface AttackResult {
  hit: boolean;
  hitChance: number;
  /** Raw damage rolled from weapon. */
  damage: number;
  /** Damage dealt to armor durability. */
  armorDamage: number;
  /** Damage dealt to HP. */
  hpDamage: number;
  targetKilled: boolean;
  headHit: boolean;
  /** Weapon used for this attack. */
  weaponId: string;
  /** Status effects applied on hit (e.g. "stun", "bleed"). */
  appliedEffects: string[];
}

/**
 * Weapon-based damage calculator.
 *
 * Damage pipeline (from planning/03-weapons-and-equipment.md):
 * 1. Roll hit chance (meleeSkill + weaponBonus - meleeDefense - shieldBonus)
 * 2. Roll raw damage between weapon min-max
 * 3. Armor durability damage = floor(raw * armorDamageMult)
 * 4. Armor ignore HP damage = floor(raw * armorIgnorePct)
 * 5. HP damage = armorIgnoreHp + overflow (if armor breaks)
 * 6. Head hit: 1.5x HP damage
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
    const defenderArmor = world.getComponent<ArmorComponent>(defenderId, "armor");
    const attackerEquip = world.getComponent<EquipmentComponent>(attackerId, "equipment");
    const defenderEquip = world.getComponent<EquipmentComponent>(defenderId, "equipment");

    if (!attackerStats || !defenderStats || !defenderHealth) {
      return miss(0, "unarmed");
    }

    // Look up weapon and shield from data registries
    const weapon: WeaponDef = attackerEquip?.mainHand
      ? getWeapon(attackerEquip.mainHand)
      : UNARMED;

    const shield: ShieldDef | undefined = defenderEquip?.offHand
      ? getShield(defenderEquip.offHand)
      : undefined;

    // ── 1. Hit chance ──
    const attackerPos = world.getComponent<PositionComponent>(attackerId, "position");
    const defenderPos = world.getComponent<PositionComponent>(defenderId, "position");

    const shieldBonus = shield?.meleeDefBonus ?? 0;

    // Terrain defense bonus (defender's tile)
    const defenderTile = defenderPos ? this.grid.get(defenderPos.q, defenderPos.r) : undefined;
    const terrainDefBonus = defenderTile?.defenseBonusMelee ?? 0;

    // Elevation modifier: +10 per level advantage
    const attackerElev = attackerPos?.elevation ?? 0;
    const defenderElev = defenderPos?.elevation ?? 0;
    const elevationMod = (attackerElev - defenderElev) * 10;

    // Surrounding bonus: +5 per ally adjacent to defender beyond the first
    const surroundBonus = defenderPos
      ? this.countSurroundBonus(world, attackerId, defenderId)
      : 0;

    // Status effect modifiers
    const attackerMeleeSkillMod = this.statusEffects
      ? this.statusEffects.getModifier(world, attackerId, "meleeSkill", attackerStats.meleeSkill)
      : 0;
    const defenderMeleeDefMod = this.statusEffects
      ? this.statusEffects.getModifier(world, defenderId, "meleeDefense", defenderStats.meleeDefense)
      : 0;

    const hitChance = clamp(
      (attackerStats.meleeSkill + attackerMeleeSkillMod) + weapon.hitChanceBonus
        - (defenderStats.meleeDefense + defenderMeleeDefMod) - shieldBonus
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

    // ── 2. Roll raw damage ──
    const rawDamage = this.rng.nextInt(weapon.minDamage, weapon.maxDamage);

    // ── 3. Head hit (25% chance) ──
    const headHit = this.rng.roll(25);

    // ── 4-5. Damage resolution ──
    const armorIgnoreHp = Math.floor(rawDamage * weapon.armorIgnorePct);
    const armorDurabilityDmg = Math.floor(rawDamage * weapon.armorDamageMult);

    const armorSlot = defenderArmor
      ? (headHit ? defenderArmor.head : defenderArmor.body)
      : null;

    let armorDamageDealt = 0;
    let hpDamage: number;

    if (armorSlot && armorSlot.currentDurability > 0) {
      // Armor absorbs durability damage
      const absorbed = Math.min(armorDurabilityDmg, armorSlot.currentDurability);
      armorSlot.currentDurability -= absorbed;
      armorDamageDealt = absorbed;
      // Overflow when armor breaks goes to HP
      const overflow = armorDurabilityDmg - absorbed;
      hpDamage = armorIgnoreHp + overflow;
    } else {
      // No armor on this slot — all damage goes to HP
      hpDamage = rawDamage;
    }

    // ── 6. Head hit multiplier ──
    if (headHit) {
      hpDamage = Math.floor(hpDamage * 1.5);
    }

    // ── 7. Apply HP damage ──
    defenderHealth.current = Math.max(0, defenderHealth.current - hpDamage);
    const targetKilled = defenderHealth.current <= 0;

    // ── 8. Apply weapon family status effects ──
    const appliedEffects: string[] = [];
    if (!targetKilled && this.statusEffects) {
      // Maces: 10% chance to stun
      if (weapon.family === "mace" && this.rng.roll(10)) {
        this.statusEffects.apply(world, defenderId, "stun");
        appliedEffects.push("stun");
      }
      // Swords and cleavers: 15% chance to bleed (2-3 turns)
      if ((weapon.family === "sword" || weapon.family === "cleaver") && this.rng.roll(15)) {
        this.statusEffects.apply(world, defenderId, "bleed", this.rng.nextInt(2, 3));
        appliedEffects.push("bleed");
      }
      // Axes: 10% chance to bleed
      if (weapon.family === "axe" && this.rng.roll(10)) {
        this.statusEffects.apply(world, defenderId, "bleed", this.rng.nextInt(2, 3));
        appliedEffects.push("bleed");
      }
      // Daggers: 20% chance to bleed (shorter duration)
      if (weapon.family === "dagger" && this.rng.roll(20)) {
        this.statusEffects.apply(world, defenderId, "bleed", 2);
        appliedEffects.push("bleed");
      }
    }

    return {
      hit: true,
      hitChance,
      damage: rawDamage,
      armorDamage: armorDamageDealt,
      hpDamage,
      targetKilled,
      headHit,
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
      ? getWeapon(attackerEquip.mainHand)
      : UNARMED;

    const shield: ShieldDef | undefined = defenderEquip?.offHand
      ? getShield(defenderEquip.offHand)
      : undefined;

    const attackerPos = world.getComponent<PositionComponent>(attackerId, "position");
    const defenderPos = world.getComponent<PositionComponent>(defenderId, "position");

    const shieldBonus = shield?.meleeDefBonus ?? 0;
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
    const defenderMeleeDefMod = this.statusEffects
      ? this.statusEffects.getModifier(world, defenderId, "meleeDefense", defenderStats.meleeDefense)
      : 0;

    const hitChance = clamp(
      (attackerStats.meleeSkill + attackerMeleeSkillMod) + weapon.hitChanceBonus
        - (defenderStats.meleeDefense + defenderMeleeDefMod) - shieldBonus
        - terrainDefBonus
        + elevationMod
        + surroundBonus,
      5,
      95,
    );

    return { hitChance, minDamage: weapon.minDamage, maxDamage: weapon.maxDamage };
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
        armorIgnorePct: 0, armorDamageMult: 0, headHitChance: 25,
      };
    }

    const weapon: WeaponDef = attackerEquip?.mainHand
      ? getWeapon(attackerEquip.mainHand) : UNARMED;
    const shield: ShieldDef | undefined = defenderEquip?.offHand
      ? getShield(defenderEquip.offHand) : undefined;

    const attackerPos = world.getComponent<PositionComponent>(attackerId, "position");
    const defenderPos = world.getComponent<PositionComponent>(defenderId, "position");

    const shieldBonus = shield?.meleeDefBonus ?? 0;
    const defenderTile = defenderPos ? this.grid.get(defenderPos.q, defenderPos.r) : undefined;
    const terrainDefBonus = defenderTile?.defenseBonusMelee ?? 0;
    const attackerElev = attackerPos?.elevation ?? 0;
    const defenderElev = defenderPos?.elevation ?? 0;
    const elevationMod = (attackerElev - defenderElev) * 10;
    const surroundBonus = defenderPos
      ? this.countSurroundBonus(world, attackerId, defenderId) : 0;

    const attackerMeleeSkillMod = this.statusEffects
      ? this.statusEffects.getModifier(world, attackerId, "meleeSkill", attackerStats.meleeSkill) : 0;
    const defenderMeleeDefMod = this.statusEffects
      ? this.statusEffects.getModifier(world, defenderId, "meleeDefense", defenderStats.meleeDefense) : 0;

    // Build modifier breakdown
    const modifiers: HitChanceModifier[] = [];
    modifiers.push({ label: "Melee Skill", value: attackerStats.meleeSkill });
    if (attackerMeleeSkillMod !== 0)
      modifiers.push({ label: "Skill Effects", value: attackerMeleeSkillMod });
    if (weapon.hitChanceBonus !== 0)
      modifiers.push({ label: weapon.name, value: weapon.hitChanceBonus });
    modifiers.push({ label: "Defense", value: -defenderStats.meleeDefense });
    if (defenderMeleeDefMod !== 0)
      modifiers.push({ label: "Def Effects", value: -defenderMeleeDefMod });
    if (shieldBonus !== 0)
      modifiers.push({ label: shield?.name ?? "Shield", value: -shieldBonus });
    if (terrainDefBonus !== 0)
      modifiers.push({ label: "Terrain", value: -terrainDefBonus });
    if (elevationMod !== 0)
      modifiers.push({ label: "Elevation", value: elevationMod });
    if (surroundBonus !== 0)
      modifiers.push({ label: "Surround", value: surroundBonus });

    const rawHit = (attackerStats.meleeSkill + attackerMeleeSkillMod) + weapon.hitChanceBonus
      - (defenderStats.meleeDefense + defenderMeleeDefMod) - shieldBonus
      - terrainDefBonus + elevationMod + surroundBonus;
    const hitChance = clamp(rawHit, 5, 95);

    return {
      hitChance,
      minDamage: weapon.minDamage,
      maxDamage: weapon.maxDamage,
      modifiers,
      weaponName: weapon.name,
      armorIgnorePct: weapon.armorIgnorePct,
      armorDamageMult: weapon.armorDamageMult,
      headHitChance: 25,
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
    const defenderArmor = world.getComponent<ArmorComponent>(defenderId, "armor");
    const attackerEquip = world.getComponent<EquipmentComponent>(attackerId, "equipment");
    const defenderEquip = world.getComponent<EquipmentComponent>(defenderId, "equipment");

    if (!attackerStats || !defenderStats || !defenderHealth) {
      return miss(0, "unarmed");
    }

    const weapon: WeaponDef = attackerEquip?.mainHand
      ? getWeapon(attackerEquip.mainHand)
      : UNARMED;

    const shield: ShieldDef | undefined = defenderEquip?.offHand
      ? getShield(defenderEquip.offHand)
      : undefined;

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

    const shieldBonus = isRanged
      ? (shield?.rangedDefBonus ?? 0)
      : (shield?.meleeDefBonus ?? 0);

    const defenderTile = defenderPos ? this.grid.get(defenderPos.q, defenderPos.r) : undefined;
    const terrainDefBonus = isRanged
      ? (defenderTile?.defenseBonusRanged ?? 0)
      : (defenderTile?.defenseBonusMelee ?? 0);

    const attackerElev = attackerPos?.elevation ?? 0;
    const defenderElev = defenderPos?.elevation ?? 0;
    const elevationMod = (attackerElev - defenderElev) * 10;

    // No surround bonus for ranged
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
    const defenderMeleeDefMod = this.statusEffects
      ? this.statusEffects.getModifier(world, defenderId, "meleeDefense", defenderStats.meleeDefense)
      : 0;

    const hitChance = clamp(
      (attackerStats.meleeSkill + attackerMeleeSkillMod) + weapon.hitChanceBonus
        + skill.hitChanceModifier
        + rangePenalty
        - (defenderStats.meleeDefense + defenderMeleeDefMod) - shieldBonus
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

    // ── 2. Roll raw damage with skill multiplier ──
    const rawDamage = Math.floor(
      this.rng.nextInt(weapon.minDamage, weapon.maxDamage) * skill.damageMultiplier,
    );

    // ── 3. Head hit (25% chance) ──
    const headHit = this.rng.roll(25);

    // ── 4-5. Armor resolution ──
    const armorIgnore = skill.armorIgnoreOverride ?? weapon.armorIgnorePct;
    const armorDmgMult = skill.armorDamageMultOverride ?? weapon.armorDamageMult;

    const armorIgnoreHp = Math.floor(rawDamage * armorIgnore);
    const armorDurabilityDmg = Math.floor(rawDamage * armorDmgMult);

    const armorSlot = defenderArmor
      ? (headHit ? defenderArmor.head : defenderArmor.body)
      : null;

    let armorDamageDealt = 0;
    let hpDamage: number;

    if (armorSlot && armorSlot.currentDurability > 0) {
      const absorbed = Math.min(armorDurabilityDmg, armorSlot.currentDurability);
      armorSlot.currentDurability -= absorbed;
      armorDamageDealt = absorbed;
      const overflow = armorDurabilityDmg - absorbed;
      hpDamage = armorIgnoreHp + overflow;
    } else {
      hpDamage = rawDamage;
    }

    // ── 6. Head hit multiplier ──
    if (headHit) {
      hpDamage = Math.floor(hpDamage * 1.5);
    }

    // ── 7. Apply HP damage ──
    defenderHealth.current = Math.max(0, defenderHealth.current - hpDamage);
    const targetKilled = defenderHealth.current <= 0;

    // ── 8. Status effects ──
    const appliedEffects: string[] = [];
    if (!targetKilled && this.statusEffects) {
      if (skill.onHit && skill.onHit.length > 0) {
        // Skill-defined effects
        for (const hit of skill.onHit) {
          if (this.rng.roll(hit.chance)) {
            this.statusEffects.apply(world, defenderId, hit.effect, hit.duration);
            appliedEffects.push(hit.effect);
          }
        }
      } else if (skill.isBasicAttack) {
        // Basic attack: weapon family effects (same as resolveMelee)
        this.applyWeaponFamilyEffects(world, defenderId, weapon, appliedEffects);
      }
    }

    return {
      hit: true,
      hitChance,
      damage: rawDamage,
      armorDamage: armorDamageDealt,
      hpDamage,
      targetKilled,
      headHit,
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
    // For basic melee attacks, delegate to existing preview
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
        armorIgnorePct: 0, armorDamageMult: 0, headHitChance: 25,
      };
    }

    const weapon: WeaponDef = attackerEquip?.mainHand
      ? getWeapon(attackerEquip.mainHand) : UNARMED;
    const shield: ShieldDef | undefined = defenderEquip?.offHand
      ? getShield(defenderEquip.offHand) : undefined;

    const attackerPos = world.getComponent<PositionComponent>(attackerId, "position");
    const defenderPos = world.getComponent<PositionComponent>(defenderId, "position");

    const isRanged = skill.rangeType === "ranged";
    const shieldBonus = isRanged
      ? (shield?.rangedDefBonus ?? 0)
      : (shield?.meleeDefBonus ?? 0);
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
      ? this.statusEffects.getModifier(world, attackerId, "meleeSkill", attackerStats.meleeSkill) : 0;
    const defenderMeleeDefMod = this.statusEffects
      ? this.statusEffects.getModifier(world, defenderId, "meleeDefense", defenderStats.meleeDefense) : 0;

    // Build modifier breakdown
    const modifiers: HitChanceModifier[] = [];
    modifiers.push({ label: "Melee Skill", value: attackerStats.meleeSkill });
    if (attackerMeleeSkillMod !== 0)
      modifiers.push({ label: "Skill Effects", value: attackerMeleeSkillMod });
    if (weapon.hitChanceBonus !== 0)
      modifiers.push({ label: weapon.name, value: weapon.hitChanceBonus });
    if (skill.hitChanceModifier !== 0)
      modifiers.push({ label: skill.name, value: skill.hitChanceModifier });
    if (rangePenalty !== 0)
      modifiers.push({ label: "Range", value: rangePenalty });
    modifiers.push({ label: "Defense", value: -defenderStats.meleeDefense });
    if (defenderMeleeDefMod !== 0)
      modifiers.push({ label: "Def Effects", value: -defenderMeleeDefMod });
    if (shieldBonus !== 0)
      modifiers.push({ label: shield?.name ?? "Shield", value: -shieldBonus });
    if (terrainDefBonus !== 0)
      modifiers.push({ label: "Terrain", value: -terrainDefBonus });
    if (elevationMod !== 0)
      modifiers.push({ label: "Elevation", value: elevationMod });
    if (surroundBonus !== 0)
      modifiers.push({ label: "Surround", value: surroundBonus });

    const rawHit = (attackerStats.meleeSkill + attackerMeleeSkillMod) + weapon.hitChanceBonus
      + skill.hitChanceModifier + rangePenalty
      - (defenderStats.meleeDefense + defenderMeleeDefMod) - shieldBonus
      - terrainDefBonus + elevationMod + surroundBonus;
    const hitChance = clamp(rawHit, 5, 95);

    const armorIgnore = skill.armorIgnoreOverride ?? weapon.armorIgnorePct;
    const armorDmgMult = skill.armorDamageMultOverride ?? weapon.armorDamageMult;

    return {
      hitChance,
      minDamage: Math.floor(weapon.minDamage * skill.damageMultiplier),
      maxDamage: Math.floor(weapon.maxDamage * skill.damageMultiplier),
      modifiers,
      weaponName: weapon.name,
      armorIgnorePct: armorIgnore,
      armorDamageMult: armorDmgMult,
      headHitChance: 25,
    };
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
   * Two entities are on the same team if they both have aiBehavior or both lack it.
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
        // Same team as attacker — counts as surrounding ally
        const health = world.getComponent<HealthComponent>(tile.occupant, "health");
        if (health && health.current > 0) {
          allyCount++;
        }
      }
    }

    // Bonus starts at 2+ allies adjacent (the attacker is one of them)
    return Math.max(0, allyCount - 1) * 5;
  }
}

function miss(hitChance: number, weaponId: string): AttackResult {
  return {
    hit: false,
    hitChance,
    damage: 0,
    armorDamage: 0,
    hpDamage: 0,
    targetKilled: false,
    headHit: false,
    weaponId,
    appliedEffects: [],
  };
}
