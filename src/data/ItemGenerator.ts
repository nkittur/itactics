import { generateUID, type GeneratedItem, type ItemModifier, type ItemSlotType } from "./GeneratedItemData";
import { getWeapon } from "./WeaponData";
import { getShield } from "./ShieldData";
import { getArmorDef } from "./ArmorData";
import { getItemName } from "./ItemData";

// ── Base item tiers by party level ──

const TIER_1_WEAPONS = ["dagger", "short_sword", "spear", "short_bow"];
const TIER_2_WEAPONS = ["arming_sword", "hand_axe", "winged_mace", "hunting_bow"];
const TIER_3_WEAPONS = ["longsword", "pike"];

const TIER_1_SHIELDS = ["buckler"];
const TIER_2_SHIELDS = ["wooden_shield"];
const TIER_3_SHIELDS = ["heater_shield"];

const TIER_1_BODY = ["linen_tunic"];
const TIER_2_BODY = ["leather_jerkin", "mail_hauberk"];
const TIER_3_BODY = ["coat_of_plates"];

const TIER_1_HEAD = ["hood"];
const TIER_2_HEAD = ["leather_cap", "mail_coif"];
const TIER_3_HEAD = ["nasal_helm"];

function getBasePools(partyLevel: number): {
  weapons: string[];
  shields: string[];
  bodyArmor: string[];
  headArmor: string[];
} {
  if (partyLevel <= 2) {
    return {
      weapons: TIER_1_WEAPONS,
      shields: TIER_1_SHIELDS,
      bodyArmor: TIER_1_BODY,
      headArmor: TIER_1_HEAD,
    };
  }
  if (partyLevel <= 4) {
    return {
      weapons: [...TIER_1_WEAPONS, ...TIER_2_WEAPONS],
      shields: [...TIER_1_SHIELDS, ...TIER_2_SHIELDS],
      bodyArmor: [...TIER_1_BODY, ...TIER_2_BODY],
      headArmor: [...TIER_1_HEAD, ...TIER_2_HEAD],
    };
  }
  return {
    weapons: [...TIER_1_WEAPONS, ...TIER_2_WEAPONS, ...TIER_3_WEAPONS],
    shields: [...TIER_1_SHIELDS, ...TIER_2_SHIELDS, ...TIER_3_SHIELDS],
    bodyArmor: [...TIER_1_BODY, ...TIER_2_BODY, ...TIER_3_BODY],
    headArmor: [...TIER_1_HEAD, ...TIER_2_HEAD, ...TIER_3_HEAD],
  };
}

// ── Item level roll ──

function rollItemLevel(partyLevel: number, rng: () => number): number {
  const r = rng();
  if (partyLevel <= 2) return 0;
  if (partyLevel <= 4) {
    if (r < 0.60) return 0;
    if (r < 0.90) return 1;
    return 2;
  }
  if (partyLevel <= 6) {
    if (r < 0.40) return 0;
    if (r < 0.75) return 1;
    if (r < 0.95) return 2;
    return 3;
  }
  // Level 7+
  if (r < 0.25) return 0;
  if (r < 0.60) return 1;
  if (r < 0.85) return 2;
  if (r < 0.97) return 3;
  return 4;
}

// ── Modifier count ──

function rollModifierCount(partyLevel: number, rng: () => number): number {
  const r = rng();
  if (partyLevel <= 2) {
    if (r < 0.40) return 0;
    if (r < 0.80) return 1;
    return 2;
  }
  if (partyLevel <= 4) {
    if (r < 0.20) return 0;
    if (r < 0.55) return 1;
    if (r < 0.85) return 2;
    return 3;
  }
  // Level 5+
  if (r < 0.10) return 0;
  if (r < 0.35) return 1;
  if (r < 0.70) return 2;
  return 3;
}

// ── Modifier pools ──

interface ModifierTemplate {
  stat: string;
  min: number;
  max: number;
  labelFn: (delta: number) => string;
}

