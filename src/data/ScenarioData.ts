import { TerrainType } from "@hex/HexGrid";
import type { AIType } from "@entities/components/AIBehavior";
import type { SpriteCharType } from "@rendering/SpriteAnimator";

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
  stats: { melee: number; defense: number; hp: number; initiative: number; mp?: number };
  weapon?: string;
  shield?: string;
  bodyArmor?: string;
  headArmor?: string;
  aiType?: AIType;
  sprite?: SpriteCharType;
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
        stats: { melee: 70, defense: 15, hp: 60, initiative: 100 },
        weapon: "arming_sword", shield: "heater_shield",
        bodyArmor: "mail_hauberk", headArmor: "mail_coif",
        sprite: "swordsman" },
      { q: 1, r: 4, team: "player", name: "Axeman",
        stats: { melee: 65, defense: 10, hp: 70, initiative: 90 },
        weapon: "hand_axe", shield: "wooden_shield",
        bodyArmor: "leather_jerkin", headArmor: "leather_cap",
        sprite: "armored-axeman" },
      { q: 1, r: 6, team: "player", name: "Spearman",
        stats: { melee: 60, defense: 20, hp: 55, initiative: 110 },
        weapon: "spear", shield: "buckler",
        bodyArmor: "linen_tunic", headArmor: "hood",
        sprite: "knight-templar" },
      // Enemy
      { q: 8, r: 1, team: "enemy", name: "Brigand",
        stats: { melee: 55, defense: 10, hp: 50, initiative: 95 },
        weapon: "short_sword", shield: "buckler",
        bodyArmor: "leather_jerkin", headArmor: "hood",
        aiType: "aggressive", sprite: "skeleton" },
      { q: 8, r: 4, team: "enemy", name: "Raider",
        stats: { melee: 60, defense: 5, hp: 55, initiative: 85 },
        weapon: "hand_axe",
        bodyArmor: "leather_jerkin", headArmor: "leather_cap",
        aiType: "aggressive", sprite: "orc" },
      { q: 8, r: 6, team: "enemy", name: "Thug",
        stats: { melee: 45, defense: 5, hp: 45, initiative: 80 },
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
        stats: { melee: 70, defense: 15, hp: 65, initiative: 100 },
        weapon: "arming_sword", shield: "heater_shield",
        bodyArmor: "mail_hauberk", headArmor: "mail_coif",
        sprite: "swordsman" },
      { q: 1, r: 3, team: "player", name: "Axeman",
        stats: { melee: 65, defense: 10, hp: 70, initiative: 90 },
        weapon: "hand_axe", shield: "wooden_shield",
        bodyArmor: "leather_jerkin", headArmor: "leather_cap",
        sprite: "armored-axeman" },
      { q: 1, r: 4, team: "player", name: "Spearman",
        stats: { melee: 60, defense: 20, hp: 55, initiative: 110 },
        weapon: "spear", shield: "buckler",
        bodyArmor: "linen_tunic", headArmor: "hood",
        sprite: "knight-templar" },
      { q: 1, r: 5, team: "player", name: "Maceman",
        stats: { melee: 65, defense: 12, hp: 60, initiative: 95 },
        weapon: "winged_mace", shield: "wooden_shield",
        bodyArmor: "mail_hauberk", headArmor: "leather_cap",
        sprite: "soldier" },
      // Enemy (5 units, defending the hill)
      { q: 7, r: 2, team: "enemy", name: "Hill Guard",
        stats: { melee: 60, defense: 15, hp: 55, initiative: 90 },
        weapon: "arming_sword", shield: "heater_shield",
        bodyArmor: "mail_hauberk", headArmor: "mail_coif",
        aiType: "defensive", sprite: "armored-orc" },
      { q: 7, r: 3, team: "enemy", name: "Hill Captain",
        stats: { melee: 70, defense: 20, hp: 65, initiative: 85 },
        weapon: "longsword",
        bodyArmor: "coat_of_plates", headArmor: "nasal_helm",
        aiType: "defensive", sprite: "elite-orc" },
      { q: 7, r: 4, team: "enemy", name: "Hill Guard",
        stats: { melee: 55, defense: 12, hp: 50, initiative: 95 },
        weapon: "spear", shield: "buckler",
        bodyArmor: "leather_jerkin", headArmor: "leather_cap",
        aiType: "defensive", sprite: "orc" },
      { q: 8, r: 3, team: "enemy", name: "Hill Scout",
        stats: { melee: 45, defense: 8, hp: 45, initiative: 100 },
        weapon: "short_sword",
        bodyArmor: "linen_tunic", headArmor: "hood",
        aiType: "defensive", sprite: "skeleton" },
      { q: 8, r: 4, team: "enemy", name: "Hill Skirmisher",
        stats: { melee: 50, defense: 10, hp: 50, initiative: 105 },
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
        stats: { melee: 75, defense: 18, hp: 65, initiative: 100 },
        weapon: "arming_sword", shield: "heater_shield",
        bodyArmor: "mail_hauberk", headArmor: "mail_coif",
        sprite: "swordsman" },
      { q: 5, r: 4, team: "player", name: "Axeman",
        stats: { melee: 70, defense: 12, hp: 75, initiative: 90 },
        weapon: "hand_axe", shield: "wooden_shield",
        bodyArmor: "mail_hauberk", headArmor: "leather_cap",
        sprite: "armored-axeman" },
      { q: 4, r: 5, team: "player", name: "Spearman",
        stats: { melee: 65, defense: 22, hp: 55, initiative: 110 },
        weapon: "spear", shield: "buckler",
        bodyArmor: "leather_jerkin", headArmor: "hood",
        sprite: "knight-templar" },
      { q: 5, r: 5, team: "player", name: "Maceman",
        stats: { melee: 68, defense: 14, hp: 60, initiative: 95 },
        weapon: "winged_mace", shield: "wooden_shield",
        bodyArmor: "mail_hauberk", headArmor: "leather_cap",
        sprite: "soldier" },
      // Enemy (8 units surrounding)
      { q: 2, r: 3, team: "enemy", name: "Brigand",
        stats: { melee: 50, defense: 8, hp: 45, initiative: 90 },
        weapon: "short_sword", shield: "buckler",
        bodyArmor: "leather_jerkin",
        aiType: "aggressive", sprite: "skeleton" },
      { q: 3, r: 2, team: "enemy", name: "Brigand",
        stats: { melee: 50, defense: 8, hp: 45, initiative: 92 },
        weapon: "short_sword",
        bodyArmor: "linen_tunic",
        aiType: "aggressive", sprite: "skeleton" },
      { q: 6, r: 3, team: "enemy", name: "Raider",
        stats: { melee: 55, defense: 5, hp: 50, initiative: 88 },
        weapon: "hand_axe",
        bodyArmor: "leather_jerkin", headArmor: "leather_cap",
        aiType: "aggressive", sprite: "orc" },
      { q: 7, r: 4, team: "enemy", name: "Raider",
        stats: { melee: 55, defense: 5, hp: 50, initiative: 85 },
        weapon: "hand_axe",
        bodyArmor: "leather_jerkin",
        aiType: "aggressive", sprite: "orc" },
      { q: 7, r: 6, team: "enemy", name: "Thug",
        stats: { melee: 45, defense: 5, hp: 40, initiative: 95 },
        weapon: "dagger",
        bodyArmor: "linen_tunic",
        aiType: "aggressive", sprite: "skeleton" },
      { q: 6, r: 7, team: "enemy", name: "Thug",
        stats: { melee: 45, defense: 5, hp: 40, initiative: 93 },
        weapon: "dagger",
        bodyArmor: "linen_tunic",
        aiType: "aggressive", sprite: "orc" },
      { q: 3, r: 7, team: "enemy", name: "Brigand",
        stats: { melee: 50, defense: 8, hp: 45, initiative: 87 },
        weapon: "short_sword", shield: "buckler",
        bodyArmor: "leather_jerkin",
        aiType: "aggressive", sprite: "armored-skeleton" },
      { q: 2, r: 6, team: "enemy", name: "Brigand Leader",
        stats: { melee: 65, defense: 15, hp: 60, initiative: 80 },
        weapon: "arming_sword", shield: "heater_shield",
        bodyArmor: "mail_hauberk", headArmor: "mail_coif",
        aiType: "aggressive", sprite: "armored-skeleton" },
    ],
  },
];

export function getScenario(id: string): ScenarioDef | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function getDefaultScenarioId(): string {
  return "tutorial";
}
