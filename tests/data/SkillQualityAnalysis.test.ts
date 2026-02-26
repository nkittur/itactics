/**
 * Skill Quality Analysis Script
 * Audits generated abilities for power, numeric cleanliness, and stat variety.
 * Run with: npm test -- tests/data/SkillQualityAnalysis.test.ts
 */
import { describe, it } from "vitest";
import { generateSkillTree, type SkillTree, type SkillTreeNode } from "@data/SkillTreeData";
import { THEMES } from "@data/ThemeData";
import { setAbilityRegistry, resolveAbility } from "@data/AbilityResolver";
import type { GeneratedAbility, EffectPrimitive } from "@data/AbilityData";

// Seeded RNG for reproducibility
function makeRng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// ── Quality flag types ──

interface AbilityFlag {
  abilityName: string;
  abilityUid: string;
  tier: number;
  flag: string;
  detail: string;
}

interface TreeQuality {
  themeId: string;
  treeIndex: number;
  flags: AbilityFlag[];
  activeCount: number;
  passiveCount: number;
  multipliers: { tier: number; type: string; value: number }[];
  statTargets: string[];
  effectTypesPerTier: Record<number, Set<string>>;
  powerByTier: Record<number, number[]>;
}

// ── Quality check functions ──

function isCleanMultiplier(value: number): boolean {
  // Must be a multiple of 0.2 (20%), allowing small float imprecision
  const scaled = Math.round(value * 100);
  return scaled % 20 === 0;
}

function isCleanPercent(value: number): boolean {
  // Must be a multiple of 10
  return value % 10 === 0;
}

function isCleanStatValue(value: number): boolean {
  // Must be a multiple of 5 and >= 5
  return value >= 5 && value % 5 === 0;
}

function auditAbility(ability: GeneratedAbility, node: SkillTreeNode): AbilityFlag[] {
  const flags: AbilityFlag[] = [];
  const mkFlag = (flag: string, detail: string) => ({
    abilityName: ability.name,
    abilityUid: ability.uid,
    tier: node.tier,
    flag,
    detail,
  });

  if (ability.isPassive) return flags; // Only audit actives

  // WEAK_SOLE_DAMAGE: single damage effect with multiplier < 1.0
  const dmgEffects = ability.effects.filter(e =>
    e.type === "dmg_weapon" || e.type === "dmg_spell"
  );
  if (ability.effects.length === 1 && dmgEffects.length === 1) {
    const mult = dmgEffects[0]!.params["multiplier"] as number;
    if (mult < 1.2) {
      flags.push(mkFlag("WEAK_SOLE_DAMAGE", `${dmgEffects[0]!.type} at ${Math.round(mult * 100)}% (< 120%)`));
    }
  }

  // FRACTIONAL_MULTIPLIER: any multiplier not a multiple of 0.2
  for (const e of ability.effects) {
    const mult = e.params["multiplier"] as number | undefined;
    if (mult !== undefined && !isCleanMultiplier(mult)) {
      flags.push(mkFlag("FRACTIONAL_MULTIPLIER", `${e.type} multiplier ${Math.round(mult * 100)}% (not multiple of 20)`));
    }
    const multPerHit = e.params["multPerHit"] as number | undefined;
    if (multPerHit !== undefined && !isCleanMultiplier(multPerHit)) {
      flags.push(mkFlag("FRACTIONAL_MULTIPLIER", `${e.type} multPerHit ${Math.round(multPerHit * 100)}% (not multiple of 20)`));
    }
  }

  // FRACTIONAL_PERCENT: bonusPercent/bonusMult not a multiple of 10
  for (const e of ability.effects) {
    const bonusDmg = e.params["bonusDmg"] as number | undefined;
    if (bonusDmg !== undefined && !isCleanPercent(bonusDmg)) {
      flags.push(mkFlag("FRACTIONAL_PERCENT", `${e.type} bonusDmg ${bonusDmg}% (not multiple of 10)`));
    }
    const percent = e.params["percent"] as number | undefined;
    if (percent !== undefined && e.type === "buff_dmgReduce" && !isCleanPercent(percent)) {
      flags.push(mkFlag("FRACTIONAL_PERCENT", `${e.type} percent ${percent}% (not multiple of 10)`));
    }
  }
  for (const m of ability.modifiers) {
    const bonus = m.params["bonusPercent"] as number | undefined;
    if (bonus !== undefined && !isCleanPercent(bonus)) {
      flags.push(mkFlag("FRACTIONAL_PERCENT", `modifier bonusPercent ${bonus}% (not multiple of 10)`));
    }
  }

  // TINY_STAT_VALUE: debuff_stat/buff_stat amount too small or not multiple of 5
  for (const e of ability.effects) {
    if (e.type === "debuff_stat" || e.type === "buff_stat") {
      const amount = e.params["amount"] as number;
      if (!isCleanStatValue(amount)) {
        flags.push(mkFlag("TINY_STAT_VALUE", `${e.type} amount ${amount} (not multiple of 5 or < 5)`));
      }
    }
    if (e.type === "dot_poison") {
      const sr = e.params["statReduce"] as number;
      if (!isCleanStatValue(sr)) {
        flags.push(mkFlag("TINY_STAT_VALUE", `dot_poison statReduce ${sr} (not multiple of 5 or < 5)`));
      }
    }
  }

  // IDENTICAL_EFFECTS: 2+ effects same type + same params
  for (let i = 0; i < ability.effects.length; i++) {
    for (let j = i + 1; j < ability.effects.length; j++) {
      const a = ability.effects[i]!;
      const b = ability.effects[j]!;
      if (a.type === b.type && JSON.stringify(a.params) === JSON.stringify(b.params)) {
        flags.push(mkFlag("IDENTICAL_EFFECTS", `Two ${a.type} effects with identical params`));
      }
    }
  }

  // COST_TOO_LOW: high power but low AP cost
  if (ability.powerBudget > 10 && ability.cost.ap <= 3) {
    flags.push(mkFlag("COST_TOO_LOW", `Power ${ability.powerBudget} but only ${ability.cost.ap} AP`));
  }

  // NO_SECONDARY_EFFECT: T3+ with only 1 effect type
  if (node.tier >= 3 && ability.effects.length === 1) {
    const t = ability.effects[0]!.type;
    if (t === "dmg_weapon" || t === "dmg_spell") {
      flags.push(mkFlag("NO_SECONDARY_EFFECT", `T${node.tier} active with only ${t}`));
    }
  }

  return flags;
}

