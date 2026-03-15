# Plan: Reliably and Robustly Support All Mappings

Goal: enhance the game engine so that (1) every **existing** mapping runs correctly and is regression-tested, and (2) **missing mechanics** that block faithful mapping of design-doc abilities are added in small, verifiable steps.

This plan is written to be executable by an agent with **limited runtime context**: no visual/browser testing, no manual play-throughs. Each phase is verifiable via **type-check, build, unit tests, and headless battle**. Work is **incremental**: each phase leaves the codebase in a good state and does not assume follow-up in the same session.

---

## Untestable skills and engine requirements

Before writing description-driven tests for every skill, use **`planning/untestable-skills-and-engine-requirements.md`**. It:

- Lists **why** skills are untestable (evasion, auras, triggers, reactive, resources, rewind, etc.).
- Collates gaps into a single list of **engine requirements (R1–R16)** with example skills and phase alignment.
- Defines “testable” vs “untestable” so you can tag abilities and implement requirements in order (R1–R7 = Phases 1–5; R8+ as extensions or later).

Implement the relevant requirements first so that more skills become testable; then add description-derived specs and tests for those.

---

## Progress

| Phase | Status | Completed |
|-------|--------|-----------|
| **Phase 0** | ✅ Done | Effect param contract (`planning/effect-param-contract.md`), 35 effect-type tests + 1 ruleset→execute test in `AbilityExecutor.test.ts`, headless baseline documented below. |
| **Phase 1** | ✅ Done | Evasion / dodge (R1): dodge in hit resolution + status modifier; tests in `DamageCalculator.test.ts`. On-dodge event (R2): `damage:dodged` emit + `PassiveResolver.onDodge`; tests in `OnDodge.test.ts`. |
| **Phase 2** | ✅ Done | Auras (R3): `AuraManager.refreshAuras`, Frailty Aura mapping, `getVulnerabilityBonus` sums all `_bonusDmgPct`; tests in `AuraManager.test.ts`. |
| **Phase 3** | ✅ Done | Passives with triggers: `RulesetAbilityDef.trigger`, mapping `trigger` in AbilityEffectMappings, `rulesetAbilityToGenerated` maps to `triggers`, `resolveAbility` falls back to ruleset; Thorn Coat mapping; tests in `PassiveTriggers.test.ts`. |
| **Phase 4** | ✅ Done | Reactive (on take damage): `PassiveResolver.onDamageTaken` returns `{ results, reflectDamage }`, supports `cc_root`/`cc_stun` on attacker and `dmg_reflect`; `fireOnTakeDamagePassives` wired in CombatManager (basic attack, generated ability, ZoC, AI); tests in `OnTakeDamage.test.ts`. |
| **Phase 5** | ✅ Done | DoT tick rate: `sourceId` on effects, `getDotTickRateMult`, `accelerate_rot` status; extend buff on kill: `extend_status` triggered effect, `StatusEffectManager.extendDuration`, Cascade mapping; tests in `DoTTickRateAndExtendStatus.test.ts`. |
| **Phase 6** | ✅ Done | Effect param contract updated (extend_status, DoT tick rate); `planning/skills-vs-engine-audit.md` (design → engine approximations); audit script documented in audit/README. |

### Headless regression baseline (Phase 0)

- **Scenario:** tutorial (3 player, 3 enemy).
- **Seed:** 42.
- **Roster:** Berserker (Swordsman, Axeman), Ironbloom Warden (Spearman); first archetype abilities from ruleset.
- **Expected (baseline):** `victory === true`, `turnsElapsed` in [1, 500], `playerSurvivors.length` ≤ 3, `playerDeaths + playerSurvivors.length === 3`, `enemyKills` ≤ 3.
- **Recorded baseline (2026-03-14):** Victory true, Turns 50, Player survivors 2, Player deaths 1, Enemy kills 3. Audit log: `audit/demo-battle.log`.

Any change that breaks `npm run test:headless` or shifts outcome outside the expected bounds (e.g. victory false when it was true with same seed) should be investigated.

---

## Constraints (Agent Limitations)

