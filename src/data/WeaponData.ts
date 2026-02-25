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
    minDamage: 3, maxDamage: 5, armorDamageMult: 0.80, armorIgnorePct: 0.15,
    apCost: 4, fatigueCost: 10, range: 1, hands: 1, hitChanceBonus: 15,
  }],
  ["arming_sword", {
    id: "arming_sword", name: "Arming Sword", family: "sword",
    minDamage: 4, maxDamage: 6, armorDamageMult: 0.80, armorIgnorePct: 0.20,
    apCost: 4, fatigueCost: 12, range: 1, hands: 1, hitChanceBonus: 5,
  }],

  // ── Axes ──
  ["hand_axe", {
    id: "hand_axe", name: "Hand Axe", family: "axe",
    minDamage: 4, maxDamage: 7, armorDamageMult: 1.30, armorIgnorePct: 0.10,
    apCost: 4, fatigueCost: 14, range: 1, hands: 1, hitChanceBonus: 0,
  }],

  // ── Maces ──
  ["winged_mace", {
    id: "winged_mace", name: "Winged Mace", family: "mace",
    minDamage: 3, maxDamage: 5, armorDamageMult: 0.80, armorIgnorePct: 0.35,
    apCost: 4, fatigueCost: 13, range: 1, hands: 1, hitChanceBonus: 0,
  }],

  // ── Spears ──
  ["spear", {
    id: "spear", name: "Spear", family: "spear",
    minDamage: 3, maxDamage: 5, armorDamageMult: 0.80, armorIgnorePct: 0.15,
    apCost: 4, fatigueCost: 10, range: 1, hands: 1, hitChanceBonus: 20,
  }],

  // ── Daggers ──
  ["dagger", {
    id: "dagger", name: "Dagger", family: "dagger",
    minDamage: 2, maxDamage: 3, armorDamageMult: 0.50, armorIgnorePct: 0.35,
    apCost: 3, fatigueCost: 8, range: 1, hands: 1, hitChanceBonus: 0,
  }],

  // ── Two-Handed ──
  ["longsword", {
    id: "longsword", name: "Longsword", family: "sword",
    minDamage: 6, maxDamage: 10, armorDamageMult: 0.80, armorIgnorePct: 0.25,
    apCost: 6, fatigueCost: 20, range: 1, hands: 2, hitChanceBonus: 5,
  }],
  ["pike", {
    id: "pike", name: "Pike", family: "polearm",
    minDamage: 5, maxDamage: 8, armorDamageMult: 0.60, armorIgnorePct: 0.30,
    apCost: 6, fatigueCost: 18, range: 2, hands: 2, hitChanceBonus: 0,
  }],

  // ── Ranged ──
  ["short_bow", {
    id: "short_bow", name: "Short Bow", family: "bow",
    minDamage: 3, maxDamage: 5, armorDamageMult: 0.50, armorIgnorePct: 0.15,
    apCost: 4, fatigueCost: 10, range: 5, hands: 2, hitChanceBonus: 0,
  }],
  ["hunting_bow", {
    id: "hunting_bow", name: "Hunting Bow", family: "bow",
    minDamage: 4, maxDamage: 7, armorDamageMult: 0.50, armorIgnorePct: 0.20,
    apCost: 5, fatigueCost: 14, range: 6, hands: 2, hitChanceBonus: -5,
  }],
]);

/** Fallback when a unit has no weapon equipped. */
export const UNARMED: WeaponDef = {
  id: "unarmed", name: "Unarmed", family: "dagger",
  minDamage: 1, maxDamage: 2, armorDamageMult: 0.50, armorIgnorePct: 0.50,
  apCost: 3, fatigueCost: 5, range: 1, hands: 1, hitChanceBonus: 0,
};

export function getWeapon(id: string): WeaponDef {
  return WEAPONS.get(id) ?? UNARMED;
}

export function getAllWeapons(): ReadonlyMap<string, WeaponDef> {
  return WEAPONS;
}
