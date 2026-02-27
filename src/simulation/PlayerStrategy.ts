/**
 * Player strategy definitions for campaign simulation.
 * Each strategy implements a distinct playstyle for contract selection,
 * hiring, equipment purchasing, and skill tree unlocking.
 */

import type { ContractDef } from "@data/ContractData";
import type { RecruitDef } from "@data/RecruitData";
import type { RosterMember } from "@save/SaveManager";
import { getItemPrice, getStoreInventory, type StoreItem } from "@data/StoreData";
import { CP_COST_BY_TIER, type SkillTreeNode } from "@data/SkillTreeData";
import { getPartyLevel } from "@data/RecruitData";

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
  buyEquipment(roster: RosterMember[], gold: number): PurchaseDecision[];
  unlockNodes(member: RosterMember): string[];
}

// ── Helpers ──

/** Weapon tier by price for upgrade comparisons. */
const WEAPON_TIERS: Record<string, number> = {
  dagger: 1, short_sword: 1, spear: 1,
  arming_sword: 2, hand_axe: 2, winged_mace: 2,
  short_bow: 2, hunting_bow: 2,
  longsword: 3, pike: 3,
};

const BODY_ARMOR_TIERS: Record<string, number> = {
  linen_tunic: 1, leather_jerkin: 2, mail_hauberk: 3, coat_of_plates: 4,
};

const HEAD_ARMOR_TIERS: Record<string, number> = {
  hood: 1, leather_cap: 2, mail_coif: 3, nasal_helm: 4,
};

function getTier(itemId: string | null | undefined): number {
  if (!itemId) return 0;
  return WEAPON_TIERS[itemId] ?? BODY_ARMOR_TIERS[itemId] ?? HEAD_ARMOR_TIERS[itemId] ?? 0;
}