- **No visual verification.** All checks must be automated: `npm run build`, `npm test`, `npm run test:headless`, and targeted unit tests.
- **Session-bound.** Phases should be completable in one or a few sessions; no single phase should require hundreds of edits.
- **No manual QA.** Regression coverage must come from tests and deterministic headless runs (fixed seed, fixed scenario).
- **Backward compatibility.** New behavior must not break existing mappings or headless battle; new effect types or params should be additive or gated.
- **Clear contracts.** Effect param schemas and trigger contracts should be documented so mappings stay valid.

---

## Scope Definition

**“Support all mappings”** is interpreted as:

1. **Tier 1 (must):** Every effect type currently used in `AbilityEffectMappings.ts` is implemented, tested, and documented; headless battle with a roster that uses a broad set of mapped abilities passes consistently.
2. **Tier 2 (should):** Add the **minimum** new engine features so that the **most repeated** design-doc patterns can be mapped: evasion, auras, trigger-based passives, and reactive (on-damage) effects.
3. **Tier 3 (later):** Custom resources (Fury, Rhythm, etc.), “repeat action”, and full “rewind/undo” are **out of scope** for this plan; they can be separate, later efforts.

---

## Phase 0: Harden Existing Mappings (Regression Safety)

**Goal:** No existing mapping is a no-op or throws; every effect type has at least one unit test; headless battle is the regression baseline.

**Tasks:**

1. **AbilityExecutor coverage**
   - For each effect type in `AbilityExecutor.executeEffect()`, add or extend a test in `AbilityExecutor.test.ts` that runs that effect and asserts a minimal outcome (e.g. damage applied, status applied, position changed).
   - Ensure edge cases: zero duration, zero damage, invalid target, missing component.

2. **Effect param contract**
   - Add a small schema or JSDoc in `AbilityData.ts` or `defaultEffectParams.ts` listing required/optional params per effect type (e.g. `cc_stun`: `chance`, `turns`). Use this as the single source of truth for mappings.

3. **Headless regression**
   - Ensure `npm run test:headless` uses a scenario and roster that exercise multiple effect types (DoTs, CC, buffs, debuffs, displacement, at least one zone or summon if possible). If the current tutorial roster is limited, add a second scenario or a test that runs with a curated ability set.
   - Document the “expected” outcome (e.g. victory true/false, turn count range, survivor count) so a future change that breaks execution fails the test.

4. **Ruleset → GeneratedAbility**
   - In `rulesetAbilityAdapter.ts`, ensure every `RulesetAbilityDef` field used at runtime (targeting, effects, cost) is correctly copied. Add a test that builds a ruleset ability, converts to GeneratedAbility, and runs it through AbilityExecutor with a mock world/grid.

**Done criteria:** `npm run build` and `npm test` pass; `npm run test:headless` passes; every effect type has at least one test; effect param contract is documented.

**Rollback:** No new features; only tests and docs. No rollback needed unless a test is wrong.

**Phase 0 completion (2026-03-14):**
- Added `planning/effect-param-contract.md` with params for all effect types.
- Added 35 “Phase 0: every effect type runs without throwing” tests in `AbilityExecutor.test.ts` (one per effect type; summon/zone/trap/transform no-op without managers).
- Added 1 test “ruleset ability converts to GeneratedAbility and executes” (Rust Touch–style def → execute → assert attackResults and appliedEffects).

**Skill fidelity (pass 1) — full-fidelity per-skill tests:**
- **Runner:** `tests/skill-fidelity/skillFidelityRunner.ts` — for each testable ruleset ability, builds a unit + target, runs the ability through `AbilityExecutor`, then asserts exact outcomes (status applied, params stored, one DoT/HoT tick amount). Audit log: `audit/skill-fidelity.log`.
- **Test:** `tests/skill-fidelity/skillFidelity.test.ts` — one `it()` per testable ability (2737); each calls `runSkillFidelityTest(ability)` and expects all checks to pass.
- **Engine change:** `StatusEffectManager.tickTurnStart` now prefers ability-sourced `_dmgPerTurn` / `_healPerTick` over `def.periodic`, so DoT/HoT from abilities use the ability’s params for tick amount (full fidelity).
- **Pass 2:** Any ability that does not match its description can be fixed in the engine or mappings.
- Headless baseline: tutorial, seed 42, victory true, 50 turns, 2 survivors, 3 enemy kills. Full test suite and `npm run test:headless` pass.

