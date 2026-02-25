import { TerrainType } from "@hex/HexGrid";
import type { AIType } from "@entities/components/AIBehavior";
import type { SpriteCharType } from "@rendering/SpriteAnimator";
import type { ScenarioDef, ScenarioTile, ScenarioUnit } from "./ScenarioData";
import type { ContractDef } from "./ContractData";
import type { RosterMember } from "@save/SaveManager";

const ENEMY_NAMES = [
  "Brigand", "Raider", "Thug", "Marauder", "Sellsword",
  "Cutthroat", "Ruffian", "Highwayman", "Outlaw", "Bandit",
];

const ENEMY_SPRITES: SpriteCharType[] = [
  "skeleton", "armored-skeleton", "orc", "armored-orc", "elite-orc",
];

/** Weapons by tier for enemy scaling. */
const TIER_WEAPONS: Record<number, string[]> = {
  1: ["dagger", "short_sword"],
  2: ["short_sword", "spear"],
  3: ["arming_sword", "hand_axe"],
  4: ["arming_sword", "hand_axe", "winged_mace"],
  5: ["longsword", "pike"],
};

function getWeaponForLevel(level: number, rng: () => number): string {
  const tier = Math.min(5, Math.max(1, level));
  const weapons = TIER_WEAPONS[tier] ?? TIER_WEAPONS[1]!;
  return weapons[Math.floor(rng() * weapons.length)]!;
}

function getArmorForLevel(level: number, rng: () => number): { body?: string; head?: string } {
  if (level <= 1) return {};
  if (level <= 2) return { body: "linen_tunic", head: rng() < 0.5 ? "hood" : undefined };
  if (level <= 3) return { body: "leather_jerkin", head: "leather_cap" };
  if (level <= 4) return { body: "mail_hauberk", head: "mail_coif" };
  return { body: "mail_hauberk", head: "nasal_helm" };
}

function getShieldForLevel(level: number, rng: () => number): string | undefined {
  // 2H weapons don't get shields; otherwise 60% chance
  if (rng() > 0.6) return undefined;
  if (level <= 2) return "buckler";
  if (level <= 4) return "wooden_shield";
  return "heater_shield";
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

/** Generate terrain clusters for the map. */
function generateTerrain(width: number, height: number, rng: () => number): ScenarioTile[] {
  const tiles: ScenarioTile[] = [];
  const clusterCount = 2 + Math.floor(rng() * 3); // 2-4 clusters

  for (let c = 0; c < clusterCount; c++) {
    // Place clusters in the middle area (avoid spawn zones)
    const centerQ = 3 + Math.floor(rng() * (width - 6));
    const centerR = 1 + Math.floor(rng() * (height - 2));
    const terrain = rng() < 0.6 ? TerrainType.Forest : TerrainType.Hills;
    const elevation = terrain === TerrainType.Hills ? 1 : 0;
    const size = 2 + Math.floor(rng() * 2); // 2-3 tiles per cluster

    tiles.push({ q: centerQ, r: centerR, terrain, elevation });
    // Add adjacent tiles for cluster
    const offsets = [
      { dq: 1, dr: 0 }, { dq: -1, dr: 0 }, { dq: 0, dr: 1 }, { dq: 0, dr: -1 },
      { dq: 1, dr: -1 }, { dq: -1, dr: 1 },
    ];
    for (let i = 1; i < size; i++) {
      const off = offsets[Math.floor(rng() * offsets.length)]!;
      const nq = centerQ + off.dq;
      const nr = centerR + off.dr;
      if (nq > 2 && nq < width - 2 && nr >= 0 && nr < height) {
        tiles.push({ q: nq, r: nr, terrain, elevation });
      }
    }
  }

  return tiles;
}

/** Build player units from roster data. */
function rosterToUnits(roster: RosterMember[]): ScenarioUnit[] {
  return roster.map((m, i) => {
    const unit: ScenarioUnit = {
      q: 1,
      r: 1 + i * 2, // Spread vertically
      team: "player",
      name: m.name,
      stats: {
        melee: m.stats.meleeSkill,
        defense: m.stats.meleeDefense,
        hp: m.stats.hitpoints,
        initiative: m.stats.initiative,
        mp: m.stats.movementPoints,
      },
      weapon: m.equipment.mainHand ?? undefined,
      shield: m.equipment.offHand ?? undefined,
      sprite: (m.spriteType as SpriteCharType) ?? "soldier",
      classId: (m.classId as ScenarioUnit["classId"]) ?? undefined,
      bag: m.equipment.bag.length > 0 ? [...m.equipment.bag] : undefined,
    };

    // Armor
    if (m.armor.body) unit.bodyArmor = m.armor.body.id;
    if (m.armor.head) unit.headArmor = m.armor.head.id;

    return unit;
  });
}

/** Generate enemy units for the battle. */
function generateEnemies(contract: ContractDef, startR: number, rng: () => number): ScenarioUnit[] {
  const enemies: ScenarioUnit[] = [];
  const rightCol = contract.mapWidth - 2;

  for (let i = 0; i < contract.enemyCount; i++) {
    const weapon = getWeaponForLevel(contract.enemyLevel, rng);
    const is2H = weapon === "longsword" || weapon === "pike";
    const shield = is2H ? undefined : getShieldForLevel(contract.enemyLevel, rng);
    const armor = getArmorForLevel(contract.enemyLevel, rng);
    const aiType: AIType = contract.enemyLevel >= 3 && rng() < 0.3 ? "defensive" : "aggressive";

    enemies.push({
      q: rightCol + (i % 2), // Alternate between two columns
      r: startR + i,
      team: "enemy",
      name: pick(ENEMY_NAMES, rng),
      stats: {
        melee: 38 + contract.enemyLevel * 3,
        defense: contract.enemyLevel * 2,
        hp: 8 + contract.enemyLevel * 2,
        initiative: 80 + Math.floor(rng() * 30),
      },
      weapon,
      shield,
      bodyArmor: armor.body,
      headArmor: armor.head,
      aiType,
      sprite: pick(ENEMY_SPRITES, rng),
    });
  }

  return enemies;
}

/**
 * Generate a full ScenarioDef from a contract and the player's roster.
 */
export function generateBattle(contract: ContractDef, roster: RosterMember[], rng: () => number): ScenarioDef {
  const tiles = generateTerrain(contract.mapWidth, contract.mapHeight, rng);

  const playerUnits = rosterToUnits(roster);
  // Adjust player spawn positions to fit within map
  for (let i = 0; i < playerUnits.length; i++) {
    playerUnits[i]!.r = Math.min(1 + i, contract.mapHeight - 1);
  }

  const enemyStartR = Math.max(0, Math.floor((contract.mapHeight - contract.enemyCount) / 2));
  const enemyUnits = generateEnemies(contract, enemyStartR, rng);

  return {
    id: contract.id,
    name: contract.name,
    description: contract.description,
    gridWidth: contract.mapWidth,
    gridHeight: contract.mapHeight,
    tiles,
    units: [...playerUnits, ...enemyUnits],
  };
}
