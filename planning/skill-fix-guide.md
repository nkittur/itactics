# Skill fix guide: from description to working implementation

This guide captures what we learned fixing Chronomancer (Chronoweaver) skills so future skills—any class—can be fixed the same way. **Interpret the spirit of the description**, infer missing engine support from one example and generalize it, then implement and test.

---

## 1. Core principle: spirit over letter

**Don’t** match keywords only. **Do** ask: *What does the player expect to feel? What mechanical outcome would make that true?*

| Description phrase | Wrong (letter) | Right (spirit) |
|--------------------|----------------|----------------|
| "+30% action speed" | Buff initiative (turn order) | Player gets **more actions** → grant +30% AP at turn start while buff is up |
| "Double action rate for 1 turn, then 1 turn self-stun" | Apply stun immediately | **Double AP this turn**, then stun **after** the turn ends so they don’t lose the buffed turn |
| "While hasted, gain 20% evasion" | Always give +20 dodge | Only give +20 dodge **when the unit has haste** (conditional trigger) |
| "Teleport to target, strike, teleport back" | Teleport + strike only | Strike from adjacent hex, then **return caster to pre-cast position** |
| "Party-wide haste" | Buff only the caster | Apply the buff **to every ally** (loop over allies, apply same effect) |
| "3 turns cooldown" | No cooldown in data | Put **cooldown in cost** so the ability is limited use |

**Rule of thumb:** If the description implies a timing, a condition, or a target set, implement that. If the engine doesn’t support it yet, add a small, general feature (e.g. “while [condition]” → trigger condition; “then at end of turn” → delayed effects).

---

## 2. Workflow for fixing a skill

1. **Read the description** and the class/archetype identity.
2. **State the spirit** in one sentence (e.g. “Player gets more actions for 2 turns”).
3. **Check existing engine:** effect types, triggers, targeting, cost, status definitions (see [Effect param contract](effect-param-contract.md), [Skills vs engine audit](skills-vs-engine-audit.md)).
4. **Decide:**
   - **Match:** Map to existing effects and document any small approximation.
   - **Extend:** Add one general feature (e.g. trigger condition, delayed effect, cost override) and use it for this skill and future ones.
   - **Approximate:** Use closest existing behavior and note in the audit (Partial).
   - **Defer:** Mark Missing/Wrong in audit; don’t implement a one-off hack.
5. **Implement:** Mapping first; then schema/executor/combat only if you added a new concept.
6. **Test:** Skill fidelity (`tests/skill-fidelity/skillFidelity.test.ts`), relevant combat tests (e.g. OnDodge, DoTTickRateAndExtendStatus).
7. **Audit:** Update the class spirit-audit table (Good/Partial/Missing/Wrong) and summary.

---

## 3. Patterns and where to implement them

### 3.1 “Action speed” / “action rate” → real extra AP

**Spirit:** The unit should get **more actions** (more AP), not just move earlier in turn order.

- **Option A – Status that grants % AP each turn:**  
  Define a status (e.g. `haste`, `temporal_surge`) with `_apBonusPct` in its modifiers. At **turn start**, `CombatManager` calls `statusEffects.getApBonusPercent(world, entityId)` and grants `floor(MAX_AP * pct / 100)` via `apManager.addAp(...)`.
- **Option B – One-shot extra AP this turn:**  
  Use effect `grant_ap` with `amount` (e.g. 9 for “double turn”). Executor sets `result.grantAp`; CombatManager applies it with `apManager.addAp(...)` (uncapped up to 2× MAX_AP).

**Example – Quicken:** “+30% action speed for 2 turns”  
→ Apply status `haste` for 2 turns. Haste has `_apBonusPct: 30`. No initiative-only buff.

**Example – Overclock:** “Double action rate for 1 turn, then 1 turn self-stun”  
→ `grant_ap: { amount: 9 }` plus `cc_stun` with `delay: "end_of_turn"`. Not initiative; not stun applied immediately.

**Files:** `StatusEffectManager` (status def with `_apBonusPct`), `StatusEffectManager.getApBonusPercent`, `CombatManager.beginCurrentTurn` (grant AP from %), `AbilityExecutor` (`grant_ap`), `AbilityEffectMappings` (use `apply_status` / `grant_ap`).

---

### 3.2 “While [condition]” → trigger condition

**Spirit:** The trigger should only fire when a condition is true (e.g. “while hasted”, “below 30% HP”).

- Add **TriggerCondition** (e.g. `has_status`, `below_hp_percent`, `above_hp_percent`) to the trigger.
- **PassiveResolver** evaluates `trigger.condition` before applying the triggered effect; if false, the trigger does not fire.

