import type { WeaponFamily, DamageType } from "./WeaponData";
import { getWeapon, UNARMED, type WeaponDef } from "./WeaponData";

export type TargetType = "enemy" | "hex" | "self";
export type RangeType = "melee" | "ranged";

export interface SkillOnHit {
  readonly effect: string;
  readonly chance: number;
  readonly duration?: number;
}

export interface SkillDef {
  readonly id: string;
  readonly name: string;
  /** Empty array = works with all weapons. */
  readonly weaponFamilies: readonly WeaponFamily[];
  /** AP cost override. 0 = use weapon's AP cost. */
  readonly apCost: number;
  /** Extra stamina on top of weapon's stamina cost. */
  readonly staminaExtra: number;
  readonly damageMultiplier: number;
  readonly hitChanceModifier: number;
  readonly range: number;
  readonly targetType: TargetType;
  readonly rangeType: RangeType;
  /** Flat armor ignored (overrides weapon's armorPiercing). */
  readonly armorPiercingOverride?: number;
  /** Fraction of remaining armor to ignore (0.5 = 50%, 1.0 = 100%). */
  readonly armorIgnoreOverride?: number;
  /** Override weapon damage type (e.g., spell abilities force "magical"). */
  readonly damageTypeOverride?: DamageType;
  readonly isBasicAttack: boolean;
  readonly isStance: boolean;
  readonly onHit?: readonly SkillOnHit[];
  readonly description: string;
}

// ── Skill definitions ──

export const BASIC_ATTACK: SkillDef = {
  id: "basic_attack",
  name: "Attack",
  weaponFamilies: [],
  apCost: 0,
  staminaExtra: 0,
  damageMultiplier: 1.0,
  hitChanceModifier: 0,
  range: 0,
  targetType: "enemy",
  rangeType: "melee",
  isBasicAttack: true,
  isStance: false,
  description: "Standard weapon attack.",
};

export const RANGED_ATTACK: SkillDef = {
  id: "ranged_attack",
  name: "Shoot",
  weaponFamilies: ["bow", "crossbow", "throwing"],
  apCost: 0,
  staminaExtra: 0,
  damageMultiplier: 1.0,
  hitChanceModifier: 0,
  range: 0,
  targetType: "enemy",
  rangeType: "ranged",
  isBasicAttack: true,
  isStance: false,
  description: "Ranged weapon attack.",
};

export const PUNCTURE: SkillDef = {
  id: "puncture",
  name: "Puncture",
  weaponFamilies: ["dagger", "sword"],
  apCost: 0,
  staminaExtra: 3,
  damageMultiplier: 0.5,
  hitChanceModifier: 15,
  range: 0,
  targetType: "enemy",
  rangeType: "melee",
  armorIgnoreOverride: 1.0,
  isBasicAttack: false,
  isStance: false,
  description: "Precise strike that ignores all armor, but deals reduced damage.",
};

export const STUN: SkillDef = {
  id: "stun",
  name: "Stun",
  weaponFamilies: ["mace", "flail"],
  apCost: 0,
  staminaExtra: 5,
  damageMultiplier: 0.5,
  hitChanceModifier: -15,
  range: 0,
  targetType: "enemy",
  rangeType: "melee",
  isBasicAttack: false,
  isStance: false,
  onHit: [{ effect: "stun", chance: 100 }],
  description: "Heavy blow that stuns the target for one turn, but is hard to land.",
};

export const SPLIT_SHIELD: SkillDef = {
  id: "split_shield",
  name: "Split Shield",
  weaponFamilies: ["axe", "mace"],
  apCost: 0,
  staminaExtra: 5,
  damageMultiplier: 1.5,
  hitChanceModifier: 0,
  range: 0,
  targetType: "enemy",
  rangeType: "melee",
  isBasicAttack: false,
  isStance: false,
  description: "Powerful strike aimed at the shield, dealing 150% damage to shield durability.",
};

export const SPEARWALL: SkillDef = {
  id: "spearwall",
  name: "Spearwall",
  weaponFamilies: ["spear", "polearm"],
  apCost: 3,
  staminaExtra: 5,
  range: 0,
  damageMultiplier: 1.0,
  hitChanceModifier: 0,
  targetType: "self",
  rangeType: "melee",
  isBasicAttack: false,
  isStance: true,
  description: "Brace weapon. Free attack against enemies that enter an adjacent hex.",
};

const ALL_SKILLS: readonly SkillDef[] = [
  BASIC_ATTACK,
  RANGED_ATTACK,
  PUNCTURE,
  STUN,
  SPLIT_SHIELD,
  SPEARWALL,
];

/**
 * Return skills available for a given weapon.
 * Always includes the appropriate basic attack, plus any matching specials.
 */
export function getSkillsForWeapon(weaponId: string): SkillDef[] {
  const weapon: WeaponDef = getWeapon(weaponId);
  const isRanged = weapon.family === "bow" || weapon.family === "crossbow" || weapon.family === "throwing";

  const skills: SkillDef[] = [];

  // Basic attack (melee or ranged depending on weapon)
  skills.push(isRanged ? RANGED_ATTACK : BASIC_ATTACK);

  // Add matching special skills
  for (const skill of ALL_SKILLS) {
    if (skill.isBasicAttack) continue;
    if (skill.weaponFamilies.length === 0 || skill.weaponFamilies.includes(weapon.family)) {
      skills.push(skill);
    }
  }

  return skills;
}

/** Resolve effective AP cost: skill override or weapon default. */
export function skillAPCost(skill: SkillDef, weapon: WeaponDef): number {
  return skill.apCost > 0 ? skill.apCost : weapon.apCost;
}

/** Resolve effective stamina cost: weapon base + skill extra. */
export function skillStaminaCost(skill: SkillDef, weapon: WeaponDef): number {
  return weapon.staminaCost + skill.staminaExtra;
}

/** Resolve effective range: skill override or weapon default. */
export function skillRange(skill: SkillDef, weapon: WeaponDef): number {
  return skill.range > 0 ? skill.range : weapon.range;
}
