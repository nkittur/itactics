import { getWeapon, UNARMED } from "./WeaponData";
import { getShield } from "./ShieldData";
import { getArmorDef } from "./ArmorData";
import { isGeneratedItemId } from "./GeneratedItemData";
import { getItemRegistry } from "./ItemResolver";

export type ItemCategory = "consumable" | "weapon" | "shield";

export interface ConsumableItemDef {
  id: string;
  name: string;
  category: "consumable";
  description: string;
  apCost: number;
  effect: { type: "heal"; amount: number };
}

export type ItemDef = ConsumableItemDef;

const CONSUMABLES: Record<string, ConsumableItemDef> = {
  health_potion: {
    id: "health_potion",
    name: "Health Potion",
    category: "consumable",
    description: "Restores 25 HP",
    apCost: 4,
    effect: { type: "heal", amount: 25 },
  },
};

export function getConsumable(id: string): ConsumableItemDef | undefined {
  return CONSUMABLES[id];
}

/** Returns the category of an item: "consumable", "weapon", "shield", or "unknown". */
export function getItemCategory(id: string): "consumable" | "weapon" | "shield" | "unknown" {
  if (isGeneratedItemId(id)) {
    const gen = getItemRegistry()[id];
    if (gen) {
      if (gen.slotType === "weapon") return "weapon";
      if (gen.slotType === "shield") return "shield";
      if (gen.slotType === "consumable") return "consumable";
      return "unknown";
    }
  }
  if (CONSUMABLES[id]) return "consumable";
  const weapon = getWeapon(id);
  if (weapon !== UNARMED) return "weapon";
  if (getShield(id)) return "shield";
  return "unknown";
}

/** Returns a display name for any item ID (consumable, weapon, shield, or armor). */
export function getItemName(id: string): string {
  if (isGeneratedItemId(id)) {
    const gen = getItemRegistry()[id];
    if (gen) return gen.name;
  }

  const consumable = CONSUMABLES[id];
  if (consumable) return consumable.name;

  const weapon = getWeapon(id);
  if (weapon !== UNARMED) return weapon.name;

  const shield = getShield(id);
  if (shield) return shield.name;

  const armor = getArmorDef(id);
  if (armor) return armor.name;

  return id; // fallback to raw id
}