**Example – Blur:** “While hasted, gain 20% evasion”  
→ `trg_turnStart` with `triggeredEffect: buff_stat dodge +20`, `condition: { type: "has_status", statusId: "haste" }`.

**Example – Cascade:** “Kills during haste extend haste by 1 turn”  
→ `trg_onKill` with `triggeredEffect: extend_status haste +1`, `condition: { type: "has_status", statusId: "haste" }`.

**Example – Afterimage:** “While hasted, leave a damaging afterimage on dodge”  
→ `trg_onDodge` with `triggeredEffect: dmg_to_attacker`, `condition: { type: "has_status", statusId: "haste" }`.

**Files:** `AbilityData.ts` / `RulesetSchema.ts` (TriggerCondition type, `condition` on trigger), `PassiveResolver.evaluateTriggerCondition`, `buildRulesetFromDoc` and `rulesetAbilityAdapter` (pass through `condition`), `AbilityEffectMappings` (add `condition` to `trigger`).

---

### 3.3 “Then [effect] after [delay]” → delayed effects

**Spirit:** An effect should apply **after** something (e.g. “at end of your turn”), not immediately.

- Effect params can include `delay: "end_of_turn"`.
- **AbilityExecutor** pushes such effects into `result.delayedEffects` (no immediate apply).
- **CombatManager** queues them with `sourceEntityId` and runs `processDelayedEffectsForEntity(entityId)` when that entity’s turn ends (in `endPlayerUnitTurn` and `advanceToNextTurn`).

**Example – Overclock:** “Double action rate for 1 turn, **then** 1 turn self-stun”  
→ `cc_stun` with `turns: 1, delay: "end_of_turn"`. Stun is applied after the double-AP turn.

**Files:** `AbilityExecutor` (read `delay`, push to `delayedEffects`), `CombatManager` (`pendingDelayedEffects`, `processDelayedEffectsForEntity`, call before turn advance).

**Tests:** Skill fidelity runner treats `cc_stun` with `delay: "end_of_turn"` as success when the effect appears in `result.delayedEffects` for the correct target, not on the entity immediately.

---

### 3.4 Self + one ally (same buff on both)

**Spirit:** The ability buffs the caster and one chosen ally with the same effect.

- Use **two effects:** `apply_status_self` (target = caster) and `apply_status` (target = selected entity).
- **Targeting:** `tgt_single_ally` so the player picks the ally; both effects run with the same params (e.g. haste 2 turns).

**Example – Shared Haste:** “Quicken now also affects nearest ally”  
→ `effects: ["apply_status_self", "apply_status"]`, `effectParamOverrides: { apply_status_self: { statusId: "haste", turns: 2 }, apply_status: { statusId: "haste", turns: 2 } }`, `targeting: "tgt_single_ally"`.

**Files:** `AbilityData.ts` (effect type `apply_status_self`), `AbilityExecutor` (case that applies status to `attackerId`), `defaultEffectParams`, `AbilityEffectMappings`.

---

### 3.5 Party-wide (all allies)

**Spirit:** The ability affects **every** ally, not just the caster or one target.

- **Targeting:** `tgt_all_allies`.
- **CombatManager:** When `ability.targeting.type === "tgt_all_allies"` and the caster is a player unit, get `getPlayerUnits()` and **for each ally** call `abilityExecutor.execute(world, attackerId, allyId, ability, weapon)`. Merge results (attackResults, appliedEffects, delayedEffects, apRefunded, grantAp). Skip the usual single-defender UI/kill handling for that branch (`isAllAllies`).
- **Mapping:** Use an effect that applies to one target (e.g. `apply_status`); the loop applies it to each ally.

**Example – Temporal Surge:** “Party-wide haste, +50% speed for 3 turns”  
→ New status `temporal_surge` with `_apBonusPct: 50`, duration 3. Mapping: `effects: ["apply_status"]`, `apply_status: { statusId: "temporal_surge", turns: 3 }`, `targeting: "tgt_all_allies"`. Engine applies it to every ally.

**Files:** `CombatManager.executeGeneratedAbility` (branch on `tgt_all_allies`, loop over allies, merge results, set `isAllAllies` and skip single-target blocks), `StatusEffectManager` (new status if needed), `AbilityEffectMappings`.

---

### 3.6 Cooldowns and cost overrides

**Spirit:** “N turns cooldown” or “limited use” should be reflected in the ability cost.

- **Mapping:** Add `costOverrides: { cooldown: N }` to the ability mapping.
- **buildRulesetFromDoc:** When building the ability def, set `cost = { ...defaultCost(...), ...(mapping?.costOverrides ?? {}) }` so cooldown (and optional ap/stamina/mana/turnEnding) override defaults.

