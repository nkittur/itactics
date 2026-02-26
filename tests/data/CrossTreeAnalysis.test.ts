/**
 * Cross-Tree Synergy Analysis
 * Generates parties of 3-5 units with different skill trees,
 * analyzes how trees interact across units (conditions created by one,
 * exploited by another), and identifies improvement opportunities.
 *
 * Run with: npm test -- tests/data/CrossTreeAnalysis.test.ts
 */
import { describe, it } from "vitest";
import { generateSkillTree, type SkillTree } from "@data/SkillTreeData";
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

// ── Per-tree condition profile ──

interface TreeConditionProfile {
  themeId: string;
  conditionsCreated: Set<string>;
  conditionsExploited: Set<string>;
  abilities: GeneratedAbility[];
  activeAbilities: GeneratedAbility[];
  passiveAbilities: GeneratedAbility[];
}

function buildTreeProfile(tree: SkillTree, themeId: string): TreeConditionProfile {
  const abilities: GeneratedAbility[] = [];
  const activeAbilities: GeneratedAbility[] = [];
  const passiveAbilities: GeneratedAbility[] = [];
  const conditionsCreated = new Set<string>();
  const conditionsExploited = new Set<string>();

  for (const node of tree.nodes) {
    const a = resolveAbility(node.abilityUid);
    if (!a) continue;
    abilities.push(a);
    if (node.isActive) activeAbilities.push(a);
    else passiveAbilities.push(a);
    for (const c of a.synergyTags.creates) conditionsCreated.add(c);
    for (const c of a.synergyTags.exploits) conditionsExploited.add(c);
  }

  return { themeId, conditionsCreated, conditionsExploited, abilities, activeAbilities, passiveAbilities };
}

// ── Cross-tree analysis types ──

interface CrossSynergy {
  creatorTheme: string;
  exploiterTheme: string;
  condition: string;
  creatorAbilities: string[];  // names of abilities that create this condition
  exploiterAbilities: string[]; // names of abilities that exploit it
}

interface ThemePairScore {
  themeA: string;
  themeB: string;
  /** How many conditions A creates that B exploits */
  aToB: number;
  /** How many conditions B creates that A exploits */
  bToA: number;
  /** Total bidirectional synergy */
  total: number;
  /** Shared conditions both create (redundancy) */
  sharedCreates: string[];
}

interface PartyAnalysis {
  partyId: number;
  themes: string[];
  profiles: TreeConditionProfile[];
  crossSynergies: CrossSynergy[];
  themePairScores: ThemePairScore[];
  /** Conditions created in party but exploited by nobody */
  orphanedCreates: { condition: string; creatorTheme: string }[];
  /** Conditions exploited in party but created by nobody */
  orphanedExploits: { condition: string; exploiterTheme: string }[];
  /** Themes that neither create for nor exploit from any other theme */
  isolatedThemes: string[];
  /** Total cross-tree synergy count */
  totalCrossSynergies: number;
  /** Average pairwise synergy score */
  avgPairScore: number;
  /** % of conditions created that are exploited by at least one other tree */
  conditionUtilization: number;
  /** Number of unique cross-tree condition links */
  uniqueConditionLinks: number;
  /** Does the party have a "setup → payoff" chain across 3+ units? */
  hasMultiUnitChain: boolean;
  issues: string[];
  strengths: string[];
}

