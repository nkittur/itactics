/**
 * Skill Tree Analysis Script
 * Generates 20 skill trees, analyzes quality, logs findings.
 * Run with: npm test -- tests/data/SkillTreeAnalysis.test.ts
 */
import { describe, it } from "vitest";
import { generateSkillTree, type SkillTree, type SkillTreeNode } from "@data/SkillTreeData";
import { THEMES, type Theme } from "@data/ThemeData";
import { setAbilityRegistry, resolveAbility } from "@data/AbilityResolver";
import type { GeneratedAbility } from "@data/AbilityData";

// Seeded RNG for reproducibility
function makeRng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

interface TreeAnalysis {
  themeId: string;
  totalNodes: number;
  activeCount: number;
  passiveCount: number;
  stackableCount: number;
  dualParentCount: number;
  tierCounts: Record<number, number>;
  synergies: { setup: string; payoff: string; condition: string }[];
  passiveArchetypes: string[];
  activeEffectTypes: Set<string>;
  passiveEffectTypes: Set<string>;
  uniqueNames: Set<string>;
  duplicateNames: string[];
  deadNodes: string[]; // nodes with no synergy connections
  conditionsCreated: Set<string>;
  conditionsExploited: Set<string>;
  unmetExploits: string[]; // exploits with no matching creates
  branchingPaths: number; // distinct T1 entry points
  maxDepthReachable: number;
  avgPowerByTier: Record<number, number>;
  costRange: { minAp: number; maxAp: number; minFat: number; maxFat: number };
  issues: string[];
  strengths: string[];
}

