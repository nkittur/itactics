# New Themes — Within-Tree Iterative Improvement Log

## Iteration 1: Baseline Analysis

### Generation Parameters (20 trees, seeds 42+, cycling 12 themes)

New theme trees: pyromaniac #8/#20, venomancer #9, warden #10, arcanist #11, hexcurser #12

| Theme | Synergies | Unmet Exploits | Active Effects | Issues |
|-------|-----------|----------------|----------------|--------|
| Pyromaniac #8 | 12 | debuffed, displaced | dot_burn, dmg_weapon, debuff_vuln | One-dimensional: all synergies through burning |
| Pyromaniac #20 | 11 | debuffed | dot_burn, dmg_weapon, debuff_vuln | Same: burning-only synergies |
| Venomancer #9 | 5 | (none) | dot_poison, dmg_weapon, cc_root, debuff_stat, cc_daze | Lowest synergy count; dazed created but unexploited |
| Warden #10 | 11 | (none) | cc_root, dmg_weapon, buff_dmgReduce, disp_push, buff_stat | One-dimensional: all 11 synergies through rooted |
| Arcanist #11 | 9 | debuffed, stunned | dmg_spell, debuff_vuln, cc_daze | Only 3 active effect types |
| Hexcurser #12 | 12 | low_hp | debuff_stat, debuff_vuln, dmg_spell, cc_daze | T4 exploits low_hp but never creates it |

### Global Metrics (all 20 trees)
- Avg synergies/tree: 8.8
- Trees with issues: 18/20 (UNMET EXPLOITS: 18/20)
- Trees with 0 synergies: 0/20

### Root Causes
1. **Pyromaniac/Arcanist exploit debuffed but never create it** — T3 exploits debuffed for cross-tree value, but within-tree it's always unmet
2. **Hexcurser T4 exploits low_hp** — thematic (curse drains life) but hexcurser never creates low_hp
3. **Warden synergies all through rooted** — creates displaced/debuffed/stunned too but those aren't exploited enough internally
4. **Venomancer creates dazed (T3) but nothing exploits dazed** within the tree
5. **Bridge passives add cross-tree exploits that show as unmet** within single trees (design tension)

### Changes (Iteration 1): Self-Contained Condition Loops

1. **Pyromaniac T1**: Add `debuffed` to creates (fire weakens = debuff). Fixes unmet debuffed.
2. **Arcanist T1**: Add `debuffed` to creates (arcane assault disrupts). Fixes unmet debuffed.
3. **Hexcurser T4**: Change exploits from `[cursed, low_hp]` to `[cursed, debuffed]` (both created by T1).
4. **Venomancer T4**: Add `dazed` to exploits (dazed targets easier to poison, T3 creates dazed).
5. **Warden T1**: Add `debuffed` to creates (binding strikes weaken). Adds second synergy axis.

---

## Iteration 2: Post Iteration-1 Analysis

### Results

| Theme | Synergies | Unmet Exploits | Change |
|-------|-----------|----------------|--------|
| Pyromaniac #8 | 12 | displaced | debuffed fixed, +debuffed synergies |
| Pyromaniac #20 | 10 | (none) | All unmet fixed! |
| Venomancer #9 | 5 | (none) | Unchanged |
| Warden #10 | 11 | (none) | Still all-rooted synergies |
| Arcanist #11 | 10 | stunned | debuffed fixed (+1 synergy), stunned remains |
| Hexcurser #12 | 13 | (none) | All unmet fixed! (+1 synergy) |

### Global: 16/20 issues (was 18/20). UNMET EXPLOITS 16/20 (was 18).

### Remaining Problems
1. **Warden**: 11 synergies ALL through rooted — debuffed/displaced/stunned created but not exploited internally
2. **Venomancer**: Still lowest synergy count (5) — dazed still unexploited despite T4 exploit change (T4 capstone has dazed in exploits but tree only generates 3 actives due to small tree)
3. **Arcanist T4**: Exploits stunned but never creates it — change to dazed (created by T3)
4. **Pyromaniac #8**: displaced still unmet (from bridge passive)

### Changes (Iteration 2): Diversify Synergy Patterns

