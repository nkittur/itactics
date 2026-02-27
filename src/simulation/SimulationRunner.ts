/**
 * Simulation runner — executes many campaigns across strategies and parameter sets,
 * collects statistics, and prints formatted tables.
 */

import type { PlayerStrategy } from "./PlayerStrategy";
import {
  runCampaign,
  type BalanceParams,
  type CampaignResult,
  type BattleSummary,
  DEFAULT_PARAMS,
} from "./CampaignSimulator";

// ── Config ──

export interface SimulationConfig {
  strategies: PlayerStrategy[];
  paramSets: { name: string; params: BalanceParams }[];
  campaignsPerCombo: number;
  maxBattlesPerCampaign: number;
  startingGold: number;
  startingRosterSize: number;
  baseSeed: number;
}

// ── Statistics helpers ──

interface BattleDepthStats {
  winRate: number;
  avgPartyLevel: number;
  avgGold: number;
  avgRosterSize: number;
  avgDeaths: number;
  avgTurns: number;
  avgPartyArmor: number;
  avgPartyDodge: number;
  avgHealCost: number;
  sampleSize: number;
}

interface ComboStats {
  strategyName: string;
  paramsName: string;
  overallWinRate: number;
  overallWipeRate: number;
  avgCampaignLength: number;
  byDepth: Map<number, BattleDepthStats>;
  avgFinalLevel: number;
  avgFinalGold: number;
}

function computeComboStats(results: CampaignResult[], maxBattles: number): ComboStats {
  const total = results.length;
  if (total === 0) {
    return {
      strategyName: "", paramsName: "",
      overallWinRate: 0, overallWipeRate: 0, avgCampaignLength: 0,
      byDepth: new Map(), avgFinalLevel: 0, avgFinalGold: 0,
    };
  }

  let totalWins = 0;
  let totalBattles = 0;
  let wipes = 0;
  let campaignLengthSum = 0;
  let finalLevelSum = 0;
  let finalLevelCount = 0;
  let finalGoldSum = 0;

  // Per-depth accumulators
  const depthWins = new Map<number, number>();
  const depthSamples = new Map<number, number>();
  const depthLevels = new Map<number, number>();
  const depthGold = new Map<number, number>();
  const depthRosterSize = new Map<number, number>();
  const depthDeaths = new Map<number, number>();
  const depthTurns = new Map<number, number>();
  const depthArmor = new Map<number, number>();
  const depthDodge = new Map<number, number>();
  const depthHealCost = new Map<number, number>();

  for (const r of results) {
    totalWins += r.totalWins;
    totalBattles += r.battles.length;
    campaignLengthSum += r.battles.length;
    finalGoldSum += r.finalGold;

    if (r.campaignEnded === "wiped") wipes++;

    for (const level of r.finalRosterLevels) {
      finalLevelSum += level;
      finalLevelCount++;
    }

    for (const b of r.battles) {
      const d = b.battleNumber;
      depthWins.set(d, (depthWins.get(d) ?? 0) + (b.victory ? 1 : 0));
      depthSamples.set(d, (depthSamples.get(d) ?? 0) + 1);
      depthLevels.set(d, (depthLevels.get(d) ?? 0) + b.partyLevel);
      depthGold.set(d, (depthGold.get(d) ?? 0) + b.goldTotal);
      depthRosterSize.set(d, (depthRosterSize.get(d) ?? 0) + b.partySize);
      depthDeaths.set(d, (depthDeaths.get(d) ?? 0) + b.deaths);
      depthTurns.set(d, (depthTurns.get(d) ?? 0) + b.turnsElapsed);
      depthArmor.set(d, (depthArmor.get(d) ?? 0) + b.avgPartyArmor);
      depthDodge.set(d, (depthDodge.get(d) ?? 0) + b.avgPartyDodge);
      depthHealCost.set(d, (depthHealCost.get(d) ?? 0) + b.goldSpentOnHealing);
    }
  }

  const byDepth = new Map<number, BattleDepthStats>();
  for (let d = 1; d <= maxBattles; d++) {
    const samples = depthSamples.get(d) ?? 0;
    if (samples === 0) continue;
    byDepth.set(d, {
      winRate: (depthWins.get(d) ?? 0) / samples,
      avgPartyLevel: (depthLevels.get(d) ?? 0) / samples,
      avgGold: (depthGold.get(d) ?? 0) / samples,
      avgRosterSize: (depthRosterSize.get(d) ?? 0) / samples,
      avgDeaths: (depthDeaths.get(d) ?? 0) / samples,
      avgTurns: (depthTurns.get(d) ?? 0) / samples,
      avgPartyArmor: (depthArmor.get(d) ?? 0) / samples,
      avgPartyDodge: (depthDodge.get(d) ?? 0) / samples,
      avgHealCost: (depthHealCost.get(d) ?? 0) / samples,
      sampleSize: samples,
    });
  }

  return {
    strategyName: results[0]!.strategyName,
    paramsName: results[0]!.paramsName,
    overallWinRate: totalBattles > 0 ? totalWins / totalBattles : 0,
    overallWipeRate: wipes / total,
    avgCampaignLength: campaignLengthSum / total,
    byDepth,
    avgFinalLevel: finalLevelCount > 0 ? finalLevelSum / finalLevelCount : 0,
    avgFinalGold: finalGoldSum / total,
  };
}

