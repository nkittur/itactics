import { get, set, del } from "idb-keyval";
import type { StatKey } from "@data/TalentData";
import type { ContractDef } from "@data/ContractData";
import type { RecruitDef } from "@data/RecruitData";
import type { GeneratedItem } from "@data/GeneratedItemData";
import type { GeneratedAbility } from "@data/AbilityData";
import type { SkillTree } from "@data/SkillTreeData";
import { generateArchetypeTree } from "@data/SkillTreeData";
import { setAbilityRegistry } from "@data/AbilityResolver";

const SAVE_KEY = "itactics-save";

export interface RosterMember {
  name: string;
  classId?: string;
  level: number;
  experience: number;
  stats: {
    hitpoints: number;
    stamina: number;
    mana: number;
    resolve: number;
    initiative: number;
    meleeSkill: number;
    rangedSkill: number;
    dodge: number;
    magicResist: number;
    movementPoints: number;
  };
  maxHp: number;
  talentStars: Record<StatKey, number>;
  perks: { unlocked: string[]; availablePoints: number };
  equipment: {
    mainHand: string | null;
    offHand: string | null;
    accessory: string | null;
    bag: string[];
  };
  armor: {
    body: { id: string; armor: number; magicResist: number } | null;
    head: { id: string; armor: number; magicResist: number } | null;
  };
  spriteType?: string;
  backgroundId?: string;
  traits?: string[];
  /** Generated ability UIDs this unit has. */
  abilities?: string[];
  /** Recruit theme ID (e.g., "bleeder", "crusher"). */
  skillTheme?: string;
  /** Secondary skill theme ID for bucket diversity. */
  secondarySkillTheme?: string;
  /** Archetype ID from class definition (e.g., "fighter_weapon_master"). */
  archetypeId?: string;
  /** Maps ability UID → level at which it unlocks. @deprecated Use skillTree. */
  abilityUnlockLevels?: Record<string, number>;
  /** Procedurally generated skill tree for this unit. */
  skillTree?: SkillTree;
  /** Node IDs that have been unlocked by spending CP. */
  unlockedNodes?: string[];
  /** Per-node stack counts for stackable nodes: nodeId → current stacks. */
  nodeStacks?: Record<string, number>;
  /** Available class points to spend on skill tree. */
  classPoints?: number;
}

export interface BattleState {
  scenarioId: string;
  /** Serialized World (all entities + components). */
  worldSnapshot: object;
  /** Serialized turn order queue. */
  turnOrderState: string[];
  playerIds: string[];
  enemyIds: string[];
  killCount: number;
  rngState: number;
}

export interface ShopState {
  inventory: string[];
  refreshCount: number;
  generatedAtLevel: number;
}

export interface SaveData {
  version: 1;
  roster: RosterMember[];
  currentScenarioIndex: number;
  gold: number;
  /** Shared party inventory of item IDs. */
  stash: string[];
  /** Set when player picks a contract — triggers battle on next load. */
  pendingContract?: ContractDef;
  /** Cached between sessions. */
  availableContracts?: ContractDef[];
  /** Cached between sessions. */
  availableRecruits?: RecruitDef[];
  battleInProgress?: BattleState;
  /** Registry of procedurally generated items, keyed by UID. */
  itemRegistry?: Record<string, GeneratedItem>;
  /** Registry of procedurally generated abilities, keyed by UID. */
  abilityRegistry?: Record<string, GeneratedAbility>;
  /** Current shop state. */
  shopState?: ShopState;
}

export async function saveGame(data: SaveData): Promise<void> {
  await set(SAVE_KEY, data);
}

export async function loadGame(): Promise<SaveData | null> {
  const data = await get<SaveData>(SAVE_KEY);
  if (data && data.version === 1) {
    // Backward compat: default gold/stash if missing from older saves
    const raw = data as unknown as Record<string, unknown>;
    if (raw.gold == null) data.gold = 0;
    if (!Array.isArray(raw.stash)) data.stash = [];
    if (!data.itemRegistry) data.itemRegistry = {};
    if (!data.abilityRegistry) data.abilityRegistry = {};

    // Set ability registry before migration so new abilities are registered into save data
    setAbilityRegistry(data.abilityRegistry);

    // Migrate to archetype skill tree (covers both old level-based and old theme-based trees)
    for (const member of data.roster) {
      if (!member.skillTree || !member.archetypeId) {
        migrateToSkillTree(member);
      }
    }

    return data;
  }
  return null;
}

export async function deleteSave(): Promise<void> {
  await del(SAVE_KEY);
}

/** Remove generated items from registry that are not referenced by stash, equipment, or shop. */
export function pruneItemRegistry(save: SaveData): void {
  const registry = save.itemRegistry;
  if (!registry) return;

  const referenced = new Set<string>();

  // Stash
  for (const id of save.stash) referenced.add(id);

  // Shop
  if (save.shopState) {
    for (const id of save.shopState.inventory) referenced.add(id);
  }

  // Roster equipment
  for (const m of save.roster) {
    if (m.equipment.mainHand) referenced.add(m.equipment.mainHand);
    if (m.equipment.offHand) referenced.add(m.equipment.offHand);
    for (const id of m.equipment.bag) referenced.add(id);
    if (m.armor.body) referenced.add(m.armor.body.id);
    if (m.armor.head) referenced.add(m.armor.head.id);
  }

  for (const uid of Object.keys(registry)) {
    if (!referenced.has(uid)) {
      delete registry[uid];
    }
  }
}

/** Migrate a roster member from level-based unlock to skill tree. */
function migrateToSkillTree(member: RosterMember): void {
  // Deterministic RNG seeded from name
  let seed = 0;
  for (let i = 0; i < member.name.length; i++) {
    seed = (seed * 31 + member.name.charCodeAt(i)) >>> 0;
  }
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const classId = member.classId ?? "fighter";
  const result = generateArchetypeTree(classId, null, rng);
  const skillTree = result.tree;

  member.skillTree = skillTree;
  member.skillTheme = result.themeId;
  member.secondarySkillTheme = result.secondaryThemeId ?? undefined;
  member.archetypeId = result.archetypeId;
  member.classPoints = 0;
  member.unlockedNodes = [];
  member.nodeStacks = {};

  // Auto-unlock nodes proportional to level
  const sorted = [...skillTree.nodes].sort((a, b) => a.tier - b.tier);
  let freeUnlocks = 0;
  if (member.level >= 8) freeUnlocks = 6;
  else if (member.level >= 6) freeUnlocks = 4;
  else if (member.level >= 4) freeUnlocks = 3;
  else if (member.level >= 2) freeUnlocks = 1;

  for (let i = 0; i < freeUnlocks && i < sorted.length; i++) {
    member.unlockedNodes.push(sorted[i]!.nodeId);
  }

  // Populate abilities list from tree for backward compat
  member.abilities = skillTree.nodes.map(n => n.abilityUid);
}