function analyzeTree(tree: SkillTree, themeId: string): TreeAnalysis {
  const nodes = tree.nodes;
  const activeNodes = nodes.filter(n => n.isActive);
  const passiveNodes = nodes.filter(n => !n.isActive);

  const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const n of nodes) tierCounts[n.tier] = (tierCounts[n.tier] ?? 0) + 1;

  // Resolve abilities
  const abilities = new Map<string, GeneratedAbility>();
  for (const n of nodes) {
    const a = resolveAbility(n.abilityUid);
    if (a) abilities.set(n.nodeId, a);
  }

  // Synergies
  const synergies: TreeAnalysis["synergies"] = [];
  const conditionsCreated = new Set<string>();
  const conditionsExploited = new Set<string>();

  for (const [, a] of abilities) {
    for (const c of a.synergyTags.creates) conditionsCreated.add(c);
    for (const c of a.synergyTags.exploits) conditionsExploited.add(c);
  }

  for (const [nidA, a] of abilities) {
    for (const [nidB, b] of abilities) {
      if (nidA === nidB) continue;
      for (const cond of a.synergyTags.creates) {
        if (b.synergyTags.exploits.includes(cond)) {
          synergies.push({ setup: a.name, payoff: b.name, condition: cond });
        }
      }
    }
  }

  // Unmet exploits
  const unmetExploits = [...conditionsExploited].filter(c => !conditionsCreated.has(c));

  // Dead nodes (no creates AND no exploits)
  const deadNodes: string[] = [];
  for (const [nid, a] of abilities) {
    if (a.synergyTags.creates.length === 0 && a.synergyTags.exploits.length === 0 && !a.isPassive) {
      deadNodes.push(`${a.name} (${nid})`);
    }
  }

  // Passive archetype detection
  const passiveArchetypes: string[] = [];
  for (const [nid, a] of abilities) {
    const node = nodes.find(n => n.nodeId === nid);
    if (!node || node.isActive) continue;

    if (a.triggers.length > 0) {
      const t = a.triggers[0]!;
      const eff = t.triggeredEffect;
      if (t.type === "trg_onKill") passiveArchetypes.push("kill_rewarder");
      else if (t.type === "trg_belowHP") passiveArchetypes.push("condition_exploiter");
      else if (t.type === "trg_onHit" && eff?.type === "res_apRefund") passiveArchetypes.push("debuff_amplifier");
      else if (t.type === "trg_onHit" && eff?.type === "dmg_weapon") passiveArchetypes.push("dot_amplifier");
      else if (t.type === "trg_onHit" && eff?.type === "buff_stat") passiveArchetypes.push("stack_builder");
      else if (t.type === "trg_turnStart") passiveArchetypes.push("sustained_fighter");
      else if (t.type === "trg_onTakeDamage") passiveArchetypes.push("reactive_defender");
      else passiveArchetypes.push("unknown");
    } else {
      passiveArchetypes.push("static_passive");
    }
  }

  // Effect type variety
  const activeEffectTypes = new Set<string>();
  const passiveEffectTypes = new Set<string>();
  for (const [nid, a] of abilities) {
    const node = nodes.find(n => n.nodeId === nid);
    if (!node) continue;
    const effectSet = node.isActive ? activeEffectTypes : passiveEffectTypes;
    for (const e of a.effects) effectSet.add(e.type);
    for (const t of a.triggers) {
      if (t.triggeredEffect) effectSet.add(t.triggeredEffect.type);
    }
  }

  // Name duplicates
  const allNames: string[] = [];
  const uniqueNames = new Set<string>();
  const duplicateNames: string[] = [];
  for (const [, a] of abilities) {
    if (uniqueNames.has(a.name)) duplicateNames.push(a.name);
    else uniqueNames.add(a.name);
    allNames.push(a.name);
  }

  // Power by tier
  const avgPowerByTier: Record<number, number> = {};
  const powerSums: Record<number, { sum: number; count: number }> = {};
  for (const n of nodes) {
    const a = abilities.get(n.nodeId);
    if (!a || a.isPassive) continue;
    if (!powerSums[n.tier]) powerSums[n.tier] = { sum: 0, count: 0 };
    powerSums[n.tier]!.sum += a.powerBudget;
    powerSums[n.tier]!.count++;
  }
  for (const [tier, data] of Object.entries(powerSums)) {
    avgPowerByTier[Number(tier)] = Math.round(data.sum / data.count);
  }

  // Cost range
  let minAp = 99, maxAp = 0, minFat = 99, maxFat = 0;
  for (const [, a] of abilities) {
    if (a.isPassive) continue;
    if (a.cost.ap < minAp) minAp = a.cost.ap;
    if (a.cost.ap > maxAp) maxAp = a.cost.ap;
    if (a.cost.stamina < minFat) minFat = a.cost.stamina;
    if (a.cost.stamina > maxFat) maxFat = a.cost.stamina;
  }

  // Branching
  const t1Count = tierCounts[1] ?? 0;

  // Issues and strengths detection
  const issues: string[] = [];
  const strengths: string[] = [];

  if (synergies.length === 0) issues.push("NO SYNERGIES: tree has zero create→exploit connections");
  else if (synergies.length <= 1) issues.push("LOW SYNERGY: only " + synergies.length + " synergy pair(s)");

  if (unmetExploits.length > 0) issues.push(`UNMET EXPLOITS: ${unmetExploits.join(", ")} exploited but never created`);

  if (deadNodes.length > activeNodes.length * 0.5) issues.push(`MANY DEAD ACTIVES: ${deadNodes.length}/${activeNodes.length} actives have no synergy tags`);

  const archetypeSet = new Set(passiveArchetypes);
  if (archetypeSet.size < Math.min(passiveNodes.length, 3)) issues.push(`LOW PASSIVE VARIETY: only ${archetypeSet.size} distinct archetype(s) for ${passiveNodes.length} passives`);

  if (duplicateNames.length > 0) issues.push(`DUPLICATE NAMES: ${duplicateNames.join(", ")}`);

  if (activeEffectTypes.size <= 2) issues.push(`LOW ACTIVE VARIETY: only ${activeEffectTypes.size} effect type(s)`);

  // Check if passives actually complement actives
  const passiveTypes = new Set(passiveArchetypes);
  if (conditionsCreated.size > 0 && !passiveTypes.has("condition_exploiter")) {
    issues.push("MISSED SYNERGY: actives create conditions but no condition_exploiter passive");
  }

  if (synergies.length >= 3) strengths.push(`RICH SYNERGIES: ${synergies.length} synergy pairs`);
  if (archetypeSet.size >= 4) strengths.push(`DIVERSE PASSIVES: ${archetypeSet.size} distinct archetypes`);
  if (activeEffectTypes.size >= 4) strengths.push(`VARIED ACTIVES: ${activeEffectTypes.size} effect types`);
  if (dualParentNodes(nodes).length > 0) strengths.push(`BRANCHING: ${dualParentNodes(nodes).length} dual-parent node(s)`);

  return {
    themeId,
    totalNodes: nodes.length,
    activeCount: activeNodes.length,
    passiveCount: passiveNodes.length,
    stackableCount: nodes.filter(n => n.stackable).length,
    dualParentCount: nodes.filter(n => n.dualParent).length,
    tierCounts,
    synergies,
    passiveArchetypes,
    activeEffectTypes,
    passiveEffectTypes,
    uniqueNames,
    duplicateNames,
    deadNodes,
    conditionsCreated,
    conditionsExploited,
    unmetExploits,
    branchingPaths: t1Count,
    maxDepthReachable: 4,
    avgPowerByTier,
    costRange: { minAp, maxAp, minFat, maxFat },
    issues,
    strengths,
  };
}

function dualParentNodes(nodes: SkillTreeNode[]): SkillTreeNode[] {
  return nodes.filter(n => n.dualParent);
}

