import { TerrainType } from "@hex/HexGrid";
import type { AIType } from "@entities/components/AIBehavior";
import type { SpriteCharType } from "@rendering/SpriteAnimator";
import type { ScenarioDef, ScenarioTile, ScenarioUnit } from "./ScenarioData";
import type { ContractDef } from "./ContractData";
import type { RosterMember } from "@save/SaveManager";
import type { BalanceParams } from "../simulation/CampaignSimulator";
import { getAllWeapons, getWeapon } from "./WeaponData";
import { getAllArmors } from "./ArmorData";
import { getAllShields } from "./ShieldData";
import { PLAYABLE_CLASS_IDS } from "./ruleset/RulesetLoader";

const ENEMY_NAMES = [
  "Brigand", "Raider", "Thug", "Marauder", "Sellsword",
  "Cutthroat", "Ruffian", "Highwayman", "Outlaw", "Bandit",
];

/** Use playable classes only so enemies match the skill-tree roster. */
const ENEMY_CLASSES = [...PLAYABLE_CLASS_IDS];

const ENEMY_SPRITES: SpriteCharType[] = [
  "skeleton", "armored-skeleton", "orc", "armored-orc", "elite-orc",
];

/** Data-driven: pick a random weapon whose level <= enemyLevel. */
function getWeaponForLevel(level: number, rng: () => number): string {
  const eligible: string[] = [];
  for (const [id, w] of getAllWeapons()) {
    if (w.level <= level) eligible.push(id);
  }
  if (eligible.length === 0) return "dagger";
  return eligible[Math.floor(rng() * eligible.length)]!;
}

/** Data-driven: pick body + head armor whose level <= enemyLevel. */
function getArmorForLevel(level: number, rng: () => number): { body?: string; head?: string } {
  const bodies: string[] = [];
  const heads: string[] = [];
  for (const [id, a] of getAllArmors()) {
    if (a.level <= level) {
      if (a.slot === "body") bodies.push(id);
      else heads.push(id);
    }
  }

  // Level 1 enemies have a chance to have no armor
  if (level <= 1 && rng() < 0.4) return {};

  const body = bodies.length > 0 ? bodies[Math.floor(rng() * bodies.length)] : undefined;
  const head = heads.length > 0 && rng() < 0.7
    ? heads[Math.floor(rng() * heads.length)]
    : undefined;
  return { body, head };
}

/** Data-driven: pick a shield whose level <= enemyLevel. */
function getShieldForLevel(level: number, rng: () => number): string | undefined {
  if (rng() > 0.6) return undefined;
  const eligible: string[] = [];
  for (const [id, s] of getAllShields()) {
    if (s.level <= level) eligible.push(id);
  }
  if (eligible.length === 0) return undefined;
  return eligible[Math.floor(rng() * eligible.length)]!;
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
        defense: m.stats.dodge,
        hp: m.stats.hitpoints,
        initiative: m.stats.initiative,
        mp: m.stats.movementPoints,
        mana: m.stats.mana,
        magicResist: m.stats.magicResist,
        stamina: m.stats.stamina,
        rangedSkill: m.stats.rangedSkill,
        level: m.level,
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
function generateEnemies(
  contract: ContractDef,
  startR: number,
  rng: () => number,
  params?: BalanceParams,
): ScenarioUnit[] {
  const enemies: ScenarioUnit[] = [];
  const rightCol = contract.mapWidth - 2;

  const meleeBase = params?.enemyMeleeBase ?? 38;
  const meleePerLevel = params?.enemyMeleePerLevel ?? 3;
  const defensePerLevel = params?.enemyDefensePerLevel ?? 2;
  const hpBase = params?.enemyHpBase ?? 8;
  const hpPerLevel = params?.enemyHpPerLevel ?? 2;
  const magicResistBase = params?.enemyMagicResistBase ?? 0;
  const magicResistPerLevel = params?.enemyMagicResistPerLevel ?? 0;
  const manaBase = params?.enemyManaBase ?? 20;

  for (let i = 0; i < contract.enemyCount; i++) {
    const classId = pick(ENEMY_CLASSES, rng);

    const weapon = getWeaponForLevel(contract.enemyLevel, rng);
    const weaponDef = getWeapon(weapon);
    const is2H = weaponDef.hands === 2;
    const shield = is2H ? undefined : getShieldForLevel(contract.enemyLevel, rng);
    const armor = getArmorForLevel(contract.enemyLevel, rng);
    const aiType: AIType = contract.enemyLevel >= 3 && rng() < 0.3 ? "defensive" : "aggressive";

    enemies.push({
      q: rightCol + (i % 2), // Alternate between two columns
      r: startR + i,
      team: "enemy",
      name: pick(ENEMY_NAMES, rng),
      classId,
      stats: {
        melee: meleeBase + contract.enemyLevel * meleePerLevel,
        defense: contract.enemyLevel * defensePerLevel,
        hp: hpBase + contract.enemyLevel * hpPerLevel,
        initiative: 80 + Math.floor(rng() * 30),
        mana: manaBase,
        magicResist: magicResistBase + contract.enemyLevel * magicResistPerLevel,
        level: contract.enemyLevel,
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
export function generateBattle(
  contract: ContractDef,
  roster: RosterMember[],
  rng: () => number,
  params?: BalanceParams,
): ScenarioDef {
  const tiles = generateTerrain(contract.mapWidth, contract.mapHeight, rng);

  const playerUnits = rosterToUnits(roster);
  // Adjust player spawn positions to fit within map
  for (let i = 0; i < playerUnits.length; i++) {
    playerUnits[i]!.r = Math.min(1 + i, contract.mapHeight - 1);
  }

  const enemyStartR = Math.max(0, Math.floor((contract.mapHeight - contract.enemyCount) / 2));
  const enemyUnits = generateEnemies(contract, enemyStartR, rng, params);

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
