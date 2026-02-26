# Cross-Tree Synergy — Iterative Improvement Log

## Iteration 1: Baseline Analysis

### Generation Parameters (20 parties, seeds 100-119, party size 3-5)

- Avg cross-synergies/party: 6.6
- Avg condition utilization: 38%
- Parties with issues: 20/20
- Parties with 0 cross-synergies: 2/20
- Parties with multi-unit chains: 10/20
- Parties with full integration (all themes connected): 6/20
- Avg pairwise score: 1.00

### Issue Frequency

| Issue | Frequency |
|-------|-----------|
| ORPHANED EXPLOITS | 18/20 |
| ISOLATED THEMES | 14/20 |
| MANY DEAD PAIRS | 14/20 |
| ORPHANED CREATES | 11/20 |
| LOW UTILIZATION | 9/20 |
| LOW CROSS-SYNERGIES | 3/20 |
| ZERO CROSS-SYNERGIES | 2/20 |

### Root Cause: Two Disconnected Clusters + Isolated Skirmisher

**Cluster 1 (blood themes)**: bleeder ⇄ executioner ⇄ reaper — linked via bleeding/low_hp
**Cluster 2 (debuff themes)**: crusher ⇄ sentinel ⇄ opportunist — linked via debuffed
**Island**: skirmisher — displaced only created/exploited by itself

Zero-synergy pairs (always 0):
- bleeder+crusher (14/14), bleeder+sentinel (9/9), bleeder+opportunist (6/6)
- crusher+skirmisher (11/11), crusher+reaper (6/6), crusher+executioner (5/5)
- sentinel+skirmisher (4/4), sentinel+reaper (3/3), sentinel+executioner (4/4)
- opportunist+skirmisher (4/4), opportunist+reaper (2/2)
- reaper+skirmisher (2/2)

### Most Orphaned Conditions (created but never exploited cross-tree)
- stunned: 15 (only crusher creates AND exploits it — total silo)
- dazed: 9 (only opportunist)
- in_stance: 9 (only sentinel)
- displaced: 7 (only skirmisher)

### Learnings
1. Themes are siloed: each creates/exploits its own primary condition but nobody else's
2. Need "bridge conditions" that connect the two clusters
3. Skirmisher's displaced is never exploited by anyone else
4. stunned, dazed, and in_stance are self-referential — no cross-theme value
5. The only cross-links work through shared conditions (bleeding/low_hp between blood themes, debuffed between debuff themes)

### Changes Needed (Iteration 1): Bridge the Two Clusters

