import type { WeaponFamily, WeaponDef } from "./WeaponData";
import type { ArmorWeight, ArmorDef } from "./ArmorData";
import type { ShieldDef } from "./ShieldData";

export type CharacterClass = "fighter" | "knight" | "rogue" | "ranger" | "spearman" | "brute" | "occultist" | "priest";

export type ShieldAccess = "none" | "buckler" | "all";

export interface ClassPassive {
  readonly type: "armor_mp_reduction" | "ap_discount" | "damage_bonus" | "hit_bonus";
  /** For ap_discount: weapon family or "ranged". For damage_bonus: "2H". For hit_bonus: weapon family. */
  readonly qualifier?: string;
  readonly value: number;
}

export interface ClassDef {
  readonly id: CharacterClass;
  readonly name: string;
  readonly weaponFamilies: readonly WeaponFamily[];
  readonly shieldAccess: ShieldAccess;
  readonly maxArmorWeight: ArmorWeight;
  readonly baseMP: number;
  readonly passives: readonly ClassPassive[];
}

const ARMOR_WEIGHT_ORDER: Record<ArmorWeight, number> = {
  light: 0,
  medium: 1,
  heavy: 2,
};

const CLASS_DATA: ReadonlyMap<CharacterClass, ClassDef> = new Map([
  ["fighter", {
    id: "fighter",
    name: "Fighter",
    weaponFamilies: ["dagger", "sword", "cleaver", "axe", "mace", "flail", "spear", "polearm", "throwing"],
    shieldAccess: "all",
    maxArmorWeight: "heavy",
    baseMP: 8,
    passives: [],
  }],
  ["knight", {
    id: "knight",
    name: "Knight",
    weaponFamilies: ["sword", "mace"],
    shieldAccess: "all",
    maxArmorWeight: "heavy",
    baseMP: 7,
    passives: [{ type: "armor_mp_reduction", value: 1 }],
  }],
  ["rogue", {
    id: "rogue",
    name: "Rogue",
    weaponFamilies: ["dagger", "sword", "cleaver", "throwing"],
    shieldAccess: "buckler",
    maxArmorWeight: "light",
    baseMP: 10,
    passives: [{ type: "ap_discount", qualifier: "dagger", value: 1 }],
  }],
  ["ranger", {
    id: "ranger",
    name: "Ranger",
    weaponFamilies: ["bow", "crossbow", "throwing", "dagger", "sword"],
    shieldAccess: "buckler",
    maxArmorWeight: "medium",
    baseMP: 9,
    passives: [{ type: "ap_discount", qualifier: "ranged", value: 1 }],
  }],
  ["spearman", {
    id: "spearman",
    name: "Spearman",
    weaponFamilies: ["spear", "polearm", "sword", "dagger"],
    shieldAccess: "all",
    maxArmorWeight: "heavy",
    baseMP: 8,
    passives: [{ type: "hit_bonus", qualifier: "spear", value: 5 }],
  }],
  ["brute", {
    id: "brute",
    name: "Brute",
    weaponFamilies: ["sword", "axe", "mace", "cleaver", "flail", "throwing", "dagger"],
    shieldAccess: "none",
    maxArmorWeight: "medium",
    baseMP: 9,
    passives: [{ type: "damage_bonus", qualifier: "2H", value: 15 }],
  }],
  ["occultist", {
    id: "occultist",
    name: "Occultist",
    weaponFamilies: ["wand", "staff", "dagger"],
    shieldAccess: "none",
    maxArmorWeight: "light",
    baseMP: 9,
    passives: [{ type: "damage_bonus", qualifier: "magical", value: 15 }],
  }],
  ["priest", {
    id: "priest",
    name: "Priest",
    weaponFamilies: ["staff", "mace", "wand"],
    shieldAccess: "buckler",
    maxArmorWeight: "medium",
    baseMP: 8,
    passives: [{ type: "ap_discount", qualifier: "staff", value: 1 }],
  }],
]);

export function getClassDef(classId: CharacterClass): ClassDef {
  return CLASS_DATA.get(classId)!;
}

/** Check if a class can equip a weapon. Knight has special 1H-only restriction. */
export function canEquipWeapon(classDef: ClassDef, weaponDef: WeaponDef): boolean {
  if (!classDef.weaponFamilies.includes(weaponDef.family)) return false;
  // Knight: 1H only
  if (classDef.id === "knight" && weaponDef.hands === 2) return false;
  return true;
}

/** Check if a class can equip armor of a given tier. */
export function canEquipArmor(classDef: ClassDef, armorDef: ArmorDef): boolean {
  return ARMOR_WEIGHT_ORDER[armorDef.weight] <= ARMOR_WEIGHT_ORDER[classDef.maxArmorWeight];
}

/** Check if a class can equip a shield. */
export function canEquipShield(classDef: ClassDef, shieldDef: ShieldDef): boolean {
  if (classDef.shieldAccess === "none") return false;
  if (classDef.shieldAccess === "all") return true;
  // "buckler" — only allow buckler
  return shieldDef.id === "buckler";
}

/** Get AP discount from class passives for a weapon/range type. */
export function getClassAPDiscount(classDef: ClassDef, weapon: WeaponDef, rangeType: "melee" | "ranged"): number {
  let discount = 0;
  for (const p of classDef.passives) {
    if (p.type !== "ap_discount") continue;
    if (p.qualifier === weapon.family) discount += p.value;
    if (p.qualifier === "ranged" && rangeType === "ranged") discount += p.value;
  }
  return discount;
}

/** Get damage bonus percentage from class passives. Returns 0 or percentage (e.g. 15). */
export function getClassDamageBonus(classDef: ClassDef, weapon: WeaponDef): number {
  let bonus = 0;
  for (const p of classDef.passives) {
    if (p.type !== "damage_bonus") continue;
    if (p.qualifier === "2H" && weapon.hands === 2) bonus += p.value;
    if (p.qualifier === "magical" && weapon.damageType === "magical") bonus += p.value;
  }
  return bonus;
}

/** Get hit bonus from class passives (flat addition to hit chance). */
export function getClassHitBonus(classDef: ClassDef, weapon: WeaponDef): number {
  let bonus = 0;
  for (const p of classDef.passives) {
    if (p.type !== "hit_bonus") continue;
    if (p.qualifier === weapon.family) bonus += p.value;
  }
  return bonus;
}

// ── Equipment icon language ──

export const WEAPON_FAMILY_ICON: Record<WeaponFamily, string> = {
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

/** Get all equipment icon abbreviations for a class. */
export function getClassEquipIcons(classDef: ClassDef): string[] {
  const icons: string[] = [];
  for (const fam of classDef.weaponFamilies) icons.push(WEAPON_FAMILY_ICON[fam]);
  icons.push(ARMOR_WEIGHT_ICON[classDef.maxArmorWeight]);
  if (classDef.shieldAccess !== "none") icons.push(SHIELD_ACCESS_ICON[classDef.shieldAccess]);
  return icons;
}

/** Get short class name abbreviation. */
export function getClassAbbrev(classId: CharacterClass): string {
  const abbrevs: Record<CharacterClass, string> = {
    fighter: "Fig", knight: "Kni", rogue: "Rog", ranger: "Rng",
    spearman: "Spr", brute: "Brt", occultist: "Occ", priest: "Pri",
  };
  return abbrevs[classId];
}

/** Get armor MP reduction from class passives (Knight: reduces armor MP penalty). */
export function getClassArmorMPReduction(classDef: ClassDef): number {
  let reduction = 0;
  for (const p of classDef.passives) {
    if (p.type === "armor_mp_reduction") reduction += p.value;
  }
  return reduction;
}