function analyzeParty(
  profiles: TreeConditionProfile[],
  partyId: number,
): PartyAnalysis {
  const themes = profiles.map(p => p.themeId);

  // Cross-synergies: unit A creates condition, unit B exploits it
  const crossSynergies: CrossSynergy[] = [];
  for (let i = 0; i < profiles.length; i++) {
    for (let j = 0; j < profiles.length; j++) {
      if (i === j) continue;
      const creator = profiles[i]!;
      const exploiter = profiles[j]!;
      for (const cond of creator.conditionsCreated) {
        if (exploiter.conditionsExploited.has(cond)) {
          crossSynergies.push({
            creatorTheme: creator.themeId,
            exploiterTheme: exploiter.themeId,
            condition: cond,
            creatorAbilities: creator.abilities
              .filter(a => a.synergyTags.creates.includes(cond))
              .map(a => a.name),
            exploiterAbilities: exploiter.abilities
              .filter(a => a.synergyTags.exploits.includes(cond))
              .map(a => a.name),
          });
        }
      }
    }
  }

  // Theme pair scores
  const themePairScores: ThemePairScore[] = [];
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const a = profiles[i]!;
      const b = profiles[j]!;
      let aToB = 0;
      let bToA = 0;
      for (const c of a.conditionsCreated) {
        if (b.conditionsExploited.has(c)) aToB++;
      }
      for (const c of b.conditionsCreated) {
        if (a.conditionsExploited.has(c)) bToA++;
      }
      const sharedCreates = [...a.conditionsCreated].filter(c => b.conditionsCreated.has(c));
      themePairScores.push({
        themeA: a.themeId,
        themeB: b.themeId,
        aToB,
        bToA,
        total: aToB + bToA,
        sharedCreates,
      });
    }
  }

  // Orphaned creates: conditions created by one theme but exploited by no OTHER theme
  const orphanedCreates: { condition: string; creatorTheme: string }[] = [];
  for (const profile of profiles) {
    for (const cond of profile.conditionsCreated) {
      const exploitedByOther = profiles.some(
        (p, idx) => idx !== profiles.indexOf(profile) && p.conditionsExploited.has(cond),
      );
      if (!exploitedByOther) {
        orphanedCreates.push({ condition: cond, creatorTheme: profile.themeId });
      }
    }
  }

  // Orphaned exploits: conditions exploited by one theme but created by no OTHER theme
  const orphanedExploits: { condition: string; exploiterTheme: string }[] = [];
  for (const profile of profiles) {
    for (const cond of profile.conditionsExploited) {
      const createdByOther = profiles.some(
        (p, idx) => idx !== profiles.indexOf(profile) && p.conditionsCreated.has(cond),
      );
      if (!createdByOther) {
        orphanedExploits.push({ condition: cond, exploiterTheme: profile.themeId });
      }
    }
  }

  // Isolated themes: neither create for nor exploit from any other
  const isolatedThemes: string[] = [];
  for (const profile of profiles) {
    const hasCrossSynergy = crossSynergies.some(
      cs => cs.creatorTheme === profile.themeId || cs.exploiterTheme === profile.themeId,
    );
    if (!hasCrossSynergy) isolatedThemes.push(profile.themeId);
  }

  // Condition utilization: % of created conditions exploited by at least one other tree
  const allCreated = new Set<string>();
  const crossExploited = new Set<string>();
  for (const profile of profiles) {
    for (const c of profile.conditionsCreated) allCreated.add(c);
  }
  for (const cs of crossSynergies) crossExploited.add(cs.condition);
  const conditionUtilization = allCreated.size > 0
    ? crossExploited.size / allCreated.size
    : 0;

  // Unique condition links (distinct condition channels across trees)
  const uniqueLinks = new Set(crossSynergies.map(cs => `${cs.creatorTheme}->${cs.exploiterTheme}:${cs.condition}`));

  // Multi-unit chain: condition C is created by A, exploited by B, and B creates D exploited by C
  let hasMultiUnitChain = false;
  for (const cs1 of crossSynergies) {
    for (const cs2 of crossSynergies) {
      if (cs1.exploiterTheme === cs2.creatorTheme && cs1.creatorTheme !== cs2.exploiterTheme) {
        hasMultiUnitChain = true;
        break;
      }
    }
    if (hasMultiUnitChain) break;
  }

  // Issues and strengths
  const issues: string[] = [];
  const strengths: string[] = [];
  const avgPairScore = themePairScores.length > 0
    ? themePairScores.reduce((s, p) => s + p.total, 0) / themePairScores.length
    : 0;

  if (crossSynergies.length === 0) {
    issues.push("ZERO CROSS-SYNERGIES: no condition links between any trees");
  } else if (crossSynergies.length <= 2) {
    issues.push(`LOW CROSS-SYNERGIES: only ${crossSynergies.length} cross-tree links`);
  }

  if (isolatedThemes.length > 0) {
    issues.push(`ISOLATED THEMES: ${isolatedThemes.join(", ")} have no cross-tree interaction`);
  }

  const zeroPairs = themePairScores.filter(p => p.total === 0);
  if (zeroPairs.length > themePairScores.length * 0.5) {
    issues.push(`MANY DEAD PAIRS: ${zeroPairs.length}/${themePairScores.length} theme pairs have 0 synergy`);
  }

  // Deduplicate orphaned creates/exploits
  const uniqueOrphanedCreates = [...new Set(orphanedCreates.map(o => o.condition))];
  const uniqueOrphanedExploits = [...new Set(orphanedExploits.map(o => o.condition))];
  if (uniqueOrphanedCreates.length > 2) {
    issues.push(`ORPHANED CREATES: ${uniqueOrphanedCreates.join(", ")} created but not exploited cross-tree`);
  }
  if (uniqueOrphanedExploits.length > 1) {
    issues.push(`ORPHANED EXPLOITS: ${uniqueOrphanedExploits.join(", ")} exploited but not created cross-tree`);
  }

  // Check for one-directional synergy (A helps B but B never helps A)
  const unidirectionalPairs = themePairScores.filter(p => (p.aToB > 0 && p.bToA === 0) || (p.bToA > 0 && p.aToB === 0));
  if (unidirectionalPairs.length > themePairScores.length * 0.6) {
    issues.push(`UNIDIRECTIONAL: ${unidirectionalPairs.length}/${themePairScores.length} pairs are one-way synergies`);
  }

  if (conditionUtilization < 0.4) {
    issues.push(`LOW UTILIZATION: only ${Math.round(conditionUtilization * 100)}% of conditions utilized cross-tree`);
  }

  // Strengths
  if (crossSynergies.length >= 6) strengths.push(`RICH CROSS-SYNERGY: ${crossSynergies.length} cross-tree links`);
  if (hasMultiUnitChain) strengths.push("MULTI-UNIT CHAIN: 3+ unit combo chain detected");
  if (conditionUtilization >= 0.7) strengths.push(`HIGH UTILIZATION: ${Math.round(conditionUtilization * 100)}% conditions used cross-tree`);
  const bidirectional = themePairScores.filter(p => p.aToB > 0 && p.bToA > 0);
  if (bidirectional.length >= 2) strengths.push(`BIDIRECTIONAL: ${bidirectional.length} mutual synergy pairs`);
  if (isolatedThemes.length === 0) strengths.push("FULL INTEGRATION: all themes connected");

  return {
    partyId,
    themes,
    profiles,
    crossSynergies,
    themePairScores,
    orphanedCreates,
    orphanedExploits,
    isolatedThemes,
    totalCrossSynergies: crossSynergies.length,
    avgPairScore,
    conditionUtilization,
    uniqueConditionLinks: uniqueLinks.size,
    hasMultiUnitChain,
    issues,
    strengths,
  };
}

