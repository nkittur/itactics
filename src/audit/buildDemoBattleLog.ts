/**
 * Canonical demo battle audit log format.
 * All run modes (headless, browser, browser-visible) write the same structure
 * to audit/demo-battle.log so results are comparable.
 */

import type { ScenarioDef } from "@data/ScenarioData";
import type { HeadlessBattleResult } from "../simulation/HeadlessBattle";

export type DemoBattleLogMode =
  | "headless"
  | "browser"
  | "browser-visible";

/**
 * Build the canonical audit log string. Same format for Node headless and browser runs.
 */
export function buildDemoBattleLog(
  scenario: ScenarioDef,
  rosterAbilities: Map<number, string[]> | undefined,
  seed: number,
  result: HeadlessBattleResult,
  mode: DemoBattleLogMode,
): string {
  const lines: string[] = [];
  lines.push("# Demo battle audit log");
  lines.push("");
  lines.push(`Run at: ${new Date().toISOString()}`);
  lines.push(`Mode: ${mode}`);
  lines.push(`Scenario: ${scenario.id} — ${scenario.name}`);
  lines.push(`Grid: ${scenario.gridWidth}x${scenario.gridHeight}`);
  lines.push(`Seed: ${seed}`);
  lines.push("");

  lines.push("## Player units (scenario)");
  const playerUnits = scenario.units.filter((u) => u.team === "player");
  playerUnits.forEach((u, i) => {
    const abilities = rosterAbilities?.get(i) ?? [];
    lines.push(
      `- **${u.name}** (${u.classId ?? "—"}) | HP ${u.stats.hp} | abilities: ${abilities.length} [${abilities.slice(0, 5).join(", ")}${abilities.length > 5 ? "…" : ""}]`,
    );
  });
  lines.push("");

  lines.push("## Enemy units (scenario)");
  scenario.units
    .filter((u) => u.team === "enemy")
    .forEach((u) => {
      lines.push(`- ${u.name} | HP ${u.stats.hp} | melee ${u.stats.melee}`);
    });
  lines.push("");

  lines.push("## Result");
  lines.push(`- **Victory:** ${result.victory}`);
  lines.push(`- **Turns:** ${result.turnsElapsed}`);
  lines.push(`- **Player survivors:** ${result.playerSurvivors.length}`);
  result.playerSurvivors.forEach((s) => {
    lines.push(`  - ${s.name}: ${s.hpRemaining} HP`);
  });
  lines.push(`- **Player deaths:** ${result.playerDeaths}`);
  lines.push(`- **Enemy kills:** ${result.enemyKills}`);
  lines.push("");

  lines.push("## Action tracker (entity → actions, kills)");
  result.actionTracker.stats.forEach((entry, entityId) => {
    const survivor = result.playerSurvivors.find((s) => s.entityId === entityId);
    const name = survivor
      ? `${survivor.name} (id=${entityId})`
      : `entity ${entityId}`;
    lines.push(`- ${name}: ${entry.actions} actions, ${entry.kills} kills`);
  });

  if (result.turnLog && result.turnLog.length > 0) {
    lines.push("");
    lines.push("## Turn-by-turn log");
    lines.push("");
    lines.push("```");
    for (const line of result.turnLog) {
      lines.push(line);
    }
    lines.push("```");
  }

  return lines.join("\n") + "\n";
}
