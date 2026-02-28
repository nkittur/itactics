import { getClassDef, getAllCharacterClasses } from "./ClassData";
import type { StatKey } from "./TalentData";
import { generateTalentStars, rollStatIncrease, ALL_STAT_KEYS } from "./TalentData";
import type { SpriteCharType } from "@rendering/SpriteAnimator";
import type { RosterMember } from "@save/SaveManager";
import { getArmorDef } from "./ArmorData";
import { getWeapon } from "./WeaponData";
import { pickTheme, pickSecondaryTheme } from "./ThemeData";
import { generateRecruitSkills } from "./AbilityGenerator";
import { generateSkillTree } from "./SkillTreeData";
import type { SkillTree } from "./SkillTreeData";

export interface RecruitDef {
  name: string;
  classId: string;
  level: number;
  stats: RosterMember["stats"];
  maxHp: number;
  talentStars: Record<StatKey, number>;
  sprite: SpriteCharType;
  cost: number;
  equipment: RosterMember["equipment"];
  armor: RosterMember["armor"];
  /** Skill theme ID (e.g., "bleeder", "crusher"). */
  skillTheme: string;
  /** Secondary skill theme ID for bucket diversity. */
  secondarySkillTheme: string | null;
  /** @deprecated Use skillTree. Kept for backward compat. */
  uniqueSkills: { uid: string; unlockLevel: number }[];
  /** Procedurally generated skill tree. */
  skillTree: SkillTree;
  /** Starting CP for this recruit (higher-level recruits come with CP). */
  classPoints: number;
}

const NAMES = [
  "Erik", "Bjorn", "Gunnar", "Harald", "Sven", "Olaf", "Ragnar",
  "Torsten", "Ulf", "Ingvar", "Leif", "Sigurd", "Thorkell", "Knut",
  "Aelfric", "Godwin", "Osric", "Wulfric", "Edric", "Aldric",
  "Gareth", "Cedric", "Roland", "Baldwin", "Godfrey", "Hugh",
  "Werner", "Konrad", "Fritz", "Otto",
];

// Lazily populated from all registered classes (avoids import-order issues).
let _recruitClasses: string[] | null = null;
function getRecruitClasses(): string[] {
  if (!_recruitClasses) _recruitClasses = getAllCharacterClasses();
  return _recruitClasses;
}

const CLASS_SPRITES: Record<string, SpriteCharType[]> = {
  fighter: ["soldier", "swordsman", "armored-axeman"],
  knight: ["knight-templar", "knight"],
  spearman: ["knight-templar", "lancer", "soldier"],
  rogue: ["swordsman", "soldier"],
  ranger: ["archer", "soldier"],
  brute: ["armored-axeman", "knight"],
  occultist: ["wizard"],
  priest: ["priest"],
  pyromancer: ["wizard"],
  necromancer: ["wizard"],
  shadow_knight: ["knight", "swordsman"],
  monk: ["soldier", "swordsman"],
  bard: ["swordsman", "soldier"],
  berserker: ["armored-axeman", "knight"],
  paladin: ["knight-templar", "knight"],
  elementalist: ["wizard"],
  assassin: ["swordsman", "soldier"],
  warden: ["knight-templar", "soldier", "knight"],
};

/** Map weapon family to a starter weapon ID. */
const FAMILY_STARTER_WEAPON: Record<string, string> = {
  sword: "short_sword",
  dagger: "dagger",
  axe: "hand_axe",
  mace: "winged_mace",
  spear: "spear",
  polearm: "spear",
  bow: "short_bow",
  crossbow: "short_bow",
  throwing: "throwing_axe",
  staff: "oak_staff",
  wand: "wooden_wand",
  flail: "winged_mace",
  cleaver: "hand_axe",
};

