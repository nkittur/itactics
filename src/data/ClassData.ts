/**
 * ClassData.ts — Class lookup and equipment helpers.
 * All classes come from the loaded ruleset (skill_trees.txt). No legacy registry.
 */

import type { ClassDef, ClassInnatePasive } from "./ClassDefinition";
import type { WeaponFamily, WeaponDef } from "./WeaponData";
import type { ArmorWeight, ArmorDef } from "./ArmorData";
import type { ShieldDef } from "./ShieldData";
import { getClass as getRulesetClass, getClasses as getRulesetClasses } from "./ruleset/RulesetLoader";

// CharacterClass is now a string — any registered or ruleset class ID is valid.
export type CharacterClass = string;

export type ShieldAccess = "none" | "buckler" | "all";

// Re-export ClassDef so consumers can use it without changing imports.
export type { ClassDef } from "./ClassDefinition";

const ARMOR_WEIGHT_ORDER: Record<ArmorWeight, number> = {
  light: 0,
  medium: 1,
  heavy: 2,
};

/** Default base stats for all ruleset classes. */
const DEFAULT_RULESET_BASE_STATS: ClassDef["baseStats"] = {
  hitpoints: 100,
  stamina: 100,
  mana: 20,
  resolve: 50,
  initiative: 40,
  meleeSkill: 50,
  rangedSkill: 30,
  dodge: 20,
  magicResist: 5,
  critChance: 5,
  critMultiplier: 1.5,
  movementPoints: 8,
};

function rulesetClassToClassDef(rulesetClass: ReturnType<typeof getRulesetClass>): ClassDef {
  if (!rulesetClass) throw new Error("rulesetClass required");
  return {
    id: rulesetClass.id,
    name: rulesetClass.name,
    description: rulesetClass.fantasy,
    role: rulesetClass.subtitle,
    category: "hybrid",
    tags: [],
    baseStats: DEFAULT_RULESET_BASE_STATS,
    statGrowth: {},
    resources: [{ resourceId: "stamina", maxOverride: 100 }],
    weaponFamilies: ["dagger", "sword", "axe", "mace", "spear", "staff", "wand", "bow", "crossbow", "throwing", "flail", "cleaver", "polearm"],
    shieldAccess: "all",
    maxArmorWeight: "heavy",
    baseMP: 8,
    innatePassives: [],
    archetypes: rulesetClass.archetypes.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.identity,
      playstyle: a.mechanic,
      tags: [],
      synergies: [],
      skillTree: [],
    })) as unknown as ClassDef["archetypes"],
    themeColor: "#888888",
    icon: "class_default",
  };
}

// ── Core lookup (ruleset only) ──

/** Get class definition; throws if class id not in current ruleset. */
export function getClassDef(classId: string): ClassDef {
  const rulesetClass = getRulesetClass(classId);
  if (!rulesetClass) throw new Error(`Unknown class: ${classId}`);
  return rulesetClassToClassDef(rulesetClass);
}

/** Get class definition or undefined if not in ruleset. */
export function getClassDefOptional(classId: string): ClassDef | undefined {
  const rulesetClass = getRulesetClass(classId);
  if (!rulesetClass) return undefined;
  return rulesetClassToClassDef(rulesetClass);
}

export function getAllCharacterClasses(): string[] {
  return getRulesetClasses().map((c) => c.id);
}

// ── Equipment checks ──

export function canEquipWeapon(classDef: ClassDef, weaponDef: WeaponDef): boolean {
  if (classDef.maxWeaponHands && weaponDef.hands > classDef.maxWeaponHands) return false;
  if (classDef.weaponFamilies.length === 0) return true;
  return classDef.weaponFamilies.includes(weaponDef.family);
}

export function canEquipArmor(classDef: ClassDef, armorDef: ArmorDef): boolean {
  return ARMOR_WEIGHT_ORDER[armorDef.weight] <= ARMOR_WEIGHT_ORDER[classDef.maxArmorWeight];
}

