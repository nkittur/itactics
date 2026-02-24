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
  | "throwing";

export interface WeaponDef {
  readonly id: string;
  readonly name: string;
  readonly family: WeaponFamily;
  readonly minDamage: number;
  readonly maxDamage: number;
  /** Multiplier for damage applied to armor durability (e.g. 1.3 = 130%). */
  readonly armorDamageMult: number;
  /** Fraction of raw damage that bypasses armor entirely (e.g. 0.2 = 20%). */
  readonly armorIgnorePct: number;
  readonly apCost: number;
  readonly fatigueCost: number;
  /** 1 = adjacent melee, 2 = reach weapon, 3+ = ranged. */
  readonly range: number;
  readonly hands: 1 | 2;
  /** Additive bonus to hit chance from weapon family / design. */
  readonly hitChanceBonus: number;
}

const WEAPONS: ReadonlyMap<string, WeaponDef> = new Map([
  // ── Swords ──
  ["short_sword", {
    id: "short_sword", name: "Short Sword", family: "sword",
    minDamage: 20, maxDamage: 30, armorDamageMult: 0.80, armorIgnorePct: 0.15,
    apCost: 4, fatigueCost: 10, range: 1, hands: 1, hitChanceBonus: 15,
  }],
  ["arming_sword", {
    id: "arming_sword", name: "Arming Sword", family: "sword",
    minDamage: 30, maxDamage: 45, armorDamageMult: 0.80, armorIgnorePct: 0.20,
    apCost: 4, fatigueCost: 12, range: 1, hands: 1, hitChanceBonus: 5,
  }],

  // ── Axes ──
  ["hand_axe", {
    id: "hand_axe", name: "Hand Axe", family: "axe",
    minDamage: 30, maxDamage: 50, armorDamageMult: 1.30, armorIgnorePct: 0.10,
    apCost: 4, fatigueCost: 14, range: 1, hands: 1, hitChanceBonus: 0,
  }],

  // ── Maces ──
  ["winged_mace", {
    id: "winged_mace", name: "Winged Mace", family: "mace",
    minDamage: 25, maxDamage: 40, armorDamageMult: 0.80, armorIgnorePct: 0.35,
    apCost: 4, fatigueCost: 13, range: 1, hands: 1, hitChanceBonus: 0,
  }],

  // ── Spears ──
  ["spear", {
    id: "spear", name: "Spear", family: "spear",
    minDamage: 20, maxDamage: 35, armorDamageMult: 0.80, armorIgnorePct: 0.15,
    apCost: 4, fatigueCost: 10, range: 1, hands: 1, hitChanceBonus: 20,
  }],

  // ── Daggers ──
  ["dagger", {
    id: "dagger", name: "Dagger", family: "dagger",
    minDamage: 15, maxDamage: 25, armorDamageMult: 0.50, armorIgnorePct: 0.35,
    apCost: 3, fatigueCost: 8, range: 1, hands: 1, hitChanceBonus: 0,
  }],

  // ── Two-Handed ──
  ["longsword", {
    id: "longsword", name: "Longsword", family: "sword",
    minDamage: 45, maxDamage: 70, armorDamageMult: 0.80, armorIgnorePct: 0.25,
    apCost: 6, fatigueCost: 20, range: 1, hands: 2, hitChanceBonus: 5,
  }],
  ["pike", {
    id: "pike", name: "Pike", family: "polearm",
    minDamage: 35, maxDamage: 55, armorDamageMult: 0.60, armorIgnorePct: 0.30,
    apCost: 6, fatigueCost: 18, range: 2, hands: 2, hitChanceBonus: 0,
  }],
]);

/** Fallback when a unit has no weapon equipped. */
export const UNARMED: WeaponDef = {
  id: "unarmed", name: "Unarmed", family: "dagger",
  minDamage: 5, maxDamage: 10, armorDamageMult: 0.50, armorIgnorePct: 0.50,
  apCost: 3, fatigueCost: 5, range: 1, hands: 1, hitChanceBonus: 0,
};

export function getWeapon(id: string): WeaponDef {
  return WEAPONS.get(id) ?? UNARMED;
}

export function getAllWeapons(): ReadonlyMap<string, WeaponDef> {
  return WEAPONS;
}
