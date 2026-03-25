/**
 * LLM playtest runner: drive the real game in a browser with Playwright, collect
 * engine logs + visual state, and execute actions (from an LLM or a policy).
 *
 * Goals: find real issues — skills not targeting correctly, skills doing something
 * other than their description, skills never viable vs basic attack.
 *
 * Usage:
 *   # Start dev server first (npm run dev), then:
 *   node scripts/llm-playtest-runner.mjs [--url=...] [--steps=N] [--observe-file=path]
 *
 *   --url=http://localhost:5173/itactics/?demoBattle=1&automation=1  (default)
 *   --steps=N       Run N player actions then stop (default: 20)
 *   --observe-file  Write current observation (state + logTail) to this file each step
 *   --visible       Show browser window
 *
 * Each step: read state via window.__gameAutomation.getState(), collect [GAME_LOG]
 * from console, then either:
 *   - Run a simple test policy (e.g. try a skill if available, else move/attack)
 *   - Or you plug in an LLM: read observation, send to LLM, parse response to
 *     { type: "clickSkill", name: "Temporal Surge" } | { type: "hexTap", q, r } |
 *     { type: "wait" } | { type: "endTurn" }, then execute via __gameAutomation.
 */

import { chromium } from "playwright";
import { createWriteStream } from "fs";
import { mkdirSync } from "fs";
import { dirname } from "path";

const DEFAULT_URL = "http://localhost:5173/itactics/?demoBattle=1&automation=1";
const GAME_LOG_PREFIX = "[GAME_LOG] ";

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { url: DEFAULT_URL, steps: 20, observeFile: null, visible: false };
  for (const a of args) {
    if (a.startsWith("--url=")) out.url = a.slice(6);
    else if (a.startsWith("--steps=")) out.steps = parseInt(a.slice(8), 10) || 20;
    else if (a.startsWith("--observe-file=")) out.observeFile = a.slice(15);
    else if (a === "--visible") out.visible = true;
  }
  return out;
}

/** Collect lines that start with [GAME_LOG] from console messages. */
function gameLogLinesFromConsole(entries) {
  return entries
    .filter((e) => e.text && e.text.startsWith(GAME_LOG_PREFIX))
    .map((e) => e.text.slice(GAME_LOG_PREFIX.length).trim());
}

/** Simple policy for testing: prefer using a non-Attack skill once, else wait. */
function pickAction(state, stepIndex) {
  const { phase, playerState, skillNames, apRemaining } = state;
  if (phase !== "playerTurn" || playerState === "animating") return null;
  const skills = skillNames.filter((n) => n !== "Attack" && !n.includes("(Weapon)"));
  if (skills.length > 0 && stepIndex % 5 === 1) {
    return { type: "clickSkill", name: skills[0] };
  }
  if (apRemaining <= 0) return { type: "endTurn" };
  return { type: "wait" };
}

async function main() {
  const { url, steps, observeFile, visible } = parseArgs();

  const consoleEntries = [];
  const browser = await chromium.launch({
    headless: !visible,
    args: ["--use-gl=swiftshader", "--ignore-gpu-blocklist"],
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => {
    consoleEntries.push({ type: msg.type(), text: msg.text() });
  });

  console.log("Navigating to", url);
  await page.goto(url, { waitUntil: "networkidle", timeout: 20_000 });

  await page.waitForFunction(
    () => window.__gameAutomation != null,
    { timeout: 10_000 }
  ).catch(() => {
    console.error("window.__gameAutomation not found. Add ?automation=1 to the URL.");
    process.exit(1);
  });

  let step = 0;
  let battleEnded = false;

  while (step < steps && !battleEnded) {
    const state = await page.evaluate(() => {
      if (!window.__gameAutomation) return null;
      return window.__gameAutomation.getState();
    });

    if (!state) break;
    if (state.phase === "battleEnd") {
      battleEnded = true;
      break;
    }

    const logLines = gameLogLinesFromConsole(consoleEntries);
    const observation = {
      step,
      phase: state.phase,
      playerState: state.playerState,
      currentUnitName: state.currentUnitName,
      apRemaining: state.apRemaining,
      skillNames: state.skillNames,
      logTail: state.logTail,
      recentConsoleLogs: logLines.slice(-30),
    };

    if (observeFile) {
      mkdirSync(dirname(observeFile), { recursive: true });
      createWriteStream(observeFile, { flags: "w" }).write(
        JSON.stringify(observation, null, 2),
        () => {}
      );
      console.log("Wrote observation to", observeFile);
    }

    const action = pickAction(state, step);
    if (!action) {
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }

    console.log("Step", step, "action:", action);

    if (action.type === "clickSkill") {
      await page.evaluate(
        ({ name }) => window.__gameAutomation?.clickSkill(name),
        { name: action.name }
      );
    } else if (action.type === "hexTap") {
      await page.evaluate(
        ({ q, r }) => window.__gameAutomation?.hexTap(q, r),
        { q: action.q, r: action.r }
      );
    } else if (action.type === "wait") {
      await page.evaluate(() => window.__gameAutomation?.wait());
    } else if (action.type === "endTurn") {
      await page.evaluate(() => window.__gameAutomation?.endTurn());
    }

    step++;
    await new Promise((r) => setTimeout(r, 800));
  }

  const victory = await page.evaluate(() => window.__battleVictory === true);
  console.log("Battle ended. Victory:", victory, "Steps:", step);

  await browser.close();

  console.log("\nGame log events (last 30):");
  const logs = gameLogLinesFromConsole(consoleEntries).slice(-30);
  for (const line of logs) {
    console.log(" ", line);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