const WEAPON_MODS: ModifierTemplate[] = [
  { stat: "minDamage", min: 1, max: 3, labelFn: d => `+${d} Min Damage` },
  { stat: "maxDamage", min: 1, max: 4, labelFn: d => `+${d} Max Damage` },
  { stat: "hitChanceBonus", min: 3, max: 10, labelFn: d => `+${d} Hit Chance` },
  { stat: "fatigueCost", min: -4, max: -1, labelFn: d => `${d} Fatigue Cost` },
  { stat: "apCost", min: -1, max: -1, labelFn: d => `${d} AP Cost` },
  { stat: "armorIgnorePct", min: 5, max: 15, labelFn: d => `+${d}% Armor Ignore` },
  { stat: "armorDamageMult", min: 10, max: 30, labelFn: d => `+${d}% Armor Damage` },
  { stat: "statusEffectChance", min: 5, max: 15, labelFn: d => `+${d}% Status Effect` },
];

const ARMOR_MODS: ModifierTemplate[] = [
  { stat: "durability", min: 2, max: 8, labelFn: d => `+${d} Durability` },
  { stat: "fatiguePenalty", min: -4, max: -1, labelFn: d => `${d} Fatigue Penalty` },
  { stat: "initiativePenalty", min: -3, max: -1, labelFn: d => `${d} Initiative Penalty` },
];

const SHIELD_MODS: ModifierTemplate[] = [
  { stat: "meleeDefBonus", min: 2, max: 5, labelFn: d => `+${d} Melee Defense` },
  { stat: "rangedDefBonus", min: 2, max: 4, labelFn: d => `+${d} Ranged Defense` },
  { stat: "durability", min: 2, max: 6, labelFn: d => `+${d} Durability` },
];

function rollInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function rollModifiers(pool: ModifierTemplate[], count: number, rng: () => number): ItemModifier[] {
  if (count === 0) return [];
  const available = [...pool];
  const result: ItemModifier[] = [];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(rng() * available.length);
    const tmpl = available[idx]!;
    available.splice(idx, 1);

    let delta: number;
    if (tmpl.stat === "armorIgnorePct" || tmpl.stat === "armorDamageMult") {
      // These are stored as fractions (0.05-0.15) but template uses percentages for readability
      const pctVal = rollInt(tmpl.min, tmpl.max, rng);
      delta = pctVal / 100;
      result.push({ stat: tmpl.stat, delta, label: tmpl.labelFn(pctVal) });
    } else {
      delta = rollInt(tmpl.min, tmpl.max, rng);
      result.push({ stat: tmpl.stat, delta, label: tmpl.labelFn(delta) });
    }
  }
  return result;
}

// ── Naming ──

const LEVEL_PREFIXES: Record<number, string> = {
  0: "Crafted",
  1: "Fine",
  2: "Superior",
  3: "Masterwork",
  4: "Legendary",
};

function generateName(baseName: string, itemLevel: number, modCount: number): string {
  if (itemLevel === 0 && modCount === 0) return baseName;
  if (itemLevel === 0) return `Crafted ${baseName}`;
  return `${LEVEL_PREFIXES[itemLevel] ?? "Legendary"} ${baseName}`;
}

// ── Pricing ──

const BASE_PRICES: Record<string, number> = {
  dagger: 50, short_sword: 80, spear: 80, short_bow: 120,
  arming_sword: 150, hand_axe: 150, winged_mace: 140, hunting_bow: 200,
  longsword: 250, pike: 240,
  buckler: 60, wooden_shield: 100, heater_shield: 160,
  linen_tunic: 30, leather_jerkin: 80, mail_hauberk: 200, coat_of_plates: 350,
  hood: 25, leather_cap: 50, mail_coif: 120, nasal_helm: 180,
  health_potion: 40,
};

function computePrice(baseId: string, itemLevel: number, modifiers: ItemModifier[], slotType: ItemSlotType): number {
  const basePrice = BASE_PRICES[baseId] ?? 50;
  let price = basePrice * (1 + itemLevel * 0.4);

  for (const mod of modifiers) {
    if (isBeneficial(mod, slotType)) {
      price *= 1.15;
    } else {
      price *= 0.90;
    }
  }

  return Math.round(price);
}

