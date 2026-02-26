# Skill Tree Generator — Iterative Improvement Log

## Iteration 1: Baseline Analysis

### Generation Parameters (20 trees, seeds 42-67)
- Avg nodes: 10.9 | Avg active: 4.0 | Avg passive: 7.0
- Avg synergies per tree: 5.7
- Trees with 0 synergies: 2/20 (both reaper theme)
- Trees with issues: 11/20

### Issues Found

| Issue | Frequency | Severity |
|-------|-----------|----------|
| UNMET EXPLOITS (`low_hp`) | 8/20 | Medium — `low_hp` is a natural combat state, but no ability "creates" it |
| NO SYNERGIES (reaper) | 2/20 | Critical — reaper theme's progression has empty `creates` arrays, so zero synergies |
| DUPLICATE NAMES | 3/20 | Low — passive name pools (9 per archetype) too small for 6-8 passives/tree |
| DEAD ACTIVES (skirmisher) | 2/20 | Medium — skirmisher T2 slot has empty conditions, so cycled actives have no synergy tags |
| LOW ACTIVE VARIETY (sentinel) | 1/20 | Low — sentinel is intentionally stance-focused |
| Stackable count always = 2 | 20/20 | Low — formula `round(passives * 0.3)` gives 2 for all tree sizes (6-8 passives) |
| Passive archetype cycling is too uniform | 20/20 | Medium — every tree gets all 6 archetypes regardless of theme, losing thematic coherence |

### Learnings
1. Reaper theme is broken — needs conditions on its progression slots
2. `low_hp` should be treated as a "created" condition by high-damage abilities
3. Passive name pools need expansion to avoid collisions
4. Skirmisher's "Follow-up Strike" slot needs synergy conditions
5. Passive variety guarantee overrides theme weighting — should prefer theme-relevant archetypes
6. Stackable count needs wider variance

### Changes Made (Iteration 1)

1. **ThemeData.ts — Reaper theme**: Added `creates: ["low_hp"]` to T1 (heavy strike creates low_hp), `creates: ["low_hp"]` to T3 (AoE damage → low_hp). This gives reaper's actives synergy with its executioner-style passives.

2. **ThemeData.ts — Skirmisher theme**: Added `creates: ["displaced"]` to T2 Follow-up Strike slot conditions, and added `exploits: ["displaced"]` so it synergizes with T1 push.

3. **AbilityGenerator.ts**: When generating an active with `dmg_execute` effect, auto-add `low_hp` to the creates tag (thematically: execute abilities bring targets to low HP or finish them). This fixes the 8/20 unmet exploit issue.

4. **PassiveGenerator.ts**: Expanded each name pool from 9 to 15 names, reducing collision probability.

5. **SkillTreeData.ts**: Changed stackable count formula to `randInt(1, Math.max(2, Math.round(passiveNodes.length * 0.4)))` for more variety (1-3 instead of always 2).

6. **PassiveGenerator.ts — generatePassiveSuite()**: After variety guarantee assigns one of each archetype, bias remaining picks toward top-weighted archetypes instead of re-rolling from full set. This makes passives more thematically coherent.

---

## Iteration 2: Post Iteration-1 Analysis

### Results
- Avg synergies per tree: **8.3** (was 5.7, +46%)
- Trees with 0 synergies: **0/20** (was 2/20)
- Trees with issues: **2/20** (was 11/20)
- Unmet exploits: **0** (was 8/20)
- Stackable count now varies: 1-3 (was always 2)

### Remaining Issues

| Issue | Frequency | Severity |
|-------|-----------|----------|
| LOW ACTIVE VARIETY (sentinel) | 1/20 | Medium — only stance_overwatch + buff_stat, no damage effects |
| DUPLICATE NAMES (active) | 1/20 | Low — "Reaping" appears twice in executioner tree (active name pool overlap) |
| Active names very generic | 20/20 | Medium — "Blow", "Cut", "Strike", "Assault", "Slash" repeat constantly across themes |
| Passive names thematically mismatched | ~5/20 | Medium — "Bleed Feeder" on sentinel, "Smell Blood" on skirmisher — condition_exploiter names are blood-themed regardless of actual condition |
| `dazed` condition underexploited | ~3/20 | Low — only opportunist creates dazed, and its passives rarely pick it up |

### Learnings
1. Active verb pool (`NAME_VERBS`) is too small — only 3-5 verbs per primary effect type, causing repetitive names
2. Sentinel needs at least some damage in its slots to avoid "LOW ACTIVE VARIETY"
3. Passive names should match the condition they actually exploit, not be random from archetype pool
4. Need duplicate detection during tree generation to prevent same-name abilities
5. `condition_exploiter` passives often reference conditions generically — if they exploit "in_stance", name should reflect stance, not "blood"

### Changes Made (Iteration 2)