1. **Warden T2 passive**: Change exploits from `[rooted]` to `[rooted, debuffed]` — T2 passive also exploits debuffed from T1.
2. **Warden T4**: Add `debuffed` to exploits — capstone benefits from debuffed (created by T1).
3. **Venomancer T3**: Add `exploits: ["poisoned"]` alongside debuffed — T1 creates poisoned, T3 exploits it.
4. **Arcanist T4**: Change exploits from `[vulnerable, stunned]` to `[vulnerable, dazed]` — dazed is created by T3.
5. **Pyromaniac T4**: Add `debuffed` to exploits — T1 creates debuffed, capstone exploits it.

---

## Iteration 3: Post Iteration-2 Analysis

### Results

| Theme | Synergies | Unmet | Change |
|-------|-----------|-------|--------|
| Pyromaniac #8 | 14 | displaced | +2 syn from debuffed axis |
| Pyromaniac #20 | 11 | (none) | Stable |
| Venomancer #9 | 6 | (none) | +1 from poisoned→poisoned |
| Warden #10 | **17** | (none) | +6 from debuffed axis! |
| Arcanist #11 | 11 | (none) | stunned→dazed fix worked, +1 syn |
| Hexcurser #12 | 13 | (none) | Stable |

### Global: 15/20 issues (was 16). Avg synergies 9.4 (was 8.9).

### Remaining Problems
1. **Venomancer**: Still lowest synergy count (6) — needs more internal exploit connections
2. **Pyromaniac**: Only 3 active effect types (dot_burn, dmg_weapon, debuff_vuln) — lacks cc/utility
3. **Unmet rooted/vulnerable**: 6/20 each — bridge passives exploit these from other themes
4. **stunned**: 4/20 unmet — adding stunned to more new theme creates would help globally

### Changes (Iteration 3): Boost Venomancer + Active Variety

1. **Venomancer T2**: Add `exploits: ["debuffed"]` alongside poisoned — T2 exploits debuffed too.
2. **Venomancer T1**: Add `dazed` to creates (toxic disorientation).
3. **Pyromaniac T3**: Add `cc_daze` to effects (searing vulnerability disorients). Adds 4th effect type.
4. **Pyromaniac T3**: Add `dazed` to creates (from cc_daze). New synergy axis.
5. **Warden T3**: Add `stunned` to creates (impact stuns). Helps global stunned count.
6. **Arcanist T3**: Add `stunned` to creates (mind shatter stuns). Another stunned source.

---

## Iteration 4: Post Iteration-3 Analysis

### Results

| Theme | Synergies | Unmet | Conditions Created |
|-------|-----------|-------|--------------------|
| Pyromaniac #8 | **16** | displaced | burning, debuffed, vulnerable, dazed (4) |
| Pyromaniac #20 | 9 | (none) | burning, debuffed, vulnerable, dazed (4) |
| Venomancer #9 | 7 | (none) | poisoned, dazed, rooted, debuffed (4) |
| Warden #10 | **18** | (none) | rooted, debuffed, displaced, stunned (4) |
| Arcanist #11 | 11 | (none) | vulnerable, debuffed, dazed, rooted, stunned (5) |
| Hexcurser #12 | 13 | (none) | cursed, debuffed, vulnerable, dazed (4) |

### Global: 15/20 issues. Avg synergies 9.6 (was 9.4). Unmet: rooted 6, vulnerable 6, stunned 4 — all from bridge passives on existing themes.

### Remaining Problems
1. **Venomancer** still relatively low at 7 synergies — missing `vulnerable` in creates limits synergy range
2. **Pyromaniac T2 passive** doesn't exploit `dazed` (T3 now creates dazed but T2 passive only exploits burning)
3. **Hexcurser T1** has debuff_vuln effect but doesn't list `vulnerable` in creates — inconsistency
4. **dot_amplifier** passives show as "unknown" in test (cosmetic)

### Changes (Iteration 4): More Condition Coverage + Polish

1. **Venomancer T1**: Add `vulnerable` to creates (venom weakens defenses).
2. **Pyromaniac T2 passive**: Add `dazed` to exploits (bonus vs dazed, T3 creates dazed).
3. **Hexcurser T1**: Add `vulnerable` to creates (debuff_vuln effect = vulnerability exposure).
4. **SkillTreeAnalysis test**: Detect `dot_amplifier` archetype (trg_onHit + dmg_weapon with bonusPercent).

---

## Iteration 5: Post Iteration-4 Analysis

### Results