// ── Main analysis ──

describe("Skill Quality Analysis", () => {
  it("audits 20 skill trees for quality issues", () => {
    const registry: Record<string, GeneratedAbility> = {};
    setAbilityRegistry(registry);

    const themeIds = Object.keys(THEMES);
    const allQualities: TreeQuality[] = [];
    const globalStatTargets = new Set<string>();
    const globalFlags: Record<string, number> = {};

    for (let i = 0; i < 20; i++) {
      const rng = makeRng(42 + i * 1337);
      const themeId = themeIds[i % themeIds.length]!;
      const theme = THEMES[themeId]!;
      const tree = generateSkillTree(theme, rng);

      const quality: TreeQuality = {
        themeId,
        treeIndex: i + 1,
        flags: [],
        activeCount: 0,
        passiveCount: 0,
        multipliers: [],
        statTargets: [],
        effectTypesPerTier: { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() },
        powerByTier: { 1: [], 2: [], 3: [], 4: [] },
      };

      for (const node of tree.nodes) {
        const ability = resolveAbility(node.abilityUid);
        if (!ability) continue;

        if (ability.isPassive) {
          quality.passiveCount++;
        } else {
          quality.activeCount++;
        }

        // Collect multipliers
        for (const e of ability.effects) {
          const mult = e.params["multiplier"] as number | undefined;
          if (mult !== undefined) {
            quality.multipliers.push({ tier: node.tier, type: e.type, value: mult });
          }
          const mph = e.params["multPerHit"] as number | undefined;
          if (mph !== undefined) {
            quality.multipliers.push({ tier: node.tier, type: e.type + ".multPerHit", value: mph });
          }
          // Effect types per tier
          quality.effectTypesPerTier[node.tier]?.add(e.type);
        }

        // Collect stat targets
        for (const e of ability.effects) {
          const stat = e.params["stat"] as string | undefined;
          if (stat) {
            quality.statTargets.push(stat);
            globalStatTargets.add(stat);
          }
        }

        // Power by tier
        if (!ability.isPassive) {
          quality.powerByTier[node.tier]?.push(ability.powerBudget);
        }

        // Audit
        const flags = auditAbility(ability, node);
        quality.flags.push(...flags);
        for (const f of flags) {
          globalFlags[f.flag] = (globalFlags[f.flag] ?? 0) + 1;
        }
      }

      allQualities.push(quality);
    }

    // ── Print Results ──
    console.log("\n" + "=".repeat(80));
    console.log("SKILL QUALITY ANALYSIS — 20 TREES");
    console.log("=".repeat(80));

    // Per-tree summary
    for (const q of allQualities) {
      console.log(`\n--- Tree #${q.treeIndex}: ${q.themeId} (${q.activeCount}A/${q.passiveCount}P) ---`);

      // Multiplier summary
      if (q.multipliers.length > 0) {
        const byTier: Record<number, string[]> = {};
        for (const m of q.multipliers) {
          if (!byTier[m.tier]) byTier[m.tier] = [];
          byTier[m.tier]!.push(`${m.type}=${Math.round(m.value * 100)}%`);
        }
        for (const [tier, mults] of Object.entries(byTier)) {
          console.log(`  T${tier} multipliers: ${mults.join(", ")}`);
        }
      }

      // Stats used
      if (q.statTargets.length > 0) {
        const statCounts: Record<string, number> = {};
        for (const s of q.statTargets) statCounts[s] = (statCounts[s] ?? 0) + 1;
        console.log(`  Stats: ${Object.entries(statCounts).map(([s, c]) => `${s}(${c})`).join(", ")}`);
      }

      // Power curve
      const tierPowers: string[] = [];
      for (const tier of [1, 2, 3, 4]) {
        const powers = q.powerByTier[tier] ?? [];
        if (powers.length > 0) {
          const avg = Math.round(powers.reduce((a, b) => a + b, 0) / powers.length);
          tierPowers.push(`T${tier}=${avg}`);
        }
      }
      if (tierPowers.length > 0) {
        console.log(`  Avg power: ${tierPowers.join(", ")}`);
      }

      // Flags
      if (q.flags.length > 0) {
        for (const f of q.flags) {
          console.log(`  ⚠ ${f.flag}: ${f.abilityName} (T${f.tier}) — ${f.detail}`);
        }
      } else {
        console.log(`  ✓ No quality issues`);
      }
    }

    // ── Aggregate ──
    console.log("\n" + "=".repeat(80));
    console.log("AGGREGATE METRICS");
    console.log("=".repeat(80));

    // Flag frequency
    console.log("\nIssue frequency:");
    const sortedFlags = Object.entries(globalFlags).sort((a, b) => b[1] - a[1]);
    for (const [flag, count] of sortedFlags) {
      console.log(`  ${flag}: ${count}`);
    }
    const totalFlags = Object.values(globalFlags).reduce((a, b) => a + b, 0);
    console.log(`  TOTAL: ${totalFlags} issues across 20 trees`);

    // Multiplier distribution by tier
    console.log("\nAvg multiplier by tier:");
    const allMults: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const q of allQualities) {
      for (const m of q.multipliers) {
        allMults[m.tier]?.push(m.value);
      }
    }
    for (const tier of [1, 2, 3, 4]) {
      const vals = allMults[tier] ?? [];
      if (vals.length > 0) {
        const avg = (vals.reduce((a, b) => a + b, 0) / vals.length * 100).toFixed(0);
        const min = (Math.min(...vals) * 100).toFixed(0);
        const max = (Math.max(...vals) * 100).toFixed(0);
        console.log(`  T${tier}: avg ${avg}% | min ${min}% | max ${max}% (n=${vals.length})`);
      }
    }

    // Stat variety
    console.log(`\nStat targets used (${globalStatTargets.size} distinct):`);
    const statFreq: Record<string, number> = {};
    for (const q of allQualities) {
      for (const s of q.statTargets) statFreq[s] = (statFreq[s] ?? 0) + 1;
    }
    for (const [stat, count] of Object.entries(statFreq).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${stat}: ${count}`);
    }

    // Trees with 0 issues
    const cleanTrees = allQualities.filter(q => q.flags.length === 0).length;
    console.log(`\nClean trees (0 issues): ${cleanTrees}/20`);

    console.log("\n" + "=".repeat(80));
  });
});
