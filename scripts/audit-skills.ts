/**
 * Audit script: compares design-doc ability types/descriptions against
 * procedurally generated effects for all enabled classes.
 *
 * Usage: npx tsx scripts/audit-skills.ts
 * Output: audit/skill-audit.md
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Side-effect: register all enabled class definitions
import "../src/data/classes/DesignDocClasses";

import { generateArchetypeTree } from "../src/data/SkillTreeData";
import { getAllClassDefs } from "../src/data/ClassDefinition";
import { resolveAbility, setAbilityRegistry } from "../src/data/AbilityResolver";
import { DOC_CLASSES, type DocAbility } from "../src/data/parsed/SkillTreeContent";
import { normalizeDocType, DOC_TYPE_HINTS } from "../src/data/AbilityTypeMapping";
import type { GeneratedAbility, EffectType } from "../src/data/AbilityData";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Deterministic RNG ──

function makeRng(seed: number): () => number {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// ── Effect category classification ──

type EffectCategory = "damage" | "dot" | "cc" | "debuff" | "buff" | "heal" | "stance" | "movement" | "resource";

function classifyEffect(type: EffectType): EffectCategory {
  if (type.startsWith("dmg_")) return "damage";
  if (type.startsWith("dot_")) return "dot";
  if (type.startsWith("cc_")) return "cc";
  if (type.startsWith("debuff_")) return "debuff";
  if (type === "buff_stat" || type === "buff_dmgReduce") return "buff";
  if (type === "heal_pctDmg") return "heal";
  if (type.startsWith("stance_")) return "stance";
  if (type === "disp_push") return "movement";
  if (type === "res_apRefund") return "resource";
  return "damage"; // fallback
}

/** What effect categories does a doc type expect? */
function expectedCategories(docType: string): EffectCategory[] {
  const norm = normalizeDocType(docType);
  switch (norm) {
    case "Attack": case "Active": return ["damage"];
    case "Aoe": return ["damage"];
    case "Debuff": return ["debuff"];
    case "Cc": return ["cc"];
    case "Buff": return ["buff"];
    case "Heal": return ["heal"];
    case "Stance": return ["stance", "buff"];
    case "Movement": return ["movement", "buff"];
    case "Channel": return ["damage"];
    case "Ultimate": return ["damage", "buff"];
    case "Toggle": return ["buff", "stance"];
    case "Cleanse": return ["buff", "heal"];
    case "Stealth": return ["buff"];
    case "Transform": return ["buff"];
    case "Utility": return ["buff", "resource"];
    case "Summon": return ["buff"];
    default: return [];
  }
}

/** Check if an ability's generated effects match expectations for its doc type. */
function checkMismatch(
  docAbility: DocAbility,
  generated: GeneratedAbility,
): { match: boolean; issue: string; suggestion: string } {
  const norm = normalizeDocType(docAbility.type);
  const hints = DOC_TYPE_HINTS[norm];
  if (!hints) {
    return { match: true, issue: "", suggestion: "" };
  }

  // Skip passives — they're generated differently
  if (hints.isPassive) {
    return { match: true, issue: "", suggestion: "" };
  }

  const genCategories = new Set(generated.effects.map(e => classifyEffect(e.type)));
  const expected = expectedCategories(docAbility.type);

  if (expected.length === 0) {
    return { match: true, issue: "", suggestion: "" };
  }

  // Match if at least one expected category is present in generated effects
  const hasExpected = expected.some(cat => genCategories.has(cat));
  if (hasExpected) {
    return { match: true, issue: "", suggestion: "" };
  }

  const genList = [...genCategories].join(", ");
  const expList = expected.join(" or ");
  return {
    match: false,
    issue: `${docAbility.type} described → generated [${genList}] (expected ${expList})`,
    suggestion: `Use DOC_TYPE_HINTS["${norm}"] → effects: [${hints.effects.join(", ")}], targeting: ${hints.targeting}`,
  };
}

// ── Main ──

const allClasses = getAllClassDefs();
console.log(`Auditing ${allClasses.length} classes...`);

interface AuditEntry {
  className: string;
  archetypeName: string;
  abilityName: string;
  docType: string;
  docDesc: string;
  generatedEffects: string;
  generatedTargeting: string;
  match: boolean;
  issue: string;
  suggestion: string;
}

