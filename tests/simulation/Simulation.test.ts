/**
 * Campaign Simulation Tests
 * Run with: npm test -- tests/simulation/Simulation.test.ts
 */
import { describe, it } from "vitest";
import { runSimulation } from "../../src/simulation/SimulationRunner";
import { DEFAULT_PARAMS } from "../../src/simulation/CampaignSimulator";
import {
  balanced, aggressive, conservative, eliteSquad, zergRush,
} from "../../src/simulation/PlayerStrategy";

describe("Campaign Simulation", () => {
  it("runs all strategies with default params", () => {
    console.log("\n=== ALL STRATEGIES, DEFAULT PARAMS ===\n");
    runSimulation({
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
  }, 120_000); // 2 min timeout for batch simulation

  it("compares economy tuning", () => {
    console.log("\n=== ECONOMY COMPARISON ===\n");
    runSimulation({
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
  }, 120_000);

  it("compares enemy scaling", () => {
    console.log("\n=== ENEMY SCALING COMPARISON ===\n");
    runSimulation({
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
  }, 120_000);
});
