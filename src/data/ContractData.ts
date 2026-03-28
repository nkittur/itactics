export interface ContractDef {
  id: string;
  name: string;
  description: string;
  difficulty: "easy" | "normal" | "hard" | "deadly";
  enemyCount: number;
  enemyLevel: number;
  reward: number;
  mapWidth: number;
  mapHeight: number;
}

const EASY_NAMES = ["Roadside Bandits", "Farm Raiders", "Petty Thieves"];
const NORMAL_NAMES = ["Brigand Camp", "Raider Warband", "Outlaw Gang"];
const HARD_NAMES = ["Fortified Hideout", "Mercenary Company", "Orc Raiders"];
const DEADLY_NAMES = ["Warlord's Host", "Undead Horde", "Orc Warband"];

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

export function generateContracts(partyLevel: number, partySize: number, rng: () => number): ContractDef[] {
  const contracts: ContractDef[] = [];

  // Easy
  contracts.push({
    id: `contract_easy_${Math.floor(rng() * 10000)}`,
    name: pick(EASY_NAMES, rng),
    description: `${partySize} enemies, lightly armed.`,
    difficulty: "easy",
    enemyCount: partySize,
    enemyLevel: Math.max(1, partyLevel - 1),
    reward: 80 + partyLevel * 20,
    mapWidth: 10,
    mapHeight: 8,
  });

  // Normal
  contracts.push({
    id: `contract_normal_${Math.floor(rng() * 10000)}`,
    name: pick(NORMAL_NAMES, rng),
    description: `${partySize + 1} enemies, well-equipped.`,
    difficulty: "normal",
    enemyCount: partySize + 1,
    enemyLevel: partyLevel,
    reward: 120 + partyLevel * 30,
    mapWidth: 10,
    mapHeight: 8,
  });

  // Hard
  contracts.push({
    id: `contract_hard_${Math.floor(rng() * 10000)}`,
    name: pick(HARD_NAMES, rng),
    description: `${partySize + 2} dangerous foes.`,
    difficulty: "hard",
    enemyCount: partySize + 2,
    enemyLevel: partyLevel + 1,
    reward: 200 + partyLevel * 50,
    mapWidth: 10,
    mapHeight: 8,
  });

  // Deadly (50% chance)
  if (rng() < 0.5) {
    contracts.push({
      id: `contract_deadly_${Math.floor(rng() * 10000)}`,
      name: pick(DEADLY_NAMES, rng),
      description: `${partySize + 3} elite fighters. High risk, high reward.`,
      difficulty: "deadly",
      enemyCount: partySize + 3,
      enemyLevel: partyLevel + 2,
      reward: 350 + partyLevel * 70,
      mapWidth: 10,
      mapHeight: 8,
    });
  }

  return contracts;
}

export interface AdventureContractDef extends ContractDef {
  adventureId: string;
  scenarioCount: number;
}

/**
 * Generate adventure contracts that reference multi-battle adventures.
 * These appear alongside normal contracts in the management screen.
 */
export function generateAdventureContracts(): AdventureContractDef[] {
  return [
    {
      id: "adventure_barrow_creek",
      name: "The Barrow Creek Raid",
      description: "3-battle campaign: clear brigands from Barrow Creek village. Escalating difficulty.",
      difficulty: "normal",
      enemyCount: 12, // total across all 3 battles
      enemyLevel: 2,
      reward: 500,
      mapWidth: 12,
      mapHeight: 10,
      adventureId: "barrow_creek",
      scenarioCount: 3,
    },
  ];
}
