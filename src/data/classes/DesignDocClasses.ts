/**
 * Registers 104 classes from the parsed design document (skill_trees.txt).
 * Only ENABLED_CLASSES are registered — the rest are available but filtered out.
 *
 * Import this file (side-effect) to populate the class registry.
 */

import { registerClassDef, type ClassDef, type ClassBaseStats, type ArchetypeDef, type SkillTreeTier } from "../ClassDefinition";
import { DOC_CLASSES, type DocClass, type DocArchetype } from "../parsed/SkillTreeContent";
import { isDocTypePassive } from "../AbilityTypeMapping";

// ── Enabled classes (start with 10) ──

export const ENABLED_CLASSES = new Set([
  "chronoweaver",
  "ironbloom_warden",
  "echo_dancer",
  "bladesinger",
  "blood_alchemist",
  "hexblade",
  "berserker",
  "monk",
  "ranger",
  "necrosurgeon",
]);

// ── Base stat templates by class fantasy keywords ──

interface StatTemplate {
  keywords: string[];
  stats: ClassBaseStats;
  category: string;
  weaponFamilies: string[];
  shieldAccess: "none" | "buckler" | "all";
  maxArmorWeight: "light" | "medium" | "heavy";
}

const STAT_TEMPLATES: StatTemplate[] = [
  {
    keywords: ["tank", "warden", "knight", "fortress", "armor", "shield", "guardian", "protector"],
    stats: { hitpoints: 130, stamina: 100, mana: 20, resolve: 60, initiative: 30, meleeSkill: 45, rangedSkill: 15, dodge: 10, magicResist: 10, critChance: 3, critMultiplier: 1.3, movementPoints: 7 },
    category: "martial", weaponFamilies: ["sword", "mace"], shieldAccess: "all", maxArmorWeight: "heavy",
  },
  {
    keywords: ["assassin", "rogue", "stealth", "shadow", "thief", "ghost"],
    stats: { hitpoints: 85, stamina: 100, mana: 30, resolve: 40, initiative: 55, meleeSkill: 50, rangedSkill: 40, dodge: 40, magicResist: 5, critChance: 10, critMultiplier: 1.8, movementPoints: 9 },
    category: "martial", weaponFamilies: ["dagger", "sword"], shieldAccess: "none", maxArmorWeight: "light",
  },
  {
    keywords: ["warrior", "berserker", "rage", "fury", "melee", "brute", "martial", "combatant", "fighter"],
    stats: { hitpoints: 110, stamina: 100, mana: 20, resolve: 50, initiative: 40, meleeSkill: 55, rangedSkill: 25, dodge: 20, magicResist: 5, critChance: 5, critMultiplier: 1.5, movementPoints: 8 },
    category: "martial", weaponFamilies: ["sword", "axe", "mace", "spear"], shieldAccess: "all", maxArmorWeight: "heavy",
  },
  {
    keywords: ["archer", "ranger", "marksman", "ranged", "hunter", "gunslinger"],
    stats: { hitpoints: 90, stamina: 90, mana: 30, resolve: 40, initiative: 45, meleeSkill: 30, rangedSkill: 60, dodge: 30, magicResist: 5, critChance: 8, critMultiplier: 1.6, movementPoints: 8 },
    category: "martial", weaponFamilies: ["bow", "crossbow", "throwing"], shieldAccess: "none", maxArmorWeight: "medium",
  },
  {
    keywords: ["mage", "caster", "magic", "arcane", "wizard", "sorcerer", "elemental"],
    stats: { hitpoints: 80, stamina: 40, mana: 120, resolve: 40, initiative: 35, meleeSkill: 20, rangedSkill: 60, dodge: 15, magicResist: 15, critChance: 6, critMultiplier: 1.5, movementPoints: 7 },
    category: "magical", weaponFamilies: ["staff", "wand"], shieldAccess: "none", maxArmorWeight: "light",
  },
  {
    keywords: ["fire", "pyro", "flame", "burn", "ash"],
    stats: { hitpoints: 80, stamina: 40, mana: 120, resolve: 40, initiative: 35, meleeSkill: 25, rangedSkill: 65, dodge: 20, magicResist: 15, critChance: 8, critMultiplier: 1.5, movementPoints: 6 },
    category: "magical", weaponFamilies: ["staff", "wand"], shieldAccess: "none", maxArmorWeight: "light",
  },
  {
    keywords: ["healer", "priest", "cleric", "support", "holy", "divine", "light"],
    stats: { hitpoints: 90, stamina: 60, mana: 100, resolve: 55, initiative: 30, meleeSkill: 25, rangedSkill: 45, dodge: 15, magicResist: 20, critChance: 4, critMultiplier: 1.3, movementPoints: 7 },
    category: "support", weaponFamilies: ["staff", "mace"], shieldAccess: "buckler", maxArmorWeight: "medium",
  },
  {
    keywords: ["necro", "undead", "death", "bone", "skeleton", "corpse"],
    stats: { hitpoints: 85, stamina: 50, mana: 110, resolve: 45, initiative: 30, meleeSkill: 25, rangedSkill: 55, dodge: 15, magicResist: 15, critChance: 5, critMultiplier: 1.4, movementPoints: 7 },
    category: "magical", weaponFamilies: ["staff", "dagger"], shieldAccess: "none", maxArmorWeight: "light",
  },
  {
    keywords: ["monk", "martial_arts", "ki", "fist", "unarmed"],
    stats: { hitpoints: 95, stamina: 100, mana: 50, resolve: 50, initiative: 50, meleeSkill: 55, rangedSkill: 20, dodge: 35, magicResist: 10, critChance: 8, critMultiplier: 1.6, movementPoints: 9 },
    category: "martial", weaponFamilies: ["dagger", "staff"], shieldAccess: "none", maxArmorWeight: "light",
  },
  {
    keywords: ["spellsword", "hybrid", "battlemage", "singer", "dancer"],
    stats: { hitpoints: 95, stamina: 80, mana: 60, resolve: 45, initiative: 45, meleeSkill: 45, rangedSkill: 40, dodge: 25, magicResist: 10, critChance: 6, critMultiplier: 1.5, movementPoints: 8 },
    category: "hybrid", weaponFamilies: ["sword", "dagger", "staff"], shieldAccess: "buckler", maxArmorWeight: "medium",
  },
  {
    keywords: ["summoner", "summon", "companion", "beast", "creature", "golem", "construct", "insect", "swarm"],
    stats: { hitpoints: 85, stamina: 50, mana: 100, resolve: 45, initiative: 30, meleeSkill: 20, rangedSkill: 45, dodge: 15, magicResist: 15, critChance: 4, critMultiplier: 1.3, movementPoints: 7 },
    category: "magical", weaponFamilies: ["staff", "wand"], shieldAccess: "none", maxArmorWeight: "light",
  },
  {
    keywords: ["blood", "alchemist", "alchemy", "potion", "chemist"],
    stats: { hitpoints: 90, stamina: 60, mana: 100, resolve: 50, initiative: 35, meleeSkill: 30, rangedSkill: 50, dodge: 20, magicResist: 10, critChance: 5, critMultiplier: 1.5, movementPoints: 7 },
    category: "magical", weaponFamilies: ["dagger", "staff"], shieldAccess: "none", maxArmorWeight: "medium",
  },
  {
    keywords: ["ice", "frost", "cold", "glacier", "winter"],
    stats: { hitpoints: 85, stamina: 50, mana: 110, resolve: 45, initiative: 30, meleeSkill: 20, rangedSkill: 60, dodge: 15, magicResist: 15, critChance: 6, critMultiplier: 1.5, movementPoints: 7 },
    category: "magical", weaponFamilies: ["staff", "wand"], shieldAccess: "none", maxArmorWeight: "light",
  },
  {
    keywords: ["time", "chrono", "temporal"],
    stats: { hitpoints: 80, stamina: 50, mana: 110, resolve: 45, initiative: 45, meleeSkill: 20, rangedSkill: 55, dodge: 25, magicResist: 15, critChance: 5, critMultiplier: 1.4, movementPoints: 8 },
    category: "magical", weaponFamilies: ["staff", "wand"], shieldAccess: "none", maxArmorWeight: "light",
  },
  {
    keywords: ["nature", "plant", "druid", "wild", "garden"],
    stats: { hitpoints: 100, stamina: 70, mana: 80, resolve: 50, initiative: 35, meleeSkill: 35, rangedSkill: 45, dodge: 20, magicResist: 15, critChance: 4, critMultiplier: 1.4, movementPoints: 7 },
    category: "hybrid", weaponFamilies: ["staff", "mace"], shieldAccess: "buckler", maxArmorWeight: "medium",
  },
  {
    keywords: ["sound", "echo", "vibration", "bard", "music", "song"],
    stats: { hitpoints: 85, stamina: 80, mana: 70, resolve: 45, initiative: 45, meleeSkill: 40, rangedSkill: 40, dodge: 30, magicResist: 10, critChance: 7, critMultiplier: 1.5, movementPoints: 8 },
    category: "hybrid", weaponFamilies: ["dagger", "sword"], shieldAccess: "none", maxArmorWeight: "medium",
  },
];

