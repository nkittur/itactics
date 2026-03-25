# LLM Real Playtest: Actually Play the Game

Goal: have an LLM (or you) **really** play the game in a browser — take actions via Playwright, see what changes on screen and in the **engine logs** — to find real issues:

- Skills not targeting correctly
- Skills doing something other than their description
- Skills never becoming viable (always better to just attack)
- Other fidelity/UX bugs

## How it works

1. **Game exposes** (when `?automation=1`):
   - **Structured log**: every important event is emitted as `console.log("[GAME_LOG]", JSON.stringify(event))` and appended to `window.__gameLogBuffer`.
   - **Automation API**: `window.__gameAutomation = { hexTap(q,r), clickSkill(name), wait(), endTurn(), getState() }`.

2. **Events logged** (see `DemoBattle` when `isAutomationEnabled()`):
   - `turn_advance`: whose turn, AP, phase
   - `attack`: attacker, defender, skill name, hit, damage, killed
   - `status_applied`: target, effect id
   - `phase`: phase change
   - `skill_used`: skill name, caster, target (if any), short result summary (e.g. "applied to 3 allies", "12 damage")

3. **Playwright runner** (`scripts/llm-playtest-runner.mjs`):
   - Loads the game with `?demoBattle=1&automation=1`.
   - Captures console; filters lines starting with `[GAME_LOG]` to get the engine log.
   - Each step: calls `getState()` (phase, current unit, AP, skill names, last 50 log lines), optionally writes **observation** to a file, then executes an **action** (from a built-in policy or from an LLM).
   - Actions: `clickSkill(name)`, `hexTap(q, r)`, `wait()`, `endTurn()`.

4. **LLM integration** (your side):
   - Feed the LLM the **observation** (state + `logTail`) and the **skill descriptions** (from `skill_trees.txt` or the UI).
   - Ask: "What single action do you take? Reply with JSON: {\"type\": \"clickSkill\", \"name\": \"Temporal Surge\"} or {\"type\": \"hexTap\", \"q\": 2, \"r\": 3} or {\"type\": \"wait\"} or {\"type\": \"endTurn\"}."
   - Parse the response and pass it to the runner (e.g. runner reads `next_action.json` or you extend the script to call your LLM API).

## Running

1. Start the dev server: `npm run dev`
2. Run the Playwright script (default: 20 steps, simple policy):
   ```bash
   node scripts/llm-playtest-runner.mjs
   ```
3. With observation file (for feeding an LLM):
   ```bash
   node scripts/llm-playtest-runner.mjs --observe-file=scripts/out/observation.json --steps=50
   ```
4. Watch the browser: `node scripts/llm-playtest-runner.mjs --visible`

## What to look for in the logs

- After `skill_used` for "Temporal Surge", do you see `status_applied` for `temporal_surge` on each ally? If not, targeting or execution is wrong.
- When you `clickSkill("Flicker Strike")` and then `hexTap` an enemy, does the log show the right skill name and damage? Does the caster teleport back?
- Are there skills that the AI/LLM never chooses because basic attack always looks better? That suggests balance or description mismatch.

## Extending

- **Screenshots**: in the runner, take a `page.screenshot()` each step and attach to the observation for a vision LLM.
- **Action from file**: runner reads `next_action.json` each step (written by an external LLM process), then executes and continues.
- **API mode**: runner starts a small HTTP server; you POST the observation and get back the action, then execute (so any LLM API can drive the game).
