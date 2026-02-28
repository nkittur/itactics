import type { ResourceDef } from "@entities/components/Resources";

// ── Archetype Definition ──

/** A single node in a skill tree. */
export interface SkillTreeNode {
  /** Ability definition id. */
  abilityId: string;
  /** Position in the tier (0-based index). */
  position: number;
  /** Node IDs that must be unlocked before this one. */
  prerequisites: string[];
}

/** A tier in the skill tree (5 tiers per archetype). */
export interface SkillTreeTier {
  /** Tier number (1-5). */
  tier: number;
  /** Nodes available at this tier. */
  nodes: SkillTreeNode[];
  /** Level required to unlock this tier. */
  levelRequired: number;
}

/**
 * Archetype definition within a class.
 * Each class has 3 archetypes, each with its own skill tree.
 */
export interface ArchetypeDef {
  /** Unique identifier (e.g., "pyromancer_flame_dancer"). */
  id: string;
  /** Display name. */
  name: string;
  /** Short fantasy description of this archetype's identity. */
  description: string;
  /** Longer gameplay description of how this archetype plays. */
  playstyle: string;
  /** Thematic tags (e.g., "fire", "melee", "aoe"). */
  tags: string[];
  /** The 5-tier skill tree. */
  skillTree: SkillTreeTier[];
  /** Key synergies with other archetypes. */
  synergies: string[];
}

// ── Class Definition ──

/** Base stat block for a class. */
export interface ClassBaseStats {
  hitpoints: number;
  stamina: number;
  mana: number;
  resolve: number;
  initiative: number;
  meleeSkill: number;
  rangedSkill: number;
  dodge: number;
  magicResist: number;
  critChance: number;
  critMultiplier: number;
  movementPoints: number;
}

/** Resource declaration for a class. */
export interface ClassResourceDecl {
  /** Resource def id. */
  resourceId: string;
  /** Override for max value (class-specific scaling). */
  maxOverride?: number;
  /** Override for start value. */
  startOverride?: number;
  /** Formula for scaling max with level. E.g., "base + level * 2". */
  scalingFormula?: string;
}

/** Passive bonus granted by the class itself (not from skill tree). */
export interface ClassInnatePasive {
  /** Type of bonus. */
  type: "stat_bonus" | "resistance" | "weapon_proficiency" | "armor_proficiency" | "resource_regen" | "damage_type_bonus";
  /** Parameters for the bonus. */
  params: Record<string, any>;
}

/**
 * Full class definition for 104 classes.
 * Each class defines base stats, resources, 3 archetypes with skill trees,
 * and innate passives.
 */
export interface ClassDef {
  /** Unique identifier (e.g., "pyromancer", "shadow_knight"). */
  id: string;
  /** Display name. */
  name: string;
  /** Fantasy description of the class. */
  description: string;
  /** Short gameplay summary. */
  role: string;
  /** Thematic category (e.g., "martial", "magical", "hybrid", "support"). */
  category: string;
  /** Tags for search/filter. */
  tags: string[];

  /** Base stats at level 1. */
  baseStats: ClassBaseStats;

  /** Stat growth per level. */
  statGrowth: Partial<ClassBaseStats>;

  /** Which generic resources this class uses. */
  resources: ClassResourceDecl[];

  /** Weapon families this class can use. Empty = all. */
  weaponFamilies: string[];
  /** Max weapon hands (1 = 1H only, 2 = any). Default 2. */
  maxWeaponHands?: 1 | 2;
  /** Shield access level. */
  shieldAccess: "none" | "buckler" | "all";
  /** Max armor weight. */
  maxArmorWeight: "light" | "medium" | "heavy";

  /** Base movement points. */
  baseMP: number;

  /** Innate passives (not from skill tree). */
  innatePassives: ClassInnatePasive[];

  /** The 3 archetypes. */
  archetypes: [ArchetypeDef, ArchetypeDef, ArchetypeDef];

  /** Visual theme for UI. */
  themeColor: string;
  /** Icon identifier. */
  icon: string;
}

// ── Class Registry ──

const classDefs = new Map<string, ClassDef>();

export function registerClassDef(def: ClassDef): void {
  classDefs.set(def.id, def);
}

export function getClassDefNew(id: string): ClassDef | undefined {
  return classDefs.get(id);
}

export function getAllClassDefs(): ClassDef[] {
  return [...classDefs.values()];
}

export function getClassesByCategory(category: string): ClassDef[] {
  return [...classDefs.values()].filter(c => c.category === category);
}

export function getClassesByTag(tag: string): ClassDef[] {
  return [...classDefs.values()].filter(c => c.tags.includes(tag));
}

// ── Archetype Unlock Tracking ──

export interface ArchetypeProgress {
  classId: string;
  archetypeId: string;
  /** Highest tier unlocked (0 = none, 1-5). */
  highestTier: number;
  /** Set of unlocked node ability IDs. */
  unlockedNodes: Set<string>;
  /** Skill points spent in this archetype. */
  pointsSpent: number;
}

