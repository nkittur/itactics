/**
 * Headless battle test — main workhorse. Runs a full battle in Node (no browser).
 * Same HeadlessBattle path as campaign simulation. Writes canonical audit log to audit/demo-battle.log.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { runHeadlessBattle } from "../src/simulation/HeadlessBattle";
import { SCENARIOS } from "../src/data/ScenarioData";
import { buildDemoBattleLog } from "../src/audit/buildDemoBattleLog";
import {
  getClass,
  getArchetypeAbilitySlots,
  setRulesetById,
} from "../src/data/ruleset/RulesetLoader";
import { DEFAULT_PARAMS } from "../src/simulation/CampaignSimulator";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIT_LOG_PATH = path.resolve(__dirname, "../audit/demo-battle.log");

/** Write audit log to audit/demo-battle.log (creates directory if needed). */
function writeAuditLog(content: string): void {
  const dir = path.dirname(AUDIT_LOG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(AUDIT_LOG_PATH, content, "utf8");
}

/** Build rosterAbilities from scenario: for each player unit, use first archetype's abilities from ruleset. */
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

describe("Demo battle (headless)", () => {
  it("runs a full 3v3 battle to completion with ruleset abilities", () => {
    setRulesetById("default");

    const scenario = SCENARIOS.find((s) => s.id === "tutorial");
    expect(scenario).toBeDefined();
    expect(scenario!.units.filter((u) => u.team === "player").length).toBe(3);
    expect(scenario!.units.filter((u) => u.team === "enemy").length).toBe(3);

    const rosterAbilities = buildRulesetAbilitiesForScenario(scenario!);
    expect(rosterAbilities.size).toBeGreaterThan(0);

    const seed = 42;
    const result = runHeadlessBattle(
      scenario!,
      rosterAbilities,
      seed,
      DEFAULT_PARAMS,
    );

    expect(typeof result.victory).toBe("boolean");
    expect(result.turnsElapsed).toBeGreaterThan(0);
    expect(result.turnsElapsed).toBeLessThan(500);
    expect(Array.isArray(result.playerSurvivors)).toBe(true);
    expect(result.playerSurvivors.length).toBeLessThanOrEqual(3);
    expect(result.playerDeaths).toBeGreaterThanOrEqual(0);
    expect(result.playerDeaths + result.playerSurvivors.length).toBe(3);
    expect(result.enemyKills).toBeGreaterThanOrEqual(0);
    expect(result.enemyKills).toBeLessThanOrEqual(3);

    writeAuditLog(buildDemoBattleLog(scenario!, rosterAbilities, seed, result, "headless"));
  });

  it("produces deterministic results with same seed", () => {
    setRulesetById("default");
    const scenario = SCENARIOS.find((s) => s.id === "tutorial")!;
    const rosterAbilities = buildRulesetAbilitiesForScenario(scenario);
    const seed = 12345;

    const a = runHeadlessBattle(scenario, rosterAbilities, seed, DEFAULT_PARAMS);
    const b = runHeadlessBattle(scenario, rosterAbilities, seed, DEFAULT_PARAMS);

    expect(a.victory).toBe(b.victory);
    expect(a.turnsElapsed).toBe(b.turnsElapsed);
    expect(a.playerSurvivors.length).toBe(b.playerSurvivors.length);
    expect(a.enemyKills).toBe(b.enemyKills);
  });

  it("runs battle with no ruleset abilities (basic attack only)", () => {
    setRulesetById("default");
    const scenario = SCENARIOS.find((s) => s.id === "tutorial")!;

    const result = runHeadlessBattle(scenario, undefined, 999, DEFAULT_PARAMS);

    expect(typeof result.victory).toBe("boolean");
    expect(result.turnsElapsed).toBeGreaterThan(0);
    expect(result.turnsElapsed).toBeLessThan(500);
  });
});