// Default stats for unmatched classes
const DEFAULT_STATS: ClassBaseStats = {
  hitpoints: 95, stamina: 70, mana: 70, resolve: 45, initiative: 40,
  meleeSkill: 40, rangedSkill: 40, dodge: 20, magicResist: 10,
  critChance: 5, critMultiplier: 1.5, movementPoints: 7,
};

function matchTemplate(cls: DocClass): StatTemplate | null {
  const searchText = `${cls.name} ${cls.subtitle} ${cls.fantasy}`.toLowerCase();
  let best: StatTemplate | null = null;
  let bestScore = 0;
  for (const tmpl of STAT_TEMPLATES) {
    let score = 0;
    for (const kw of tmpl.keywords) {
      if (searchText.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = tmpl;
    }
  }
  return best;
}

// ── Infer archetype tags from ability types ──

function inferTags(arch: DocArchetype, classSubtitle: string): string[] {
  const tags = new Set<string>();
  const allTypes = arch.abilities.map(a => a.type.toLowerCase());
  const text = `${arch.name} ${arch.mechanic} ${arch.identity} ${classSubtitle}`.toLowerCase();

  if (allTypes.includes("attack") || text.includes("melee") || text.includes("warrior") || text.includes("strike")) tags.add("melee");
  if (text.includes("ranged") || text.includes("marksman") || text.includes("archer") || text.includes("gun")) tags.add("ranged");
  if (allTypes.includes("heal") || text.includes("heal") || text.includes("support")) tags.add("support");
  if (allTypes.includes("buff") || text.includes("buff")) tags.add("buff");
  if (allTypes.includes("debuff") || text.includes("debuff")) tags.add("debuff");
  if (allTypes.includes("cc") || text.includes("stun") || text.includes("root") || text.includes("control")) tags.add("cc");
  if (allTypes.includes("aoe") || text.includes("aoe") || text.includes("area")) tags.add("aoe");
  if (allTypes.includes("summon") || text.includes("summon") || text.includes("companion") || text.includes("construct")) tags.add("summon");
  if (text.includes("fire") || text.includes("flame") || text.includes("burn") || text.includes("pyro")) tags.add("fire");
  if (text.includes("ice") || text.includes("frost") || text.includes("cold")) tags.add("ice");
  if (text.includes("lightning") || text.includes("storm") || text.includes("thunder") || text.includes("electric")) tags.add("lightning");
  if (text.includes("shadow") || text.includes("dark") || text.includes("stealth")) tags.add("stealth");
  if (text.includes("poison") || text.includes("venom") || text.includes("toxic")) tags.add("poison");
  if (text.includes("bleed") || text.includes("blood")) tags.add("bleed");
  if (text.includes("tank") || text.includes("defense") || text.includes("protect") || text.includes("armor")) tags.add("tank");
  if (text.includes("mobile") || text.includes("speed") || text.includes("movement") || text.includes("teleport")) tags.add("mobile");
  if (text.includes("necro") || text.includes("undead") || text.includes("death") || text.includes("bone")) tags.add("necro");
  if (text.includes("holy") || text.includes("divine") || text.includes("light") || text.includes("sacred")) tags.add("holy");

  // Ensure at least one tag
  if (tags.size === 0) tags.add("versatile");

  return [...tags];
}

// ── Color generation from class name ──

function classColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffff;
  }
  // Make sure it's not too dark
  const r = Math.max(0x44, (hash >> 16) & 0xff);
  const g = Math.max(0x44, (hash >> 8) & 0xff);
  const b = Math.max(0x44, hash & 0xff);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ── Build tier structure from DocArchetype ──