export interface ClassProgress {
  classId: string;
  level: number;
  experience: number;
  /** Progress for each of the 3 archetypes. */
  archetypes: Record<string, ArchetypeProgress>;
  /** Total skill points available (unspent). */
  availablePoints: number;
}

/**
 * Create initial progress for a class.
 */
export function createClassProgress(classDef: ClassDef): ClassProgress {
  const archetypes: Record<string, ArchetypeProgress> = {};
  for (const arch of classDef.archetypes) {
    archetypes[arch.id] = {
      classId: classDef.id,
      archetypeId: arch.id,
      highestTier: 0,
      unlockedNodes: new Set(),
      pointsSpent: 0,
    };
  }

  return {
    classId: classDef.id,
    level: 1,
    experience: 0,
    archetypes,
    availablePoints: 1,
  };
}

/**
 * Unlock a skill tree node for an archetype.
 */
export function unlockNode(
  progress: ClassProgress,
  archetypeId: string,
  abilityId: string,
  classDef: ClassDef,
): boolean {
  const archProgress = progress.archetypes[archetypeId];
  if (!archProgress) return false;
  if (progress.availablePoints <= 0) return false;
  if (archProgress.unlockedNodes.has(abilityId)) return false;

  // Find the node in the skill tree
  const archDef = classDef.archetypes.find(a => a.id === archetypeId);
  if (!archDef) return false;

  let targetNode: SkillTreeNode | null = null;
  let targetTier: SkillTreeTier | null = null;

  for (const tier of archDef.skillTree) {
    for (const node of tier.nodes) {
      if (node.abilityId === abilityId) {
        targetNode = node;
        targetTier = tier;
        break;
      }
    }
    if (targetNode) break;
  }

  if (!targetNode || !targetTier) return false;

  // Check level requirement
  if (progress.level < targetTier.levelRequired) return false;

  // Check prerequisites
  for (const prereq of targetNode.prerequisites) {
    if (!archProgress.unlockedNodes.has(prereq)) return false;
  }

  // Unlock
  archProgress.unlockedNodes.add(abilityId);
  archProgress.pointsSpent++;
  progress.availablePoints--;

  // Update highest tier
  if (targetTier.tier > archProgress.highestTier) {
    archProgress.highestTier = targetTier.tier;
  }

  return true;
}

/**
 * Get all unlocked ability IDs for a class progress.
 */
export function getUnlockedAbilities(progress: ClassProgress): string[] {
  const abilities: string[] = [];
  for (const arch of Object.values(progress.archetypes)) {
    abilities.push(...arch.unlockedNodes);
  }
  return abilities;
}

/**
 * Get available nodes that can be unlocked next.
 */
export function getAvailableNodes(
  progress: ClassProgress,
  archetypeId: string,
  classDef: ClassDef,
): SkillTreeNode[] {
  const archProgress = progress.archetypes[archetypeId];
  if (!archProgress) return [];

  const archDef = classDef.archetypes.find(a => a.id === archetypeId);
  if (!archDef) return [];

  const available: SkillTreeNode[] = [];
  for (const tier of archDef.skillTree) {
    if (progress.level < tier.levelRequired) continue;
    for (const node of tier.nodes) {
      if (archProgress.unlockedNodes.has(node.abilityId)) continue;
      const prereqsMet = node.prerequisites.every(p => archProgress.unlockedNodes.has(p));
      if (prereqsMet) available.push(node);
    }
  }

  return available;
}

// ── Example Class Definition (Pyromancer) ──
// This shows the format; actual 104 classes would be loaded from JSON