---

## Phase 1: Evasion / Dodge

**Goal:** Abilities that grant “X% dodge” or “evasion” can be mapped to an engine effect; hit chance in damage resolution is reduced by target evasion.

**Tasks:**

1. **Stat or status**
   - Add either a `dodgeChance` (or `evasion`) stat to `StatsComponent` and read it in `DamageCalculator` when resolving hit, or a status effect that applies a hit-chance modifier. Prefer **stat** for simplicity (no new status defs for every ability).
   - In `DamageCalculator`, after computing base hit chance, apply `targetDodgeChance` (capped, e.g. 0–80%) so final hit = baseHit * (1 - dodgeChance) or equivalent formula.

2. **Effect type**
   - Add `buff_stat` usage with `stat: "dodgeChance"` (and document in effect param contract), or add a dedicated `buff_evasion` effect type that sets a status or stat. Prefer reusing `buff_stat` with a new stat key to avoid a new branch in AbilityExecutor.

3. **Tests**
   - Unit test: attacker vs target with 50% dodge; expect hit rate to drop (run many trials or assert expected value).
   - Unit test: apply buff that grants dodge; next attack respects it.

4. **Mapping**
   - Update one or two design-doc abilities (e.g. Time Slip, Blur) in `AbilityEffectMappings.ts` to use the new stat/effect with appropriate params.

**Done criteria:** Build and tests pass; headless battle still passes; at least one ability in mappings uses evasion/dodge; param contract updated.

**Rollback:** New stat/effect is additive; if removed, existing mappings unchanged. No breaking change to existing effects.

---

## Phase 2: Auras

**Goal:** Abilities that say “enemies within X take Y% more damage” or “allies within X gain Z” can be implemented without per-frame hacks. Use a single, clear pattern (e.g. zone or “aura” component).

**Tasks:**

1. **Design choice**
   - **Option A:** New effect type `aura_debuff` / `aura_buff` that, when used, attaches an “aura” to the caster: each turn (or on turn start), apply a status to all enemies/allies in radius. Implementation: either a component on the caster + a hook in turn order (“at start of turn, for each entity with AuraComponent, apply status to entities in range”) or a **moving zone** (zone centered on caster, recreated or updated each turn).
   - **Option B:** Reuse `zone_persist` with “center on caster” and `onStandEffect` that applies the debuff/buff. Zone would need to be updated when caster moves (or recreated each turn). Fewer new concepts, more special cases in zone logic.

   **Recommendation:** Option A with an explicit “aura” concept (effect type + either a component or a “aura source” in ZoneManager that moves with caster). Clearer for future auras (e.g. “allies in 3 hexes gain 10% damage”).

2. **Implementation**
   - Add effect type(s) e.g. `aura_debuff` / `aura_buff` with params: `radius`, `stat` or `effectId`, `value`, `turns` (duration of aura), `faction` (ally/enemy). In `AbilityExecutor`, create an aura source (component or register with a small AuraManager / ZoneManager extension).
   - Each turn start (or after movement), for each aura source, collect entities in radius, apply the status/buff/debuff (idempotent refresh or stack by existing status rules).

3. **Tests**
   - Unit test: caster has aura (e.g. “enemies in 2 hexes take 10% more damage”); enemy in range has vuln applied; enemy out of range does not.
   - Optional: headless battle with one unit that has an aura ability; assert at least one application of the aura effect (e.g. vuln on enemy).

4. **Mappings**
   - Add mapping for Frailty Aura (or one other) using the new effect type; document in effect param contract.

**Done criteria:** Build and tests pass; headless battle passes; at least one aura ability mapped and exercised in test or headless.

**Rollback:** New effect type is additive; if removed, only new mappings break. Existing mappings unchanged.

---

## Phase 3: Passives With Triggers (From Ruleset)

