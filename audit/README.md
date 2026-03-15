# Audit logs

## Demo battle (`demo-battle.log`)

All demo battle runs write the **same canonical log** to `audit/demo-battle.log`, so you can compare results across runs. The only difference in the file is the **Mode** line.

## Log format (same for every run)

- **Run at** — ISO timestamp
- **Mode** — Which runner produced this log (see below)
- **Scenario** — ID and name (e.g. tutorial)
- **Grid** — Width×height
- **Seed** — RNG seed (42 for demo)
- **Player units / Enemy units** — From scenario
- **Result** — Victory, turns, survivors, deaths, kills
- **Action tracker** — Per-entity actions and kills
- **Turn-by-turn log** — Moves, attacks, outcomes (same format in all modes)

## Run modes

| Mode | How you run it | What runs | Output file | Speed |
|------|----------------|-----------|-------------|--------|
| **headless** | `npm run test:headless` | **Main workhorse.** Headless battle in Node (Vitest). Same `runHeadlessBattle()` and CombatManager as campaign sim. No browser, no DOM, no rendering. | `audit/demo-battle.log` | ~1 s |
| **browser** | `npm run test:browser` | Real browser (Chromium headless), real WebGL, full game stack. Playwright starts Vite, opens page with `?demoBattle=1&auto=1`, AI runs the battle. Game collects turn log and builds the same audit text; script writes it to the file. | `audit/demo-battle.log` | ~30–120 s |
| **browser-visible** | `npm run test:browser -- --visible` | Same as **browser** but the browser window is visible so you can watch the battle. URL includes `&visible=1` so the log's Mode line says `browser-visible`. | `audit/demo-battle.log` | ~30–120 s |

## Summary

- **headless** is the primary path for fast, deterministic runs and CI. Same seed (42) and fixed tutorial scenario → reproducible logs.
- **browser** and **browser-visible** use the real game in a tab for full-stack verification; the log is built inside the game and written by the script.
- Every run **overwrites** `audit/demo-battle.log`. To keep a copy, rename or copy the file after a run.

## Skill fidelity (pass 1) (`skill-fidelity.log`)

**Skill fidelity** tests run every testable ruleset ability (one unit with the ability, one target) through the engine and assert that each effect produces the exact outcome described by the ability’s params (e.g. bleed applies with `dmgPerTurn` X, and one tick deals exactly X damage).

- **How to run:** `npm test -- tests/skill-fidelity/skillFidelity.test.ts`
- **Output:** `audit/skill-fidelity.log` (written in `afterAll`). Lists each ability with PASS/FAIL and per-check results.
- **Scope:** Abilities with targeting `tgt_self`, `tgt_single_enemy`, or `tgt_single_ally`; passives/auras are excluded. Full-fidelity checks for DoT/HoT (status + stored params + one tick amount), CC, debuffs, buffs, displacement, damage, etc.
- **Pass 2:** Any ability that does not fully match its description can be fixed in the engine or mappings in a follow-up pass.

## Design → engine approximations

See **`planning/skills-vs-engine-audit.md`** for a short list of how design-doc concepts (evasion, auras, on-kill, on-dodge, DoT tick rate, extend buff) map to engine behavior. Update when adding features.

## Skill fidelity report (description vs implementation)

See **`planning/skill-fidelity-report.md`** for a per-skill comparison of design-doc descriptions to current engine behavior. Lists exact matches, approximations (e.g. “while hasted” → “every turn”), and slight differences (e.g. cooldowns, chance vs 100%, delayed effects). Update when changing mappings or engine.

## Skill fix guide (how to fix skills)

See **`planning/skill-fix-guide.md`** for a step-by-step guide to fixing skills. It captures patterns learned from Chronomancer work: spirit vs letter, when to add engine support (trigger conditions, delayed effects, cost overrides, all-allies, return-after-execute, on-dodge damage to attacker, etc.), where to edit (mappings, executor, combat, status effects), testing, and audit updates. Use it when tackling future skills in any class.

## Chronomancer spirit audit

See **`planning/chronomancer-skill-spirit-audit.md`** for a spirit-focused audit of every Chronoweaver ability (Accelerant, Entropy, Paradox). For each skill it evaluates the intended player fantasy vs. what's implemented (Good / Partial / Missing / Wrong) and notes gaps. Use it to prioritize engine work and mapping fixes.

## Skill description audit (mapping coverage)

To see which abilities from the design doc are mapped vs NOT MAPPED:

- **Script:** `scripts/audit-skill-descriptions.ts` (or run via your normal TS runner).
- **Output:** TSV (e.g. `audit-skill-descriptions.tsv`) with ability names, descriptions, and mapping status.
- Use this to track regressions in mapping coverage; optionally fail CI if NOT MAPPED count increases without a ticket.
