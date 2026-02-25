import { getWeapon, UNARMED, type WeaponDef } from "./WeaponData";
import { getShield, type ShieldDef } from "./ShieldData";
import { getArmorDef, type ArmorDef } from "./ArmorData";
import { getItemName as getStaticItemName } from "./ItemData";
import { isGeneratedItemId, type GeneratedItem } from "./GeneratedItemData";

let itemRegistry: Record<string, GeneratedItem> = {};

export function setItemRegistry(registry: Record<string, GeneratedItem>): void {
  itemRegistry = registry;
}

export function getItemRegistry(): Record<string, GeneratedItem> {
  return itemRegistry;
}

export function resolveWeapon(id: string): WeaponDef {
  if (!isGeneratedItemId(id)) return getWeapon(id);

  const gen = itemRegistry[id];
  if (!gen) return UNARMED;

  const base = getWeapon(gen.baseId);
  if (base === UNARMED && gen.baseId !== "unarmed") return UNARMED;

  const mutable = { ...base, id, name: gen.name } as unknown as Record<string, unknown>;

  // Apply item level: +1 min/max damage per level
  mutable.minDamage = base.minDamage + gen.itemLevel;
  mutable.maxDamage = base.maxDamage + gen.itemLevel;

  // Apply modifiers
  for (const mod of gen.modifiers) {
    if (mod.stat in mutable) {
      (mutable[mod.stat] as number) += mod.delta;
    }
  }

  return mutable as unknown as WeaponDef;
}

export function resolveShield(id: string): ShieldDef | undefined {
  if (!isGeneratedItemId(id)) return getShield(id);

  const gen = itemRegistry[id];
  if (!gen) return undefined;

  const base = getShield(gen.baseId);
  if (!base) return undefined;

  const result = { ...base, id, name: gen.name } as Record<string, unknown>;

  // Apply item level: +2 meleeDefBonus, +1 rangedDefBonus, +2 durability per level
  result.meleeDefBonus = (base.meleeDefBonus) + gen.itemLevel * 2;
  result.rangedDefBonus = (base.rangedDefBonus) + gen.itemLevel * 1;
  result.durability = (base.durability) + gen.itemLevel * 2;

  // Apply modifiers
  for (const mod of gen.modifiers) {
    if (mod.stat in result) {
      (result[mod.stat] as number) += mod.delta;
    }
  }

  return result as unknown as ShieldDef;
}

export function resolveArmor(id: string): ArmorDef | undefined {
  if (!isGeneratedItemId(id)) return getArmorDef(id);

  const gen = itemRegistry[id];
  if (!gen) return undefined;

  const base = getArmorDef(gen.baseId);
  if (!base) return undefined;

  const result = { ...base, id, name: gen.name } as Record<string, unknown>;

  // Apply item level: +2 durability per level
  result.durability = (base.durability) + gen.itemLevel * 2;

  // Apply modifiers
  for (const mod of gen.modifiers) {
    if (mod.stat in result) {
      (result[mod.stat] as number) += mod.delta;
    }
  }

  return result as unknown as ArmorDef;
}

export function resolveItemName(id: string): string {
  if (!isGeneratedItemId(id)) return getStaticItemName(id);

  const gen = itemRegistry[id];
  return gen ? gen.name : id;
}