**Goal:** Passive abilities in the ruleset can define triggers (onKill, onHit, turnStart, etc.) and a triggered effect; the engine fires them so that “mapping a passive” means adding trigger + effect in data, not code.

**Tasks:**

1. **Ruleset schema**
   - Extend `RulesetAbilityDef` (or a parallel structure for “passive behavior”) to include optional `trigger?: { type: TriggerType; triggeredEffect: RulesetEffect }`. Use same trigger types as `AbilityData` (trg_onKill, trg_onHit, trg_turnStart, etc.).

2. **Adapter**
   - In `rulesetAbilityAdapter.ts`, when converting a ruleset ability that has `trigger`, map it to `GeneratedAbility.triggers` so that the resulting GeneratedAbility is not trigger-empty. Ensure `isPassive` is true when the ruleset type is Passive (or Aura/Reactive as needed).

3. **Resolver / Combat wiring**
   - PassiveResolver and TriggerSystem already fire by trigger type; ensure they are called with abilities that come from the ruleset (i.e. when the active roster uses ruleset abilities, their trigger data is present). Verify that `resolveAbility` returns a GeneratedAbility that includes triggers when the source is a ruleset passive with trigger data.

4. **Data path**
   - BuildRulesetFromDoc currently does not emit trigger data. Add optional trigger (and triggeredEffect) to the mapping format in `AbilityEffectMappings.ts` (e.g. `trigger: { type: "trg_onKill", triggeredEffect: { type: "buff_stat", params: { ... } } }`) and in `buildRulesetFromDoc` persist it on the ability def if the schema supports it. If the schema does not support it yet, add a minimal extension (e.g. `passiveTrigger?: ...` on RulesetAbilityDef).

5. **Tests**
   - Unit test: passive with trg_onKill and a triggered effect (e.g. heal self 10); simulate kill; assert trigger fired and effect applied.
   - Unit test: passive with trg_turnStart; assert effect applied at turn start.

**Done criteria:** Build and tests pass; at least one passive in the ruleset has trigger data and is exercised in a unit test; headless battle still passes.

**Rollback:** Trigger data is optional; existing passives without trigger data behave as today. No breaking change.

---

## Phase 4: Reactive (On Take Damage)

**Goal:** Abilities like “when you take melee damage, reflect 10%” or “when hit, 25% chance to root attacker” can be mapped. Engine already has `dmg_reflect`; extend to a general “on take damage” hook that can apply an effect (reflect, root, etc.) to the attacker.

**Tasks:**

1. **Trigger type**
   - Ensure `trg_onTakeDamage` exists in TriggerSystem and is wired: when an entity takes damage (e.g. in DamageCalculator or in the code that applies damage), emit an event or call a hook that TriggerSystem listens for, with (victimId, attackerId, amount, damageType?). TriggerSystem fires any registered passive/ability with trg_onTakeDamage and passes attacker as target for the triggered effect.

2. **Triggered effects**
   - Supported triggered effects for onTakeDamage: `dmg_reflect` (already exists), `cc_root`, `cc_stun` (e.g. Briar Lash). AbilityExecutor already implements these; ensure they can be invoked with “attacker” as target when the trigger fires.

3. **Ruleset**
   - Allow mappings to define a passive/reactive with `trigger: { type: "trg_onTakeDamage", triggeredEffect: { type: "cc_root", params: { turns: 1 } } }` and optionally a chance (e.g. 25%). If “chance” is not in the trigger params, add it (TriggerSystem rolls and fires accordingly).

4. **Tests**
   - Unit test: entity A has reactive “when take damage, root attacker”; entity B attacks A; A takes damage; B is rooted (or test reflect: A has reflect reactive, B hits A, B takes reflected damage).

**Done criteria:** Build and tests pass; at least one reactive (reflect or root) exercised in test; headless battle passes.

**Rollback:** New trigger type and reactive mappings are additive; removing them does not break existing behavior.

---

## Phase 5: DoT Tick Rate and “Extend Buff on Kill” (Optional / Small)

**Goal:** Support “your DoTs tick 25% faster” and “kills during haste extend haste by 1 turn” so a few more design-doc abilities can be approximated.

**Tasks:**