| Theme | Synergies | Conditions Created | Issues |
|-------|-----------|-------------------|--------|
| Pyromaniac #8 | **17** | burning, debuffed, vulnerable, dazed (4) | displaced (bridge) |
| Pyromaniac #20 | 10 | burning, debuffed, vulnerable, dazed (4) | None |
| Venomancer #9 | 6 | poisoned, dazed, vulnerable, rooted, debuffed (**5**) | None |
| Warden #10 | **18** | rooted, debuffed, displaced, stunned (4) | None |
| Arcanist #11 | 11 | vulnerable, debuffed, dazed, rooted, stunned (**5**) | None |
| Hexcurser #12 | 13 | cursed, debuffed, vulnerable, dazed (4) | None |

### Global: 15/20 issues (all UNMET EXPLOITS from bridge passives). Avg synergies 9.6. dot_amplifier detected: 14 instances.

### Remaining Problems
1. **Venomancer**: T4 doesn't exploit `vulnerable` (T1 creates it) — missed internal synergy
2. **Pyromaniac T4**: Doesn't exploit `dazed` (T3 creates it) — missed internal synergy
3. **Hexcurser T3**: Doesn't exploit `vulnerable` (T1 creates it) — missed internal synergy
4. **Warden T4**: Doesn't exploit `displaced` (T3 creates it) — missed internal synergy
5. 15/20 UNMET EXPLOITS are ALL from bridge passives — accepted as cross-tree design feature

### Changes (Iteration 5): Final Internal Synergy Tightening

1. **Venomancer T4**: Add `vulnerable` to exploits (T1 creates vulnerable).
2. **Pyromaniac T4**: Add `dazed` to exploits (T3 creates dazed).
3. **Hexcurser T3**: Add `vulnerable` to exploits (T1 creates vulnerable).
4. **Warden T4**: Add `displaced` to exploits (T3 creates displaced).

---

## Final Results (Iteration 5)

| Theme | Baseline Syn | Final Syn | Conditions Created | Issues |
|-------|-------------|-----------|-------------------|--------|
| Pyromaniac #8 | 12 | **18** (+50%) | burning, debuffed, vulnerable, dazed | displaced (bridge) |
| Pyromaniac #20 | 11 | **11** | burning, debuffed, vulnerable, dazed | None |
| Venomancer #9 | 5 | **6** (+20%) | poisoned, dazed, vulnerable, rooted, debuffed (**5 conditions**) | None |
| Warden #10 | 11 | **19** (+73%) | rooted, debuffed, displaced, stunned | None |
| Arcanist #11 | 9 | **11** (+22%) | vulnerable, debuffed, dazed, rooted, stunned (**5 conditions**) | None |
| Hexcurser #12 | 12 | **15** (+25%) | cursed, debuffed, vulnerable, dazed | None |

### Global Metrics: Before vs After

| Metric | Baseline | Final |
|--------|----------|-------|
| Avg synergies/tree | 8.8 | 9.8 (+11%) |
| Trees with issues | 18/20 | 15/20 |
| Trees with 0 synergies | 0/20 | 0/20 |
| dot_amplifier detected | 0 (unknown) | 14 |
| New theme avg synergies | 10.0 | 13.3 (+33%) |
| New themes with 0 issues | 1/6 | 5/6 |

### Key Design Changes Across All Iterations

1. **Self-contained condition loops**: Each new theme now creates conditions it exploits (pyromaniac creates debuffed for T3, arcanist creates debuffed for T3, etc.)
2. **Multi-axis synergies**: Warden went from all-rooted to rooted+debuffed+displaced+stunned axes. Pyromaniac from burning-only to burning+debuffed+vulnerable+dazed.
3. **Condition richness**: Venomancer and arcanist each create 5 distinct conditions — excellent party utility.
4. **Active effect variety**: Pyromaniac gained cc_daze (4 effect types). Warden has 5 effect types.
5. **dot_amplifier archetype**: Now properly detected and contributing 14 passives across 20 trees.
6. **Internal exploit tightening**: Every T4 capstone exploits 3-4 conditions all created earlier in the tree.

### Remaining: 15/20 UNMET EXPLOITS from bridge passives — by design for cross-tree party synergy.

### Files Modified
- `src/data/ThemeData.ts` — All 5 new themes tuned across 5 iterations
- `tests/data/SkillTreeAnalysis.test.ts` — dot_amplifier detection
- `planning/new-themes-iteration-log.md` — This log
