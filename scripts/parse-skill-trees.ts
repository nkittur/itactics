/**
 * One-time parser for skill_trees.txt → src/data/parsed/SkillTreeContent.ts
 *
 * Usage: npx tsx scripts/parse-skill-trees.ts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DocAbility {
  name: string;
  type: string;
  description: string;
  tier: number;
  position: number; // 0-based within tier
}

interface DocArchetype {
  id: string;
  name: string;
  mechanic: string;
  identity: string;
  abilities: DocAbility[];
}

interface DocClass {
  id: string;
  name: string;
  subtitle: string;
  fantasy: string;
  archetypes: DocArchetype[];
}

// ── Convert real-time descriptions to turn-based ──

function convertToTurnBased(desc: string): string {
  let d = desc;

  const secToTurns = (sec: number): number => {
    if (sec <= 3) return 1;
    if (sec <= 6) return 2;
    if (sec <= 10) return 3;
    if (sec <= 15) return 4;
    if (sec <= 20) return 5;
    if (sec <= 30) return 6;
    if (sec <= 60) return 8;
    if (sec <= 120) return 10;
    return 15;
  };

  const mToHex = (m: number): number => {
    if (m <= 3) return 1;
    if (m <= 6) return 2;
    if (m <= 10) return 3;
    if (m <= 15) return 4;
    if (m <= 20) return 5;
    if (m <= 30) return 6;
    return 8;
  };

  const turnPlural = (n: number) => n === 1 ? "1 turn" : `${n} turns`;
  const hexPlural = (n: number) => n === 1 ? "1 hex" : `${n} hexes`;

  // ORDER MATTERS: specific patterns before generic ones

  // 1. Speed: Xm/s → hexes/turn
  d = d.replace(/(\d+(?:\.\d+)?)m\/s/g, (_, n) => {
    const hexes = mToHex(parseFloat(n));
    return `${hexPlural(hexes)}/turn`;
  });

  // 2. Rate: per second / /s → per turn
  d = d.replace(/per second/gi, "per turn");
  d = d.replace(/(\d+(?:\.\d+)?(?:%)?)\s*\/s\b/g, "$1/turn");

  // 3. Cooldown: Xs cooldown
  d = d.replace(/(\d+(?:\.\d+)?)s cooldown/g, (_, n) => {
    return `${turnPlural(secToTurns(parseFloat(n)))} cooldown`;
  });

  // 4-11. Duration patterns: for Xs, lasts Xs, Xs duration, over Xs, within Xs, after Xs, every Xs, from Xs ago
  d = d.replace(/for (\d+(?:\.\d+)?)s\b/gi, (_, n) => `for ${turnPlural(secToTurns(parseFloat(n)))}`);
  d = d.replace(/lasts (\d+(?:\.\d+)?)s\b/gi, (_, n) => `lasts ${turnPlural(secToTurns(parseFloat(n)))}`);
  d = d.replace(/(\d+(?:\.\d+)?)s duration/gi, (_, n) => `${turnPlural(secToTurns(parseFloat(n)))} duration`);
  d = d.replace(/over (\d+(?:\.\d+)?)s\b/gi, (_, n) => `over ${turnPlural(secToTurns(parseFloat(n)))}`);
  d = d.replace(/within (\d+(?:\.\d+)?)s\b/gi, (_, n) => `within ${turnPlural(secToTurns(parseFloat(n)))}`);
  d = d.replace(/after (\d+(?:\.\d+)?)s\b/gi, (_, n) => `after ${turnPlural(secToTurns(parseFloat(n)))}`);
  d = d.replace(/every (\d+(?:\.\d+)?)s\b/gi, (_, n) => `every ${turnPlural(secToTurns(parseFloat(n)))}`);
  d = d.replace(/from (\d+(?:\.\d+)?)s ago/gi, (_, n) => `from ${turnPlural(secToTurns(parseFloat(n)))} ago`);

  // 12. Channel / self-stun
  d = d.replace(/(\d+(?:\.\d+)?)s channel\b/gi, (_, n) => `${turnPlural(secToTurns(parseFloat(n)))} channel`);
  d = d.replace(/(\d+(?:\.\d+)?)s self-stun/gi, (_, n) => `${turnPlural(secToTurns(parseFloat(n)))} self-stun`);

  // 13. CC bare: stunned 1.5s, rooted 4s, etc.
  d = d.replace(/(stun(?:ned|s)?|silence[d]?|root(?:ed|s)?|daze[d]?|sleep|freeze|frozen|suspend(?:ed)?|immobilize[d]?)\s+(\d+(?:\.\d+)?)s\b/gi,
    (_, word, n) => `${word} ${turnPlural(secToTurns(parseFloat(n)))}`);

  // 14 (generic). Any remaining bare \d+s — in ability descriptions this is always seconds
  d = d.replace(/(\d+(?:\.\d+)?)s\b/g, (_, n) => `${turnPlural(secToTurns(parseFloat(n)))}`);

  // 14. Range: within Xm, in Xm (before generic)
  d = d.replace(/within (\d+(?:\.\d+)?)m\b/g, (_, n) => `within ${hexPlural(mToHex(parseFloat(n)))}`);
  d = d.replace(/\bin (\d+(?:\.\d+)?)m\b/g, (_, n) => `in ${hexPlural(mToHex(parseFloat(n)))}`);

  // 15. Range: parenthetical (Xm)
  d = d.replace(/\((\d+(?:\.\d+)?)m\)/g, (_, n) => `(${hexPlural(mToHex(parseFloat(n)))})`);
  d = d.replace(/\((\d+(?:\.\d+)?)m,/g, (_, n) => `(${hexPlural(mToHex(parseFloat(n)))},`);

  // 16. Arrow chains: Xm ->
  d = d.replace(/(\d+(?:\.\d+)?)m(\s*->)/g, (_, n, arrow) => `${hexPlural(mToHex(parseFloat(n)))}${arrow}`);

  // 17. Generic Xm fallback — in this dataset every \d+m is a distance
  d = d.replace(/(\d+(?:\.\d+)?)m\b/g, (_, n) => `${hexPlural(mToHex(parseFloat(n)))}`);

  // 18. Speed terms
  d = d.replace(/\battack speed\b/gi, "attack rate");
  d = d.replace(/\bcast speed\b/gi, "cast rate");
  d = d.replace(/\bmovement speed\b/gi, "movement");
  d = d.replace(/\baction speed\b/gi, "action rate");

  return d;
}

function toId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function parseSkillTrees(text: string): DocClass[] {
  const lines = text.split("\n");
  const classes: DocClass[] = [];

  let currentClass: DocClass | null = null;
  let currentArchetype: DocArchetype | null = null;
  let currentTier = 0;
  let positionInTier = 0;
  let lastAbility: DocAbility | null = null;
  let collectingFantasy = false;
  let collectingIdentity = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trimEnd();

    // Skip annotation lines
    if (trimmed.startsWith(">>") || trimmed.startsWith("[YOUR") || trimmed.startsWith(">")) {
      collectingFantasy = false;
      collectingIdentity = false;
      lastAbility = null;
      continue;
    }

    // Skip decoration lines
    if (/^[=#-]{4,}$/.test(trimmed) || /^#{4,}$/.test(trimmed)) {
      continue;
    }

    // CLASS header: CLASS N: NAME (Subtitle)
    const classMatch = trimmed.match(/^CLASS\s+\d+:\s+(.+?)\s*\((.+?)\)\s*$/);
    if (classMatch) {
      collectingFantasy = false;
      collectingIdentity = false;
      lastAbility = null;

      currentClass = {
        id: toId(classMatch[1]!),
        name: classMatch[1]!.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "),
        subtitle: classMatch[2]!.trim(),
        fantasy: "",
        archetypes: [],
      };
      // Fix names that have special casing in original
      // Keep original casing from the doc for the name
      const rawName = classMatch[1]!.trim();
      // Title-case it properly
      currentClass.name = rawName
        .split(/\s+/)
        .map(w => {
          if (w === w.toUpperCase() && w.length > 1) {
            // ALL CAPS word: title-case it
            return w.charAt(0) + w.slice(1).toLowerCase();
          }
          // Already has mixed case (e.g., "Psi-Blade") — keep as-is
          return w.charAt(0).toUpperCase() + w.slice(1);
        })
        .join(" ");

      classes.push(currentClass);
      currentArchetype = null;
      continue;
    }

    // Fantasy line
    if (trimmed.startsWith("Fantasy:") && currentClass) {
      currentClass.fantasy = trimmed.replace(/^Fantasy:\s*/, "").trim();
      collectingFantasy = true;
      collectingIdentity = false;
      lastAbility = null;
      continue;
    }

    // Multi-line fantasy continuation
    if (collectingFantasy && currentClass && trimmed.length > 0 && !trimmed.startsWith("ARCHETYPE")) {
      currentClass.fantasy += " " + trimmed.trim();
      continue;
    }
    if (collectingFantasy && (trimmed.length === 0 || trimmed.startsWith("ARCHETYPE"))) {
      collectingFantasy = false;
    }

    // ARCHETYPE header: ARCHETYPE A: NAME (Mechanic)
    const archMatch = trimmed.match(/^ARCHETYPE\s+[A-C]:\s+(.+?)\s*\((.+?)\)\s*$/);
    if (archMatch && currentClass) {
      collectingFantasy = false;
      collectingIdentity = false;
      lastAbility = null;

      const rawArchName = archMatch[1]!.trim();
      const archName = rawArchName
        .split(/[\s-]+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(rawArchName.includes("-") ? "-" : " ");
      currentArchetype = {
        id: toId(currentClass.name + " " + rawArchName),
        name: archName,
        mechanic: archMatch[2]!.trim(),
        identity: "",
        abilities: [],
      };
      currentClass.archetypes.push(currentArchetype);
      currentTier = 0;
      positionInTier = 0;
      continue;
    }

    // Identity line
    if (trimmed.startsWith("Identity:") && currentArchetype) {
      currentArchetype.identity = trimmed.replace(/^Identity:\s*/, "").trim();
      collectingIdentity = true;
      collectingFantasy = false;
      lastAbility = null;
      continue;
    }

    // Multi-line identity
    if (collectingIdentity && currentArchetype && trimmed.length > 0 && !trimmed.startsWith("Tier ")) {
      currentArchetype.identity += " " + trimmed.trim();
      continue;
    }
    if (collectingIdentity && (trimmed.length === 0 || trimmed.startsWith("Tier "))) {
      collectingIdentity = false;
    }

    // Tier header: Tier N (Label)
    const tierMatch = trimmed.match(/^Tier\s+(\d+)\s*\(/);
    if (tierMatch) {
      currentTier = parseInt(tierMatch[1]!);
      positionInTier = 0;
      lastAbility = null;
      collectingFantasy = false;
      collectingIdentity = false;
      continue;
    }

    // Ability line:   - Name         | Type     | Description
    const abilityMatch = trimmed.match(/^\s+-\s+(.+?)\s*\|\s*([^\s|][^|]*?)\s*\|\s*(.+)$/);
    if (abilityMatch && currentArchetype && currentTier > 0) {
      collectingFantasy = false;
      collectingIdentity = false;

      const ability: DocAbility = {
        name: abilityMatch[1]!.trim(),
        type: abilityMatch[2]!.trim(),
        description: abilityMatch[3]!.trim(),
        tier: currentTier,
        position: positionInTier,
      };
      currentArchetype.abilities.push(ability);
      lastAbility = ability;
      positionInTier++;
      continue;
    }

    // Continuation line for multi-line ability descriptions:
    //                     |          | more text
    const contMatch = trimmed.match(/^\s+\|?\s*\|\s*(.+)$/);
    if (contMatch && lastAbility) {
      lastAbility.description += " " + contMatch[1]!.trim();
      continue;
    }

    // Empty line or other — reset lastAbility if it was a continuation context
    if (trimmed.length === 0) {
      lastAbility = null;
    }
  }

  return classes;
}

