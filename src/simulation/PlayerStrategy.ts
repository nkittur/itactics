/**
 * Player strategy definitions for campaign simulation.
 * Each strategy implements a distinct playstyle for contract selection,
 * hiring, equipment purchasing, and skill tree unlocking.
 *
 * Equipment purchasing is fully data-driven — reads levels from WeaponData,
 * ArmorData, ShieldData and enforces class restrictions via ClassData.
 */

import type { ContractDef } from "@data/ContractData";
import type { RecruitDef } from "@data/RecruitData";
import type { RosterMember } from "@save/SaveManager";
import { getItemPrice, getScaledItemPrice, getStoreInventory, type StoreItem } from "@data/StoreData";
import type { SkillTreeNode } from "@data/SkillTreeData";
import { getPartyLevel } from "@data/RecruitData";
import { getWeapon } from "@data/WeaponData";
import { getArmorDef } from "@data/ArmorData";
import { getShield } from "@data/ShieldData";
import { getClassDef, canEquipWeapon, canEquipArmor, canEquipShield } from "@data/ClassData";
import type { BalanceParams } from "./CampaignSimulator";

// ── Types ──

export interface PurchaseDecision {
  rosterIndex: number;
  itemId: string;
  slot: "mainHand" | "offHand" | "bodyArmor" | "headArmor";
}

export interface PlayerStrategy {
  name: string;
  maxRoster: number;
  pickContract(contracts: ContractDef[], roster: RosterMember[], gold: number): ContractDef;
  shouldHire(recruit: RecruitDef, roster: RosterMember[], gold: number): boolean;
  buyEquipment(roster: RosterMember[], gold: number, partyLevel?: number, params?: BalanceParams): PurchaseDecision[];
  unlockNodes(member: RosterMember): string[];
}

// ── Data-driven helpers ──

/** Get item level from data catalogs. Returns 0 for unknown/null items. */
function getItemLevel(itemId: string | null | undefined, category: string): number {
  if (!itemId) return 0;
  if (category === "weapon") return getWeapon(itemId).level;
  if (category === "shield") return getShield(itemId)?.level ?? 0;
  if (category === "body_armor" || category === "head_armor") return getArmorDef(itemId)?.level ?? 0;
  return 0;
}

/**
 * Data-driven best affordable upgrade.
 * Respects class restrictions and 2H/shield conflicts.
 */
function bestAffordableUpgrade(
  member: RosterMember,
  category: string,
  gold: number,
  partyLevel?: number,
  params?: BalanceParams,
): { itemId: string; price: number } | null {
  const classDef = member.classId ? getClassDef(member.classId) : null;

  let currentLevel: number;
  if (category === "weapon") {
    currentLevel = getItemLevel(member.equipment.mainHand, "weapon");
  } else if (category === "shield") {
    currentLevel = getItemLevel(member.equipment.offHand, "shield");
  } else if (category === "body_armor") {
    currentLevel = getItemLevel(member.armor.body?.id, "body_armor");
  } else {
    currentLevel = getItemLevel(member.armor.head?.id, "head_armor");
  }

  const inventory = getStoreInventory().filter(i => i.category === category);

  let best: StoreItem | null = null;
  let bestLevel = currentLevel;

  for (const item of inventory) {
    const scaledPrice = (partyLevel && params)
      ? getScaledItemPrice(item.itemId, partyLevel, params.priceGrowthPerLevel)
      : item.price;
    if (scaledPrice > gold) continue;

    let itemLevel: number;
    if (category === "weapon") {
      const wpn = getWeapon(item.itemId);
      itemLevel = wpn.level;
      // Class restriction check
      if (classDef && !canEquipWeapon(classDef, wpn)) continue;
      // 2H weapon can't be bought if unit has a shield
      if (wpn.hands === 2 && member.equipment.offHand) continue;
    } else if (category === "shield") {
      const shd = getShield(item.itemId);
      if (!shd) continue;
      itemLevel = shd.level;
      if (classDef && !canEquipShield(classDef, shd)) continue;
      // Can't buy shield if current weapon is 2H
      if (member.equipment.mainHand) {
        const wpn = getWeapon(member.equipment.mainHand);
        if (wpn.hands === 2) continue;
      }
    } else {
      const arm = getArmorDef(item.itemId);
      if (!arm) continue;
      itemLevel = arm.level;
      if (classDef && !canEquipArmor(classDef, arm)) continue;
    }

    if (itemLevel > bestLevel) {
      best = item;
      bestLevel = itemLevel;
    }
  }

  const bestPrice = best
    ? ((partyLevel && params)
      ? getScaledItemPrice(best.itemId, partyLevel, params.priceGrowthPerLevel)
      : best.price)
    : 0;
  return best ? { itemId: best.itemId, price: bestPrice } : null;
}