const entries: AuditEntry[] = [];
let totalAbilities = 0;
let totalMismatches = 0;

for (const classDef of allClasses) {
  const docClass = DOC_CLASSES.find(c => c.id === classDef.id);
  if (!docClass) continue;

  for (let archIdx = 0; archIdx < 3; archIdx++) {
    const docArch = docClass.archetypes[archIdx];
    if (!docArch) continue;

    // Fresh registry per tree
    const registry: Record<string, GeneratedAbility> = {};
    setAbilityRegistry(registry);

    const rng = makeRng(42);
    const result = generateArchetypeTree(classDef.id, archIdx, rng);

    // Build nodeId → DocAbility map (same logic as SkillTreeData)
    const nodeDocMap = new Map<string, DocAbility>();
    for (let i = 0; i < docArch.abilities.length; i++) {
      const nodeId = `${docArch.id}_${i}`;
      nodeDocMap.set(nodeId, docArch.abilities[i]!);
    }

    for (const node of result.tree.nodes) {
      const docAbility = nodeDocMap.get(node.nodeId);
      if (!docAbility) continue;

      const generated = resolveAbility(node.abilityUid);
      if (!generated) continue;

      totalAbilities++;

      const { match, issue, suggestion } = checkMismatch(docAbility, generated);
      if (!match) totalMismatches++;

      entries.push({
        className: docClass.name,
        archetypeName: docArch.name,
        abilityName: docAbility.name,
        docType: docAbility.type,
        docDesc: docAbility.description,
        generatedEffects: generated.effects.map(e => e.type).join(", "),
        generatedTargeting: generated.targeting.type,
        match,
        issue,
        suggestion,
      });
    }
  }
}

// ── Generate report ──

const lines: string[] = [];
lines.push("# Skill Audit Report");
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push("");
lines.push(`## Summary`);
lines.push("");
lines.push(`- Total abilities audited: ${totalAbilities}`);
lines.push(`- Mismatches: ${totalMismatches}`);
lines.push(`- Match rate: ${((1 - totalMismatches / totalAbilities) * 100).toFixed(1)}%`);
lines.push("");

// Group by class
const byClass = new Map<string, AuditEntry[]>();
for (const e of entries) {
  const key = `${e.className} / ${e.archetypeName}`;
  if (!byClass.has(key)) byClass.set(key, []);
  byClass.get(key)!.push(e);
}

for (const [key, group] of byClass) {
  const mismatches = group.filter(e => !e.match);
  lines.push(`## ${key}`);
  lines.push("");

  if (mismatches.length === 0) {
    lines.push("All abilities match their doc types.");
    lines.push("");
    continue;
  }

  lines.push(`${mismatches.length}/${group.length} mismatches:`);
  lines.push("");

  for (const e of mismatches) {
    lines.push(`### ${e.abilityName} (${e.docType})`);
    lines.push(`- **Doc description**: ${e.docDesc}`);
    lines.push(`- **Generated effects**: ${e.generatedEffects}`);
    lines.push(`- **Generated targeting**: ${e.generatedTargeting}`);
    lines.push(`- **Issue**: ${e.issue}`);
    lines.push(`- **Fix**: ${e.suggestion}`);
    lines.push("");
  }
}

// Also list all matching abilities in a compact table
lines.push("## All Abilities (compact)");
lines.push("");
lines.push("| Class | Archetype | Ability | Doc Type | Generated Effects | Targeting | Match |");
lines.push("|---|---|---|---|---|---|---|");
for (const e of entries) {
  const matchStr = e.match ? "OK" : "MISMATCH";
  lines.push(`| ${e.className} | ${e.archetypeName} | ${e.abilityName} | ${e.docType} | ${e.generatedEffects} | ${e.generatedTargeting} | ${matchStr} |`);
}

const report = lines.join("\n") + "\n";

const outPath = path.resolve(__dirname, "../audit/skill-audit.md");
fs.writeFileSync(outPath, report);

console.log(`\nAudit complete:`);
console.log(`  Total abilities: ${totalAbilities}`);
console.log(`  Mismatches: ${totalMismatches}`);
console.log(`  Match rate: ${((1 - totalMismatches / totalAbilities) * 100).toFixed(1)}%`);
console.log(`  Report: ${outPath}`);
