/**
 * ClassData.ts — Adapter over the new ClassDefinition system.
 *
 * All 18+ classes are registered via ClassRegistry.ts (imported at startup).
 * This file provides backward-compatible functions that the rest of the
 * codebase uses (getClassDef, canEquipWeapon, etc.).
 */

import {
  getClassDefNew,
  getAllClassDefs,
  type ClassDef,
  type ClassInnatePasive,
} from "./ClassDefinition";
import type { WeaponFamily, WeaponDef } from "./WeaponData";
import type { ArmorWeight, ArmorDef } from "./ArmorData";
import type { ShieldDef } from "./ShieldData";

// CharacterClass is now a string — any registered class ID is valid.
export type CharacterClass = string;

export type ShieldAccess = "none" | "buckler" | "all";

// Re-export ClassDef so consumers can use it without changing imports.
export type { ClassDef } from "./ClassDefinition";

const ARMOR_WEIGHT_ORDER: Record<ArmorWeight, number> = {
  light: 0,
  medium: 1,
  heavy: 2,
};

// ── Core lookup ──

export function getClassDef(classId: string): ClassDef {
  const def = getClassDefNew(classId);
  if (!def) throw new Error(`Unknown class: ${classId}`);
  return def;
}

export function getAllCharacterClasses(): string[] {
  return getAllClassDefs().map(c => c.id);
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
  const def = getClassDefNew(classId);
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