// ── Party generation ──

function generateParties(count: number, baseSeed: number): PartyAnalysis[] {
  const themeIds = Object.keys(THEMES);
  const analyses: PartyAnalysis[] = [];

  for (let i = 0; i < count; i++) {
    const rng = makeRng(baseSeed + i * 2971);
    const partySize = 3 + Math.floor(rng() * 3); // 3-5 units

    // Pick themes for party (weighted random, allow duplicates sparingly)
    const partyThemes: string[] = [];
    const usedThemes = new Set<string>();
    for (let j = 0; j < partySize; j++) {
      // First 3 picks avoid duplicates, then allow
      let themeId: string;
      if (j < 3 || usedThemes.size >= themeIds.length) {
        const available = themeIds.filter(t => !usedThemes.has(t));
        if (available.length > 0) {
          themeId = available[Math.floor(rng() * available.length)]!;
        } else {
          themeId = themeIds[Math.floor(rng() * themeIds.length)]!;
        }
      } else {
        themeId = themeIds[Math.floor(rng() * themeIds.length)]!;
      }
      partyThemes.push(themeId);
      usedThemes.add(themeId);
    }

    // Generate trees for each party member
    const profiles: TreeConditionProfile[] = [];
    for (let j = 0; j < partyThemes.length; j++) {
      const treeRng = makeRng(baseSeed + i * 2971 + j * 7919);
      const theme = THEMES[partyThemes[j]!]!;
      const tree = generateSkillTree(theme, treeRng);
      profiles.push(buildTreeProfile(tree, partyThemes[j]!));
    }

    analyses.push(analyzeParty(profiles, i + 1));
  }

  return analyses;
}

