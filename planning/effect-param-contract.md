# Effect Param Contract

Single source of truth for effect types and their params. Used by ruleset mappings and `defaultEffectParams.ts`. When adding or changing an effect type, update this doc and `AbilityExecutor` / `defaultEffectParams`.

All params are optional unless marked **required**. Defaults are in `defaultEffectParams.getDefaultEffectParams(type, tier)`.

---

## Damage

| Effect type     | Params | Notes |
|-----------------|--------|--------|
| `dmg_weapon`    | `multiplier` (1.0), `mult`, `hitChanceMod` | Weapon damage scaled by multiplier. |
| `dmg_execute`   | `multiplier`, `hpThreshold` (0–100), `bonusMult` | Bonus damage when target HP% < threshold. |
| `dmg_multihit`  | `hits`, `multPerHit` | Multiple attacks, each with multPerHit. |
| `dmg_spell`     | `multiplier` | Spell damage (no weapon roll). |
| `dmg_reflect`   | `pct`, `turns` | Reflect pct of damage taken for turns. |

## DoTs

| Effect type   | Params | Notes |
|---------------|--------|--------|
| `dot_bleed`   | `dmgPerTurn`, `turns` | Physical DoT. |
| `dot_burn`    | `dmgPerTurn`, `turns` | Fire DoT. |
| `dot_poison`  | `dmgPerTurn`, `turns` | Poison DoT. |

## Displacement

| Effect type     | Params | Notes |
|-----------------|--------|--------|
| `disp_push`    | `distance` | Push target away from caster. |
| `disp_pull`    | `distance` | Pull target toward caster. |
| `disp_dash`    | `range`, `damageOnArrival` | Move caster to target hex; optional damage (multiplier). |
| `disp_teleport`| `range` | Teleport caster to chosen hex (range = max distance). |

## Crowd control

| Effect type  | Params | Notes |
|--------------|--------|--------|
| `cc_stun`    | `chance`, `turns`, `delay`? | Skip turn. If `delay: "end_of_turn"`, effect is applied at end of caster's turn (e.g. Overclock). |
| `cc_root`    | `turns` | Cannot move. |
| `cc_daze`    | `apLoss`, `turns` | Lose AP each turn. |
| `cc_fear`     | `chance`, `turns` | Flee AI. |
| `cc_silence`  | `turns` | Cannot cast. |
| `cc_taunt`    | `turns` | Forced to target taunter. |
| `cc_charm`    | `turns`, `chance` | Switch sides. |

## Debuffs

| Effect type         | Params | Notes |
|---------------------|--------|--------|
| `debuff_stat`       | `stat`, `amount`, `turns` | Reduce stat (e.g. meleeSkill, resolve). |
| `debuff_vuln`       | `bonusDmg`, `turns` | Take more damage. |
| `debuff_armor`      | `pct`, `turns` | Armor reduction %. |
| `debuff_healReduce` | `pct`, `turns` | Healing received reduction %. |

## Buffs

| Effect type        | Params | Notes |
|--------------------|--------|--------|
| `buff_stat`        | `stat`, `amount`, `turns` | Increase stat (e.g. initiative). |
| `buff_dmgReduce`   | `percent`, `turns` | Damage reduction %. |
| `buff_stealth`     | `turns`, `breakOnAttack` (0|1) | Invisible; breakOnAttack=1 breaks on attack. |
| `buff_shield`      | `amount`, `turns` | Absorb HP. |

## Stances

| Effect type       | Params | Notes |
|-------------------|--------|--------|
| `stance_counter`  | `maxCounters` | Counter-attack stance. |
| `stance_overwatch`| `maxTriggers` | Overwatch stance. |

## Triggered utility (e.g. on kill, turn start)

| Effect type     | Params | Notes |
|-----------------|--------|--------|
| `extend_status` | `statusId`, `turns`, `maxTurns`? | Extend duration of status on self (e.g. on kill extend haste by 1). Used as triggered effect in trg_onKill. |
| `apply_status`  | `statusId`, `turns` | Apply a named status to target (active) or self (triggered). E.g. Quicken: apply_status haste 2 turns. |
| `apply_status_self` | `statusId`, `turns` | Apply a named status to caster only (active). E.g. Shared Haste: apply_status_self + apply_status so self and ally get haste. |

**Haste and AP:** The `haste` status has `_apBonusPct: 30`. At turn start, units with haste (or any status with `_apBonusPct`) gain that percent of MAX_AP as bonus AP (e.g. 30% of 9 = 2, floor = 2 or 3 depending on rounding; use floor(9*30/100)=2). So "+30% action speed" = +30% AP each turn for the status duration.

## Action points

| Effect type | Params | Notes |
|-------------|--------|--------|
| `grant_ap`  | `amount` | Grant AP to caster this turn (uncapped; e.g. Overclock double AP). Cap at 2× MAX_AP. |

## Resource / healing

| Effect type     | Params | Notes |
|-----------------|--------|--------|
| `res_apRefund`  | `amount` | Refund AP (e.g. on kill). |
| `heal_flat`     | `amount` | Flat heal to target. |
| `heal_hot`      | `healPerTurn`, `turns` | Heal over time. |
| `heal_pctDmg`   | `pct` | Lifesteal (legacy). |
| `lifesteal`     | `pct` | Lifesteal % of damage dealt. |

## Summons / zones / traps

| Effect type    | Params | Notes |
|----------------|--------|--------|
| `summon_unit`  | `templateId`, `hp`, `turns`, `count` | Requires SummonManager. |
| `zone_persist` | `zoneType`, `radius`, `turns`/`duration`, `dmgPerTurn` | Requires ZoneManager. |
| `trap_place`   | `trapType`, `duration` | Requires ZoneManager. |

## Channel / transform / utility

| Effect type      | Params | Notes |
|------------------|--------|--------|
| `channel_dmg`    | `dmgPerTurn`, `turns` | DoT on target (channel). |
| `transform_state`| `formId`, `turns`/`duration`, `bonusPct` | Requires TransformationManager. |
| `cleanse`        | `count` | Remove up to count debuffs. |
| `cooldown_reset` | — | Reset own cooldowns. |

---

## Status / DoT tick rate (Phase 5)

- **Source-based DoT tick rate:** When a status effect is applied via `applyDynamic(..., { sourceId })`, the **source** entity’s “DoT tick rate” modifier is used when the victim’s DoT ticks. The source’s status effects are scanned for `_dotTickRateMult` (e.g. 1.25 = 25% faster). Example: status `accelerate_rot` has `modifiers: { _dotTickRateMult: 1.25 }`; if the applier has it, their DoTs deal 25% more damage per tick.
