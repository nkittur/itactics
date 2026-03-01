/**
 * Audit script: compares design-doc ability descriptions against
 * procedurally generated effects using LLM-mapped effect expectations.
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
import { ABILITY_EFFECT_MAPPINGS } from "../src/data/parsed/AbilityEffectMappings";
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

/** Check if generated effects match LLM-mapped expectations for this ability. */
function checkMismatch(
  docAbility: DocAbility,
  generated: GeneratedAbility,
): { match: boolean; source: string; issue: string } {
  const norm = normalizeDocType(docAbility.type);
  const hints = DOC_TYPE_HINTS[norm];

  // Skip passives
  if (hints?.isPassive) {
    return { match: true, source: "passive", issue: "" };
  }

  // Check against LLM mapping first
  const llmMapping = ABILITY_EFFECT_MAPPINGS[docAbility.name.toLowerCase()];
  if (llmMapping) {
    const expectedEffects = new Set(llmMapping.effects);
    const generatedEffects = new Set(generated.effects.map(e => e.type));

    // Match if at least one expected effect type is present
    const hasExpected = [...expectedEffects].some(e => generatedEffects.has(e));
    if (hasExpected) {
      return { match: true, source: "llm", issue: "" };
    }

    return {
      match: false,
      source: "llm",
      issue: `LLM expected [${[...expectedEffects].join(", ")}] but generated [${[...generatedEffects].join(", ")}]`,
    };
  }

  // Fallback: check against doc type hints
  if (!hints) {
    return { match: true, source: "none", issue: "" };
  }

  const expectedEffects = new Set(hints.effects);
  const generatedEffects = new Set(generated.effects.map(e => e.type));
  const hasExpected = [...expectedEffects].some(e => generatedEffects.has(e));
  if (hasExpected) {
    return { match: true, source: "type-hint", issue: "" };
  }

  return {
    match: false,
    source: "type-hint",
    issue: `Type hint expected [${hints.effects.join(", ")}] but generated [${[...generatedEffects].join(", ")}]`,
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
  source: string;
  issue: string;
}

const entries: AuditEntry[] = [];
let totalAbilities = 0;
let totalMismatches = 0;
let llmMapped = 0;
let typeHintFallback = 0;

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

    // Build nodeId → DocAbility map
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

      const { match, source, issue } = checkMismatch(docAbility, generated);
      if (!match) totalMismatches++;
      if (source === "llm") llmMapped++;
      if (source === "type-hint") typeHintFallback++;

      entries.push({
        className: docClass.name,
        archetypeName: docArch.name,
        abilityName: docAbility.name,
        docType: docAbility.type,
        docDesc: docAbility.description,
        generatedEffects: generated.effects.map(e => e.type).join(", "),
        generatedTargeting: generated.targeting.type,
        match,
        source,
        issue,
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
lines.push(`- **Mismatches: ${totalMismatches}**`);
lines.push(`- **Match rate: ${((1 - totalMismatches / totalAbilities) * 100).toFixed(1)}%**`);
lines.push(`- LLM-mapped abilities: ${llmMapped}`);
lines.push(`- Type-hint fallback: ${typeHintFallback}`);
lines.push(`- Passive (skipped): ${entries.filter(e => e.source === "passive").length}`);
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
    lines.push("All abilities match expectations.");
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
    lines.push(`- **Source**: ${e.source}`);
    lines.push(`- **Issue**: ${e.issue}`);
    lines.push("");
  }
}

// Compact table
lines.push("## All Abilities (compact)");
lines.push("");
lines.push("| Class | Archetype | Ability | Doc Type | Generated Effects | Targeting | Source | Match |");
lines.push("|---|---|---|---|---|---|---|---|");
for (const e of entries) {
  const matchStr = e.match ? "OK" : "MISMATCH";
  lines.push(`| ${e.className} | ${e.archetypeName} | ${e.abilityName} | ${e.docType} | ${e.generatedEffects} | ${e.generatedTargeting} | ${e.source} | ${matchStr} |`);
}

const report = lines.join("\n") + "\n";

const outPath = path.resolve(__dirname, "../audit/skill-audit.md");
fs.writeFileSync(outPath, report);

console.log(`\nAudit complete:`);
console.log(`  Total abilities: ${totalAbilities}`);
console.log(`  Mismatches: ${totalMismatches}`);
console.log(`  Match rate: ${((1 - totalMismatches / totalAbilities) * 100).toFixed(1)}%`);
console.log(`  LLM-mapped: ${llmMapped}, Type-hint fallback: ${typeHintFallback}`);
console.log(`  Report: ${outPath}`);