function bestAffordableUpgrade(
  currentItemId: string | null | undefined,
  tierMap: Record<string, number>,
  gold: number,
  category: string,
): string | null {
  const currentTier = currentItemId ? (tierMap[currentItemId] ?? 0) : 0;
  const inventory = getStoreInventory().filter(i => i.category === category);

  let best: StoreItem | null = null;
  for (const item of inventory) {
    const tier = tierMap[item.itemId] ?? 0;
    if (tier > currentTier && item.price <= gold) {
      if (!best || tier > (tierMap[best.itemId] ?? 0)) {
        best = item;
      }
    }
  }
  return best?.itemId ?? null;
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

// ── Strategies ──

export const balanced: PlayerStrategy = {
  name: "balanced",
  maxRoster: 6,

  pickContract(contracts, roster) {
    const partyLevel = getPartyLevel(roster);
    // Pick hard if strong (avg level > easy enemy level + 2), otherwise normal
    const strong = partyLevel >= 4;
    return pickByDifficulty(contracts, strong ? ["hard", "normal", "easy"] : ["normal", "easy"]);
  },

  shouldHire(recruit, roster, gold) {
    return roster.length < this.maxRoster && gold >= recruit.cost + 100; // keep 100 reserve
  },

  buyEquipment(roster, gold) {
    const decisions: PurchaseDecision[] = [];
    let remaining = gold;

    for (let i = 0; i < roster.length; i++) {
      const m = roster[i]!;
      // Weapon upgrade
      const weapon = bestAffordableUpgrade(m.equipment.mainHand, WEAPON_TIERS, remaining, "weapon");
      if (weapon) {
        decisions.push({ rosterIndex: i, itemId: weapon, slot: "mainHand" });
        remaining -= getItemPrice(weapon);
      }
      // Body armor
      const body = bestAffordableUpgrade(m.armor.body?.id, BODY_ARMOR_TIERS, remaining, "body_armor");
      if (body) {
        decisions.push({ rosterIndex: i, itemId: body, slot: "bodyArmor" });
        remaining -= getItemPrice(body);
      }
      // Head armor
      const head = bestAffordableUpgrade(m.armor.head?.id, HEAD_ARMOR_TIERS, remaining, "head_armor");
      if (head) {
        decisions.push({ rosterIndex: i, itemId: head, slot: "headArmor" });
        remaining -= getItemPrice(head);
      }
    }
    return decisions;
  },

  unlockNodes: greedyUnlockNodes,
};

export const aggressive: PlayerStrategy = {
  name: "aggressive",
  maxRoster: 6,

  pickContract(contracts) {
    // Always pick hardest available
    return pickByDifficulty(contracts, ["deadly", "hard", "normal", "easy"]);
  },

  shouldHire(recruit, roster, gold) {
    return roster.length < this.maxRoster && gold >= recruit.cost + 50;
  },

  buyEquipment(roster, gold) {
    const decisions: PurchaseDecision[] = [];
    let remaining = gold;

    // Weapons first, armor second
    for (let i = 0; i < roster.length; i++) {
      const m = roster[i]!;
      const weapon = bestAffordableUpgrade(m.equipment.mainHand, WEAPON_TIERS, remaining, "weapon");
      if (weapon) {
        decisions.push({ rosterIndex: i, itemId: weapon, slot: "mainHand" });
        remaining -= getItemPrice(weapon);
      }
    }
    // Then armor with what's left
    for (let i = 0; i < roster.length; i++) {
      const m = roster[i]!;
      const body = bestAffordableUpgrade(m.armor.body?.id, BODY_ARMOR_TIERS, remaining, "body_armor");
      if (body) {
        decisions.push({ rosterIndex: i, itemId: body, slot: "bodyArmor" });
        remaining -= getItemPrice(body);
      }
    }
    return decisions;
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
    return roster.length < this.maxRoster && gold >= recruit.cost + 200; // big reserve
  },

  buyEquipment(roster, gold) {
    const decisions: PurchaseDecision[] = [];
    let remaining = gold;

    // Armor first (defensive), then weapons
    for (let i = 0; i < roster.length; i++) {
      const m = roster[i]!;
      const body = bestAffordableUpgrade(m.armor.body?.id, BODY_ARMOR_TIERS, remaining, "body_armor");
      if (body) {
        decisions.push({ rosterIndex: i, itemId: body, slot: "bodyArmor" });
        remaining -= getItemPrice(body);
      }
      const head = bestAffordableUpgrade(m.armor.head?.id, HEAD_ARMOR_TIERS, remaining, "head_armor");
      if (head) {
        decisions.push({ rosterIndex: i, itemId: head, slot: "headArmor" });
        remaining -= getItemPrice(head);
      }
    }
    for (let i = 0; i < roster.length; i++) {
      const m = roster[i]!;
      const weapon = bestAffordableUpgrade(m.equipment.mainHand, WEAPON_TIERS, remaining, "weapon");
      if (weapon) {
        decisions.push({ rosterIndex: i, itemId: weapon, slot: "mainHand" });
        remaining -= getItemPrice(weapon);
      }
    }
    return decisions;
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
    // Only hire to fill minimum roster
    return roster.length < 4;
  },

  buyEquipment(roster, gold) {
    const decisions: PurchaseDecision[] = [];
    let remaining = gold;

    // Max out every slot for each unit
    for (let i = 0; i < roster.length; i++) {
      const m = roster[i]!;
      const weapon = bestAffordableUpgrade(m.equipment.mainHand, WEAPON_TIERS, remaining, "weapon");
      if (weapon) {
        decisions.push({ rosterIndex: i, itemId: weapon, slot: "mainHand" });
        remaining -= getItemPrice(weapon);
      }
      const body = bestAffordableUpgrade(m.armor.body?.id, BODY_ARMOR_TIERS, remaining, "body_armor");
      if (body) {
        decisions.push({ rosterIndex: i, itemId: body, slot: "bodyArmor" });
        remaining -= getItemPrice(body);
      }
      const head = bestAffordableUpgrade(m.armor.head?.id, HEAD_ARMOR_TIERS, remaining, "head_armor");
      if (head) {
        decisions.push({ rosterIndex: i, itemId: head, slot: "headArmor" });
        remaining -= getItemPrice(head);
      }
    }
    return decisions;
  },

  unlockNodes: greedyUnlockNodes,
};

export const zergRush: PlayerStrategy = {
  name: "zergRush",
  maxRoster: 14,

  pickContract(contracts) {
    return pickByDifficulty(contracts, ["normal", "hard", "easy"]);
  },

  shouldHire(recruit, roster, gold) {
    // Hire aggressively, keep minimal reserve
    return roster.length < this.maxRoster && gold >= recruit.cost + 20;
  },

  buyEquipment(roster, gold) {
    // Minimal spending — only buy cheapest upgrades
    const decisions: PurchaseDecision[] = [];
    let remaining = gold;

    for (let i = 0; i < roster.length; i++) {
      const m = roster[i]!;
      // Only upgrade from nothing to cheapest tier
      if (!m.equipment.mainHand || getTier(m.equipment.mainHand) === 0) {
        const price = getItemPrice("short_sword");
        if (price <= remaining) {
          decisions.push({ rosterIndex: i, itemId: "short_sword", slot: "mainHand" });
          remaining -= price;
        }
      }
      if (!m.armor.body) {
        const price = getItemPrice("linen_tunic");
        if (price <= remaining) {
          decisions.push({ rosterIndex: i, itemId: "linen_tunic", slot: "bodyArmor" });
          remaining -= price;
        }
      }
    }
    return decisions;
  },

  unlockNodes: greedyUnlockNodes,
};

export const ALL_STRATEGIES: PlayerStrategy[] = [balanced, aggressive, conservative, eliteSquad, zergRush];