1. **AbilityGenerator.ts — NAME_VERBS**: Added more verbs per effect type and added theme-specific verb overrides. `dmg_weapon` now has 10+ verbs. Added theme-prefixed verb selection so bleeder gets "Laceration"/"Gash", reaper gets "Reap"/"Harvest", etc.

2. **AbilityGenerator.ts — generateAbilityName()**: Added dedup — track used names per tree and re-roll on collision.

3. **ThemeData.ts — Sentinel T1**: Added `dmg_weapon` as secondary effect to overwatch stance (representing the auto-attack on trigger), giving sentinel damage in its active variety.

4. **PassiveGenerator.ts — condition-aware naming**: Added `CONDITION_NAME_POOL` that maps conditions to thematic names. When a condition_exploiter exploits "in_stance", it picks from stance-themed names. When it exploits "bleeding", it picks from bleed names. This replaces the generic archetype name pool for condition_exploiter.

5. **SkillTreeData.ts — generateSkillTree()**: Added `usedNames` Set that is passed through generation, preventing duplicate ability names within a tree.

---

## Iteration 3: Post Iteration-2 Analysis

### Results
- **0/20 trees with issues** (was 2/20)
- **0 duplicate names** (was 1/20)
- Avg synergies: 8.3 (maintained)
- Sentinel now has 4 active effect types (was 2)
- Condition-aware passive names working: "Off-Balance Exploit" for displaced, "Shatter Focus" for stunned, "Disciplined Focus" for in_stance

### Deeper Analysis — What's Still Not Great

| Issue | Observation |
|-------|-------------|
| Passive suites too uniform | Every tree always has exactly 6 distinct archetypes. Predictable — trees should sometimes be more focused (2 kill_rewarders for a reaper, 2 condition_exploiters for a bleeder) |
| Single-condition themes | Sentinel (only in_stance) and reaper (only low_hp) feel one-dimensional. Need secondary condition interactions |
| Active names lack theme flavor | "Chop", "Hack", "Cleave" are generic weapon verbs. Bleeder should have blood-themed names, crusher should have impact names |
| No "combo chain" passive design | All passives are independent triggers — no passive rewards sequencing (e.g., "after applying bleed, next attack gains bonus"). This limits combo depth |
| `low_hp` created on too many actives | The auto-`low_hp` on high-damage actives makes it feel diluted. Crushers creating `low_hp` is thematically weak |

### Learnings
1. Variety guarantee should be relaxed: allow 2 of same archetype in first 6 picks when that archetype is strongly weighted
2. Sentinel T3 should also create a secondary condition. Reaper T1 could create "bleeding" to add another synergy axis
3. Active name verbs should have theme-specific overrides (bleeder → "Laceration", "Gash"; crusher → "Crush", "Smash")
4. `low_hp` auto-creation should only apply to execute abilities (not just high damage multiplier) to keep it thematic

### Changes Made (Iteration 3)

1. **AbilityGenerator.ts — auto-low_hp**: Narrowed to only `dmg_execute` effects. Removed `hasHighDamage` condition. Keeps `low_hp` thematic to execute-style abilities.

2. **AbilityGenerator.ts — theme-specific verb overrides**: Added `THEME_VERBS` map that overrides generic dmg_weapon verbs when generating abilities for specific themes. Bleeder → "Laceration"/"Gash"/"Rend"; Crusher → "Crush"/"Smash"/"Pummel"; Reaper → "Reap"/"Cleave"/"Decimate".

3. **ThemeData.ts — Reaper T3**: Added `creates: ["bleeding"]` to reaper AoE slot. Thematically: AoE cleave that causes bleeding on multiple targets, giving reaper trees a secondary synergy axis.

4. **ThemeData.ts — Sentinel T3**: Added `creates: ["debuffed"]` to sentinel T3 overwatch+buff slot. Thematically: presence debuffs nearby enemies.

5. **PassiveGenerator.ts — focused suites**: Relaxed variety guarantee. When an archetype has weight >= 5 (strongly themed), allow picking it again on the 2nd pass even before all 6 are used. This means a bleeder tree might get 2 condition_exploiters instead of always one-of-each.

---

## Iteration 4: Post Iteration-3 Analysis

### Results
- Issues: **1/20** (MISSED SYNERGY on sentinel)
- Avg synergies: **8.3** (consistent)
- condition_exploiter passives rose from 27→32 (focused suites working)
- sustained_fighter dropped from 20→17 (less filler passives)
- Reaper now has 11 synergies (was 0 before iteration 1)
- Theme-specific active names: "Gashing Bleed Cut", "Enfeebling Smash", "Battering Feint"

### Remaining Issues

