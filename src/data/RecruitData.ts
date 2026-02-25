import type { CharacterClass } from "./ClassData";
import type { StatKey } from "./TalentData";
import { generateTalentStars, rollStatIncrease, ALL_STAT_KEYS } from "./TalentData";
import type { SpriteCharType } from "@rendering/SpriteAnimator";
import type { RosterMember } from "@save/SaveManager";
import { getArmorDef } from "./ArmorData";

export interface RecruitDef {
  name: string;
  classId: CharacterClass;
  level: number;
  stats: RosterMember["stats"];
  maxHp: number;
  talentStars: Record<StatKey, number>;
  sprite: SpriteCharType;
  cost: number;
  equipment: RosterMember["equipment"];
  armor: RosterMember["armor"];
}

const NAMES = [
  "Erik", "Bjorn", "Gunnar", "Harald", "Sven", "Olaf", "Ragnar",
  "Torsten", "Ulf", "Ingvar", "Leif", "Sigurd", "Thorkell", "Knut",
  "Aelfric", "Godwin", "Osric", "Wulfric", "Edric", "Aldric",
  "Gareth", "Cedric", "Roland", "Baldwin", "Godfrey", "Hugh",
  "Werner", "Konrad", "Fritz", "Otto",
];

const RECRUIT_CLASSES: CharacterClass[] = ["fighter", "spearman", "rogue", "ranger", "brute"];

const CLASS_SPRITES: Record<string, SpriteCharType[]> = {
  fighter: ["soldier", "swordsman", "armored-axeman"],
  spearman: ["knight-templar", "lancer", "soldier"],
  rogue: ["swordsman", "soldier"],
  ranger: ["archer", "soldier"],
  brute: ["armored-axeman", "knight"],
};

const CLASS_STARTER_WEAPONS: Record<string, string[]> = {
  fighter: ["short_sword", "hand_axe"],
  spearman: ["spear"],
  rogue: ["dagger", "short_sword"],
  ranger: ["short_bow"],
  brute: ["hand_axe", "winged_mace"],
};

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

/** Base level 1 stats with small random variation. */
function baseStats(rng: () => number): RosterMember["stats"] {
  const vary = () => -2 + Math.floor(rng() * 5); // -2 to +2
  return {
    hitpoints: 10 + vary(),
    fatigue: 100,
    resolve: 45 + vary(),
    initiative: 95 + vary(),
    meleeSkill: 45 + vary(),
    rangedSkill: 30 + vary(),
    meleeDefense: 3 + Math.floor(rng() * 6), // 3-8
    rangedDefense: 3 + Math.floor(rng() * 6),
    movementPoints: 8,
  };
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
        case "fatigue": stats.fatigue += increase; break;
        case "resolve": stats.resolve += increase; break;
        case "initiative": stats.initiative += increase; break;
        case "meleeSkill": stats.meleeSkill += increase; break;
        case "rangedSkill": stats.rangedSkill += increase; break;
        case "meleeDefense": stats.meleeDefense += increase; break;
        case "rangedDefense": stats.rangedDefense += increase; break;
      }
    }
  }
}

function armorForLevel(level: number): RosterMember["armor"] {
  if (level >= 5) {
    const body = getArmorDef("mail_hauberk");
    const head = getArmorDef("mail_coif");
    return {
      body: body ? { id: body.id, currentDurability: body.durability, maxDurability: body.durability } : null,
      head: head ? { id: head.id, currentDurability: head.durability, maxDurability: head.durability } : null,
    };
  }
  if (level >= 3) {
    const body = getArmorDef("leather_jerkin");
    const head = getArmorDef("leather_cap");
    return {
      body: body ? { id: body.id, currentDurability: body.durability, maxDurability: body.durability } : null,
      head: head ? { id: head.id, currentDurability: head.durability, maxDurability: head.durability } : null,
    };
  }
  // Level 1-2: basic
  const body = getArmorDef("linen_tunic");
  const head = getArmorDef("hood");
  return {
    body: body ? { id: body.id, currentDurability: body.durability, maxDurability: body.durability } : null,
    head: head ? { id: head.id, currentDurability: head.durability, maxDurability: head.durability } : null,
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

    const classId = pick(RECRUIT_CLASSES, rng);
    const level = rollRecruitLevel(partyLevel, rng);
    const talentStars = generateTalentStars(rng);
    const stats = baseStats(rng);

    // Apply level growth
    if (level > 1) {
      applyLevelGrowth(stats, talentStars, 1, level, rng);
    }

    const sprites = CLASS_SPRITES[classId] ?? ["soldier"];
    const sprite = pick(sprites, rng);
    const weapons = CLASS_STARTER_WEAPONS[classId] ?? ["short_sword"];
    const weapon = pick(weapons, rng);

    const is2H = weapon === "longsword" || weapon === "pike" || weapon === "short_bow" || weapon === "hunting_bow";

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
        shieldDurability: null,
        accessory: null,
        bag: [],
      },
      armor: armorForLevel(level),
    });
  }

  return recruits;
}