export const EXAMPLE_PYROMANCER: ClassDef = {
  id: "pyromancer",
  name: "Pyromancer",
  description: "A master of destructive fire magic who trades defense for overwhelming offensive power.",
  role: "Ranged DPS / AoE specialist",
  category: "magical",
  tags: ["fire", "aoe", "dps", "ranged"],

  baseStats: {
    hitpoints: 80, stamina: 40, mana: 120, resolve: 40,
    initiative: 35, meleeSkill: 30, rangedSkill: 65, dodge: 20,
    magicResist: 15, critChance: 8, critMultiplier: 1.5, movementPoints: 6,
  },

  statGrowth: {
    hitpoints: 5, mana: 8, rangedSkill: 3, magicResist: 1, critChance: 0.5,
  },

  resources: [
    { resourceId: "mana", maxOverride: 120 },
    { resourceId: "heat", maxOverride: 100 },
  ],

  weaponFamilies: ["staff", "wand"],
  shieldAccess: "none",
  maxArmorWeight: "light",
  baseMP: 6,

  innatePassives: [
    { type: "damage_type_bonus", params: { damageType: "fire", bonusPercent: 15 } },
    { type: "resistance", params: { damageType: "fire", resistPercent: 25 } },
  ],

  archetypes: [
    {
      id: "pyro_flame_dancer",
      name: "Flame Dancer",
      description: "An agile pyromaniac who weaves through combat, leaving trails of fire.",
      playstyle: "Mobile fire DPS that builds Heat to unlock powerful finishers.",
      tags: ["fire", "mobile", "dps"],
      synergies: ["pyro_inferno_lord", "elementalist_fire"],
      skillTree: [
        {
          tier: 1, levelRequired: 1,
          nodes: [
            { abilityId: "pyro_fire_bolt", position: 0, prerequisites: [] },
            { abilityId: "pyro_flame_step", position: 1, prerequisites: [] },
            { abilityId: "pyro_heat_passive", position: 2, prerequisites: [] },
          ],
        },
        {
          tier: 2, levelRequired: 3,
          nodes: [
            { abilityId: "pyro_fire_trail", position: 0, prerequisites: ["pyro_flame_step"] },
            { abilityId: "pyro_scorch", position: 1, prerequisites: ["pyro_fire_bolt"] },
          ],
        },
        {
          tier: 3, levelRequired: 5,
          nodes: [
            { abilityId: "pyro_heat_wave", position: 0, prerequisites: ["pyro_scorch"] },
            { abilityId: "pyro_fire_dance", position: 1, prerequisites: ["pyro_fire_trail"] },
          ],
        },
        {
          tier: 4, levelRequired: 8,
          nodes: [
            { abilityId: "pyro_immolate", position: 0, prerequisites: ["pyro_heat_wave"] },
          ],
        },
        {
          tier: 5, levelRequired: 10,
          nodes: [
            { abilityId: "pyro_phoenix_rush", position: 0, prerequisites: ["pyro_immolate", "pyro_fire_dance"] },
          ],
        },
      ],
    },
    {
      id: "pyro_inferno_lord",
      name: "Inferno Lord",
      description: "A devastating AoE caster who creates massive fire zones.",
      playstyle: "Stationary zone controller that dominates the battlefield with persistent fire.",
      tags: ["fire", "aoe", "zone"],
      synergies: ["pyro_flame_dancer", "summoner_fire"],
      skillTree: [
        {
          tier: 1, levelRequired: 1,
          nodes: [
            { abilityId: "pyro_fireball", position: 0, prerequisites: [] },
            { abilityId: "pyro_fire_field", position: 1, prerequisites: [] },
            { abilityId: "pyro_burn_mastery", position: 2, prerequisites: [] },
          ],
        },
        {
          tier: 2, levelRequired: 3,
          nodes: [
            { abilityId: "pyro_flame_wall", position: 0, prerequisites: ["pyro_fire_field"] },
            { abilityId: "pyro_ember_rain", position: 1, prerequisites: ["pyro_fireball"] },
          ],
        },
        {
          tier: 3, levelRequired: 5,
          nodes: [
            { abilityId: "pyro_conflagration", position: 0, prerequisites: ["pyro_flame_wall"] },
            { abilityId: "pyro_fire_storm", position: 1, prerequisites: ["pyro_ember_rain"] },
          ],
        },
        {
          tier: 4, levelRequired: 8,
          nodes: [
            { abilityId: "pyro_volcanic_eruption", position: 0, prerequisites: ["pyro_conflagration"] },
          ],
        },
        {
          tier: 5, levelRequired: 10,
          nodes: [
            { abilityId: "pyro_world_burn", position: 0, prerequisites: ["pyro_volcanic_eruption", "pyro_fire_storm"] },
          ],
        },
      ],
    },
    {
      id: "pyro_ash_phoenix",
      name: "Ash Phoenix",
      description: "A resilient fire mage who channels self-destruction and rebirth.",
      playstyle: "Risk-reward caster that uses HP as a resource and can revive from death.",
      tags: ["fire", "risk_reward", "self_damage"],
      synergies: ["blood_mage", "pyro_flame_dancer"],
      skillTree: [
        {
          tier: 1, levelRequired: 1,
          nodes: [
            { abilityId: "pyro_ash_bolt", position: 0, prerequisites: [] },
            { abilityId: "pyro_ember_shield", position: 1, prerequisites: [] },
            { abilityId: "pyro_phoenix_passive", position: 2, prerequisites: [] },
          ],
        },
        {
          tier: 2, levelRequired: 3,
          nodes: [
            { abilityId: "pyro_self_immolate", position: 0, prerequisites: ["pyro_ash_bolt"] },
            { abilityId: "pyro_ash_form", position: 1, prerequisites: ["pyro_ember_shield"] },
          ],
        },
        {
          tier: 3, levelRequired: 5,
          nodes: [
            { abilityId: "pyro_burning_sacrifice", position: 0, prerequisites: ["pyro_self_immolate"] },
            { abilityId: "pyro_phoenix_stance", position: 1, prerequisites: ["pyro_ash_form"] },
          ],
        },
        {
          tier: 4, levelRequired: 8,
          nodes: [
            { abilityId: "pyro_death_fire", position: 0, prerequisites: ["pyro_burning_sacrifice"] },
          ],
        },
        {
          tier: 5, levelRequired: 10,
          nodes: [
            { abilityId: "pyro_phoenix_rebirth", position: 0, prerequisites: ["pyro_death_fire", "pyro_phoenix_stance"] },
          ],
        },
      ],
    },
  ],

  themeColor: "#ff4400",
  icon: "class_pyromancer",
};
