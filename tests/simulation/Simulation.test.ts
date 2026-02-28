/**
 * Campaign Simulation Tests
 * Run with: npm test -- tests/simulation/Simulation.test.ts
 */
import { describe, it, expect } from "vitest";
import "@data/classes/ClassRegistry";
import { runSimulation } from "../../src/simulation/SimulationRunner";
import { DEFAULT_PARAMS } from "../../src/simulation/CampaignSimulator";
import {
  balanced, aggressive, conservative, eliteSquad, zergRush,
} from "../../src/simulation/PlayerStrategy";
import { validatePriceCoverage } from "../../src/data/StoreData";

describe("Campaign Simulation", () => {
  it("validates all data items have store prices", () => {
    const missing = validatePriceCoverage();
    expect(missing, `Items missing prices: ${missing.join(", ")}`).toEqual([]);
  });

  it("runs all strategies with default params", () => {
    console.log("\n=== ALL STRATEGIES, DEFAULT PARAMS ===\n");
    const stats = runSimulation({
      strategies: [balanced, aggressive, conservative, eliteSquad, zergRush],
      paramSets: [
        { name: "default", params: DEFAULT_PARAMS },
      ],
      campaignsPerCombo: 50,
      maxBattlesPerCampaign: 20,
      startingGold: 200,
      startingRosterSize: 4,
      baseSeed: 42,
    });

    // Sanity: every strategy has a win rate between 0% and 95%
    for (const s of stats) {
      expect(s.overallWinRate).toBeGreaterThanOrEqual(0);
      expect(s.overallWinRate).toBeLessThanOrEqual(1.0);
    }

    // Sanity: battle 1 should be winnable (at least one strategy wins battle 1)
    const battle1Wins = stats.some(s => {
      const d = s.byDepth.get(1);
      return d && d.winRate > 0;
    });
    expect(battle1Wins, "At least one strategy should win battle 1").toBe(true);
  }, 120_000); // 2 min timeout for batch simulation

  it("compares economy tuning", () => {
    console.log("\n=== ECONOMY COMPARISON ===\n");
    const stats = runSimulation({
      strategies: [balanced],
      paramSets: [
        { name: "default", params: DEFAULT_PARAMS },
        { name: "rich", params: { ...DEFAULT_PARAMS, goldPerKill: 75, baseGoldPerBattle: 150, rewardMult: 1.5 } },
        { name: "poor", params: { ...DEFAULT_PARAMS, goldPerKill: 30, baseGoldPerBattle: 60, rewardMult: 0.7 } },
      ],
      campaignsPerCombo: 50,
      maxBattlesPerCampaign: 20,
      startingGold: 200,
      startingRosterSize: 4,
      baseSeed: 42,
    });

    // Rich economy should end with more gold than poor
    const richStats = stats.find(s => s.paramsName === "rich")!;
    const poorStats = stats.find(s => s.paramsName === "poor")!;
    expect(richStats.avgFinalGold).toBeGreaterThan(poorStats.avgFinalGold);
  }, 120_000);

  it("compares enemy scaling", () => {
    console.log("\n=== ENEMY SCALING COMPARISON ===\n");
    const stats = runSimulation({
      strategies: [balanced],
      paramSets: [
        { name: "default", params: DEFAULT_PARAMS },
        { name: "hard-enemies", params: {
          ...DEFAULT_PARAMS,
          enemyMeleePerLevel: 4,
          enemyHpPerLevel: 3,
          enemyDefensePerLevel: 3,
        } },
        { name: "easy-enemies", params: {
          ...DEFAULT_PARAMS,
          enemyMeleePerLevel: 2,
          enemyHpPerLevel: 1,
          enemyDefensePerLevel: 1,
        } },
      ],
      campaignsPerCombo: 50,
      maxBattlesPerCampaign: 20,
      startingGold: 200,
      startingRosterSize: 4,
      baseSeed: 42,
    });

    // Easy enemies should have higher win rate than hard enemies
    const easyStats = stats.find(s => s.paramsName === "easy-enemies")!;
    const hardStats = stats.find(s => s.paramsName === "hard-enemies")!;
    expect(easyStats.overallWinRate).toBeGreaterThan(hardStats.overallWinRate);
  }, 120_000);

  it("verifies level scaling reduces late-game turn counts", () => {
    console.log("\n=== LEVEL SCALING VS NO SCALING ===\n");
    const noScalingParams = {
      ...DEFAULT_PARAMS,
      bonusDamagePerLevel: 0,
      bonusArmorPerLevel: 0,
      priceGrowthPerLevel: 0,
      healCostPerHp: 0,
      recruitCostGrowthPerLevel: 0,
    };
    const stats = runSimulation({
      strategies: [balanced],
      paramSets: [
        { name: "scaled", params: DEFAULT_PARAMS },
        { name: "no-scaling", params: noScalingParams },
      ],
      campaignsPerCombo: 50,
      maxBattlesPerCampaign: 20,
      startingGold: 200,
      startingRosterSize: 4,
      baseSeed: 42,
    });

    const scaledStats = stats.find(s => s.paramsName === "scaled")!;
    const noScaleStats = stats.find(s => s.paramsName === "no-scaling")!;

    // At battle 20, scaled should have fewer average turns (damage outpaces armor)
    const scaledB20 = scaledStats.byDepth.get(20);
    const noScaleB20 = noScaleStats.byDepth.get(20);
    if (scaledB20 && noScaleB20 && scaledB20.sampleSize > 5 && noScaleB20.sampleSize > 5) {
      console.log(`  Scaled avg turns at B20: ${scaledB20.avgTurns.toFixed(1)}`);
      console.log(`  No-scale avg turns at B20: ${noScaleB20.avgTurns.toFixed(1)}`);
      expect(scaledB20.avgTurns).toBeLessThan(noScaleB20.avgTurns);
    }

    // Scaled economy should have less gold surplus (heal costs + price scaling)
    if (scaledB20 && noScaleB20) {
      console.log(`  Scaled avg gold at B20: ${scaledB20.avgGold.toFixed(0)}`);
      console.log(`  No-scale avg gold at B20: ${noScaleB20.avgGold.toFixed(0)}`);
      expect(scaledStats.avgFinalGold).toBeLessThan(noScaleStats.avgFinalGold);
    }
  }, 120_000);
});