// ── Global pairwise analysis (across all parties) ──

interface GlobalPairStats {
  themeA: string;
  themeB: string;
  avgScore: number;
  appearances: number;
  zeroPairCount: number;
  maxScore: number;
}

function computeGlobalPairStats(analyses: PartyAnalysis[]): GlobalPairStats[] {
  const pairData = new Map<string, { scores: number[]; appearances: number }>();

  for (const a of analyses) {
    for (const pair of a.themePairScores) {
      const key = [pair.themeA, pair.themeB].sort().join("+");
      if (!pairData.has(key)) pairData.set(key, { scores: [], appearances: 0 });
      const data = pairData.get(key)!;
      data.scores.push(pair.total);
      data.appearances++;
    }
  }

  const results: GlobalPairStats[] = [];
  for (const [key, data] of pairData) {
    const [a, b] = key.split("+");
    results.push({
      themeA: a!,
      themeB: b!,
      avgScore: data.scores.reduce((s, v) => s + v, 0) / data.scores.length,
      appearances: data.appearances,
      zeroPairCount: data.scores.filter(s => s === 0).length,
      maxScore: Math.max(...data.scores),
    });
  }

  return results.sort((a, b) => b.avgScore - a.avgScore);
}

// ── Test ──

describe("Cross-Tree Synergy Analysis", () => {
  it("generates and analyzes 20 party compositions", () => {
    const registry: Record<string, GeneratedAbility> = {};
    setAbilityRegistry(registry);

    const analyses = generateParties(20, 100);

    // Print summary
    console.log("\n" + "=".repeat(80));
    console.log("CROSS-TREE SYNERGY ANALYSIS — 20 PARTIES");
    console.log("=".repeat(80));

    for (const a of analyses) {
      console.log(`\n--- Party #${a.partyId}: [${a.themes.join(", ")}] ---`);
      console.log(`  Cross-synergies: ${a.totalCrossSynergies} | Unique links: ${a.uniqueConditionLinks} | Avg pair score: ${a.avgPairScore.toFixed(1)}`);
      console.log(`  Condition utilization: ${Math.round(a.conditionUtilization * 100)}% | Multi-unit chain: ${a.hasMultiUnitChain ? "YES" : "no"}`);

      if (a.crossSynergies.length > 0) {
        console.log("  Cross-synergy links:");
        for (const cs of a.crossSynergies) {
          console.log(`    ${cs.creatorTheme} → ${cs.exploiterTheme} [${cs.condition}] (${cs.creatorAbilities[0]} → ${cs.exploiterAbilities[0]})`);
        }
      }

      console.log("  Pair scores:");
      for (const p of a.themePairScores) {
        const dir = p.aToB > 0 && p.bToA > 0 ? "⇄" : p.aToB > 0 ? "→" : p.bToA > 0 ? "←" : "✗";
        console.log(`    ${p.themeA} ${dir} ${p.themeB}: ${p.total} (${p.aToB}/${p.bToA})${p.sharedCreates.length > 0 ? ` [shared: ${p.sharedCreates.join(",")}]` : ""}`);
      }

      if (a.isolatedThemes.length > 0) console.log(`  Isolated themes: [${a.isolatedThemes.join(", ")}]`);

      const uniqueOrphanCreates = [...new Set(a.orphanedCreates.map(o => `${o.condition}(${o.creatorTheme})`))];
      const uniqueOrphanExploits = [...new Set(a.orphanedExploits.map(o => `${o.condition}(${o.exploiterTheme})`))];
      if (uniqueOrphanCreates.length > 0) console.log(`  Orphaned creates: [${uniqueOrphanCreates.join(", ")}]`);
      if (uniqueOrphanExploits.length > 0) console.log(`  Orphaned exploits: [${uniqueOrphanExploits.join(", ")}]`);

      if (a.issues.length > 0) console.log(`  ⚠ ISSUES: ${a.issues.join(" | ")}`);
      if (a.strengths.length > 0) console.log(`  ✓ STRENGTHS: ${a.strengths.join(" | ")}`);
    }

    // Aggregate
    console.log("\n" + "=".repeat(80));
    console.log("AGGREGATE STATISTICS");
    console.log("=".repeat(80));

    const avgCross = analyses.reduce((s, a) => s + a.totalCrossSynergies, 0) / analyses.length;
    const avgLinks = analyses.reduce((s, a) => s + a.uniqueConditionLinks, 0) / analyses.length;
    const avgUtil = analyses.reduce((s, a) => s + a.conditionUtilization, 0) / analyses.length;
    const avgPair = analyses.reduce((s, a) => s + a.avgPairScore, 0) / analyses.length;
    const partiesWithIssues = analyses.filter(a => a.issues.length > 0).length;
    const partiesWithZeroCross = analyses.filter(a => a.totalCrossSynergies === 0).length;
    const partiesWithChains = analyses.filter(a => a.hasMultiUnitChain).length;
    const partiesFullIntegration = analyses.filter(a => a.isolatedThemes.length === 0).length;

    console.log(`\nAvg cross-synergies/party: ${avgCross.toFixed(1)}`);
    console.log(`Avg unique links/party: ${avgLinks.toFixed(1)}`);
    console.log(`Avg condition utilization: ${Math.round(avgUtil * 100)}%`);
    console.log(`Avg pairwise score: ${avgPair.toFixed(2)}`);
    console.log(`Parties with issues: ${partiesWithIssues}/20`);
    console.log(`Parties with 0 cross-synergies: ${partiesWithZeroCross}/20`);
    console.log(`Parties with multi-unit chains: ${partiesWithChains}/20`);
    console.log(`Parties with full integration: ${partiesFullIntegration}/20`);

    // Issue frequency
    const issueCounts: Record<string, number> = {};
    for (const a of analyses) {
      for (const issue of a.issues) {
        const key = issue.split(":")[0]!;
        issueCounts[key] = (issueCounts[key] ?? 0) + 1;
      }
    }
    console.log("\nIssue frequency:");
    for (const [issue, count] of Object.entries(issueCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${issue}: ${count}/20`);
    }

    // Orphaned conditions frequency
    const orphanCreateCounts: Record<string, number> = {};
    const orphanExploitCounts: Record<string, number> = {};
    for (const a of analyses) {
      for (const o of a.orphanedCreates) {
        orphanCreateCounts[o.condition] = (orphanCreateCounts[o.condition] ?? 0) + 1;
      }
      for (const o of a.orphanedExploits) {
        orphanExploitCounts[o.condition] = (orphanExploitCounts[o.condition] ?? 0) + 1;
      }
    }
    console.log("\nOrphaned creates (condition → frequency):");
    for (const [cond, count] of Object.entries(orphanCreateCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${cond}: ${count}`);
    }
    console.log("\nOrphaned exploits (condition → frequency):");
    for (const [cond, count] of Object.entries(orphanExploitCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${cond}: ${count}`);
    }

    // Isolated theme frequency
    const isolatedCounts: Record<string, number> = {};
    for (const a of analyses) {
      for (const t of a.isolatedThemes) {
        isolatedCounts[t] = (isolatedCounts[t] ?? 0) + 1;
      }
    }
    if (Object.keys(isolatedCounts).length > 0) {
      console.log("\nIsolated theme frequency:");
      for (const [theme, count] of Object.entries(isolatedCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${theme}: ${count}/20`);
      }
    }

    // Global pairwise analysis
    const globalPairs = computeGlobalPairStats(analyses);
    console.log("\nGlobal theme pair compatibility (sorted by avg score):");
    for (const p of globalPairs) {
      console.log(`  ${p.themeA}+${p.themeB}: avg=${p.avgScore.toFixed(1)} max=${p.maxScore} appeared=${p.appearances} zero=${p.zeroPairCount}`);
    }

    // Bottom pairs (worst synergies)
    const bottomPairs = globalPairs.filter(p => p.appearances >= 2).slice(-10);
    console.log("\nWorst theme pairs (by avg score, min 2 appearances):");
    for (const p of bottomPairs) {
      console.log(`  ${p.themeA}+${p.themeB}: avg=${p.avgScore.toFixed(1)} (${p.zeroPairCount}/${p.appearances} zero)`);
    }

    console.log("\n" + "=".repeat(80));
  });
});
