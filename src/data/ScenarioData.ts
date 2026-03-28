import { TerrainType } from "@hex/HexGrid";
import type { AIType } from "@entities/components/AIBehavior";
import type { SpriteCharType } from "@rendering/SpriteAnimator";
import type { CharacterClass } from "./ClassData";

export interface ScenarioTile {
  q: number;
  r: number;
  terrain: TerrainType;
  elevation: number;
}

export interface ScenarioUnit {
  q: number;
  r: number;
  team: "player" | "enemy";
  name: string;
  stats: {
    melee: number;
    defense: number;
    hp: number;
    initiative: number;
    mp?: number;
    mana?: number;
    magicResist?: number;
    stamina?: number;
    rangedSkill?: number;
    level?: number;
  };
  weapon?: string;
  shield?: string;
  bodyArmor?: string;
  headArmor?: string;
  aiType?: AIType;
  sprite?: SpriteCharType;
  classId?: CharacterClass;
  bag?: string[];
}

export interface ScenarioDef {
  id: string;
  name: string;
  description: string;
  gridWidth: number;
  gridHeight: number;
  /** Override tiles. Unspecified tiles default to grass at elevation 0. */
  tiles: ScenarioTile[];
  units: ScenarioUnit[];
}

export const SCENARIOS: ScenarioDef[] = [
  // ── 1. Tutorial: 3v3 on flat ground ──
  {
    id: "tutorial",
    name: "Tutorial",
    description: "3v3 on flat ground. Learn the basics of tactical combat.",
    gridWidth: 10,
    gridHeight: 8,
    tiles: [
      // A few forests for cover
      { q: 4, r: 3, terrain: TerrainType.Forest, elevation: 0 },
      { q: 5, r: 4, terrain: TerrainType.Forest, elevation: 0 },
      { q: 4, r: 5, terrain: TerrainType.Forest, elevation: 0 },
    ],
    units: [
      // Player
      { q: 1, r: 2, team: "player", name: "Swordsman",
        stats: { melee: 50, defense: 5, hp: 12, initiative: 100 },
        weapon: "arming_sword", shield: "heater_shield",
        bodyArmor: "mail_hauberk", headArmor: "mail_coif",
        sprite: "swordsman", classId: "ironbloom_warden", bag: ["health_potion"] },
      { q: 1, r: 4, team: "player", name: "Axeman",
        stats: { melee: 48, defense: 3, hp: 14, initiative: 90 },
        weapon: "hand_axe", shield: "wooden_shield",
        bodyArmor: "leather_jerkin", headArmor: "leather_cap",
        sprite: "armored-axeman", classId: "ironbloom_warden", bag: ["health_potion"] },
      { q: 1, r: 6, team: "player", name: "Spearman",
        stats: { melee: 45, defense: 6, hp: 10, initiative: 110 },
        weapon: "spear", shield: "buckler",
        bodyArmor: "linen_tunic", headArmor: "hood",
        sprite: "knight-templar", classId: "ironbloom_warden", bag: ["health_potion"] },
      // Enemy
      { q: 8, r: 1, team: "enemy", name: "Brigand",
        stats: { melee: 42, defense: 3, hp: 10, initiative: 95 },
        weapon: "short_sword", shield: "buckler",
        bodyArmor: "leather_jerkin", headArmor: "hood",
        aiType: "aggressive", sprite: "skeleton" },
      { q: 8, r: 4, team: "enemy", name: "Raider",
        stats: { melee: 45, defense: 2, hp: 11, initiative: 85 },
        weapon: "hand_axe",
        bodyArmor: "leather_jerkin", headArmor: "leather_cap",
        aiType: "aggressive", sprite: "orc" },
      { q: 8, r: 6, team: "enemy", name: "Thug",
        stats: { melee: 38, defense: 2, hp: 8, initiative: 80 },
        weapon: "dagger", bodyArmor: "linen_tunic",
        aiType: "aggressive", sprite: "skeleton" },
    ],
  },

  // ── 2. Hill Assault: 4v5, enemies on elevation ──
  {
    id: "hill_assault",
    name: "Hill Assault",
    description: "4v5. Storm the hilltop against entrenched defenders.",
    gridWidth: 10,
    gridHeight: 8,
    tiles: [
      // Hill in the center-right
      { q: 6, r: 2, terrain: TerrainType.Hills, elevation: 1 },
      { q: 6, r: 3, terrain: TerrainType.Hills, elevation: 1 },
      { q: 7, r: 2, terrain: TerrainType.Hills, elevation: 1 },
      { q: 7, r: 3, terrain: TerrainType.Hills, elevation: 2 },
      { q: 7, r: 4, terrain: TerrainType.Hills, elevation: 1 },
      { q: 8, r: 3, terrain: TerrainType.Hills, elevation: 1 },
      { q: 8, r: 4, terrain: TerrainType.Hills, elevation: 1 },
      // Forest on the approach
      { q: 3, r: 3, terrain: TerrainType.Forest, elevation: 0 },
      { q: 4, r: 2, terrain: TerrainType.Forest, elevation: 0 },
      { q: 4, r: 4, terrain: TerrainType.Forest, elevation: 0 },
      // Swamp blocking flank
      { q: 5, r: 6, terrain: TerrainType.Swamp, elevation: 0 },
      { q: 6, r: 6, terrain: TerrainType.Swamp, elevation: 0 },
    ],
    units: [
      // Player (4 units, attacking uphill)
      { q: 1, r: 2, team: "player", name: "Swordsman",
        stats: { melee: 50, defense: 5, hp: 13, initiative: 100 },
        weapon: "arming_sword", shield: "heater_shield",
        bodyArmor: "mail_hauberk", headArmor: "mail_coif",
        sprite: "swordsman", classId: "ironbloom_warden", bag: ["health_potion"] },
      { q: 1, r: 3, team: "player", name: "Axeman",
        stats: { melee: 48, defense: 3, hp: 14, initiative: 90 },
        weapon: "hand_axe", shield: "wooden_shield",
        bodyArmor: "leather_jerkin", headArmor: "leather_cap",
        sprite: "armored-axeman", classId: "ironbloom_warden", bag: ["health_potion"] },
      { q: 1, r: 4, team: "player", name: "Spearman",
        stats: { melee: 45, defense: 6, hp: 10, initiative: 110 },
        weapon: "spear", shield: "buckler",
        bodyArmor: "linen_tunic", headArmor: "hood",
        sprite: "knight-templar", classId: "ironbloom_warden", bag: ["health_potion"] },
      { q: 1, r: 5, team: "player", name: "Maceman",
        stats: { melee: 48, defense: 4, hp: 12, initiative: 95 },
        weapon: "winged_mace", shield: "wooden_shield",
        bodyArmor: "mail_hauberk", headArmor: "leather_cap",
        sprite: "soldier", classId: "ironbloom_warden", bag: ["health_potion"] },
      // Enemy (5 units, defending the hill)
      { q: 7, r: 2, team: "enemy", name: "Hill Guard",
        stats: { melee: 45, defense: 5, hp: 11, initiative: 90 },
        weapon: "arming_sword", shield: "heater_shield",
        bodyArmor: "mail_hauberk", headArmor: "mail_coif",
        aiType: "defensive", sprite: "armored-orc" },
      { q: 7, r: 3, team: "enemy", name: "Hill Captain",
        stats: { melee: 50, defense: 6, hp: 13, initiative: 85 },
        weapon: "longsword",
        bodyArmor: "coat_of_plates", headArmor: "nasal_helm",
        aiType: "defensive", sprite: "elite-orc" },
      { q: 7, r: 4, team: "enemy", name: "Hill Guard",
        stats: { melee: 42, defense: 4, hp: 10, initiative: 95 },
        weapon: "spear", shield: "buckler",
        bodyArmor: "leather_jerkin", headArmor: "leather_cap",
        aiType: "defensive", sprite: "orc" },
      { q: 8, r: 3, team: "enemy", name: "Hill Scout",
        stats: { melee: 38, defense: 3, hp: 9, initiative: 100 },
        weapon: "short_sword",
        bodyArmor: "linen_tunic", headArmor: "hood",
        aiType: "defensive", sprite: "skeleton" },
      { q: 8, r: 4, team: "enemy", name: "Hill Skirmisher",
        stats: { melee: 40, defense: 3, hp: 10, initiative: 105 },
        weapon: "dagger", shield: "buckler",
        bodyArmor: "leather_jerkin",
        aiType: "aggressive", sprite: "orc" },
    ],
  },

  // ── 3. Surrounded: 4v8, enemies encircling ──
  {
    id: "surrounded",
    name: "Surrounded",
    description: "4v8. Brigands encircle your band. Fight your way out!",
    gridWidth: 10,
    gridHeight: 10,
    tiles: [
      // Forest cluster in center for defensive position
      { q: 4, r: 4, terrain: TerrainType.Forest, elevation: 0 },
      { q: 5, r: 4, terrain: TerrainType.Forest, elevation: 0 },
      { q: 4, r: 5, terrain: TerrainType.Forest, elevation: 0 },
      { q: 5, r: 5, terrain: TerrainType.Forest, elevation: 0 },
      // Some hills
      { q: 3, r: 3, terrain: TerrainType.Hills, elevation: 1 },
      { q: 6, r: 6, terrain: TerrainType.Hills, elevation: 1 },
    ],
    units: [
      // Player (4 units in center)
      { q: 4, r: 4, team: "player", name: "Swordsman",
        stats: { melee: 52, defense: 6, hp: 13, initiative: 100 },
        weapon: "arming_sword", shield: "heater_shield",
        bodyArmor: "mail_hauberk", headArmor: "mail_coif",
        sprite: "swordsman", classId: "ironbloom_warden", bag: ["health_potion"] },
      { q: 5, r: 4, team: "player", name: "Axeman",
        stats: { melee: 50, defense: 4, hp: 15, initiative: 90 },
        weapon: "hand_axe", shield: "wooden_shield",
        bodyArmor: "mail_hauberk", headArmor: "leather_cap",
        sprite: "armored-axeman", classId: "ironbloom_warden", bag: ["health_potion"] },
      { q: 4, r: 5, team: "player", name: "Spearman",
        stats: { melee: 48, defense: 7, hp: 10, initiative: 110 },
        weapon: "spear", shield: "buckler",
        bodyArmor: "leather_jerkin", headArmor: "hood",
        sprite: "knight-templar", classId: "ironbloom_warden", bag: ["health_potion"] },
      { q: 5, r: 5, team: "player", name: "Maceman",
        stats: { melee: 49, defense: 5, hp: 12, initiative: 95 },
        weapon: "winged_mace", shield: "wooden_shield",
        bodyArmor: "mail_hauberk", headArmor: "leather_cap",
        sprite: "soldier", classId: "ironbloom_warden", bag: ["health_potion"] },
      // Enemy (8 units surrounding)
      { q: 2, r: 3, team: "enemy", name: "Brigand",
        stats: { melee: 40, defense: 3, hp: 9, initiative: 90 },
        weapon: "short_sword", shield: "buckler",
        bodyArmor: "leather_jerkin",
        aiType: "aggressive", sprite: "skeleton" },
      { q: 3, r: 2, team: "enemy", name: "Brigand",
        stats: { melee: 40, defense: 3, hp: 9, initiative: 92 },
        weapon: "short_sword",
        bodyArmor: "linen_tunic",
        aiType: "aggressive", sprite: "skeleton" },
      { q: 6, r: 3, team: "enemy", name: "Raider",
        stats: { melee: 42, defense: 2, hp: 10, initiative: 88 },
        weapon: "hand_axe",
        bodyArmor: "leather_jerkin", headArmor: "leather_cap",
        aiType: "aggressive", sprite: "orc" },
      { q: 7, r: 4, team: "enemy", name: "Raider",
        stats: { melee: 42, defense: 2, hp: 10, initiative: 85 },
        weapon: "hand_axe",
        bodyArmor: "leather_jerkin",
        aiType: "aggressive", sprite: "orc" },
      { q: 7, r: 6, team: "enemy", name: "Thug",
        stats: { melee: 38, defense: 2, hp: 8, initiative: 95 },
        weapon: "dagger",
        bodyArmor: "linen_tunic",
        aiType: "aggressive", sprite: "skeleton" },
      { q: 6, r: 7, team: "enemy", name: "Thug",
        stats: { melee: 38, defense: 2, hp: 8, initiative: 93 },
        weapon: "dagger",
        bodyArmor: "linen_tunic",
        aiType: "aggressive", sprite: "orc" },
      { q: 3, r: 7, team: "enemy", name: "Brigand",
        stats: { melee: 40, defense: 3, hp: 9, initiative: 87 },
        weapon: "short_sword", shield: "buckler",
        bodyArmor: "leather_jerkin",
        aiType: "aggressive", sprite: "armored-skeleton" },
      { q: 2, r: 6, team: "enemy", name: "Brigand Leader",
        stats: { melee: 48, defense: 5, hp: 12, initiative: 80 },
        weapon: "arming_sword", shield: "heater_shield",
        bodyArmor: "mail_hauberk", headArmor: "mail_coif",
        aiType: "aggressive", sprite: "armored-skeleton" },
    ],
  },

  // ── 4. Barrow Creek 1: Scouts at the Bridge (Easy, 3v3) ──
  {
    id: "barrow_creek_1",
    name: "Scouts at the Bridge",
    description:
      "Your company approaches Barrow Creek. Brigand scouts guard the old stone bridge over the creek. Clear them to secure your approach.",
    gridWidth: 10,
    gridHeight: 8,
    tiles: [
      // River running vertically through columns 4-5
      { q: 4, r: 0, terrain: TerrainType.Water, elevation: 0 },
      { q: 5, r: 0, terrain: TerrainType.Water, elevation: 0 },
      { q: 4, r: 1, terrain: TerrainType.Water, elevation: 0 },
      { q: 5, r: 1, terrain: TerrainType.Water, elevation: 0 },
      { q: 4, r: 2, terrain: TerrainType.Water, elevation: 0 },
      { q: 5, r: 2, terrain: TerrainType.Water, elevation: 0 },
      // Bridge crossing at rows 3-4 (Road tiles)
      { q: 4, r: 3, terrain: TerrainType.Road, elevation: 0 },
      { q: 5, r: 3, terrain: TerrainType.Road, elevation: 0 },
      { q: 4, r: 4, terrain: TerrainType.Road, elevation: 0 },
      { q: 5, r: 4, terrain: TerrainType.Road, elevation: 0 },
      // River continues below bridge
      { q: 4, r: 5, terrain: TerrainType.Water, elevation: 0 },
      { q: 5, r: 5, terrain: TerrainType.Water, elevation: 0 },
      { q: 4, r: 6, terrain: TerrainType.Water, elevation: 0 },
      { q: 5, r: 6, terrain: TerrainType.Water, elevation: 0 },
      { q: 4, r: 7, terrain: TerrainType.Water, elevation: 0 },
      { q: 5, r: 7, terrain: TerrainType.Water, elevation: 0 },
      // Forest on left flank
      { q: 1, r: 1, terrain: TerrainType.Forest, elevation: 0 },
      { q: 2, r: 1, terrain: TerrainType.Forest, elevation: 0 },
      { q: 1, r: 6, terrain: TerrainType.Forest, elevation: 0 },
      { q: 2, r: 6, terrain: TerrainType.Forest, elevation: 0 },
      // Forest on right flank
      { q: 7, r: 1, terrain: TerrainType.Forest, elevation: 0 },
      { q: 8, r: 1, terrain: TerrainType.Forest, elevation: 0 },
      { q: 7, r: 6, terrain: TerrainType.Forest, elevation: 0 },
      { q: 8, r: 6, terrain: TerrainType.Forest, elevation: 0 },
    ],
    units: [
      // Player (left side of bridge)
      {
        q: 1, r: 3, team: "player", name: "Swordsman",
        stats: { melee: 50, defense: 5, hp: 12, initiative: 100 },
        weapon: "arming_sword", shield: "heater_shield",
        bodyArmor: "mail_hauberk", headArmor: "mail_coif",
        sprite: "swordsman", classId: "ironbloom_warden", bag: ["health_potion"],
      },
      {
        q: 1, r: 4, team: "player", name: "Axeman",
        stats: { melee: 48, defense: 3, hp: 14, initiative: 90 },
        weapon: "hand_axe", shield: "wooden_shield",
        bodyArmor: "leather_jerkin", headArmor: "leather_cap",
        sprite: "armored-axeman", classId: "ironbloom_warden", bag: ["health_potion"],
      },
      {
        q: 2, r: 3, team: "player", name: "Spearman",
        stats: { melee: 45, defense: 6, hp: 10, initiative: 110 },
        weapon: "spear", shield: "buckler",
        bodyArmor: "linen_tunic", headArmor: "hood",
        sprite: "knight-templar", classId: "ironbloom_warden", bag: ["health_potion"],
      },
      // Enemy (right side of bridge)
      {
        q: 7, r: 3, team: "enemy", name: "Brigand Scout",
        stats: { melee: 38, defense: 2, hp: 8, initiative: 100 },
        weapon: "dagger",
        bodyArmor: "linen_tunic", headArmor: "hood",
        aiType: "aggressive", sprite: "skeleton",
      },
      {
        q: 7, r: 4, team: "enemy", name: "Brigand Scout",
        stats: { melee: 40, defense: 3, hp: 9, initiative: 95 },
        weapon: "short_sword", shield: "buckler",
        bodyArmor: "leather_jerkin",
        aiType: "aggressive", sprite: "skeleton",
      },
      {
        q: 8, r: 3, team: "enemy", name: "Brigand Scout",
        stats: { melee: 36, defense: 2, hp: 8, initiative: 90 },
        weapon: "dagger",
        bodyArmor: "linen_tunic",
        aiType: "aggressive", sprite: "orc",
      },
    ],
  },

  // ── 5. Barrow Creek 2: The Mill Yard (Normal, 3v4) ──
  {
    id: "barrow_creek_2",
    name: "The Mill Yard",
    description:
      "Beyond the bridge, the brigands have fortified an old grain mill. Barricades of lumber and carts block the approach. A bowman watches from the hill.",
    gridWidth: 10,
    gridHeight: 8,
    tiles: [
      // Hills cluster near the mill (right side)
      { q: 7, r: 2, terrain: TerrainType.Hills, elevation: 1 },
      { q: 7, r: 3, terrain: TerrainType.Hills, elevation: 2 },
      { q: 8, r: 2, terrain: TerrainType.Hills, elevation: 1 },
      { q: 8, r: 3, terrain: TerrainType.Hills, elevation: 1 },
      { q: 8, r: 4, terrain: TerrainType.Hills, elevation: 1 },
      // Forest cover on approach (left-center)
      { q: 3, r: 2, terrain: TerrainType.Forest, elevation: 0 },
      { q: 3, r: 3, terrain: TerrainType.Forest, elevation: 0 },
      { q: 4, r: 3, terrain: TerrainType.Forest, elevation: 0 },
      { q: 4, r: 4, terrain: TerrainType.Forest, elevation: 0 },
      // Swamp on one flank
      { q: 2, r: 6, terrain: TerrainType.Swamp, elevation: 0 },
      { q: 3, r: 6, terrain: TerrainType.Swamp, elevation: 0 },
      { q: 3, r: 7, terrain: TerrainType.Swamp, elevation: 0 },
    ],
    units: [
      // Player (left side)
      {
        q: 1, r: 2, team: "player", name: "Swordsman",
        stats: { melee: 50, defense: 5, hp: 12, initiative: 100 },
        weapon: "arming_sword", shield: "heater_shield",
        bodyArmor: "mail_hauberk", headArmor: "mail_coif",
        sprite: "swordsman", classId: "ironbloom_warden", bag: ["health_potion"],
      },
      {
        q: 1, r: 4, team: "player", name: "Axeman",
        stats: { melee: 48, defense: 3, hp: 14, initiative: 90 },
        weapon: "hand_axe", shield: "wooden_shield",
        bodyArmor: "leather_jerkin", headArmor: "leather_cap",
        sprite: "armored-axeman", classId: "ironbloom_warden", bag: ["health_potion"],
      },
      {
        q: 1, r: 6, team: "player", name: "Spearman",
        stats: { melee: 45, defense: 6, hp: 10, initiative: 110 },
        weapon: "spear", shield: "buckler",
        bodyArmor: "linen_tunic", headArmor: "hood",
        sprite: "knight-templar", classId: "ironbloom_warden", bag: ["health_potion"],
      },
      // Enemy (defending the mill)
      {
        q: 6, r: 3, team: "enemy", name: "Brigand Fighter",
        stats: { melee: 44, defense: 4, hp: 11, initiative: 90 },
        weapon: "arming_sword", shield: "buckler",
        bodyArmor: "leather_jerkin", headArmor: "leather_cap",
        aiType: "defensive", sprite: "armored-skeleton",
      },
      {
        q: 6, r: 5, team: "enemy", name: "Brigand Fighter",
        stats: { melee: 42, defense: 3, hp: 10, initiative: 88 },
        weapon: "hand_axe", shield: "wooden_shield",
        bodyArmor: "leather_jerkin", headArmor: "hood",
        aiType: "defensive", sprite: "orc",
      },
      {
        q: 7, r: 5, team: "enemy", name: "Brigand Enforcer",
        stats: { melee: 46, defense: 5, hp: 12, initiative: 85 },
        weapon: "winged_mace", shield: "heater_shield",
        bodyArmor: "mail_hauberk", headArmor: "mail_coif",
        aiType: "defensive", sprite: "armored-orc",
      },
      {
        q: 7, r: 3, team: "enemy", name: "Brigand Bowman",
        stats: { melee: 30, defense: 2, hp: 8, initiative: 105, rangedSkill: 45 },
        weapon: "short_bow",
        bodyArmor: "linen_tunic", headArmor: "hood",
        aiType: "ranged", sprite: "skeleton-archer",
      },
    ],
  },

  // ── 6. Barrow Creek 3: The Brigand Camp (Hard, 3v5) ──
  {
    id: "barrow_creek_3",
    name: "The Brigand Camp",
    description:
      "The brigand leader has holed up in their main camp beyond the mill. Tents and supplies litter the clearing. This ends now.",
    gridWidth: 12,
    gridHeight: 10,
    tiles: [
      // Mountains on edges creating a valley
      { q: 0, r: 0, terrain: TerrainType.Mountains, elevation: 3 },
      { q: 0, r: 1, terrain: TerrainType.Mountains, elevation: 3 },
      { q: 0, r: 2, terrain: TerrainType.Mountains, elevation: 2 },
      { q: 11, r: 0, terrain: TerrainType.Mountains, elevation: 3 },
      { q: 11, r: 1, terrain: TerrainType.Mountains, elevation: 3 },
      { q: 11, r: 8, terrain: TerrainType.Mountains, elevation: 3 },
      { q: 11, r: 9, terrain: TerrainType.Mountains, elevation: 3 },
      { q: 0, r: 8, terrain: TerrainType.Mountains, elevation: 2 },
      { q: 0, r: 9, terrain: TerrainType.Mountains, elevation: 3 },
      // Hills in the center where the leader stands
      { q: 6, r: 4, terrain: TerrainType.Hills, elevation: 1 },
      { q: 7, r: 4, terrain: TerrainType.Hills, elevation: 2 },
      { q: 7, r: 5, terrain: TerrainType.Hills, elevation: 1 },
      { q: 6, r: 5, terrain: TerrainType.Hills, elevation: 1 },
      // Forest clusters for cover
      { q: 3, r: 3, terrain: TerrainType.Forest, elevation: 0 },
      { q: 3, r: 4, terrain: TerrainType.Forest, elevation: 0 },
      { q: 4, r: 3, terrain: TerrainType.Forest, elevation: 0 },
      { q: 9, r: 6, terrain: TerrainType.Forest, elevation: 0 },
      { q: 9, r: 7, terrain: TerrainType.Forest, elevation: 0 },
      { q: 10, r: 7, terrain: TerrainType.Forest, elevation: 0 },
      // Some scattered forest
      { q: 5, r: 7, terrain: TerrainType.Forest, elevation: 0 },
      { q: 2, r: 6, terrain: TerrainType.Forest, elevation: 0 },
    ],
    units: [
      // Player (left side of the valley)
      {
        q: 1, r: 3, team: "player", name: "Swordsman",
        stats: { melee: 52, defense: 6, hp: 13, initiative: 100 },
        weapon: "arming_sword", shield: "heater_shield",
        bodyArmor: "mail_hauberk", headArmor: "mail_coif",
        sprite: "swordsman", classId: "ironbloom_warden", bag: ["health_potion"],
      },
      {
        q: 1, r: 5, team: "player", name: "Axeman",
        stats: { melee: 50, defense: 4, hp: 15, initiative: 90 },
        weapon: "hand_axe", shield: "wooden_shield",
        bodyArmor: "mail_hauberk", headArmor: "leather_cap",
        sprite: "armored-axeman", classId: "ironbloom_warden", bag: ["health_potion"],
      },
      {
        q: 1, r: 7, team: "player", name: "Spearman",
        stats: { melee: 48, defense: 7, hp: 11, initiative: 110 },
        weapon: "spear", shield: "buckler",
        bodyArmor: "leather_jerkin", headArmor: "hood",
        sprite: "knight-templar", classId: "ironbloom_warden", bag: ["health_potion"],
      },
      // Enemy — Brigand Leader on the hill
      {
        q: 7, r: 4, team: "enemy", name: "Brigand Leader",
        stats: { melee: 55, defense: 7, hp: 16, initiative: 80, level: 3 },
        weapon: "longsword",
        bodyArmor: "coat_of_plates", headArmor: "nasal_helm",
        aiType: "defensive", sprite: "elite-orc",
      },
      // 2 Raiders with hand axes
      {
        q: 8, r: 3, team: "enemy", name: "Raider",
        stats: { melee: 46, defense: 3, hp: 11, initiative: 92 },
        weapon: "hand_axe",
        bodyArmor: "leather_jerkin", headArmor: "leather_cap",
        aiType: "aggressive", sprite: "orc",
      },
      {
        q: 8, r: 6, team: "enemy", name: "Raider",
        stats: { melee: 44, defense: 3, hp: 11, initiative: 88 },
        weapon: "hand_axe",
        bodyArmor: "leather_jerkin", headArmor: "leather_cap",
        aiType: "aggressive", sprite: "orc",
      },
      // 2 Thugs flanking
      {
        q: 5, r: 2, team: "enemy", name: "Thug",
        stats: { melee: 40, defense: 2, hp: 9, initiative: 100 },
        weapon: "dagger", shield: "buckler",
        bodyArmor: "linen_tunic",
        aiType: "aggressive", sprite: "skeleton",
      },
      {
        q: 5, r: 8, team: "enemy", name: "Thug",
        stats: { melee: 40, defense: 2, hp: 9, initiative: 98 },
        weapon: "dagger", shield: "buckler",
        bodyArmor: "linen_tunic",
        aiType: "aggressive", sprite: "skeleton",
      },
    ],
  },
];

export function getScenario(id: string): ScenarioDef | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function getDefaultScenarioId(): string {
  return "tutorial";
}

export function getScenarioByIndex(index: number): ScenarioDef {
  return SCENARIOS[index % SCENARIOS.length]!;
}

export function getScenarioCount(): number {
  return SCENARIOS.length;
}