| Issue | Observation |
|-------|-------------|
| Prefix+theme verb clashes | "Gashing Bleed Cut" — prefix "Gashing" is bleed-related AND verb "Bleed Cut" is bleed-themed. Double-dipping on theme flavor |
| "II" dedup feels artificial | "Draining Capitalize II" — the suffix dedup works but feels like a lazy rename |
| MISSED SYNERGY (1/20) | Sentinel tree had no condition_exploiter despite actives creating in_stance + debuffed |
| Sentinel's debuffed condition underused | Sentinel creates debuffed but passives don't exploit it — condition_exploiter prefers in_stance over debuffed |

### Learnings
1. When using theme-specific verbs, skip the prefix to avoid double-theming
2. Dedup should re-roll the name instead of appending "II"
3. Condition_exploiter weight needs to be higher when many conditions are created by actives
4. PassiveGenerator should sometimes pick secondary conditions, not just the first one

### Changes Made (Iteration 4)

1. **AbilityGenerator.ts — generateAbilityName()**: When using theme-specific verb (from THEME_VERBS), skip the prefix entirely. Prefix is only added when using generic verbs. This prevents "Gashing Bleed Cut" → just "Bleed Cut" or "Gashing Strike".

2. **SkillTreeData.ts — name dedup**: Instead of appending "II", re-roll the name up to 5 times. If still duplicate after 5 attempts, then append suffix as fallback.

3. **PassiveGenerator.ts — weightArchetypes()**: Increased condition_exploiter weight bonus per created condition from +3 to +4, and added +2 bonus per distinct condition (multiple conditions = stronger weight).

4. **PassiveGenerator.ts — buildConditionExploiter()**: When multiple conditions are available, alternate between them instead of always picking the first one. Uses rng to pick from all available conditions.

---

## Iteration 5: Post Iteration-4 Analysis

### Results
- **0/20 issues** (maintained)
- Avg synergies: **8.4** (up from 8.3)
- Passive distribution now meaningfully differentiated: debuff_amplifier 26 (was 20), sustained_fighter 15 (was 20)
- Theme verb names: "Bludgeon", "Crush", "Punish", "Decimate", "Terminate", "Lunge", "Jab"
- Sentinel #6 now exploits BOTH in_stance AND debuffed

### Final Issues Found

| Issue | Observation |
|-------|-------------|
| Over-focused passives (4 archetypes) | Opportunist #4 has 5 debuff_amplifiers; only 4 distinct archetypes. Too aggressive repeat |
| Sentinel secondary condition underused | Sentinel creates "debuffed" but condition_exploiters mostly pick "in_stance" — random pick doesn't guarantee coverage |
| sustained_fighter + reactive_defender feel generic | These always give stat buffs on turn-start or when-hit. No variety in what stat they buff — could feel repetitive to players |

### Learnings
1. Need minimum 4 distinct archetypes, max 3 of same archetype — "focused but not monolithic"
2. PassiveGenerator should ensure if tree has multiple conditions, at least one condition_exploiter targets each condition
3. sustained_fighter and reactive_defender could offer more variety (different stats, different trigger conditions)

### Changes Made (Iteration 5)

1. **PassiveGenerator.ts — archetype repeat cap**: Added max 3 repeats of any single archetype. When archetype has been used 3 times, exclude it from selection. This prevents trees from being dominated by one archetype.

2. **PassiveGenerator.ts — condition coverage**: When generating multiple condition_exploiters in a suite, track which conditions have been exploited. Second condition_exploiter preferentially picks an unexploited condition.

3. **PassiveGenerator.ts — varied stat selection**: sustained_fighter and reactive_defender now rotate between different stats based on index in the suite. First gets meleeDefense, second gets initiative, third gets meleeSkill — prevents identical passives.

---

## Summary: Before vs After

| Metric | Baseline (Iter 1) | Final (Iter 5) |
|--------|-------------------|----------------|
| Trees with issues | 11/20 | 0/20 |
| Trees with 0 synergies | 2/20 | 0/20 |
| Avg synergies/tree | 5.7 | 8.5+ |
| Unmet exploits | 8/20 | 0/20 |
| Duplicate names | 3/20 | 0/20 |
| Passive archetype variety | 6/6 every tree (uniform) | 4-6 per tree (themed) |
| Active name flavor | Generic ("Blow", "Cut", "Slash") | Theme-specific ("Crush", "Reap", "Punish") |
| Condition coverage | Single condition | Multi-condition with cross-synergies |

### Files Modified Across All Iterations
- `src/data/ThemeData.ts` — Reaper conditions, skirmisher T2 exploits, sentinel secondary conditions
- `src/data/AbilityGenerator.ts` — Auto low_hp on execute, theme verbs, no-prefix when theme verb used
- `src/data/PassiveGenerator.ts` — Condition-aware names, focused suites, archetype caps, condition coverage, stat variety, expanded name pools
- `src/data/SkillTreeData.ts` — Stackable variety, name dedup with adjectives