**Example – Blink Step:** “3 turns cooldown”  
→ `costOverrides: { cooldown: 3 }`.

**Example – Crumble:** “6 turns cooldown”  
→ `costOverrides: { cooldown: 6 }`.

**Example – Temporal Surge:** “10 turns cooldown”  
→ `costOverrides: { cooldown: 10 }`.

**Files:** `AbilityEffectMapping` interface (`costOverrides`), `buildRulesetFromDoc` (merge into cost), `AbilityEffectMappings`.

---

### 3.7 “Teleport to target, then strike, then teleport back”

**Spirit:** Caster moves to the target (or adjacent), performs the action, then **returns to their starting position**.

- **Teleport destination:** For single-enemy targeted abilities, **AbilityExecutor.executeDispTeleport** can take `targetId`. If `targetId !== entityId` and no explicit `targetQ`/`targetR`, choose an **empty hex adjacent to the target** (e.g. via `hexNeighbors`) so the strike is in melee range.
- **Return after execute:** Add a flag **returnToStoredPositionAfterExecute** on the ability. **CombatManager** stores the caster’s position before execute and, after processing the result, calls **setEntityPosition(attackerId, storedQ, storedR, storedElevation)** to move the caster back (and update grid occupancy).

**Example – Flicker Strike:**  
→ Mapping: `returnToStoredPositionAfterExecute: true`. Executor: `disp_teleport` with `targetId` so destination is adjacent to enemy. CombatManager: store position, execute, then restore position.

**Files:** `AbilityData.ts` / `RulesetSchema.ts` / mapping interface (flag), `buildRulesetFromDoc` and `rulesetAbilityAdapter` (pass flag), `AbilityExecutor.executeDispTeleport` (accept `targetId`, use adjacent hex when applicable), `CombatManager` (store position, `setEntityPosition` helper, restore when flag set), `AbilityEffectMappings`.

---

### 3.8 On dodge: deal damage to the attacker

**Spirit:** When the defender dodges, the **attacker** takes damage (e.g. “damaging afterimage”).

- Add a **trigger-only** effect type **dmg_to_attacker** with param `amount`.
- **PassiveResolver.onDodge:** When the triggered effect is `dmg_to_attacker`, get `amount`, get the attacker’s health component, and subtract `amount` from `current` (floored at 0). Return a result for the log.
- The trigger can have a **condition** (e.g. “while hasted”) so it only fires when the condition is true.

**Example – Afterimage:** “While hasted, leave a damaging afterimage on dodge”  
→ Passive with `trigger: { type: "trg_onDodge", triggeredEffect: { type: "dmg_to_attacker", params: { amount: 20 } }, condition: { type: "has_status", statusId: "haste" } }`.

**Files:** `AbilityData.ts` (effect type `dmg_to_attacker`), `defaultEffectParams`, `PassiveResolver.onDodge` (handle `dmg_to_attacker` using `attackerId`), `AbilityEffectMappings`.

---

### 3.9 Zone that applies damage or debuff over time

**Spirit:** “Enemies in the zone gain Decay” or “take damage each turn” means the zone should **do something each turn** (e.g. damage).

- **zone_persist** supports **dmgPerTurn**. Set it to a non-zero value (e.g. 5) so the zone deals that much damage per turn to entities in it (or apply a DoT/status as per your zone logic).

**Example – Entropic Field:** “All enemies inside gain Decay, lasts 2 turns”  
→ `zone_persist: { radius: 3, turns: 2, dmgPerTurn: 5 }` instead of `dmgPerTurn: 0`.

**Files:** `AbilityEffectMappings` (override `dmgPerTurn`), zone execution/tick logic if it reads `dmgPerTurn`.

---

### 3.10 New statuses (e.g. stronger haste)

**Spirit:** A “bigger” or different buff (e.g. +50% speed, party-wide) may need its own status so turn-start logic can grant the right bonus.

- In **StatusEffectManager**, add a new status definition with the right `modifiers` (e.g. `_apBonusPct: 50`, `movementPoints`, `initiative`) and `duration`.
- Use **apply_status** with that `statusId` in the mapping. If the ability is party-wide, combine with the all-allies loop (see 3.5).

**Example – Temporal Surge:**  
→ Status `temporal_surge` with `_apBonusPct: 50`, duration 3. Mapping uses `apply_status: { statusId: "temporal_surge", turns: 3 }` and `tgt_all_allies`.

**Files:** `StatusEffectManager` (STATUS_EFFECT_DEFS or equivalent), `AbilityEffectMappings`.

