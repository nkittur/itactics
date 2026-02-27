import { getAllWeapons } from "./WeaponData";
import { getAllShields } from "./ShieldData";
import { getAllArmors } from "./ArmorData";
import { isGeneratedItemId } from "./GeneratedItemData";
import { getItemRegistry } from "./ItemResolver";

export type StoreCategory = "weapon" | "shield" | "body_armor" | "head_armor" | "consumable";

export interface StoreItem {
  itemId: string;
  category: StoreCategory;
  price: number;
}

/** Price table keyed by item ID. */
const PRICES: Record<string, number> = {
  // Weapons — Tier 1
  dagger: 50,
  short_sword: 80,
  spear: 80,
  oak_staff: 60,
  wooden_wand: 100,
  // Weapons — Tier 2
  arming_sword: 150,
  hand_axe: 150,
  winged_mace: 140,
  iron_staff: 120,
  crystal_wand: 180,
  // Weapons — Tier 3
  longsword: 250,
  pike: 240,
  // Weapons — Ranged
  short_bow: 120,
  hunting_bow: 200,
  // Shields
  buckler: 60,
  wooden_shield: 100,
  heater_shield: 160,
  kite_shield: 220,
  // Body armor
  cloth_tunic: 20,
  linen_tunic: 30,
  leather_jerkin: 80,
  chain_mail: 160,
  mail_hauberk: 200,
  scale_armor: 280,
  coat_of_plates: 350,
  plate_armor: 400,
  // Head armor
  hood: 25,
  leather_cap: 50,
  mail_coif: 120,
  nasal_helm: 180,
  great_helm: 250,
  // Consumables
  health_potion: 40,
};

/** Gold earned from a battle victory. */
export function calculateGoldReward(killCount: number, scenarioIndex: number): number {
  return killCount * 50 + 100 + scenarioIndex * 25;
}

/** Get a price scaled by party level. */
export function getScaledItemPrice(itemId: string, partyLevel: number, growthPerLevel: number): number {
  const base = getItemPrice(itemId);
  return Math.round(base * (1 + (partyLevel - 1) * growthPerLevel));
}

/** Get the price of an item, or 0 if unknown. */
export function getItemPrice(itemId: string): number {
  if (isGeneratedItemId(itemId)) {
    const gen = getItemRegistry()[itemId];
    if (gen) return gen.buyPrice;
  }
  return PRICES[itemId] ?? 0;
}

/**
 * Validates that every item in data catalogs has a price entry.
 * Returns an array of missing item IDs (empty = all covered).
 */
export function validatePriceCoverage(): string[] {
  const missing: string[] = [];
  for (const [id] of getAllWeapons()) {
    if (PRICES[id] == null) missing.push(id);
  }
  for (const [id] of getAllShields()) {
    if (PRICES[id] == null) missing.push(id);
  }
  for (const [id] of getAllArmors()) {
    if (PRICES[id] == null) missing.push(id);
  }
  return missing;
}

/** Get the full store inventory. */
export function getStoreInventory(): StoreItem[] {
  const items: StoreItem[] = [];

  for (const [, w] of getAllWeapons()) {
    const price = PRICES[w.id];
    if (price != null) {
      items.push({ itemId: w.id, category: "weapon", price });
    }
  }

  for (const [, s] of getAllShields()) {
    const price = PRICES[s.id];
    if (price != null) {
      items.push({ itemId: s.id, category: "shield", price });
    }
  }

  for (const [, a] of getAllArmors()) {
    const price = PRICES[a.id];
    if (price != null) {
      const cat: StoreCategory = a.slot === "body" ? "body_armor" : "head_armor";
      items.push({ itemId: a.id, category: cat, price });
    }
  }

  // Consumables
  const potionPrice = PRICES["health_potion"];
  if (potionPrice != null) {
    items.push({ itemId: "health_potion", category: "consumable", price: potionPrice });
  }

  return items;
}
