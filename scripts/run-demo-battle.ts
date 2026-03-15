/**
 * Run a single headless demo battle and print the result.
 * Usage: npx tsx scripts/run-demo-battle.ts
 *    or: npm run test:headless  (runs the headless battle test and writes audit log)
 */
import { runHeadlessBattle } from "../src/simulation/HeadlessBattle";
import { SCENARIOS } from "../src/data/ScenarioData";
import {
  getClass,
  getArchetypeAbilitySlots,
  setRulesetById,
} from "../src/data/ruleset/RulesetLoader";
import { DEFAULT_PARAMS } from "../src/simulation/CampaignSimulator";

function buildRulesetAbilitiesForScenario(scenario: (typeof SCENARIOS)[0]): Map<number, string[]> {
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

function main(): void {
  setRulesetById("default");

  const scenario = SCENARIOS.find((s) => s.id === "tutorial");
  if (!scenario) {
    console.error("Tutorial scenario not found");
    process.exit(1);
  }

  const rosterAbilities = buildRulesetAbilitiesForScenario(scenario);
  const seed = Math.floor(Math.random() * 1e6);

  console.log("Running headless demo battle (tutorial 3v3)...");
  console.log("  Seed:", seed);
  console.log("  Player abilities from ruleset:", rosterAbilities.size, "units with skills");

  const result = runHeadlessBattle(scenario, rosterAbilities, seed, DEFAULT_PARAMS);

  console.log("\n--- Result ---");
  console.log("  Victory:", result.victory);
  console.log("  Turns:", result.turnsElapsed);
  console.log("  Player survivors:", result.playerSurvivors.length, result.playerSurvivors.map((s) => `${s.name} (${s.hpRemaining} HP)`).join(", ") || "none");
  console.log("  Player deaths:", result.playerDeaths);
  console.log("  Enemy kills:", result.enemyKills);
  console.log("\nDemo battle completed successfully.");
}

main();
