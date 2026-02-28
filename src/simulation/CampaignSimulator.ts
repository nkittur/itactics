/**
 * Campaign simulator — runs the full game loop:
 *   Battle → Rewards → Level Up → Hire → Buy Equipment → Unlock Skills → Repeat
 *
 * All balance-critical parameters are exposed via BalanceParams for tuning.
 */

import type { PlayerStrategy, PurchaseDecision } from "./PlayerStrategy";
import { runHeadlessBattle } from "./HeadlessBattle";
import type { ContractDef } from "@data/ContractData";
import { generateBattle } from "@data/BattleGenerator";
import { generateRecruits, getPartyLevel, type RecruitDef } from "@data/RecruitData";
import { canLevelUp } from "@data/LevelData";
import { rollStatIncrease, ALL_STAT_KEYS } from "@data/TalentData";
import { calculateBattleCP } from "@combat/CPCalculator";
import { getArmorDef } from "@data/ArmorData";
import { getItemPrice, getScaledItemPrice } from "@data/StoreData";
import { getWeapon } from "@data/WeaponData";
import type { RosterMember } from "@save/SaveManager";
import { setAbilityRegistry } from "@data/AbilityResolver";

// ── Balance Parameters ──

export interface BalanceParams {
  // Enemy scaling
  enemyMeleeBase: number;
  enemyMeleePerLevel: number;
  enemyDefensePerLevel: number;
  enemyHpBase: number;
  enemyHpPerLevel: number;

  // Difficulty
  enemyCountOffset: Record<"easy" | "normal" | "hard" | "deadly", number>;
  enemyLevelOffset: Record<"easy" | "normal" | "hard" | "deadly", number>;

  // Economy
  goldPerKill: number;
  baseGoldPerBattle: number;
  rewardMult: number;
  recruitCostBase: number;
  recruitCostPerLevel: number;

  // Progression
  xpPerKill: number;
  xpSurvivalBonus: number;
  xpVictoryBonus: number;
  cpPerAction: number;
  cpPerKill: number;
  cpVictoryBonus: number;

  // Enemy magic/mana scaling
  enemyMagicResistBase: number;
  enemyMagicResistPerLevel: number;
  enemyManaBase: number;

  // Level-based combat bonuses
  bonusDamagePerLevel: number;
  bonusArmorPerLevel: number;

  // Economy scaling
  priceGrowthPerLevel: number;
  healCostPerHp: number;
  recruitCostGrowthPerLevel: number;
}

export const DEFAULT_PARAMS: BalanceParams = {
  enemyMeleeBase: 38,
  enemyMeleePerLevel: 3,
  enemyDefensePerLevel: 2,
  enemyHpBase: 8,
  enemyHpPerLevel: 2,

  enemyCountOffset: { easy: 0, normal: 1, hard: 2, deadly: 3 },
  enemyLevelOffset: { easy: -1, normal: 0, hard: 1, deadly: 2 },

  goldPerKill: 55,
  baseGoldPerBattle: 120,
  rewardMult: 1.0,
  recruitCostBase: 40,
  recruitCostPerLevel: 25,

  xpPerKill: 60,
  xpSurvivalBonus: 30,
  xpVictoryBonus: 120,
  cpPerAction: 10,
  cpPerKill: 20,
  cpVictoryBonus: 30,

  enemyMagicResistBase: 0,
  enemyMagicResistPerLevel: 0,
  enemyManaBase: 20,

  bonusDamagePerLevel: 1.5,
  bonusArmorPerLevel: 0.5,

  priceGrowthPerLevel: 0.12,
  healCostPerHp: 2,
  recruitCostGrowthPerLevel: 10,
};

// ── Campaign types ──

export interface CampaignConfig {
  strategy: PlayerStrategy;
  params: BalanceParams;
  maxBattles: number;
  startingGold: number;
  startingRosterSize: number;
  seed: number;
  /** If true, dead units are permanently removed. Default: false (units revive after battle). */
  ironman?: boolean;
}

export interface BattleSummary {
  battleNumber: number;
  difficulty: string;
  partyLevel: number;
  enemyLevel: number;
  partySize: number;
  enemyCount: number;
  victory: boolean;
  goldEarned: number;
  goldTotal: number;
  xpPerSurvivor: number;
  cpPerSurvivor: number;
  deaths: number;
  turnsElapsed: number;
  avgPartyArmor: number;
  avgPartyDodge: number;
  goldSpentOnHealing: number;
}

export interface CampaignResult {
  strategyName: string;
  paramsName: string;
  battles: BattleSummary[];
  finalGold: number;
  finalRosterLevels: number[];
  totalWins: number;
  totalLosses: number;
  campaignEnded: "completed" | "wiped";
}