---

## 4. Where to change what (checklist)

| Change | Files |
|--------|--------|
| New effect type | `AbilityData.ts` (EffectType), `AbilityExecutor.ts` (case + logic), `defaultEffectParams.ts`, `effect-param-contract.md`, optionally `AbilityFormatter.ts` |
| New status | `StatusEffectManager.ts` (definition with modifiers, e.g. `_apBonusPct`) |
| Trigger condition | `AbilityData.ts` / `RulesetSchema.ts` (TriggerCondition), `PassiveResolver.ts` (evaluateTriggerCondition, use in firePassives/firePassivesWithGrants), `buildRulesetFromDoc.ts` and `rulesetAbilityAdapter.ts` (pass condition) |
| Delayed effect | `AbilityData.ts` (EffectDelay / delay param), `AbilityExecutor.ts` (queue in delayedEffects), `CombatManager.ts` (pendingDelayedEffects, processDelayedEffectsForEntity, call before turn advance) |
| Cost overrides | `AbilityEffectMappings.ts` (interface + costOverrides), `buildRulesetFromDoc.ts` (merge into cost) |
| All-allies execution | `CombatManager.ts` (branch in executeGeneratedAbility, loop over getPlayerUnits(), merge results, isAllAllies) |
| Return-after-execute | `AbilityData.ts`, `RulesetSchema.ts`, mapping interface, `buildRulesetFromDoc.ts`, `rulesetAbilityAdapter.ts`, `CombatManager.ts` (store position, setEntityPosition, restore) |
| Teleport to target | `AbilityExecutor.ts` (executeDispTeleport: accept targetId, use adjacent empty hex when targetId !== entityId) |
| AP bonus at turn start | `StatusEffectManager.ts` (getApBonusPercent, status def with _apBonusPct), `CombatManager.ts` (beginCurrentTurn: addAp from getApBonusPercent) |
| Mapping for one skill | `AbilityEffectMappings.ts` (effects, targeting, effectParamOverrides, costOverrides, trigger, condition, returnToStoredPositionAfterExecute) |

---

## 5. Testing

- **Skill fidelity:** `npm test -- tests/skill-fidelity/skillFidelity.test.ts`  
  - Runner executes each ability once and checks effects (status, params, etc.). For delayed stun, it checks `result.delayedEffects` instead of current status on the entity.
- **Trigger / passive tests:** e.g. `tests/combat/OnDodge.test.ts`, `tests/combat/DoTTickRateAndExtendStatus.test.ts`  
  - Add or extend tests when you add trigger conditions, new trigger effects (e.g. dmg_to_attacker), or new status behavior.
- **Regression:** Run the full test suite after mapping or engine changes.

---

## 6. Audit and docs

- **Spirit audit (per class):** Keep a table (e.g. `planning/chronomancer-skill-spirit-audit.md`) with: Skill, Description, Spirit, Implementation, Spirit match (Good/Partial/Missing/Wrong), Notes. Update when you fix a skill.
- **Approximations:** In `planning/skills-vs-engine-audit.md`, document new design→engine patterns (e.g. “Party-wide buff” → tgt_all_allies + loop).
- **Effect contract:** When you add an effect type or param, update `planning/effect-param-contract.md` and default params.

---

## 7. Quick reference: Chronomancer examples

| Skill | Key pattern | Implementation |
|-------|-------------|----------------|
| Quicken | Action speed = AP | apply_status haste 2 turns; haste has _apBonusPct: 30 |
| Shared Haste | Self + one ally | apply_status_self + apply_status, tgt_single_ally |
| Overclock | Double AP + delayed stun | grant_ap 9, cc_stun delay end_of_turn |
| Blur | While condition | trg_turnStart buff_stat dodge, condition has_status haste |
| Cascade | While condition | trg_onKill extend_status haste, condition has_status haste |
| Temporal Surge | Party-wide + cooldown | apply_status temporal_surge, tgt_all_allies, costOverrides cooldown 10; engine loops allies |
| Blink Step | Cooldown | costOverrides cooldown 3 |
| Flicker Strike | Teleport back | disp_teleport (to adjacent to target), returnToStoredPositionAfterExecute, store/restore position |
| Afterimage | On dodge, damage attacker, conditional | trg_onDodge dmg_to_attacker 20, condition has_status haste |
| Crumble | Cooldown | costOverrides cooldown 6 |
| Entropic Field | Zone damages | zone_persist dmgPerTurn 5 |

Use this guide when adding or fixing any skill: state the spirit, pick the pattern(s), implement in the right files, test, then update the audit and docs.
