# Self-Improving Playtest Loop

A system that: **play → measure → infer improvements → apply (or suggest) → repeat**.

## Loop overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Play      │ ──► │  Collect     │ ──► │  Infer      │ ──► │  Apply or    │
│  (headless  │     │  metrics     │     │  what could │     │  suggest     │
│   battles)  │     │  (JSON)      │     │  be better  │     │  changes     │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
       ▲                                                             │
       └────────────────────────── repeat ──────────────────────────┘
```

## 1. Play

- Use existing **HeadlessBattle** (`runHeadlessBattle`) or **CampaignSimulator** (`runCampaign`).
- Run N battles (or one short campaign) with fixed or varied seeds.
- No DOM, no rendering; pure logic. Same rules as the real game.

## 2. Collect metrics

After each battle (or campaign), record:

- **Per battle**: victory, turns, player deaths, enemy kills, which skills were used (parse from `turnLog`: "attacks X with **SkillName**"), action counts per unit.
- **Aggregate**: win rate, avg turns to win, avg casualties, per-skill usage frequency, per-class survival rate.

Write a **metrics file** (e.g. `scripts/out/playtest-metrics.json`) so the next step is data-driven.

## 3. Infer what could be better

Options (start simple, extend later):

- **Rule-based**
  - Win rate &lt; 50% → suggest "buff player base stats or nerf enemy difficulty".
  - Skill X never used → suggest "buff or rework skill X" or "check if AI considers it".
  - Avg turns to win &gt; 15 → suggest "increase damage or reduce enemy HP".
  - One class dies much more → suggest "tankier base or better positioning".
- **LLM**
  - Feed metrics + current `skill_trees.txt` / mappings snippet; ask for concrete edits (e.g. "increase Quicken duration to 3 turns").
  - Output structured suggestions (see below) for the applier.
- **Optimization**
  - Treat balance as a parameter vector (e.g. damage multipliers, cooldowns); run many playtests and tune to maximize win rate or fun proxy (e.g. wins with low casualties).

Output: a **suggestions file** (e.g. `scripts/out/suggestions.json`) or a **patch** (edits to apply to data files).

## 4. Apply or suggest

- **Apply (automated)**  
  - If suggestions are machine-readable (e.g. "skill_id: quicken, field: duration, value: 3"), a script can edit `skill_trees.txt`, `AbilityEffectMappings.ts`, or a balance JSON. Run tests after (e.g. `npm run build`, `npm test`).
- **Suggest (human-in-the-loop)**  
  - Print or persist suggestions; human (or Cursor) edits the repo, then re-runs the loop.

## Suggestion format (example)

```json
{
  "version": 1,
  "source": "playtest-loop",
  "runId": "2025-03-13T12:00:00",
  "suggestions": [
    {
      "id": "s1",
      "reason": "Win rate 0.42 over 50 battles",
      "action": "balance_tweak",
      "target": "enemy",
      "params": { "hpPercent": -10 }
    },
    {
      "id": "s2",
      "reason": "Skill 'Temporal Surge' used 0 times in 50 battles",
      "action": "review_skill",
      "target": "temporal_surge",
      "params": { "suggest": "Consider lower cooldown or stronger effect" }
    }
  ]
}
```

## Scripts

- **`scripts/playtest-loop.ts`**  
  - Runs a configurable number of headless battles.  
  - Writes `scripts/out/playtest-metrics.json`.  
  - Runs a built-in rule-based analyzer and writes `scripts/out/suggestions.json`.  
  - Optional: `--apply` to apply a subset of suggestions that have an applier (or leave apply for a separate script).

**Run:** `npm run playtest:loop` or `npx tsx scripts/playtest-loop.ts [--battles=20] [--out-dir=scripts/out]`

- **Future**
  - **`scripts/apply-suggestions.ts`**  
    - Reads suggestions, applies data-only changes (e.g. to a balance config or generated patch), then runs build/tests.
  - **LLM analyzer**  
    - Same metrics + game data → LLM → suggestions JSON.
  - **CI integration**  
    - On a schedule or on merge, run playtest loop and attach metrics (and optionally suggestions) as artifacts.

## What to improve (infer targets)

- **Balance**: win rate, difficulty curve, time-to-win, survivability by class.
- **Skill usage**: underused skills (buff or clarify), overused skills (nerf or add cost).
- **AI**: enemy or player AI making poor choices (e.g. never using ultimates); tune tactics or evaluation.
- **Bugs**: from turn log or metrics, detect impossible states or repeated failures and suggest code/data fixes.

## Safety

- **Version control**: Apply step should only change data files (or generated files); code changes can be suggested as patches for human review.
- **Reversibility**: Keep a backup of edited files or commit suggestions as a branch so the loop can be reverted.
- **Caps**: Limit iterations per run (e.g. 5 loops) and max changes per suggestion file to avoid runaway edits.