function buildSkillTreeTiers(arch: DocArchetype): SkillTreeTier[] {
  const tiers: SkillTreeTier[] = [];
  const levelRequirements: Record<number, number> = { 1: 1, 2: 3, 3: 5, 4: 8, 5: 10 };

  // Group abilities by tier
  const byTier = new Map<number, typeof arch.abilities>();
  for (const ability of arch.abilities) {
    if (!byTier.has(ability.tier)) byTier.set(ability.tier, []);
    byTier.get(ability.tier)!.push(ability);
  }

  // For each tier, build the SkillTreeTier
  for (const [tierNum, abilities] of [...byTier.entries()].sort((a, b) => a[0] - b[0])) {
    const nodes = abilities
      .sort((a, b) => a.position - b.position)
      .map((ability, i) => {
        // Generate node ID from archetype ID + ability name
        const nodeId = `${arch.id}_${i}`;

        // Prerequisites: tier 1 has none, higher tiers link to tier above
        let prereqs: string[] = [];
        if (tierNum > 1) {
          const prevTier = byTier.get(tierNum - 1);
          if (prevTier) {
            // Connect to the corresponding node in previous tier, or first if fewer
            const prevIdx = Math.min(i, prevTier.length - 1);
            prereqs = [`${arch.id}_${prevTier.length > 0 ? getGlobalIndex(arch, tierNum - 1, prevIdx) : 0}`];
          }
        }
        // Tier 5 (capstone) connects to all tier 4 nodes
        if (tierNum === 5) {
          const prevTier = byTier.get(4);
          if (prevTier) {
            prereqs = prevTier.map((_, pi) => `${arch.id}_${getGlobalIndex(arch, 4, pi)}`);
          }
        }

        return { abilityId: `${arch.id}_${getGlobalIndex(arch, tierNum, i)}`, position: i, prerequisites: prereqs };
      });

    tiers.push({ tier: tierNum, levelRequired: levelRequirements[tierNum] ?? 1, nodes });
  }

  return tiers;
}