// ── Formatting ──

function pad(s: string, width: number): string {
  return s.padEnd(width);
}

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

function num(n: number, decimals = 1): string {
  return n.toFixed(decimals);
}

// ── Main runner ──

export function runSimulation(config: SimulationConfig): ComboStats[] {
  const allStats: ComboStats[] = [];

  const totalCombos = config.strategies.length * config.paramSets.length;
  let comboIdx = 0;

  for (const paramSet of config.paramSets) {
    for (const strategy of config.strategies) {
      comboIdx++;
      const label = `${strategy.name} / ${paramSet.name}`;
      console.log(`  [${comboIdx}/${totalCombos}] Running ${config.campaignsPerCombo} campaigns: ${label}...`);

      const results: CampaignResult[] = [];
      for (let i = 0; i < config.campaignsPerCombo; i++) {
        const seed = config.baseSeed + comboIdx * 100000 + i;
        const result = runCampaign({
          strategy,
          params: paramSet.params,
          maxBattles: config.maxBattlesPerCampaign,
          startingGold: config.startingGold,
          startingRosterSize: config.startingRosterSize,
          seed,
        }, paramSet.name);
        results.push(result);
      }

      const stats = computeComboStats(results, config.maxBattlesPerCampaign);
      stats.strategyName = strategy.name;
      stats.paramsName = paramSet.name;
      allStats.push(stats);
    }
  }

  // Print results
  printWinRateTable(allStats, config.maxBattlesPerCampaign);
  printProgressionTable(allStats, config.maxBattlesPerCampaign);
  printSummaryTable(allStats);

  return allStats;
}

// ── Table output ──

function printWinRateTable(stats: ComboStats[], maxBattles: number): void {
  console.log("\n" + "=".repeat(80));
  console.log("WIN RATE BY BATTLE DEPTH");
  console.log("=".repeat(80));

  const headers = stats.map(s => `${s.strategyName}/${s.paramsName}`);
  const colWidth = Math.max(14, ...headers.map(h => h.length + 2));

  // Header row
  let header = pad("Battle", 8);
  for (const h of headers) header += pad(h, colWidth);
  console.log(header);
  console.log("-".repeat(8 + colWidth * headers.length));

  // Sample every few battles to keep output manageable
  const depths = [];
  for (let d = 1; d <= maxBattles; d++) {
    if (d <= 5 || d % 5 === 0 || d === maxBattles) depths.push(d);
  }

  for (const d of depths) {
    let row = pad(`  ${d}`, 8);
    for (const s of stats) {
      const ds = s.byDepth.get(d);
      row += pad(ds ? `${pct(ds.winRate)} (n=${ds.sampleSize})` : "  -", colWidth);
    }
    console.log(row);
  }
}

function printProgressionTable(stats: ComboStats[], maxBattles: number): void {
  console.log("\n" + "=".repeat(100));
  console.log("PROGRESSION SNAPSHOTS");
  console.log("=".repeat(100));

  const snapPoints = [5, 10, 15, 20, 25, 30].filter(d => d <= maxBattles);

  console.log(
    pad("Strategy", 16) +
    pad("Params", 12) +
    pad("Battle#", 8) +
    pad("WinRate", 8) +
    pad("AvgLvl", 8) +
    pad("AvgGold", 10) +
    pad("Roster", 8) +
    pad("Deaths", 8) +
    pad("Turns", 8) +
    pad("Armor", 8) +
    pad("Dodge", 8) +
    pad("Heal$", 8)
  );
  console.log("-".repeat(110));

  for (const s of stats) {
    for (const d of snapPoints) {
      const ds = s.byDepth.get(d);
      if (!ds) continue;
      console.log(
        pad(s.strategyName, 16) +
        pad(s.paramsName, 12) +
        pad(`${d}`, 8) +
        pad(pct(ds.winRate), 8) +
        pad(num(ds.avgPartyLevel), 8) +
        pad(num(ds.avgGold, 0), 10) +
        pad(num(ds.avgRosterSize), 8) +
        pad(num(ds.avgDeaths), 8) +
        pad(num(ds.avgTurns, 0), 8) +
        pad(num(ds.avgPartyArmor), 8) +
        pad(num(ds.avgPartyDodge), 8) +
        pad(num(ds.avgHealCost, 0), 8)
      );
    }
  }
}

function printSummaryTable(stats: ComboStats[]): void {
  console.log("\n" + "=".repeat(90));
  console.log("OVERALL SUMMARY");
  console.log("=".repeat(90));

  console.log(
    pad("Strategy", 16) +
    pad("Params", 12) +
    pad("WinRate", 10) +
    pad("WipeRate", 10) +
    pad("AvgLength", 10) +
    pad("FinalLvl", 10) +
    pad("FinalGold", 10)
  );
  console.log("-".repeat(78));

  for (const s of stats) {
    console.log(
      pad(s.strategyName, 16) +
      pad(s.paramsName, 12) +
      pad(pct(s.overallWinRate), 10) +
      pad(pct(s.overallWipeRate), 10) +
      pad(num(s.avgCampaignLength, 1), 10) +
      pad(num(s.avgFinalLevel), 10) +
      pad(num(s.avgFinalGold, 0), 10)
    );
  }
}