describe("Skill Tree Generation Analysis", () => {
  it("generates and analyzes 20 trees", () => {
    const registry: Record<string, GeneratedAbility> = {};
    setAbilityRegistry(registry);

    const themeIds = Object.keys(THEMES);
    const analyses: TreeAnalysis[] = [];

    for (let i = 0; i < 20; i++) {
      const rng = makeRng(42 + i * 1337);
      const themeId = themeIds[i % themeIds.length]!;
      const theme = THEMES[themeId]!;
      const tree = generateSkillTree(theme, rng);
      analyses.push(analyzeTree(tree, themeId));
    }

    // Print summary
    console.log("\n" + "=".repeat(80));
    console.log("SKILL TREE GENERATION ANALYSIS — 20 TREES");
    console.log("=".repeat(80));

    // Per-tree details
    for (let i = 0; i < analyses.length; i++) {
      const a = analyses[i]!;
      console.log(`\n--- Tree #${i + 1}: ${a.themeId} ---`);
      console.log(`  Nodes: ${a.totalNodes} (${a.activeCount}A/${a.passiveCount}P) | Stackable: ${a.stackableCount} | DualParent: ${a.dualParentCount}`);
      console.log(`  Tiers: T1=${a.tierCounts[1]} T2=${a.tierCounts[2]} T3=${a.tierCounts[3]} T4=${a.tierCounts[4]}`);
      console.log(`  Synergies: ${a.synergies.length}`);
      for (const s of a.synergies) {
        console.log(`    ${s.setup} → ${s.payoff} [${s.condition}]`);
      }
      console.log(`  Conditions created: [${[...a.conditionsCreated].join(", ")}]`);
      console.log(`  Conditions exploited: [${[...a.conditionsExploited].join(", ")}]`);
      console.log(`  Unmet exploits: [${a.unmetExploits.join(", ")}]`);
      console.log(`  Passive archetypes: [${a.passiveArchetypes.join(", ")}]`);
      console.log(`  Active effects: [${[...a.activeEffectTypes].join(", ")}]`);
      console.log(`  Dead actives (no synergy tags): [${a.deadNodes.join(", ")}]`);
      console.log(`  Name duplicates: [${a.duplicateNames.join(", ")}]`);
      if (a.issues.length > 0) console.log(`  ⚠ ISSUES: ${a.issues.join(" | ")}`);
      if (a.strengths.length > 0) console.log(`  ✓ STRENGTHS: ${a.strengths.join(" | ")}`);
    }

    // Aggregate stats
    console.log("\n" + "=".repeat(80));
    console.log("AGGREGATE STATISTICS");
    console.log("=".repeat(80));

    const avgSynergies = analyses.reduce((s, a) => s + a.synergies.length, 0) / analyses.length;
    const treesWithZeroSynergies = analyses.filter(a => a.synergies.length === 0).length;
    const treesWithIssues = analyses.filter(a => a.issues.length > 0).length;
    const avgNodes = analyses.reduce((s, a) => s + a.totalNodes, 0) / analyses.length;
    const avgActive = analyses.reduce((s, a) => s + a.activeCount, 0) / analyses.length;
    const avgPassive = analyses.reduce((s, a) => s + a.passiveCount, 0) / analyses.length;
    const avgDualParent = analyses.reduce((s, a) => s + a.dualParentCount, 0) / analyses.length;
    const avgStackable = analyses.reduce((s, a) => s + a.stackableCount, 0) / analyses.length;

    // Count all issues
    const issueCounts: Record<string, number> = {};
    for (const a of analyses) {
      for (const issue of a.issues) {
        const key = issue.split(":")[0]!;
        issueCounts[key] = (issueCounts[key] ?? 0) + 1;
      }
    }

    // Passive archetype distribution
    const archetypeCounts: Record<string, number> = {};
    for (const a of analyses) {
      for (const arch of a.passiveArchetypes) {
        archetypeCounts[arch] = (archetypeCounts[arch] ?? 0) + 1;
      }
    }

    // Unmet exploit frequency
    const unmetCounts: Record<string, number> = {};
    for (const a of analyses) {
      for (const u of a.unmetExploits) {
        unmetCounts[u] = (unmetCounts[u] ?? 0) + 1;
      }
    }

    console.log(`\nAvg nodes: ${avgNodes.toFixed(1)} | Avg active: ${avgActive.toFixed(1)} | Avg passive: ${avgPassive.toFixed(1)}`);
    console.log(`Avg synergies per tree: ${avgSynergies.toFixed(1)}`);
    console.log(`Trees with 0 synergies: ${treesWithZeroSynergies}/20`);
    console.log(`Trees with issues: ${treesWithIssues}/20`);
    console.log(`Avg dual-parent: ${avgDualParent.toFixed(1)} | Avg stackable: ${avgStackable.toFixed(1)}`);

    console.log("\nIssue frequency:");
    for (const [issue, count] of Object.entries(issueCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${issue}: ${count}/20`);
    }

    console.log("\nPassive archetype distribution:");
    for (const [arch, count] of Object.entries(archetypeCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${arch}: ${count}`);
    }

    console.log("\nUnmet exploit frequency:");
    for (const [exploit, count] of Object.entries(unmetCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${exploit}: ${count}/20`);
    }

    console.log("\n" + "=".repeat(80));
  });
});