1. **ThemeData — Bleeder T3**: Add `debuffed` to creates (hemorrhaging wounds weaken = debuff). Bridges bleeder → cluster 2.
2. **ThemeData — Crusher T3**: Add `low_hp` to creates (shatterguard's heavy damage drives to low HP). Bridges crusher → cluster 1.
3. **ThemeData — Skirmisher T3**: Add `debuffed` to creates (battering ram disorients = debuff). Bridges skirmisher → cluster 2.
4. **ThemeData — Reaper T1**: Already has `creates: ["low_hp"]`. Add `debuffed` (intimidating strikes demoralize). Bridges reaper → cluster 2.
5. **ThemeData — Executioner T1**: Add `debuffed` to creates (raking cuts weaken). Bridges executioner → cluster 2.
6. **ThemeData — Sentinel T3**: Already has `creates: ["in_stance", "debuffed"]`. Add `exploits: ["displaced"]` — displaced enemies walk into overwatch. Bridges sentinel → skirmisher.
7. **ThemeData — Opportunist T3**: Add `exploits: ["displaced"]` to crippling flurry — displaced targets are easy to debuff further. Bridges opportunist → skirmisher.

---

## Iteration 2: Post Iteration-1 Analysis

### Results
- Avg cross-synergies/party: **14.7** (was 6.6, +123%)
- Avg condition utilization: **57%** (was 38%, +50%)
- Parties with issues: **16/20** (was 20/20)
- Parties with 0 cross-synergies: **0/20** (was 2/20)
- Parties with multi-unit chains: **20/20** (was 10/20)
- Parties with full integration: **20/20** (was 6/20)
- Avg pairwise score: **2.78** (was 1.00, +178%)
- ISOLATED THEMES: **0/20** (was 14/20 — eliminated!)
- MANY DEAD PAIRS: **0/20** (was 14/20 — eliminated!)

### Remaining Issues

| Issue | Frequency |
|-------|-----------|
| ORPHANED EXPLOITS | 16/20 |
| ORPHANED CREATES | 7/20 |
| LOW UTILIZATION | 3/20 |

### Orphaned Condition Analysis
- `displaced`: 20 orphaned exploits — sentinel/opportunist T3 exploit displaced but only skirmisher creates it; parties without skirmisher always have this orphaned
- `stunned`: 15 orphaned — still siloed to crusher; nobody else exploits or creates stunned
- `in_stance`: 9 orphaned — still siloed to sentinel; nobody else interacts with stances
- `dazed`: 9 orphaned — still siloed to opportunist

### Bottom Theme Pairs (still weak)
- bleeder+sentinel: 1.4 (linked only via debuffed, one-way)
- reaper+skirmisher: 1.5
- bleeder+opportunist: 1.5

### Learnings
1. Bridge conditions (debuffed, low_hp) successfully connected the two clusters — zero isolated themes
2. But secondary conditions (stunned, dazed, in_stance, displaced) remain siloed
3. Need more themes to exploit stunned (easiest to justify: executioner, reaper)
4. Need more themes to create displaced (crusher's heavy hits knock people)
5. Skirmisher should create stunned (battering ram stuns on collision)
6. Reaper/executioner should exploit debuffed for stronger cross-links to cluster 2

### Changes (Iteration 2): Break Secondary Condition Silos

1. **ThemeData — Skirmisher T3**: Add `stunned` to creates (battering ram collision stuns). Links skirmisher → crusher exploiters.
2. **ThemeData — Crusher T4**: Add `exploits: ["displaced"]` (demolisher bonus vs scattered enemies). Links crusher ← skirmisher.
3. **ThemeData — Executioner T3**: Add `exploits: ["stunned"]` (helpless stunned target easier to execute). Links executioner ← crusher.
4. **ThemeData — Reaper T4**: Add `exploits: ["debuffed"]` alongside low_hp. Links reaper ← debuff cluster.
5. **ThemeData — Bleeder T4**: Add `exploits: ["stunned"]` alongside bleeding/low_hp. Links bleeder ← crusher.
6. **ThemeData — Opportunist T1**: Add `creates: ["displaced"]` — enfeebling strike knocks off balance. Gives displaced a second creator beyond skirmisher.

---

## Iteration 3: Post Iteration-2 Analysis

### Results
- Avg cross-synergies/party: **20.6** (was 14.7, +40%)
- Avg condition utilization: **73%** (was 57%, +28%)
- Avg pairwise score: **3.33** (was 2.78, +20%)
- Parties with issues: **16/20** (unchanged)
- All 20 parties fully integrated + multi-unit chains maintained

### Remaining Issues

| Issue | Frequency |
|-------|-----------|
| ORPHANED EXPLOITS | 16/20 |
| ORPHANED CREATES | 7/20 |
| LOW UTILIZATION | 3/20 |

### Analysis
- `stunned`: 15 orphaned. Now created by crusher + skirmisher, exploited by crusher + executioner + bleeder. But parties without crusher/skirmisher still orphan.
- `dazed`: 9 orphaned creates. Only opportunist+skirmisher create it, no one else exploits it cross-tree.
- `in_stance`: 9 orphaned. Still sentinel-only. Accepted as self-referential by design.
- Bottom pair: executioner+sentinel at 1.0 with 1/4 zero!

### Learnings
1. Need more stunned creators (reaper AoE could stun) and displaced creators (crusher knockback)
2. Need more dazed creators and exploiters
3. Passives sometimes exploit bridge conditions that don't exist in the party → adds noise to orphan count
4. Bridge conditions on PassiveGenerator working but creating some orphaned exploits in small parties

### Changes (Iteration 3): More Condition Creators + Cross-Tree Passives

1. **ThemeData — Reaper T3**: Add `stunned` to creates (stunning AoE cleave).
2. **ThemeData — Crusher T1**: Add `displaced` to creates (concussive blow knockback).
3. **ThemeData — Skirmisher T4**: Add `dazed` to creates (wrecking ball dazes on impact).
4. **ThemeData — Bleeder T1**: Add `exploits: ["debuffed"]` (bleeding attacks more effective on weakened targets).
5. **PassiveGenerator**: Add universal bridge conditions system — condition_exploiter has 25% chance to exploit a cross-tree condition (bleeding, debuffed, low_hp, stunned, displaced) not in own tree's creates.

---

## Iteration 4: Post Iteration-3 Analysis

### Results
- Avg cross-synergies/party: **24.9** (was 20.6, +21%)
- Avg condition utilization: **77%** (was 73%)
- Avg pairwise score: **3.94** (was 3.33, +18%)
- Parties with issues: **13/20** (was 16/20)
- LOW UTILIZATION eliminated (was 3/20)
- ORPHANED CREATES down to 4/20 (was 7/20)

### Remaining Issues

| Issue | Frequency |
|-------|-----------|
| ORPHANED EXPLOITS | 13/20 |
| ORPHANED CREATES | 1/20 |

### Orphaned Analysis
- `dazed`: 14 orphaned exploits — many themes now exploit dazed but only opportunist+skirmisher create it
- `in_stance`: 9 — sentinel-only (accepted)
- `bleeding`: 9 orphaned exploits — bridge passives exploit bleeding but some parties lack a bleeding creator
- Bottom pairs: executioner+sentinel 2.0, bleeder+sentinel 2.2, reaper+sentinel 2.3

### Learnings
1. Sentinel is still the weakest cross-tree theme — needs to create more universally-exploited conditions
2. Dazed needs more creators (sentinel, crusher, bleeder could all create dazed)
3. Sentinel counter-attacks should create bleeding (wounds attackers)
4. Bridge condition passives should prefer commonly-created conditions (weighted selection)

### Changes (Iteration 4): Fix Sentinel + More Dazed Sources

1. **ThemeData — Sentinel T3**: Add `dazed` to creates (debuffing aura disorients).
2. **ThemeData — Sentinel T4**: Add `bleeding` to creates (counter-attacks wound).
3. **ThemeData — Crusher T4**: Add `dazed` to creates (demolisher AoE dazes).
4. **ThemeData — Crusher T2**: Add `exploits: ["dazed"]` (coup de grace on dazed).
5. **ThemeData — Reaper T4**: Add `exploits: ["stunned"]` alongside low_hp/debuffed.
6. **ThemeData — Executioner T4**: Add `exploits: ["dazed"]` alongside low_hp/bleeding.

---

## Iteration 5: Post Iteration-4 Analysis

### Results
- Avg cross-synergies/party: **27.9** (was 24.9, +12%)
- Avg condition utilization: **87%** (was 77%, +13%)
- Avg pairwise score: **4.44** (was 3.94, +13%)
- Parties with issues: **13/20** (same)
- ORPHANED CREATES down to 1/20 (in_stance only)
- ORPHANED EXPLOITS down to 13/20

### Bottom Theme Pairs
- executioner+sentinel: 2.0
- bleeder+sentinel: 2.2
- reaper+sentinel: 2.3

### Learnings
1. Sentinel improved (crusher+sentinel 4.7, executioner+sentinel 2.0→5.0 needed)
2. Need more cross-link between bleeder and sentinel: sentinel now creates bleeding(T4) + displaced(T1) + stunned(T4) + dazed(T3). Bleeder exploits debuffed(T1) + bleeding(T2-T4) + stunned(T4). The link should work through bleeder→sentinel's debuffed and sentinel→bleeder's bleeding. Issue is slot cycling.
3. PassiveGenerator bridge conditions should be weighted by how many themes create each condition
4. Dazed orphan went from 14→less after more creators

### Changes (Iteration 5): Final Polish — Weighted Bridge Conditions + Last Gaps

1. **ThemeData — Bleeder T2**: Add `creates: ["dazed"]` (heavy blood loss disorients). Fourth dazed creator.
2. **ThemeData — Sentinel T1**: Add `displaced` to creates (spearwall pushes back). More displaced sources.
3. **PassiveGenerator**: Bridge conditions now use weighted selection (debuffed: 5, bleeding/stunned/displaced: 3, low_hp/dazed: 2). Reduced chance from 25%→20% to limit orphaned noise.

---

## Final Results (Iteration 5)

- Avg cross-synergies/party: **32.1** (was 6.6 baseline, +386%)
- Avg condition utilization: **85%** (was 38%, +124%)
- Avg pairwise score: **5.16** (was 1.00, +416%)
- Parties with issues: **7/20** (was 20/20)
- Parties with 0 cross-synergies: **0/20** (was 2/20)
- Parties with multi-unit chains: **20/20** (was 10/20)
- Parties with full integration: **20/20** (was 6/20)

### Zero-synergy pairs: NONE (was 13+ always-zero pairs)

### Bottom theme pairs all score ≥ 2.5 (was 0.0 for 13 pairs)

---

## Summary: Before vs After

| Metric | Baseline (Iter 1) | Final (Iter 5) |
|--------|-------------------|----------------|
| Avg cross-synergies/party | 6.6 | 32.1 |
| Avg condition utilization | 38% | 85% |
| Avg pairwise score | 1.00 | 5.16 |
| Parties with issues | 20/20 | 7/20 |
| Parties with 0 cross-synergies | 2/20 | 0/20 |
| Multi-unit chains | 10/20 | 20/20 |
| Full integration (all themes connected) | 6/20 | 20/20 |
| Zero-synergy theme pairs | 13 (always 0) | 0 |
| Worst theme pair score | 0.0 | 2.5 |
| ISOLATED THEMES | 14/20 | 0/20 |
| MANY DEAD PAIRS | 14/20 | 0/20 |
| Skirmisher isolated | 7/20 | 0/20 |

### Key Design Changes Across All Iterations

1. **Bridge conditions**: Added `debuffed` as cross-cluster bridge (created by 6 themes, exploited by 4)
2. **Condition de-siloing**: stunned now created by 4 themes (was 1), displaced by 4 (was 1), dazed by 4 (was 1)
3. **Cross-theme exploits**: Themes now exploit conditions from other themes (executioner exploits stunned from crusher, bleeder exploits debuffed from opportunist, etc.)
4. **PassiveGenerator bridge conditions**: 20% chance for condition_exploiter passives to exploit cross-tree conditions, weighted by how many themes create each condition
5. **Sentinel integration**: Sentinel now creates displaced(T1), debuffed(T3), dazed(T3), stunned(T4), bleeding(T4) — massive cross-tree value

### Files Modified
- `src/data/ThemeData.ts` — Added bridge conditions to all 7 themes' progression slots
- `src/data/PassiveGenerator.ts` — Weighted bridge conditions system for cross-tree passive exploitation
- `tests/data/CrossTreeAnalysis.test.ts` — **NEW** — Cross-tree party analysis test