/** Greedy skill tree unlocking: spend CP on cheapest available node, prefer actives. */
function greedyUnlockNodes(member: RosterMember): string[] {
  if (!member.skillTree) return [];
  const cp = member.classPoints ?? 0;
  if (cp <= 0) return [];

  const unlockedSet = new Set(member.unlockedNodes ?? []);
  const stacks = member.nodeStacks ?? {};
  const unlockOrder: string[] = [];
  let remainingCP = cp;

  // Sort nodes: actives first, then by tier (cheapest first)
  const sortedNodes = [...member.skillTree.nodes].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.cpCost - b.cpCost;
  });

  // Keep trying to unlock nodes until we can't anymore
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of sortedNodes) {
      if (remainingCP < node.cpCost) continue;

      // Check prerequisites met
      const prereqsMet = node.prerequisites.every(p => unlockedSet.has(p));
      if (!prereqsMet) continue;

      // Check if already at max stacks
      const currentStacks = stacks[node.nodeId] ?? (unlockedSet.has(node.nodeId) ? 1 : 0);
      if (currentStacks >= node.maxStacks) continue;

      // Unlock it
      unlockOrder.push(node.nodeId);
      unlockedSet.add(node.nodeId);
      stacks[node.nodeId] = currentStacks + 1;
      remainingCP -= node.cpCost;
      changed = true;
    }
  }

  return unlockOrder;
}

/** Pick contract by difficulty preference. */
function pickByDifficulty(
  contracts: ContractDef[],
  preferred: string[],
): ContractDef {
  for (const diff of preferred) {
    const c = contracts.find(c => c.difficulty === diff);
    if (c) return c;
  }
  return contracts[0]!;
}

/** Standard equipment buy loop: weapon → body → head → shield (for 1H users). */
function buyAllSlots(
  roster: RosterMember[],
  gold: number,
  order: ("weapon" | "body_armor" | "head_armor" | "shield")[],
  partyLevel?: number,
  params?: BalanceParams,
): PurchaseDecision[] {
  const decisions: PurchaseDecision[] = [];
  let remaining = gold;

  for (const category of order) {
    for (let i = 0; i < roster.length; i++) {
      const m = roster[i]!;
      const upgrade = bestAffordableUpgrade(m, category, remaining, partyLevel, params);
      if (upgrade) {
        const slot: PurchaseDecision["slot"] =
          category === "weapon" ? "mainHand" :
          category === "shield" ? "offHand" :
          category === "body_armor" ? "bodyArmor" : "headArmor";
        decisions.push({ rosterIndex: i, itemId: upgrade.itemId, slot });
        remaining -= upgrade.price;
      }
    }
  }

  return decisions;
}

// ── Strategies ──

export const balanced: PlayerStrategy = {
  name: "balanced",
  maxRoster: 6,

  pickContract(contracts, roster) {
    const partyLevel = getPartyLevel(roster);
    const strong = partyLevel >= 4;
    return pickByDifficulty(contracts, strong ? ["hard", "normal", "easy"] : ["normal", "easy"]);
  },

  shouldHire(recruit, roster, gold) {
    return roster.length < this.maxRoster && gold >= recruit.cost + 100;
  },

  buyEquipment(roster, gold, partyLevel, params) {
    return buyAllSlots(roster, gold, ["weapon", "body_armor", "head_armor", "shield"], partyLevel, params);
  },

  unlockNodes: greedyUnlockNodes,
};