function isBeneficial(mod: ItemModifier, slotType: ItemSlotType): boolean {
  if (slotType === "weapon") {
    // Lower fatigueCost/apCost is better (negative delta)
    if (mod.stat === "fatigueCost" || mod.stat === "apCost") return mod.delta < 0;
    return mod.delta > 0;
  }
  // For armor/shield: lower fatiguePenalty/initiativePenalty is better (negative delta)
  if (mod.stat === "fatiguePenalty" || mod.stat === "initiativePenalty") return mod.delta < 0;
  return mod.delta > 0;
}

// ── Generate a single random item ──

export function generateRandomItem(
  baseId: string,
  slotType: ItemSlotType,
  partyLevel: number,
  rng: () => number,
): GeneratedItem {
  const itemLevel = rollItemLevel(partyLevel, rng);
  const modCount = rollModifierCount(partyLevel, rng);

  let pool: ModifierTemplate[];
  switch (slotType) {
    case "weapon": pool = WEAPON_MODS; break;
    case "shield": pool = SHIELD_MODS; break;
    default: pool = ARMOR_MODS; break;
  }

  const modifiers = rollModifiers(pool, modCount, rng);
  const baseName = getItemName(baseId) || baseId;
  const name = generateName(baseName, itemLevel, modifiers.length);
  const buyPrice = computePrice(baseId, itemLevel, modifiers, slotType);

  return {
    uid: generateUID(),
    baseId,
    slotType,
    name,
    itemLevel,
    modifiers,
    buyPrice,
  };
}

// ── Generate full shop inventory ──

export function generateShopInventory(
  partyLevel: number,
  registry: Record<string, GeneratedItem>,
  rng: () => number,
): string[] {
  const pools = getBasePools(partyLevel);
  const uids: string[] = [];

  // 2-3 weapons
  const weaponCount = rollInt(2, 3, rng);
  for (let i = 0; i < weaponCount; i++) {
    const baseId = pickRandom(pools.weapons, rng);
    const item = generateRandomItem(baseId, "weapon", partyLevel, rng);
    registry[item.uid] = item;
    uids.push(item.uid);
  }

  // 1-2 body armor
  const bodyCount = rollInt(1, 2, rng);
  for (let i = 0; i < bodyCount; i++) {
    const baseId = pickRandom(pools.bodyArmor, rng);
    const item = generateRandomItem(baseId, "body_armor", partyLevel, rng);
    registry[item.uid] = item;
    uids.push(item.uid);
  }

  // 0-1 head armor
  const headCount = rollInt(0, 1, rng);
  for (let i = 0; i < headCount; i++) {
    const baseId = pickRandom(pools.headArmor, rng);
    const item = generateRandomItem(baseId, "head_armor", partyLevel, rng);
    registry[item.uid] = item;
    uids.push(item.uid);
  }

  // 0-1 shields
  const shieldCount = rollInt(0, 1, rng);
  for (let i = 0; i < shieldCount; i++) {
    const baseId = pickRandom(pools.shields, rng);
    const item = generateRandomItem(baseId, "shield", partyLevel, rng);
    registry[item.uid] = item;
    uids.push(item.uid);
  }

  // 0-1 consumables
  if (rng() < 0.5) {
    const item = generateRandomItem("health_potion", "consumable", partyLevel, rng);
    registry[item.uid] = item;
    uids.push(item.uid);
  }

  return uids;
}

// ── Refresh cost ──

export function shopRefreshCost(partyLevel: number, refreshCount: number): number {
  return (10 + (partyLevel - 1) * 5) + refreshCount * 5;
}

// ── Quality color ──

export function qualityColor(itemLevel: number): string {
  switch (itemLevel) {
    case 0: return "#ffffff";
    case 1: return "#44cc44";
    case 2: return "#4488ff";
    case 3: return "#aa44ff";
    case 4: return "#ffaa22";
    default: return "#ffffff";
  }
}
