# Design doc → engine approximation audit

Short reference for how design-doc ability descriptions map to engine behavior. Update as new features (Phases 1–5) are added.

**For a full workflow and patterns (spirit vs letter, delayed effects, all-allies, return-after-execute, etc.), see [Skill fix guide](skill-fix-guide.md).**

---

## Evasion / Dodge (Phase 1, R1–R2)

| Design concept | Engine approximation |
|----------------|----------------------|
| “X% chance to dodge” / “evasion” | `dodge` stat in `StatsComponent`; `DamageCalculator` reduces hit chance by defender dodge. |
| “Gain +20% dodge” | `buff_stat` with `stat: "dodge"`, `amount: 20` (status or passive). |
| “When you dodge, …” | `trg_onDodge` trigger; `CombatManager` emits `damage:dodged` on miss and `PassiveResolver.onDodge` runs. |
| “Gain AP on dodge” | `res_apRefund` in on-dodge; AP is granted **immediately** into `reactionApByEntity` so reaction abilities (e.g. riposte) can use it. Use `getReactionAp(entityId)` / `spendReactionAp(entityId, amount)`. Unspent reaction AP is merged into normal AP when that unit’s turn starts. |

---

## Auras (Phase 2, R3)

| Design concept | Engine approximation |
|----------------|----------------------|
| “Enemies within N hexes take X% more damage” | Aura ability type + `debuff_vuln` with `_bonusDmgPct`; `AuraManager.refreshAuras` applies/refreshes each turn. |
| “Allies within N hexes gain …” | Aura with `buff_*` effects; radius from targeting (e.g. `tgt_aoe_radius3`). |

---

## Trigger resource grants (unified)

All trigger-driven resource gains (AP, MP, HP, mana, stamina) are applied **immediately** to the beneficiary’s pools. `TriggerGrants` { ap?, mp?, hp?, mana?, stamina? } is returned from onKill, onDodge, onTurnStart, onDebuffApplied and applied by `CombatManager.applyTriggerGrants`: HP/mana/stamina → entity components; AP/MP → current unit’s pool if they’re the beneficiary, else reaction pools (`reactionApByEntity`, `reactionMpByEntity`). Reaction AP/MP: `getReactionAp` / `spendReactionAp`, `getReactionMp` / `spendReactionMp`; unspent merges at turn start. Trigger effect types: `res_apRefund`, `heal_flat` (amount or pctMax), `res_mana`, `res_stamina`, `res_mp`.

## Passives / triggers (Phase 3–4)

| Design concept | Engine approximation |
|----------------|----------------------|
| “When you kill, …” | `trg_onKill`; `res_apRefund`, `heal_flat`, `res_mana`/`res_stamina`/`res_mp`, `buff_stat`, or `extend_status` in triggered effect; grants applied immediately. |
| “When you take damage, reflect X%” | `trg_onTakeDamage` + `dmg_reflect`; `PassiveResolver.onDamageTaken` returns `reflectDamage`; CombatManager applies to attacker. |
| “When you take damage, root/stun attacker” | `trg_onTakeDamage` + `cc_root` / `cc_stun`; status applied to `attackerId`. |
| **“While [condition]”** (e.g. while hasted, during haste) | Trigger **condition** on the trigger: `condition: { type: "has_status", statusId: "haste" }` or `below_hp_percent` / `above_hp_percent`. `PassiveResolver.evaluateTriggerCondition` runs before applying the effect; if false, trigger does not fire. |
| **“Apply [effect] after [delay]”** (e.g. then 1 turn self-stun at end of turn) | Effect params can include `delay: "end_of_turn"`. `AbilityExecutor` queues these in `result.delayedEffects`; `CombatManager` stores them with `sourceEntityId` and applies them in `processDelayedEffectsForEntity(entityId)` when that entity’s turn ends (before `advanceToNextTurn` / `endPlayerUnitTurn`). |
| Passives defined only in ruleset | `AbilityResolver.resolveAbility` falls back to `RulesetLoader.getAbility`; `RulesetAbilityDef.trigger` → `GeneratedAbility.triggers`. |

---

## DoT tick rate / extend buff (Phase 5)

| Design concept | Engine approximation |
|----------------|----------------------|
| “Your DoTs tick 25% faster” | Source has status with `_dotTickRateMult: 1.25` (e.g. `accelerate_rot`); DoTs applied with `sourceId`; `StatusEffectManager.tickTurnStart` uses `getDotTickRateMult(world, effect.sourceId)`. |
| “Kills during haste extend haste by 1 turn” | `trg_onKill` + `extend_status` with `statusId: "haste"`, `turns: 1`; `StatusEffectManager.extendDuration`. |

---

## Reference

- Effect params: `planning/effect-param-contract.md`
- Untestable skills and requirements: `planning/untestable-skills-and-engine-requirements.md`
- Mapping coverage: run `npx ts-node scripts/audit-skill-descriptions.ts` (or equivalent) for TSV of mapped vs NOT MAPPED.