/** Get the global index of an ability within its archetype (across all tiers). */
function getGlobalIndex(arch: DocArchetype, tier: number, posInTier: number): number {
  let idx = 0;
  for (const a of arch.abilities) {
    if (a.tier === tier && a.position === posInTier) return idx;
    idx++;
  }
  return idx;
}

// ── Convert DocClass → ClassDef ──

function docClassToClassDef(cls: DocClass): ClassDef {
  const template = matchTemplate(cls);

  const archetypes: [ArchetypeDef, ArchetypeDef, ArchetypeDef] = cls.archetypes.map(docArch => {
    const tags = inferTags(docArch, cls.subtitle);
    const tiers = buildSkillTreeTiers(docArch);
    return {
      id: docArch.id,
      name: docArch.name,
      description: docArch.identity,
      playstyle: docArch.mechanic,
      tags,
      synergies: [],
      skillTree: tiers,
    } as ArchetypeDef;
  }) as [ArchetypeDef, ArchetypeDef, ArchetypeDef];

  return {
    id: cls.id,
    name: cls.name,
    description: cls.fantasy,
    role: cls.subtitle,
    category: template?.category ?? "hybrid",
    tags: [...new Set(archetypes.flatMap(a => a.tags))].slice(0, 5),
    baseStats: template?.stats ?? DEFAULT_STATS,
    statGrowth: { hitpoints: 7, meleeSkill: 2, rangedSkill: 2, dodge: 1 },
    resources: [{ resourceId: "stamina", maxOverride: 100 }],
    weaponFamilies: template?.weaponFamilies ?? ["sword", "dagger", "staff"],
    shieldAccess: template?.shieldAccess ?? "buckler",
    maxArmorWeight: template?.maxArmorWeight ?? "medium",
    baseMP: template?.stats?.movementPoints ?? 7,
    innatePassives: [],
    archetypes,
    themeColor: classColor(cls.name),
    icon: `class_${cls.id}`,
  };
}

// ── Register all enabled classes ──

for (const docClass of DOC_CLASSES) {
  if (ENABLED_CLASSES.has(docClass.id)) {
    registerClassDef(docClassToClassDef(docClass));
  }
}