1. **DoT tick rate**
   - StatusEffectDef (or the DoT application path) already has duration and damage per tick. Add an optional `tickRateMult` (e.g. 1.25) on the **source** (the entity who applied the DoT). When resolving periodic damage, look up the source’s “DoT tick rate” modifier (from a status or a stat) and multiply tick damage or reduce time between ticks. Simplest: “tick 25% faster” = same duration, 25% more damage per tick (so 1.25 * dmgPerTurn). Implement in StatusEffectManager or wherever DoTs are applied per turn.

2. **Extend buff on kill**
   - In PassiveResolver or TriggerSystem, when trg_onKill fires, allow the triggered effect to be “extend_status” with params `statusId`, `turns`. Implement: find status on killer by id, add `turns` to remaining duration (cap by max duration if needed). Then add one mapping (e.g. Cascade: on kill, extend “haste” by 1 turn).

3. **Tests**
   - Unit test: DoT with tickRateMult 1.25 does 25% more total damage over same duration (or same damage in fewer turns).
   - Unit test: on kill, extend buff on killer by 1 turn; assert duration increased.

**Done criteria:** Build and tests pass; one DoT-rate and one extend-on-kill mapping added; headless battle passes.

**Rollback:** Additive; no breaking change.

---

## Phase 6: Documentation and Mapping Audit Pipeline

**Goal:** Keep the engine and mappings aligned; make it easy to see which abilities are still unmapped or partially supported.

**Tasks:**

1. **Effect param contract (living doc)**
   - Maintain a single file (e.g. `docs/effect-param-contract.md` or a table in `AbilityData.ts`) listing every effect type and its params (required/optional, types, defaults). When adding a new effect or param, update it. Reference it in the audit.

2. **Audit script in CI or pre-commit (optional)**
   - Run `audit-skill-descriptions.ts` (or equivalent) and output the TSV; optionally fail if “NOT MAPPED” count increases without a ticket, or leave as informational. Ensures regressions in mapping coverage are visible.

3. **Design → engine approximation doc**
   - Short list in `audit/skills-vs-engine-audit.md` or `docs/approximations.md`: “Haste = initiative buff”, “Infinite Loop = transform_state”, “Evasion = buff_stat dodgeChance”, etc. Update as new features are added.

**Done criteria:** Contract and approximation doc exist and are updated for Phases 1–5; audit script runnable and documented.

---

## Out of Scope (Later Work)

- **Custom resources (Fury, Rhythm, Resonance):** Defer; requires resource definitions, UI, and many ability updates. Can be a separate “resource system” phase.
- **“Repeat last action” / “target repeats last action”:** Large (state replay or clone of last skill). Defer.
- **Full battlefield rewind / undo:** Very large. Defer.
- **Lethal execute vs boss:** Niche; can add when needed (e.g. effect param `lethalBelowPct`, `bossDamagePct`).
- **On-dodge effects:** Requires “dodge” as an event; can be added after evasion exists (when attack misses due to dodge, emit event). Defer to after Phase 1.

---

## Order and Dependencies

- **Phase 0** first (no dependencies).
- **Phase 1** (evasion) independent; can be next.
- **Phase 2** (auras) independent; can run in parallel with 1 or after.
- **Phase 3** (passives with triggers) enables more mappings; depends on Phase 0 for “trigger data in ruleset” not breaking anything.
- **Phase 4** (reactive) depends on TriggerSystem; can follow Phase 3.
- **Phase 5** (DoT rate, extend on kill) optional; can be last.
- **Phase 6** (docs/audit) can be done incrementally with each phase.

---

## Success Criteria for “Support All Mappings”

- Every effect type used in current mappings has a test and a documented param contract.
- Headless battle is the regression baseline and passes after each phase.
- Evasion, auras, trigger-based passives, and on-take-damage reactives are implemented and at least one ability per category is mapped and tested.
- No regression in existing mapped abilities (same or better headless outcome; no new crashes or no-ops).
- New behavior is additive and gated so that removing a new feature does not break existing mappings.

This plan is designed to be executed phase-by-phase with verification at each step and no reliance on visual or manual testing.