// ── Seeded RNG ──

function makeRng(seed: number): () => number {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// ── Parameterized contract generation ──

function generateParamContracts(
  partyLevel: number,
  partySize: number,
  params: BalanceParams,
  rng: () => number,
): ContractDef[] {
  const contracts: ContractDef[] = [];
  const diffs: Array<"easy" | "normal" | "hard" | "deadly"> = ["easy", "normal", "hard"];
  if (rng() < 0.5) diffs.push("deadly");

  const names: Record<string, string[]> = {
    easy: ["Roadside Bandits", "Farm Raiders", "Petty Thieves"],
    normal: ["Brigand Camp", "Raider Warband", "Outlaw Gang"],
    hard: ["Fortified Hideout", "Mercenary Company", "Orc Raiders"],
    deadly: ["Warlord's Host", "Undead Horde", "Orc Warband"],
  };

  const baseRewards: Record<string, [number, number]> = {
    easy: [80, 20], normal: [120, 30], hard: [200, 50], deadly: [350, 70],
  };

  for (const diff of diffs) {
    const nameList = names[diff]!;
    const enemyLevel = Math.max(1, partyLevel + params.enemyLevelOffset[diff]);
    const [baseReward, perLevel] = baseRewards[diff]!;

    contracts.push({
      id: `contract_${diff}_${Math.floor(rng() * 10000)}`,
      name: nameList[Math.floor(rng() * nameList.length)]!,
      description: "",
      difficulty: diff,
      enemyCount: partySize + params.enemyCountOffset[diff],
      enemyLevel,
      reward: Math.round((baseReward + partyLevel * perLevel) * params.rewardMult),
      mapWidth: 10,
      mapHeight: 8,
    });
  }

  return contracts;
}

// ── Starter roster generation ──

function generateStarterRoster(count: number, rng: () => number): RosterMember[] {
  const recruits = generateRecruits(1, rng);
  const roster: RosterMember[] = [];

  for (let i = 0; i < count && i < recruits.length; i++) {
    roster.push(recruitToRosterMember(recruits[i]!, rng));
  }

  // If we need more than what generateRecruits gave us, generate more
  while (roster.length < count) {
    const moreRecruits = generateRecruits(1, rng);
    if (moreRecruits.length > 0) {
      roster.push(recruitToRosterMember(moreRecruits[0]!, rng));
    }
  }

  return roster;
}

function recruitToRosterMember(recruit: RecruitDef, _rng: () => number): RosterMember {
  return {
    name: recruit.name,
    classId: recruit.classId,
    level: recruit.level,
    experience: 0,
    stats: { ...recruit.stats },
    maxHp: recruit.maxHp,
    talentStars: { ...recruit.talentStars },
    perks: { unlocked: [], availablePoints: 0 },
    equipment: { ...recruit.equipment },
    armor: {
      body: recruit.armor.body ? { ...recruit.armor.body } : null,
      head: recruit.armor.head ? { ...recruit.armor.head } : null,
    },
    spriteType: recruit.sprite,
    skillTheme: recruit.skillTheme,
    secondarySkillTheme: recruit.secondarySkillTheme ?? undefined,
    skillTree: recruit.skillTree,
    unlockedNodes: [],
    nodeStacks: {},
    classPoints: recruit.classPoints,
  };
}

// ── Level-up logic ──

function applyLevelUp(member: RosterMember, rng: () => number): boolean {
  if (!canLevelUp(member.level, member.experience)) return false;

  member.level++;
  // Apply stat growth
  for (const key of ALL_STAT_KEYS) {
    const stars = member.talentStars[key] ?? 0;
    const increase = rollStatIncrease(key, stars, rng);
    switch (key) {
      case "hitpoints": member.stats.hitpoints += increase; member.maxHp += increase; break;
      case "stamina": member.stats.stamina += increase; break;
      case "resolve": member.stats.resolve += increase; break;
      case "initiative": member.stats.initiative += increase; break;
      case "meleeSkill": member.stats.meleeSkill += increase; break;
      case "rangedSkill": member.stats.rangedSkill += increase; break;
      case "dodge": member.stats.dodge += increase; break;
    }
  }
  return true;
}

// ── Equipment application ──

// ── Skill tree unlocking ──

function applySkillUnlocks(member: RosterMember, nodeIds: string[]): void {
  if (!member.skillTree) return;
  const unlockedSet = new Set(member.unlockedNodes ?? []);
  const stacks = member.nodeStacks ?? {};

  for (const nodeId of nodeIds) {
    const node = member.skillTree.nodes.find(n => n.nodeId === nodeId);
    if (!node) continue;

    const cost = node.cpCost;
    if ((member.classPoints ?? 0) < cost) continue;

    member.classPoints = (member.classPoints ?? 0) - cost;
    unlockedSet.add(nodeId);
    stacks[nodeId] = (stacks[nodeId] ?? 0) + 1;
  }

  member.unlockedNodes = [...unlockedSet];
  member.nodeStacks = stacks;
}

// ── Get unlocked ability UIDs for battle ──

function getUnlockedAbilities(member: RosterMember): string[] {
  if (!member.skillTree) return [];
  const unlockedSet = new Set(member.unlockedNodes ?? []);
  return member.skillTree.nodes
    .filter(n => unlockedSet.has(n.nodeId))
    .map(n => n.abilityUid);
}

// ── Main campaign runner ──

export function runCampaign(config: CampaignConfig, paramsName: string = "default"): CampaignResult {
  const rng = makeRng(config.seed);
  const params = config.params;
  const strategy = config.strategy;

  // Initialize ability registry for this campaign
  setAbilityRegistry({});

  // Generate starting roster
  let roster = generateStarterRoster(config.startingRosterSize, rng);
  let gold = config.startingGold;

  const battles: BattleSummary[] = [];
  let totalWins = 0;
  let totalLosses = 0;

  for (let battleNum = 1; battleNum <= config.maxBattles; battleNum++) {
    if (roster.length === 0) {
      return {
        strategyName: strategy.name,
        paramsName,
        battles,
        finalGold: gold,
        finalRosterLevels: [],
        totalWins,
        totalLosses,
        campaignEnded: "wiped",
      };
    }

    const partyLevel = getPartyLevel(roster);
    const partySize = roster.length;

    // 1. Generate contracts
    const contracts = generateParamContracts(partyLevel, partySize, params, rng);

    // 2. Pick contract
    const contract = strategy.pickContract(contracts, roster, gold);

    // 3. Hire phase
    const recruits = generateRecruits(partyLevel, rng);
    for (const recruit of recruits) {
      const adjustedCost = params.recruitCostBase + recruit.level * params.recruitCostPerLevel + partyLevel * params.recruitCostGrowthPerLevel;
      const recruitWithCost = { ...recruit, cost: adjustedCost };
      if (strategy.shouldHire(recruitWithCost, roster, gold)) {
        gold -= adjustedCost;
        roster.push(recruitToRosterMember(recruit, rng));
      }
    }

    // 4. Buy equipment
    const purchases = strategy.buyEquipment(roster, gold, partyLevel, params);
    gold = applyPurchases(roster, purchases, gold, partyLevel, params);

    // 5. Unlock skill tree nodes
    for (const member of roster) {
      const nodes = strategy.unlockNodes(member);
      applySkillUnlocks(member, nodes);
    }

    // 6. Build scenario and run battle
    const scenario = generateBattle(contract, roster, rng, params);

    // Build ability map for player units
    const abilityMap = new Map<number, string[]>();
    for (let i = 0; i < roster.length; i++) {
      const abilities = getUnlockedAbilities(roster[i]!);
      if (abilities.length > 0) {
        abilityMap.set(i, abilities);
      }
    }

    const battleSeed = Math.floor(rng() * 2147483647);
    const battleResult = runHeadlessBattle(scenario, abilityMap, battleSeed, params);

    // 7. Process results
    const survivorCount = battleResult.playerSurvivors.length;
    let goldEarned = 0;
    let xpPerSurvivor = 0;
    let cpPerSurvivor = 0;

    const deadCount = battleResult.playerDeaths;
    const survivorNames = new Set(battleResult.playerSurvivors.map(s => s.name));

    if (battleResult.victory) {
      totalWins++;

      // Gold: kills + base + contract reward
      goldEarned = battleResult.enemyKills * params.goldPerKill
        + params.baseGoldPerBattle
        + contract.reward;
      gold += goldEarned;

      // XP: pooled among ALL roster members (survivors get bonus)
      const totalKillXP = battleResult.enemyKills * params.xpPerKill;
      const xpPerUnit = Math.floor(totalKillXP / roster.length);
      xpPerSurvivor = xpPerUnit + params.xpSurvivalBonus + params.xpVictoryBonus;
      const xpPerDead = xpPerUnit; // dead units get kill XP share but no survival/victory bonus

      // CP from action tracking — includes all units that acted (alive or dead)
      const cpAwards = calculateBattleCP(
        true,
        battleResult.actionTracker,
        battleResult.playerSurvivors.map(s => ({ entityId: s.entityId, name: s.name })),
      );
      if (cpAwards.length > 0) {
        cpPerSurvivor = Math.round(cpAwards.reduce((sum, a) => sum + a.cpEarned, 0) / cpAwards.length);
      }

      // Apply XP and CP to roster members
      for (const member of roster) {
        if (survivorNames.has(member.name)) {
          member.experience += xpPerSurvivor;
          const cpAward = cpAwards.find(a => a.name === member.name);
          if (cpAward) {
            member.classPoints = (member.classPoints ?? 0) + cpAward.cpEarned;
          }
        } else {
          // Dead units still get partial XP and their earned CP
          member.experience += xpPerDead;
          member.classPoints = (member.classPoints ?? 0) + params.cpVictoryBonus;
        }
      }

      // Level up all units (including revived dead)
      for (const member of roster) {
        while (applyLevelUp(member, rng)) { /* keep leveling */ }
      }
    } else {
      totalLosses++;
    }

    // Ironman: permanently remove dead units
    if (config.ironman && deadCount > 0) {
      roster = roster.filter(m => survivorNames.has(m.name));
    }

    // Sync battle damage to roster members (headless battle doesn't modify roster directly)
    const survivorHpMap = new Map(battleResult.playerSurvivors.map(s => [s.name, s.hpRemaining]));
    for (const member of roster) {
      if (survivorHpMap.has(member.name)) {
        // Survivor: set HP to what they ended the battle with
        member.stats.hitpoints = survivorHpMap.get(member.name)!;
      } else {
        // Dead: needs full heal
        member.stats.hitpoints = 0;
      }
    }

    // Heal all units (revived or surviving) — costs gold
    let goldSpentOnHealing = 0;
    for (const member of roster) {
      const hpToHeal = member.maxHp - member.stats.hitpoints;
      if (hpToHeal > 0) {
        const healCost = hpToHeal * params.healCostPerHp;
        const actualCost = Math.min(healCost, gold);
        goldSpentOnHealing += actualCost;
        gold -= actualCost;
      }
      member.stats.hitpoints = member.maxHp;
    }

    // Compute party armor/dodge averages for this battle
    let totalArmor = 0;
    let totalDodge = 0;
    for (const m of roster) {
      totalArmor += (m.armor.body?.armor ?? 0) + (m.armor.head?.armor ?? 0);
      totalDodge += m.stats.dodge;
    }
    const avgPartyArmor = roster.length > 0 ? totalArmor / roster.length : 0;
    const avgPartyDodge = roster.length > 0 ? totalDodge / roster.length : 0;

    battles.push({
      battleNumber: battleNum,
      difficulty: contract.difficulty,
      partyLevel,
      enemyLevel: contract.enemyLevel,
      partySize,
      enemyCount: contract.enemyCount,
      victory: battleResult.victory,
      goldEarned,
      goldTotal: gold,
      xpPerSurvivor,
      cpPerSurvivor,
      deaths: deadCount,
      turnsElapsed: battleResult.turnsElapsed,
      avgPartyArmor,
      avgPartyDodge,
      goldSpentOnHealing,
    });
  }

  return {
    strategyName: strategy.name,
    paramsName,
    battles,
    finalGold: gold,
    finalRosterLevels: roster.map(m => m.level),
    totalWins,
    totalLosses,
    campaignEnded: "completed",
  };
}

function applyPurchases(
  roster: RosterMember[],
  decisions: PurchaseDecision[],
  gold: number,
  partyLevel?: number,
  params?: BalanceParams,
): number {
  let remaining = gold;

  for (const d of decisions) {
    const price = (partyLevel && params)
      ? getScaledItemPrice(d.itemId, partyLevel, params.priceGrowthPerLevel)
      : getItemPrice(d.itemId);
    if (price > remaining) continue;

    const member = roster[d.rosterIndex];
    if (!member) continue;

    remaining -= price;

    switch (d.slot) {
      case "mainHand": {
        member.equipment.mainHand = d.itemId;
        // 2H weapons clear offHand
        const wpn = getWeapon(d.itemId);
        if (wpn.hands === 2) {
          member.equipment.offHand = null;
        }
        break;
      }
      case "offHand":
        member.equipment.offHand = d.itemId;
        break;
      case "bodyArmor": {
        const def = getArmorDef(d.itemId);
        member.armor.body = def
          ? { id: def.id, armor: def.armor, magicResist: def.magicResist }
          : null;
        break;
      }
      case "headArmor": {
        const def = getArmorDef(d.itemId);
        member.armor.head = def
          ? { id: def.id, armor: def.armor, magicResist: def.magicResist }
          : null;
        break;
      }
    }
  }

  return remaining;
}
