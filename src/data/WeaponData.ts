export type WeaponFamily =
  | "sword"
  | "axe"
  | "mace"
  | "flail"
  | "cleaver"
  | "spear"
  | "polearm"
  | "dagger"
  | "bow"
  | "crossbow"
  | "throwing"
  | "staff"
  | "wand";

export type DamageType = "physical" | "magical";

export interface WeaponDef {
  readonly id: string;
  readonly name: string;
  readonly family: WeaponFamily;
  readonly damageType: DamageType;
  readonly minDamage: number;
  readonly maxDamage: number;
  readonly apCost: number;
  readonly staminaCost: number;
  readonly manaCost: number;
  /** 1 = adjacent melee, 2 = reach weapon, 3+ = ranged. */
  readonly range: number;
  readonly hands: 1 | 2;
  /** Additive bonus to hit chance from weapon family / design. */
  readonly hitChanceBonus: number;
  /** Bonus crit chance (e.g., daggers +5%). */
  readonly critChanceBonus: number;
  /** Flat armor ignored on hit. */
  readonly armorPiercing: number;
  readonly level: number;
}

const WEAPONS: ReadonlyMap<string, WeaponDef> = new Map([
  // ── Swords ──
  ["short_sword", {
    id: "short_sword", name: "Short Sword", family: "sword", damageType: "physical",
    minDamage: 3, maxDamage: 5, apCost: 4, staminaCost: 10, manaCost: 0,
    range: 1, hands: 1, hitChanceBonus: 15, critChanceBonus: 0, armorPiercing: 0, level: 1,
  }],
  ["arming_sword", {
    id: "arming_sword", name: "Arming Sword", family: "sword", damageType: "physical",
    minDamage: 4, maxDamage: 6, apCost: 4, staminaCost: 12, manaCost: 0,
    range: 1, hands: 1, hitChanceBonus: 5, critChanceBonus: 0, armorPiercing: 0, level: 2,
  }],

  // ── Axes ──
  ["hand_axe", {
    id: "hand_axe", name: "Hand Axe", family: "axe", damageType: "physical",
    minDamage: 4, maxDamage: 7, apCost: 4, staminaCost: 14, manaCost: 0,
    range: 1, hands: 1, hitChanceBonus: 0, critChanceBonus: 0, armorPiercing: 1, level: 2,
  }],

  // ── Maces ──
  ["winged_mace", {
    id: "winged_mace", name: "Winged Mace", family: "mace", damageType: "physical",
    minDamage: 3, maxDamage: 5, apCost: 4, staminaCost: 13, manaCost: 0,
    range: 1, hands: 1, hitChanceBonus: 0, critChanceBonus: 0, armorPiercing: 3, level: 2,
  }],

  // ── Spears ──
  ["spear", {
    id: "spear", name: "Spear", family: "spear", damageType: "physical",
    minDamage: 3, maxDamage: 5, apCost: 4, staminaCost: 10, manaCost: 0,
    range: 1, hands: 1, hitChanceBonus: 20, critChanceBonus: 0, armorPiercing: 0, level: 1,
  }],

  // ── Daggers ──
  ["dagger", {
    id: "dagger", name: "Dagger", family: "dagger", damageType: "physical",
    minDamage: 2, maxDamage: 3, apCost: 3, staminaCost: 8, manaCost: 0,
    range: 1, hands: 1, hitChanceBonus: 0, critChanceBonus: 5, armorPiercing: 2, level: 1,
  }],

  // ── Two-Handed ──
  ["longsword", {
    id: "longsword", name: "Longsword", family: "sword", damageType: "physical",
    minDamage: 6, maxDamage: 10, apCost: 6, staminaCost: 20, manaCost: 0,
    range: 1, hands: 2, hitChanceBonus: 5, critChanceBonus: 0, armorPiercing: 0, level: 3,
  }],
  ["pike", {
    id: "pike", name: "Pike", family: "polearm", damageType: "physical",
    minDamage: 5, maxDamage: 8, apCost: 6, staminaCost: 18, manaCost: 0,
    range: 2, hands: 2, hitChanceBonus: 0, critChanceBonus: 0, armorPiercing: 1, level: 3,
  }],

  // ── Staves ──
  ["oak_staff", {
    id: "oak_staff", name: "Oak Staff", family: "staff", damageType: "physical",
    minDamage: 2, maxDamage: 4, apCost: 4, staminaCost: 8, manaCost: 0,
    range: 2, hands: 2, hitChanceBonus: 5, critChanceBonus: 0, armorPiercing: 0, level: 1,
  }],
  ["iron_staff", {
    id: "iron_staff", name: "Iron Staff", family: "staff", damageType: "physical",
    minDamage: 3, maxDamage: 5, apCost: 4, staminaCost: 10, manaCost: 0,
    range: 2, hands: 2, hitChanceBonus: 5, critChanceBonus: 0, armorPiercing: 0, level: 2,
  }],

  // ── Ranged ──
  ["short_bow", {
    id: "short_bow", name: "Short Bow", family: "bow", damageType: "physical",
    minDamage: 3, maxDamage: 5, apCost: 4, staminaCost: 10, manaCost: 0,
    range: 5, hands: 2, hitChanceBonus: 0, critChanceBonus: 0, armorPiercing: 0, level: 1,
  }],
  ["hunting_bow", {
    id: "hunting_bow", name: "Hunting Bow", family: "bow", damageType: "physical",
    minDamage: 4, maxDamage: 7, apCost: 5, staminaCost: 14, manaCost: 0,
    range: 6, hands: 2, hitChanceBonus: -5, critChanceBonus: 0, armorPiercing: 0, level: 2,
  }],

  // ── Wands ──
  ["wooden_wand", {
    id: "wooden_wand", name: "Wooden Wand", family: "wand", damageType: "magical",
    minDamage: 1, maxDamage: 3, apCost: 4, staminaCost: 0, manaCost: 0,
    range: 4, hands: 1, hitChanceBonus: 0, critChanceBonus: 0, armorPiercing: 0, level: 1,
  }],
  ["crystal_wand", {
    id: "crystal_wand", name: "Crystal Wand", family: "wand", damageType: "magical",
    minDamage: 2, maxDamage: 4, apCost: 4, staminaCost: 0, manaCost: 0,
    range: 4, hands: 1, hitChanceBonus: 5, critChanceBonus: 0, armorPiercing: 0, level: 2,
  }],
]);

/** Fallback when a unit has no weapon equipped. */
export const UNARMED: WeaponDef = {
  id: "unarmed", name: "Unarmed", family: "dagger", damageType: "physical",
  minDamage: 1, maxDamage: 2, apCost: 3, staminaCost: 5, manaCost: 0,
  range: 1, hands: 1, hitChanceBonus: 0, critChanceBonus: 0, armorPiercing: 0, level: 0,
};

export function getWeapon(id: string): WeaponDef {
  return WEAPONS.get(id) ?? UNARMED;
}

export function getAllWeapons(): ReadonlyMap<string, WeaponDef> {
  return WEAPONS;
}
