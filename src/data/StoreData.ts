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
  // Weapons — Tier 2
  arming_sword: 150,
  hand_axe: 150,
  winged_mace: 140,
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
  // Body armor
  linen_tunic: 30,
  leather_jerkin: 80,
  mail_hauberk: 200,
  coat_of_plates: 350,
  // Head armor
  hood: 25,
  leather_cap: 50,
  mail_coif: 120,
  nasal_helm: 180,
  // Consumables
  health_potion: 40,
};

/** Gold earned from a battle victory. */
export function calculateGoldReward(killCount: number, scenarioIndex: number): number {
  return killCount * 50 + 100 + scenarioIndex * 25;
}

/** Get the price of an item, or 0 if unknown. */
export function getItemPrice(itemId: string): number {
  if (isGeneratedItemId(itemId)) {
    const gen = getItemRegistry()[itemId];
    if (gen) return gen.buyPrice;
  }
  return PRICES[itemId] ?? 0;
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