export const aggressive: PlayerStrategy = {
  name: "aggressive",
  maxRoster: 6,

  pickContract(contracts, roster) {
    const partyLevel = getPartyLevel(roster);
    // Don't pick deadly until strong enough
    if (partyLevel >= 5) return pickByDifficulty(contracts, ["deadly", "hard", "normal", "easy"]);
    if (partyLevel >= 3) return pickByDifficulty(contracts, ["hard", "normal", "easy"]);
    return pickByDifficulty(contracts, ["normal", "hard", "easy"]);
  },

  shouldHire(recruit, roster, gold) {
    return roster.length < this.maxRoster && gold >= recruit.cost + 50;
  },

  buyEquipment(roster, gold, partyLevel, params) {
    // Weapons first, then armor (including head)
    return buyAllSlots(roster, gold, ["weapon", "body_armor", "head_armor"], partyLevel, params);
  },

  unlockNodes: greedyUnlockNodes,
};

export const conservative: PlayerStrategy = {
  name: "conservative",
  maxRoster: 5,

  pickContract(contracts) {
    return pickByDifficulty(contracts, ["easy", "normal"]);
  },

  shouldHire(recruit, roster, gold) {
    return roster.length < this.maxRoster && gold >= recruit.cost + 200;
  },

  buyEquipment(roster, gold, partyLevel, params) {
    // Armor first (defensive), then weapons, then shields
    return buyAllSlots(roster, gold, ["body_armor", "head_armor", "shield", "weapon"], partyLevel, params);
  },

  unlockNodes: greedyUnlockNodes,
};

export const eliteSquad: PlayerStrategy = {
  name: "eliteSquad",
  maxRoster: 4,

  pickContract(contracts, roster) {
    const partyLevel = getPartyLevel(roster);
    return pickByDifficulty(contracts, partyLevel >= 3 ? ["hard", "deadly", "normal"] : ["normal", "hard"]);
  },

  shouldHire(_recruit, roster, _gold) {
    return roster.length < 4;
  },

  buyEquipment(roster, gold, partyLevel, params) {
    // Max out every slot for each unit
    return buyAllSlots(roster, gold, ["weapon", "body_armor", "head_armor", "shield"], partyLevel, params);
  },

  unlockNodes: greedyUnlockNodes,
};

export const zergRush: PlayerStrategy = {
  name: "zergRush",
  maxRoster: 10,

  pickContract(contracts) {
    return pickByDifficulty(contracts, ["normal", "hard", "easy"]);
  },

  shouldHire(recruit, roster, gold) {
    return roster.length < this.maxRoster && gold >= recruit.cost + 20;
  },

  buyEquipment(roster, gold, partyLevel, params) {
    // Minimal spending — only buy cheapest weapon + body armor for unequipped units
    const decisions: PurchaseDecision[] = [];
    let remaining = gold;

    // Find cheapest weapon and body armor from store (use scaled prices)
    const inventory = getStoreInventory();
    const getPrice = (itemId: string) => (partyLevel && params)
      ? getScaledItemPrice(itemId, partyLevel, params.priceGrowthPerLevel)
      : getItemPrice(itemId);

    const cheapestWeapon = inventory
      .filter(i => i.category === "weapon")
      .sort((a, b) => getPrice(a.itemId) - getPrice(b.itemId))[0];
    const cheapestBody = inventory
      .filter(i => i.category === "body_armor")
      .sort((a, b) => getPrice(a.itemId) - getPrice(b.itemId))[0];

    for (let i = 0; i < roster.length; i++) {
      const m = roster[i]!;
      const wpnPrice = cheapestWeapon ? getPrice(cheapestWeapon.itemId) : Infinity;
      if (!m.equipment.mainHand && cheapestWeapon && wpnPrice <= remaining) {
        decisions.push({ rosterIndex: i, itemId: cheapestWeapon.itemId, slot: "mainHand" });
        remaining -= wpnPrice;
      }
      const bodyPrice = cheapestBody ? getPrice(cheapestBody.itemId) : Infinity;
      if (!m.armor.body && cheapestBody && bodyPrice <= remaining) {
        decisions.push({ rosterIndex: i, itemId: cheapestBody.itemId, slot: "bodyArmor" });
        remaining -= bodyPrice;
      }
    }
    return decisions;
  },

  unlockNodes: greedyUnlockNodes,
};

export const ALL_STRATEGIES: PlayerStrategy[] = [balanced, aggressive, conservative, eliteSquad, zergRush];