export function canEquipShield(classDef: ClassDef, shieldDef: ShieldDef): boolean {
  if (classDef.shieldAccess === "none") return false;
  if (classDef.shieldAccess === "all") return true;
  return shieldDef.id === "buckler";
}

// ── Passive helpers (reads from ClassDef.innatePassives) ──

function findPassives(classDef: ClassDef, type: ClassInnatePasive["type"]): ClassInnatePasive[] {
  return classDef.innatePassives.filter(p => p.type === type);
}

/** Get AP discount for a weapon/range type. */
export function getClassAPDiscount(classDef: ClassDef, weapon: WeaponDef, rangeType: "melee" | "ranged"): number {
  let discount = 0;
  for (const p of findPassives(classDef, "weapon_proficiency")) {
    if (p.params.family === weapon.family) discount += (p.params.apDiscount ?? 0);
    if (p.params.qualifier === "ranged" && rangeType === "ranged") discount += (p.params.apDiscount ?? 0);
  }
  return discount;
}

/** Get damage bonus percentage. Returns 0 or percentage (e.g. 15). */
export function getClassDamageBonus(classDef: ClassDef, weapon: WeaponDef): number {
  let bonus = 0;
  for (const p of findPassives(classDef, "damage_type_bonus")) {
    if (p.params.qualifier === "2H" && weapon.hands === 2) bonus += (p.params.bonusPercent ?? 0);
    if (p.params.damageType === "magical" && weapon.damageType === "magical") bonus += (p.params.bonusPercent ?? 0);
  }
  return bonus;
}

/** Get hit bonus from class passives (flat addition to hit chance). */
export function getClassHitBonus(classDef: ClassDef, weapon: WeaponDef): number {
  let bonus = 0;
  for (const p of findPassives(classDef, "stat_bonus")) {
    if (p.params.stat === "hit" && p.params.qualifier === weapon.family) bonus += (p.params.value ?? 0);
  }
  return bonus;
}

/** Get armor MP reduction from class passives. */
export function getClassArmorMPReduction(classDef: ClassDef): number {
  let reduction = 0;
  for (const p of findPassives(classDef, "armor_proficiency")) {
    reduction += (p.params.armorMPReduction ?? 0);
  }
  return reduction;
}

// ── Display helpers ──

export function getClassAbbrev(classId: string): string {
  const def = getClassDefOptional(classId);
  if (!def) return classId.slice(0, 3).toUpperCase();
  // Generate 3-char abbreviation from class name
  const name = def.name;
  if (name.includes(" ")) {
    // Multi-word: first letter of each word
    return name.split(" ").map(w => w[0]).join("").slice(0, 3);
  }
  return name.slice(0, 3);
}

const WEAPON_FAMILY_ICON: Record<WeaponFamily, string> = {
  sword: "Swd", axe: "Axe", mace: "Mce", flail: "Fll",
  cleaver: "Clv", spear: "Spr", polearm: "Pol", dagger: "Dgr",
  bow: "Bow", crossbow: "Xbw", throwing: "Thr", staff: "Stf", wand: "Wnd",
};

export const ARMOR_WEIGHT_ICON: Record<ArmorWeight, string> = {
  light: "Lt", medium: "Med", heavy: "Hvy",
};

export const SHIELD_ACCESS_ICON: Record<ShieldAccess, string> = {
  none: "", buckler: "Bkl", all: "Shd",
};

export function getClassEquipIcons(classDef: ClassDef): string[] {
  const icons: string[] = [];
  for (const fam of classDef.weaponFamilies) {
    const icon = WEAPON_FAMILY_ICON[fam as WeaponFamily];
    if (icon) icons.push(icon);
  }
  icons.push(ARMOR_WEIGHT_ICON[classDef.maxArmorWeight]);
  if (classDef.shieldAccess !== "none") icons.push(SHIELD_ACCESS_ICON[classDef.shieldAccess]);
  return icons;
}