// ── Main ──

const inputPath = path.resolve(__dirname, "../../game/skill_trees.txt");
const outputPath = path.resolve(__dirname, "../src/data/parsed/SkillTreeContent.ts");

const text = fs.readFileSync(inputPath, "utf-8");
const classes = parseSkillTrees(text);

// Convert real-time descriptions to turn-based
for (const cls of classes) {
  cls.fantasy = convertToTurnBased(cls.fantasy);
  for (const arch of cls.archetypes) {
    arch.identity = convertToTurnBased(arch.identity);
    for (const ability of arch.abilities) {
      ability.description = convertToTurnBased(ability.description);
    }
  }
}

// Validate
let totalAbilities = 0;
let errors: string[] = [];
for (const cls of classes) {
  if (cls.archetypes.length !== 3) {
    errors.push(`${cls.name}: has ${cls.archetypes.length} archetypes (expected 3)`);
  }
  for (const arch of cls.archetypes) {
    if (arch.abilities.length !== 12) {
      errors.push(`${cls.name} → ${arch.name}: has ${arch.abilities.length} abilities (expected 12)`);
    }
    totalAbilities += arch.abilities.length;
  }
}

console.log(`Parsed ${classes.length} classes, ${classes.reduce((s, c) => s + c.archetypes.length, 0)} archetypes, ${totalAbilities} abilities`);
if (errors.length > 0) {
  console.log(`\nWarnings (${errors.length}):`);
  for (const e of errors) console.log(`  - ${e}`);
}

// Generate TypeScript output
const tsContent = `// AUTO-GENERATED by scripts/parse-skill-trees.ts — DO NOT EDIT
// Source: game/skill_trees.txt

export interface DocAbility {
  name: string;
  type: string;
  description: string;
  tier: number;
  position: number;
}

export interface DocArchetype {
  id: string;
  name: string;
  mechanic: string;
  identity: string;
  abilities: DocAbility[];
}

export interface DocClass {
  id: string;
  name: string;
  subtitle: string;
  fantasy: string;
  archetypes: [DocArchetype, DocArchetype, DocArchetype];
}

export const DOC_CLASSES: DocClass[] = ${JSON.stringify(classes, null, 2)} as const as unknown as DocClass[];
`;

fs.writeFileSync(outputPath, tsContent, "utf-8");
console.log(`\nWrote ${outputPath}`);
