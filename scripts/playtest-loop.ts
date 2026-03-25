/**
 * Self-improving playtest loop: run N headless battles → collect metrics → infer suggestions.
 *
 * Usage:
 *   npx tsx scripts/playtest-loop.ts [--battles=20] [--out-dir=scripts/out]
 *
 * Writes:
 *   - scripts/out/playtest-metrics.json  (aggregate stats + per-skill usage)
 *   - scripts/out/suggestions.json       (rule-based suggestions; extend with LLM later)
 *
 * See planning/self-improving-playtest-loop.md for the full design.
 */
import * as fs from "fs";
import * as path from "path";
import { runHeadlessBattle } from "../src/simulation/HeadlessBattle";
import { SCENARIOS } from "../src/data/ScenarioData";
import {
  getClass,
  getArchetypeAbilitySlots,
  setRulesetById,
} from "../src/data/ruleset/RulesetLoader";
import { DEFAULT_PARAMS } from "../src/simulation/CampaignSimulator";

// ── Config ──

const DEFAULT_BATTLES = 20;
const DEFAULT_OUT_DIR = path.join(process.cwd(), "scripts", "out");

function getArg(name: string, def: string): string {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`));
  return m ? m.split("=")[1]! : def;
}

// ── Reuse scenario + ability setup from run-demo-battle ──

function buildRulesetAbilitiesForScenario(
  scenario: (typeof SCENARIOS)[0],
): Map<number, string[]> {
  const map = new Map<number, string[]>();
  let playerIndex = 0;
  for (const unit of scenario.units) {
    if (unit.team !== "player") continue;
    const classId = unit.classId;
    if (!classId) {
      playerIndex++;
      continue;
    }
    const rulesetClass = getClass(classId);
    if (rulesetClass && rulesetClass.archetypes.length > 0) {
      const arch = rulesetClass.archetypes[0]!;
      const slots = getArchetypeAbilitySlots(classId, arch.id);
      const abilityIds = slots.map((s) => s.abilityId);
      if (abilityIds.length > 0) {
        map.set(playerIndex, abilityIds);
      }
    }
    playerIndex++;
  }
  return map;
}

/** Parse turn log for "attacks X with SkillName:" to get skill usage counts. */
function countSkillUsage(turnLog: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  const re = /attacks .+ with (.+):/;
  for (const line of turnLog) {
    const m = line.match(re);
    if (m) {
      const skill = m[1]!.trim();
      counts.set(skill, (counts.get(skill) ?? 0) + 1);
    }
  }
  return counts;
}

// ── Metrics types ──

interface BattleMetrics {
  seed: number;
  victory: boolean;
  turnsElapsed: number;
  playerDeaths: number;
  enemyKills: number;
  skillUsage: Record<string, number>;
}

interface PlaytestMetrics {
  version: 1;
  runAt: string;
  battlesRun: number;
  wins: number;
  totalTurns: number;
  totalPlayerDeaths: number;
  totalEnemyKills: number;
  skillUsageTotal: Record<string, number>;
  battles: BattleMetrics[];
}

// ── Suggestions types ──

interface Suggestion {
  id: string;
  reason: string;
  action: string;
  target?: string;
  params?: Record<string, unknown>;
}

interface SuggestionsFile {
  version: 1;
  source: string;
  runId: string;
  metricsFile: string;
  suggestions: Suggestion[];
}

// ── Analyzer (rule-based; extend with LLM later) ──

function analyze(metrics: PlaytestMetrics): Suggestion[] {
  const out: Suggestion[] = [];
  const winRate = metrics.wins / metrics.battlesRun;
  const avgTurns = metrics.totalTurns / metrics.battlesRun;
  const allSkillNames = new Set<string>(Object.keys(metrics.skillUsageTotal));

  if (metrics.battlesRun < 5) return out;

  if (winRate < 0.45) {
    out.push({
      id: `s-${out.length + 1}`,
      reason: `Win rate ${(winRate * 100).toFixed(0)}% over ${metrics.battlesRun} battles`,
      action: "balance_tweak",
      target: "enemy_or_difficulty",
      params: { suggest: "Consider slightly reducing enemy stats or increasing player power." },
    });
  }

  if (winRate > 0.85) {
    out.push({
      id: `s-${out.length + 1}`,
      reason: `Win rate ${(winRate * 100).toFixed(0)}% — may be too easy`,
      action: "balance_tweak",
      target: "enemy_or_difficulty",
      params: { suggest: "Consider increasing difficulty or enemy count." },
    });
  }

  if (avgTurns > 20) {
    out.push({
      id: `s-${out.length + 1}`,
      reason: `Average ${avgTurns.toFixed(1)} turns per battle`,
      action: "balance_tweak",
      params: { suggest: "Consider higher damage output or lower enemy HP to shorten battles." },
    });
  }

  const neverUsed = Array.from(allSkillNames).filter(
    (name) => (metrics.skillUsageTotal[name] ?? 0) === 0,
  );
  if (neverUsed.length > 0) {
    out.push({
      id: `s-${out.length + 1}`,
      reason: `Skills never used in ${metrics.battlesRun} battles: ${neverUsed.slice(0, 10).join(", ")}${neverUsed.length > 10 ? "..." : ""}`,
      action: "review_skill",
      target: neverUsed[0],
      params: { allNeverUsed: neverUsed, suggest: "Consider buffing, lower cooldown, or AI evaluation." },
    });
  }

  return out;
}

// ── Main ──

function main(): void {
  setRulesetById("default");

  const numBattles = parseInt(getArg("battles", String(DEFAULT_BATTLES)), 10) || DEFAULT_BATTLES;
  const outDir = getArg("out-dir", DEFAULT_OUT_DIR);

  const scenario = SCENARIOS.find((s) => s.id === "tutorial");
  if (!scenario) {
    console.error("Tutorial scenario not found");
    process.exit(1);
  }

  const rosterAbilities = buildRulesetAbilitiesForScenario(scenario);

  const runAt = new Date().toISOString();
  const battles: BattleMetrics[] = [];
  let wins = 0;
  let totalTurns = 0;
  let totalPlayerDeaths = 0;
  let totalEnemyKills = 0;
  const skillUsageTotal: Record<string, number> = {};

  console.log(`Playtest loop: running ${numBattles} headless battles...`);

  for (let i = 0; i < numBattles; i++) {
    const seed = Math.floor(Math.random() * 1e9);
    const result = runHeadlessBattle(scenario, rosterAbilities, seed, DEFAULT_PARAMS);

    const skillUsage = countSkillUsage(result.turnLog);
    for (const [skill, count] of skillUsage) {
      skillUsageTotal[skill] = (skillUsageTotal[skill] ?? 0) + count;
    }

    battles.push({
      seed,
      victory: result.victory,
      turnsElapsed: result.turnsElapsed,
      playerDeaths: result.playerDeaths,
      enemyKills: result.enemyKills,
      skillUsage: Object.fromEntries(skillUsage),
    });

    if (result.victory) wins++;
    totalTurns += result.turnsElapsed;
    totalPlayerDeaths += result.playerDeaths;
    totalEnemyKills += result.enemyKills;
  }

  const metrics: PlaytestMetrics = {
    version: 1,
    runAt,
    battlesRun: numBattles,
    wins,
    totalTurns,
    totalPlayerDeaths,
    totalEnemyKills,
    skillUsageTotal,
    battles,
  };

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const metricsPath = path.join(outDir, "playtest-metrics.json");
  fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2), "utf-8");
  console.log("Wrote", metricsPath);

  const suggestions = analyze(metrics);
  const suggestionsPayload: SuggestionsFile = {
    version: 1,
    source: "playtest-loop",
    runId: runAt,
    metricsFile: metricsPath,
    suggestions,
  };
  const suggestionsPath = path.join(outDir, "suggestions.json");
  fs.writeFileSync(suggestionsPath, JSON.stringify(suggestionsPayload, null, 2), "utf-8");
  console.log("Wrote", suggestionsPath);

  console.log("\n--- Summary ---");
  console.log("  Win rate:", `${wins}/${numBattles} (${((wins / numBattles) * 100).toFixed(0)}%)`);
  console.log("  Avg turns:", (totalTurns / numBattles).toFixed(1));
  console.log("  Suggestions:", suggestions.length);
  if (suggestions.length > 0) {
    console.log("\n  Suggestions:");
    for (const s of suggestions) {
      console.log("   -", s.reason);
    }
  }
  console.log("\nDone. See planning/self-improving-playtest-loop.md for applying or extending the loop.");
}

main();