function getStarterWeapons(classId: string): string[] {
  try {
    const classDef = getClassDef(classId);
    const weapons: string[] = [];
    for (const fam of classDef.weaponFamilies.slice(0, 2)) {
      const w = FAMILY_STARTER_WEAPON[fam];
      if (w && !weapons.includes(w)) weapons.push(w);
    }
    return weapons.length > 0 ? weapons : ["short_sword"];
  } catch {
    return ["short_sword"];
  }
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

/** Base level 1 stats driven from class definition with small random variation. */
function baseStats(classId: string, rng: () => number): RosterMember["stats"] {
  const vary = () => -2 + Math.floor(rng() * 5); // -2 to +2
  try {
    const classDef = getClassDef(classId);
    const b = classDef.baseStats;
    return {
      hitpoints: b.hitpoints + vary(),
      stamina: b.stamina,
      mana: b.mana,
      resolve: b.resolve + vary(),
      initiative: b.initiative + vary(),
      meleeSkill: b.meleeSkill + vary(),
      rangedSkill: b.rangedSkill + vary(),
      dodge: b.dodge + Math.floor(rng() * 6),
      magicResist: b.magicResist + vary(),
      movementPoints: b.movementPoints,
    };
  } catch {
    // Fallback for unknown classes
    return {
      hitpoints: 10 + vary(),
      stamina: 100,
      mana: 20,
      resolve: 45 + vary(),
      initiative: 95 + vary(),
      meleeSkill: 45 + vary(),
      rangedSkill: 30 + vary(),
      dodge: 3 + Math.floor(rng() * 6),
      magicResist: 0,
      movementPoints: 8,
    };
  }
}

/** Apply level-up stat growth for levels above 1. */
function applyLevelGrowth(
  stats: RosterMember["stats"],
  talentStars: Record<StatKey, number>,
  fromLevel: number,
  toLevel: number,
  rng: () => number,
): void {
  for (let lvl = fromLevel; lvl < toLevel; lvl++) {
    for (const key of ALL_STAT_KEYS) {
      const stars = talentStars[key];
      const increase = rollStatIncrease(key, stars, rng);
      switch (key) {
        case "hitpoints": stats.hitpoints += increase; break;
        case "stamina": stats.stamina += increase; break;
        case "resolve": stats.resolve += increase; break;
        case "initiative": stats.initiative += increase; break;
        case "meleeSkill": stats.meleeSkill += increase; break;
        case "rangedSkill": stats.rangedSkill += increase; break;
        case "dodge": stats.dodge += increase; break;
      }
    }
  }
}

function armorSlotFromDef(def: ReturnType<typeof getArmorDef>) {
  return def ? { id: def.id, armor: def.armor, magicResist: def.magicResist } : null;
}

function armorForLevel(level: number): RosterMember["armor"] {
  if (level >= 5) {
    return {
      body: armorSlotFromDef(getArmorDef("mail_hauberk")),
      head: armorSlotFromDef(getArmorDef("mail_coif")),
    };
  }
  if (level >= 3) {
    return {
      body: armorSlotFromDef(getArmorDef("leather_jerkin")),
      head: armorSlotFromDef(getArmorDef("leather_cap")),
    };
  }
  // Level 1-2: basic
  return {
    body: armorSlotFromDef(getArmorDef("linen_tunic")),
    head: armorSlotFromDef(getArmorDef("hood")),
  };
}

/** Compute party level from the top 3 highest-leveled roster members. */
export function getPartyLevel(roster: RosterMember[]): number {
  if (roster.length === 0) return 1;
  const sorted = [...roster].sort((a, b) => b.level - a.level);
  const top3 = sorted.slice(0, 3);
  const avg = top3.reduce((sum, m) => sum + m.level, 0) / top3.length;
  return Math.max(1, Math.round(avg));
}

/** Roll a recruit level based on party level. */
function rollRecruitLevel(partyLevel: number, rng: () => number): number {
  const roll = rng();
  let level: number;
  if (roll < 0.50) {
    level = partyLevel - 3;
  } else if (roll < 0.80) {
    level = partyLevel - 2;
  } else if (roll < 0.95) {
    level = partyLevel - 1;
  } else {
    level = partyLevel;
  }
  return Math.max(1, level);
}

export function generateRecruits(partyLevel: number, rng: () => number): RecruitDef[] {
  const count = 3 + (rng() < 0.5 ? 1 : 0); // 3 or 4
  const recruits: RecruitDef[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    // Unique name
    let name: string;
    do {
      name = pick(NAMES, rng);
    } while (usedNames.has(name) && usedNames.size < NAMES.length);
    usedNames.add(name);

    const classId = pick(getRecruitClasses(), rng);
    const level = rollRecruitLevel(partyLevel, rng);
    const talentStars = generateTalentStars(rng);
    const stats = baseStats(classId, rng);

    // Apply level growth
    if (level > 1) {
      applyLevelGrowth(stats, talentStars, 1, level, rng);
    }

    const sprites = CLASS_SPRITES[classId] ?? ["soldier"];
    const sprite = pick(sprites, rng);
    const weapons = getStarterWeapons(classId);
    const weapon = pick(weapons, rng);

    const is2H = getWeapon(weapon).hands === 2;

    // Generate skill theme and skill tree
    const theme = pickTheme(classId, rng);
    const secondaryTheme = pickSecondaryTheme(theme, rng);
    const skillTree = generateSkillTree(theme, secondaryTheme, rng);

    // Backward-compat: derive uniqueSkills from tree nodes
    const uniqueSkills = skillTree.nodes.map(n => ({
      uid: n.abilityUid,
      unlockLevel: n.tier * 5, // approximate old-style unlock levels
    }));

    // Higher-level recruits come with starting CP: ~1 battle per level
    const startingCP = (level - 1) * 80;

    recruits.push({
      name,
      classId,
      level,
      stats,
      maxHp: stats.hitpoints,
      talentStars,
      sprite,
      cost: 40 + level * 25,
      equipment: {
        mainHand: weapon,
        offHand: is2H ? null : null, // No shield by default for recruits
        accessory: null,
        bag: [],
      },
      armor: armorForLevel(level),
      skillTheme: theme.id,
      secondarySkillTheme: secondaryTheme?.id ?? null,
      uniqueSkills,
      skillTree,
      classPoints: startingCP,
    });
  }

  return recruits;
}
